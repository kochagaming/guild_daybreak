(function () {
  "use strict";
  const hours = value => value * 60 * 60 * 1000;
  const track = (values, costs) => values.map((value, index) => ({ ...value, cost: index ? costs[index - 1] : null }));
  const storageValues = [1, 2, 4, 8, 12].map(duration => ({ duration: hours(duration) }));
  const speedValues = [1, 2, 3, 4, 5].map(divisor => ({ interval: Math.floor(hours(1) / divisor), divisor }));

  window.GameData.facilities = {
    version: 1,
    order: ["mine", "guild", "herb_garden"],
    trackOrder: ["production", "storage", "speed"],
    upgradeCapacity: { base: 0, perCompletedMainChapter: 1 },
    // どの系統を選んでも同じ目標Lvなら同じ基礎費用。後発施設は施設倍率で調整する。
    upgradeGoldByTargetLevel: { 2: 2500, 3: 15000, 4: 75000, 5: 350000 },
    tracks: {
      production: { name: "生産量", description: "1回の作業で得られる量を増やします。" },
      storage: { name: "保管庫", description: "受け取らずに保持できる時間を延ばします。" },
      speed: { name: "作業速度", description: "1時間を設備レベルで割った時間ごとに生産します。" }
    },
    definitions: {
      mine: {
        id: "mine", name: "採掘場", goldCostMultiplier: 1, description: "鉱員と設備を整え、鉄鉱石を採取します。生産設備を強化すると、まれに希少な鉱石も見つかります。",
        upgrades: {
          production: track([
            { rewards: { materials: { iron_ore: 1 } } },
            { rewards: { materials: { iron_ore: 2 } }, chanceRewards: [{ id: "mine_magic_stone", itemId: "magic_stone", quantity: 1, chance: .05 }] },
            { rewards: { materials: { iron_ore: 3 } }, chanceRewards: [{ id: "mine_magic_stone", itemId: "magic_stone", quantity: 1, chance: .10 }, { id: "mine_glow_crystal", itemId: "glow_crystal", quantity: 1, chance: .04 }] },
            { rewards: { materials: { iron_ore: 4 } }, chanceRewards: [{ id: "mine_magic_stone", itemId: "magic_stone", quantity: 1, chance: .18 }, { id: "mine_glow_crystal", itemId: "glow_crystal", quantity: 1, chance: .08 }, { id: "mine_starsteel_ore", itemId: "starsteel_ore", quantity: 1, chance: .02 }] },
            { rewards: { materials: { iron_ore: 5 } }, chanceRewards: [{ id: "mine_magic_stone", itemId: "magic_stone", quantity: 1, chance: .28 }, { id: "mine_glow_crystal", itemId: "glow_crystal", quantity: 1, chance: .12 }, { id: "mine_starsteel_ore", itemId: "starsteel_ore", quantity: 1, chance: .05 }, { id: "mine_star_shard", itemId: "star_shard", quantity: 1, chance: .02 }] }
          ], [{ iron_ore: 6 }, { iron_ore: 15, magic_stone: 2 }, { iron_ore: 30, magic_stone: 8 }, { magic_stone: 15, star_shard: 4 }]),
          storage: track(storageValues, [{ iron_ore: 4 }, { iron_ore: 10 }, { iron_ore: 18, magic_stone: 3 }, { magic_stone: 10, star_shard: 2 }]),
          speed: track(speedValues, [{ iron_ore: 8 }, { iron_ore: 18, magic_stone: 2 }, { iron_ore: 28, magic_stone: 6 }, { magic_stone: 12, star_shard: 3 }])
        }
      },
      guild: {
        id: "guild", name: "ギルド運営", goldCostMultiplier: 1.5, description: "受付・仲介・帳簿を整え、依頼手数料とギルド印章を蓄積します。",
        upgrades: {
          production: track([
            { rewards: { gold: 20 }, periodicRewards: [{ id: "guild_seal", itemId: "guild_seal", quantity: 1, everyCycles: 4 }] },
            { rewards: { gold: 30 }, periodicRewards: [{ id: "guild_seal", itemId: "guild_seal", quantity: 1, everyCycles: 4 }] },
            { rewards: { gold: 45 }, periodicRewards: [{ id: "guild_seal", itemId: "guild_seal", quantity: 1, everyCycles: 3 }] },
            { rewards: { gold: 65 }, periodicRewards: [{ id: "guild_seal", itemId: "guild_seal", quantity: 1, everyCycles: 3 }] },
            { rewards: { gold: 90 }, periodicRewards: [{ id: "guild_seal", itemId: "guild_seal", quantity: 1, everyCycles: 2 }] }
          ], [{ guild_seal: 2 }, { guild_seal: 5, iron_ore: 5 }, { guild_seal: 10, magic_stone: 3 }, { guild_seal: 18, star_shard: 2 }]),
          storage: track(storageValues, [{ guild_seal: 1 }, { guild_seal: 3 }, { guild_seal: 6, iron_ore: 6 }, { guild_seal: 12, magic_stone: 4 }]),
          speed: track(speedValues, [{ guild_seal: 3 }, { guild_seal: 6, iron_ore: 4 }, { guild_seal: 10, magic_stone: 3 }, { guild_seal: 16, star_shard: 2 }])
        }
      },
      herb_garden: {
        id: "herb_garden", name: "黒樹薬草園", goldCostMultiplier: 4, description: "黒樹海から持ち帰った苗と菌床を育て、希少な植物素材を栽培します。", unlockAfter: "blackwood_pilgrimage",
        upgrades: {
          production: track([
            { rewards: { materials: { black_sap: 1 } } },
            { rewards: { materials: { black_sap: 1, moonleaf: 1 } } },
            { rewards: { materials: { black_sap: 2, moonleaf: 1 } } },
            { rewards: { materials: { moonleaf: 2, witch_ember: 1 } } },
            { rewards: { materials: { moonleaf: 2, witch_ember: 1, saint_thorn: 1 } } }
          ], [{ black_sap: 6 }, { black_sap: 14, moonleaf: 4 }, { moonleaf: 12, witch_ember: 4 }, { moonleaf: 18, witch_ember: 8, saint_thorn: 4 }]),
          storage: track(storageValues, [{ black_sap: 4 }, { black_sap: 10, moonleaf: 2 }, { moonleaf: 8, witch_ember: 2 }, { moonleaf: 14, saint_thorn: 3 }]),
          speed: track(speedValues, [{ black_sap: 8 }, { black_sap: 16, moonleaf: 3 }, { moonleaf: 10, witch_ember: 3 }, { moonleaf: 16, saint_thorn: 4 }])
        }
      }
    }
  };
})();
