
export default class CombatSetup extends FormApplication {

	constructor(resolve, combat, object={}, options={}) {
		super(object,options);
		this.resolve = resolve;
	}
	/** @override */
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			id: "combat-setup-dialog",
			classes: ["battlehammer"],
			title: "Combat Setup",
			template: "systems/battlehammer/templates/apps/combat-setup.html",
			width: 500,
			height: "auto",
			closeOnSubmit: false,
			submitOnClose: false
		});
	}

	/** @override */
	getData(options) {
		const rootFolders = [];
		for(const folder of game.folders){
			if(folder.depth === 1){
				rootFolders.push({id:folder.id, name:folder.name});
			}
		};

		return {users: game.users, rootFolders: rootFolders};
	}

	async _updateObject(event, formData) {
		const filteredArray = formData["userData.army"].filter(Boolean);

		if(filteredArray.length < 2){
			return ui.notifications.warn("Game requires at leaste 2 players to play");
		}

		if(filteredArray.length !== new Set(filteredArray).size){
			return ui.notifications.warn("Some players have the same army folder selected");
		}

		this.close({submit: false, force: true});

		const usersArmyArray = []
		let i = 0;
		for(const user of game.users){
			if(formData["userData.army"][i]) { 
				console.log(user.id);
				usersArmyArray.push({
					_id: user.id,
					name: user.name,
					img: user.avatar,
					"flags.battlehammer.armyID":formData["userData.army"][i],
					"flags.battlehammer.userID":user.id
				});
			}
			i++
		}
		return this.resolve(usersArmyArray);
	}

	/** @override */
	activateListeners(html) {
		super.activateListeners(html);
		if ( this.isEditable ) {
			html.find('.cancel').click(this._onCancel.bind(this));
		}
	}

	_onCancel(event){
		event.preventDefault();
		this.close({submit: false, force: true});
	}

}