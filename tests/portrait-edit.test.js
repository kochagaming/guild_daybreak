const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map(), listeners = {}, nodes = new Map(), timers = new Map();
let now = 1700000000000, timerId = 0, failSave = false;
function node(id) {
  if (!nodes.has(id)) nodes.set(id, { innerHTML: "", textContent: "", classList: { toggle() {} }, querySelectorAll: () => [], addEventListener() {} });
  return nodes.get(id);
}
const document = { getElementById: node, querySelector: node, querySelectorAll: () => [], addEventListener(type, handler) { listeners[type] = handler; } };
const context = vm.createContext({ window: {}, document, Date, Math, Blob, console,
  setTimeout: (callback, delay) => { timers.set(++timerId, { callback, at: now + delay }); return timerId; }, clearTimeout: id => timers.delete(id), setInterval: () => 0,
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { if (failSave) throw Error("full"); storage.set(key, value); }, removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (file === "js/main.js") continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => now, random: () => .5 });
}
const game = context.window, modal = () => node("modal-root").innerHTML;
function advance(ms) {
  now += ms;
  for (const [id, task] of [...timers]) if (task.at <= now) { timers.delete(id); task.callback(); }
}
async function run() {
  game.UI.init();
  assert((await game.GameClient.execute("recruitment.post", { jobId: "warrior" })).ok);
  const applicant = game.Recruitment.state().pending.candidates[0];
  const review = { dataset: { action: "review-applicant", applicant: applicant.id }, classList: { contains: () => false } };
  await listeners.click({ target: { closest: selector => selector === "[data-action]" ? review : null } });
  assert(modal().includes("hire-form") && !modal().includes("character-portrait"), "Hiring must not offer portrait selection");
  assert(!(await game.GameClient.execute("recruitment.hire", { applicantId: applicant.id, portraitId: "archer" })).ok);
  const hire = await game.GameClient.execute("recruitment.hire", { applicantId: applicant.id }); assert(hire.ok);
  assert.strictEqual(game.Characters.get(hire.id).portraitId, applicant.portraitId);
  game.UI.navigate("party"); node("modal-root").innerHTML = "";
  const equipment = { dataset: { action: "open-equipment", character: hire.id }, classList: { contains: () => false } };
  await listeners.click({ target: { closest: selector => selector === "[data-action]" ? equipment : null } });
  assert(modal().includes('data-portrait-character="' + hire.id + '"') && modal().includes("編成へ"));
  node("modal-root").innerHTML = "";
  const avatar = { dataset: { portraitCharacter: hire.id }, isConnected: true };
  const target = { closest: selector => selector === "[data-portrait-character]" ? avatar : null };
  const pointer = { target, pointerId: 1, button: 0, isPrimary: true, clientX: 20, clientY: 20 };
  listeners.pointerdown(pointer); advance(599); assert.strictEqual(modal(), "");
  listeners.pointerup(pointer); advance(1); assert.strictEqual(modal(), "");
  const party = JSON.stringify(game.GameState.data.parties[0]);
  await listeners.click({ target }); assert.strictEqual(JSON.stringify(game.GameState.data.parties[0]), party);
  listeners.pointerdown(pointer); listeners.pointermove({ ...pointer, clientX: 40 }); advance(600); assert.strictEqual(modal(), "");
  listeners.pointerdown(pointer); listeners.pointercancel(pointer); advance(600); assert.strictEqual(modal(), "");
  listeners.pointerdown(pointer); listeners.scroll(); advance(600); assert.strictEqual(modal(), "");
  listeners.pointerdown({ ...pointer, button: 2 }); advance(600); assert.strictEqual(modal(), "");
  listeners.pointerdown(pointer); advance(600); assert(modal().includes("portrait-form") && modal().includes("portrait-options"));
  assert(modal().includes("職業画像") && modal().includes("種族画像") && modal().includes("生まれ画像") && modal().includes("物語人物") && modal().includes("全151種類") && (modal().match(/name="character-portrait"/g) || []).length === 151);
  assert(modal().includes("data-portrait-query") && modal().includes("data-portrait-type") && modal().includes('data-action="portrait-page"'));
  assert.strictEqual((modal().match(/class="portrait-option"/g) || []).length, 151);
  assert.strictEqual((modal().match(/class="portrait-option"[^>]*hidden/g) || []).length, 136, "Only 15 portraits should be visible on the initial page");
  const before = JSON.stringify(game.Characters.stats(game.Characters.get(hire.id)));
  const saveButton = { disabled: false };
  const form = { id: "portrait-form", dataset: { character: hire.id }, querySelector: selector => selector.startsWith("input") ? { value: "archer" } : saveButton };
  await listeners.submit({ target: form, preventDefault() {} });
  assert.strictEqual(modal(), ""); assert.strictEqual(game.Characters.get(hire.id).portraitId, "archer");
  assert.strictEqual(JSON.stringify(game.Characters.stats(game.Characters.get(hire.id))), before);
  assert.strictEqual(JSON.parse(storage.get(game.SaveSystem.exportKey)).characters[0].portraitId, "archer");
  assert(game.SaveTransfer.parse(storage.get(game.SaveSystem.exportKey)).ok);
  assert(!(await game.GameClient.execute("character.portrait", { characterId: hire.id, portraitId: "missing" })).ok);
  failSave = true; assert(!(await game.GameClient.execute("character.portrait", { characterId: hire.id, portraitId: "knight" })).ok); failSave = false;
  assert.strictEqual(game.Characters.get(hire.id).portraitId, "archer");
  game.Party.toggle(hire.id); assert(game.Dungeon.start("meadow").ok);
  const snapshot = JSON.stringify(game.GameState.data.expeditions[0].partySnapshot);
  assert((await game.GameClient.execute("character.portrait", { characterId: hire.id, portraitId: "knight" })).ok);
  assert.strictEqual(JSON.stringify(game.GameState.data.expeditions[0].partySnapshot), snapshot, "An appearance change must not alter an active expedition");
  listeners.keydown({ target, key: "Enter", preventDefault() {} }); assert(modal().includes("portrait-form"));
  node("modal-root").innerHTML = ""; game.UI.navigate("home");
  listeners.pointerdown(pointer); advance(600); assert.strictEqual(modal(), "");
  game.UI.navigate("party"); listeners.pointerdown(pointer); avatar.isConnected = false; advance(600); assert.strictEqual(modal(), "");
  let opened = 0, prevented = false, stopped = false;
  const gestures = {};
  game.PortraitPress.bind({ addEventListener(type, handler) { gestures[type] = handler; } }, () => opened++, () => true);
  avatar.isConnected = true;
  gestures.pointerdown(pointer); advance(600);
  gestures.click({ preventDefault() { prevented = true; }, stopImmediatePropagation() { stopped = true; } });
  assert.strictEqual(opened, 1); assert(prevented && stopped, "The release click after a long press is consumed");
  console.log("Portrait edit test passed: fixed hire portrait, party-only hold/keyboard edits, early release/movement/cancel/scroll guards, no party toggle, save and cosmetic-only effects, validation and rollback");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
