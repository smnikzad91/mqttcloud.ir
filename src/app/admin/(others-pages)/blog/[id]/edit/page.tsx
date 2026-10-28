import { Metadata } from "next";
import BlogPostEditor from "@/components/admin/BlogPostEditor";

export const metadata: Metadata = { title: "Edit Post | Admin" };

interface Props { params: Promise<{ id: string }> }

export default async function EditBlogPostPage({ params }: Props) {
  const { id } = await params;
  return <BlogPostEditor id={id} />;
}
