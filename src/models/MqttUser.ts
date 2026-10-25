import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { assertCanCreateMqttUser } from "@/lib/planEnforcement";

// One MQTT broker credential set ("MQTT account") owned by a dashboard User.
// A User can hold several of these (like API keys); every topic a client of
// this credential set publishes/subscribes to must be namespaced under
// `username` (enforced by the broker service, not here).
export interface IMqttUser extends Document {
  userId: Types.ObjectId;
  username: string;
  password: string; // bcrypt hash — never returned by the API
  isActive: boolean;
  maxConnection: number;
  createdAt: Date;
  updatedAt: Date;
}

const MqttUserSchema = new Schema<IMqttUser>(
  {
    userId:        { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    username:      { type: String, required: true, unique: true, trim: true, lowercase: true },
    password:      { type: String, required: true },
    isActive:      { type: Boolean, default: true },
    maxConnection: { type: Number, default: 3, min: 1 },
  },
  { timestamps: true }
);

// Backstop for the API-level check in the credentials route — enforced here
// too so any other write path (admin scripts, seed data, future routes)
// can't silently exceed the owning User's plan quota.
MqttUserSchema.pre("save", async function () {
  if (!this.isNew) return;
  const count = await mongoose.models.MqttUser.countDocuments({ userId: this.userId });
  await assertCanCreateMqttUser(this.userId.toString(), count);
});

delete mongoose.models["MqttUser"];
const MqttUser: Model<IMqttUser> = mongoose.model<IMqttUser>("MqttUser", MqttUserSchema);

export default MqttUser;
