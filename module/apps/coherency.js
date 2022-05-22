export default class UnitCoherence {

    static clearCoherence(){
        for(const e of canvas.someGraphics){ e.clear()};
    }

    static getUnitCoherence(){
        if(!canvas.activeLayer.placeables.find(t => t._hover)) return;
        
        const folderID = canvas.activeLayer.placeables.find(t => t._hover).actor.folder.id;
        
        const unit = {}
        for(const t of canvas.tokens.placeables){
            if(t.actor.folder.id == folderID) {
                unit[t.id] = {
                    x:t.x + t.width/2,
                    y:t.y + t.height/2,
                    e:t.data.elevation,
                    r:(t.width + t.height)/4
                }
            }
        }
        
        const gridSize = canvas.dimensions.size;
        const numberOfNeededConnections = Object.keys(unit).length > 5 ? 2 : 1;
        const checked = []
        const nodeMap = {}
        const toDraw = [];
        //Generate nodeMap of neighbouring nodes
        for(const [id, p] of Object.entries(unit)){
            checked.push(id);
            nodeMap[id] = []
            for(const [idT, pT] of Object.entries(unit)){
                if(id === idT || checked[id]) continue;
                let tokenElevationOffset = p.e < pT.e ? (p.r/gridSize) *2.2 :( pT.r/gridSize)*2.2;
                if(Math.hypot(pT.x - p.x, pT.y - p.y)/gridSize <= 2 + (p.r + pT.r)/gridSize && (Math.atan(pT.e - p.e)/gridSize) <=5 + tokenElevationOffset){
                    nodeMap[id].push(idT);
                    toDraw.push({x1: (pT.x + p.x)/2, x2: p.x, y1: (pT.y + p.y)/2, y2: p.y, id:id});
                }
            }
        }
        
        console.log(nodeMap)
        
        const connectedNodeMaps = [];
        checked.length = 0;
        const unchecked = new Set(Object.keys(unit));
        let i = 0;

        while(unchecked.size){
            const toCheck = new Set(nodeMap[[...unchecked][0]]);
            connectedNodeMaps[i] = new Set([[...unchecked][0]]);

            if(toCheck.size === 0){
                unchecked.delete([...unchecked][0]);
                
            } 
            while(toCheck.size){
                let [checking] = toCheck;
                toCheck.delete(checking);
                checked.push(checking);
                connectedNodeMaps[i].add(checking);
                unchecked.delete(checking)
            
                for(const n of nodeMap[checking]){
                    if(checked.includes(n)) continue;
                    toCheck.add(n);
                }
            }
            i++;
            if(i > 10) return console.log("EXIT!")
        }
        
        if(!canvas.drawcoherency) canvas.drawcoherency = [] 
        for(const d of toDraw){

            let color = "0x00FF00";
            if(nodeMap[d.id].length < numberOfNeededConnections) color = "0xFFA500";
            let thickness = 3;

            let index = canvas.drawcoherency.length;
            canvas.drawcoherency[index] = new PIXI.Graphics();
            canvas.drawcoherency[index].position.set(d.x1, d.y1);
            canvas.drawcoherency[index].lineStyle(thickness, color).moveTo(0, 0).lineTo(d.x2 - d.x1, d.y2 - d.y1);
            canvas.foreground.addChild(canvas.drawcoherency[index]);
        }

        console.log(connectedNodeMaps)
        if(connectedNodeMaps.length <= 1) return;

        const toDrawClosest = [];
        for(let i = 0; i < connectedNodeMaps.length; i++){
            let clossestNum = Infinity;
            let clossestPoint;
            for(let ii = 0; ii < connectedNodeMaps.length; ii++){
                if(i === ii) continue;
                for(const outer of connectedNodeMaps[i]){
                    for(const inner of connectedNodeMaps[ii]){
                       let distance = Math.sqrt( (unit[inner].x - unit[outer].x)**2 + (unit[inner].y - unit[outer].y)**2 + (unit[inner].e - unit[outer].e)**2 )
                        if(distance < clossestNum){
                            clossestNum = distance;
                            clossestPoint = {x1: unit[inner].x, x2:unit[outer].x, y1: unit[inner].y , y2: unit[outer].y}
                        }
                    }
                }
            }
            toDrawClosest.push(clossestPoint)
        }

        if(!canvas.drawcoherency) canvas.drawcoherency = [] 
        for(const d of toDrawClosest){

            let color = "0xFF0000";
            let thickness = 3;

            let index = canvas.drawcoherency.length;
            canvas.drawcoherency[index] = new PIXI.Graphics();
            canvas.drawcoherency[index].position.set(d.x1, d.y1);
            canvas.drawcoherency[index].lineStyle(thickness, color).moveTo(0, 0).lineTo(d.x2 - d.x1, d.y2 - d.y1);
            canvas.foreground.addChild(canvas.drawcoherency[index]);
        }
        
    }
}  
