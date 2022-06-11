export default class Keybindings{

	//handles target all tokens within a unit with the r key
	static _onTargetUnit(context){
		if ( !canvas.ready ) return false;
		const layer = canvas.activeLayer;
		if ( !(layer instanceof TokenLayer) ) return false;
		const hovered = layer.placeables.find(t => t._hover);
		if ( !hovered ) return false;
		const folderID = hovered.actor.folder?.id;
	   

		if(folderID){
			let unit = new Set();
			for(const t of canvas.tokens.placeables){
				if(t.actor.folder?.id == folderID) {                  
					unit.add(t.id);
				}
			}

			let userTargets = new Set();
			for(const t of game.user.targets){
				userTargets.add(t.id)
			}

			if(context.isShift) {
				//if the entire unit is already targted, then de-target that entire unit from the targets set
				if(Array.from(unit).every(v => Array.from(userTargets).includes(v))) {
					for(const u of unit){
						userTargets.delete(u)
					}
					game.user.updateTokenTargets(userTargets);
					return true;
				}
				game.user.updateTokenTargets(Array.from(unit).concat(Array.from(userTargets)));
				return true;
			}
			
			//if the entire unit is already targted, then de-target everything
			if(Array.from(unit).every(v => Array.from(userTargets).includes(v))) {
				game.user.updateTokenTargets();
				return true
			}
			game.user.updateTokenTargets(Array.from(unit));
			return true;
		}

		hovered.setTarget(!hovered.isTargeted, {releaseOthers: !context.isShift});
		return true;
	}

	static _onDrawUnitCoherency(context){
		if(context.isShift){
			game.unitCoherence.clearCoherence();
		} else {
			game.unitCoherence.getUnitCoherence();
		}
	}

	static _onCoverCalculate(context){
		if(context.isShift){
			game.unitCover.clearCoverLines();
		} else {
			game.unitCover.getUnitCover();
		}
	}
}