import mongoose, { Document, Model, Schema } from "mongoose";

export type SocialPlatform =
  | "telegram" | "instagram" | "twitter" | "youtube"
  | "linkedin" | "whatsapp" | "discord" | "github"
  | "facebook" | "tiktok";

export interface ISocialLink extends Document {
  platform: SocialPlatform;
  url: string;
  label: string;
  active: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const SocialLinkSchema = new Schema<ISocialLink>(
  {
    platform: { type: String, enum: ["telegram","instagram","twitter","youtube","linkedin","whatsapp","discord","github","facebook","tiktok"], required: true },
    url:      { type: String, required: true, trim: true },
    label:    { type: String, default: "", trim: true },
    active:   { type: Boolean, default: true },
    order:    { type: Number, default: 0 },
  },
  { timestamps: true }
);

const SocialLink: Model<ISocialLink> =
  mongoose.models.SocialLink ?? mongoose.model<ISocialLink>("SocialLink", SocialLinkSchema);

export default SocialLink;
