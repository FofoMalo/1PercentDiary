// Copie le build dans <vault>/.obsidian/plugins/one-percent-diary
import { copyFileSync, mkdirSync, existsSync } from "fs";
import { join, resolve } from "path";

const vault = process.argv[2];
if (!vault) {
	console.error("Usage : node scripts/install.mjs <chemin du vault>");
	process.exit(1);
}
const target = join(resolve(vault), ".obsidian", "plugins", "one-percent-diary");
mkdirSync(target, { recursive: true });
for (const f of ["main.js", "manifest.json", "styles.css"]) {
	if (!existsSync(f)) {
		console.error(`${f} manquant, lancer npm run build d'abord`);
		process.exit(1);
	}
	copyFileSync(f, join(target, f));
}
console.log(`Installé dans ${target}`);
