import IKeyValue from "./IKeyValue";
import { Tool } from "./types";
import IHints from "./IHints";
import Model from "../model";

interface IState {
  // ui
  mode: number;
  // drawing
  hints: IHints;
  tool: Tool; // ?
  snapPoint: number[];
  cursorType: number;
  selectionMode: boolean;
  // display scale
  panX: number;
  panY: number;
  zoom: number;
  // mouse and selection
  mouse: {
    coords: number[];
    down: boolean;
    pan: boolean;
    selection: number[];
  };
  // model
  model: Model;

  // ui display items
  show: {
    selection: boolean;
    railId: boolean;
    blockId: boolean;
    gridDots: boolean;
    railCursor: boolean;
    switchLabel: boolean;
    objectAnchors: boolean;
    connectionMarks: boolean;
  };
}

export default IState;
