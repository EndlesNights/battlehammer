import CombatSetup from "./combatSetup.js";

export class PhaseCombat extends Combat {
	constructor(...args) {
		super(...args);
	}
	get phase() {
		return this.getFlag("battlehammer", "phase") || "start";
	}

	get isOwner(){
		return true;
	}
	get turnOrder() {
		const turnOrder = [];
		for(const player of game.combat.combatants){
			if(player.getFlag('battlehammer', 'type') === "player"){
				turnOrder.push([player.initiative, player.data.flags.battlehammer?.userID, player.data.flags.battlehammer?.armyID,])
			}
		}
		function SortFunc(a,b){
			if (a[0] === b[0]) {
				return 0;
			}
			else {
				return (a[0] > b[0]) ? -1 : 1;
			}
		}
		return turnOrder.sort(SortFunc);
	}

	_getPlayerTurn(){
		let playerTurn = this.getFlag("battlehammer", "playerTurn");
		// console.log(playerTurn == undefined)
		if( playerTurn == undefined){
			playerTurn = 0;
			this.update({"flags.battlehammer.playerTurn": 0});
		}
		// console.log(`getPlayer Turn: ${playerTurn}`)

		return playerTurn;
	}

	resetPlayerTurns(){
		for(const player of this.combatants) {
			if(player.getFlag('battlehammer', 'type')){
				this.setInitiative(player.id, null)
			}
		}
		return this.update({"flags.battlehammer.playerTurn": 0});
	}

	nextPlayerTurn() {
		// if(this.getFlag("battlehammer", "playerTurn") + 1 <= this.combatants.size){ //REWORK THIS TO TARGET FLAG
		if(this.getFlag("battlehammer", "playerTurn") + 1 <= this.getFlag('battlehammer', 'playersSize')){ //REWORK THIS TO TARGET FLAG
			console.log("ERROR Outside of expected players turns bound!")
		}
		return this.update({"flags.battlehammer.playerTurn": this.getFlag("battlehammer", "playerTurn") + 1});
	}

	previousPlayerTurn() {
		if(this.getFlag("battlehammer", "playerTurn") > 0){
			console.log("ERROR Outside of expected players turns bound!")
		}
		return this.update({"flags.battlehammer.playerTurn": this.getFlag("battlehammer", "playerTurn") - 1});
	}

	_getCurrentPlayerID(){
		return game.users.get(this.turnOrder[this._getPlayerTurn()][1]).id;
	}

	_getCurrentPlayerName(){
		console.log(this._getPlayerTurn());
		console.log(this.turnOrder[this._getPlayerTurn()][1]);
		return game.users.get(this.turnOrder[this._getPlayerTurn()][1]).name;
	}

	_getCurrentPlayerArmy(){
		const rootFolder = game.folders.get(this.turnOrder[this._getPlayerTurn()][2]);
		// const armyUnits = {};

		let childrenToScan = [];
		childrenToScan = childrenToScan.concat(rootFolder.children);

		let armyUnits = [];
		if(rootFolder.content.length) armyUnits.push({
			name: rootFolder.name,
			folderId: rootFolder.id,
			content: rootFolder.content
		});
		// content = content.concat(rootFolder.content);

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
			// content = content.concat(childrenToScan[0].content);
			
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

	async nextRound() {
		console.log("nextRound")
		console.log(this.phase)
		const playerTurn = this._getPlayerTurn();
		if( this.phase === "start" ) {
			
			let to_return = await this.update({"flags.battlehammer.phase": "command", turn: 0});
			this.render();
			return to_return;
		}
		else if(this.phase === "command"){
			let to_return = await this.update({"flags.battlehammer.phase": "move", turn: 0});
			this.render();
			return to_return; 
		}
		else if ( this.phase === "move" ) {
			let to_return = await this.update({"flags.battlehammer.phase": "psychic", turn: 0});
			this.render();
			return to_return;
		}
		else if ( this.phase === "psychic" ) {
			let to_return = await this.update({"flags.battlehammer.phase": "shoot", turn: 0});
			this.render();
			return to_return;
		}
		else if ( this.phase === "shoot" ) {
			let to_return = await this.update({"flags.battlehammer.phase": "charge", turn: 0});
			this.render();
			return to_return;
		}
		else if ( this.phase === "charge" ) {
			let to_return = await this.update({"flags.battlehammer.phase": "fight", turn: 0});
			this.render();
			return to_return;
		}
		else if ( this.phase === "fight" ) {
			let to_return = await this.update({"flags.battlehammer.phase": "morale", turn: 0});
			this.render();
			return to_return;
		}
		else if ( this.phase === "morale" ) {
			console.log(playerTurn +1)
			console.log(this.getFlag('battlehammer', 'playersSize'))

			// if(playerTurn +1 === this.combatants.size){
			if(playerTurn +1 === this.getFlag('battlehammer', 'playersSize')){
				this.resetPlayerTurns();
				super.nextRound();
				let to_return = await this.update({"flags.battlehammer.phase": "start", turn: 0});
				this.render();
				return to_return;

			} else {
				let to_return = await this.update({
					turn: 0,
					"flags.battlehammer.phase": "command",
					"flags.battlehammer.playerTurn": this.getFlag("battlehammer", "playerTurn") + 1
				});
				// await this.nextPlayerTurn(); //gets a little flickery is both are sperate calls
				await this.render();
				return await to_return;
			}

		}
		else {
		  await this.setFlag("battlehammer", "phase", "start"); // Back to the assign phase
		  return super.nextRound()
		} 
	}

	async previousRound(){

		const playerTurn = this._getPlayerTurn();

		if( this.phase === "start" ) {
			return ui.notifications.warn("Can not return to Prevoiuse Rounds.");
			const round = Math.max(this.round - 1, 0);
			let to_return = await this.update({round, "flags.battlehammer.phase": "morale", turn: 0});
			this.render();
			return to_return;
		}
		else if(this.phase === "command"){
			if(playerTurn === 0){
				let to_return = await this.update({"flags.battlehammer.phase": "start", turn: 0});
				this.render();
				return to_return; 
			} else {
				// this.previousPlayerTurn()
				let to_return = await this.update({
					"flags.battlehammer.playerTurn": this.getFlag("battlehammer", "playerTurn") - 1,
					"flags.battlehammer.phase": "morale",
					turn: 0
				});
				this.render();
				return to_return;
			}
		}
		else if ( this.phase === "move" ) {
			let to_return = await this.update({"flags.battlehammer.phase": "command", turn: 0});
			this.render();
			return to_return;
		}
		else if ( this.phase === "psychic" ) {
			let to_return = await this.update({"flags.battlehammer.phase": "move", turn: 0});
			this.render();
			return to_return;
		}
		else if ( this.phase === "shoot" ) {
			let to_return = await this.update({"flags.battlehammer.phase": "psychic", turn: 0});
			this.render();
			return to_return;
		}
		else if ( this.phase === "charge" ) {
			let to_return = await this.update({"flags.battlehammer.phase": "shoot", turn: 0});
			this.render();
			return to_return;
		}
		else if ( this.phase === "fight" ) {
			let to_return = await this.update({"flags.battlehammer.phase": "charge", turn: 0});
			this.render();
			return to_return;
		}
		else if ( this.phase === "morale" ) {
			let to_return = await this.update({"flags.battlehammer.phase": "fight", turn: 0});
			this.render();
			return to_return;
		} 
	}

	nextTurn(options){
		console.log("nextTurn")
		return this.nextRound();
		if (this.phase === "assign"){
			return this.update({"flags.battlehammer.phase": "move"});
		}
		return super.nextTurn(options);
	}

	_sortCombatants(a, b) {
		let phase = a.combat.phase;
		if ( phase == "shoot" ) return super._sortCombatants(a, b); // Reverse order during shoot phase
		else return super._sortCombatants(b, a);
	}

	_onUpdate(data, options, userId) {
		super._onUpdate(data, options, userId);
		console.log("enter?")
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
			template: "systems/battlehammer/templates/sidebar/combat-tracker.html",
			title: "Combat Tracker",
			scrollY: [".directory-list"]
		});
	}

	/** @inheritdoc */
	async getData(options) {
		// return super.getData(options);
		const combat = this.viewed;
		const hasCombat = combat !== null;
		if(!hasCombat) return super.getData(options);

		const combats = this.combats;
		const currentIdx = combats.findIndex(c => c === combat);
		const previousId = currentIdx > 0 ? combats[currentIdx-1].id : null;
		const nextId = currentIdx < combats.length - 1 ? combats[currentIdx+1].id : null;
		const settings = game.settings.get("core", Combat.CONFIG_SETTING);

		console.log(`Phase: ${combat.phase}`);
		console.log(combat);

		console.log(this);
		console.log(super.getData(options));

		const data = await super.getData(options);
		// const data = {
		// 	user: game.user,
		// 	combats: combats,
		// 	currentIndex: currentIdx + 1,
		// 	combatCount: combats.length,
		// 	hasCombat: hasCombat,
		// 	combat,
		// 	turns: [],
		// 	previousId,
		// 	nextId,
		// 	started: this.started,
		// 	control: false,
		// 	settings,
		// 	linked: combat?.data.scene !== null,
		// 	labels: {}
		// }
		
		data.phase = combat.phase;
		if(combat.phase && combat.phase !== "start"){
			data.phase_label = `${combat._getCurrentPlayerName()} ${game.i18n.localize(`battlehammer.phases.${combat.phase}`)}` ?? "";
		} else {
			data.phase_label = game.i18n.localize(`battlehammer.phases.${combat.phase}`) ?? "";
		}

		data.turns = [];

		if(combat.phase === "start"){
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
					data.turns.push(unit);
				}
			}
		}

		console.log(data.turns)

		return data;
	}

	// _onUpdate(data, options, userId) {
	// 	super._onUpdate(data, options, userId);
	// 	console.log("enter?")
	// }

	// async _onCombatantMouseDown(event) {
	// 	console.log(event);
	// 	event.preventDefault();
	// 	return;
	// 	super._onCombatantControl(evnet);
	// }

	// async _onCombatantHoverIn(event) {
	// 	console.log(event);
	// 	event.preventDefault();
	// 	return;
	// }

    /* -------------------------------------------- */
  
    /**
     * Handle a Combatant control toggle
     * @private
     * @param {Event} event   The originating mousedown event
     */
	// async _onCombatantControl(event) {
	// 	event.preventDefault();
	// 	event.stopPropagation();
	// }

	activateListeners(html) {
		super.activateListeners(html);
		console.log("ENTER")
	}

	_activateCoreListeners(html){
		super._activateCoreListeners(html);
		// console.log(html.find(".combat-control"))
		// html.getElementsByName("Thing")[0].addEventListener('change', activateListeners(html));
	}


	// /** @inheritdoc */
	// async getData(options) {
	// 	const context = await super.getData(options);
	// 	// context.icons = CONFIG.battlehammer.icons;

	// 	context.turns.forEach( turn => {
	// 		turn.flags = context.combat.combatants.get(turn.id)?.data.flags;
	// 		turn.model = context.combat.combatants.get(turn.id)?.actor.data.data.model;
	// 		turn.tint = context.combat.combatants.get(turn.id)?.token.data.tint ?? false;
	// 	});
		
	// 	context.phase_label = game.i18n.localize(`battlehammer.phases.${context.combat?.phase}`) ?? "";
	// 	context.phase = context.combat?.phase ?? "none";
	// 	return context;
	// }

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

// Hooks.on("preCreateCombatant", (obj,data,options,userID) =>{
// 	console.log(obj)
// 	console.log(data)
// 	console.log(options)
// 	console.log(userID)
// });