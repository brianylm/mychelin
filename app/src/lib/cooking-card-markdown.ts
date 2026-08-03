import type { CardIngredientRow, CardStep } from "./cooking-card-layout";

// Markdown summary of a recipe for the Cooking Card "Copy recipe"
// action — clean pasting into WhatsApp, notes, or chat.

export function recipeToMarkdown(input: {
  title: string;
  cuisine?: string | null;
  servingsLine?: string | null;
  rows: CardIngredientRow[];
  steps: CardStep[];
}): string {
  const { title, cuisine, servingsLine, rows, steps } = input;
  const lines: string[] = [`# ${title}`];

  const meta = [
    cuisine ? `Cuisine: ${cuisine}` : null,
    servingsLine ?? null,
  ].filter(Boolean);
  if (meta.length > 0) {
    lines.push("", meta.join(" · "));
  }

  if (rows.length > 0) {
    lines.push("", "## Ingredients");
    for (const row of rows) {
      lines.push(`- ${row.amount ? `${row.amount} ` : ""}${row.name}`);
    }
  }

  // The synthetic final "Combine all" column is a card-only visual — it is
  // not a recipe step, so it must not appear in the copied markdown.
  const realSteps = steps.filter((step) => !step.combine);

  if (realSteps.length > 0) {
    lines.push("", "## Steps");
    realSteps.forEach((step, index) => {
      // When no action verb was extracted, the title is just a
      // truncation of the text — print the full text, not both.
      const titleCore = step.title.replace(/…$/, "");
      const isTruncatedTitle = step.text.startsWith(titleCore);
      const body = !isTruncatedTitle && step.text ? ` — ${step.text}` : "";
      const timer =
        step.timerText && !step.text.includes(step.timerText)
          ? ` (${step.timerText})`
          : "";
      lines.push(`${index + 1}. ${isTruncatedTitle ? step.text : step.title}${body}${timer}`);
    });
  }

  return lines.join("\n");
}
