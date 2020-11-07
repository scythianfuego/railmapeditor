import MapList from "./components/maplist";
import Model from "./model";

export default class Client {
  private webSocket: WebSocket;
  private model: Model;
  private maplist: MapList;

  constructor(model: Model) {
    this.connect();
    this.model = model;

    this.maplist = <MapList>document.querySelector("maplist-box");
    this.maplist.addEventListener("select", () => this.onMapSelect());
    this.maplist.addEventListener("save", () => this.onMapSave());
  }

  private onMapSelect() {
    const name = this.maplist.selection;
    this.message("E_SELECTMAP", { name });
  }

  private onMapSave() {
    const name = this.maplist.selection;
    this.message("E_SAVE", { name, payload: this.model.serialize() });
    this.message("E_EXPORT", { name, payload: this.model.export() });
    this.message("E_MAPLIST");
  }

  private message(type: string, fields = {}) {
    this.webSocket.send(JSON.stringify({ type, ...fields }));
  }

  private connect = () => {
    this.webSocket && this.webSocket.close(); // cleanup
    const webSocket = new WebSocket("ws://localhost:8082");
    this.webSocket = webSocket;
    webSocket.onopen = () => {
      this.message("E_MAPLIST");
    };
    webSocket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case "S_MAPLIST":
          {
            const maplist = <MapList>document.querySelector("maplist-box");
            maplist.data = msg.payload;
            maplist.hidden = false;
          }
          break;

        case "S_MAPDATA": {
          // alert("loading map" + msg.name);
          this.model.unserialize(msg.payload);
        }
      }
    };
    webSocket.onclose = () => {
      setTimeout(() => this.connect(), 1000);
    };
    webSocket.onerror = () => {};
  };
}
