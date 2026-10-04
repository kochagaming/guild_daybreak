(function () {
  "use strict";

  function living(units) {
    return (units || []).filter(unit => unit && unit.currentHp > 0);
  }

  function effect(skill, type) {
    return window.SkillCombat.effect(skill, type);
  }

  function statusValue(skill, targets) {
    const statuses = (skill.effects || []).filter(entry => entry.type === "applyStatus");
    if (!statuses.length) return 0;
    return statuses.reduce((total, entry) => {
      const chance = Math.max(0, Math.min(1, entry.chance == null ? 1 : entry.chance));
      const duration = Math.max(1, entry.duration || 1);
      const control = ["paralysis", "chill"].includes(entry.statusId) ? 0.28 : 0.14;
      return total + chance * duration * control * targets;
    }, 0);
  }

  function targetDamageScore(hero, target, damage, sequenceIndex) {
    const magic = damage.damageType === "magic";
    const attackStat = Math.max(1, magic ? hero.magicAttack : hero.attack);
    const defenseStat = Math.max(0, magic ? target.magicDefense : target.defense);
    const hitChance = window.CombatMath.hitChance({
      attackerHitRate: hero.hitRate || .95,
      defenderEvasionRate: target.evasionRate || 0,
      sequenceIndex
    });
    const criticalRate = window.CombatMath.criticalChance(hero.criticalRate || 0, window.SkillCombat.combatBonus(hero, "criticalBonus"), damage.criticalBonus);
    const power = magic ? hero.magicPower || 1 : hero.physicalPower || 1;
    const raw = Math.max(window.CombatMath.minimumDamage(), window.CombatMath.rawDamage({
      attack: attackStat * power * (hero.skillPower || 1) * damage.multiplier,
      defense: defenseStat,
      defensePenetration: damage.defensePenetration,
      sequenceIndex
    }));
    const element = damage.element || "neutral";
    const elementMultiplier = target.elementModifiers?.[element] || 1;
    const magicWeakness = magic ? target.magicVulnerability || 1 : 1;
    return raw * hitChance * window.CombatMath.expectedCriticalMultiplier(criticalRate) * elementMultiplier * magicWeakness;
  }

  function damageScore(skill, hero, monsters) {
    const damage = effect(skill, "damage");
    const targets = living(monsters);
    if (!damage || !targets.length) return -Infinity;
    const scope = skill.targeting?.scope;
    const hitCount = Math.max(1, damage.hits || 1);
    let score = 0;
    if (scope === "allEnemies") {
      targets.forEach(target => { score += targetDamageScore(hero, target, damage, 0); });
    } else {
      const average = targets.reduce((sum, target) => sum + targetDamageScore(hero, target, damage, 0), 0) / targets.length;
      for (let index = 0; index < hitCount; index += 1) {
        const sequenceRatio = targetDamageScore(hero, targets[0], damage, index) / targetDamageScore(hero, targets[0], damage, 0);
        score += average * sequenceRatio;
      }
    }
    const affectedTargets = scope === "allEnemies" ? targets.length : 1;
    return score * (1 + statusValue(skill, affectedTargets));
  }

  function selectDamageSkill(skills, hero, monsters) {
    return (skills || [])
      .filter(skill => effect(skill, "damage"))
      .map((skill, index) => ({ skill, index, score: damageScore(skill, hero, monsters) }))
      .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.skill || null;
  }

  function healingAmount(hero, skill) {
    const healing = effect(skill, "heal");
    if (!healing) return 0;
    return window.SkillCombat.healingAmount(hero, healing);
  }

  function missingHp(unit) {
    return Math.max(0, (unit.hp || 0) - (unit.currentHp || 0));
  }

  function cleanseTargets(skill, heroes) {
    const cleanse = effect(skill, "cleanse");
    if (!cleanse) return [];
    return living(heroes).filter(unit => window.StatusCombat.cleanseableStatusIds(unit, cleanse).length > 0);
  }

  function healingTargets(skill, hero, heroes) {
    const allies = living(heroes);
    const amount = healingAmount(hero, skill);
    const cleanse = effect(skill, "cleanse");
    const score = target => {
      const effectiveHealing = Math.min(amount, missingHp(target));
      const cleansed = cleanse ? window.StatusCombat.cleanseableStatusIds(target, cleanse).length : 0;
      return effectiveHealing + cleansed * Math.max(12, amount * .35);
    };
    if (skill.targeting?.scope === "allAllies") return allies.filter(target => score(target) > 0);
    return allies.map((target, index) => ({ target, index, score: score(target) }))
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.target.currentHp / a.target.hp - b.target.currentHp / b.target.hp || a.index - b.index)
      .slice(0, 1).map(entry => entry.target);
  }

  function healingScore(skill, hero, heroes) {
    const amount = healingAmount(hero, skill);
    const cleanse = effect(skill, "cleanse");
    const targets = healingTargets(skill, hero, heroes);
    const effectiveHealing = targets.reduce((sum, target) => sum + Math.min(amount, missingHp(target)), 0);
    const cleanseValue = cleanse ? targets.reduce((sum, target) => sum + window.StatusCombat.cleanseableStatusIds(target, cleanse).length, 0) * Math.max(12, amount * .35) : 0;
    return effectiveHealing + cleanseValue;
  }

  function selectHealingSkill(skills, hero, heroes) {
    return (skills || [])
      .filter(skill => effect(skill, "heal"))
      .map((skill, index) => ({ skill, index, score: healingScore(skill, hero, heroes) }))
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.skill || null;
  }

  function shouldHeal(skills, hero, heroes) {
    const allies = living(heroes);
    if (!(skills || []).length || !allies.length) return false;
    if ((skills || []).some(skill => cleanseTargets(skill, allies).length > 0)) return true;
    const totalHp = allies.reduce((sum, unit) => sum + unit.hp, 0);
    const totalMissing = allies.reduce((sum, unit) => sum + missingHp(unit), 0);
    const lowestRatio = Math.min(...allies.map(unit => unit.currentHp / unit.hp));
    return lowestRatio <= .82 || totalMissing >= totalHp * .1;
  }

  function selectGuardSkill(skills, hero, monsters) {
    const guards = (skills || []).filter(skill => effect(skill, "guard"));
    if (!guards.length) return null;
    const threatened = living(monsters).some(monster =>
      monster.mechanicPhaseRule?.warnsBurst || monster.mechanicPhaseRule?.unleashesBurst || ["charge", "burst"].includes(monster.mechanicPhase)
    );
    if (!threatened && hero.currentHp >= hero.hp * .6) return null;
    return guards.slice().sort((a, b) =>
      (effect(a, "guard").damageMultiplier || .5) - (effect(b, "guard").damageMultiplier || .5)
    )[0];
  }

  window.CombatDecision = {
    damageScore,
    healingScore,
    healingTargets,
    selectDamageSkill,
    selectHealingSkill,
    selectGuardSkill,
    shouldHeal
  };
})();
