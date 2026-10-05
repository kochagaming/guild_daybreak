(function () {
  "use strict";

  const relations = () => window.GameData.relations;
  const rosterLimit = () => window.GameData.config.companions.rosterLimit;
  function identity(id) { return window.GameData.storyCharacters?.[id] || null; }
  function profile(id) { return window.GameData.companionProfiles?.[id] || null; }
  function definition(id) {
    const person = identity(id), combat = profile(id);
    return person && combat ? Object.assign({}, person, combat, { id: combat.id, characterId: person.id, portraitId: person.portraitId }) : null;
  }
  function canJoin(id) { return Boolean(identity(id) && profile(id)); }
  function joinedIds(state = window.GameState.data) {
    if (!Array.isArray(state.story.joinedCompanionIds)) state.story.joinedCompanionIds = [];
    return state.story.joinedCompanionIds;
  }
  function character(companionId, state = window.GameState.data) {
    return state.characters.find(entry => entry.source?.type === "companion" && entry.source.companionId === companionId) || null;
  }
  function progression(companionId) { return relations().companionProgressions?.[companionId] || null; }
  function stageId(companionId, state = window.GameState.data) {
    const track = progression(companionId);
    return state.story.companionStages?.[companionId] || track?.initialStageId || null;
  }
  function stage(companionId, state = window.GameState.data) {
    const track = progression(companionId);
    return track?.stages?.[stageId(companionId, state)] || null;
  }
  function stageChain(companionId, state = window.GameState.data) {
    const track = progression(companionId), chain = [];
    let current = stage(companionId, state), safety = 0;
    while (current && safety++ < 20) {
      chain.unshift(current);
      current = current.previousStageId ? track.stages[current.previousStageId] : null;
    }
    return chain;
  }
  function skillGrants(companionId, state = window.GameState.data) {
    const grants = (relations().companionSkillGrants?.[companionId] || []).map(entry => Object.assign({}, entry));
    stageChain(companionId, state).forEach(current => {
      Object.entries(current.replacements || {}).forEach(([fromId, toId]) => {
        const index = grants.findIndex(entry => entry.skillId === fromId);
        const replacement = { skillId: toId, level: 1, initial: true };
        if (index >= 0) grants.splice(index, 1, replacement);
        else if (!grants.some(entry => entry.skillId === toId)) grants.push(replacement);
      });
      (current.addSkillIds || []).forEach(skillId => {
        if (!grants.some(entry => entry.skillId === skillId)) grants.push({ skillId, level: 1, initial: true });
      });
    });
    return grants;
  }
  function ensureStage(companionId, state = window.GameState.data) {
    const track = progression(companionId);
    if (!track) return false;
    if (!state.story.companionStages) state.story.companionStages = {};
    if (state.story.companionStages[companionId]) return false;
    state.story.companionStages[companionId] = track.initialStageId;
    return true;
  }
  function join(companionId) {
    const companion = definition(companionId), state = window.GameState.data;
    if (!companion) return { ok: false, changed: false, message: "加入する人物の記録が見つかりません。" };
    const existing = character(companionId, state);
    const alreadyJoined = joinedIds(state).includes(companionId);
    if (alreadyJoined || existing) {
      if (!alreadyJoined) joinedIds(state).push(companionId);
      const stageAdded = ensureStage(companionId, state);
      return { ok: true, changed: !alreadyJoined || stageAdded, character: existing };
    }
    if (joinedIds(state).length >= rosterLimit()) {
      return { ok: false, changed: false, message: `物語加入者は現在${rosterLimit()}人までです。` };
    }
    const id = `adventurer-${state.meta.nextCharacterId++}`;
    const created = {
      id, name: companion.name, jobId: companion.jobId, raceId: companion.raceId, birthId: companion.birthId,
      portraitId: companion.portraitId, source: { type: "companion", companionId },
      level: companion.initialLevel, exp: 0,
      actionRates: Object.assign({}, window.GameData.config.combatRules.defaultActionRates),
      equipment: [], career: null, expeditionRecord: window.Characters.emptyExpeditionRecord(), recordTitleId: null, createdAt: window.GameRuntime.now()
    };
    state.characters.push(created);
    joinedIds(state).push(companionId);
    ensureStage(companionId, state);
    window.GameState.addLog(`${companion.title}・${companion.name}がギルドに加わりました。`, "success");
    return { ok: true, changed: true, character: created };
  }

  function advance(companionId, targetStageId) {
    const state = window.GameState.data, companion = definition(companionId), track = progression(companionId);
    if (!companion || !track?.stages?.[targetStageId]) return { ok: false, changed: false, message: "人物の成長記録が見つかりません。" };
    if (!character(companionId, state) || !joinedIds(state).includes(companionId)) return { ok: false, changed: false, message: `${companion.name}はまだギルドへ加わっていません。` };
    ensureStage(companionId, state);
    const currentStageId = stageId(companionId, state);
    if (currentStageId === targetStageId) return { ok: true, changed: false, companionId, stageId: targetStageId };
    const target = track.stages[targetStageId];
    if (target.previousStageId !== currentStageId) return { ok: false, changed: false, message: "人物の成長段階を順番に進めてください。" };
    state.story.companionStages[companionId] = targetStageId;
    window.GameState.addLog(`${companion.name}が「${target.name}」へ成長しました。固有スキルが変化しました。`, "success");
    return { ok: true, changed: true, companionId, stageId: targetStageId, previousStageId: currentStageId };
  }

  window.Companions = { identity, profile, definition, canJoin, joinedIds, character, progression, stageId, stage, stageChain, skillGrants, join, advance };
})();
