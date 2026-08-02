// DOM-to-PNG export helper shared by the in-app Cooking Card and the
// public shared recipe card.
//
// Renders a full-width clone of the node, not the live element:
// scrollable regions are expanded to natural width (via
// [data-export-expand] markers), interactive artifacts are stripped
// (via [data-export-hide]), and the clone is painted on-screen behind
// the app — off-screen positioning renders blank on mobile Safari, and
// opacity:0 / visibility:hidden produce empty captures.

export async function exportNodeToPng(input: {
  node: HTMLElement;
  fileName: string;
  backgroundColor?: string;
  pixelRatio?: number;
}): Promise<void> {
  const { node, fileName, backgroundColor = "#fffdfb", pixelRatio = 2 } = input;

  const clone = node.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("[data-export-hide]").forEach((el) => el.remove());
  const expandEl = node.querySelector<HTMLElement>("[data-export-expand]");
  if (expandEl) {
    const cloneExpandEl = clone.querySelector<HTMLElement>("[data-export-expand]");
    if (cloneExpandEl) cloneExpandEl.style.overflow = "visible";
  }
  // Keep the live column sizing but expand to the content's full scroll
  // width — an unconstrained width would let fr tracks balloon.
  const extraChrome = node.clientWidth - (expandEl?.clientWidth ?? node.clientWidth);
  clone.style.width = `${Math.max(node.clientWidth, (expandEl?.scrollWidth ?? 0) + extraChrome)}px`;
  clone.style.maxWidth = "none";

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "0";
  host.style.top = "0";
  host.style.zIndex = "-1";
  host.style.pointerEvents = "none";
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(clone, { pixelRatio, backgroundColor });
    const link = document.createElement("a");
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  } finally {
    host.remove();
  }
}
