import IKeyValue from "./IKeyValue";
import { Hex, Tool } from "./types";
import IHints from "./IHints";
import Model from "../model";

interface IState {
  // ui
  mode: number;
  // drawing
  layers: IKeyValue;
  hints: IHints;
  tool: Tool; // ?
  cursorCell: Hex;
  cursorType: number;
  selectionMode: boolean;
  // display scale
  panX: number;
  panY: number;
  zoom: number;
  // mouse selection
  mouse: {
    coords: number[];
    down: boolean;
    pan: boolean;
    selection: number[];
  };
  // model
  model: Model;
}

export default IState;
