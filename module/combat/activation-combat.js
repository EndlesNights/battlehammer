import { BATTLEHAMMER } from "../config.js";
import CombatSetup from "./combat-setup.js";
import {PhaseCombat, PhaseCombatTracker} from "./phase-combat.js";

export class ActivationCombat extends PhaseCombat {

	nextTurn(options){
		if(BATTLEHAMMER.activationPhases.indexOf(this.phase)){
			this.nextPlayerTurn();
		} else {
			return this.nextRound();
		}
	}

	async nextRound() {
		this._resetUnitActionsOff();
		if(BATTLEHAMMER.activationPhases.indexOf(this.phase) === BATTLEHAMMER.activationPhases.length - 1){

			this.resetPlayerTurns();
			super.nextRound();
			this.combatants.values().next().value.setFlag(
				'battlehammer',
				'phase',
				BATTLEHAMMER.activationPhases[0]
			);
			await this.render();
			return {turn: 0};
		}
		else if(BATTLEHAMMER.activationPhases.indexOf(this.phase) >= 0){
			this.combatants.values().next().value.setFlag(
				'battlehammer',
				'phase',
				BATTLEHAMMER.activationPhases[BATTLEHAMMER.activationPhases.indexOf(this.phase)+1]
			);
			await this.render();
			return {turn: 0};
		}
		else {
			this.combatants.values().next().value.setFlag(
				'battlehammer',
				'phase',
				BATTLEHAMMER.activationPhases[0]
			); // Back to the assign phase
			return super.nextRound()
		}
	}

}


export class ActivationCombatTracker extends PhaseCombatTracker{

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

		data.phase = combat.phase;
		if(combat.phase && BATTLEHAMMER.activationPhases.indexOf(combat.phase) > 0){
			data.phase_label = `${combat._getCurrentPlayerName()} ${game.i18n.localize(`battlehammer.activationPhases.${combat.phase}`)}` ?? "";
		} else {
			data.phase_label = game.i18n.localize(`battlehammer.activationPhases.${combat.phase}`) ?? "";
		}

		data.turns = [];
		console.log(BATTLEHAMMER.activationPhases.indexOf(combat.phase))
		if(BATTLEHAMMER.activationPhases.indexOf(combat.phase) === 0){
			data.startPhase = true;
			for(const player of combat.combatants){
				if(player.getFlag("battlehammer", "armyID")){
					player.data.armyName = game.folders.get(player.getFlag("battlehammer", "armyID")).name;
					data.turns.push(player)
				}
			}
		} else {
			for(const unit of combat.combatants){
				if(unit.getFlag("battlehammer", "type") === "unit" && unit.getFlag("battlehammer", "userID") === combat._getCurrentPlayerID()){
					
					const hasAction = unit.getFlag("battlehammer", "hasAction");
					unit.toggleClass = hasAction ? "action" : "";
					unit.toggleTitle = hasAction ? "Unit Ready to take action" : "Unit has expended its action.";
					data.turns.push(unit);
				}
			}
		}

		if(combat.turnOrder.length){
			console.log(combat._getCurrentPlayerID() === game.userId);
			console.log(combat._getCurrentPlayerID());
			console.log(game.userId);
			data.control = (combat._getCurrentPlayerID() === game.userId);
			// data.control = true;
		}
		return data;
    }
}
