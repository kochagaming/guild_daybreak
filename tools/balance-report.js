"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function loadGame() {
  const storage = new Map();
  const window = {};
  const context = vm.createContext({
    window, console, Date, Math, Blob, setTimeout, clearTimeout,
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key)
    }
  });
  window.window = window;
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const scripts = Array.from(html.matchAll(/src="([^"]+\.js)"/g), match => match[1])
    .filter(file => file !== "js/ui.js" && file !== "js/main.js" && !file.startsWith("js/ui/"));
  scripts.forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file }));
  return window;
}

const profileDefinitions = {
  balanced: {
    name: "均衡型",
    roles: ["tank", "physical", "healer", "magic", "ranged", "support"]
  },
  physical: {
    name: "物理型",
    roles: ["tank", "physical", "healer", "physical", "fast", "ranged"]
  },
  magic: {
    name: "魔法型",
    roles: ["tank", "healer", "support", "magic", "magic", "magic"]
  },
  no_healer: {
    name: "回復なし",
    roles: ["tank", "physical", "fast", "magic", "ranged", "physical"]
  }
};

const profileRolesBySize = {
  balanced: {
    3: ["tank", "physical", "healer"],
    4: ["tank", "physical", "healer", "magic"],
    5: ["tank", "physical", "healer", "magic", "ranged"],
    6: profileDefinitions.balanced.roles
  },
  physical: {
    3: ["tank", "physical", "healer"],
    4: ["tank", "physical", "healer", "physical"],
    5: ["tank", "physical", "healer", "physical", "ranged"],
    6: profileDefinitions.physical.roles
  },
  magic: {
    3: ["tank", "healer", "magic"],
    4: ["tank", "healer", "magic", "magic"],
    5: ["tank", "healer", "support", "magic", "magic"],
    6: profileDefinitions.magic.roles
  },
  no_healer: {
    3: ["tank", "physical", "fast"],
    4: ["tank", "physical", "fast", "magic"],
    5: ["tank", "physical", "fast", "ranged", "magic"],
    6: ["tank", "physical", "physical", "fast", "ranged", "magic"]
  }
};

function rolesForProfile(profileId, size) {
  const profile = profileDefinitions[profileId];
  if (!profile) throw new Error(`Unknown profile: ${profileId}`);
  return (profileRolesBySize[profileId]?.[size] || profile.roles.slice(0, size)).slice(0, size);
}

const roleDefinitions = {
  tank: { jobs: ["knight", "warrior"], weaponTypes: ["sword"], armorTypes: ["heavy", "shield", "gauntlet"], rates: { attack: 100, technique: 45, spell: 0, healing: 10 } },
  physical: { jobs: ["samurai", "berserker", "warrior"], weaponTypes: ["katana", "sword", "gauntlet"], armorTypes: ["gauntlet", "heavy", "leather"], rates: { attack: 100, technique: 40, spell: 0, healing: 5 } },
  fast: { jobs: ["ninja", "thief", "monk"], weaponTypes: ["rapier", "bow", "sword"], armorTypes: ["leather", "gauntlet", "cloth"], rates: { attack: 100, technique: 40, spell: 5, healing: 0 } },
  ranged: { jobs: ["ranger", "thief"], weaponTypes: ["bow", "rapier"], armorTypes: ["leather", "gauntlet"], rates: { attack: 100, technique: 40, spell: 0, healing: 5 } },
  magic: { jobs: ["hexer", "mage", "summoner"], weaponTypes: ["staff"], armorTypes: ["cloth", "leather"], rates: { attack: 100, technique: 5, spell: 80, healing: 5 } },
  healer: { jobs: ["cleric", "druid", "bard", "summoner"], weaponTypes: ["staff"], armorTypes: ["cloth", "leather"], rates: { attack: 100, technique: 5, spell: 5, healing: 80 } },
  support: { jobs: ["druid", "bard", "cleric", "mage"], weaponTypes: ["staff", "bow"], armorTypes: ["cloth", "leather"], rates: { attack: 100, technique: 10, spell: 25, healing: 55 } }
};

function chapterOrder(game, chapterId) {
  return game.GameData.storyChapters.find(chapter => chapter.id === chapterId)?.order ?? Number.MAX_SAFE_INTEGER;
}

function availableJob(game, jobId, order) {
  const job = game.GameData.jobs[jobId];
  return job && (!job.unlockAfter || chapterOrder(game, job.unlockAfter) < order);
}

function memberLimit(game, order) {
  const completed = game.GameData.storyChapters.filter(chapter => chapter.order < order).map(chapter => chapter.id);
  return game.Party.memberLimit(completed);
}

function itemAvailable(game, item, order) {
  if (!["weapon", "armor"].includes(item.type) || item.unique || item.dropOnly) return false;
  if (!item.craftOnly) return true;
  const recipe = game.GameData.recipes.find(entry => entry.resultId === item.id);
  return Boolean(recipe && (!recipe.unlockAfter || chapterOrder(game, recipe.unlockAfter) < order));
}

function dungeonThreatProfile(game, dungeon) {
  const monsterIds = new Set((dungeon.encounters || []).flatMap(encounter => encounter.groups.flat(2)));
  const families = new Set(), statuses = new Set();
  monsterIds.forEach(id => {
    game.CreatureFamilies.familyIdsForMonster(id).forEach(familyId => families.add(familyId));
    const statusId = game.GameData.monsters[id]?.statusAttack?.statusId;
    if (statusId) statuses.add(statusId);
  });
  return { families, statuses };
}

function counterScore(game, item, threats) {
  return (item.skillIds || []).reduce((total, skillId) => total + (game.GameData.equipmentSkills[skillId]?.effects || []).reduce((score, effect) => {
    if (effect.type === "slayer" && threats.families.has(effect.familyId)) return score + Math.max(0, effect.value - 1) * 500;
    if (effect.type === "statusResistance" && threats.statuses.has(effect.statusId)) return score + effect.value * 180;
    return score;
  }, 0), 0);
}

function equipmentScore(game, item, role, threats) {
  const physical = (item.attack || 0) * 3 + (item.attackCount || 0) * 18 + (item.hitRate || 0) * 100 + (item.speed || 0) * 2;
  const magic = (item.magicAttack || 0) * 3 + (item.magicHealing || 0) * 2.5;
  const defense = (item.defense || 0) * 2.2 + (item.magicDefense || 0) * 1.8 + (item.hp || 0) * .35 + (item.evasionRate || 0) * 90;
  const counter = counterScore(game, item, threats);
  if (["magic", "support"].includes(role)) return magic + defense * .65 + counter;
  if (role === "healer") return (item.magicHealing || 0) * 4 + (item.magicDefense || 0) * 2 + (item.hp || 0) * .4 + counter;
  if (role === "tank") return defense * 1.8 + physical * .35 + counter;
  return physical + defense * .55 + counter;
}

function enhancementLevel(game, order, mode = "none") {
  const maximum = (game.GameData.config.upgrades?.limits || []).reduce((value, entry) => chapterOrder(game, entry.chapterId) < order ? Math.max(value, entry.maximum) : value, 0);
  if (mode === "max") return maximum;
  if (mode === "half") return Math.ceil(maximum / 2);
  if (mode === "quarter") return Math.ceil(maximum / 4);
  return 0;
}

function progressionPreparation(order) {
  return {
    quality: order > 15 ? "familiar" : order >= 9 ? "wellmade" : "standard",
    enhancement: order >= 5 ? "quarter" : "none"
  };
}

function makeInstance(templateId, index, upgradeLevel = 0, qualityId = "standard") {
  return { id: `fixture-${templateId}-${index}`, templateId, qualityId, ultraRareTitleId: null, upgradeLevel, modifiers: { hp: 0, attack: 0, defense: 0 }, source: "balance" };
}

function selectEquipment(game, character, roleId, order, dungeon, fixtureOptions = {}) {
  const role = roleDefinitions[roleId];
  const threats = dungeonThreatProfile(game, dungeon);
  const maximumTier = Math.max(1, order);
  const candidates = Object.values(game.GameData.items).filter(item => itemAvailable(game, item, order) && (item.tier || 1) <= maximumTier)
    .filter(item => item.type === "weapon" ? role.weaponTypes.includes(item.weaponType) : role.armorTypes.includes(item.armorType))
    .sort((a, b) => (b.tier || 0) - (a.tier || 0) || equipmentScore(game, b, roleId, threats) - equipmentScore(game, a, roleId, threats));
  const weapons = candidates.filter(item => item.type === "weapon");
  const armor = candidates.filter(item => item.type === "armor");
  const pool = [weapons[0], armor[0], armor[1] || armor[0], weapons[1] || weapons[0]].filter(Boolean);
  if (!pool.length) return [];
  const targetCount = Math.max(1, Math.round(game.Characters.equipmentCapacityAtLevel(character.level)));
  const maximumWeight = game.Characters.maxWeight(character);
  const preparation = fixtureOptions.preparation === "progression" ? progressionPreparation(order) : fixtureOptions;
  const upgradeLevel = enhancementLevel(game, order, preparation.enhancement);
  const selected = [];
  for (let index = 0; index < targetCount; index += 1) {
    let added = false;
    for (let offset = 0; offset < pool.length; offset += 1) {
      const item = pool[(index + offset) % pool.length];
      const instance = makeInstance(item.id, index, upgradeLevel, preparation.quality || "standard");
      const weight = game.Items.effects(instance).weight;
      const used = selected.reduce((sum, entry) => sum + game.Items.effects(entry).weight, 0);
      if (used + weight <= maximumWeight + 1e-9) { selected.push(instance); added = true; break; }
    }
    if (!added) break;
  }
  return selected;
}

function weaponRange(game, equipment) {
  const ranges = new Set(equipment.map(instance => game.GameData.items[instance.templateId]).filter(item => item.type === "weapon").map(item => item.range));
  return ranges.size > 1 ? "mixed" : ranges.has("ranged") ? "ranged" : "melee";
}

function buildMember(game, roleId, level, order, position, profileId, dungeon, fixtureOptions = {}) {
  const role = roleDefinitions[roleId];
  const jobId = role.jobs.find(id => availableJob(game, id, order)) || "warrior";
  const character = {
    id: `${profileId}-${position}`, name: `${profileDefinitions[profileId].name}${position + 1}`, jobId, raceId: "human", birthId: "common",
    level, exp: 0, base: { hp: 52, attack: 10, defense: 8, magicAttack: 10, magicDefense: 8, magicHealing: 10 }, equipment: [], career: null
  };
  const equipment = selectEquipment(game, character, roleId, order, dungeon, fixtureOptions);
  const templates = equipment.map(instance => game.GameData.items[instance.templateId]);
  return {
    id: character.id, name: character.name, jobId, raceId: character.raceId, level, position,
    familyIds: game.CreatureFamilies.familyIdsForRace(character.raceId), actionRates: role.rates,
    weaponRange: weaponRange(game, equipment),
    basicDamageType: game.Characters.basicDamageType(character, equipment),
    skillIds: game.Characters.learnedSkills(character).map(skill => skill.id),
    equipmentSkillIds: [...new Set(equipment.flatMap(instance => game.EquipmentSkills.ids(instance)))],
    specialEquipment: [...new Set(templates.filter(item => item.effectDescription).map(item => item.id))],
    stats: game.Characters.stats(character, equipment),
    fixture: { role: roleId, equipment: templates.map(item => item.id), qualityId: equipment[0]?.qualityId || "standard", upgradeLevel: equipment[0]?.upgradeLevel || 0, weight: equipment.reduce((sum, instance) => sum + game.Items.effects(instance).weight, 0), maximumWeight: game.Characters.maxWeight(character) }
  };
}

function buildParty(game, profileId, dungeon, fixtureOptions = {}) {
  const chapter = game.GameData.storyChapters.find(entry => entry.id === dungeon.chapterId);
  const order = chapter?.order ?? 0;
  const level = dungeon.recommendedLevel || chapter?.recommendedLevelRange?.[1] || 1;
  const size = memberLimit(game, order);
  return rolesForProfile(profileId, size).map((role, position) => buildMember(game, role, level, order, position, profileId, dungeon, fixtureOptions));
}

function roundCount(log) {
  const rounds = new Map();
  log.filter(entry => entry.kind === "round").forEach(entry => rounds.set(entry.encounter, Math.max(rounds.get(entry.encounter) || 0, entry.round)));
  return Array.from(rounds.values()).reduce((sum, value) => sum + value, 0);
}

function average(total, runs, digits = 1) {
  const scale = 10 ** digits;
  return Math.round(total / runs * scale) / scale;
}

const causeLabels = {
  annihilation: "全滅", timeout: "長期戦", burst: "予告大技", rear: "後列崩壊", healingDeficit: "回復不足", accuracy: "命中不足"
};

function defeatCauses(result) {
  const text = (result.defeatFacts || []).join(" ");
  return [
    ["annihilation", text.includes("全員が戦闘不能")], ["timeout", text.includes("30ターン")],
    ["burst", text.includes("全体大技")], ["rear", text.includes("後列")],
    ["healingDeficit", text.includes("総回復量は0") || text.includes("回復量を上回った")],
    ["accuracy", text.includes("命中") && text.includes("回避")]
  ].filter(([, matched]) => matched).map(([id]) => id);
}

function simulate(game, dungeon, profileId, runs, difficultyId, fixtureOptions = {}) {
  const variant = game.DungeonDifficulty ? game.DungeonDifficulty.variant(dungeon, difficultyId) : dungeon;
  const partySnapshot = buildParty(game, profileId, dungeon, fixtureOptions);
  const totals = { wins: 0, hp: 0, encounters: 0, rounds: 0, gold: 0, exp: 0, knockouts: 0, damage: 0, healing: 0, statuses: 0, resisted: 0, timeouts: 0, attempts: 0, hits: 0, burstDamage: 0, burstKnockouts: 0, guardedBurstHits: 0, unguardedBurstHits: 0, rearDamage: 0, rearKnockouts: 0, statusDamage: 0 };
  const failures = { encounters: {}, causes: {}, roles: {}, positions: {} };
  for (let run = 1; run <= runs; run += 1) {
    const result = game.Battle.resolve({ seed: run * 104729 + dungeon.orderInChapter * 1009, timeMultiplier: 1, partyIds: [], partySnapshot }, variant);
    totals.wins += Number(result.success);
    totals.encounters += result.encountersCleared;
    totals.rounds += roundCount(result.battleLog);
    totals.gold += result.gold;
    totals.exp += result.exp;
    totals.knockouts += partySnapshot.length - result.survivors.length;
    totals.damage += result.memberReports.reduce((sum, member) => sum + member.damageTaken, 0);
    totals.healing += result.memberReports.reduce((sum, member) => sum + member.healingDone, 0);
    totals.attempts += result.memberReports.reduce((sum, member) => sum + member.attackAttempts, 0);
    totals.hits += result.memberReports.reduce((sum, member) => sum + member.attackHits, 0);
    totals.hp += result.memberReports.reduce((sum, member) => sum + member.remainingHp, 0) / result.memberReports.reduce((sum, member) => sum + member.maxHp, 0);
    totals.statuses += result.battleLog.filter(entry => entry.kind === "status" && entry.text.includes("【状態異常】")).length;
    totals.resisted += result.battleLog.filter(entry => entry.kind === "status" && entry.text.includes("状態異常抵抗")).length;
    totals.timeouts += Number(!result.success && result.defeatFacts.some(fact => fact.includes("30ターン")));
    totals.burstDamage += result.mechanicReport?.burstDamage || 0;
    totals.burstKnockouts += result.mechanicReport?.burstKnockouts || 0;
    totals.guardedBurstHits += result.mechanicReport?.guardedHits || 0;
    totals.unguardedBurstHits += result.mechanicReport?.unguardedHits || 0;
    totals.rearDamage += result.strategyReport?.rearDamage || 0;
    totals.rearKnockouts += result.strategyReport?.rearKnockouts || 0;
    totals.statusDamage += result.strategyReport?.statusDamage || 0;
    result.memberReports.forEach((member, position) => {
      const role = partySnapshot.find(entry => entry.id === member.id)?.fixture.role || member.jobId;
      if (member.remainingHp <= 0) {
        failures.roles[role] = (failures.roles[role] || 0) + 1;
        failures.positions[position + 1] = (failures.positions[position + 1] || 0) + 1;
      }
    });
    if (!result.success) {
      const fact = result.defeatFacts.find(entry => /第\d+戦/.test(entry));
      const encounter = fact?.match(/第\d+戦「([^」]+)」/)?.[1] || `第${result.encountersCleared + 1}戦`;
      failures.encounters[encounter] = (failures.encounters[encounter] || 0) + 1;
      defeatCauses(result).forEach(cause => { failures.causes[cause] = (failures.causes[cause] || 0) + 1; });
    }
  }
  const ranked = source => Object.entries(source).sort((a, b) => b[1] - a[1]);
  const burstHits = totals.guardedBurstHits + totals.unguardedBurstHits;
  return {
    profileId, profileName: profileDefinitions[profileId].name, partySize: partySnapshot.length,
    winRate: average(totals.wins * 100, runs), remainingHpRate: average(totals.hp * 100, runs),
    averageEncounters: average(totals.encounters, runs), averageRounds: average(totals.rounds, runs),
    averageKnockouts: average(totals.knockouts, runs), averageDamageTaken: average(totals.damage, runs), averageHealing: average(totals.healing, runs),
    averageGold: average(totals.gold, runs), averageExperience: average(totals.exp, runs), averageStatuses: average(totals.statuses, runs, 2), averageResists: average(totals.resisted, runs, 2), timeoutRate: average(totals.timeouts * 100, runs),
    failureAnalysis: {
      failures: runs - totals.wins,
      failureRate: average((runs - totals.wins) * 100, runs),
      encounters: ranked(failures.encounters).map(([name, count]) => ({ name, count })),
      causes: ranked(failures.causes).map(([id, count]) => ({ id, name: causeLabels[id], count })),
      mostKnockedOutRole: ranked(failures.roles)[0]?.[0] || null,
      mostKnockedOutPosition: ranked(failures.positions)[0] ? Number(ranked(failures.positions)[0][0]) : null,
      hitRate: totals.attempts ? average(totals.hits * 100, totals.attempts) : 0,
      damageToHealingRatio: totals.healing ? average(totals.damage, totals.healing, 2) : null,
      burstDamage: totals.burstDamage, burstKnockouts: totals.burstKnockouts,
      guardedBurstRate: burstHits ? average(totals.guardedBurstHits * 100, burstHits) : null,
      rearDamage: totals.rearDamage, rearKnockouts: totals.rearKnockouts, statusDamage: totals.statusDamage
    },
    party: partySnapshot.map(member => ({ jobId: member.jobId, role: member.fixture.role, equipment: member.fixture.equipment, qualityId: member.fixture.qualityId, upgradeLevel: member.fixture.upgradeLevel, weight: member.fixture.weight, maximumWeight: member.fixture.maximumWeight }))
  };
}

function warningsFor(dungeon, results) {
  const warnings = [];
  const balanced = results.find(result => result.profileId === "balanced");
  const noHealer = results.find(result => result.profileId === "no_healer");
  const combatProfiles = results.filter(result => result.profileId !== "no_healer");
  const rates = combatProfiles.map(result => result.winRate);
  if (balanced && dungeon.requiredForStory && balanced.winRate < 35) warnings.push("本編の均衡型勝率が35%未満");
  if (balanced && dungeon.requiredForStory && balanced.winRate > 90) warnings.push("本編の均衡型勝率が90%超");
  if (balanced && !dungeon.requiredForStory && balanced.winRate > 70) warnings.push("任意高難度の均衡型勝率が70%超");
  if (rates.length >= 2 && Math.max(...rates) - Math.min(...rates) >= 40) warnings.push("編成間の勝率差が40pt以上");
  if (balanced && noHealer && noHealer.winRate - balanced.winRate >= 20) warnings.push("回復なし編成が均衡型を20pt以上上回る");
  if (results.some(result => result.timeoutRate >= 20)) warnings.push("30ターン撤退が20%以上の編成あり");
  if (balanced && balanced.averageRounds <= dungeon.encounters.length * 1.5) warnings.push("戦闘が極端に短い可能性");
  return warnings;
}

function generate(options = {}) {
  const settings = Object.assign({ runs: 100, chapterId: null, dungeonId: null, difficulty: "normal", enhancement: "none", quality: "standard", preparation: "fixed", profiles: Object.keys(profileDefinitions) }, options);
  if (!Number.isInteger(settings.runs) || settings.runs < 1) throw new Error("runs must be a positive integer");
  const game = loadGame();
  if (!Array.isArray(settings.profiles) || !settings.profiles.length) throw new Error("at least one profile is required");
  if (!["none", "quarter", "half", "max"].includes(settings.enhancement)) throw new Error(`Unknown enhancement mode: ${settings.enhancement}`);
  if (!["fixed", "progression"].includes(settings.preparation)) throw new Error(`Unknown preparation mode: ${settings.preparation}`);
  if (!game.GameData.qualities[settings.quality]) throw new Error(`Unknown quality: ${settings.quality}`);
  if (settings.difficulty !== "all" && !game.GameData.dungeonDifficulties[settings.difficulty]) throw new Error(`Unknown difficulty: ${settings.difficulty}`);
  const difficulties = settings.difficulty === "all" ? Object.keys(game.GameData.dungeonDifficulties) : [settings.difficulty];
  const dungeons = Object.values(game.GameData.dungeons)
    .filter(dungeon => !settings.chapterId || dungeon.chapterId === settings.chapterId)
    .filter(dungeon => !settings.dungeonId || dungeon.id === settings.dungeonId)
    .sort((a, b) => chapterOrder(game, a.chapterId) - chapterOrder(game, b.chapterId) || a.orderInChapter - b.orderInChapter);
  if (!dungeons.length) throw new Error(`No dungeons found${settings.dungeonId ? ` for dungeon ${settings.dungeonId}` : settings.chapterId ? ` for chapter ${settings.chapterId}` : ""}`);
  const entries = [];
  dungeons.forEach(dungeon => difficulties.forEach(difficultyId => {
    const results = settings.profiles.map(profileId => {
      if (!profileDefinitions[profileId]) throw new Error(`Unknown profile: ${profileId}`);
      return simulate(game, dungeon, profileId, settings.runs, difficultyId, { enhancement: settings.enhancement, quality: settings.quality, preparation: settings.preparation });
    });
    entries.push({ chapterId: dungeon.chapterId, dungeonId: dungeon.id, dungeonName: difficultyId === "normal" ? dungeon.name : game.DungeonDifficulty.variant(dungeon, difficultyId).name, difficultyId, recommendedLevel: dungeon.recommendedLevel, requiredForStory: dungeon.requiredForStory, results, warnings: warningsFor(dungeon, results) });
  }));
  return { generatedAt: new Date().toISOString(), runs: settings.runs, profiles: settings.profiles, difficulty: settings.difficulty, preparation: settings.preparation, enhancement: settings.enhancement, quality: settings.quality, entries };
}

function textReport(report) {
  const enhancementLabels = { none: "強化なし", quarter: "解放上限の1/4", half: "解放上限の半分", max: "解放上限" };
  const quality = report.quality || "standard";
  const equipmentLabel = report.preparation === "progression"
    ? "進行相応装備（第9章から出来の良い、星後領域から手になじむ／第5章から強化上限の1/4）"
    : `装備品質 ${quality}・装備強化 ${enhancementLabels[report.enhancement || "none"]}`;
  const lines = [`自動バランスレポート：各編成 ${report.runs}回・${equipmentLabel}`, "勝率 / 残HP / 平均ターン / 戦闘不能 / 状態異常", ""];
  let chapterId = null;
  report.entries.forEach(entry => {
    if (entry.chapterId !== chapterId) { chapterId = entry.chapterId; lines.push(`■ ${chapterId}`); }
    lines.push(`${entry.requiredForStory ? "本編" : "任意"} ${entry.dungeonName}（推奨Lv${entry.recommendedLevel}）${entry.warnings.length ? ` ⚠ ${entry.warnings.join("／")}` : ""}`);
    entry.results.forEach(result => lines.push(`  ${result.profileName.padEnd(5, "　")} ${String(result.winRate).padStart(5)}% / ${String(result.remainingHpRate).padStart(5)}% / ${String(result.averageRounds).padStart(5)}T / ${String(result.averageKnockouts).padStart(4)}人 / ${result.averageStatuses}回`));
    entry.results.filter(result => result.failureAnalysis.failures).forEach(result => {
      const analysis = result.failureAnalysis;
      const cause = analysis.causes.slice(0, 2).map(entry => `${entry.name}${entry.count}回`).join("・") || "決定打不明";
      const encounter = analysis.encounters[0] ? `${analysis.encounters[0].name}${analysis.encounters[0].count}回` : "不明";
      const burst = analysis.burstDamage ? `／大技${analysis.burstDamage}ダメージ・防御${analysis.guardedBurstRate}%` : "";
      lines.push(`    ↳ 敗因 ${cause}／最多失敗 ${encounter}／命中${analysis.hitRate}%／戦闘不能最多 ${analysis.mostKnockedOutRole || "なし"}・${analysis.mostKnockedOutPosition || "-"}列${burst}`);
    });
    lines.push("");
  });
  return lines.join("\n");
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--runs") options.runs = Number(argv[++index]);
    else if (argument === "--chapter") options.chapterId = argv[++index];
    else if (argument === "--dungeon") options.dungeonId = argv[++index];
    else if (argument === "--difficulty") options.difficulty = argv[++index];
    else if (argument === "--enhancement") options.enhancement = argv[++index];
    else if (argument === "--quality") options.quality = argv[++index];
    else if (argument === "--preparation") options.preparation = argv[++index];
    else if (argument === "--profiles") options.profiles = argv[++index].split(",").filter(Boolean);
    else if (argument === "--json") options.jsonPath = argv[++index];
    else if (argument === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

if (require.main === module) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
      console.log("node tools/balance-report.js [--runs 100] [--chapter mirror_tide] [--dungeon frost_coast] [--difficulty normal|all] [--preparation fixed|progression] [--quality standard|familiar|refined|fine] [--enhancement none|quarter|half|max] [--profiles balanced,physical,magic,no_healer] [--json report.json]");
      process.exit(0);
    }
    const report = generate(options);
    console.log(textReport(report));
    if (options.jsonPath) fs.writeFileSync(path.resolve(options.jsonPath), JSON.stringify(report, null, 2) + "\n", "utf8");
  } catch (error) {
    console.error(`バランスレポートを生成できませんでした: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { loadGame, buildParty, simulate, warningsFor, generate, textReport, progressionPreparation, profileDefinitions, rolesForProfile };
