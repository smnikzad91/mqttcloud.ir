import { MQTT_HOST, MQTT_PORT_TLS } from "./mqttEndpoints";

// Connection snippets for the dashboard, filled in with the user's own
// credential username and a client id registered under it. Mirrors the
// landing page's examples (components/public/home/signal.ts): the broker only
// accepts registered client ids and topics prefixed with "<username>/".

export type SnippetId = "esp32" | "python" | "nodejs" | "mosquitto";

export const SNIPPET_TABS: { id: SnippetId; label: string }[] = [
  { id: "esp32", label: "ESP32 / C++" },
  { id: "python", label: "Python (Paho)" },
  { id: "nodejs", label: "Node.js (mqtt.js)" },
  { id: "mosquitto", label: "mosquitto_pub" },
];

export function buildSnippet(id: SnippetId, user: string, client: string): string {
  switch (id) {
    case "esp32":
      return `#include <WiFiClientSecure.h>
#include <PubSubClient.h>

WiFiClientSecure net;
PubSubClient client(net);

void setup() {
  // ...connect to Wi-Fi first
  net.setCACert(ROOT_CA);  // root CA of the broker's certificate (PEM)
  client.setServer("${MQTT_HOST}", ${MQTT_PORT_TLS});
  if (client.connect("${client}", "${user}", "YOUR_PASSWORD")) {
    client.publish("${user}/esp32/temp", "24.8");
  }
}

void loop() { client.loop(); }`;
    case "python":
      return `import paho.mqtt.client as mqtt

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="${client}")
client.username_pw_set("${user}", "YOUR_PASSWORD")
client.tls_set()  # system CA bundle

client.connect("${MQTT_HOST}", ${MQTT_PORT_TLS}, 60)
client.loop_start()
client.publish("${user}/telemetry", '{"status": "online"}', qos=1)`;
    case "nodejs":
      return `import mqtt from "mqtt";

const client = mqtt.connect("mqtts://${MQTT_HOST}:${MQTT_PORT_TLS}", {
  clientId: "${client}",
  username: "${user}",
  password: process.env.MQTT_PASSWORD,
});

client.on("connect", () => {
  client.subscribe("${user}/sensors/#");
  client.publish("${user}/sensors/temp", JSON.stringify({ c: 24.8 }));
});`;
    case "mosquitto":
      return `mosquitto_pub -h ${MQTT_HOST} -p ${MQTT_PORT_TLS} --capath /etc/ssl/certs \\
  -i ${client} -u ${user} -P 'YOUR_PASSWORD' \\
  -t "${user}/test" -m '{"hello":"world"}'`;
  }
}
