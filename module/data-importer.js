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
		let data = await zip.file(Object.keys(zip.files)[0]).async("text");
		const xmlDoc = ImportHelpers.stringToXml(data);

		console.log(zip)
		console.log(data)
		console.log(xmlDoc)

		const jsonDoc = JXON.xmlToJs(xmlDoc);
		console.log(jsonDoc);

		CONFIG.temporary = {};
		this.close();
	};
}