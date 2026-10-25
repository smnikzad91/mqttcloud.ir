import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IDeposit extends Document {
  userId: Types.ObjectId;
  cardId?: Types.ObjectId;
  amount: number;
  description: string;
  receiptImage: string;
  status: "pending" | "approved" | "rejected";
  adminNote: string;
  interceptionCode: string;
  // nodepass.ir payment — set once a payment is created for this deposit.
  // cardId/receiptImage stay empty for these; the receiving card is chosen
  // by nodepass per-payment, not picked from our own AdminCard list.
  nodepassPaymentId?: string;
  trackingCode?: string;
  payableRial?: string;
  payCardNumber?: string;
  payCardOwnerName?: string;
  payCardBankName?: string;
  statusUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DepositSchema = new Schema<IDeposit>(
  {
    userId:       { type: Schema.Types.ObjectId, ref: "User",    required: true, index: true },
    cardId:       { type: Schema.Types.ObjectId, ref: "Card",    required: false },
    amount:       { type: Number, required: true, min: 1000 },
    description:  { type: String, default: "", trim: true },
    receiptImage: { type: String, default: "" },
    status:           { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    adminNote:        { type: String, default: "", trim: true },
    interceptionCode: {
      type: String, unique: true, index: true, sparse: true,
      default: () => `DEP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    },
    nodepassPaymentId: { type: String, unique: true, sparse: true, index: true },
    trackingCode:       { type: String },
    payableRial:        { type: String },
    payCardNumber:      { type: String },
    payCardOwnerName:   { type: String },
    payCardBankName:    { type: String },
    statusUrl:          { type: String },
  },
  { timestamps: true }
);

// Delete cached model so schema changes take effect on hot-reload
delete mongoose.models["Deposit"];
const Deposit: Model<IDeposit> = mongoose.model<IDeposit>("Deposit", DepositSchema);

export default Deposit;
