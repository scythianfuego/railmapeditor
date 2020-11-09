import { IProperty } from "./interfaces/IProperty";
import { Tools, Tool } from "./interfaces/types";
import { action, makeObservable, runInAction } from "mobx";

import { store } from "./store";
import ts from "./transform";
import Objects from "./objects";
import Model from "./model";
import IHints from "./interfaces/IHints";
import config from "./includes/config";
import PropertyEditor from "./components/properties";
import Menu from "./components/menu";

import IGameObject from "./interfaces/IGameObject";
import IKeyValue from "./interfaces/IKeyValue";

const objects = new Objects();

const defaultHints: IHints = config.hints;
const A = config.actions;
const AG = config.actionGroups;

// tools controller.
// type it

const tools: Tools = {
  [A.LINES]: [
    (point) => objects.line(point, 0),
    (point) => objects.line(point, 1),
    (point) => objects.line(point, 2),
    (point) => objects.line(point, 3),
    (point) => objects.line(point, 4),
    (point) => objects.line(point, 5),
  ],
  [A.HLINES]: [
    (point) => objects.line3(point, 0),
    (point) => objects.line3(point, 1),
    (point) => objects.line3(point, 2),
    (point) => objects.line3(point, 3),
    (point) => objects.line3(point, 4),
    (point) => objects.line3(point, 5),
  ],
  [A.DLINES]: [
    (point) => objects.line2(point, 0),
    (point) => objects.line2(point, 1),
    (point) => objects.line2(point, 2),
    (point) => objects.line2(point, 3),
    (point) => objects.line2(point, 4),
    (point) => objects.line2(point, 5),
  ],
  [A.CURVE]: [
    (point) => objects.longArc(point, 0),
    (point) => objects.longArc(point, 1),
    (point) => objects.longArc(point, 2),
    (point) => objects.longArc(point, 3),
    (point) => objects.longArc(point, 4),
    (point) => objects.longArc(point, 5),
  ],
  [A.CURVE1]: [
    (point) => objects.longArc2(point, 0),
    (point) => objects.longArc2(point, 1),
    (point) => objects.longArc2(point, 2),
    (point) => objects.longArc2(point, 3),
    (point) => objects.longArc2(point, 4),
    (point) => objects.longArc2(point, 5),
    (point) => objects.longArc3(point, 0),
    (point) => objects.longArc3(point, 1),
    (point) => objects.longArc3(point, 2),
    (point) => objects.longArc3(point, 3),
    (point) => objects.longArc3(point, 4),
    (point) => objects.longArc3(point, 5),
  ],
  [A.SIDEA]: [
    (point) => objects.shortArc(point, 0),
    (point) => objects.shortArc(point, 1),
    (point) => objects.shortArc(point, 2),
    (point) => objects.shortArc(point, 3),
    (point) => objects.shortArc(point, 4),
    (point) => objects.shortArc(point, 5),
    (point) => objects.shortArc2(point, 0),
    (point) => objects.shortArc2(point, 1),
    (point) => objects.shortArc2(point, 2),
    (point) => objects.shortArc2(point, 3),
    (point) => objects.shortArc2(point, 4),
    (point) => objects.shortArc2(point, 5),
  ],
  [A.ARC2A]: [
    (point) => objects.arc2a(point, 0),
    (point) => objects.arc2a(point, 1),
    (point) => objects.arc2a(point, 2),
    (point) => objects.arc2a(point, 3),
    (point) => objects.arc2a(point, 4),
    (point) => objects.arc2a(point, 5),
    (point) => objects.arc2b(point, 0),
    (point) => objects.arc2b(point, 1),
    (point) => objects.arc2b(point, 2),
    (point) => objects.arc2b(point, 3),
    (point) => objects.arc2b(point, 4),
    (point) => objects.arc2b(point, 5),
  ],
  [A.LONG]: [
    (point) => objects.infiniLine(point, 0),
    (point) => objects.infiniLine(point, 1),
    (point) => objects.infiniLine(point, 2),
    (point) => objects.infiniLine(point, 3),
    (point) => objects.infiniLine(point, 4),
    (point) => objects.infiniLine(point, 5),
  ],
};

export default class Controls {
  private createObjectMode: boolean = false;
  private currentTool = 0;
  private toolset: Tool[] = [];
  private getTool = () =>
    this.toolset.length ? this.toolset[this.currentTool] : null;

  private shift: boolean = false;
  private ctrl: boolean = false;
  private active: string = "";

  private propertyEditor: PropertyEditor = null;
  private menu: Menu = null;
  private editedObject: string = null;

  constructor(private model: Model) {
    makeObservable(this, {
      onMouseMove: action,
      onMouseUp: action,
      onMouseDown: action,
      onWheel: action,
      runAction: action,
    });

    const defaultMode = A.SELECT;
    const hints = this.applyHintsFilter(defaultMode);
    runInAction(() => {
      store.hints = hints;
    });

    const canvas = document.querySelector("canvas");
    const parent = canvas.parentElement; // canvas can't have focus, no keyboard events
    parent.focus();
    parent.addEventListener("keyup", (event) => this.onKeyUp(event.keyCode));
    parent.addEventListener("keydown", (event) =>
      this.onKeyDown(event.keyCode)
    );

    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    canvas.addEventListener("mousemove", (event) => this.onMouseMove(event));
    canvas.addEventListener("mousedown", (event) => this.onMouseDown(event));
    canvas.addEventListener("mouseup", (event) => this.onMouseUp(event));
    canvas.addEventListener("wheel", (event) => this.onWheel(event));

    this.propertyEditor = <PropertyEditor>(
      document.querySelector("property-box")
    );
    this.propertyEditor.addEventListener("change", () =>
      this.onPropertyEditorSave()
    );

    this.runAction(defaultMode);
    this.menu = <Menu>document.querySelector("menu-box");
    this.menu.data = hints;
  }

  applyHintsFilter(mode: number) {
    const result = defaultHints
      .map((a) => ({ ...a })) // copy
      .filter((i) => i.show.includes(mode));

    const selectedItem = result.find((i) => i.on === mode);
    selectedItem && (selectedItem.selected = true);
    const activeItem = result.find((i) => i.tag === this.active);
    activeItem && (activeItem.active = true);
    return result;
  }

  onKeyUp(keyCode: number) {
    keyCode === 16 && (this.shift = false);
    keyCode === 17 && (this.ctrl = false);

    const state = store;
    const { hints } = state;
    hints.forEach((v) => (v.active = false));

    this.menu.data = hints;
  }

  onKeyDown(keyCode: number) {
    keyCode === 16 && (this.shift = true);
    keyCode === 17 && (this.ctrl = true);

    const state = store;
    const { mode, hints } = state;
    const key = Object.entries(config.keyMap).find(([k, v]) => v === keyCode);
    this.active = (key && key[0]) || "";
    const index = hints.findIndex((i) => config.keyMap[i.tag] === keyCode);
    index !== -1 && (hints[index].active = true); // new hints!
    index !== -1 && this.runAction(hints[index].action);

    this.menu.data = hints;
  }

  mouseEventToXY(event: MouseEvent) {
    // todo: check target!
    const bounds = (<HTMLCanvasElement>event.target).getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    return [x, y];
  }

  onMouseDown(event: MouseEvent) {
    const state = store;
    const coords = this.mouseEventToXY(event);
    const [x, y] = coords;
    const { wx, wy } = ts;

    if (AG.SELECTABLE.includes(state.mode)) {
      const hit = this.model.findByXY(wx(x), wy(y));
      // deselect if shift is not pressed
      !this.shift && this.model.deselect();
      this.model.select(hit);
      if (state.mode === A.BLOCK) {
        this.model.selectGroup(hit);
      }
    }

    if (AG.SELECT_CONNECTIONS.includes(state.mode)) {
      const hit = this.model.findConnection(wx(x), wy(y));
      this.model.selectedConnection = hit;
    }

    if (AG.SELECT_OBJECTS.includes(state.mode)) {
      const hit = this.model.findGameObjectByXY(wx(x), wy(y));
      this.model.selectedGameObject = hit;
    }

    if (AG.POINTTOOLS.includes(state.mode)) {
      const point = this.model.findPointByXY(wx(x), wy(y));
      this.model.selectedPointIndex = point;
    }

    if (this.createObjectMode) {
      this.createObjectMode = false;
      this.editedObject = null;
      store.cursorType = 0;
    }

    const down = event.button === 0;
    const pan = event.button === 1;
    const mouse = { coords, down, pan, selection: coords };
    store.mouse = mouse;
  }

  onMouseUp(event: MouseEvent) {
    const state = store;
    const { pan } = state.mouse;
    const coords = this.mouseEventToXY(event);

    if (this.toolset.length && !pan) {
      const tool = this.getTool();
      this.model.add(state.snapPoint, tool(state.snapPoint));
    }

    if (AG.POINTTOOLS.includes(state.mode)) {
      if (state.mode === A.POINTADD) {
        const [x, y] = coords;
        const { wx, wy } = ts;
        this.model.addPoint(wx(x), wy(y));
      }
      state.mode === A.POINTSPLIT && this.model.splitPoint();
      state.mode === A.POINTINTERPOLATE && this.model.splitInterpolate();
      state.mode === A.POINTDELETE && this.model.deletePoint();
    }
    this.model.selectedPointIndex = -1;

    const selection: number[] = null;
    const mouse = { coords, down: false, pan: false, selection };
    store.mouse = mouse;
  }

  onMouseMove(event: MouseEvent) {
    const state = store;
    const mouse = state.mouse;
    const coords = this.mouseEventToXY(event);

    const snapPoint = ts.snap(coords);

    mouse.coords = coords;
    const panX = mouse.pan ? state.panX + event.movementX : state.panX;
    const panY = mouse.pan ? state.panY + event.movementY : state.panY;

    store.mouse = mouse;
    store.panX = panX;
    store.panY = panY;
    store.snapPoint = snapPoint;

    if (this.createObjectMode && this.editedObject) {
      const [x, y] = coords;
      const { wx, wy } = ts;
      this.model.moveGameObject(this.editedObject, wx(x), wy(y));
    }

    if (AG.POINTTOOLS.includes(state.mode)) {
      if (state.mode === A.POINTMOVE) {
        const [x, y] = coords;
        const { wx, wy } = ts;
        this.model.movePoint(wx(x), wy(y));
      }
    }

    AG.SELECTABLE.includes(state.mode) &&
      state.mouse.down &&
      state.mouse.selection &&
      this.alterSelection(coords, state.mouse.selection);
  }

  onWheel(event: WheelEvent) {
    event.preventDefault(); // disable page zoom using Ctrl key
    const { gridWidth, gridHeight, clamp, rotate, ratioX, ratioY } = ts;
    const state = store;
    const direction = Math.sign(event.deltaY);

    if (event.ctrlKey || AG.SELECTABLE.includes(state.mode)) {
      const [mouseX, mouseY] = state.mouse.coords;
      const zoomOld = state.zoom;
      const zoom = clamp(zoomOld * (1 + 0.2 * direction), 5, 500);
      const zoomDelta = zoomOld - zoom;

      const panX = state.panX + gridWidth * zoomDelta * ratioX(mouseX);
      const panY = state.panY + gridHeight * zoomDelta * ratioY(mouseY);
      store.zoom = zoom;
      store.panX = panX;
      store.panY = panY;
    } else {
      this.nextTool(direction);
      store.tool = this.getTool();
    }
  }

  nextTool(direction: number) {
    const { rotate } = ts;
    this.currentTool += direction;
    this.currentTool = rotate(this.currentTool, 0, this.toolset.length - 1);
  }

  alterSelection(startPoint: number[], endPoint: number[]) {
    const state = store;
    // rectangular selection, todo: move to model
    const { wx, wy } = ts;
    const sx = wx(startPoint[0]);
    const sy = wy(startPoint[1]);
    const ex = wx(endPoint[0]);
    const ey = wy(endPoint[1]);
    const threshold = 0.1; // model MIN_DISTANCE
    if (this.model.distance(sx, sy, ex, ey) > threshold) {
      const hit = this.model.findByRect(sx, sy, ex, ey);
      !this.shift && this.model.deselect(); // deselect if shift is not pressed
      this.model.select(hit);

      if (state.mode === A.BLOCK) {
        this.model.selectGroup(hit);
      }
    }
  }

  runAction(action: number): void {
    const state = store;
    const { wx, wy } = ts;
    const [x, y] = state.mouse.coords;
    let { selectionMode, layers } = state; //
    // set new mode if action is in modes list
    let mode = AG.MODES.includes(action) ? action : state.mode;

    // modes
    if (AG.MODES.includes(action)) {
      // layers.blocks = false;
      // layers.ids = false;
      // layers.thick = false;
      this.toolset = [];
    }

    if (AG.TOOLS.includes(action)) {
      this.currentTool = 0;
      this.toolset = tools[action];
      selectionMode = false;
    }

    AG.SELECTABLE.includes(action) && (selectionMode = true);
    // action === A.OBJECT && (layers.thick = true);
    // action === A.BLOCK && (layers.blocks = true);
    // action === A.LINES && (layers.ids = true);

    // actions to run
    action === A.GROUP && this.model.group();
    action === A.UNGROUP && this.model.ungroup();
    action === A.REINDEXBLOCKS && this.model.reindexBlocks();
    action === A.REINDEXRAILS && this.model.reindexRails();
    action === A.DELETE && this.model.deleteSelected();
    action === A.NEXT && this.nextTool(1);
    action === A.PREV && this.nextTool(-1);

    action === A.JOIN && this.model.createJoinFromSelection();
    action === A.SWITCH && this.model.createSwitchFromSelection();

    // define const
    action === A.SWITCH_AP && this.model.setSwitchSegmentType(0);
    action === A.SWITCH_AS && this.model.setSwitchSegmentType(1);
    action === A.SWITCH_BP && this.model.setSwitchSegmentType(2);
    action === A.SWITCH_BS && this.model.setSwitchSegmentType(3);

    if (action === A.OBJECTNEW) {
      this.createObjectMode = true;
      this.editedObject = this.model.addGameObject(wx(x), wy(y));
    }
    if (action === A.OBJECTMOVE) {
      this.createObjectMode = true;
      this.editedObject = this.model.selectedGameObject;
    }
    action === A.OBJECTDELETE && this.model.deleteSelectedGameObject();
    action === A.OBJECTEDIT &&
      this.showPropertyBox(this.model.selectedGameObject);

    if (action === A.OBJECTCLONE) {
      this.createObjectMode = true;
      this.editedObject = this.model.cloneGameObject();
    }

    action === A.OBJECTFWD && this.model.bringForward();
    action === A.OBJECTBACK && this.model.bringBack();

    if (action === A.SELECT) {
      this.editedObject = null;
      this.propertyEditor.hidden = true;
    }

    if (action === A.POINTS) {
      if (this.model.selectedGameObject) {
        mode = A.POINTMOVE;
      } else {
        console.log("Point editor bad object", this.model.selectedGameObject);
        return this.runAction(A.OBJECT);
      }
    }

    // actions are not run on mouse!!
    // action && A.POINTMOVE && this.modelMovePoints();
    // action && A.POINTDELETE && this.model.deletePoints();
    // action && A.POINTSPLIT && this.model.splitPoints();

    const cursorType = this.createObjectMode ? 1 : 0;
    const hints = this.applyHintsFilter(mode);

    store.tool = this.getTool();
    store.selectionMode = selectionMode;
    store.cursorType = cursorType;
    store.hints = hints;
    store.mode = mode;
  }

  objectToPropertyList(obj: IGameObject) {
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const values = Object.entries(obj).filter((v) => v[0] !== "type");

    return values.map(([key, value]) => {
      // const type = getType(value);
      const options = Array.isArray(value) ? value : null;
      value = Array.isArray(value) ? value[0] : value;
      const result: IProperty = {
        label: key,
        id: key,
        type: "text",
        options,
        value,
      };
      return result;
    });
  }

  makeObjectProperties(obj: IGameObject): IProperty[] {
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const getType = (value: any) => {
      if (Array.isArray(value)) {
        return "select";
      }
      if (typeof value === "boolean") {
        return "boolean";
      }
      if (typeof value === "number") {
        return "number";
      }
      return "text";
    };

    const found = config.objectDefaults.find((v) => v.type === obj.type);
    const valueArr = Object.entries(found).filter((v) => v[0] !== "type");
    let properties: IProperty[] = valueArr.map(([key, value]) => {
      const type = getType(value);
      const options = Array.isArray(value) ? value : null;
      value = Array.isArray(value) ? value[0] : value;
      const result: IProperty = {
        label: capitalize(key),
        id: key,
        type,
        options,
        value,
      };
      return result;
    });
    properties = config.objectCommon.concat(properties);

    // set values in properties with corresponding from object
    Object.entries(obj).forEach(([key, value]) => {
      const item = properties.find((v) => v.id === key);
      if (item) {
        item.value = value;
      }
    });

    return properties;
  }

  // if data -> show data
  // if no data create defaults
  // if type is selected?

  // if type changes -> reset defauts
  // common stays

  onPropertyEditorSave() {
    // TODO: remove points here if type has changed
    console.log("Save A -> B");
    console.log(this.editedObject);
    console.log(this.propertyEditor.userInput);

    this.model.updateGameObjectProperties(
      this.editedObject,
      <IGameObject>this.propertyEditor.userInput
    );
    this.editedObject = null;
    this.propertyEditor.hidden = true;
  }

  showPropertyBox(objuuid: string, fakeobj: IGameObject = null) {
    if (!objuuid) {
      return;
    }

    if (!this.editedObject) {
      this.editedObject = objuuid;
      this.propertyEditor.hidden = false;
    }

    // const data = config.objectCommon;
    const obj = fakeobj || this.model.gameobjects.get(objuuid);
    const data = this.makeObjectProperties(obj);

    // recreate type selector dropdown
    const selector = data.find((v) => v.id === "type");
    selector.options = config.objectTypes;
    selector.value = obj.type;
    selector.type = "select";
    selector.onChange = () => {
      const input: IKeyValue = this.propertyEditor.userInput;
      if (input.type === obj.type) {
        setTimeout(() => this.showPropertyBox(this.editedObject), 0);
      } else {
        const { type, x, y, zindex } = input;
        const emptyObject: IGameObject = { type, x, y, zindex };
        this.showPropertyBox(objuuid, emptyObject);
      }
      console.log("changed");
    };
    this.propertyEditor.data = data;
  }
}
