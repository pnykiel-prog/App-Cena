"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AdminBrandHeader, AdminNavLinks } from "./sidebar";

// Mobilna nawigacja super-admina: hamburger w topbarze (md:hidden) + wysuwany
// drawer z nakładką. Na desktopie działa stały AdminSidebar.
export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Otwórz menu"
        className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--primary)] hover:bg-[var(--secondary)]"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 h-full w-64 flex flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] shadow-xl">
            <div className="flex items-center justify-between pr-3">
              <div className="flex-1">
                <AdminBrandHeader />
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Zamknij menu"
                className="flex h-8 w-8 items-center justify-center rounded-md text-white/70 hover:bg-[var(--sidebar-accent)]/60 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <AdminNavLinks onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </div>
  );
}
