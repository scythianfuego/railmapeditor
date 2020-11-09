import { autorun, observable } from "mobx";
import IState from "./interfaces/IState";

const defaults: IState = {
  // ui
  mode: 0,
  // drawing
  layers: {},
  hints: [],
  tool: null,
  selectionMode: false,
  cursorType: 0,
  snapPoint: [0, 0],
  // display scale
  panX: 0,
  panY: 0,
  zoom: 50,
  // mouse selection
  mouse: {
    coords: [0, 0],
    down: false,
    pan: false,
    selection: null,
  },
  // model
  model: null,
};

type FlatObject = {
  [index: string]: any;
};

const pick = (object: FlatObject, props: string[]) =>
  props.reduce((acc: FlatObject, curr: string) => {
    acc[curr] = object[curr];
    return acc;
  }, {});

export const copy = (from: FlatObject, to: FlatObject, props: string[]) =>
  Object.assign(to, pick(from, props));

export const store = observable(defaults);
