import createStore from "unistore";
import devtools from "unistore/devtools";

// let store = createStore({ count: 0 });
// use redux dev tools instead

const defaults = {
  // ui
  hints: [],
  mode: 1,
  tool: null,
  // mouse selection
  mouse: {
    coords: [0, 0],
    down: false,
    selection: null
  },
  cursorCell: null,
  tool: null,
  // model
  model: null
};

let store = devtools(createStore(defaults));
export default store;
