import mongoose, { Document, Model, Schema } from "mongoose";

export interface INewsItem extends Document {
  category: string;
  hashtags: string[];
  title: string;
  body: string;
  image?: string;
  coverImage?: string;
  highlight: boolean;
  published: boolean;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NewsItemSchema = new Schema<INewsItem>(
  {
    category:    { type: String, required: true, trim: true },
    hashtags:    [{ type: String, trim: true }],
    title:       { type: String, required: true, trim: true },
    body:        { type: String, required: true, trim: true },
    image:       { type: String },
    coverImage:  { type: String },
    highlight:       { type: Boolean, default: false },
    published:   { type: Boolean, default: true, index: true },
    publishedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

delete mongoose.models["NewsItem"];
const NewsItem: Model<INewsItem> = mongoose.model<INewsItem>("NewsItem", NewsItemSchema);

export default NewsItem;
