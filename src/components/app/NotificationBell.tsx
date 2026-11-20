import { Link } from "@tanstack/react-router";
import {
  Bell,
  BellRing,
  CheckCheck,
  CircleAlert,
  CircleCheck,
  Info,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import {
  useAllNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useUnreadNotificationCount,
  type RoadmapNotification,
} from "@/data/roadmap-v2";
import { cn } from "@/lib/utils";

/**
 * In-app notifications only (DB-backed roadmap_notifications).
 *
 * NOTE (2026-11-20 rebuild): the old "Offline Alerts" tab was removed —
 * it was a push-notification facade (a localStorage "subscribed" flag and
 * a toggle promising daily updates "even when closed") with no push
 * system behind it. CareerPilot has no push notifications; this bell
 * shows only the real in-app activity feed.
 */

function notificationIcon(type: RoadmapNotification["type"]) {
  if (type === "mcq_ready") return CircleCheck;
  if (type === "streak_warning") return CircleAlert;
  if (type === "level_up") return Sparkles;
  return Info;
}

function notificationTime(value: string) {
  const timestamp = new Date(value).getTime();
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);

  const { data: count = 0 } = useUnreadNotificationCount();
  const { data: notifications = [], isLoading } = useAllNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${count ? `, ${count} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-xl border border-border bg-card p-2.5 shadow-card transition-transform hover:-translate-y-0.5"
      >
        <Bell className="h-4 w-4 text-foreground" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="border-b border-border p-3.5 bg-gradient-to-r from-card to-secondary/30">
            <div className="flex items-center gap-1.5">
              <BellRing className="h-4 w-4 text-primary" />
              <p className="text-[13px] font-bold text-foreground">Notifications</p>
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto p-2">
            {isLoading ? (
              <div className="space-y-2 p-2">
                <div className="h-12 animate-pulse rounded-xl bg-secondary" />
                <div className="h-12 animate-pulse rounded-xl bg-secondary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="mx-auto h-5 w-5 text-muted-foreground/40" />
                <p className="mt-2 text-[12px] font-semibold text-foreground">You&apos;re all caught up</p>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  New roadmap milestones and feedback will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = notificationIcon(notification.type);
                return (
                  <button
                    type="button"
                    key={notification.id}
                    onClick={() => {
                      if (!notification.read) markRead.mutate({ notificationId: notification.id });
                    }}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left transition-colors hover:bg-muted/50",
                      !notification.read && "bg-primary/[0.04]"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs",
                        notification.read
                          ? "bg-secondary text-muted-foreground"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-1">
                        <span className="text-[12px] font-bold text-foreground truncate">
                          {notification.title}
                        </span>
                        {!notification.read && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        )}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted-foreground line-clamp-2">
                        {notification.message}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground/70">
                        {notificationTime(notification.created_at)}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border px-3.5 py-2.5 bg-secondary/15">
            <Link
              to="/roadmap"
              onClick={() => setOpen(false)}
              className="text-[12px] font-semibold text-primary hover:underline"
            >
              View full roadmap →
            </Link>
            {count > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-muted-foreground hover:text-foreground"
              >
                <CheckCheck className="h-3 w-3" /> Mark read
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
