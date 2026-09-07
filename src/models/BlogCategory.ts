import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBlogCategory extends Document {
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const BlogCategorySchema = new Schema<IBlogCategory>(
  {
    name:        { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

delete mongoose.models["BlogCategory"];
const BlogCategory: Model<IBlogCategory> = mongoose.model<IBlogCategory>("BlogCategory", BlogCategorySchema);

export default BlogCategory;
