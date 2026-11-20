import { useState } from "react";
import { Menu } from "lucide-react";

import { AppSidebar } from "@/components/app/AppSidebar";
import { NotificationBell } from "@/components/app/NotificationBell";

export function AppLayout({
  title,
  subtitle,
  children,
}: {
  title?: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen min-w-0 overflow-x-clip bg-background">
      <aside className="sticky top-0 hidden h-screen lg:block">
        <AppSidebar />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="h-full overflow-y-auto border-r border-sidebar-border shadow-2xl">
            <AppSidebar onNavigate={() => setOpen(false)} />
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            className="flex-1 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
        </div>
      ) : null}

      <div className="min-w-0 flex-1 overflow-x-clip px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {(title || subtitle) && (
          <header className="flex min-w-0 flex-wrap items-start gap-4 border-b border-border pb-5">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
              className="mt-1 rounded-lg border border-border bg-card p-2 transition-colors hover:border-primary/50 hover:text-primary lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="min-w-0 flex-1">
              {title && (
                <h1 className="text-[26px] font-bold tracking-[-0.02em] text-foreground">
                  {title}
                </h1>
              )}
              {subtitle && <p className="mt-1 text-[13.5px] text-muted-foreground">{subtitle}</p>}
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <NotificationBell />
            </div>
          </header>
        )}

        <main className={title || subtitle ? "mt-6" : ""}>{children}</main>
      </div>
    </div>
  );
}
