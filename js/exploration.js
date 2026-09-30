(function () {
  "use strict";
  const maximum = 6;
  function valid(value) { return Number.isInteger(value) && value >= 1 && value <= maximum; }
  function plan(dungeon, multiplier = 1) {
    if (!valid(multiplier)) throw new Error("探索倍率が不正です。");
    const base = dungeon.encounters;
    if (multiplier === 1) return { ...dungeon, materialRate: 1, equipmentDropRate: 1, rewardScale: 1 };
    // Extend the approach; encounter the final boss only once per departure.
    const road = base.slice(0, -1);
    const count = base.length * multiplier - 1;
    const encounters = Array.from({ length: count }, (_, index) => ({
      ...road[index % road.length], name: road[index % road.length].name + "・道中" + (index + 1)
    }));
    encounters.push(base[base.length - 1]);
    function expected(route) {
      const totals = {};
      route.forEach(encounter => encounter.groups.forEach(group => group.forEach(id => {
        (window.GameData.monsters[id].materialDrops || []).forEach(drop => {
          totals[drop.itemId] = (totals[drop.itemId] || 0) + drop.chance * (drop.quantity[0] + drop.quantity[1]) / 2 / encounter.groups.length;
        });
      })));
      return totals;
    }
    const normal = expected(base), extended = expected(encounters), materialRates = {};
    Object.keys(extended).forEach(id => {
      materialRates[id] = Math.min(1, (normal[id] || 0) * Math.sqrt(multiplier) / extended[id]);
    });
    return { ...dungeon, encounters, materialRates, equipmentDropRate: 1 / Math.sqrt(multiplier), rewardScale: Math.sqrt(multiplier) };
  }

  function choose(random, values) { return values[Math.floor(random() * values.length)]; }
  function weightedDrop(random, drops) {
    const items = window.GameData.items || {};
    const candidates = drops.filter(drop => ["weapon", "armor"].includes(items[drop.itemId]?.type));
    const total = candidates.reduce((sum, drop) => sum + drop.chance, 0);
    if (!total) return null;
    let roll = random() * total;
    return candidates.find(drop => (roll -= drop.chance) <= 0) || candidates[candidates.length - 1];
  }

  function journey(dungeon, multiplier, seed, itemRateModifier) {
    const planned = plan(dungeon, multiplier);
    const definitions = window.GameData.explorationEvents || {
      treasure: { extraChance: .2, equipmentChance: .06, goldMinimumRate: .08, goldMaximumRate: .16 },
      environments: { default: { levelName: number => `第${number}区画`, arrivals: ["周囲を警戒しながら、新しい区画へ進んだ。"], discoveries: ["慎重に周囲を調べながら先へ進む。"] } }
    };
    const environment = definitions.environments[dungeon.color] || definitions.environments.default;
    const random = window.GameRuntime.seededRandom(seed + 900007);
    const treasureRate = definitions.treasure.extraChance / Math.sqrt(multiplier);
    const treasureFloors = planned.encounters.map(() => random() < treasureRate);
    if (!treasureFloors.some(Boolean)) treasureFloors[Math.floor(random() * planned.encounters.length)] = true;
    return planned.encounters.map((encounter, index) => {
      const level = environment.levelName(index + 1);
      const entries = [
        { kind: "arrival", text: `${level}に到着した。${choose(random, environment.arrivals)}` },
        { kind: "explore", text: choose(random, environment.discoveries) }
      ];
      if (index === 0 && dungeon.discoveryStoryId) {
        const discovery = window.GameData.storyScenes[dungeon.discoveryStoryId];
        if (discovery) entries.push({ kind: "story", sceneId: discovery.id, text: `【${discovery.name}】${discovery.text}` });
      }
      let gold = 0, drop = null;
      if (treasureFloors[index]) {
        entries.push({ kind: "treasure", text: `${level}で古びた宝箱を発見した！` });
        const equipmentChance = window.AcquisitionSkills ? window.AcquisitionSkills.chance(definitions.treasure.equipmentChance, itemRateModifier) : definitions.treasure.equipmentChance;
        if (random() < equipmentChance) {
          const selected = weightedDrop(random, dungeon.drops || []);
          if (selected) {
            drop = { itemId: selected.itemId, quantity: 1 };
            entries.push({ kind: "treasureItem", text: `宝箱から「${window.GameData.items[selected.itemId].name}」を手に入れた！` });
          }
        }
        if (!drop) {
          const minimum = Math.max(1, Math.floor(dungeon.rewards.gold[0] * definitions.treasure.goldMinimumRate));
          const maximumGold = Math.max(minimum, Math.floor(dungeon.rewards.gold[1] * definitions.treasure.goldMaximumRate));
          gold = Math.floor(minimum + random() * (maximumGold - minimum + 1));
          entries.push({ kind: "treasureGold", text: `宝箱から${gold}Gを手に入れた！` });
        }
      }
      return { level, entries, gold, drop, encounterName: encounter.name };
    });
  }
  window.Exploration = { maximum, valid, plan, journey };
})();
