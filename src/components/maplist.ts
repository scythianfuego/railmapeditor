import css from "raw-loader!./maplist.css";
import { IProperty } from "../interfaces/IProperty";
import IKeyValue from "../interfaces/IKeyValue";

export default class MapList extends HTMLElement {
  // private data:
  public render: () => void;
  private _data: string[];
  private _selection: string = "default";
  private root: ShadowRoot;

  public set data(data: any) {
    if (!Array.isArray(data)) {
      Array.from(this.root.querySelectorAll("input")).forEach((i) => {
        const id = i.getAttribute("data-id");
        i.checked = !!data[id];
      });
    } else {
      this._data = data;
      this.populate(data);
    }
  }

  public get data() {
    return this._data;
  }

  constructor() {
    super();

    this.root = this.attachShadow({ mode: "closed" });
    this.root.innerHTML = `<style>${css}</style>
      <div class="maplist-box">
        <div>
          <input type="text" class="name" value="default">
          <button>Save</button>
        </div>
        <div class="list"></div>
      </div>`;

    const saveButton: HTMLButtonElement = this.root.querySelector(
      ".maplist-box button"
    );
    saveButton.addEventListener("click", () => {
      const input: HTMLInputElement = this.root.querySelector(
        ".maplist-box .name"
      );

      this._selection = input.value;
      const changeEvent = new Event("save", {
        bubbles: true,
        cancelable: false,
      });
      this.dispatchEvent(changeEvent);
    });
    this.render = () => {};
  }

  public get userInput() {
    type KV = { id: string; value: boolean };
    return Array.from(this.root.querySelectorAll("input")).reduce(
      (acc: IKeyValue, curr: HTMLInputElement) => {
        acc[curr.getAttribute("data-id")] = curr.checked;
        return acc;
      },
      {}
    );
  }

  get hidden() {
    return this.hasAttribute("hidden");
  }

  set hidden(val) {
    const container: HTMLElement = this.root.querySelector(".maplist-box");
    container.style.display = val ? "none" : "block";
    val ? this.setAttribute("hidden", "") : this.removeAttribute("hidden");
  }

  get selection() {
    return this._selection;
  }

  set selection(val) {
    this._selection = val;
    const input: HTMLInputElement = this.root.querySelector(
      ".maplist-box .name"
    );
    input.value = val;
  }

  populate(data: string[]) {
    const container = this.root.querySelector(".maplist-box .list");
    container.innerHTML = "";

    data.forEach((line) => {
      const link = document.createElement("div");
      link.classList.add("maplist-label");
      link.innerText = line;
      container.append(link);

      link.addEventListener("click", () => {
        this.selection = line;
        const changeEvent = new Event("select", {
          bubbles: true,
          cancelable: false,
        });
        this.dispatchEvent(changeEvent);
      });
    });
  }
}
