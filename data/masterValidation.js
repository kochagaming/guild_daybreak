(function () {
  "use strict";
  const data = window.GameData;
  data.registry.validator("references", master => {
    const errors = [];
    const has = (table, id) => id != null && Object.prototype.hasOwnProperty.call(table || {}, id);
    const requireRef = (table, id, source) => {
      if (!has(table, id)) errors.push(`${source} -> ${id ?? "(未指定)"}`);
    };
    const chapters = Object.fromEntries(master.storyChapters.map(chapter => [chapter.id, chapter]));

    const itemTypes = new Set(["weapon", "armor", "material"]);
    const itemCombatFields = ["hp", "attack", "defense", "magicAttack", "magicDefense", "magicHealing", "hitRate", "evasionRate", "speed", "criticalRate", "attackCount"];
    const itemSpecialEffectKinds = new Set(["critical_followup", "weight_defense", "healing_boost"]);
    Object.entries(master.items).forEach(([itemId, item]) => {
      const source = `items.${itemId}`;
      if (item.id !== itemId) errors.push(`${source}.id は登録IDと一致させてください`);
      ["name", "icon"].forEach(field => {
        if (typeof item[field] !== "string" || !item[field].trim()) errors.push(`${source}.${field} がありません`);
      });
      if (!itemTypes.has(item.type)) errors.push(`${source}.type -> ${item.type ?? "(未指定)"}`);
      if (!Number.isFinite(Number(item.price)) || Number(item.price) < 0) errors.push(`${source}.price は0以上の数で指定してください`);

      const equipment = item.type === "weapon" || item.type === "armor";
      if (!equipment) return;
      const typeId = item.weaponType || item.armorType;
      requireRef(master.equipmentTypes, typeId, `${source}.equipmentType`);
      if (master.equipmentTypes[typeId]?.category !== item.type) errors.push(`${source}.equipmentType は${item.type}種別ではありません`);
      if (item.type === "weapon" && !["melee", "ranged"].includes(item.range)) errors.push(`${source}.range はmeleeまたはrangedで指定してください`);
      if (item.type === "armor" && item.range != null) errors.push(`${source}.range は防具へ設定できません`);
      if (!Number.isInteger(item.tier) || item.tier < 1) errors.push(`${source}.tier は1以上の整数で指定してください`);
      if (!Number.isFinite(Number(item.weight)) || Number(item.weight) <= 0) errors.push(`${source}.weight は0より大きい数で指定してください`);
      itemCombatFields.forEach(field => {
        if (item[field] != null && !Number.isFinite(Number(item[field]))) errors.push(`${source}.${field} が不正です`);
      });
      if (item.attackCount != null && !Number.isInteger(item.attackCount)) errors.push(`${source}.attackCount は整数で指定してください`);
      ["craftOnly", "dropOnly", "unique"].forEach(field => {
        if (item[field] != null && typeof item[field] !== "boolean") errors.push(`${source}.${field} は真偽値で指定してください`);
      });

      requireRef(master.items, item.salvage?.itemId, `${source}.salvage.itemId`);
      if (master.items[item.salvage?.itemId] && master.items[item.salvage.itemId].type !== "material") errors.push(`${source}.salvage.itemId は素材を指定してください`);
      if (!Number.isInteger(item.salvage?.quantity) || item.salvage.quantity < 1) errors.push(`${source}.salvage.quantity は1以上の整数で指定してください`);

      if (item.specialEffects != null && (!Array.isArray(item.specialEffects) || !item.specialEffects.length)) errors.push(`${source}.specialEffects は空でない配列で指定してください`);
      (item.specialEffects || []).forEach((effect, index) => {
        const effectSource = `${source}.specialEffects.${index}`;
        if (!itemSpecialEffectKinds.has(effect.kind)) errors.push(`${effectSource}.kind -> ${effect.kind ?? "(未指定)"}`);
        if (!Number.isFinite(Number(effect.multiplier)) || Number(effect.multiplier) <= 0) errors.push(`${effectSource}.multiplier は0より大きい数で指定してください`);
        if (effect.name != null && (typeof effect.name !== "string" || !effect.name.trim())) errors.push(`${effectSource}.name が不正です`);
      });
      if (item.specialEffects?.length && (typeof item.effectDescription !== "string" || !item.effectDescription.trim())) errors.push(`${source}.effectDescription がありません`);

      const grants = master.relations.itemSkillGrants[item.id];
      if (!Array.isArray(grants) || !grants.length) errors.push(`relations.itemSkillGrants.${item.id} がありません`);
      else {
        const usedSkillIds = new Set();
        grants.forEach(skillId => {
          requireRef(master.equipmentSkills, skillId, `relations.itemSkillGrants.${item.id}`);
          if (usedSkillIds.has(skillId)) errors.push(`relations.itemSkillGrants.${item.id} -> ${skillId} が重複しています`);
          usedSkillIds.add(skillId);
        });
      }
    });
    Object.keys(master.relations.itemSkillGrants).forEach(itemId => {
      requireRef(master.items, itemId, `relations.itemSkillGrants.${itemId}`);
      if (master.items[itemId] && !["weapon", "armor"].includes(master.items[itemId].type)) errors.push(`relations.itemSkillGrants.${itemId} は装備以外へ設定できません`);
    });
    const equipmentMultiplierStats = new Set(["hp", "attack", "defense", "magicAttack", "magicDefense", "magicHealing"]);
    const equipmentBonusStats = new Set(["hitRate", "evasionRate", "speed", "attackCount", "criticalRate"]);
    const equipmentEffectTypes = new Set(["multiplier", "bonus", "conversion", "power", "healingPower", "slayer", "statusResistance"]);
    Object.values(master.equipmentSkills).forEach(skill => {
      const source = `equipmentSkills.${skill.id}`;
      ["name", "description"].forEach(field => {
        if (typeof skill[field] !== "string" || !skill[field].trim()) errors.push(`${source}.${field} がありません`);
      });
      if (!Array.isArray(skill.effects) || !skill.effects.length) errors.push(`${source}.effects がありません`);
      (skill.effects || []).forEach((effect, index) => {
        const effectSource = `${source}.effects.${index}`;
        if (!equipmentEffectTypes.has(effect.type)) {
          errors.push(`${effectSource}.type -> ${effect.type ?? "(未指定)"}`);
          return;
        }
        if (effect.type === "multiplier") {
          if (!equipmentMultiplierStats.has(effect.stat)) errors.push(`${effectSource}.stat -> ${effect.stat ?? "(未指定)"}`);
          if (!Number.isFinite(Number(effect.value)) || Number(effect.value) <= 0) errors.push(`${effectSource}.value は0より大きい数で指定してください`);
        } else if (effect.type === "bonus") {
          if (!equipmentBonusStats.has(effect.stat)) errors.push(`${effectSource}.stat -> ${effect.stat ?? "(未指定)"}`);
          if (!Number.isFinite(Number(effect.value))) errors.push(`${effectSource}.value が不正です`);
          if (effect.stat === "attackCount" && !Number.isInteger(effect.value)) errors.push(`${effectSource}.value は攻撃回数では整数で指定してください`);
        } else if (effect.type === "conversion") {
          if (!equipmentMultiplierStats.has(effect.source)) errors.push(`${effectSource}.source -> ${effect.source ?? "(未指定)"}`);
          if (!equipmentMultiplierStats.has(effect.target)) errors.push(`${effectSource}.target -> ${effect.target ?? "(未指定)"}`);
          if (effect.source === effect.target) errors.push(`${effectSource} は同じ能力へ変換できません`);
          if (!Number.isFinite(Number(effect.value)) || Number(effect.value) <= 0) errors.push(`${effectSource}.value は0より大きい数で指定してください`);
        } else if (effect.type === "power") {
          if (!["physical", "magic"].includes(effect.damageType)) errors.push(`${effectSource}.damageType -> ${effect.damageType ?? "(未指定)"}`);
          if (!Number.isFinite(Number(effect.value)) || Number(effect.value) <= 0) errors.push(`${effectSource}.value は0より大きい数で指定してください`);
        } else if (effect.type === "healingPower") {
          if (!Number.isFinite(Number(effect.value)) || Number(effect.value) <= 0) errors.push(`${effectSource}.value は0より大きい数で指定してください`);
        } else if (effect.type === "slayer") {
          requireRef(master.creatureFamilies, effect.familyId, `${effectSource}.familyId`);
          if (!Number.isFinite(Number(effect.value)) || Number(effect.value) <= 1) errors.push(`${effectSource}.value は1より大きい数で指定してください`);
        } else if (effect.type === "statusResistance") {
          requireRef(master.statusEffects, effect.statusId, `${effectSource}.statusId`);
          if (!Number.isFinite(Number(effect.value)) || Number(effect.value) <= 0 || Number(effect.value) > 1) errors.push(`${effectSource}.value は0より大きく1以下で指定してください`);
        }
      });
    });
    Object.entries(master.equipmentSets).forEach(([setId, definition]) => {
      const source = `equipmentSets.${setId}`;
      if (definition.id !== setId) errors.push(`${source}.id は登録IDと一致させてください`);
      ["name", "description"].forEach(field => {
        if (typeof definition[field] !== "string" || !definition[field].trim()) errors.push(`${source}.${field} がありません`);
      });
      if (!Array.isArray(definition.itemIds) || definition.itemIds.length < 2 || new Set(definition.itemIds).size !== definition.itemIds.length) {
        errors.push(`${source}.itemIds は重複しない装備を2件以上指定してください`);
      }
      (definition.itemIds || []).forEach(itemId => {
        requireRef(master.items, itemId, `${source}.itemIds`);
        if (master.items[itemId] && !["weapon", "armor"].includes(master.items[itemId].type)) errors.push(`${source}.itemIds.${itemId} は装備ではありません`);
      });
      if (!Array.isArray(definition.bonuses) || !definition.bonuses.length) errors.push(`${source}.bonuses がありません`);
      let previousCount = 0;
      (definition.bonuses || []).forEach((bonus, index) => {
        const bonusSource = `${source}.bonuses.${index}`;
        if (!Number.isInteger(bonus.count) || bonus.count < 2 || bonus.count <= previousCount || bonus.count > (definition.itemIds || []).length) errors.push(`${bonusSource}.count が不正です`);
        requireRef(master.equipmentSkills, bonus.skillId, `${bonusSource}.skillId`);
        previousCount = bonus.count;
      });
    });
    Object.entries(master.relations.upgradeSkillProgression).forEach(([typeId, progression]) => {
      requireRef(master.equipmentTypes, typeId, `relations.upgradeSkillProgression.${typeId}`);
      if (!Array.isArray(progression) || !progression.length) errors.push(`relations.upgradeSkillProgression.${typeId} がありません`);
      let previousLevel = 0;
      (progression || []).forEach((entry, index) => {
        const source = `relations.upgradeSkillProgression.${typeId}.${index}`;
        requireRef(master.equipmentSkills, entry.skillId, `${source}.skillId`);
        if (!Number.isInteger(entry.level) || entry.level <= previousLevel) errors.push(`${source}.level は昇順の正整数で指定してください`);
        previousLevel = entry.level;
      });
    });
    Object.keys(master.equipmentTypes).forEach(typeId => {
      if (!Object.prototype.hasOwnProperty.call(master.relations.upgradeSkillProgression, typeId)) errors.push(`relations.upgradeSkillProgression.${typeId} がありません`);
    });

    const recipeIds = new Set();
    const recipeResultIds = new Set();
    master.recipes.forEach(recipe => {
      const source = `recipes.${recipe.id ?? "(未指定)"}`;
      if (!recipe.id || recipeIds.has(recipe.id)) errors.push(`${source}.id が未指定または重複しています`);
      recipeIds.add(recipe.id);
      requireRef(master.items, recipe.resultId, `${source}.resultId`);
      const result = master.items[recipe.resultId];
      if (result && !["weapon", "armor"].includes(result.type)) errors.push(`${source}.resultId は装備を指定してください`);
      if (result?.unique) errors.push(`${source}.resultId は固有装備を指定できません`);
      if (recipeResultIds.has(recipe.resultId)) errors.push(`${source}.resultId -> ${recipe.resultId} が重複しています`);
      recipeResultIds.add(recipe.resultId);
      if (!Number.isInteger(recipe.gold) || recipe.gold < 0) errors.push(`${source}.gold は0以上の整数で指定してください`);
      if (!recipe.materials || typeof recipe.materials !== "object" || Array.isArray(recipe.materials) || !Object.keys(recipe.materials).length) {
        errors.push(`${source}.materials がありません`);
      } else {
        Object.entries(recipe.materials).forEach(([itemId, quantity]) => {
          requireRef(master.items, itemId, `${source}.materials`);
          if (master.items[itemId] && master.items[itemId].type !== "material") errors.push(`${source}.materials.${itemId} は素材を指定してください`);
          if (!Number.isInteger(quantity) || quantity < 1) errors.push(`${source}.materials.${itemId} は1以上の整数で指定してください`);
        });
      }
      if (Object.prototype.hasOwnProperty.call(recipe, "category")) errors.push(`${source}.category は完成品の装備種別から自動判定してください`);
      if (recipe.unlockAfter && !has(chapters, recipe.unlockAfter) && !has(master.dungeons, recipe.unlockAfter)) errors.push(`${source}.unlockAfter -> ${recipe.unlockAfter}`);
    });

    Object.entries(master.storyScenes).forEach(([sceneId, scene]) => {
      const source = `storyScenes.${sceneId}`;
      if (scene.id !== sceneId) errors.push(`${source}.id は登録IDと一致させてください`);
      ["name", "text"].forEach(field => {
        if (typeof scene[field] !== "string" || !scene[field].trim()) errors.push(`${source}.${field} がありません`);
      });
    });

    const requirementTypes = new Set(["characters", "departure", "dungeonClear", "chapterCompleted", "itemOwned", "itemDiscovered"]);
    const validateRequirement = (requirement, source) => {
      if (!requirement || !requirementTypes.has(requirement.type)) {
        errors.push(`${source}.type -> ${requirement?.type ?? "(未指定)"}`);
        return;
      }
      if (requirement.type === "dungeonClear") requireRef(master.dungeons, requirement.dungeonId, `${source}.dungeonId`);
      if (requirement.type === "chapterCompleted") requireRef(chapters, requirement.chapterId, `${source}.chapterId`);
      if (["itemOwned", "itemDiscovered"].includes(requirement.type)) {
        requireRef(master.items, requirement.itemId, `${source}.itemId`);
        if (requirement.quantity != null && (!Number.isInteger(requirement.quantity) || requirement.quantity < 1)) errors.push(`${source}.quantity は1以上の整数で指定してください`);
      }
      if (requirement.type === "characters" && (!Number.isInteger(requirement.minimum) || requirement.minimum < 1)) errors.push(`${source}.minimum は1以上の整数で指定してください`);
    };
    const validateRange = (range, source, minimum = 0) => {
      if (!Array.isArray(range) || range.length !== 2 || range.some(value => !Number.isFinite(Number(value)) || Number(value) < minimum) || Number(range[0]) > Number(range[1])) {
        errors.push(`${source} は最小・最大の順に${minimum}以上の数で指定してください`);
      }
    };

    const dungeonOrders = new Map();
    const dungeonDependencies = new Map();
    Object.entries(master.dungeons).forEach(([dungeonId, dungeon]) => {
      const source = `dungeons.${dungeonId}`;
      if (dungeon.id !== dungeonId) errors.push(`${source}.id は登録IDと一致させてください`);
      ["name", "shortName", "color", "description"].forEach(field => {
        if (typeof dungeon[field] !== "string" || !dungeon[field].trim()) errors.push(`${source}.${field} がありません`);
      });
      requireRef(chapters, dungeon.chapterId, `${source}.chapterId`);
      if (!Number.isInteger(dungeon.orderInChapter) || dungeon.orderInChapter < 1) errors.push(`${source}.orderInChapter は1以上の整数で指定してください`);
      const orderKey = `${dungeon.chapterId}:${dungeon.requiredForStory === false ? "optional" : "main"}:${dungeon.orderInChapter}`;
      if (dungeonOrders.has(orderKey)) errors.push(`${source}.orderInChapter は${dungeonOrders.get(orderKey)}と重複しています`);
      dungeonOrders.set(orderKey, dungeonId);
      if (typeof dungeon.requiredForStory !== "boolean") errors.push(`${source}.requiredForStory は真偽値で指定してください`);
      if (!Number.isInteger(dungeon.recommendedLevel) || dungeon.recommendedLevel < 1) errors.push(`${source}.recommendedLevel は1以上の整数で指定してください`);
      ["duration", "difficulty"].forEach(field => {
        if (!Number.isFinite(Number(dungeon[field])) || Number(dungeon[field]) <= 0) errors.push(`${source}.${field} は0より大きい数で指定してください`);
      });

      const requirements = Array.isArray(dungeon.unlockRequirements) ? dungeon.unlockRequirements : [];
      if (!Array.isArray(dungeon.unlockRequirements)) errors.push(`${source}.unlockRequirements は配列で指定してください`);
      const dependencies = [];
      requirements.forEach((requirement, index) => {
        const requirementSource = `${source}.unlockRequirements.${index}`;
        validateRequirement(requirement, requirementSource);
        if (requirement?.type === "dungeonClear") {
          dependencies.push(requirement.dungeonId);
          if (requirement.dungeonId === dungeonId) errors.push(`${requirementSource}.dungeonId は自分自身を指定できません`);
        }
        if (dungeon.requiredForStory && requirement?.type === "chapterCompleted" && requirement.chapterId === dungeon.chapterId) errors.push(`${requirementSource}.chapterId は本編攻略先自身の章を指定できません`);
      });
      dungeonDependencies.set(dungeonId, dependencies);

      if (!dungeon.strategy || ["label", "feature", "advice"].some(field => typeof dungeon.strategy[field] !== "string" || !dungeon.strategy[field].trim())) errors.push(`${source}.strategy の文章が不足しています`);
      if (!Array.isArray(dungeon.strategy?.preparation) || dungeon.strategy.preparation.some(value => typeof value !== "string" || !value.trim()) || new Set(dungeon.strategy?.preparation || []).size !== (dungeon.strategy?.preparation || []).length) errors.push(`${source}.strategy.preparation は重複しない文字列の配列で指定してください`);
      if (dungeon.monsterScaling != null) ["regular", "boss"].forEach(group => {
        const scaling = dungeon.monsterScaling[group];
        if (!scaling || !Number.isFinite(Number(scaling.hp)) || Number(scaling.hp) <= 0 || !Number.isFinite(Number(scaling.attack)) || Number(scaling.attack) <= 0) errors.push(`${source}.monsterScaling.${group} は正のhp・attack倍率で指定してください`);
      });

      if (!Array.isArray(dungeon.encounters) || !dungeon.encounters.length) errors.push(`${source}.encounters がありません`);
      (dungeon.encounters || []).forEach((encounter, encounterIndex) => {
        const encounterSource = `${source}.encounters.${encounterIndex}`;
        if (typeof encounter.name !== "string" || !encounter.name.trim()) errors.push(`${encounterSource}.name がありません`);
        if (!Array.isArray(encounter.groups) || !encounter.groups.length) errors.push(`${encounterSource}.groups がありません`);
        (encounter.groups || []).forEach((group, groupIndex) => {
          if (!Array.isArray(group) || !group.length) errors.push(`${encounterSource}.groups.${groupIndex} がありません`);
          (group || []).forEach(monsterId => requireRef(master.monsters, monsterId, `${encounterSource}.groups.${groupIndex}`));
        });
      });
      validateRange(dungeon.rewards?.gold, `${source}.rewards.gold`);
      validateRange(dungeon.rewards?.exp, `${source}.rewards.exp`);
      if (!Array.isArray(dungeon.drops)) errors.push(`${source}.drops は配列で指定してください`);
      (dungeon.drops || []).forEach((drop, index) => {
        const dropSource = `${source}.drops.${index}`;
        requireRef(master.items, drop.itemId, `${dropSource}.itemId`);
        if (!Number.isFinite(Number(drop.chance)) || Number(drop.chance) <= 0 || Number(drop.chance) > 1) errors.push(`${dropSource}.chance は0より大きく1以下で指定してください`);
        validateRange(drop.quantity, `${dropSource}.quantity`, 1);
      });

      [dungeon.clearStoryId, dungeon.optionalStoryId].filter(Boolean).forEach(sceneId => requireRef(master.storyScenes, sceneId, `${source}.story`));
      if (dungeon.requiredForStory && !dungeon.clearStoryId) errors.push(`${source}.clearStoryId がありません`);
      if (!dungeon.requiredForStory && !dungeon.optionalStoryId) errors.push(`${source}.optionalStoryId がありません`);
      const links = master.relations.dungeonStoryLinks[dungeon.id];
      if (!links) errors.push(`relations.dungeonStoryLinks.${dungeon.id} がありません`);
      else ["openingStoryId", "discoveryStoryId"].forEach(field => requireRef(master.storyScenes, links[field], `relations.dungeonStoryLinks.${dungeon.id}.${field}`));
      (master.relations.dungeonPartyRestrictions[dungeon.id] || []).forEach(rule => {
        (rule.raceIds || []).forEach(raceId => requireRef(master.races, raceId, `relations.dungeonPartyRestrictions.${dungeon.id}`));
        (rule.companionIds || []).forEach(companionId => requireRef(master.companions, companionId, `relations.dungeonPartyRestrictions.${dungeon.id}`));
      });
    });
    const visitingDungeons = new Set();
    const visitedDungeons = new Set();
    const visitDungeon = dungeonId => {
      if (visitingDungeons.has(dungeonId)) {
        errors.push(`dungeons.${dungeonId}.unlockRequirements に循環参照があります`);
        return;
      }
      if (visitedDungeons.has(dungeonId)) return;
      visitingDungeons.add(dungeonId);
      (dungeonDependencies.get(dungeonId) || []).filter(id => has(master.dungeons, id)).forEach(visitDungeon);
      visitingDungeons.delete(dungeonId);
      visitedDungeons.add(dungeonId);
    };
    Object.keys(master.dungeons).forEach(visitDungeon);

    const chapterOrders = new Set();
    const chapterNumbers = new Set();
    master.storyChapters.forEach(chapter => {
      const source = `storyChapters.${chapter.id}`;
      ["title", "objective", "unlockText"].forEach(field => {
        if (typeof chapter[field] !== "string" || !chapter[field].trim()) errors.push(`${source}.${field} がありません`);
      });
      if (!Number.isInteger(chapter.order) || chapter.order < 0 || chapterOrders.has(chapter.order)) errors.push(`${source}.order は重複しない0以上の整数で指定してください`);
      chapterOrders.add(chapter.order);
      if (!Number.isInteger(chapter.number) || chapter.number < 0 || chapterNumbers.has(chapter.number)) errors.push(`${source}.number は重複しない0以上の整数で指定してください`);
      chapterNumbers.add(chapter.number);
      if (chapter.kind != null && chapter.kind !== "postgame") errors.push(`${source}.kind -> ${chapter.kind}`);
      validateRange(chapter.recommendedLevelRange, `${source}.recommendedLevelRange`, 1);
      requireRef(master.storyScenes, chapter.openingStoryId, `${source}.openingStoryId`);
      requireRef(master.storyScenes, chapter.clearStoryId, `${source}.clearStoryId`);
      if (!Array.isArray(chapter.entryRequirements)) errors.push(`${source}.entryRequirements は配列で指定してください`);
      (chapter.entryRequirements || []).forEach((requirement, index) => validateRequirement(requirement, `${source}.entryRequirements.${index}`));
      if (!Number.isFinite(Number(chapter.rewards?.gold)) || Number(chapter.rewards.gold) < 0) errors.push(`${source}.rewards.gold は0以上の数で指定してください`);
      Object.entries(chapter.rewards?.materials || {}).forEach(([itemId, quantity]) => {
        requireRef(master.items, itemId, `${source}.rewards.materials`);
        if (master.items[itemId] && master.items[itemId].type !== "material") errors.push(`${source}.rewards.materials.${itemId} は素材ではありません`);
        if (!Number.isInteger(quantity) || quantity < 1) errors.push(`${source}.rewards.materials.${itemId} は1以上の整数で指定してください`);
      });
      const requiredRoutes = Object.values(master.dungeons).filter(dungeon => dungeon.chapterId === chapter.id && dungeon.requiredForStory);
      if (chapter.order > 0 && !requiredRoutes.length) errors.push(`${source} に本編攻略先がありません`);
    });

    const observationUnlockTypes = new Set(["always", "departure", "dungeonClear", "chapterCompleted", "itemDiscovered", "routeEventEncountered", "routeEventMastered", "treasureTierEncountered", "treasureTierMastered", "sharedSorties"]);
    master.observationNotes.forEach(note => {
      const source = `observationNotes.${note.id}`;
      ["category", "title", "author", "lead", "unlockHint"].forEach(field => {
        if (typeof note[field] !== "string" || !note[field].trim()) errors.push(`${source}.${field} がありません`);
      });
      ["paragraphs", "findings"].forEach(field => {
        if (!Array.isArray(note[field]) || !note[field].length || note[field].some(text => typeof text !== "string" || !text.trim())) {
          errors.push(`${source}.${field} は空でない文章の配列で指定してください`);
        }
      });

      const unlock = note.unlock;
      if (!unlock || !observationUnlockTypes.has(unlock.type)) {
        errors.push(`${source}.unlock.type -> ${unlock?.type ?? "(未指定)"}`);
        return;
      }
      if (unlock.type === "dungeonClear") requireRef(master.dungeons, unlock.dungeonId, `${source}.unlock.dungeonId`);
      if (unlock.type === "chapterCompleted") requireRef(chapters, unlock.chapterId, `${source}.unlock.chapterId`);
      if (unlock.type === "itemDiscovered") requireRef(master.items, unlock.itemId, `${source}.unlock.itemId`);
      if (["routeEventEncountered", "routeEventMastered"].includes(unlock.type) && !(master.config.explorationEvents?.routeEvents || []).some(event => event.id === unlock.routeEventId)) errors.push(`${source}.unlock.routeEventId -> ${unlock.routeEventId ?? "(未指定)"}`);
      if (unlock.type === "routeEventMastered" && (!Number.isInteger(unlock.successes) || unlock.successes < 2)) errors.push(`${source}.unlock.successes は2以上の整数で指定してください`);
      if (["treasureTierEncountered", "treasureTierMastered"].includes(unlock.type) && !(master.config.explorationEvents?.treasure?.types || []).some(tier => tier.id === unlock.treasureTierId)) errors.push(`${source}.unlock.treasureTierId -> ${unlock.treasureTierId ?? "(未指定)"}`);
      if (unlock.type === "treasureTierMastered" && (!Number.isInteger(unlock.openings) || unlock.openings < 2)) errors.push(`${source}.unlock.openings は2以上の整数で指定してください`);
      if (unlock.type === "sharedSorties" && (!Number.isInteger(unlock.minimum) || unlock.minimum < 2)) errors.push(`${source}.unlock.minimum は2以上の整数で指定してください`);
    });

    const validReward = (rewards, source) => {
      if (!rewards || !Number.isFinite(Number(rewards.gold)) || Number(rewards.gold) < 0) errors.push(`${source}.gold は0以上の数で指定してください`);
      Object.entries(rewards?.materials || {}).forEach(([itemId, quantity]) => {
        requireRef(master.items, itemId, `${source}.materials`);
        if (master.items[itemId] && master.items[itemId].type !== "material") errors.push(`${source}.materials.${itemId} は素材ではありません`);
        if (!Number.isInteger(quantity) || quantity < 1) errors.push(`${source}.materials.${itemId} は1以上の整数で指定してください`);
      });
    };
    master.commissions.forEach(commission => {
      const source = `commissions.${commission.id}`;
      requireRef(master.dungeons, commission.dungeonId, `${source}.dungeonId`);
      if (!["clear", "kills"].includes(commission.type)) errors.push(`${source}.type -> ${commission.type ?? "(未指定)"}`);
      if (!Number.isInteger(commission.target) || commission.target < 1) errors.push(`${source}.target は1以上の整数で指定してください`);
      if (typeof commission.title !== "string" || !commission.title.trim()) errors.push(`${source}.title がありません`);
      if (typeof commission.description !== "string" || !commission.description.trim()) errors.push(`${source}.description がありません`);
      if (commission.type === "kills") requireRef(master.monsters, commission.monsterId, `${source}.monsterId`);
      validReward(commission.rewards, `${source}.rewards`);
    });

    const achievementConditionTypes = new Set(["characters", "partyMembers", "chapters", "postgameChapters", "specificDungeonClear", "dungeonClears", "optionalClears", "divineClears", "monsterSpecies", "monsterDefeats", "itemTypes", "equipmentSetCompletions", "companionMemories", "companionPairMemories", "companionBonds", "routeEventEncounters", "routeRumorConfirmations", "routeEventMasteries", "teamSurveys", "treasureTierMasteries", "ultraRareOwned", "facilityUpgrades"]);
    master.achievements.forEach(achievement => {
      const source = `achievements.${achievement.id}`;
      ["category", "name", "description", "icon"].forEach(field => {
        if (typeof achievement[field] !== "string" || !achievement[field].trim()) errors.push(`${source}.${field} がありません`);
      });
      if (achievement.secret != null && typeof achievement.secret !== "boolean") errors.push(`${source}.secret は真偽値で指定してください`);
      if (!achievement.condition || !achievementConditionTypes.has(achievement.condition.type)) errors.push(`${source}.condition.type -> ${achievement.condition?.type ?? "(未指定)"}`);
      const dynamicAchievementTypes = new Set(["routeEventEncounters", "routeRumorConfirmations", "routeEventMasteries", "treasureTierMasteries"]);
      if ((!Number.isInteger(achievement.condition?.target) || achievement.condition.target < 1) && !(achievement.condition?.target === "all" && dynamicAchievementTypes.has(achievement.condition?.type))) errors.push(`${source}.condition.target は1以上の整数または対応するallで指定してください`);
      if (achievement.condition?.type === "specificDungeonClear") requireRef(master.dungeons, achievement.condition.dungeonId, `${source}.condition.dungeonId`);
    });

    const adventurerRecordFields = new Set(["sorties", "victories", "retreats", "encounterClears", "routeSuccesses", "treasureOpenings", "teamSurveys", "damageDealt", "healingDone", "damageTaken", "criticalHits", "knockouts", "bestDamage", "bestHealing", "bestEndurance"]);
    const adventurerRouteEventIds = new Set((master.config.explorationEvents?.routeEvents || []).map(event => event.id));
    master.adventurerMilestones.forEach(milestone => {
      const source = `adventurerMilestones.${milestone.id}`;
      ["name", "description", "icon"].forEach(field => {
        if (typeof milestone[field] !== "string" || !milestone[field].trim()) errors.push(`${source}.${field} がありません`);
      });
      if (!["record", "routeEventRecord", "specialtyCount", "sharedSorties"].includes(milestone.condition?.type)) errors.push(`${source}.condition.type -> ${milestone.condition?.type ?? "(未指定)"}`);
      if (milestone.condition?.type === "record" && !adventurerRecordFields.has(milestone.condition?.field)) errors.push(`${source}.condition.field -> ${milestone.condition?.field ?? "(未指定)"}`);
      if (milestone.condition?.type === "routeEventRecord" && !adventurerRouteEventIds.has(milestone.condition?.routeEventId)) errors.push(`${source}.condition.routeEventId -> ${milestone.condition?.routeEventId ?? "(未指定)"}`);
      if (milestone.condition?.type === "specialtyCount" && milestone.condition.minimum > adventurerRouteEventIds.size + 1) errors.push(`${source}.condition.minimum は得意分野の総数以下で指定してください`);
      if (!Number.isFinite(milestone.condition?.minimum) || milestone.condition.minimum <= 0) errors.push(`${source}.condition.minimum は0より大きい数で指定してください`);
    });

    const rumorMetrics = new Set(["gold", "experience", "qualityRate", "itemRate"]);
    master.expeditionRumors.forEach(rumor => {
      const source = `expeditionRumors.${rumor.id}`;
      ["name", "text", "icon"].forEach(field => {
        if (typeof rumor[field] !== "string" || !rumor[field].trim()) errors.push(`${source}.${field} がありません`);
      });
      if (!rumorMetrics.has(rumor.effect?.metric)) errors.push(`${source}.effect.metric -> ${rumor.effect?.metric ?? "(未指定)"}`);
      if (rumor.effect?.operation !== "multiplier") errors.push(`${source}.effect.operation -> ${rumor.effect?.operation ?? "(未指定)"}`);
      if (!Number.isFinite(rumor.effect?.value) || rumor.effect.value <= 1 || rumor.effect.value > 2) errors.push(`${source}.effect.value は1より大きく2以下で指定してください`);
    });

    const recurringTriggers = new Set(["login", "departure", "clear", "facility_collect", "shop_purchase", "craft"]);
    const recurringGroupIds = new Set();
    (master.config.recurringMissions.groups || []).forEach(group => {
      const source = `config.recurringMissions.groups.${group.id ?? "(未指定)"}`;
      if (!group.id || recurringGroupIds.has(group.id)) errors.push(`${source}.id が未指定または重複しています`);
      recurringGroupIds.add(group.id);
      if (!["daily", "weekly"].includes(group.schedule?.type)) errors.push(`${source}.schedule.type -> ${group.schedule?.type ?? "(未指定)"}`);
      if (!Number.isInteger(group.schedule?.resetHour) || group.schedule.resetHour < 0 || group.schedule.resetHour > 23) errors.push(`${source}.schedule.resetHour は0〜23の整数で指定してください`);
      if (!["all", "random"].includes(group.selection?.strategy)) errors.push(`${source}.selection.strategy -> ${group.selection?.strategy ?? "(未指定)"}`);
      const missions = Array.isArray(group.missions) ? group.missions : [];
      if (!missions.length) errors.push(`${source}.missions がありません`);
      if (!Number.isInteger(group.selection?.count) || group.selection.count < 1 || group.selection.count > missions.length) errors.push(`${source}.selection.count が不正です`);
      const missionIds = new Set();
      missions.forEach(mission => {
        const missionSource = `${source}.missions.${mission.id ?? "(未指定)"}`;
        if (!mission.id || missionIds.has(mission.id)) errors.push(`${missionSource}.id が未指定または重複しています`);
        missionIds.add(mission.id);
        if (!recurringTriggers.has(mission.trigger)) errors.push(`${missionSource}.trigger -> ${mission.trigger ?? "(未指定)"}`);
        if (!Number.isInteger(mission.target) || mission.target < 1) errors.push(`${missionSource}.target は1以上の整数で指定してください`);
        ["title", "description"].forEach(field => {
          if (typeof mission[field] !== "string" || !mission[field].trim()) errors.push(`${missionSource}.${field} がありません`);
        });
        validReward(mission.rewards, `${missionSource}.rewards`);
      });
      (group.selection?.pinnedIds || []).forEach(missionId => {
        if (!missionIds.has(missionId)) errors.push(`${source}.selection.pinnedIds -> ${missionId}`);
      });
    });

    const qualityRanks = new Set();
    Object.values(master.qualities).forEach(quality => {
      const source = `qualities.${quality.id}`;
      if (!["low", "standard", "high"].includes(quality.qualityBand)) errors.push(`${source}.qualityBand -> ${quality.qualityBand ?? "(未指定)"}`);
      if (!Number.isInteger(quality.rank) || quality.rank < 0 || qualityRanks.has(quality.rank)) errors.push(`${source}.rank は重複しない0以上の整数で指定してください`);
      qualityRanks.add(quality.rank);
      ["statMultiplier", "weightMultiplier", "valueMultiplier"].forEach(field => {
        const value = Number(quality[field]);
        if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value * 2)) errors.push(`${source}.${field} は0より大きい0.5刻みで指定してください`);
      });
      if (Number(quality.statMultiplier) > 5) errors.push(`${source}.statMultiplier は5以下で指定してください`);
      if (quality.valueMultiplier !== quality.statMultiplier) errors.push(`${source}.valueMultiplier はstatMultiplierと一致させてください`);
      if (!Array.isArray(quality.affixes) || quality.affixes.length !== 2 || quality.affixes.some(value => !Number.isInteger(value) || value < 0) || quality.affixes[0] > quality.affixes[1]) {
        errors.push(`${source}.affixes は最小・最大の順に0以上の整数で指定してください`);
      }
    });
    Object.entries(master.config.qualityTables).forEach(([tableId, rows]) => {
      const source = `config.qualityTables.${tableId}`;
      if (!Array.isArray(rows) || !rows.length) {
        errors.push(`${source} がありません`);
        return;
      }
      const usedQualityIds = new Set();
      rows.forEach((row, index) => {
        if (!Array.isArray(row) || row.length !== 2) {
          errors.push(`${source}.${index} は品質IDと重みの組で指定してください`);
          return;
        }
        const [qualityId, weight] = row;
        requireRef(master.qualities, qualityId, `${source}.${index}`);
        if (usedQualityIds.has(qualityId)) errors.push(`${source}.${qualityId} が重複しています`);
        usedQualityIds.add(qualityId);
        if (!Number.isFinite(Number(weight)) || Number(weight) <= 0) errors.push(`${source}.${qualityId}.weight は0より大きい数で指定してください`);
      });
    });

    const ultraRare = master.config.ultraRare;
    if (!ultraRare || !Number.isFinite(Number(ultraRare.dropChance)) || ultraRare.dropChance <= 0 || ultraRare.dropChance > 1) errors.push("config.ultraRare.dropChance は0より大きく1以下で指定してください");
    ["statMultiplier", "saleMultiplier"].forEach(field => {
      if (!Number.isFinite(Number(ultraRare?.[field])) || Number(ultraRare[field]) <= 0) errors.push(`config.ultraRare.${field} は0より大きい数で指定してください`);
    });
    Object.values(master.ultraRareTitles).forEach(title => {
      const source = `ultraRareTitles.${title.id}`;
      if (typeof title.name !== "string" || !title.name.trim()) errors.push(`${source}.name がありません`);
      requireRef(master.equipmentSkills, title.skillId, `${source}.skillId`);
    });

    const difficultyOrders = new Set();
    if (!master.dungeonDifficulties.normal) errors.push("dungeonDifficulties.normal がありません");
    Object.values(master.dungeonDifficulties).forEach(difficulty => {
      const source = `dungeonDifficulties.${difficulty.id}`;
      if (!Number.isInteger(difficulty.order) || difficulty.order < 0 || difficultyOrders.has(difficulty.order)) errors.push(`${source}.order は重複しない0以上の整数で指定してください`);
      difficultyOrders.add(difficulty.order);
      if (difficulty.unlockAfter) requireRef(master.dungeonDifficulties, difficulty.unlockAfter, `${source}.unlockAfter`);
      ["durationMultiplier", "rewardMultiplier", "recommendedLevelMultiplier"].forEach(field => {
        if (!Number.isFinite(Number(difficulty[field])) || Number(difficulty[field]) < 1) errors.push(`${source}.${field} は1以上の数で指定してください`);
      });
      const modifiers = difficulty.monsterModifiers;
      ["hp", "attack", "defense", "magicAttack", "magicDefense", "speed", "hitRate", "evasionRate"].forEach(field => {
        if (!Number.isFinite(Number(modifiers?.[field])) || Number(modifiers[field]) <= 0) errors.push(`${source}.monsterModifiers.${field} は0より大きい数で指定してください`);
      });
      if (difficulty.id === "normal") {
        if (difficulty.unlockAfter != null || difficulty.firstClearReward != null) errors.push(`${source} は解放条件と初回報酬を持てません`);
      } else validReward(difficulty.firstClearReward, `${source}.firstClearReward`);
    });

    const recruitment = master.config.recruitment;
    if (!Number.isFinite(Number(recruitment.matchChance)) || recruitment.matchChance < 0 || recruitment.matchChance > 1) errors.push("config.recruitment.matchChance は0〜1で指定してください");
    ["base", "minimum"].forEach(field => {
      if (!Number.isFinite(Number(recruitment.pricing?.[field])) || Number(recruitment.pricing[field]) < 0) errors.push(`config.recruitment.pricing.${field} は0以上の数で指定してください`);
    });
    if (!Number.isInteger(recruitment.pricing?.roundTo) || recruitment.pricing.roundTo < 1) errors.push("config.recruitment.pricing.roundTo は1以上の整数で指定してください");
    (recruitment.pricing?.foundingSubsidies || []).forEach((value, index) => {
      if (!Number.isFinite(Number(value)) || Number(value) < 0) errors.push(`config.recruitment.pricing.foundingSubsidies.${index} は0以上の数で指定してください`);
    });
    ["hp", "attack", "defense"].forEach(stat => {
      if (!Number.isFinite(Number(recruitment.pricing?.abilityBaselines?.[stat]))) errors.push(`config.recruitment.pricing.abilityBaselines.${stat} が不正です`);
      if (!Number.isFinite(Number(recruitment.pricing?.abilityWeights?.[stat])) || Number(recruitment.pricing.abilityWeights[stat]) < 0) errors.push(`config.recruitment.pricing.abilityWeights.${stat} は0以上の数で指定してください`);
    });
    [["jobCosts", master.jobs], ["raceCosts", master.races]].forEach(([costName, table]) => {
      Object.keys(table).forEach(id => {
        if (!Number.isFinite(Number(recruitment.pricing?.[costName]?.[id])) || Number(recruitment.pricing[costName][id]) < 0) errors.push(`config.recruitment.pricing.${costName}.${id} は0以上の数で指定してください`);
      });
      Object.keys(recruitment.pricing?.[costName] || {}).forEach(id => requireRef(table, id, `config.recruitment.pricing.${costName}`));
    });
    const posting = recruitment.postingCost;
    requireRef(master.items, posting?.itemId, "config.recruitment.postingCost.itemId");
    if (master.items[posting?.itemId] && master.items[posting.itemId].type !== "material") errors.push("config.recruitment.postingCost.itemId は素材ではありません");
    ["baseQuantity", "quantityPerSelection"].forEach(field => {
      if (!Number.isInteger(posting?.[field]) || posting[field] < 0) errors.push(`config.recruitment.postingCost.${field} は0以上の整数で指定してください`);
    });
    let previousMaximum = 0;
    (posting?.brackets || []).forEach((bracket, index) => {
      const source = `config.recruitment.postingCost.brackets.${index}`;
      if (!Number.isInteger(bracket.maximumSelections) || bracket.maximumSelections <= previousMaximum) errors.push(`${source}.maximumSelections は昇順の正整数で指定してください`);
      previousMaximum = bracket.maximumSelections;
      if (!Array.isArray(bracket.applicants) || bracket.applicants.length !== 2 || bracket.applicants.some(value => !Number.isInteger(value) || value < 1) || bracket.applicants[0] > bracket.applicants[1]) errors.push(`${source}.applicants は最小・最大の順に正整数で指定してください`);
    });
    if (!Array.isArray(posting?.brackets) || !posting.brackets.length || previousMaximum < (recruitment.fields || []).length) errors.push("config.recruitment.postingCost.brackets が全募集項目数をカバーしていません");
    const recruitmentFieldIds = new Set();
    (recruitment.fields || []).forEach(field => {
      const source = `config.recruitment.fields.${field.id ?? "(未指定)"}`;
      if (!field.id || recruitmentFieldIds.has(field.id)) errors.push(`${source}.id が未指定または重複しています`);
      recruitmentFieldIds.add(field.id);
      if (!master[field.table] || typeof master[field.table] !== "object") errors.push(`${source}.table -> ${field.table ?? "(未指定)"}`);
      if (field.unlockAfter) requireRef(chapters, field.unlockAfter, `${source}.unlockAfter`);
      ["name", "condition"].forEach(key => {
        if (typeof field[key] !== "string" || !field[key].trim()) errors.push(`${source}.${key} がありません`);
      });
    });
    const katakanaName = /^[ァ-ヶー]{2,5}$/;
    ["male", "female"].forEach(gender => {
      const usedNames = new Set();
      Object.entries(recruitment.names?.[gender] || {}).forEach(([cultureId, names]) => {
        if (!Object.prototype.hasOwnProperty.call(recruitment.nameCultures || {}, cultureId)) errors.push(`config.recruitment.names.${gender}.${cultureId} の表示名がありません`);
        if (!Array.isArray(names) || !names.length) errors.push(`config.recruitment.names.${gender}.${cultureId} がありません`);
        (names || []).forEach(name => {
          if (!katakanaName.test(name) || usedNames.has(name)) errors.push(`config.recruitment.names.${gender}.${cultureId}.${name} は重複しない2〜5文字のカタカナで指定してください`);
          usedNames.add(name);
        });
      });
      Object.keys(recruitment.nameCultures || {}).forEach(cultureId => {
        if (!Array.isArray(recruitment.names?.[gender]?.[cultureId])) errors.push(`config.recruitment.names.${gender}.${cultureId} がありません`);
      });
    });
    Object.values(master.recruitmentTalents).forEach(talent => {
      const source = `recruitmentTalents.${talent.id}`;
      ["name", "description"].forEach(field => {
        if (typeof talent[field] !== "string" || !talent[field].trim()) errors.push(`${source}.${field} がありません`);
      });
      if (!talent.bonus || !Object.keys(talent.bonus).length) errors.push(`${source}.bonus がありません`);
      Object.entries(talent.bonus || {}).forEach(([stat, value]) => {
        if (!["hp", "attack", "defense"].includes(stat) || !Number.isFinite(Number(value))) errors.push(`${source}.bonus.${stat} が不正です`);
      });
    });
    master.relations.chapterUnlockAdditions.forEach(addition => {
      requireRef(chapters, addition.chapterId, `relations.chapterUnlockAdditions.${addition.id}.chapterId`);
      if (typeof addition.text !== "string" || !addition.text.trim()) errors.push(`relations.chapterUnlockAdditions.${addition.id}.text がありません`);
    });

    const usedCodes = new Set(), usedInputAreas = new Set();
    Object.values(master.accessCodes).forEach(definition => {
      const source = `accessCodes.${definition.id}`;
      ["code", "inputArea", "name", "description"].forEach(field => {
        if (typeof definition[field] !== "string" || !definition[field].trim()) errors.push(`${source}.${field} がありません`);
      });
      if (usedCodes.has(definition.code)) errors.push(`${source}.code が重複しています`);
      if (usedInputAreas.has(definition.inputArea)) errors.push(`${source}.inputArea が重複しています`);
      usedCodes.add(definition.code);
      usedInputAreas.add(definition.inputArea);
      if (!Array.isArray(definition.effects) || !definition.effects.length) errors.push(`${source}.effects がありません`);
      (definition.effects || []).forEach((effect, index) => {
        const effectSource = `${source}.effects.${index}`;
        if (effect.type === "partySlotRight") {
          if (!Number.isInteger(effect.amount) || effect.amount < 1) errors.push(`${effectSource}.amount は1以上の整数で指定してください`);
        } else if (effect.type === "explorationDurationMultiplier") {
          if (!Number.isFinite(Number(effect.multiplier)) || effect.multiplier <= 0 || effect.multiplier > 1) errors.push(`${effectSource}.multiplier は0より大きく1以下で指定してください`);
        } else if (effect.type === "acquisitionModifier") {
          if (!["gold", "experience", "qualityRate", "itemRate", "explorationTime"].includes(effect.metric)) errors.push(`${effectSource}.metric -> ${effect.metric ?? "(未指定)"}`);
          if (!["multiplier", "flat"].includes(effect.operation)) errors.push(`${effectSource}.operation -> ${effect.operation ?? "(未指定)"}`);
          if (!["party", "self"].includes(effect.scope)) errors.push(`${effectSource}.scope -> ${effect.scope ?? "(未指定)"}`);
          if (!Number.isFinite(Number(effect.value)) || (effect.operation === "multiplier" && effect.value <= 0)) errors.push(`${effectSource}.value が不正です`);
        } else errors.push(`${effectSource}.type -> ${effect.type ?? "(未指定)"}`);
      });
    });

    const validateMonsterMechanic = monster => {
      const mechanic = monster.mechanic;
      if (!mechanic) return;
      const source = `monsters.${monster.id}.mechanic`;
      const positiveNumber = value => Number.isFinite(Number(value)) && Number(value) > 0;
      if (!monster.boss) errors.push(`${source} はボス以外には設定できません`);
      if (mechanic.kind !== "telegraphed_burst") errors.push(`${source}.kind -> ${mechanic.kind ?? "(未指定)"}`);
      ["name", "description"].forEach(field => {
        if (typeof mechanic[field] !== "string" || !mechanic[field].trim()) errors.push(`${source}.${field} がありません`);
      });
      if (!Number.isInteger(mechanic.period) || mechanic.period < 2) errors.push(`${source}.period は2以上の整数で指定してください`);
      if (!positiveNumber(mechanic.multiplier)) errors.push(`${source}.multiplier は0より大きい数で指定してください`);
      if (!positiveNumber(mechanic.exposedMultiplier)) errors.push(`${source}.exposedMultiplier は0より大きい数で指定してください`);
      if (mechanic.statusAmplifier) {
        requireRef(master.statusEffects, mechanic.statusAmplifier.statusId, `${source}.statusAmplifier.statusId`);
        if (!positiveNumber(mechanic.statusAmplifier.multiplier)) errors.push(`${source}.statusAmplifier.multiplier は0より大きい数で指定してください`);
      }

      if (mechanic.phases == null) {
        if (Number.isInteger(mechanic.period) && mechanic.period < 3) errors.push(`${source}.period は標準フェーズを使う場合3以上にしてください`);
        return;
      }
      if (!Array.isArray(mechanic.phases) || mechanic.phases.length < 2) {
        errors.push(`${source}.phases は2件以上指定してください`);
        return;
      }
      if (Number.isInteger(mechanic.period) && mechanic.phases.length !== mechanic.period) errors.push(`${source}.phases の件数をperiodと一致させてください`);
      if (!mechanic.phases.some(phase => phase?.warnsBurst)) errors.push(`${source}.phases に大技の予告がありません`);
      if (!mechanic.phases.some(phase => phase?.unleashesBurst)) errors.push(`${source}.phases に大技の発動がありません`);
      mechanic.phases.forEach((phase, index) => {
        const phaseSource = `${source}.phases.${index}`;
        if (!phase || typeof phase !== "object") {
          errors.push(`${phaseSource} が不正です`);
          return;
        }
        if (typeof phase.id !== "string" || !phase.id.trim()) errors.push(`${phaseSource}.id がありません`);
        ["warnsBurst", "unleashesBurst", "allowNormalActions"].forEach(key => {
          if (phase[key] != null && typeof phase[key] !== "boolean") errors.push(`${phaseSource}.${key} は真偽値で指定してください`);
        });
        if (phase.incomingDamageMultiplier != null && !positiveNumber(phase.incomingDamageMultiplier)) errors.push(`${phaseSource}.incomingDamageMultiplier は0より大きい数で指定してください`);
        if (phase.logText != null && typeof phase.logText !== "string") errors.push(`${phaseSource}.logText は文字列で指定してください`);
      });
    };
    const monsterTargetRules = new Set(["random", "front", "front_weighted", "rear", "rear_weighted", "lowest_hp"]);
    const validateStatusAttack = (statusAttack, source) => {
      if (!statusAttack || typeof statusAttack !== "object") {
        errors.push(`${source} が不正です`);
        return;
      }
      requireRef(master.statusEffects, statusAttack.statusId, `${source}.statusId`);
      if (!Number.isFinite(Number(statusAttack.chance)) || Number(statusAttack.chance) <= 0 || Number(statusAttack.chance) > 1) errors.push(`${source}.chance は0より大きく1以下で指定してください`);
      if (!Number.isInteger(statusAttack.duration) || statusAttack.duration < 1) errors.push(`${source}.duration は1以上の整数で指定してください`);
      if (statusAttack.potency != null && (!Number.isFinite(Number(statusAttack.potency)) || Number(statusAttack.potency) < 0)) errors.push(`${source}.potency は0以上の数で指定してください`);
    };

    const validateDrop = (drop, source, expectedType) => {
      if (!drop || typeof drop !== "object") {
        errors.push(`${source} がありません`);
        return;
      }
      requireRef(master.items, drop.itemId, `${source}.itemId`);
      const item = master.items[drop.itemId];
      if (item && expectedType === "material" && item.type !== "material") errors.push(`${source}.itemId は素材ではありません`);
      if (item && expectedType === "equipment" && !["weapon", "armor"].includes(item.type)) errors.push(`${source}.itemId は装備ではありません`);
      if (!Number.isFinite(Number(drop.chance)) || Number(drop.chance) <= 0 || Number(drop.chance) > 1) errors.push(`${source}.chance は0より大きく1以下で指定してください`);
      if (!Array.isArray(drop.quantity) || drop.quantity.length !== 2 || drop.quantity.some(value => !Number.isInteger(value) || value < 1) || drop.quantity[0] > drop.quantity[1]) {
        errors.push(`${source}.quantity は最小・最大の順に1以上の整数で指定してください`);
      }
    };
    Object.keys(master.relations.monsterMaterialDrops).forEach(monsterId => requireRef(master.monsters, monsterId, `relations.monsterMaterialDrops.${monsterId}`));
    Object.keys(master.relations.monsterSignatureDrops).forEach(monsterId => requireRef(master.monsters, monsterId, `relations.monsterSignatureDrops.${monsterId}`));
    Object.entries(master.monsters).forEach(([monsterId, monster]) => {
      const source = `monsters.${monsterId}`;
      if (monster.id !== monsterId) errors.push(`${source}.id は登録IDと一致させてください`);
      ["name", "icon"].forEach(field => {
        if (typeof monster[field] !== "string" || !monster[field].trim()) errors.push(`${source}.${field} がありません`);
      });
      ["hp", "attack"].forEach(field => {
        if (!Number.isFinite(Number(monster[field])) || Number(monster[field]) <= 0) errors.push(`${source}.${field} は0より大きい数で指定してください`);
      });
      ["defense", "magicAttack", "magicDefense", "speed", "hitRate", "evasionRate", "criticalRate"].forEach(field => {
        if (monster[field] != null && (!Number.isFinite(Number(monster[field])) || Number(monster[field]) < 0)) errors.push(`${source}.${field} は0以上の数で指定してください`);
      });
      ["attackCount", "actions"].forEach(field => {
        if (monster[field] != null && (!Number.isInteger(monster[field]) || monster[field] < 1)) errors.push(`${source}.${field} は1以上の整数で指定してください`);
      });
      if (monster.boss != null && typeof monster.boss !== "boolean") errors.push(`${source}.boss は真偽値で指定してください`);
      if (monster.damageType != null && !["physical", "magic"].includes(monster.damageType)) errors.push(`${source}.damageType -> ${monster.damageType}`);
      if (monster.range != null && !["melee", "ranged"].includes(monster.range)) errors.push(`${source}.range -> ${monster.range}`);
      if (monster.targetRule != null && !monsterTargetRules.has(monster.targetRule)) errors.push(`${source}.targetRule -> ${monster.targetRule}`);
      if (monster.element != null) requireRef(master.elements, monster.element, `${source}.element`);
      if (monster.targetStatusId != null) requireRef(master.statusEffects, monster.targetStatusId, `${source}.targetStatusId`);
      if (monster.magicVulnerability != null && (!Number.isFinite(Number(monster.magicVulnerability)) || Number(monster.magicVulnerability) <= 0)) errors.push(`${source}.magicVulnerability は0より大きい数で指定してください`);
      if (monster.traitDescription != null && (typeof monster.traitDescription !== "string" || !monster.traitDescription.trim())) errors.push(`${source}.traitDescription が不正です`);
      Object.entries(monster.elementModifiers || {}).forEach(([elementId, multiplier]) => {
        requireRef(master.elements, elementId, `${source}.elementModifiers`);
        if (!Number.isFinite(Number(multiplier)) || Number(multiplier) <= 0) errors.push(`${source}.elementModifiers.${elementId} は0より大きい数で指定してください`);
      });
      Object.entries(monster.statusResistances || {}).forEach(([statusId, resistance]) => {
        requireRef(master.statusEffects, statusId, `${source}.statusResistances`);
        if (!Number.isFinite(Number(resistance)) || Number(resistance) < 0 || Number(resistance) > 1) errors.push(`${source}.statusResistances.${statusId} は0〜1で指定してください`);
      });
      if (monster.statusAttack != null) validateStatusAttack(monster.statusAttack, `${source}.statusAttack`);

      const families = master.relations.monsterFamilies[monster.id];
      if (!Array.isArray(families) || !families.length) errors.push(`relations.monsterFamilies.${monster.id} がありません`);
      if (new Set(families || []).size !== (families || []).length) errors.push(`relations.monsterFamilies.${monster.id} に重複があります`);
      (families || []).forEach(familyId => requireRef(master.creatureFamilies, familyId, `relations.monsterFamilies.${monster.id}`));
      (master.relations.monsterMaterialDrops[monster.id] || []).forEach((drop, index) => validateDrop(drop, `relations.monsterMaterialDrops.${monster.id}.${index}`, "material"));
      const signature = master.relations.monsterSignatureDrops[monster.id];
      if (!signature) errors.push(`relations.monsterSignatureDrops.${monster.id} がありません`);
      else {
        if (!Array.isArray(signature.materials) || !signature.materials.length) errors.push(`relations.monsterSignatureDrops.${monster.id}.materials がありません`);
        (signature.materials || []).forEach((drop, index) => validateDrop(drop, `relations.monsterSignatureDrops.${monster.id}.materials.${index}`, "material"));
        validateDrop(signature.equipment, `relations.monsterSignatureDrops.${monster.id}.equipment`, "equipment");
      }
      if (monster.bossDrop) {
        if (!monster.boss) errors.push(`${source}.bossDrop はボス以外へ設定できません`);
        requireRef(master.items, monster.bossDrop.itemId, `monsters.${monster.id}.bossDrop.itemId`);
        if (master.items[monster.bossDrop.itemId] && !["weapon", "armor"].includes(master.items[monster.bossDrop.itemId].type)) errors.push(`monsters.${monster.id}.bossDrop.itemId は装備ではありません`);
        if (master.items[monster.bossDrop.itemId] && !master.items[monster.bossDrop.itemId].unique) errors.push(`monsters.${monster.id}.bossDrop.itemId は固有装備を指定してください`);
        if (!Number.isFinite(Number(monster.bossDrop.chance)) || Number(monster.bossDrop.chance) <= 0 || Number(monster.bossDrop.chance) > 1) errors.push(`monsters.${monster.id}.bossDrop.chance は0より大きく1以下で指定してください`);
      }
      const combatStats = master.derived.monsterCombatStats?.[monster.id];
      if (!combatStats) errors.push(`derived.monsterCombatStats.${monster.id} がありません`);
      else ["magicAttack", "magicDefense", "hitRate", "evasionRate"].forEach(field => {
        if (!Number.isFinite(Number(combatStats[field])) || Number(combatStats[field]) < 0) errors.push(`derived.monsterCombatStats.${monster.id}.${field} は0以上の数で指定してください`);
      });
      validateMonsterMechanic(monster);
    });
    Object.entries(master.relations.monsterDifficultySkillGrants).forEach(([monsterId, grants]) => {
      requireRef(master.monsters, monsterId, `relations.monsterDifficultySkillGrants.${monsterId}`);
      Object.entries(grants || {}).forEach(([difficultyId, skillIds]) => {
        requireRef(master.dungeonDifficulties, difficultyId, `relations.monsterDifficultySkillGrants.${monsterId}.${difficultyId}`);
        if (difficultyId === "normal") errors.push(`relations.monsterDifficultySkillGrants.${monsterId}.normal は通常難易度へ設定できません`);
        if (!Array.isArray(skillIds) || !skillIds.length) errors.push(`relations.monsterDifficultySkillGrants.${monsterId}.${difficultyId} がありません`);
        if (new Set(skillIds || []).size !== (skillIds || []).length) errors.push(`relations.monsterDifficultySkillGrants.${monsterId}.${difficultyId} に重複があります`);
        (skillIds || []).forEach(skillId => requireRef(master.monsterSkills, skillId, `relations.monsterDifficultySkillGrants.${monsterId}.${difficultyId}`));
      });
    });
    Object.entries(master.relations.monsterDifficultyDropOverrides).forEach(([monsterId, overrides]) => {
      requireRef(master.monsters, monsterId, `relations.monsterDifficultyDropOverrides.${monsterId}`);
      Object.entries(overrides || {}).forEach(([difficultyId, drops]) => {
        const source = `relations.monsterDifficultyDropOverrides.${monsterId}.${difficultyId}`;
        requireRef(master.dungeonDifficulties, difficultyId, source);
        if (difficultyId === "normal") errors.push(`${source} は通常難易度へ設定できません`);
        (drops?.materials || []).forEach((drop, index) => validateDrop(drop, `${source}.materials.${index}`, "material"));
        validateDrop(drops?.equipment, `${source}.equipment`, "equipment");
      });
    });
    Object.values(master.monsters).forEach(monster => {
      Object.values(master.dungeonDifficulties).filter(difficulty => difficulty.id !== "normal").forEach(difficulty => {
        const source = `derived.monsterDifficultyDrops.${monster.id}.${difficulty.id}`;
        const drops = master.derived.monsterDifficultyDrops?.[monster.id]?.[difficulty.id];
        if (!drops) {
          errors.push(`${source} がありません`);
          return;
        }
        if (!Array.isArray(drops.materials) || !drops.materials.length) errors.push(`${source}.materials がありません`);
        (drops.materials || []).forEach((drop, index) => validateDrop(drop, `${source}.materials.${index}`, "material"));
        validateDrop(drops.equipment, `${source}.equipment`, "equipment");
      });
    });

    const monsterSkillTargets = new Set(["single", "all"]);
    const monsterSkillTargetRules = monsterTargetRules;
    Object.entries(master.monsterSkills).forEach(([skillId, skill]) => {
      const source = `monsterSkills.${skillId}`;
      if (skill.id !== skillId) errors.push(`${source}.id は登録IDと一致させてください`);
      ["name", "description"].forEach(field => {
        if (typeof skill[field] !== "string" || !skill[field].trim()) errors.push(`${source}.${field} がありません`);
      });
      if (!Number.isInteger(skill.period) || skill.period < 1) errors.push(`${source}.period は1以上の整数で指定してください`);
      if (skill.offset != null && (!Number.isInteger(skill.offset) || skill.offset < 1)) errors.push(`${source}.offset は1以上の整数で指定してください`);
      if (Number.isInteger(skill.offset) && Number.isInteger(skill.period) && skill.offset > skill.period) errors.push(`${source}.offset はperiod以下で指定してください`);
      if (!monsterSkillTargets.has(skill.target)) errors.push(`${source}.target -> ${skill.target ?? "(未指定)"}`);
      if (skill.targetRule != null && !monsterSkillTargetRules.has(skill.targetRule)) errors.push(`${source}.targetRule -> ${skill.targetRule}`);
      if (skill.target === "all" && skill.targetRule != null) errors.push(`${source}.targetRule は全体攻撃へ設定できません`);
      if (!["physical", "magic"].includes(skill.damageType)) errors.push(`${source}.damageType -> ${skill.damageType ?? "(未指定)"}`);
      if (!Number.isFinite(Number(skill.multiplier)) || Number(skill.multiplier) <= 0) errors.push(`${source}.multiplier は0より大きい数で指定してください`);
      if (skill.element) requireRef(master.elements, skill.element, `${source}.element`);
      if (skill.statusAttack != null) validateStatusAttack(skill.statusAttack, `${source}.statusAttack`);
    });

    const skillEffectTypes = new Set(["damage", "heal", "guard", "counter", "statMultiplier", "rearProtection", "combatModifier", "applyStatus", "cleanse", "slayer", "acquisitionModifier"]);
    const skillTargetScopes = new Set(["self", "singleEnemy", "allEnemies", "lowestHpAlly", "allAllies"]);
    const primaryEffectsByCategory = {
      technique: new Set(["damage", "guard"]),
      spell: new Set(["damage", "guard"]),
      healing: new Set(["heal"])
    };
    const passiveOnlyEffects = new Set(["counter", "statMultiplier", "rearProtection", "combatModifier", "slayer", "acquisitionModifier"]);
    const positiveNumber = value => Number.isFinite(Number(value)) && Number(value) > 0;
    const probability = value => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1;
    const modifierKeys = new Set(["incomingPhysical", "incomingMagic", "outgoingPhysical", "outgoingMagic", "healing", "hitBonus", "evasionBonus", "criticalBonus", "rearTargeting"]);
    const multiplierModifierKeys = new Set(["incomingPhysical", "incomingMagic", "outgoingPhysical", "outgoingMagic", "healing"]);
    const validateSkillEffect = (skill, effect, index) => {
      const source = `skills.${skill.id}.effects.${index}`;
      if (effect.type === "damage") {
        if (!["physical", "magic"].includes(effect.damageType)) errors.push(`${source}.damageType -> ${effect.damageType ?? "(未指定)"}`);
        if (!positiveNumber(effect.multiplier)) errors.push(`${source}.multiplier は0より大きい数で指定してください`);
        if (!Number.isInteger(effect.hits) || effect.hits < 1) errors.push(`${source}.hits は1以上の整数で指定してください`);
        if (!probability(effect.defensePenetration)) errors.push(`${source}.defensePenetration は0〜1で指定してください`);
        if (!probability(effect.criticalBonus)) errors.push(`${source}.criticalBonus は0〜1で指定してください`);
      } else if (effect.type === "heal") {
        if (!positiveNumber(effect.multiplier)) errors.push(`${source}.multiplier は0より大きい数で指定してください`);
        if (!["magicHealing", "maxHp", "hp", "attack", "magicAttack"].includes(effect.scalingStat)) errors.push(`${source}.scalingStat -> ${effect.scalingStat ?? "(未指定)"}`);
        if (!["self", "lowestHpAlly", "allAllies"].includes(effect.target)) errors.push(`${source}.target -> ${effect.target ?? "(未指定)"}`);
      } else if (effect.type === "guard" || effect.type === "rearProtection") {
        const value = effect.type === "guard" ? effect.damageMultiplier : effect.multiplier;
        if (!positiveNumber(value) || Number(value) > 1) errors.push(`${source}.${effect.type === "guard" ? "damageMultiplier" : "multiplier"} は0より大きく1以下で指定してください`);
      } else if (effect.type === "counter") {
        if (!probability(effect.chance)) errors.push(`${source}.chance は0〜1で指定してください`);
        if (!positiveNumber(effect.multiplier)) errors.push(`${source}.multiplier は0より大きい数で指定してください`);
      } else if (effect.type === "statMultiplier") {
        if (effect.target !== "party" || effect.stat !== "attack" || effect.stacking !== "highest" || !positiveNumber(effect.multiplier)) errors.push(`${source} のパーティ能力倍率が不正です`);
      } else if (effect.type === "combatModifier") {
        if (!effect.modifiers || typeof effect.modifiers !== "object" || !Object.keys(effect.modifiers).length) errors.push(`${source}.modifiers がありません`);
        Object.entries(effect.modifiers || {}).forEach(([key, value]) => {
          if (!modifierKeys.has(key)) errors.push(`${source}.modifiers.${key} は未対応です`);
          else if (!Number.isFinite(Number(value)) || (multiplierModifierKeys.has(key) && Number(value) <= 0)) errors.push(`${source}.modifiers.${key} が不正です`);
        });
      } else if (effect.type === "applyStatus") {
        if (!probability(effect.chance) || Number(effect.chance) <= 0) errors.push(`${source}.chance は0より大きく1以下で指定してください`);
        if (!Number.isInteger(effect.duration) || effect.duration < 1) errors.push(`${source}.duration は1以上の整数で指定してください`);
        if (effect.potency != null && (!Number.isFinite(Number(effect.potency)) || Number(effect.potency) < 0)) errors.push(`${source}.potency は0以上の数で指定してください`);
      } else if (effect.type === "cleanse") {
        if (!Number.isInteger(effect.count) || effect.count < 1) errors.push(`${source}.count は1以上の整数で指定してください`);
        if (effect.statusIds !== "all" && (!Array.isArray(effect.statusIds) || !effect.statusIds.length)) errors.push(`${source}.statusIds がありません`);
      } else if (effect.type === "slayer") {
        if (!positiveNumber(effect.value)) errors.push(`${source}.value は0より大きい数で指定してください`);
      } else if (effect.type === "acquisitionModifier") {
        if (!["gold", "experience", "qualityRate", "itemRate", "explorationTime"].includes(effect.metric)) errors.push(`${source}.metric -> ${effect.metric ?? "(未指定)"}`);
        if (!["multiplier", "flat"].includes(effect.operation)) errors.push(`${source}.operation -> ${effect.operation ?? "(未指定)"}`);
        if (!["party", "self"].includes(effect.scope)) errors.push(`${source}.scope -> ${effect.scope ?? "(未指定)"}`);
        if (!Number.isFinite(Number(effect.value)) || (effect.operation === "multiplier" && Number(effect.value) <= 0)) errors.push(`${source}.value が不正です`);
      }
    };
    Object.values(master.statusEffects).forEach(status => {
      if (!Number.isFinite(Number(status.cleansePriority)) || Number(status.cleansePriority) < 0) errors.push(`statusEffects.${status.id}.cleansePriority は0以上の数で指定してください`);
      if (!Number.isInteger(status.defaultDuration) || status.defaultDuration < 1) errors.push(`statusEffects.${status.id}.defaultDuration は1以上の整数で指定してください`);
    });
    Object.values(master.skills).forEach(skill => {
      requireRef(master.config.skillCategories, skill.category, `skills.${skill.id}.category`);
      if (!skill.activation || !["active", "passive", "reaction"].includes(skill.activation.type)) errors.push(`skills.${skill.id}.activation が不正です`);
      if (!skill.targeting || !skillTargetScopes.has(skill.targeting.scope)) errors.push(`skills.${skill.id}.targeting.scope -> ${skill.targeting?.scope ?? "(未指定)"}`);
      if (!Array.isArray(skill.effects) || !skill.effects.length) errors.push(`skills.${skill.id}.effects がありません`);
      (skill.effects || []).filter(effect => !skillEffectTypes.has(effect.type)).forEach(effect => errors.push(`skills.${skill.id}.effects.type -> ${effect.type ?? "(未指定)"}`));
      (skill.effects || []).filter(effect => passiveOnlyEffects.has(effect.type) && skill.activation?.type !== "passive").forEach(effect => errors.push(`skills.${skill.id}.${effect.type} はパッシブスキルにだけ設定できます`));
      if (skill.activation?.type === "active") {
        if (!Number.isInteger(skill.activation.cooldownTurns) || skill.activation.cooldownTurns < 1) errors.push(`skills.${skill.id}.activation.cooldownTurns は1以上の整数で指定してください`);
        const primaryEffects = primaryEffectsByCategory[skill.category];
        if (!primaryEffects || !(skill.effects || []).some(effect => primaryEffects.has(effect.type))) errors.push(`skills.${skill.id} は戦闘で実行できる主効果がありません`);
      }
      if (skill.activation?.type === "passive" && skill.category !== "passive") errors.push(`skills.${skill.id} の常時効果カテゴリが不正です`);
      if (skill.activation?.type === "reaction" && skill.category !== "reaction") errors.push(`skills.${skill.id} のリアクションカテゴリが不正です`);
      if (skill.activation?.type === "reaction") {
        if (!Number.isInteger(skill.activation.limitPerEncounter) || skill.activation.limitPerEncounter < 1) errors.push(`skills.${skill.id}.activation.limitPerEncounter は1以上の整数で指定してください`);
        if (skill.activation.trigger === "hpBelow") {
          if (!Number.isFinite(Number(skill.activation.threshold)) || Number(skill.activation.threshold) <= 0 || Number(skill.activation.threshold) > 1) errors.push(`skills.${skill.id}.activation.threshold は0より大きく1以下で指定してください`);
          if (!(skill.effects || []).some(effect => effect.type === "heal")) errors.push(`skills.${skill.id} のHP低下リアクションに回復効果がありません`);
        } else if (skill.activation.trigger === "statusApplied") {
          const statusIds = skill.activation.statusIds;
          if (statusIds !== "all" && (!Array.isArray(statusIds) || !statusIds.length)) errors.push(`skills.${skill.id}.activation.statusIds がありません`);
          if (Array.isArray(statusIds)) statusIds.forEach(statusId => requireRef(master.statusEffects, statusId, `skills.${skill.id}.activation.statusIds`));
          if (!(skill.effects || []).some(effect => effect.type === "cleanse")) errors.push(`skills.${skill.id} の状態異常リアクションに解除効果がありません`);
        } else errors.push(`skills.${skill.id}.activation.trigger -> ${skill.activation.trigger ?? "(未指定)"}`);
      }
      (skill.effects || []).forEach((effect, index) => {
        validateSkillEffect(skill, effect, index);
        if (effect.element) requireRef(master.elements, effect.element, `skills.${skill.id}.element`);
        if (effect.statusId) requireRef(master.statusEffects, effect.statusId, `skills.${skill.id}.statusId`);
        if (effect.familyId) requireRef(master.creatureFamilies, effect.familyId, `skills.${skill.id}.familyId`);
        if (Array.isArray(effect.statusIds)) effect.statusIds.forEach(statusId => requireRef(master.statusEffects, statusId, `skills.${skill.id}.statusIds`));
      });
    });

    Object.values(master.equipmentTypes).forEach(type => {
      const source = `equipmentTypes.${type.id}`;
      if (!["weapon", "armor"].includes(type.category)) errors.push(`${source}.category -> ${type.category ?? "(未指定)"}`);
      if (type.basicDamageType != null && !["physical", "magic"].includes(type.basicDamageType)) errors.push(`${source}.basicDamageType -> ${type.basicDamageType}`);
      ["name", "summary"].forEach(field => {
        if (typeof type[field] !== "string" || !type[field].trim()) errors.push(`${source}.${field} がありません`);
      });
    });
    const originMultiplierFields = ["hpMultiplier", "attackMultiplier", "defenseMultiplier", "weightMultiplier", "magicAttackMultiplier", "magicDefenseMultiplier", "magicHealingMultiplier", "skillPower", "healingPower"];
    const originBonusFields = ["speedBonus", "criticalBonus", "hitBonus", "evasionBonus"];
    const progressionLevels = { job: [10, 40, 70, 100], race: [1, 30, 60, 100], birth: [1, 20, 60, 100] };
    for (const [ownerType, owners] of Object.entries({ job: master.jobs, race: master.races, birth: master.births })) {
      Object.keys(master.relations.skillGrants[ownerType] || {}).forEach(ownerId => requireRef(owners, ownerId, `relations.skillGrants.${ownerType}.${ownerId}`));
      Object.keys(master.relations.equipmentAffinities[ownerType] || {}).forEach(ownerId => requireRef(owners, ownerId, `relations.equipmentAffinities.${ownerType}.${ownerId}`));
      Object.values(owners).forEach(owner => {
        const source = `${ownerType === "job" ? "jobs" : ownerType === "race" ? "races" : "births"}.${owner.id}`;
        ["name", "description"].forEach(field => {
          if (typeof owner[field] !== "string" || !owner[field].trim()) errors.push(`${source}.${field} がありません`);
        });
        if (owner.unlockAfter) requireRef(chapters, owner.unlockAfter, `${source}.unlockAfter`);
        originMultiplierFields.forEach(field => {
          if (owner[field] != null && (!Number.isFinite(Number(owner[field])) || Number(owner[field]) <= 0)) errors.push(`${source}.${field} は0より大きい数で指定してください`);
        });
        originBonusFields.forEach(field => {
          if (owner[field] != null && !Number.isFinite(Number(owner[field]))) errors.push(`${source}.${field} が不正です`);
        });
        Object.entries(owner.elementModifiers || {}).forEach(([elementId, multiplier]) => {
          requireRef(master.elements, elementId, `${source}.elementModifiers`);
          if (!Number.isFinite(Number(multiplier)) || Number(multiplier) <= 0) errors.push(`${source}.elementModifiers.${elementId} は0より大きい数で指定してください`);
        });
        Object.entries(owner.statusResistances || {}).forEach(([statusId, resistance]) => {
          requireRef(master.statusEffects, statusId, `${source}.statusResistances`);
          if (!Number.isFinite(Number(resistance)) || Number(resistance) < 0 || Number(resistance) > 1) errors.push(`${source}.statusResistances.${statusId} は0〜1で指定してください`);
        });
        if (ownerType === "job") {
          if (!Number.isFinite(Number(owner.speed)) || Number(owner.speed) < 1) errors.push(`${source}.speed は1以上の数で指定してください`);
          ["criticalRate", "evasionRate"].forEach(field => {
            if (!Number.isFinite(Number(owner[field])) || Number(owner[field]) < 0 || Number(owner[field]) > 1) errors.push(`${source}.${field} は0〜1で指定してください`);
          });
          if (!Number.isFinite(Number(owner.hitRate)) || Number(owner.hitRate) <= 0) errors.push(`${source}.hitRate は0より大きい数で指定してください`);
        }

        const grants = master.relations.skillGrants[ownerType]?.[owner.id];
        if (!Array.isArray(grants)) errors.push(`relations.skillGrants.${ownerType}.${owner.id} がありません`);
        else {
          const initial = grants.filter(grant => grant.initial), learned = grants.filter(grant => !grant.initial);
          if (initial.length !== 4) errors.push(`relations.skillGrants.${ownerType}.${owner.id} の初期スキルは4個にしてください`);
          if (initial.some(grant => grant.level !== 1)) errors.push(`relations.skillGrants.${ownerType}.${owner.id} の初期スキルはlevel 1にしてください`);
          if (learned.length !== progressionLevels[ownerType].length || learned.some((grant, index) => grant.level !== progressionLevels[ownerType][index])) errors.push(`relations.skillGrants.${ownerType}.${owner.id} の成長レベルが不正です`);
          if (new Set(grants.map(grant => grant.skillId)).size !== grants.length) errors.push(`relations.skillGrants.${ownerType}.${owner.id} に同じスキルが重複しています`);
          grants.forEach((grant, index) => {
            requireRef(master.skills, grant.skillId, `relations.skillGrants.${ownerType}.${owner.id}.${index}.skillId`);
            if (typeof grant.initial !== "boolean") errors.push(`relations.skillGrants.${ownerType}.${owner.id}.${index}.initial は真偽値で指定してください`);
            if (!Number.isInteger(grant.level) || grant.level < 1) errors.push(`relations.skillGrants.${ownerType}.${owner.id}.${index}.level は1以上の整数で指定してください`);
          });
        }

        const affinities = master.relations.equipmentAffinities[ownerType]?.[owner.id];
        if (!affinities || typeof affinities !== "object" || Array.isArray(affinities)) errors.push(`relations.equipmentAffinities.${ownerType}.${owner.id} がありません`);
        Object.entries(affinities || {}).forEach(([typeId, multiplier]) => {
          requireRef(master.equipmentTypes, typeId, `relations.equipmentAffinities.${ownerType}.${owner.id}`);
          if (!Number.isFinite(Number(multiplier)) || Number(multiplier) <= 0) errors.push(`relations.equipmentAffinities.${ownerType}.${owner.id}.${typeId} は0より大きい数で指定してください`);
        });
      });
    }

    if (!Number.isInteger(master.config.companions.rosterLimit) || master.config.companions.rosterLimit < Object.keys(master.companions).length) errors.push("config.companions.rosterLimit は定義済みNPC数以上の整数で指定してください");
    const companionBondReward = master.config.explorationEvents?.companionBondReward;
    if (!companionBondReward || !Number.isInteger(companionBondReward.quantity) || companionBondReward.quantity < 1) errors.push("config.explorationEvents.companionBondReward.quantity は1以上の整数で指定してください");
    requireRef(master.items, companionBondReward?.itemId, "config.explorationEvents.companionBondReward.itemId");
    if (master.items[companionBondReward?.itemId] && master.items[companionBondReward.itemId].type !== "material") errors.push("config.explorationEvents.companionBondReward.itemId は素材で指定してください");
    const rumorConfirmationReward = master.config.explorationEvents?.rumorConfirmationReward;
    if (!rumorConfirmationReward || !Number.isInteger(rumorConfirmationReward.quantity) || rumorConfirmationReward.quantity < 1) errors.push("config.explorationEvents.rumorConfirmationReward.quantity は1以上の整数で指定してください");
    requireRef(master.items, rumorConfirmationReward?.itemId, "config.explorationEvents.rumorConfirmationReward.itemId");
    if (master.items[rumorConfirmationReward?.itemId] && master.items[rumorConfirmationReward.itemId].type !== "material") errors.push("config.explorationEvents.rumorConfirmationReward.itemId は素材で指定してください");
    const routeEventIds = new Set();
    Object.entries(master.config.explorationEvents?.aptitudes || {}).forEach(([aptitudeId, aptitude]) => {
      const source = `config.explorationEvents.aptitudes.${aptitudeId}`;
      [["jobIds", master.jobs], ["raceIds", master.races], ["birthIds", master.births]].forEach(([field, table]) => {
        if (!Array.isArray(aptitude[field]) || !aptitude[field].length || new Set(aptitude[field]).size !== aptitude[field].length) errors.push(`${source}.${field} がありません`);
        (aptitude[field] || []).forEach(id => requireRef(table, id, `${source}.${field}`));
      });
      ["job", "race", "birth"].forEach(field => { if (!Number.isFinite(aptitude.bonuses?.[field]) || aptitude.bonuses[field] <= 0 || aptitude.bonuses[field] > 1) errors.push(`${source}.bonuses.${field} は0より大きい値で指定してください`); });
    });
    if (!Number.isInteger(master.config.explorationEvents?.routeMastery?.successes) || master.config.explorationEvents.routeMastery.successes < 1 || master.config.explorationEvents.routeMastery.successes > 20) errors.push("config.explorationEvents.routeMastery.successes が不正です");
    if (!Number.isFinite(master.config.explorationEvents?.routeMastery?.successChanceBonus) || master.config.explorationEvents.routeMastery.successChanceBonus <= 0 || master.config.explorationEvents.routeMastery.successChanceBonus > .25) errors.push("config.explorationEvents.routeMastery.successChanceBonus が不正です");
    if (!Number.isInteger(master.config.explorationEvents?.personalPractice?.successes) || master.config.explorationEvents.personalPractice.successes < 1 || master.config.explorationEvents.personalPractice.successes > 20) errors.push("config.explorationEvents.personalPractice.successes が不正です");
    if (!Number.isFinite(master.config.explorationEvents?.personalPractice?.successChanceBonus) || master.config.explorationEvents.personalPractice.successChanceBonus <= 0 || master.config.explorationEvents.personalPractice.successChanceBonus > .15) errors.push("config.explorationEvents.personalPractice.successChanceBonus が不正です");
    if (!Number.isFinite(master.config.explorationEvents?.rumorWeightMultiplier) || master.config.explorationEvents.rumorWeightMultiplier <= 1 || master.config.explorationEvents.rumorWeightMultiplier > 5) errors.push("config.explorationEvents.rumorWeightMultiplier は1より大きく5以下で指定してください");
    (master.config.explorationEvents?.routeEvents || []).forEach((event, index) => {
      const source = `config.explorationEvents.routeEvents.${index}`;
      if (typeof event.id !== "string" || !event.id.trim() || routeEventIds.has(event.id)) errors.push(`${source}.id が未指定または重複しています`);
      routeEventIds.add(event.id);
      if (typeof event.name !== "string" || !event.name.trim()) errors.push(`${source}.name がありません`);
      if (typeof event.recordLabel !== "string" || !event.recordLabel.trim()) errors.push(`${source}.recordLabel がありません`);
      if (!["secret", "camp", "hazard", "lore", "gather"].includes(event.kind)) errors.push(`${source}.kind -> ${event.kind ?? "(未指定)"}`);
      if (!master.config.explorationEvents?.aptitudes?.[event.aptitudeId]) errors.push(`${source}.aptitudeId -> ${event.aptitudeId ?? "(未指定)"}`);
      ["baseChance", "maximumChance"].forEach(field => { if (!Number.isFinite(event[field]) || event[field] < 0 || event[field] > 1) errors.push(`${source}.${field} は0〜1で指定してください`); });
      if (Number(event.maximumChance) <= Number(event.baseChance)) errors.push(`${source}.maximumChance はbaseChanceより大きくしてください`);
      ["successText", "failureText"].forEach(field => { if (typeof event[field] !== "string" || !event[field].trim()) errors.push(`${source}.${field} がありません`); });
      if (!event.effect || !["gold", "experience", "material", "recovery", "damage", "ward", "initiative"].includes(event.effect.type) || !["success", "failure"].includes(event.effect.on)) errors.push(`${source}.effect が不正です`);
      if (["gold", "experience"].includes(event.effect?.type) && (!Number.isFinite(event.effect.minimumRate) || !Number.isFinite(event.effect.maximumRate) || event.effect.minimumRate <= 0 || event.effect.maximumRate < event.effect.minimumRate)) errors.push(`${source}.effect の報酬範囲が不正です`);
      if (event.effect?.type === "material" && (!Number.isInteger(event.effect.minimumQuantity) || !Number.isInteger(event.effect.maximumQuantity) || event.effect.minimumQuantity < 1 || event.effect.maximumQuantity < event.effect.minimumQuantity)) errors.push(`${source}.effect の素材数が不正です`);
      if (["recovery", "damage", "ward", "initiative"].includes(event.effect?.type) && (!Number.isFinite(event.effect.rate) || event.effect.rate <= 0 || event.effect.rate > 1)) errors.push(`${source}.effect.rate は0より大きい1以下で指定してください`);
    });
    if (routeEventIds.size < 3) errors.push("config.explorationEvents.routeEvents は3種類以上必要です");
    Object.entries(master.config.explorationEvents?.environments || {}).forEach(([environmentId, environment]) => {
      const source = `config.explorationEvents.environments.${environmentId}.eventWeights`;
      if (!environment.eventWeights || typeof environment.eventWeights !== "object" || Array.isArray(environment.eventWeights)) errors.push(`${source} がありません`);
      else {
        if (new Set(Object.keys(environment.eventWeights)).size !== routeEventIds.size || [...routeEventIds].some(id => !Object.prototype.hasOwnProperty.call(environment.eventWeights, id))) errors.push(`${source} は全道中イベントを一度ずつ指定してください`);
        Object.entries(environment.eventWeights).forEach(([eventId, weight]) => {
          if (!routeEventIds.has(eventId) || !Number.isFinite(weight) || weight <= 0) errors.push(`${source}.${eventId} が不正です`);
        });
      }
      if (!Array.isArray(environment.rumors) || environment.rumors.length < 2 || environment.rumors.some(rumor => !rumor || typeof rumor !== "object" || !routeEventIds.has(rumor.eventId) || typeof rumor.text !== "string" || !rumor.text.trim() || rumor.text.includes("%"))) errors.push(`config.explorationEvents.environments.${environmentId}.rumors は道中イベントを参照し、確率を直接示さない2件以上の噂にしてください`);
    });
    if (!Number.isFinite(master.config.explorationEvents?.adventurerBondMomentChance) || master.config.explorationEvents.adventurerBondMomentChance <= 0 || master.config.explorationEvents.adventurerBondMomentChance > 1) errors.push("config.explorationEvents.adventurerBondMomentChance は0より大きく1以下で指定してください");
    const adventurerBondMoments = master.config.explorationEvents?.adventurerBondMoments;
    if (!Array.isArray(adventurerBondMoments) || adventurerBondMoments.length < 2) errors.push("config.explorationEvents.adventurerBondMoments は2種類以上必要です");
    const adventurerBondMomentIds = new Set();
    (adventurerBondMoments || []).forEach((moment, index) => {
      const source = `config.explorationEvents.adventurerBondMoments.${index}`;
      if (typeof moment.id !== "string" || !moment.id.trim() || adventurerBondMomentIds.has(moment.id)) errors.push(`${source}.id が未指定または重複しています`);
      adventurerBondMomentIds.add(moment.id);
      if (typeof moment.title !== "string" || !moment.title.trim()) errors.push(`${source}.title がありません`);
      if (!Number.isInteger(moment.minimumSharedSorties) || moment.minimumSharedSorties < 1) errors.push(`${source}.minimumSharedSorties が不正です`);
      if (typeof moment.text !== "string" || !moment.text.trim() || !moment.text.includes("{left}") || !moment.text.includes("{right}")) errors.push(`${source}.text には{left}と{right}が必要です`);
    });
    const companionMoments = master.config.explorationEvents?.companionMoments;
    if (!Array.isArray(companionMoments) || !companionMoments.length) errors.push("config.explorationEvents.companionMoments がありません");
    const companionMomentIds = new Set();
    (companionMoments || []).forEach((moment, index) => {
      const source = `config.explorationEvents.companionMoments.${index}`;
      if (typeof moment.id !== "string" || !moment.id.trim() || companionMomentIds.has(moment.id)) errors.push(`${source}.id が未指定または重複しています`);
      companionMomentIds.add(moment.id);
      if (typeof moment.title !== "string" || !moment.title.trim()) errors.push(`${source}.title がありません`);
      if (!Array.isArray(moment.companionIds) || !moment.companionIds.length || moment.companionIds.length > 2 || new Set(moment.companionIds).size !== moment.companionIds.length) errors.push(`${source}.companionIds が空、不正、または重複しています`);
      (moment.companionIds || []).forEach(companionId => requireRef(master.companions, companionId, `${source}.companionIds`));
      if (moment.requiredStages != null && (!moment.requiredStages || typeof moment.requiredStages !== "object" || Array.isArray(moment.requiredStages))) errors.push(`${source}.requiredStages が不正です`);
      Object.entries(moment.requiredStages || {}).forEach(([companionId, stageId]) => {
        if (!(moment.companionIds || []).includes(companionId)) errors.push(`${source}.requiredStages.${companionId} は登場人物に含まれていません`);
        requireRef(master.companions, companionId, `${source}.requiredStages`);
        requireRef(master.relations.companionProgressions?.[companionId]?.stages, stageId, `${source}.requiredStages.${companionId}`);
      });
      if (!Array.isArray(moment.lines) || !moment.lines.length || moment.lines.some(line => typeof line !== "string" || !line.trim())) errors.push(`${source}.lines がありません`);
    });
    Object.keys(master.relations.companionSkillGrants).forEach(companionId => requireRef(master.companions, companionId, `relations.companionSkillGrants.${companionId}`));
    Object.keys(master.relations.companionProgressions).forEach(companionId => requireRef(master.companions, companionId, `relations.companionProgressions.${companionId}`));
    Object.values(master.companions).forEach(companion => {
      const source = `companions.${companion.id}`;
      requireRef(master.jobs, companion.jobId, `companions.${companion.id}.jobId`);
      requireRef(master.races, companion.raceId, `companions.${companion.id}.raceId`);
      requireRef(master.births, companion.birthId, `companions.${companion.id}.birthId`);
      requireRef(master.portraits, companion.portraitId, `companions.${companion.id}.portraitId`);
      (companion.previousPortraitIds || []).forEach(portraitId => requireRef(master.portraits, portraitId, `companions.${companion.id}.previousPortraitIds`));
      ["name", "title", "description"].forEach(field => {
        if (typeof companion[field] !== "string" || !companion[field].trim()) errors.push(`${source}.${field} がありません`);
      });
      if (!Number.isInteger(companion.initialLevel) || companion.initialLevel < 1) errors.push(`${source}.initialLevel は1以上の整数で指定してください`);
      ["hp", "attack", "defense", "magicAttack", "magicDefense", "magicHealing"].forEach(stat => {
        if (!Number.isFinite(Number(companion.baseStats?.[stat])) || Number(companion.baseStats[stat]) <= 0) errors.push(`${source}.baseStats.${stat} は0より大きい数で指定してください`);
      });
      const personalGrants = master.relations.companionSkillGrants[companion.id];
      if (!Array.isArray(personalGrants) || !personalGrants.length) errors.push(`relations.companionSkillGrants.${companion.id} がありません`);
      if (new Set((personalGrants || []).map(grant => grant.skillId)).size !== (personalGrants || []).length) errors.push(`relations.companionSkillGrants.${companion.id} に同じスキルが重複しています`);
      (personalGrants || []).forEach((grant, index) => {
        requireRef(master.skills, grant.skillId, `relations.companionSkillGrants.${companion.id}.${index}.skillId`);
        if (grant.initial !== true || grant.level !== 1) errors.push(`relations.companionSkillGrants.${companion.id}.${index} はlevel 1の初期スキルにしてください`);
      });
      const progression = master.relations.companionProgressions[companion.id];
      if (progression && progression.companionId !== companion.id) errors.push(`relations.companionProgressions.${companion.id}.companionId -> ${progression.companionId ?? "(未指定)"}`);
      if (!progression?.stages?.[progression.initialStageId]) errors.push(`relations.companionProgressions.${companion.id}.initialStageId -> ${progression?.initialStageId ?? "(未指定)"}`);
      Object.entries(progression?.stages || {}).forEach(([stageId, stage]) => {
        const stageSource = `relations.companionProgressions.${companion.id}.${stageId}`;
        if (stage.id !== stageId) errors.push(`${stageSource}.id -> ${stage.id ?? "(未指定)"}`);
        if (typeof stage.name !== "string" || !stage.name.trim()) errors.push(`${stageSource}.name がありません`);
        if (!Array.isArray(stage.addSkillIds)) errors.push(`${stageSource}.addSkillIds は配列で指定してください`);
        if (!stage.replacements || typeof stage.replacements !== "object" || Array.isArray(stage.replacements)) errors.push(`${stageSource}.replacements が不正です`);
        if (stage.previousStageId) requireRef(progression.stages, stage.previousStageId, `relations.companionProgressions.${companion.id}.${stage.id}.previousStageId`);
        (stage.addSkillIds || []).forEach(skillId => requireRef(master.skills, skillId, `relations.companionProgressions.${companion.id}.${stage.id}.addSkillIds`));
        Object.entries(stage.replacements || {}).forEach(([fromId, toId]) => {
          requireRef(master.skills, fromId, `relations.companionProgressions.${companion.id}.${stage.id}.replacements`);
          requireRef(master.skills, toId, `relations.companionProgressions.${companion.id}.${stage.id}.replacements`);
          if (fromId === toId) errors.push(`${stageSource}.replacements.${fromId} は別のスキルへ置換してください`);
        });
      });
      Object.keys(progression?.stages || {}).forEach(stageId => {
        let currentId = stageId, steps = 0;
        while (currentId && steps <= Object.keys(progression.stages).length) {
          if (currentId === progression.initialStageId) return;
          currentId = progression.stages[currentId]?.previousStageId;
          steps += 1;
        }
        errors.push(`relations.companionProgressions.${companion.id}.${stageId} が初期段階へ到達しません`);
      });
    });

    Object.keys(master.relations.companionStoryArcs).forEach(arcId => {
      if (master.relations.companionStoryArcs[arcId]?.id !== arcId) errors.push(`relations.companionStoryArcs.${arcId}.id が一致しません`);
    });
    Object.values(master.relations.companionStoryArcs).forEach(arc => {
      requireRef(master.companions, arc.companionId, `relations.companionStoryArcs.${arc.id}.companionId`);
      requireRef(chapters, arc.joinChapterId, `relations.companionStoryArcs.${arc.id}.joinChapterId`);
      if (typeof arc.theme !== "string" || !arc.theme.trim()) errors.push(`relations.companionStoryArcs.${arc.id}.theme がありません`);
      if (!Array.isArray(arc.featuredChapterIds) || !arc.featuredChapterIds.length || new Set(arc.featuredChapterIds).size !== arc.featuredChapterIds.length) errors.push(`relations.companionStoryArcs.${arc.id}.featuredChapterIds が空または重複しています`);
      (arc.featuredChapterIds || []).forEach(chapterId => requireRef(chapters, chapterId, `relations.companionStoryArcs.${arc.id}.featuredChapterIds`));
      const hasJoinTrigger = master.relations.storyTriggers.some(trigger => trigger.when?.type === "chapterActive" && trigger.when.chapterId === arc.joinChapterId && (trigger.effects || []).some(effect => effect.type === "joinCompanion" && effect.companionId === arc.companionId));
      if (!hasJoinTrigger) errors.push(`relations.companionStoryArcs.${arc.id} の加入イベントがありません`);
    });
    Object.entries(master.relations.storySceneOverlays).forEach(([sceneId, overlay]) => {
      requireRef(master.storyScenes, sceneId, `relations.storySceneOverlays.${sceneId}`);
      if (overlay.protagonistId) requireRef(master.companions, overlay.protagonistId, `relations.storySceneOverlays.${sceneId}.protagonistId`);
      (overlay.castIds || []).forEach(companionId => requireRef(master.companions, companionId, `relations.storySceneOverlays.${sceneId}.castIds`));
      if (overlay.castIds && (!Array.isArray(overlay.castIds) || new Set(overlay.castIds).size !== overlay.castIds.length)) errors.push(`relations.storySceneOverlays.${sceneId}.castIds が不正または重複しています`);
      if (overlay.protagonistId && Array.isArray(overlay.castIds) && !overlay.castIds.includes(overlay.protagonistId)) errors.push(`relations.storySceneOverlays.${sceneId}.castIds に主人公が含まれていません`);
      ["name", "text"].forEach(field => {
        if (overlay[field] != null && (typeof overlay[field] !== "string" || !overlay[field].trim())) errors.push(`relations.storySceneOverlays.${sceneId}.${field} が不正です`);
      });
    });
    Object.entries(master.relations.storySceneScripts).forEach(([sceneId, script]) => {
      const source = `relations.storySceneScripts.${sceneId}`;
      requireRef(master.storyScenes, sceneId, source);
      if (script?.sceneId !== sceneId) errors.push(`${source}.sceneId が一致しません`);
      if (!Array.isArray(script?.blocks) || script.blocks.length < 3) {
        errors.push(`${source}.blocks は3件以上必要です`);
        return;
      }
      script.blocks.forEach((block, index) => {
        const blockSource = `${source}.blocks.${index}`;
        if (!["setting", "narration", "dialogue"].includes(block?.kind)) errors.push(`${blockSource}.kind -> ${block?.kind ?? "(未指定)"}`);
        if (typeof block?.text !== "string" || !block.text.trim()) errors.push(`${blockSource}.text がありません`);
        if (block?.kind !== "dialogue") return;
        if (typeof block.speakerId !== "string" || !block.speakerId.trim()) errors.push(`${blockSource}.speakerId がありません`);
        if (typeof block.speakerName !== "string" || !block.speakerName.trim()) errors.push(`${blockSource}.speakerName がありません`);
        if (typeof block.speakerRole !== "string" || !block.speakerRole.trim()) errors.push(`${blockSource}.speakerRole がありません`);
      });
    });
    Object.keys(master.storyScenes).forEach(sceneId => {
      if (!master.relations.storySceneScripts[sceneId]) errors.push(`relations.storySceneScripts.${sceneId} がありません`);
    });

    const storyTriggerTypes = new Set(["chapterActive", "chapterCompleted", "dungeonOpened", "dungeonDiscovered", "dungeonCleared"]);
    master.relations.storyTriggers.forEach(trigger => {
      const source = `relations.storyTriggers.${trigger.id}`;
      if (!storyTriggerTypes.has(trigger.when?.type)) errors.push(`${source}.when.type -> ${trigger.when?.type ?? "(未指定)"}`);
      if (trigger.when?.type?.startsWith("chapter")) requireRef(chapters, trigger.when.chapterId, `${source}.when.chapterId`);
      if (trigger.when?.type?.startsWith("dungeon")) requireRef(master.dungeons, trigger.when.dungeonId, `${source}.when.dungeonId`);
      if (!Array.isArray(trigger.effects) || !trigger.effects.length) errors.push(`${source}.effects がありません`);
      (trigger.effects || []).forEach((effect, index) => {
        const effectSource = `${source}.effects.${index}`;
        if (!["joinCompanion", "advanceCompanion"].includes(effect.type)) errors.push(`${effectSource}.type -> ${effect.type ?? "(未指定)"}`);
        requireRef(master.companions, effect.companionId, `${effectSource}.companionId`);
        if (effect.type === "advanceCompanion" && effect.companionId) requireRef(master.relations.companionProgressions[effect.companionId]?.stages, effect.stageId, `${effectSource}.stageId`);
      });
    });
    Object.keys(master.relations.dungeonPartyRestrictions).forEach(dungeonId => requireRef(master.dungeons, dungeonId, `relations.dungeonPartyRestrictions.${dungeonId}`));
    Object.keys(master.relations.dungeonStoryLinks).forEach(dungeonId => requireRef(master.dungeons, dungeonId, `relations.dungeonStoryLinks.${dungeonId}`));

    Object.values(master.config.classChanges).forEach((rule, index) => requireRef(master.skills, rule.masterSkillId, `config.classChanges.${index}.masterSkillId`));
    const facilityConfig = master.config.facilities;
    const facilityOrder = facilityConfig.order || [], facilityTrackOrder = facilityConfig.trackOrder || [];
    if (new Set(facilityOrder).size !== facilityOrder.length) errors.push("config.facilities.order に重複があります");
    if (new Set(facilityTrackOrder).size !== facilityTrackOrder.length) errors.push("config.facilities.trackOrder に重複があります");
    ["production", "storage", "speed"].forEach(trackId => {
      if (!facilityTrackOrder.includes(trackId)) errors.push(`config.facilities.trackOrder に${trackId}がありません`);
    });
    Object.keys(master.facilities).forEach(facilityId => {
      if (!facilityOrder.includes(facilityId)) errors.push(`config.facilities.order に${facilityId}がありません`);
    });
    Object.keys(facilityConfig.tracks || {}).forEach(trackId => {
      if (!facilityTrackOrder.includes(trackId)) errors.push(`config.facilities.tracks.${trackId} がtrackOrderにありません`);
    });
    facilityTrackOrder.forEach(trackId => {
      const track = facilityConfig.tracks?.[trackId];
      if (!track) errors.push(`config.facilities.tracks.${trackId} がありません`);
      ["name", "description"].forEach(field => {
        if (track && (typeof track[field] !== "string" || !track[field].trim())) errors.push(`config.facilities.tracks.${trackId}.${field} がありません`);
      });
    });
    if (!Number.isInteger(facilityConfig.upgradeCapacity?.base) || facilityConfig.upgradeCapacity.base < 0) errors.push("config.facilities.upgradeCapacity.base は0以上の整数で指定してください");
    if (!Number.isInteger(facilityConfig.upgradeCapacity?.perCompletedMainChapter) || facilityConfig.upgradeCapacity.perCompletedMainChapter < 1) errors.push("config.facilities.upgradeCapacity.perCompletedMainChapter は1以上の整数で指定してください");
    let maximumFacilityLevel = 1;
    facilityOrder.forEach(facilityId => {
      requireRef(master.facilities, facilityId, "config.facilities.order");
      const facility = master.facilities[facilityId];
      if (!facility) return;
      const source = `facilities.${facilityId}`;
      if (facility.id !== facilityId) errors.push(`${source}.id が一致しません`);
      ["name", "description"].forEach(field => {
        if (typeof facility[field] !== "string" || !facility[field].trim()) errors.push(`${source}.${field} がありません`);
      });
      if (facility.unlockAfter) requireRef(chapters, facility.unlockAfter, `${source}.unlockAfter`);
      if (!Number.isFinite(Number(facility.goldCostMultiplier)) || Number(facility.goldCostMultiplier) <= 0) errors.push(`${source}.goldCostMultiplier は0より大きい数で指定してください`);
      Object.keys(facility.upgrades || {}).forEach(trackId => {
        if (!facilityTrackOrder.includes(trackId)) errors.push(`${source}.upgrades.${trackId} は未定義の強化系統です`);
      });
      facilityTrackOrder.forEach(trackId => {
        const levels = facility.upgrades?.[trackId], trackSource = `${source}.upgrades.${trackId}`;
        if (!Array.isArray(levels) || !levels.length) {
          errors.push(`${trackSource} がありません`);
          return;
        }
        maximumFacilityLevel = Math.max(maximumFacilityLevel, levels.length);
        levels.forEach((level, index) => {
          const levelSource = `${trackSource}.${index}`;
          if (index === 0 && level.cost != null) errors.push(`${levelSource}.cost は初期レベルでは不要です`);
          if (index > 0 && (!level.cost || !Object.keys(level.cost).length)) errors.push(`${levelSource}.cost がありません`);
          Object.entries(level.cost || {}).forEach(([itemId, quantity]) => {
            requireRef(master.items, itemId, `${levelSource}.cost`);
            if (master.items[itemId] && master.items[itemId].type !== "material") errors.push(`${levelSource}.cost.${itemId} は素材ではありません`);
            if (!Number.isInteger(quantity) || quantity < 1) errors.push(`${levelSource}.cost.${itemId} は1以上の整数で指定してください`);
          });
        });
      });
      (facility.upgrades.production || []).forEach((level, index) => {
        const levelSource = `${source}.upgrades.production.${index}`;
        const rewards = level.rewards || {};
        if (rewards.gold != null && (!Number.isFinite(Number(rewards.gold)) || Number(rewards.gold) < 0)) errors.push(`${levelSource}.rewards.gold は0以上の数で指定してください`);
        Object.entries(rewards.materials || {}).forEach(([itemId, quantity]) => {
          requireRef(master.items, itemId, `${levelSource}.rewards.materials`);
          if (master.items[itemId] && master.items[itemId].type !== "material") errors.push(`${levelSource}.rewards.materials.${itemId} は素材ではありません`);
          if (!Number.isInteger(quantity) || quantity < 1) errors.push(`${levelSource}.rewards.materials.${itemId} は1以上の整数で指定してください`);
        });
        if (!(Number(rewards.gold) > 0) && !Object.keys(rewards.materials || {}).length) errors.push(`${levelSource}.rewards に生産物がありません`);
        ["periodicRewards", "chanceRewards"].forEach(rewardType => {
          const rewardIds = new Set();
          (level[rewardType] || []).forEach((reward, rewardIndex) => {
            const rewardSource = `${levelSource}.${rewardType}.${rewardIndex}`;
            if (!reward.id || rewardIds.has(reward.id)) errors.push(`${rewardSource}.id が未指定または重複しています`);
            rewardIds.add(reward.id);
            requireRef(master.items, reward.itemId, `${rewardSource}.itemId`);
            if (master.items[reward.itemId] && master.items[reward.itemId].type !== "material") errors.push(`${rewardSource}.itemId は素材ではありません`);
            if (!Number.isInteger(reward.quantity) || reward.quantity < 1) errors.push(`${rewardSource}.quantity は1以上の整数で指定してください`);
            if (rewardType === "periodicRewards" && (!Number.isInteger(reward.everyCycles) || reward.everyCycles < 1)) errors.push(`${rewardSource}.everyCycles は1以上の整数で指定してください`);
            if (rewardType === "chanceRewards" && (!Number.isFinite(Number(reward.chance)) || reward.chance <= 0 || reward.chance >= 1)) errors.push(`${rewardSource}.chance は0より大きく1未満で指定してください`);
          });
        });
      });
      (facility.upgrades.storage || []).forEach((level, index, levels) => {
        if (!Number.isInteger(level.duration) || (index === 0 ? level.duration !== 60 * 60 * 1000 : level.duration <= levels[index - 1].duration)) errors.push(`${source}.upgrades.storage.${index}.duration は1時間開始の昇順で指定してください`);
      });
      (facility.upgrades.speed || []).forEach((level, index) => {
        const divisor = index + 1, expected = Math.floor(60 * 60 * 1000 / divisor);
        if (level.divisor !== divisor || level.interval !== expected) errors.push(`${source}.upgrades.speed.${index} は1時間÷Lv.${divisor}で指定してください`);
      });
    });
    let previousFacilityGold = 0;
    for (let level = 2; level <= maximumFacilityLevel; level += 1) {
      const value = facilityConfig.upgradeGoldByTargetLevel?.[level];
      if (!Number.isFinite(Number(value)) || Number(value) <= previousFacilityGold) errors.push(`config.facilities.upgradeGoldByTargetLevel.${level} は前段階より高い正数で指定してください`);
      previousFacilityGold = Number(value) || previousFacilityGold;
    }
    return errors;
  });
})();
