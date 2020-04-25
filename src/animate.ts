import Draw from "./PIXI/draw";
import Model from "./model";

export default class Animate {
  public boundDrawAll: () => void = null;

  // private offset: number = null;
  private requestId: number = 0;
  private frameFunc = (timestamp: number) => this.frameCallback(timestamp);

  constructor(private model: Model, private draw: Draw) {
    this.boundDrawAll = this.draw.all.bind(this.draw);
  }

  start() {
    this.requestId = window.requestAnimationFrame(this.frameFunc);
  }

  stop() {
    cancelAnimationFrame(this.requestId);
  }

  // runAnimation(path) {
  //   const initial = path.radius ? path.a1 : 0;
  //   const max = path.radius ? path.a2 : 1;
  //   const step = 0.01;

  //   if (!this.offset) {
  //     this.offset = initial;
  //   }
  //   if (this.offset > max) {
  //     this.offset = initial;
  //     // switch segment
  //     // find new path
  //   }
  //   this.offset += step;

  //   if (path.radius) {
  //     const x = path.radius * Math.cos(this.offset) + path.x;
  //     const y = path.radius * Math.sin(this.offset) + path.y;

  //     this.draw.point(x, y, "#000", 5);
  //   } else {
  //     const x = this.offset * (path.ex - path.sx) + path.sx;
  //     const y = this.offset * (path.ey - path.sy) + path.sy;

  //     this.draw.point(x, y, "#000", 5);
  //   }
  // }

  frameCallback(timestamp: number) {
    //
    // this.boundDrawAll();
    this.draw.all.apply(this.draw);
    // const v = this.model.store.values().next().value;
    // this.currentPath = v ? v[0] : null;
    // if (this.currentPath) {
    //   // this.runAnimation(this.currentPath);
    // }

    this.requestId = window.requestAnimationFrame(this.frameFunc);
  }
}
