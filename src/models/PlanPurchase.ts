import mongoose, { Document, Model, Schema, Types } from "mongoose";

// A nodepass.ir payment created to upgrade a User to a paid self-service
// plan (basic/starter). Free/enterprise never go through this — free has
// no cost, enterprise is sales-negotiated and admin-assigned.
export interface IPlanPurchase extends Document {
  userId: Types.ObjectId;
  targetPlan: "basic" | "starter";
  amountToman: number;
  status: "pending" | "paid" | "expired" | "cancelled";
  nodepassPaymentId: string;
  trackingCode: string;
  statusUrl: string;
  createdAt: Date;
  paidAt: Date | null;
}

const PlanPurchaseSchema = new Schema<IPlanPurchase>(
  {
    userId:            { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetPlan:        { type: String, enum: ["basic", "starter"], required: true },
    amountToman:       { type: Number, required: true },
    status:            { type: String, enum: ["pending", "paid", "expired", "cancelled"], default: "pending" },
    nodepassPaymentId: { type: String, required: true, unique: true, index: true },
    trackingCode:      { type: String, required: true },
    statusUrl:         { type: String, required: true },
    paidAt:            { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

delete mongoose.models["PlanPurchase"];
const PlanPurchase: Model<IPlanPurchase> = mongoose.model<IPlanPurchase>("PlanPurchase", PlanPurchaseSchema);

export default PlanPurchase;
