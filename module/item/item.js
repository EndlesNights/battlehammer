import {EntitySheetHelper} from "../helper.js";

/**
 * Extend the base Item document to support attributes and groups with a custom template creation dialog.
 * @extends {Item}
 */
export class BattlehammerItem extends Item {

    /** @inheritdoc */
    prepareDerivedData() {
        super.prepareDerivedData();
        this.data.data.groups = this.data.data.groups || {};
        this.data.data.attributes = this.data.data.attributes || {};
    }

    /* -------------------------------------------- */

    /** @override */
    static async createDialog(data={}, options={}) {
        return EntitySheetHelper.createDialog.call(this, data, options);
    }
}
