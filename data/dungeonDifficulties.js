(function () {
  "use strict";
  const data = window.GameData = window.GameData || {};

  data.dungeonDifficulties = {
    normal: {
      id: "normal", name: "通常", namePrefix: "", order: 0, unlockAfter: null,
      durationMultiplier: 1, rewardMultiplier: 1, recommendedLevelMultiplier: 1,
      monsterModifiers: { hp: 1, attack: 1, defense: 1, magicAttack: 1, magicDefense: 1, speed: 1, hitRate: 1, evasionRate: 1 }
    },
    abyss: {
      id: "abyss", name: "魔境", namePrefix: "魔境の", order: 1, unlockAfter: "normal",
      durationMultiplier: 1.5, rewardMultiplier: 1.5, recommendedLevelMultiplier: 1.35,
      monsterModifiers: { hp: 1.6, attack: 1.4, defense: 1.3, magicAttack: 1.4, magicDefense: 1.3, speed: 1.15, hitRate: 1.06, evasionRate: 1.1 }
    },
    divine: {
      id: "divine", name: "神域", namePrefix: "神域の", order: 2, unlockAfter: "abyss",
      durationMultiplier: 2.5, rewardMultiplier: 2.5, recommendedLevelMultiplier: 1.75,
      monsterModifiers: { hp: 2.8, attack: 2, defense: 1.8, magicAttack: 2, magicDefense: 1.8, speed: 1.35, hitRate: 1.12, evasionRate: 1.2 }
    }
  };

  // Each monster owns a profile for every titled tier. A future monster skill can be
  // added to skillIds/combatOverrides without changing the shared difficulty table.
  data.monsterDifficultyProfiles = {};
  Object.values(data.monsters || {}).forEach(monster => {
    const normal = monster.signatureDrops || { materials: [], equipment: null };
    data.monsterDifficultyProfiles[monster.id] = {
      abyss: {
        skillIds: [], combatOverrides: {},
        signatureDrops: {
          materials: (normal.materials || []).map(drop => ({ ...drop, chance: Math.min(.05, drop.chance * .5), quantity: [1, Math.max(1, drop.quantity?.[1] || 1)] })),
          equipment: normal.equipment ? { ...normal.equipment, chance: Math.min(.018, normal.equipment.chance * .6) } : null
        }
      },
      divine: {
        skillIds: [], combatOverrides: {},
        signatureDrops: {
          materials: (normal.materials || []).map(drop => ({ ...drop, chance: Math.min(.035, drop.chance * .35), quantity: [1, Math.max(1, drop.quantity?.[1] || 1)] })),
          equipment: normal.equipment ? { ...normal.equipment, chance: Math.min(.012, normal.equipment.chance * .4) } : null
        }
      }
    };
  });

  // Slime is the first fully bespoke example. Higher tiers still inherit every
  // lower tier table in addition to these entries.
  Object.assign(data.monsterDifficultyProfiles.slime.abyss, {
    signatureDrops: {
      materials: [{ itemId: "abyss_slime_core", chance: .045, quantity: [1, 1] }],
      equipment: { itemId: "abyss_slime_mantle", chance: .015, quantity: [1, 1] }
    }
  });
  Object.assign(data.monsterDifficultyProfiles.slime.divine, {
    signatureDrops: {
      materials: [{ itemId: "divine_slime_core", chance: .025, quantity: [1, 1] }],
      equipment: { itemId: "divine_slime_mantle", chance: .008, quantity: [1, 1] }
    }
  });
})();
