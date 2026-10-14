import { redirect } from "next/navigation";

// Panel admina to same statystyki
export default function AdminPage() {
  redirect("/admin/stats");
}
