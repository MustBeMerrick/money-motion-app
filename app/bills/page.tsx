import { redirect } from "next/navigation";

// Monthly is the everyday view, so /bills lands there.
export default function BillsIndex() {
  redirect("/bills/monthly");
}
