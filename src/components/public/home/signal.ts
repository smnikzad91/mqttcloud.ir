/**
 * Shared constants for the landing page's simulator graphics.
 *
 * SVG presentation attributes can't read Tailwind tokens, so the raw values
 * live here — each mirrors a token in globals.css.
 */
export const SIG = {
  cyan: "#00f0ff",     // theme-cyan-500
  brand: "#465fff",    // brand-500
  brandDeep: "#3641f5",// brand-600
  ink: "#161950",      // brand-950
  purple: "#7a5af8",   // theme-purple-500
  violet: "#a78bfa",
  success: "#12b76a",  // success-500
  error: "#f04438",    // error-500
  warning: "#f79009",  // warning-500
  panel: "#0c111d",    // gray-950
  raised: "#101828",   // gray-900
  muted: "#98a2b3",    // gray-400
  dim: "#475467",      // gray-600
} as const;

/** Same env vars (and fallbacks) the dashboard's /dashboard/mqtt page uses, so the landing page never advertises a different host. */
export const MQTT_HOST = process.env.NEXT_PUBLIC_MQTT_HOST ?? "mqtt.mqttcloud.ir";
export const MQTT_PORT_TLS = process.env.NEXT_PUBLIC_MQTT_PORT_TLS ?? "8883";

/**
 * Example identity used across every snippet. The broker only accepts a
 * client id that was registered in the dashboard, and only topics that start
 * with the credential's username + "/" — so every example below follows both
 * rules and would actually work once the reader swaps in their own values.
 */
export const DEMO_USER = "acme_factory";
export const DEMO_CLIENT = "device-01";

export const CLI_COMMAND = `mosquitto_pub -h ${MQTT_HOST} -p ${MQTT_PORT_TLS} --capath /etc/ssl/certs -i ${DEMO_CLIENT} -u ${DEMO_USER} -P '<password>' -t "${DEMO_USER}/warehouse/temp" -m '{"temp":24.8}'`;

export type SnippetLang = "nodejs" | "python" | "esp32";

export const SNIPPET_TABS: { id: SnippetLang; label: string; file: string }[] = [
  { id: "nodejs", label: "Node.js (mqtt.js)", file: "client.js" },
  { id: "python", label: "Python (Paho)", file: "client.py" },
  { id: "esp32", label: "ESP32 / C++", file: "client.ino" },
];

export const CODE_SNIPPETS: Record<SnippetLang, string> = {
  nodejs: `import mqtt from "mqtt";

const client = mqtt.connect("mqtts://${MQTT_HOST}:${MQTT_PORT_TLS}", {
  clientId: "${DEMO_CLIENT}", // registered in the dashboard
  username: "${DEMO_USER}",
  password: process.env.MQTT_PASSWORD,
});

client.on("connect", () => {
  client.subscribe("${DEMO_USER}/sensors/#");
  client.publish("${DEMO_USER}/sensors/temp", JSON.stringify({ c: 24.8 }));
});`,
  python: `import paho.mqtt.client as mqtt

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="${DEMO_CLIENT}")
client.username_pw_set("${DEMO_USER}", "YOUR_PASSWORD")
client.tls_set()  # system CA bundle

client.connect("${MQTT_HOST}", ${MQTT_PORT_TLS}, 60)
client.loop_start()
client.publish("${DEMO_USER}/telemetry", '{"status": "online"}', qos=1)`,
  esp32: `#include <WiFiClientSecure.h>
#include <PubSubClient.h>

WiFiClientSecure net;
PubSubClient client(net);

void setup() {
  // ...connect to Wi-Fi first
  net.setCACert(ROOT_CA);  // root CA of the broker's certificate (PEM)
  client.setServer("${MQTT_HOST}", ${MQTT_PORT_TLS});
  if (client.connect("${DEMO_CLIENT}", "${DEMO_USER}", "YOUR_PASSWORD")) {
    client.publish("${DEMO_USER}/esp32/temp", "24.8");
  }
}

void loop() { client.loop(); }`,
};

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** For numbers the simulators generate at runtime; static copy is already written with Persian digits. */
export function fa(value: number | string) {
  return String(value).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}
