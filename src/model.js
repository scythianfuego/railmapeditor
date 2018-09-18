export default class Model {
  constructor() {
    this.store = new Map();
    this.connections = new Map();
  }

  distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
  }

  createConnections(obj) {
    // TODO: neighbours only
    const threshold = 5;
    const distance = this.distance;
    this.store.forEach(v => {
      if (distance(obj.sx, obj.sy, v.sx, v.sy) < threshold) {
        console.log("A");
      }
      if (distance(obj.sx, obj.sy, v.ex, v.ey) < threshold) {
        console.log("B");
      }
      if (distance(obj.ex, obj.ey, v.sx, v.sy) < threshold) {
        console.log("C");
      }
      if (distance(obj.ex, obj.ey, v.ex, v.ey) < threshold) {
        console.log("D");
      }
    });
  }

  add(cell, obj) {
    if (!obj) return;

    obj = Array.isArray(obj) ? obj : [obj];
    obj.forEach(o => {
      const key = `${cell.x}-${cell.y}`;

      o.meta = {
        x: cell.x,
        y: cell.y,
        key
      };
      const curr = this.store.get(key) || [];
      if (curr.length < 2) {
        this.createConnections(o); // TODO: front and rear only
        curr.push(o);
        this.store.set(key, curr);
      } else {
        console.log("too many lines here");
      }
    });
  }

  forEach(fn) {
    this.store.forEach(v => v.forEach(i => fn(i)));
  }
}
