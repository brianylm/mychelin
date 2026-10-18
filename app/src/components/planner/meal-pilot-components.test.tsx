import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MealCalendarStatus } from "./MealCalendarStatus";
import { MealPlanningFields } from "./MealPlanningFields";
import { MealComposerDialog } from "./MealComposerDialog";
import { MealSourceBadge } from "./MealSourceBadge";
import { StationAssignmentFields } from "./StationAssignmentFields";

import type { CalendarStatusResponse } from "@/lib/meal-calendar/types";

type Connection = NonNullable<CalendarStatusResponse["connection"]>;

const activeConnection: Connection = {
  status: "active",
  googleAccountEmail: "family-calendar@example.com",
  calendarId: "synthetic-calendar-id",
  calendarTimezone: "Asia/Singapore",
  lastSyncedAt: "2026-03-01T02:30:00.000Z",
  lastError: null,
  watchExpiresAt: null,
};

function calendarStatus(
  overrides: Partial<CalendarStatusResponse> = {},
): CalendarStatusResponse {
  return {
    configured: true,
    scope: { type: "household", id: 1 },
    canManage: false,
    connection: activeConnection,
    ...overrides,
  };
}

function renderCalendar(
  status: CalendarStatusResponse | null,
  options: { loading?: boolean; busy?: boolean; error?: string | null } = {},
): string {
  return renderToStaticMarkup(
    <MealCalendarStatus
      status={status}
      loading={options.loading}
      busy={options.busy}
      error={options.error ?? null}
      onConnect={() => {}}
      onDisconnect={() => {}}
      onShare={() => {}}
      onRefresh={() => {}}
    />,
  );
}

function tagWithId(html: string, tag: string, id: string): string {
  const match = html.match(
    new RegExp(`<${tag}\\b[^>]*\\bid="${id}"[^>]*>`),
  );
  if (!match) throw new Error(`no <${tag}> with id="${id}" in: ${html}`);
  return match[0];
}

describe("MealSourceBadge", () => {
  it("shows a visible label for every meal source", () => {
    expect(renderToStaticMarkup(<MealSourceBadge source="fresh" />)).toContain("Cook fresh");
    expect(renderToStaticMarkup(<MealSourceBadge source="fridge" />)).toContain("Ready — fridge");
    expect(renderToStaticMarkup(<MealSourceBadge source="frozen" />)).toContain("Ready — frozen");
  });
});

describe("MealPlanningFields", () => {
  const baseProps = {
    idPrefix: "plan",
    diners: "4",
    serveTime: "18:30",
    durationMinutes: "",
    onChange: () => {},
  };

  it("describes an invalid timing override with the rendered error element, not the absent help", () => {
    const html = renderToStaticMarkup(
      <MealPlanningFields
        {...baseProps}
        durationMinutes="10"
        timingError="Cooking time is shorter than the longest dish."
      />,
    );

    const input = tagWithId(html, "input", "plan-duration-minutes");
    expect(input).toContain('aria-invalid="true"');
    expect(input).toContain('aria-describedby="plan-duration-minutes-error"');
    expect(input).not.toContain("plan-duration-minutes-help");
    expect(html).not.toContain('id="plan-duration-minutes-help"');
    expect(html).toContain('id="plan-duration-minutes-error"');
    expect(html).toContain("Cooking time is shorter than the longest dish.");
  });

  it("labels the normal timing override and points at its help text", () => {
    const html = renderToStaticMarkup(<MealPlanningFields {...baseProps} />);

    const input = tagWithId(html, "input", "plan-duration-minutes");
    expect(input).toContain('aria-describedby="plan-duration-minutes-help"');
    expect(input).not.toContain("aria-invalid");
    expect(html).toContain("Cooking time override (minutes)");
    expect(html).toContain('id="plan-duration-minutes-help"');
    expect(html).toContain(
      "Leave blank to use the longest fresh recipe plus 15 minutes.",
    );
  });

  it("shows the composer's suggested diners as a placeholder while the value is empty", () => {
    const html = renderToStaticMarkup(
      <MealComposerDialog
        open
        purpose="create"
        date="2026-10-18"
        mealType="dinner"
        recipes={[]}
        batches={[]}
        onClose={() => {}}
        onSubmit={() => {}}
      />,
    );

    const input = tagWithId(html, "input", "meal-composer-diners");
    expect(input).toContain('placeholder="2"');
    expect(input).toContain('value=""');
  });
});

describe("StationAssignmentFields", () => {
  const baseProps = {
    idPrefix: "meal-42",
    stationName: "",
    startOffsetMinutes: "",
    durationMinutes: "",
    onChange: () => {},
  };

  it("scopes the appliance datalist to the id prefix", () => {
    const html = renderToStaticMarkup(<StationAssignmentFields {...baseProps} />);

    expect(tagWithId(html, "input", "meal-42-station")).toContain(
      'list="meal-42-station-list"',
    );
    expect(tagWithId(html, "datalist", "meal-42-station-list")).toBeTruthy();
    for (const appliance of [
      "Stove A",
      "Stove B",
      "Oven",
      "Microwave",
      "Rice cooker",
      "Slow cooker",
      "Air fryer",
    ]) {
      expect(html).toContain(`<option value="${appliance}"`);
    }
  });

  it("renders every station input as disabled when disabled", () => {
    const html = renderToStaticMarkup(
      <StationAssignmentFields {...baseProps} disabled />,
    );

    for (const id of [
      "meal-42-station",
      "meal-42-station-offset",
      "meal-42-station-duration",
    ]) {
      expect(tagWithId(html, "input", id)).toMatch(/disabled(=|>|\s)/);
    }
  });
});

describe("MealCalendarStatus", () => {
  it("offers a retry instead of a checking placeholder when an error arrives without a status", () => {
    const html = renderCalendar(null, { error: "Could not reach Google Calendar." });

    expect(html).toContain("Retry");
    expect(html).not.toContain("Checking shared calendar");
  });

  it("shows the setup message without connect or setup internals when unconfigured", () => {
    const html = renderCalendar(
      calendarStatus({
        configured: false,
        canManage: true,
        connection: null,
        setup: { missing: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] },
      }),
    );

    expect(html).toContain("Calendar connection needs setup.");
    expect(html).toContain("Your meal plan is still available.");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("Connect Google Calendar");
    expect(html).not.toContain("GOOGLE_CLIENT_ID");
    expect(html).not.toContain("GOOGLE_CLIENT_SECRET");
    expect(html).not.toContain("missing");
  });

  it("lets a household admin connect a disconnected calendar and tells others to ask", () => {
    const disconnected = calendarStatus({
      canManage: true,
      connection: { ...activeConnection, status: "disconnected" },
    });
    expect(renderCalendar(disconnected)).toContain("Connect Google Calendar");

    const memberHtml = renderCalendar({
      ...disconnected,
      canManage: false,
    });
    expect(memberHtml).not.toContain("Connect Google Calendar");
    expect(memberHtml).toContain(
      "Ask a household admin to connect the shared calendar.",
    );
  });

  it("offers a non-admin the calendar view but no disconnect on an active connection", () => {
    const html = renderCalendar(calendarStatus());

    expect(html).toContain("Add calendar to my view");
    expect(html).not.toContain("Disconnect");
  });

  it("redacts HTML and secret query values on a paused connection and only admins reconnect", () => {
    const paused: Partial<CalendarStatusResponse> = {
      canManage: true,
      connection: {
        ...activeConnection,
        status: "paused",
        lastError:
          "Sync failed <script>alert('x')</script> access_token=SUPERSECRET123",
      },
    };
    const html = renderCalendar(calendarStatus(paused));

    expect(html).toContain("access_token=[hidden]");
    expect(html).toContain("Sync failed");
    expect(html).not.toContain("SUPERSECRET123");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("&lt;script&gt;");
    expect(html).toContain("Reconnect");

    const memberHtml = renderCalendar(
      calendarStatus({ ...paused, canManage: false }),
    );
    expect(memberHtml).not.toContain("Reconnect");
    expect(memberHtml).not.toContain("<button");
  });

  it("never renders household share emails", () => {
    const html = renderCalendar(
      calendarStatus({
        connection: {
          ...activeConnection,
          shares: [
            { userId: 11, email: "synthetic-one@example.com", status: "active" },
            { userId: 12, email: "synthetic-two@example.com", status: "pending" },
          ],
        },
      }),
    );

    expect(html).not.toContain("synthetic-one@example.com");
    expect(html).not.toContain("synthetic-two@example.com");
  });
});
