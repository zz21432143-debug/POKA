import { redirect } from "next/navigation";

export default function AnonymousBoardClosedPage() {
  redirect("/community");
}
