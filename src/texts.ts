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

export const VISION_QUESTIONS = [
	{ key: "motivation", heading: "Ce qui me motive chaque jour", placeholder: "Qu'est-ce qui me fait continuer, même les jours difficiles ?" },
	{ key: "souvenir", heading: "Comment je veux qu'on se souvienne de moi", placeholder: "Ce que je voudrais que les autres retiennent de moi." },
	{ key: "assez", heading: "Est-ce que c'est assez ?", placeholder: "Relis tes deux réponses : te portent-elles vraiment ? Que manque-t-il ?" },
] as const;
