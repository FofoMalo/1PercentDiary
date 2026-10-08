# 1% Diary - conception

Plugin Obsidian personnel inspiré du concept du *1% Diary* de Steven Bartlett : progresser un peu chaque jour vers des objectifs alignés sur son pourquoi, sans viser la perfection.

On reprend le **concept** (la méthode), jamais les textes ni la mise en page du carnet. Tous les textes d'explication du plugin sont écrits de zéro, en français.

## 1. La méthode, en entonnoir

Un cycle (90 jours par défaut, durée réglable) descend du plus large au plus concret :

| Étape | Contenu | Fréquence |
|---|---|---|
| Vision | Mon pourquoi : ce qui me motive chaque jour, comment je veux qu'on se souvienne de moi, est-ce que c'est assez ? | 1 fois, relue à chaque bilan |
| Objectifs | 3 objectifs, chacun avec son pourquoi, sa mesure du succès et une auto-évaluation de 1 à 10 | Début de cycle |
| Banque de 1% | Toutes les petites actions possibles, par objectif | Début de cycle, enrichie ensuite |
| Semaine | Répartition des 1% sur 7 jours x 3 objectifs | Chaque semaine |
| Jour | 1% non négociable, 1% boost, 1% bonus (un par objectif, classés par priorité du jour), tâches, pensées, ce que j'ai appris | Chaque jour |
| Revue | Bilan de la semaine, total des 1% réalisés ; bilan élargi aux jalons (J30, J60, J90 pour un cycle de 90 jours) | Chaque semaine + jalons |

Critères d'un bon 1% : précis, demande un effort mais reste faisable, vérifiable sans hésitation, constant ou varié selon la personne.

Principe directeur : **la progression plutôt que la perfection**. Un jour manqué n'est pas un échec, on reprend là où on s'était arrêté. On compte un **total**, jamais une série de jours consécutifs.

## 2. Les quatre piliers

- **Explicatif** : chaque écran porte une carte d'explication, dépliée la première fois puis réduite à un rappel d'une ligne.
- **Guidant** : parcours ordonné (vision, puis objectifs, puis banque, puis semaine, puis jour) ; le plugin propose toujours la prochaine action.
- **Progression** : compteur de 1% (semaine, cycle), auto-évaluations 1-10 aux jalons affichées comme un trajet entre une ligne de départ et une ligne d'arrivée, vue du cycle où un jour manqué reste neutre (jamais rouge).
- **Alignement** : chaque 1% du jour est lié à son objectif, chaque objectif à la vision, par des liens Obsidian. La revue signale un objectif délaissé. La question « est-ce que c'est assez ? » est reposée à chaque jalon.

## 3. Décisions

| Sujet | Décision |
|---|---|
| Vault cible | PersonalOS (`~/SynologyDrive/PersonalOS`), sans git, synchronisé (Synology + Obsidian Sync) |
| Emplacement | Espace dédié `Activités/Routines/1% Diary/`, le journal Simple Journal reste intact |
| Planning heure par heure | Délégué à un plugin tiers (à choisir, aucun installé) |
| Partage / rendre des comptes | Aucun, strictement personnel |
| Durée de cycle | Réglable, 90 jours par défaut ; jalons de bilan dérivés de la durée |

## 4. Modèle de données

Tout est en Markdown lisible sans le plugin. **L'état vit dans le frontmatter** (écrit via `app.fileManager.processFrontMatter`), le corps des notes est libre et n'est jamais analysé.

Dossiers à plat, rattachés au cycle par une propriété (une durée réglable rend les dossiers par cycle fragiles) :

```
Activités/Routines/1% Diary/
  Vision.md
  Cycles/2026-10-09.md          <- un cycle = une note (début, durée)
  Objectifs/Sommeil.md          <- une note par objectif (visible dans le graphe)
  Semaines/2026-S41.md
  Jours/2026-10-09.md           <- chemin fixe, exploitable par un planner tiers
  Revues/2026-S41.md, Revues/Cycle 2026-10-09 J30.md
```

Propriétés principales (provisoires) :

- **Vision** : `type: vision`, `revue_le` ; les réponses dans le corps.
- **Cycle** : `type: cycle`, `debut`, `duree_jours`, `objectifs: [[[Sommeil]], ...]`.
- **Objectif** : `type: objectif`, `cycle`, `rang`, `pourquoi`, `mesure`, `evaluations` (une valeur 1-10 par jalon), `banque` (liste des 1% possibles).
- **Jour** : `type: jour`, `cycle`, `jour_n`, et à plat pour chaque case (`nn_`, `boost_`, `bonus_`) : `_texte`, `_objectif` (lien), `_fait` (booléen). Pas de cases à cocher `- [ ]` pour les 1%, pour ne pas polluer les requêtes Obsidian Tasks du vault.
- **Semaine** : `type: semaine`, `cycle`, le plan des 7 jours.
- **Revue** : `type: revue`, `periode`, `total_1pct` ; réponses dans le corps.

## 5. Découpage

**MVP** : réglages (dossier, durée de cycle), assistant Vision, assistant 3 objectifs (pourquoi, mesure, évaluation de départ, banque), note du jour (non négociable / boost / bonus + total en cours).

**Ensuite** : grille de la semaine, revue hebdo, bilans de jalon, vue du cycle, panneau « prochaine étape ».

## 6. Questions ouvertes

- Quel plugin de planning, et faut-il repointer les Daily Notes (dossier actuel inexistant) vers `Jours/` pour qu'il trouve les notes du jour ?
- Lien éventuel avec `Activités/Routines/Revues-Hebdo` (revue hebdo SuperProductivity existante).

## 7. Développement

Ne jamais développer directement dans PersonalOS : vault de test jetable, puis copie de `main.js`, `manifest.json`, `styles.css` après sauvegarde et Obsidian fermé.
