import { sql } from "drizzle-orm";
import { db } from "@/db";
import { waitlist } from "@/db/schema";
import { ensureWaitlistTable } from "@/db/ensure-schema";

export const dynamic = "force-dynamic";

async function fetchCount(): Promise<number> {
  try {
    await ensureWaitlistTable();
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(waitlist);
    return rows[0]?.count ?? 0;
  } catch {
    return 0;
  }
}

export async function WaitlistCount() {
  const count = await fetchCount();

  // Avoid "4 people are waiting" awkwardness. Show a neutral line until
  // the number is large enough to be its own social proof.
  if (count <= 50) {
    return (
      <p className="text-sm text-neutral-500">
        Built for Singapore families. Invites rolling out weekly.
      </p>
    );
  }

  const formatted = new Intl.NumberFormat("en-SG").format(count);
  return (
    <p className="text-sm text-neutral-500">
      Joining <span className="font-medium text-neutral-700">{formatted}</span>{" "}
      Singapore families preserving their recipes.
    </p>
  );
}
