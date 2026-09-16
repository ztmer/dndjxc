import assert from "node:assert/strict";
import { isAllowedKbImageSrc, parseKbRichText } from "../src/lib/kb-rich-text";
import { calcSubnet, isPrivateIpv4, normalizeMac, parseNeighborTable, parseScanCidr, sanitizePingTarget } from "../src/lib/net-tools";

assert.equal(isAllowedKbImageSrc("/knowledge/printer-paper-path.svg"), true);
assert.equal(isAllowedKbImageSrc("/knowledge/ip-segments.svg"), true);
assert.equal(isAllowedKbImageSrc("https://evil.test/x.png"), false);
assert.equal(isAllowedKbImageSrc("/knowledge/../secret.svg"), false);
assert.equal(isAllowedKbImageSrc("/api/knowledge-images/abcdefabcdefabcdefabcdef"), true);

const blocks = parseKbRichText("先看图\n![走纸](/knowledge/printer-paper-path.svg)\n再处理卡纸");
assert.equal(blocks.some((b) => b.type === "image" && b.src === "/knowledge/printer-paper-path.svg"), true);
assert.equal(blocks.filter((b) => b.type === "text").length >= 1, true);

const bad = parseKbRichText("![x](javascript:alert(1))");
assert.equal(bad.every((b) => b.type === "text"), true);

assert.equal(sanitizePingTarget("192.168.1.1"), "192.168.1.1");
assert.equal(sanitizePingTarget("ping 1.1.1.1"), null);
assert.equal(sanitizePingTarget("-n"), null);
assert.equal(sanitizePingTarget("--help"), null);
assert.equal(sanitizePingTarget("gw.office.local"), "gw.office.local");

assert.equal(isPrivateIpv4("192.168.10.1"), true);
assert.equal(isPrivateIpv4("8.8.8.8"), false);
assert.equal(normalizeMac("AA-BB-CC-DD-EE-FF"), "aa:bb:cc:dd:ee:ff");
const neigh = parseNeighborTable("192.168.10.1 dev eth0 lladdr aa:bb:cc:dd:ee:ff REACHABLE\n8.8.8.8 dev eth0 lladdr 11:22:33:44:55:66 REACHABLE");
assert.equal(neigh.get("192.168.10.1"), "aa:bb:cc:dd:ee:ff");
assert.equal(neigh.has("8.8.8.8"), false);
const badCidr = parseScanCidr("8.8.8.0/24");
assert.equal(badCidr.ok, false);
const goodCidr = parseScanCidr("192.168.10.0/24");
assert.equal(goodCidr.ok, true);
if (goodCidr.ok) assert.equal(goodCidr.hosts.length, 254);

const sub = calcSubnet("192.168.10.20", "24");
assert.equal(sub.ok, true);
if (sub.ok) {
  assert.equal(sub.network, "192.168.10.0");
  assert.equal(sub.broadcast, "192.168.10.255");
  assert.equal(sub.gatewayHint, "192.168.10.1");
  assert.equal(sub.hostCount, 254);
}

console.log("kb-net checks ok");
