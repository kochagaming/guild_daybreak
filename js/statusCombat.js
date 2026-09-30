(function () {
  "use strict";
  const definitions = () => window.GameData.statusEffects || {};
  const elements = () => window.GameData.elements || {};

  function initialize(unit) {
    if (!unit.statuses || typeof unit.statuses !== "object") unit.statuses = {};
    unit.skipTurn = false;
    return unit;
  }

  function elementMultiplier(unit, elementId) {
    if (!elementId || elementId === "neutral") return 1;
    return Number(unit.elementModifiers?.[elementId] ?? 1);
  }

  function attackMultiplier(unit) {
    initialize(unit);
    return Object.keys(unit.statuses).reduce((value, id) => value * (definitions()[id]?.attackMultiplier || 1), 1);
  }

  function statusMultiplier(unit, property) {
    initialize(unit);
    return Object.keys(unit.statuses).reduce((value, id) => value * (Number(definitions()[id]?.[property]) || 1), 1);
  }

  function speedMultiplier(unit) { return statusMultiplier(unit, "speedMultiplier"); }
  function evasionMultiplier(unit) { return statusMultiplier(unit, "evasionMultiplier"); }

  function resistance(unit, statusId) {
    return Math.min(1, Math.max(0, Number(unit.statusResistances?.[statusId] ?? unit.statusResistance ?? 0)));
  }

  function apply(random, source, target, effect, log, encounter, round) {
    const definition = definitions()[effect.statusId];
    if (!definition || target.currentHp <= 0) return { applied: false, reason: "invalid" };
    const chance = Math.min(1, Math.max(0, Number(effect.chance ?? 1))) * (1 - resistance(target, effect.statusId));
    if (source?.side === "enemy" && source.observation && !source.observation.statusAttacks.includes(effect.statusId)) source.observation.statusAttacks.push(effect.statusId);
    if (random() >= chance) {
      log.push({ kind: "status", text: `【状態異常抵抗】${target.name}は${definition.name}を防いだ。`, encounter, round });
      if (source?.side === "hero" && target.side === "enemy" && target.observation && !target.observation.statusResisted.includes(effect.statusId)) target.observation.statusResisted.push(effect.statusId);
      if (source?.strategyReport) source.strategyReport.statusResisted++;
      return { applied: false, resisted: true, chance };
    }
    initialize(target);
    const duration = Math.max(1, Math.round(effect.duration || definition.defaultDuration || 1));
    const potency = Number(effect.potency ?? definition.defaultPotency ?? 0);
    const previous = target.statuses[effect.statusId];
    target.statuses[effect.statusId] = {
      id: effect.statusId,
      remaining: Math.max(previous?.remaining || 0, duration),
      potency: Math.max(previous?.potency || 0, potency),
      appliedRound: round,
      source
    };
    const detail = definition.description ? `：${definition.description}` : "";
    log.push({ kind: "status", text: `【状態異常】${source?.name || "効果"}により${target.name}は${definition.name}になった（${duration}ターン${detail}）。`, encounter, round });
    if (source?.side === "hero" && target.side === "enemy" && target.observation && !target.observation.statusLanded.includes(effect.statusId)) target.observation.statusLanded.push(effect.statusId);
    if (source?.strategyReport) source.strategyReport.statusInflicted++;
    return { applied: true, duration, potency };
  }

  function applyAll(random, source, target, effects, log, encounter, round) {
    return (effects || []).map(effect => apply(random, source, target, effect, log, encounter, round));
  }

  function cleanse(target, effect, log, encounter, round, sourceName) {
    initialize(target);
    const allowed = effect.statusIds === "all" || !effect.statusIds ? null : new Set(effect.statusIds);
    const ids = Object.keys(target.statuses).filter(id => !allowed || allowed.has(id)).slice(0, Math.max(1, effect.count || 1));
    if (!ids.length) return [];
    ids.forEach(id => delete target.statuses[id]);
    const names = ids.map(id => definitions()[id]?.name || id);
    log.push({ kind: "status", text: `【状態異常解除】${sourceName || target.name}が${target.name}の${names.join("・")}を解除した。`, encounter, round });
    return ids;
  }

  function beginRound(units, log, encounter, round) {
    units.forEach(unit => {
      initialize(unit);
      if (unit.currentHp <= 0) return;
      unit.skipTurn = false;
      Object.entries(unit.statuses).forEach(([id, state]) => {
        const definition = definitions()[id];
        if (!definition) return;
        if (definition.periodic) {
          const damage = Math.min(unit.currentHp, Math.max(1, Math.round(unit.hp * (state.potency || definition.defaultPotency || 0))));
          unit.currentHp = Math.max(0, unit.currentHp - damage);
          if (unit.metrics) unit.metrics.damageTaken += damage;
          if (state.source?.metrics) { state.source.metrics.damageDealt += damage; state.source.metrics.statusDamageDealt += damage; }
          if (state.source?.strategyReport) state.source.strategyReport.statusDamage += damage;
          log.push({ kind: "status", text: `【${definition.name}】${unit.name}は${damage}ダメージ。${unit.currentHp > 0 ? `残りHP ${unit.currentHp}/${unit.hp}` : "戦闘不能になった！"}`, encounter, round });
        }
        if (unit.currentHp > 0 && definition.skipTurn) {
          unit.skipTurn = true;
          log.push({ kind: "status", text: `【${definition.name}】${unit.name}は体が動かず、このターン行動できない。`, encounter, round });
        }
      });
    });
  }

  function endRound(units, log, encounter, round) {
    units.forEach(unit => {
      initialize(unit);
      Object.entries(unit.statuses).forEach(([id, state]) => {
        if (state.appliedRound >= round) return;
        state.remaining -= 1;
        if (state.remaining > 0) return;
        const name = definitions()[id]?.name || id;
        delete unit.statuses[id];
        if (unit.currentHp > 0) log.push({ kind: "status", text: `【回復】${unit.name}の${name}が治った。`, encounter, round });
      });
      unit.skipTurn = false;
    });
  }

  function elementLabel(elementId) { return elements()[elementId]?.name || elementId || "無属性"; }
  window.StatusCombat = { initialize, elementMultiplier, elementLabel, attackMultiplier, speedMultiplier, evasionMultiplier, resistance, apply, applyAll, cleanse, beginRound, endRound };
})();
