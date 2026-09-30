(function () {
  "use strict";

  function isExploring(characterId) {
    return window.GameState.data.expeditions
      .some(expedition => expedition && expedition.partyIds.includes(characterId));
  }

  function quote(characterId, targetJobId) {
    const character = window.Characters.get(characterId);
    const target = window.GameData.jobs[targetJobId];
    const rule = window.GameData.classChanges[targetJobId];
    if (!character || !target || !rule) return { ok: false, message: "冒険者または転職先が見つかりません。" };
    if (character.career) return { ok: false, message: "転職できるのは生涯に一度だけです。" };
    const stats = window.Characters.stats(character);
    const master = character.jobId === targetJobId;
    const requirements = rule.requirements.map(requirement => ({
      stat: requirement.stat, label: requirement.label, minimum: requirement.minimum,
      current: stats[requirement.stat], percent: Boolean(requirement.percent),
      met: stats[requirement.stat] + .000001 >= requirement.minimum
    }));
    if (master) requirements.unshift({ stat: "level", label: "レベル", minimum: 50, current: character.level, percent: false, met: character.level >= 50 });
    const busy = isExploring(character.id);
    const eligible = !busy && requirements.every(requirement => requirement.met);
    const formerSkills = (window.GameData.skillGrants.job[character.jobId] || [])
      .filter(entry => entry.initial)
      .map(entry => entry.skillId);
    return {
      ok: true, eligible, busy, master, characterId, targetJobId,
      previousJobId: character.jobId, requirements,
      retainedSkillIds: [...new Set(formerSkills)],
      unequippedCount: character.equipment.length,
      message: busy ? "探索中の冒険者は転職できません。" : eligible ? "転職できます。" : "必要能力を満たしていません。"
    };
  }

  function change(characterId, targetJobId) {
    const result = quote(characterId, targetJobId);
    if (!result.ok || !result.eligible) return { ok: false, message: result.message };
    const character = window.Characters.get(characterId);
    const previousName = window.GameData.jobs[character.jobId].name;
    character.career = {
      previousJobId: character.jobId,
      retainedSkillIds: result.retainedSkillIds,
      master: result.master,
      levelBefore: character.level,
      changedAt: window.GameRuntime.now()
    };
    character.jobId = targetJobId;
    character.level = 1;
    character.exp = 0;
    character.equipment = [];
    const newName = result.master ? `${window.GameData.jobs[targetJobId].name}マスター` : window.GameData.jobs[targetJobId].name;
    window.GameState.addLog(`${character.name}は${previousName}から${newName}へ転職しました。`, "success");
    window.GameState.save();
    return { ok: true, message: `${character.name}は${newName}になりました。Lv.1から再出発します。` };
  }

  window.ClassChange = { quote, change, isExploring };
})();
