import IRailArc from "./IRailArc";

interface IRailObject extends Partial<IRailArc> {
  meta?: {
    id: number;
    block: number;
    selected?: boolean;
    x: number; // cell x
    y: number; // cell y
  };
}
export default IRailObject;
