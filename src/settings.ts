import { App, PluginSettingTab, Setting } from "obsidian";
import type OnePercentDiary from "./main";

export interface DiarySettings {
	rootFolder: string;
	cycleLength: number;
	milestoneInterval: number;
	plannerHeading: string;
	/** Clés des cartes d'explication déjà lues, affichées ensuite en version réduite. */
	seenGuides: string[];
}

export const DEFAULT_SETTINGS: DiarySettings = {
	rootFolder: "Activités/Routines/1% Diary",
	cycleLength: 90,
	milestoneInterval: 30,
	plannerHeading: "Planning",
	seenGuides: [],
};

export class DiarySettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: OnePercentDiary) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		const s = this.plugin.settings;

		new Setting(containerEl)
			.setName("Dossier racine")
			.setDesc("Où sont rangées la vision, les cycles, les objectifs et les notes du jour.")
			.addText((t) =>
				t.setValue(s.rootFolder).onChange(async (v) => {
					s.rootFolder = v.trim().replace(/\/+$/, "");
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Durée d'un cycle (jours)")
			.setDesc("Appliquée aux nouveaux cycles. Un cycle en cours garde sa durée.")
			.addText((t) =>
				t.setValue(String(s.cycleLength)).onChange(async (v) => {
					const n = parseInt(v, 10);
					if (n > 0) {
						s.cycleLength = n;
						await this.plugin.saveSettings();
					}
				}),
			);

		new Setting(containerEl)
			.setName("Intervalle des bilans (jours)")
			.setDesc("Un bilan est proposé tous les N jours du cycle, et à la fin.")
			.addText((t) =>
				t.setValue(String(s.milestoneInterval)).onChange(async (v) => {
					const n = parseInt(v, 10);
					if (n > 0) {
						s.milestoneInterval = n;
						await this.plugin.saveSettings();
					}
				}),
			);

		new Setting(containerEl)
			.setName("Titre de la section de planning")
			.setDesc("Section de la note du jour lue par Day Planner. Doit correspondre au réglage « heading » de Day Planner.")
			.addText((t) =>
				t.setValue(s.plannerHeading).onChange(async (v) => {
					s.plannerHeading = v.trim() || DEFAULT_SETTINGS.plannerHeading;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Cartes d'explication")
			.setDesc("Réafficher toutes les explications en version complète.")
			.addButton((b) =>
				b.setButtonText("Réinitialiser").onClick(async () => {
					s.seenGuides = [];
					await this.plugin.saveSettings();
				}),
			);
	}
}
