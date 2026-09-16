import { guessDeviceFromUa, homeForDevice } from "../src/lib/auth-shared.ts";

const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const android = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36";
const win = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const ipad = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const wechatAndroid = "Mozilla/5.0 (Linux; Android 13; ALN-AL00 Build/HUAWEI) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/172.0.0.0 Safari/537.36 MicroMessenger/8.0.56";

const checks = [
  ["iphone→phone", guessDeviceFromUa(iphone) === "phone"],
  ["android mobile→phone", guessDeviceFromUa(android) === "phone"],
  ["wechat android no Mobile→phone", guessDeviceFromUa(wechatAndroid) === "phone"],
  ["windows→desktop", guessDeviceFromUa(win) === "desktop"],
  ["ipad→desktop", guessDeviceFromUa(ipad) === "desktop"],
  ["phone next /customers → /m/customers", homeForDevice("phone", "/customers") === "/m/customers"],
  ["phone next /builds/new → /m/builds/new", homeForDevice("phone", "/builds/new") === "/m/builds/new"],
  ["desktop next /m/builds → /builds", homeForDevice("desktop", "/m/builds") === "/builds"],
  ["desktop next /m → /", homeForDevice("desktop", "/m") === "/"],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed++;
}
if (failed) {
  console.error(`GATE_C_DEVICE_FAIL count=${failed}`);
  process.exit(1);
}
console.log("GATE_C_DEVICE_OK");
