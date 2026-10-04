(function () {
  "use strict";

  function seededRandom(seed) {
    return window.GameRuntime.seededRandom(seed);
  }

  function equipmentList() { return window.GameState.data.inventory.equipment; }
  function materials() { return window.GameState.data.inventory.materials; }
  function template(templateId) {
    const source = window.GameData.items[templateId];
    const combatStats = window.GameData.derived?.itemCombatStats?.[templateId];
    return source && combatStats ? { ...source, ...combatStats } : source;
  }
  function getInstance(instanceId) { return equipmentList().find((instance) => instance.id === instanceId); }
  function quality(instance) { return window.GameData.qualities[instance.qualityId] || window.GameData.qualities.standard; }

  function qualityDescription(instanceOrId) {
    const grade = typeof instanceOrId === "string"
      ? window.GameData.qualities[instanceOrId] || window.GameData.qualities.standard
      : quality(instanceOrId || { qualityId: "standard" });
    const number = value => Number(value).toLocaleString("ja-JP", { maximumFractionDigits: 1 });
    const weight = grade.weightMultiplier === 1 ? "" : `・重量×${number(grade.weightMultiplier)}`;
    return `品質：${grade.prefix || "標準"}（性能×${number(grade.statMultiplier)}${weight}）`;
  }

  function qualityCompact(instanceOrId) {
    const grade = typeof instanceOrId === "string"
      ? window.GameData.qualities[instanceOrId] || window.GameData.qualities.standard
      : quality(instanceOrId || { qualityId: "standard" });
    const number = value => Number(value).toLocaleString("ja-JP", { maximumFractionDigits: 1 });
    const weight = grade.weightMultiplier === 1 ? "" : `・重×${number(grade.weightMultiplier)}`;
    return `${grade.prefix || "標準"} ×${number(grade.statMultiplier)}${weight}`;
  }

  function displayName(instance) {
    const base = template(instance.templateId);
    const grade = quality(instance);
    const ultra = window.EquipmentSkills.title(instance);
    return `${ultra ? `★${ultra.name} ` : ""}${grade.prefix}${base.name}${instance.upgradeLevel ? ` ＋${instance.upgradeLevel}` : ""}`;
  }

  function stackKey(instance) {
    const modifiers = Object.keys(instance.modifiers || {}).filter(key => Number(instance.modifiers[key]) !== 0).sort().map(key => [key, instance.modifiers[key]]);
    return JSON.stringify([instance.templateId, instance.qualityId, instance.upgradeLevel || 0, modifiers, instance.ultraRareTitleId || null]);
  }

  function groupEquipment(instances) {
    const groups = new Map();
    (instances || []).forEach(instance => {
      const key = stackKey(instance);
      if (!groups.has(key)) groups.set(key, { key, instances: [], representative: instance });
      groups.get(key).instances.push(instance);
    });
    return Array.from(groups.values());
  }

  const scalablePerformanceStats = new Set(["hp", "attack", "defense", "magicAttack", "magicDefense", "magicHealing", "speed"]);

  function equipmentTypeId(base) { return base.type === "weapon" ? base.weaponType : base.armorType; }

  function performanceScore(base) {
    const weights = window.GameData.config.equipmentBalance?.scoreWeights?.[equipmentTypeId(base)] || {};
    return Object.entries(weights).reduce((total, [stat, weight]) => {
      const value = stat === "attackCount" ? Math.max(0, Number(base[stat]) || 0) : Number(base[stat]) || 0;
      return total + value * weight;
    }, 0);
  }

  function referenceEfficiency(base) {
    const typeId = equipmentTypeId(base);
    return Number(window.GameData.config.equipmentBalance?.referenceEfficiency?.[typeId]) || performanceScore(base) / Math.max(.1, Number(base.weight) || 0);
  }

  function standardTierFloors(typeId) {
    const growth = Number(window.GameData.config.equipmentBalance?.efficiencyGrowthPerTier) || 0;
    const entries = (window.GameData.config.shop?.standardTiers || []).slice().sort((a, b) => a.tier - b.tier);
    const floors = new Map();
    let previousAchieved = 0;
    entries.forEach(entry => {
      const itemId = entry.itemIds.find(id => equipmentTypeId(window.GameData.items[id] || {}) === typeId);
      const item = template(itemId);
      if (!item?.weight) return;
      const raw = performanceScore(item) / item.weight;
      const floor = previousAchieved
        ? Math.max(raw, previousAchieved * (1 + growth))
        : Math.max(raw, referenceEfficiency(item));
      floors.set(entry.tier, floor);

      // 実ステータスは整数へ切り上げるため、次Tierは理論下限ではなく
      // 実際に到達する重量効率を基準にする。丸めによる逆転も残さない。
      const multiplier = multiplierForFloor(item, floor);
      const balanced = { ...item };
      scalablePerformanceStats.forEach(stat => { balanced[stat] = balancedBaseValue(item, stat, multiplier); });
      previousAchieved = performanceScore(balanced) / item.weight;
    });
    return floors;
  }

  function performanceFloor(base) {
    base = base?.id ? template(base.id) || base : base;
    const growth = Number(window.GameData.config.equipmentBalance?.efficiencyGrowthPerTier) || 0;
    const tier = Math.max(1, Number(base.tier) || 1);
    const typeId = equipmentTypeId(base);
    const standardEntry = (window.GameData.config.shop?.standardTiers || []).find(entry => entry.tier === tier);
    const standardItemId = standardEntry?.itemIds.find(id => equipmentTypeId(window.GameData.items[id] || {}) === typeId);
    if (standardItemId === base.id) return standardTierFloors(typeId).get(tier) || referenceEfficiency(base);

    // 製作品・固有品は技能や特殊効果も価値の一部なので、汎用品と同じ曲線へ
    // 一律に揃えず、Tier 1基準から緩やかに伸びる最低保証だけを適用する。
    return referenceEfficiency(base) * (1 + (tier - 1) * growth);
  }

  function multiplierForFloor(base, floor) {
    const weights = window.GameData.config.equipmentBalance?.scoreWeights?.[equipmentTypeId(base)] || {};
    let scalable = 0, fixed = 0;
    Object.entries(weights).forEach(([stat, weight]) => {
      const value = stat === "attackCount" ? Math.max(0, Number(base[stat]) || 0) : Number(base[stat]) || 0;
      if (scalablePerformanceStats.has(stat)) scalable += value * weight;
      else fixed += value * weight;
    });
    if (scalable <= 0) return 1;
    const targetScore = floor * base.weight;
    return Math.max(1, (targetScore - fixed) / scalable);
  }

  function tierEfficiencyMultiplier(baseOrId) {
    const base = typeof baseOrId === "string" ? template(baseOrId) : (baseOrId?.id ? template(baseOrId.id) || baseOrId : baseOrId);
    if (!base || !["weapon", "armor"].includes(base.type) || !base.weight) return 1;
    return multiplierForFloor(base, performanceFloor(base));
  }

  function balancedBaseValue(base, stat, multiplier) {
    const value = Number(base[stat]) || 0;
    const weight = window.GameData.config.equipmentBalance?.scoreWeights?.[equipmentTypeId(base)]?.[stat] || 0;
    return multiplier > 1 && weight > 0 && scalablePerformanceStats.has(stat) ? Math.ceil(value * multiplier) : value;
  }

  function effects(instance) {
    const base = template(instance.templateId);
    const grade = quality(instance);
    const modifiers = instance.modifiers || {};
    const roundedWeight = Math.round(base.weight * grade.weightMultiplier * 10) / 10;
    const ultraMultiplier = window.EquipmentSkills.title(instance) ? window.GameData.config.ultraRare.statMultiplier : 1;
    const upgrade = (window.GameData.config.upgrades?.bonus || {})[base.type] || {};
    const level = instance.upgradeLevel || 0;
    const efficiencyMultiplier = tierEfficiencyMultiplier(base);
    const balanced = stat => balancedBaseValue(base, stat, efficiencyMultiplier);
    return {
      hp: Math.round((Math.round(balanced("hp") * grade.statMultiplier) + (modifiers.hp || 0) + level * (upgrade.hp || 0)) * ultraMultiplier),
      attack: Math.round((Math.round(balanced("attack") * grade.statMultiplier) + (modifiers.attack || 0) + (base.weaponType === "staff" ? 0 : level * (upgrade.attack || 0))) * ultraMultiplier),
      defense: Math.round((Math.round(balanced("defense") * grade.statMultiplier) + (modifiers.defense || 0) + level * (upgrade.defense || 0) + (base.specialEffects || []).filter(effect => effect.kind === "weight_defense").reduce((sum, effect) => sum + Math.floor(roundedWeight * effect.multiplier), 0)) * ultraMultiplier),
      weight: roundedWeight,
      magicAttack: Math.round((Math.round(balanced("magicAttack") * grade.statMultiplier) + (modifiers.magicAttack || 0) + (base.weaponType === "staff" ? level * 2 : 0)) * ultraMultiplier),
      magicDefense: Math.round((Math.round(balanced("magicDefense") * grade.statMultiplier) + (modifiers.magicDefense || 0) + (base.type === "armor" ? level * 2 : 0)) * ultraMultiplier),
      magicHealing: Math.round((Math.round(balanced("magicHealing") * grade.statMultiplier) + (modifiers.magicHealing || 0) + (base.weaponType === "staff" ? level * 2 : 0)) * ultraMultiplier),
      hitRate: ((base.hitRate || 0) * grade.statMultiplier + (modifiers.hitRate || 0) / 100) * ultraMultiplier,
      evasionRate: ((base.evasionRate || 0) * grade.statMultiplier + (modifiers.evasionRate || 0) / 100) * ultraMultiplier,
      speed: Math.round((Math.round(balanced("speed") * grade.statMultiplier) + (modifiers.speed || 0)) * ultraMultiplier),
      attackCount: ((base.attackCount || 0) + (modifiers.attackCount || 0)) * ultraMultiplier
    };
  }

  function standardEffects(templateId) {
    return effects({ templateId, qualityId: "standard", modifiers: {}, upgradeLevel: 0 });
  }

  function performancePerWeight(itemOrTemplate, effectOverride) {
    const base = itemOrTemplate?.templateId
      ? template(itemOrTemplate.templateId)
      : itemOrTemplate?.id ? template(itemOrTemplate.id) || itemOrTemplate : itemOrTemplate;
    if (!base || !["weapon", "armor"].includes(base.type)) return 0;
    const effect = effectOverride || (itemOrTemplate.templateId ? effects(itemOrTemplate) : standardEffects(base.id));
    return performanceScore({ ...base, ...effect }) / Math.max(.1, Number(effect.weight) || 0);
  }

  function pickWeighted(random, table) {
    const total = table.reduce((sum, entry) => sum + entry[1], 0);
    let roll = random() * total;
    for (const entry of table) {
      roll -= entry[1];
      if (roll <= 0) return entry[0];
    }
    return table[table.length - 1][0];
  }

  function qualityTable(source, multiplier = 1) {
    const table = window.GameData.config.qualityTables[source] || window.GameData.config.qualityTables.drop;
    const scale = Math.max(0, Number.isFinite(multiplier) ? multiplier : 1);
    return table.map(([id, weight]) => [id, window.GameData.qualities[id]?.qualityBand === "high" ? weight * scale : weight]);
  }

  function rollModifiers(random, base, grade) {
    const count = Math.floor(grade.affixes[0] + random() * (grade.affixes[1] - grade.affixes[0] + 1));
    const config = window.GameData.config.affixes;
    const available = config ? Object.keys(config.labels) : ["attack", "defense", "hp"];
    const weights = config ? config.profiles[base.weaponType || base.armorType] || {} : {};
    const modifiers = { hp: 0, attack: 0, defense: 0 };
    for (let index = 0; index < count && available.length; index += 1) {
      const selected = pickWeighted(random, available.map(key => [key, weights[key] || 1]));
      const selectedIndex = available.indexOf(selected);
      const stat = available.splice(selectedIndex, 1)[0];
      if (stat === "hp") modifiers.hp = Math.floor(4 + random() * (5 + base.tier * 5));
      if (stat === "attack") modifiers.attack = Math.floor(1 + random() * (2 + base.tier));
      if (stat === "defense") modifiers.defense = Math.floor(1 + random() * (2 + base.tier));
      if (["magicAttack", "magicDefense", "magicHealing"].includes(stat)) modifiers[stat] = Math.floor(1 + random() * (2 + base.tier));
      if (["hitRate", "evasionRate"].includes(stat)) modifiers[stat] = Math.floor(1 + random() * Math.min(6, 2 + base.tier));
      if (stat === "speed") modifiers.speed = Math.floor(1 + random() * (1 + Math.ceil(base.tier / 2)));
      if (stat === "attackCount") modifiers.attackCount = 1;
    }
    return modifiers;
  }

  function rollInstance(templateId, options) {
    const base = template(templateId);
    if (!base || base.type === "material") return null;
    const settings = options || {};
    const random = settings.random || (settings.seed != null ? seededRandom(settings.seed) : window.GameRuntime.random);
    const source = settings.source || "drop";
    const qualityId = settings.qualityId || (base.unique ? "fine" : source === "shop"
      ? "standard"
      : pickWeighted(random, qualityTable(source, settings.qualityRateMultiplier)));
    const grade = window.GameData.qualities[qualityId];
    const ultraConfig = window.GameData.config.ultraRare || { dropChance: 0 };
    const ultraTitles = window.GameData.ultraRareTitles || {};
    let ultraRareTitleId = settings.ultraRareTitleId && ultraTitles[settings.ultraRareTitleId] ? settings.ultraRareTitleId : null;
    if (!ultraRareTitleId && source === "drop" && random() < ultraConfig.dropChance) {
      const titles = Object.keys(ultraTitles);
      ultraRareTitleId = titles[Math.floor(random() * titles.length)];
    }
    return {
      templateId,
      qualityId,
      ultraRareTitleId,
      upgradeLevel: 0,
      modifiers: Object.assign({}, settings.modifiers || rollModifiers(random, base, grade)),
      source
    };
  }

  function createInstance(templateId, options) {
    const draft = rollInstance(templateId, options);
    if (!draft) return null;
    const base = template(templateId), state = window.GameState.data;
    const instance = Object.assign({ id: `item-${state.meta.nextItemId++}` }, draft, {
      acquiredAt: window.GameRuntime.now(), locked: Boolean(base.unique || draft.ultraRareTitleId)
    });
    equipmentList().push(instance);
    return instance;
  }

  function add(itemId, quantity, options) {
    const base = template(itemId);
    if (!base) return { instances: [], autoSold: [], autoSellGold: 0, newBestQualityId: null, newUltraRareTitleIds: [] };
    if (window.Encyclopedia) window.Encyclopedia.recordItem(itemId, quantity);
    if (base.type === "material") {
      materials()[itemId] = (materials()[itemId] || 0) + quantity;
      return { instances: [], material: { itemId, quantity }, autoSold: [], autoSellGold: 0, newBestQualityId: null, newUltraRareTitleIds: [] };
    }
    const settings = options || {};
    const source = settings.source || "drop";
    const instances = [], autoSold = [], created = [];
    for (let index = 0; index < quantity; index += 1) {
      const instanceOptions = Object.assign({}, settings);
      if (settings.seed != null) instanceOptions.seed = Number(settings.seed) + index * 7919;
      const instance = createInstance(itemId, instanceOptions);
      created.push(instance);
      const rule = window.AutoSell?.matchingRule(instance, source);
      if (rule) {
        const value = sellValue(instance);
        removeInstance(instance.id);
        window.GameState.data.gold += value;
        autoSold.push({ itemId, displayName: displayName(instance), qualityId: instance.qualityId, value, ruleId: rule.id });
      } else instances.push(instance);
    }
    const bestInBatch = created.slice().sort((a, b) => quality(b).rank - quality(a).rank)[0];
    const improved = bestInBatch && window.Encyclopedia
      ? window.Encyclopedia.recordQuality(itemId, bestInBatch.qualityId)
      : false;
    const newUltraRareTitleIds = Array.from(new Set(created.map(instance => instance.ultraRareTitleId).filter(Boolean)))
      .filter(titleId => window.Encyclopedia?.recordUltraRareTitle(titleId));
    return { instances, autoSold, autoSellGold: autoSold.reduce((sum, entry) => sum + entry.value, 0), newBestQualityId: improved ? bestInBatch.qualityId : null, newUltraRareTitleIds };
  }

  function count(itemId) {
    const base = template(itemId);
    if (!base) return 0;
    if (base.type === "material") return materials()[itemId] || 0;
    return equipmentList().filter((instance) => instance.templateId === itemId).length;
  }

  function remove(itemId, quantity) {
    const base = template(itemId);
    if (!base || base.type !== "material" || count(itemId) < quantity) return false;
    materials()[itemId] -= quantity;
    if (materials()[itemId] <= 0) delete materials()[itemId];
    return true;
  }

  function equippedBy(instanceId) {
    return window.GameState.data.characters.find((character) => character.equipment.includes(instanceId)) || null;
  }

  function available(type) {
    return equipmentList().filter((instance) => {
      const base = template(instance.templateId);
      return (!type || base.type === type) && !equippedBy(instance.id);
    });
  }

  function canEquip(characterId, instanceId) {
    const character = window.Characters.get(characterId);
    const instance = getInstance(instanceId);
    if (!character || !instance) return { ok: false, message: "装備が見つかりません。" };
    const owner = equippedBy(instanceId);
    if (owner) return { ok: false, message: `${owner.name}が装備中です。` };
    const projected = Math.round((window.Characters.equipmentWeight(character) + effects(instance).weight) * 10) / 10;
    const capacity = window.Characters.maxWeight(character);
    if (projected > capacity + 0.001) return { ok: false, message: `重量超過です（${projected}/${capacity}）。` };
    return { ok: true, projected, capacity };
  }

  function equip(characterId, instanceId) {
    const check = canEquip(characterId, instanceId);
    if (!check.ok) return check;
    const character = window.Characters.get(characterId);
    const instance = getInstance(instanceId);
    character.equipment.push(instanceId);
    window.GameState.addLog(`${character.name}が${displayName(instance)}を装備しました。`, "info");
    window.GameState.save();
    return { ok: true, message: `${displayName(instance)}を装備しました。` };
  }

  function unequip(characterId, instanceId) {
    const character = window.Characters.get(characterId);
    const index = character ? character.equipment.indexOf(instanceId) : -1;
    if (index < 0) return { ok: false, message: "外せる装備がありません。" };
    character.equipment.splice(index, 1);
    window.GameState.save();
    return { ok: true, message: "装備を外しました。" };
  }

  function unequipAll(characterId) {
    const character = window.Characters.get(characterId);
    if (!character) return { ok: false, message: "冒険者が見つかりません。" };
    const count = character.equipment.length;
    if (!count) return { ok: false, message: "外せる装備がありません。" };
    character.equipment = [];
    window.GameState.addLog(`${character.name}が装備を${count}点すべて外しました。`, "info");
    window.GameState.save();
    return { ok: true, count, message: `${count}点の装備をすべて外しました。` };
  }

  function sellValue(instance) {
    const base = template(instance.templateId);
    const grade = quality(instance);
    const modifierValue = Object.values(instance.modifiers || {}).reduce((sum, value) => sum + value, 0);
    const ultraValue = window.EquipmentSkills.title(instance) ? window.GameData.config.ultraRare.saleMultiplier : 1;
    return Math.max(1, Math.round((base.price * 0.35 * grade.valueMultiplier * (1 + window.EquipmentSkills.ids(instance).length * .08) + modifierValue * 2) * ultraValue));
  }

  function removeInstance(instanceId) {
    const index = equipmentList().findIndex((instance) => instance.id === instanceId);
    if (index < 0) return null;
    return equipmentList().splice(index, 1)[0];
  }

  function sell(instanceId) {
    const instance = getInstance(instanceId);
    if (!instance) return { ok: false, message: "装備が見つかりません。" };
    if (instance.locked) return { ok: false, message: "ロック中の品は売却できません。先にロックを解除してください。" };
    if (equippedBy(instanceId)) return { ok: false, message: "装備中の品は売却できません。" };
    const value = sellValue(instance);
    const name = displayName(instance);
    removeInstance(instanceId);
    window.GameState.data.gold += value;
    window.GameState.addLog(`${name}を${value}Gで売却しました。`, "info");
    window.GameState.save();
    return { ok: true, message: `${name}を${value}Gで売却しました。` };
  }

  function salvageYield(instance) {
    const base = template(instance.templateId);
    const grade = quality(instance);
    const bonus = grade.id === "divine" ? 2 : grade.id === "fine" || grade.id === "hefty" ? 1 : 0;
    const result = [{ itemId: base.salvage.itemId, quantity: base.salvage.quantity + bonus }];
    if (grade.id === "divine") result.push({ itemId: "magic_stone", quantity: 1 });
    return result;
  }

  function dismantle(instanceId) {
    const instance = getInstance(instanceId);
    if (!instance) return { ok: false, message: "装備が見つかりません。" };
    if (instance.locked) return { ok: false, message: "ロック中の品は分解できません。先にロックを解除してください。" };
    if (equippedBy(instanceId)) return { ok: false, message: "装備中の品は分解できません。" };
    const yields = salvageYield(instance);
    const name = displayName(instance);
    removeInstance(instanceId);
    yields.forEach((entry) => add(entry.itemId, entry.quantity));
    const summary = yields.map((entry) => `${template(entry.itemId).name}×${entry.quantity}`).join("、");
    window.GameState.addLog(`${name}を分解し、${summary}を得ました。`, "info");
    window.GameState.save();
    return { ok: true, message: `${summary}を獲得しました。`, yields };
  }

  function setLocked(instanceId, locked) {
    const instance = getInstance(instanceId);
    if (!instance || typeof locked !== "boolean") return { ok: false, message: "装備またはロック設定が正しくありません。" };
    const before = Boolean(instance.locked);
    instance.locked = locked;
    try { window.GameState.save(); }
    catch (error) { instance.locked = before; return { ok: false, message: "ロック設定を保存できませんでした。" }; }
    return { ok: true, message: locked ? "装備をロックしました。" : "ロックを解除しました。" };
  }

  function queryEquipment(options) {
    const settings = options || {};
    const owners = new Set(window.GameState.data.characters.flatMap(character => character.equipment));
    const list = equipmentList().filter(instance => {
      const base = template(instance.templateId);
      const kind = settings.kind || "all";
      const matchesKind = kind === "all" || (kind === "unique" && base.unique) || base.type === kind || `${base.type}:${base.weaponType || base.armorType}` === kind;
      const setFilter = settings.set || "all";
      const equipmentSets = window.EquipmentSkills?.setsForTemplate(instance.templateId) || [];
      const matchesSet = setFilter === "all" || (setFilter === "any" ? equipmentSets.length > 0 : equipmentSets.some(definition => definition.id === setFilter));
      const equipped = owners.has(instance.id);
      return matchesKind && matchesSet && (!settings.quality || settings.quality === "all" || instance.qualityId === settings.quality)
        && (!settings.equipped || settings.equipped === "all" || (settings.equipped === "equipped" ? equipped : !equipped))
        && (!settings.lock || settings.lock === "all" || (settings.lock === "locked" ? Boolean(instance.locked) : !instance.locked));
    });
    const sort = settings.sort || "newest";
    const value = instance => {
      if (["attack", "defense", "hp", "weight"].includes(sort)) return effects(instance)[sort];
      if (sort === "quality") return quality(instance).rank || 0;
      if (sort === "value") return sellValue(instance);
      return instance.acquiredAt || 0;
    };
    return list.sort((a, b) => {
      const compared = sort === "name" ? displayName(a).localeCompare(displayName(b), "ja") : (value(a) - value(b)) * (["weight", "oldest"].includes(sort) ? 1 : -1);
      return compared || Number(b.id.split("-")[1]) - Number(a.id.split("-")[1]);
    });
  }

  window.Items = {
    count, add, remove, rollInstance, createInstance, getInstance, equipmentList, available,
    template, quality, qualityDescription, qualityCompact, qualityTable, effects, standardEffects, performanceScore, performanceFloor, performancePerWeight, tierEfficiencyMultiplier, displayName, equippedBy, canEquip, equip, unequip, unequipAll,
    sellValue, sell, salvageYield, dismantle, setLocked, queryEquipment,
    stackKey, groupEquipment
  };
})();
