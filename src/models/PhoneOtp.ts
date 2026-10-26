import mongoose, { Document, Model, Schema } from "mongoose";

// Holds a pending signup until its phone number is verified. The real User
// document is only created in /api/auth/register/verify, once the code
// matches — so an unverified signup never occupies the unique email/phone
// slots a real account would need.
export interface IPhoneOtp extends Document {
  phone: string;
  codeHash: string;
  attempts: number;
  payload: {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
  };
  expiresAt: Date;
  createdAt: Date;
}

const PhoneOtpSchema = new Schema<IPhoneOtp>(
  {
    phone:    { type: String, required: true, unique: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    payload: {
      firstName:    { type: String, required: true },
      lastName:     { type: String, required: true },
      email:        { type: String, required: true },
      passwordHash: { type: String, required: true },
    },
    // TTL index — Mongo removes the document automatically once this time
    // passes, so an abandoned signup never lingers.
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

delete mongoose.models["PhoneOtp"];
const PhoneOtp: Model<IPhoneOtp> = mongoose.model<IPhoneOtp>("PhoneOtp", PhoneOtpSchema);

export default PhoneOtp;
