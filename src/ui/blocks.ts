import { MarkdownPostProcessorContext, MarkdownRenderChild, TFile, moment } from "obsidian";
import type OnePercentDiary from "../main";
import { Cycle, DATE_FORMAT, Goal } from "../repository";
import { SLOTS, VISION_QUESTIONS } from "../texts";
import { VisionModal } from "../wizards/VisionModal";
import { renderGuide } from "./guide";
import { renderScale } from "./scale";

/**
 * Bloc rendu à partir d'une note : se redessine quand une note du 1% Diary change
 * (écriture par le bloc, édition manuelle, ou indexation tardive juste après création).
 */
class LiveBlock extends MarkdownRenderChild {
	constructor(
		containerEl: HTMLElement,
		private plugin: OnePercentDiary,
		private file: TFile,
		private draw: (el: HTMLElement, file: TFile) => void,
	) {
		super(containerEl);
	}

	onload(): void {
		this.redraw();
		this.registerEvent(
			this.plugin.app.metadataCache.on("changed", (f) => {
				if (f.path === this.file.path || f.path.startsWith(this.plugin.settings.rootFolder + "/")) this.redraw();
			}),
		);
	}

	redraw(): void {
		this.containerEl.empty();
		this.draw(this.containerEl, this.file);
	}
}

export function registerBlocks(plugin: OnePercentDiary): void {
	const mount = (draw: (el: HTMLElement, file: TFile) => void) =>
		(_src: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
			const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
			if (!(file instanceof TFile)) return;
			el.addClass("opd-block");
			ctx.addChild(new LiveBlock(el, plugin, file, draw));
		};

	plugin.registerMarkdownCodeBlockProcessor("1pct-jour", mount((el, file) => drawDay(plugin, el, file)));
	plugin.registerMarkdownCodeBlockProcessor("1pct-cycle", mount((el, file) => drawCycle(plugin, el, file)));
}

function cycleOf(plugin: OnePercentDiary, file: TFile): Cycle | null {
	const repo = plugin.repo;
	const target = repo.fm(file).type === "cycle" ? file : repo.resolve(repo.fm(file).cycle, file.path);
	return repo.cycles().find((c) => c.file.path === target?.path) ?? null;
}

function drawDay(plugin: OnePercentDiary, el: HTMLElement, file: TFile): void {
	const repo = plugin.repo;
	const cycle = cycleOf(plugin, file);
	if (!cycle) {
		el.createEl("p", { text: "Cette note n'est rattachée à aucun cycle." });
		return;
	}
	const goals = repo.goals(cycle);
	const date = moment(file.basename, DATE_FORMAT, true);
	const n = date.isValid() ? repo.dayNumber(cycle, date) : Number(repo.fm(file).jour_n);

	const head = el.createDiv({ cls: "opd-day-head" });
	head.createSpan({ text: `Jour ${n} sur ${cycle.duree} · ` });
	internalLink(plugin, head, cycle.file, file, "voir le cycle");

	const pending = repo.pendingMilestone(cycle, n);
	if (pending !== null) drawMilestone(plugin, el, pending, goals);

	renderGuide(el, "jour", plugin);

	let doneToday = 0;
	for (const slot of SLOTS) {
		const state = repo.dayState(file, slot.key);
		if (state.fait) doneToday++;
		const row = el.createDiv({ cls: `opd-slot opd-slot-${slot.key}` + (state.fait ? " is-done" : "") });

		const head = row.createDiv({ cls: "opd-slot-head" });
		head.createEl("strong", { text: slot.label });
		head.createSpan({ cls: "opd-desc", text: ` ${slot.hint}` });

		const line = row.createDiv({ cls: "opd-slot-line" });
		const check = line.createEl("input", { attr: { type: "checkbox", "aria-label": "Fait" } });
		check.checked = state.fait;
		check.addEventListener("change", () => void repo.setDayField(file, slot.key, "fait", check.checked));

		const select = line.createEl("select", { cls: "dropdown" });
		select.createEl("option", { text: "Objectif…", value: "" });
		for (const g of goals) select.createEl("option", { text: g.titre, value: g.file.path });
		select.value = state.objectif;
		select.addEventListener("change", () => void repo.setDayField(file, slot.key, "objectif", select.value));

		const listId = `opd-banque-${slot.key}-${file.basename}`;
		const input = line.createEl("input", {
			cls: "opd-slot-text",
			attr: { type: "text", list: listId, placeholder: "Mon petit pas du jour" },
		});
		input.value = state.texte;
		input.addEventListener("change", () => void repo.setDayField(file, slot.key, "texte", input.value.trim()));
		const datalist = line.createEl("datalist", { attr: { id: listId } });
		const goal = goals.find((g) => g.file.path === state.objectif);
		for (const idea of goal?.banque ?? []) datalist.createEl("option", { value: idea });

		// La réserve se construit au fil des jours : un 1% nouveau peut y être versé d'un clic.
		const inBank = (t: string) => !!goal?.banque.some((b) => b.toLowerCase() === t.trim().toLowerCase());
		const save = line.createEl("button", { text: "+ réserve", cls: "opd-bank-btn", attr: { "aria-label": "Ajouter ce 1% à la réserve de l'objectif" } });
		const refresh = () => save.toggle(!!goal && !!input.value.trim() && !inBank(input.value));
		refresh();
		input.addEventListener("input", refresh);
		// Sans cela, le blur du champ écrit la note et le redessin du bloc peut avaler le clic.
		save.addEventListener("mousedown", (e) => e.preventDefault());
		save.addEventListener("click", async () => {
			if (!goal) return;
			const text = input.value.trim();
			await repo.setDayField(file, slot.key, "texte", text);
			await repo.addToBank(goal.file, text);
		});
		if (goal && goal.banque.length === 0) {
			row.createDiv({ cls: "opd-hint", text: "Réserve vide pour cet objectif : chaque 1% écrit ici peut l'alimenter." });
		}

		if (goal?.pourquoi) row.createDiv({ cls: "opd-why", text: `Pourquoi : ${goal.pourquoi}` });
	}

	const totals = repo.cycleTotals(cycle);
	const foot = el.createDiv({ cls: "opd-foot" });
	foot.createSpan({ text: `Aujourd'hui : ${doneToday}/3` });
	foot.createSpan({ text: `Cycle : ${totals.total} pas de 1%` });
	const next = repo.milestones(cycle).find((m) => m >= n);
	if (next !== undefined) foot.createSpan({ text: next === n ? `Bilan J${next} aujourd'hui` : `Bilan J${next} dans ${next - n} j` });
}

function internalLink(plugin: OnePercentDiary, parent: HTMLElement, target: TFile, source: TFile, text: string): void {
	const a = parent.createEl("a", { cls: "internal-link", text, href: target.path });
	a.addEventListener("click", (e) => {
		e.preventDefault();
		void plugin.app.workspace.openLinkText(target.path, source.path, false);
	});
}

/** Bilan de jalon : nouvelle note 1-10 par objectif, puis retour au pourquoi. */
function drawMilestone(plugin: OnePercentDiary, el: HTMLElement, milestone: number, goals: Goal[]): void {
	const card = el.createDiv({ cls: "opd-milestone" });
	card.createEl("h4", { text: `Bilan du jour ${milestone}` });
	renderGuide(card, "bilan", plugin);

	for (const g of goals) {
		const row = card.createDiv({ cls: "opd-field" });
		row.createEl("strong", { text: g.titre });
		if (g.mesure) row.createDiv({ cls: "opd-desc", text: `Mesure : ${g.mesure}` });
		const past = Object.entries(g.evaluations)
			.filter(([j]) => j !== `J${milestone}`)
			.map(([j, v]) => `${j} : ${v}/10`)
			.join(" · ");
		if (past) row.createDiv({ cls: "opd-desc", text: `Avant : ${past}` });
		renderScale(row, g.evaluations[`J${milestone}`] ?? null, (v) => void plugin.repo.setEvaluation(g.file, milestone, v));
	}

	const vision = card.createDiv({ cls: "opd-recap" });
	drawOpenQuestion(plugin, vision);
	vision.createEl("button", { text: "Revoir mon pourquoi" }).addEventListener("click", () => new VisionModal(plugin).open());
}

/** La réponse à « est-ce que c'est assez ? » reste une question ouverte, remise sous les yeux. */
function drawOpenQuestion(plugin: OnePercentDiary, parent: HTMLElement): void {
	const box = parent.createDiv({ cls: "opd-open-question" });
	void plugin.repo.visionSections().then((sections) => {
		const [motivation, , assez] = VISION_QUESTIONS;
		if (sections[motivation.heading]) {
			box.createEl("p", { text: `${motivation.heading} : ${sections[motivation.heading]}` });
		}
		box.createEl("strong", { text: assez.heading });
		box.createEl("p", { text: sections[assez.heading] || "(pas encore de réponse)" });
	});
}

function drawCycle(plugin: OnePercentDiary, el: HTMLElement, file: TFile): void {
	const repo = plugin.repo;
	const cycle = cycleOf(plugin, file);
	if (!cycle) {
		el.createEl("p", { text: "Propriétés du cycle incomplètes (debut, duree_jours)." });
		return;
	}
	renderGuide(el, "cycle", plugin);

	const today = Math.min(repo.dayNumber(cycle, moment()), cycle.duree);
	const todayFile = repo.file(repo.dayPath(moment()));
	const actions = el.createDiv({ cls: "opd-foot" });
	if (todayFile) internalLink(plugin, actions, todayFile, file, "Note du jour");
	else actions.createEl("button", { text: "Créer la note du jour" }).addEventListener("click", () => void plugin.openToday(cycle));
	drawOpenQuestion(plugin, el.createDiv({ cls: "opd-recap" }));

	const totals = repo.cycleTotals(cycle);
	const stats = el.createDiv({ cls: "opd-stats" });
	stat(stats, String(Math.max(today, 0)), `jour sur ${cycle.duree}`);
	stat(stats, String(totals.total), "pas de 1% tenus");
	stat(stats, String(totals.jours), "jours avec au moins un 1%");

	// Vue du cycle : un carré par jour, plein si un 1% a été tenu. Un jour vide reste neutre.
	const done = new Set<number>();
	for (const f of repo.filesIn("Jours")) {
		if (!repo.belongsTo(f, cycle)) continue;
		if (SLOTS.some((s) => repo.dayState(f, s.key).fait)) {
			const d = moment(f.basename, DATE_FORMAT, true);
			if (d.isValid()) done.add(repo.dayNumber(cycle, d));
		}
	}
	const milestones = new Set(repo.milestones(cycle));
	const grid = el.createDiv({ cls: "opd-grid" });
	for (let d = 1; d <= cycle.duree; d++) {
		const cell = grid.createDiv({ cls: "opd-cell", attr: { title: `Jour ${d}` } });
		if (done.has(d)) cell.addClass("is-done");
		if (d === today) cell.addClass("is-today");
		if (milestones.has(d)) cell.addClass("is-milestone");
	}

	const goalsEl = el.createDiv({ cls: "opd-goals" });
	for (const g of repo.goals(cycle)) {
		const row = goalsEl.createDiv({ cls: "opd-goal" });
		row.createEl("strong", { text: `${g.rang}. ${g.titre}` });
		const evals = Object.entries(g.evaluations).sort((a, b) => parseInt(a[0].slice(1)) - parseInt(b[0].slice(1)));
		const trajet = evals.map(([j, v]) => `${j} : ${v}/10`).join(" → ");
		row.createSpan({ text: ` · ${totals.parObjectif[g.file.path] ?? 0} pas` + (trajet ? ` · ${trajet}` : "") });
	}
}

function stat(parent: HTMLElement, value: string, label: string): void {
	const box = parent.createDiv({ cls: "opd-stat" });
	box.createDiv({ cls: "opd-stat-value", text: value });
	box.createDiv({ cls: "opd-desc", text: label });
}
