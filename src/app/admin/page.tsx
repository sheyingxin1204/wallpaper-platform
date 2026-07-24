import { redirect } from "next/navigation";
import { UnauthorizedError, requireAdmin } from "@/lib/auth-guard";
import { AdminDashboard } from "./admin-dashboard";

export const dynamic = "force-dynamic";

async function getAdministrator() {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    throw error;
  }
}

export default async function AdminPage() {
  const administrator = await getAdministrator();
  return <AdminDashboard administratorName={administrator.name} />;
}
