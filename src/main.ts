import { Notice, Plugin, TFile, moment } from "obsidian";
import { Cycle, DiaryRepo } from "./repository";
import { DEFAULT_SETTINGS, DiarySettingTab, DiarySettings } from "./settings";
import { registerBlocks } from "./ui/blocks";
import { GoalsModal } from "./wizards/GoalsModal";
import { VisionModal } from "./wizards/VisionModal";

export default class OnePercentDiary extends Plugin {
	settings: DiarySettings = DEFAULT_SETTINGS;
	repo!: DiaryRepo;
	guidesShownThisSession = new Set<string>();

	async onload(): Promise<void> {
		await this.loadSettings();
		this.repo = new DiaryRepo(this.app, this.settings);

		registerBlocks(this);
		this.addSettingTab(new DiarySettingTab(this.app, this));

		this.addRibbonIcon("sprout", "1% Diary : prochaine étape", () => void this.nextStep());

		this.addCommand({ id: "prochaine-etape", name: "Prochaine étape", callback: () => void this.nextStep() });
		this.addCommand({ id: "vision", name: "Écrire ou revoir mon pourquoi", callback: () => new VisionModal(this).open() });
		this.addCommand({ id: "objectifs", name: "Définir ou ajuster mes 3 objectifs", callback: () => new GoalsModal(this).open() });
		this.addCommand({ id: "jour", name: "Ouvrir la note du jour", callback: () => void this.openToday() });
		this.addCommand({ id: "cycle", name: "Ouvrir le cycle en cours", callback: () => void this.openCycle() });
	}

	/** Le parcours guidé : vision, puis objectifs, puis la note du jour. */
	async nextStep(): Promise<void> {
		if (!this.repo.vision()) {
			new VisionModal(this, () => void this.nextStep()).open();
			return;
		}
		if (!this.repo.cycleAt(moment())) {
			// Les notes tout juste créées ne sont pas encore indexées : on transmet le cycle.
			new GoalsModal(this, (cycle, goals) => void this.openToday(cycle, goals)).open();
			return;
		}
		await this.openToday();
	}

	async openToday(known?: Cycle, goals?: TFile[]): Promise<void> {
		const cycle = known ?? this.repo.cycleAt(moment());
		if (!cycle) {
			new Notice("Aucun cycle en cours : commence par définir tes 3 objectifs.");
			return;
		}
		const file = await this.repo.openOrCreateDay(cycle, moment(), goals);
		await this.app.workspace.getLeaf(false).openFile(file);
	}

	async openCycle(): Promise<void> {
		const cycle = this.repo.cycleAt(moment());
		if (!cycle) {
			new Notice("Aucun cycle en cours.");
			return;
		}
		await this.app.workspace.getLeaf(false).openFile(cycle.file);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.settings.seenGuides = [...(this.settings.seenGuides ?? [])];
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
