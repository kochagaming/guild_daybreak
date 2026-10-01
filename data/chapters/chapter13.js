(function () {
  "use strict";
  const data = window.GameData;

  Object.assign(data.items, {
    black_ice: { id: "black_ice", name: "黒氷", type: "material", price: 0, icon: "❄" },
    aurora_ore: { id: "aurora_ore", name: "極光鉱", type: "material", price: 0, icon: "✧" },
    star_sinew: { id: "star_sinew", name: "星獣の腱", type: "material", price: 0, icon: "≋" },
    vessel_fragment: { id: "vessel_fragment", name: "星器片", type: "material", price: 0, icon: "◇" },
    northstar_core: { id: "northstar_core", name: "北辰核", type: "material", price: 0, icon: "◉" },
    northstar_katana: { id: "northstar_katana", name: "北辰の太刀", type: "weapon", weaponType: "katana", range: "melee", tier: 14, price: 20700, attack: 154, attackCount: -1, hitRate: .14, criticalRate: .2, speed: 12, weight: 11, icon: "⌁", craftOnly: true, salvage: { itemId: "aurora_ore", quantity: 3 } },
    aurora_heavy: { id: "aurora_heavy", name: "極光の重鎧", type: "armor", armorType: "heavy", tier: 14, price: 21100, defense: 116, magicDefense: 68, hp: 390, speed: -3, weight: 16, icon: "♜", craftOnly: true, salvage: { itemId: "black_ice", quantity: 3 } },
    vessel_shield: { id: "vessel_shield", name: "星器の盾", type: "armor", armorType: "shield", tier: 14, price: 21300, defense: 126, magicDefense: 82, hp: 330, weight: 14, icon: "⬟", craftOnly: true, salvage: { itemId: "vessel_fragment", quantity: 3 } },
    sleeper_crown: { id: "sleeper_crown", name: "眠れる器の冠", type: "armor", armorType: "gauntlet", tier: 14, price: 24600, attack: 42, defense: 60, magicAttack: 68, magicDefense: 70, hitRate: .16, criticalRate: .12, speed: 18, hp: 170, weight: 7, icon: "✥", unique: true, salvage: { itemId: "northstar_core", quantity: 4 } },
    worldscar_bow: { id: "worldscar_bow", name: "世界傷の大弓", type: "weapon", weaponType: "bow", range: "ranged", tier: 15, price: 28400, attack: 176, attackCount: 3, hitRate: .23, criticalRate: .18, speed: 10, hp: 260, weight: 15, icon: "➳", unique: true, salvage: { itemId: "northstar_core", quantity: 4 }, specialEffects: [{ kind: "weight_defense", multiplier: 1.8, name: "氷星装甲" }], effectDescription: "実重量1につき防御力が1.8上昇する。" }
  });

  Object.assign(data.monsters, {
    frostwalker: { id: "frostwalker", name: "氷原の巡礼者", hp: 12100, attack: 1080, defense: 570, magicDefense: 540, speed: 76, icon: "♟", element: "ice", actions: 2 },
    aurora_wolf: { id: "aurora_wolf", name: "極光狼", hp: 11000, attack: 1150, attackCount: 2, defense: 500, magicDefense: 500, speed: 98, icon: "◆", element: "lightning", actions: 2, targetRule: "rear_weighted" },
    shore_warden: { id: "shore_warden", name: "凍海岸の守護者", hp: 176000, attack: 1150, defense: 710, magicDefense: 650, speed: 72, icon: "♛", boss: true, actions: 5, element: "ice", elementModifiers: { ice: .2, fire: 1.4 }, statusResistances: { chill: 1, paralysis: .85 }, mechanic: { kind: "telegraphed_burst", name: "氷海崩落", period: 5, multiplier: 2, exposedMultiplier: 1.6, description: "凍った星海を砕き、次ターン終了時に全隊列へ氷塊を落とす。" } },
    blacklight_wisp: { id: "blacklight_wisp", name: "黒光の鬼火", hp: 10900, attack: 820, magicAttack: 1110, defense: 460, magicDefense: 650, speed: 90, icon: "✦", damageType: "magic", element: "dark", actions: 2 },
    stargrave_knight: { id: "stargrave_knight", name: "星墓の騎士", hp: 12800, attack: 1180, defense: 680, magicDefense: 550, speed: 72, icon: "♜", element: "arcane", actions: 2 },
    aurora_mourner: { id: "aurora_mourner", name: "極光の喪主", hp: 181000, attack: 950, magicAttack: 1150, defense: 640, magicDefense: 720, speed: 82, icon: "♛", boss: true, actions: 5, damageType: "magic", element: "lightning", targetRule: "rear_weighted", statusAttack: { statusId: "paralysis", chance: .34, duration: 1 }, elementModifiers: { lightning: .2, nature: 1.4 }, statusResistances: { paralysis: 1, chill: .85 } },
    crater_beast: { id: "crater_beast", name: "星孔の獣", hp: 13000, attack: 1210, attackCount: 2, defense: 600, magicDefense: 530, speed: 92, icon: "◆", element: "dark", actions: 2 },
    fallen_seraph: { id: "fallen_seraph", name: "墜星の熾使", hp: 11700, attack: 880, magicAttack: 1170, defense: 510, magicDefense: 680, speed: 94, icon: "✧", damageType: "magic", element: "arcane", actions: 2 },
    grave_colossus: { id: "grave_colossus", name: "星墓巨像", hp: 188000, attack: 1240, defense: 770, magicDefense: 680, speed: 61, icon: "♛", boss: true, actions: 5, element: "arcane", elementModifiers: { arcane: .2, dark: 1.4 }, statusResistances: { poison: 1, paralysis: .9 }, mechanic: { kind: "telegraphed_burst", name: "墜星圧壊", period: 4, multiplier: 2.05, exposedMultiplier: 1.6, description: "墓標の星片を浮かべ、次ターン終了時に全隊列を押し潰す。" } },
    vessel_guard: { id: "vessel_guard", name: "星器城の衛兵", hp: 13600, attack: 1230, defense: 720, magicDefense: 590, speed: 75, icon: "♜", element: "arcane", actions: 2 },
    dream_drake: { id: "dream_drake", name: "夢渡りの小竜", hp: 12000, attack: 960, magicAttack: 1160, defense: 560, magicDefense: 650, speed: 96, icon: "≋", damageType: "magic", element: "dark", actions: 2, targetRule: "rear_weighted" },
    chamber_keeper: { id: "chamber_keeper", name: "器殿の封鍵守", hp: 193000, attack: 1180, magicAttack: 1180, defense: 740, magicDefense: 710, speed: 78, icon: "♛", boss: true, actions: 5, element: "arcane", statusAttack: { statusId: "chill", chance: .35, duration: 2 }, elementModifiers: { arcane: .2, dark: 1.4 }, statusResistances: { chill: .95, paralysis: .9 } },
    northstar_pilgrim: { id: "northstar_pilgrim", name: "北辰の巡礼者", hp: 12900, attack: 1190, defense: 650, magicDefense: 620, speed: 84, icon: "♟", element: "ice", actions: 2 },
    hollow_vessel: { id: "hollow_vessel", name: "空ろな星器", hp: 14200, attack: 980, magicAttack: 1210, defense: 640, magicDefense: 710, speed: 86, icon: "◇", damageType: "magic", element: "arcane", actions: 2 },
    sleeping_vessel: { id: "sleeping_vessel", name: "眠れる星の器", hp: 204000, attack: 1190, magicAttack: 1240, defense: 750, magicDefense: 750, speed: 82, icon: "♛", boss: true, actions: 6, damageType: "magic", element: "arcane", targetRule: "rear_weighted", statusAttack: { statusId: "paralysis", chance: .32, duration: 1 }, elementModifiers: { arcane: .15, dark: 1.4 }, statusResistances: { chill: .95, paralysis: .95 }, bossDrop: { itemId: "sleeper_crown", chance: .08 }, mechanic: { kind: "telegraphed_burst", name: "器星覚醒", period: 4, multiplier: 2.1, exposedMultiplier: 1.65, description: "器に満ちた星力を解放し、次ターン終了時に全隊列を光で灼く。" } },
    worldscar_dragon: { id: "worldscar_dragon", name: "世界傷の氷竜", hp: 258000, attack: 1370, magicAttack: 1220, defense: 810, magicDefense: 730, speed: 84, icon: "♛", boss: true, actions: 6, element: "ice", targetRule: "rear_weighted", elementModifiers: { ice: .1, fire: 1.45 }, statusResistances: { chill: 1, poison: .95, paralysis: .95 }, bossDrop: { itemId: "worldscar_bow", chance: .1 }, mechanic: { kind: "telegraphed_burst", name: "世界傷吹雪", period: 4, multiplier: 2.15, exposedMultiplier: 1.7, description: "大地の亀裂から吹雪を呼び、次ターン終了時に全隊列を凍結させる。" } }
  });

  const materials = {
    frostwalker: [["black_ice", .55, 1, 2]], aurora_wolf: [["star_sinew", .5, 1, 2]], shore_warden: [["black_ice", 1, 2, 4]],
    blacklight_wisp: [["aurora_ore", .55, 1, 2]], stargrave_knight: [["vessel_fragment", .5, 1, 2]], aurora_mourner: [["aurora_ore", 1, 2, 4]],
    crater_beast: [["star_sinew", .55, 1, 2]], fallen_seraph: [["aurora_ore", .55, 1, 2]], grave_colossus: [["vessel_fragment", 1, 2, 4]],
    vessel_guard: [["vessel_fragment", .6, 1, 2]], dream_drake: [["star_sinew", .6, 1, 2]], chamber_keeper: [["vessel_fragment", 1, 2, 4]],
    northstar_pilgrim: [["black_ice", .65, 1, 2]], hollow_vessel: [["vessel_fragment", .65, 1, 3]], sleeping_vessel: [["northstar_core", 1, 2, 4]],
    worldscar_dragon: [["northstar_core", 1, 3, 5], ["black_ice", 1, 3, 5]]
  };
  Object.entries(materials).forEach(([id, drops]) => { data.monsters[id].materialDrops = drops.map(([itemId, chance, minimum, maximum]) => ({ itemId, chance, quantity: [minimum, maximum] })); });

  const route = (id, name, shortName, level, duration, difficulty, order, requirements, description, encounters, rewards, drops, extra = {}) => ({
    id, name, shortName, recommendedLevel: level, duration, difficulty, color: "silver", chapterId: "northern_star_tomb", orderInChapter: order, requiredForStory: true,
    unlockRequirements: requirements, description, strategy: { label: "北天の星墓を調べる", feature: description, advice: "雪の下から、星海と同じ青い脈動が聞こえる。", preparation: [] }, encounters, rewards, drops, ...extra
  });
  Object.assign(data.dungeons, {
    frozen_starsea_shore: route("frozen_starsea_shore", "凍れる星海岸", "凍星海岸", 95, 2820, 87200, 1, [{ type: "chapterCompleted", chapterId: "starsea_corridor" }], "地下の星海が北方で地上へ露出した凍結海岸。巡礼者は眠る器への道を守る。", [{ name: "黒氷の浜", groups: [["frostwalker", "aurora_wolf"], ["frostwalker", "frostwalker"]] }, { name: "凍海の祭門", groups: [["aurora_wolf", "shore_warden"]] }], { gold: [150700, 179500], exp: [145800, 173700] }, [{ itemId: "black_ice", chance: .44, quantity: [1, 2] }], { clearStoryId: "frozen_starsea_shore_clear" }),
    black_aurora_field: route("black_aurora_field", "黒極光の雪原", "黒極光原", 95, 2880, 90800, 2, [{ type: "dungeonClear", dungeonId: "frozen_starsea_shore" }], "光を吸う黒い極光が揺れる雪原。星の器へ捧げられた者たちの墓標が続く。", [{ name: "光なき雪道", groups: [["blacklight_wisp", "stargrave_knight"], ["blacklight_wisp", "blacklight_wisp"]] }, { name: "極光葬庭", groups: [["stargrave_knight", "aurora_mourner"]] }], { gold: [157000, 187000], exp: [151900, 181000] }, [{ itemId: "aurora_ore", chance: .45, quantity: [1, 2] }], { clearStoryId: "black_aurora_field_clear" }),
    fallen_star_grave: route("fallen_star_grave", "墜星の墓標群", "墜星墓標", 96, 2940, 94600, 3, [{ type: "dungeonClear", dungeonId: "black_aurora_field" }], "星殻を墓標として並べた巨大な墜落孔。器になれなかった星獣が徘徊する。", [{ name: "星孔の縁", groups: [["crater_beast", "fallen_seraph"], ["crater_beast", "crater_beast"]] }, { name: "巨像墓標", groups: [["fallen_seraph", "grave_colossus"]] }], { gold: [163500, 194800], exp: [158200, 188500] }, [{ itemId: "star_sinew", chance: .45, quantity: [1, 2] }], { clearStoryId: "fallen_star_grave_clear" }),
    vessel_fortress: route("vessel_fortress", "星器封印城", "星器封印城", 96, 3000, 98600, 4, [{ type: "dungeonClear", dungeonId: "fallen_star_grave" }], "王朝が最後の器を眠らせた氷城。夢を渡る小竜が封鍵を見張る。", [{ name: "器城外郭", groups: [["vessel_guard", "dream_drake"], ["vessel_guard", "vessel_guard"]] }, { name: "封鍵の大殿", groups: [["dream_drake", "chamber_keeper"]] }], { gold: [170300, 202900], exp: [164700, 196200] }, [{ itemId: "vessel_fragment", chance: .45, quantity: [1, 2] }], { clearStoryId: "vessel_fortress_clear" }),
    northstar_cradle: route("northstar_cradle", "北辰の揺籃", "北辰揺籃", 97, 3060, 102800, 5, [{ type: "dungeonClear", dungeonId: "vessel_fortress" }], "星を人の姿へ留めるため造られた揺籃。女王の使者が眠れる器へ手を伸ばす。", [{ name: "空器の列室", groups: [["northstar_pilgrim", "hollow_vessel", "northstar_pilgrim"], ["hollow_vessel", "hollow_vessel"]] }, { name: "眠星の間", groups: [["northstar_pilgrim", "sleeping_vessel"]] }], { gold: [177400, 211400], exp: [171600, 204500] }, [{ itemId: "northstar_core", chance: .4, quantity: [1, 2] }], { clearStoryId: "northern_star_tomb_clear" }),
    worldscar_glacier: route("worldscar_glacier", "世界傷の氷河", "世界傷氷河", 98, 3360, 119000, 6, [{ type: "chapterCompleted", chapterId: "northern_star_tomb" }], "星の落下で裂けた大地を覆う氷河。本編には不要だが、器を地上へ運んだ古竜が眠る。", [{ name: "裂界氷路", groups: [["aurora_wolf", "dream_drake", "fallen_seraph"]] }, { name: "氷竜の世界傷", groups: [["worldscar_dragon", "blacklight_wisp"]] }], { gold: [212900, 253600], exp: [205900, 245300] }, [{ itemId: "northstar_core", chance: .35, quantity: [1, 2] }], { requiredForStory: false, optionalStoryId: "worldscar_glacier_clear" })
  });

  data.recipes.push(
    { id: "forge_northstar_katana", resultId: "northstar_katana", gold: 10300, materials: { aurora_ore: 8, star_sinew: 5, blue_star_sand: 2 }, unlockAfter: "northern_star_tomb" },
    { id: "forge_aurora_heavy", resultId: "aurora_heavy", gold: 10600, materials: { black_ice: 8, vessel_fragment: 4, abyssal_salt: 2 }, unlockAfter: "northern_star_tomb" },
    { id: "forge_vessel_shield", resultId: "vessel_shield", gold: 10700, materials: { vessel_fragment: 8, aurora_ore: 5, sea_glass_core: 2 }, unlockAfter: "northern_star_tomb" }
  );

  Object.assign(data.storyScenes, {
    northern_star_tomb_opening: { id: "northern_star_tomb_opening", name: "凍った海の出口", text: "星海の黒い流れを追って北へ向かうと、雪原の下から青い波音が響いていた。リナは凍った水面に人影を見つける。『星の器とは道具ではなく、人の形をした何かなのでしょうか』。" },
    frozen_starsea_shore_clear: { id: "frozen_starsea_shore_clear", name: "北天へ上がった星", text: "凍海岸の祭門は、地下から汲み上げた星力を人へ注ぐための入口だった。王朝は何代にもわたり、器になれる者を北へ送っていた。" },
    black_aurora_field_clear: { id: "black_aurora_field_clear", name: "名を失った墓標", text: "黒極光の下には、器になれなかった者の名が刻まれていた。そこには王族だけでなく、各地から集められた無数の子どもの名がある。" },
    fallen_star_grave_clear: { id: "fallen_star_grave_clear", name: "空から来なかった星", text: "墓標に使われた星殻は、すべて地下の星海で育ったものだった。王朝が語った『天より授かった力』は、長い支配を正当化するための物語にすぎない。" },
    vessel_fortress_clear: { id: "vessel_fortress_clear", name: "封鍵の内側", text: "氷城の記録には、最後の器が星力を拒み、自ら眠りについたとある。女王の使者は器を救うためではなく、その力で空への道を開こうとしていた。" },
    northern_star_tomb_clear: { id: "northern_star_tomb_clear", name: "目覚めた器の言葉", text: "眠れる器は目を開き、自らを『ノア』と名乗った。使者に奪われた星核を取り戻さなければ、空の主が地上へ降りるという。黒い光はすでに王都へ向かっていた。" },
    worldscar_glacier_clear: { id: "worldscar_glacier_clear", name: "古竜の記憶", text: "氷竜の記憶には、最初の器を拒んだ星が大地を裂く姿が残っていた。世界傷は戦いの跡ではなく、空の主が地上を覗き込んだ爪痕だった。" }
  });
  data.storyChapters.push({
    id: "northern_star_tomb", order: 13, number: 13, title: "第13章：北天星墓", recommendedLevelRange: [95, 97],
    openingStoryId: "northern_star_tomb_opening", clearStoryId: "northern_star_tomb_clear",
    objective: "5つの本編ダンジョンを順番に攻略し、眠れる星の器を目覚めさせる", entryRequirements: [],
    unlockText: "世界傷の氷河、北辰の太刀・極光の重鎧・星器の盾のレシピ、8,000G、北辰核×2",
    rewards: { gold: 8000, materials: { northstar_core: 2, guild_seal: 4 } }
  });
})();
