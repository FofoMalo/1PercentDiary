import { App, TFile, TFolder, moment, normalizePath } from "obsidian";
import type { DiarySettings } from "./settings";
import { SLOTS, SlotKey } from "./texts";

export const DATE_FORMAT = "YYYY-MM-DD";

export interface Goal {
	file: TFile;
	rang: number;
	titre: string;
	pourquoi: string;
	mesure: string;
	banque: string[];
	evaluations: Record<string, number>;
}

export interface Cycle {
	file: TFile;
	debut: moment.Moment;
	duree: number;
}

export interface DayState {
	objectif: string;
	texte: string;
	fait: boolean;
}

type Frontmatter = Record<string, unknown>;

/** "[[Cible|alias]]" ou "Cible" -> "Cible" */
export function linkTarget(value: unknown): string {
	if (typeof value !== "string") return "";
	return value.replace(/^\[\[/, "").replace(/\]\]$/, "").split("|")[0].split("#")[0].trim();
}

/** Heuristique douce : une mesure vérifiable contient en général un chiffre ou une fréquence. */
export function looksMeasurable(text: string): boolean {
	return /\d|fois|par (jour|semaine|mois|an)|chaque|tous les|toutes les/i.test(text);
}

function sanitize(name: string): string {
	return name.replace(/[\\/:*?"<>|#^[\]]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Accès aux notes du 1% Diary. L'état est lu dans le frontmatter via le metadataCache
 * et écrit avec processFrontMatter ; le corps des notes n'est jamais analysé, sauf
 * pour préremplir l'assistant de vision.
 */
export class DiaryRepo {
	constructor(private app: App, private settings: DiarySettings) {}

	path(...parts: string[]): string {
		return normalizePath([this.settings.rootFolder, ...parts].join("/"));
	}

	get visionPath(): string {
		return this.path("Vision.md");
	}

	dayPath(date: moment.Moment): string {
		return this.path("Jours", `${date.format(DATE_FORMAT)}.md`);
	}

	file(path: string): TFile | null {
		const f = this.app.vault.getAbstractFileByPath(path);
		return f instanceof TFile ? f : null;
	}

	fm(file: TFile): Frontmatter {
		return (this.app.metadataCache.getFileCache(file)?.frontmatter ?? {}) as Frontmatter;
	}

	/** Lien le plus court non ambigu depuis sourcePath (le vault contient des homonymes potentiels). */
	link(file: TFile, sourcePath: string): string {
		return `[[${this.app.metadataCache.fileToLinktext(file, sourcePath, true)}]]`;
	}

	resolve(value: unknown, sourcePath: string): TFile | null {
		const target = linkTarget(value);
		return target ? this.app.metadataCache.getFirstLinkpathDest(target, sourcePath) : null;
	}

	belongsTo(file: TFile, cycle: Cycle): boolean {
		return this.resolve(this.fm(file).cycle, file.path)?.path === cycle.file.path;
	}

	visionLink(sourcePath: string): string {
		const vision = this.vision();
		return vision ? this.link(vision, sourcePath) : "[[Vision]]";
	}

	async ensureFolder(path: string): Promise<void> {
		const folder = normalizePath(path);
		if (this.app.vault.getAbstractFileByPath(folder)) return;
		await this.app.vault.createFolder(folder);
	}

	async create(path: string, content: string): Promise<TFile> {
		await this.ensureFolder(path.substring(0, path.lastIndexOf("/")));
		return this.app.vault.create(path, content);
	}

	filesIn(sub: string): TFile[] {
		const folder = this.app.vault.getAbstractFileByPath(this.path(sub));
		if (!(folder instanceof TFolder)) return [];
		return folder.children.filter((f): f is TFile => f instanceof TFile && f.extension === "md");
	}

	// --- Vision -------------------------------------------------------------

	vision(): TFile | null {
		return this.file(this.visionPath);
	}

	/** Contenu des sections "## Titre" de la vision, pour préremplir l'assistant. */
	async visionSections(): Promise<Record<string, string>> {
		const file = this.vision();
		if (!file) return {};
		const text = await this.app.vault.cachedRead(file);
		const headings = this.app.metadataCache.getFileCache(file)?.headings ?? [];
		const out: Record<string, string> = {};
		headings.forEach((h, i) => {
			if (h.level !== 2) return;
			const start = h.position.end.offset;
			const end = headings.slice(i + 1).find((n) => n.level <= 2)?.position.start.offset ?? text.length;
			out[h.heading] = text.substring(start, end).trim();
		});
		return out;
	}

	async writeVision(sections: { heading: string; text: string }[]): Promise<TFile> {
		const today = moment().format(DATE_FORMAT);
		const existing = this.vision();
		if (existing) {
			// On garde chaque version : l'évolution du pourquoi fait partie du chemin.
			const archive = this.path("Archives", `Vision ${today}.md`);
			if (!this.file(archive)) {
				await this.ensureFolder(this.path("Archives"));
				await this.app.vault.copy(existing, archive);
			}
		}
		const body = sections.map((s) => `## ${s.heading}\n\n${s.text.trim()}\n`).join("\n");
		const content = `---\ntype: vision\nrevue_le: ${today}\n---\n\n# Mon pourquoi\n\n${body}`;
		if (existing) {
			await this.app.vault.modify(existing, content);
			return existing;
		}
		return this.create(this.visionPath, content);
	}

	// --- Cycles et objectifs ------------------------------------------------

	cycles(): Cycle[] {
		return this.filesIn("Cycles")
			.map((file) => {
				const fm = this.fm(file);
				const debut = moment(String(fm.debut ?? ""), DATE_FORMAT, true);
				const duree = Number(fm.duree_jours);
				return { file, debut, duree };
			})
			.filter((c) => c.debut.isValid() && c.duree > 0)
			.sort((a, b) => b.debut.valueOf() - a.debut.valueOf());
	}

	/** Cycle couvrant la date donnée ; le plus récent l'emporte en cas de chevauchement. */
	cycleAt(date: moment.Moment): Cycle | null {
		const day = date.clone().startOf("day");
		return (
			this.cycles().find((c) => !day.isBefore(c.debut) && day.diff(c.debut, "days") < c.duree) ?? null
		);
	}

	dayNumber(cycle: Cycle, date: moment.Moment): number {
		return date.clone().startOf("day").diff(cycle.debut, "days") + 1;
	}

	goals(cycle: Cycle): Goal[] {
		return this.filesIn("Objectifs")
			.filter((f) => this.belongsTo(f, cycle))
			.map((file) => {
				const fm = this.fm(file);
				const evaluations: Record<string, number> = {};
				for (const [k, v] of Object.entries(fm)) {
					const m = /^evaluation_(J\d+)$/.exec(k);
					if (m && typeof v === "number") evaluations[m[1]] = v;
				}
				return {
					file,
					rang: Number(fm.rang) || 99,
					titre: file.basename,
					pourquoi: String(fm.pourquoi ?? ""),
					mesure: String(fm.mesure ?? ""),
					banque: Array.isArray(fm.banque) ? fm.banque.map(String) : [],
					evaluations,
				};
			})
			.sort((a, b) => a.rang - b.rang);
	}

	async createCycle(debut: moment.Moment, duree: number): Promise<Cycle> {
		const path = this.path("Cycles", `Cycle ${debut.format(DATE_FORMAT)}.md`);
		const content =
			`---\ntype: cycle\ndebut: ${debut.format(DATE_FORMAT)}\nduree_jours: ${duree}\nobjectifs: []\n---\n\n` +
			`# Cycle du ${debut.format("DD/MM/YYYY")}\n\nVision : ${this.visionLink(path)}\n\n\`\`\`1pct-cycle\n\`\`\`\n`;
		const file = this.file(path) ?? (await this.create(path, content));
		return { file, debut: debut.clone().startOf("day"), duree };
	}

	async saveGoal(
		cycle: Cycle,
		existing: TFile | null,
		data: { rang: number; titre: string; pourquoi: string; mesure: string; banque: string[]; evaluation?: number },
	): Promise<TFile> {
		let file = existing;
		const wanted = sanitize(data.titre) || `Objectif ${data.rang}`;
		if (!file) {
			let path = this.path("Objectifs", `${wanted}.md`);
			if (this.file(path)) path = this.path("Objectifs", `${wanted} (${cycle.file.basename}).md`);
			file = await this.create(
				path,
				`# ${wanted}\n\nVision : ${this.visionLink(path)} · Cycle : ${this.link(cycle.file, path)}\n\n## Notes\n\n`,
			);
		} else if (file.basename !== wanted && !this.file(this.path("Objectifs", `${wanted}.md`))) {
			// Renommer met à jour les liens grâce au réglage "alwaysUpdateLinks" du vault.
			await this.app.fileManager.renameFile(file, this.path("Objectifs", `${wanted}.md`));
		}
		const goalFile = file;
		await this.app.fileManager.processFrontMatter(file, (fm: Frontmatter) => {
			fm.type = "objectif";
			fm.cycle = this.link(cycle.file, goalFile.path);
			fm.rang = data.rang;
			fm.pourquoi = data.pourquoi;
			fm.mesure = data.mesure;
			fm.banque = data.banque;
			if (data.evaluation !== undefined) fm.evaluation_J0 = data.evaluation;
		});
		return file;
	}

	async setCycleGoals(cycle: Cycle, goals: TFile[]): Promise<void> {
		await this.app.fileManager.processFrontMatter(cycle.file, (fm: Frontmatter) => {
			fm.objectifs = goals.map((g) => this.link(g, cycle.file.path));
		});
	}

	// --- Jours --------------------------------------------------------------

	/**
	 * Ouvre la note du jour en la créant au besoin. Une note déjà créée par un autre plugin
	 * (Daily Notes, Day Planner) est complétée : propriétés et bloc 1% manquants.
	 * `goalFiles` sert juste après l'assistant, quand le cache n'a pas encore indexé les objectifs.
	 */
	async openOrCreateDay(cycle: Cycle, date: moment.Moment, goalFiles?: TFile[]): Promise<TFile> {
		const path = this.dayPath(date);
		const file = this.file(path) ?? (await this.create(path, ""));
		const goals = goalFiles ?? this.goals(cycle).map((g) => g.file);

		await this.app.vault.process(file, (text) => {
			if (text.includes("```1pct-jour")) return text;
			const fmMatch = /^---\n[\s\S]*?\n---\n?/.exec(text);
			const head = fmMatch ? fmMatch[0] : "";
			let body = text.substring(head.length).trimStart();
			const sections = ["Tâches", this.settings.plannerHeading, "Pensées", "Ce que j'ai appris"];
			for (const h of sections) {
				if (!new RegExp(`^## ${h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m").test(body)) {
					body = `${body.trimEnd()}\n\n## ${h}\n`;
				}
			}
			return `${head}${head ? "\n" : ""}\`\`\`1pct-jour\n\`\`\`\n\n${body.trim()}\n`;
		});

		await this.app.fileManager.processFrontMatter(file, (fm: Frontmatter) => {
			if (fm.type === "jour") return;
			fm.type = "jour";
			fm.cycle = this.link(cycle.file, file.path);
			fm.jour_n = this.dayNumber(cycle, date);
			SLOTS.forEach((slot, i) => {
				const goal = goals[i];
				fm[`${slot.key}_objectif`] ??= goal ? this.link(goal, file.path) : "";
				fm[`${slot.key}_texte`] ??= "";
				fm[`${slot.key}_fait`] ??= false;
			});
		});
		return file;
	}

	/** `objectif` est le chemin de la note d'objectif liée, ou "" si aucune. */
	dayState(file: TFile, slot: SlotKey): DayState {
		const fm = this.fm(file);
		return {
			objectif: this.resolve(fm[`${slot}_objectif`], file.path)?.path ?? "",
			texte: String(fm[`${slot}_texte`] ?? ""),
			fait: fm[`${slot}_fait`] === true,
		};
	}

	/** Pour `objectif`, `value` est le chemin de la note d'objectif. */
	async setDayField(file: TFile, slot: SlotKey, field: keyof DayState, value: string | boolean): Promise<void> {
		let stored = value;
		if (field === "objectif") {
			const goal = typeof value === "string" ? this.file(value) : null;
			stored = goal ? this.link(goal, file.path) : "";
		}
		await this.app.fileManager.processFrontMatter(file, (fm: Frontmatter) => {
			fm[`${slot}_${field}`] = stored;
		});
	}

	async setEvaluation(goal: TFile, milestone: number, value: number): Promise<void> {
		await this.app.fileManager.processFrontMatter(goal, (fm: Frontmatter) => {
			fm[`evaluation_J${milestone}`] = value;
		});
	}

	/**
	 * Dernier jalon atteint dont le bilan n'est pas terminé (un objectif sans note).
	 * Il reste proposé les jours suivants : un bilan manqué le jour J n'est pas perdu.
	 */
	pendingMilestone(cycle: Cycle, day: number): number | null {
		const reached = this.milestones(cycle).filter((m) => m <= day);
		const last = reached[reached.length - 1];
		if (last === undefined) return null;
		return this.goals(cycle).some((g) => g.evaluations[`J${last}`] === undefined) ? last : null;
	}

	/** Ajoute une idée à la réserve d'un objectif, sans doublon. */
	async addToBank(goal: TFile, idea: string): Promise<void> {
		const text = idea.trim();
		if (!text) return;
		await this.app.fileManager.processFrontMatter(goal, (fm: Frontmatter) => {
			const banque = Array.isArray(fm.banque) ? fm.banque.map(String) : [];
			if (!banque.some((b) => b.toLowerCase() === text.toLowerCase())) banque.push(text);
			fm.banque = banque;
		});
	}

	/** Nombre de 1% tenus sur le cycle, au total et par chemin d'objectif. */
	cycleTotals(cycle: Cycle): { total: number; jours: number; parObjectif: Record<string, number> } {
		const parObjectif: Record<string, number> = {};
		let total = 0;
		let jours = 0;
		for (const file of this.filesIn("Jours")) {
			if (!this.belongsTo(file, cycle)) continue;
			let any = false;
			for (const slot of SLOTS) {
				const s = this.dayState(file, slot.key);
				if (!s.fait) continue;
				total++;
				any = true;
				if (s.objectif) parObjectif[s.objectif] = (parObjectif[s.objectif] ?? 0) + 1;
			}
			if (any) jours++;
		}
		return { total, jours, parObjectif };
	}

	milestones(cycle: Cycle): number[] {
		const step = this.settings.milestoneInterval;
		const out: number[] = [];
		for (let d = step; d < cycle.duree; d += step) out.push(d);
		out.push(cycle.duree);
		return out;
	}
}
