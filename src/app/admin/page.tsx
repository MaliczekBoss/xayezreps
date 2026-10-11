import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { sortNewest } from "@/lib/finds";
import { getFindsFresh } from "@/lib/store";
import { AdminDashboard } from "./admin-dashboard";

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="p-10 text-center text-sm text-muted">Ładowanie panelu…</p>}>
      <AdminContent />
    </Suspense>
  );
}

async function AdminContent() {
  if (!(await isAdmin())) redirect("/admin/login");
  const finds = sortNewest(await getFindsFresh());
  return <AdminDashboard finds={finds} />;
}
