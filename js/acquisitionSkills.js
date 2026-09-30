(function () {
  "use strict";

  const metrics = ["gold", "experience", "qualityRate", "itemRate", "explorationTime"];
  const modifier = () => ({ multiplier: 1, flat: 0 });
  function empty() {
    return {
      gold: modifier(),
      experience: { party: modifier(), members: {} },
      qualityRate: modifier(),
      itemRate: modifier(),
      explorationTime: modifier(),
      appliedPartySkillIds: []
    };
  }
  function add(target, effect) {
    if (effect.operation === "multiplier") target.multiplier *= effect.value;
    else target.flat += effect.value;
  }
  function effects(skill) {
    return (skill?.effects || []).filter(effect => effect.type === "acquisitionModifier" && metrics.includes(effect.metric));
  }
  function resolve(members) {
    const result = empty(), appliedParty = new Set();
    (members || []).forEach(member => {
      const memberId = member.id;
      const seen = new Set();
      (member.skillIds || []).forEach(skillId => {
        if (seen.has(skillId)) return;
        seen.add(skillId);
        const skillEffects = effects(window.GameData.skills?.[skillId]);
        if (!skillEffects.length) return;
        const partyEffects = skillEffects.filter(effect => effect.scope === "party");
        if (partyEffects.length && !appliedParty.has(skillId)) {
          partyEffects.forEach(effect => add(effect.metric === "experience" ? result.experience.party : result[effect.metric], effect));
          appliedParty.add(skillId);
        }
        skillEffects.filter(effect => effect.scope === "self" && effect.metric === "experience").forEach(effect => {
          result.experience.members[memberId] ||= modifier();
          add(result.experience.members[memberId], effect);
        });
      });
    });
    result.appliedPartySkillIds = Array.from(appliedParty);
    return normalize(result);
  }
  function breakdown(members) {
    const partyEntries = new Map(), selfEntries = [];
    (members || []).forEach(member => {
      const seen = new Set();
      (member.skillIds || []).forEach(skillId => {
        if (seen.has(skillId)) return;
        seen.add(skillId);
        const skillEffects = effects(window.GameData.skills?.[skillId]);
        if (!skillEffects.length) return;
        const partyEffects = skillEffects.filter(effect => effect.scope === "party");
        if (partyEffects.length) {
          if (!partyEntries.has(skillId)) partyEntries.set(skillId, { skillId, scope: "party", ownerIds: [], effects: partyEffects });
          partyEntries.get(skillId).ownerIds.push(member.id);
        }
        const selfEffects = skillEffects.filter(effect => effect.scope === "self");
        if (selfEffects.length) selfEntries.push({ skillId, scope: "self", ownerIds: [member.id], effects: selfEffects });
      });
    });
    return { bonuses: resolve(members), entries: [...partyEntries.values(), ...selfEntries] };
  }
  function finite(value, fallback) { return Number.isFinite(value) ? value : fallback; }
  function normalizedModifier(value, limits) {
    const source = value || {};
    return {
      multiplier: Math.min(limits.maxMultiplier, Math.max(limits.minMultiplier, finite(source.multiplier, 1))),
      flat: Math.min(limits.maxFlat, Math.max(limits.minFlat, finite(source.flat, 0)))
    };
  }
  function normalize(value) {
    const source = value || empty();
    const rewardLimits = { minMultiplier: 0, maxMultiplier: 10, minFlat: -1000000, maxFlat: 1000000 };
    const rateLimits = { minMultiplier: 0, maxMultiplier: 10, minFlat: -1, maxFlat: 1 };
    const result = {
      gold: normalizedModifier(source.gold, rewardLimits),
      experience: { party: normalizedModifier(source.experience?.party, rewardLimits), members: {} },
      qualityRate: normalizedModifier(source.qualityRate, rateLimits),
      itemRate: normalizedModifier(source.itemRate, rateLimits),
      explorationTime: normalizedModifier(source.explorationTime, { minMultiplier: .25, maxMultiplier: 4, minFlat: 0, maxFlat: 0 }),
      appliedPartySkillIds: Array.isArray(source.appliedPartySkillIds) ? [...new Set(source.appliedPartySkillIds)] : []
    };
    Object.entries(source.experience?.members || {}).forEach(([id, entry]) => { result.experience.members[id] = normalizedModifier(entry, rewardLimits); });
    return result;
  }
  function amount(base, value) {
    const effect = value || modifier();
    return Math.max(0, Math.floor(base * effect.multiplier + effect.flat));
  }
  function chance(base, value) {
    const effect = value || modifier();
    return Math.min(1, Math.max(0, base * effect.multiplier + effect.flat));
  }
  function partyExperience(base, bonuses) { return amount(base, normalize(bonuses).experience.party); }
  function memberExperience(base, memberId, bonuses) { return amount(base, normalize(bonuses).experience.members[memberId]); }
  function durationMs(baseSeconds, timeMultiplier, bonuses) {
    return Math.max(1000, Math.round(baseSeconds * timeMultiplier * normalize(bonuses).explorationTime.multiplier * 1000));
  }

  window.AcquisitionSkills = { empty, resolve, breakdown, normalize, amount, chance, partyExperience, memberExperience, durationMs };
})();
