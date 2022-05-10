import { EntitySheetHelper } from "../helper.js";
import {ATTRIBUTE_TYPES} from "../constants.js";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class BattlehammerItemSheet extends ItemSheet {

    /** @inheritdoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["battlehammer", "sheet", "item"],
            template: "systems/battlehammer/templates/item-sheet.html",
            width: 520,
            height: 480,
            tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
            scrollY: [".attributes"],
        });
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    getData() {
        const context = super.getData();
        EntitySheetHelper.getAttributeData(context.data);
        context.systemData = context.data.data;
        context.dtypes = ATTRIBUTE_TYPES;
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

    /** @override */
    _getSubmitData(updateData) {
        let formData = super._getSubmitData(updateData);
        formData = EntitySheetHelper.updateAttributes(formData, this.object);
        formData = EntitySheetHelper.updateGroups(formData, this.object);
        return formData;
    }
}
