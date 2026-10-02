const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map(), listeners = {}, nodes = new Map();
function element(classes = [], dataset = {}, parent = null) {
  return {
    dataset, parent, disabled: false, innerHTML: "", textContent: "",
    classList: { contains: name => classes.includes(name), toggle() {} },
    closest(selector) {
      for (let node = this; node; node = node.parent) {
        if (selector === "[data-action]" && node.dataset.action) return node;
        if (selector === ".modal" && node.classList.contains("modal")) return node;
      }
      return null;
    },
    querySelectorAll: () => [], addEventListener() {}
  };
}
const document = {
  addEventListener(type, handler) { listeners[type] = handler; },
  getElementById(id) { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); },
  querySelectorAll: () => []
};
const context = vm.createContext({ window: {}, document, console, Date, Math, Blob,
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0,
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
});
const scripts = Array.from(fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g), match => match[1]).filter(file => file !== "js/main.js");
for (const file of scripts) vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
const game = context.window, modalRoot = document.getElementById("modal-root");
const equipmentScrollSurface = { scrollTop: 0, addEventListener() {} };
let modalHtml = "";
Object.defineProperty(modalRoot, "innerHTML", {
  configurable: true,
  get() { return modalHtml; },
  set(value) { modalHtml = value; equipmentScrollSurface.scrollTop = 0; }
});
modalRoot.querySelector = selector => selector === ".equipment-modal" && modalHtml.includes("equipment-modal") ? equipmentScrollSurface : null;
game.UI.init();
const uiSource = fs.readFileSync(path.join(root, "js/ui.js"), "utf8");
assert(!uiSource.includes('onclick="event.stopPropagation()"'), "No modal may block the delegated document click listener");
const backdrop = element(["modal-backdrop"], { action: "close-modal" });
const dialog = element(["modal"], {}, backdrop);
async function click(action, data = {}, inDialog = false, disabled = false) {
  const button = element([], { action, ...data }, inDialog ? dialog : null);
  button.disabled = disabled;
  await listeners.click({ target: element([], {}, button) });
}
async function run() {
  assert((await game.GameClient.execute("recruitment.post", { jobId: "warrior" })).ok);
  const candidate = game.Recruitment.state().pending.candidates.find(member => member.jobId === "warrior");
  const hired = await game.GameClient.execute("recruitment.hire", { applicantId: candidate.id, name: "UI試験" });
  assert(hired.ok);
  for (const instance of ["item-1", "item-2"]) {
    await click("open-equipment", { character: hired.id });
    assert(modalRoot.innerHTML.includes('data-action="equip-instance"'));
    const open = modalRoot.innerHTML;
    await listeners.click({ target: element([], {}, dialog) });
    assert.strictEqual(modalRoot.innerHTML, open, "Dialog content must not inherit backdrop close");
    await click("equip-instance", { character: hired.id, instance }, true, true);
    assert.strictEqual(game.Characters.get(hired.id).equipment.includes(instance), false);
    equipmentScrollSurface.scrollTop = 640;
    await click("equip-instance", { character: hired.id, instance }, true);
    assert.strictEqual(game.Characters.get(hired.id).equipment.includes(instance), true);
    assert.strictEqual(equipmentScrollSurface.scrollTop, 640, "Equipment change should restore the modal scroll position after rendering");
    assert(modalRoot.innerHTML.includes("タップして確認・外す"), "Equipment picker stays open for consecutive changes");
    assert(modalRoot.innerHTML.includes("equipment-persistent-weight") && modalRoot.innerHTML.includes("equipment-change-notice") && modalRoot.innerHTML.includes("装備："), "Equipment picker should keep weight visible and show an in-place change summary");
  }
  const saved = JSON.parse(storage.get(game.SaveSystem.exportKey));
  assert.strictEqual(saved.characters[0].equipment[0], "item-1");
  assert.strictEqual(saved.characters[0].equipment[1], "item-2");
  await click("unequip", { character: hired.id, instance: "item-1" });
  assert.strictEqual(game.Characters.get(hired.id).equipment.join(","), "item-2");
  assert((await game.GameClient.execute("equipment.equip", { characterId: hired.id, instanceId: "item-1" })).ok);
  await click("request-unequip-all", { character: hired.id }, true);
  assert(modalRoot.innerHTML.includes("装備をすべて外しますか？") && modalRoot.innerHTML.includes("装備中の2点"), "Bulk unequip should require an explicit confirmation");
  await click("cancel-unequip-all", {}, true);
  assert(modalRoot.innerHTML.includes(`${game.Characters.get(hired.id).name}の装備`) && game.Characters.get(hired.id).equipment.length === 2, "Cancelling bulk unequip should return to the unchanged equipment screen");
  await click("request-unequip-all", { character: hired.id }, true);
  await click("confirm-unequip-all", {}, true);
  assert.strictEqual(game.Characters.get(hired.id).equipment.length, 0, "Confirmed bulk unequip should atomically remove every item");
  assert(modalRoot.innerHTML.includes("装備を一括解除（2点）") && modalRoot.innerHTML.includes("装備中 0点"), "Bulk unequip should return to the equipment screen with an in-place change summary");
  const before = JSON.stringify(game.GameState.data);
  await click("reset-save");
  await click("close-modal", {}, true);
  assert.strictEqual(modalRoot.innerHTML, "");
  assert.strictEqual(JSON.stringify(game.GameState.data), before, "Cancel must not reset data");
  await click("reset-save");
  await listeners.click({ target: backdrop });
  assert.strictEqual(modalRoot.innerHTML, "");
  assert.strictEqual(JSON.stringify(game.GameState.data), before, "Backdrop must only close");
  await click("reset-save");
  await click("confirm-reset", {}, true);
  assert.strictEqual(game.GameState.data.characters.length, 0);
  assert.strictEqual(game.GameState.data.gold, 500);
  assert.strictEqual(game.GameState.data.inventory.equipment.length, 2);
  assert.strictEqual(modalRoot.innerHTML, "");
  assert.strictEqual(JSON.parse(storage.get(game.SaveSystem.exportKey)).characters.length, 0);
  assert(game.SaveTransfer.parse(storage.get(game.SaveSystem.exportKey)).ok);
  console.log("Modal actions test passed: document-delegated nested clicks, weapon/armor equip and persistence, disabled buttons, content/backdrop/cancel behavior, confirmed reset and saved fresh state");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
