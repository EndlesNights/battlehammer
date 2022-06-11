export default function _getBorderColor() {
	if(this._controlled) return CONFIG.Canvas.dispositionColors.CONTROLLED;
	else if (this._hover) {

		if(!this.actor.folder) return Number("0xFFFFFF")
		//color based off of root folder, which is derived from the controlling player's color
		return Number(`0x${_getRootFolder(this).data.color.substring(1)}`)
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