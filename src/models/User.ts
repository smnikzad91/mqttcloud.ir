import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "admin" | "user";
  walletBalance: number;
  avatar: string;
  phone: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    firstName:     { type: String, required: true, trim: true },
    lastName:      { type: String, required: true, trim: true },
    email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:      { type: String, required: true },
    role:          { type: String, enum: ["admin", "user"], default: "user" },
    walletBalance: { type: Number, default: 0 },
    avatar:        { type: String, default: "" },
    phone:         { type: String, default: "" },
  },
  { timestamps: true }
);

// Unique phone index — sparse so multiple users can have an empty phone
UserSchema.index({ phone: 1 }, { unique: true, sparse: true, partialFilterExpression: { phone: { $gt: "" } } });

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);

export default User;
