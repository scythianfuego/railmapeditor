const MIN_DISTANCE = 5;

export default class Model {
  constructor() {
    this.store = new Map();
    this.connections = new Map();

    // horizontal lines:
    //     -  0x10 left right
    // \  0x11 top bottom (r to l!)
    // /  0x12 top bottom
    this.allowedConnections = [
      //  <- ->
      {
        left: [0x10, 0x21, 0x31, 0x23, 0x40],
        right: [0x10, 0x20, 0x30, 0x41, 0x24],
        dirL: [1, -1, -1, 1, 1],
        dirR: [1, -1, -1, 1, 1]
      },
      // /v  /^
      {
        left: [0x12, 0x20, 0x43, 0x32, 0x22],
        right: [0x12, 0x25, 0x42, 0x23, 0x33]
      },
      // \v \^
      {
        left: [0x11, 0x25, 0x35, 0x21, 0x44],
        right: [0x11, 0x24, 0x22, 0x34, 0x45]
      },
      {
        left: [0x33],
        right: [0x43]
      },
      {
        left: [0x42],
        right: [0x32]
      },
      {
        left: [0x41],
        right: [0x31]
      },
      {
        left: [0x30],
        right: [0x40]
      },
      {
        left: [0x44],
        right: [0x34]
      },
      {
        left: [0x35],
        right: [0x45]
      }
    ];
  }

  distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
  }

  connectDots(obj, v, x1, y1) {
    this.allowedConnections.forEach(pairList => {
      const r_index = pairList.right.indexOf(obj.type);
      if (r_index !== -1) {
        // joining right
        const x = Math.floor(x1 / MIN_DISTANCE) * MIN_DISTANCE;
        const y = Math.floor(y1 / MIN_DISTANCE) * MIN_DISTANCE;
        const key = `${x}-${y}`;
        const curr = this.connections.get(key) || [];

        // check v is on list
        const l_index = pairList.left.indexOf(v.type);
        if (l_index != -1) {
          // todo: fill direction
          curr.push(v, obj);
          this.connections.set(key, curr);
        }
      }
    });
  }

  createConnections(obj) {
    // TODO: neighbours only

    const distance = this.distance;
    this.store.forEach(v => {
      if (distance(obj.sx, obj.sy, v[0].sx, v[0].sy) < MIN_DISTANCE) {
        console.log("A");
        this.connectDots(obj, v[0], obj.sx, obj.sy);
      }
      if (distance(obj.sx, obj.sy, v[0].ex, v[0].ey) < MIN_DISTANCE) {
        console.log("B");
        this.connectDots(obj, v[0], obj.sx, obj.sy);
      }
      if (distance(obj.ex, obj.ey, v[0].sx, v[0].sy) < MIN_DISTANCE) {
        console.log("C");
        this.connectDots(obj, v[0], obj.ex, obj.ey);
      }
      if (distance(obj.ex, obj.ey, v[0].ex, v[0].ey) < MIN_DISTANCE) {
        console.log("D");
        this.connectDots(obj, v[0], obj.ex, obj.ey);
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
