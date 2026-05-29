"use client";

import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Shield } from "lucide-react";

export function AdminTopbar({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border)] bg-white px-6">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-[var(--accent)]" />
        <span className="text-xs uppercase tracking-wider text-[var(--muted-foreground)] font-semibold">
          Panel super-admina platformy
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-3 pl-2 pr-3">
            <Avatar>
              <AvatarFallback>{initials || "A"}</AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="text-sm font-medium">{userName}</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                {userEmail}
              </span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Konto super-admina</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/admin-logowanie" })}
            className="text-red-600 focus:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Wyloguj
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
