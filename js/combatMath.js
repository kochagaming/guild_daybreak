(function () {
  "use strict";

  function combatRules() {
    return window.GameData.config.combatRules || {};
  }

  function damageRules() {
    return combatRules().damageFormula || {};
  }

  function finite(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function attackAccuracyMultiplier(hitIndex) {
    if (!Number.isInteger(hitIndex) || hitIndex <= 0) return 1;
    const rules = damageRules();
    const first = finite(rules.additionalHitAccuracy, .6);
    const decay = finite(rules.additionalHitAccuracyDecay, .9);
    return first * Math.pow(decay, hitIndex - 1);
  }

  function attackDamageMultiplier(hitIndex) {
    if (!Number.isInteger(hitIndex)) return 1;
    const rules = damageRules();
    const fullPowerHits = Math.max(1, Math.round(finite(rules.fullPowerHitCount, 2)));
    if (hitIndex < fullPowerHits) return 1;
    return Math.pow(finite(rules.additionalHitDamageDecay, .9), hitIndex - fullPowerHits + 1);
  }

  function hitChance(options) {
    const settings = options || {};
    const rules = combatRules();
    const accuracy = attackAccuracyMultiplier(settings.sequenceIndex);
    const hit = (finite(settings.attackerHitRate, .95) + finite(settings.attackerHitBonus, 0)) * accuracy;
    const evasion = (finite(settings.defenderEvasionRate, 0) + finite(settings.defenderEvasionBonus, 0)) * finite(settings.defenderEvasionMultiplier, 1);
    const minimum = finite(rules.minimumHitChance, .1);
    const maximum = finite(rules.maximumHitChance, .99);
    return Math.min(maximum, Math.max(minimum, hit - evasion));
  }

  function criticalChance(baseRate, bonus, extraBonus) {
    const cap = finite(combatRules().criticalChanceCap, .95);
    return Math.min(cap, Math.max(0, finite(baseRate, .08) + finite(bonus, 0) + finite(extraBonus, 0)));
  }

  function randomVariance(random) {
    const rules = damageRules();
    const minimum = finite(rules.varianceMinimum, .9);
    const maximum = Math.max(minimum, finite(rules.varianceMaximum, 1.1));
    return minimum + random() * (maximum - minimum);
  }

  function rawDamage(options) {
    const settings = options || {};
    const rules = damageRules();
    const attack = Math.max(0, finite(settings.attack, 0));
    const defense = Math.max(0, finite(settings.defense, 0));
    const penetration = Math.max(0, Math.min(1, finite(settings.defensePenetration, 0)));
    const defenseCoefficient = Math.max(0, finite(rules.defenseCoefficient, .52));
    return attack * finite(settings.variance, 1) * attackDamageMultiplier(settings.sequenceIndex)
      - defense * (1 - penetration) * defenseCoefficient;
  }

  function expectedCriticalMultiplier(chance) {
    const multiplier = Math.max(1, finite(damageRules().criticalMultiplier, 1.65));
    return 1 + Math.max(0, Math.min(1, finite(chance, 0))) * (multiplier - 1);
  }

  function rolledCriticalMultiplier(critical) {
    return critical ? Math.max(1, finite(damageRules().criticalMultiplier, 1.65)) : 1;
  }

  function minimumDamage() {
    return Math.max(0, Math.round(finite(damageRules().minimumDamage, 1)));
  }

  window.CombatMath = {
    attackAccuracyMultiplier,
    attackDamageMultiplier,
    hitChance,
    criticalChance,
    randomVariance,
    rawDamage,
    expectedCriticalMultiplier,
    rolledCriticalMultiplier,
    minimumDamage
  };
})();
