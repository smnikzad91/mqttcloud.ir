import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBlogSection {
  heading?: string;
  body: string;
  image?: string;
}

export interface IBlogPost extends Document {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  coverImage?: string;
  readTime: string;
  hashtags: string[];
  sections: IBlogSection[];
  highlight: boolean;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SectionSchema = new Schema<IBlogSection>(
  {
    heading: { type: String },
    body:    { type: String, required: true },
    image:   { type: String },
  },
  { _id: false }
);

const BlogPostSchema = new Schema<IBlogPost>(
  {
    slug:      { type: String, required: true, unique: true, trim: true, index: true },
    category:  { type: String, required: true, trim: true },
    title:     { type: String, required: true, trim: true },
    excerpt:   { type: String, required: true, trim: true },
    coverImage: { type: String },
    readTime:   { type: String, required: true },
    hashtags:  [{ type: String, trim: true }],
    sections:  [SectionSchema],
    highlight: { type: Boolean, default: false },
    published: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

delete mongoose.models["BlogPost"];
const BlogPost: Model<IBlogPost> = mongoose.model<IBlogPost>("BlogPost", BlogPostSchema);

export default BlogPost;
