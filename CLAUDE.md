# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

Plugin Obsidian personnel (id `one-percent-diary`) inspiré du concept du *1% Diary* de Steven Bartlett : vision, 3 objectifs par cycle, un engagement quotidien de 1% par objectif, progression mesurée sans viser la perfection. La conception, les décisions et le modèle de données sont dans `DESIGN.md` : le lire avant toute évolution fonctionnelle.

Les photos `*.jpg` à la racine sont des pages du carnet d'origine, en référence privée (ignorées par git). On s'inspire de la méthode, **jamais** de ses textes ni de sa mise en page : tous les textes d'interface sont écrits de zéro, en français, dans `src/texts.ts`.

## Commandes

```bash
npm install
npm run dev            # esbuild en mode watch, régénère main.js
npm run build          # tsc (vérification de types) + bundle de production
npm run install-test   # copie main.js, manifest.json, styles.css dans test-vault/
node scripts/install.mjs <vault>   # installer dans un autre vault
```

Publier une version (installable par BRAT avec `FofoMalo/1PercentDiary`) :

```bash
npm version patch      # ou minor : met à jour package.json, manifest.json, versions.json, commit + tag sans "v"
git push --follow-tags # le tag déclenche .github/workflows/release.yml, qui crée la release avec les 3 fichiers
```

Pas de tests automatisés : on vérifie dans Obsidian (flatpak `md.obsidian.Obsidian`) en ouvrant `test-vault/` (ignoré par git), puis en rechargeant le plugin.

## Vault cible

Le vault réel est PersonalOS (`~/SynologyDrive/PersonalOS`) : **sans git**, synchronisé par Synology et Obsidian Sync. Ne jamais y développer ni y écrire en masse. Pour l'installer : sauvegarde, Obsidian fermé, puis `node scripts/install.mjs ~/SynologyDrive/PersonalOS`. Le journal y est géré par Simple Journal (`Journal/`), que le plugin ne touche pas. Le planning heure par heure est délégué à Day Planner, qui lit la section `## Planning` des notes du jour (titre réglable, doit correspondre au réglage de Day Planner).

## Architecture

- `src/main.ts` : enregistre les commandes, l'icône du ruban et les blocs de code. `nextStep()` fait le parcours guidé : vision, puis objectifs, puis note du jour.
- `src/repository.ts` (`DiaryRepo`) : **seul** point d'accès aux notes. Chemins, lecture du frontmatter via `metadataCache`, écriture via `app.fileManager.processFrontMatter`.
- `src/wizards/` : modales pas à pas (`VisionModal`, `GoalsModal`). `GoalsModal` ajuste le cycle en cours s'il existe, sinon en crée un qui commence aujourd'hui.
- `src/ui/blocks.ts` : blocs de code ` ```1pct-jour``` ` (note du jour), ` ```1pct-semaine``` ` (grille de la semaine), ` ```1pct-revue``` ` (revue, dans la note de semaine) et ` ```1pct-cycle``` ` (note de cycle), insérés dans les notes générées. Chaque bloc est un `MarkdownRenderChild` qui se redessine sur `metadataCache.on("changed")` pour sa note. Les champs texte écrivent sur `change`, pas sur `input`, sinon la re-rendu ferait perdre le focus.
- `src/ui/guide.ts` + `src/texts.ts` : cartes d'explication. Elles sont complètes à la première lecture puis réduites à un rappel, et les clés lues sont stockées dans `settings.seenGuides`.

## Règles du modèle de données

- **L'état vit dans le frontmatter**, jamais dans le corps des notes. Seule exception : `visionSections()` relit les sections `##` de `Vision.md` pour préremplir l'assistant.
- Dossiers à plat sous `settings.rootFolder` (`Cycles/`, `Objectifs/`, `Jours/`, `Archives/`). Le rattachement passe par la propriété `cycle: "[[Cycle AAAA-MM-JJ]]"`. On ne crée pas de dossier par cycle, puisque la durée est réglable.
- Liens : toujours générés avec `repo.link()` (`fileToLinktext`) et comparés après résolution avec `repo.resolve()` / `belongsTo()`, par chemin et jamais par nom, car le vault réel contient des centaines de notes et des homonymes possibles.
- Juste après leur création, les notes ne sont pas encore dans le `metadataCache`. Il faut transmettre les objets créés (voir `GoalsModal` `onDone(cycle, goals)` vers `openToday`) au lieu de relire le cache.
- `openOrCreateDay` complète une note du jour déjà créée par un autre plugin (Daily Notes, Day Planner) : propriétés manquantes et bloc `1pct-jour`.
- Note du jour `Jours/AAAA-MM-JJ.md` : propriétés à plat `{nn,boost,bonus}_{objectif,texte,fait}`. Pas de cases `- [ ]` pour les 1%, afin de ne pas polluer les requêtes Obsidian Tasks du vault.
- Évaluations 1-10 : `evaluation_J0`, `evaluation_J30`… dans la note d'objectif. Les jalons sont dérivés de `milestoneInterval` et de la durée du cycle.
- On compte un **total** de 1% tenus, jamais une série de jours consécutifs. Un jour manqué reste neutre dans l'affichage, jamais en rouge.

## Conventions

- Textes d'interface, commentaires et docs en français. Jamais de tiret cadratin : utiliser « - ».
- Classes CSS préfixées `opd-`, couleurs via les variables CSS d'Obsidian uniquement (thèmes clair et sombre).
- Commits : forme sujet-verbe-complément, sans ligne `Co-Authored-By`.
