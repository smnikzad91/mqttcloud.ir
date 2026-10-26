import mongoose, { Document, Model, Schema } from "mongoose";

// A short-lived code for the "log in with phone" flow — unlike PhoneOtp
// (signup), there's no pending account to stash: the User already exists,
// so this only has to prove the caller currently controls that phone.
export interface ILoginOtp extends Document {
  phone: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const LoginOtpSchema = new Schema<ILoginOtp>(
  {
    phone:    { type: String, required: true, unique: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    // TTL index — Mongo removes the document automatically once this
    // passes, so an unused code never lingers.
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

delete mongoose.models["LoginOtp"];
const LoginOtp: Model<ILoginOtp> = mongoose.model<ILoginOtp>("LoginOtp", LoginOtpSchema);

export default LoginOtp;
