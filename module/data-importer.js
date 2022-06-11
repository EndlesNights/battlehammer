import ImportHelpers from "./helper.js";

export default class DataImporter extends FormApplication {
	/** @override */
	static get defaultOptions() {
		this.pattern = /(\@[a-z]*)(\[)([a-z0-9]*|[a-z0-9\.]*)(\])(\{)(.*?)(\})/gmi
		this.altpattern = /((data-entity)="([a-zA-Z]*)"|(data-pack)="([[\S\.]*)") data-id="([a-zA-z0-9]*)">(.*)<\/a>/gmi

		return mergeObject(super.defaultOptions, {
			id: "data-importer",
			classes: ["battlehammer", "data-importer"],
			title: "Battlehammer Data Importer",
			template: "systems/battlehammer/templates/import.html"
		});
	}
	/** @override */
	async getData() {
		const importpath = game.settings.get("battlehammer", "importpath") || "data";
		let data = await FilePicker.browse("data", importpath, { bucket: null, extensions: [".rosz", ".ROSZ"], wildcard: false });
		const files = data.files.map((file) => {
			return decodeURIComponent(file);
		});

		$(".import-progress").addClass("import-hidden");

		if (!CONFIG?.temporary) {
			CONFIG.temporary = {};
		}

		return{
			data,
			files,
			cssClass: "data-importer-window"
		};
	}

	/** @override */
	activateListeners(html) {
		super.activateListeners(html);

		html.find(".dialog-button").on("click", this._dialogButton.bind(this));
	}

	async _dialogButton(event) {
		event.preventDefault();
		event.stopPropagation();
		const a = event.currentTarget;
		const action = a.dataset.button;

		console.log("Importing Data Files")
		console.log("Starting import")
  
		const selectedFile = $("#import-file").val();
		console.log(`Using ${selectedFile} for import source`)
		let zip;
  
		if (selectedFile) {
		  zip = await fetch(`/${selectedFile}`)
			.then(function (response) {
				if (response.status === 200 || response.status === 0) {
					return Promise.resolve(response.blob());
				} else {
					return Promise.reject(new Error(response.statusText));
				}
			})
			.then(JSZip.loadAsync);
		} else {
		  const form = $("form.data-importer-window")[0];
  
		if (form.data.files.length) {
			zip = await ImportHelpers.readBlobFromFile(form.data.files[0]).then(JSZip.loadAsync);
		}
		}

		// let data = zip.files[Object.keys(zip.files)[0]].async("text");
		let rawData = await zip.file(Object.keys(zip.files)[0]).async("text");
		const xmlDoc = ImportHelpers.stringToXml(rawData);

		console.log(zip)
		console.log(xmlDoc)

		const data = JXON.xmlToJs(xmlDoc);
		console.log(data);

		const rootFolder = await Folder.create({
			name: data.roster.$name,
			type:  CONST.FOLDER_DOCUMENT_TYPES[0], //"Actor",
			color: game.user.color//"#d10000"
		});

		const subFolders = {};

		// data.roster.forces.force.selections.selection
		for(const obj of data.roster.forces.force.selections.selection){
			console.log(obj)
			console.log(obj.$name)
			if(obj.$type === "model"){
				const primary = this.primaryCategory(obj.categories.category);
				await this.hanndleSubFolder(subFolders, primary, rootFolder.id);
				const unitFolder = await this.hanndleUnitFolder(obj, subFolders[primary].id);
				this.parseUnitData(obj, unitFolder)
				this.parseModelData(obj, obj, unitFolder)
			}
			else if(obj.$type === "unit"){
				const primary = this.primaryCategory(obj.categories.category);
				await this.hanndleSubFolder(subFolders, primary, rootFolder.id);
				const unitFolder = await this.hanndleUnitFolder(obj, subFolders[primary].id);
				
				this.parseUnitData(obj, unitFolder);
			}
		}
		CONFIG.temporary = {};
		this.close();
	};

	async hanndleSubFolder(subFolders, primary, rootFolderID){
		if(!subFolders[primary]){
			subFolders[primary] = await Folder.create({
				name: primary,
				type:  CONST.FOLDER_DOCUMENT_TYPES[0], //"Actor",
				parent: rootFolderID,
				// color: "#d10000"
			});
		}
	}

	async hanndleUnitFolder(obj, primaryID){
		return await Folder.create({
			name: obj.$name,
			type:  CONST.FOLDER_DOCUMENT_TYPES[0], //"Actor",
			parent: primaryID,
			// color: "#d10000"
		})
	}

	async parseModelData(obj, model, unitFolder){

		console.log(model)
		let stats = null;
		
		if(this.isIterable(model.profiles?.profile?.characteristics?.characteristic)){
			stats = this.getCharacteristicsStats(model.profiles.profile.characteristics.characteristic);
		}
		else if(this.isIterable(obj?.profiles?.profile)) {
			stats = this.getProfileCharacteristicsObjStats(obj?.profiles.profile, model.$name);
		}

		console.log(stats)

		const modelData = stats? {
			attributes:{
				movement: {value:stats.m},
				weaponSkill: {value:stats.ws},
				ballisticSkill: {value:stats.bs},
				strength: {value:stats.s},
				toughness: {value:stats.t},
				attacks: {value:stats.a},
				leadership: {value:stats.ld},
				save: {value:stats.save}
			},
			details: {
				health: {value:stats.w, max:stats.w} //wounds
			}
		} : null;

		for(let i = 0; i < model.$number; i++){
			await Actor.create({
				name: model.$number == 1 ? model.$name : `${model.$name} (${i+1})`,
				type: "modelWH",
				folder: unitFolder.id,
				data: modelData,
				permission: {default: 1},
				token: {
					actorLink: true,
					flags:{
						"wall-height": {tokenHeight: 1.1}
						// battlehammer:{ownerID: game.userId}
					}
				}
			});
		}
	}

	async parseUnitData(obj, unitFolder){
		if(obj.selections?.selection && this.isIterable(obj.selections.selection)){
			for(const model of obj.selections.selection){
				if(model.$type == "model"){
					this.parseModelData(obj, model, unitFolder);
				}
				// else if(model.$type == "unit"){
				// 	this.parseModelData(obj, model, unitFolder);
				// 	console.log(model.$type);
				// 	console.log(model)
				// }
				else {
					console.log(model.$type);
					console.log(model)
				}
				
			}
		} 
		else if(obj.profiles?.profile && this.isIterable(obj.profiles.profile) ){
			//check here for the unit
			console.log(obj)
		}
		else {
			console.log("Selection not iterable!");
			console.log(obj)
		}
	}

	// Searches through the category list and returns the string of the primary
	primaryCategory(arry){
		// uses reverse array because quite offten it is the last value
		for(const obj of arry.reverse()){
			if(obj.$primary === "true"){
				return obj.$name;
			}
		}
	}

	getCharacteristicsStats(characteristic){
		let stats = {};
		for(const c of characteristic){
			const key = c.$name.toLowerCase();
			stats[key] = (key === 'w') ? parseInt(c._.replace(/\D/g,'')) : c._ ;
		}
		return stats
	}
	getProfileCharacteristicsObjStats(profiles, name){
		if(!this.isIterable(profiles)){
			return null;
		}
		for(const p of profiles){
			if(p.$name === name){
				return this.getCharacteristicsStats(p.characteristics.characteristic);
			}
		}
		for(const p of profiles){
			if(name.includes(p.$name)){
				return this.getCharacteristicsStats(p.characteristics.characteristic);
			}
		}
		return null;
	}

	isIterable(obj) {
		// checks for null and undefined
		if (obj == null) {
			return false;
		}
		return typeof obj[Symbol.iterator] === 'function';
	}
}