(function () {
  "use strict";
  function limit(completed = window.GameState.data.story.completed) {
    return window.GameData.config.upgrades.limits.reduce((maximum, entry) => completed.includes(entry.chapterId) ? Math.max(maximum, entry.maximum) : maximum, 0);
  }
  function quote(instanceId) {
    const item = window.Items.getInstance(instanceId);
    if (!item) return { ok: false, message: "装備が見つかりません。" };
    const level = item.upgradeLevel || 0, maximum = limit(), next = level + 1;
    const base = window.Items.template(item.templateId);
    const gold = window.GameData.config.upgrades.goldPerTierAndLevel * Math.max(1, base.tier || 1) * next;
    const materials = { iron_ore: Math.ceil(next / 2) };
    if (next >= 4) materials.magic_stone = 1;
    if (next >= 6) materials.star_shard = 1;
    const before = window.Items.effects(item), preview = { ...item, upgradeLevel: next }, after = window.Items.effects(preview);
    const knownSkills = new Set(window.EquipmentSkills.ids(item));
    const addedSkills = window.EquipmentSkills.ids(preview).filter(id => !knownSkills.has(id)).map(id => window.GameData.equipmentSkills[id]).filter(Boolean);
    const result = { instanceId, level, next, maximum, gold, materials, before, after, addedSkills };
    if (level >= maximum) return { ...result, ok: false, message: maximum ? `現在の強化上限は＋${maximum}です。物語を進めると上限が増えます。` : "序章を達成すると装備強化が解放されます。" };
    const owner = window.Items.equippedBy(instanceId);
    if (owner && window.GameState.data.expeditions.some(entry => entry?.partyIds.includes(owner.id))) return { ...result, ok: false, message: "探索中の仲間の装備は、帰還後に強化してください。" };
    if (window.GameState.data.gold < gold || !Object.entries(materials).every(([id, quantity]) => window.Items.count(id) >= quantity)) return { ...result, ok: false, message: "素材または所持金が足りません。" };
    return { ...result, ok: true, message: "強化可能です。" };
  }
  function enhance(instanceId, expectedLevel) {
    const result = quote(instanceId);
    if (!result.ok) return result;
    if (expectedLevel !== result.level) return { ok: false, message: "強化段階が変わりました。内容を確認し直してください。" };
    Object.entries(result.materials).forEach(([id, quantity]) => window.Items.remove(id, quantity));
    window.GameState.data.gold -= result.gold;
    const item = window.Items.getInstance(instanceId);
    item.upgradeLevel = result.next;
    const name = window.Items.displayName(item);
    const learned = result.addedSkills.length ? ` ${result.addedSkills.map(skill => `「${skill.name}」`).join("、")}を得ました。` : "";
    window.GameState.addLog(`${name}へ強化しました。${learned}`, "success");
    window.GameState.save();
    return { ok: true, message: `${name}へ強化しました。${learned}`, addedSkills: result.addedSkills };
  }
  window.Upgrades = { limit, quote, enhance };
})();
