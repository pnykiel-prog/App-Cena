"use client";

import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { MobileNav } from "./mobile-nav";

export function PanelTopbar({
  userName,
  userEmail,
  tenantName,
  showAudit = false,
  showLocations = false,
}: {
  userName: string;
  userEmail: string;
  tenantName: string;
  showAudit?: boolean;
  showLocations?: boolean;
}) {
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border)] bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        <MobileNav
          tenantName={tenantName}
          showAudit={showAudit}
          showLocations={showLocations}
        />
        <div>
          <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">
            Dom seniora
          </p>
          <h1 className="text-sm font-semibold text-[var(--primary)]">{tenantName}</h1>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-3 pl-2 pr-3">
            <Avatar>
              <AvatarFallback>{initials || "U"}</AvatarFallback>
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
          <DropdownMenuLabel>Moje konto</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/logowanie" })}
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
