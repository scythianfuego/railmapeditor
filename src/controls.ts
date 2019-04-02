import { IProperty } from "./interfaces/IProperty";
import { Hex } from "./transform";

import store from "./store";
import ts from "./transform";
import Objects from "./objects";
import Model from "./model";
import IHints from "./interfaces/IHints";
import IRailObject from "./interfaces/IRailObject";
import config from "./includes/config";
import PropertyEditor from "./components/properties";
import IGameObject from "./interfaces/IGameObject";
import IKeyValue from "./interfaces/IKeyValue";

const objects = new Objects();

// modes

const defaultHints: IHints = config.hints;
const A = config.actions;

// tools controller.
// type it
type Tool = (hex: Hex) => IRailObject;
type Tools = { [index: number]: Tool[] };

const tools: Tools = {
  [A.LINES]: [
    hex => objects.line(hex, 0),
    hex => objects.line(hex, 1),
    hex => objects.line(hex, 2)
  ],
  [A.CURVE]: [
    hex => objects.longArc(hex, 0),
    hex => objects.longArc(hex, 1),
    hex => objects.longArc(hex, 2),
    hex => objects.longArc(hex, 3),
    hex => objects.longArc(hex, 4),
    hex => objects.longArc(hex, 5)
  ],
  [A.SIDEA]: [
    hex => objects.shortArc(hex, 0),
    hex => objects.shortArc(hex, 1),
    hex => objects.shortArc(hex, 2),
    hex => objects.shortArc(hex, 3),
    hex => objects.shortArc(hex, 4),
    hex => objects.shortArc(hex, 5)
  ],
  [A.SIDEB]: [
    hex => objects.shortArc2(hex, 0),
    hex => objects.shortArc2(hex, 1),
    hex => objects.shortArc2(hex, 2),
    hex => objects.shortArc2(hex, 3),
    hex => objects.shortArc2(hex, 4),
    hex => objects.shortArc2(hex, 5)
  ],
  [A.LONG]: [
    hex => objects.infiniLine(hex, 0),
    hex => objects.infiniLine(hex, 1),
    hex => objects.infiniLine(hex, 2),
    hex => objects.infiniLine(hex, 3),
    hex => objects.infiniLine(hex, 4),
    hex => objects.infiniLine(hex, 5)
  ]
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
  private editedObject: IGameObject = null;

  constructor(private model: Model) {
    // const mode = A.LINES;
    const mode = A.OBJECT; //debug
    const hints = this.applyHintsFilter(mode);
    store.setState({ hints });

    const canvas = document.querySelector("canvas");
    window.addEventListener("keyup", event => this.onKeyUp(event.keyCode));
    window.addEventListener("keydown", event => this.onKeyDown(event.keyCode));
    canvas.addEventListener("contextmenu", event => event.preventDefault());
    canvas.addEventListener("mousemove", event => this.onMouseMove(event));
    canvas.addEventListener("mousedown", event => this.onMouseDown(event));
    canvas.addEventListener("mouseup", event => this.onMouseUp(event));
    canvas.addEventListener("wheel", event => this.onWheel(event));

    this.propertyEditor = <PropertyEditor>(
      document.querySelector("property-box")
    );
    this.propertyEditor.addEventListener("change", () =>
      this.onPropertyEditorSave()
    );

    this.runAction(mode);
  }

  applyHintsFilter(mode: number) {
    const result = defaultHints
      .map(a => ({ ...a })) // copy
      .filter(i => (i.show & mode) !== 0);

    const selectedItem = result.find(i => (i.on & mode) !== 0);
    selectedItem && (selectedItem.selected = true);
    const activeItem = result.find(i => i.tag === this.active);
    activeItem && (activeItem.active = true);
    return result;
  }

  onKeyUp(keyCode: number) {
    keyCode === 16 && (this.shift = false);
    keyCode === 17 && (this.ctrl = false);

    const state = store.getState();
    const { hints } = state;
    hints.forEach(v => (v.active = false));
  }

  onKeyDown(keyCode: number) {
    keyCode === 16 && (this.shift = true);
    keyCode === 17 && (this.ctrl = true);

    const state = store.getState();
    const { mode, hints } = state;
    const key = Object.entries(config.keyMap).find(([k, v]) => v === keyCode);
    this.active = (key && key[0]) || "";
    const index = hints.findIndex(i => config.keyMap[i.tag] === keyCode);
    index !== -1 && (hints[index].active = true); // new hints!
    index !== -1 && this.runAction(hints[index].action, index);
  }

  mouseEventToXY(event: MouseEvent) {
    // todo: check target!
    const bounds = (<HTMLCanvasElement>event.target).getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    return [x, y];
  }

  mouseToHex(event: MouseEvent): Hex {
    const bounds = (<HTMLCanvasElement>event.target).getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    return ts.pointToHex(x, y);
  }

  onMouseDown(event: MouseEvent) {
    const state = store.getState();
    const coords = this.mouseEventToXY(event);
    const [x, y] = coords;
    const { wx, wy } = ts;

    if (state.mode & A.SELECTABLE) {
      const hit = this.model.findByXY(wx(x), wy(y));
      // deselect if shift is not pressed
      !this.shift && this.model.deselect();
      this.model.select(hit);
      if (state.mode & A.BLOCK) {
        this.model.selectGroup(hit);
      }
    }

    if (state.mode & A.SELECT_CONNECTIONS) {
      const hit = this.model.findConnection(wx(x), wy(y));
      this.model.selectedConnection = hit;
    }

    if (state.mode & A.SELECT_OBJECTS) {
      const hit = this.model.findGameObjectByXY(wx(x), wy(y));
      this.model.selectedGameObject = hit;
    }

    if (this.createObjectMode) {
      this.createObjectMode = false;
      this.editedObject = null;
      store.setState({ cursorType: 0 });
    }

    const down = event.button === 0;
    const pan = event.button === 1;
    const mouse = { coords, down, pan, selection: coords };
    store.setState({ mouse });
  }

  onMouseUp(event: MouseEvent) {
    const { pan } = store.getState().mouse;
    if (this.toolset.length && !pan) {
      const selectedCell = this.mouseToHex(event);
      const tool = this.getTool();
      selectedCell && this.model.add(selectedCell, tool(selectedCell));
    }

    const coords = this.mouseEventToXY(event);
    const selection: number[] = null;
    const mouse = { coords, down: false, pan: false, selection };
    store.setState({ mouse });
  }

  onMouseMove(event: MouseEvent) {
    const state = store.getState();
    const mouse = state.mouse;
    const coords = this.mouseEventToXY(event);
    const cursorCell = this.mouseToHex(event);

    mouse.coords = coords;
    const panX = mouse.pan ? state.panX + event.movementX : state.panX;
    const panY = mouse.pan ? state.panY + event.movementY : state.panY;

    store.setState({ mouse, cursorCell, panX, panY });

    if (this.createObjectMode && this.editedObject) {
      const [x, y] = coords;
      const { wx, wy } = ts;
      this.editedObject.x = wx(x);
      this.editedObject.y = wy(y);
    }

    state.mode & A.SELECTABLE &&
      state.mouse.selection &&
      this.alterSelection(coords, state.mouse.selection);
  }

  onWheel(event: WheelEvent) {
    event.preventDefault(); // disable page zoom using Ctrl key
    const { gridWidth, gridHeight, clamp, rotate, ratioX, ratioY } = ts;
    const state = store.getState();
    const direction = Math.sign(event.deltaY);

    if (event.ctrlKey || state.mode & A.SELECTABLE) {
      const [mouseX, mouseY] = state.mouse.coords;
      const zoomOld = state.zoom;
      const zoom = clamp(zoomOld * (1 + 0.2 * direction), 5, 500);
      const zoomDelta = zoomOld - zoom;

      const panX = state.panX + gridWidth * zoomDelta * ratioX(mouseX);
      const panY = state.panY + gridHeight * zoomDelta * ratioY(mouseY);
      store.setState({ zoom, panX, panY });
    } else {
      this.nextTool(direction);
      store.setState({ tool: this.getTool() });
    }
  }

  nextTool(direction: number) {
    const { rotate } = ts;
    this.currentTool += direction;
    this.currentTool = rotate(this.currentTool, 0, this.toolset.length - 1);
  }

  alterSelection(startPoint: number[], endPoint: number[]) {
    const state = store.getState();
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

      if (state.mode & A.BLOCK) {
        this.model.selectGroup(hit);
      }
    }
  }

  runAction(action: number, index?: number) {
    const state = store.getState();
    let { selectionMode, blocks, thickLines } = state;
    const { wx, wy } = ts;
    // set new mode if action is in modes list
    const mode = action & A.MODES ? action : state.mode;

    // modes
    if (action & A.MODES) {
      blocks = false;
      thickLines = false;
      this.toolset = [];
    }

    if (action & A.TOOLS) {
      this.currentTool = 0;
      this.toolset = tools[action];
      selectionMode = false;
    }

    action & A.SELECTABLE && (selectionMode = true);
    action & A.OBJECT && (thickLines = true);
    action & A.BLOCK && (blocks = true);

    // actions to run
    action & A.GROUP && this.model.group();
    action & A.UNGROUP && this.model.ungroup();
    action & A.DELETE && this.model.deleteSelected();
    action & A.NEXT && this.nextTool(1);
    action & A.PREV && this.nextTool(-1);

    action & A.JOIN && this.model.createJoinFromSelection();
    action & A.SWITCH && this.model.createSwitchFromSelection();

    // define const
    action & A.SWITCH_AP && this.model.setSwitchSegmentType(0);
    action & A.SWITCH_AS && this.model.setSwitchSegmentType(1);
    action & A.SWITCH_BP && this.model.setSwitchSegmentType(2);
    action & A.SWITCH_BS && this.model.setSwitchSegmentType(3);

    action & A.EXPORT && this.model.export();
    action & A.SAVE &&
      window.localStorage.setItem("savedata0", this.model.serialize());

    action & A.LOAD &&
      this.model.unserialize(localStorage.getItem("savedata0"));

    if (action & A.OBJECTNEW) {
      this.createObjectMode = true;
      const [x, y] = state.mouse.coords;
      this.editedObject = this.model.addGameObject(wx(x), wy(y));
    }
    if (action & A.OBJECTMOVE) {
      this.createObjectMode = true;
      this.editedObject = this.model.selectedGameObject;
    }
    action & A.OBJECTDELETE && this.model.deleteSelectedGameObject();
    action & A.OBJECTEDIT &&
      this.showPropertyBox(this.model.selectedGameObject);

    if (action & A.OBJECTCLONE) {
      this.createObjectMode = true;
      this.editedObject = this.model.cloneGameObject();
    }

    action & A.OBJECTFWD && this.model.bringForward();
    action & A.OBJECTBACK && this.model.bringBack();

    if (action & A.SELECT) {
      this.editedObject = null;
      this.propertyEditor.hidden = true;
    }

    const cursorType = this.createObjectMode ? 1 : 0;
    const hints = this.applyHintsFilter(mode);
    store.setState({
      tool: this.getTool(),
      selectionMode,
      cursorType,
      thickLines,
      blocks,
      hints,
      mode
    });
  }

  objectToPropertyList(obj: IGameObject) {
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const values = Object.entries(obj).filter(v => v[0] !== "type");

    return values.map(([key, value]) => {
      // const type = getType(value);
      const options = Array.isArray(value) ? value : null;
      value = Array.isArray(value) ? value[0] : value;
      const result: IProperty = {
        label: key,
        id: key,
        type: "text",
        options,
        value
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

    const found = config.objectDefaults.find(v => v.type === obj.type);
    const valueArr = Object.entries(found).filter(v => v[0] !== "type");
    let properties: IProperty[] = valueArr.map(([key, value]) => {
      const type = getType(value);
      const options = Array.isArray(value) ? value : null;
      value = Array.isArray(value) ? value[0] : value;
      const result: IProperty = {
        label: capitalize(key),
        id: key,
        type,
        options,
        value
      };
      return result;
    });

    // add common header
    properties = config.objectCommon.concat(properties);

    // set values in properties with corresponding from object
    Object.entries(obj).forEach(([key, value]) => {
      const item = properties.find(v => v.id === key);
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
    console.log("Save A -> B");
    console.log(this.editedObject);
    console.log(this.propertyEditor.userInput);
    const index = this.model.gameobjects.indexOf(this.editedObject);
    this.model.gameobjects[index] = <IGameObject>this.propertyEditor.userInput;
    this.editedObject = null;
    this.propertyEditor.hidden = true;
  }

  showPropertyBox(obj: IGameObject) {
    if (!obj) {
      return;
    }

    if (!this.editedObject) {
      this.editedObject = obj;
      this.propertyEditor.hidden = false;
    }

    // const data = config.objectCommon;
    const data = this.makeObjectProperties(obj);

    // recreate type selector dropdown
    const selector = data.find(v => v.id === "type");
    selector.options = config.objectTypes;
    selector.value = obj.type;
    selector.type = "select";
    selector.onChange = () => {
      const input: IKeyValue = this.propertyEditor.userInput;
      if (input.type === this.editedObject.type) {
        // reset values
        setTimeout(() => this.showPropertyBox(this.editedObject), 0);
      } else {
        const { type, x, y, zindex } = input;
        const emptyObject: IGameObject = { type, x, y, zindex };
        this.showPropertyBox(emptyObject);
      }
      console.log("changed");
    };
    this.propertyEditor.data = data;
  }
}
