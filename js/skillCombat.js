(function () {
  "use strict";
  function skills(hero) { return (hero.skillIds || []).map(id => window.GameData.skills[id]).filter(Boolean); }
  function effect(skill, type) { return skill && (skill.effects || []).find(entry => entry.type === type); }
  function has(hero, type) { return hero.currentHp > 0 && skills(hero).some(skill => effect(skill, type)); }
  function combatEffects(hero) {
    if (!hero || hero.currentHp <= 0) return [];
    return skills(hero).filter(skill => skill.activation.type === "passive").flatMap(skill => (skill.effects || []).filter(entry => entry.type === "combatModifier"));
  }
  function combatMultiplier(hero, key) {
    return combatEffects(hero).reduce((value, entry) => value * (entry.modifiers[key] == null ? 1 : entry.modifiers[key]), 1);
  }
  function combatBonus(hero, key) {
    return combatEffects(hero).reduce((value, entry) => value + (entry.modifiers[key] || 0), 0);
  }
  function matchingSlayers(hero, defender) {
    const families = window.CreatureFamilies ? window.CreatureFamilies.familyIds(defender) : (defender.familyIds || []);
    return skills(hero).filter(skill => skill.activation.type === "passive")
      .flatMap(skill => (skill.effects || []).filter(entry => entry.type === "slayer" && families.includes(entry.familyId)));
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
    log.push({ kind: "system", text: "【" + window.GameData.skillCategories[skill.category] + "】" + hero.name + "は「" + skill.name + "」を使用。再使用はターン" + hero.skillReady[skill.id] + "から（CT " + cooldown + "）", encounter, round });
  }
  function attackMultiplier(hero) {
    return hero.allies.filter(ally => has(ally, "statMultiplier"))
      .flatMap(ally => skills(ally).map(skill => effect(skill, "statMultiplier")).filter(entry => entry && entry.stat === "attack"))
      .reduce((best, entry) => Math.max(best, entry.multiplier), 1);
  }
  function protection(hero) {
    return hero.allies.filter(ally => ally.position < hero.position && has(ally, "rearProtection"))
      .flatMap(ally => skills(ally).map(skill => effect(skill, "rearProtection")).filter(Boolean))
      .reduce((best, entry) => Math.min(best, entry.multiplier), 1);
  }
  function start(heroes, log, encounter) {
    heroes.forEach(hero => {
        hero.allies = heroes; hero.skillReady = {}; hero.reactionsUsed = new Set();
      skills(hero).filter(skill => skill.category === "passive" && hero.currentHp > 0).forEach(skill => {
        log.push({ kind: "system", text: "【パッシブ】" + hero.name + "の「" + skill.name + "」：" + skill.description, encounter, round: 0 });
      });
    });
  }
  function afterDamage(random, attacker, hero, hit, dealDamage, log, encounter, round) {
    if (hero.side !== "hero" || !hit.actualDamage || hero.currentHp <= 0) return;
    const reaction = skills(hero).find(skill => skill.activation.type === "reaction" && skill.activation.trigger === "hpBelow" && hero.currentHp < hero.hp * skill.activation.threshold && !hero.reactionsUsed.has(skill.id));
    if (reaction) {
      hero.reactionsUsed.add(reaction.id);
      const healed = Math.min(hero.hp - hero.currentHp, Math.max(1, Math.round(hero.hp * effect(reaction, "heal").multiplier)));
      hero.currentHp += healed; hero.metrics.healingDone += healed;
      log.push({ kind: "heal", text: "【リアクション】" + hero.name + "の「" + reaction.name + "」！ HPを" + healed + "回復（この戦闘で使用済み）", encounter, round });
    }
    const counter = skills(hero).map(skill => ({ skill, effect: effect(skill, "counter") })).filter(entry => entry.effect).sort((a, b) => b.effect.chance - a.effect.chance)[0];
    if (counter && attacker.currentHp > 0 && random() < counter.effect.chance) {
      const response = dealDamage(random, hero, attacker, { multiplier: counter.effect.multiplier, noCritical: true });
      log.push({ kind: "skill", text: "【パッシブ・反撃】" + hero.name + "の「" + counter.skill.name + "」！ " + attacker.name + "に" + response.actualDamage + "ダメージ" + (response.missed ? "（回避）" : ""), encounter, round });
    }
  }
  window.SkillCombat = { effect, ready, use, attackMultiplier, protection, combatMultiplier, combatBonus, slayerMultiplier, slayerFamilyIds, start, afterDamage };
})();
