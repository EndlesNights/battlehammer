import { BATTLEHAMMER } from "../config.js";
import CombatSetup from "./combat-setup.js";

export class ActivationCombat extends PhaseCombat {
    constructor(data, context) {
		super(data, context);
	}

    get isOwner(){
		return true;
	}

    _getPlayerTurn(){
		return this.combatants.values().next().value?.getFlag("battlehammer", "playerTurn") || 0;
	}

    resetPlayerTurns(){
		for(const player of this.combatants) {
			if(player.getFlag('battlehammer', 'type') === "player"){
				this.setInitiative(player.id, null)
			}
		}
		this.combatants.values().next().value.setFlag("battlehammer", "playerTurn", 0);
	}

	nextPlayerTurn() {
		if( this._getPlayerTurn() + 1 <= this.getFlag('battlehammer', 'playersSize')) { 
			console.log("ERROR Outside of expected players turns bound!")
		}
		return this.combatants.values().next().value.setFlag("battlehammer", "playerTurn", this._getPlayerTurn() + 1);
	}

	previousPlayerTurn() {
		if( this._getPlayerTurn() > 0){
			console.log("ERROR Outside of expected players turns bound!")
		}
		return this.combatants.values().next().value.setFlag("battlehammer", "playerTurn", this._getPlayerTurn() - 1);
	}

	_getCurrentPlayerID(){
		return this.turnOrder[this._getPlayerTurn()].userID;
	}

	_getCurrentPlayerName(){
		return game.users.get(this.turnOrder[this._getPlayerTurn()].userID).name;
	}
}


export class ActivationCombatTracker extends CombatTracker{

    /** @inheritdoc */
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			id: "combat",
			template: "systems/battlehammer/templates/sidebar/activation-combat-tracker.html",
			title: "Combat Tracker",
			scrollY: [".directory-list"]
		});
	}

    	/** @inheritdoc */
	async getData(options) {
        const combat = this.viewed;
		const hasCombat = combat !== null;
		if(!hasCombat) return super.getData(options);

		const combats = this.combats;
		const currentIdx = combats.findIndex(c => c === combat);

        const data = await super.getData(options);

		return data;
    }
}