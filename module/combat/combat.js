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
		if( playerTurn == undefined){
			playerTurn = 0;
			this.update({"flags.battlehammer.playerTurn": 0});
		}
		return playerTurn;
	}

	resetPlayerTurns(){
		for(const player of this.combatants) {
			if(player.getFlag('battlehammer', 'type') === "player"){
				this.setInitiative(player.id, null)
			}
		}
		return this.update({"flags.battlehammer.playerTurn": 0});
	}

	nextPlayerTurn() {
		if(this.getFlag("battlehammer", "playerTurn") + 1 <= this.getFlag('battlehammer', 'playersSize')) { 
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

	_resetUnitAction(){
		for(const unit of this.combatants){
			if(unit.getFlag('battlehammer', 'type') === "unit"){
				unit.setFlag('battlehammer', "hasAction", true);
			}
		}
	}

	async nextRound() {
		const playerTurn = this._getPlayerTurn();
		this._resetUnitAction();
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
					
					const hasAction = unit.getFlag("battlehammer", "hasAction");
					unit.toggleClass = hasAction ? "action" : "";
					unit.toggleTitle = hasAction ? "Unit Ready to take action" : "Unit has expended its action.";
					data.turns.push(unit);
				}
			}
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
