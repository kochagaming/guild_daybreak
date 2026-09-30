(function () {
  "use strict";
  const fallback = {
    memberLimit: { initial: 3, maximum: 6, unlocks: [{ chapterId: "roadside", size: 4 }, { chapterId: "seal", size: 5 }, { chapterId: "starfall", size: 6 }] },
    partySlots: { initial: 1, maximum: 6, unlocks: [{ slot: 2, chapterNumber: 1, gold: 1000, seals: 2 }, { slot: 3, chapterNumber: 2, gold: 2500, seals: 4 }, { slot: 4, chapterNumber: 3, gold: 5000, seals: 6 }, { slot: 5, chapterNumber: 4, gold: 10000, seals: 8 }, { slot: 6, chapterNumber: 5, gold: 20000, seals: 10 }] }
  };
  const config = () => window.GameData.partyProgression || fallback;
  const slotConfig = slot => config().partySlots.unlocks.find(entry => entry.slot === slot);
  function limit() { return window.GameState.data.unlockedPartyCount; }
  function maximum() { return config().partySlots.maximum; }
  function chapterCompleted(number) {
    const chapter = window.GameData.storyChapters.find(entry => entry.number === number);
    return Boolean(chapter && window.GameState.data.story.completed.includes(chapter.id));
  }
  function availableLimit() {
    const storyLimit = config().partySlots.unlocks.reduce((count, entry) => chapterCompleted(entry.chapterNumber) ? Math.max(count, entry.slot) : count, config().partySlots.initial);
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
      message: !chapterReady ? `第${entry.chapterNumber}章をクリアすると増設できます。` : !affordable ? "所持金またはギルド印章が足りません。" : `第${slot}パーティを増設できます。`
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
  function ids(index = selected()) { return window.GameState.data.parties[index] || []; }
  function expedition(index = selected()) { return window.GameState.data.expeditions[index] || null; }
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
  window.Party = { toggle, move, members, power, ids, selected, select, limit, maximum, availableLimit, unlockQuote, unlock, memberLimit, positionName, expedition };
})();
