(function () {
  "use strict";

  function battleSummary(result) {
    const members = Array.isArray(result.memberReports) ? result.memberReports : [];
    const sum = key => members.reduce((total, member) => total + (Number(member[key]) || 0), 0);
    const aggregateSkillMap = key => {
      const totals = {};
      members.forEach(member => Object.entries(member[key] || {}).forEach(([skillId, value]) => {
        totals[skillId] = (totals[skillId] || 0) + (Number(value) || 0);
      }));
      return totals;
    };
    const aggregateDamageMap = key => {
      const totals = {};
      members.forEach(member => Object.entries(member[key] || {}).forEach(([id, value]) => {
        totals[id] = (totals[id] || 0) + (Number(value) || 0);
      }));
      return totals;
    };
    return {
      encountersCleared: Number(result.encountersCleared) || 0,
      totalEncounters: Number(result.totalEncounters) || 0,
      monstersDefeated: Number(result.monstersDefeated) || 0,
      damageDealt: sum("damageDealt"), damageTaken: sum("damageTaken"), healingDone: sum("healingDone"),
      damageSources: aggregateDamageMap("damageSources"), damageElements: aggregateDamageMap("damageElements"),
      attackHits: sum("attackHits"), attackAttempts: sum("attackAttempts"),
      statusInflicted: sum("statusInflicted"), statusAttempts: sum("statusAttempts"), statusResisted: sum("statusResisted"),
      attackActions: sum("attackActions"), techniqueActions: sum("techniqueActions"), spellActions: sum("spellActions"),
      healingActions: sum("healingActions"), defendActions: sum("defendActions"),
      skillUses: aggregateSkillMap("skillUses"), skillDamage: aggregateSkillMap("skillDamage"),
      skillHealing: aggregateSkillMap("skillHealing"), skillStatusInflicted: aggregateSkillMap("skillStatusInflicted"),
      knockouts: members.filter(member => (Number(member.remainingHp) || 0) <= 0).length,
      members: members.map(member => ({
        id: member.id,
        name: member.name,
        jobId: member.jobId,
        damageDealt: Number(member.damageDealt) || 0,
        damageTaken: Number(member.damageTaken) || 0,
        healingDone: Number(member.healingDone) || 0,
        statusInflicted: Number(member.statusInflicted) || 0,
        remainingHp: Math.max(0, Number(member.remainingHp) || 0),
        maxHp: Math.max(1, Number(member.maxHp) || 1),
        knockedOut: (Number(member.remainingHp) || 0) <= 0
      }))
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
      { kind: "status", metric: "statusInflicted", eligible: value => value > 0 },
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
        ...(category.kind === "status" ? { attempts: Math.max(selected.value, Math.round(Number(selected.member.statusAttempts) || 0)), resisted: Math.max(0, Math.round(Number(selected.member.statusResisted) || 0)) } : {}),
        ...(category.kind === "endurance" ? { remainingHp: Math.max(0, Math.round(Number(selected.member.remainingHp) || 0)), maxHp: Math.max(1, Math.round(Number(selected.member.maxHp) || 1)) } : {})
      });
    });
    return highlights;
  }

  function partySetupSummary(partySnapshot) {
    return (Array.isArray(partySnapshot) ? partySnapshot : []).map(member => ({
      id: member.id, name: member.name, jobId: member.jobId, level: member.level, position: member.position,
      recordTitleId: member.recordTitleId || null,
      reputation: member.reputation ? { ...member.reputation } : null,
      actionRates: { ...member.actionRates },
      equipmentCount: member.loadout?.equipmentCount || 0,
      equipmentNames: (member.loadout?.equipmentNames || []).slice(0, 8),
      equipmentWeight: member.loadout?.equipmentWeight || 0,
      maximumWeight: member.loadout?.maximumWeight || 0
    }));
  }

  function lootReaction(drops, partySnapshot) {
    const members = (Array.isArray(partySnapshot) ? partySnapshot : []).filter(member => member?.id && member?.name);
    if (!members.length) return null;
    const candidates = (Array.isArray(drops) ? drops : []).map(drop => {
      const item = window.GameData.items[drop.itemId];
      if (!item) return null;
      const score = (drop.newUltraRareTitle ? 120 : drop.ultraRareTitleId ? 100 : 0) + (drop.newDiscovery ? 60 : 0) + (drop.newBest ? 35 : 0) + (Number(item.tier) || 0);
      return score >= 35 ? { drop, item, score } : null;
    }).filter(Boolean).sort((left, right) => right.score - left.score || left.item.id.localeCompare(right.item.id))[0];
    if (!candidates) return null;
    const { drop, item } = candidates;
    const preferredRoles = item.type === "weapon" ? ["damage", "status", "exploration"] : item.type === "armor" ? ["endurance", "healing", "exploration"] : ["exploration", "status", "healing"];
    const reputed = members.filter(member => member.reputation?.title);
    const speaker = preferredRoles.map(kind => reputed.find(member => member.reputation.kind === kind)).find(Boolean)
      || reputed[0]
      || members[[...item.id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % members.length];
    const itemName = drop.displayName || item.name;
    const reason = drop.newUltraRareTitle ? "初めて見る超レア称号" : drop.ultraRareTitleId ? "異様な気配を帯びた品" : drop.newDiscovery ? "初めて持ち帰った品" : "これまでより質のよい品";
    const role = speaker.reputation?.kind || "generic";
    const lines = {
      exploration: `${speaker.name}は「${itemName}」を灯りにかざし、見つけた場所と周囲の痕跡を地図の余白へ書き込んだ。`,
      damage: item.type === "weapon" ? `${speaker.name}は「${itemName}」の重心を確かめ、刃を傷めないよう布で包み直した。` : `${speaker.name}は「${itemName}」を手に取り、次の戦場へ持ち出せる状態か念入りに確かめた。`,
      healing: `${speaker.name}は「${itemName}」の傷みや汚れを拭い、仲間が安全に触れられるよう机の上へ整えた。`,
      status: `${speaker.name}は「${itemName}」に残る匂いと魔力の癖を調べ、使い道を決めるまで素手で触れないよう印を付けた。`,
      endurance: item.type === "armor" ? `${speaker.name}は「${itemName}」の留め具と傷を一つずつ確かめ、どこで一撃を受けた品かを静かに見定めた。` : `${speaker.name}は「${itemName}」を荷の奥へ固定し、帰路で失わないよう結び目を二度確かめた。`,
      generic: `${speaker.name}は「${itemName}」を皆に見せてから、鑑定へ回せるよう丁寧に包んだ。`
    };
    return Object.freeze({ characterId: speaker.id, name: speaker.name, roleTitle: speaker.reputation?.title || null, itemId: item.id, itemName, reason, text: lines[role] || lines.generic });
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
      growth: (result.levelUps || []).map(entry => ({
        name: entry.name,
        level: entry.level,
        newSkillIds: [...(entry.newSkillIds || [])],
        attributeChanges: { ...(entry.attributeChanges || {}) },
        statChanges: { ...(entry.statChanges || {}) }
      })),
      routeEvents: (result.battleLog || []).filter(entry => entry.routeEventId).map(entry => ({
        id: entry.routeEventId,
        kind: entry.kind,
        success: Boolean(entry.routeEventSuccess),
        masteryApplied: Boolean(entry.routeEventMasteryApplied),
        personalPracticeApplied: Boolean(entry.routeEventPersonalPracticeApplied),
        naturalAptitudeApplied: Boolean(entry.routeNaturalAptitudeApplied),
        actorName: entry.explorationActorName || null,
        attributeIds: [...(entry.explorationAttributeIds || [])],
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
      newSharedHuntLedgerTier: result.newSharedHuntLedgerTier ? {
        ...result.newSharedHuntLedgerTier,
        memberIds: [...result.newSharedHuntLedgerTier.memberIds], memberNames: [...result.newSharedHuntLedgerTier.memberNames]
      } : null,
      sharedHuntLedgerProgress: result.sharedHuntLedgerProgress ? {
        ...result.sharedHuntLedgerProgress,
        memberIds: [...result.sharedHuntLedgerProgress.memberIds], memberNames: [...result.sharedHuntLedgerProgress.memberNames]
      } : null,
      namedHuntRecognitionReward: result.namedHuntRecognitionReward ? { ...result.namedHuntRecognitionReward } : null,
      bondFormations: (result.bondFormations || []).map(entry => ({
        memberNames: [...entry.memberNames],
        positions: [...entry.positions],
        sharedSorties: entry.sharedSorties,
        label: entry.label
      })),
      newBossRivalries: (result.newBossRivalries || []).map(entry => ({ ...entry })),
      bossRevengeVictories: (result.bossRevengeVictories || []).map(entry => ({ ...entry })),
      newPartyReputationMoment: result.newPartyReputationMoment ? {
        ...result.newPartyReputationMoment,
        roles: [...result.newPartyReputationMoment.roles],
        memberIds: [...result.newPartyReputationMoment.memberIds],
        memberNames: [...result.newPartyReputationMoment.memberNames]
      } : null,
      partyReturnMoment: result.partyReturnMoment ? {
        ...result.partyReturnMoment,
        roles: [...result.partyReturnMoment.roles],
        memberIds: [...result.partyReturnMoment.memberIds],
        memberNames: [...result.partyReturnMoment.memberNames]
      } : null,
      lootReaction: result.lootReaction ? { ...result.lootReaction } : null,
      targetedHarvest: result.trackedItemHarvestId && result.trackedItemHarvestMonsterId ? {
        itemId: result.trackedItemHarvestId,
        monsterId: result.trackedItemHarvestMonsterId,
        itemQuantity: Math.max(0, Number(result.trackedItemQuantity) || 0),
        monsterQuantity: Math.max(0, Number(result.trackedMonsterQuantity) || 0),
        itemGoal: result.trackedItemGoal || null,
        itemProgress: result.trackedItemProgress ?? null,
        monsterGoal: result.trackedMonsterGoal || null,
        monsterProgress: result.trackedMonsterProgress ?? null,
        practice: result.trackedHarvestPractice ? { ...result.trackedHarvestPractice } : null,
        persistence: result.trackedHarvestPersistence ? { ...result.trackedHarvestPersistence } : null
      } : null,
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
      const reputation = window.Characters.recentExpeditionRole(member);
      return {
        id: member.id, name: member.name, level: member.level,
        jobId: member.jobId || "warrior", raceId: member.raceId || "human", birthId: member.birthId || "common", position,
        recordTitleId: window.Characters.recordTitle(member)?.id || null,
        reputation: reputation?.title ? { kind: reputation.kind, label: reputation.label, title: reputation.title, icon: reputation.icon } : null,
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
        skillMasteryIds: Object.fromEntries(window.Characters.signatureSkills(member)
          .filter(entry => entry.mastery.current)
          .map(entry => [entry.skillId, entry.mastery.current.id])),
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
        primaryAttributes: window.Characters.attributes(member),
        stats: window.Characters.stats(member)
      };
    });
    const baseAcquisitionBonuses = acquisitionApi.resolve(partySnapshot);
    const accessAcquisitionBonuses = window.AccessCodes ? window.AccessCodes.applyAcquisitionBonuses(baseAcquisitionBonuses) : baseAcquisitionBonuses;
    const rumor = window.ExpeditionRumors?.forDungeon(dungeonId) || null;
    const acquisitionBonuses = window.ExpeditionRumors ? window.ExpeditionRumors.apply(accessAcquisitionBonuses, rumor) : accessAcquisitionBonuses;
    const accessDurationMultiplier = window.AccessCodes ? window.AccessCodes.explorationDurationMultiplier() : 1;
    const itemTarget = window.Encyclopedia?.trackedTarget() || null;
    const monsterTarget = window.Encyclopedia?.trackedMonsterTarget() || null;
    const monsterTargetDefinition = monsterTarget ? window.GameData.monsters[monsterTarget.monsterId] : null;
    const monsterTargetHabitatKnown = Boolean(monsterTarget && window.Encyclopedia.monsterHabitats(monsterTarget.monsterId)
      .some(habitat => habitat.dungeonId === dungeonId && habitat.difficultyId === difficultyId));
    const monsterTargetSurveyComplete = Boolean(monsterTarget && window.Encyclopedia.habitatSurvey(dungeonId, difficultyId).complete);
    const trackedMonsterTrailId = monsterTarget && !monsterTargetDefinition?.boss && monsterTargetHabitatKnown && monsterTargetSurveyComplete
      ? monsterTarget.monsterId
      : null;
    const observedMonsterDrops = monsterTarget ? (window.Encyclopedia?.monster?.(monsterTarget.monsterId)?.difficulties?.[difficultyId]?.drops || []) : [];
    const trackedItemHarvestId = itemTarget && monsterTarget && monsterTargetHabitatKnown
      && observedMonsterDrops.includes(itemTarget.itemId)
      && window.MonsterLoot?.fixedDropIds?.(monsterTarget.monsterId, difficultyId).includes(itemTarget.itemId)
      ? itemTarget.itemId
      : null;
    const trackedItemHarvestMonsterId = trackedItemHarvestId ? monsterTarget.monsterId : null;
    const trackedHarvestPractice = trackedItemHarvestId ? members.map(member => {
      const practice = window.Characters.targetedHarvestPractice(member, trackedItemHarvestMonsterId, trackedItemHarvestId);
      return practice.tier ? {
        characterId: member.id, characterName: member.name, tierId: practice.tier.id, tierName: practice.tier.label,
        multiplier: practice.tier.multiplier, successes: practice.record.successes
      } : null;
    }).filter(Boolean).sort((left, right) => right.multiplier - left.multiplier || right.successes - left.successes)[0] || null : null;
    const trackedHarvestPersistence = trackedItemHarvestId ? members.map(member => {
      const persistence = window.Characters.targetedHarvestPersistence(member, trackedItemHarvestMonsterId, trackedItemHarvestId);
      return persistence.tier ? {
        characterId: member.id, characterName: member.name, tierId: persistence.tier.id, tierName: persistence.tier.label,
        multiplier: persistence.tier.multiplier, misses: persistence.misses
      } : null;
    }).filter(Boolean).sort((left, right) => right.multiplier - left.multiplier || right.misses - left.misses)[0] || null : null;
    const trackedHarvestConsultation = window.Characters.targetedHarvestConsultation(trackedHarvestPractice, trackedHarvestPersistence);
    const trackedHarvestConsultationLedger = trackedItemHarvestId
      ? window.Characters.targetedHarvestConsultationLedger(trackedHarvestPractice, trackedHarvestPersistence, trackedItemHarvestMonsterId, trackedItemHarvestId)
      : null;
    const trackedHarvestConsultationRemembered = trackedItemHarvestId ? Boolean(trackedHarvestConsultationLedger) : null;
    const trackedHarvestConsultationTier = trackedHarvestConsultationLedger ? {
      tierId: trackedHarvestConsultationLedger.tier.id, tierName: trackedHarvestConsultationLedger.tier.label,
      multiplier: trackedHarvestConsultationLedger.tier.multiplier, successes: trackedHarvestConsultationLedger.record.successes
    } : null;
    const trackedHarvestConsultationEpithet = trackedHarvestConsultationLedger?.tier.epithet
      ?.replace("{monster}", monsterTargetDefinition?.name || "獲物");
    const routeMonsterIds = Array.from(new Set(baseDungeon.encounters.flatMap(encounter => encounter.groups.flat())));
    const knownMonsterDefeats = Object.fromEntries(routeMonsterIds.map(monsterId => [monsterId, window.Encyclopedia?.monster?.(monsterId)?.defeated || 0]).filter(([, defeated]) => defeated > 0));
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
      knownMonsterDefeats,
      acquisitionBonuses,
      luckAcquisitionMultiplier: window.Characters.luckAcquisitionMultiplier(members),
      rumor,
      accessDurationMultiplier,
      trackedItemId: itemTarget?.itemId || null,
      trackedItemGoal: itemTarget?.quantity || null,
      trackedMonsterId: monsterTarget?.monsterId || null,
      trackedMonsterGoal: monsterTarget?.quantity || null,
      trackedMonsterProgressAtDeparture: monsterTarget?.progress || null,
      trackedMonsterTrailId,
      trackedItemHarvestId,
      trackedItemHarvestMonsterId,
      trackedHarvestPractice,
      trackedHarvestPersistence,
      trackedHarvestConsultationRemembered,
      trackedHarvestConsultationTier,
      startedAt, endsAt: startedAt + Math.max(1000, Math.round(acquisitionApi.durationMs(dungeon.duration, timeMultiplier, acquisitionBonuses) * accessDurationMultiplier)),
      power: Math.round(power),
      seed: Math.floor(window.GameRuntime.random() * 2147483646) + 1
    };
    const rumorDefinition = window.ExpeditionRumors?.definition(rumor);
    window.GameState.addLog(`${window.Party.name(partyIndex)}が${dungeon.name}へ出発しました。${rumorDefinition ? `「${rumorDefinition.name}」の噂を確かめに向かいます。` : ""}${trackedMonsterTrailId ? `現地調査簿を携え、${monsterTargetDefinition.name}の痕跡を追います。` : ""}${trackedItemHarvestId ? `${monsterTargetDefinition.name}から${window.GameData.items[trackedItemHarvestId].name}を採る支度を整えました。` : ""}${trackedHarvestPractice ? `${trackedHarvestPractice.characterName}の「${trackedHarvestPractice.tierName}」手覚えを頼りにします。` : ""}${trackedHarvestPersistence ? `${trackedHarvestPersistence.characterName}は、これまで採れなかった跡も手掛かりにします。` : ""}${trackedHarvestConsultationTier && trackedHarvestConsultation ? `${trackedHarvestConsultationEpithet ? `「${trackedHarvestConsultationEpithet}」と呼ばれる` : ""}${trackedHarvestConsultation.memberNames.join("と")}は、以前二人で綴じた狩り帳の「${trackedHarvestConsultationTier.tierName}」を開きました。${trackedHarvestConsultationLedger.tier.departure}` : ""}`, "info");
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
    const newAdventurerMilestones = [], newAdventurerRecords = [], newSkillMasteries = [], newTargetedHarvestPractices = [], newTargetedHarvestPersistences = [], newBossRivalries = [], bossRevengeVictories = [];
    const encounteredBossIds = Object.keys(outcome.monsterEncounters || {}).filter(id => window.GameData.monsters[id]?.boss);
    const defeatedBossIds = new Set(Object.keys(outcome.monsterCounts || {}).filter(id => window.GameData.monsters[id]?.boss && outcome.monsterCounts[id] > 0));
    const targetedHarvestAttempted = Boolean(expedition.trackedItemHarvestId && expedition.trackedItemHarvestMonsterId);
    const targetedHarvestItemQuantity = targetedHarvestAttempted
      ? outcome.drops.filter(drop => drop.itemId === expedition.trackedItemHarvestId).reduce((sum, drop) => sum + drop.quantity, 0)
      : 0;
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
    const harvestConsultation = targetedHarvestItemQuantity > 0
      ? window.Characters.targetedHarvestConsultation(expedition.trackedHarvestPractice, expedition.trackedHarvestPersistence)
      : null;
    const harvestConsultationMomentId = window.GameData.config.explorationEvents?.targetedHarvestConsultation?.bondMomentId || null;
    const harvestConsultationMoment = harvestConsultationMomentId
      ? (window.GameData.config.explorationEvents?.adventurerBondMoments || []).find(moment => moment.id === harvestConsultationMomentId)
      : null;
    const sharedHuntLedgerBefore = harvestConsultation ? window.Characters.targetedHarvestConsultationLedger(
      expedition.trackedHarvestPractice, expedition.trackedHarvestPersistence,
      expedition.trackedItemHarvestMonsterId, expedition.trackedItemHarvestId
    ) : null;
    if (harvestConsultation) window.Characters.recordSharedHuntLedger(
      harvestConsultation.memberIds, expedition.trackedItemHarvestMonsterId, expedition.trackedItemHarvestId,
      targetedHarvestItemQuantity, window.GameRuntime.now()
    );
    const sharedHuntLedgerAfter = harvestConsultation ? window.Characters.targetedHarvestConsultationLedger(
      expedition.trackedHarvestPractice, expedition.trackedHarvestPersistence,
      expedition.trackedItemHarvestMonsterId, expedition.trackedItemHarvestId
    ) : null;
    const newSharedHuntLedgerTier = sharedHuntLedgerAfter?.tier.id !== sharedHuntLedgerBefore?.tier.id ? {
      memberIds: [...harvestConsultation.memberIds], memberNames: [...harvestConsultation.memberNames],
      monsterId: expedition.trackedItemHarvestMonsterId, itemId: expedition.trackedItemHarvestId,
      tierId: sharedHuntLedgerAfter.tier.id, tierName: sharedHuntLedgerAfter.tier.label,
      successes: sharedHuntLedgerAfter.record.successes, items: sharedHuntLedgerAfter.record.items
    } : null;
    const sharedHuntLedgerProgress = sharedHuntLedgerAfter ? {
      memberIds: [...harvestConsultation.memberIds], memberNames: [...harvestConsultation.memberNames],
      monsterId: expedition.trackedItemHarvestMonsterId, itemId: expedition.trackedItemHarvestId,
      tierId: sharedHuntLedgerAfter.tier.id, tierName: sharedHuntLedgerAfter.tier.label,
      successes: sharedHuntLedgerAfter.record.successes, items: sharedHuntLedgerAfter.record.items,
      nextTierId: sharedHuntLedgerAfter.progress.nextTier?.id || null,
      nextTierName: sharedHuntLedgerAfter.progress.nextTier?.label || null,
      remaining: sharedHuntLedgerAfter.progress.remaining
    } : null;
    const namedHuntRecognitionReward = newSharedHuntLedgerTier && sharedHuntLedgerAfter?.tier.recognitionReward
      ? { ...sharedHuntLedgerAfter.tier.recognitionReward }
      : null;
    if (harvestConsultation && harvestConsultationMoment && window.Characters.recordBondMemory(harvestConsultation.memberIds, harvestConsultationMoment.id)) {
      const key = [...harvestConsultation.memberIds].sort().join("::");
      const sharedSorties = Math.max(1, Number(state.adventurerBonds?.pairs?.[key]) || 1);
      const names = [...harvestConsultation.memberNames];
      newAdventurerBondMomentIds.push(harvestConsultationMoment.id);
      outcome.battleLog.push({
        kind: "bond", encounter: outcome.totalEncounters || 0, round: 0,
        adventurerBondMomentId: harvestConsultationMoment.id,
        adventurerBondMemberIds: [...harvestConsultation.memberIds],
        adventurerBondMemberNames: names,
        sharedSorties,
        text: String(harvestConsultationMoment.text).replace(/\{(left|right)\}/g, (match, keyName) => keyName === "left" ? names[0] : names[1])
      });
    }
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
      Object.assign(report, explorationContributions.get(report.id) || { routeSuccesses: 0, routeEventSuccesses: {}, treasureOpenings: 0, teamSurveys: 0 }, {
        targetedHarvestAttempts: targetedHarvestAttempted ? 1 : 0,
        targetedHarvestSuccesses: targetedHarvestItemQuantity > 0 ? 1 : 0,
        targetedHarvestItems: targetedHarvestItemQuantity,
        targetedHarvestRecord: targetedHarvestAttempted ? {
          monsterId: expedition.trackedItemHarvestMonsterId, itemId: expedition.trackedItemHarvestId,
          attempts: 1, successes: targetedHarvestItemQuantity > 0 ? 1 : 0, items: targetedHarvestItemQuantity
        } : null
      });
      const recordBefore = window.Characters.expeditionRecord(character);
      const harvestPracticeBefore = targetedHarvestAttempted
        ? window.Characters.targetedHarvestPractice(character, expedition.trackedItemHarvestMonsterId, expedition.trackedItemHarvestId)
        : null;
      const harvestPersistenceBefore = targetedHarvestAttempted
        ? window.Characters.targetedHarvestPersistence(character, expedition.trackedItemHarvestMonsterId, expedition.trackedItemHarvestId)
        : null;
      const earnedBefore = earnedMilestonesBefore.get(report.id) || new Set();
      const recordAfter = window.Characters.recordExpedition(character, report, outcome.success, outcome.encountersCleared, expedition.endsAt);
      if (targetedHarvestAttempted) {
        const harvestPracticeAfter = window.Characters.targetedHarvestPractice(character, expedition.trackedItemHarvestMonsterId, expedition.trackedItemHarvestId);
        if (harvestPracticeAfter.tier && harvestPracticeAfter.tier.id !== harvestPracticeBefore?.tier?.id) {
          newTargetedHarvestPractices.push({
            characterId: character.id, name: character.name,
            monsterId: expedition.trackedItemHarvestMonsterId, itemId: expedition.trackedItemHarvestId,
            tierId: harvestPracticeAfter.tier.id, tierName: harvestPracticeAfter.tier.label,
            successes: harvestPracticeAfter.record.successes
          });
        }
        const harvestPersistenceAfter = window.Characters.targetedHarvestPersistence(character, expedition.trackedItemHarvestMonsterId, expedition.trackedItemHarvestId);
        if (harvestPersistenceAfter.tier && harvestPersistenceAfter.tier.id !== harvestPersistenceBefore?.tier?.id) {
          newTargetedHarvestPersistences.push({
            characterId: character.id, name: character.name,
            monsterId: expedition.trackedItemHarvestMonsterId, itemId: expedition.trackedItemHarvestId,
            tierId: harvestPersistenceAfter.tier.id, tierName: harvestPersistenceAfter.tier.label,
            misses: harvestPersistenceAfter.misses
          });
        }
      }
      const milestoneIds = window.Characters.expeditionMilestones(character).filter(entry => entry.complete && !earnedBefore.has(entry.id)).map(entry => entry.id);
      if (milestoneIds.length) newAdventurerMilestones.push({ characterId: character.id, name: character.name, milestoneIds });
      const masteryRanks = window.GameData.config.characterGrowth?.skillMasteryRanks || [];
      const masteries = window.Characters.signatureSkills(character).flatMap(entry => {
        const previousUses = Math.max(0, Number(recordBefore.skillRecords?.[entry.skillId]?.uses) || 0);
        return masteryRanks.filter(rank => previousUses < rank.minimumUses && entry.uses >= rank.minimumUses)
          .map(rank => ({ skillId: entry.skillId, rankId: rank.id, uses: entry.uses }));
      });
      if (masteries.length) newSkillMasteries.push({ characterId: character.id, name: character.name, masteries });
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
    const difficultyId = expedition.difficultyId || "normal";
    const newMonsterInsights = window.Encyclopedia ? window.Encyclopedia.battleInsights(outcome.monsterObservations) : [];
    const newMonsterHabitats = window.Encyclopedia ? window.Encyclopedia.habitatInsights(outcome.monsterEncounters, baseDungeon.id, difficultyId) : [];
    const habitatSurveyBefore = window.Encyclopedia ? window.Encyclopedia.habitatSurvey(baseDungeon.id, difficultyId) : null;
    const habitatSurveySealRewards = { normal: 1, abyss: 2, divine: 3 };
    const newMonsterHabitatSurvey = habitatSurveyBefore && !habitatSurveyBefore.complete
      && habitatSurveyBefore.confirmed + new Set(newMonsterHabitats.map(entry => entry.monsterId)).size >= habitatSurveyBefore.total
      ? { dungeonId: baseDungeon.id, difficultyId, total: habitatSurveyBefore.total, sealReward: habitatSurveySealRewards[difficultyId] || 1 }
      : null;
    const earnsFirstClearReward = outcome.success && difficultyId !== "normal" && !window.DungeonDifficulty.cleared(baseDungeon.id, difficultyId);
    state.gold += outcome.gold;
    const grantedDrops = [], autoSold = [], newItemIds = new Set(), newBestQualities = new Map(), newUltraRareTitleIds = new Set();
    let autoSellGold = 0;
    const acquisitionApi = window.AcquisitionSkills || { normalize: () => ({ qualityRate: { multiplier: 1, flat: 0 } }), memberExperience: base => base };
    const acquisitionBonuses = acquisitionApi.normalize(expedition.acquisitionBonuses);
    const luckMultiplier = Number(expedition.luckAcquisitionMultiplier) || 1;
    acquisitionBonuses.itemRate = acquisitionBonuses.itemRate || { multiplier: 1, flat: 0 };
    acquisitionBonuses.qualityRate = acquisitionBonuses.qualityRate || { multiplier: 1, flat: 0 };
    acquisitionBonuses.itemRate.multiplier *= luckMultiplier;
    acquisitionBonuses.qualityRate.multiplier *= luckMultiplier;
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
      const attributesBefore = window.Characters.attributeBreakdown(character).base;
      const gained = window.Characters.addExperience(character, experience);
      if (gained) {
        const newSkillIds = window.Characters.learnedSkills(character).map(skill => skill.id).filter(skillId => !learnedBefore.has(skillId));
        const statsAfter = window.Characters.stats(character), weightAfter = window.Characters.maxWeight(character);
        const attributesAfter = window.Characters.attributeBreakdown(character).base;
        const attributeChanges = Object.fromEntries(window.Characters.attributeKeys().map(key => [
          key,
          Math.round(((attributesAfter[key] || 0) - (attributesBefore[key] || 0)) * 10) / 10
        ]).filter(([, value]) => value > 0));
        const statChanges = Object.fromEntries([
          ["hp", statsAfter.hp - statsBefore.hp], ["attack", statsAfter.attack - statsBefore.attack], ["defense", statsAfter.defense - statsBefore.defense],
          ["magicAttack", statsAfter.magicAttack - statsBefore.magicAttack], ["magicDefense", statsAfter.magicDefense - statsBefore.magicDefense],
          ["magicHealing", statsAfter.magicHealing - statsBefore.magicHealing], ["speed", statsAfter.speed - statsBefore.speed],
          ["maxWeight", Math.round((weightAfter - weightBefore) * 10) / 10]
        ].filter(([, value]) => value > 0));
        levelUps.push({ name: character.name, levels: gained, level: character.level, newSkillIds, attributeChanges, statChanges });
      }
    });
    const trackedItemId = expedition.trackedItemId || null;
    const trackedItemQuantity = trackedItemId
      ? outcome.drops.filter(drop => drop.itemId === trackedItemId).reduce((sum, drop) => sum + drop.quantity, 0)
      : 0;
    const trackedProgress = trackedItemQuantity ? window.Encyclopedia?.recordTargetProgress(trackedItemId, trackedItemQuantity) : null;
    const trackedMonsterId = expedition.trackedMonsterId || null;
    const trackedMonsterQuantity = trackedMonsterId ? Math.max(0, Number(outcome.monsterCounts?.[trackedMonsterId]) || 0) : 0;
    const trackedMonsterProgress = trackedMonsterQuantity ? window.Encyclopedia?.recordMonsterTargetProgress(trackedMonsterId, trackedMonsterQuantity) : null;
    const adventurerReputationsBefore = new Map(expedition.partyIds.map(id => {
      const character = window.Characters.get(id);
      return [id, character ? window.Characters.recentExpeditionRole(character) : null];
    }));
    const partyReputationMomentBefore = window.Characters.expeditionRoleConversation(expedition.partySnapshot || []);
    state.lastResult = {
      id: `result-${window.GameRuntime.now()}-${partyIndex}`, partyIndex, dungeonId: baseDungeon.id, difficultyId, dungeonName: dungeon.name, completedAt: window.GameRuntime.now(),
      success: outcome.success, gold: outcome.gold, exp: outcome.exp, experienceGains, viewed: false,
      timeMultiplier: expedition.timeMultiplier || 1,
      trackedItemId, trackedItemQuantity,
      trackedItemGoal: expedition.trackedItemGoal || null,
      trackedItemProgress: trackedProgress?.progress ?? null,
      trackedItemHarvestId: outcome.trackedItemHarvestId || null,
      trackedItemHarvestMonsterId: outcome.trackedItemHarvestMonsterId || null,
      trackedHarvestPractice: outcome.trackedHarvestPractice || null,
      trackedHarvestPersistence: outcome.trackedHarvestPersistence || null,
      trackedHarvestConsultationRemembered: outcome.trackedHarvestConsultationRemembered ?? null,
      trackedHarvestConsultationTier: outcome.trackedHarvestConsultationTier || null,
      trackedMonsterId, trackedMonsterQuantity,
      trackedMonsterGoal: expedition.trackedMonsterGoal || null,
      trackedMonsterProgress: trackedMonsterProgress?.progress ?? null,
      trackedMonsterTrailId: outcome.trackedMonsterTrailId || null,
      drops: grantedDrops, autoSold, autoSellGold, levelUps, newItemIds: Array.from(newItemIds),
      lootReaction: lootReaction(grantedDrops, expedition.partySnapshot),
      newSetDiscoveries,
      newBestQualities: Array.from(newBestQualities, ([itemId, qualityId]) => ({ itemId, qualityId })),
      newUltraRareTitleIds: Array.from(newUltraRareTitleIds),
      newAdventurerMilestones,
      newAdventurerRecords,
      newSkillMasteries,
      newTargetedHarvestPractices,
      newTargetedHarvestPersistences,
      newBossRivalries,
      bossRevengeVictories,
      newAdventurerBondMomentIds,
      newAdventurerBondTiers,
      newSharedHuntLedgerTier,
      sharedHuntLedgerProgress,
      namedHuntRecognitionReward,
      rumor: expedition.rumor || null,
      partyNames: expedition.partySnapshot
        ? expedition.partySnapshot.map((member) => member.name)
        : expedition.partyIds.map(window.Characters.get).filter(Boolean).map((c) => c.name),
      partySetup: partySetupSummary(expedition.partySnapshot),
      battleLog: outcome.battleLog,
      mechanicReport: outcome.mechanicReport,
      strategyReport: outcome.strategyReport,
      bondFormations: outcome.bondFormations,
      partyReturnMoment: outcome.partyReturnMoment,
      defeatFacts: outcome.defeatFacts,
      encountersCleared: outcome.encountersCleared,
      totalEncounters: outcome.totalEncounters,
      monstersDefeated: outcome.monstersDefeated,
      monsterCounts: outcome.monsterCounts,
      monsterEncounters: outcome.monsterEncounters,
      monsterObservations: outcome.monsterObservations,
      newMonsterInsights,
      newMonsterHabitats,
      newMonsterHabitatSurvey,
      memberReports: outcome.memberReports,
      survivors: outcome.survivors
    };
    if (newMonsterHabitatSurvey?.sealReward) window.Items.add("guild_seal", newMonsterHabitatSurvey.sealReward);
    if (namedHuntRecognitionReward) window.Items.add(namedHuntRecognitionReward.itemId, namedHuntRecognitionReward.quantity);
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
    if (window.Encyclopedia) {
      const monsterDefeatsBefore = Object.fromEntries(Object.keys(outcome.monsterCounts || {}).map(id => [id, window.Encyclopedia.monster(id)?.defeated || 0]));
      state.lastResult.newMonsterFirstDefeats = window.Encyclopedia.recordBattle(outcome.monsterEncounters, outcome.monsterCounts, outcome.monsterObservations, expedition.difficultyId || "normal", {
        partyIndex,
        partyName: window.Party.name(partyIndex),
        members: (expedition.partySnapshot || []).map(member => ({ characterId: member.id, name: member.name, roleTitle: member.reputation?.title || null })),
        dungeonId: baseDungeon.id,
        completedAt: state.lastResult.completedAt
      });
      state.lastResult.newMonsterHuntMarks = Object.keys(outcome.monsterCounts || {}).flatMap(id => window.Encyclopedia.crossedHuntMarks(id, monsterDefeatsBefore[id] || 0, window.Encyclopedia.monster(id)?.defeated || 0));
      state.lastResult.monsterHuntSealReward = state.lastResult.newMonsterHuntMarks.reduce((sum, entry) => sum + entry.sealReward, 0);
      if (state.lastResult.monsterHuntSealReward) window.Items.add("guild_seal", state.lastResult.monsterHuntSealReward);
      state.lastResult.newMonsterHuntMarks.forEach(entry => {
        const monster = window.GameData.monsters[entry.monsterId], mark = window.Encyclopedia.huntMarks(entry.monsterId).find(candidate => candidate.threshold === entry.threshold);
        if (monster && mark) window.GameState.addLog(`${monster.name}の「${mark.name}」が狩猟記録に刻まれ、調査謝礼としてギルド印章${mark.sealReward}個を受け取りました。`, "success");
      });
      Array.from(newItemIds).forEach(itemId => {
        const discoveredDrop = grantedDrops.find(drop => drop.itemId === itemId && drop.newDiscovery);
        const witness = lootReaction(discoveredDrop ? [{ ...discoveredDrop, newBest: false, newUltraRareTitle: false, ultraRareTitleId: null }] : [], expedition.partySnapshot);
        if (!witness) return;
        window.Encyclopedia.recordItemDiscovery(itemId, {
          characterId: witness.characterId,
          name: witness.name,
          roleTitle: witness.roleTitle,
          dungeonId: baseDungeon.id,
          difficultyId,
          completedAt: state.lastResult.completedAt
        });
      });
      outcome.memberReports.forEach(report => {
        const character = window.Characters.get(report.id);
        if (!character) return;
        const earnedBefore = earnedMilestonesBefore.get(report.id) || new Set();
        const existing = newAdventurerMilestones.find(entry => entry.characterId === report.id);
        const alreadyListed = new Set(existing?.milestoneIds || []);
        const discoveredMilestones = window.Characters.expeditionMilestones(character)
          .filter(entry => entry.complete && !earnedBefore.has(entry.id) && !alreadyListed.has(entry.id))
          .map(entry => entry.id);
        if (!discoveredMilestones.length) return;
        if (existing) existing.milestoneIds.push(...discoveredMilestones);
        else newAdventurerMilestones.push({ characterId: character.id, name: character.name, milestoneIds: discoveredMilestones });
      });
    }
    state.lastResult.newAchievementIds = window.Achievements
      ? window.Achievements.entries().filter(entry => entry.complete && !knownAchievementIds.has(entry.id)).map(entry => entry.id)
      : [];
    state.partyHistory[partyIndex].unshift(historySummary(state.lastResult));
    state.partyHistory[partyIndex] = state.partyHistory[partyIndex].slice(0, 10);
    state.lastResult.newAdventurerReputations = expedition.partyIds.map(id => {
      const character = window.Characters.get(id), current = character ? window.Characters.recentExpeditionRole(character) : null;
      const previous = adventurerReputationsBefore.get(id);
      return current?.title && current.title !== previous?.title
        ? { characterId: id, name: character.name, kind: current.kind, label: current.label, title: current.title, icon: current.icon, previousTitle: previous?.title || null }
        : null;
    }).filter(Boolean);
    const partyReputationMomentAfter = window.Characters.expeditionRoleConversation(expedition.partyIds.map(window.Characters.get).filter(Boolean));
    const newPartyReputationMoment = window.Characters.expeditionRoleConversationChange(partyReputationMomentBefore, partyReputationMomentAfter);
    if (newPartyReputationMoment) {
      state.lastResult.newPartyReputationMoment = {
        label: newPartyReputationMoment.label,
        roles: [...newPartyReputationMoment.roles],
        memberIds: [...newPartyReputationMoment.memberIds],
        memberNames: [...newPartyReputationMoment.memberNames],
        text: newPartyReputationMoment.text
      };
      state.partyHistory[partyIndex][0].newPartyReputationMoment = { ...state.lastResult.newPartyReputationMoment, roles: [...newPartyReputationMoment.roles], memberIds: [...newPartyReputationMoment.memberIds], memberNames: [...newPartyReputationMoment.memberNames] };
    }
    state.partyResults[partyIndex] = state.lastResult;
    window.GameState.addLog(
      `${window.Party.name(partyIndex)}：${dungeon.shortName}の探索は${outcome.success ? "成功" : "失敗"}。${outcome.gold}Gを獲得${autoSellGold ? `、装備${autoSold.length}点を${autoSellGold}Gで自動売却` : ""}しました。`,
      outcome.success ? "success" : "danger"
    );
    if (newBossRivalries.length) window.GameState.addLog(`${newBossRivalries.map(entry => `${entry.name}と${entry.bossName}`).join("、")}の間に、再戦を待つ因縁が残りました。`, "danger");
    if (bossRevengeVictories.length) window.GameState.addLog(`${bossRevengeVictories.map(entry => `${entry.name}が${entry.bossName}`).join("、")}へ雪辱を果たしました。`, "success");
    if (state.lastResult.newAdventurerReputations.length) window.GameState.addLog(`${state.lastResult.newAdventurerReputations.map(entry => `${entry.name}が「${entry.title}」`).join("、")}と呼ばれ始めました。`, "success");
    if (state.lastResult.namedHuntRecognitionReward && state.lastResult.newSharedHuntLedgerTier) {
      const reward = state.lastResult.namedHuntRecognitionReward, rewardItem = window.GameData.items[reward.itemId];
      window.GameState.addLog(`${state.lastResult.newSharedHuntLedgerTier.memberNames.join("と")}の狩り名が町に広まり、狩り名の証として${rewardItem?.name || reward.itemId}${reward.quantity}個を受け取りました。`, "success");
    }
    if (state.lastResult.newPartyReputationMoment) window.GameState.addLog(`${state.lastResult.newPartyReputationMoment.memberNames.join("と")}の間に、「${state.lastResult.newPartyReputationMoment.label}」らしい掛け合いが生まれました。`, "success");
    if (trackedItemQuantity) window.GameState.addLog(`探索目標「${window.GameData.items[trackedItemId].name}」を${trackedItemQuantity}個持ち帰りました。`, "success");
    if (trackedMonsterQuantity) window.GameState.addLog(`討伐目標「${window.GameData.monsters[trackedMonsterId].name}」を${trackedMonsterQuantity}体討伐しました。`, "success");
    if (state.lastResult.newMonsterHabitats.length) window.GameState.addLog(`${dungeon.name}で、${state.lastResult.newMonsterHabitats.map(entry => window.GameData.monsters[entry.monsterId]?.name).filter(Boolean).join("、")}の新しい生息記録を確認しました。`, "success");
    if (state.lastResult.newMonsterHabitatSurvey) window.GameState.addLog(`${dungeon.name}で確認できるすべての魔物が現地記録に揃い、調査謝礼としてギルド印章${state.lastResult.newMonsterHabitatSurvey.sealReward}個を受け取りました。`, "success");
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

  window.Dungeon = { start, completeIfReady, remaining, activeCount, battleSummary, memberHighlights, partySetupSummary, lootReaction };
})();
