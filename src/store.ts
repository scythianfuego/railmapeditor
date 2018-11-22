import createStore from "unistore";
import unistoreDevTools from "unistore";
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
  // display scale
  panX: 0,
  panY: 0,
  zoom: 1,
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

let store = unistoreDevTools(createStore(defaults));

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

export default store;
