(function () {
  "use strict";
  const data = window.GameData;

  Object.assign(data.items, {
    primordial_bark: { id: "primordial_bark", name: "始原樹皮", type: "material", price: 0, icon: "▥" },
    star_seed: { id: "star_seed", name: "星種", type: "material", price: 0, icon: "✦" },
    memory_moss: { id: "memory_moss", name: "記憶苔", type: "material", price: 0, icon: "❧" },
    origin_amber: { id: "origin_amber", name: "始祖琥珀", type: "material", price: 0, icon: "◆" },
    first_star_core: { id: "first_star_core", name: "原星核", type: "material", price: 0, icon: "◉" },
    originwood_bow: { id: "originwood_bow", name: "始原木の長弓", type: "weapon", weaponType: "bow", range: "ranged", tier: 12, price: 15800, attack: 108, attackCount: 2, hitRate: .19, criticalRate: .12, speed: 11, hp: 80, weight: 8, icon: "➳", craftOnly: true, salvage: { itemId: "primordial_bark", quantity: 3 } },
    starroot_staff: { id: "starroot_staff", name: "星根の導杖", type: "weapon", weaponType: "staff", range: "ranged", tier: 12, price: 16100, attack: 5, magicAttack: 104, magicHealing: 82, magicDefense: 34, hp: 118, hitRate: .15, weight: 8, icon: "⚕", craftOnly: true, salvage: { itemId: "star_seed", quantity: 3 } },
    ancestor_leather: { id: "ancestor_leather", name: "始祖狩人の軽鎧", type: "armor", armorType: "leather", tier: 12, price: 16300, attack: 14, defense: 72, magicDefense: 48, hp: 210, speed: 12, evasionRate: .1, weight: 8, icon: "♜", craftOnly: true, salvage: { itemId: "memory_moss", quantity: 3 } },
    first_priestess_circlet: { id: "first_priestess_circlet", name: "始祖巫女の環", type: "armor", armorType: "gauntlet", tier: 12, price: 19800, attack: 24, defense: 48, magicAttack: 58, magicDefense: 68, magicHealing: 52, hitRate: .15, speed: 10, hp: 130, weight: 6, icon: "✥", unique: true, salvage: { itemId: "origin_amber", quantity: 4 } },
    firststar_sword: { id: "firststar_sword", name: "原星喰らいの剣", type: "weapon", weaponType: "sword", range: "melee", tier: 13, price: 22800, attack: 168, magicAttack: 68, hitRate: .15, criticalRate: .16, defense: 34, hp: 220, weight: 18, icon: "⚔", unique: true, salvage: { itemId: "first_star_core", quantity: 4 }, specialEffects: [{ kind: "weight_defense", multiplier: 1.5, name: "根鎧" }], effectDescription: "実重量1につき防御力が1.5上昇する。" }
  });

  Object.assign(data.monsters, {
    root_sentinel: { id: "root_sentinel", name: "根門の番人", hp: 9100, attack: 850, defense: 500, magicDefense: 410, speed: 62, icon: "♜", element: "nature", actions: 2 },
    starseed_moth: { id: "starseed_moth", name: "星種蛾", hp: 7900, attack: 650, magicAttack: 850, defense: 350, magicDefense: 455, speed: 82, icon: "✧", damageType: "magic", element: "arcane", actions: 2 },
    ancient_gatekeeper: { id: "ancient_gatekeeper", name: "原初門の守樹", hp: 116000, attack: 890, defense: 540, magicDefense: 470, speed: 61, icon: "♛", boss: true, actions: 4, element: "nature", elementModifiers: { nature: .3, fire: 1.35 }, statusResistances: { poison: 1, paralysis: .8 }, mechanic: { kind: "telegraphed_burst", name: "根界閉門", period: 5, multiplier: 1.8, exposedMultiplier: 1.5, description: "森中の根を門へ集め、次ターン終了時に全隊列を締め上げる。" } },
    amber_slime: { id: "amber_slime", name: "琥珀スライム", hp: 8500, attack: 690, magicAttack: 760, defense: 420, magicDefense: 470, speed: 58, icon: "●", damageType: "magic", element: "nature" },
    memory_deer: { id: "memory_deer", name: "記憶角の鹿", hp: 9600, attack: 900, attackCount: 2, defense: 430, magicDefense: 390, speed: 80, icon: "◆", element: "nature", actions: 2, targetRule: "rear_weighted" },
    seed_mother: { id: "seed_mother", name: "星苗の母樹", hp: 121000, attack: 740, magicAttack: 900, defense: 500, magicDefense: 540, speed: 64, icon: "♛", boss: true, actions: 4, damageType: "magic", element: "nature", statusAttack: { statusId: "poison", chance: .35, duration: 3 }, elementModifiers: { nature: .25, fire: 1.4 }, statusResistances: { poison: 1, burn: .7 } },
    moss_wraith: { id: "moss_wraith", name: "苔衣の亡霊", hp: 8500, attack: 680, magicAttack: 870, defense: 370, magicDefense: 490, speed: 72, icon: "◇", damageType: "magic", element: "dark", actions: 2 },
    origin_scribe: { id: "origin_scribe", name: "始原碑の書記", hp: 9200, attack: 720, magicAttack: 900, defense: 410, magicDefense: 500, speed: 66, icon: "▤", damageType: "magic", element: "arcane", actions: 2 },
    forgotten_druid: { id: "forgotten_druid", name: "忘名の樹導師", hp: 124000, attack: 780, magicAttack: 930, defense: 500, magicDefense: 555, speed: 69, icon: "♛", boss: true, actions: 4, damageType: "magic", element: "nature", statusAttack: { statusId: "chill", chance: .32, duration: 2 }, elementModifiers: { nature: .3, fire: 1.35 }, statusResistances: { poison: .9, chill: .85 } },
    ancestor_knight: { id: "ancestor_knight", name: "始祖王の樹騎士", hp: 10200, attack: 950, defense: 550, magicDefense: 430, speed: 65, icon: "♜", element: "nature", actions: 2 },
    firstborn_spirit: { id: "firstborn_spirit", name: "第一樹霊", hp: 8800, attack: 690, magicAttack: 930, defense: 390, magicDefense: 520, speed: 78, icon: "✧", damageType: "magic", element: "arcane", actions: 2 },
    first_priestess: { id: "first_priestess", name: "始祖巫女イルマ", hp: 130000, attack: 820, magicAttack: 950, defense: 530, magicDefense: 570, speed: 75, icon: "♛", boss: true, actions: 4, element: "arcane", targetRule: "rear_weighted", elementModifiers: { arcane: .3, dark: 1.35 }, statusResistances: { paralysis: .9, chill: .85 }, bossDrop: { itemId: "first_priestess_circlet", chance: .08 }, mechanic: { kind: "telegraphed_burst", name: "始祖星祷", period: 4, multiplier: 1.85, exposedMultiplier: 1.5, description: "原星の光を祈りへ束ね、次ターン終了時に全隊列へ降らせる。" } },
    worldroot_guard: { id: "worldroot_guard", name: "世界根の衛兵", hp: 10800, attack: 980, defense: 570, magicDefense: 450, speed: 63, icon: "♜", element: "nature", actions: 2 },
    star_bloom_seraph: { id: "star_bloom_seraph", name: "星花の熾使", hp: 9400, attack: 760, magicAttack: 980, defense: 430, magicDefense: 540, speed: 80, icon: "✦", damageType: "magic", element: "arcane", actions: 2 },
    origin_heart: { id: "origin_heart", name: "始原樹の心臓", hp: 138000, attack: 850, magicAttack: 980, defense: 570, magicDefense: 580, speed: 68, icon: "♛", boss: true, actions: 5, damageType: "magic", element: "nature", statusAttack: { statusId: "poison", chance: .34, duration: 3 }, elementModifiers: { nature: .2, fire: 1.4 }, statusResistances: { poison: 1, burn: .75, paralysis: .9 }, mechanic: { kind: "telegraphed_burst", name: "原星脈動", period: 4, multiplier: 1.9, exposedMultiplier: 1.55, description: "最初の星の鼓動を蓄え、次ターン終了時に樹海全体を震わせる。" } },
    primordial_devourer: { id: "primordial_devourer", name: "原星喰らい", hp: 176000, attack: 1050, magicAttack: 1000, defense: 620, magicDefense: 600, speed: 76, icon: "♛", boss: true, actions: 5, element: "dark", targetRule: "rear_weighted", elementModifiers: { dark: .2, fire: 1.35 }, statusResistances: { poison: 1, burn: .85, paralysis: .95, chill: .9 }, bossDrop: { itemId: "firststar_sword", chance: .1 }, mechanic: { kind: "telegraphed_burst", name: "星根捕食", period: 4, multiplier: 2, exposedMultiplier: 1.6, description: "世界根から星力を奪い、次ターン終了時に全隊列へ吐き戻す。" } }
  });

  const materials = {
    root_sentinel: [["primordial_bark", .55, 1, 2]], starseed_moth: [["star_seed", .5, 1, 2]], ancient_gatekeeper: [["primordial_bark", 1, 2, 4]],
    amber_slime: [["origin_amber", .5, 1, 2]], memory_deer: [["memory_moss", .55, 1, 2]], seed_mother: [["star_seed", 1, 2, 4]],
    moss_wraith: [["memory_moss", .55, 1, 2]], origin_scribe: [["origin_amber", .55, 1, 2]], forgotten_druid: [["memory_moss", 1, 2, 4]],
    ancestor_knight: [["primordial_bark", .65, 1, 2]], firstborn_spirit: [["star_seed", .6, 1, 2]], first_priestess: [["origin_amber", 1, 2, 4]],
    worldroot_guard: [["primordial_bark", .7, 1, 3]], star_bloom_seraph: [["star_seed", .65, 1, 2]], origin_heart: [["first_star_core", 1, 2, 4]],
    primordial_devourer: [["first_star_core", 1, 3, 5], ["origin_amber", 1, 3, 5]]
  };
  Object.entries(materials).forEach(([id, drops]) => { data.monsters[id].materialDrops = drops.map(([itemId, chance, minimum, maximum]) => ({ itemId, chance, quantity: [minimum, maximum] })); });

  const route = (id, name, shortName, level, duration, difficulty, order, requirements, description, encounters, rewards, drops, extra = {}) => ({
    id, name, shortName, recommendedLevel: level, duration, difficulty, color: "green", chapterId: "primordial_forest", orderInChapter: order, requiredForStory: true,
    unlockRequirements: requirements, description, strategy: { label: "始原樹海の記憶を辿る", feature: description, advice: "星光を含む根と、古い記憶をまとう生物の痕跡がある。", preparation: [] }, encounters, rewards, drops, ...extra
  });
  Object.assign(data.dungeons, {
    primal_root_gate: route("primal_root_gate", "原初の樹門", "原初樹門", 87, 2220, 51500, 1, [{ type: "chapterCompleted", chapterId: "black_moon_prison" }], "黒月に残された星図が示した樹海の入口。絡み合う根が訪問者の記憶を確かめる。", [{ name: "星苔の参道", groups: [["root_sentinel", "starseed_moth"], ["root_sentinel", "root_sentinel"]] }, { name: "原初門", groups: [["starseed_moth", "ancient_gatekeeper"]] }], { gold: [94400, 112300], exp: [91300, 108700] }, [{ itemId: "primordial_bark", chance: .42, quantity: [1, 2] }], { clearStoryId: "primal_root_gate_clear" }),
    starseed_nursery: route("starseed_nursery", "星種の苗床", "星種苗床", 88, 2280, 54800, 2, [{ type: "dungeonClear", dungeonId: "primal_root_gate" }], "空から落ちた星の種を樹木へ育てた苗床。琥珀の中で失われた季節が眠る。", [{ name: "琥珀の湿地", groups: [["amber_slime", "memory_deer"], ["amber_slime", "amber_slime"]] }, { name: "星苗の母床", groups: [["memory_deer", "seed_mother"]] }], { gold: [99200, 118100], exp: [96000, 114300] }, [{ itemId: "star_seed", chance: .43, quantity: [1, 2] }], { clearStoryId: "starseed_nursery_clear" }),
    memory_moss_woods: route("memory_moss_woods", "記憶苔の森", "記憶苔森", 89, 2340, 58200, 3, [{ type: "dungeonClear", dungeonId: "starseed_nursery" }], "踏んだ者の過去を胞子へ写す深緑の森。王朝以前の言葉が苔の下で囁く。", [{ name: "忘名の小径", groups: [["moss_wraith", "origin_scribe"], ["moss_wraith", "moss_wraith"]] }, { name: "樹導師の碑庭", groups: [["origin_scribe", "forgotten_druid"]] }], { gold: [104300, 124200], exp: [100900, 120100] }, [{ itemId: "memory_moss", chance: .44, quantity: [1, 2] }], { clearStoryId: "memory_moss_woods_clear" }),
    ancestor_altar: route("ancestor_altar", "始祖王の祭壇", "始祖祭壇", 90, 2400, 61800, 4, [{ type: "dungeonClear", dungeonId: "memory_moss_woods" }], "最初の王と巫女が星の力を受け取った祭壇。樹騎士は今も古い誓約を守る。", [{ name: "第一王の列柱", groups: [["ancestor_knight", "firstborn_spirit"], ["ancestor_knight", "ancestor_knight"]] }, { name: "始祖星祷壇", groups: [["firstborn_spirit", "first_priestess"]] }], { gold: [109700, 130700], exp: [106100, 126400] }, [{ itemId: "origin_amber", chance: .44, quantity: [1, 2] }], { clearStoryId: "ancestor_altar_clear" }),
    origin_tree_heart: route("origin_tree_heart", "始原樹の心室", "始原樹心室", 91, 2460, 65600, 5, [{ type: "dungeonClear", dungeonId: "ancestor_altar" }], "王朝へ最初の星力を送り続ける大樹の心室。女王の使者が地下へ続く根門を開こうとしている。", [{ name: "世界根回廊", groups: [["worldroot_guard", "star_bloom_seraph", "worldroot_guard"], ["star_bloom_seraph", "star_bloom_seraph"]] }, { name: "原星の心室", groups: [["worldroot_guard", "origin_heart"]] }], { gold: [115400, 137500], exp: [111600, 132900] }, [{ itemId: "first_star_core", chance: .4, quantity: [1, 2] }], { clearStoryId: "primordial_forest_clear" }),
    star_eater_rootpit: route("star_eater_rootpit", "星喰らいの根穴", "星喰根穴", 93, 2760, 78400, 6, [{ type: "chapterCompleted", chapterId: "primordial_forest" }], "始原樹の裏側で星力を喰らう根穴。本編には不要だが、王朝誕生以前の災厄が封じられている。", [{ name: "枯星の根道", groups: [["moss_wraith", "worldroot_guard", "starseed_moth"]] }, { name: "原星捕食孔", groups: [["primordial_devourer", "star_bloom_seraph"]] }], { gold: [138500, 165300], exp: [134000, 159800] }, [{ itemId: "first_star_core", chance: .34, quantity: [1, 2] }], { requiredForStory: false, optionalStoryId: "star_eater_rootpit_clear" })
  });

  data.recipes.push(
    { id: "forge_originwood_bow", resultId: "originwood_bow", gold: 8200, materials: { primordial_bark: 8, star_seed: 5, moon_silver: 2 }, unlockAfter: "primordial_forest" },
    { id: "forge_starroot_staff", resultId: "starroot_staff", gold: 8400, materials: { star_seed: 8, origin_amber: 4, sealed_memory: 2 }, unlockAfter: "primordial_forest" },
    { id: "forge_ancestor_leather", resultId: "ancestor_leather", gold: 8500, materials: { memory_moss: 8, primordial_bark: 5, dream_dust: 2 }, unlockAfter: "primordial_forest" }
  );

  Object.assign(data.storyScenes, {
    primordial_forest_opening: { id: "primordial_forest_opening", name: "王朝より古い森", text: "黒月の短剣が示した東の樹海では、夜になると根の間を星明かりが流れていた。リナは苔むした碑文をなぞる。『ここにあるのは王朝の始まりではありません。王朝が力を借りた、もっと古い何かです』。" },
    primal_root_gate_clear: { id: "primal_root_gate_clear", name: "門が覚えていた名", text: "樹門は女王の使者の名を知っていた。彼女は黒月で捨てた記憶を取り戻すためではなく、始原樹の心臓を止めるため森へ入ったという。" },
    starseed_nursery_clear: { id: "starseed_nursery_clear", name: "空から蒔かれた種", text: "苗床の琥珀には、地上へ落ちる無数の星種が閉じ込められていた。王朝の魔法は星を掘り当てたのではなく、森が育てた力を持ち去ったものだった。" },
    memory_moss_woods_clear: { id: "memory_moss_woods_clear", name: "最初の取引", text: "記憶苔が映したのは、初代王が森へ自らの幼い記憶を差し出す姿だった。星力の代価として、王統は代々少しずつ過去を失ってきた。" },
    ancestor_altar_clear: { id: "ancestor_altar_clear", name: "始祖巫女の警告", text: "巫女イルマは王へ、星の力はいずれ空の主を呼び戻すと警告していた。追放王が閉じようとした星路は、最初から帰還の道として作られていたのだ。" },
    primordial_forest_clear: { id: "primordial_forest_clear", name: "地下へ伸びる星の根", text: "心臓の脈動を鎮めると、使者が開いた根門が現れた。根は地中深くの青い光へ続いている。古い碑文はその場所を『星海』と呼んでいた。" },
    star_eater_rootpit_clear: { id: "star_eater_rootpit_clear", name: "森が育てた捕食者", text: "原星喰らいは災厄ではなく、星力が空へ戻らぬよう森が生み出した番犬だった。その牙には、地下の星海から上がってきた黒い鱗が挟まっている。" }
  });
  data.storyChapters.push({
    id: "primordial_forest", order: 11, number: 11, title: "第11章：始原樹海", recommendedLevelRange: [87, 91],
    openingStoryId: "primordial_forest_opening", clearStoryId: "primordial_forest_clear",
    objective: "5つの本編ダンジョンを順番に攻略し、始原樹の心臓を鎮める", entryRequirements: [],
    unlockText: "星喰らいの根穴、始原木の長弓・星根の導杖・始祖狩人の軽鎧のレシピ、6,000G、原星核×2",
    rewards: { gold: 6000, materials: { first_star_core: 2, guild_seal: 3 } }
  });
})();
