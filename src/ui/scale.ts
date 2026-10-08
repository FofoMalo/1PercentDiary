/** Échelle de 1 à 10 en boutons, sans valeur présélectionnée tant que `selected` est null. */
export function renderScale(parent: HTMLElement, selected: number | null, onPick: (n: number) => void): HTMLElement {
	const row = parent.createDiv({ cls: "opd-scale" });
	for (let n = 1; n <= 10; n++) {
		const b = row.createEl("button", { text: String(n), cls: selected === n ? "is-selected" : "" });
		b.addEventListener("click", () => {
			row.querySelectorAll("button").forEach((x) => x.removeClass("is-selected"));
			b.addClass("is-selected");
			onPick(n);
		});
	}
	return row;
}
