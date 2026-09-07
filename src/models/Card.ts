import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ICard extends Document {
  userId: Types.ObjectId;
  cardNumber: string;
  ownerName: string;
  bankName: string;
  createdAt: Date;
}

const CardSchema = new Schema<ICard>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    cardNumber: { type: String, required: true, trim: true, unique: true },
    ownerName:  { type: String, required: true, trim: true },
    bankName:   { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const Card: Model<ICard> =
  mongoose.models.Card ?? mongoose.model<ICard>("Card", CardSchema);

export default Card;
