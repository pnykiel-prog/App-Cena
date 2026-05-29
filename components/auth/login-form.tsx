"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const schema = z.object({
  email: z.string().email("Niepoprawny adres e-mail"),
  password: z.string().min(1, "Wpisz hasło"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm({
  context,
  callbackUrl,
  initialError,
}: {
  context: "tenant" | "admin";
  callbackUrl: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(
    initialError === "CredentialsSignin"
      ? "Nieprawidłowy e-mail lub hasło"
      : initialError ?? null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => {
    setError(null);
    startTransition(async () => {
      const res = await signIn("credentials", {
        email: values.email,
        password: values.password,
        context,
        redirect: false,
      });
      if (!res || res.error) {
        const msg = "Nieprawidłowy e-mail lub hasło";
        setError(msg);
        toast.error(msg);
        return;
      }
      toast.success("Zalogowano");
      router.push(callbackUrl);
      router.refresh();
    });
  };

  return (
    <Card className="border-0 shadow-2xl">
      <CardHeader>
        <CardTitle>
          {context === "admin" ? "Zaloguj się jako super-admin" : "Zaloguj się do panelu"}
        </CardTitle>
        <CardDescription>
          {context === "admin"
            ? "Dostęp tylko dla zespołu CareQuote."
            : "Użyj danych otrzymanych od administratora domu seniora."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="adres@example.pl"
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Hasło</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            ) : null}
          </div>

          <Button
            type="submit"
            variant={context === "admin" ? "accent" : "default"}
            className="w-full"
            disabled={isPending}
          >
            {isPending ? "Logowanie..." : "Zaloguj się"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
