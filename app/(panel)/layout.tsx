import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PanelSidebar } from "@/components/panel/sidebar";
import { PanelTopbar } from "@/components/panel/topbar";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.userType !== "tenant") {
    redirect("/logowanie");
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <PanelSidebar tenantName={session.user.tenantName ?? "Dom seniora"} />
      <div className="flex flex-1 flex-col">
        <PanelTopbar
          userName={session.user.name ?? "Użytkownik"}
          userEmail={session.user.email ?? ""}
          tenantName={session.user.tenantName ?? ""}
        />
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
