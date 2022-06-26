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

    get getCost(){
        if(this.data.data.cost?.base){
            return {
                baseValue: this.data.data.cost.base || 0,
                defenseCost: this.data.data.cost.defense || 0,
                qualityCost: this.data.data.cost.quality || 0
            };
        }

        return null;
    }

    /* -------------------------------------------- */

    /** @override */
    // static async createDialog(data={}, options={}) {
        // return EntitySheetHelper.createDialog.call(this, data, options);
    // }
}
