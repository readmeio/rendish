import WebSocket from "ws";

const host = "wss://api.render.com/graphql";

// XXX: do I want to allow multiple services? different region? different
// starting time? All are supported within the graphql request
/**
 * Connect to a given service and start dumping its messages
 *
 * @param {string} token
 * @param {string} serviceId
 * @param {string} ownerId
 */
export function tailLogs(token, serviceId, ownerId) {
  const ws = new WebSocket(host, {
    origin: "https://dashboard.render.com",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  ws.on("open", function open() {
    ws.send(
      JSON.stringify({
        type: "connection_init",
        payload: { Authorization: `Bearer ${token}` },
      }),
    );
  });

  let connected = false;

  ws.on("message", function message(data) {
    if (connected) {
      let msg = JSON.parse(data.toString());
      // verify that the message is a logAdded message
      if (!msg?.payload?.data?.logAdded) return;

      let log = msg.payload.data.logAdded;
      //convert the labels array into a map
      // let labels = log.labels.reduce((o, v) => {
      //   o[v["label"]] = v["value"];
      //   return o;
      // }, {});

      //output the log message
      console.log(`${log.timestamp} ${log.text}`);
      return;
    }

    // if we haven't yet connected, send a message that starts us listening to
    // the log socket, and get the last 4 minutes' worth of logs
    if (JSON.parse(data.toString())["type"] == "ka" && !connected) {
      const now = new Date();
      const fourMinutesAgo = new Date(now.getTime() - 4 * 60 * 1000);
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
                    values: [serviceId],
                    operator: "INCLUDES",
                  },
                ],
                ownerId: ownerId,
                region: "oregon",
                start: fourMinutesAgo.toISOString(),
              },
            },
            extensions: {},
            operationName: "logAdded",
            query:
              "subscription logAdded($query: LogSubscriptionInput!) {\n  logAdded(query: $query) {\n    ...logWithLabelsFields\n    __typename\n  }\n}\n\nfragment logWithLabelsFields on LogWithLabels {\n  id\n  labels {\n    label\n    value\n    __typename\n  }\n  timestamp\n  text\n  __typename\n}\n",
          },
        }),
      );
      connected = true;
    }
  });
}
