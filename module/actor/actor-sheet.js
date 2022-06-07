import { EntitySheetHelper } from "../helper.js";
import {ATTRIBUTE_TYPES} from "../constants.js";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class BattlehammerActorSheet extends ActorSheet {

	/** @inheritdoc */
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ["battlehammer", "sheet", "actor"],
			template: "systems/battlehammer/templates/actor/actor-sheet.html",
			width: 1032,
			height: 488,
			tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
			scrollY: [".biography", ".items", ".attributes"],
			dragDrop: [{dragSelector: ".item-list .item", dropSelector: null}]
		});
	}

	/* -------------------------------------------- */

	/** @inheritdoc */
	getData() {
		const context = super.getData();
		EntitySheetHelper.getAttributeData(context.data);
		context.shorthand = !!game.settings.get("battlehammer", "macroShorthand");
		context.systemData = context.data.data;
		context.dtypes = ATTRIBUTE_TYPES;
		// context.unit = _getUnitData();
		context.unit = this.actor.folder?.content || null;
		console.log(context.unit)
		return context;
	}

	/* -------------------------------------------- */

	/** @inheritdoc */
	activateListeners(html) {
		super.activateListeners(html);

		// Everything below here is only needed if the sheet is editable
		if ( !this.isEditable ) return;

		// Attribute Management
		html.find(".attributes").on("click", ".attribute-control", EntitySheetHelper.onClickAttributeControl.bind(this));
		html.find(".groups").on("click", ".group-control", EntitySheetHelper.onClickAttributeGroupControl.bind(this));
		html.find(".attributes").on("click", "a.attribute-roll", EntitySheetHelper.onAttributeRoll.bind(this));

		// Item Controls
		html.find(".item-control").click(this._onItemControl.bind(this));
		html.find(".items .rollable").on("click", this._onItemRoll.bind(this));



		html.find(".getSheet").on("click", this._onGetSheet.bind(this));

		// Add draggable for Macro creation
		html.find(".attributes a.attribute-roll").each((i, a) => {
			a.setAttribute("draggable", true);
			a.addEventListener("dragstart", ev => {
				let dragData = ev.currentTarget.dataset;
				ev.dataTransfer.setData('text/plain', JSON.stringify(dragData));
			}, false);
		});
	}

	/* -------------------------------------------- */

	/**
	 * Handle click events for Item control buttons within the Actor Sheet
	 * @param event
	 * @private
	 */
	_onItemControl(event) {
		event.preventDefault();

		// Obtain event data
		const button = event.currentTarget;
		const li = button.closest(".item");
		const item = this.actor.items.get(li?.dataset.itemId);

		// Handle different actions
		switch ( button.dataset.action ) {
			case "create":
				const cls = getDocumentClass("Item");
				return cls.create({name: game.i18n.localize("battlehammer.ItemNew"), type: "item"}, {parent: this.actor});
			case "edit":
				return item.sheet.render(true);
			case "delete":
				return item.delete();
		}
	}

	/* -------------------------------------------- */

	/**
	 * Listen for roll buttons on items.
	 * @param {MouseEvent} event        The originating left click event
	 */
	_onItemRoll(event) {
		let button = $(event.currentTarget);
		const li = button.parents(".item");
		const item = this.actor.items.get(li.data("itemId"));
		let r = new Roll(button.data('roll'), this.actor.getRollData());
		return r.toMessage({
			user: game.user.id,
			speaker: ChatMessage.getSpeaker({ actor: this.actor }),
			flavor: `<h2>${item.name}</h2><h3>${button.text()}</h3>`
		});
	}

	/* -------------------------------------------- */

	/**
	 * Listen for getting quick acsees to other sheets
	 * @param {MouseEvent} event        The originating left click event
	 */
	_onGetSheet(event){
		const actorID = event.currentTarget?.dataset?.actorId;
		if(actorID && this.actor.id !== actorID){
			game.actors.get(actorID)?.sheet.render(true);
			if(event.shiftKey) {return;}
			this.close();
		}
	}
	/* -------------------------------------------- */

	/** @inheritdoc */
	_getSubmitData(updateData) {
		let formData = super._getSubmitData(updateData);
		formData = EntitySheetHelper.updateAttributes(formData, this.object);
		formData = EntitySheetHelper.updateGroups(formData, this.object);
		return formData;
	}

	/* -------------------------------------------- */

	_getUnitData(){
		return this.actor.folder.content;
	}
}
