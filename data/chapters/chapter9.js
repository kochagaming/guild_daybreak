(function () {
  "use strict";
  const data = window.GameData;

  data.registry.entities("items", {
    fallen_star_iron: { id: "fallen_star_iron", name: "落星鉄", type: "material", price: 0, icon: "◆" },
    black_wing_feather: { id: "black_wing_feather", name: "黒翼羽", type: "material", price: 0, icon: "➶" },
    floating_core: { id: "floating_core", name: "浮遊核", type: "material", price: 0, icon: "◈" },
    eclipse_shard: { id: "eclipse_shard", name: "蝕晶片", type: "material", price: 0, icon: "◐" },
    void_star_crystal: { id: "void_star_crystal", name: "虚星晶", type: "material", price: 0, icon: "✦" },
    starpiercer_rapier: { id: "starpiercer_rapier", name: "星穿ちの細剣", type: "weapon", weaponType: "rapier", range: "melee", tier: 10, price: 10800, attack: 92, attackCount: 2, hitRate: .18, criticalRate: .1, speed: 8, defense: 6, hp: 42, weight: 9, icon: "⚔", craftOnly: true, salvage: { itemId: "fallen_star_iron", quantity: 3 } },
    blackwing_plate: { id: "blackwing_plate", name: "黒翼の星鎧", type: "armor", armorType: "heavy", tier: 10, price: 11200, attack: 12, defense: 68, magicDefense: 44, hp: 125, weight: 18, icon: "♜", craftOnly: true, salvage: { itemId: "black_wing_feather", quantity: 3 } },
    eclipse_staff: { id: "eclipse_staff", name: "蝕星の杖", type: "weapon", weaponType: "staff", range: "ranged", tier: 10, price: 11400, attack: 7, magicAttack: 76, magicHealing: 52, magicDefense: 18, hitRate: .14, speed: 5, hp: 58, weight: 8, icon: "⚕", craftOnly: true, salvage: { itemId: "eclipse_shard", quantity: 3 } },
    winglord_bow: { id: "winglord_bow", name: "黒翼侯の天弓", type: "weapon", weaponType: "bow", range: "ranged", tier: 10, price: 14200, attack: 78, attackCount: 2, hitRate: .22, criticalRate: .12, speed: 12, hp: 48, weight: 10, icon: "➶", unique: true, salvage: { itemId: "black_wing_feather", quantity: 4 }, specialEffects: [{ kind: "critical_followup", multiplier: .75, name: "黒羽の追射" }], effectDescription: "会心時、攻撃力75%の追射を1行動につき1回行う。" },
    void_archon_robe: { id: "void_archon_robe", name: "虚星執政官の法衣", type: "armor", armorType: "cloth", tier: 11, price: 16800, attack: 0, defense: 48, magicDefense: 86, magicAttack: 28, magicHealing: 28, hp: 160, weight: 7, icon: "✧", unique: true, salvage: { itemId: "void_star_crystal", quantity: 4 }, specialEffects: [{ kind: "healing_boost", multiplier: 1.5 }], effectDescription: "単体・全体回復スキルの回復量を1.5倍にする。" }
  });

  const monsters = {
    starroad_scout: { id: "starroad_scout", name: "星路の斥候", hp: 4400, attack: 500, defense: 275, magicDefense: 230, speed: 68, icon: "♟", element: "dark", targetRule: "rear_weighted" },
    winged_hound: { id: "winged_hound", name: "黒羽の猟犬", hp: 5400, attack: 575, attackCount: 2, defense: 270, magicDefense: 225, speed: 72, icon: "◆", element: "dark", actions: 2 },
    starroad_gatekeeper: { id: "starroad_gatekeeper", name: "星路門の番人", hp: 58000, attack: 570, defense: 335, magicDefense: 275, speed: 52, icon: "♛", boss: true, actions: 3, element: "arcane", statusAttack: { statusId: "paralysis", chance: .28, duration: 1 }, elementModifiers: { arcane: .4, lightning: 1.3 }, statusResistances: { paralysis: .8, chill: .7 }, mechanic: { kind: "telegraphed_burst", name: "星路閉鎖", period: 5, multiplier: 1.65, exposedMultiplier: 1.4, description: "浮遊核へ力を集め、次ターン終了時に星路全体を閉ざす衝撃を放つ。" } },
    skyvine: { id: "skyvine", name: "浮庭の空蔓", hp: 4700, attack: 480, magicAttack: 500, defense: 245, magicDefense: 245, speed: 50, icon: "♣", element: "nature", statusAttack: { statusId: "poison", chance: .28, duration: 3 } },
    fallen_gardener: { id: "fallen_gardener", name: "墜庭の庭師", hp: 5900, attack: 590, defense: 330, magicDefense: 250, speed: 48, icon: "♜", element: "nature", actions: 2 },
    garden_seraph: { id: "garden_seraph", name: "空庭の熾使", hp: 62000, attack: 520, magicAttack: 590, defense: 320, magicDefense: 300, speed: 58, icon: "♛", boss: true, actions: 3, damageType: "magic", element: "arcane", statusAttack: { statusId: "burn", chance: .3, duration: 3 }, elementModifiers: { arcane: .4, dark: 1.3 }, statusResistances: { burn: .85, paralysis: .75 } },
    blackwing_acolyte: { id: "blackwing_acolyte", name: "黒翼の侍祭", hp: 4900, attack: 485, magicAttack: 545, defense: 240, magicDefense: 280, speed: 61, icon: "†", damageType: "magic", element: "dark", targetRule: "rear_weighted" },
    feather_blade: { id: "feather_blade", name: "羽刃の騎士", hp: 6200, attack: 640, attackCount: 2, defense: 335, magicDefense: 260, speed: 64, icon: "⚔", element: "dark", actions: 2 },
    blackwing_marquis: { id: "blackwing_marquis", name: "黒翼侯ヴァレス", hp: 68000, attack: 620, defense: 345, magicDefense: 285, speed: 68, icon: "♛", boss: true, actions: 3, element: "dark", targetRule: "rear_weighted", elementModifiers: { dark: .35, arcane: 1.3 }, statusResistances: { paralysis: .8, chill: .75 }, bossDrop: { itemId: "winglord_bow", chance: .08 }, mechanic: { kind: "telegraphed_burst", name: "黒天羽葬", period: 4, multiplier: 1.7, exposedMultiplier: 1.45, description: "無数の黒羽を空へ展開し、次ターン終了時に後列まで射抜く。" } },
    starforged_soldier: { id: "starforged_soldier", name: "星炉の鋳兵", hp: 6200, attack: 620, defense: 355, magicDefense: 265, speed: 48, icon: "♟", element: "fire", actions: 2, statusAttack: { statusId: "burn", chance: .25, duration: 3 } },
    furnace_wisp: { id: "furnace_wisp", name: "落星炉の火精", hp: 5100, attack: 480, magicAttack: 640, defense: 225, magicDefense: 300, speed: 60, icon: "✧", damageType: "magic", element: "fire", actions: 2, statusAttack: { statusId: "burn", chance: .32, duration: 3 } },
    foundry_keeper: { id: "foundry_keeper", name: "落星炉の主", hp: 79000, attack: 670, magicAttack: 640, defense: 385, magicDefense: 305, speed: 50, icon: "♛", boss: true, actions: 4, element: "fire", statusAttack: { statusId: "burn", chance: .35, duration: 3 }, elementModifiers: { fire: .35, ice: 1.35 }, statusResistances: { burn: 1, chill: .7 }, mechanic: { kind: "telegraphed_burst", name: "隕鉄鋳造", period: 4, multiplier: 1.7, exposedMultiplier: 1.45, statusAmplifier: { statusId: "burn", multiplier: 1.15 }, description: "落星鉄を融かし、次ターン終了時に灼熱の波を放つ。火傷中の相手へ威力が増す。" } },
    eclipse_priest: { id: "eclipse_priest", name: "日蝕の司祭", hp: 5600, attack: 480, magicAttack: 660, defense: 255, magicDefense: 330, speed: 59, icon: "☾", damageType: "magic", element: "dark", actions: 2 },
    throne_guard: { id: "throne_guard", name: "空城の近衛", hp: 6800, attack: 690, defense: 380, magicDefense: 285, speed: 53, icon: "♜", element: "arcane", actions: 2 },
    eclipse_regent: { id: "eclipse_regent", name: "蝕星王レグルス", hp: 79000, attack: 575, magicAttack: 665, defense: 350, magicDefense: 330, speed: 62, icon: "♛", boss: true, actions: 3, damageType: "magic", element: "dark", targetRule: "rear_weighted", elementModifiers: { dark: .35, lightning: 1.3 }, statusResistances: { poison: .8, paralysis: .85, chill: .8 }, mechanic: { kind: "telegraphed_burst", name: "王城日蝕", period: 4, multiplier: 1.75, exposedMultiplier: 1.5, description: "王城の光を奪い、次ターン終了時に全体へ蝕の魔力を降らせる。" } },
    void_archon: { id: "void_archon", name: "虚星執政官ノクス", hp: 112000, attack: 720, magicAttack: 760, defense: 410, magicDefense: 385, speed: 64, icon: "♛", boss: true, actions: 5, damageType: "magic", element: "dark", targetRule: "rear_weighted", elementModifiers: { dark: .25, lightning: 1.4 }, statusResistances: { poison: 1, burn: .8, paralysis: .9, chill: .9 }, bossDrop: { itemId: "void_archon_robe", chance: .1 }, mechanic: { kind: "telegraphed_burst", name: "虚空星葬", period: 3, multiplier: 1.85, exposedMultiplier: 1.55, description: "虚星を呼び寄せ、短い周期で戦場全体を虚空へ沈める。" } }
  };

  const materials = {
    starroad_scout: [["black_wing_feather", .45, 1, 2]], winged_hound: [["black_wing_feather", .55, 1, 2]], starroad_gatekeeper: [["floating_core", 1, 2, 4]],
    skyvine: [["eclipse_shard", .45, 1, 2]], fallen_gardener: [["floating_core", .55, 1, 2]], garden_seraph: [["eclipse_shard", 1, 2, 4]],
    blackwing_acolyte: [["black_wing_feather", .55, 1, 2]], feather_blade: [["fallen_star_iron", .6, 1, 2]], blackwing_marquis: [["black_wing_feather", 1, 2, 4]],
    starforged_soldier: [["fallen_star_iron", .65, 1, 2]], furnace_wisp: [["eclipse_shard", .55, 1, 2]], foundry_keeper: [["fallen_star_iron", 1, 2, 4]],
    eclipse_priest: [["eclipse_shard", .6, 1, 2]], throne_guard: [["floating_core", .7, 1, 3]], eclipse_regent: [["eclipse_shard", 1, 2, 4]],
    void_archon: [["void_star_crystal", 1, 3, 5], ["black_wing_feather", 1, 3, 5]]
  };
  data.registry.relations("monsterMaterialDrops", Object.fromEntries(Object.entries(materials).map(([id, entries]) => [id,
    entries.map(([itemId, chance, minimum, maximum]) => ({ itemId, chance, quantity: [minimum, maximum] }))
  ])));
  data.registry.entities("monsters", monsters);

  const route = (id, name, shortName, level, duration, difficulty, order, requirements, description, encounters, rewards, drops, extra = {}) => ({
    id, name, shortName, recommendedLevel: level, duration, difficulty, color: "purple", chapterId: "falling_sky_castle", orderInChapter: order, requiredForStory: true,
    unlockRequirements: requirements, description, strategy: { label: "空城の痕跡を追う", feature: description, advice: "後列を狙う黒翼と、火傷を重ねる星炉の記録を確かめてください。", preparation: [] }, encounters, rewards, drops, ...extra
  });
  data.registry.entities("dungeons", {
    starroad_gate: route("starroad_gate", "星路の外門", "星路外門", 68, 1620, 23200, 1, [{ type: "chapterCompleted", chapterId: "thunder_snow_peaks" }], "極光の先に浮かぶ外門。黒い翼を持つ斥候が星路を閉ざす。", [{ name: "浮石の参道", groups: [["starroad_scout", "winged_hound"], ["starroad_scout", "starroad_scout"]] }, { name: "閉ざされた星門", groups: [["winged_hound", "starroad_gatekeeper"]] }], { gold: [40200, 47800], exp: [38900, 46200] }, [{ itemId: "black_wing_feather", chance: .38, quantity: [1, 2] }], { clearStoryId: "starroad_gate_clear" }),
    broken_sky_garden: route("broken_sky_garden", "崩れた空中庭園", "空中庭園", 70, 1680, 25200, 2, [{ type: "dungeonClear", dungeonId: "starroad_gate" }], "空へ根を張る庭園。枯れない蔓が墜落した星を覆う。", [{ name: "逆さ根の庭", groups: [["skyvine", "fallen_gardener"], ["skyvine", "skyvine"]] }, { name: "熾使の花壇", groups: [["fallen_gardener", "garden_seraph"]] }], { gold: [43800, 52100], exp: [42300, 50300] }, [{ itemId: "floating_core", chance: .38, quantity: [1, 2] }], { clearStoryId: "broken_sky_garden_clear" }),
    blackwing_cloister: route("blackwing_cloister", "黒翼の回廊", "黒翼回廊", 72, 1740, 27400, 3, [{ type: "dungeonClear", dungeonId: "broken_sky_garden" }], "空城を巡る長い回廊。黒翼侯の射線は後列まで届く。", [{ name: "羽音の列柱", groups: [["blackwing_acolyte", "feather_blade"], ["blackwing_acolyte", "blackwing_acolyte"]] }, { name: "黒羽の謁見路", groups: [["feather_blade", "blackwing_marquis"]] }], { gold: [47700, 56700], exp: [46100, 54800] }, [{ itemId: "black_wing_feather", chance: .4, quantity: [1, 2] }], { clearStoryId: "blackwing_cloister_clear" }),
    fallen_star_foundry: route("fallen_star_foundry", "落星の鋳造所", "落星鋳造所", 74, 1800, 29800, 4, [{ type: "dungeonClear", dungeonId: "blackwing_cloister" }], "空から落ちた星を兵へ鋳直す炉。熱波が傷をさらに焼く。", [{ name: "隕鉄の炉道", groups: [["starforged_soldier", "furnace_wisp"], ["starforged_soldier", "starforged_soldier"]] }, { name: "星炉心", groups: [["furnace_wisp", "foundry_keeper"]] }], { gold: [51900, 61800], exp: [50200, 59700] }, [{ itemId: "fallen_star_iron", chance: .42, quantity: [1, 2] }], { clearStoryId: "fallen_star_foundry_clear" }),
    eclipsed_throne: route("eclipsed_throne", "日蝕の王座", "日蝕王座", 76, 1860, 32400, 5, [{ type: "dungeonClear", dungeonId: "fallen_star_foundry" }], "光を失った空城の玉座。蝕星王は地上へ降りる門を開こうとしている。", [{ name: "薄明の王廊", groups: [["eclipse_priest", "throne_guard", "eclipse_priest"], ["throne_guard", "throne_guard"]] }, { name: "日蝕の玉座", groups: [["throne_guard", "eclipse_regent"]] }], { gold: [56500, 67200], exp: [54600, 64900] }, [{ itemId: "eclipse_shard", chance: .4, quantity: [1, 2] }], { clearStoryId: "falling_sky_castle_clear" }),
    void_star_prison: route("void_star_prison", "虚星の牢獄", "虚星牢獄", 80, 2160, 40500, 6, [{ type: "chapterCompleted", chapterId: "falling_sky_castle" }], "王座の下に封じられた虚空の監獄。本編には不要な危険地帯。", [{ name: "無明の回廊", groups: [["throne_guard", "eclipse_priest", "blackwing_acolyte"]] }, { name: "虚星の独房", groups: [["void_archon", "eclipse_priest"]] }], { gold: [70600, 84600], exp: [68200, 81700] }, [{ itemId: "void_star_crystal", chance: .3, quantity: [1, 2] }], { requiredForStory: false, optionalStoryId: "void_star_prison_clear" })
  });

  data.registry.entityList("recipes", [
    { id: "forge_starpiercer_rapier", resultId: "starpiercer_rapier", gold: 5900, materials: { fallen_star_iron: 8, floating_core: 4, black_wing_feather: 2 }, unlockAfter: "falling_sky_castle" },
    { id: "forge_blackwing_plate", resultId: "blackwing_plate", gold: 6100, materials: { black_wing_feather: 8, fallen_star_iron: 5, cloud_wool: 2 }, unlockAfter: "falling_sky_castle" },
    { id: "forge_eclipse_staff", resultId: "eclipse_staff", gold: 6200, materials: { eclipse_shard: 7, floating_core: 4, aurora_feather: 2 }, unlockAfter: "falling_sky_castle" }
  ]);

  data.registry.entities("storyScenes", {
    falling_sky_castle_opening: { id: "falling_sky_castle_opening", name: "極光に浮かぶ城影", text: "白い山脈を越えた夜、極光の星路に巨大な城影が浮かんだ。黒い羽はそこから落ちている。リナは望遠鏡を下ろし、『女王の使者は、あの城へ向かったようです』と告げた。" },
    starroad_gate_clear: { id: "starroad_gate_clear", name: "門に刻まれた地上の地図", text: "外門の裏には、王朝が失った地上の都市が赤い印で刻まれていた。空城の軍勢は逃亡者ではなく、帰還の時を待っていたらしい。" },
    broken_sky_garden_clear: { id: "broken_sky_garden_clear", name: "星を育てる庭", text: "空中庭園の蔓は土ではなく、砕けた星の光を吸っていた。女王の使者は、その根から浮遊核を一つ持ち去っている。" },
    blackwing_cloister_clear: { id: "blackwing_cloister_clear", name: "黒翼侯の密命", text: "黒翼侯の書状には『星路の門を地上から開く者を探せ』とある。使者は捕らえられたのではなく、自ら王座へ案内させていた。" },
    fallen_star_foundry_clear: { id: "fallen_star_foundry_clear", name: "空へ向けられた兵器", text: "鋳造所で作られていた兵は地上侵攻用ではなかった。すべての照準は、星路のさらに外側にある暗い空へ向いている。" },
    falling_sky_castle_clear: { id: "falling_sky_castle_clear", name: "日蝕の王が恐れたもの", text: "蝕星王は門を開き、地上へ逃げようとしていた。女王の使者は王座の星図を奪い、空城より高い『黒い月』へ向かったという。" },
    void_star_prison_clear: { id: "void_star_prison_clear", name: "牢獄から届く星声", text: "虚星執政官は倒れる間際、黒い月を王朝の敵ではなく王朝自身が作った檻だと語った。空城の歴史には、消されたもう一人の王がいる。" }
  });
  data.registry.entityList("storyChapters", [{
    id: "falling_sky_castle", order: 9, number: 9, title: "第9章：落星の空中城", recommendedLevelRange: [68, 76],
    openingStoryId: "falling_sky_castle_opening", clearStoryId: "falling_sky_castle_clear",
    objective: "5つの本編ダンジョンを順番に攻略し、日蝕の王座を制圧する", entryRequirements: [],
    unlockText: "虚星の牢獄、星穿ちの細剣・黒翼の星鎧・蝕星の杖のレシピ、4,000G、蝕晶片×2",
    rewards: { gold: 4000, materials: { eclipse_shard: 2, guild_seal: 3 } }
  }]);
})();
