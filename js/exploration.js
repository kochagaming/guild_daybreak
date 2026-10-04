(function () {
  "use strict";
  const maximum = 6;
  function valid(value) { return Number.isInteger(value) && value >= 1 && value <= maximum; }
  function plan(dungeon, multiplier = 1) {
    if (!valid(multiplier)) throw new Error("探索倍率が不正です。");
    const base = dungeon.encounters;
    if (multiplier === 1) return { ...dungeon, materialRate: 1, equipmentDropRate: 1, rewardScale: 1 };
    // Extend the approach; encounter the final boss only once per departure.
    const road = base.slice(0, -1);
    const count = base.length * multiplier - 1;
    const encounters = Array.from({ length: count }, (_, index) => ({
      ...road[index % road.length], name: road[index % road.length].name + "・道中" + (index + 1)
    }));
    encounters.push(base[base.length - 1]);
    function expected(route) {
      const totals = {};
      route.forEach(encounter => encounter.groups.forEach(group => group.forEach(id => {
        window.MonsterLoot.materialDrops(id).forEach(drop => {
          totals[drop.itemId] = (totals[drop.itemId] || 0) + drop.chance * (drop.quantity[0] + drop.quantity[1]) / 2 / encounter.groups.length;
        });
      })));
      return totals;
    }
    const normal = expected(base), extended = expected(encounters), materialRates = {};
    Object.keys(extended).forEach(id => {
      materialRates[id] = Math.min(1, (normal[id] || 0) * Math.sqrt(multiplier) / extended[id]);
    });
    return { ...dungeon, encounters, materialRates, equipmentDropRate: 1 / Math.sqrt(multiplier), rewardScale: Math.sqrt(multiplier) };
  }

  function choose(random, values) { return values[Math.floor(random() * values.length)]; }
  function weightedChoice(random, values, weightOf) {
    const total = values.reduce((sum, value) => sum + Math.max(0, Number(weightOf(value)) || 0), 0);
    if (!total) return choose(random, values);
    let roll = random() * total;
    return values.find(value => (roll -= Math.max(0, Number(weightOf(value)) || 0)) <= 0) || values[values.length - 1];
  }
  function weightedDrop(random, drops) {
    const items = window.GameData.items || {};
    const candidates = drops.filter(drop => ["weapon", "armor"].includes(items[drop.itemId]?.type));
    const total = candidates.reduce((sum, drop) => sum + drop.chance, 0);
    if (!total) return null;
    let roll = random() * total;
    return candidates.find(drop => (roll -= drop.chance) <= 0) || candidates[candidates.length - 1];
  }

  function routeMaterialCandidates(dungeon) {
    const candidates = new Map();
    (dungeon.encounters || []).forEach(encounter => (encounter.groups || []).forEach(group => group.forEach(monsterId => {
      (window.MonsterLoot?.materialDrops(monsterId) || []).forEach(drop => {
        const current = candidates.get(drop.itemId) || { itemId: drop.itemId, weight: 0 };
        current.weight += Math.max(.001, Number(drop.chance) || 0);
        candidates.set(drop.itemId, current);
      });
    })));
    return Array.from(candidates.values()).filter(entry => window.GameData.items?.[entry.itemId]?.type === "material");
  }

  function formatEventText(text, values) {
    return String(text).replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
  }

  function routeRumorEntry(dungeon) {
    const definitions = window.GameData.config.explorationEvents || {};
    const environment = definitions.environments?.[dungeon?.color] || definitions.environments?.default;
    const rumors = environment?.rumors || [];
    if (!rumors.length) return { eventId: null, text: "道中では、戦闘以外の小さな兆しも見逃さない方がよい。" };
    const key = String(dungeon?.baseDungeonId || dungeon?.id || "route");
    const hash = Array.from(key).reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 2166136261);
    return rumors[hash % rumors.length];
  }

  function routeRumor(dungeon) { return routeRumorEntry(dungeon).text; }

  function routePracticeCount(member, eventId) {
    const counts = member?.routeEventSuccesses || member?.expeditionRecord?.routeEventSuccesses;
    return Math.max(0, Number(counts?.[eventId]) || 0);
  }

  function hasRoutePractice(member, eventId, definitions) {
    return routePracticeCount(member, eventId) >= (definitions.personalPractice?.successes || 5);
  }

  function sharedSortieCount(left, right) {
    const direct = Math.min(Number(left?.sharedSorties?.[right?.id]) || 0, Number(right?.sharedSorties?.[left?.id]) || 0);
    if (direct > 0 || !left?.id || !right?.id) return direct;
    const key = [left.id, right.id].sort().join("::");
    return Math.max(0, Number(window.GameState?.data?.adventurerBonds?.pairs?.[key]) || 0);
  }

  function bondRouteSupport(member, partySnapshot, definitions) {
    const tiers = definitions.adventurerBondRouteSupport || [];
    const partner = (partySnapshot || []).filter(candidate => candidate?.id && candidate.id !== member?.id).map(candidate => ({
      member: candidate,
      sharedSorties: sharedSortieCount(member, candidate)
    })).sort((left, right) => right.sharedSorties - left.sharedSorties || String(left.member.name).localeCompare(String(right.member.name), "ja"))[0];
    if (!partner) return null;
    const tier = tiers.filter(candidate => partner.sharedSorties >= candidate.minimumSharedSorties)
      .sort((left, right) => right.minimumSharedSorties - left.minimumSharedSorties)[0];
    return tier ? { member: partner.member, sharedSorties: partner.sharedSorties, bonus: tier.successChanceBonus, label: tier.label } : null;
  }

  function routeReadiness(dungeon, partySnapshot = [], knownRouteMasteryIds = []) {
    const rumor = routeRumorEntry(dungeon);
    const definitions = window.GameData.config.explorationEvents || {};
    const event = (definitions.routeEvents || []).find(candidate => candidate.id === rumor.eventId);
    if (!event || !new Set(knownRouteMasteryIds).has(event.id)) {
      return { eventId: rumor.eventId, state: "unknown", text: "観察日記には、まだこの噂と照らせる記録がない。" };
    }
    const aptitude = definitions.aptitudes?.[event.aptitudeId];
    const candidates = aptitude ? partySnapshot.map(member => {
      const practiced = hasRoutePractice(member, event.id, definitions);
      const support = bondRouteSupport(member, partySnapshot, definitions);
      return {
        member,
        practiced,
        support,
        bonus: (aptitude.jobIds.includes(member.jobId) ? aptitude.bonuses.job : 0)
          + (aptitude.raceIds.includes(member.raceId) ? aptitude.bonuses.race : 0)
          + (aptitude.birthIds.includes(member.birthId) ? aptitude.bonuses.birth : 0)
          + (practiced ? definitions.personalPractice.successChanceBonus : 0)
          + (support?.bonus || 0)
      };
    }).sort((left, right) => right.bonus - left.bonus) : [];
    const best = candidates[0], bonus = best?.bonus || 0;
    if (best?.support && (best.practiced || bonus >= .3)) return { eventId: event.id, state: "strong", actorId: best.member.id || null, text: `${best.member.name || "仲間の一人"}には、歩調を知る${best.support.member.name || "旅仲間"}が寄り添っている。` };
    if (best?.practiced) return { eventId: event.id, state: "strong", actorId: best.member.id || null, text: `${best.member.name || "仲間の一人"}は、この兆しを実地で何度も解いている。` };
    if (bonus >= .55) return { eventId: event.id, state: "strong", text: "記録にある複数の経験を併せ持つ者が、この一行にいる。" };
    if (bonus >= .3) return { eventId: event.id, state: "ready", text: "記録とよく似た経験を持つ者が、この一行にいる。" };
    if (bonus > 0) return { eventId: event.id, state: "faint", text: "この一行にも、記録と重なる小さな手掛かりがある。" };
    return { eventId: event.id, state: "unfamiliar", text: "記録を照らしたが、この一行に似た経験はまだ見つからない。" };
  }

  function journey(dungeon, multiplier, seed, itemRateModifier, partySnapshot = [], knownCompanionMomentKeys = [], knownRouteMasteryIds = [], knownTreasureMasteryIds = []) {
    const planned = plan(dungeon, multiplier);
    const definitions = window.GameData.config.explorationEvents || {
      treasure: { extraChance: .2, equipmentChance: .06, goldMinimumRate: .08, goldMaximumRate: .16 },
      environments: { default: { levelName: number => `第${number}区画`, arrivals: ["周囲を警戒しながら、新しい区画へ進んだ。"], discoveries: ["慎重に周囲を調べながら先へ進む。"] } }
    };
    const environment = definitions.environments[dungeon.color] || definitions.environments.default;
    const random = window.GameRuntime.seededRandom(seed + 900007);
    const companionRandom = window.GameRuntime.seededRandom(seed + 1300013);
    const routeRandom = window.GameRuntime.seededRandom(seed + 1900019);
    const bondRandom = window.GameRuntime.seededRandom(seed + 2300023);
    const companionIds = new Set(partySnapshot.map(member => member.companionId).filter(Boolean));
    const companionStages = new Map(partySnapshot.filter(member => member.companionId).map(member => [member.companionId, member.companionStageId || "base"]));
    const stageReached = (companionId, requiredStageId) => {
      const stages = window.GameData.relations.companionProgressions?.[companionId]?.stages || {};
      let stageId = companionStages.get(companionId), remaining = Object.keys(stages).length + 1;
      while (stageId && remaining-- > 0) {
        if (stageId === requiredStageId) return true;
        stageId = stages[stageId]?.previousStageId;
      }
      return false;
    };
    const eligibleCompanionMoments = (definitions.companionMoments || []).filter(moment =>
      moment.companionIds.every(id => companionIds.has(id))
      && Object.entries(moment.requiredStages || {}).every(([companionId, stageId]) => stageReached(companionId, stageId))
    );
    const largestCast = eligibleCompanionMoments.reduce((maximum, moment) => Math.max(maximum, moment.companionIds.length), 0);
    const companionMoments = eligibleCompanionMoments.filter(moment => moment.companionIds.length === largestCast);
    const knownMemories = new Set(knownCompanionMomentKeys);
    const companionScenes = companionMoments.flatMap(moment => moment.lines.map((text, lineIndex) => ({ moment, text, lineIndex, key: `${moment.id}:${lineIndex}` })));
    const unseenCompanionScenes = companionScenes.filter(scene => !knownMemories.has(scene.key));
    const companionScene = companionScenes.length ? choose(companionRandom, unseenCompanionScenes.length ? unseenCompanionScenes : companionScenes) : null;
    const companionFloor = companionScene ? Math.floor(companionRandom() * planned.encounters.length) : -1;
    const genericMembers = partySnapshot.filter(member => !member.companionId);
    const adventurerPairs = [];
    for (let leftIndex = 0; leftIndex < genericMembers.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < genericMembers.length; rightIndex += 1) {
        const left = genericMembers[leftIndex], right = genericMembers[rightIndex];
        const sharedSorties = Math.min(Number(left.sharedSorties?.[right.id]) || 0, Number(right.sharedSorties?.[left.id]) || 0);
        if (sharedSorties >= 5) adventurerPairs.push({ left, right, sharedSorties });
      }
    }
    const adventurerPair = adventurerPairs.length && bondRandom() < (definitions.adventurerBondMomentChance || 0)
      ? choose(bondRandom, adventurerPairs)
      : null;
    const adventurerBondDefinitions = adventurerPair
      ? (definitions.adventurerBondMoments || []).filter(moment => adventurerPair.sharedSorties >= moment.minimumSharedSorties)
      : [];
    const knownAdventurerBondMomentIds = adventurerPair ? new Set([
      ...(adventurerPair.left.bondMomentIds?.[adventurerPair.right.id] || []),
      ...(adventurerPair.right.bondMomentIds?.[adventurerPair.left.id] || [])
    ]) : new Set();
    const unseenAdventurerBondDefinitions = adventurerBondDefinitions.filter(moment => !knownAdventurerBondMomentIds.has(moment.id));
    const adventurerBondDefinition = adventurerBondDefinitions.length ? choose(bondRandom, unseenAdventurerBondDefinitions.length ? unseenAdventurerBondDefinitions : adventurerBondDefinitions) : null;
    const adventurerBondFloor = adventurerBondDefinition ? Math.floor(bondRandom() * planned.encounters.length) : -1;
    const routeDefinitions = definitions.routeEvents || [];
    const rumoredEventId = routeRumorEntry(dungeon).eventId;
    const routeMaterials = routeMaterialCandidates(dungeon);
    const masteredRouteEvents = new Set(knownRouteMasteryIds);
    const masteredTreasureTiers = new Set(knownTreasureMasteryIds);
    const aptitudeBonus = (aptitudeId, member) => {
      const aptitude = definitions.aptitudes?.[aptitudeId];
      return aptitude
        ? (aptitude.jobIds.includes(member.jobId) ? aptitude.bonuses.job : 0)
          + (aptitude.raceIds.includes(member.raceId) ? aptitude.bonuses.race : 0)
          + (aptitude.birthIds.includes(member.birthId) ? aptitude.bonuses.birth : 0)
        : 0;
    };
    const bestGuide = (aptitudeIds, personalPractice) => partySnapshot.flatMap(member => aptitudeIds.map(aptitudeId => {
      const practiced = Boolean(personalPractice?.test(member));
      return { member, aptitudeId, practiced, bonus: aptitudeBonus(aptitudeId, member) + (practiced ? personalPractice.bonus : 0) };
    }))
      .sort((a, b) => b.bonus - a.bonus)[0];
    const routeGuide = routeDefinition => partySnapshot.map(member => {
      const practiced = hasRoutePractice(member, routeDefinition.id, definitions);
      const support = bondRouteSupport(member, partySnapshot, definitions);
      return {
        member,
        practiced,
        support,
        bonus: aptitudeBonus(routeDefinition.aptitudeId, member) + (practiced ? definitions.personalPractice.successChanceBonus : 0) + (support?.bonus || 0)
      };
    }).sort((left, right) => right.bonus - left.bonus)[0];
    // A longer expedition sees more of the road, but fewer events than the same
    // number of short departures. This keeps short runs efficient while making
    // extended journeys feel like more than a stretched battle list.
    const baseRouteEventCount = Math.min(routeDefinitions.length, Math.max(routeDefinitions.length ? 1 : 0, Math.ceil(multiplier / 2)));
    const teamSurvey = definitions.teamSurvey || { specialtyCount: 3, memberCount: 2, extraEvents: 1 };
    const practiceThreshold = definitions.personalPractice?.successes || 5;
    const practicedRouteIds = new Set(), teamSurveyMembers = [];
    partySnapshot.forEach(member => {
      let practiced = false;
      Object.entries(member.routeEventSuccesses || {}).forEach(([eventId, count]) => {
        if (Number(count) < practiceThreshold || !routeDefinitions.some(event => event.id === eventId)) return;
        practicedRouteIds.add(eventId);
        practiced = true;
      });
      if (practiced) teamSurveyMembers.push(member);
    });
    const teamSurveyActive = practicedRouteIds.size >= teamSurvey.specialtyCount && teamSurveyMembers.length >= teamSurvey.memberCount;
    const routeEventCount = Math.min(routeDefinitions.length, planned.encounters.length, baseRouteEventCount + (teamSurveyActive ? teamSurvey.extraEvents || 0 : 0));
    const remainingRouteDefinitions = [...routeDefinitions], selectedRouteDefinitions = [];
    while (selectedRouteDefinitions.length < routeEventCount && remainingRouteDefinitions.length) {
      const selected = weightedChoice(routeRandom, remainingRouteDefinitions, event => (environment.eventWeights?.[event.id] ?? 1) * (event.id === rumoredEventId ? definitions.rumorWeightMultiplier || 1 : 1));
      selectedRouteDefinitions.push(selected);
      remainingRouteDefinitions.splice(remainingRouteDefinitions.indexOf(selected), 1);
    }
    const routeEvents = selectedRouteDefinitions.map((routeDefinition, routeIndex) => {
      const guide = routeGuide(routeDefinition);
      const masteryApplied = masteredRouteEvents.has(routeDefinition.id);
      const chance = Math.min(routeDefinition.maximumChance, routeDefinition.baseChance + (guide?.bonus || 0) + (masteryApplied ? definitions.routeMastery?.successChanceBonus || 0 : 0));
      const success = routeRandom() < chance;
      const applies = routeDefinition.effect.on === (success ? "success" : "failure"), values = { name: guide?.bonus > 0 ? guide.member.name : "一行" };
      let gold = 0, exp = 0, drop = null, effect = null;
      if (applies && routeDefinition.effect.type === "gold") {
        const minimum = Math.max(1, Math.floor(dungeon.rewards.gold[0] * routeDefinition.effect.minimumRate));
        const maximumGold = Math.max(minimum, Math.floor(dungeon.rewards.gold[1] * routeDefinition.effect.maximumRate));
        gold = Math.floor(minimum + routeRandom() * (maximumGold - minimum + 1));
        values.gold = gold;
      } else if (applies && routeDefinition.effect.type === "experience") {
        const minimum = Math.max(1, Math.floor(dungeon.rewards.exp[0] * routeDefinition.effect.minimumRate));
        const maximumExperience = Math.max(minimum, Math.floor(dungeon.rewards.exp[1] * routeDefinition.effect.maximumRate));
        exp = Math.floor(minimum + routeRandom() * (maximumExperience - minimum + 1));
      } else if (applies && routeDefinition.effect.type === "material" && routeMaterials.length) {
        const selected = weightedChoice(routeRandom, routeMaterials, entry => entry.weight);
        const minimum = Math.max(1, Math.round(routeDefinition.effect.minimumQuantity || 1));
        const maximumQuantity = Math.max(minimum, Math.round(routeDefinition.effect.maximumQuantity || minimum));
        const quantity = Math.floor(minimum + routeRandom() * (maximumQuantity - minimum + 1));
        drop = { itemId: selected.itemId, quantity };
        values.item = window.GameData.items[selected.itemId].name;
        values.quantity = quantity;
      } else if (applies) effect = { type: routeDefinition.effect.type, rate: routeDefinition.effect.rate };
      const teamSurveyApplied = teamSurveyActive && routeIndex >= baseRouteEventCount;
      const bondSupportApplied = Boolean(guide?.support);
      const eventText = formatEventText(success ? routeDefinition.successText : routeDefinition.failureText, values);
      const supportText = bondSupportApplied ? `${guide.support.member.name}も慣れた合図で${guide.member.name}を支えた。` : "";
      return {
        id: routeDefinition.id, kind: routeDefinition.kind, success, masteryApplied, personalPracticeApplied: Boolean(guide?.practiced), teamSurveyApplied, bondSupportApplied, rumorMatched: routeDefinition.id === rumoredEventId, gold, exp, drop, effect,
        ...(teamSurveyApplied ? { teamSurveyMemberIds: teamSurveyMembers.map(member => member.id), teamSurveyMemberNames: teamSurveyMembers.map(member => member.name) } : {}),
        ...(bondSupportApplied ? { bondSupportMemberIds: [guide.member.id, guide.support.member.id], bondSupportMemberNames: [guide.member.name, guide.support.member.name], bondSupportLabel: guide.support.label } : {}),
        actorId: guide?.bonus > 0 ? guide.member.id : null,
        actorName: guide?.bonus > 0 ? guide.member.name : null,
        text: `${eventText}${supportText ? ` ${supportText}` : ""}`
      };
    });
    const routeFloors = planned.encounters.length > 2
      ? Array.from({ length: planned.encounters.length - 2 }, (_, index) => index + 1)
      : planned.encounters.map((_, index) => index);
    for (let index = routeFloors.length - 1; index > 0; index -= 1) {
      const other = Math.floor(routeRandom() * (index + 1));
      [routeFloors[index], routeFloors[other]] = [routeFloors[other], routeFloors[index]];
    }
    const routeEventsByFloor = new Map(routeEvents.map((event, index) => [routeFloors[index] ?? 0, event]));
    const treasureRate = definitions.treasure.extraChance / Math.sqrt(multiplier);
    const treasureFloors = planned.encounters.map(() => random() < treasureRate);
    if (!treasureFloors.some(Boolean)) treasureFloors[Math.floor(random() * planned.encounters.length)] = true;
    return planned.encounters.map((encounter, index) => {
      const level = environment.levelName(index + 1);
      const entries = [
        { kind: "arrival", text: `${level}に到着した。${choose(random, environment.arrivals)}` },
        { kind: "explore", text: choose(random, environment.discoveries) }
      ];
      const routeEvent = routeEventsByFloor.get(index);
      if (routeEvent) entries.push({ kind: routeEvent.kind, routeEventId: routeEvent.id, routeEventSuccess: routeEvent.success, routeEventMasteryApplied: routeEvent.masteryApplied, routeEventPersonalPracticeApplied: routeEvent.personalPracticeApplied, routeTeamSurveyApplied: routeEvent.teamSurveyApplied, routeTeamSurveyMemberIds: routeEvent.teamSurveyMemberIds, routeTeamSurveyMemberNames: routeEvent.teamSurveyMemberNames, routeBondSupportApplied: routeEvent.bondSupportApplied, routeBondSupportMemberIds: routeEvent.bondSupportMemberIds, routeBondSupportMemberNames: routeEvent.bondSupportMemberNames, routeBondSupportLabel: routeEvent.bondSupportLabel, routeRumorMatched: routeEvent.rumorMatched, explorationActorId: routeEvent.actorId, explorationActorName: routeEvent.actorName, text: routeEvent.text });
      if (index === companionFloor) {
        entries.push({ kind: "companion", companionIds: [...companionScene.moment.companionIds], momentId: companionScene.moment.id, companionLineIndex: companionScene.lineIndex, text: companionScene.text });
      }
      if (index === adventurerBondFloor) {
        entries.push({
          kind: "bond",
          adventurerBondMomentId: adventurerBondDefinition.id,
          adventurerBondMemberIds: [adventurerPair.left.id, adventurerPair.right.id],
          adventurerBondMemberNames: [adventurerPair.left.name, adventurerPair.right.name],
          sharedSorties: adventurerPair.sharedSorties,
          text: formatEventText(adventurerBondDefinition.text, { left: adventurerPair.left.name, right: adventurerPair.right.name })
        });
      }
      const discovery = index === 0 ? window.Story?.dungeonDiscoveryScene(dungeon) : null;
      if (discovery) entries.push({ kind: "story", sceneId: discovery.id, text: `【${discovery.name}】${discovery.text}` });
      let gold = routeEvent?.gold || 0, exp = routeEvent?.exp || 0;
      const drops = routeEvent?.drop ? [routeEvent.drop] : [];
      if (treasureFloors[index]) {
        const treasureTypes = definitions.treasure.types || [{ id: "weathered", name: "古びた宝箱", rank: 0, weight: 1, equipmentChanceMultiplier: 1, goldMultiplier: 1 }];
        const difficultyOrder = Number(dungeon.difficultyTier?.order || 0);
        const advancement = Math.min(2.5, Math.max(0, Number(dungeon.recommendedLevel || 1) / 50 + difficultyOrder * .75));
        const chest = weightedChoice(random, treasureTypes, entry => entry.weight * (entry.rank ? 1 + advancement * entry.rank : 1));
        const challenge = chest.challenge;
        const treasurePractice = definitions.treasurePersonalPractice || { openings: 10, successChanceBonus: .05 };
        const guide = challenge ? bestGuide(challenge.aptitudeIds || [], {
          bonus: treasurePractice.successChanceBonus || 0,
          test: member => Math.max(0, Number(member?.treasureOpenings) || 0) >= (treasurePractice.openings || 10)
        }) : null;
        const treasureMasteryApplied = Boolean(challenge && masteredTreasureTiers.has(chest.id));
        const treasurePersonalPracticeApplied = Boolean(challenge && guide?.practiced);
        const masteryBonus = treasureMasteryApplied ? definitions.treasureMastery?.successChanceBonus || 0 : 0;
        const openChance = challenge ? Math.min(challenge.maximumChance, challenge.baseChance + (guide?.bonus || 0) + masteryBonus) : 1;
        const opened = random() < openChance;
        const chestMeta = {
          treasureTierId: chest.id, treasureTierRank: chest.rank, treasureOpened: opened, treasureMasteryApplied, treasurePersonalPracticeApplied,
          explorationActorId: guide?.bonus > 0 ? guide.member.id : null,
          explorationActorName: guide?.bonus > 0 ? guide.member.name : null
        };
        const challengeText = !challenge ? "傷んだ留め具を外し、蓋を開いた。" : formatEventText(opened ? challenge.successText : challenge.failureText, { name: guide?.bonus > 0 ? guide.member.name : "一行" });
        entries.push({ kind: "treasure", ...chestMeta, text: `${level}で【${chest.name}】を発見した。${challengeText}` });
        const baseEquipmentChance = definitions.treasure.equipmentChance * chest.equipmentChanceMultiplier;
        const equipmentChance = window.AcquisitionSkills ? window.AcquisitionSkills.chance(baseEquipmentChance, itemRateModifier) : Math.min(1, baseEquipmentChance);
        let treasureDrop = null;
        if (opened && random() < equipmentChance) {
          const selected = weightedDrop(random, dungeon.drops || []);
          if (selected) {
            treasureDrop = { itemId: selected.itemId, quantity: 1 };
            drops.push(treasureDrop);
            entries.push({ kind: "treasureItem", ...chestMeta, text: `${chest.name}から「${window.GameData.items[selected.itemId].name}」を手に入れた！` });
          }
        }
        if (!treasureDrop) {
          const failureMultiplier = opened ? 1 : challenge?.failureGoldMultiplier || 0;
          const minimum = Math.max(1, Math.floor(dungeon.rewards.gold[0] * definitions.treasure.goldMinimumRate * chest.goldMultiplier * failureMultiplier));
          const maximumGold = Math.max(minimum, Math.floor(dungeon.rewards.gold[1] * definitions.treasure.goldMaximumRate * chest.goldMultiplier * failureMultiplier));
          const treasureGold = Math.floor(minimum + random() * (maximumGold - minimum + 1));
          gold += treasureGold;
          entries.push({ kind: "treasureGold", ...chestMeta, text: `${chest.name}から${treasureGold}Gを手に入れた${opened ? "！" : "。"}` });
        }
      }
      return { level, entries, gold, exp, drop: drops[0] || null, drops, routeEffect: routeEvent?.effect || null, encounterName: encounter.name };
    });
  }
  window.Exploration = { maximum, valid, plan, journey, routeRumor, routeRumorEntry, routeReadiness };
})();
