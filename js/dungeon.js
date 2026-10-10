(function () {
  "use strict";

  function battleSummary(result) {
    const members = Array.isArray(result.memberReports) ? result.memberReports : [];
    const sum = key => members.reduce((total, member) => total + (Number(member[key]) || 0), 0);
    return {
      encountersCleared: Number(result.encountersCleared) || 0,
      totalEncounters: Number(result.totalEncounters) || 0,
      monstersDefeated: Number(result.monstersDefeated) || 0,
      damageDealt: sum("damageDealt"), damageTaken: sum("damageTaken"), healingDone: sum("healingDone"),
      attackHits: sum("attackHits"), attackAttempts: sum("attackAttempts"),
      knockouts: members.filter(member => (Number(member.remainingHp) || 0) <= 0).length
    };
  }

  function memberHighlights(result) {
    const reports = Array.isArray(result?.memberReports) ? result.memberReports : [];
    const used = new Set(), highlights = [];
    const exploration = new Map();
    (result?.battleLog || []).forEach(entry => {
      const routeSuccess = Boolean(entry.routeEventId && entry.routeEventSuccess);
      const chestSuccess = Boolean(entry.kind === "treasure" && entry.treasureOpened && entry.treasureTierRank > 0);
      if (!entry.explorationActorId || (!routeSuccess && !chestSuccess)) return;
      const contribution = exploration.get(entry.explorationActorId) || { memberId: entry.explorationActorId, name: entry.explorationActorName || "冒険者", routeSuccesses: 0, chestsOpened: 0 };
      if (routeSuccess) contribution.routeSuccesses += 1;
      if (chestSuccess) contribution.chestsOpened += 1;
      exploration.set(entry.explorationActorId, contribution);
    });
    const categories = [
      { kind: "exploration", candidates: () => Array.from(exploration.values()).map(entry => ({ member: { id: entry.memberId, name: entry.name }, value: entry.routeSuccesses + entry.chestsOpened, routeSuccesses: entry.routeSuccesses, chestsOpened: entry.chestsOpened })) },
      { kind: "damage", metric: "damageDealt", eligible: value => value > 0 },
      { kind: "healing", metric: "healingDone", eligible: value => value > 0 },
      { kind: "endurance", metric: "damageTaken", eligible: (value, member) => value > 0 && Number(member.remainingHp) > 0 }
    ];
    categories.forEach(category => {
      const candidates = (category.candidates ? category.candidates() : reports
        .map(member => ({ member, value: Math.max(0, Math.round(Number(member[category.metric]) || 0)) }))
        .filter(entry => category.eligible(entry.value, entry.member)))
        .sort((a, b) => b.value - a.value || String(a.member.name).localeCompare(String(b.member.name), "ja"));
      const selected = candidates.find(entry => !used.has(entry.member.id)) || (reports.length === 1 ? candidates[0] : null);
      if (!selected) return;
      used.add(selected.member.id);
      highlights.push({
        kind: category.kind,
        memberId: selected.member.id,
        name: selected.member.name,
        value: selected.value,
        ...(category.kind === "exploration" ? { routeSuccesses: selected.routeSuccesses, chestsOpened: selected.chestsOpened } : {}),
        ...(category.kind === "endurance" ? { remainingHp: Math.max(0, Math.round(Number(selected.member.remainingHp) || 0)), maxHp: Math.max(1, Math.round(Number(selected.member.maxHp) || 1)) } : {})
      });
    });
    return highlights;
  }

  function partySetupSummary(partySnapshot) {
    return (Array.isArray(partySnapshot) ? partySnapshot : []).map(member => ({
      id: member.id, name: member.name, jobId: member.jobId, level: member.level, position: member.position,
      actionRates: { ...member.actionRates },
      equipmentCount: member.loadout?.equipmentCount || 0,
      equipmentNames: (member.loadout?.equipmentNames || []).slice(0, 8),
      equipmentWeight: member.loadout?.equipmentWeight || 0,
      maximumWeight: member.loadout?.maximumWeight || 0
    }));
  }

  function historySummary(result) {
    const equipment = [], materialTotals = {};
    (result.drops || []).forEach(drop => {
      const item = window.GameData.items[drop.itemId];
      if (!item) return;
      if (["weapon", "armor"].includes(item.type)) equipment.push({ itemId: drop.itemId, name: drop.displayName || item.name, quantity: drop.quantity || 1 });
      else if (item.type === "material") materialTotals[drop.itemId] = (materialTotals[drop.itemId] || 0) + (drop.quantity || 1);
    });
    (result.autoSold || []).forEach(drop => equipment.push({ itemId: drop.itemId, name: drop.displayName, quantity: 1, autoSold: true }));
    return {
      id: result.id, completedAt: result.completedAt, dungeonId: result.dungeonId, difficultyId: result.difficultyId,
      timeMultiplier: result.timeMultiplier || 1,
      success: result.success, gold: result.gold, exp: result.exp,
      equipment, materials: Object.entries(materialTotals).map(([itemId, quantity]) => ({ itemId, quantity })),
      growth: (result.levelUps || []).map(entry => ({ name: entry.name, level: entry.level, newSkillIds: [...(entry.newSkillIds || [])], statChanges: { ...(entry.statChanges || {}) } })),
      routeEvents: (result.battleLog || []).filter(entry => entry.routeEventId).map(entry => ({
        id: entry.routeEventId,
        kind: entry.kind,
        success: Boolean(entry.routeEventSuccess),
        masteryApplied: Boolean(entry.routeEventMasteryApplied),
        personalPracticeApplied: Boolean(entry.routeEventPersonalPracticeApplied),
        teamSurveyApplied: Boolean(entry.routeTeamSurveyApplied),
        teamSurveyMemberNames: [...(entry.routeTeamSurveyMemberNames || [])],
        bondSupportApplied: Boolean(entry.routeBondSupportApplied),
        bondSupportMemberNames: [...(entry.routeBondSupportMemberNames || [])],
        bondSupportLabel: entry.routeBondSupportLabel || null,
        rumorMatched: Boolean(entry.routeRumorMatched),
        text: entry.text
      })),
      adventurerBondMoments: (result.battleLog || []).filter(entry => entry.kind === "bond").map(entry => ({
        id: entry.adventurerBondMomentId,
        memberNames: [...(entry.adventurerBondMemberNames || [])],
        sharedSorties: entry.sharedSorties,
        text: entry.text
      })),
      newAdventurerBondTiers: (result.newAdventurerBondTiers || []).map(entry => ({
        memberIds: [...entry.memberIds], memberNames: [...entry.memberNames], sharedSorties: entry.sharedSorties,
        routeLabel: entry.routeLabel || null, battleLabel: entry.battleLabel || null
      })),
      bondFormations: (result.bondFormations || []).map(entry => ({
        memberNames: [...entry.memberNames],
        positions: [...entry.positions],
        sharedSorties: entry.sharedSorties,
        label: entry.label
      })),
      newBossRivalries: (result.newBossRivalries || []).map(entry => ({ ...entry })),
      bossRevengeVictories: (result.bossRevengeVictories || []).map(entry => ({ ...entry })),
      routeMasteryIds: [...(result.newRouteMasteryIds || [])],
      memberHighlights: memberHighlights(result),
      partySetup: Array.isArray(result.partySetup) ? result.partySetup.map(member => ({ ...member, actionRates: { ...member.actionRates }, equipmentNames: [...member.equipmentNames] })) : [],
      storyMoments: Array.isArray(result.storyMoments) ? result.storyMoments.map(moment => ({
        kind: moment.kind, dungeonId: moment.dungeonId, sceneId: moment.sceneId
      })) : [],
      battle: battleSummary(result)
    };
  }

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
    const partyRuleCheck = window.DungeonPartyRules?.check(baseDungeon, members);
    if (partyRuleCheck && !partyRuleCheck.ok) return { ok: false, message: `この探索地の編成条件を満たしていません。${partyRuleCheck.message}` };
    const power = window.Party.power(partyIndex);
    const startedAt = window.GameRuntime.now();
    const partySnapshot = members.map((member, position) => {
      const equipped = member.equipment.map(id => window.Items.getInstance(id)).filter(Boolean);
      return {
        id: member.id, name: member.name, level: member.level,
        jobId: member.jobId || "warrior", raceId: member.raceId || "human", birthId: member.birthId || "common", position,
        companionId: member.source?.type === "companion" ? member.source.companionId : null,
        companionStageId: member.source?.type === "companion" ? window.Companions.stageId(member.source.companionId) : null,
        familyIds: window.CreatureFamilies ? window.CreatureFamilies.familyIdsForRace(member.raceId || "human") : [],
        routeEventSuccesses: { ...window.Characters.expeditionRecord(member).routeEventSuccesses },
        treasureOpenings: window.Characters.expeditionRecord(member).treasureOpenings,
        bossRivalries: Object.fromEntries(window.Characters.activeBossRivalries(member).map(entry => [entry.bossId, { defeats: entry.defeats, victories: entry.victories, lastOutcome: entry.lastOutcome, lastAt: entry.lastAt }])),
        sharedSorties: Object.fromEntries(window.Characters.sharedSorties(member).map(entry => [entry.characterId, entry.count])),
        bondMomentIds: Object.fromEntries(window.Characters.sharedSorties(member).filter(entry => entry.memoryIds.length).map(entry => [entry.characterId, [...entry.memoryIds]])),
        actionRates: window.Characters.actionRates(member),
        weaponRange: window.Characters.weaponRange(member),
        basicDamageType: window.Characters.basicDamageType(member),
        skillIds: window.Characters.learnedSkills(member).map((skill) => skill.id),
        equipmentSkillIds: window.EquipmentSkills.activeIds(equipped),
        equipmentSetBonuses: window.EquipmentSkills.setProgress(equipped).filter(entry => entry.active).map(entry => ({
          setId: entry.definition.id,
          count: entry.count,
          skillIds: entry.bonuses.filter(bonus => bonus.active).map(bonus => bonus.skillId)
        })),
        specialEquipment: window.Characters.specialEquipment(member),
        loadout: {
          equipmentCount: equipped.length,
          equipmentNames: equipped.slice(0, 8).map(instance => window.Items.displayName(instance)),
          equipmentWeight: window.Characters.equipmentWeight(member),
          maximumWeight: window.Characters.maxWeight(member)
        },
        stats: window.Characters.stats(member)
      };
    });
    const baseAcquisitionBonuses = acquisitionApi.resolve(partySnapshot);
    const accessAcquisitionBonuses = window.AccessCodes ? window.AccessCodes.applyAcquisitionBonuses(baseAcquisitionBonuses) : baseAcquisitionBonuses;
    const rumor = window.ExpeditionRumors?.forDungeon(dungeonId) || null;
    const acquisitionBonuses = window.ExpeditionRumors ? window.ExpeditionRumors.apply(accessAcquisitionBonuses, rumor) : accessAcquisitionBonuses;
    const accessDurationMultiplier = window.AccessCodes ? window.AccessCodes.explorationDurationMultiplier() : 1;
    const itemTarget = window.Encyclopedia?.trackedTarget() || null;
    const routeMasterySuccesses = window.GameData.config.explorationEvents?.routeMastery?.successes || 3;
    const knownRouteMasteryIds = (window.GameData.config.explorationEvents?.routeEvents || [])
      .filter(event => (state.story.facts.routeEvents?.[event.id]?.successes || 0) >= routeMasterySuccesses)
      .map(event => event.id);
    const treasureMasteryOpenings = window.GameData.config.explorationEvents?.treasureMastery?.openings || 3;
    const knownTreasureMasteryIds = (window.GameData.config.explorationEvents?.treasure?.types || [])
      .filter(tier => (state.story.facts.treasureTiers?.[tier.id]?.openings || 0) >= treasureMasteryOpenings)
      .map(tier => tier.id);
    state.expeditions[partyIndex] = {
      partyIndex,
      timeMultiplier,
      dungeonId, difficultyId, partyIds: members.map((member) => member.id),
      partySnapshot,
      knownCompanionMomentKeys: [...(state.story.facts.companionMoments || [])],
      knownRouteMasteryIds,
      knownTreasureMasteryIds,
      acquisitionBonuses,
      rumor,
      accessDurationMultiplier,
      trackedItemId: itemTarget?.itemId || null,
      trackedItemGoal: itemTarget?.quantity || null,
      startedAt, endsAt: startedAt + Math.max(1000, Math.round(acquisitionApi.durationMs(dungeon.duration, timeMultiplier, acquisitionBonuses) * accessDurationMultiplier)),
      power: Math.round(power),
      seed: Math.floor(window.GameRuntime.random() * 2147483646) + 1
    };
    const rumorDefinition = window.ExpeditionRumors?.definition(rumor);
    window.GameState.addLog(`${window.Party.name(partyIndex)}が${dungeon.name}へ出発しました。${rumorDefinition ? `「${rumorDefinition.name}」の噂を確かめに向かいます。` : ""}`, "info");
    if (window.Story) window.Story.recordDeparture(dungeonId);
    if (window.RecurringMissions) window.RecurringMissions.record("departure");
    window.GameState.save();
    return { ok: true };
  }

  function completeOne(partyIndex, now) {
    const state = window.GameState.data;
    const expedition = state.expeditions[partyIndex];
    if (!expedition || (now || window.GameRuntime.now()) < expedition.endsAt) return null;
    const routeMasterySuccesses = window.GameData.config.explorationEvents?.routeMastery?.successes || 3;
    const masteredRouteIds = () => (window.GameData.config.explorationEvents?.routeEvents || [])
      .filter(event => (state.story.facts.routeEvents?.[event.id]?.successes || 0) >= routeMasterySuccesses)
      .map(event => event.id);
    const knownRouteMasteryIds = new Set(masteredRouteIds());
    const treasureMasteryOpenings = window.GameData.config.explorationEvents?.treasureMastery?.openings || 3;
    const masteredTreasureIds = () => (window.GameData.config.explorationEvents?.treasure?.types || [])
      .filter(tier => (state.story.facts.treasureTiers?.[tier.id]?.openings || 0) >= treasureMasteryOpenings)
      .map(tier => tier.id);
    const knownTreasureMasteryIds = new Set(masteredTreasureIds());
    const knownObservationIds = new Set(window.ObservationJournal?.unlockedNotes().map(note => note.id) || []);
    const knownAchievementIds = new Set(window.Achievements?.entries().filter(entry => entry.complete).map(entry => entry.id) || []);
    const knownSetCounts = window.EquipmentSkills?.discoveryCounts?.() || {};
    const baseDungeon = window.GameData.dungeons[expedition.dungeonId];
    const dungeon = window.DungeonDifficulty ? window.DungeonDifficulty.variant(baseDungeon, expedition.difficultyId || "normal") : baseDungeon;
    const outcome = window.Battle.resolve(expedition, dungeon);
    const newAdventurerMilestones = [], newAdventurerRecords = [], newBossRivalries = [], bossRevengeVictories = [];
    const encounteredBossIds = Object.keys(outcome.monsterEncounters || {}).filter(id => window.GameData.monsters[id]?.boss);
    const defeatedBossIds = new Set(Object.keys(outcome.monsterCounts || {}).filter(id => window.GameData.monsters[id]?.boss && outcome.monsterCounts[id] > 0));
    const earnedMilestonesBefore = new Map(outcome.memberReports.map(report => {
      const character = window.Characters.get(report.id);
      return [report.id, new Set(character ? window.Characters.expeditionMilestones(character).filter(entry => entry.complete).map(entry => entry.id) : [])];
    }));
    const newAdventurerBondMomentIds = [];
    (outcome.battleLog || []).filter(entry => entry.kind === "bond").forEach(entry => {
      if (window.Characters.recordBondMemory(entry.adventurerBondMemberIds, entry.adventurerBondMomentId)) newAdventurerBondMomentIds.push(entry.adventurerBondMomentId);
    });
    const returningMembers = (expedition.partySnapshot || []).map(member => ({ id: member.id, name: member.name }));
    const bondCountsBefore = new Map();
    for (let left = 0; left < returningMembers.length; left += 1) {
      for (let right = left + 1; right < returningMembers.length; right += 1) {
        const pair = [returningMembers[left].id, returningMembers[right].id].sort();
        bondCountsBefore.set(pair.join("::"), Math.max(0, Number(state.adventurerBonds?.pairs?.[pair.join("::")]) || 0));
      }
    }
    window.Characters.recordSharedSortie(returningMembers.map(member => member.id));
    const routeTiers = window.GameData.config.explorationEvents?.adventurerBondRouteSupport || [];
    const battleTiers = window.GameData.config.explorationEvents?.adventurerBondBattleSupport || [];
    const bondThresholds = [...new Set([...routeTiers, ...battleTiers].map(tier => tier.minimumSharedSorties))].sort((a, b) => a - b);
    const newAdventurerBondTiers = [];
    for (let left = 0; left < returningMembers.length; left += 1) {
      for (let right = left + 1; right < returningMembers.length; right += 1) {
        const memberIds = [returningMembers[left].id, returningMembers[right].id];
        const key = [...memberIds].sort().join("::"), before = bondCountsBefore.get(key) || 0;
        const after = Math.max(0, Number(state.adventurerBonds?.pairs?.[key]) || 0);
        bondThresholds.filter(threshold => before < threshold && after >= threshold).forEach(threshold => {
          newAdventurerBondTiers.push({
            memberIds, memberNames: [returningMembers[left].name, returningMembers[right].name], sharedSorties: after,
            routeLabel: routeTiers.find(tier => tier.minimumSharedSorties === threshold)?.label || null,
            battleLabel: battleTiers.find(tier => tier.minimumSharedSorties === threshold)?.label || null
          });
        });
      }
    }
    const explorationContributions = new Map();
    const explorationContribution = memberId => {
      const current = explorationContributions.get(memberId) || { routeSuccesses: 0, routeEventSuccesses: {}, treasureOpenings: 0, teamSurveys: 0 };
      explorationContributions.set(memberId, current);
      return current;
    };
    (outcome.battleLog || []).forEach(entry => {
      (entry.routeTeamSurveyMemberIds || []).forEach(memberId => { explorationContribution(memberId).teamSurveys += 1; });
      if (!entry.explorationActorId) return;
      const contribution = explorationContribution(entry.explorationActorId);
      if (entry.routeEventId && entry.routeEventSuccess) {
        contribution.routeSuccesses += 1;
        contribution.routeEventSuccesses[entry.routeEventId] = (contribution.routeEventSuccesses[entry.routeEventId] || 0) + 1;
      }
      if (entry.kind === "treasure" && entry.treasureOpened && entry.treasureTierRank > 0) contribution.treasureOpenings += 1;
    });
    outcome.memberReports.forEach(report => {
      const character = window.Characters.get(report.id);
      if (!character) return;
      Object.assign(report, explorationContributions.get(report.id) || { routeSuccesses: 0, routeEventSuccesses: {}, treasureOpenings: 0, teamSurveys: 0 });
      const recordBefore = window.Characters.expeditionRecord(character);
      const earnedBefore = earnedMilestonesBefore.get(report.id) || new Set();
      const recordAfter = window.Characters.recordExpedition(character, report, outcome.success, outcome.encountersCleared, expedition.endsAt);
      const milestoneIds = window.Characters.expeditionMilestones(character).filter(entry => entry.complete && !earnedBefore.has(entry.id)).map(entry => entry.id);
      if (milestoneIds.length) newAdventurerMilestones.push({ characterId: character.id, name: character.name, milestoneIds });
      const improvements = ["bestDamage", "bestHealing", "bestEndurance"].filter(field => recordAfter[field] > recordBefore[field]).map(field => ({ field, previous: recordBefore[field], value: recordAfter[field] }));
      if (improvements.length) newAdventurerRecords.push({ characterId: character.id, name: character.name, improvements });
      encounteredBossIds.forEach(bossId => {
        const change = window.Characters.recordBossEncounter(character, bossId, defeatedBossIds.has(bossId), expedition.endsAt);
        if (!change) return;
        const entry = { characterId: character.id, name: character.name, bossId, bossName: window.GameData.monsters[bossId].name };
        if (change.started) newBossRivalries.push(entry);
        if (change.avenged) bossRevengeVictories.push(entry);
      });
    });
    const newMonsterInsights = window.Encyclopedia ? window.Encyclopedia.battleInsights(outcome.monsterObservations) : [];
    const difficultyId = expedition.difficultyId || "normal";
    const earnsFirstClearReward = outcome.success && difficultyId !== "normal" && !window.DungeonDifficulty.cleared(baseDungeon.id, difficultyId);
    state.gold += outcome.gold;
    const grantedDrops = [], autoSold = [], newItemIds = new Set(), newBestQualities = new Map(), newUltraRareTitleIds = new Set();
    let autoSellGold = 0;
    const acquisitionApi = window.AcquisitionSkills || { normalize: () => ({ qualityRate: { multiplier: 1, flat: 0 } }), memberExperience: base => base };
    const acquisitionBonuses = acquisitionApi.normalize(expedition.acquisitionBonuses);
    const qualityRate = acquisitionBonuses.qualityRate;
    outcome.drops.forEach((drop, dropIndex) => {
      const newDiscovery = window.Encyclopedia ? !window.Encyclopedia.item(drop.itemId) : false;
      const grant = window.Items.add(drop.itemId, drop.quantity, {
        source: "drop", seed: expedition.seed + (dropIndex + 1) * 100003,
        qualityRateMultiplier: qualityRate.multiplier
      });
      const newBestQualityId = !newDiscovery ? grant.newBestQualityId : null;
      if (grant.instances.length) {
        grant.instances.forEach((instance) => grantedDrops.push({
          itemId: drop.itemId, quantity: 1, instanceId: instance.id,
          displayName: window.Items.displayName(instance), qualityId: instance.qualityId, newDiscovery,
          newBest: Boolean(newBestQualityId && instance.qualityId === newBestQualityId),
          ultraRareTitleId: instance.ultraRareTitleId || null,
          newUltraRareTitle: Boolean(instance.ultraRareTitleId && grant.newUltraRareTitleIds.includes(instance.ultraRareTitleId))
        }));
      } else if (grant.material) {
        grantedDrops.push({ itemId: drop.itemId, quantity: drop.quantity, newDiscovery });
      }
      if (newDiscovery) newItemIds.add(drop.itemId);
      if (newBestQualityId) newBestQualities.set(drop.itemId, newBestQualityId);
      grant.newUltraRareTitleIds.forEach(id => newUltraRareTitleIds.add(id));
      if (grant.autoSold?.length) autoSold.push(...grant.autoSold);
      autoSellGold += grant.autoSellGold || 0;
    });
    const newSetDiscoveries = window.EquipmentSkills?.discoveryAdvances?.(knownSetCounts) || [];
    const levelUps = [], experienceGains = [];
    expedition.partyIds.forEach((id) => {
      const character = window.Characters.get(id);
      if (!character) return;
      const experience = acquisitionApi.memberExperience(outcome.exp, id, acquisitionBonuses);
      experienceGains.push({ id, name: character.name, amount: experience });
      const learnedBefore = new Set(window.Characters.learnedSkills(character).map(skill => skill.id));
      const statsBefore = window.Characters.stats(character), weightBefore = window.Characters.maxWeight(character);
      const gained = window.Characters.addExperience(character, experience);
      if (gained) {
        const newSkillIds = window.Characters.learnedSkills(character).map(skill => skill.id).filter(skillId => !learnedBefore.has(skillId));
        const statsAfter = window.Characters.stats(character), weightAfter = window.Characters.maxWeight(character);
        const statChanges = Object.fromEntries([
          ["hp", statsAfter.hp - statsBefore.hp], ["attack", statsAfter.attack - statsBefore.attack], ["defense", statsAfter.defense - statsBefore.defense],
          ["magicAttack", statsAfter.magicAttack - statsBefore.magicAttack], ["magicDefense", statsAfter.magicDefense - statsBefore.magicDefense],
          ["magicHealing", statsAfter.magicHealing - statsBefore.magicHealing], ["speed", statsAfter.speed - statsBefore.speed],
          ["maxWeight", Math.round((weightAfter - weightBefore) * 10) / 10]
        ].filter(([, value]) => value));
        levelUps.push({ name: character.name, levels: gained, level: character.level, newSkillIds, statChanges });
      }
    });
    const trackedItemId = expedition.trackedItemId || null;
    const trackedItemQuantity = trackedItemId
      ? outcome.drops.filter(drop => drop.itemId === trackedItemId).reduce((sum, drop) => sum + drop.quantity, 0)
      : 0;
    const trackedProgress = trackedItemQuantity ? window.Encyclopedia?.recordTargetProgress(trackedItemId, trackedItemQuantity) : null;
    state.lastResult = {
      id: `result-${window.GameRuntime.now()}-${partyIndex}`, partyIndex, dungeonId: baseDungeon.id, difficultyId, dungeonName: dungeon.name, completedAt: window.GameRuntime.now(),
      success: outcome.success, gold: outcome.gold, exp: outcome.exp, experienceGains, viewed: false,
      timeMultiplier: expedition.timeMultiplier || 1,
      trackedItemId, trackedItemQuantity,
      trackedItemGoal: expedition.trackedItemGoal || null,
      trackedItemProgress: trackedProgress?.progress ?? null,
      drops: grantedDrops, autoSold, autoSellGold, levelUps, newItemIds: Array.from(newItemIds),
      newSetDiscoveries,
      newBestQualities: Array.from(newBestQualities, ([itemId, qualityId]) => ({ itemId, qualityId })),
      newUltraRareTitleIds: Array.from(newUltraRareTitleIds),
      newAdventurerMilestones,
      newAdventurerRecords,
      newBossRivalries,
      bossRevengeVictories,
      newAdventurerBondMomentIds,
      newAdventurerBondTiers,
      rumor: expedition.rumor || null,
      partyNames: expedition.partySnapshot
        ? expedition.partySnapshot.map((member) => member.name)
        : expedition.partyIds.map(window.Characters.get).filter(Boolean).map((c) => c.name),
      partySetup: partySetupSummary(expedition.partySnapshot),
      battleLog: outcome.battleLog,
      mechanicReport: outcome.mechanicReport,
      strategyReport: outcome.strategyReport,
      bondFormations: outcome.bondFormations,
      defeatFacts: outcome.defeatFacts,
      encountersCleared: outcome.encountersCleared,
      totalEncounters: outcome.totalEncounters,
      monstersDefeated: outcome.monstersDefeated,
      monsterCounts: outcome.monsterCounts,
      monsterEncounters: outcome.monsterEncounters,
      monsterObservations: outcome.monsterObservations,
      newMonsterInsights,
      memberReports: outcome.memberReports,
      survivors: outcome.survivors
    };
    state.expeditions[partyIndex] = null;
    if (window.Story) state.lastResult.storyCompleted = window.Story.recordResult(state.lastResult);
    state.lastResult.newRouteMasteryIds = masteredRouteIds().filter(id => !knownRouteMasteryIds.has(id));
    state.lastResult.newTreasureMasteryIds = masteredTreasureIds().filter(id => !knownTreasureMasteryIds.has(id));
    if (earnsFirstClearReward) {
      const reward = window.DungeonDifficulty.firstClearReward(difficultyId);
      if (reward) {
        state.gold += reward.gold;
        const materials = Object.entries(reward.materials).map(([itemId, quantity]) => {
          window.Items.add(itemId, quantity);
          return { itemId, quantity };
        });
        state.lastResult.firstClearReward = { difficultyId, gold: reward.gold, materials };
        const rewardParts = [reward.gold ? `${reward.gold}G` : "", ...materials.map(entry => `${window.GameData.items[entry.itemId]?.name || entry.itemId}×${entry.quantity}`)].filter(Boolean);
        window.GameState.addLog(`${dungeon.name}を初踏破。${rewardParts.join("、")}を獲得しました。`, "success");
      }
    }
    state.lastResult.newObservationIds = window.ObservationJournal
      ? window.ObservationJournal.unlockedNotes().map(note => note.id).filter(id => !knownObservationIds.has(id))
      : [];
    if (window.Commissions) window.Commissions.recordResult(state.lastResult, outcome.monsterCounts);
    if (window.RecurringMissions && outcome.success) window.RecurringMissions.record("clear");
    if (window.Encyclopedia) window.Encyclopedia.recordBattle(outcome.monsterEncounters, outcome.monsterCounts, outcome.monsterObservations, expedition.difficultyId || "normal");
    state.lastResult.newAchievementIds = window.Achievements
      ? window.Achievements.entries().filter(entry => entry.complete && !knownAchievementIds.has(entry.id)).map(entry => entry.id)
      : [];
    state.partyResults[partyIndex] = state.lastResult;
    state.partyHistory[partyIndex].unshift(historySummary(state.lastResult));
    state.partyHistory[partyIndex] = state.partyHistory[partyIndex].slice(0, 10);
    window.GameState.addLog(
      `${window.Party.name(partyIndex)}：${dungeon.shortName}の探索は${outcome.success ? "成功" : "失敗"}。${outcome.gold}Gを獲得${autoSellGold ? `、装備${autoSold.length}点を${autoSellGold}Gで自動売却` : ""}しました。`,
      outcome.success ? "success" : "danger"
    );
    if (newBossRivalries.length) window.GameState.addLog(`${newBossRivalries.map(entry => `${entry.name}と${entry.bossName}`).join("、")}の間に、再戦を待つ因縁が残りました。`, "danger");
    if (bossRevengeVictories.length) window.GameState.addLog(`${bossRevengeVictories.map(entry => `${entry.name}が${entry.bossName}`).join("、")}へ雪辱を果たしました。`, "success");
    if (trackedItemQuantity) window.GameState.addLog(`探索目標「${window.GameData.items[trackedItemId].name}」を${trackedItemQuantity}個持ち帰りました。`, "success");
    if (state.lastResult.newRouteMasteryIds.length) window.GameState.addLog(`${state.lastResult.newRouteMasteryIds.map(id => window.GameData.config.explorationEvents.routeEvents.find(event => event.id === id)?.name).filter(Boolean).join("、")}の知見が観察日記にまとまり、次の遠征から共有されます。`, "success");
    if (state.lastResult.newTreasureMasteryIds.length) window.GameState.addLog(`${state.lastResult.newTreasureMasteryIds.map(id => window.GameData.config.explorationEvents.treasure.types.find(tier => tier.id === id)?.name).filter(Boolean).join("、")}の開け方が共有され、次の遠征から役立ちます。`, "success");
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

  window.Dungeon = { start, completeIfReady, remaining, activeCount, battleSummary, memberHighlights, partySetupSummary };
})();
