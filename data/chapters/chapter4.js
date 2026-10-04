(function () {
  "use strict";
  const data = window.GameData;

  data.registry.entities("items", {
    skyglass: { id: "skyglass", name: "天玻璃", type: "material", price: 0, icon: "◇" },
    ashwood: { id: "ashwood", name: "灰樹の芯材", type: "material", price: 0, icon: "❧" },
    ember_ore: { id: "ember_ore", name: "熾火鉱", type: "material", price: 0, icon: "◆" },
    crown_core: { id: "crown_core", name: "灰冠の炉心", type: "material", price: 0, icon: "✦" },
    elder_scale: { id: "elder_scale", name: "古竜の灰鱗", type: "material", price: 0, icon: "▧" },

    dawn_rapier: { id: "dawn_rapier", name: "暁玻璃の細剣", type: "weapon", weaponType: "rapier", range: "melee", tier: 5, price: 1900, attack: 18, magicAttack: 9, attackCount: 2, hitRate: .14, speed: 4, defense: 0, hp: 0, weight: 5, icon: "†", craftOnly: true, salvage: { itemId: "skyglass", quantity: 2 } },
    ember_bulwark: { id: "ember_bulwark", name: "熾火の城盾", type: "armor", armorType: "shield", tier: 5, price: 2050, attack: 0, defense: 24, magicDefense: 10, hp: 30, weight: 11, icon: "⬟", craftOnly: true, salvage: { itemId: "ember_ore", quantity: 3 } },
    ashweave_mantle: { id: "ashweave_mantle", name: "灰樹織りの外套", type: "armor", armorType: "leather", tier: 5, price: 1950, attack: 0, defense: 17, magicDefense: 18, magicHealing: 7, hp: 24, speed: 4, evasionRate: .04, weight: 4, icon: "♜", craftOnly: true, salvage: { itemId: "ashwood", quantity: 2 } },
    ash_crown_plate: { id: "ash_crown_plate", name: "灰冠王の炉鎧", type: "armor", armorType: "heavy", tier: 5, price: 2900, attack: 0, defense: 18, magicDefense: 10, hp: 28, weight: 12, icon: "♜", unique: true, salvage: { itemId: "crown_core", quantity: 2 }, specialEffects: [{ kind: "weight_defense", multiplier: 1 }], effectDescription: "この鎧の実重量1につき防御+1。重量補正と防具適性を反映する。" },
    elder_wyrm_blade: { id: "elder_wyrm_blade", name: "古竜灰の大剣", type: "weapon", weaponType: "sword", range: "melee", tier: 6, price: 4200, attack: 46, magicAttack: 10, hitRate: .05, defense: 4, hp: 18, weight: 13, icon: "⚔", unique: true, salvage: { itemId: "elder_scale", quantity: 3 }, specialEffects: [{ kind: "critical_followup", multiplier: .65, name: "竜火の追撃" }], effectDescription: "会心時、攻撃力65%の追撃を1行動につき1回。追撃は会心せず、倒した場合は別の敵へ。" }
  });

  const monsters = {
    ash_hound: { id: "ash_hound", name: "灰駆けの猟犬", hp: 230, attack: 45, attackCount: 2, defense: 15, speed: 22, icon: "◆", element: "fire", elementModifiers: { fire: .75, ice: 1.2 } },
    cloud_manta: { id: "cloud_manta", name: "雲海エイ", hp: 270, attack: 47, defense: 18, speed: 18, icon: "⌁", element: "lightning", elementModifiers: { lightning: .7, ice: 1.15 } },
    gale_warden: { id: "gale_warden", name: "裂風の門衛", hp: 820, attack: 58, defense: 25, speed: 20, icon: "♜", boss: true, actions: 2, element: "lightning", elementModifiers: { lightning: .7, ice: 1.2 } },
    glass_sprite: { id: "glass_sprite", name: "玻璃羽の精", hp: 300, attack: 54, attackCount: 2, defense: 16, speed: 24, icon: "✧", element: "arcane", elementModifiers: { arcane: .7, nature: 1.2 } },
    thorn_stalker: { id: "thorn_stalker", name: "灰棘の追跡者", hp: 390, attack: 59, defense: 25, speed: 19, icon: "✣", element: "nature", statusAttack: { statusId: "poison", chance: .3, duration: 3, potency: .05 }, elementModifiers: { nature: .7, fire: 1.2 } },
    mirror_stag: { id: "mirror_stag", name: "鏡角の森主", hp: 1150, attack: 70, defense: 29, speed: 21, icon: "♛", boss: true, actions: 2, element: "arcane", elementModifiers: { arcane: .65, lightning: 1.2 } },
    cinder_imp: { id: "cinder_imp", name: "熾火の小鬼", hp: 390, attack: 64, attackCount: 2, defense: 22, speed: 20, icon: "♟", element: "fire", elementModifiers: { fire: .6, ice: 1.3 }, statusAttack: { statusId: "burn", chance: .3, duration: 3, potency: .04 } },
    forge_golem: { id: "forge_golem", name: "炉殻ゴーレム", hp: 620, attack: 72, defense: 42, speed: 10, icon: "▦", element: "fire", elementModifiers: { fire: .55, ice: 1.25, lightning: 1.15 }, statusResistances: { poison: 1, paralysis: .5 }, magicVulnerability: 1.2, traitDescription: "極めて高い防御。氷・雷・魔法攻撃と防御無視が有効。" },
    molten_colossus: { id: "molten_colossus", name: "溶鉱の巨像", hp: 1550, attack: 82, defense: 48, speed: 12, icon: "♜", boss: true, actions: 2, element: "fire", elementModifiers: { fire: .5, ice: 1.35 }, statusResistances: { poison: 1, paralysis: .6 }, magicVulnerability: 1.2 },
    ash_knight: { id: "ash_knight", name: "灰冠の騎士", hp: 620, attack: 78, defense: 38, speed: 18, icon: "♟", element: "fire", elementModifiers: { fire: .7, ice: 1.2 } },
    ember_seer: { id: "ember_seer", name: "炉火の星見", hp: 500, attack: 86, defense: 25, speed: 22, icon: "☾", element: "arcane", targetRule: "rear", traitDescription: "最後尾の生存者を狙う。", statusAttack: { statusId: "burn", chance: .35, duration: 3, potency: .04 } },
    ash_captain: { id: "ash_captain", name: "灰城の守将", hp: 1950, attack: 92, defense: 44, speed: 20, icon: "♛", boss: true, actions: 2, element: "fire", elementModifiers: { fire: .65, ice: 1.25 } },
    crown_guard: { id: "crown_guard", name: "王炉の近衛", hp: 850, attack: 94, defense: 48, speed: 18, icon: "♜", element: "fire", elementModifiers: { fire: .65, ice: 1.25 } },
    cinder_sovereign: { id: "cinder_sovereign", name: "灰冠王アグニス", hp: 6500, attack: 135, defense: 50, speed: 22, icon: "♛", boss: true, actions: 3, element: "fire", elementModifiers: { fire: .5, ice: 1.35 }, statusResistances: { burn: 1, poison: .5, paralysis: .6 }, bossDrop: { itemId: "ash_crown_plate", chance: .08 }, mechanic: { kind: "telegraphed_burst", name: "灰燼戴冠", period: 4, multiplier: 1.75, exposedMultiplier: 1.45, description: "灰熱を集めた次ターン終了時に全体攻撃。防御スキルで半減でき、発動後は隙が生まれる。" } },
    ash_drake: { id: "ash_drake", name: "灰翼の飛竜", hp: 1050, attack: 112, defense: 42, speed: 24, icon: "◆", element: "fire", elementModifiers: { fire: .55, ice: 1.3 }, statusAttack: { statusId: "burn", chance: .4, duration: 3, potency: .05 } },
    elder_ash_dragon: { id: "elder_ash_dragon", name: "古灰竜ヴァルガ", hp: 11500, attack: 170, defense: 60, speed: 25, icon: "♛", boss: true, actions: 3, element: "fire", elementModifiers: { fire: .4, ice: 1.4 }, statusResistances: { burn: 1, poison: .7, paralysis: .75 }, bossDrop: { itemId: "elder_wyrm_blade", chance: .1 }, mechanic: { kind: "telegraphed_burst", name: "終焉の竜炎", period: 3, multiplier: 1.9, exposedMultiplier: 1.5, description: "短い周期で全体竜炎を放つ。防御と解除を整え、発動後の隙に集中攻撃する。" } }
  };

  const materialDrops = {
    ash_hound: [["ashwood", .4, 1, 2]], cloud_manta: [["skyglass", .55, 1, 2]], gale_warden: [["skyglass", 1, 2, 4]],
    glass_sprite: [["skyglass", .7, 1, 2]], thorn_stalker: [["ashwood", .7, 1, 2]], mirror_stag: [["skyglass", .8, 2, 3], ["ashwood", 1, 2, 4]],
    cinder_imp: [["ember_ore", .5, 1, 2]], forge_golem: [["ember_ore", .8, 1, 3]], molten_colossus: [["ember_ore", 1, 3, 5]],
    ash_knight: [["ember_ore", .65, 1, 2]], ember_seer: [["ashwood", .55, 1, 2], ["skyglass", .4, 1, 1]], ash_captain: [["ember_ore", .9, 2, 4], ["crown_core", .55, 1, 1]],
    crown_guard: [["ember_ore", .75, 1, 3], ["crown_core", .35, 1, 1]], cinder_sovereign: [["crown_core", 1, 2, 3], ["ember_ore", 1, 3, 5]],
    ash_drake: [["elder_scale", .45, 1, 2]], elder_ash_dragon: [["elder_scale", 1, 3, 5], ["crown_core", .8, 1, 2]]
  };
  data.registry.relations("monsterMaterialDrops", Object.fromEntries(Object.entries(materialDrops).map(([id, entries]) => [id,
    entries.map(([itemId, chance, minimum, maximum]) => ({ itemId, chance, quantity: [minimum, maximum] }))
  ])));
  data.registry.entities("monsters", monsters);

  const scaling = (regularHp, regularAttack, bossHp, bossAttack) => ({ regular: { hp: regularHp, attack: regularAttack }, boss: { hp: bossHp, attack: bossAttack } });
  const routeBalance = {
    skyfall_road: { recommendedLevel: 21, difficulty: 900, gold: [1500, 1900], exp: [1500, 1900], monsterScaling: scaling(5, 4, 3, 2) },
    glasswood: { recommendedLevel: 22, difficulty: 1050, gold: [1750, 2200], exp: [1750, 2150], monsterScaling: scaling(5.5, 4.5, 3.2, 2.3) },
    ember_mine: { recommendedLevel: 24, difficulty: 1200, gold: [2050, 2550], exp: [2050, 2500], monsterScaling: scaling(5, 4, 3, 2) },
    ash_fortress: { recommendedLevel: 26, difficulty: 1400, gold: [2400, 2950], exp: [2350, 2850], monsterScaling: scaling(5, 4, 3, 2) },
    cinder_throne: { recommendedLevel: 27, difficulty: 1650, gold: [2900, 3550], exp: [2800, 3400], monsterScaling: scaling(3.2, 2.7, 1.6, 1.35) },
    elder_dragon_crater: { recommendedLevel: 30, difficulty: 2050, gold: [3900, 4700], exp: [3700, 4500], monsterScaling: scaling(2.6, 2.25, 1.25, 1.2) }
  };
  const route = (id, name, shortName, recommendedLevel, duration, difficulty, orderInChapter, unlockRequirements, description, strategy, encounters, rewards, drops, extra = {}) => {
    const balance = routeBalance[id] || {};
    return {
      id, name, shortName, recommendedLevel: balance.recommendedLevel ?? recommendedLevel, duration, difficulty: balance.difficulty ?? difficulty,
      color: "red", chapterId: "ember_crown", orderInChapter, requiredForStory: true,
      unlockRequirements, description, strategy, encounters,
      rewards: { gold: balance.gold || rewards.gold, exp: balance.exp || rewards.exp },
      drops, monsterScaling: balance.monsterScaling, ...extra
    };
  };
  data.registry.entities("dungeons", {
    skyfall_road: route("skyfall_road", "星降りの峠道", "星降り峠", 9, 240, 410, 1, [{ type: "chapterCompleted", chapterId: "starfall" }], "天文塔の星図が示した、灰の大地へ下る雲上の峠道。", { label: "素早い群れを崩す", feature: "灰駆けの猟犬と雲海エイが手数で攻める。", advice: "命中と全体攻撃を確保し、氷属性で門衛の耐性を崩しましょう。", preparation: ["area", "ice"] }, [{ name: "雲の裂け目", groups: [["ash_hound", "ash_hound"], ["cloud_manta", "ash_hound"]] }, { name: "星降りの坂", groups: [["cloud_manta", "cloud_manta"]] }, { name: "灰境の門", groups: [["gale_warden"]] }], { gold: [430, 620], exp: [300, 420] }, [{ itemId: "stormcloak", chance: .08, quantity: [1, 1] }], { clearStoryId: "skyfall_road_clear" }),
    glasswood: route("glasswood", "玻璃樹の迷い森", "玻璃樹林", 13, 300, 560, 2, [{ type: "dungeonClear", dungeonId: "skyfall_road" }], "灰の中で透き通った樹木が育つ、方向感覚を失う森。", { label: "毒と魔力へ備える", feature: "灰棘の追跡者は毒を与え、玻璃の精は魔力に強い。", advice: "炎と自然属性を使い分け、状態異常解除を用意しましょう。", preparation: ["cleanse", "heal"] }, [{ name: "透明な林縁", groups: [["glass_sprite", "glass_sprite"], ["thorn_stalker"]] }, { name: "灰棘の獣道", groups: [["thorn_stalker", "glass_sprite"]] }, { name: "鏡角の泉", groups: [["mirror_stag"]] }], { gold: [620, 850], exp: [480, 650] }, [{ itemId: "relic_rapier", chance: .09, quantity: [1, 1] }], { clearStoryId: "glasswood_clear" }),
    ember_mine: route("ember_mine", "熾火の旧鉱山", "熾火鉱山", 17, 360, 730, 3, [{ type: "dungeonClear", dungeonId: "glasswood" }], "王国の炉を支えた鉱山。今も岩壁の内側で赤い鉱脈が脈打つ。", { label: "装甲を氷で割る", feature: "炉殻ゴーレムは高防御で、炎に強く氷と魔法に弱い。", advice: "氷属性、防御無視、魔法攻撃を中心に編成しましょう。", preparation: ["penetration", "ice", "heal"] }, [{ name: "煤けた坑口", groups: [["cinder_imp", "cinder_imp"], ["forge_golem"]] }, { name: "赤熱鉱脈", groups: [["forge_golem", "cinder_imp"]] }, { name: "溶鉱炉跡", groups: [["molten_colossus"]] }], { gold: [850, 1150], exp: [720, 980] }, [{ itemId: "starsteel_sword", chance: .1, quantity: [1, 1] }], { clearStoryId: "ember_mine_clear" }),
    ash_fortress: route("ash_fortress", "灰壁の王城塞", "灰壁城塞", 21, 420, 930, 4, [{ type: "dungeonClear", dungeonId: "ember_mine" }], "炎が消えた後も命令を守り続ける兵が立つ、灰冠王国の城塞。", { label: "後列を炎から守る", feature: "炉火の星見は最後尾を狙い、火傷を付与する。", advice: "後列の耐久、火傷解除、氷属性を揃えて守将を突破しましょう。", preparation: ["rear", "cleanse", "ice"] }, [{ name: "灰壁の外郭", groups: [["ash_knight", "ash_knight"], ["ember_seer"]] }, { name: "消えない篝火", groups: [["ash_knight", "ember_seer"]] }, { name: "王城門", groups: [["ash_captain"]] }], { gold: [1150, 1500], exp: [1050, 1350] }, [{ itemId: "astral_katana", chance: .1, quantity: [1, 1] }], { clearStoryId: "ash_fortress_clear" }),
    cinder_throne: route("cinder_throne", "灰冠の玉座", "灰冠玉座", 25, 480, 1180, 5, [{ type: "dungeonClear", dungeonId: "ash_fortress" }], "灰冠王が王国最後の火を守る、崩れた宮殿の最奥。", { label: "戴冠の大技を耐える", feature: "灰冠王は予告後に全体攻撃を放ち、発動後に隙を見せる。", advice: "氷属性、全体回復、防御スキルを組み合わせ、大技後に攻めましょう。", preparation: ["guard", "heal", "cleanse", "ice"] }, [{ name: "王都の残火", groups: [["ash_knight", "ember_seer", "ash_knight"], ["crown_guard", "ember_seer"]] }, { name: "灰冠の回廊", groups: [["crown_guard", "crown_guard", "ember_seer"]] }, { name: "最後の玉座", groups: [["cinder_sovereign"]] }], { gold: [1550, 2050], exp: [1500, 1950] }, [{ itemId: "comet_staff", chance: .12, quantity: [1, 1] }], { clearStoryId: "ember_crown_clear" }),
    elder_dragon_crater: route("elder_dragon_crater", "古灰竜の火口", "古竜火口", 28, 600, 1550, 6, [{ type: "chapterCompleted", chapterId: "ember_crown" }], "王国が封じた古竜が眠る火口。本編攻略には必要のない危険地帯。", { label: "短周期の竜炎に耐える", feature: "古灰竜は火傷を伴う猛攻と短周期の全体大技を繰り返す。", advice: "炎耐性、状態異常解除、防御、継続回復を最優先しましょう。", preparation: ["guard", "heal", "cleanse", "ice"] }, [{ name: "灰鱗の斜面", groups: [["ash_drake", "ash_drake", "ash_drake"]] }, { name: "竜骨の輪", groups: [["ash_drake", "crown_guard", "ash_drake"]] }, { name: "古竜の火口", groups: [["elder_ash_dragon"]] }], { gold: [2200, 3000], exp: [2200, 2800] }, [{ itemId: "ash_crown_plate", chance: .08, quantity: [1, 1] }], { requiredForStory: false, optionalStoryId: "elder_dragon_clear" })
  });
  data.registry.entityList("recipes", [
    { id: "forge_dawn_rapier", resultId: "dawn_rapier", gold: 850, materials: { skyglass: 5, ashwood: 2, starsteel_ore: 2 }, unlockAfter: "ember_crown" },
    { id: "forge_ember_bulwark", resultId: "ember_bulwark", gold: 920, materials: { ember_ore: 7, crown_core: 2, starsteel_ore: 2 }, unlockAfter: "ember_crown" },
    { id: "forge_ashweave_mantle", resultId: "ashweave_mantle", gold: 880, materials: { ashwood: 6, skyglass: 3, crown_core: 1 }, unlockAfter: "ember_crown" }
  ]);

  data.registry.entities("storyScenes", {
    ember_crown_opening: { id: "ember_crown_opening", name: "星図の先の灰", text: "翼王の星図が示した光は、雲海の下に眠る灰冠王国へ続いていた。リナは五枚の地図を机に並べる。『一度の遠征では届きません。峠、森、鉱山、城塞を越えて、最後の火が残る玉座を目指しましょう。』" },
    skyfall_road_clear: { id: "skyfall_road_clear", name: "灰の大地への門", text: "裂風の門衛が崩れると、雲の切れ間から灰色の大地が姿を見せた。道標には、透き通る森を示す古い紋章が刻まれている。" },
    glasswood_clear: { id: "glasswood_clear", name: "玻璃樹が映した記憶", text: "鏡角の森主が守っていた泉には、王国の鉱山へ向かう人々の記憶が映った。彼らは地の底から『消えない火』を掘り出していた。" },
    ember_mine_clear: { id: "ember_mine_clear", name: "消えない炉の正体", text: "溶鉱の巨像の胸から、王冠と同じ形の炉心が見つかった。王国の火は自然の恵みではなく、何かから奪い取った力だった。" },
    ash_fortress_clear: { id: "ash_fortress_clear", name: "門を守り続けた者", text: "守将は倒れる間際、玉座へ続く門を開いた。命令に縛られた兵たちは侵入者を拒んでいたのではなく、王を外へ出さないために戦っていた。" },
    ember_crown_clear: { id: "ember_crown_clear", name: "最後の火を手放す時", text: "灰冠王は、滅びた国を留めるため炉心の火を抱え続けていた。王冠が砕けると灰の空に朝日が差し、止まっていた風が新しい道を描いた。" },
    elder_dragon_clear: { id: "elder_dragon_clear", name: "王国が火を奪った相手", text: "古灰竜の眠りを解くと、炉心の火が竜から奪われたものだと判明した。竜は最後の鱗を残して空へ去り、灰冠王国の長い罪と役目は静かに終わった。" }
  });
  data.registry.entityList("storyChapters", [{
    id: "ember_crown", order: 4, number: 4, title: "第4章：灰冠の大地", recommendedLevelRange: [20, 27],
    openingStoryId: "ember_crown_opening", clearStoryId: "ember_crown_clear",
    objective: "5つの本編ダンジョンを順番に攻略し、灰冠の玉座を解放する", entryRequirements: [],
    unlockText: "古灰竜の火口、暁玻璃の細剣・熾火の城盾・灰樹織りの外套のレシピ、1,200G、灰冠の炉心×2",
    rewards: { gold: 1200, materials: { crown_core: 2, guild_seal: 3 } }
  }]);
})();
