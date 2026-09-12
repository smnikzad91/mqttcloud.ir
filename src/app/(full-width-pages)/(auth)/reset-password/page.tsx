import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "فراموشی رمز عبور",
  description: "ایمیل حساب خود را وارد کنید تا لینک بازیابی رمز عبور برایتان ارسال شود.",
};

export default function ResetPasswordRequest() {
  return <ForgotPasswordForm />;
}
