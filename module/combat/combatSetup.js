
export default class CombatSetup extends FormApplication {

	constructor(resolve, combat, object={}, options={}) {
		super(object,options);
		this.combat = combat;
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
		//creat combatants for the players
		for(const user of game.users){
			if(formData["userData.army"][i]) { 
				console.log(user.id);
				usersArmyArray.push({
					_id: user.id,
					name: user.name,
					img: user.avatar,
					"flags.battlehammer.armyID":formData["userData.army"][i],
					"flags.battlehammer.userID":user.id,
					"flags.battlehammer.type": "player"
				});
				const folder = game.folders.get(formData["userData.army"][i]);
				//update the root folder to match the users colour
				await folder.update({[`color`]: user.data.color});
			}
			i++
		}
		const length = usersArmyArray.length;
		// await this.combat.update({["permission.default"]: CONST.ENTITY_PERMISSIONS.OWNER});
		
		await this.combat.setFlag('battlehammer', 'playersSize', length);

		const actorPermissionData = [];
		//create the combatants for the units
		for(let index = 0; index < length; index++){
			const user = usersArmyArray[index];
			const rootFolder = game.folders.get(user['flags.battlehammer.armyID']);	
			let childrenToScan = [];
			childrenToScan = childrenToScan.concat(rootFolder.children);
	
			if(rootFolder.content.length){
				usersArmyArray.push({
					_id: user.id,
					name: rootFolder.name,
					img: rootFolder.content[0].thumbnail,
					"flags.battlehammer.userID":user['flags.battlehammer.userID'],
					"flags.battlehammer.type": "unit",
					"flags.battlehammer.hasAction": true,
					"flags.battlehammer.unitData": {
						folderId: rootFolder.id,
						// folderParentName: childrenToScan[0].parentFolder.name,
						content: rootFolder.content,
					}
				});
			}
	
			let i = 0;
			while(childrenToScan.length){
	
				if(childrenToScan[0].children){
					childrenToScan = childrenToScan.concat(childrenToScan[0].children);
				}
	
				if(childrenToScan[0].content.length){

					//set the permsion usership of actors to the corresponding player
					for(const actor of  childrenToScan[0].content){
						const permisionData = {};

						//clear any possible old permisions other users might have had
						for(const users of game.users){
							permisionData[users.id] = 1;
						}
						permisionData[user['flags.battlehammer.userID']] = 3;
						actorPermissionData.push({
							_id: actor.id,
							permission: permisionData
						});
					}
					usersArmyArray.push({
						_id: user.id,
						name: childrenToScan[0].name,
						img: childrenToScan[0].content[0].thumbnail,
						"flags.battlehammer.userID":user['flags.battlehammer.userID'],
						"flags.battlehammer.type": "unit",
						"flags.battlehammer.hasAction": true,
						"flags.battlehammer.unitData": {
							folderId: childrenToScan[0].id,
							folderParentName: childrenToScan[0].parentFolder.name,
							content: childrenToScan[0].content,
						}
					});
				}

				
				childrenToScan.shift();
	
				i++;
				if(i === 300){
					console.log("earlyBreak");
					console.log(childrenToScan)
					console.log(usersArmyArray)
					return usersArmyArray;
				}
			}

		}
		await Actor.updateDocuments(actorPermissionData);
		console.log(usersArmyArray)
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