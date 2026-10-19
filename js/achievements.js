(function () {
  "use strict";

  function difficultyChapterAtlas(difficultyId, state = window.GameState.data) {
    const difficulty = window.GameData.dungeonDifficulties[difficultyId];
    if (!difficulty) return Object.freeze([]);
    const clearedRoutes = new Set(state.story?.facts?.difficultyClears || []);
    const chapters = window.GameData.storyChapters
      .map((chapter, chapterIndex) => {
        const routes = Object.values(window.GameData.dungeons)
          .filter(dungeon => dungeon.chapterId === chapter.id && dungeon.requiredForStory)
          .sort((left, right) => (left.orderInChapter || 0) - (right.orderInChapter || 0) || left.id.localeCompare(right.id, "en"));
        if (!routes.length) return null;
        const cleared = routes.filter(dungeon => clearedRoutes.has(`${dungeon.id}:${difficultyId}`)).length;
        const remaining = routes.length - cleared;
        const nextDungeon = routes.find(dungeon => !clearedRoutes.has(`${dungeon.id}:${difficultyId}`)
          && window.DungeonDifficulty.unlocked(dungeon.id, difficultyId, state));
        const opened = routes.some(dungeon => window.Story.canEnter(dungeon.id, state));
        return Object.freeze({
          chapterId: chapter.id,
          chapterNumber: chapter.number,
          chapterTitle: chapter.title,
          order: chapter.order ?? chapterIndex,
          difficultyId,
          difficultyName: difficulty.name,
          cleared,
          total: routes.length,
          remaining,
          ratio: routes.length ? cleared / routes.length : 0,
          complete: remaining === 0,
          opened,
          nextDungeonId: nextDungeon?.id || null
        });
      })
      .filter(Boolean)
      .sort((left, right) => left.order - right.order || left.chapterId.localeCompare(right.chapterId, "en"));
    return Object.freeze(chapters);
  }

  function count(condition, state) {
    const story = state.story || { completed: [], facts: {} };
    const facts = story.facts || {};
    if (condition.type === "characters") return (state.characters || []).length;
    if (condition.type === "partyMembers") return Math.max(0, ...(state.parties || []).map(party => party.length));
    if (condition.type === "chapters") return (story.completed || []).filter(id => window.GameData.storyChapters.some(chapter => chapter.id === id && chapter.number >= 1 && chapter.kind !== "postgame")).length;
    if (condition.type === "postgameChapters") return (story.completed || []).filter(id => window.GameData.storyChapters.some(chapter => chapter.id === id && chapter.kind === "postgame")).length;
    if (condition.type === "specificDungeonClear") return (facts.clears || []).includes(condition.dungeonId) ? 1 : 0;
    if (condition.type === "dungeonClears") return (facts.clears || []).length;
    if (condition.type === "optionalClears") return (facts.clears || []).filter(id => window.GameData.dungeons[id] && !window.GameData.dungeons[id].requiredForStory).length;
    if (condition.type === "abyssClears") return (facts.difficultyClears || []).filter(key => String(key).endsWith(":abyss")).length;
    if (condition.type === "divineClears") return (facts.difficultyClears || []).filter(key => String(key).endsWith(":divine")).length;
    if (condition.type === "difficultyChapters") {
      return difficultyChapterAtlas(condition.difficultyId, state).filter(chapter => chapter.complete).length;
    }
    if (condition.type === "retryPreparationObserved") return facts.retryPreparationObserved ? 1 : 0;
    if (condition.type === "retryPreparationOvercome") return facts.retryPreparationOvercome ? 1 : 0;
    if (condition.type === "monsterSpecies") return Object.values(state.encyclopedia?.monsters || {}).filter(record => (record.defeated || 0) > 0).length;
    if (condition.type === "monsterDefeats") return Object.values(state.encyclopedia?.monsters || {}).reduce((total, record) => total + Math.max(0, record.defeated || 0), 0);
    if (condition.type === "itemTypes") return Object.keys(state.encyclopedia?.items || {}).filter(id => (state.encyclopedia.items[id] || 0) > 0).length;
    if (condition.type === "equipmentSetCompletions") {
      const discovered = state.encyclopedia?.items || {};
      return Object.values(window.GameData.equipmentSets || {}).filter(definition => definition.itemIds.every(id => (discovered[id] || 0) > 0)).length;
    }
    if (condition.type === "companionMemories") return (facts.companionMoments || []).length;
    if (condition.type === "companionPairMemories") {
      const moments = new Map((window.GameData.config.explorationEvents?.companionMoments || []).map(moment => [moment.id, moment]));
      return (facts.companionMoments || []).filter(key => moments.get(String(key).slice(0, String(key).lastIndexOf(":")))?.companionIds.length > 1).length;
    }
    if (condition.type === "companionBonds") {
      const memories = new Set(facts.companionMoments || []);
      return (window.GameData.config.explorationEvents?.companionMoments || []).filter(moment => moment.companionIds.length > 1
        && moment.lines.every((line, lineIndex) => memories.has(`${moment.id}:${lineIndex}`))).length;
    }
    if (condition.type === "routeEventEncounters") {
      const records = facts.routeEvents || {};
      return (window.GameData.config.explorationEvents?.routeEvents || []).filter(event => (records[event.id]?.encounters || 0) > 0).length;
    }
    if (condition.type === "routeRumorConfirmations") {
      const records = facts.routeEvents || {};
      return (window.GameData.config.explorationEvents?.routeEvents || []).filter(event => (records[event.id]?.rumorMatches || 0) > 0).length;
    }
    if (condition.type === "routeEventMasteries") {
      const records = facts.routeEvents || {};
      const required = window.GameData.config.explorationEvents?.routeMastery?.successes || 3;
      return (window.GameData.config.explorationEvents?.routeEvents || []).filter(event => (records[event.id]?.successes || 0) >= required).length;
    }
    if (condition.type === "teamSurveys") return Math.max(0, Number(facts.teamSurveys) || 0);
    if (condition.type === "treasureTierMasteries") {
      const records = facts.treasureTiers || {};
      const required = window.GameData.config.explorationEvents?.treasureMastery?.openings || 3;
      return (window.GameData.config.explorationEvents?.treasure?.types || []).filter(tier => tier.challenge && (records[tier.id]?.openings || 0) >= required).length;
    }
    if (condition.type === "namedHunts") {
      const epithetThresholds = (window.GameData.config.explorationEvents?.targetedHarvestConsultation?.rememberedTiers || [])
        .filter(tier => tier.epithet).map(tier => tier.minimumSuccesses);
      const required = epithetThresholds.length ? Math.min(...epithetThresholds) : Infinity;
      return Object.values(state.adventurerBonds?.huntLedgers || {}).reduce((total, ledgers) => total
        + Object.values(ledgers || {}).filter(record => Math.max(0, Number(record?.successes) || 0) >= required).length, 0);
    }
    if (condition.type === "routeMentorshipLineages") {
      return window.Characters.routeMentorshipLineageCount(state);
    }
    if (condition.type === "routeLineageSorties") return Math.max(0, Number(facts.routeLineageSorties) || 0);
    if (condition.type === "routeTraditions") return new Set(facts.routeTraditions || []).size;
    if (condition.type === "ultraRareOwned") return (state.inventory?.equipment || []).filter(item => item.ultraRareTitleId).length;
    if (condition.type === "facilityUpgrades") {
      const trackIds = window.GameData.config.facilities?.trackOrder || [];
      return (window.GameData.config.facilities?.order || []).reduce((total, id) => total + trackIds.reduce((sum, trackId) => sum + Math.max(0, (state.facilities?.[id]?.levels?.[trackId] || 1) - 1), 0), 0);
    }
    return 0;
  }

  function entry(definition, state = window.GameState.data) {
    const current = count(definition.condition, state);
    const dynamicTargets = {
      routeEventEncounters: () => (window.GameData.config.explorationEvents?.routeEvents || []).length,
      routeRumorConfirmations: () => (window.GameData.config.explorationEvents?.routeEvents || []).length,
      routeEventMasteries: () => (window.GameData.config.explorationEvents?.routeEvents || []).length,
      treasureTierMasteries: () => (window.GameData.config.explorationEvents?.treasure?.types || []).filter(tier => tier.challenge).length
    };
    const target = definition.condition.target === "all" ? Math.max(1, dynamicTargets[definition.condition.type]?.() || 1) : definition.condition.target;
    return Object.freeze({ ...definition, current, target, complete: current >= target, ratio: target ? Math.min(1, current / target) : 1 });
  }

  function entries(state = window.GameState.data) {
    return window.GameData.achievements.map(definition => entry(definition, state));
  }

  function summary(state = window.GameState.data) {
    const all = entries(state), completed = all.filter(value => value.complete).length;
    return Object.freeze({ completed, total: all.length, ratio: all.length ? completed / all.length : 1 });
  }

  function nextGoals(limit = 3, state = window.GameState.data) {
    const maximum = Math.max(0, Math.floor(Number(limit) || 0));
    return Object.freeze(entries(state)
      .filter(value => !value.complete && !value.secret)
      .sort((left, right) => right.ratio - left.ratio
        || right.current - left.current
        || left.target - right.target
        || left.id.localeCompare(right.id, "en"))
      .slice(0, maximum));
  }

  function destination(value) {
    const type = value?.condition?.type || value?.type;
    if (type === "characters") return Object.freeze({ id: "recruitment", label: "仲間を募集" });
    if (type === "partyMembers") return Object.freeze({ id: "formation", label: "編成する" });
    if (["chapters", "postgameChapters", "specificDungeonClear", "dungeonClears", "optionalClears", "abyssClears", "divineClears", "difficultyChapters"].includes(type)) return Object.freeze({ id: "adventure", label: "出撃先を選ぶ" });
    if (["monsterSpecies", "monsterDefeats", "namedHunts"].includes(type)) return Object.freeze({ id: "monsters", label: "魔物図鑑を見る" });
    if (["itemTypes", "equipmentSetCompletions", "ultraRareOwned"].includes(type)) return Object.freeze({ id: "items", label: "アイテム図鑑を見る" });
    if (["companionMemories", "companionPairMemories", "companionBonds"].includes(type)) return Object.freeze({ id: "companions", label: "人物録を見る" });
    if (type === "routeLineageSorties") return Object.freeze({ id: "formation", label: "三代を編成" });
    if (type === "routeTraditions") return Object.freeze({ id: "records", label: "道標帳を見る" });
    if (["routeEventEncounters", "routeRumorConfirmations", "routeEventMasteries", "teamSurveys", "treasureTierMasteries", "routeMentorshipLineages", "retryPreparationObserved", "retryPreparationOvercome"].includes(type)) return Object.freeze({ id: "observations", label: "観察日記を見る" });
    if (type === "facilityUpgrades") return Object.freeze({ id: "guild", label: "施設を強化" });
    return Object.freeze({ id: "achievements", label: "記録を見る" });
  }

  function routeMonsterIds(dungeon) {
    return Array.from(new Set((dungeon?.encounters || []).flatMap(encounter => (encounter.groups || []).flat()))).filter(id => window.GameData.monsters[id]);
  }

  function routeItemIds(dungeon, difficultyId = "normal") {
    const variant = window.DungeonDifficulty?.variant?.(dungeon, difficultyId) || dungeon;
    const ids = new Set((dungeon?.drops || []).map(drop => drop.itemId).filter(Boolean));
    routeMonsterIds(dungeon).forEach(monsterId => {
      (window.MonsterLoot?.fixedDropIds?.(monsterId, difficultyId) || []).forEach(id => ids.add(id));
      (window.MonsterLoot?.preview?.(variant, window.GameData.monsters[monsterId]) || []).forEach(item => ids.add(item.id));
    });
    return Array.from(ids).filter(id => window.GameData.items[id]);
  }

  function expeditionPotential(value, dungeonId, difficultyId = "normal", state = window.GameState.data) {
    const definition = value?.condition ? value : window.GameData.achievements.find(entry => entry.id === value?.id || entry.id === value);
    const dungeon = window.GameData.dungeons[dungeonId];
    if (!definition || !dungeon) return Object.freeze({ relevant: false, possibleGain: 0, note: "攻略先を選ぶと目標との関係が分かります。" });
    const type = definition.condition.type, facts = state.story?.facts || {};
    let relevant = false, possibleGain = 0, note = "この攻略先では直接進まない目標です。";
    if (type === "dungeonClears") {
      relevant = !(facts.clears || []).includes(dungeonId); possibleGain = relevant ? 1 : 0;
      note = relevant ? "未踏破のため、攻略できれば記録が1つ進みます。" : "攻略済みの土地なので、踏破数は増えません。";
    } else if (type === "optionalClears") {
      relevant = !dungeon.requiredForStory && !(facts.clears || []).includes(dungeonId); possibleGain = relevant ? 1 : 0;
      note = relevant ? "未踏破の脇道なので、攻略できれば記録が1つ進みます。" : "未踏破の任意攻略地を選ぶと進む目標です。";
    } else if (type === "abyssClears") {
      relevant = difficultyId === "abyss" && !(facts.difficultyClears || []).includes(`${dungeonId}:abyss`); possibleGain = relevant ? 1 : 0;
      note = relevant ? "未踏破の魔境なので、攻略できれば記録が1つ進みます。" : "未踏破の魔境難易度を選ぶと進む目標です。";
    } else if (type === "divineClears") {
      relevant = difficultyId === "divine" && !(facts.difficultyClears || []).includes(`${dungeonId}:divine`); possibleGain = relevant ? 1 : 0;
      note = relevant ? "未踏破の神域なので、攻略できれば記録が1つ進みます。" : "未踏破の神域難易度を選ぶと進む目標です。";
    } else if (type === "difficultyChapters") {
      const targetDifficultyId = definition.condition.difficultyId;
      const chapterRoutes = Object.values(window.GameData.dungeons).filter(route => route.chapterId === dungeon.chapterId && route.requiredForStory);
      const clearedRoutes = new Set(facts.difficultyClears || []);
      const remaining = chapterRoutes.filter(route => !clearedRoutes.has(`${route.id}:${targetDifficultyId}`));
      relevant = difficultyId === targetDifficultyId && dungeon.requiredForStory && remaining.some(route => route.id === dungeonId);
      possibleGain = relevant && remaining.length === 1 ? 1 : 0;
      const tierName = window.DungeonDifficulty.tier(targetDifficultyId).name;
      note = relevant
        ? remaining.length === 1
          ? `この道を攻略すれば、この章の${tierName}踏破図が完成します。`
          : `この章の${tierName}踏破図は、あと${remaining.length}か所で完成します。`
        : `未踏破の本編${tierName}を選ぶと、章の踏破図が埋まります。`;
    } else if (type === "specificDungeonClear") {
      relevant = definition.condition.dungeonId === dungeonId && !(facts.clears || []).includes(dungeonId); possibleGain = relevant ? 1 : 0;
      note = relevant ? "この土地が目標です。攻略できれば記章へ届きます。" : "記章に記された別の土地を攻略する目標です。";
    } else if (type === "monsterSpecies") {
      const unknown = routeMonsterIds(dungeon).filter(id => !(state.encyclopedia?.monsters?.[id]?.defeated > 0));
      relevant = unknown.length > 0; possibleGain = unknown.length;
      note = relevant
        ? `この土地には、まだ討伐記録のない魔物が${unknown.length}種類います。`
        : "この土地で確認できる魔物は、すべて討伐記録済みです。";
    } else if (type === "monsterDefeats") {
      possibleGain = (dungeon.encounters || []).reduce((total, encounter) => {
        const groupSizes = (encounter.groups || []).map(group => group.length).filter(Boolean);
        return total + (groupSizes.length ? Math.min(...groupSizes) : 0);
      }, 0);
      relevant = possibleGain > 0;
      note = relevant ? `1倍探索でも少なくとも${possibleGain}体との戦いが、討伐記録へつながります。` : "この土地には討伐対象が確認できません。";
    } else if (type === "itemTypes") {
      const unknown = routeItemIds(dungeon, difficultyId).filter(id => !(Number(state.encyclopedia?.items?.[id]) > 0));
      relevant = unknown.length > 0; possibleGain = unknown.length;
      note = relevant
        ? `この土地では、まだ発見していない品が${unknown.length}種類見つかる可能性があります。`
        : "この土地で得られる品は、すべて発見記録にあります。";
    } else if (type === "equipmentSetCompletions") {
      const discovered = state.encyclopedia?.items || {};
      const missingSetItems = new Set(Object.values(window.GameData.equipmentSets || {}).filter(set => !set.itemIds.every(id => Number(discovered[id]) > 0))
        .flatMap(set => set.itemIds.filter(id => !(Number(discovered[id]) > 0))));
      const possible = routeItemIds(dungeon, difficultyId).filter(id => missingSetItems.has(id));
      relevant = possible.length > 0; possibleGain = possible.length;
      note = relevant ? `未完成の組合せに必要な品が${possible.length}種類見つかる可能性があります。` : "未完成の組合せに必要な品は、この土地の発見候補にありません。";
    } else if (type === "ultraRareOwned") {
      const equipment = routeItemIds(dungeon, difficultyId).filter(id => ["weapon", "armor"].includes(window.GameData.items[id]?.type));
      relevant = equipment.length > 0; possibleGain = relevant ? 1 : 0;
      note = relevant ? "装備品が見つかれば、ごくまれに名を持つ逸品となる可能性があります。" : "この土地では装備品の発見候補がありません。";
    } else if (["chapters", "postgameChapters"].includes(type)) {
      const chapter = window.GameData.storyChapters.find(entry => entry.id === dungeon.chapterId);
      const matchingChapter = type === "postgameChapters" ? chapter?.kind === "postgame" : chapter?.kind !== "postgame";
      relevant = Boolean(dungeon.requiredForStory && matchingChapter && !(facts.clears || []).includes(dungeonId));
      possibleGain = relevant ? 1 : 0;
      note = relevant
        ? `${type === "postgameChapters" ? "星後領域" : "本編"}の未攻略地です。この道を進めることが章の達成へつながります。`
        : `${type === "postgameChapters" ? "星後領域" : "本編"}の未攻略地を進める目標です。`;
    } else if (type === "routeLineageSorties") {
      relevant = true; possibleGain = 1; note = "最初の案内役、道を継いだ案内役、新人を同じ道へ編成して帰還すると進みます。";
    } else if (type === "routeTraditions") {
      relevant = !(facts.routeTraditions || []).includes(`${dungeonId}:${difficultyId}`); possibleGain = relevant ? 1 : 0;
      note = relevant ? "この道にはまだギルドの道標がありません。三代の案内役で帰還すると記録が進みます。" : "この道にはすでにギルドの道標が残っています。";
    } else if (["companionMemories", "companionPairMemories", "companionBonds", "routeEventEncounters", "routeRumorConfirmations", "routeEventMasteries", "teamSurveys", "treasureTierMasteries", "namedHunts", "routeMentorshipLineages"].includes(type)) {
      relevant = true; note = "道中で起きた出来事や積み重ねが目標へつながります。";
    }
    return Object.freeze({ relevant, possibleGain, note });
  }

  function expeditionCandidates(value, state = window.GameState.data) {
    const definition = value?.condition ? value : window.GameData.achievements.find(entry => entry.id === value?.id || entry.id === value);
    if (!definition || entry(definition, state).complete) return Object.freeze([]);
    const chapterOrder = new Map(window.GameData.storyChapters.map((chapter, index) => [chapter.id, chapter.order ?? index]));
    const dungeons = Object.values(window.GameData.dungeons).sort((left, right) => (chapterOrder.get(left.chapterId) || 0) - (chapterOrder.get(right.chapterId) || 0)
      || (left.orderInChapter || 0) - (right.orderInChapter || 0)
      || left.id.localeCompare(right.id, "en"));
    const candidates = dungeons.flatMap(dungeon => {
      if (!window.Story.canEnter(dungeon.id)) return [];
      const difficultyId = window.DungeonDifficulty.ids().find(id => window.DungeonDifficulty.unlocked(dungeon.id, id)
        && expeditionPotential(definition, dungeon.id, id, state).relevant);
      if (!difficultyId) return [];
      const potential = expeditionPotential(definition, dungeon.id, difficultyId, state);
      return [Object.freeze({ dungeonId: dungeon.id, difficultyId, possibleGain: potential.possibleGain, note: potential.note })];
    });
    return Object.freeze(candidates.sort((left, right) => right.possibleGain - left.possibleGain
      || (chapterOrder.get(window.GameData.dungeons[left.dungeonId].chapterId) || 0) - (chapterOrder.get(window.GameData.dungeons[right.dungeonId].chapterId) || 0)
      || (window.GameData.dungeons[left.dungeonId].orderInChapter || 0) - (window.GameData.dungeons[right.dungeonId].orderInChapter || 0)));
  }

  function earnedOn(id, state = window.GameState.data) {
    const records = (state.partyHistory || []).flatMap((history, partyIndex) => (history || [])
      .filter(record => (record.newAchievementIds || []).includes(id))
      .map(record => ({
        partyIndex,
        historyId: record.id,
        completedAt: record.completedAt,
        dungeonId: record.dungeonId,
        difficultyId: record.difficultyId || "normal",
        memberNames: (record.partySetup || []).map(member => member.name).filter(Boolean)
      })))
      .sort((left, right) => left.completedAt - right.completedAt);
    return records.length ? Object.freeze(records[0]) : null;
  }

  function rewardState(state = window.GameState.data) {
    return state.achievementRewards || { version: 1, claimed: [], trackedId: null };
  }

  function tracked(state = window.GameState.data) {
    const id = rewardState(state).trackedId;
    const definition = id && window.GameData.achievements.find(value => value.id === id);
    return definition ? entry(definition, state) : null;
  }

  function track(id) {
    const rewards = rewardState();
    if (id == null || rewards.trackedId === id) {
      const cleared = rewards.trackedId;
      rewards.trackedId = null;
      window.GameState.save();
      return { ok: true, message: cleared ? "追っていた実績を目標から外しました。" : "追跡中の実績はありません。", trackedId: null };
    }
    const definition = window.GameData.achievements.find(value => value.id === id);
    if (!definition) return { ok: false, message: "実績が見つかりません。" };
    const current = entry(definition);
    if (current.secret && !current.complete) return { ok: false, message: "まだ発見していない実績は目標にできません。" };
    if (current.complete) return { ok: false, message: "この実績はすでに達成しています。" };
    rewards.trackedId = id;
    window.GameState.addLog(`実績「${definition.name}」を次に追う目標へ定めました。`, "info");
    window.GameState.save();
    return { ok: true, message: `「${definition.name}」を次の目標にしました。`, trackedId: id };
  }

  function isClaimed(id, state = window.GameState.data) {
    return rewardState(state).claimed.includes(id);
  }

  function ready(state = window.GameState.data) {
    return entries(state).filter(value => value.complete && !isClaimed(value.id, state));
  }

  function successor(definition, state = window.GameState.data) {
    const visited = new Set([definition.id]);
    let nextId = definition.nextAchievementId;
    while (nextId && !visited.has(nextId)) {
      visited.add(nextId);
      const nextDefinition = window.GameData.achievements.find(value => value.id === nextId);
      if (!nextDefinition) return null;
      const next = entry(nextDefinition, state);
      if (next.secret && !next.complete) return null;
      if (!isClaimed(next.id, state)) return next;
      nextId = nextDefinition.nextAchievementId;
    }
    return null;
  }

  function grant(definition, state) {
    const wasTracked = rewardState(state).trackedId === definition.id;
    const rewards = definition.rewards || { gold: 0, materials: {} };
    state.gold += Number(rewards.gold) || 0;
    Object.entries(rewards.materials || {}).forEach(([itemId, quantity]) => window.Items.add(itemId, quantity));
    rewardState(state).claimed.push(definition.id);
    if (!wasTracked) return null;
    const next = successor(definition, state);
    rewardState(state).trackedId = next?.id || null;
    return next;
  }

  function claim(id) {
    const definition = window.GameData.achievements.find(value => value.id === id);
    if (!definition) return { ok: false, message: "実績が見つかりません。" };
    if (!entry(definition).complete) return { ok: false, message: "この実績はまだ達成していません。" };
    if (isClaimed(id)) return { ok: false, message: "この達成報酬は受け取り済みです。" };
    const next = grant(definition, window.GameState.data);
    const seals = Number(definition.rewards?.materials?.guild_seal) || 0;
    window.GameState.addLog(`実績「${definition.name}」の記念として、ギルド印章${seals}個を受け取りました。${next ? ` 次の目標は「${next.name}」です。` : ""}`, "success");
    window.GameState.save();
    return { ok: true, message: `「${definition.name}」の達成報酬を受け取りました。${next ? ` 次は「${next.name}」を追います。` : ""}`, claimedIds: [id], seals, nextTrackedId: next?.id || null };
  }

  function claimAll() {
    const available = ready();
    if (!available.length) return { ok: false, message: "受け取れる達成報酬はありません。" };
    const trackedId = rewardState().trackedId;
    available.forEach(value => grant(value, window.GameState.data));
    const next = available.some(value => value.id === trackedId) ? tracked() : null;
    const seals = available.reduce((sum, value) => sum + (Number(value.rewards?.materials?.guild_seal) || 0), 0);
    window.GameState.addLog(`実績${available.length}件の記念として、ギルド印章${seals}個を受け取りました。${next ? ` 次の目標は「${next.name}」です。` : ""}`, "success");
    window.GameState.save();
    return { ok: true, message: `実績${available.length}件の達成報酬を受け取りました。${next ? ` 次は「${next.name}」を追います。` : ""}`, claimedIds: available.map(value => value.id), seals, nextTrackedId: next?.id || null };
  }

  window.Achievements = { count, entry, entries, summary, nextGoals, destination, difficultyChapterAtlas, expeditionPotential, expeditionCandidates, earnedOn, tracked, track, isClaimed, ready, successor, claim, claimAll };
})();
