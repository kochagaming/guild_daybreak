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
async function click(action, data = {}) {
  const button = { dataset: { action, ...data }, disabled: false, classList: { contains: () => false } };
  await listeners.click({ target: { closest: selector => selector === "[data-action]" ? button : null } });
}
async function post() {
  for (const field of game.GameData.recruitment.fields) node("recruit-" + field.id).value = field.id === "jobId" ? "warrior" : "any";
  const button = { disabled: false };
  await listeners.submit({ target: { id: "recruitment-form", querySelector: () => button }, preventDefault() {} });
  assert(!button.disabled);
}
async function run() {
  game.UI.init(); game.UI.navigate("characters");
  assert(node("app").innerHTML.includes("募集費用") && node("app").innerHTML.includes("ギルド印章"));
  assert(node("app").innerHTML.includes("recruitment-requirement-preview") && node("app").innerHTML.includes("希望が通った場合"));
  game.GameState.data.inventory.materials.guild_seal = 30;
  const gold = game.GameState.data.gold;
  await post();
  assert(modal().includes("演出をスキップ") && modal().includes("募集状を開封"));
  assert(modal().includes("reveal-stars") && modal().includes("reveal-gate-crown") && modal().includes(`${game.Recruitment.state().pending.candidates.length}つの気配を確認`));
  const pending = JSON.stringify(game.Recruitment.state().pending), saved = storage.get(game.SaveSystem.exportKey);
  assert(game.SaveTransfer.parse(saved).ok);
  assert.strictEqual(JSON.stringify(JSON.parse(saved).recruitment.pending), pending, "The draw is saved before presentation");
  const nextId = game.Recruitment.state().nextId;
  await post(); assert.strictEqual(game.Recruitment.state().nextId, nextId, "Duplicate submissions cannot reroll");
  advance(2199); assert(modal().includes("演出をスキップ"));
  advance(1); assert(modal().includes("全員の詳細を比較する") && modal().includes("reveal-applicants") && modal().includes("reveal-confetti"));
  assert(modal().includes("ADVENTURER REGISTRY") && modal().includes("APPLICATION 1"));
  assert(modal().includes('data-action="quick-hire-applicant"') && modal().includes("reveal-stats"));
  for (const label of ["HP", "物攻", "物防", "魔攻", "魔防", "回復", "命中", "回避", "速度", "回数", "会心", "重量", "物威力", "魔威力", "技威力", "回復力"]) assert(modal().includes(`<small>${label}</small>`));
  assert(modal().includes("横にスライドして全能力を表示") && modal().includes('tabindex="0"'));
  for (const applicant of game.Recruitment.state().pending.candidates) assert(modal().includes(applicant.name) && modal().includes(game.GameData.jobs[applicant.jobId].name));
  assert.strictEqual(JSON.stringify(game.Recruitment.state().pending), pending); assert.strictEqual(game.GameState.data.gold, gold);
  await click("recruitment-reveal"); assert.strictEqual(modal(), "");
  assert(node("app").innerHTML.includes("応募者の選考"));
  assert.strictEqual(JSON.stringify(game.Recruitment.state().pending), pending);
  assert(game.Recruitment.dismiss().ok);
  await post(); const skipped = JSON.stringify(game.Recruitment.state().pending);
  await click("recruitment-reveal");
  assert(modal().includes("instant-reveal") && modal().includes("全員の詳細を比較する"));
  assert.strictEqual(JSON.stringify(game.Recruitment.state().pending), skipped);
  await click("recruitment-reveal"); advance(10000); assert.strictEqual(modal(), "");
  assert(game.Recruitment.dismiss().ok); await post();
  const interrupted = JSON.stringify(game.Recruitment.state().pending);
  game.UI.navigate("home"); advance(10000); assert.strictEqual(modal(), "");
  game.UI.navigate("characters");
  assert.strictEqual(JSON.stringify(game.Recruitment.state().pending), interrupted);
  assert(!modal().includes("recruitment-reveal"), "Reloading the selection view does not reroll or replay");
  assert(game.Recruitment.dismiss().ok);
  game.matchMedia = () => ({ matches: true }); await post();
  assert(modal().includes("instant-reveal") && !modal().includes("演出をスキップ"));
  const reduced = JSON.stringify(game.Recruitment.state().pending);
  node("modal-root").onkeydown({ key: "Escape", preventDefault() {} });
  assert.strictEqual(modal(), ""); assert.strictEqual(JSON.stringify(game.Recruitment.state().pending), reduced);
  assert(game.Recruitment.dismiss().ok);
  game.matchMedia = () => ({ matches: false }); await post(); advance(2200);
  const quickRecruitmentId = game.Recruitment.state().pending.id;
  const quickApplicant = game.Recruitment.state().pending.candidates[0];
  await click("quick-hire-applicant", { applicant: quickApplicant.id });
  assert(modal().includes("QUICK HIRE") && modal().includes("このまま雇用") && modal().includes(`雇用費 ${game.Recruitment.cost(quickApplicant)}G`) && !modal().includes('id="hire-form"'));
  await click("confirm-quick-hire", { applicant: quickApplicant.id });
  assert.strictEqual(game.Recruitment.state().pending, null);
  assert(game.GameState.data.characters.some(character => character.recruitmentId === quickRecruitmentId));
  failSave = true;
  await post(); failSave = false;
  assert.strictEqual(game.Recruitment.state().pending, null); assert.strictEqual(modal(), "", "Failed save never starts a reveal");
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
  console.log("Recruitment reveal test passed: gate animation timing, staged cards, quick hire, detailed comparison, saved-before-animation results, skip, reduced motion and rollback");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
