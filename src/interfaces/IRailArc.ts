import IRailLine from "./IRailLine";

export default interface IRailArc extends IRailLine {
  x: number;
  y: number;
  a1: number;
  a2: number;
  radius: number;
}
