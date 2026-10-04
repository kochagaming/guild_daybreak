(function () {
  "use strict";
  function skills(hero) { return (hero.skillIds || []).map(id => window.GameData.skills[id]).filter(Boolean); }
  function effect(skill, type) { return skill && (skill.effects || []).find(entry => entry.type === type); }
  function passiveEffectEntries(hero, type) {
    if (!hero || hero.currentHp <= 0) return [];
    return skills(hero)
      .filter(skill => skill.activation.type === "passive")
      .flatMap(skill => (skill.effects || []).filter(entry => entry.type === type).map(effectEntry => ({ skill, effect: effectEntry })));
  }
  function passiveEffects(hero, type) { return passiveEffectEntries(hero, type).map(entry => entry.effect); }
  function combatEffects(hero) {
    return passiveEffects(hero, "combatModifier");
  }
  function combatMultiplier(hero, key) {
    return combatEffects(hero).reduce((value, entry) => value * (entry.modifiers[key] == null ? 1 : entry.modifiers[key]), 1);
  }
  function combatBonus(hero, key) {
    return combatEffects(hero).reduce((value, entry) => value + (entry.modifiers[key] || 0), 0);
  }
  function matchingSlayers(hero, defender) {
    const families = window.CreatureFamilies ? window.CreatureFamilies.familyIds(defender) : (defender.familyIds || []);
    return passiveEffects(hero, "slayer").filter(entry => families.includes(entry.familyId));
  }
  function slayerMultiplier(hero, defender) {
    return matchingSlayers(hero, defender)
      .reduce((value, entry) => value * entry.value, 1);
  }
  function slayerFamilyIds(hero, defender) { return Array.from(new Set(matchingSlayers(hero, defender).map(entry => entry.familyId))); }
  function ready(hero, skill, round) {
    return skill.activation.type === "active" && round >= (hero.skillReady[skill.id] || 1);
  }
  function use(hero, skill, round, log, encounter) {
    const cooldown = skill.activation.cooldownTurns;
    hero.skillReady[skill.id] = round + cooldown;
    log.push({ kind: "system", text: "【" + window.GameData.config.skillCategories[skill.category] + "】" + hero.name + "は「" + skill.name + "」を使用。再使用はターン" + hero.skillReady[skill.id] + "から（CT " + cooldown + "）", encounter, round });
  }
  function attackMultiplier(hero) {
    return hero.allies
      .flatMap(ally => passiveEffects(ally, "statMultiplier").filter(entry => entry.stat === "attack"))
      .reduce((best, entry) => Math.max(best, entry.multiplier), 1);
  }
  function protection(hero) {
    return hero.allies.filter(ally => ally.position < hero.position)
      .flatMap(ally => passiveEffects(ally, "rearProtection"))
      .reduce((best, entry) => Math.min(best, entry.multiplier), 1);
  }
  function healingAmount(source, healEffect) {
    if (!source || !healEffect) return 0;
    const scalingStat = healEffect.scalingStat || "magicHealing";
    const statKey = scalingStat === "maxHp" ? "hp" : scalingStat;
    const scalingValue = Math.max(0, Number(source[statKey]) || 0);
    const flatBonus = Number.isFinite(Number(healEffect.flatBonus))
      ? Number(healEffect.flatBonus)
      : scalingStat === "magicHealing" ? 5 : 0;
    const modifiers = healEffect.useHealingModifiers === false
      ? 1
      : (source.healingPower || 1) * combatMultiplier(source, "healing");
    return Math.max(1, Math.round((scalingValue * healEffect.multiplier + flatBonus) * modifiers));
  }
  function reactionUseCount(hero, skill) {
    const explicit = hero.reactionUseCounts?.[skill.id];
    if (Number.isInteger(explicit)) return explicit;
    return hero.reactionsUsed?.has(skill.id) ? 1 : 0;
  }
  function reactionAvailable(hero, skill) {
    const limit = Math.max(1, Number(skill.activation.limitPerEncounter) || 1);
    return reactionUseCount(hero, skill) < limit;
  }
  function recordReaction(hero, skill) {
    hero.reactionUseCounts = hero.reactionUseCounts || {};
    hero.reactionUseCounts[skill.id] = reactionUseCount(hero, skill) + 1;
    hero.reactionsUsed = hero.reactionsUsed || new Set();
    hero.reactionsUsed.add(skill.id);
  }
  function start(heroes, log, encounter) {
    heroes.forEach(hero => {
        hero.allies = heroes; hero.skillReady = {}; hero.reactionsUsed = new Set(); hero.reactionUseCounts = {};
      skills(hero).filter(skill => skill.category === "passive" && hero.currentHp > 0).forEach(skill => {
        log.push({ kind: "system", text: "【パッシブ】" + hero.name + "の「" + skill.name + "」：" + skill.description, encounter, round: 0 });
      });
    });
  }
  function afterHealthLoss(hero, log, encounter, round) {
    if (hero.side !== "hero" || hero.currentHp <= 0) return false;
    const reaction = skills(hero).find(skill => skill.activation.type === "reaction" && skill.activation.trigger === "hpBelow" && hero.currentHp < hero.hp * skill.activation.threshold && reactionAvailable(hero, skill));
    if (!reaction) return false;
    recordReaction(hero, reaction);
    const amount = healingAmount(hero, effect(reaction, "heal"));
    const healed = Math.min(hero.hp - hero.currentHp, amount);
    hero.currentHp += healed;
    hero.metrics.healingDone += healed;
    hero.metrics.healingAttempted = (hero.metrics.healingAttempted || 0) + amount;
    hero.metrics.overhealing = (hero.metrics.overhealing || 0) + amount - healed;
    log.push({ kind: "heal", text: "【リアクション】" + hero.name + "の「" + reaction.name + "」！ HPを" + healed + "回復（この戦闘で使用済み）", encounter, round });
    return true;
  }
  function afterStatusApplied(hero, statusId, log, encounter, round) {
    if (hero.side !== "hero" || hero.currentHp <= 0) return false;
    const reaction = skills(hero).find(skill => {
      if (skill.activation.type !== "reaction" || skill.activation.trigger !== "statusApplied" || !reactionAvailable(hero, skill)) return false;
      const triggerIds = skill.activation.statusIds;
      return triggerIds === "all" || (Array.isArray(triggerIds) && triggerIds.includes(statusId));
    });
    if (!reaction) return false;
    const cleanseEffect = effect(reaction, "cleanse");
    if (!cleanseEffect || !window.StatusCombat.cleanseableStatusIds(hero, cleanseEffect).includes(statusId)) return false;
    recordReaction(hero, reaction);
    log.push({ kind: "skill", text: "【リアクション】" + hero.name + "の「" + reaction.name + "」が即座に発動した（この戦闘で使用済み）。", encounter, round });
    window.StatusCombat.cleanse(hero, cleanseEffect, log, encounter, round, hero.name);
    return true;
  }
  function afterDamage(random, attacker, hero, hit, dealDamage, log, encounter, round) {
    if (hero.side !== "hero" || !hit.actualDamage || hero.currentHp <= 0) return;
    afterHealthLoss(hero, log, encounter, round);
    const counter = passiveEffectEntries(hero, "counter").sort((a, b) => b.effect.chance - a.effect.chance)[0];
    if (counter && attacker.currentHp > 0 && random() < counter.effect.chance) {
      const response = dealDamage(random, hero, attacker, { multiplier: counter.effect.multiplier, noCritical: true });
      log.push({ kind: "skill", text: "【パッシブ・反撃】" + hero.name + "の「" + counter.skill.name + "」！ " + attacker.name + "に" + response.actualDamage + "ダメージ" + (response.missed ? "（回避）" : ""), encounter, round });
    }
  }
  window.SkillCombat = { effect, ready, use, attackMultiplier, protection, combatMultiplier, combatBonus, slayerMultiplier, slayerFamilyIds, healingAmount, start, afterHealthLoss, afterStatusApplied, afterDamage };
})();
