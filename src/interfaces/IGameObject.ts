import { Point } from "./Point";

type Frame = { x: number; y: number; w: number; h: number };

export default interface IGameObject {
  type: string;
  x: number;
  y: number;
  zindex: number; // TODO: check if unused

  rotation?: number;
  texture?: string;
  layer?: string;
  alpha?: number;
  blend?: number;
  shadow?: boolean;
  width?: number;
  height?: number;
  hasOutline?: boolean;
  outline?: string;
  points?: number;
  color?: number;
  block?: number;
  frame?: Frame;
}
