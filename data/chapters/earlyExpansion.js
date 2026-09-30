(function () {
  "use strict";
  const data = window.GameData;
  const drops = entries => entries.map(([itemId, chance, minimum, maximum]) => ({ itemId, chance, quantity: [minimum, maximum] }));

  Object.assign(data.monsters, {
    brook_sprite: { id: "brook_sprite", name: "せせらぎの精", hp: 30, attack: 8, defense: 2, speed: 13, icon: "◇", element: "nature", elementModifiers: { nature: .7, fire: 1.2 }, materialDrops: drops([["craft_material", .45, 1, 1]]) },
    moss_boar: { id: "moss_boar", name: "苔背のイノシシ", hp: 52, attack: 13, defense: 6, speed: 8, icon: "◆", materialDrops: drops([["beast_hide", .5, 1, 2]]) },
    road_brigand: { id: "road_brigand", name: "街道のならず者", hp: 64, attack: 16, defense: 7, speed: 12, icon: "♟", materialDrops: drops([["craft_material", .55, 1, 2], ["iron_ore", .2, 1, 1]]) },
    ruin_rat: { id: "ruin_rat", name: "廃駅の大鼠", hp: 58, attack: 15, attackCount: 2, defense: 5, speed: 17, icon: "✣", statusAttack: { statusId: "poison", chance: .2, duration: 3, potency: .03 }, materialDrops: drops([["beast_hide", .35, 1, 1]]) },
    moonfang_alpha: { id: "moonfang_alpha", name: "月牙の群狼王", hp: 310, attack: 28, defense: 12, speed: 16, icon: "♛", boss: true, actions: 2, materialDrops: drops([["beast_fang", 1, 2, 4], ["beast_hide", .8, 1, 2]]) },

    toxic_newt: { id: "toxic_newt", name: "毒灯イモリ", hp: 95, attack: 22, defense: 9, speed: 12, icon: "✣", statusAttack: { statusId: "poison", chance: .3, duration: 3, potency: .04 }, elementModifiers: { fire: 1.2, nature: .7 }, materialDrops: drops([["slime_gel", .5, 1, 2]]) },
    sporeling: { id: "sporeling", name: "胞子キノコ", hp: 120, attack: 24, defense: 12, speed: 8, icon: "♣", statusAttack: { statusId: "paralysis", chance: .18, duration: 1 }, materialDrops: drops([["arcane_dust", .3, 1, 1]]) },
    crystal_beetle: { id: "crystal_beetle", name: "晶殻甲虫", hp: 180, attack: 30, defense: 25, speed: 10, icon: "▦", magicVulnerability: 1.2, traitDescription: "硬い晶殻を持つ。魔法攻撃と防御無視が有効。", elementModifiers: { lightning: 1.2 }, materialDrops: drops([["iron_ore", .65, 1, 3], ["magic_stone", .2, 1, 1]]) },
    clockwork_miner: { id: "clockwork_miner", name: "機巧鉱夫", hp: 210, attack: 34, defense: 28, speed: 11, icon: "♜", statusResistances: { poison: 1 }, elementModifiers: { lightning: 1.2 }, materialDrops: drops([["iron_ore", .75, 2, 3]]) },
    earth_oracle: { id: "earth_oracle", name: "地脈の託宣機", hp: 780, attack: 48, defense: 32, speed: 14, icon: "♛", boss: true, actions: 2, element: "arcane", elementModifiers: { arcane: .7, lightning: 1.25 }, statusResistances: { poison: 1, paralysis: .5 }, materialDrops: drops([["magic_stone", 1, 2, 3], ["iron_ore", 1, 3, 5]]) },

    moon_scribe: { id: "moon_scribe", name: "月碑の書記", hp: 230, attack: 38, defense: 16, speed: 17, icon: "☾", element: "arcane", targetRule: "rear", traitDescription: "最後尾の生存者を狙う。", materialDrops: drops([["arcane_dust", .6, 1, 2]]) },
    void_moth: { id: "void_moth", name: "虚空蛾", hp: 205, attack: 40, attackCount: 2, defense: 13, speed: 23, icon: "✧", element: "dark", elementModifiers: { dark: .65, fire: 1.2 }, statusAttack: { statusId: "paralysis", chance: .25, duration: 1 }, materialDrops: drops([["arcane_dust", .5, 1, 2]]) },
    inverted_guard: { id: "inverted_guard", name: "逆さ回廊の衛兵", hp: 330, attack: 48, defense: 27, speed: 16, icon: "♜", element: "arcane", materialDrops: drops([["iron_ore", .55, 1, 2], ["magic_stone", .25, 1, 1]]) },
    star_devourer: { id: "star_devourer", name: "星喰みの影", hp: 390, attack: 55, defense: 22, speed: 20, icon: "◉", element: "dark", elementModifiers: { dark: .6, fire: 1.2 }, statusResistances: { poison: .5 }, materialDrops: drops([["star_shard", .55, 1, 2]]) },
    astral_archon: { id: "astral_archon", name: "星環の執政者", hp: 1950, attack: 86, defense: 38, speed: 21, icon: "♛", boss: true, actions: 3, element: "arcane", elementModifiers: { arcane: .55, lightning: 1.25 }, statusResistances: { poison: .6, paralysis: .6 }, mechanic: { kind: "telegraphed_burst", name: "星環崩壊", period: 5, multiplier: 1.55, exposedMultiplier: 1.4, description: "星環を展開した次ターン終了時に全体攻撃。発動後は一時的に防御が崩れる。" }, materialDrops: drops([["star_shard", 1, 2, 4], ["magic_stone", .8, 1, 2]]) }
  });

  const make = (id, name, shortName, level, duration, difficulty, chapterId, orderInChapter, previousId, color, description, strategy, encounters, rewards, equipmentDrops, clearStoryId) => ({
    id, name, shortName, recommendedLevel: level, duration, difficulty, color, chapterId, orderInChapter, requiredForStory: true,
    unlockRequirements: [{ type: "dungeonClear", dungeonId: previousId }], description, strategy, encounters, rewards, drops: equipmentDrops, clearStoryId
  });

  Object.assign(data.dungeons.meadow, { clearStoryId: "meadow_clear" });
  Object.assign(data.dungeons.cave, { recommendedLevel: 7, difficulty: 150, rewards: { gold: [170, 240], exp: [170, 230] }, clearStoryId: "cave_clear" });
  Object.assign(data.dungeons.ruins, { recommendedLevel: 14, difficulty: 430, rewards: { gold: [560, 740], exp: [580, 760] }, clearStoryId: "ruins_clear" });
  Object.assign(data.dungeons.observatory, { recommendedLevel: 23, difficulty: 950, rewards: { gold: [1650, 2150], exp: [1700, 2200] } });

  Object.assign(data.dungeons, {
    whispering_brook: make("whispering_brook", "囁きの小川", "囁きの小川", 2, 45, 48, "roadside", 2, "meadow", "green", "草原の先で荷車の轍が途切れた、精霊の声が響く浅瀬。", { label: "自然の精を散らす", feature: "素早い精霊と突進する獣が交互に現れる。", advice: "命中を確保し、前衛に防御装備を持たせましょう。", preparation: ["area"] }, [{ name: "水音の分かれ道", groups: [["brook_sprite", "brook_sprite"], ["moss_boar"]] }, { name: "苔むした浅瀬", groups: [["moss_boar", "brook_sprite"]] }, { name: "精霊の源", groups: [["brook_sprite", "brook_sprite", "moss_boar"]] }], { gold: [55, 85], exp: [35, 50] }, [{ itemId: "wooden_shield", chance: .1, quantity: [1, 1] }], "whispering_brook_clear"),
    brigand_pass: make("brigand_pass", "追い剥ぎの峠", "追い剥ぎ峠", 3, 60, 70, "roadside", 3, "whispering_brook", "green", "商隊を狙うならず者が、魔物を追い立てて待ち伏せする峠。", { label: "手数を減らす", feature: "複数のならず者が同時に攻撃する。", advice: "全体攻撃か素早い集中攻撃で敵の数を減らしましょう。", preparation: ["area"] }, [{ name: "崩れた柵", groups: [["road_brigand", "road_brigand"]] }, { name: "待ち伏せ坂", groups: [["road_brigand", "moss_boar"]] }, { name: "峠の見張り台", groups: [["road_brigand", "road_brigand", "road_brigand"]] }], { gold: [80, 120], exp: [55, 75] }, [{ itemId: "bronze_rapier", chance: .1, quantity: [1, 1] }], "brigand_pass_clear"),
    abandoned_station: make("abandoned_station", "朽ちた街道駅", "朽ちた街道駅", 5, 75, 100, "roadside", 4, "brigand_pass", "green", "避難した旅人の荷物が残る、魔物の巣になった宿場跡。", { label: "毒を長引かせない", feature: "大鼠の連続攻撃には低確率で毒が伴う。", advice: "回復と状態異常解除を用意しましょう。", preparation: ["cleanse", "heal"] }, [{ name: "壊れた馬房", groups: [["ruin_rat", "ruin_rat"]] }, { name: "無人の食堂", groups: [["ruin_rat", "road_brigand"]] }, { name: "地下の貯蔵庫", groups: [["ruin_rat", "ruin_rat", "moss_boar"]] }], { gold: [110, 155], exp: [80, 110] }, [{ itemId: "leather_armor", chance: .12, quantity: [1, 1] }], "abandoned_station_clear"),
    moonfang_den: make("moonfang_den", "月牙狼の巣穴", "月牙狼の巣", 7, 90, 135, "roadside", 5, "abandoned_station", "green", "街道の魔物を追い立てていた巨大な群狼王の巣。", { label: "二回行動へ備える", feature: "群狼王は素早く二回行動する。", advice: "前衛のHPと防御を整え、回復役を編成しましょう。", preparation: ["heal", "guard"] }, [{ name: "獣道の奥", groups: [["moss_boar", "ruin_rat"], ["road_brigand", "ruin_rat"]] }, { name: "月牙の広間", groups: [["moonfang_alpha"]] }], { gold: [150, 210], exp: [120, 165] }, [{ itemId: "hunter_bow", chance: .1, quantity: [1, 1] }], "roadside_clear"),

    fungal_depths: make("fungal_depths", "胞子灯の深層", "胞子灯深層", 9, 100, 180, "seal", 2, "cave", "blue", "洞窟の地下水脈に沿って、毒を持つ菌類が繁殖した空洞。", { label: "毒と麻痺を解除する", feature: "毒灯イモリと胞子キノコが状態異常を与える。", advice: "解除役を複数用意すると安定します。", preparation: ["cleanse", "heal"] }, [{ name: "胞子の坂", groups: [["toxic_newt", "sporeling"]] }, { name: "青灯の池", groups: [["toxic_newt", "toxic_newt"], ["sporeling", "sporeling"]] }, { name: "菌床の奥", groups: [["toxic_newt", "sporeling", "toxic_newt"]] }], { gold: [190, 260], exp: [170, 225] }, [{ itemId: "silkweave_robe", chance: .08, quantity: [1, 1] }], "fungal_depths_clear"),
    crystal_vein: make("crystal_vein", "鳴晶の鉱脈", "鳴晶鉱脈", 11, 120, 240, "seal", 3, "fungal_depths", "blue", "音に反応する結晶が甲虫の殻を覆う、閉鎖された採掘区。", { label: "晶殻を貫く", feature: "晶殻甲虫は物理防御が高い。", advice: "魔法攻撃と防御無視を用意しましょう。", preparation: ["penetration"] }, [{ name: "共鳴坑道", groups: [["crystal_beetle", "toxic_newt"]] }, { name: "晶柱の間", groups: [["crystal_beetle", "crystal_beetle"]] }, { name: "鉱脈の心臓", groups: [["crystal_beetle", "sporeling", "crystal_beetle"]] }], { gold: [250, 340], exp: [235, 310] }, [{ itemId: "delver_shield", chance: .08, quantity: [1, 1] }], "crystal_vein_clear"),
    sealed_workshop: make("sealed_workshop", "封鎖機巧工房", "機巧工房", 12, 135, 300, "seal", 4, "crystal_vein", "blue", "採掘場を守る機巧人形が今も作業を続ける古い工房。", { label: "重装の列を崩す", feature: "機巧鉱夫は毒を受けず、防御が高い。", advice: "雷・魔法・防御無視で一体ずつ崩しましょう。", preparation: ["penetration"] }, [{ name: "搬入口", groups: [["clockwork_miner", "clockwork_miner"]] }, { name: "止まらない作業場", groups: [["clockwork_miner", "crystal_beetle"]] }, { name: "制御室", groups: [["clockwork_miner", "clockwork_miner", "clockwork_miner"]] }], { gold: [330, 430], exp: [315, 405] }, [{ itemId: "rune_gauntlets", chance: .07, quantity: [1, 1] }], "sealed_workshop_clear"),
    earthpulse_altar: make("earthpulse_altar", "地脈封印祭壇", "地脈祭壇", 14, 160, 380, "seal", 5, "sealed_workshop", "blue", "坑道ゴーレムを動かしていた命令が発せられる地下祭壇。", { label: "託宣の連撃を耐える", feature: "地脈の託宣機は高防御で三回行動する。", advice: "雷属性と回復、防御無視を組み合わせましょう。", preparation: ["penetration", "heal", "guard"] }, [{ name: "封印回廊", groups: [["clockwork_miner", "crystal_beetle"], ["sporeling", "clockwork_miner"]] }, { name: "地脈の祭壇", groups: [["earth_oracle"]] }], { gold: [440, 580], exp: [430, 560] }, [{ itemId: "tower_shield", chance: .07, quantity: [1, 1] }], "seal_clear"),

    lunar_archive: make("lunar_archive", "月碑の書庫", "月碑書庫", 16, 180, 470, "starfall", 2, "ruins", "purple", "王朝の星読みが観測記録を刻んだ、月光の差す地下書庫。", { label: "後列を守る", feature: "月碑の書記は最後尾を狙う。", advice: "後衛にもHPと魔法防御を用意しましょう。", preparation: ["rear", "heal"] }, [{ name: "月光閲覧室", groups: [["moon_scribe", "void_moth"]] }, { name: "封印書架", groups: [["moon_scribe", "moon_scribe"], ["void_moth", "void_moth"]] }, { name: "碑文の奥", groups: [["moon_scribe", "void_moth", "moon_scribe"]] }], { gold: [580, 760], exp: [570, 720] }, [{ itemId: "soul_veil", chance: .08, quantity: [1, 1] }], "lunar_archive_clear"),
    inverted_cloister: make("inverted_cloister", "逆さ星の回廊", "逆さ回廊", 17, 210, 570, "starfall", 3, "lunar_archive", "purple", "天井と床の星図が入れ替わり、守護兵が上下から現れる回廊。", { label: "挟撃を素早く処理する", feature: "守護兵と虚空蛾が前後を同時に圧迫する。", advice: "全体攻撃、命中、後列の耐久を揃えましょう。", preparation: ["area", "rear"] }, [{ name: "反転階段", groups: [["inverted_guard", "void_moth"]] }, { name: "上下の星図", groups: [["inverted_guard", "inverted_guard"], ["moon_scribe", "void_moth"]] }, { name: "無重力回廊", groups: [["inverted_guard", "void_moth", "inverted_guard"]] }], { gold: [730, 940], exp: [750, 940] }, [{ itemId: "relic_rapier", chance: .09, quantity: [1, 1] }], "inverted_cloister_clear"),
    stargrave_corridor: make("stargrave_corridor", "星骸の墓道", "星骸墓道", 19, 240, 690, "starfall", 4, "inverted_cloister", "purple", "砕けた星の欠片と王朝の亡霊が漂う、祭壇へ続く墓道。", { label: "闇の群れを焼き払う", feature: "星喰みの影は闇に強く炎に弱い。", advice: "炎属性と全体回復で長い連戦を突破しましょう。", preparation: ["area", "heal"] }, [{ name: "星屑の墓標", groups: [["star_devourer", "star_devourer"]] }, { name: "亡霊の星列", groups: [["star_devourer", "moon_scribe"], ["inverted_guard", "star_devourer"]] }, { name: "落星の門", groups: [["star_devourer", "star_devourer", "void_moth"]] }], { gold: [940, 1200], exp: [980, 1220] }, [{ itemId: "starwoven_robe", chance: .08, quantity: [1, 1] }], "stargrave_corridor_clear"),
    astral_core: make("astral_core", "星環の中枢", "星環中枢", 20, 300, 820, "starfall", 5, "stargrave_corridor", "purple", "光の橋を起動する星環が眠る、王朝遺跡の真の中枢。", { label: "星環崩壊に備える", feature: "執政者は予告後に全体攻撃を放ち、発動後に隙を見せる。", advice: "防御スキル、全体回復、雷属性を揃えましょう。", preparation: ["guard", "heal"] }, [{ name: "中枢外郭", groups: [["inverted_guard", "moon_scribe"], ["star_devourer", "void_moth"]] }, { name: "星環制御室", groups: [["inverted_guard", "star_devourer", "moon_scribe"]] }, { name: "執政者の座", groups: [["astral_archon"]] }], { gold: [1250, 1600], exp: [1300, 1650] }, [{ itemId: "starsteel_sword", chance: .1, quantity: [1, 1] }], "starfall_clear")
  });

  const scaling = (regularHp, regularAttack, bossHp = regularHp, bossAttack = regularAttack) => ({
    regular: { hp: regularHp, attack: regularAttack }, boss: { hp: bossHp, attack: bossAttack }
  });
  Object.entries({
    meadow: scaling(1, 1), whispering_brook: scaling(1.2, 1.15), brigand_pass: scaling(1.5, 1.5), abandoned_station: scaling(1.7, 1.6), moonfang_den: scaling(1.8, 1.7, 1.8, 1.7),
    cave: scaling(2.2, 2, 4, 3), fungal_depths: scaling(3.3, 2.8), crystal_vein: scaling(3.3, 2.8), sealed_workshop: scaling(3, 2.5), earthpulse_altar: scaling(3, 2.5, 3.5, 2.35),
    ruins: scaling(3.2, 2.7, 10, 5), observatory: scaling(3.6, 3, 7, 3.5), lunar_archive: scaling(3.6, 3), inverted_cloister: scaling(4, 3.3), stargrave_corridor: scaling(3.7, 3.1), astral_core: scaling(3.7, 3.1, 2.2, 1.55)
  }).forEach(([id, monsterScaling]) => { data.dungeons[id].monsterScaling = monsterScaling; });
  Object.assign(data.dungeons.fungal_depths.rewards, { exp: [210, 270] });
  Object.assign(data.dungeons.lunar_archive.rewards, { exp: [700, 800] });

  Object.assign(data.storyScenes, {
    meadow_clear: { id: "meadow_clear", name: "草原に残った轍", text: "群れを退けても、商隊は戻らなかった。草むらに残る荷車の轍は、小川の向こうへ続いている。" },
    whispering_brook_clear: { id: "whispering_brook_clear", name: "精霊が聞いた足音", text: "小川の精は、武装した一団が商隊を峠へ追い込んだと告げた。魔物だけが街道を荒らしているのではない。" },
    brigand_pass_clear: { id: "brigand_pass_clear", name: "取り戻した荷札", text: "見張り台から商隊の荷札が見つかった。生き残った者たちは、街道駅へ逃げ込んだらしい。" },
    abandoned_station_clear: { id: "abandoned_station_clear", name: "宿場に残された警告", text: "宿場の壁には『狼たちは逃げている』と記されていた。さらに強大な群狼王が、街道の魔物すべてを追い立てている。" },
    cave_clear: { id: "cave_clear", name: "坑道の下の灯", text: "坑道ゴーレムの背後から、さらに深い空洞へ続く青い胞子灯が見えた。封印の命令は地底から送られている。" },
    fungal_depths_clear: { id: "fungal_depths_clear", name: "胞子に埋もれた記録", text: "毒の菌床から、結晶鉱脈の採掘記録が見つかった。鉱夫たちは封鎖直前まで、鳴く結晶を掘っていた。" },
    crystal_vein_clear: { id: "crystal_vein_clear", name: "鳴晶が伝える命令", text: "結晶は一定の間隔で古い命令を響かせていた。その送信先は、閉ざされた機巧工房だった。" },
    sealed_workshop_clear: { id: "sealed_workshop_clear", name: "止まれなかった鉱夫たち", text: "機巧鉱夫は地脈祭壇からの命令で動き続けていた。工房を止めるには、命令そのものを断つ必要がある。" },
    ruins_clear: { id: "ruins_clear", name: "祭壇の先の書庫", text: "番人の祭壇は遺跡の入口に過ぎなかった。月の紋章を押すと、王朝の観測記録を収めた書庫が開いた。" },
    lunar_archive_clear: { id: "lunar_archive_clear", name: "欠けた星図", text: "書庫の記録には、星環を起動するまでの道順が欠けていた。残された文字は『上下を疑え』と告げている。" },
    inverted_cloister_clear: { id: "inverted_cloister_clear", name: "反転した道の先", text: "逆さの回廊を抜けると、砕けた星を葬る墓道が現れた。星環を守る力は、そこから吸い上げられている。" },
    stargrave_corridor_clear: { id: "stargrave_corridor_clear", name: "星骸が示した中枢", text: "星喰みの影が消えると、墓道の奥に中枢への扉が浮かんだ。光の橋を起動する最後の守護者が待っている。" }
  });

  Object.assign(data.storyScenes.roadside_opening, { text: "街道の異変は狼の群れだけではなかった。商隊の轍は草原から小川、峠、朽ちた宿場へ続いている。『道を一つずつ取り戻し、魔物を追い立てる本当の原因を探しましょう。』" });
  Object.assign(data.storyScenes.seal_opening, { text: "坑道ゴーレムの停止だけでは封鎖は解けなかった。地下には胞子の深層、鳴晶の鉱脈、機巧工房が連なっている。『地脈の祭壇まで進み、命令の源を止めてください。』" });
  Object.assign(data.storyScenes.starfall_opening, { text: "石板が示した古代遺跡は、祭壇の先にも広がっていた。月碑の書庫、逆さ回廊、星骸の墓道を越え、星環の中枢を起動すれば天文塔への光の橋が開く。" });
  const objectives = {
    roadside: "草原から月牙狼の巣まで、5つの本編ダンジョンを攻略する",
    seal: "燐光の洞窟から地脈封印祭壇まで、5つの本編ダンジョンを攻略する",
    starfall: "古代遺跡から星環の中枢まで、5つの本編ダンジョンを攻略する"
  };
  data.storyChapters.forEach(chapter => { if (objectives[chapter.id]) chapter.objective = objectives[chapter.id]; });
})();
