import createStore from "unistore";
import devtools from "unistore/devtools";

// let store = createStore({ count: 0 });
// use redux dev tools instead

const defaults = {
  // ui
  hints: [],
  // model
  model: null
};

let store = devtools(createStore(defaults));
export default store;
