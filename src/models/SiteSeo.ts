import mongoose, { Schema, Document } from "mongoose";

export interface ISiteSeo extends Document {
  title: string;
  description: string;
  keywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

const SiteSeoSchema = new Schema<ISiteSeo>(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    keywords:    { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.SiteSeo || mongoose.model<ISiteSeo>("SiteSeo", SiteSeoSchema);
