import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IReply {
  sender: "user" | "admin";
  message: string;
  images: string[];
  createdAt: Date;
}

export interface ITicket extends Document {
  userId: Types.ObjectId;
  subject: string;
  message: string;
  images: string[];
  status: "open" | "answered" | "closed";
  replies: IReply[];
  createdAt: Date;
  updatedAt: Date;
}

const ReplySchema = new Schema<IReply>(
  {
    sender:    { type: String, enum: ["user", "admin"], required: true },
    message:   { type: String, required: true, trim: true },
    images:    [{ type: String }],
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const TicketSchema = new Schema<ITicket>(
  {
    userId:  { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true },
    images:  [{ type: String }],
    status:  { type: String, enum: ["open", "answered", "closed"], default: "open" },
    replies: [ReplySchema],
  },
  { timestamps: true }
);

// Always re-register so schema changes (e.g. new fields) take effect without a full server restart
delete mongoose.models["Ticket"];
const Ticket: Model<ITicket> = mongoose.model<ITicket>("Ticket", TicketSchema);

export default Ticket;
