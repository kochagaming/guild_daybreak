(function () {
  "use strict";
  const config = () => window.GameData.facilities;
  function definition(id) { return config().definitions[id] || null; }
  function saved(id) { return window.GameState.data.facilities[id]; }
  function unlocked(id) { const facility = definition(id); return Boolean(facility && (!facility.unlockAfter || window.GameState.data.story.completed.includes(facility.unlockAfter))); }
  function sync(now = window.GameRuntime.now()) {
    let changed = false;
    config().order.forEach(id => {
      const state = saved(id);
      if (state && unlocked(id) && state.activatedAt == null) {
        state.activatedAt = now; state.startedAt = now; state.storedDuration = 0; state.gold = 0; state.materials = {}; state.bonusProgress = {};
        changed = true;
      }
    });
    return changed;
  }
  function level(id, trackId) { return saved(id).levels[trackId]; }
  function entry(id, trackId, targetLevel) { return definition(id).upgrades[trackId][(targetLevel || level(id, trackId)) - 1]; }
  function upgradeCapacity(id, state = window.GameState.data) {
    const facility = definition(id), capacity = config().upgradeCapacity || { base: 0, perCompletedMainChapter: 1 };
    if (!facility || !state.facilities?.[id]) return null;
    const chapters = window.GameData.storyChapters.filter(chapter => Number(chapter.number) >= 1 && chapter.kind !== "postgame").sort((a, b) => a.order - b.order);
    const completed = chapters.filter(chapter => state.story.completed.includes(chapter.id));
    const total = config().trackOrder.reduce((sum, trackId) => sum + Math.max(0, facility.upgrades[trackId].length - 1), 0);
    const maximum = Math.min(total, (capacity.base || 0) + completed.length * (capacity.perCompletedMainChapter || 1));
    const used = config().trackOrder.reduce((sum, trackId) => sum + Math.max(0, state.facilities[id].levels[trackId] - 1), 0);
    return { id, used, maximum, remaining: Math.max(0, maximum - used), total, nextChapter: maximum < total ? chapters.find(chapter => !state.story.completed.includes(chapter.id)) || null : null };
  }
  function profile(id) {
    const production = entry(id, "production"), storage = entry(id, "storage"), speed = entry(id, "speed");
    return { id, production, capacityMs: storage.duration, intervalMs: speed.interval };
  }
  function stableRoll(key) {
    let hash = 2166136261;
    for (let index = 0; index < key.length; index++) {
      hash ^= key.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967296;
  }
  function addRewards(id, target, cycles, production, storedProgress, startedAt, intervalMs) {
    const rewards = production.rewards || {}, materials = { ...(target.materials || {}) }, bonusProgress = { ...(storedProgress || {}) };
    Object.entries(rewards.materials || {}).forEach(([itemId, amount]) => { materials[itemId] = (materials[itemId] || 0) + amount * cycles; });
    (production.chanceRewards || []).forEach(bonus => {
      let hits = 0;
      for (let cycle = 1; cycle <= cycles; cycle++) {
        const completedAt = startedAt + cycle * intervalMs;
        if (stableRoll(`${id}:${bonus.id}:${completedAt}`) < bonus.chance) hits++;
      }
      if (hits) materials[bonus.itemId] = (materials[bonus.itemId] || 0) + hits * bonus.quantity;
    });
    (production.periodicRewards || []).forEach(periodic => {
      const progress = (bonusProgress[periodic.id] || 0) + cycles;
      const completed = Math.floor(progress / periodic.everyCycles);
      bonusProgress[periodic.id] = progress % periodic.everyCycles;
      if (completed) materials[periodic.itemId] = (materials[periodic.itemId] || 0) + completed * periodic.quantity;
    });
    return { gold: (target.gold || 0) + (rewards.gold || 0) * cycles, materials, bonusProgress };
  }
  function quote(id, now = window.GameRuntime.now()) {
    const facility = definition(id), state = saved(id);
    if (!facility || !state || !unlocked(id) || state.activatedAt == null) return null;
    const current = profile(id), elapsed = Math.max(0, now - state.startedAt), freeDuration = Math.max(0, current.capacityMs - state.storedDuration);
    const cycles = Math.min(Math.floor(elapsed / current.intervalMs), Math.floor(freeDuration / current.intervalMs));
    const rewards = addRewards(id, state, cycles, current.production, state.bonusProgress, state.startedAt, current.intervalMs);
    const storedDuration = state.storedDuration + cycles * current.intervalMs;
    const full = current.capacityMs - storedDuration < current.intervalMs, partial = elapsed - cycles * current.intervalMs;
    return { id, cycles, ticks: Math.floor(storedDuration / current.intervalMs), gold: rewards.gold, materials: rewards.materials,
      bonusProgress: rewards.bonusProgress, storedDuration, capacityMs: current.capacityMs, intervalMs: current.intervalMs,
      full, remaining: full ? 0 : Math.max(0, current.intervalMs - Math.min(partial, current.intervalMs)) };
  }
  function settle(id, now = window.GameRuntime.now()) {
    const result = quote(id, now), state = saved(id);
    if (!result) return null;
    state.gold = result.gold; state.materials = result.materials; state.storedDuration = result.storedDuration;
    state.bonusProgress = result.bonusProgress; state.startedAt = now;
    return result;
  }
  function upgradeCost(id, trackId, currentLevel = level(id, trackId)) {
    const facility = definition(id), next = facility?.upgrades?.[trackId]?.[currentLevel];
    if (!facility || !next) return null;
    const baseGold = Number(config().upgradeGoldByTargetLevel?.[currentLevel + 1]) || 0;
    const gold = Math.ceil(baseGold * (facility.goldCostMultiplier || 1) / 100) * 100;
    return { gold, materials: { ...(next.cost || {}) } };
  }
  function upgradeQuote(id, trackId) {
    const facility = definition(id);
    if (!facility || !unlocked(id) || saved(id)?.activatedAt == null || !config().trackOrder.includes(trackId)) return null;
    const currentLevel = level(id, trackId), levels = facility.upgrades[trackId], next = levels[currentLevel], capacity = upgradeCapacity(id);
    if (!next) return { id, trackId, currentLevel, maximum: true, capReached: false, affordable: false, cost: null, capacity };
    const cost = upgradeCost(id, trackId, currentLevel);
    const capReached = capacity.remaining <= 0;
    return { id, trackId, currentLevel, nextLevel: currentLevel + 1, maximum: false, capReached, cost, capacity,
      affordable: !capReached && window.GameState.data.gold >= cost.gold && Object.entries(cost.materials).every(([itemId, amount]) => window.Items.count(itemId) >= amount) };
  }
  function resetQuote(id) {
    const facility = definition(id), state = saved(id);
    if (!facility || !state || !unlocked(id) || state.activatedAt == null) return null;
    const spent = { gold: 0, materials: {} };
    config().trackOrder.forEach(trackId => {
      for (let index = 1; index < state.levels[trackId]; index++) {
        const cost = upgradeCost(id, trackId, index);
        spent.gold += cost.gold;
        Object.entries(cost.materials).forEach(([itemId, amount]) => { spent.materials[itemId] = (spent.materials[itemId] || 0) + amount; });
      }
    });
    const capacity = upgradeCapacity(id);
    return { id, used: capacity.used, capacity, spent, canReset: capacity.used > 0 };
  }
  function normalizePeriodicRewards(id) {
    const state = saved(id), production = profile(id).production;
    (production.periodicRewards || []).forEach(periodic => {
      const progress = state.bonusProgress[periodic.id] || 0, completed = Math.floor(progress / periodic.everyCycles);
      state.bonusProgress[periodic.id] = progress % periodic.everyCycles;
      if (completed) state.materials[periodic.itemId] = (state.materials[periodic.itemId] || 0) + completed * periodic.quantity;
    });
  }
  function upgrade(id, trackId) {
    const request = upgradeQuote(id, trackId);
    if (!request) return { ok: false, message: "施設または強化項目が見つかりません。" };
    if (request.maximum) return { ok: false, message: "この設備は最大レベルです。" };
    if (request.capReached) return { ok: false, message: request.capacity.nextChapter ? `${request.capacity.nextChapter.title}の達成で施設の強化枠が増えます。` : "この施設の強化可能回数は上限です。" };
    if (!request.affordable) return { ok: false, message: "施設強化に必要な所持金または素材が不足しています。" };
    settle(id);
    window.GameState.data.gold -= request.cost.gold;
    Object.entries(request.cost.materials).forEach(([itemId, amount]) => window.Items.remove(itemId, amount));
    saved(id).levels[trackId] = request.nextLevel;
    if (trackId === "production") normalizePeriodicRewards(id);
    const message = `${definition(id).name}の${config().tracks[trackId].name}をLv.${request.nextLevel}へ強化しました。`;
    window.GameState.addLog(message, "success"); window.GameState.save();
    return { ok: true, message };
  }
  function reset(id) {
    const request = resetQuote(id);
    if (!request) return { ok: false, message: "施設が見つかりません。" };
    if (!request.canReset) return { ok: false, message: "この施設にはリセットできる強化がありません。" };
    settle(id);
    const state = saved(id);
    config().trackOrder.forEach(trackId => { state.levels[trackId] = 1; });
    state.storedDuration = Math.min(state.storedDuration, profile(id).capacityMs);
    normalizePeriodicRewards(id);
    const message = `${definition(id).name}の強化をリセットしました。使用済みの所持金と素材は返却されません。`;
    window.GameState.addLog(message, "success"); window.GameState.save();
    return { ok: true, message, spent: request.spent };
  }
  function collect(id) {
    const result = quote(id);
    if (!result) return { ok: false, message: "施設が見つかりません。" };
    if (!result.storedDuration) return { ok: false, message: "生産が完了していません。" };
    window.GameState.data.gold += result.gold;
    Object.entries(result.materials).forEach(([itemId, amount]) => { if (amount) window.Items.add(itemId, amount); });
    const state = saved(id);
    state.startedAt = window.GameRuntime.now(); state.storedDuration = 0; state.gold = 0; state.materials = {}; state.bonusProgress = result.bonusProgress;
    const rewards = [result.gold ? result.gold + "G" : "", ...Object.entries(result.materials).filter(([, amount]) => amount).map(([itemId, amount]) => window.GameData.items[itemId].name + "×" + amount)].filter(Boolean).join("、");
    const message = definition(id).name + "から" + rewards + "を受け取りました。";
    if (window.RecurringMissions) window.RecurringMissions.record("facility_collect");
    window.GameState.addLog(message, "success"); window.GameState.save();
    return { ok: true, message, rewards: { gold: result.gold, materials: result.materials } };
  }
  function collectable() { return config().order.filter(id => { const result = quote(id); return result && result.storedDuration > 0; }); }
  function collectAll() {
    const ids = collectable();
    if (!ids.length) return { ok: false, message: "受け取れる生産物はありません。" };
    const results = ids.map(id => ({ id, result: collect(id) }));
    const names = results.map(entry => definition(entry.id).name).join("、");
    return { ok: true, message: `${names}の生産物をまとめて受け取りました。`, facilities: results.map(entry => entry.id) };
  }
  window.Facilities = { profile, quote, settle, upgradeCapacity, upgradeQuote, upgrade, resetQuote, reset, collect, collectAll, collectable, unlocked, sync };
})();
