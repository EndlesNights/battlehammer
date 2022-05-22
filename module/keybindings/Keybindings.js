export default class Keybindings{
    static _onTargetUnit(context){
        if ( !canvas.ready ) return false;
        const layer = canvas.activeLayer;
        if ( !(layer instanceof TokenLayer) ) return false;
        const hovered = layer.placeables.find(t => t._hover);
        if ( !hovered ) return false;
        const folderID = hovered.actor.folder.id;
       

        if(folderID){
            let unit = new Set();
            for(const t of canvas.tokens.placeables){
                if(t.actor.folder.id == folderID) {                  
                    unit.add(t.id);
                }
            }

            let userTargets = new Set();
            if(context.isShift){              
                for(const t of game.user.targets){
                    userTargets.add(t.id)
                }
                //if the entire unit is already selected, then deselect that entire unit from the targets set
                if(Array.from(unit).every(v => Array.from(userTargets).includes(v))) {
                    for(const u of unit){
                        userTargets.delete(u)
                    }
                    game.user.updateTokenTargets(userTargets);
                    return true;
                }
            }
            game.user.updateTokenTargets(Array.from(unit).concat(Array.from(userTargets)));
            return true;
        }

        hovered.setTarget(!hovered.isTargeted, {releaseOthers: !context.isShift});
        return true;
    }

    static _onDrawUnitCoherency(context){
        if(context.isShift){
            for(const e of canvas.drawcoherency){ e.clear()};
        } else {
            game.unitCoherence.getUnitCoherence();
        }
    }
}