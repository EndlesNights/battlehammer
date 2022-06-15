export default function _getBorderColor() {
	if(this._controlled) return CONFIG.Canvas.dispositionColors.CONTROLLED;
	else if (this._hover) {

		if(!this.actor.folder) return Number("0xFFFFFF");

		//color based off of root folder, which is derived from the controlling player's color
		const rootFolder = _getRootFolder(this);
		return rootFolder.data.color ? Number(`0x${rootFolder.data.color.substring(1)}`) : Number("0xFFFFFF");
	}
	return null;
}


function _getRootFolder(token){
	let baseFolder = token.actor.folder;
	while(baseFolder.depth != 1){
		baseFolder = baseFolder.parentFolder;
	}
	return baseFolder;
}