export default function _getBorderColor() {
    if(this._controlled) return CONFIG.Canvas.dispositionColors.CONTROLLED;
    else if (this._hover) {
        const ownerID = this.data.flags.battlehammer?.ownerID || null
        if(ownerID){
            return Number(`0x${game.users.get(ownerID).data.color.substring(1)}`);
        }

        //from the origonal class;
        const colors = CONFIG.Canvas.dispositionColors;
        let d = parseInt(this.data.disposition);
        if (!game.user.isGM && this.isOwner) return colors.CONTROLLED;
        else if (this.actor?.hasPlayerOwner) return colors.PARTY;
        else if (d === CONST.TOKEN_DISPOSITIONS.FRIENDLY) return colors.FRIENDLY;
        else if (d === CONST.TOKEN_DISPOSITIONS.NEUTRAL) return colors.NEUTRAL;
        else return colors.HOSTILE;
    }
    return null;
}