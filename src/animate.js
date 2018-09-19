export default class Animate {
  constructor(model, draw) {
    this.model = model;
    this.draw = draw;
    this.offset = 0;
    this.frameFunc = timestamp => this.frameCallback(timestamp);
  }

  start() {
    this.requestId = window.requestAnimationFrame(this.frameFunc);
  }

  stop() {
    cancelAnimationFrame(this.requestId);
  }

  runAnimation(path) {
    this.offset += 1;

    if (path.radius) {
      const x = path.radius * Math.cos(path.a1 + this.offset) + path.sx;
      const y = path.radius * Math.sin(path.a1 + this.offset) + path.sy;

      this.draw.all();
      this.draw.point(x, y, null, 10);
    }
  }

  frameCallback(timestamp) {
    //
    const v = this.model.store.values().next().value;
    this.currentPath = v ? v[0] : null;
    if (this.currentPath) {
      this.runAnimation(this.currentPath);
    }

    this.requestId = window.requestAnimationFrame(this.frameFunc);
  }
}
