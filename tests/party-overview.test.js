const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map(), nodes = new Map(), listeners = {};
let now = 1700000000000, tick;
function node(id) {
  if (!nodes.has(id)) nodes.set(id, { innerHTML: "", textContent: "", value: "1", classList: { toggle() {} }, querySelectorAll: () => [], addEventListener() {} });
  return nodes.get(id);
}
const document = { getElementById: node, querySelector: node, querySelectorAll: () => [], addEventListener(type, handler) { listeners[type] = handler; } };
const context = vm.createContext({ window: {}, document, Date, Math, Blob, console, setTimeout: () => 0, clearTimeout() {}, setInterval: handler => { tick = handler; return 0; },
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (file === "js/main.js") continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => now, random: () => .5 });
}
const game = context.window;
const html = () => node("app").innerHTML;
async function click(action, data = {}) {
  const button = { dataset: { action, ...data }, classList: { contains: () => false } };
  await listeners.click({ target: { closest: () => button } });
}
function row(index) {
  const match = html().match(new RegExp('<article class="party-overview-row[^>]*data-party-overview="' + index + '"[\\s\\S]*?</article>'));
  assert(match, "Every party has an overview row"); return match[0];
}
document.querySelectorAll = selector => {
  if (selector === "[data-countdown]") return [0, 1].filter(index => html().includes('data-countdown="' + index + '"')).map(index => {
    const timer = node("timer-" + index); timer.dataset = { countdown: String(index) }; return timer;
  });
  if (selector === "[data-expedition]") return [0, 1].filter(index => html().includes('data-expedition="' + index + '"')).map(index => {
    const expedition = node("expedition-" + index); expedition.dataset = { expedition: String(index) };
    expedition.querySelector = key => {
      if (key === "[data-overview-percent]") return node("percent-" + index);
      const progress = node("progress-" + index); progress.style = progress.style || {}; return progress;
    };
    return expedition;
  });
  return [];
};
async function run() {
  game.UI.init(); game.UI.navigate("party");
  assert(row(0).includes("未編成") && row(1).includes("未解放"));
  assert(!row(1).includes("data-action"), "Locked party cannot be opened");
  const a = require("./helpers").createCharacter(game, "鉱石収集隊").id;
  const b = require("./helpers").createCharacter(game, "洞窟攻略隊", "mage").id;
  game.Characters.get(a).level = 30; game.Characters.get(b).level = 30;
  require("./helpers").completeThrough(game, "seal");
  game.GameState.data.unlockedPartyCount = 2;
  game.Party.toggle(a, 0); game.Party.toggle(b, 1);
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "meadow", partyIndex: 0 })).ok);
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "cave", partyIndex: 1 })).ok);
  game.UI.render();
  assert(html().includes("2/2隊が探索中"));
  assert(row(0).includes("草原") && row(0).includes("鉱石収集隊") && row(0).includes('data-countdown="0"'));
  assert(row(1).includes("洞窟") && row(1).includes("洞窟攻略隊") && row(1).includes('data-countdown="1"'));
  assert(!html().includes("expedition-banner"), "Do not duplicate the selected party banner");
  now += 15000; await tick();
  assert.strictEqual(node("timer-0").textContent, "00:15"); assert.strictEqual(node("timer-1").textContent, "00:45");
  assert.strictEqual(node("progress-0").style.width, "50%"); assert.strictEqual(node("progress-1").style.width, "25%");
  assert.strictEqual(node("percent-0").textContent, 50); assert.strictEqual(node("percent-1").textContent, 25);
  await click("party-open", { party: "1", view: "adventure" });
  assert.strictEqual(game.Party.selected(), 1); assert(html().includes("PARTY 2") && html().includes("DEPARTURE PARTY") && !html().includes("PARTY STATUS"));
  now += 15000; await tick();
  await click("party-back");
  assert(row(0).includes("攻略成功") && row(0).includes("is-last-success") && row(0).includes(game.GameData.dungeons.meadow.name));
  game.GameState.data.partyResults[0].drops = [
    { itemId: "wooden_sword", quantity: 1, displayName: "上質な木の剣", qualityId: "fine" },
    { itemId: "iron_ore", quantity: 3 }
  ];
  game.UI.render();
  assert(row(0).includes("EXP +") && row(0).includes("装備 1点") && row(0).includes("上質な木の剣") && row(0).includes("素材 3個") && row(0).includes("鉄鉱石×3"));
  assert(row(1).includes("探索中") && row(1).includes('data-countdown="1"'));
  assert.strictEqual(game.Party.selected(), 1, "A different party's return must not change the selected party");
  assert(html().includes("1/2隊が探索中"));
  await click("party-open", { party: "0", view: "results" });
  assert.strictEqual(game.Party.selected(), 0); assert(html().includes("第1パーティの直近の探索結果"));
  const firstGold = game.GameState.data.gold;
  await tick(); assert.strictEqual(game.GameState.data.gold, firstGold, "Viewing results does not collect duplicate rewards");
  now += 30000; await tick();
  await click("party-back");
  assert(row(0).includes("攻略成功") && row(1).includes("攻略成功"));
  assert(!html().includes("data-countdown") && html().includes("0/2隊が探索中"));
  game.GameState.data.partyResults[0].success = false; game.UI.render();
  assert(row(0).includes("撤退") && row(0).includes("is-last-failure") && row(0).includes('fleet-result-mark failure'));
  await click("party-open", { party: "1", view: "formation" });
  assert.strictEqual(game.Party.selected(), 1); assert(html().includes("メンバー編成") && html().includes("パーティ一覧"));
  await click("party-open", { party: "0", view: "invalid" }); assert.strictEqual(game.Party.selected(), 1);
  game.UI.navigate("home"); assert(!html().includes("PARTY STATUS"));
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
  console.log("Party overview test passed: all-party status/destinations/members, lock/empty states, live dual timers/progress, direct task links, background return, results isolation and once-only rewards");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
