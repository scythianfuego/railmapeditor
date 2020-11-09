import css from "raw-loader!./menu.css";
import { IProperty } from "../interfaces/IProperty";
import IHintLine from "../interfaces/IHintLine";

export default class Menu extends HTMLElement {
  // private data:
  public render: () => void;
  private _data: IProperty[];
  private root: ShadowRoot;

  public set data(data: any) {
    this._data = data;
    this.populate(data);
  }

  public get data() {
    return this._data;
  }

  constructor() {
    super();

    this.root = this.attachShadow({ mode: "closed" });
    this.root.innerHTML = `<style>${css}</style>
      <div class="menu-box"></div>`;

    this.render = () => {};
  }

  get hidden() {
    return this.hasAttribute("hidden");
  }

  set hidden(val) {
    const container: HTMLElement = this.root.querySelector(".menu-box");
    container.style.display = val ? "block" : "none";
    val ? this.setAttribute("hidden", "") : this.removeAttribute("hidden");
  }

  populate(data: IHintLine[]) {
    const container = this.root.querySelector(".menu-box");
    container.innerHTML = "";

    //  tag: string;
    // text: string;
    // action: number;
    // show: number[];
    // on?: number;

    // active?: boolean;
    // selected?: boolean;

    data.forEach((line: IHintLine) => {
      const label = document.createElement("span");
      label.classList.add("label");
      label.innerText = line.text;

      const hotkey = document.createElement("span");
      hotkey.classList.add("hotkey");
      hotkey.innerText = line.tag;

      const item = document.createElement("div");
      line.selected && item.classList.add("selected");
      line.active && item.classList.add("active");

      item.append(hotkey);
      item.append(label);
      container.append(item);
    });
  }
}
