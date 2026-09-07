import mongoose, { Schema, Document } from "mongoose";

export type LegalPageType = "privacy" | "terms";

export interface ILegalPage extends Document {
  type: LegalPageType;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const LegalPageSchema = new Schema<ILegalPage>(
  {
    type:    { type: String, enum: ["privacy", "terms"], required: true, unique: true },
    title:   { type: String, required: true, trim: true },
    content: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.LegalPage ||
  mongoose.model<ILegalPage>("LegalPage", LegalPageSchema);
