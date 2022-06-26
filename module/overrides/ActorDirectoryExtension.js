
export default class ActorDirectoryExtension extends ActorDirectory {
	initialize() {
		for(const folder of game.folders){
			// console.log(folder)
		}
		// Assign Folders
		this.folders = game.folders.filter(f => f.type === this.constructor.documentName);

		// Assign Documents
		this.documents = this.constructor.collection.filter(e => e.visible);

		// Build Tree
		this.tree = this.constructor.setupFolders(this.folders, this.documents);
		
	}

	// static get defaultOptions() {
	// 	console.log(super.defaultOptions());
	// 	return super.defaultOptions()
	// }



    /* -------------------------------------------- */
  
    /** @inheritdoc */
    async getData(options) {
		const cfg = CONFIG[this.constructor.documentName];
		const cls = cfg.documentClass;
		const data = {
			user: game.user,
			tree: this.tree,
			canCreate: cls.canUserCreate(game.user),
			documentCls: cls.documentName.toLowerCase(),
			tabName: cls.metadata.collection,
			sidebarIcon: cfg.sidebarIcon,
			folderIcon: CONFIG.Folder.sidebarIcon,
			label: game.i18n.localize(cls.metadata.label),
			labelPlural: game.i18n.localize(cls.metadata.labelPlural),
			documentPartial: this.constructor.documentPartial,
			folderPartial: "systems/battlehammer/templates/sidebar/folder-partial-actor.html"
		};
		// const children = data.tree.children;
		
		// // for(const folder of data.tree.children){
		// for(const folder of children){

		// 	folder.value = 10;
		// }

		// while(children.length)
		// const childrenNodes = this.walk(data.tree.children);
		// console.log(childrenNodes);

		function walk(node) {
			if (node.children !== undefined) {
				node.children.forEach(function(child) {
					walk(child);
				});
			}
		
			console.log(node.name);
			node.value = 0;
			if(node.children.length){
				for(const c of node.children){
					if(c.value){
						node.value += c.value;
					}
				}
			}
			if(node.content.length){
				for(const model of node.content){
					if(model.data.data.details?.cost?.value){
						node.value += model.data.data.details.cost.value;
					}
				}
			}
			return node;
		}

		walk(data.tree);

		console.log(data)
		return data; 
	}

	static walk(node){
		this.walk({});
		if (node.children !== undefined) {
			node.children.forEach(function(child) {
				console.log(child)
				// this.walk(child);
			});
		}
	
		console.log(node.name);
	}
	
	  /* -------------------------------------------- */
	
	  /** @inheritdoc */
	  async _renderInner(data) {
		await loadTemplates([data.documentPartial, data.folderPartial]);
		return super._renderInner(data);
	  }
}