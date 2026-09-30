(function () {
  "use strict";

  function plainInstance(id, templateId) {
    return {
      id, templateId, qualityId: "standard",
      modifiers: { hp: 0, attack: 0, defense: 0 },
      ultraRareTitleId: null,
      upgradeLevel: 0,
      source: "initial", acquiredAt: window.GameRuntime.now(), locked: false
    };
  }

  function blankFacility(id, now = window.GameRuntime.now(), completed = []) {
    const definition = window.GameData.facilities.definitions[id];
    const active = !definition.unlockAfter || completed.includes(definition.unlockAfter);
    return {
      startedAt: now, activatedAt: active ? now : null, storedDuration: 0, gold: 0, materials: {}, bonusProgress: {},
      levels: Object.fromEntries(window.GameData.facilities.trackOrder.map(trackId => [trackId, 1]))
    };
  }
  function initialFacilities() {
    const facilities = { version: 3 };
    window.GameData.facilities.order.forEach(id => { facilities[id] = blankFacility(id); });
    return facilities;
  }

  function ensureFacilities(target) {
    const completed = target.story?.completed || [], now = window.GameRuntime.now();
    window.GameData.facilities.order.forEach(id => {
      if (!target.facilities[id]) target.facilities[id] = blankFacility(id, now, completed);
      else if (target.facilities[id].activatedAt === undefined) {
        const definition = window.GameData.facilities.definitions[id];
        target.facilities[id].activatedAt = !definition.unlockAfter || completed.includes(definition.unlockAfter) ? target.facilities[id].startedAt : null;
      }
    });
    return target;
  }

  function partyCapacity() {
    return Math.max(1, Number(window.GameData.partyProgression?.partySlots?.maximum) || Number(window.Party?.maximum?.()) || 1);
  }

  function ensurePartyCapacity(target) {
    const maximum = partyCapacity();
    if (!Array.isArray(target.partyHistory)) target.partyHistory = [];
    if (!Array.isArray(target.partyPlans)) target.partyPlans = [];
    if (!Array.isArray(target.partyNames)) target.partyNames = [];
    while (target.parties.length < maximum) target.parties.push([]);
    while (target.expeditions.length < maximum) target.expeditions.push(null);
    while (target.partyResults.length < maximum) target.partyResults.push(null);
    while (target.partyHistory.length < maximum) target.partyHistory.push([]);
    while (target.partyPlans.length < maximum) target.partyPlans.push(null);
    while (target.partyNames.length < maximum) target.partyNames.push(null);
    return target;
  }

  function initialState() {
    return {
      version: 11,
      story: { version: 1, completed: [], facts: { departed: false, clears: [], difficultyClears: [], discoveries: [] } },
      gold: 500,
      facilities: initialFacilities(),
      recruitment: { version: 2, nextId: 1, pending: null },
      commissions: { version: 1, progress: {}, claimed: [] },
      recurringMissions: window.RecurringMissions ? window.RecurringMissions.initialState() : { version: 1, groups: {} },
      encyclopedia: { version: 5, items: { wooden_sword: 1, cloth_clothes: 1 }, monsters: {}, unreadItems: [], unreadMonsters: [] },
      observationJournal: { version: 1, readIds: [] },
      dailyShop: { version: 1, dateKey: null, offers: [] },
      autoSell: { version: 2, enabled: false, nextId: 1, rules: [] },
      accessCodes: { version: 1, redeemedIds: [] },
      presets: { version: 1, slots: [null, null, null, null, null, null] },
      characters: [],
      inventory: {
        equipment: [plainInstance("item-1", "wooden_sword"), plainInstance("item-2", "cloth_clothes")],
        materials: { guild_seal: 4 }
      },
      parties: Array.from({ length: partyCapacity() }, () => []),
      unlockedPartyCount: 1,
      activeParty: 0,
      expeditions: Array(partyCapacity()).fill(null),
      partyResults: Array(partyCapacity()).fill(null),
      partyHistory: Array.from({ length: partyCapacity() }, () => []),
      partyPlans: Array(partyCapacity()).fill(null),
      partyNames: Array(partyCapacity()).fill(null),
      lastResult: null,
      logs: [{ id: "welcome", at: window.GameRuntime.now(), text: "冒険者ギルドへようこそ。募集を出して最初の仲間を雇用しましょう。", tone: "info" }],
      meta: { nextCharacterId: 1, nextItemId: 3, updatedAt: window.GameRuntime.now() }
    };
  }

  const saved = window.SaveSystem.load();
  const loadError = window.SaveSystem.loadError || (saved && (saved.version !== 11 || ["story", "facilities", "recruitment", "commissions", "recurringMissions", "presets", "inventory", "characters", "accessCodes", "parties", "unlockedPartyCount", "expeditions", "partyResults", "meta"].some(key => saved[key] == null)
    || saved.recruitment?.version !== 2 || saved.autoSell?.version !== 2 || saved.facilities?.version !== 3
    || !Array.isArray(saved.inventory?.equipment) || saved.inventory.equipment.some(item => item.ultraRareTitleId === undefined || Object.prototype.hasOwnProperty.call(item, "equipmentSkills"))))
    ? "旧形式または不完全なセーブは読み込めません。保存データは変更していません。" : null;
  const state = ensureFacilities(ensurePartyCapacity(loadError ? initialState() : saved || initialState()));
  const addedDailyShop = !state.dailyShop;
  if (addedDailyShop) state.dailyShop = { version: 1, dateKey: null, offers: [] };
  const addedObservationJournal = !state.observationJournal;
  if (addedObservationJournal) state.observationJournal = { version: 1, readIds: [] };

  let transactionActive = false, saveRequested = false;
  function replace(next) {
    Object.keys(state).forEach(key => delete state[key]);
    Object.assign(state, next);
  }
  window.GameState = {
    data: state,
    partyCapacity,
    ensurePartyCapacity,
    ensureFacilities,
    loadError,
    needsInitialSave: (!saved || addedDailyShop || addedObservationJournal) && !loadError,
    save() {
      if (this.loadError) throw new Error(this.loadError);
      if (transactionActive) { saveRequested = true; return; }
      window.SaveSystem.save(state);
    },
    transaction(operation) {
      if (transactionActive) throw new Error("操作の入れ子はできません。");
      const before = JSON.parse(JSON.stringify(state));
      transactionActive = true;
      saveRequested = false;
      try {
        const result = operation();
        if (result && typeof result.then === "function") throw new Error("ローカルのゲーム処理は同期関数にしてください。");
        if (result && result.ok === false) { replace(before); return result; }
        if (saveRequested) window.SaveSystem.save(state);
        return result;
      } catch (error) { replace(before); throw error; }
      finally { transactionActive = false; saveRequested = false; }
    },
    reset() {
      const clean = initialState();
      const previousError = this.loadError;
      const previousState = JSON.parse(JSON.stringify(state));
      this.loadError = null;
      replace(clean);
      try { this.save(); }
      catch (error) { replace(previousState); this.loadError = previousError; throw error; }
      this.needsInitialSave = false;
    },
    addLog(text, tone) {
      state.logs.unshift({ id: `${window.GameRuntime.now()}-${window.GameRuntime.random()}`, at: window.GameRuntime.now(), text, tone: tone || "info" });
      state.logs = state.logs.slice(0, 20);
    }
  };

})();
