import store, { copy } from "./store";
import ts from "./transform";

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
    this.ctx = canvas.getContext("2d");
    this.ctx.translate(0.5, 0.5);

    // moveable and zoomable parts of canvas
    this.screen = {
      moveTo: (x, y) => this.ctx.moveTo(ts.sx(x), ts.sy(y)),
      lineTo: (x, y) => this.ctx.lineTo(ts.sx(x), ts.sy(y)),
      arc: (x, y, radius, a1, a2, ccw) =>
        this.ctx.arc(ts.sx(x), ts.sy(y), ts.scale(radius), a1, a2, ccw),
      fillText: (text, x, y, maxWidth) =>
        this.ctx.fillText(text, ts.sx(x), ts.sy(y), maxWidth),
      fillRect: (x, y, w, h) =>
        this.ctx.fillRect(ts.sx(x), ts.sy(y), ts.scale(w), ts.scale(h)),
      strokeRect: (x, y, w, h) =>
        this.ctx.strokeRect(ts.sx(x), ts.sy(y), ts.scale(w), ts.scale(h))
    };

    store.subscribe(state => {
      copy(state, this, [
        "hints",
        "tool",
        "cursorCell",
        "selectionMode",
        "zoom",
        "panX",
        "panY"
      ]);

      this.state = state; // todo: refactor out mouse
      if (state.mouse.pan) {
        this.canvas.style.cursor = "grabbing";
      } else {
        this.canvas.style.cursor = "pointer";
      }
    });
  }

  getColor(type, selected) {
    if (this.selectionMode) {
      return selected ? "red" : "#ccc";
    }
    if (0x20 <= type && type <= 0x29) {
      return "yellow";
    }

    if (0x30 <= type && type <= 0x39) {
      return "#00ff2a";
    }

    if (0x40 <= type && type <= 0x49) {
      return "#00baff";
    }

    return "#ffa834";
  }

  clear() {
    this.ctx.fillStyle = "#0f0605";
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  all() {
    this.clear();
    this.grid();
    if (!this.selectionMode) {
      this.cell(this.cursorCell, "#999");
    }
    this.model.forEach(obj => this.object(obj));
    this.connections();
    this.cursor();
    this.selectionFrame();
    this.helpline();
  }

  cursor() {
    if (this.tool && this.cursorCell) {
      const obj = this.tool(this.cursorCell);
      if (obj) {
        Array.isArray(obj)
          ? obj.forEach(o => this.object(o))
          : this.object(obj);
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
    this.screen.moveTo(firstCorner.x, firstCorner.y); // move the "pen" to the first corner
    otherCorners.forEach(({ x, y }) => this.screen.lineTo(x, y)); // draw lines to the other corners
    this.screen.lineTo(firstCorner.x, firstCorner.y); // finish at the first corner
    this.ctx.stroke();
  }

  grid() {
    const { gridWidth, gridHeight } = ts;

    this.ctx.fillStyle = "#1e0b09";
    this.screen.fillRect(0, 0, gridWidth, gridHeight);
    this.ctx.strokeStyle = "#333";
    this.ctx.lineWidth = 1;
    this.ctx.fillStyle = "#999";
    this.ctx.font = "7px Arial";

    this.screen.strokeRect(-1, -1, gridWidth + 1, gridHeight + 1);
    this.hexgrid.forEach(hex => {
      const corners = getCorners(hex);
      this.ctx.beginPath();
      2;
      this.screen.moveTo(corners[1].x, corners[1].y); // move the "pen" to the first corner
      [3, 5, 1].forEach(i => this.screen.lineTo(corners[i].x, corners[i].y));
      this.ctx.stroke();
    });
  }

  point(x, y, style, size) {
    this.ctx.lineWidth = 1;
    this.ctx.fillStyle = style ? style : "cyan";
    this.ctx.beginPath();
    this.screen.arc(x, y, size ? size : 3, 0, 6.29);
    this.ctx.fill();
  }

  arrow(sx, sy, ex, ey) {
    this.ctx.strokeStyle = "#999";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    const h = 10; // length of head in pixels
    const a = Math.atan2(ey - sy, ex - sx);
    const a1 = Math.PI / 12;
    this.screen.moveTo(sx, sy);
    this.screen.lineTo(ex, ey);
    this.screen.lineTo(ex - h * Math.cos(a - a1), ey - h * Math.sin(a - a1));
    this.screen.moveTo(ex, ey);
    this.screen.lineTo(ex - h * Math.cos(a + a1), ey - h * Math.sin(a + a1));
    this.ctx.stroke();
  }

  arc(obj) {
    const { x, y, radius, a1, a2, sx, sy, ex, ey, type, selected } = obj;
    const color = this.getColor(type, selected);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.screen.arc(x, y, radius, a1, a2);
    this.ctx.stroke();

    const midx = x + radius * Math.cos((a1 + a2) / 2);
    const midy = y + radius * Math.sin((a1 + a2) / 2);
    obj.meta && this.state.blocks && this.text(midx, midy, obj.meta.block);
  }

  text(x, y, what) {
    this.ctx.font = "10px Arial";
    const w = this.ctx.measureText(what).width;
    const h = 10;
    const tx = x - w * 0.5;
    const ty = y + h * 0.25;
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.beginPath();
    this.screen.arc(x, y, 10, 0, 6.29);
    this.ctx.fill();

    this.ctx.fillStyle = "#fff";
    this.screen.fillText(what, tx, ty);
  }

  line(obj) {
    const { sx, sy, ex, ey, type, selected } = obj;
    const color = selected ? "red" : this.getColor(type, selected);
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.strokeStyle = color;
    this.screen.moveTo(sx, sy);
    this.screen.lineTo(ex, ey);
    this.ctx.stroke();

    const midx = (sx + ex) * 0.5;
    const midy = (sy + ey) * 0.5;
    obj.meta && this.state.blocks && this.text(midx, midy, obj.meta.block);
    // this.point(sx, sy, color);
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

  connections() {
    const c = this.model.connections;
    Object.values(c).map(v => {
      const { x, y, items } = v;
      const simple = items.length <= 2;

      let radius = simple ? 2 : 5;
      let color = simple ? "green" : "red";
      if (v === this.model.selectedConnection) {
        radius = 15;
        color = "rgba(0, 0, 0, 0.8)";
      }

      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.screen.arc(x, y, radius, 0, 6.29);
      this.ctx.fill();
    });
  }

  selectionFrame() {
    const { mouse } = this.state;
    if (!mouse.down) {
      return;
    }
    const [sx, sy] = mouse.selection;
    const [ex, ey] = mouse.coords;
    this.ctx.strokeStyle = "#ccc";
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([3, 3]);
    this.ctx.strokeRect(sx, sy, ex - sx, ey - sy);
    this.ctx.setLineDash([]);
  }

  helpline() {
    const hints = this.hints;
    if (!hints) {
      return;
    }

    let x = 0;
    let y = this.canvas.height - 20;
    let metrics;
    const normalFont = "14px  monospace ";
    const boldFont = "bold 14px  monospace ";

    this.ctx.fillStyle = "#303030";
    this.ctx.fillRect(0, y, this.canvas.width, 20);

    // this.ctx
    hints.forEach(h => {
      // tag
      this.ctx.font = boldFont;
      metrics = this.ctx.measureText(h.tag);
      this.ctx.fillStyle = "#444444";
      this.ctx.fillRect(x, y, metrics.width + 20, 20);
      this.ctx.fillStyle = "#ffaf00";
      x += 5;
      this.ctx.fillText(h.tag, x, y + 14);
      x += Math.floor(metrics.width + 10);

      // text
      metrics = this.ctx.measureText(h.text);
      if (h.active) {
        this.ctx.fillStyle = "#aaa";
        this.ctx.fillRect(x, y, metrics.width + 10, 20);
        this.ctx.fillStyle = "#000";
      } else if (h.selected) {
        this.ctx.fillStyle = "#835a00";
        this.ctx.fillRect(x, y, metrics.width + 10, 20);
        this.ctx.fillStyle = "#d5d5d5";
      } else {
        this.ctx.fillStyle = "#d5d5d5";
      }
      this.ctx.font = normalFont;
      x += 5;
      this.ctx.fillText(h.text, x, y + 14);
      x += Math.floor(metrics.width + 20);
    });
  }
}
