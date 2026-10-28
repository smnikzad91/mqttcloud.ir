import NewsItemEditor from "@/components/admin/NewsItemEditor";

export const metadata = { title: "Edit News | Admin" };

interface Props { params: Promise<{ id: string }> }

export default async function EditNewsPage({ params }: Props) {
  const { id } = await params;
  return <NewsItemEditor id={id} />;
}
