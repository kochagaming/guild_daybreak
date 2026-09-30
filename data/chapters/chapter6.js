(function () {
  "use strict";
  const data = window.GameData;

  Object.assign(data.items, {
    time_sand: { id: "time_sand", name: "時砂", type: "material", price: 0, icon: "⋮" },
    brass_gear: { id: "brass_gear", name: "真鍮歯車", type: "material", price: 0, icon: "⚙" },
    memory_glass: { id: "memory_glass", name: "記憶玻璃", type: "material", price: 0, icon: "◇" },
    royal_spring: { id: "royal_spring", name: "王機のぜんまい", type: "material", price: 0, icon: "↻" },
    giant_core: { id: "giant_core", name: "巨人の動力核", type: "material", price: 0, icon: "✦" },
    chronoglass_rapier: { id: "chronoglass_rapier", name: "時玻璃の細剣", type: "weapon", weaponType: "rapier", range: "melee", tier: 7, price: 5100, attack: 42, magicAttack: 20, attackCount: 3, hitRate: .2, speed: 8, defense: 2, hp: 16, weight: 6, icon: "†", craftOnly: true, salvage: { itemId: "memory_glass", quantity: 2 } },
    brasswall_shield: { id: "brasswall_shield", name: "真鍮城壁の盾", type: "armor", armorType: "shield", tier: 7, price: 5300, attack: 0, defense: 42, magicDefense: 25, hp: 74, weight: 16, icon: "⬟", craftOnly: true, salvage: { itemId: "brass_gear", quantity: 3 } },
    memory_robe: { id: "memory_robe", name: "記憶織りの法衣", type: "armor", armorType: "cloth", tier: 7, price: 5000, attack: 0, defense: 26, magicDefense: 43, magicAttack: 14, magicHealing: 18, hp: 48, evasionRate: .04, weight: 5, icon: "♜", craftOnly: true, salvage: { itemId: "time_sand", quantity: 3 } },
    gear_king_blade: { id: "gear_king_blade", name: "歯車王の機剣", type: "weapon", weaponType: "sword", range: "melee", tier: 7, price: 6900, attack: 58, magicAttack: 12, hitRate: .08, defense: 8, hp: 30, weight: 14, icon: "⚔", unique: true, salvage: { itemId: "royal_spring", quantity: 2 }, specialEffects: [{ kind: "weight_defense", multiplier: .8 }], effectDescription: "この武器の実重量1につき防御+0.8。重量補正と武器適性を反映する。" },
    titan_clock_armor: { id: "titan_clock_armor", name: "忘却巨人の時鎧", type: "armor", armorType: "heavy", tier: 8, price: 8500, attack: 8, defense: 58, magicDefense: 35, hp: 110, weight: 20, icon: "▧", unique: true, salvage: { itemId: "giant_core", quantity: 3 }, specialEffects: [{ kind: "weight_defense", multiplier: 1.2 }], effectDescription: "この鎧の実重量1につき防御+1.2。重量補正と防具適性を反映する。" }
  });

  Object.assign(data.monsters, {
    gate_scarab: { id: "gate_scarab", name: "門砂甲虫", hp: 1500, attack: 220, defense: 155, magicDefense: 85, speed: 38, icon: "▦", element: "arcane", elementModifiers: { arcane: .7, lightning: 1.25 } },
    tide_clockwork: { id: "tide_clockwork", name: "潮錆びの機兵", hp: 1750, attack: 235, defense: 175, magicDefense: 95, speed: 34, icon: "♟", element: "ice", statusResistances: { poison: 1 }, elementModifiers: { ice: .65, lightning: 1.3 } },
    gate_colossus: { id: "gate_colossus", name: "鏡門の巨像", hp: 15000, attack: 275, defense: 205, magicDefense: 110, speed: 35, icon: "♛", boss: true, actions: 3, element: "arcane", statusResistances: { poison: 1, paralysis: .6 }, elementModifiers: { arcane: .55, lightning: 1.35 }, mechanic: { kind: "telegraphed_burst", name: "鏡門衝波", period: 5, multiplier: 1.6, exposedMultiplier: 1.4, description: "門の光を集め、次ターン終了時に全体衝撃を放つ。発動後は装甲が開く。" } },
    sand_jackal: { id: "sand_jackal", name: "白砂の猟犬", hp: 1800, attack: 250, attackCount: 2, defense: 125, magicDefense: 90, speed: 48, icon: "◆", element: "nature", elementModifiers: { nature: .65, ice: 1.25 } },
    glass_nomad: { id: "glass_nomad", name: "玻璃面の遊牧兵", hp: 1950, attack: 270, defense: 145, magicDefense: 105, speed: 43, icon: "♟", targetRule: "rear_weighted", element: "arcane", elementModifiers: { arcane: .7, fire: 1.2 } },
    brass_basilisk: { id: "brass_basilisk", name: "真鍮のバジリスク", hp: 17000, attack: 300, defense: 220, magicDefense: 125, speed: 40, icon: "♛", boss: true, actions: 3, element: "lightning", statusAttack: { statusId: "paralysis", chance: .3, duration: 1 }, targetStatusId: "paralysis", elementModifiers: { lightning: .55, ice: 1.3 }, statusResistances: { poison: .8, paralysis: .8 } },
    minute_hand: { id: "minute_hand", name: "分針の衛兵", hp: 2100, attack: 285, attackCount: 2, defense: 165, magicDefense: 110, speed: 52, icon: "†", element: "arcane" },
    bell_wraith: { id: "bell_wraith", name: "鐘楼の亡霊", hp: 1850, attack: 275, magicAttack: 285, defense: 115, magicDefense: 135, speed: 45, icon: "☾", damageType: "magic", element: "dark", targetRule: "rear_weighted", elementModifiers: { dark: .6, fire: 1.25 } },
    clock_warden: { id: "clock_warden", name: "停止塔の番人", hp: 19000, attack: 325, defense: 220, magicDefense: 145, speed: 45, icon: "♛", boss: true, actions: 3, element: "arcane", targetRule: "rear_weighted", statusAttack: { statusId: "paralysis", chance: .25, duration: 1 }, elementModifiers: { arcane: .55, lightning: 1.3 } },
    gear_mason: { id: "gear_mason", name: "王機の組立工", hp: 2350, attack: 305, defense: 195, magicDefense: 125, speed: 37, icon: "⚙", element: "lightning", statusResistances: { poison: 1 } },
    spring_guard: { id: "spring_guard", name: "ぜんまい近衛", hp: 2350, attack: 295, defense: 190, magicDefense: 130, speed: 42, icon: "♜", element: "arcane", statusResistances: { poison: 1 } },
    gear_king: { id: "gear_king", name: "歯車王オルロイ", hp: 22000, attack: 315, defense: 205, magicDefense: 150, speed: 44, icon: "♛", boss: true, actions: 3, element: "lightning", statusResistances: { poison: 1, paralysis: .75 }, elementModifiers: { lightning: .5, ice: 1.3 }, bossDrop: { itemId: "gear_king_blade", chance: .08 }, mechanic: { kind: "telegraphed_burst", name: "王機一斉駆動", period: 4, multiplier: 1.55, exposedMultiplier: 1.45, description: "全歯車を噛み合わせ、次ターン終了時に全体攻撃。発動後は駆動が止まる。" } },
    memory_doll: { id: "memory_doll", name: "記憶写しの人形", hp: 2300, attack: 330, magicAttack: 355, defense: 145, magicDefense: 170, speed: 46, icon: "◇", damageType: "magic", element: "arcane" },
    hourglass_knight: { id: "hourglass_knight", name: "砂時計の騎士", hp: 2500, attack: 285, defense: 200, magicDefense: 145, speed: 41, icon: "♟", element: "dark", statusAttack: { statusId: "chill", chance: .25, duration: 3 } },
    time_queen: { id: "time_queen", name: "時砂女王クロノア", hp: 25500, attack: 280, magicAttack: 325, defense: 205, magicDefense: 165, speed: 48, icon: "♛", boss: true, actions: 3, damageType: "magic", element: "arcane", statusAttack: { statusId: "chill", chance: .35, duration: 3 }, elementModifiers: { arcane: .45, lightning: 1.3 }, statusResistances: { poison: .8, paralysis: .8, chill: .8 }, mechanic: { kind: "telegraphed_burst", name: "時砂の落日", period: 4, multiplier: 1.55, exposedMultiplier: 1.5, statusAmplifier: { statusId: "chill", multiplier: 1.15 }, description: "時砂を満たし、次ターン終了時に全体魔法。凍寒中の相手へ威力が増す。" } },
    forgotten_titan: { id: "forgotten_titan", name: "忘却の時計巨人", hp: 33000, attack: 350, defense: 235, magicDefense: 175, speed: 40, icon: "♛", boss: true, actions: 4, element: "dark", statusResistances: { poison: 1, paralysis: .9, chill: .75 }, elementModifiers: { dark: .45, lightning: 1.35 }, bossDrop: { itemId: "titan_clock_armor", chance: .1 }, mechanic: { kind: "telegraphed_burst", name: "忘却の鐘", period: 3, multiplier: 1.65, exposedMultiplier: 1.55, description: "短い周期で忘却の鐘を鳴らし、全体を押し潰す。発動後は動力核が露出する。" } }
  });

  const materials = {
    gate_scarab: [["time_sand", .5, 1, 2]], tide_clockwork: [["brass_gear", .55, 1, 2]], gate_colossus: [["memory_glass", 1, 2, 4]],
    sand_jackal: [["time_sand", .55, 1, 2]], glass_nomad: [["memory_glass", .5, 1, 2]], brass_basilisk: [["brass_gear", 1, 2, 4]],
    minute_hand: [["brass_gear", .6, 1, 2]], bell_wraith: [["time_sand", .6, 1, 2]], clock_warden: [["memory_glass", 1, 2, 4]],
    gear_mason: [["brass_gear", .7, 1, 3]], spring_guard: [["royal_spring", .35, 1, 1]], gear_king: [["royal_spring", 1, 2, 3]],
    memory_doll: [["memory_glass", .7, 1, 2]], hourglass_knight: [["time_sand", .7, 1, 3]], time_queen: [["royal_spring", 1, 2, 4]],
    forgotten_titan: [["giant_core", 1, 3, 5], ["royal_spring", 1, 2, 4]]
  };
  Object.entries(materials).forEach(([id, drops]) => { data.monsters[id].materialDrops = drops.map(([itemId, chance, minimum, maximum]) => ({ itemId, chance, quantity: [minimum, maximum] })); });

  const route = (id, name, shortName, level, duration, difficulty, order, requirements, description, encounters, rewards, drops, extra = {}) => ({
    id, name, shortName, recommendedLevel: level, duration, difficulty, color: "gold", chapterId: "clockwork_desert", orderInChapter: order, requiredForStory: true,
    unlockRequirements: requirements, description, strategy: { label: "未知の機構を調べる", feature: description, advice: "戦闘記録から敵の周期と狙いを確かめてください。", preparation: [] }, encounters, rewards, drops, ...extra
  });
  Object.assign(data.dungeons, {
    tidal_gate: route("tidal_gate", "潮引きの石門", "潮引き石門", 38, 720, 4400, 1, [{ type: "chapterCompleted", chapterId: "mirror_tide" }], "海底から現れた石門。砂に埋もれた機兵が門の向こうを守る。", [{ name: "干上がった海路", groups: [["gate_scarab", "tide_clockwork"], ["gate_scarab", "gate_scarab"]] }, { name: "鏡門前", groups: [["gate_colossus", "tide_clockwork"]] }], { gold: [8600, 10200], exp: [8300, 9900] }, [{ itemId: "time_sand", chance: .35, quantity: [1, 2] }], { clearStoryId: "tidal_gate_clear" }),
    white_sand_road: route("white_sand_road", "白砂の街道", "白砂街道", 40, 780, 5000, 2, [{ type: "dungeonClear", dungeonId: "tidal_gate" }], "海の記憶が砂へ変わった街道。玻璃面の兵が足跡を消して歩く。", [{ name: "風紋の道", groups: [["sand_jackal", "sand_jackal"], ["glass_nomad", "sand_jackal"]] }, { name: "真鍮の水場", groups: [["glass_nomad", "brass_basilisk"]] }], { gold: [9600, 11400], exp: [9300, 11000] }, [{ itemId: "memory_glass", chance: .35, quantity: [1, 2] }], { clearStoryId: "white_sand_road_clear" }),
    stopped_clocktower: route("stopped_clocktower", "止まった時計塔", "停止時計塔", 42, 840, 5700, 3, [{ type: "dungeonClear", dungeonId: "white_sand_road" }], "針が同じ刻を示し続ける塔。鐘が鳴るたび、亡霊が最後尾へ現れる。", [{ name: "分針階段", groups: [["minute_hand", "bell_wraith"], ["minute_hand", "minute_hand"]] }, { name: "止鐘の間", groups: [["clock_warden", "bell_wraith"]] }], { gold: [10800, 12800], exp: [10400, 12300] }, [{ itemId: "brass_gear", chance: .4, quantity: [1, 2] }], { clearStoryId: "stopped_clocktower_clear" }),
    royal_workshop: route("royal_workshop", "歯車王の工房", "歯車王工房", 44, 900, 6500, 4, [{ type: "dungeonClear", dungeonId: "stopped_clocktower" }], "都市を止めた命令が組み上げられた王立工房。今も歯車王が製造を続ける。", [{ name: "組立回廊", groups: [["gear_mason", "spring_guard"], ["gear_mason", "gear_mason"]] }, { name: "王機の炉", groups: [["spring_guard", "gear_king"]] }], { gold: [12100, 14300], exp: [11700, 13800] }, [{ itemId: "royal_spring", chance: .25, quantity: [1, 1] }], { clearStoryId: "royal_workshop_clear" }),
    hourglass_palace: route("hourglass_palace", "砂時計の王宮", "砂時計王宮", 46, 960, 7400, 5, [{ type: "dungeonClear", dungeonId: "royal_workshop" }], "失われた記憶を時砂へ変える王宮。女王は止まった都市の一日を繰り返す。", [{ name: "記憶の広間", groups: [["memory_doll", "hourglass_knight", "memory_doll"], ["hourglass_knight", "hourglass_knight"]] }, { name: "落日の玉座", groups: [["hourglass_knight", "time_queen"]] }], { gold: [13600, 16100], exp: [13200, 15600] }, [{ itemId: "royal_spring", chance: .3, quantity: [1, 2] }], { clearStoryId: "clockwork_desert_clear" }),
    forgotten_titan_tomb: route("forgotten_titan_tomb", "忘却巨人の墓", "忘却巨人墓", 50, 1080, 9000, 6, [{ type: "chapterCompleted", chapterId: "clockwork_desert" }], "都市の時間を動かしていた巨人が眠る墓。本編には不要な危険地帯。", [{ name: "砕けた文字盤", groups: [["spring_guard", "minute_hand", "spring_guard"]] }, { name: "動力核の墓室", groups: [["forgotten_titan"]] }], { gold: [17000, 20500], exp: [16500, 19800] }, [{ itemId: "giant_core", chance: .3, quantity: [1, 2] }], { requiredForStory: false, optionalStoryId: "forgotten_titan_clear" })
  });

  data.recipes.push(
    { id: "forge_chronoglass_rapier", resultId: "chronoglass_rapier", gold: 2300, materials: { memory_glass: 7, time_sand: 4, royal_spring: 1 }, unlockAfter: "clockwork_desert" },
    { id: "forge_brasswall_shield", resultId: "brasswall_shield", gold: 2500, materials: { brass_gear: 8, royal_spring: 2, abyssal_iron: 2 }, unlockAfter: "clockwork_desert" },
    { id: "forge_memory_robe", resultId: "memory_robe", gold: 2350, materials: { time_sand: 7, memory_glass: 4, drowned_ink: 2 }, unlockAfter: "clockwork_desert" }
  );

  Object.assign(data.storyScenes, {
    clockwork_desert_opening: { id: "clockwork_desert_opening", name: "海の底に残った一日", text: "鏡潮の宮殿で開いた門の先には、海ではなく白い砂漠が広がっていた。止まった時計がすべて同じ日を示している。リナは砂に埋もれた依頼書を拾い、『この街は滅びたのではなく、今日を終えられないようです』と告げた。" },
    tidal_gate_clear: { id: "tidal_gate_clear", name: "海を閉じた門", text: "巨像の胸から、海水を記憶玻璃へ変える機構が見つかった。門は侵入を防ぐものではなく、都市から海へ記憶が流れ出すのを止めていた。" },
    white_sand_road_clear: { id: "white_sand_road_clear", name: "足跡のない隊商", text: "白砂の下には、同じ道を何度も往復した隊商の車輪跡が重なっていた。彼らは王宮へ時砂を運び、一日が終わるたび出発地点へ戻されていた。" },
    stopped_clocktower_clear: { id: "stopped_clocktower_clear", name: "鳴らなかった最後の鐘", text: "時計塔の鐘は都市の終わりを告げる直前で止められていた。鐘楼の記録は、その命令が王宮ではなく歯車王の工房から届いたことを示す。" },
    royal_workshop_clear: { id: "royal_workshop_clear", name: "止めるために作られた王", text: "歯車王は反乱者ではなかった。女王の命令どおり、都市の時間を止める機械を作り続けていた。完成すれば人々の記憶まで時砂へ変わる。" },
    clockwork_desert_clear: { id: "clockwork_desert_clear", name: "明日へ落ちた時砂", text: "時砂女王が手を離すと、止まっていた砂時計が初めて落ち切った。都市に朝が訪れ、人々の記憶は戻らなくとも、新しい一日を選べるようになった。" },
    forgotten_titan_clear: { id: "forgotten_titan_clear", name: "都市を歩かせた巨人", text: "忘却の時計巨人は墓ではなく、都市そのものを運ぶ動力だった。核に残された地図は、砂漠のさらに先にある黒い森と、そこへ向かった女王の使者を示している。" }
  });
  data.storyChapters.push({
    id: "clockwork_desert", order: 6, number: 6, title: "第6章：止まった砂の都", recommendedLevelRange: [38, 46],
    openingStoryId: "clockwork_desert_opening", clearStoryId: "clockwork_desert_clear",
    objective: "5つの本編ダンジョンを順番に攻略し、砂時計の王宮を解放する", entryRequirements: [],
    unlockText: "忘却巨人の墓、時玻璃の細剣・真鍮城壁の盾・記憶織りの法衣のレシピ、2,000G、王機のぜんまい×2",
    rewards: { gold: 2000, materials: { royal_spring: 2, guild_seal: 3 } }
  });
})();
