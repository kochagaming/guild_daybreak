const assert = require("assert");
const { getAccessUrls } = require("../tools/dev-server");

const urls = getAccessUrls(8091, {
  Ethernet: [
    { address: "192.168.11.2", family: "IPv4", internal: false },
    { address: "fe80::1", family: "IPv6", internal: false }
  ],
  WiFi: [
    { address: "10.0.0.5", family: 4, internal: false },
    { address: "192.168.11.2", family: "IPv4", internal: false }
  ],
  Loopback: [{ address: "127.0.0.1", family: "IPv4", internal: true }]
});

assert.strictEqual(urls.pc, "http://127.0.0.1:8091/");
assert.deepStrictEqual(urls.mobile, [
  "http://192.168.11.2:8091/",
  "http://10.0.0.5:8091/"
]);

assert.deepStrictEqual(getAccessUrls(8091, {}).mobile, []);

console.log("dev-server tests passed");
