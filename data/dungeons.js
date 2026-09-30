(function () {
  "use strict";

  window.GameData = window.GameData || {};
  window.GameData.dungeons = {
    meadow: {
      id: "meadow", name: "風鳴りの草原", shortName: "草原", recommendedLevel: 1,
      chapterId: "roadside", orderInChapter: 1, requiredForStory: true, unlockRequirements: [],
      duration: 30, difficulty: 30, color: "green",
      description: "街道沿いに魔物が現れる、駆け出し向けの探索地。",
      strategy: { label: "群れとの戦い", feature: "通常戦では小型の魔物が2体ずつ出現。敵を早く減らすと被害を抑えられます。", advice: "全体攻撃が有効。習得前は仲間を増やして攻撃を分担しましょう。" },
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
        { itemId: "cloth_clothes", chance: 0.16, quantity: [1, 1] },
        { itemId: "iron_ore", chance: 0.72, quantity: [1, 2] }
      ]
    },
    cave: {
      id: "cave", name: "燐光の洞窟", shortName: "洞窟", recommendedLevel: 3,
      chapterId: "seal", orderInChapter: 1, requiredForStory: true, unlockRequirements: [{ type: "chapterCompleted", chapterId: "roadside" }],
      duration: 60, difficulty: 95, color: "blue",
      description: "鉱脈と獣の気配が入り混じる、薄暗い洞窟。",
      strategy: { label: "硬い守りを崩す", feature: "岩グモとゴーレムは高防御。通常攻撃だけではダメージが通りにくい探索地です。", advice: "盗賊の急所突きやエルフの森の導きなど、防御を一部無視するスキルが有効です。" },
      encounters: [
        { name: "湿った坑道", groups: [["cave_bat", "cave_bat"], ["goblin"]] },
        { name: "地下の鉱脈", groups: [["goblin", "cave_bat"], ["cave_spider"]] },
        { name: "封鎖された採掘場", groups: [["stone_golem"]] }
      ],
      rewards: { gold: [90, 145], exp: [48, 72] },
      drops: [
        { itemId: "iron_sword", chance: 0.14, quantity: [1, 1] },
        { itemId: "hunter_bow", chance: 0.11, quantity: [1, 1] },
        { itemId: "iron_katana", chance: 0.08, quantity: [1, 1] },
        { itemId: "iron_shield", chance: 0.07, quantity: [1, 1] },
        { itemId: "iron_gauntlets", chance: 0.07, quantity: [1, 1] },
        { itemId: "leather_armor", chance: 0.18, quantity: [1, 1] },
        { itemId: "iron_ore", chance: 0.82, quantity: [2, 4] },
        { itemId: "magic_stone", chance: 0.12, quantity: [1, 1] }
      ]
    },
    ruins: {
      id: "ruins", name: "星喰らいの古代遺跡", shortName: "古代遺跡", recommendedLevel: 5,
      chapterId: "starfall", orderInChapter: 1, requiredForStory: true, unlockRequirements: [{ type: "chapterCompleted", chapterId: "seal" }],
      duration: 120, difficulty: 185, color: "purple",
      description: "失われた王朝の財宝と強敵が眠る危険な遺跡。",
      strategy: { label: "持久戦を耐える", feature: "敵のHPが高く、ボスは毎ターン2回行動。長い戦闘でHPが削られます。", advice: "回復スキルを持つ冒険者と耐久力の高い仲間を組み合わせましょう。" },
      encounters: [
        { name: "崩れた回廊", groups: [["skeleton", "skeleton"], ["wraith"]] },
        { name: "星読みの間", groups: [["wraith", "skeleton"], ["rune_guardian"]] },
        { name: "最奥の祭壇", groups: [["ancient_sentinel"]] }
      ],
      rewards: { gold: [190, 300], exp: [105, 155] },
      drops: [
        { itemId: "steel_sword", chance: 0.12, quantity: [1, 1] },
        { itemId: "arcane_staff", chance: 0.1, quantity: [1, 1] },
        { itemId: "silver_rapier", chance: 0.08, quantity: [1, 1] },
        { itemId: "steel_katana", chance: 0.07, quantity: [1, 1] },
        { itemId: "tower_shield", chance: 0.06, quantity: [1, 1] },
        { itemId: "rune_gauntlets", chance: 0.06, quantity: [1, 1] },
        { itemId: "iron_armor", chance: 0.15, quantity: [1, 1] },
        { itemId: "iron_ore", chance: 0.9, quantity: [3, 6] },
        { itemId: "magic_stone", chance: 0.48, quantity: [1, 2] }
      ]
    }
  };
  window.GameData.dungeons.observatory = {
    id: "observatory", name: "雷鳴の天文塔", shortName: "天文塔", recommendedLevel: 8,
    chapterId: "starfall", orderInChapter: 2, requiredForStory: false,
    unlockRequirements: [{ type: "chapterCompleted", chapterId: "starfall" }], optionalStoryId: "observatory_clear",
    duration: 180, difficulty: 300, color: "purple",
    description: "光の橋の先にそびえる天文塔。雷雲を飛ぶ魔物が星図を守る。",
    strategy: { label: "予告に備え、隙を攻める", feature: "全4戦。翼王は予告→次ターン終了時の全体大技→大技後の隙→通常2回攻撃を繰り返します。隙のターンは行動せず、被ダメージ1.5倍。", advice: "鉄壁の構えなどを習得した仲間はバランス・回復優先なら大技へ自動で備えます。攻撃優先は構えません。回復役とHP装備で構えのない仲間も守り、大技後の隙に攻撃しましょう。" },
    encounters: [
      { name: "雲上の光橋", groups: [["star_harrier", "star_harrier"]] },
      { name: "雷針の回廊", groups: [["sky_knight", "star_harrier"]] },
      { name: "壊れた星時計", groups: [["sky_knight", "sky_knight"]] },
      { name: "天頂の星図", groups: [["storm_regent"]] }
    ],
    rewards: { gold: [320, 480], exp: [175, 235] },
    drops: [
      { itemId: "steel_sword", chance: .18, quantity: [1, 1] },
      { itemId: "arcane_staff", chance: .16, quantity: [1, 1] },
      { itemId: "moon_rapier", chance: .1, quantity: [1, 1] },
      { itemId: "dragon_nodachi", chance: .08, quantity: [1, 1] },
      { itemId: "iron_armor", chance: .18, quantity: [1, 1] }
    ]
  };
  // 素材は敵ごとに抽選する。探索地のテーブルには装備報酬だけを残す。
  window.GameData.dungeons.meadow.strategy.preparation = ["area"];
  Object.assign(window.GameData.dungeons.cave.strategy, {
    feature: "岩グモとゴーレムは高防御。岩グモは攻撃時に毒を付与し、炎属性が弱点です。",
    advice: "魔術師の火球や防御無視で硬い守りを崩し、状態異常解除を持つ回復役で毒へ備えましょう。",
    preparation: ["penetration", "cleanse"]
  });
  Object.assign(window.GameData.dungeons.ruins.strategy, {
    label: "後列を守り、連戦を耐える",
    feature: "亡霊は最後尾の生存者を狙います。敵のHPが高く、ボスは毎ターン2回行動。",
    advice: "後列の遠距離役にもHP・防御を確保し、回復役で連戦の消耗を補いましょう。亡霊は編成した職業ではなく隊列で狙いを決めます。",
    preparation: ["rear", "heal", "cleanse"]
  });
  Object.assign(window.GameData.dungeons.observatory.strategy, {
    feature: "全4戦。雷属性の魔物は雷に強く氷に弱いほか、雷羽の狩鳥は攻撃時に麻痺を付与します。翼王は予告付きの全体大技を使います。",
    advice: "吹雪などの氷属性、状態異常解除、鉄壁の構えと回復役を組み合わせ、大技後の隙を狙いましょう。",
    preparation: ["guard", "heal", "cleanse", "ice"]
  });
  Object.values(window.GameData.dungeons).forEach(dungeon => {
    dungeon.drops = dungeon.drops.filter(drop => !["iron_ore", "magic_stone"].includes(drop.itemId));
  });
})();
