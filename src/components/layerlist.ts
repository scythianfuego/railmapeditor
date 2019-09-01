import css from "raw-loader!./layerlist.css";
import { IProperty } from "../interfaces/IProperty";
import IKeyValue from "../interfaces/IKeyValue";

export default class LayerList extends HTMLElement {
  // private data:
  public render: () => void;
  private _data: IProperty[];
  private root: ShadowRoot;

  public set data(data: any) {
    if (!Array.isArray(data)) {
      Array.from(this.root.querySelectorAll("input")).forEach(i => {
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
      <div class="layerlist-box"></div>`;

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
    const container: HTMLElement = this.root.querySelector(".layerlist-box");
    container.style.display = val ? "block" : "none";
    val ? this.setAttribute("hidden", "") : this.removeAttribute("hidden");
  }

  populate(data: IProperty[]) {
    const container = this.root.querySelector(".layerlist-box");
    container.innerHTML = "";

    data.forEach(line => {
      const label = document.createElement("label");
      label.classList.add("layerlist-label");
      label.innerText = line.label;

      let value = document.createElement("input");
      value.setAttribute("data-id", line.id);
      value.setAttribute("type", "checkbox");

      line.value ? value.setAttribute("checked", "checked") : null;
      label.prepend(value);
      container.append(label);

      label.addEventListener("change", () => {
        const changeEvent = new Event("change", {
          bubbles: true,
          cancelable: false
        });
        this.dispatchEvent(changeEvent);
      });
    });
  }
}
