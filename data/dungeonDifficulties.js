(function () {
  "use strict";
  const data = window.GameData = window.GameData || {};

  const dungeonDifficulties = {
    normal: {
      id: "normal", name: "通常", namePrefix: "", order: 0, unlockAfter: null,
      durationMultiplier: 1, rewardMultiplier: 1, recommendedLevelMultiplier: 1,
      firstClearReward: null,
      monsterModifiers: { hp: 1, attack: 1, defense: 1, magicAttack: 1, magicDefense: 1, speed: 1, hitRate: 1, evasionRate: 1 }
    },
    abyss: {
      id: "abyss", name: "魔境", namePrefix: "魔境の", order: 1, unlockAfter: "normal",
      durationMultiplier: 1.5, rewardMultiplier: 1.5, recommendedLevelMultiplier: 1.35,
      firstClearReward: { gold: 0, materials: { guild_seal: 1 } },
      chapterMapBenefit: { label: "赤糸の道案内", explorationTimeMultiplier: .95 },
      chapterMapDialogue: {
        title: "五枚目の地図を綴じる夜",
        receptionist: "最後の帰還札です。これで、この章の道すべてへ同じ赤い糸を通せます。",
        adventurer: "安全になったわけじゃない。でも次の隊は、私たちが迷った場所から先を考えられる。",
        archivist: "なら恐れた場所も消さずに綴じましょう。完成とは、危険を忘れることではありません。"
      },
      monsterModifiers: { hp: 1.6, attack: 1.4, defense: 1.3, magicAttack: 1.4, magicDefense: 1.3, speed: 1.15, hitRate: 1.06, evasionRate: 1.1 }
    },
    divine: {
      id: "divine", name: "神域", namePrefix: "神域の", order: 2, unlockAfter: "abyss",
      durationMultiplier: 2.5, rewardMultiplier: 2.5, recommendedLevelMultiplier: 1.75,
      firstClearReward: { gold: 0, materials: { guild_seal: 2 } },
      chapterMapBenefit: { label: "巡礼図の導き", explorationTimeMultiplier: .9 },
      chapterMapDialogue: {
        title: "巡礼図へ金具を留める朝",
        receptionist: "神域から戻った札が、これで五枚そろいました。どの文字も、ちゃんと帰還者の手で書かれています。",
        adventurer: "先人の線をなぞるだけでは帰れなかった。だから、逃げた道も助けられた場所も残しておきたい。",
        archivist: "勝利だけを清書すれば、次の人は同じ恐れを一人で抱えます。震えた筆跡ごと、巡礼図の一部にしましょう。"
      },
      monsterModifiers: { hp: 2.8, attack: 2, defense: 1.8, magicAttack: 2, magicDefense: 1.8, speed: 1.35, hitRate: 1.12, evasionRate: 1.2 }
    }
  };
  data.registry.entities("dungeonDifficulties", dungeonDifficulties);

  // 個別に調整したい称号ドロップだけを明示する。未指定分は通常表から生成する。
  data.registry.relations("monsterDifficultyDropOverrides", {
    slime: {
      abyss: {
        materials: [{ itemId: "abyss_slime_core", chance: .045, quantity: [1, 1] }],
        equipment: { itemId: "abyss_slime_mantle", chance: .015, quantity: [1, 1] }
      },
      divine: {
        materials: [{ itemId: "divine_slime_core", chance: .025, quantity: [1, 1] }],
        equipment: { itemId: "divine_slime_mantle", chance: .008, quantity: [1, 1] }
      }
    }
  });

  const monsterDifficultyDrops = Object.fromEntries(Object.values(data.monsters || {}).map(monster => {
    const normal = data.relations.monsterSignatureDrops[monster.id] || { materials: [], equipment: null };
    const defaults = {
      abyss: {
        materials: (normal.materials || []).map(drop => ({ ...drop, chance: Math.min(.05, drop.chance * .5), quantity: [1, Math.max(1, drop.quantity?.[1] || 1)] })),
        equipment: normal.equipment ? { ...normal.equipment, chance: Math.min(.018, normal.equipment.chance * .6) } : null
      },
      divine: {
        materials: (normal.materials || []).map(drop => ({ ...drop, chance: Math.min(.035, drop.chance * .35), quantity: [1, Math.max(1, drop.quantity?.[1] || 1)] })),
        equipment: normal.equipment ? { ...normal.equipment, chance: Math.min(.012, normal.equipment.chance * .4) } : null
      }
    };
    const overrides = data.relations.monsterDifficultyDropOverrides[monster.id] || {};
    return [monster.id, {
      abyss: overrides.abyss || defaults.abyss,
      divine: overrides.divine || defaults.divine
    }];
  }));
  data.registry.derived("monsterDifficultyDrops", monsterDifficultyDrops);
})();
