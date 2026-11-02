import mongoose, { Document, Model, Schema, Types } from "mongoose";

// Permanent history of the power-control device's telemetry. MqttPayload only
// keeps 7 days, so src/lib/powerMonitor.ts copies each reading here.
export interface IPowerReading extends Document {
  payloadId: Types.ObjectId; // source MqttPayload — makes the copy idempotent
  ts: Date;
  mains: number;             // 1 = mains present, 0 = outage
  ch: number[];              // channel currents in mA
}

const PowerReadingSchema = new Schema<IPowerReading>(
  {
    payloadId: { type: Schema.Types.ObjectId, required: true, unique: true },
    ts:        { type: Date, required: true, index: true },
    mains:     { type: Number, required: true },
    ch:        [{ type: Number }],
  },
  { timestamps: false }
);

delete mongoose.models["PowerReading"];
const PowerReading: Model<IPowerReading> = mongoose.model<IPowerReading>("PowerReading", PowerReadingSchema);

export default PowerReading;
