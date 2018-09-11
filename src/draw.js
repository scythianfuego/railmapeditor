const getCorners = hex => {
  const point = hex.toPoint();
  return hex.corners().map(corner => corner.add(point));
};

export class Draw {
  constructor(canvas, hexgrid) {
    this.canvas = canvas;
    this.hexgrid = hexgrid;
    this.ctx = canvas.getContext("2d");
  }

  clear() {
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
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

      const point = hex.toPoint();
      const text = `${hex.x},${hex.y}`;
      const w = this.ctx.measureText(text).width;
      this.ctx.fillText(
        text,
        point.x + hex.size - w / 2,
        point.y + hex.size + 7
      );
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
    const typeToColor = {
      long: "blue",
      short: "green",
      short2: "cyan"
    };

    const { x, y, radius, a1, a2, type } = obj;
    this.ctx.strokeStyle = typeToColor[type];
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, a1, a2);
    this.ctx.stroke();

    const sx = x + radius * Math.cos(a1);
    const sy = y + radius * Math.sin(a1);
    const ex = x + radius * Math.cos(a2);
    const ey = y + radius * Math.sin(a2);

    this.point(sx, sy, "green");
    this.point(ex, ey, "red");

    const midx = x + radius * Math.cos((a1 + a2) / 2);
    const midy = y + radius * Math.sin((a1 + a2) / 2);
    this.arrow(x, y, midx, midy);
  }

  line(obj) {
    const { x1, y1, x2, y2 } = obj;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.strokeStyle = "orange";
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();

    this.point(x1, y1, "green");
    this.point(x2, y2, "red");
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
