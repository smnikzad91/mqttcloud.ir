import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAdminCard extends Document {
  cardNumber: string;
  ownerName: string;
  bankName: string;
  createdAt: Date;
}

const AdminCardSchema = new Schema<IAdminCard>(
  {
    cardNumber: { type: String, required: true, trim: true, unique: true },
    ownerName:  { type: String, required: true, trim: true },
    bankName:   { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const AdminCard: Model<IAdminCard> =
  mongoose.models.AdminCard ?? mongoose.model<IAdminCard>("AdminCard", AdminCardSchema);

export default AdminCard;
