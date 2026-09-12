import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "تعیین رمز عبور جدید",
  description: "رمز عبور جدید حساب mqttcloud.ir خود را تعیین کنید.",
};

export default async function ResetPasswordWithToken({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ResetPasswordForm token={token} />;
}
