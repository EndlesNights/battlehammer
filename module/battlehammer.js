/**
 * A simple and flexible system for world-building using an arbitrary collection of character and item attributes
 * Author: Atropos
 */

// Import Modules
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

import DataImporter from "./data-importer.js"

/* -------------------------------------------- */
/*    Foundry VTT Initialization                                    */
/* -------------------------------------------- */

/**
 * Init hook.
 */
Hooks.once("init", async function() {
    console.log(`Initializing Simple battlehammer System`);

    /**
     * Set an initiative formula for the system. This will be updated later.
     * @type {String}
     */
    CONFIG.Combat.initiative = {
        formula: "1d20",
        decimals: 2
    };

    game.battlehammer = {
        BattlehammerActor,
        createBattlehammerMacro,
        useEntity: foundry.utils.isNewerVersion("9", game.version ?? game.data.version)
    };

    // Define custom Document classes
    CONFIG.Actor.documentClass = BattlehammerActor;
    CONFIG.Item.documentClass = BattlehammerItem;

    // Register sheet application classes
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("battlehammer", BattlehammerActorSheet, { makeDefault: true });
    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("battlehammer", BattlehammerItemSheet, { makeDefault: true });

    // Set up functions so that they can be called from the console under game
    game.unitCoherence = UnitCoherence;
    game.scatter = function(){Scatter()};

    Ruler.prototype.moveToken = moveToken;
    Token.prototype._refreshBorder = _refreshBorder;
    Token.prototype._getBorderColor = _getBorderColor;

    //Register keybind for Unit target 
    game.keybindings.register("battlegammer", "targetUnit", {
        name: "Target Unit",
        hint: "Targets all models within a unit.",
        editable: [{key: "KeyR"}],
        onDown: Keybindings._onTargetUnit,
        reservedModifiers: [KeyboardManager.MODIFIER_KEYS.SHIFT]
    });
    game.keybindings.register("battlegammer", "unitCoherency", {
        name: "Checks Unit Coherency",
        hint: "Draws visual lines between all models within a unit.",
        editable: [{key: "KeyF"}],
        onDown: Keybindings._onDrawUnitCoherency,
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
