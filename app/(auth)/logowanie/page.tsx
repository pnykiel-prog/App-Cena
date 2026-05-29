import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Logowanie" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  if (session?.user?.userType === "tenant") redirect("/dashboard");

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
        <p className="mt-4 text-white/70 text-sm">Panel domu seniora</p>
      </div>

      <LoginForm
        context="tenant"
        callbackUrl={callbackUrl ?? "/dashboard"}
        initialError={error}
      />

      <p className="mt-6 text-center text-sm text-white/60">
        Jesteś administratorem platformy?{" "}
        <Link href="/admin-logowanie" className="text-[var(--accent)] hover:underline">
          Logowanie super-admina
        </Link>
      </p>
    </div>
  );
}
