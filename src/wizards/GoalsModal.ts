import { Modal, Notice, Setting, TFile, moment } from "obsidian";
import { looksMeasurable } from "../repository";
import type OnePercentDiary from "../main";
import type { Cycle } from "../repository";
import { VISION_QUESTIONS } from "../texts";
import { renderGuide } from "../ui/guide";

interface GoalDraft {
	file: TFile | null;
	titre: string;
	pourquoi: string;
	mesure: string;
	/** null tant que l'utilisateur n'a pas choisi : pas de valeur par défaut silencieuse. */
	evaluation: number | null;
	banque: string;
}

const GOAL_COUNT = 3;

/**
 * Assistant des objectifs : intro, puis un écran par objectif (titre, pourquoi, mesure,
 * ligne de départ, réserve de 1%), puis récapitulatif. Ajuste le cycle en cours s'il existe.
 */
export class GoalsModal extends Modal {
	private step = 0;
	private cycle: Cycle | null;
	private duree: number;
	private drafts: GoalDraft[] = [];
	private visionReminder = "";

	constructor(private plugin: OnePercentDiary, private onDone?: (cycle: Cycle, goals: TFile[]) => void) {
		super(plugin.app);
		this.cycle = plugin.repo.cycleAt(moment());
		this.duree = this.cycle?.duree ?? plugin.settings.cycleLength;
	}

	async onOpen(): Promise<void> {
		const existing = this.cycle ? this.plugin.repo.goals(this.cycle) : [];
		for (let i = 0; i < GOAL_COUNT; i++) {
			const g = existing[i];
			this.drafts.push({
				file: g?.file ?? null,
				titre: g?.titre ?? "",
				pourquoi: g?.pourquoi ?? "",
				mesure: g?.mesure ?? "",
				evaluation: g?.evaluations.J0 ?? null,
				banque: (g?.banque ?? []).join("\n"),
			});
		}
		const vision = await this.plugin.repo.visionSections();
		this.visionReminder = vision[VISION_QUESTIONS[0].heading] ?? "";
		this.render();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private render(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("opd-wizard");
		this.titleEl.setText(this.cycle ? "Ajuster mes objectifs" : "Mes 3 objectifs");

		if (this.step === 0) this.renderIntro();
		else if (this.step <= GOAL_COUNT) this.renderGoal(this.step - 1);
		else this.renderRecap();

		this.renderNav();
	}

	private renderIntro(): void {
		const el = this.contentEl;
		renderGuide(el, "objectifs", this.plugin);
		if (this.cycle) {
			el.createEl("p", {
				text: `Cycle en cours, commencé le ${this.cycle.debut.format("DD/MM/YYYY")} (${this.cycle.duree} jours). Les changements s'y appliquent.`,
			});
			return;
		}
		new Setting(el)
			.setName("Durée du cycle (jours)")
			.setDesc("Le cycle commence aujourd'hui.")
			.addText((t) =>
				t.setValue(String(this.duree)).onChange((v) => {
					const n = parseInt(v, 10);
					if (n > 0) this.duree = n;
				}),
			);
	}

	private renderGoal(i: number): void {
		const el = this.contentEl;
		const d = this.drafts[i];
		el.createEl("div", { cls: "opd-step", text: `Objectif ${i + 1} sur ${GOAL_COUNT}` });
		if (this.visionReminder) {
			el.createDiv({ cls: "opd-reminder", text: `Ce qui te motive : ${this.visionReminder}` });
		}

		this.field("Objectif", "Ce que tu veux atteindre, en une phrase.", d.titre, (v) => (d.titre = v), false);
		this.field("Mon pourquoi", "En quoi cet objectif sert ta vision ?", d.pourquoi, (v) => (d.pourquoi = v));
		const mesure = this.field(
			"Mesure du succès",
			`Que verras-tu concrètement au jour ${this.duree} ? Une mesure se vérifie par oui ou non, souvent avec un chiffre.`,
			d.mesure,
			(v) => {
				d.mesure = v;
				hint.toggle(!!v.trim() && !looksMeasurable(v));
			},
			true,
			"Ex. : 3 moments de jeu sans écran par semaine ; 500 € épargnés",
		);
		const hint = mesure.createDiv({
			cls: "opd-hint",
			text: "Cela ressemble à un thème plutôt qu'à une mesure : combien, à quelle fréquence, ou quel résultat visible ?",
		});
		hint.toggle(!!d.mesure.trim() && !looksMeasurable(d.mesure));

		const scale = el.createDiv({ cls: "opd-field" });
		scale.createEl("label", { text: "Ligne de départ" });
		scale.createEl("div", { cls: "opd-desc", text: "De 1 à 10, où en es-tu vraiment aujourd'hui ? Pas de bonne réponse, juste un point de départ honnête." });
		const row = scale.createDiv({ cls: "opd-scale" });
		for (let n = 1; n <= 10; n++) {
			const b = row.createEl("button", { text: String(n), cls: d.evaluation === n ? "is-selected" : "" });
			b.addEventListener("click", () => {
				d.evaluation = n;
				row.querySelectorAll("button").forEach((x) => x.removeClass("is-selected"));
				b.addClass("is-selected");
			});
		}

		if (i === 0) renderGuide(el, "banque", this.plugin);
		this.field("Mes 1% possibles", "Un petit pas par ligne.", d.banque, (v) => (d.banque = v));
	}

	private field(
		name: string,
		desc: string,
		value: string,
		set: (v: string) => void,
		multiline = true,
		placeholder = "",
	): HTMLElement {
		const wrap = this.contentEl.createDiv({ cls: "opd-field" });
		wrap.createEl("label", { text: name });
		wrap.createEl("div", { cls: "opd-desc", text: desc });
		const input = multiline
			? wrap.createEl("textarea", { cls: "opd-textarea", attr: { rows: "3", placeholder } })
			: wrap.createEl("input", { attr: { type: "text", placeholder } });
		input.value = value;
		input.addEventListener("input", () => set(input.value));
		return wrap;
	}

	private renderRecap(): void {
		const el = this.contentEl;
		el.createEl("h3", { text: "Récapitulatif" });
		this.drafts.forEach((d, i) => {
			const box = el.createDiv({ cls: "opd-recap" });
			box.createEl("strong", { text: `${i + 1}. ${d.titre || "(sans titre)"}` });
			box.createEl("p", { text: `Pourquoi : ${d.pourquoi || "-"}` });
			box.createEl("p", { text: `Mesure : ${d.mesure || "-"}` });
			if (d.mesure.trim() && !looksMeasurable(d.mesure)) {
				box.createEl("p", { cls: "opd-hint", text: "Cette mesure sera-t-elle vérifiable au bilan ?" });
			}
			const idees = this.lines(d.banque).length;
			box.createEl("p", { text: `Départ : ${d.evaluation}/10 · ${idees} idée(s) de 1%` });
			if (idees === 0) {
				box.createEl("p", { cls: "opd-hint", text: "Réserve vide : tu pourras l'alimenter depuis la note du jour." });
			}
		});
	}

	private renderNav(): void {
		const nav = this.contentEl.createDiv({ cls: "opd-nav" });
		if (this.step > 0) {
			nav.createEl("button", { text: "Précédent" }).addEventListener("click", () => {
				this.step--;
				this.render();
			});
		}
		const last = this.step === GOAL_COUNT + 1;
		nav.createEl("button", { text: last ? "Enregistrer" : "Suivant", cls: "mod-cta" }).addEventListener("click", () => {
			const d = this.step >= 1 && this.step <= GOAL_COUNT ? this.drafts[this.step - 1] : null;
			if (d && !d.titre.trim()) {
				new Notice("Donne un titre à cet objectif.");
				return;
			}
			if (d && d.evaluation === null) {
				new Notice("Choisis ta ligne de départ, de 1 à 10.");
				return;
			}
			if (!last) {
				this.step++;
				this.render();
				return;
			}
			void this.save();
		});
	}

	private lines(text: string): string[] {
		return text.split("\n").map((l) => l.trim()).filter(Boolean);
	}

	private async save(): Promise<void> {
		const repo = this.plugin.repo;
		const cycle = this.cycle ?? (await repo.createCycle(moment().startOf("day"), this.duree));
		const files: TFile[] = [];
		for (const [i, d] of this.drafts.entries()) {
			files.push(
				await repo.saveGoal(cycle, d.file, {
					rang: i + 1,
					titre: d.titre,
					pourquoi: d.pourquoi.trim(),
					mesure: d.mesure.trim(),
					banque: this.lines(d.banque),
					evaluation: d.evaluation ?? undefined,
				}),
			);
		}
		await repo.setCycleGoals(cycle, files);
		new Notice("Objectifs enregistrés.");
		this.close();
		this.onDone?.(cycle, files);
	}
}
