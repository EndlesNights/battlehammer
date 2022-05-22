export default function _refreshBorder(){
    this.border.clear();
    const borderColor = this._getBorderColor();
    if( !borderColor ) return;
    const t = CONFIG.Canvas.objectBorderThickness;

    // Draw Hex border for size 1 tokens on a hex grid
    const gt = CONST.GRID_TYPES;
    const hexTypes = [gt.HEXEVENQ, gt.HEXEVENR, gt.HEXODDQ, gt.HEXODDR];
    if ( hexTypes.includes(canvas.grid.type) && (this.data.width === 1) && (this.data.height === 1) ) {
        const polygon = canvas.grid.grid.getPolygon(-1, -1, this.w+2, this.h+2);
        this.border.lineStyle(t, 0x000000, 0.8).drawPolygon(polygon);
        this.border.lineStyle(t/2, borderColor, 1.0).drawPolygon(polygon);
    }
    // Otherwise Draw Square border
    else {
        const h = Math.round(t/2);
        const o = Math.round(h/2);
        if(this.h === this.w){
            this.border.lineStyle(t*2, 0x000000, 0.8).drawCircle(this.w/2, this.h/2, this.h/2);
            this.border.lineStyle(h*2, borderColor, 1.0).drawCircle(this.w/2, this.h/2, this.h/2);
        } else {
            this.border.lineStyle(t, 0x000000, 0.8).drawRoundedRect(-o, -o, this.w+h, this.h+h, 3);
            this.border.lineStyle(h, borderColor, 1.0).drawRoundedRect(-o, -o, this.w+h, this.h+h, 3);
        }
    }
}