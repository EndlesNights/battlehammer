export default function DropFolder(){

}

Hooks.on("dropCanvasData", async (canvas, document) => { 
	if(document.type !== "Folder" && document.documentName !== "Actor") return;

	const rootFolder = game.folders.get(document.id);
	const ActorGroups = [rootFolder.content];
	const folders = [];
	folders.push(...rootFolder.children);


	console.log(folders)
	while(folders.length){
		folders.push(...folders[0].children); 
		ActorGroups.push(folders[0].content);
		folders.shift();
	}

	if(ActorGroups.length == 0) return;

	let xOffset = 0;
	let yOffset = 0;
	for (const content of ActorGroups) {
		if(!content.length) continue;
		for (const actor of content) {
			const tokenData = actor.data.token.toJSON();
			tokenData.x = document.x + xOffset;
			tokenData.y = document.y + yOffset;
			await TokenDocument.create(tokenData, { parent: canvas.scene });
			xOffset += 100;
		}
		yOffset += 100;
		xOffset = 0;
	}
})
