interface IRail {
  //line
  sx: number;
  sy: number;
  ex: number;
  ey: number;

  // arc
  x: number;
  y: number;
  a1: number;
  a2: number;
  radius: number;

  // common
  type: number;
  meta?: {
    id: number;
    block: number;
    selected?: boolean;
    x: number; // cell x
    y: number; // cell y
  };
}
export default IRail;
