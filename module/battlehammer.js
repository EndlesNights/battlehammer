/**
 * A simple and flexible system for world-building using an arbitrary collection of character and item attributes
 * Author: Atropos
 */

// Import Modules
import { BATTLEHAMMER } from "./config.js";

import { BattlehammerActor } from "./actor/actor.js";
import { BattlehammerItem } from "./item/item.js";
import { BattlehammerItemSheet } from "./item/item-sheet.js";
import { BattlehammerActorSheet } from "./actor/actor-sheet.js";
import { preloadHandlebarsTemplates } from "./templates.js";
import { createBattlehammerMacro } from "./macro.js";

import moveToken from "./overrides/moveToken.js"
import _refreshBorder from "./overrides/_refreshBorder.js"
import _getBorderColor from "./overrides/_getBorderColor.js"

import Keybindings from "./keybindings/Keybindings.js"


import UnitCoherence from "./apps/coherency.js";
import Scatter from "./apps/scatter.js";
import UnitCover from "./apps/coverCalculator.js"

import DataImporter from "./data-importer.js"

import {PhaseCombat, PhaseCombatTracker, prepareDerivedData, _getInitiativeFormula} from './combat/combat.js';

import DropFolder from "./apps/dropFolder.js";

/* -------------------------------------------- */
/*    Foundry VTT Initialization                                    */
/* -------------------------------------------- */

/**
 * Init hook.
 */
Hooks.once("init", async function() {
	console.log(`Initializing Battlehammer System`);

	//Currently disabled the Combat State Button as with how Combat Tracker works in this module, it funcationly does nothing.
	TokenHUD.prototype._onClickControl = (function(){
		const original = TokenHUD.prototype._onClickControl;
		return function() {
			if (arguments[0].currentTarget.dataset.action === "combat") return console.log("Currently turned off to do nothing.")
			return original.apply(this, arguments);
		}
	})();

	/**
	 * Set an initiative formula for the system. This will be updated later.
	 * @type {String}
	 */
	CONFIG.Combat.initiative = {
		formula: "1d20",
		decimals: 2
	};

	CONFIG.Combat.documentClass = PhaseCombat;
	CONFIG.ui.combat = PhaseCombatTracker;

	game.battlehammer = {
		config: BATTLEHAMMER,
		BattlehammerActor,
		createBattlehammerMacro,
		useEntity: foundry.utils.isNewerVersion("9", game.version ?? game.data.version)
	};

	// Define custom Document classes
	CONFIG.Actor.documentClass = BattlehammerActor;
	CONFIG.Item.documentClass = BattlehammerItem;

	// Register sheet application classes
	Actors.unregisterSheet("core", ActorSheet);
	Actors.registerSheet("battlehammer", BattlehammerActorSheet, {
		types: ["modelWH"],
		label: "Model (WH)",
		makeDefault: true 
	});
	Items.unregisterSheet("core", ItemSheet);
	Items.registerSheet("battlehammer", BattlehammerItemSheet, {
		types: ["weaponWH"],
		label: "Weapon (WH)",
		 makeDefault: true 
	});

	// Set up functions so that they can be called from the console under game
	game.unitCoherence = UnitCoherence;
	game.unitCover = UnitCover;
	game.scatter = function(){Scatter()};

	Ruler.prototype.moveToken = moveToken;
	Token.prototype._refreshBorder = _refreshBorder;
	Token.prototype._getBorderColor = _getBorderColor;
	Token.prototype._onClickLeft2 = (function (){
        const original = Token.prototype._onClickLeft2
        return function () {

			if(arguments[0].data.originalEvent.shiftKey){
				const folderID = arguments[0].target.actor.folder?.id;
				if(!folderID) return original.apply(this, arguments);

				let unit = new Set();
				for(const t of canvas.tokens.placeables){
					if(t.actor.folder?.id == folderID) {                  
						unit.add(t.id);
					}
				}

				let userSelected = new Set();
				for(const t of canvas.tokens.controlled){
					userSelected.add(t.id)
				}

				// Add the click on token to the selection, since as part of double clicking, you unselect the token
				userSelected.add(arguments[0].target.id);
				//if the entire unit is already selected, then deselect that entire unit from the contorled selection set
				if(Array.from(unit).every(v => Array.from(userSelected).includes(v))) {
					for(const u of unit){
						canvas.scene.tokens.get(u).object.release();
					}
					return;
				}

				for(const u of unit){
					canvas.scene.tokens.get(u).object.control({releaseOthers: false});
				}

				return;
				console.log("Double Click Shift, add unit to selection, or deselect unit")
			}
            return original.apply(this, arguments);
        }
    })();


	Combatant.prototype.prepareDerivedData = prepareDerivedData;
	Combatant.prototype._getInitiativeFormula = _getInitiativeFormula;

	game.system.data.initiative = "1d6";

	//Register keybind for Unit target 
	game.keybindings.register("battlehammer", "targetUnit", {
		name: "Target Unit",
		hint: "Targets all models within a unit.",
		editable: [{key: "KeyR"}],
		onDown: Keybindings._onTargetUnit,
		reservedModifiers: [KeyboardManager.MODIFIER_KEYS.SHIFT]
	});

	//Register keybind for Coherency Check
	game.keybindings.register("battlehammer", "unitCoherency", {
		name: "Checks Unit Coherency",
		hint: "Draws visual lines between all models within a unit.",
		editable: [{key: "KeyF"}],
		onDown: Keybindings._onDrawUnitCoherency,
		reservedModifiers: [KeyboardManager.MODIFIER_KEYS.SHIFT]
	});

	game.keybindings.register("battlehammer", "coverCalc", {
		name: "Check Cover",
		hint: "Check the cover between the selected and targeted tokens",
		editable: [{key: "KeyG"}],
		onDown: Keybindings._onCoverCalculate,
		reservedModifiers: [KeyboardManager.MODIFIER_KEYS.SHIFT]
	});

	//Register Data Importer
	game.settings.registerMenu("battlehammer", "aieImporter", {
		name: "Roster Import",
		label: "Roster Importer (save settings before using)",
		hint: "Import data from vmod",
		icon: "fas fa-file-import",
		type: DataImporter,
		restricted: true,
	});

	game.settings.register("battlehammer", "aieImporter", {
		name: "Roster Importer",
		scope: "world",
		default: {},
		config: false,
		default: {},
		type: Object,
	});

	game.settings.register("battlehammer", "importpath", {
		name: "Import Path (Data/)",
		hint: "Location where the module will look for Roster rosz files to import",
		scope: "world",
		config: true,
		default: "rosters/import",
		type: String
	});

	// Register system settings
	game.settings.register("battlehammer", "macroShorthand", {
		name: "SETTINGS.SimpleMacroShorthandN",
		hint: "SETTINGS.SimpleMacroShorthandL",
		scope: "world",
		type: Boolean,
		default: true,
		config: true
	});

	// Register initiative setting.
	game.settings.register("battlehammer", "initFormula", {
		name: "SETTINGS.SimpleInitFormulaN",
		hint: "SETTINGS.SimpleInitFormulaL",
		scope: "world",
		type: String,
		default: "1d20",
		config: true,
		onChange: formula => _simpleUpdateInit(formula, true)
	});

	// Retrieve and assign the initiative formula setting.
	const initFormula = game.settings.get("battlehammer", "initFormula");
	_simpleUpdateInit(initFormula);

	/**
	 * Update the initiative formula.
	 * @param {string} formula - Dice formula to evaluate.
	 * @param {boolean} notify - Whether or not to post nofications.
	 */
	function _simpleUpdateInit(formula, notify = false) {
		const isValid = Roll.validate(formula);
		if ( !isValid ) {
			if ( notify ) ui.notifications.error(`${game.i18n.localize("battlehammer.NotifyInitFormulaInvalid")}: ${formula}`);
			return;
		}
		CONFIG.Combat.initiative.formula = formula;
	}

	/**
	 * Slugify a string.
	 */
	Handlebars.registerHelper('slugify', function(value) {
		return value.slugify({strict: true});
	});

	// Preload template partials
	await preloadHandlebarsTemplates();
});

/**
 * Macrobar hook.
 */
Hooks.on("hotbarDrop", (bar, data, slot) => createBattlehammerMacro(data, slot));

/**
 * Adds the actor template context menu.
 */
Hooks.on("getActorDirectoryEntryContext", (html, options) => {
	const idAttr = game.battlehammer.useEntity ? "entityId" : "documentId";
	// Define an actor as a template.
	options.push({
		name: game.i18n.localize("battlehammer.DefineTemplate"),
		icon: '<i class="fas fa-stamp"></i>',
		condition: li => {
			const actor = game.actors.get(li.data(idAttr));
			return !actor.getFlag("battlehammer", "isTemplate");
		},
		callback: li => {
			const actor = game.actors.get(li.data(idAttr));
			actor.setFlag("battlehammer", "isTemplate", true);
		}
	});

	// Undefine an actor as a template.
	options.push({
		name: game.i18n.localize("battlehammer.UnsetTemplate"),
		icon: '<i class="fas fa-times"></i>',
		condition: li => {
			const actor = game.actors.get(li.data(idAttr));
			return actor.getFlag("battlehammer", "isTemplate");
		},
		callback: li => {
			const actor = game.actors.get(li.data(idAttr));
			actor.setFlag("battlehammer", "isTemplate", false);
		}
	});
});

/**
 * Adds the item template context menu.
 */
Hooks.on("getItemDirectoryEntryContext", (html, options) => {
	const idAttr = game.battlehammer.useEntity ? "entityId" : "documentId";
	// Define an item as a template.
	options.push({
		name: game.i18n.localize("battlehammer.DefineTemplate"),
		icon: '<i class="fas fa-stamp"></i>',
		condition: li => {
			const item = game.items.get(li.data(idAttr));
			return !item.getFlag("battlehammer", "isTemplate");
		},
		callback: li => {
			const item = game.items.get(li.data(idAttr));
			item.setFlag("battlehammer", "isTemplate", true);
		}
	});

	// Undefine an item as a template.
	options.push({
		name: game.i18n.localize("battlehammer.UnsetTemplate"),
		icon: '<i class="fas fa-times"></i>',
		condition: li => {
			const item = game.items.get(li.data(idAttr));
			return item.getFlag("battlehammer", "isTemplate");
		},
		callback: li => {
			const item = game.items.get(li.data(idAttr));
			item.setFlag("battlehammer", "isTemplate", false);
		}
	});
});

Hooks.on("preCreateScene", (scene, data, options, userID) => {
	//set default gridType to gridless
	scene.data.update({gridType: 0});
});


Hooks.on("hoverToken", (token, isHovering) => {
	if(!game.combat?.combatants.size) return;
	if(isHovering){
		ui.combat.hoverCombatant(getCombatantHover(token), true)
	} else {
		ui.combat.hoverCombatant(getCombatantHover(token), false)
	}
})

function getCombatantHover(token){
	for(const combatant of game.combat.combatants){
		if(token.actor.folder?.id === combatant.data.flags.battlehammer?.unitData?.folderId){
			return combatant;
		}
	}
}

// While holding down shift, apply effect from all other actors within a Unit 
Hooks.on("preCreateActiveEffect", async (effect, data, context, user) => {
	if(!game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.SHIFT)) return;
	if(data.options?.linkGenerated) return;

	for(const actor of effect.parent.folder.content){
		if(actor.id === effect.parent.id){
			continue;
		}
		let duplicateCheck = false;
		if(actor.effects.size){

			for(const effect of actor.effects.contents){
				// if(effect.data.flags.core.statusId === data.flags.core.statusId){
				if(effect.data.label === data.label){
					duplicateCheck = true;
					break;
				}
			}
			if(duplicateCheck) continue;
		}

		actor.createEmbeddedDocuments("ActiveEffect", [{
			_id: data.label,
			label: data.label,
			icon: data.icon,
			flags: data.flags,
			changes: [],
			options: {linkGenerated:true}
		}]);		
	}
});

// While holding down shift, delete effect from all other actors within a Unit 
Hooks.on("preDeleteActiveEffect", async (effect, context, user) => {

	if(!game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.SHIFT)) return;
	if(context.linkGenerated) return;

	for(const actor of effect.parent.folder.content){
		if(actor.id === effect.parent.id){
			continue;
		}
		if(!actor.effects.size) continue;
		for(const effect of actor.effects.contents){
			if(effect.data.label === effect.data.label){
				effect.delete({linkGenerated:true});
				break;
			}
		}
	}
});