export default function scatter (){

	let rScatter = new Roll("1d6");
	rScatter.evaluate({async: false});
	if(rScatter.total > 4){
		rScatter.toMessage({flavor:"Rolling to scatter - No Scattering"})
		return console.log(`Congratz! No Scatter! Roll:${rScatter.total}`);
	}
	
	let rDisplacement = new Roll("1d6");
	rDisplacement.evaluate({async: false});
	let angle = Math.random()*Math.PI*2
	const gridSize = canvas.dimensions.size;
	let dx = Math.cos(angle) * rDisplacement.total * gridSize;
	let dy = Math.sin(angle) * rDisplacement.total * gridSize;
	
	console.log(`Scatter angle: ${Math.round(angle * 180/Math.PI)}`);
	console.log(`Scatter amount: ${rDisplacement.total}`);
	let asciiArrow = "↗";
	if(angle < 0.3926 || angle > 5.8893 ) asciiArrow = "→";
	else if(angle < 1.1778) asciiArrow = "↘";
	else if(angle < 1.9631) asciiArrow = "↓";
	else if(angle < 2.7483) asciiArrow = "↙";
	else if(angle < 3.5336) asciiArrow = "←";
	else if(angle < 4.3188) asciiArrow = "↖";
	else if(angle < 5.104) asciiArrow = "↑";
	
	rScatter.toMessage({flavor:`Rolling to scatter - Scattering occuring with angle of ${angle * 180/Math.PI}° ${asciiArrow}`});
	rDisplacement.toMessage({flavor:"Scattering Displacemnet amount"});
	
	if(canvas.tokens.controlled.length){
		const tokens = canvas.tokens.controlled;
		let target = tokens.map(t => ({
			_id: t.id, 
			x: Math.min(canvas.dimensions.width, Math.max(0, t._validPosition.x + dx)), 
			y: Math.min(canvas.dimensions.height, Math.max(0, t._validPosition.y + dy))
		}));
		return canvas.scene.updateEmbeddedDocuments("Token", target, {animate: false});
	}
	if(canvas.templates._hover){
		return canvas.scene.updateEmbeddedDocuments("MeasuredTemplate", [{
			_id: canvas.templates._hover.id,
			x: Math.min(canvas.dimensions.width, Math.max(0, canvas.templates._hover.x + dx)), 
			y: Math.min(canvas.dimensions.height, Math.max(0, canvas.templates._hover.y + dy))
		}]);
	}
	if(canvas.background.controlled.length){
		const tiles = canvas.background.controlled;
		let target = tiles.map(t => ({
			_id: t.id, 
			x: Math.min(canvas.dimensions.width, Math.max(0, t.x + dx)), 
			y: Math.min(canvas.dimensions.height, Math.max(0, t.y + dy))
		}));
		return canvas.scene.updateEmbeddedDocuments("Tile", target);
	}
	if(canvas.foreground.controlled.length){
		const tiles = canvas.background.controlled;
		let target = tiles.map(t => ({
			_id: t.id, 
			x: Math.min(canvas.dimensions.width, Math.max(0, t.x + dx)), 
			y: Math.min(canvas.dimensions.height, Math.max(0, t.y + dy))
		}));
		return canvas.scene.updateEmbeddedDocuments("Tile", target);
	}
}
