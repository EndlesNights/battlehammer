// Namespace Configuration Values
export const BATTLEHAMMER = {};

BATTLEHAMMER.ASCII = `TODO: Make ASCII Art`;

BATTLEHAMMER.phases = [
	'start',
	'command',
	'move',
	'psychic',
	'shoot',
	'charge',
	'fight',
	'morale',
];

BATTLEHAMMER.activationPhases = [
	'start',
	'play'
];


BATTLEHAMMER.statusEffects = [
	{
		id:"activated",
		label: "Activated",
		icon: "systems/battlehammer/icons/statusEffects/power-button.svg"
	},
	{
		id: "dead",
		label: "EFFECT.statusDead",
		icon: "icons/svg/skull.svg"
	}
]