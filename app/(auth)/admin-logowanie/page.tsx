import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Logowanie super-admina" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  if (session?.user?.userType === "admin") redirect("/admin");

  const { callbackUrl, error } = await searchParams;

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-white">
          <div className="h-9 w-9 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-bold">
            C
          </div>
          <span className="text-2xl font-semibold tracking-tight">CareQuote</span>
        </div>
        <p className="mt-4 text-white/70 text-sm uppercase tracking-wider">
          Panel super-admina
        </p>
      </div>

      <LoginForm
        context="admin"
        callbackUrl={callbackUrl ?? "/admin"}
        initialError={error}
      />

      <p className="mt-6 text-center text-sm text-white/60">
        Jesteś pracownikiem domu seniora?{" "}
        <Link href="/logowanie" className="text-[var(--accent)] hover:underline">
          Logowanie tenanta
        </Link>
      </p>
    </div>
  );
}
