// Public broker endpoints shown to users. Same env vars (and fallbacks) the
// landing page's simulator constants use, so no screen advertises a different host.
export const MQTT_HOST     = process.env.NEXT_PUBLIC_MQTT_HOST ?? "mqtt.mqttcloud.ir";
export const MQTT_PORT_TCP = process.env.NEXT_PUBLIC_MQTT_PORT_TCP ?? "1883";
export const MQTT_PORT_TLS = process.env.NEXT_PUBLIC_MQTT_PORT_TLS ?? "8883";
export const MQTT_WS_URL   = process.env.NEXT_PUBLIC_MQTT_WS_URL ?? `wss://${MQTT_HOST}/mqtt`;
