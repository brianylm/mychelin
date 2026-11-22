import { describe, expect, it } from "vitest";
import { isBlockedHost, isSafeFetchUrl } from "./safe-url";

describe("isBlockedHost", () => {
  it.each([
    "localhost", "foo.localhost", "printer.local", "db.internal", "nas.lan",
    "x.home.arpa", "intranet", "localhost.",
    "0.0.0.0", "10.1.2.3", "100.64.0.1", "100.127.255.255", "127.0.0.1",
    "127.1", "169.254.169.254", "172.16.0.1", "172.31.255.255", "192.168.1.1",
    "192.0.0.5", "198.18.0.1", "198.19.255.255", "224.0.0.1", "240.0.0.1",
    "255.255.255.255",
    "2130706433", "0x7f000001", "017700000001", "0177.0.0.1", "0x7f.1",
    "2852039166",
    "[::]", "[::1]", "[fc00::1]", "[fd12:3456::1]", "[fe80::1]",
    "[::ffff:127.0.0.1]", "[::ffff:7f00:1]", "[::ffff:169.254.169.254]",
    "::1",
  ])("blocks %s", (h) => {
    expect(isBlockedHost(h)).toBe(true);
  });

  it.each([
    "example.com", "www.seriouseats.com", "8.8.8.8", "1.1.1.1",
    "100.63.255.255", "172.32.0.1", "198.20.0.1", "[2606:4700::1111]",
    "[::ffff:8.8.8.8]",
  ])("allows %s", (h) => {
    expect(isBlockedHost(h)).toBe(false);
  });
});

describe("isSafeFetchUrl", () => {
  it("accepts public http/https on default or 80/443", () => {
    expect(isSafeFetchUrl(new URL("https://example.com/r"))).toBe(true);
    expect(isSafeFetchUrl(new URL("http://example.com:80/r"))).toBe(true);
    expect(isSafeFetchUrl(new URL("https://example.com:443/r"))).toBe(true);
  });
  it("rejects other ports, schemes, credentials and encoded loopback", () => {
    expect(isSafeFetchUrl(new URL("https://example.com:8443/"))).toBe(false);
    expect(isSafeFetchUrl(new URL("ftp://example.com/"))).toBe(false);
    expect(isSafeFetchUrl(new URL("https://u:p@example.com/"))).toBe(false);
    expect(isSafeFetchUrl(new URL("http://2130706433/"))).toBe(false);
    expect(isSafeFetchUrl(new URL("http://0x7f000001/"))).toBe(false);
    expect(isSafeFetchUrl(new URL("http://[::ffff:7f00:1]/"))).toBe(false);
  });
});
