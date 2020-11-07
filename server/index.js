// echo server to support reloading

const WebSocket = require("ws");
const fs = require("fs");

const wss = new WebSocket.Server({ port: 8082 });
let editor = null;

wss.on("connection", function connection(ws) {
  // that's editor hello
  if (editor) {
    console.log("reconnecting editor");
    editor.close();
  }
  editor = ws;

  ws.on("message", (message) => {
    let data = null;
    let reply = { type: "E_ERROR", payload: null };

    try {
      data = JSON.parse(message);
    } catch (e) {
      console.log("received invalid message: %s", message);
    }
    if (!data) {
      return;
    }
    console.log("received: %s", data.type);
    switch (data.type) {
      case "E_MAPLIST":
        {
          reply.type = "S_MAPLIST";
          reply.payload = fs
            .readdirSync(__dirname + "/maps/")
            .filter((file) => file.match(/^.*\_savedata\.json$/))
            .map((n) => n.replace("_savedata.json", ""));
        }
        break;

      case "E_SELECTMAP":
        {
          const name = data.name || "default";
          const path = __dirname + `/maps/${name}_savedata.json`;
          if (fs.existsSync(path)) {
            reply.type = "S_MAPDATA";
            reply.name = name;
            reply.payload = fs.readFileSync(path, "utf-8");
          }
        }
        break;

      case "E_SAVE":
        {
          const contents = data.payload || "";
          const name = data.name || "default";
          fs.writeFileSync(__dirname + `/maps/${name}_savedata.json`, contents);
          reply.type = "S_MAPSAVERESULT";
          reply.payload = "ok";
        }
        break;
      case "E_EXPORT":
        {
          const contents = data.payload || "";
          const name = data.name || "default";
          fs.writeFileSync(__dirname + `/maps/${name}.txt`, contents);
          // export to game
          fs.writeFileSync(
            __dirname + `/../../rail/assets/default.txt`,
            contents
          );
          reply.type = "S_MAPEXPORTRESULT";
          reply.payload = "ok";
        }
        break;
    }

    ws.send(JSON.stringify(reply));
  });
});
