export default class Animate {
  constructor(model, draw) {
    this.model = model;
    this.draw = draw;
    this.offset = null;
    this.frameFunc = timestamp => this.frameCallback(timestamp);
    this.boundDrawAll = draw.all.bind(draw);
  }

  start() {
    this.requestId = window.requestAnimationFrame(this.frameFunc);
  }

  stop() {
    cancelAnimationFrame(this.requestId);
  }

  runAnimation(path) {
    const initial = path.radius ? path.a1 : 0;
    const max = path.radius ? path.a2 : 1;
    const step = 0.01;

    if (!this.offset) {
      this.offset = initial;
    }
    if (this.offset > max) {
      this.offset = initial;
      // switch segment
      // find new path
    }
    this.offset += step;

    if (path.radius) {
      const x = path.radius * Math.cos(this.offset) + path.x;
      const y = path.radius * Math.sin(this.offset) + path.y;

      this.draw.point(x, y, "#000", 5);
    } else {
      const x = this.offset * (path.ex - path.sx) + path.sx;
      const y = this.offset * (path.ey - path.sy) + path.sy;

      this.draw.point(x, y, "#000", 5);
    }
  }

  frameCallback(timestamp) {
    //
    // this.boundDrawAll();
    this.draw.all.apply(this.draw);
    const v = this.model.store.values().next().value;
    this.currentPath = v ? v[0] : null;
    if (this.currentPath) {
      // this.runAnimation(this.currentPath);
    }

    this.requestId = window.requestAnimationFrame(this.frameFunc);
  }
}
