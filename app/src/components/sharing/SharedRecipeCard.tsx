"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Flame, ImageDown, Timer, Wand2 } from "lucide-react";
import type { SharedRecipeDTO } from "@/lib/shared-recipe";
import { HEAT_CONFIG } from "@/lib/instruction-heat";
import { buildCookingCardLayout } from "@/lib/cooking-card-layout";
import { coverPhoto, generatedVariantOf } from "@/lib/recipe-photo-display";
import { exportNodeToPng } from "@/lib/export-node-png";

interface SharedRecipeCardProps {
  recipe: SharedRecipeDTO;
  // The public share URL — used for the signup CTA and the PNG's
  // printed link. Token is needed for the beautify call.
  shareToken: string;
}

function formatMinutes(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

// The public shareable recipe card: painterly hero image (auto-painted
// on first view), the cooking-card table (static — no interactivity),
// and a signup CTA that also survives PNG export. Progressive
// enhancement throughout: no photos → no hero; beautify fails →
// original photo stays.
export function SharedRecipeCard({ recipe, shareToken }: SharedRecipeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [painting, setPainting] = useState(false);
  const [paintedUrl, setPaintedUrl] = useState<string | null>(null);

  const cover = useMemo(
    () => coverPhoto(recipe.photos, recipe.imageUrl),
    [recipe.photos, recipe.imageUrl]
  );
  const existingVariant = useMemo(
    () => (cover ? generatedVariantOf(recipe.photos, cover.id) : null),
    [recipe.photos, cover]
  );

  const heroUrl = paintedUrl ?? existingVariant?.blobUrl ?? cover?.blobUrl ?? null;

  // Auto-beautify the cover photo on first view (idempotent server-side).
  useEffect(() => {
    if (!cover || existingVariant || paintedUrl || painting) return;
    setPainting(true);
    void fetch(`/api/share/${shareToken}/beautify`, { method: "POST" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.status === "ready" && typeof body.photoUrl === "string") {
          setPaintedUrl(body.photoUrl);
        }
      })
      .catch(() => {})
      .finally(() => setPainting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cover?.id]);

  const layout = useMemo(
    () =>
      buildCookingCardLayout({
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        scale: 1,
      }),
    [recipe.ingredients, recipe.instructions]
  );

  const times: string[] = [
    formatMinutes(recipe.prepTime) ? `Prep ${formatMinutes(recipe.prepTime)}` : null,
    formatMinutes(recipe.cookTime) ? `Cook ${formatMinutes(recipe.cookTime)}` : null,
  ].filter((t): t is string => Boolean(t));

  const saveAsImage = async () => {
    const node = cardRef.current;
    if (!node || exporting) return;
    setExporting(true);
    try {
      const slug = recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "recipe";
      await exportNodeToPng({ node, fileName: `mychelin-${slug}.png` });
    } catch (err) {
      console.error("Shared card export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div ref={cardRef} className="overflow-hidden rounded-2xl border border-ui-border bg-ui-surface-raised shadow-sm">
      {/* Hero */}
      {heroUrl && (
        <div className="relative">
          <img src={heroUrl} alt={recipe.title} className="h-56 w-full object-cover sm:h-72" />
          {painting && (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-[11px] font-medium text-white">
              <Wand2 className="h-3 w-3" aria-hidden="true" />
              Painting the dish…
            </span>
          )}
          {(existingVariant || paintedUrl) && (
            <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-medium text-white">
              AI illustration
            </span>
          )}
        </div>
      )}

      <div className="p-4 sm:p-5">
        {/* Title + meta */}
        <h1 className="app-editorial-title text-2xl leading-tight text-ui-text sm:text-3xl">
          {recipe.title}
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-ui-muted">
          {recipe.cuisine && (
            <span className="rounded-full bg-ui-accent/10 px-2 py-0.5 font-semibold text-ui-accent">
              {recipe.cuisine}
            </span>
          )}
          {recipe.yield && <span>Serves {recipe.yield}</span>}
          {times.map((t) => (
            <span key={t} className="inline-flex items-center gap-1">
              <Timer className="h-3 w-3" aria-hidden="true" />
              {t}
            </span>
          ))}
        </div>
        {recipe.description && (
          <p className="mt-2 text-sm leading-6 text-ui-muted">{recipe.description}</p>
        )}

        {/* Cooking-card table (static) */}
        {layout.hasInstructions && (
          <div className="mt-4 overflow-x-auto" data-export-expand>
            <div
              className="grid w-fit min-w-full gap-px rounded-xl bg-ui-border"
              style={{
                gridTemplateColumns: `minmax(88px, 120px) repeat(${layout.steps.length}, minmax(96px, 1fr))`,
              }}
            >
              <div className="sticky left-0 z-10 bg-ui-surface-raised p-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ui-muted">
                Ingredients
              </div>
              {layout.steps.map((step) => (
                <div key={step.stepNumber} className="bg-ui-surface-raised p-2">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ui-accent text-[10px] font-bold text-white">
                      {step.stepNumber}
                    </span>
                    <span className="text-xs font-semibold leading-4 text-ui-text">{step.title}</span>
                  </div>
                  {(step.heat || step.timerText) && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {step.heat && HEAT_CONFIG[step.heat] && (
                        <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${HEAT_CONFIG[step.heat].className}`}>
                          <Flame className="h-2.5 w-2.5" aria-hidden="true" />
                          {HEAT_CONFIG[step.heat].shortLabel}
                        </span>
                      )}
                      {step.timerText && (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-ui-warning/25 bg-ui-warning-soft px-1.5 py-0.5 text-[9px] font-semibold text-ui-warning-text">
                          <Timer className="h-2.5 w-2.5" aria-hidden="true" />
                          {step.timerText}
                        </span>
                      )}
                    </div>
                  )}
                  <p className="mt-1 text-[10px] leading-4 text-ui-muted">{step.text}</p>
                </div>
              ))}

              {layout.rows.map((row, rowIndex) => (
                <Fragment key={rowIndex}>
                  <div className="sticky left-0 z-10 flex min-h-11 items-center bg-ui-surface-raised p-2">
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-ui-text">{row.name}</span>
                      {row.amount && (
                        <span className="block truncate text-[10px] text-ui-muted">{row.amount}</span>
                      )}
                    </span>
                  </div>
                  {layout.steps.map((step) => (
                    <div key={step.stepNumber} className="flex items-center justify-center bg-ui-surface-raised">
                      {step.matchedRowIndexes.includes(rowIndex) && (
                        <span className="h-2 w-2 rounded-full bg-ui-accent" aria-hidden="true" />
                      )}
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Signup CTA — also appears in the exported PNG */}
        <div className="mt-5 rounded-xl border border-ui-accent/20 bg-ui-accent/5 px-4 py-3 text-center">
          <p className="text-sm font-semibold text-ui-text">
            Cook this at home — save it free on Mychelin
          </p>
          <a
            href={`/?signup=1&returnTo=/shared/${shareToken}`}
            className="mt-1 inline-block text-xs font-medium text-ui-accent underline underline-offset-2"
          >
            mychelin-sg.vercel.app
          </a>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[9px] text-ui-muted/70">made with Mychelin</span>
          <button
            type="button"
            onClick={saveAsImage}
            disabled={exporting}
            data-export-hide
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-ui-border bg-ui-surface px-3 text-[11px] font-semibold text-ui-text transition-colors hover:border-ui-accent/30 hover:text-ui-accent disabled:opacity-50"
          >
            <ImageDown className="h-3.5 w-3.5" aria-hidden="true" />
            {exporting ? "Saving…" : "Save as image"}
          </button>
        </div>
      </div>
    </div>
  );
}
