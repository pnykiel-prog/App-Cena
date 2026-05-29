import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationsEditor } from "./notifications-editor";

export const metadata = { title: "Konfiguracja — Powiadomienia" };

export default async function PowiadomieniaPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId!;

  const setting = await prisma.notificationSetting.findUnique({
    where: { tenantId },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Powiadomienia e-mail</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">
          Konfiguracja powiadomień o nowych leadach i wizytach. Wysyłka
          przez Resend (Sprint 4).
        </p>
      </CardHeader>
      <CardContent>
        <NotificationsEditor
          initial={{
            emailNewLead: setting?.emailNewLead ?? true,
            emailNewVisit: setting?.emailNewVisit ?? true,
            recipientEmails: setting?.recipientEmails ?? [],
          }}
        />
      </CardContent>
    </Card>
  );
}
