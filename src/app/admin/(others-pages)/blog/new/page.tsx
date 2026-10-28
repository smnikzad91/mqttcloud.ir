import { Metadata } from "next";
import BlogPostEditor from "@/components/admin/BlogPostEditor";

export const metadata: Metadata = { title: "New Post | Admin" };

export default function NewBlogPostPage() {
  return <BlogPostEditor />;
}
