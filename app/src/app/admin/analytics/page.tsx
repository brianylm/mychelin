"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  ChefHat,
  Copy,
  Mail,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

interface CountItem {
  key: string;
  count: number;
}

interface FunnelItem {
  id: string;
  label: string;
  users: number;
  rate: number;
}

interface UserUsage {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  onboardingCompleted: boolean;
  cookingGoals: string[];
  cookingFrequency: string | null;
  firstCaptureMode: string | null;
  activationStage: string;
  feedbackCount: number;
  latestFeedback: {
    stage: string;
    rating: number | null;
    comment: string | null;
    source: string | null;
    createdAt: string;
  } | null;
  events30: number;
  lastActivityAt: string | null;
  recipeCaptures30: number;
  aiDrafts30: number;
  transcriptions30: number;
  conversationAssists30: number;
  mealPlans30: number;
  shoppingLists30: number;
  cookAttempts30: number;
  promotedVersions30: number;
}

interface AnalyticsData {
  generatedAt: string;
  windowDays: number;
  summary: {
    totalUsers: number;
    newUsers30: number;
    activeUsers7: number;
    activeUsers30: number;
    totalEvents30: number;
    feedbackCount: number;
    averageFeedbackRating: number | null;
  };
  funnel: FunnelItem[];
  eventsByDay: Array<{ day: string; count: number }>;
  eventCounts: CountItem[];
  capture: {
    total: number;
    sources: CountItem[];
    providers: CountItem[];
  };
  onboarding: {
    completedUsers: number;
    completionRate: number;
    goals: CountItem[];
    frequencies: CountItem[];
    firstCaptureModes: CountItem[];
  };
  feedback: {
    byStage: CountItem[];
    recent: Array<{
      id: number;
      userId: number | null;
      stage: string;
      rating: number | null;
      comment: string | null;
      source: string | null;
      createdAt: string;
    }>;
  };
  recentEvents: Array<{
    id: number;
    userId: number | null;
    eventName: string;
    source: string | null;
    recipeId: number | null;
    mealPlanId: number | null;
    path: string | null;
    createdAt: string;
  }>;
  users: UserUsage[];
}

const EVENT_LABELS: Record<string, string> = {
  ai_draft_completed: "Ask Mychelin draft",
  attempt_promoted_to_version: "Attempt promoted",
  conversation_assist_completed: "Conversation assist",
  cook_attempt_created: "Cook attempt",
  meal_planned: "Meal planned",
  onboarding_completed: "Onboarding",
  onboarding_viewed: "Onboarding viewed",
  onboarding_option_picked: "Onboarding option picked",
  onboarding_skipped: "Onboarding skipped",
  onboarding_tool_opened: "Onboarding tool opened",
  photo_uploaded: "Photo uploaded",
  pilot_feedback_submitted: "Pilot feedback",
  recipe_capture_completed: "Recipe capture",
  recipe_created: "Recipe created",
  shopping_list_generated: "Shopping list",
  transcription_completed: "Transcription",
  user_signed_up: "Signup",
};

function formatLabel(value: string): string {
  return EVENT_LABELS[value] || value.replace(/_/g, " ");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-SG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat("en-SG", { month: "short", day: "numeric" }).format(new Date(value));
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-ui-border bg-ui-surface-raised p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ui-surface-subtle text-ui-accent">
          <Icon size={18} strokeWidth={1.8} />
        </div>
        <span className="text-xs font-medium text-ui-muted">{label}</span>
      </div>
      <div className="mt-4 text-3xl font-semibold leading-none text-ui-text">{value}</div>
      <div className="mt-2 text-sm text-ui-muted">{detail}</div>
    </div>
  );
}

function HorizontalBars({ items, emptyLabel = "No data yet" }: { items: CountItem[]; emptyLabel?: string }) {
  const max = Math.max(...items.map((item) => item.count), 0);

  if (items.length === 0) {
    return <div className="rounded-lg border border-dashed border-ui-border p-4 text-sm text-ui-muted">{emptyLabel}</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.key}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium text-ui-text">{formatLabel(item.key)}</span>
            <span className="tabular-nums text-ui-muted">{item.count}</span>
          </div>
          <div className="h-2 rounded-full bg-ui-surface-subtle">
            <div
              className="h-2 rounded-full bg-ui-accent"
              style={{ width: `${max > 0 ? Math.max(6, Math.round((item.count / max) * 100)) : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function UsageChip({ label, value }: { label: string; value: number }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium " +
        (value > 0 ? "border-ui-border bg-ui-surface-raised text-ui-text" : "border-ui-border bg-ui-surface-subtle text-ui-muted")
      }
    >
      {label} <span className="tabular-nums">{value}</span>
    </span>
  );
}

function UserUsagePanel({ users }: { users: UserUsage[] }) {
  const [copied, setCopied] = useState(false);
  const emails = users.map((user) => user.email).filter(Boolean).join(", ");

  const copyEmails = async () => {
    if (!emails) return;
    try {
      await navigator.clipboard.writeText(emails);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="rounded-lg border border-ui-border bg-ui-surface-raised p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ui-text">Registered users</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-ui-muted">
            Admin-only outreach view. Shows email addresses and privacy-safe usage counts so pilot follow-up can be targeted without exposing recipe content.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void copyEmails()}
          disabled={!emails}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-ui-border-strong bg-ui-surface-raised px-4 py-2 text-sm font-semibold text-ui-text hover:bg-ui-surface-subtle disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Copy size={16} />
          {copied ? "Copied" : "Copy emails"}
        </button>
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border border-ui-border">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[1.45fr_1fr_1.7fr_1.1fr_0.8fr] bg-ui-surface-subtle px-3 py-2 text-xs font-semibold text-ui-muted">
            <span>User</span>
            <span>Status</span>
            <span>Usage in 30 days</span>
            <span>Feedback</span>
            <span>Contact</span>
          </div>
          <div className="divide-y divide-ui-border">
            {users.length === 0 ? (
              <div className="px-3 py-6 text-sm text-ui-muted">No registered users yet.</div>
            ) : (
              users.map((user) => {
                const captureCount = user.recipeCaptures30 + user.aiDrafts30 + user.transcriptions30 + user.conversationAssists30;
                return (
                  <article key={user.id} className="grid grid-cols-[1.45fr_1fr_1.7fr_1.1fr_0.8fr] gap-3 px-3 py-4 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-ui-text">{user.name || "Unnamed user"}</div>
                      <div className="mt-0.5 truncate text-ui-muted">{user.email}</div>
                      <div className="mt-1 text-xs text-ui-muted">User {user.id} - joined {shortDate(user.createdAt)}</div>
                    </div>
                    <div className="min-w-0">
                      <span className="inline-flex rounded-md bg-ui-surface-subtle px-2 py-1 text-xs font-semibold text-ui-accent">{user.activationStage}</span>
                      <div className="mt-2 truncate text-xs text-ui-muted">
                        {user.lastActivityAt ? "Last active " + formatDate(user.lastActivityAt) : "No tracked activity"}
                      </div>
                      <div className="mt-1 truncate text-xs text-ui-muted">
                        {user.cookingGoals.length ? user.cookingGoals.map(formatLabel).join(", ") : user.cookingFrequency || "No onboarding goal"}
                      </div>
                    </div>
                    <div>
                      <div className="flex flex-wrap gap-1.5">
                        <UsageChip label="Events" value={user.events30} />
                        <UsageChip label="Capture" value={captureCount} />
                        <UsageChip label="Plan" value={user.mealPlans30} />
                        <UsageChip label="Shop" value={user.shoppingLists30} />
                        <UsageChip label="Cook" value={user.cookAttempts30} />
                        <UsageChip label="Version" value={user.promotedVersions30} />
                      </div>
                      <div className="mt-2 text-xs text-ui-muted">
                        First route: {user.firstCaptureMode ? formatLabel(user.firstCaptureMode) : "unset"}
                      </div>
                    </div>
                    <div className="min-w-0 text-sm text-ui-text">
                      {user.feedbackCount > 0 ? (
                        <>
                          <div className="font-medium text-ui-text">{user.feedbackCount} response{user.feedbackCount === 1 ? "" : "s"}</div>
                          {user.latestFeedback ? (
                            <div className="mt-1 text-xs leading-5 text-ui-muted">
                              {formatLabel(user.latestFeedback.stage)}
                              {user.latestFeedback.rating ? " - " + user.latestFeedback.rating + "/5" : ""}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-ui-muted">No feedback yet</span>
                      )}
                    </div>
                    <div>
                      <a
                        href={"mailto:" + user.email + "?subject=Mychelin%20pilot%20feedback"}
                        className="inline-flex items-center gap-2 rounded-lg border border-ui-border-strong px-3 py-2 text-sm font-semibold text-ui-text hover:bg-ui-surface-subtle"
                      >
                        <Mail size={15} />
                        Email
                      </a>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-ui-surface-subtle p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="h-28 animate-pulse rounded-lg bg-ui-surface-raised" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-36 animate-pulse rounded-lg bg-ui-surface-raised" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="h-80 animate-pulse rounded-lg bg-ui-surface-raised" />
          <div className="h-80 animate-pulse rounded-lg bg-ui-surface-raised" />
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/analytics", { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.detail || body.error || "Unable to load analytics");
      }
      setData(body as AnalyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load analytics");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const maxDailyEvents = useMemo(
    () => Math.max(...(data?.eventsByDay.map((day) => day.count) || [0]), 1),
    [data?.eventsByDay]
  );

  if (isLoading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <main className="min-h-screen bg-ui-surface-subtle px-4 py-10">
        <section className="mx-auto max-w-2xl rounded-lg border border-ui-border bg-ui-surface-raised p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ui-surface-subtle text-ui-accent">
            <ShieldCheck size={22} strokeWidth={1.8} />
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-ui-text">Analytics dashboard is protected</h1>
          <p className="mt-3 text-sm leading-6 text-ui-muted">
            {error || "Sign in with an admin account to view Mychelin product usage."}
          </p>
          <p className="mt-3 text-sm leading-6 text-ui-muted">
            Add your account email to <code className="rounded bg-ui-surface-subtle px-1.5 py-0.5">ANALYTICS_ADMIN_EMAILS</code> in
            Vercel to enable access.
          </p>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-ui-accent px-4 py-2 text-sm font-semibold text-ui-action-text hover:bg-ui-accent"
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ui-surface-subtle px-4 py-5 text-ui-text sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-lg border border-ui-border-strong bg-ui-night p-5 text-ui-action-text sm:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-ui-night-line bg-ui-night-raised px-3 py-1 text-xs font-medium text-ui-night-text">
                <ShieldCheck size={14} />
                Internal dashboard
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">Mychelin product usage</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ui-night-muted">
                Track activation, cooking rhythm, recipe capture, and pilot feedback without exposing private recipe content.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-lg border border-ui-night-line bg-ui-night-raised px-4 py-3 text-sm text-ui-night-muted">
                Updated <span className="font-medium text-ui-action-text">{formatDate(data.generatedAt)}</span>
              </div>
              <button
                type="button"
                onClick={() => void loadDashboard()}
                disabled={isRefreshing}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-ui-border-strong bg-ui-surface-raised px-4 py-3 text-sm font-semibold text-ui-text hover:bg-ui-surface-subtle disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Users" value={data.summary.totalUsers} detail={`${data.summary.newUsers30} new in 30 days`} />
          <StatCard icon={Activity} label="Active" value={data.summary.activeUsers7} detail={`${data.summary.activeUsers30} active in 30 days`} />
          <StatCard icon={ChefHat} label="Cooking loop" value={data.funnel.find((item) => item.id === "cook")?.users ?? 0} detail="Users with cook attempts" />
          <StatCard icon={MessageSquareText} label="Feedback" value={data.summary.feedbackCount} detail={data.summary.averageFeedbackRating ? `${data.summary.averageFeedbackRating}/5 average` : "No ratings yet"} />
        </section>

        <UserUsagePanel users={data.users} />

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border border-ui-border bg-ui-surface-raised p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ui-text">Activation funnel</h2>
                <p className="mt-1 text-sm text-ui-muted">User progression across the core homecooking loop.</p>
              </div>
              <BarChart3 className="text-ui-accent" size={21} />
            </div>
            <div className="mt-5 space-y-4">
              {data.funnel.map((step) => (
                <div key={step.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-ui-text">{step.label}</span>
                    <span className="tabular-nums text-ui-muted">
                      {step.users} users - {step.rate}%
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-ui-surface-subtle">
                    <div className="h-3 rounded-full bg-ui-accent" style={{ width: `${Math.max(3, step.rate)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-ui-border bg-ui-surface-raised p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ui-text">Last 14 days</h2>
                <p className="mt-1 text-sm text-ui-muted">{data.summary.totalEvents30} tracked events in 30 days.</p>
              </div>
              <Activity className="text-ui-accent" size={21} />
            </div>
            <div className="mt-5 flex h-56 items-end gap-2">
              {data.eventsByDay.map((day) => (
                <div key={day.day} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-md bg-ui-accent"
                    title={`${shortDate(day.day)}: ${day.count}`}
                    style={{ height: `${Math.max(4, Math.round((day.count / maxDailyEvents) * 190))}px` }}
                  />
                  <span className="w-full truncate text-center text-[11px] text-ui-muted">{shortDate(day.day)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-ui-border bg-ui-surface-raised p-5">
            <h2 className="text-lg font-semibold text-ui-text">Top events</h2>
            <div className="mt-4">
              <HorizontalBars items={data.eventCounts} />
            </div>
          </div>

          <div className="rounded-lg border border-ui-border bg-ui-surface-raised p-5">
            <h2 className="text-lg font-semibold text-ui-text">Recipe capture</h2>
            <p className="mt-1 text-sm text-ui-muted">{data.capture.total} capture or transcription events.</p>
            <div className="mt-5">
              <h3 className="mb-3 text-xs font-semibold text-ui-muted">Source</h3>
              <HorizontalBars items={data.capture.sources} />
            </div>
            <div className="mt-6">
              <h3 className="mb-3 text-xs font-semibold text-ui-muted">AI provider</h3>
              <HorizontalBars items={data.capture.providers} emptyLabel="Provider metadata has not been recorded yet" />
            </div>
          </div>

          <div className="rounded-lg border border-ui-border bg-ui-surface-raised p-5">
            <h2 className="text-lg font-semibold text-ui-text">Onboarding goals</h2>
            <p className="mt-1 text-sm text-ui-muted">
              {data.onboarding.completedUsers} completed - {data.onboarding.completionRate}% completion.
            </p>
            <div className="mt-5">
              <HorizontalBars items={data.onboarding.goals} emptyLabel="No onboarding goals captured yet" />
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div>
                <h3 className="mb-3 text-xs font-semibold text-ui-muted">Cooking rhythm</h3>
                <HorizontalBars items={data.onboarding.frequencies} />
              </div>
              <div>
                <h3 className="mb-3 text-xs font-semibold text-ui-muted">First capture mode</h3>
                <HorizontalBars items={data.onboarding.firstCaptureModes} />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-lg border border-ui-border bg-ui-surface-raised p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ui-text">Pilot feedback</h2>
                <p className="mt-1 text-sm text-ui-muted">Recent responses by stage.</p>
              </div>
              <Sparkles className="text-ui-accent" size={20} />
            </div>
            <div className="mt-5">
              <HorizontalBars items={data.feedback.byStage} emptyLabel="No pilot feedback yet" />
            </div>
            <div className="mt-5 space-y-3">
              {data.feedback.recent.slice(0, 6).map((feedback) => (
                <article key={feedback.id} className="rounded-lg border border-ui-border bg-ui-surface-raised p-3">
                  <div className="flex items-center justify-between gap-3 text-xs text-ui-muted">
                    <span className="font-medium">{formatLabel(feedback.stage)}</span>
                    <span>{formatDate(feedback.createdAt)}</span>
                  </div>
                  <div className="mt-2 text-sm text-ui-text">
                    {feedback.rating ? <span className="font-semibold">{feedback.rating}/5</span> : <span className="text-ui-muted">Unrated</span>}
                    {feedback.source ? <span className="text-ui-muted"> - {feedback.source}</span> : null}
                  </div>
                  {feedback.comment ? <p className="mt-2 text-sm leading-5 text-ui-text">{feedback.comment}</p> : null}
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-ui-border bg-ui-surface-raised p-5">
            <h2 className="text-lg font-semibold text-ui-text">Recent events</h2>
            <div className="mt-4 overflow-hidden rounded-lg border border-ui-border">
              <div className="grid grid-cols-[1fr_0.8fr_0.8fr] bg-ui-surface-subtle px-3 py-2 text-xs font-semibold text-ui-muted">
                <span>Event</span>
                <span>User</span>
                <span>Time</span>
              </div>
              <div className="divide-y divide-ui-border">
                {data.recentEvents.length === 0 ? (
                  <div className="px-3 py-6 text-sm text-ui-muted">No recent events yet.</div>
                ) : (
                  data.recentEvents.map((event) => (
                    <div key={event.id} className="grid grid-cols-[1fr_0.8fr_0.8fr] gap-3 px-3 py-3 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-ui-text">{formatLabel(event.eventName)}</div>
                        <div className="mt-0.5 truncate text-xs text-ui-muted">
                          {event.source || event.path || "app"}
                          {event.recipeId ? ` - recipe ${event.recipeId}` : ""}
                          {event.mealPlanId ? ` - meal ${event.mealPlanId}` : ""}
                        </div>
                      </div>
                      <span className="truncate text-ui-muted">{event.userId ? `User ${event.userId}` : "Anonymous"}</span>
                      <span className="text-ui-muted">{formatDate(event.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
