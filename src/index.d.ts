declare module "*.css";

declare module "cat-rom-spline" {
  function catRomSpline(
    points: number[][],
    options: {
      samples: number;
      knot: number;
    }
  ): number[][];

  export = catRomSpline;
}
