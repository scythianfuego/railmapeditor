const getCorners = hex => {
  const point = hex.toPoint();
  return hex.corners().map(corner => corner.add(point));
};

export default class Draw {
  constructor(canvas, hexgrid, model) {
    this.canvas = canvas;
    this.hexgrid = hexgrid;
    this.model = model;
    this.cursorCell = null;
    this.currentTool = null;
    this.ctx = canvas.getContext("2d");
  }

  setCursor(cursorCell) {
    this.cursorCell = cursorCell;
  }

  setTool(tool) {
    this.currentTool = tool;
  }

  typeToColor(type) {
    if (0x20 <= type && type <= 0x29) {
      return "blue";
    }

    if (0x30 <= type && type <= 0x39) {
      return "green";
    }

    if (0x40 <= type && type <= 0x49) {
      return "cyan";
    }

    return "orange";
  }

  clear() {
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  all() {
    this.clear();
    this.grid();
    this.cell(this.cursorCell, "#999");
    this.model.forEach(obj => this.object(obj));
    this.tool();
  }

  tool() {
    if (this.currentTool && this.cursorCell) {
      const obj = this.currentTool(this.cursorCell);
      if (obj) {
        Array.isArray(obj)
          ? obj.forEach(o => draw.object(o))
          : draw.object(obj);
      }
    }
  }

  cell(hex, style) {
    if (!hex) {
      return;
    }
    this.ctx.strokeStyle = style ? style : "#000";
    const corners = getCorners(hex);
    const [firstCorner, ...otherCorners] = corners;

    this.ctx.beginPath();
    this.ctx.moveTo(firstCorner.x, firstCorner.y); // move the "pen" to the first corner
    otherCorners.forEach(({ x, y }) => this.ctx.lineTo(x, y)); // draw lines to the other corners
    this.ctx.lineTo(firstCorner.x, firstCorner.y); // finish at the first corner
    this.ctx.stroke();
  }

  grid() {
    this.ctx.strokeStyle = "#eee";
    this.ctx.font = "7px Arial";
    this.ctx.fillStyle = "#999";
    this.hexgrid.forEach(hex => {
      const corners = getCorners(hex);
      this.ctx.beginPath();
      this.ctx.moveTo(corners[1].x, corners[1].y); // move the "pen" to the first corner
      [3, 5, 1].forEach(i => this.ctx.lineTo(corners[i].x, corners[i].y));
      this.ctx.stroke();

      // cell ids
      // const point = hex.toPoint();
      // const text = `${hex.x},${hex.y}`;
      // const w = this.ctx.measureText(text).width;
      // this.ctx.fillText(
      //   text,
      //   point.x + hex.size - w / 2,
      //   point.y + hex.size + 7
      // );
    });
  }

  point(x, y, style, size) {
    this.ctx.lineWidth = 1;
    this.ctx.fillStyle = style ? style : "cyan";
    this.ctx.beginPath();
    this.ctx.arc(x, y, size ? size : 3, 0, 6.29);
    this.ctx.fill();
  }

  arrow(sx, sy, ex, ey) {
    this.ctx.strokeStyle = "#999";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    const h = 10; // length of head in pixels
    const a = Math.atan2(ey - sy, ex - sx);
    const a1 = Math.PI / 12;
    this.ctx.moveTo(sx, sy);
    this.ctx.lineTo(ex, ey);
    this.ctx.lineTo(ex - h * Math.cos(a - a1), ey - h * Math.sin(a - a1));
    this.ctx.moveTo(ex, ey);
    this.ctx.lineTo(ex - h * Math.cos(a + a1), ey - h * Math.sin(a + a1));
    this.ctx.stroke();
  }

  arc(obj) {
    const { x, y, radius, a1, a2, sx, sy, ex, ey, type } = obj;
    this.ctx.strokeStyle = this.typeToColor(type);
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, a1, a2);
    this.ctx.stroke();

    this.point(sx, sy, "green");
    this.point(ex, ey, "red");

    this.ctx.font = "10px Arial";
    this.ctx.fillStyle = "#f00";
    this.ctx.fillText(`0x${type.toString(16)}`, x, y);
    // arrows
    // const midx = x + radius * Math.cos((a1 + a2) / 2);
    // const midy = y + radius * Math.sin((a1 + a2) / 2);
    // this.arrow(x, y, midx, midy);
  }

  line(obj) {
    const { sx, sy, ex, ey, type } = obj;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.typeToColor(type);
    this.ctx.moveTo(sx, sy);
    this.ctx.lineTo(ex, ey);
    this.ctx.stroke();

    this.point(sx, sy, "green");
    this.point(ex, ey, "red");
  }

  object(obj) {
    this.ctx.save();
    if (obj.radius) {
      this.arc(obj);
    } else {
      this.line(obj);
    }

    this.ctx.restore();
  }

  // export default draw;
}
