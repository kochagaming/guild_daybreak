(function () {
  "use strict";
  const fallback = {
    memberLimit: { initial: 3, maximum: 6, unlocks: [{ chapterId: "roadside", size: 4 }, { chapterId: "seal", size: 5 }, { chapterId: "starfall", size: 6 }] },
    partySlots: { initial: 1, maximum: 8, unlocks: [{ slot: 2, chapterNumber: 1, gold: 10000, seals: 2 }, { slot: 3, chapterNumber: 2, gold: 100000, seals: 4 }, { slot: 4, chapterNumber: 3, gold: 500000, seals: 6 }, { slot: 5, chapterNumber: 4, gold: 2000000, seals: 8 }, { slot: 6, chapterNumber: 5, gold: 8000000, seals: 10 }, { slot: 7, chapterNumber: 6, gold: 30000000, seals: 12 }, { slot: 8, codeOnly: true, gold: 100000000, seals: 15 }] }
  };
  const config = () => window.GameData.config.partyProgression || fallback;
  const slotConfig = slot => config().partySlots.unlocks.find(entry => entry.slot === slot);
  function limit() { return window.GameState.data.unlockedPartyCount; }
  function maximum() { return config().partySlots.maximum; }
  function chapterCompleted(number) {
    const chapter = window.GameData.storyChapters.find(entry => entry.number === number);
    return Boolean(chapter && window.GameState.data.story.completed.includes(chapter.id));
  }
  function availableLimit() {
    const storyLimit = config().partySlots.unlocks.filter(entry => !entry.codeOnly).reduce((count, entry) => chapterCompleted(entry.chapterNumber) ? Math.max(count, entry.slot) : count, config().partySlots.initial);
    const bonus = window.AccessCodes ? window.AccessCodes.partySlotBonus() : 0;
    return Math.min(maximum(), storyLimit + bonus);
  }
  function unlockQuote(slot = limit() + 1) {
    const entry = slotConfig(slot);
    if (!entry || slot !== limit() + 1) return { ok: false, slot, message: "増設できるパーティ枠がありません。" };
    const chapterReady = slot <= availableLimit();
    const affordable = window.GameState.data.gold >= entry.gold && window.Items.count("guild_seal") >= entry.seals;
    return {
      ok: chapterReady && affordable, slot, gold: entry.gold, seals: entry.seals, chapterNumber: entry.chapterNumber,
      chapterReady, affordable,
      message: !chapterReady ? (entry.codeOnly ? "設定で追加パーティ増設権のコードを解放すると増設できます。" : `第${entry.chapterNumber}章をクリアすると増設できます。`) : !affordable ? "所持金またはギルド印章が足りません。" : `第${slot}パーティを増設できます。`
    };
  }
  function unlock(slot = limit() + 1) {
    const quote = unlockQuote(slot);
    if (!quote.ok) return quote;
    window.GameState.data.gold -= quote.gold;
    window.Items.remove("guild_seal", quote.seals);
    window.GameState.ensurePartyCapacity(window.GameState.data);
    window.GameState.data.unlockedPartyCount = slot;
    window.GameState.addLog(`第${slot}パーティを増設しました。`, "success");
    window.GameState.save();
    return { ok: true, message: `第${slot}パーティを増設しました。` };
  }
  function memberLimit(completed = window.GameState.data.story.completed) {
    const rule = config().memberLimit;
    return Math.min(rule.maximum, rule.unlocks.reduce((size, entry) => completed.includes(entry.chapterId) ? Math.max(size, entry.size) : size, rule.initial));
  }
  function positionName(index, size = 3) {
    if (size <= 3) return ["前衛", "中衛", "後衛"][index] || `${index + 1}列目`;
    return `${index + 1}列目${index === 0 ? "（最前列）" : index === size - 1 ? "（最後列）" : ""}`;
  }
  function selected() { return window.GameState.data.activeParty || 0; }
  function name(index = selected()) { return window.GameState.data.partyNames[index] || `第${index + 1}パーティ`; }
  function rename(value, index = selected()) {
    if (!Number.isInteger(index) || index < 0 || index >= limit()) return { ok: false, message: "このパーティはまだ増設されていません。" };
    const next = String(value || "").trim();
    if (!next || next.length > 20 || /[\u0000-\u001f\u007f]/.test(next)) return { ok: false, message: "パーティ名は1〜20文字で入力してください。" };
    window.GameState.data.partyNames[index] = next;
    window.GameState.save();
    return { ok: true, message: `パーティ名を「${next}」に変更しました。` };
  }
  function ids(index = selected()) { return window.GameState.data.parties[index] || []; }
  function expedition(index = selected()) { return window.GameState.data.expeditions[index] || null; }
  function result(index = selected()) { return window.GameState.data.partyResults[index] || null; }
  function plan(index = selected()) { return window.GameState.data.partyPlans[index] || null; }
  function setPlan(next, index = selected()) {
    if (!Number.isInteger(index) || index < 0 || index >= limit()) return { ok: false, message: "このパーティはまだ増設されていません。" };
    if (expedition(index)) return { ok: false, message: "探索中は出撃先を変更できません。" };
    const dungeon = window.GameData.dungeons[next.dungeonId];
    const difficultyId = next.difficultyId || "normal", timeMultiplier = Number(next.timeMultiplier || 1);
    if (!dungeon || !window.Story.canEnter(dungeon.id)) return { ok: false, message: "この攻略先はまだ選択できません。" };
    if (!window.DungeonDifficulty.unlocked(dungeon.id, difficultyId)) return { ok: false, message: "この難易度はまだ解放されていません。" };
    if (!window.Exploration.valid(timeMultiplier)) return { ok: false, message: "探索時間は1〜6倍で指定してください。" };
    window.GameState.data.partyPlans[index] = { dungeonId: dungeon.id, difficultyId, timeMultiplier };
    window.GameState.save();
    return { ok: true, plan: window.GameState.data.partyPlans[index] };
  }
  function unreadResultCount() { return window.GameState.data.partyResults.slice(0, limit()).filter(entry => entry && entry.viewed !== true).length; }
  function markResultRead(index = selected()) {
    if (!Number.isInteger(index) || index < 0 || index >= limit()) return { ok: false, message: "このパーティはまだ増設されていません。" };
    const report = result(index);
    if (!report) return { ok: false, message: "探索結果はまだありません。" };
    if (report.viewed !== true) { report.viewed = true; window.GameState.save(); }
    return { ok: true };
  }
  function select(index) {
    if (!Number.isInteger(index) || index < 0 || index >= limit()) return { ok: false, message: "このパーティはまだ増設されていません。" };
    window.GameState.data.activeParty = index;
    window.GameState.save();
    return { ok: true };
  }
  function occupiedElsewhere(characterId, partyIndex) {
    return window.GameState.data.parties.some((party, index) => index !== partyIndex && party.includes(characterId))
      || window.GameState.data.expeditions.some(entry => entry?.partyIds.includes(characterId));
  }
  function toggle(characterId, partyIndex = selected()) {
    if (!Number.isInteger(partyIndex) || partyIndex < 0 || partyIndex >= limit()) return { ok: false, message: "このパーティは未解放です。" };
    const party = ids(partyIndex);
    if (expedition(partyIndex)) return { ok: false, message: "探索中のパーティは変更できません。" };
    const index = party.indexOf(characterId);
    if (index < 0 && occupiedElsewhere(characterId, partyIndex)) return { ok: false, message: "別のパーティに所属・探索中の冒険者です。" };
    if (!window.Characters.get(characterId)) return { ok: false, message: "冒険者が見つかりません。" };
    if (index >= 0) party.splice(index, 1);
    else {
      if (party.length >= memberLimit()) return { ok: false, message: `現在のパーティ上限は${memberLimit()}人です。物語を進めると最大6人まで増えます。` };
      party.push(characterId);
    }
    window.GameState.save();
    return { ok: true };
  }
  function transfer(characterId, partyIndex = selected()) {
    if (!Number.isInteger(partyIndex) || partyIndex < 0 || partyIndex >= limit()) return { ok: false, message: "このパーティは未解放です。" };
    const character = window.Characters.get(characterId), target = ids(partyIndex);
    if (!character) return { ok: false, message: "冒険者が見つかりません。" };
    if (expedition(partyIndex)) return { ok: false, message: "探索中のパーティへは移動できません。" };
    const sourceIndex = window.GameState.data.parties.slice(0, limit()).findIndex(party => party.includes(characterId));
    if (sourceIndex === partyIndex) return { ok: true, message: `${character.name}はすでにこのパーティにいます。` };
    if (sourceIndex >= 0 && expedition(sourceIndex)) return { ok: false, message: `${character.name}は探索中のため移動できません。` };
    if (window.GameState.data.expeditions.some(entry => entry?.partyIds.includes(characterId))) return { ok: false, message: `${character.name}は探索中のため移動できません。` };
    if (target.length >= memberLimit()) return { ok: false, message: `現在のパーティ上限は${memberLimit()}人です。先に空き枠を作ってください。` };
    if (sourceIndex >= 0) {
      const source = ids(sourceIndex), sourcePosition = source.indexOf(characterId);
      if (sourcePosition >= 0) source.splice(sourcePosition, 1);
    }
    target.push(characterId);
    window.GameState.save();
    return { ok: true, message: sourceIndex >= 0 ? `${character.name}を${name(partyIndex)}へ移しました。` : `${character.name}を${name(partyIndex)}へ加えました。` };
  }
  function members(index = selected()) { return ids(index).map(window.Characters.get).filter(Boolean); }
  function move(characterId, direction, partyIndex = selected()) {
    if (!Number.isInteger(partyIndex) || partyIndex < 0 || partyIndex >= limit()) return { ok: false, message: "このパーティは未解放です。" };
    if (expedition(partyIndex)) return { ok: false, message: "探索中の隊列は変更できません。" };
    const party = ids(partyIndex), index = party.indexOf(characterId), target = index + Number(direction);
    if (index < 0 || target < 0 || target >= party.length) return { ok: false, message: "これ以上移動できません。" };
    [party[index], party[target]] = [party[target], party[index]];
    window.GameState.save();
    return { ok: true };
  }
  function applyActionPreset(presetId, partyIndex = selected()) {
    if (!Number.isInteger(partyIndex) || partyIndex < 0 || partyIndex >= limit()) return { ok: false, message: "このパーティは未解放です。" };
    const preset = window.GameData.config.combatRules.actionPresets.find(entry => entry.id === presetId);
    if (!preset) return { ok: false, message: "行動率プリセットが不正です。" };
    const partyMembers = members(partyIndex);
    if (!partyMembers.length) return { ok: false, message: "行動率を設定するメンバーがいません。" };
    partyMembers.forEach(character => { character.actionRates = Object.assign({}, preset.rates); });
    window.GameState.addLog(`${name(partyIndex)}の${partyMembers.length}人へ「${preset.name}」の行動率を設定しました。`, "info");
    window.GameState.save();
    return { ok: true, count: partyMembers.length, message: `${partyMembers.length}人へ「${preset.name}」を設定しました。次回出撃から反映されます。` };
  }
  function power(index = selected()) {
    return members(index).reduce((total, character, position) => {
      const stat = window.Characters.stats(character);
      const formation = window.Battle ? window.Battle.formationMultiplier({ weaponRange: window.Characters.weaponRange(character), position, formationSize: Math.max(3, ids(index).length) }) : 1;
      const skills = window.Characters.learnedSkills(character);
      const supportBonus = skills.some(skill => window.SkillCombat.effect(skill, "heal")) ? 18 : 0;
      const attackCountFactor = 1 + Math.max(0, stat.attackCount - 1) * .32;
      return total + stat.attack * stat.physicalPower * formation * 2.1 * attackCountFactor + stat.defense * 1.6 + stat.hp * .34 + stat.speed * .7 + character.level * 6 + supportBonus;
    }, 0);
  }
  function retryPreparation(dungeonId, difficultyId = "normal", index = selected()) {
    const rule = window.GameData.config.explorationEvents?.retryPreparation || {};
    const maximumFailures = Math.max(0, Number(rule.maximumFailures) || 0);
    const records = (window.GameState.data.partyHistory?.[index] || [])
      .filter(entry => entry.dungeonId === dungeonId && (entry.difficultyId || "normal") === difficultyId);
    let recordedFailures = 0;
    for (const entry of records) {
      if (entry.success) break;
      recordedFailures += 1;
    }
    const failures = Math.min(maximumFailures, recordedFailures);
    return Object.freeze({
      failures,
      recordedFailures,
      maximumFailures,
      damageReduction: Math.round(failures * (Number(rule.damageReductionPerFailure) || 0) * 100) / 100,
      label: rule.label || "再挑戦の備え",
      description: rule.description || ""
    });
  }
  function routeExperience(dungeonId, difficultyId = "normal", index = selected()) {
    const partyMembers = members(index);
    const records = (window.GameState.data.partyHistory || []).flatMap(history => history || [])
      .filter(entry => entry.dungeonId === dungeonId && (entry.difficultyId || "normal") === difficultyId);
    const experienced = new Set(), successful = new Set(), successfulClearCounts = new Map();
    records.forEach(entry => {
      const participants = new Set([...(entry.partySetup || []), ...(entry.battle?.members || [])].map(member => member.id).filter(Boolean));
      partyMembers.forEach(member => {
        if (!participants.has(member.id)) return;
        experienced.add(member.id);
        if (entry.success) {
          successful.add(member.id);
          successfulClearCounts.set(member.id, (successfulClearCounts.get(member.id) || 0) + 1);
        }
      });
    });
    const familiarity = window.GameData.config.explorationEvents?.routeFamiliarity || {};
    const tierFor = count => [...(familiarity.tiers || [])].reverse().find(tier => count >= tier.minimumClears) || null;
    const successfulDetails = partyMembers.filter(member => successful.has(member.id)).map(member => {
      const clears = successfulClearCounts.get(member.id) || 0, tier = tierFor(clears);
      const inheritedTeachers = window.Characters.routeMentorships(member)
        .filter(entry => entry.role === "apprentice" && entry.dungeonId === dungeonId && entry.difficultyId === difficultyId);
      return Object.freeze({ id: member.id, name: member.name, clears, tierId: tier?.id || null, label: tier?.label || "道を知る", successChanceBonus: Number(tier?.successChanceBonus) || 0, inheritedGuide: inheritedTeachers.length > 0, inheritedTeacherIds: Object.freeze(inheritedTeachers.map(entry => entry.partnerCharacterId)), inheritedTeacherNames: Object.freeze(inheritedTeachers.map(entry => entry.partnerName)) });
    });
    const strongestDetail = [...successfulDetails].sort((left, right) => right.successChanceBonus - left.successChanceBonus || right.clears - left.clears)[0] || null;
    const mentorshipRule = window.GameData.config.explorationEvents?.routeMentorship || {};
    const mentor = successfulDetails.filter(detail => detail.tierId === mentorshipRule.guideTierId)
      .sort((left, right) => Number(right.inheritedGuide) - Number(left.inheritedGuide) || right.clears - left.clears)[0] || null;
    const apprenticeLimit = (mentorshipRule.maximumApprentices || 1) + (mentor?.inheritedGuide ? Number(mentorshipRule.inheritedAdditionalApprentices) || 0 : 0);
    const apprentices = mentor ? partyMembers.filter(member => member.id !== mentor.id && (successfulClearCounts.get(member.id) || 0) <= (Number(mentorshipRule.apprenticeMaximumClears) || 0)).slice(0, apprenticeLimit) : [];
    const lineagePredecessor = mentor ? partyMembers.find(member => mentor.inheritedTeacherIds.includes(member.id)) || null : null;
    const mentorship = mentor && apprentices.length ? Object.freeze({
      mentorId: mentor.id, mentorName: mentor.name,
      apprenticeIds: Object.freeze(apprentices.map(member => member.id)), apprenticeNames: Object.freeze(apprentices.map(member => member.name)),
      inheritedGuide: mentor.inheritedGuide,
      inheritedTeacherNames: mentor.inheritedTeacherNames,
      lineageSupport: Boolean(lineagePredecessor),
      lineagePredecessorId: lineagePredecessor?.id || null,
      lineagePredecessorName: lineagePredecessor?.name || null,
      successChanceBonus: (Number(mentorshipRule.successChanceBonus) || 0) + (mentor.inheritedGuide ? Number(mentorshipRule.inheritedSuccessChanceBonus) || 0 : 0) + (lineagePredecessor ? Number(mentorshipRule.lineageSuccessChanceBonus) || 0 : 0)
    }) : null;
    const partyIds = new Set(partyMembers.map(member => member.id));
    const reunions = partyMembers.flatMap(apprentice => window.Characters.routeMentorships(apprentice)
      .filter(entry => entry.role === "apprentice" && entry.dungeonId === dungeonId && entry.difficultyId === difficultyId && partyIds.has(entry.partnerCharacterId))
      .map(entry => {
        const routeMentor = window.Characters.get(entry.partnerCharacterId);
        return routeMentor ? Object.freeze({ mentorId: routeMentor.id, mentorName: routeMentor.name, apprenticeId: apprentice.id, apprenticeName: apprentice.name }) : null;
      }).filter(Boolean));
    const routeTraditionKey = `${dungeonId}:${difficultyId}`;
    const traditionEstablished = (window.GameState.data.story?.facts?.routeTraditions || []).includes(routeTraditionKey);
    const traditionRecord = window.GameState.data.story?.facts?.routeTraditionRecords?.[routeTraditionKey] || null;
    const traditionTier = traditionEstablished ? window.Exploration.routeTraditionTier(traditionRecord?.assistedSorties || 0) : null;
    return Object.freeze({
      members: partyMembers.length,
      experienced: experienced.size,
      successful: successful.size,
      successChanceBonus: Math.min(Number(familiarity.maximumBonus) || 0, successfulDetails.reduce((sum, detail) => sum + detail.successChanceBonus, 0)),
      strongestFamiliarityLabel: strongestDetail?.label || null,
      traditionEstablished,
      traditionAssistedSorties: Math.max(0, Number(traditionRecord?.assistedSorties) || 0),
      traditionTier: traditionTier ? Object.freeze({ ...traditionTier }) : null,
      traditionFounderNames: Object.freeze(Array.isArray(traditionRecord?.memberNames) ? [...traditionRecord.memberNames] : []),
      mentorship,
      reunions: Object.freeze(reunions),
      successfulClearCounts: Object.freeze(Object.fromEntries(successfulClearCounts)),
      successfulDetails: Object.freeze(successfulDetails),
      experiencedIds: Object.freeze([...experienced]),
      successfulIds: Object.freeze([...successful]),
      experiencedNames: Object.freeze(partyMembers.filter(member => experienced.has(member.id)).map(member => member.name)),
      successfulNames: Object.freeze(partyMembers.filter(member => successful.has(member.id)).map(member => member.name))
    });
  }

  function routeTraditionCandidates(dungeonId, difficultyId = "normal") {
    if (!window.GameData.dungeons[dungeonId] || !window.GameData.dungeonDifficulties[difficultyId]) return Object.freeze([]);
    const characters = window.GameState.data.characters || [];
    const rule = window.GameData.config.explorationEvents?.routeMentorship || {};
    const guideTier = (window.GameData.config.explorationEvents?.routeFamiliarity?.tiers || []).find(entry => entry.id === rule.guideTierId);
    const minimumGuideClears = Number(guideTier?.minimumClears) || 10;
    const maximumApprenticeClears = Number(rule.apprenticeMaximumClears) || 0;
    const clearCounts = new Map(characters.map(character => {
      const record = window.Characters.destinationExperience(character).find(entry => entry.dungeonId === dungeonId && entry.difficultyId === difficultyId);
      return [character.id, Number(record?.clears) || 0];
    }));
    const busyIds = new Set(window.GameState.data.expeditions.flatMap(entry => entry?.partyIds || []));
    const candidates = new Map();
    characters.filter(mentor => (clearCounts.get(mentor.id) || 0) >= minimumGuideClears).forEach(mentor => {
      const inherited = window.Characters.routeMentorships(mentor)
        .filter(entry => entry.role === "apprentice" && entry.dungeonId === dungeonId && entry.difficultyId === difficultyId);
      inherited.forEach(record => {
        const predecessor = window.Characters.get(record.partnerCharacterId);
        if (!predecessor || predecessor.id === mentor.id) return;
        characters.filter(apprentice => apprentice.id !== predecessor.id && apprentice.id !== mentor.id && (clearCounts.get(apprentice.id) || 0) <= maximumApprenticeClears).forEach(apprentice => {
          const characterIds = [predecessor.id, mentor.id, apprentice.id], key = characterIds.join("::");
          if (candidates.has(key)) return;
          const partyIndices = window.GameState.data.parties.slice(0, limit()).map((party, index) => ({ index, count: characterIds.filter(id => party.includes(id)).length })).filter(entry => entry.count);
          const readyParty = partyIndices.find(entry => entry.count === 3 && !expedition(entry.index));
          const bestParty = [...partyIndices].sort((left, right) => right.count - left.count || left.index - right.index)[0] || null;
          const busyNames = [predecessor, mentor, apprentice].filter(character => busyIds.has(character.id)).map(character => character.name);
          candidates.set(key, Object.freeze({
            key, dungeonId, difficultyId,
            characterIds: Object.freeze(characterIds),
            characterNames: Object.freeze([predecessor.name, mentor.name, apprentice.name]),
            predecessorId: predecessor.id, predecessorName: predecessor.name,
            mentorId: mentor.id, mentorName: mentor.name,
            apprenticeId: apprentice.id, apprenticeName: apprentice.name,
            mentorClears: clearCounts.get(mentor.id) || 0,
            readyPartyIndex: readyParty?.index ?? null,
            bestPartyIndex: bestParty?.index ?? null,
            partyOverlap: bestParty?.count || 0,
            busyNames: Object.freeze(busyNames)
          }));
        });
      });
    });
    return Object.freeze([...candidates.values()].sort((left, right) => Number(right.readyPartyIndex != null) - Number(left.readyPartyIndex != null)
      || left.busyNames.length - right.busyNames.length
      || right.partyOverlap - left.partyOverlap
      || right.mentorClears - left.mentorClears
      || left.key.localeCompare(right.key, "ja")));
  }
  window.Party = { toggle, transfer, move, applyActionPreset, members, power, retryPreparation, routeExperience, routeTraditionCandidates, ids, selected, select, name, rename, limit, maximum, availableLimit, unlockQuote, unlock, memberLimit, positionName, expedition, result, plan, setPlan, unreadResultCount, markResultRead };
})();
