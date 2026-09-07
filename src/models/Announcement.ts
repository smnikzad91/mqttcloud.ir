import mongoose, { Schema, Document } from "mongoose";

export interface IAnnouncement extends Document {
  text: string;
  link?: string;
  linkText?: string;
  emoji?: string;
  active: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    text:     { type: String, required: true, trim: true },
    link:     { type: String, default: "", trim: true },
    linkText: { type: String, default: "", trim: true },
    emoji:    { type: String, default: "🎉", trim: true },
    active:   { type: Boolean, default: true },
    order:    { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Announcement ||
  mongoose.model<IAnnouncement>("Announcement", AnnouncementSchema);
