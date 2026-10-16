import { redirect } from "next/navigation";

/** /signup 으로 들어오면 로그인 화면의 회원가입 탭으로 */
export default function SignupPage() {
  redirect("/login?tab=signup");
}
