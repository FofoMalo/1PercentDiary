// Textes d'explication du plugin, rédigés pour lui. Ne pas y recopier le contenu du carnet d'origine.

export interface Guide {
	title: string;
	/** Rappel d'une ligne, affiché une fois la carte lue. */
	short: string;
	body: string[];
}

export const GUIDES: Record<string, Guide> = {
	vision: {
		title: "Pourquoi commencer par le pourquoi",
		short: "Ta vision est la boussole : chaque petit pas doit pouvoir y remonter.",
		body: [
			"Avant de choisir quoi faire, on pose ce qui te fait avancer. Les jours sans élan, c'est cette page qui te rappelle pourquoi un petit pas compte quand même.",
			"Pas besoin d'une réponse parfaite. Écris ce qui est vrai aujourd'hui, tu la reliras à chaque bilan et elle pourra évoluer.",
		],
	},
	objectifs: {
		title: "Trois objectifs, pas plus",
		short: "Trois objectifs précis, chacun avec sa raison d'être et sa mesure.",
		body: [
			"Une vision donne la direction, un objectif donne une cible. On en garde trois pour que l'énergie ne se disperse pas.",
			"Pour chacun : pourquoi il compte pour toi (le lien avec ta vision), et comment tu sauras que tu avances (quelque chose d'observable).",
			"Note ensuite où tu en es aujourd'hui, de 1 à 10. Ce chiffre n'est pas un jugement : c'est ta ligne de départ.",
		],
	},
	banque: {
		title: "Ta réserve de petits pas",
		short: "Un bon 1% est précis, demande un effort, reste faisable et se vérifie sans hésiter.",
		body: [
			"Note en vrac toutes les petites actions qui rapprocheraient de cet objectif. Tu y puiseras chaque jour.",
			"Un bon 1% : assez précis pour savoir quoi faire, assez exigeant pour te pousser, assez petit pour tenir dans une vraie journée, et vérifiable par oui ou non.",
		],
	},
	jour: {
		title: "Ton engagement du jour",
		short: "Un 1% par objectif, rangés par priorité. Le non négociable passe avant tout.",
		body: [
			"Chaque case correspond à un objectif. Le non négociable est celui que tu tiens quoi qu'il arrive ; le boost et le bonus se font si la journée le permet.",
			"Tu peux changer l'ordre d'un jour à l'autre selon ce qui compte le plus aujourd'hui.",
			"Un jour manqué n'efface rien : demain, tu reprends simplement là où tu t'es arrêté.",
		],
	},
	semaine: {
		title: "Planifier ta semaine",
		short: "Un petit pas par objectif et par jour : décidé à l'avance, il ne reste qu'à le faire.",
		body: [
			"Prends quelques minutes en début de semaine pour répartir tes 1%. Chaque jour, la note du jour reprendra ce que tu as prévu.",
			"Toutes les cases n'ont pas besoin d'être remplies : certains jours n'auront pas la place pour les trois objectifs, et c'est normal.",
			"Les cases cochées dans tes notes du jour apparaissent ici : tu vois ta semaine se construire.",
		],
	},
	revue: {
		title: "Regarder ta semaine",
		short: "On regarde ce qui a été fait, on garde ce qui marche, on ajuste le reste.",
		body: [
			"Quelques minutes suffisent. Les chiffres ci-dessous sont un repère, pas une note : une semaine plus calme fait aussi partie du chemin.",
			"Réponds aux questions juste en dessous, avec tes mots. Ce que tu retiens nourrit la planification de la semaine suivante.",
			"Un objectif resté sans pas n'est pas un échec : c'est une information. Est-il toujours prioritaire, ou le petit pas était-il trop grand ?",
		],
	},
	bilan: {
		title: "Le temps d'un bilan",
		short: "Note où tu en es, puis relis ton pourquoi : est-ce que c'est assez ?",
		body: [
			"Tu as parcouru un bout du chemin. Pour chaque objectif, note où tu en es aujourd'hui, de 1 à 10, en pensant à ta mesure du succès.",
			"Relis ensuite ta vision. Ce que tu as vécu ces dernières semaines la confirme-t-il ? Si ta réponse a changé, réécris-la : l'ancienne version est gardée.",
		],
	},
	cycle: {
		title: "Le chemin parcouru",
		short: "On compte les pas faits, jamais les jours manqués.",
		body: [
			"Le total grandit à chaque 1% tenu. Les jours vides restent neutres : la régularité se lit sur la durée, pas sur une journée.",
			"À chaque bilan, relis ta vision et pose-toi la question : est-ce que c'est assez ?",
		],
	},
};

export const SLOTS = [
	{ key: "nn", label: "1% non négociable", hint: "Celui que tu tiens quoi qu'il arrive" },
	{ key: "boost", label: "1% boost", hint: "Si la journée le permet" },
	{ key: "bonus", label: "1% bonus", hint: "Pour aller un cran plus loin" },
] as const;

export type SlotKey = (typeof SLOTS)[number]["key"];

export const REVIEW_SECTIONS = [
	"Ma semaine en quelques mots",
	"Ce qui m'a fait avancer",
	"Ce que je ferais autrement",
	"Ce que je garde pour la semaine prochaine",
];

export const VISION_QUESTIONS = [
	{ key: "motivation", heading: "Ce qui me motive chaque jour", placeholder: "Qu'est-ce qui me fait continuer, même les jours difficiles ?" },
	{ key: "souvenir", heading: "Comment je veux qu'on se souvienne de moi", placeholder: "Ce que je voudrais que les autres retiennent de moi." },
	{ key: "assez", heading: "Est-ce que c'est assez ?", placeholder: "Relis tes deux réponses : te portent-elles vraiment ? Que manque-t-il ?" },
] as const;
