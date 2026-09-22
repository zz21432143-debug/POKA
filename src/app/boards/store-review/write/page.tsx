import { redirect } from "next/navigation";

export default function StoreReviewWriteRedirect() {
  redirect("/boards/anonymous/write");
}
