import { GUIDES } from "../texts";
import type OnePercentDiary from "../main";

/**
 * Carte d'explication : complète pendant la session où elle est découverte (les blocs se
 * redessinent souvent), puis réduite à un rappel d'une ligne qu'on peut redéplier.
 */
export function renderGuide(container: HTMLElement, key: string, plugin: OnePercentDiary): void {
	const guide = GUIDES[key];
	if (!guide) return;
	const seen = plugin.settings.seenGuides.includes(key) && !plugin.guidesShownThisSession.has(key);

	const details = container.createEl("details", { cls: "opd-guide" });
	details.open = !seen;
	details.createEl("summary", { text: seen ? guide.short : guide.title });
	for (const p of guide.body) details.createEl("p", { text: p });

	if (!plugin.settings.seenGuides.includes(key)) {
		plugin.guidesShownThisSession.add(key);
		plugin.settings.seenGuides.push(key);
		void plugin.saveSettings();
	}
}
