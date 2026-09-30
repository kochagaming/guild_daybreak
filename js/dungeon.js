(function () {
  "use strict";

  function start(dungeonId, partyIndex = window.Party.selected(), timeMultiplier = 1, difficultyId = "normal") {
    const acquisitionApi = window.AcquisitionSkills || { resolve: () => null, durationMs: (seconds, multiplier) => seconds * multiplier * 1000 };
    const state = window.GameState.data;
    const baseDungeon = window.GameData.dungeons[dungeonId];
    if (!baseDungeon) return { ok: false, message: "探索先が見つかりません。" };
    const difficultySystem = window.DungeonDifficulty;
    if (difficultySystem && !window.GameData.dungeonDifficulties[difficultyId]) return { ok: false, message: "難易度が見つかりません。" };
    if (!difficultySystem && difficultyId !== "normal") return { ok: false, message: "難易度が見つかりません。" };
    const dungeon = difficultySystem ? difficultySystem.variant(baseDungeon, difficultyId) : baseDungeon;
    if (!window.Exploration.valid(timeMultiplier)) return { ok: false, message: "探索時間は1〜6倍で指定してください。" };
    if (window.Story && !window.Story.canEnter(dungeonId)) return { ok: false, message: window.Story.dungeonCondition(dungeonId) };
    if (difficultySystem && !difficultySystem.unlocked(dungeonId, difficultyId)) return { ok: false, message: `${difficultySystem.tier(difficultyId).name}は、一つ前の難易度を攻略すると解放されます。` };
    if (!Number.isInteger(partyIndex) || partyIndex < 0 || partyIndex >= window.Party.limit()) return { ok: false, message: "このパーティは未解放です。" };
    if (state.expeditions[partyIndex]) return { ok: false, message: "このパーティは探索中です。" };
    const members = window.Party.members(partyIndex);
    if (members.some(member => state.expeditions.some((entry, index) => index !== partyIndex && entry?.partyIds.includes(member.id)))) return { ok: false, message: "別の探索中パーティと冒険者が重複しています。" };
    if (!members.length) return { ok: false, message: "先にパーティを編成してください。" };
    if (members.length > window.Party.memberLimit()) return { ok: false, message: "物語で解放された人数上限を超えています。" };
    const power = window.Party.power(partyIndex);
    const startedAt = window.GameRuntime.now();
    const partySnapshot = members.map((member, position) => ({
      id: member.id, name: member.name, level: member.level,
      jobId: member.jobId || "warrior", raceId: member.raceId || "human", position,
      familyIds: window.CreatureFamilies ? window.CreatureFamilies.familyIdsForRace(member.raceId || "human") : [],
      actionRates: window.Characters.actionRates(member),
      weaponRange: window.Characters.weaponRange(member),
      basicDamageType: window.Characters.basicDamageType(member),
      skillIds: window.Characters.learnedSkills(member).map((skill) => skill.id),
      equipmentSkillIds: [...new Set(member.equipment.flatMap(id => {
        const instance = window.Items.getInstance(id);
        return instance ? window.EquipmentSkills.ids(instance) : [];
      }))],
      specialEquipment: window.Characters.specialEquipment(member),
      stats: window.Characters.stats(member)
    }));
    const baseAcquisitionBonuses = acquisitionApi.resolve(partySnapshot);
    const acquisitionBonuses = window.AccessCodes ? window.AccessCodes.applyAcquisitionBonuses(baseAcquisitionBonuses) : baseAcquisitionBonuses;
    const accessDurationMultiplier = window.AccessCodes ? window.AccessCodes.explorationDurationMultiplier() : 1;
    state.expeditions[partyIndex] = {
      partyIndex,
      timeMultiplier,
      dungeonId, difficultyId, partyIds: members.map((member) => member.id),
      partySnapshot,
      acquisitionBonuses,
      accessDurationMultiplier,
      startedAt, endsAt: startedAt + Math.max(1000, Math.round(acquisitionApi.durationMs(dungeon.duration, timeMultiplier, acquisitionBonuses) * accessDurationMultiplier)),
      power: Math.round(power),
      seed: Math.floor(window.GameRuntime.random() * 2147483646) + 1
    };
    window.GameState.addLog(`第${partyIndex + 1}パーティが${dungeon.name}へ出発しました。`, "info");
    if (window.Story) window.Story.recordDeparture(dungeonId);
    if (window.RecurringMissions) window.RecurringMissions.record("departure");
    window.GameState.save();
    return { ok: true };
  }

  function completeOne(partyIndex, now) {
    const state = window.GameState.data;
    const expedition = state.expeditions[partyIndex];
    if (!expedition || (now || window.GameRuntime.now()) < expedition.endsAt) return null;
    const knownObservationIds = new Set(window.ObservationJournal?.unlockedNotes().map(note => note.id) || []);
    const baseDungeon = window.GameData.dungeons[expedition.dungeonId];
    const dungeon = window.DungeonDifficulty ? window.DungeonDifficulty.variant(baseDungeon, expedition.difficultyId || "normal") : baseDungeon;
    const outcome = window.Battle.resolve(expedition, dungeon);
    state.gold += outcome.gold;
    const grantedDrops = [], autoSold = [];
    let autoSellGold = 0;
    const acquisitionApi = window.AcquisitionSkills || { normalize: () => ({ qualityRate: { multiplier: 1, flat: 0 } }), memberExperience: base => base };
    const acquisitionBonuses = acquisitionApi.normalize(expedition.acquisitionBonuses);
    const qualityRate = acquisitionBonuses.qualityRate;
    outcome.drops.forEach((drop, dropIndex) => {
      const grant = window.Items.add(drop.itemId, drop.quantity, {
        source: "drop", seed: expedition.seed + (dropIndex + 1) * 100003,
        qualityRateMultiplier: qualityRate.multiplier
      });
      if (grant.instances.length) {
        grant.instances.forEach((instance) => grantedDrops.push({
          itemId: drop.itemId, quantity: 1, instanceId: instance.id,
          displayName: window.Items.displayName(instance), qualityId: instance.qualityId
        }));
      } else if (grant.material) {
        grantedDrops.push({ itemId: drop.itemId, quantity: drop.quantity });
      }
      if (grant.autoSold?.length) autoSold.push(...grant.autoSold);
      autoSellGold += grant.autoSellGold || 0;
    });
    const levelUps = [], experienceGains = [];
    expedition.partyIds.forEach((id) => {
      const character = window.Characters.get(id);
      if (!character) return;
      const experience = acquisitionApi.memberExperience(outcome.exp, id, acquisitionBonuses);
      experienceGains.push({ id, name: character.name, amount: experience });
      const gained = window.Characters.addExperience(character, experience);
      if (gained) levelUps.push({ name: character.name, levels: gained, level: character.level });
    });
    state.lastResult = {
      id: `result-${window.GameRuntime.now()}-${partyIndex}`, partyIndex, dungeonId: baseDungeon.id, difficultyId: expedition.difficultyId || "normal", dungeonName: dungeon.name, completedAt: window.GameRuntime.now(),
      success: outcome.success, gold: outcome.gold, exp: outcome.exp, experienceGains,
      timeMultiplier: expedition.timeMultiplier || 1,
      drops: grantedDrops, autoSold, autoSellGold, levelUps,
      partyNames: expedition.partySnapshot
        ? expedition.partySnapshot.map((member) => member.name)
        : expedition.partyIds.map(window.Characters.get).filter(Boolean).map((c) => c.name),
      battleLog: outcome.battleLog,
      mechanicReport: outcome.mechanicReport,
      strategyReport: outcome.strategyReport,
      defeatFacts: outcome.defeatFacts,
      encountersCleared: outcome.encountersCleared,
      totalEncounters: outcome.totalEncounters,
      monstersDefeated: outcome.monstersDefeated,
      monsterCounts: outcome.monsterCounts,
      monsterEncounters: outcome.monsterEncounters,
      monsterObservations: outcome.monsterObservations,
      memberReports: outcome.memberReports,
      survivors: outcome.survivors
    };
    state.expeditions[partyIndex] = null;
    if (window.Story) state.lastResult.storyCompleted = window.Story.recordResult(state.lastResult);
    state.lastResult.newObservationIds = window.ObservationJournal
      ? window.ObservationJournal.unlockedNotes().map(note => note.id).filter(id => !knownObservationIds.has(id))
      : [];
    if (window.Commissions) window.Commissions.recordResult(state.lastResult, outcome.monsterCounts);
    if (window.RecurringMissions && outcome.success) window.RecurringMissions.record("clear");
    if (window.Encyclopedia) window.Encyclopedia.recordBattle(outcome.monsterEncounters, outcome.monsterCounts, outcome.monsterObservations, expedition.difficultyId || "normal");
    state.partyResults[partyIndex] = state.lastResult;
    window.GameState.addLog(
      `第${partyIndex + 1}パーティ：${dungeon.shortName}の探索は${outcome.success ? "成功" : "失敗"}。${outcome.gold}Gを獲得${autoSellGold ? `、装備${autoSold.length}点を${autoSellGold}Gで自動売却` : ""}しました。`,
      outcome.success ? "success" : "danger"
    );
    window.GameState.save();
    return state.lastResult;
  }

  function completeIfReady(now = window.GameRuntime.now()) {
    let result = null;
    stateIndexes().filter(index => window.Party.expedition(index)).sort((a, b) => window.Party.expedition(a).endsAt - window.Party.expedition(b).endsAt).forEach(index => { result = completeOne(index, now) || result; });
    return result;
  }
  function stateIndexes() { return window.GameState.data.expeditions.map((_, index) => index); }
  function activeCount() { return window.GameState.data.expeditions.filter(Boolean).length; }
  function remaining(index = window.Party.selected()) {
    const expedition = window.Party.expedition(index);
    return expedition ? Math.max(0, expedition.endsAt - window.GameRuntime.now()) : 0;
  }

  window.Dungeon = { start, completeIfReady, remaining, activeCount };
})();
