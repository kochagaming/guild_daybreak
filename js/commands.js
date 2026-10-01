(function () {
  "use strict";
  const handlers = Object.freeze({
    "recruitment.post": p => window.Recruitment.post(p),
    "recruitment.hire": p => window.Recruitment.hire(p.applicantId, p.name),
    "recruitment.dismiss": () => window.Recruitment.dismiss(),
    "character.actionRates": p => window.Characters.setActionRates(p.characterId, p.rates),
    "character.portrait": p => window.Characters.setPortrait(p.characterId, p.portraitId),
    "character.classChange": p => window.ClassChange.change(p.characterId, p.targetJobId),
    "commission.claim": p => window.Commissions.claim(p.commissionId),
    "recurringMission.claim": p => window.RecurringMissions.claim(p.groupId, p.missionId),
    "recurringMission.claimAll": p => window.RecurringMissions.claimAll(p.groupId),
    "facility.collect": p => window.Facilities.collect(p.facilityId),
    "facility.collectAll": () => window.Facilities.collectAll(),
    "facility.upgrade": p => window.Facilities.upgrade(p.facilityId, p.trackId),
    "preset.save": p => window.Presets.save(p.slot, p.name, p.partyIndex),
    "preset.apply": p => window.Presets.apply(p.slot, p.partyIndex),
    "preset.delete": p => window.Presets.remove(p.slot),
    "equipment.upgrade": p => window.Upgrades.enhance(p.instanceId, p.expectedLevel),
    "equipment.equip": p => window.Items.equip(p.characterId, p.instanceId),
    "equipment.unequip": p => window.Items.unequip(p.characterId, p.instanceId),
    "equipment.lock": p => typeof p.locked === "boolean" ? window.Items.setLocked(p.instanceId, p.locked) : { ok: false, message: "ロック状態を指定してください。" },
    "equipment.sell": p => window.Items.sell(p.instanceId),
    "equipment.sellStack": p => window.AutoSell.sellStack(p.stackKey),
    "equipment.dismantle": p => window.Items.dismantle(p.instanceId),
    "autosell.add": p => window.AutoSell.addRule(p),
    "autosell.remove": p => window.AutoSell.removeRule(p.ruleId),
    "autosell.toggle": p => window.AutoSell.setEnabled(p.enabled),
    "shop.buy": p => window.Shop.buy(p.itemId),
    "shop.daily.buy": p => window.Shop.buyDaily(p.offerId),
    "blacksmith.craft": p => window.Blacksmith.craft(p.recipeId),
    "party.select": p => window.Party.select(p.partyIndex),
    "party.readResult": p => window.Party.markResultRead(p.partyIndex),
    "party.setPlan": p => window.Party.setPlan(p, p.partyIndex),
    "party.rename": p => window.Party.rename(p.name, p.partyIndex),
    "party.toggle": p => window.Party.toggle(p.characterId, p.partyIndex),
    "party.move": p => window.Party.move(p.characterId, p.direction, p.partyIndex),
    "party.actionPreset": p => window.Party.applyActionPreset(p.presetId, p.partyIndex),
    "party.unlock": p => window.Party.unlock(p.partySlot),
    "accessCode.redeem": p => window.AccessCodes.redeem(p.featureId, p.code),
    "observation.read": p => window.ObservationJournal.markRead(p.noteId),
    "encyclopedia.read": p => p.kind === "items" ? window.Encyclopedia.markItemsRead() : p.kind === "monsters" ? window.Encyclopedia.markMonstersRead() : { ok: false, message: "図鑑の種類が不正です。" },
    "expedition.start": p => window.Dungeon.start(p.dungeonId, p.partyIndex, p.timeMultiplier, p.difficultyId),
    "expedition.collect": () => {
      const recurringChanged = window.RecurringMissions.sync();
      const result = window.Dungeon.completeIfReady();
      const facilityChanged = window.Facilities.sync();
      if (recurringChanged || facilityChanged) window.GameState.save();
      return { ok: true, result, recurringChanged, facilityChanged };
    },
    "progress.sync": () => {
      const storyChanged = window.Story.sync().length > 0;
      const recurringChanged = window.RecurringMissions.sync();
      const facilityChanged = window.Facilities.sync();
      const shopChanged = window.Shop.sync();
      if (storyChanged || recurringChanged || facilityChanged || shopChanged || window.GameState.needsInitialSave) window.GameState.save();
      return { ok: true, shopChanged };
    },
    "save.reset": () => { window.GameState.reset(); return { ok: true }; },
    "save.import": p => window.SaveTransfer.restore(p.state)
  });
  const schemas = {
    "recruitment.post": ["jobId?", "raceId?", "birthId?", "focus?"],
    "recruitment.hire": ["applicantId", "name?"],
    "recruitment.dismiss": [],
    "character.actionRates": ["characterId", "rates"],
    "character.portrait": ["characterId", "portraitId"],
    "character.classChange": ["characterId", "targetJobId"],
    "commission.claim": ["commissionId"],
    "recurringMission.claim": ["groupId", "missionId"],
    "recurringMission.claimAll": ["groupId"],
    "facility.collect": ["facilityId"],
    "facility.collectAll": [],
    "facility.upgrade": ["facilityId", "trackId"],
    "preset.save": ["slot", "name", "partyIndex?"],
    "preset.apply": ["slot", "partyIndex?"],
    "preset.delete": ["slot"],
    "equipment.upgrade": ["instanceId", "expectedLevel"],
    "equipment.equip": ["characterId", "instanceId"],
    "equipment.unequip": ["characterId", "instanceId"],
    "equipment.lock": ["instanceId", "locked"],
    "equipment.sell": ["instanceId"], "equipment.sellStack": ["stackKey"], "equipment.dismantle": ["instanceId"],
    "autosell.add": ["instanceId"],
    "autosell.remove": ["ruleId"], "autosell.toggle": ["enabled"],
    "shop.buy": ["itemId"], "shop.daily.buy": ["offerId"], "blacksmith.craft": ["recipeId"],
    "party.select": ["partyIndex"], "party.readResult": ["partyIndex"], "party.setPlan": ["partyIndex", "dungeonId", "difficultyId", "timeMultiplier"], "party.rename": ["partyIndex", "name"], "party.toggle": ["characterId", "partyIndex?"],
    "party.move": ["characterId", "direction", "partyIndex?"], "party.actionPreset": ["presetId", "partyIndex?"], "party.unlock": ["partySlot"],
    "accessCode.redeem": ["featureId", "code"],
    "observation.read": ["noteId"],
    "encyclopedia.read": ["kind"],
    "expedition.start": ["dungeonId", "difficultyId?", "partyIndex?", "timeMultiplier?"],
    "expedition.collect": [], "progress.sync": [], "save.reset": [], "save.import": ["state"]
  };
  function validPayload(type, payload) {
    const fields = type === "recruitment.post" ? window.GameData.recruitment.fields.map(field => `${field.id}?`) : schemas[type];
    if (!Object.keys(payload).every(key => fields.some(field => field.replace("?", "") === key))) return false;
    return fields.every(field => {
      const key = field.replace("?", ""), value = payload[key];
      if (field.endsWith("?") && value === undefined) return true;
      if (type === "recruitment.post" && value === "any") return true;
      if (key === "state") return value && typeof value === "object" && !Array.isArray(value);
      if (key === "rates") return value && typeof value === "object" && !Array.isArray(value);
      if (key === "partyIndex") return Number.isInteger(value) && value >= 0 && value < window.Party.maximum();
      if (key === "partySlot") return Number.isInteger(value) && value >= 2 && value <= window.Party.maximum();
      if (key === "featureId") return typeof value === "string" && Object.prototype.hasOwnProperty.call(window.GameData.accessCodes || {}, value);
      if (key === "noteId") return typeof value === "string" && (window.GameData.observationNotes || []).some(entry => entry.id === value);
      if (key === "code") return typeof value === "string" && value.length > 0 && value.length <= 64;
      if (key === "timeMultiplier") return window.Exploration.valid(value);
      if (key === "difficultyId") return Object.prototype.hasOwnProperty.call(window.GameData.dungeonDifficulties || { normal: true }, value);
      if (key === "facilityId") return Object.prototype.hasOwnProperty.call(window.GameData.facilities.definitions, value);
      if (key === "trackId") return window.GameData.facilities.trackOrder.includes(value);
      if (key === "direction") return value === -1 || value === 1;
      if (key === "expectedLevel") return Number.isInteger(value) && value >= 0 && value <= Math.max(...window.GameData.upgrades.limits.map(entry => entry.maximum));
      if (key === "locked") return typeof value === "boolean";
      if (key === "enabled") return typeof value === "boolean";
      if (key === "stackKey") return typeof value === "string" && value.length > 0 && value.length <= 2000;
      if (key === "ruleId") return typeof value === "string" && /^auto-sell-[1-9]\d*$/.test(value);
      if (key === "offerId") return typeof value === "string" && /^daily-\d{4}-\d{2}-\d{2}-(?:10|[1-9])$/.test(value);
      if (key === "groupId") return window.GameData.recurringMissions.groups.some(group => group.id === value);
      if (key === "missionId") return window.GameData.recurringMissions.groups.some(group => group.missions.some(entry => entry.id === value));
      if (key === "slot") return Number.isInteger(value) && value >= 0 && value < 6;
      const tables = { jobId: "jobs", targetJobId: "jobs", raceId: "races", birthId: "births", focus: "recruitmentTalents", portraitId: "portraits", itemId: "items", dungeonId: "dungeons" };
      if (type === "recruitment.post") tables[key] = window.GameData.recruitment.fields.find(field => field.id === key)?.table;
      return typeof value === "string" && value.length <= 200 && (!tables[key] || Object.prototype.hasOwnProperty.call(window.GameData[tables[key]], value));
    });
  }
  function dispatch(command) {
    if (!command || command.version !== 1 || !Object.prototype.hasOwnProperty.call(handlers, command.type) || !command.payload || typeof command.payload !== "object" || Array.isArray(command.payload)) return { ok: false, message: "ゲーム操作の形式が不正です。" };
    if (!validPayload(command.type, command.payload)) return { ok: false, message: "ゲーム操作の引数が不正です。" };
    try {
      // 読み込みは専用の検証・バックアップ・保存手順を利用する。
      return command.type === "save.import" ? handlers[command.type](command.payload) : window.GameState.transaction(() => handlers[command.type](command.payload));
    } catch (error) {
      console.warn("ゲーム操作を完了できませんでした。", error);
      return { ok: false, message: "操作を保存できませんでした。保存容量やブラウザの設定を確認してください。変更は取り消しました。" };
    }
  }
  window.GameCommands = { dispatch };
})();
