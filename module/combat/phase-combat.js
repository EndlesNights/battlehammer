import { BATTLEHAMMER } from "../config.js";
import CombatSetup from "./combat-setup.js";

export class PhaseCombat extends Combat {
	constructor(data, context) {
		super(data, context);
	}
	get phase() {
		return this.combatants.values().next().value?.getFlag("battlehammer", "phase") || BATTLEHAMMER.phases[0];
	}

	get isOwner(){
		return true;
	}

	// returns the turn orders in an array of objects
	get turnOrder() {
		const turnOrder = [];
		for(const player of game.combat.combatants){
			if(player.getFlag('battlehammer', 'type') === "player"){
				turnOrder.push({
					initiative:player.initiative, 
					userID: player.data.flags.battlehammer?.userID,
					armyID: player.data.flags.battlehammer?.armyID,
					combatantID: player.id
				})
			}
		}
		function SortFunc(a,b){
			if (a.initiative === b.initiative) {
				return 0;
			}
			else {
				return (a.initiative > b.initiative) ? -1 : 1;
			}
		}
		return turnOrder.sort(SortFunc);
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

	_getCurrentPlayerArmy(){
		const rootFolder = game.folders.get(this.turnOrder[this._getPlayerTurn()].armyID);

		let childrenToScan = [];
		childrenToScan = childrenToScan.concat(rootFolder.children);

		let armyUnits = [];
		if(rootFolder.content.length) armyUnits.push({
			name: rootFolder.name,
			folderId: rootFolder.id,
			content: rootFolder.content
		});

		let i = 0;
		while(childrenToScan.length){

			if(childrenToScan[0].children){
				childrenToScan = childrenToScan.concat(childrenToScan[0].children);
			}

			if(childrenToScan[0].content.length) armyUnits.push({
				name: childrenToScan[0].name,
				folderId: childrenToScan[0].id,
				folderParentName: childrenToScan[0].parentFolder.name,
				content: childrenToScan[0].content
			});
			
			childrenToScan.shift();

			i++;
			if(i === 300){
				console.log("earlyBreak");
				console.log(childrenToScan)
				console.log(armyUnits)
				return armyUnits;
			}
		}

		return armyUnits;
	}

	_getFolderChildren(folder){
		return folder.children
	}

	_resetUnitActions(){
		for(const unit of this.combatants){
			if(unit.getFlag('battlehammer', 'type') === "unit"){
				unit.setFlag('battlehammer', "hasAction", true);
			}
		}
	}

	nextTurn(options){
		console.log("nextTurn");
		return this.nextRound();
	}


	async nextRound() {

		this._resetUnitActions();
		if(BATTLEHAMMER.phases.indexOf(this.phase) === BATTLEHAMMER.phases.length - 1){
			if(this._getPlayerTurn() +1 === this.getFlag('battlehammer', 'playersSize')){
				this.resetPlayerTurns();
				super.nextRound();
				this.combatants.values().next().value.setFlag(
					'battlehammer',
					'phase',
					BATTLEHAMMER.phases[0]
				);
				await this.render();
				return {turn: 0};

			} else {
				this.combatants.values().next().value.setFlag(
					'battlehammer',
					'phase',
					BATTLEHAMMER.phases[1]
				);
				this.combatants.values().next().value.setFlag('battlehammer', 'playerTurn', this._getPlayerTurn()+1);
				await this.render();
				return await this.update({
					turn: 0,
				});
			}
		}
		else if(BATTLEHAMMER.phases.indexOf(this.phase) >= 0){
			this.combatants.values().next().value.setFlag(
				'battlehammer',
				'phase',
				BATTLEHAMMER.phases[BATTLEHAMMER.phases.indexOf(this.phase)+1]
			);
			await this.render();
			return {turn: 0};
		}
		else {
			this.combatants.values().next().value.setFlag(
				'battlehammer',
				'phase',
				BATTLEHAMMER.phases[0]
			); // Back to the assign phase
			return super.nextRound()
		}

	}

	async previousRound(){

		const playerTurn = this._getPlayerTurn();

		if(BATTLEHAMMER.phases.indexOf(this.phase) === 0){
			return ui.notifications.warn("Can not return to Prevoiuse Rounds.");
		}
		else if(BATTLEHAMMER.phases.indexOf(this.phase) === 1){
			if(playerTurn === 0){
				this.combatants.values().next().value.setFlag(
					'battlehammer',
					'phase',
					BATTLEHAMMER.phases[0]
				);
				this.render();
				return {turn: 0}; 
			} else {
				this.combatants.values().next().value.setFlag('battlehammer', 'playerTurn', this._getPlayerTurn()-1);

				this.combatants.values().next().value.setFlag(
					'battlehammer',
					'phase',
					BATTLEHAMMER.phases[BATTLEHAMMER.phases.length-1]
				);
				this.render();
				return {turn: 0};
			}
		}
		else if(BATTLEHAMMER.phases.includes(this.phase)){
			this.combatants.values().next().value.setFlag(
				'battlehammer',
				'phase',
				BATTLEHAMMER.phases[BATTLEHAMMER.phases.indexOf(this.phase)-1]
			);
			await this.render();
			return {turn: 0};
		}
		return; 
	}

	_sortCombatants(a, b) {
		let phase = a.combat.phase;
		if ( phase == "shoot" ) return super._sortCombatants(a, b); // Reverse order during shoot phase
		else return super._sortCombatants(b, a);
	}

	_onUpdate(data, options, userId) {
		super._onUpdate(data, options, userId);
		if ( foundry.utils.hasProperty(data, "flags.battlehammer.phase") ) this.setupTurns();
	}
}

export class PhaseCombatTracker extends CombatTracker{
	constructor(options) {
		super(options);
	}

	/** @inheritdoc */
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			id: "combat",
			template: "systems/battlehammer/templates/sidebar/phase-combat-tracker.html",
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
		const previousId = currentIdx > 0 ? combats[currentIdx-1].id : null;
		const nextId = currentIdx < combats.length - 1 ? combats[currentIdx+1].id : null;
		const settings = game.settings.get("core", Combat.CONFIG_SETTING);

		const data = await super.getData(options);
		
		data.phase = combat.phase;
		if(combat.phase && BATTLEHAMMER.phases.indexOf(combat.phase) > 0){
			data.phase_label = `${combat._getCurrentPlayerName()} ${game.i18n.localize(`battlehammer.phases.${combat.phase}`)}` ?? "";
		} else {
			data.phase_label = game.i18n.localize(`battlehammer.phases.${combat.phase}`) ?? "";
		}

		data.turns = [];

		if(BATTLEHAMMER.phases.indexOf(combat.phase) === 0){
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
	 
	async _onCombatantMouseDown(event) {
		event.preventDefault();
		const combatantId = event.currentTarget.dataset.combatantId;
		const combatant = this.viewed.combatants.get(combatantId);
		
		if(event.target.getAttribute('name') === "action-input"){
			return await combatant.setFlag('battlehammer', "hasAction", !(combatant.getFlag('battlehammer', "hasAction")));
		}

		if(combatant.getFlag("battlehammer", "type") === "unit"){
			// Handle double-left click to open sheet
			const now = Date.now();
			const dt = now - this._clickTime;
			this._clickTime = now;

			if ( dt <= 250 ){
				if(this._highlighted[0]) return this._highlighted[0].actor?.sheet.render(true);

				const getActorID = combatant.data.flags.battlehammer.unitData.content[0]._id;
				return game.actors.get(getActorID).sheet.render(true);				
			}

			//click on combatants to select controler
			if(this._highlighted && this._highlighted[0] ){
				if(!event.shiftKey){
					canvas.tokens.releaseAll();
				}
				for(const t of this._highlighted){
					t.control({releaseOthers: false});
				}
				return canvas.animatePan({x: this._highlighted[0].data.x, y: this._highlighted[0].data.y});
			}
		}
		// super._onCombatantControl(event);
	}

	async _onCombatantHoverIn(event) {
		event.preventDefault();
		if ( !canvas.ready ) return;
		const li = event.currentTarget;
		const combatant = this.viewed.combatants.get(li.dataset.combatantId);

		if(combatant.getFlag("battlehammer", "type") === "unit"){
			const content = combatant.getFlag("battlehammer", "unitData").content;
			const unitID = content[0].folder;

			const tokens = [];
			for(const token of canvas.scene.tokens){
				if(token._actor.folder.id === unitID){
					tokens.push(token.object);
				}
			}
			this._highlightTokensController(tokens, true);
		}

		super._onCombatantHoverIn(event);
	}

	_onCombatantHoverOut(event) {
		event.preventDefault();
		if ( this._highlighted ) this._highlightTokensController(this._highlighted);
	}

	_highlightTokensController(tokens, activate=false){
      // Modify the hover state of objects
	  let currentHover = null;
      for ( let o of tokens ) {
        if ( !o.visible || (o === currentHover) || !o.can(game.user, "hover") ) continue;

        // Mock the PIXI.InteractionEvent
        const event = new PIXI.InteractionEvent();
        event.type = activate ? "mouseover" : "mouseout";
        event.currentTarget = event.target = o;

        // Call the onHover behavior
        if ( activate ) o._onHoverIn(event, {hoverOutOthers: false});
        else o._onHoverOut(event);
      }

	  if(activate){
		this._highlighted = tokens;
	  } else {
		this._highlighted = null;
	  }
	}


	/** 
	 * Overrides the handler for new Combat creation request
	 * @param {Event} event
	 * @Override
	 */
	async _onCombatCreate(event) {
		console.log("OnCombatCreate")
		event.preventDefault();

		let scene = game.scenes.current;
		const cls = getDocumentClass("Combat");
		const combat = await cls.create({scene: scene?.id});
		await combat.activate({render: false});

		const playerArmyData = await new Promise(async (resolve) =>{
			new CombatSetup(resolve, combat).render(true);
		})
		console.log(playerArmyData)

		await combat.createEmbeddedDocuments("Combatant", playerArmyData);

		console.log(combat)
	}
}

export const _getInitiativeFormula = function() {
	return "1d6";
}

export const prepareDerivedData = function(){
	if ( !this.parent?.data ) return; //Adds in missing null check to stop all the console spam
	this.updateResource();
}
Hooks.once('init', async function(){
	libWrapper.register(
		'battlehammer',
		'Combatant.prototype.isOwner',
		function(wrapped){
			if(this.data.flags.battlehammer?.userID === game.userId) return true;
			return game.user.isGM || this.actor?.isOwner || false;
		}
	);
})

Hooks.on("renderCombatTracker",(tracker, html, data) => {
	let TokenInitiative = html.find(".player-initiative");
	for(const input of TokenInitiative){
		input.addEventListener('change', updateInitInput);
	}
});

async function updateInitInput(){
	game.combat.setInitiative(this.name, this.value);
}
