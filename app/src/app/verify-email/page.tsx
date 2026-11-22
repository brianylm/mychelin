import { VerifyEmailClient } from "@/components/auth/VerifyEmailClient";

interface VerifyEmailPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Opening this page changes nothing. Mail scanners pre-open links, so the
// token is only redeemed when the person presses "Confirm my email", which
// POSTs to /api/auth/verify-email. No sign-in needed: the link is the proof.
export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const raw = params.token;
  const token = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  return <VerifyEmailClient token={token} />;
}
