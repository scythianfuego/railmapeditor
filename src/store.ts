import createStore, { Store } from "unistore";
import unistoreDevTools from "unistore/devtools";
import IState from "./interfaces/IState";

// let store = createStore({ count: 0 });
// use redux dev tools instead

const defaults: IState = {
  // ui
  mode: 0,
  // drawing
  blocks: false,
  hints: [],
  tool: null,
  cursorCell: null,
  selectionMode: false,
  cursorType: 0,
  thickLines: false,
  // display scale
  panX: 0,
  panY: 0,
  zoom: 50,
  // mouse selection
  mouse: {
    coords: [0, 0],
    down: false,
    pan: false,
    selection: null
  },
  // model
  model: null
};

let storeInstance: Store<IState> = createStore(defaults);
// console.log(unistoreDevTools);
let devInstance: Store<IState> = unistoreDevTools(storeInstance);

type FlatObject = {
  [index: string]: any;
};

// todo: Partial?
const pick = (object: FlatObject, props: string[]) =>
  props.reduce((acc: FlatObject, curr: string) => {
    acc[curr] = object[curr];
    return acc;
  }, {});

export const copy = (from: FlatObject, to: FlatObject, props: string[]) =>
  Object.assign(to, pick(from, props));

export default devInstance;
