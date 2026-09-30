(function () {
  "use strict";

  function state() { return window.GameState.data.autoSell; }
  function validRule(rule) {
    if (!rule || typeof rule.id !== "string" || !/^auto-sell-[1-9]\d*$/.test(rule.id)
      || typeof rule.stackKey !== "string" || !rule.stackKey.length || rule.stackKey.length > 2000
      || typeof rule.templateId !== "string" || !window.GameData.items[rule.templateId]
      || window.GameData.items[rule.templateId].type === "material"
      || typeof rule.displayName !== "string" || !rule.displayName.length || rule.displayName.length > 200) return false;
    try {
      const identity = JSON.parse(rule.stackKey);
      return Array.isArray(identity) && identity[0] === rule.templateId;
    } catch (_) { return false; }
  }
  function matchesRule(instance, rule) {
    return validRule(rule) && window.Items.stackKey(instance) === rule.stackKey;
  }
  function matchingRule(instance, source) {
    const config = state(), base = window.Items.template(instance.templateId);
    if (!config.enabled || source !== "drop" || !base || base.unique || instance.ultraRareTitleId || instance.locked || (instance.upgradeLevel || 0) > 0 || window.Items.equippedBy(instance.id)) return null;
    return config.rules.find(rule => matchesRule(instance, rule)) || null;
  }
  function addRule(input) {
    const config = state();
    const instance = window.Items.getInstance(input.instanceId);
    if (!instance) return { ok: false, message: "登録する装備が見つかりません。" };
    const base = window.Items.template(instance.templateId);
    if (!base || base.unique) return { ok: false, message: "ボス固有装備は自動売却へ登録できません。" };
    if (instance.ultraRareTitleId) return { ok: false, message: "超レア称号付き装備は自動売却へ登録できません。" };
    const stackKey = window.Items.stackKey(instance);
    if (config.rules.some(rule => rule.stackKey === stackKey)) return { ok: false, message: "同じ性能の装備はすでに登録されています。" };
    const rule = {
      id: `auto-sell-${config.nextId++}`,
      stackKey,
      templateId: instance.templateId,
      displayName: window.Items.displayName(instance)
    };
    config.rules.push(rule);
    window.GameState.save();
    return { ok: true, message: `${rule.displayName}と同じ性能の装備を自動売却へ登録しました。`, rule };
  }
  function removeRule(ruleId) {
    const config = state(), index = config.rules.findIndex(rule => rule.id === ruleId);
    if (index < 0) return { ok: false, message: "自動売却の登録が見つかりません。" };
    const [removed] = config.rules.splice(index, 1);
    window.GameState.save();
    return { ok: true, message: `${removed.displayName}の自動売却登録を解除しました。` };
  }
  function setEnabled(enabled) {
    if (typeof enabled !== "boolean") return { ok: false, message: "自動売却設定が正しくありません。" };
    state().enabled = enabled;
    window.GameState.save();
    return { ok: true, message: `自動売却を${enabled ? "有効" : "無効"}にしました。` };
  }
  function ruleForStack(stackKey) { return state().rules.find(rule => rule.stackKey === stackKey) || null; }
  function stackQuote(key) {
    const instances = window.Items.equipmentList().filter(instance => window.Items.stackKey(instance) === key && !instance.locked && !window.Items.equippedBy(instance.id));
    return { instances, count: instances.length, gold: instances.reduce((sum, instance) => sum + window.Items.sellValue(instance), 0) };
  }
  function sellStack(key) {
    const quote = stackQuote(key);
    if (!quote.count) return { ok: false, message: "売却できる未装備品がありません。" };
    quote.instances.forEach(instance => window.Items.sell(instance.id));
    return { ok: true, message: `${quote.count}点を${quote.gold}Gでまとめて売却しました。`, count: quote.count, gold: quote.gold };
  }

  window.AutoSell = { state, validRule, matchesRule, matchingRule, addRule, removeRule, setEnabled, ruleForStack, stackQuote, sellStack };
})();
