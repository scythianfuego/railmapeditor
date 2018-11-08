import createStore from "unistore";
import devtools from "unistore/devtools";

// let store = createStore({ count: 0 });
// use redux dev tools instead

const defaults = {
  // ui
  mode: 1,
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
  tool: null,
  // model
  model: null
};

let store = devtools(createStore(defaults));

const pick = (object, props) =>
  props.reduce((acc, curr) => {
    acc[curr] = object[curr];
    return acc;
  }, {});

export const copy = (from, to, props) => Object.assign(to, pick(from, props));
export default store;
