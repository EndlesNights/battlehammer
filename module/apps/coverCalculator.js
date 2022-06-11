export default class UnitCover {
	
	static clearCoverLines(){
		for(const e of canvas.drawCover){ e.clear()};
	}

	static getUnitCover(){
		console.log("button pressed, do math n draw lines n shit");

		if (!canvas.ready) return;
		if (!canvas.tokens.controlled.length) return;
		if (!game.user.targets.size) return;

		return this._calculateCover(canvas.tokens.controlled, Array.from(game.user.targets));
	}

	static _calculateCover(sources, targets){
		for(const selected of sources){
			for(const target of targets){
				if(selected.id === target.id) continue;
				this._checkCover(selected, target);
			}
		}
	}

	static _checkCover(origin, target){
		if(!canvas.drawCover) canvas.drawCover = [];
		
		let rayTest = new Ray(origin.center,target.center);
		console.log(rayTest);
		
		const drawIndex = canvas.drawCover.length;

		

		// add a tag for walls to denote them as cover.
		//type, WALL_RESTRICTION_TYPES: 'light', 'sight', 'sound', 'move' (defaults to 'move')
		// need to only set up checks for move and sight
		// blocks 'move' and 'sight'
		// blocks 'move' but not sight => Cover
		// blocks 'sight' but not 'move' => concealment
		//blocks neither, but has flag for cover => cover

		// console.log(canvas.walls.checkCollision(rayTest, {type:"move", mode:"closest"}));

		let color = "0x00FF00";

		if(canvas.walls.checkCollision(rayTest)){
		// if(this.getRayCollisions(rayTest)){
			color = "0xFFA500";
		}

		let thickness = 3;

		canvas.drawCover[drawIndex] = new PIXI.Graphics();
		canvas.drawCover[drawIndex].position.set(origin.center.x, origin.center.y);
		canvas.drawCover[drawIndex].lineStyle(thickness, color).moveTo(0, 0).lineTo(target.center.x - origin.center.x, target.center.y - origin.center.y);
		canvas.foreground.addChild(canvas.drawCover[drawIndex]);
	}




	static getRayCollisions(ray, {type="move", mode="all", debug=false}={}) {
		const origin = ray.A;
	
		// Identify Edges
		const edges = [];
		const walls = canvas.walls.quadtree.getObjects(ray.bounds);
		for ( let wall of walls ) {
			if(!this.testWallInclusion(wall, ray.A, type) ) continue;
			const edge = PolygonEdge.fromWall(wall, type);
			const intersects = foundry.utils.lineSegmentIntersects(edge.A, edge.B, origin, ray.B);
			if ( intersects ) {
				if ( mode === "any" ) {   // We may be done already
				if ( (wall.data[type] === CONST.WALL_SENSE_TYPES.NORMAL) || (edges.length > 1) ) return true;
				}
				edges.push(edge);
			}
		}
		if ( mode === "any" ) return false;
	
		// Identify Collision Points
		const collisions = [];
		const points = new Map();
		for ( let edge of edges ) {
			const x = foundry.utils.lineSegmentIntersection(origin, ray.B, edge.A, edge.B);
			if ( !x || (x.t0 <= 0) ) continue;
		
			// Record the collision
			let c = PolygonVertex.fromPoint(x, {distance: x.t0});
			if ( points.has(c.key) ) c = points.get(c.key);
			else {
				points.set(c.key, c);
				collisions.push(c);
			}
			c.attachEdge(edge);
		}
	
		// Return all collisions
		if ( debug ) this._visualizeCollision(ray, edges, collisions);
		if ( mode === "all" ) return collisions;
	
		// Return the closest collision
		collisions.sort((a, b) => a._distance - b._distance);
		if ( collisions[0].type === CONST.WALL_SENSE_TYPES.LIMITED ) collisions.shift();
		return collisions[0] || null;
	}
	static testWallInclusion(wall, origin, type) {

		// Always include interior walls underneath active roof tiles
		if ( (type === "sight") && wall.hasActiveRoof ) return true;
	
		// Ignore walls that are not blocking for this polygon type
		if ( !wall.data[type] || wall.isOpen ) return false;
	
		// Ignore walls which are exactly in-line with the origin, except for movement
		const side = wall.orientPoint(origin);
		if ( (type !== "move") && (side === CONST.WALL_DIRECTIONS.BOTH) ) return false;
	
		// Ignore one-directional walls which are facing away from the origin
		return !wall.data.dir || (side !== wall.data.dir);
	}
	static _visualizeCollision(ray, edges, collisions) {
		let dg = canvas.controls.debug;
		dg.clear();
		const limitColors = {
			[CONST.WALL_SENSE_TYPES.NONE]: 0x77E7E8,
			[CONST.WALL_SENSE_TYPES.NORMAL]: 0xFFFFBB,
			[CONST.WALL_SENSE_TYPES.LIMITED]: 0x81B90C
		}
	
		// Draw edges
		for ( let edge of edges ) {
			dg.lineStyle(4, limitColors[edge.type]).moveTo(edge.A.x, edge.A.y).lineTo(edge.B.x, edge.B.y);
		}
	
		// Draw the attempted ray
		dg.lineStyle(4, 0x0066CC).moveTo(ray.A.x, ray.A.y).lineTo(ray.B.x, ray.B.y);
	
		// Draw collision points
		for ( let x of collisions ) {
			dg.lineStyle(1, 0x000000).beginFill(0xFF0000).drawCircle(x.x, x.y, 6).endFill();
		}
	}
}
