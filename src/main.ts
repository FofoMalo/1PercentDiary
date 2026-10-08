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
		this.addCommand({ id: "semaine", name: "Planifier ma semaine", callback: () => void this.openWeek() });
		this.addCommand({ id: "revue", name: "Faire la revue de la semaine", callback: () => void this.openReview() });
		this.addCommand({ id: "cycle", name: "Ouvrir le cycle en cours", callback: () => void this.openCycle() });
	}

	/** Le parcours guidé : vision, objectifs, revue en attente, plan de la semaine, puis la note du jour. */
	async nextStep(): Promise<void> {
		if (!this.repo.vision()) {
			new VisionModal(this, () => void this.nextStep()).open();
			return;
		}
		if (!this.repo.cycleAt(moment())) {
			// Les notes tout juste créées ne sont pas encore indexées : on transmet le cycle.
			new GoalsModal(this, (cycle, goals) => void this.openWeek(cycle, moment(), goals)).open();
			return;
		}
		// Revue de la semaine écoulée d'abord, puis celle de la semaine en cours le dimanche.
		const lastWeek = this.repo.file(this.repo.weekPath(moment().subtract(7, "days")));
		if (lastWeek && !this.repo.reviewDone(lastWeek)) {
			await this.openReview(moment().subtract(7, "days"));
			return;
		}
		const thisWeek = this.repo.file(this.repo.weekPath(moment()));
		if (thisWeek && moment().isoWeekday() === 7 && !this.repo.reviewDone(thisWeek)) {
			await this.openReview();
			return;
		}
		if (!thisWeek) {
			await this.openWeek();
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

	async openWeek(known?: Cycle, date = moment(), goals?: TFile[]): Promise<void> {
		const cycle = known ?? this.repo.cycleAt(date);
		if (!cycle) {
			new Notice("Aucun cycle en cours : commence par définir tes 3 objectifs.");
			return;
		}
		const file = await this.repo.openOrCreateWeek(cycle, date, goals);
		await this.app.workspace.getLeaf(false).openFile(file);
	}

	async openReview(date = moment()): Promise<void> {
		const cycle = this.repo.cycleAt(date);
		const existing = this.repo.file(this.repo.weekPath(date));
		if (!existing && !cycle) {
			new Notice("Aucune semaine à revoir : pas de cycle à cette date.");
			return;
		}
		const week = existing ?? (await this.repo.openOrCreateWeek(cycle as Cycle, date));
		await this.repo.ensureReview(week);
		await this.app.workspace.getLeaf(false).openFile(week);
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
