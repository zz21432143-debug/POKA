import { redirect } from "next/navigation";

export default function AnonymousBoardGone() {
  redirect("/community");
}
