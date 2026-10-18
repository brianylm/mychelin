import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { books, shareLinks } from "@/db/schema";
import { getSharedRecipeDTO, listSharedBookRecipeCards } from "@/lib/shared-recipe";

export const runtime = "edge";
export const preferredRegion = "hnd1";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
};

const FALLBACK_DESCRIPTION = "A family recipe shared on Mychelin.";
const FALLBACK_IMAGE = "/images/hero-family-table-mobile.jpg";

// Recipe photos are multi-megabyte originals, which WhatsApp drops from link
// previews. Route them through the image optimizer at preview size instead.
function previewImage(url: string | null | undefined): string {
  if (!url) return FALLBACK_IMAGE;
  return `/_next/image?url=${encodeURIComponent(url)}&w=1200&q=75`;
}

function clip(text: string | null | undefined): string {
  const flat = text?.replace(/\s+/g, " ").trim();
  if (!flat) return FALLBACK_DESCRIPTION;
  return flat.length > 160 ? `${flat.slice(0, 157).trimEnd()}…` : flat;
}

function previewMetadata(title: string, description: string, image: string): Metadata {
  return {
    title: `${title} · Mychelin`,
    description,
    openGraph: {
      type: "article",
      siteName: "Mychelin",
      title,
      description,
      images: [{ url: image, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

// Link previews (WhatsApp, Telegram, iMessage) show only what the public
// share page already shows: title, description and photo. Never the owner.
export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  try {
    const { token } = await params;
    const [link] = await db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.token, token))
      .limit(1);
    if (!link) return {};

    if (link.resourceType === "recipe") {
      const recipe = await getSharedRecipeDTO(link.resourceId);
      if (!recipe) return {};
      const photo = recipe.imageUrl ?? recipe.photos[0]?.blobUrl;
      return previewMetadata(recipe.title, clip(recipe.description), previewImage(photo));
    }

    if (link.resourceType === "book") {
      const book = await db.query.books.findFirst({ where: eq(books.id, link.resourceId) });
      if (!book) return {};
      const cards = await listSharedBookRecipeCards(book.id);
      const photo = cards.find((card) => card.imageUrl)?.imageUrl;
      return previewMetadata(
        book.title,
        clip(book.description ?? "A family recipe book shared on Mychelin."),
        previewImage(photo)
      );
    }
  } catch (error) {
    console.error("shared link metadata error:", error);
  }
  return {};
}

export default function SharedLayout({ children }: LayoutProps) {
  return children;
}
