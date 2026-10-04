(function () {
  "use strict";

  window.GameData = window.GameData || {};
  const dungeons = {
    meadow: {
      id: "meadow", name: "風鳴りの草原", shortName: "草原", recommendedLevel: 1,
      chapterId: "roadside", orderInChapter: 1, requiredForStory: true, unlockRequirements: [],
      duration: 30, difficulty: 30, color: "green",
      description: "街道沿いに魔物が現れる、駆け出し向けの探索地。",
      strategy: { label: "群れとの戦い", feature: "通常戦では小型の魔物が2体ずつ出現。敵を早く減らすと被害を抑えられます。", advice: "全体攻撃が有効。習得前は仲間を増やして攻撃を分担しましょう。", preparation: ["area"] },
      monsterScaling: { regular: { hp: 1, attack: 1 }, boss: { hp: 1, attack: 1 } },
      encounters: [
        { name: "街道の入口", groups: [["slime", "slime"], ["horn_rabbit", "slime"]] },
        { name: "風の丘", groups: [["horn_rabbit", "slime"], ["grass_wolf", "slime"]] },
        { name: "群れの縄張り", groups: [["alpha_wolf"]] }
      ],
      rewards: { gold: [35, 65], exp: [18, 30] },
      drops: [
        { itemId: "wooden_sword", chance: 0.16, quantity: [1, 1] },
        { itemId: "short_bow", chance: 0.12, quantity: [1, 1] },
        { itemId: "bronze_rapier", chance: 0.08, quantity: [1, 1] },
        { itemId: "leather_gloves", chance: 0.08, quantity: [1, 1] },
        { itemId: "wooden_shield", chance: 0.07, quantity: [1, 1] },
        { itemId: "cloth_clothes", chance: 0.16, quantity: [1, 1] }
      ],
      clearStoryId: "meadow_clear"
    },
    cave: {
      id: "cave", name: "燐光の洞窟", shortName: "洞窟", recommendedLevel: 7,
      chapterId: "seal", orderInChapter: 1, requiredForStory: true, unlockRequirements: [{ type: "chapterCompleted", chapterId: "roadside" }],
      duration: 60, difficulty: 150, color: "blue",
      description: "鉱脈と獣の気配が入り混じる、薄暗い洞窟。",
      strategy: { label: "硬い守りを崩す", feature: "岩グモとゴーレムは高防御。岩グモは攻撃時に毒を付与し、炎属性が弱点です。", advice: "魔術師の火球や防御無視で硬い守りを崩し、状態異常解除を持つ回復役で毒へ備えましょう。", preparation: ["penetration", "cleanse"] },
      monsterScaling: { regular: { hp: 2.2, attack: 2 }, boss: { hp: 4, attack: 3 } },
      encounters: [
        { name: "湿った坑道", groups: [["cave_bat", "cave_bat"], ["goblin"]] },
        { name: "地下の鉱脈", groups: [["goblin", "cave_bat"], ["cave_spider"]] },
        { name: "封鎖された採掘場", groups: [["stone_golem"]] }
      ],
      rewards: { gold: [170, 240], exp: [170, 230] },
      drops: [
        { itemId: "iron_sword", chance: 0.14, quantity: [1, 1] },
        { itemId: "hunter_bow", chance: 0.11, quantity: [1, 1] },
        { itemId: "iron_katana", chance: 0.08, quantity: [1, 1] },
        { itemId: "iron_shield", chance: 0.07, quantity: [1, 1] },
        { itemId: "iron_gauntlets", chance: 0.07, quantity: [1, 1] },
        { itemId: "leather_armor", chance: 0.18, quantity: [1, 1] }
      ],
      clearStoryId: "cave_clear"
    },
    ruins: {
      id: "ruins", name: "星喰らいの古代遺跡", shortName: "古代遺跡", recommendedLevel: 14,
      chapterId: "starfall", orderInChapter: 1, requiredForStory: true, unlockRequirements: [{ type: "chapterCompleted", chapterId: "seal" }],
      duration: 120, difficulty: 430, color: "purple",
      description: "失われた王朝の財宝と強敵が眠る危険な遺跡。",
      strategy: { label: "後列を守り、連戦を耐える", feature: "亡霊は最後尾の生存者を狙います。敵のHPが高く、ボスは毎ターン2回行動。", advice: "後列の遠距離役にもHP・防御を確保し、回復役で連戦の消耗を補いましょう。亡霊は編成した職業ではなく隊列で狙いを決めます。", preparation: ["rear", "heal", "cleanse"] },
      monsterScaling: { regular: { hp: 3.2, attack: 2.7 }, boss: { hp: 10, attack: 5 } },
      encounters: [
        { name: "崩れた回廊", groups: [["skeleton", "skeleton"], ["wraith"]] },
        { name: "星読みの間", groups: [["wraith", "skeleton"], ["rune_guardian"]] },
        { name: "最奥の祭壇", groups: [["ancient_sentinel"]] }
      ],
      rewards: { gold: [560, 740], exp: [580, 760] },
      drops: [
        { itemId: "steel_sword", chance: 0.12, quantity: [1, 1] },
        { itemId: "arcane_staff", chance: 0.1, quantity: [1, 1] },
        { itemId: "silver_rapier", chance: 0.08, quantity: [1, 1] },
        { itemId: "steel_katana", chance: 0.07, quantity: [1, 1] },
        { itemId: "tower_shield", chance: 0.06, quantity: [1, 1] },
        { itemId: "rune_gauntlets", chance: 0.06, quantity: [1, 1] },
        { itemId: "iron_armor", chance: 0.15, quantity: [1, 1] }
      ],
      clearStoryId: "ruins_clear"
    },
    observatory: {
    id: "observatory", name: "雷鳴の天文塔", shortName: "天文塔", recommendedLevel: 23,
    chapterId: "starfall", orderInChapter: 2, requiredForStory: false,
    unlockRequirements: [{ type: "chapterCompleted", chapterId: "starfall" }], optionalStoryId: "observatory_clear",
    duration: 180, difficulty: 950, color: "purple",
    description: "光の橋の先にそびえる天文塔。雷雲を飛ぶ魔物が星図を守る。",
    strategy: { label: "予告に備え、隙を攻める", feature: "全4戦。雷属性の魔物は雷に強く氷に弱いほか、雷羽の狩鳥は攻撃時に麻痺を付与します。翼王は予告付きの全体大技を使います。", advice: "吹雪などの氷属性、状態異常解除、鉄壁の構えと回復役を組み合わせ、大技後の隙を狙いましょう。", preparation: ["guard", "heal", "cleanse", "ice"] },
    monsterScaling: { regular: { hp: 3.6, attack: 3 }, boss: { hp: 7, attack: 3.5 } },
    encounters: [
      { name: "雲上の光橋", groups: [["star_harrier", "star_harrier"]] },
      { name: "雷針の回廊", groups: [["sky_knight", "star_harrier"]] },
      { name: "壊れた星時計", groups: [["sky_knight", "sky_knight"]] },
      { name: "天頂の星図", groups: [["storm_regent"]] }
    ],
    rewards: { gold: [1650, 2150], exp: [1700, 2200] },
    drops: [
      { itemId: "steel_sword", chance: .18, quantity: [1, 1] },
      { itemId: "arcane_staff", chance: .16, quantity: [1, 1] },
      { itemId: "moon_rapier", chance: .1, quantity: [1, 1] },
      { itemId: "dragon_nodachi", chance: .08, quantity: [1, 1] },
      { itemId: "iron_armor", chance: .18, quantity: [1, 1] }
    ]
    }
  };
  window.GameData.registry.entities("dungeons", dungeons);
})();
