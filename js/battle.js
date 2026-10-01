(function () {
  "use strict";

  function chooseHeroTarget(random, hero, monsters, log, encounter, round) {
    const candidates = living(monsters);
    if (!candidates.length) return null;
    const rearTargeting = Math.max(0, window.SkillCombat.combatBonus(hero, "rearTargeting"));
    const falloff = Math.min(.96, .56 + rearTargeting);
    const weights = candidates.map(unit => Math.pow(falloff, unit.position || 0));
    let roll = random() * weights.reduce((sum, value) => sum + value, 0);
    for (let index = 0; index < candidates.length; index += 1) {
      roll -= weights[index];
      if (roll <= 0) return candidates[index];
    }
    return candidates[candidates.length - 1];
  }

  function seededRandom(seed) {
    return window.GameRuntime.seededRandom(seed);
  }

  function integer(random, range) { return Math.floor(range[0] + random() * (range[1] - range[0] + 1)); }
  function living(units) { return units.filter((unit) => unit.currentHp > 0); }
  function chooseHeroAction(random, rates, availability) {
    for (const id of window.GameData.combatRules.actionPriority) {
      if (!availability[id] || rates[id] <= 0) continue;
      if (rates[id] >= 100 || random() < rates[id] / 100) return id;
    }
    return "defend";
  }
  function choose(random, units) { const candidates = living(units); return candidates[Math.floor(random() * candidates.length)]; }
  function chooseFrontWeighted(random, units) {
    const candidates = living(units);
    if (!candidates.length) return null;
    const weights = candidates.map(unit => Math.pow(.68, unit.position || 0));
    let roll = random() * weights.reduce((sum, value) => sum + value, 0);
    for (let index = 0; index < candidates.length; index += 1) {
      roll -= weights[index];
      if (roll <= 0) return candidates[index];
    }
    return candidates[candidates.length - 1];
  }

  function chooseRearWeighted(random, units) {
    const candidates = living(units);
    if (!candidates.length) return null;
    const lastPosition = Math.max(...candidates.map(unit => unit.position || 0));
    const weights = candidates.map(unit => Math.pow(.68, lastPosition - (unit.position || 0)));
    let roll = random() * weights.reduce((sum, value) => sum + value, 0);
    for (let index = 0; index < candidates.length; index += 1) {
      roll -= weights[index];
      if (roll <= 0) return candidates[index];
    }
    return candidates[candidates.length - 1];
  }
  function positionName(position) { return ["前衛", "中衛", "後衛"][position] || `${position + 1}番`; }

  function formationMultiplier(unit) {
    const melee = [1, 0.82, 0.62];
    const ranged = [0.62, 0.85, 1];
    const atPosition = table => {
      if (unit.formationSize > 3) {
        const coordinate = Math.min(2, Math.max(0, unit.position * 2 / (unit.formationSize - 1)));
        const index = Math.floor(coordinate), fraction = coordinate - index;
        return table[index] + ((table[Math.min(2, index + 1)] - table[index]) * fraction);
      }
      return table[unit.position] || 1;
    };
    if (unit.weaponRange === "mixed") return atPosition(melee) * atPosition(ranged);
    return atPosition(unit.weaponRange === "ranged" ? ranged : melee);
  }

  function attackAccuracyMultiplier(hitIndex) {
    return hitIndex <= 0 ? 1 : 0.6 * Math.pow(0.9, hitIndex - 1);
  }

  function attackDamageMultiplier(hitIndex) {
    return hitIndex <= 1 ? 1 : Math.pow(0.9, hitIndex - 1);
  }

  function blankObservation() {
    return { incomingAttempts: 0, incomingHits: 0, enemyTurns: 0, maxAttackCount: 0, magicAttack: false, rearTargeting: false, attackElements: [], statusAttacks: [], elementWeaknesses: [], elementResistances: [], statusResisted: [], statusLanded: [], burstRounds: [], difficultySkillIds: [], drops: [] };
  }

  function remember(list, value) { if (value != null && !list.includes(value)) list.push(value); }

  function mergeObservation(target, source) {
    target.incomingAttempts += source.incomingAttempts || 0;
    target.incomingHits += source.incomingHits || 0;
    target.enemyTurns += source.enemyTurns || 0;
    target.maxAttackCount = Math.max(target.maxAttackCount || 0, source.maxAttackCount || 0);
    target.magicAttack = target.magicAttack || Boolean(source.magicAttack);
    target.rearTargeting = target.rearTargeting || Boolean(source.rearTargeting);
    ["attackElements", "statusAttacks", "elementWeaknesses", "elementResistances", "statusResisted", "statusLanded", "burstRounds", "difficultySkillIds", "drops"].forEach(key => (source[key] || []).forEach(value => remember(target[key], value)));
    return target;
  }

  function dealDamage(random, attacker, defender, options) {
    const settings = options || {};
    const sequenceIndex = Number.isInteger(settings.sequenceIndex) ? settings.sequenceIndex : null;
    const magic = (settings.damageType || attacker.damageType) === "magic";
    if (attacker.side === "hero" && defender.side === "enemy" && defender.observation) defender.observation.incomingAttempts += 1;
    if (settings.trackAttackHit && attacker.metrics) attacker.metrics.attackAttempts += 1;
    if (!settings.telegraphed) {
      const accuracy = sequenceIndex == null ? 1 : attackAccuracyMultiplier(sequenceIndex);
      const skillHit = attacker.side === "hero" ? window.SkillCombat.combatBonus(attacker, "hitBonus") : 0;
      const skillEvasion = defender.side === "hero" ? window.SkillCombat.combatBonus(defender, "evasionBonus") : 0;
      const statusEvasion = window.StatusCombat.evasionMultiplier(defender);
      const chance = Math.min(.99, Math.max(.1, (attacker.hitRate + skillHit) * accuracy - (defender.evasionRate + skillEvasion) * statusEvasion));
      if (random() >= chance) return { damage: 0, actualDamage: 0, critical: false, guarded: false, exposed: 1, magicWeakness: 1, slayer: 1, slayerLabels: [], defeated: false, missed: true };
    }
    if (attacker.side === "hero" && defender.side === "enemy" && defender.observation) defender.observation.incomingHits += 1;
    if (settings.trackAttackHit && attacker.metrics) attacker.metrics.attackHits += 1;
    const element = settings.element || attacker.element || "neutral";
    const skillCritical = attacker.side === "hero" ? window.SkillCombat.combatBonus(attacker, "criticalBonus") : 0;
    const critical = !settings.noCritical && random() < (attacker.criticalRate == null ? 0.08 : attacker.criticalRate) + skillCritical + (settings.criticalBonus || 0);
    const variance = 0.9 + random() * 0.2;
    const equipmentPower = magic ? attacker.magicPower || 1 : attacker.physicalPower || 1;
    const statusPower = magic ? 1 : window.StatusCombat.attackMultiplier(attacker);
    const originPower = attacker.side === "hero" ? window.SkillCombat.combatMultiplier(attacker, magic ? "outgoingMagic" : "outgoingPhysical") : 1;
    const attack = (magic ? attacker.magicAttack : attacker.attack * (attacker.side === "hero" ? window.SkillCombat.attackMultiplier(attacker) : 1)) * statusPower * originPower * formationMultiplier(attacker) * (attacker.side === "hero" ? equipmentPower : 1) * (settings.multiplier || 1) * (settings.id ? attacker.skillPower || 1 : 1);
    const effectiveDefense = (magic ? defender.magicDefense : defender.defense) * (1 - (settings.defensePenetration || 0));
    const sequencePower = sequenceIndex == null ? 1 : attackDamageMultiplier(sequenceIndex);
    const raw = attack * variance * sequencePower - effectiveDefense * 0.52;
    const exposed = defender.incomingDamageMultiplier || 1;
    const magicWeakness = settings.damageType === "magic" ? defender.magicVulnerability || 1 : 1;
    const elementEffect = window.StatusCombat.elementMultiplier(defender, element);
    if (attacker.side === "hero" && defender.side === "enemy" && defender.observation) {
      if (elementEffect > 1) remember(defender.observation.elementWeaknesses, element);
      if (elementEffect < 1) remember(defender.observation.elementResistances, element);
      if (magicWeakness > 1) remember(defender.observation.elementWeaknesses, "magic");
    }
    const originGuard = defender.side === "hero" ? window.SkillCombat.combatMultiplier(defender, magic ? "incomingMagic" : "incomingPhysical") : 1;
    const defenderFamilies = window.CreatureFamilies ? window.CreatureFamilies.familyIds(defender) : (defender.familyIds || []);
    const gearSlayer = defenderFamilies.reduce((value, id) => value * (attacker.slayerMultipliers?.[id] || 1), 1);
    const learnedSlayer = attacker.side === "hero" && window.SkillCombat.slayerMultiplier ? window.SkillCombat.slayerMultiplier(attacker, defender) : 1;
    const slayer = gearSlayer * learnedSlayer;
    const learnedFamilies = attacker.side === "hero" && window.SkillCombat.slayerFamilyIds ? window.SkillCombat.slayerFamilyIds(attacker, defender) : [];
    const matchingFamilies = defenderFamilies.filter(id => (attacker.slayerMultipliers?.[id] || 1) > 1 || learnedFamilies.includes(id));
    const slayerLabels = slayer > 1 && window.CreatureFamilies ? window.CreatureFamilies.labels(matchingFamilies) : [];
    let damage = Math.max(1, Math.round(raw * (critical ? 1.65 : 1) * exposed * magicWeakness * elementEffect * originGuard * slayer));
    const guarded = Boolean(defender.guard || (settings.telegraphed && defender.burstGuard));
    if (guarded) { damage = Math.max(1, Math.round(damage * 0.5)); defender.guard = false; }
    if (settings.telegraphed) defender.burstGuard = false;
    const protection = defender.side === "hero" ? window.SkillCombat.protection(defender) : 1;
    damage = Math.max(1, Math.round(damage * protection));
    const actualDamage = Math.min(defender.currentHp, damage);
    defender.currentHp = Math.max(0, defender.currentHp - damage);
    if (attacker.metrics) {
      attacker.metrics.damageDealt += actualDamage;
      if (critical) attacker.metrics.criticalHits += 1;
    }
    if (defender.metrics) defender.metrics.damageTaken += actualDamage;
    if (attacker.strategyReport) {
      const report = attacker.strategyReport;
      if (attacker.side === "hero") {
        if (settings.kind === "area") report.areaHits++;
        if (settings.defensePenetration > 0) report.penetrationHits++;
        if (magicWeakness > 1) { report.magicWeaknessHits++; report.magicWeaknessDamage += actualDamage; }
        if (elementEffect > 1) report.elementWeaknessHits++;
      } else if (["rear", "rear_weighted"].includes(attacker.targetRule) && !settings.telegraphed) {
        report.rearHits++; report.rearDamage += actualDamage;
        if (defender.currentHp === 0) report.rearKnockouts++;
      }
    }
    return { damage, actualDamage, critical, guarded, exposed, magicWeakness, element, elementEffect, magic, protection, slayer, slayerLabels, defeated: defender.currentHp === 0 };
  }

  function makeParty(expedition) {
      return expedition.partySnapshot.map((member, index) => ({
        id: member.id, name: member.name, level: member.level,
        jobId: member.jobId || "warrior", raceId: member.raceId || "human", position: member.position == null ? index : member.position,
        familyIds: member.familyIds || (window.CreatureFamilies ? window.CreatureFamilies.familyIdsForRace(member.raceId || "human") : []),
        actionRates: Object.assign({}, window.GameData.combatRules.defaultActionRates, member.actionRates || {}),
        formationSize: Math.max(3, expedition.partySnapshot.length),
        magicAttack: member.stats.magicAttack ?? member.stats.attack, magicDefense: member.stats.magicDefense ?? member.stats.defense,
        magicHealing: member.stats.magicHealing ?? member.stats.attack, hitRate: member.stats.hitRate ?? .96, evasionRate: member.stats.evasionRate ?? .03,
        specialEquipment: member.specialEquipment || [],
        equipmentSkillIds: member.equipmentSkillIds || [],
        basicDamageType: member.basicDamageType || "physical",
        weaponRange: member.weaponRange || "melee", skillIds: member.skillIds || [], side: "hero",
        skillPower: member.stats.skillPower || 1, healingPower: member.stats.healingPower || 1,
        physicalPower: member.stats.physicalPower || 1, magicPower: member.stats.magicPower || 1,
        slayerMultipliers: Object.assign({}, member.stats.slayerMultipliers || {}),
        elementModifiers: Object.assign({}, member.stats.elementModifiers || {}), statusResistances: Object.assign({}, member.stats.statusResistances || {}),
        hp: member.stats.hp, currentHp: member.stats.hp, attack: member.stats.attack,
        defense: member.stats.defense, speed: member.stats.speed || 10,
        attackCount: Math.min(8, Math.max(1, member.stats.attackCount || 1 + Math.floor(Math.max(0, (member.stats.speed || 10) - 8) / 8))),
        criticalRate: member.stats.criticalRate == null ? 0.05 : member.stats.criticalRate
      }));
  }

  function makeMonsters(ids, dungeon) {
    return ids.map((id, index) => {
      const base = window.GameData.monsters[id];
      const source = window.DungeonDifficulty ? window.DungeonDifficulty.monster(base, dungeon?.difficultyId || "normal") : base;
      const scaling = dungeon?.monsterScaling?.[source.boss ? "boss" : "regular"] || {};
      const scaled = Object.assign({}, source, {
        hp: Math.max(1, Math.round(source.hp * (scaling.hp || 1))),
        attack: Math.max(1, Math.round(source.attack * (scaling.attack || 1))),
        magicAttack: Math.max(1, Math.round((source.magicAttack ?? source.attack) * (scaling.attack || 1))),
        defense: Math.max(0, Math.round(source.defense * (scaling.defense || 1))),
        magicDefense: Math.max(0, Math.round((source.magicDefense ?? source.defense) * (scaling.defense || 1)))
      });
      return Object.assign({}, scaled, { position: index, formationSize: Math.max(3, ids.length), familyIds: window.CreatureFamilies ? window.CreatureFamilies.familyIdsForMonster(id) : [], weaponRange: scaled.range || (scaled.damageType === "magic" ? "ranged" : "melee"), hitRate: scaled.hitRate ?? .95, evasionRate: scaled.evasionRate ?? .03, attackCount: Math.min(8, Math.max(1, scaled.attackCount || 1)), battleId: `${id}-${index}`, side: "enemy", currentHp: scaled.hp, speed: scaled.speed || 9, criticalRate: scaled.criticalRate || 0.06, observation: blankObservation() });
    });
  }

  function pushLog(log, kind, text, encounter, round, metadata) {
    const entry = { kind, text, encounter: encounter || 0, round: round || 0 };
    if (metadata?.sceneId) entry.sceneId = metadata.sceneId;
    log.push(entry);
  }

  function hitText(attacker, target, hit, skillName) {
    const action = skillName ? `${attacker.name}の「${skillName}」！` : `${attacker.name}の攻撃！`;
    if (hit.missed) return `${action} ${target.name}に命中せず、回避された！ ダメージ0。`;
    const critical = hit.critical ? "【会心】" : "";
    const guarded = (hit.guarded ? "（防御で軽減）" : "") + (hit.protection < 1 ? "【後方守護・2/3倍】" : "");
    const ending = hit.defeated ? `${target.name}を倒した！` : `残りHP ${target.currentHp}/${target.hp}`;
    const weakness = hit.exposed > 1 ? `【大技後の隙・被ダメージ${hit.exposed}倍】` : "";
    const magic = hit.magicWeakness > 1 ? `【魔法弱点・${hit.magicWeakness}倍】` : "";
    const slayer = hit.slayer > 1 ? `【${(hit.slayerLabels || []).join("・") || "種族"}特攻・${hit.slayer.toFixed(2)}倍】` : "";
    const element = hit.element && hit.element !== "neutral" ? `【${window.StatusCombat.elementLabel(hit.element)}属性${hit.elementEffect > 1 ? `・弱点${hit.elementEffect}倍` : hit.elementEffect < 1 ? `・耐性${hit.elementEffect}倍` : ""}】` : "";
    const rear = attacker.targetRule === "rear" && !skillName ? "【後列狙い】" : attacker.targetRule === "rear_weighted" && !skillName ? "【後列を狙いやすい】" : "";
    const statusPursuit = attacker.targetStatusId && target.statuses?.[attacker.targetStatusId] ? `【${window.GameData.statusEffects[attacker.targetStatusId]?.name || "状態異常"}追撃】` : "";
    return `${action}${rear}${statusPursuit}${hit.magic ? "【魔法】" : ""}${element}${slayer} ${target.name}に${hit.damage}ダメージ${critical}${guarded}${weakness}${magic}。${ending}`;
  }

  function mostWounded(heroes) {
    return living(heroes).slice().sort((a, b) => a.currentHp / a.hp - b.currentHp / b.hp)[0];
  }

  function criticalFollowup(random, hero, triggerTarget, monsters, log, encounter, round) {
    if (hero.followupUsed || !living(monsters).length) return;
    const item = (hero.specialEquipment || []).map(id => (window.GameData.items || {})[id]).filter(Boolean).find(base => (base.specialEffects || []).some(effect => effect.kind === "critical_followup"));
    if (!item) return;
    hero.followupUsed = true;
    const effect = item.specialEffects.find(entry => entry.kind === "critical_followup");
    const followTarget = triggerTarget.currentHp > 0 ? triggerTarget : chooseHeroTarget(random, hero, monsters, log, encounter, round);
    const follow = dealDamage(random, hero, followTarget, { multiplier: effect.multiplier, noCritical: true });
    if (follow.exposed > 1) followTarget.mechanicReport.weaknessHits++;
    pushLog(log, "skill", `【固有效果：${item.name}】${hitText(hero, followTarget, follow, effect.name || "牙の追撃")}`, encounter, round);
  }

  function sequenceText(attacker, strikes) {
    const hits = strikes.filter(entry => !entry.hit.missed);
    const total = hits.reduce((sum, entry) => sum + entry.hit.actualDamage, 0);
    const criticals = hits.filter(entry => entry.hit.critical).length;
    const defeated = [...new Set(strikes.filter(entry => entry.hit.defeated).map(entry => entry.target.name))];
    const targets = [...new Set(strikes.map(entry => entry.target.name))].join("、");
    const rear = attacker.targetRule === "rear" ? "【後列狙い】" : attacker.targetRule === "rear_weighted" ? "【後列を狙いやすい】" : "";
    const magic = hits.some(entry => entry.hit.magic) ? "【魔法】" : "";
    const exposed = Math.max(1, ...hits.map(entry => entry.hit.exposed || 1));
    const magicWeakness = Math.max(1, ...hits.map(entry => entry.hit.magicWeakness || 1));
    const slayer = Math.max(1, ...hits.map(entry => entry.hit.slayer || 1));
    const slayerLabels = Array.from(new Set(hits.flatMap(entry => entry.hit.slayerLabels || [])));
    const traits = `${criticals ? `【会心】×${criticals}` : ""}${exposed > 1 ? `【大技後の隙・被ダメージ${exposed}倍】` : ""}${magicWeakness > 1 ? `【魔法弱点・${magicWeakness}倍】` : ""}${slayer > 1 ? `【${slayerLabels.join("・") || "種族"}特攻・${slayer.toFixed(2)}倍】` : ""}`;
    return `${attacker.name}の連続攻撃！${rear}${magic} ${targets}へ${strikes.length}回攻撃、${hits.length ? `${hits.length}回命中` : "すべて命中せず"}。${targets}に${total}ダメージ${traits}${defeated.length ? `。${defeated.join("、")}を倒した！` : "。"}`;
  }

  function heroNormalAttack(random, hero, monsters, log, encounter, round) {
    const strikes = [];
    let target = chooseHeroTarget(random, hero, monsters, log, encounter, round);
    for (let hitIndex = 0; hitIndex < hero.attackCount && target && living(monsters).length; hitIndex += 1) {
      if (target.currentHp <= 0) target = chooseHeroTarget(random, hero, monsters, log, encounter, round);
      if (!target) break;
      const hit = dealDamage(random, hero, target, { sequenceIndex: hitIndex, trackAttackHit: true, damageType: hero.basicDamageType });
      if (hit.exposed > 1) target.mechanicReport.weaknessHits++;
      strikes.push({ target, hit });
    }
    if (!strikes.length) return;
    pushLog(log, "hero", sequenceText(hero, strikes), encounter, round);
    const critical = strikes.find(entry => entry.hit.critical);
    if (critical) criticalFollowup(random, hero, critical.target, monsters, log, encounter, round);
  }

  function heroHit(random, hero, target, monsters, settings, log, encounter, round, prefix) {
    const physical = !settings || settings.damageType !== "magic";
    const hit = dealDamage(random, hero, target, Object.assign({}, settings || {}, { trackAttackHit: physical }));
    if (hit.exposed > 1) target.mechanicReport.weaknessHits++;
    pushLog(log, settings ? "skill" : "hero", `${prefix || ""}${hitText(hero, target, hit, settings && settings.name)}`, encounter, round);
    if (!hit.missed && hit.actualDamage > 0 && target.currentHp > 0 && settings?.statusEffects) window.StatusCombat.applyAll(random, hero, target, settings.statusEffects, log, encounter, round);
    if (hit.critical) criticalFollowup(random, hero, target, monsters, log, encounter, round);
  }

  function performHeroAction(random, hero, heroes, monsters, log, encounterIndex, round) {
    if (hero.currentHp <= 0 || hero.skipTurn || !living(monsters).length) return;
    hero.followupUsed = false;
    const skills = hero.skillIds.map((id) => window.GameData.skills[id]).filter(Boolean).filter(skill => window.SkillCombat.ready(hero, skill, round));
    const effect = (skill, type) => window.SkillCombat.effect(skill, type);
    const strongest = candidates => candidates.slice().sort((a, b) => (effect(b, "damage")?.multiplier || effect(b, "heal")?.multiplier || 0) - (effect(a, "damage")?.multiplier || effect(a, "heal")?.multiplier || 0))[0];
    const healingEffectText = (hero.specialEquipment || []).map(id => (window.GameData.items || {})[id]).filter(item => item && (item.specialEffects || []).some(effect => effect.kind === "healing_boost")).map(item => `【固有效果：${item.name}・回復強化】`).join("");
    const available = {
      technique: skills.filter(skill => skill.category === "technique"),
      spell: skills.filter(skill => skill.category === "spell"),
      healing: skills.filter(skill => skill.category === "healing" && effect(skill, "heal"))
    };
    const wounded = living(heroes).filter(member => member.currentHp < member.hp);
    const afflicted = living(heroes).filter(member => Object.keys(member.statuses || {}).length > 0);
    const cleansing = available.healing.filter(skill => effect(skill, "cleanse"));
    const needsCleanse = afflicted.length > 0 && cleansing.length > 0;
    const action = chooseHeroAction(random, hero.actionRates, {
      healing: Boolean(available.healing.length && (wounded.length || needsCleanse)),
      spell: Boolean(available.spell.length),
      technique: Boolean(available.technique.length),
      attack: true
    });

    if (action === "healing") {
      const helpful = needsCleanse ? cleansing : available.healing;
      const group = strongest(helpful.filter(skill => skill.targeting.scope === "allAllies"));
      const single = strongest(helpful.filter(skill => skill.targeting.scope === "lowestHpAlly"));
      const selected = (wounded.length >= 2 || afflicted.length >= 2) && group ? group : single || group;
      if (selected) {
        window.SkillCombat.use(hero, selected, round, log, encounterIndex);
        const cleanse = effect(selected, "cleanse");
        const targets = selected.targeting.scope === "allAllies"
          ? living(heroes).filter(member => member.currentHp < member.hp || cleanse && Object.keys(member.statuses || {}).length)
          : [wounded.length ? mostWounded(heroes) : afflicted[0]];
        const healed = targets.filter(Boolean).map(target => {
          const amount = Math.max(1, Math.round((hero.magicHealing * effect(selected, "heal").multiplier + 5) * (hero.healingPower || 1) * window.SkillCombat.combatMultiplier(hero, "healing")));
          const actual = Math.min(amount, target.hp - target.currentHp);
          target.currentHp += actual; hero.metrics.healingDone += actual;
          if (cleanse) window.StatusCombat.cleanse(target, cleanse, log, encounterIndex, round, hero.name);
          return `${target.name}+${actual}`;
        });
        pushLog(log, "heal", `${hero.name}の「${selected.name}」！ ${healed.join("、")}回復。${healingEffectText}`, encounterIndex, round);
        return;
      }
    }

    if (action === "technique" || action === "spell") {
      const guard = available[action].find(skill => effect(skill, "guard"));
      const threat = living(monsters).find(monster => ["charge", "burst"].includes(monster.mechanicPhase));
      if (guard && (threat || hero.currentHp < hero.hp * .6)) {
        hero[threat ? "burstGuard" : "guard"] = true;
        window.SkillCombat.use(hero, guard, round, log, encounterIndex);
        pushLog(log, "skill", `${hero.name}は「${guard.name}」を使い、次に受けるダメージへ備えた。`, encounterIndex, round);
        return;
      }
      const skill = strongest(available[action].filter(candidate => effect(candidate, "damage")));
      if (skill) {
        window.SkillCombat.use(hero, skill, round, log, encounterIndex);
        const skillDamage = Object.assign({ id: skill.id, name: skill.name, kind: skill.targeting.scope === "allEnemies" ? "area" : "single", damageType: action === "technique" ? "physical" : "magic", statusEffects: skill.effects.filter(entry => entry.type === "applyStatus") }, effect(skill, "damage"));
        if (skill.targeting.scope === "allEnemies") {
          living(monsters).forEach(target => heroHit(random, hero, target, monsters, skillDamage, log, encounterIndex, round));
          return;
        }
        if (skillDamage.hits > 1) {
          for (let hitIndex = 0; hitIndex < skillDamage.hits && living(monsters).length; hitIndex += 1) {
            const target = chooseHeroTarget(random, hero, monsters, log, encounterIndex, round);
            heroHit(random, hero, target, monsters, Object.assign({}, skillDamage, { sequenceIndex: hitIndex }), log, encounterIndex, round, `${hitIndex + 1}撃目：`);
          }
          return;
        }
        heroHit(random, hero, chooseHeroTarget(random, hero, monsters, log, encounterIndex, round), monsters, skillDamage, log, encounterIndex, round);
        return;
      }
    }
    if (action === "attack") {
      heroNormalAttack(random, hero, monsters, log, encounterIndex, round);
      return;
    }
    hero.guard = true;
    pushLog(log, "guard", `${hero.name}は防御し、次に受けるダメージへ備えた。`, encounterIndex, round);
  }

  function performMonsterSkill(random, monster, heroes, log, encounterIndex, round) {
    if (monster.skillRoundUsed === round) return false;
    const skills = (monster.difficultySkillIds || []).map(id => window.GameData.monsterSkills?.[id]).filter(Boolean);
    const ready = skills.filter(entry => round >= (entry.offset || entry.period) && (round - (entry.offset || 0)) % entry.period === 0);
    monster.skillUseCounts = monster.skillUseCounts || {};
    const skill = ready.slice().sort((a, b) => (monster.skillUseCounts[a.id] || 0) - (monster.skillUseCounts[b.id] || 0) || skills.indexOf(a) - skills.indexOf(b))[0];
    if (!skill) return false;
    monster.skillRoundUsed = round;
    monster.skillUseCounts[skill.id] = (monster.skillUseCounts[skill.id] || 0) + 1;
    remember(monster.observation.difficultySkillIds, skill.id);
    const candidates = living(heroes);
    const chooseTarget = () => {
      if (skill.targetRule === "rear") return candidates.slice().sort((a, b) => b.position - a.position)[0];
      if (skill.targetRule === "rear_weighted") return chooseRearWeighted(random, candidates);
      return chooseFrontWeighted(random, candidates);
    };
    const targets = skill.target === "all" ? candidates : [chooseTarget()].filter(Boolean);
    pushLog(log, "enemy-skill", `【敵技・${skill.period}ターン周期】${monster.name}が「${skill.name}」を発動！`, encounterIndex, round);
    targets.forEach(target => {
      if (monster.currentHp <= 0 || target.currentHp <= 0) return;
      const hit = dealDamage(random, monster, target, { id: skill.id, multiplier: skill.multiplier, damageType: skill.damageType, element: skill.element, kind: skill.target === "all" ? "area" : "single", noCritical: true });
      pushLog(log, "enemy", hitText(monster, target, hit, skill.name), encounterIndex, round);
      if (!hit.missed && hit.actualDamage > 0 && target.currentHp > 0 && skill.statusAttack) window.StatusCombat.apply(random, monster, target, skill.statusAttack, log, encounterIndex, round);
      window.SkillCombat.afterDamage(random, monster, target, hit, dealDamage, log, encounterIndex, round);
    });
    return true;
  }

  function performMonsterAction(random, monster, heroes, log, encounterIndex, round) {
    if (monster.currentHp <= 0 || monster.skipTurn || !living(heroes).length) return;
    monster.observation.enemyTurns += 1;
    monster.observation.maxAttackCount = Math.max(monster.observation.maxAttackCount, monster.attackCount || 1);
    monster.observation.magicAttack = monster.observation.magicAttack || monster.damageType === "magic";
    monster.observation.rearTargeting = monster.observation.rearTargeting || ["rear", "rear_weighted"].includes(monster.targetRule);
    if (monster.element && monster.element !== "neutral") remember(monster.observation.attackElements, monster.element);
    if (performMonsterSkill(random, monster, heroes, log, encounterIndex, round)) return;
    const selectTarget = () => {
      if (monster.targetRule === "rear") return living(heroes).slice().sort((a, b) => b.position - a.position)[0];
      if (monster.targetRule === "rear_weighted") return chooseRearWeighted(random, heroes);
      if (monster.targetStatusId) {
        const afflicted = living(heroes).filter(hero => hero.statuses?.[monster.targetStatusId]);
        if (afflicted.length) return chooseFrontWeighted(random, afflicted);
      }
      return chooseFrontWeighted(random, heroes);
    };
    if (monster.damageType === "magic" || monster.attackCount <= 1) {
      const target = selectTarget();
      const hit = dealDamage(random, monster, target);
      pushLog(log, "enemy", hitText(monster, target, hit), encounterIndex, round);
      if (!hit.missed && hit.actualDamage > 0 && target.currentHp > 0 && monster.statusAttack) window.StatusCombat.apply(random, monster, target, monster.statusAttack, log, encounterIndex, round);
      window.SkillCombat.afterDamage(random, monster, target, hit, dealDamage, log, encounterIndex, round);
      return;
    }
    const strikes = [];
    let target = selectTarget();
    for (let hitIndex = 0; hitIndex < monster.attackCount && target && living(heroes).length && monster.currentHp > 0; hitIndex += 1) {
      if (target.currentHp <= 0) target = selectTarget();
      if (!target) break;
      const hit = dealDamage(random, monster, target, { sequenceIndex: hitIndex });
      strikes.push({ target, hit });
      window.SkillCombat.afterDamage(random, monster, target, hit, dealDamage, log, encounterIndex, round);
    }
    if (strikes.length) pushLog(log, "enemy", sequenceText(monster, strikes), encounterIndex, round);
    if (monster.statusAttack) {
      const landed = strikes.find(entry => !entry.hit.missed && entry.hit.actualDamage > 0 && entry.target.currentHp > 0);
      if (landed) window.StatusCombat.apply(random, monster, landed.target, monster.statusAttack, log, encounterIndex, round);
    }
  }

  function fightEncounter(random, heroes, monsters, encounterIndex, encounterName, log) {
    window.SkillCombat.start(heroes, log, encounterIndex);
    heroes.forEach(hero => { hero.burstGuard = false; hero.statuses = {}; });
    monsters.forEach(monster => { monster.statuses = {}; });
    pushLog(log, "encounter", `第${encounterIndex}戦：${encounterName} — ${monsters.map(monster => `${positionName(monster.position)}の${monster.name}`).join("、")}が隊列を組んで現れた！`, encounterIndex, 0);
    monsters.forEach(monster => pushLog(log, "formation", `敵${positionName(monster.position)}：${monster.name}（${monster.weaponRange === "ranged" ? "遠距離" : "近接"}・隊列補正${Math.round(formationMultiplier(monster) * 100)}%）`, encounterIndex, 0));
    let round = 0;
    while (living(heroes).length && living(monsters).length && round < 30) {
      round += 1;
      pushLog(log, "round", `ターン ${round}`, encounterIndex, round);
      prepareMechanics(monsters, log, encounterIndex, round);
      window.StatusCombat.beginRound([...heroes, ...monsters], log, encounterIndex, round);
      const turns = [];
      living(heroes).forEach((hero) => turns.push({ unit: hero, speed: hero.speed * window.StatusCombat.speedMultiplier(hero) + random() * 2 }));
      living(monsters).forEach((monster) => {
        if (monster.mechanicPhase && monster.mechanicPhase !== "normal") return;
        for (let action = 0; action < (monster.actions || 1); action += 1) turns.push({ unit: monster, speed: monster.speed * window.StatusCombat.speedMultiplier(monster) + random() * 2 - action * 0.1 });
      });
      turns.sort((a, b) => b.speed - a.speed).forEach((turn) => {
        if (turn.unit.side === "hero") performHeroAction(random, turn.unit, heroes, monsters, log, encounterIndex, round);
        else performMonsterAction(random, turn.unit, heroes, log, encounterIndex, round);
      });
      living(monsters).filter(monster => monster.mechanicPhase === "burst").forEach(monster => {
        unleashBurst(random, monster, heroes, log, encounterIndex, round);
      });
      window.StatusCombat.endRound([...heroes, ...monsters], log, encounterIndex, round);
    }
    const cleared = living(monsters).length === 0;
    pushLog(log, cleared ? "victory" : "defeat", cleared ? `第${encounterIndex}戦に勝利した。` : `探索隊は第${encounterIndex}戦から撤退した。`, encounterIndex, round);
    return { cleared, round, timedOut: !cleared && living(heroes).length > 0 && round === 30 };
  }

  function prepareMechanics(monsters, log, encounter, round) {
    living(monsters).forEach(monster => {
      if (!monster.mechanic || monster.mechanic.kind !== "telegraphed_burst") return;
      if (!monster.mechanicReport) monster.mechanicReport = { warnings: 0, bursts: 0, guardedHits: 0, unguardedHits: 0, burstDamage: 0, burstKnockouts: 0, weaknessHits: 0 };
      monster.mechanicPhase = ["charge", "burst", "exposed", "normal"][(round - 1) % monster.mechanic.period] || "normal";
      monster.incomingDamageMultiplier = monster.mechanicPhase === "exposed" ? monster.mechanic.exposedMultiplier : 1;
      if (monster.mechanicPhase === "charge") {
        monster.mechanicReport.warnings++;
        pushLog(log, "warning", `【行動観測】${monster.name}が力を溜め始めた。次ターン終了時に全体攻撃「${monster.mechanic.name}」が発動する。`, encounter, round);
      }
      if (monster.mechanicPhase === "exposed") pushLog(log, "weakness", `【攻撃の好機】${monster.name}は大技後に守りが崩れた！ このターンは行動せず、被ダメージ${monster.mechanic.exposedMultiplier}倍。`, encounter, round);
    });
  }

  function unleashBurst(random, monster, heroes, log, encounter, round) {
    if (!living(heroes).length) return;
    monster.mechanicReport.bursts++;
    remember(monster.observation.burstRounds, round);
    pushLog(log, "burst", `【全体大技】ターン終了時、${monster.name}の「${monster.mechanic.name}」！`, encounter, round);
    if (monster.observation.burstRounds.length >= 2) {
      const rounds = monster.observation.burstRounds, interval = rounds[rounds.length - 1] - rounds[rounds.length - 2];
      pushLog(log, "system", `【周期観測】${monster.name}の「${monster.mechanic.name}」は${interval}ターン間隔で再び発動した。`, encounter, round);
    }
    living(heroes).forEach(hero => {
      if (monster.currentHp <= 0) return;
      const amplifier = monster.mechanic.statusAmplifier;
      const amplified = amplifier && hero.statuses?.[amplifier.statusId];
      const multiplier = monster.mechanic.multiplier * (amplified ? amplifier.multiplier : 1);
      const hit = dealDamage(random, monster, hero, { multiplier, noCritical: true, telegraphed: true, damageType: "magic" });
      monster.mechanicReport[hit.guarded ? "guardedHits" : "unguardedHits"]++;
      monster.mechanicReport.burstDamage += hit.actualDamage;
      if (hit.defeated) monster.mechanicReport.burstKnockouts++;
      const amplificationText = amplified ? `【${window.GameData.statusEffects[amplifier.statusId]?.name || "状態異常"}共鳴・威力${amplifier.multiplier}倍】` : "";
      pushLog(log, "enemy", `${amplificationText}${hitText(monster, hero, hit, monster.mechanic.name)}`, encounter, round);
      window.SkillCombat.afterDamage(random, monster, hero, hit, dealDamage, log, encounter, round);
    });
  }

  function defeatFacts(heroes, report, failure, strategyReport) {
    const facts = [failure.timedOut ? `第${failure.encounter}戦は30ターン終了時にも敵が残っていた。` : `第${failure.encounter}戦「${failure.name}」で全員が戦闘不能になった。`];
    if (report.bursts) facts.push(`全体大技を${report.bursts}回受け、合計${report.burstDamage}ダメージ、延べ${report.burstKnockouts}人が戦闘不能になった。防御で軽減した命中は${report.guardedHits}回、軽減なしは${report.unguardedHits}回。`);
    else if (strategyReport.rearHits) facts.push(`後列狙いを${strategyReport.rearHits}回受け、合計${strategyReport.rearDamage}ダメージ、${strategyReport.rearKnockouts}人が戦闘不能になった。`);
    const damage = heroes.reduce((sum, hero) => sum + hero.metrics.damageTaken, 0);
    const healed = heroes.reduce((sum, hero) => sum + hero.metrics.healingDone, 0);
    facts.push(`探索隊の総被ダメージは${damage}、戦闘中の総回復量は${healed}だった。`);
    return facts.slice(0, 3);
  }

  function resolve(expedition, dungeon) {
    const timeMultiplier = expedition.timeMultiplier || 1;
    const acquisitionApi = window.AcquisitionSkills || {
      normalize: () => ({ gold: { multiplier: 1, flat: 0 }, experience: { party: { multiplier: 1, flat: 0 }, members: {} }, qualityRate: { multiplier: 1, flat: 0 }, itemRate: { multiplier: 1, flat: 0 }, explorationTime: { multiplier: 1, flat: 0 } }),
      chance: (base) => base,
      amount: base => base,
      partyExperience: base => base
    };
    const acquisition = acquisitionApi.normalize(expedition.acquisitionBonuses);
    const journey = window.Exploration.journey(dungeon, timeMultiplier, expedition.seed, acquisition.itemRate);
    dungeon = window.Exploration.plan(dungeon, timeMultiplier);
    dungeon.itemRateModifier = acquisition.itemRate;
    const itemChance = base => acquisitionApi.chance(base, acquisition.itemRate);
    const random = seededRandom(expedition.seed);
    const materialRandom = seededRandom(expedition.seed + 700001);
    const equipmentRandom = seededRandom(expedition.seed + 1700003);
    const signatureRandom = seededRandom(expedition.seed + 2700011);
    const materialLoot = new Map();
    const monsterEquipmentLoot = [];
    const monsterCounts = {};
    const monsterEncounters = {};
    const monsterObservations = {};
    const heroes = makeParty(expedition);
    heroes.forEach(hero => { hero.metrics = { damageDealt: 0, damageTaken: 0, healingDone: 0, criticalHits: 0, attackAttempts: 0, attackHits: 0, statusDamageDealt: 0 }; });
    const log = [];
    const strategyReport = { areaHits: 0, penetrationHits: 0, magicWeaknessHits: 0, magicWeaknessDamage: 0, rearHits: 0, rearDamage: 0, rearKnockouts: 0, elementWeaknessHits: 0, statusInflicted: 0, statusResisted: 0, statusDamage: 0 };
    heroes.forEach(hero => { hero.strategyReport = strategyReport; });
    let encountersCleared = 0;
    let monstersDefeated = 0;
    let explorationGold = 0;
    const explorationDrops = [];
    const defeatedBosses = new Set();
    const mechanicReport = { warnings: 0, bursts: 0, guardedHits: 0, unguardedHits: 0, burstDamage: 0, burstKnockouts: 0, weaknessHits: 0 };
    let failure = null;
    pushLog(log, "system", `${dungeon.name}の探索を開始。`, 0, 0);
    heroes.forEach((hero) => {
      if (hero.equipmentSkillIds.length) pushLog(log, "system", `${hero.name}の装備スキル：${hero.equipmentSkillIds.map(id => window.GameData.equipmentSkills[id]?.name).filter(Boolean).join("、")}`, 0, 0);
      (hero.specialEquipment || []).forEach(id => {
        const item = (window.GameData.items || {})[id];
        if (item) pushLog(log, "system", `${hero.name}の固有效果【${item.name}】：${item.effectDescription}`, 0, 0);
      });
      pushLog(log, "system", `${hero.name}の行動率：攻撃${hero.actionRates.attack}%・技${hero.actionRates.technique}%・呪文${hero.actionRates.spell}%・回復${hero.actionRates.healing}%`, 0, 0);
      const job = window.GameData.jobs && window.GameData.jobs[hero.jobId];
      pushLog(log, "formation", `${hero.formationSize > 3 ? window.Party.positionName(hero.position, hero.formationSize) : positionName(hero.position)}：${hero.name}（${job ? job.name : "冒険者"}・${hero.weaponRange === "mixed" ? "近接・遠距離併用" : hero.weaponRange === "ranged" ? "遠距離" : "近接"}・攻撃${hero.attackCount}回・命中精度${Math.round(hero.hitRate * 100)}%・隊列補正${Math.round(formationMultiplier(hero) * 100)}%）`, 0, 0);
    });
    for (let index = 0; index < dungeon.encounters.length; index += 1) {
      const encounter = dungeon.encounters[index];
      const floor = journey[index];
      floor.entries.forEach(entry => pushLog(log, entry.kind, entry.text, index + 1, 0, entry));
      explorationGold += floor.gold;
      if (floor.drop) explorationDrops.push(floor.drop);
      const groupIds = encounter.groups[Math.floor(random() * encounter.groups.length)];
      groupIds.forEach(id => { monsterEncounters[id] = (monsterEncounters[id] || 0) + 1; });
      const monsters = makeMonsters(groupIds, dungeon);
      monsters.forEach(monster => { monster.strategyReport = strategyReport; });
      const fight = fightEncounter(random, heroes, monsters, index + 1, encounter.name, log);
      const cleared = fight.cleared;
      monsters.forEach(monster => {
        if (monster.mechanicReport) Object.keys(mechanicReport).forEach(key => { mechanicReport[key] += monster.mechanicReport[key]; });
        monsterObservations[monster.id] = mergeObservation(monsterObservations[monster.id] || blankObservation(), monster.observation);
      });
      monstersDefeated += monsters.filter((monster) => monster.currentHp === 0).length;
      monsters.filter(monster => monster.currentHp === 0).forEach(monster => {
        monsterCounts[monster.id] = (monsterCounts[monster.id] || 0) + 1;
        (monster.materialDrops || []).forEach(drop => {
          if (materialRandom() >= itemChance(drop.chance * (dungeon.materialRates ? dungeon.materialRates[drop.itemId] : 1))) return;
          const quantity = integer(materialRandom, drop.quantity);
          materialLoot.set(drop.itemId, (materialLoot.get(drop.itemId) || 0) + quantity);
          remember(monsterObservations[monster.id].drops, drop.itemId);
          const item = (window.GameData.items || {})[drop.itemId];
          pushLog(log, "system", `【素材ドロップ】${monster.name}から${item ? item.name : drop.itemId}×${quantity}を獲得。`, index + 1, 0);
        });
        const equipmentDrop = window.MonsterLoot ? window.MonsterLoot.roll(equipmentRandom, dungeon, monster) : null;
        if (equipmentDrop) {
          monsterEquipmentLoot.push(equipmentDrop);
          remember(monsterObservations[monster.id].drops, equipmentDrop.itemId);
          const item = window.GameData.items[equipmentDrop.itemId];
          pushLog(log, "system", `【装備ドロップ】${monster.name}が「${item ? item.name : equipmentDrop.itemId}」を落とした！`, index + 1, 0);
        }
        const signatureTiers = monster.signatureDropTiers || (monster.signatureDrops ? [{ difficultyId: "normal", drops: monster.signatureDrops }] : []);
        signatureTiers.forEach(entry => {
          const signature = entry.drops;
          (signature?.materials || []).forEach(drop => {
            if (signatureRandom() >= itemChance(drop.chance * (dungeon.equipmentDropRate || 1))) return;
            const quantity = integer(signatureRandom, drop.quantity);
            materialLoot.set(drop.itemId, (materialLoot.get(drop.itemId) || 0) + quantity);
            remember(monsterObservations[monster.id].drops, drop.itemId);
            const item = window.GameData.items[drop.itemId];
            pushLog(log, "system", `【${entry.difficultyId === "normal" ? "固有素材" : window.DungeonDifficulty.tier(entry.difficultyId).name + "固有素材"}】${monster.name}から${item ? item.name : drop.itemId}×${quantity}を獲得。`, index + 1, 0);
          });
          if (signature?.equipment && signatureRandom() < itemChance(signature.equipment.chance * (dungeon.equipmentDropRate || 1))) {
            monsterEquipmentLoot.push({ itemId: signature.equipment.itemId, quantity: integer(signatureRandom, signature.equipment.quantity) });
            remember(monsterObservations[monster.id].drops, signature.equipment.itemId);
            const item = window.GameData.items[signature.equipment.itemId];
            pushLog(log, "system", `【${entry.difficultyId === "normal" ? "固有装備" : window.DungeonDifficulty.tier(entry.difficultyId).name + "固有装備"}】${monster.name}から「${item ? item.name : signature.equipment.itemId}」を獲得！`, index + 1, 0);
          }
        });
      });
      monsters.filter(monster => monster.boss && monster.currentHp === 0).forEach(monster => defeatedBosses.add(monster.id));
      if (!cleared) { failure = { encounter: index + 1, name: encounter.name, timedOut: fight.timedOut }; break; }
      encountersCleared += 1;
      if (index < dungeon.encounters.length - 1) {
        const recovered = [];
        living(heroes).forEach((hero) => {
          const amount = Math.max(1, Math.round(hero.hp * 0.12));
          const actual = Math.min(amount, hero.hp - hero.currentHp);
          hero.currentHp += actual;
          if (actual > 0) recovered.push(`${hero.name} +${actual}`);
        });
        if (recovered.length) pushLog(log, "recovery", `小休止でHPを回復：${recovered.join("、")}`, index + 1, 0);
        pushLog(log, "stairs", `${floor.level}の奥で次へ続く道を発見した。隊列を整えて先へ進む。`, index + 1, 0);
      }
    }
    const success = encountersCleared === dungeon.encounters.length;
    const progress = encountersCleared / dungeon.encounters.length;
    const rewardMultiplier = success ? 1 : 0.15 + progress * 0.2;
    const baseGold = Math.floor(integer(random, dungeon.rewards.gold) * rewardMultiplier * (dungeon.rewardScale || 1)) + explorationGold;
    const baseExp = Math.max(3, Math.floor(integer(random, dungeon.rewards.exp) * rewardMultiplier * (dungeon.rewardScale || 1)));
    const gold = acquisitionApi.amount(baseGold, acquisition.gold);
    const exp = acquisitionApi.partyExperience(baseExp, acquisition);
    const drops = [...Array.from(materialLoot, ([itemId, quantity]) => ({ itemId, quantity })), ...monsterEquipmentLoot, ...explorationDrops];
    if (success) {
      defeatedBosses.forEach(id => {
        const drop = window.GameData.monsters[id].bossDrop;
        if (drop && random() < itemChance(drop.chance)) {
          drops.push({ itemId: drop.itemId, quantity: 1 });
          remember(monsterObservations[id].drops, drop.itemId);
          const item = (window.GameData.items || {})[drop.itemId];
          pushLog(log, "system", `【ボス固有装備】${item ? item.name : drop.itemId}を発見！`, dungeon.encounters.length, 0);
        }
      });
      pushLog(log, "system", `全${dungeon.encounters.length}戦を突破し、探索に成功した！`, dungeon.encounters.length, 0);
    }
    const facts = success ? [] : defeatFacts(heroes, mechanicReport, failure, strategyReport);
    return {
      success, gold, exp, drops, battleLog: log, mechanicReport, monsterCounts, monsterEncounters, monsterObservations,
      strategyReport,
      defeatFacts: facts,
      encountersCleared, totalEncounters: dungeon.encounters.length, monstersDefeated,
      memberReports: heroes.map(hero => Object.assign({ id: hero.id, name: hero.name, jobId: hero.jobId, actionRates: Object.assign({}, hero.actionRates), remainingHp: hero.currentHp, maxHp: hero.hp }, hero.metrics)),
      survivors: heroes.filter((hero) => hero.currentHp > 0).map((hero) => ({ name: hero.name, hp: hero.currentHp, maxHp: hero.hp }))
    };
  }

  window.Battle = { formationMultiplier, attackAccuracyMultiplier, attackDamageMultiplier, chooseHeroAction, resolve };
})();
