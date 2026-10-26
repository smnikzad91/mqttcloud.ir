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
  plan: "free" | "basic" | "starter" | "enterprise";
  planMaxUsers?: number | null;
  planClientsPerUser?: number | null;
  planExpiresAt?: Date | null;
  planReminderSentAt?: Date | null;
  phoneVerified: boolean;
  resetPasswordTokenHash?: string;
  resetPasswordExpires?: Date;
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
    plan:          { type: String, enum: ["free", "basic", "starter", "enterprise"], default: "free" },
    // Overrides the plan's built-in numbers — mainly how an admin configures
    // the sales-negotiated "enterprise" tier, which has no numbers of its own.
    planMaxUsers:       { type: Number, default: null },
    planClientsPerUser: { type: Number, default: null },
    // Only set for self-service paid plans (basic/starter) — a 30-day
    // subscription window. null for free/enterprise, which never expire
    // through this mechanism. See src/lib/planExpiry.ts.
    planExpiresAt:      { type: Date, default: null },
    planReminderSentAt: { type: Date, default: null },
    // Gates dashboard access for new signups — true unconditionally for
    // accounts created before this field existed (see the one-time
    // migration), since they were already using the product.
    phoneVerified: { type: Boolean, default: true },
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpires:   { type: Date,   select: false },
  },
  { timestamps: true }
);

// Unique phone index — sparse so multiple users can have an empty phone
UserSchema.index({ phone: 1 }, { unique: true, sparse: true, partialFilterExpression: { phone: { $gt: "" } } });

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);

export default User;
