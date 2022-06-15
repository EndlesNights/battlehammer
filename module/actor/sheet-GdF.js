import { BattlehammerActorSheet } from "./actor-sheet.js";

export class GrimdarkFutureSheet extends BattlehammerActorSheet{
	/** @inheritdoc */
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ["battlehammer", "sheet", "actor"],
			template: "systems/battlehammer/templates/actor/modelGdF.html",
			width: 1032,
			height: 488,
			tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
			scrollY: [".biography", ".items", ".attributes"],
			dragDrop: [{dragSelector: ".item-list .item", dropSelector: null}]
		});
	}
}