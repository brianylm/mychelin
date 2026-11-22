// SSRF guard for server-side fetches of user-supplied URLs.
// Edge runtime has no DNS API, so this only judges the literal host. A public
// hostname that resolves to a private IP (DNS rebinding) is NOT caught here.

function parseIpv4Part(part: string): number | null {
  if (part === "") return null;
  let radix = 10;
  let digits = part;
  if (/^0x/i.test(part)) {
    radix = 16;
    digits = part.slice(2);
    if (digits === "") return 0;
  } else if (part.length > 1 && part.startsWith("0")) {
    radix = 8;
    digits = part.slice(1);
  }
  const valid =
    radix === 16 ? /^[0-9a-f]+$/i : radix === 8 ? /^[0-7]+$/ : /^[0-9]+$/;
  if (!valid.test(digits)) return null;
  const n = parseInt(digits, radix);
  return Number.isFinite(n) ? n : null;
}

// Parses dotted/decimal/octal/hex IPv4 (inet_aton rules). Null if not IPv4-like.
function parseIpv4(host: string): number | null {
  const parts = host.split(".");
  if (parts.length > 4) return null;
  const nums: number[] = [];
  for (const p of parts) {
    const n = parseIpv4Part(p);
    if (n === null) return null;
    nums.push(n);
  }
  const last = nums[nums.length - 1];
  const lead = nums.slice(0, -1);
  if (lead.some((n) => n > 255)) return null;
  if (last >= 256 ** (5 - nums.length)) return null;
  let value = last;
  lead.forEach((n, i) => {
    value += n * 256 ** (3 - i);
  });
  return value;
}

function isBlockedIpv4(value: number): boolean {
  const a = Math.floor(value / 2 ** 24);
  const b = Math.floor(value / 2 ** 16) % 256;
  const c = Math.floor(value / 2 ** 8) % 256;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && c === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true; // multicast, reserved, broadcast
  return false;
}

function parseIpv6(host: string): number[] | null {
  // Returns 8 16-bit groups, or null if invalid.
  let h = host;
  const zone = h.indexOf("%");
  if (zone >= 0) h = h.slice(0, zone);
  const v4 = h.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const ip = parseIpv4(v4[2]);
    if (ip === null) return null;
    h = `${v4[1]}${Math.floor(ip / 65536).toString(16)}:${(ip % 65536).toString(16)}`;
  }
  const halves = h.split("::");
  if (halves.length > 2) return null;
  const toGroups = (s: string) => (s === "" ? [] : s.split(":"));
  const head = toGroups(halves[0]);
  const tail = halves.length === 2 ? toGroups(halves[1]) : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null;
  const all = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  const out: number[] = [];
  for (const g of all) {
    if (!/^[0-9a-f]{1,4}$/i.test(g)) return null;
    out.push(parseInt(g, 16));
  }
  return out.length === 8 ? out : null;
}

function isBlockedIpv6(host: string): boolean {
  const g = parseIpv6(host);
  if (!g) return true; // unparseable: refuse
  if (g.every((x) => x === 0)) return true; // ::
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true; // ::1
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10
  if ((g[0] & 0xff00) === 0xff00) return true; // multicast
  // ::ffff:a.b.c.d (mapped) and ::a.b.c.d (compatible)
  if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) {
    return isBlockedIpv4(g[6] * 65536 + g[7]);
  }
  // 64:ff9b::/96 NAT64 embedding
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) {
    return isBlockedIpv4(g[6] * 65536 + g[7]);
  }
  return false;
}

const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home.arpa"];

export function isBlockedHost(hostname: string): boolean {
  let host = hostname.trim().toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  if (host.endsWith(".")) host = host.slice(0, -1);
  if (!host) return true;

  if (host.includes(":")) return isBlockedIpv6(host);

  if (host === "localhost" || host === "home.arpa") return true;
  if (BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) return true;

  // Anything made only of digits/dots/hex-ish parts could be an IPv4 encoding.
  const labels = host.split(".");
  const last = labels[labels.length - 1];
  if (/^(0x[0-9a-f]*|\d+)$/i.test(last)) {
    const ip = parseIpv4(host);
    // Numeric last label that is not a valid IPv4 is never a real public host.
    return ip === null ? true : isBlockedIpv4(ip);
  }

  if (labels.length < 2) return true; // bare single-label host
  return false;
}

export function isSafeFetchUrl(url: URL): boolean {
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (url.port !== "") {
    // URL normalizes default ports to "", so any remaining port is non-default.
    if (url.port !== "80" && url.port !== "443") return false;
  }
  return !isBlockedHost(url.hostname);
}
