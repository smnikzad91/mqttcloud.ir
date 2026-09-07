import mongoose, { Document, Model, Schema } from "mongoose";

export interface INewsTag extends Document {
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const NewsTagSchema = new Schema<INewsTag>(
  {
    name:        { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

delete mongoose.models["NewsTag"];
const NewsTag: Model<INewsTag> = mongoose.model<INewsTag>("NewsTag", NewsTagSchema);

export default NewsTag;
