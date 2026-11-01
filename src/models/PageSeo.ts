import mongoose, { Schema, Document } from "mongoose";

// Admin overrides for a public page's search metadata (src/lib/pageSeo.ts).
// A page without a document uses the defaults in code.
export interface IPageSeo extends Document {
  page: string;
  title: string;
  description: string;
  keywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

const PageSeoSchema = new Schema<IPageSeo>(
  {
    page:        { type: String, required: true, unique: true, trim: true },
    title:       { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    keywords:    { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.PageSeo || mongoose.model<IPageSeo>("PageSeo", PageSeoSchema);
