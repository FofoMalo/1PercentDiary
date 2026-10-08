import { Modal, Notice } from "obsidian";
import type OnePercentDiary from "../main";
import { VISION_QUESTIONS } from "../texts";
import { renderGuide } from "../ui/guide";

/** Assistant de la vision : une question par écran, pour réfléchir plutôt que remplir. */
export class VisionModal extends Modal {
	private step = 0;
	private answers: Record<string, string> = {};

	constructor(private plugin: OnePercentDiary, private onDone?: () => void) {
		super(plugin.app);
	}

	async onOpen(): Promise<void> {
		const previous = await this.plugin.repo.visionSections();
		for (const q of VISION_QUESTIONS) this.answers[q.key] = previous[q.heading] ?? "";
		this.render();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private render(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("opd-wizard");
		this.titleEl.setText("Mon pourquoi");

		if (this.step === 0) renderGuide(contentEl, "vision", this.plugin);

		const q = VISION_QUESTIONS[this.step];
		contentEl.createEl("div", { cls: "opd-step", text: `Question ${this.step + 1} sur ${VISION_QUESTIONS.length}` });
		contentEl.createEl("h3", { text: q.heading });

		if (q.key === "assez") {
			// Pour juger, il faut relire ce qu'on vient d'écrire.
			const recap = contentEl.createDiv({ cls: "opd-recap" });
			for (const prev of VISION_QUESTIONS.slice(0, this.step)) {
				recap.createEl("strong", { text: prev.heading });
				recap.createEl("p", { text: this.answers[prev.key] || "(vide)" });
			}
		}

		const area = contentEl.createEl("textarea", { cls: "opd-textarea", attr: { rows: "7", placeholder: q.placeholder } });
		area.value = this.answers[q.key];
		area.addEventListener("input", () => (this.answers[q.key] = area.value));
		window.setTimeout(() => area.focus(), 0);

		const nav = contentEl.createDiv({ cls: "opd-nav" });
		if (this.step > 0) {
			nav.createEl("button", { text: "Précédent" }).addEventListener("click", () => {
				this.step--;
				this.render();
			});
		}
		const last = this.step === VISION_QUESTIONS.length - 1;
		const next = nav.createEl("button", { text: last ? "Enregistrer" : "Suivant", cls: "mod-cta" });
		next.addEventListener("click", async () => {
			if (!last) {
				this.step++;
				this.render();
				return;
			}
			const file = await this.plugin.repo.writeVision(
				VISION_QUESTIONS.map((q) => ({ heading: q.heading, text: this.answers[q.key] })),
			);
			new Notice("Vision enregistrée.");
			this.close();
			await this.app.workspace.getLeaf(false).openFile(file);
			this.onDone?.();
		});
	}
}
