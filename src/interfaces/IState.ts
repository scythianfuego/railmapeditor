interface IState {
  // ui
  mode: number;
  // drawing
  blocks: boolean;
  hints: any[];
  tool: any; // ?
  cursorCell: any;
  cursorType: number;
  selectionMode: boolean;
  thickLines: boolean;
  // display scale
  panX: number;
  panY: number;
  zoom: number;
  // mouse selection
  mouse: {
    coords: any; //[0, 0] [number, number]
    down: boolean;
    pan: boolean;
    selection: any;
  };
  // model
  model: any;
}

// type IState = any;
export default IState;
