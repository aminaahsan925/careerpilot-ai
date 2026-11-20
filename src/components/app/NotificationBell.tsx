import { Link } from "@tanstack/react-router";
import {
  Bell,
  BellRing,
  Calendar,
  Check,
  CheckCheck,
  CircleAlert,
  CircleCheck,
  Flame,
  Globe2,
  Info,
  Radio,
  Settings2,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  useAllNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useUnreadNotificationCount,
  type RoadmapNotification,
} from "@/data/roadmap-v2";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  requestNotificationPermission,
  isPushSubscribed,
  type NotificationPreferences,
} from "@/lib/push-notifications";
import { cn } from "@/lib/utils";

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
  const [activeTab, setActiveTab] = useState<"activity" | "offline_settings">("activity");
  const [isPushActive, setIsPushActive] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences>(getNotificationPreferences());

  const { data: count = 0 } = useUnreadNotificationCount();
  const { data: notifications = [], isLoading } = useAllNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setIsPushActive(isPushSubscribed());
      setPrefs(getNotificationPreferences());
    }
  }, [open]);

  const handleTogglePush = async (checked: boolean) => {
    if (checked) {
      const permission = await requestNotificationPermission();
      if (permission === "granted") {
        setIsPushActive(true);
        saveNotificationPreferences(prefs);
        toast.success("Offline Alerts Enabled! You will receive daily updates even when closed.");
      } else {
        toast.error("Please allow notification permission in your browser.");
        setIsPushActive(false);
      }
    } else {
      setIsPushActive(false);
      localStorage.setItem("careerpilot_push_subscribed", "false");
      toast.info("Offline alerts paused.");
    }
  };

  const handlePrefToggle = (key: keyof NotificationPreferences, val: boolean) => {
    const updated = { ...prefs, [key]: val };
    setPrefs(updated);
    saveNotificationPreferences(updated);
    toast.success("Preference saved.");
  };

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
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta px-1 text-[9px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="border-b border-border p-3.5 bg-gradient-to-r from-card to-secondary/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <BellRing className="h-4 w-4 text-terracotta" />
                <p className="text-[13px] font-bold text-foreground">Notifications & Alerts</p>
              </div>

              {/* Sub-tabs switch */}
              <div className="flex items-center gap-1 rounded-lg bg-secondary/80 p-0.5 border border-border/60">
                <button
                  type="button"
                  onClick={() => setActiveTab("activity")}
                  className={cn(
                    "rounded-md px-2 py-1 text-[10.5px] font-semibold transition-all",
                    activeTab === "activity"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Activity
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("offline_settings")}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-semibold transition-all",
                    activeTab === "offline_settings"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Radio className={cn("h-2 w-2", isPushActive ? "text-emerald-500" : "text-muted-foreground")} />
                  Offline Alerts
                </button>
              </div>
            </div>
          </div>

          {/* TAB 1: IN-APP ACTIVITY */}
          {activeTab === "activity" && (
            <div>
              {/* If push alerts not enabled yet, show subtle invitation banner */}
              {!isPushActive && (
                <div className="mx-3 mt-3 rounded-xl border border-terracotta/20 bg-terracotta/5 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-bold text-foreground">
                        Enable Offline Intelligence Alerts
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        Get native desktop alerts for hackathons & roadmap targets even when closed.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="h-6 rounded-lg px-2 text-[10px] font-bold bg-terracotta hover:bg-terracotta/90 text-white shrink-0"
                      onClick={() => setActiveTab("offline_settings")}
                    >
                      Setup
                    </Button>
                  </div>
                </div>
              )}

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
                    <p className="mt-0.5 text-[10.5px] text-muted-foreground">
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
                          !notification.read && "bg-terracotta/[0.04]"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs",
                            notification.read
                              ? "bg-secondary text-muted-foreground"
                              : "bg-terracotta/10 text-terracotta"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-bold text-foreground truncate">
                              {notification.title}
                            </span>
                            {!notification.read && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta" />
                            )}
                          </span>
                          <span className="mt-0.5 block text-[10.5px] leading-relaxed text-muted-foreground line-clamp-2">
                            {notification.message}
                          </span>
                          <span className="mt-0.5 block text-[9.5px] text-muted-foreground/70">
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
                  className="text-[11px] font-semibold text-terracotta hover:underline"
                >
                  View full roadmap →
                </Link>
                {count > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllRead.mutate()}
                    className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <CheckCheck className="h-3 w-3" /> Mark read
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: OFFLINE ALERTS CONFIGURATION */}
          {activeTab === "offline_settings" && (
            <div className="p-3.5 space-y-3.5">
              {/* Master Push Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-3">
                <div>
                  <p className="text-[11.5px] font-bold text-foreground">
                    Background Offline Alerts
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {isPushActive ? "Active — Dispatches daily brief to OS" : "Disabled"}
                  </p>
                </div>
                <Switch
                  checked={isPushActive}
                  onCheckedChange={handleTogglePush}
                  className="data-[state=checked]:bg-terracotta"
                />
              </div>

              {/* 4 Pillars Preferences */}
              <div className="space-y-2 rounded-xl border border-border/70 bg-card p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Alert Channels (9:00 AM PKT)
                </p>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <Flame className="h-3.5 w-3.5 text-terracotta" />
                    <span className="text-[11px] font-medium text-foreground">
                      City Hackathons & Tech Events
                    </span>
                  </div>
                  <Switch
                    checked={prefs.events}
                    disabled={!isPushActive}
                    onCheckedChange={(c) => handlePrefToggle("events", c)}
                    className="data-[state=checked]:bg-terracotta"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-terracotta" />
                    <span className="text-[11px] font-medium text-foreground">
                      Daily Roadmap Sprint Tasks
                    </span>
                  </div>
                  <Switch
                    checked={prefs.roadmap}
                    disabled={!isPushActive}
                    onCheckedChange={(c) => handlePrefToggle("roadmap", c)}
                    className="data-[state=checked]:bg-terracotta"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-terracotta" />
                    <span className="text-[11px] font-medium text-foreground">
                      Future Tech & AI Shifts
                    </span>
                  </div>
                  <Switch
                    checked={prefs.future_tech}
                    disabled={!isPushActive}
                    onCheckedChange={(c) => handlePrefToggle("future_tech", c)}
                    className="data-[state=checked]:bg-terracotta"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe2 className="h-3.5 w-3.5 text-terracotta" />
                    <span className="text-[11px] font-medium text-foreground">
                      Market Hiring Reality Truth
                    </span>
                  </div>
                  <Switch
                    checked={prefs.market_reality}
                    disabled={!isPushActive}
                    onCheckedChange={(c) => handlePrefToggle("market_reality", c)}
                    className="data-[state=checked]:bg-terracotta"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
