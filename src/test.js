import WebSocket from "ws";

const host = "wss://api.render.com/graphql";

const ws = new WebSocket(host, {
  origin: "https://dashboard.render.com",
  headers: {
    Authorization: "Bearer rnd_FvnA9Eud9tjdlsl61sLpUZLN9A64",
  },
});

ws.on("error", console.error);

ws.on("open", function open() {
  ws.send(
    JSON.stringify({
      type: "connection_init",
      payload: { Authorization: "Bearer rnd_FvnA9Eud9tjdlsl61sLpUZLN9A64" },
    })
  );
});

ws.on("close", function close() {
  console.log("disconnected");
});

let notListening = true;

ws.on("message", function message(data) {
  console.log("received: %s", data);
  if (JSON.parse(data)["type"] == "ka" && notListening) {
    console.log("sending");
    ws.send(
      JSON.stringify({
        id: "1",
        type: "start",
        payload: {
          variables: {
            query: {
              filters: [
                {
                  field: "SERVICE",
                  values: ["srv-cj615aqvvtos73fc62hg"],
                  operator: "INCLUDES",
                },
              ],
              ownerId: "tea-chn5hr1mbg5577jbgb8g",
              region: "oregon",
              start: "2024-01-27T02:00:20.496Z",
            },
          },
          extensions: {},
          operationName: "logAdded",
          query:
            "subscription logAdded($query: LogSubscriptionInput!) {\n  logAdded(query: $query) {\n    ...logWithLabelsFields\n    __typename\n  }\n}\n\nfragment logWithLabelsFields on LogWithLabels {\n  id\n  labels {\n    label\n    value\n    __typename\n  }\n  timestamp\n  text\n  __typename\n}\n",
        },
      })
    );
    notListening = false;
  }
});
