"use client";

import { useState, type RefObject } from "react";
import { Copy, ImageDown } from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface CookingCardExportProps {
  targetRef: RefObject<HTMLDivElement | null>;
  markdown: string;
  fileSlug: string;
  recipeId: number;
}

function trackCardEvent(eventName: string, recipeId: number) {
  // Fire-and-forget; analytics must never block or break export.
  void fetch("/api/usage-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName, recipeId }),
  }).catch(() => {});
}

// PNG + copy-markdown export for the Cooking Card. PNG goes through
// html-to-image (dynamically imported); if it fails (fonts/CORS) the
// copy action is the always-works fallback (packet trap-check).
export function CookingCardExport({ targetRef, markdown, fileSlug, recipeId }: CookingCardExportProps) {
  const { addToast } = useToast();
  const [exporting, setExporting] = useState(false);

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      addToast("Recipe copied", "success");
      trackCardEvent("cooking_card_export_copy", recipeId);
    } catch {
      addToast("Couldn't copy to clipboard", "error");
    }
  };

  const exportPng = async () => {
    const node = targetRef.current;
    if (!node || exporting) return;
    setExporting(true);
    // Render a full-width clone, not the live card: the live grid sits in
    // a horizontal scroller, so capturing it directly would clip all but
    // the visible viewport (and include the scrollbar and action
    // buttons). The clone expands the scroll container to natural width
    // and strips interactive artifacts; the watermark stays.
    const clone = node.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("[data-export-hide]").forEach((el) => el.remove());
    const expandEl = node.querySelector<HTMLElement>("[data-export-expand]");
    if (expandEl) {
      const cloneExpandEl = clone.querySelector<HTMLElement>("[data-export-expand]");
      if (cloneExpandEl) cloneExpandEl.style.overflow = "visible";
    }
    // Keep the live column sizing but expand to the grid's full scroll
    // width — an unconstrained width would let fr tracks balloon.
    const extraChrome = node.clientWidth - (expandEl?.clientWidth ?? node.clientWidth);
    clone.style.position = "absolute";
    clone.style.left = "-10000px";
    clone.style.top = "0";
    clone.style.width = `${Math.max(node.clientWidth, (expandEl?.scrollWidth ?? 0) + extraChrome)}px`;
    clone.style.maxWidth = "none";
    document.body.appendChild(clone);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(clone, {
        pixelRatio: 2,
        backgroundColor: "#fffdfb",
      });
      const link = document.createElement("a");
      link.download = `mychelin-${fileSlug}-card.png`;
      link.href = dataUrl;
      link.click();
      addToast("Card image downloaded", "success");
      trackCardEvent("cooking_card_export_png", recipeId);
    } catch (err) {
      console.error("PNG export failed:", err);
      addToast("PNG export failed — use Copy recipe instead", "error");
    } finally {
      clone.remove();
      setExporting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={exportPng}
        disabled={exporting}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-ui-border bg-ui-surface px-3 text-xs font-semibold text-ui-text transition-colors hover:border-ui-accent/30 hover:text-ui-accent disabled:opacity-50"
      >
        <ImageDown className="h-4 w-4" aria-hidden="true" />
        {exporting ? "Exporting…" : "Export PNG"}
      </button>
      <button
        type="button"
        onClick={copyMarkdown}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-ui-border bg-ui-surface px-3 text-xs font-semibold text-ui-text transition-colors hover:border-ui-accent/30 hover:text-ui-accent"
      >
        <Copy className="h-4 w-4" aria-hidden="true" />
        Copy recipe
      </button>
    </>
  );
}
