import { IProperty } from "./../interfaces/IProperty";
import IHints from "../interfaces/IHints";
import IKeyValue from "../interfaces/IKeyValue";

// const A: { [index: string]: number }
enum A {
  SELECT,
  LINES,
  HLINES,
  DLINES,
  CURVE,
  CURVE1,
  SIDEA,
  ARC2A,
  LONG,
  BLOCK,
  CONNECT,
  OBJECT,
  POINTS,

  // actions
  GROUP,
  UNGROUP,
  REINDEXBLOCKS,
  REINDEXRAILS,
  DELETE,
  NEXT,
  PREV,
  SWITCH,
  JOIN,

  SWITCH_AP,
  SWITCH_AS,
  SWITCH_BP,
  SWITCH_BS,

  SAVE,
  LOAD,
  EXPORT,
  SAVESLOT1,
  SAVESLOT2,
  SAVESLOT3,
  SAVESLOT4,
  SAVESLOT5,
  SAVESLOT6,
  SAVESLOT7,
  LOADSLOT1,
  LOADSLOT2,
  LOADSLOT3,
  LOADSLOT4,
  LOADSLOT5,
  LOADSLOT6,
  LOADSLOT7,

  OBJECTNEW,
  OBJECTEDIT,
  OBJECTEDITPOINTS,
  OBJECTMOVE,
  OBJECTCLONE,
  OBJECTDELETE,
  OBJECTFWD,
  OBJECTBACK,

  POINTMOVE,
  POINTADD,
  POINTDELETE,
  POINTSPLIT,
  POINTINTERPOLATE,

  EMPTY,
}

const tools = [
  A.LINES,
  A.HLINES,
  A.DLINES,
  A.CURVE,
  A.CURVE1,
  A.SIDEA,
  A.ARC2A,
  A.LONG,
];
const pointtools = [
  A.POINTMOVE,
  A.POINTADD,
  A.POINTDELETE,
  A.POINTSPLIT,
  A.POINTINTERPOLATE,
];
const extramodes = [
  A.SAVE,
  A.LOAD,
  A.SELECT,
  A.BLOCK,
  A.OBJECT,
  A.CONNECT,
  A.POINTS,
];
const modes = tools.concat(pointtools).concat(extramodes);

const AG: { [index: string]: A[] } = {
  TOOLS: tools,
  POINTTOOLS: pointtools,
  SELECTABLE: [A.SELECT, A.BLOCK, A.CONNECT],
  SELECT_CONNECTIONS: [A.CONNECT],
  SELECT_OBJECTS: [A.OBJECT],
  MODES: modes,
  LOADSLOT: [
    A.LOADSLOT1,
    A.LOADSLOT2,
    A.LOADSLOT3,
    A.LOADSLOT4,
    A.LOADSLOT5,
    A.LOADSLOT6,
    A.LOADSLOT7,
  ],
  SAVESLOT: [
    A.SAVESLOT1,
    A.SAVESLOT2,
    A.SAVESLOT3,
    A.SAVESLOT4,
    A.SAVESLOT5,
    A.SAVESLOT6,
    A.SAVESLOT7,
  ],
};

const actions = A;
const actionGroups = AG;

// modes
// action - what to do
// on - what to highlight
// show/hide - when to show/hide
// prettier-ignore
const hints: IHints = [
  // top level
  { tag: "1", text: "Draw", action: A.LINES, show: [A.SELECT] },
  { tag: "2", text: "Block", action: A.BLOCK, show: [A.SELECT] },
  { tag: "3", text: "Switch", action: A.CONNECT, show: [A.SELECT] },
  { tag: "4", text: "Objects", action: A.OBJECT, show: [A.SELECT] },
  { tag: "S", text: "Save", action: A.SAVE, show: [A.SELECT] },
  { tag: "L", text: "Load", action: A.LOAD, show: [A.SELECT] },
  { tag: "0", text: "Export", action: A.EXPORT, show: [A.SELECT] },
  { tag: "DEL", text: "Delete", action: A.DELETE, show: [A.SELECT] },
  // drawing
  { tag: "ESC", text: "Back", action: A.SELECT, show: AG.TOOLS },
  { tag: "1", text: "Lines", action: A.LINES, show: AG.TOOLS, on: A.LINES },
  { tag: "2", text: "HalfLine", action: A.HLINES, show: AG.TOOLS, on: A.HLINES },
  { tag: "3", text: "DoubleLine", action: A.DLINES, show: AG.TOOLS, on: A.DLINES },
  { tag: "4", text: "Curve", action: A.CURVE, show: AG.TOOLS, on: A.CURVE },
  { tag: "5", text: "CurveA", action: A.CURVE1, show: AG.TOOLS, on: A.CURVE1 },
  { tag: "6", text: "SideA", action: A.SIDEA, show: AG.TOOLS, on: A.SIDEA },
  { tag: "7", text: "DoubleA", action: A.ARC2A, show: AG.TOOLS, on: A.ARC2A },
  { tag: "0", text: "InfLine", action: A.LONG, show: AG.TOOLS, on: A.LONG },
  { tag: "Z", text: "Next tool", action: A.NEXT, show: AG.TOOLS },
  { tag: "X", text: "Prev tool", action: A.PREV, show: AG.TOOLS },
  // block
  { tag: "ESC", text: "Back", action: A.SELECT, show: [A.BLOCK] },
  { tag: "Z", text: "Group", action: A.GROUP, show: [A.BLOCK] },
  { tag: "X", text: "Unroup", action: A.UNGROUP, show: [A.BLOCK] },
  { tag: "1", text: "Reindex blocks", action: A.REINDEXBLOCKS, show: [A.BLOCK] },
  { tag: "2", text: "Reindex rails", action: A.REINDEXRAILS, show: [A.BLOCK] },

  // switch
  { tag: "ESC", text: "Back", action: A.SELECT, show: [A.CONNECT] },
  { tag: "Z", text: "Create switch", action: A.SWITCH, show: [A.CONNECT] },

  { tag: "1", text: "A1", action: A.SWITCH_AP, show: [A.CONNECT] },
  { tag: "2", text: "A2", action: A.SWITCH_AS, show: [A.CONNECT] },
  { tag: "3", text: "B1", action: A.SWITCH_BP, show: [A.CONNECT] },
  { tag: "4", text: "B2", action: A.SWITCH_BS, show: [A.CONNECT] },
  // todo: find common connection for selection
  // onclick select switch components - with alteration
  { tag: "X", text: "Connect", action: A.JOIN, show: [A.CONNECT] },

  // saveloadslots
  { tag: "ESC", text: "Back", action: A.SELECT, show: [A.SAVE] },
  { tag: "1", text: "Save Slot", action: A.SAVESLOT1, show: [A.SAVE] },
  { tag: "2", text: "Save Slot", action: A.SAVESLOT2, show: [A.SAVE] },
  { tag: "3", text: "Save Slot", action: A.SAVESLOT3, show: [A.SAVE] },
  { tag: "4", text: "Save Slot", action: A.SAVESLOT4, show: [A.SAVE] },
  { tag: "5", text: "Save Slot", action: A.SAVESLOT5, show: [A.SAVE] },
  { tag: "6", text: "Save Slot", action: A.SAVESLOT6, show: [A.SAVE] },
  { tag: "7", text: "Save Slot", action: A.SAVESLOT7, show: [A.SAVE] },
  { tag: "ESC", text: "Back", action: A.SELECT, show: [A.LOAD] },
  { tag: "1", text: "Load Slot", action: A.LOADSLOT1, show: [A.LOAD] },
  { tag: "2", text: "Load Slot", action: A.LOADSLOT2, show: [A.LOAD] },
  { tag: "3", text: "Load Slot", action: A.LOADSLOT3, show: [A.LOAD] },
  { tag: "4", text: "Load Slot", action: A.LOADSLOT4, show: [A.LOAD] },
  { tag: "5", text: "Load Slot", action: A.LOADSLOT5, show: [A.LOAD] },
  { tag: "6", text: "Load Slot", action: A.LOADSLOT6, show: [A.LOAD] },
  { tag: "7", text: "Load Slot", action: A.LOADSLOT7, show: [A.LOAD] },

  // object
  { tag: "ESC", text: "Back", action: A.SELECT, show: [A.OBJECT] },
  { tag: "1", text: "New", action: A.OBJECTNEW, show: [A.OBJECT] },
  { tag: "2", text: "Edit", action: A.OBJECTEDIT, show: [A.OBJECT] },
  { tag: "3", text: "Points", action: A.POINTS, show: [A.OBJECT] },
  { tag: "4", text: "Move", action: A.OBJECTMOVE, show: [A.OBJECT] },
  { tag: "5", text: "Clone", action: A.OBJECTCLONE, show: [A.OBJECT] },
  { tag: "6", text: "Forward", action: A.OBJECTFWD, show: [A.OBJECT] },
  { tag: "7", text: "Back", action: A.OBJECTBACK, show: [A.OBJECT] },
  { tag: "DEL", text: "Delete", action: A.OBJECTDELETE, show: [A.OBJECT] },

  // object polygon points
  { tag: "ESC", text: "Back", action: A.OBJECT, show: AG.POINTTOOLS },
  { tag: "1", text: "Move point", action: A.POINTMOVE, show: AG.POINTTOOLS, on: A.POINTMOVE },
  { tag: "2", text: "Add", action: A.POINTADD, show: AG.POINTTOOLS, on: A.POINTADD },
  { tag: "3", text: "Delete", action: A.POINTDELETE, show: AG.POINTTOOLS, on: A.POINTDELETE },
  { tag: "4", text: "Split", action: A.POINTSPLIT, show: AG.POINTTOOLS, on: A.POINTSPLIT },
  { tag: "5", text: "Interpolate", action: A.POINTINTERPOLATE, show: AG.POINTTOOLS, on: A.POINTINTERPOLATE },

];

const keyMap: {
  [index: string]: number;
} = {
  "1": 49,
  "2": 50,
  "3": 51,
  "4": 52,
  "5": 53,
  "6": 54,
  "7": 55,
  "8": 56,
  "9": 57,
  "0": 48,
  Z: 90,
  X: 88,
  S: 83,
  L: 76,
  DEL: 46,
  ESC: 27,
};

const gameLayers = [
  "grass",
  "rails",
  "shadow",
  "forest",
  "train",
  "platform",
  "roof",
  "highground",
  "highrail",
  "bridge",
  "switch",
  "topmost",
];

const textures = [
  "forest1.png",
  "bridge1.png",
  "river.png",
  "platform.png",
  "fog1.png",
  "sandpatch.png",
  "chalkpatch.png",
  "redfog.png",
  "blackfog.png",
  "grasspatch.png",
  "landscape.png",
  "house1.png",
  "house2.png",
  "electricpylon.png",
  "signalrack.png",
  "deadend.png",
  "concretegrunge.png",
  "forklift.png",
  "forkliftbig.png",
  "excavator.png",
  "fibrecement.png",
  "gantry.png",
  "drums.png",
  "tires.png",
  "steelframes.png",
  "fuelstation.png",
  "lawn.png",
  //containers
  "c11.png",
  "c12.png",
  "c21.png",
  "c22.png",
  "c31.png",
  "c32.png",
  "c41.png",
  "c51.png",
  "c91.png",
  "c92.png",
];

const tilingTextures = [
  "gravel.png",
  "concrete.png",
  "sand.png",
  "sandtile.png",
  "road.png",
  "water.png",
  "bank.png",
  "wire.png",
  "hedge.png",
  "fence.png",
  "dirtroad.png",
  "dirtpath.png",
  "gantryrail.png",
];
const lightTextures = [
  "pointlight.png",
  "pointup.png",
  "pointdown.png",
  "spotlight.png",
];

const objectDefaults: IKeyValue[] = [
  { type: "none" },
  {
    type: "static",
    texture: textures,
    layer: gameLayers,
    alpha: 1,
    blend: ["normal", "add", "multiply", "screen"],
    shadow: false,
    width: 0,
  },
  {
    type: "polygon",
    texture: tilingTextures,
    hasOutline: false,
    outline: tilingTextures,
    layer: gameLayers,
    alpha: 1,
    blend: ["normal", "add", "multiply", "screen"],
    // points: 0
  },
  {
    type: "rope",
    texture: tilingTextures,
    layer: gameLayers,
    alpha: 1,
    blend: ["normal", "add", "multiply", "screen"],
    // points: 0
  },
  {
    type: "light",
    texture: lightTextures,
    layer: gameLayers,
    color: 0,
    width: 50,
  },
  {
    type: "signal",
    layer: gameLayers,
    block: 0,
    width: 16,
  },
];

const objectTypes = objectDefaults.map((v) => v.type);

// prettier-ignore
const objectCommon: IProperty[] = [
  { label: "Object", type: "label" },
  { label: "Type", type: "select", options: objectTypes, id: "type" },
  { label: "Position", type: "label" },
  { label: "X", type: "number", id: "x", value: 0 },
  { label: "Y", type: "number", id: "y", value: 0 },
  { label: "Rotation", type: "number", id: "rotation", value: 0 },
  { label: "Zindex", type: "number", id: "zindex", value: 0 },
  { label: "Properties", type: "label" }
];

// layer display settings defaults
const layers = [
  { id: "textures", label: "Textures", value: true },
  { id: "blocks", label: "Block IDs", value: true },
  { id: "ids", label: "Rail IDs", value: true },
  { id: "thick", label: "Thick lines", value: true },
  { id: "colors", label: "Line colors", value: true },
  { id: "polygons", label: "Polygon fill", value: true },
  { id: "ropes", label: "Ropes", value: true },
  { id: "objects", label: "Objects marks", value: true },
];

export default {
  hints,
  keyMap,
  actions,
  actionGroups,
  objectDefaults,
  objectCommon,
  objectTypes,
  layers,
};
