export class Point {
  public x: number = 0;
  public y: number = 0;

  constructor(x?: number | [number, number], y?: number) {
    if (Array.isArray(x)) {
      [this.x, this.y] = x;
    } else if (x != null && y != null) {
      [this.x, this.y] = [x, y];
    }
  }
}
