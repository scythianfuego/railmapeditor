import IRailArc from "./IRailArc";

interface IRailObject extends Partial<IRailArc> {
  selected?: boolean;
}
export default IRailObject;
