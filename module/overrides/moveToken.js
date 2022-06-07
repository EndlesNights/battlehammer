
	/*ovverrides core foundry function, there was a small oversight where this method was not tested for girdless mode, 
	* and such a variable that was intended to fix small offsets of tokens larger than 1x1 on a grid, is causing some unintended 
	* offset movments while the map is set to girdless. 
	* A check has been added to the s2 variable so it will not offset the movement of tokens while the gridType is girdless
	* 
	* This issue will likely be fixed in Foundry v10 - Protype 3 (Current v9 - 9.269)
	*/


export default async function moveToken() {
		let wasPaused = game.paused;
		if ( wasPaused && !game.user.isGM ) {
			ui.notifications.warn("GAME.PausedWarning", {localize: true});
			return false;
		}
		if ( !this.visible || !this.destination ) return false;
		const token = this._getMovementToken();
		if ( !token ) return false;

		// Determine offset relative to the Token top-left.
		// This is important so we can position the token relative to the ruler origin for non-1x1 tokens.
		const origin = canvas.grid.getTopLeft(this.waypoints[0].x, this.waypoints[0].y);
		const s2 = canvas.scene.data.gridType === 0 ? 1 : canvas.dimensions.size / 2; //changed how this value is determined so it will not attemtpe to offset movements while on gridmode
		//^ This is the only change here ^
		const dx = Math.round((token.data.x - origin[0]) / s2) * s2;
		const dy = Math.round((token.data.y - origin[1]) / s2) * s2;


		// Get the movement rays and check collision along each Ray
		// These rays are center-to-center for the purposes of collision checking
		let rays = this._getRaysFromWaypoints(this.waypoints, this.destination);
		let hasCollision = rays.some(r => canvas.walls.checkCollision(r));
		if ( hasCollision ) {
			ui.notifications.error("ERROR.TokenCollide", {localize: true});
			return false;
		}

		// Execute the movement path defined by each ray.
		this._state = Ruler.STATES.MOVING;
		let priorDest = undefined;
		for ( let r of rays ) {

			// Break the movement if the game is paused
			if ( !wasPaused && game.paused ) break;

			// Break the movement if Token is no longer located at the prior destination (some other change override this)
			if ( priorDest && ((token.data.x !== priorDest.x) || (token.data.y !== priorDest.y)) ) break;

			// Adjust the ray based on token size
			const dest = canvas.grid.getTopLeft(r.B.x, r.B.y);
			const path = new Ray({x: token.x, y: token.y}, {x: dest[0] + dx, y: dest[1] + dy});

			// Commit the movement and update the final resolved destination coordinates
			await token.document.update(path.B);
			path.B.x = token.data.x;
			path.B.y = token.data.y;
			priorDest = path.B;

			// Retrieve the movement animation and await its completion
			const anim = CanvasAnimation.getAnimation(token.movementAnimationName);
			if ( anim?.promise ) await anim.promise;
		}

		// Once all animations are complete we can clear the ruler
		this._endMeasurement();
	}