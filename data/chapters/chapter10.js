(function () {
  "use strict";
  const data = window.GameData;

  data.registry.entities("items", {
    moon_silver: { id: "moon_silver", name: "月銀", type: "material", price: 0, icon: "☾" },
    sealed_memory: { id: "sealed_memory", name: "封じた記憶", type: "material", price: 0, icon: "▤" },
    dream_dust: { id: "dream_dust", name: "夢塵", type: "material", price: 0, icon: "✧" },
    chain_core: { id: "chain_core", name: "銀鎖核", type: "material", price: 0, icon: "⌁" },
    royal_eclipse_fragment: { id: "royal_eclipse_fragment", name: "王蝕片", type: "material", price: 0, icon: "◑" },
    moonchain_katana: { id: "moonchain_katana", name: "月鎖の太刀", type: "weapon", weaponType: "katana", range: "melee", tier: 11, price: 13600, attack: 118, attackCount: -1, hitRate: .1, criticalRate: .16, speed: 7, defense: 8, hp: 58, weight: 15, icon: "⌁", craftOnly: true, salvage: { itemId: "moon_silver", quantity: 3 } },
    dreamweave_robe: { id: "dreamweave_robe", name: "夢織りの法衣", type: "armor", armorType: "cloth", tier: 11, price: 13400, attack: 0, defense: 48, magicDefense: 82, magicAttack: 25, magicHealing: 48, speed: 5, evasionRate: .08, hp: 145, weight: 6, icon: "✧", craftOnly: true, salvage: { itemId: "dream_dust", quantity: 3 } },
    jailer_shield: { id: "jailer_shield", name: "月牢守の大盾", type: "armor", armorType: "shield", tier: 11, price: 13900, attack: 6, defense: 86, magicDefense: 56, hp: 180, weight: 20, icon: "⬟", craftOnly: true, salvage: { itemId: "chain_core", quantity: 3 } },
    moonwarden_gauntlets: { id: "moonwarden_gauntlets", name: "銀鎖将の篭手", type: "armor", armorType: "gauntlet", tier: 11, price: 17600, attack: 38, defense: 52, magicDefense: 32, hitRate: .16, criticalRate: .1, speed: 9, hp: 92, weight: 8, icon: "✥", unique: true, salvage: { itemId: "chain_core", quantity: 4 }, specialEffects: [{ kind: "critical_followup", multiplier: .8, name: "銀鎖の追撃" }], effectDescription: "会心時、攻撃力80%の追撃を1行動につき1回行う。" },
    exiled_king_blade: { id: "exiled_king_blade", name: "追放王の月蝕剣", type: "weapon", weaponType: "sword", range: "melee", tier: 12, price: 20500, attack: 145, magicAttack: 52, hitRate: .13, criticalRate: .15, defense: 30, magicDefense: 24, hp: 190, weight: 17, icon: "⚔", unique: true, salvage: { itemId: "royal_eclipse_fragment", quantity: 4 }, specialEffects: [{ kind: "weight_defense", multiplier: 1.5, name: "王鎖の守り" }], effectDescription: "実重量1につき防御力が1.5上昇する。" }
  });

  const monsters = {
    moon_skiff_raider: { id: "moon_skiff_raider", name: "月舟の襲撃兵", hp: 6900, attack: 710, defense: 370, magicDefense: 300, speed: 76, icon: "♟", element: "dark", targetRule: "rear_weighted", actions: 2 },
    lunar_hound: { id: "lunar_hound", name: "月影猟犬", hp: 7400, attack: 760, attackCount: 2, defense: 350, magicDefense: 290, speed: 82, icon: "◆", element: "dark", actions: 2 },
    mooring_warden: { id: "mooring_warden", name: "接岸橋の監守", hp: 92000, attack: 740, defense: 390, magicDefense: 390, speed: 60, icon: "♛", boss: true, actions: 4, element: "arcane", statusAttack: { statusId: "paralysis", chance: .32, duration: 1 }, elementModifiers: { arcane: .35, lightning: 1.3 }, statusResistances: { paralysis: .85, chill: .75 }, mechanic: { kind: "telegraphed_burst", name: "月舟封鎖", period: 5, multiplier: 1.7, exposedMultiplier: 1.45, description: "接岸鎖へ力を集め、次ターン終了時に橋全体を薙ぐ。" } },
    memory_leech: { id: "memory_leech", name: "記憶喰らい", hp: 7200, attack: 590, magicAttack: 740, defense: 315, magicDefense: 385, speed: 70, icon: "◉", damageType: "magic", element: "dark", statusAttack: { statusId: "poison", chance: .3, duration: 3 } },
    sealed_librarian: { id: "sealed_librarian", name: "封書の司書", hp: 7600, attack: 620, magicAttack: 790, defense: 330, magicDefense: 420, speed: 62, icon: "▤", damageType: "magic", element: "arcane", actions: 2 },
    archive_jailer: { id: "archive_jailer", name: "記憶牢の看守", hp: 96000, attack: 690, magicAttack: 760, defense: 430, magicDefense: 420, speed: 63, icon: "♛", boss: true, actions: 4, damageType: "magic", element: "dark", statusAttack: { statusId: "chill", chance: .32, duration: 2 }, elementModifiers: { dark: .35, fire: 1.3 }, statusResistances: { poison: .8, chill: .85 } },
    silver_chain_knight: { id: "silver_chain_knight", name: "銀鎖騎士", hp: 8200, attack: 820, defense: 455, magicDefense: 345, speed: 61, icon: "♜", element: "arcane", actions: 2 },
    chain_wisp: { id: "chain_wisp", name: "鎖火の鬼灯", hp: 7000, attack: 600, magicAttack: 810, defense: 300, magicDefense: 400, speed: 73, icon: "✧", damageType: "magic", element: "fire", statusAttack: { statusId: "burn", chance: .32, duration: 3 } },
    chain_matriarch: { id: "chain_matriarch", name: "銀鎖将アルジェナ", hp: 105000, attack: 850, defense: 480, magicDefense: 390, speed: 72, icon: "♛", boss: true, actions: 4, element: "arcane", targetRule: "rear_weighted", elementModifiers: { arcane: .35, dark: 1.3 }, statusResistances: { paralysis: .85, chill: .8 }, bossDrop: { itemId: "moonwarden_gauntlets", chance: .08 }, mechanic: { kind: "telegraphed_burst", name: "銀月縛陣", period: 4, multiplier: 1.8, exposedMultiplier: 1.5, description: "銀鎖を全隊列へ伸ばし、次ターン終了時に一斉に締め上げる。" } },
    dream_eater: { id: "dream_eater", name: "夢喰い獣", hp: 8000, attack: 760, magicAttack: 650, defense: 360, magicDefense: 360, speed: 78, icon: "◆", element: "dark", actions: 2, targetRule: "rear_weighted" },
    sleepwalker_guard: { id: "sleepwalker_guard", name: "夢遊の衛兵", hp: 8700, attack: 850, defense: 470, magicDefense: 350, speed: 58, icon: "♜", element: "dark", actions: 2 },
    nightmare_oracle: { id: "nightmare_oracle", name: "悪夢の託宣者", hp: 96000, attack: 650, magicAttack: 735, defense: 380, magicDefense: 415, speed: 68, icon: "♛", boss: true, actions: 3, damageType: "magic", element: "dark", statusAttack: { statusId: "paralysis", chance: .3, duration: 1 }, elementModifiers: { dark: .3, arcane: 1.35 }, statusResistances: { poison: .85, paralysis: .85 } },
    blackmoon_priest: { id: "blackmoon_priest", name: "黒月の祭司", hp: 8000, attack: 620, magicAttack: 760, defense: 345, magicDefense: 430, speed: 67, icon: "☾", damageType: "magic", element: "dark", actions: 2 },
    lunar_automaton: { id: "lunar_automaton", name: "月輪機兵", hp: 8800, attack: 790, defense: 455, magicDefense: 390, speed: 57, icon: "♜", element: "arcane", actions: 2 },
    blackmoon_heart: { id: "blackmoon_heart", name: "黒月の心核", hp: 108000, attack: 720, magicAttack: 770, defense: 440, magicDefense: 440, speed: 65, icon: "♛", boss: true, actions: 4, damageType: "magic", element: "dark", statusAttack: { statusId: "chill", chance: .32, duration: 2 }, elementModifiers: { dark: .25, lightning: 1.35 }, statusResistances: { poison: .9, burn: .75, paralysis: .9, chill: .9 }, mechanic: { kind: "telegraphed_burst", name: "黒月落下", period: 4, multiplier: 1.8, exposedMultiplier: 1.5, description: "黒月の外殻を開き、次ターン終了時に蓄えた記憶を衝撃へ変える。" } },
    exiled_king: { id: "exiled_king", name: "追放王エルガン", hp: 142000, attack: 850, magicAttack: 800, defense: 500, magicDefense: 470, speed: 72, icon: "♛", boss: true, actions: 5, element: "dark", targetRule: "rear_weighted", elementModifiers: { dark: .2, lightning: 1.4 }, statusResistances: { poison: 1, burn: .85, paralysis: .95, chill: .9 }, bossDrop: { itemId: "exiled_king_blade", chance: .1 }, mechanic: { kind: "telegraphed_burst", name: "王蝕月葬", period: 4, multiplier: 1.9, exposedMultiplier: 1.55, description: "奪われた王権を剣へ集め、次ターン終了時に全隊列を月蝕へ沈める。" } }
  };

  const materials = {
    moon_skiff_raider: [["moon_silver", .5, 1, 2]], lunar_hound: [["dream_dust", .45, 1, 2]], mooring_warden: [["chain_core", 1, 2, 4]],
    memory_leech: [["sealed_memory", .5, 1, 2]], sealed_librarian: [["sealed_memory", .6, 1, 2]], archive_jailer: [["sealed_memory", 1, 2, 4]],
    silver_chain_knight: [["moon_silver", .65, 1, 2]], chain_wisp: [["chain_core", .55, 1, 2]], chain_matriarch: [["chain_core", 1, 2, 4]],
    dream_eater: [["dream_dust", .55, 1, 2]], sleepwalker_guard: [["moon_silver", .6, 1, 2]], nightmare_oracle: [["dream_dust", 1, 2, 4]],
    blackmoon_priest: [["sealed_memory", .65, 1, 2]], lunar_automaton: [["chain_core", .7, 1, 3]], blackmoon_heart: [["royal_eclipse_fragment", 1, 2, 4]],
    exiled_king: [["royal_eclipse_fragment", 1, 3, 5], ["moon_silver", 1, 3, 5]]
  };
  data.registry.relations("monsterMaterialDrops", Object.fromEntries(Object.entries(materials).map(([id, entries]) => [id,
    entries.map(([itemId, chance, minimum, maximum]) => ({ itemId, chance, quantity: [minimum, maximum] }))
  ])));
  data.registry.entities("monsters", monsters);

  const route = (id, name, shortName, level, duration, difficulty, order, requirements, description, encounters, rewards, drops, extra = {}) => ({
    id, name, shortName, recommendedLevel: level, duration, difficulty, color: "purple", chapterId: "black_moon_prison", orderInChapter: order, requiredForStory: true,
    unlockRequirements: requirements, description, strategy: { label: "黒月の封鎖を辿る", feature: description, advice: "後列へ伸びる鎖と、記憶を蝕む術の痕跡が残っている。", preparation: [] }, encounters, rewards, drops, ...extra
  });
  data.registry.entities("dungeons", {
    moonshadow_dock: route("moonshadow_dock", "月影の接岸橋", "月影接岸橋", 78, 1920, 35200, 1, [{ type: "chapterCompleted", chapterId: "falling_sky_castle" }], "空城の星路から黒月へ渡る接岸橋。月舟の兵が退路を封じている。", [{ name: "月舟の桟橋", groups: [["moon_skiff_raider", "lunar_hound"], ["moon_skiff_raider", "moon_skiff_raider"]] }, { name: "接岸鎖の門", groups: [["lunar_hound", "mooring_warden"]] }], { gold: [61200, 72800], exp: [59100, 70300] }, [{ itemId: "moon_silver", chance: .4, quantity: [1, 2] }], { clearStoryId: "moonshadow_dock_clear" }),
    sealed_memory_ward: route("sealed_memory_ward", "記憶封鎖区", "記憶封鎖区", 80, 1980, 38200, 2, [{ type: "dungeonClear", dungeonId: "moonshadow_dock" }], "奪われた記憶を封書へ変える収蔵区。使者の名も棚に綴じられている。", [{ name: "封書の書架", groups: [["memory_leech", "sealed_librarian"], ["memory_leech", "memory_leech"]] }, { name: "記憶牢の閲覧室", groups: [["sealed_librarian", "archive_jailer"]] }], { gold: [66900, 79600], exp: [64700, 77000] }, [{ itemId: "sealed_memory", chance: .42, quantity: [1, 2] }], { clearStoryId: "sealed_memory_ward_clear" }),
    silver_chain_gallery: route("silver_chain_gallery", "銀鎖の回廊", "銀鎖回廊", 82, 2040, 41400, 3, [{ type: "dungeonClear", dungeonId: "sealed_memory_ward" }], "王族を黒月へ繋いだ銀鎖の回廊。鎖は侵入者の隊列を測って動く。", [{ name: "銀鎖列柱", groups: [["silver_chain_knight", "chain_wisp"], ["silver_chain_knight", "silver_chain_knight"]] }, { name: "将軍の縛陣", groups: [["chain_wisp", "chain_matriarch"]] }], { gold: [73100, 87000], exp: [70700, 84200] }, [{ itemId: "chain_core", chance: .42, quantity: [1, 2] }], { clearStoryId: "silver_chain_gallery_clear" }),
    dream_eater_spire: route("dream_eater_spire", "夢喰いの塔", "夢喰い塔", 84, 2100, 44800, 4, [{ type: "dungeonClear", dungeonId: "silver_chain_gallery" }], "囚人の夢を黒月の動力へ変える塔。眠る衛兵が同じ戦いを繰り返す。", [{ name: "眠りの螺旋", groups: [["dream_eater", "sleepwalker_guard"], ["dream_eater", "dream_eater"]] }, { name: "悪夢の天蓋", groups: [["sleepwalker_guard", "nightmare_oracle"]] }], { gold: [79800, 95000], exp: [77200, 91900] }, [{ itemId: "dream_dust", chance: .44, quantity: [1, 2] }], { clearStoryId: "dream_eater_spire_clear" }),
    blackmoon_core: route("blackmoon_core", "黒月の心核", "黒月心核", 86, 2160, 48400, 5, [{ type: "dungeonClear", dungeonId: "dream_eater_spire" }], "記憶と夢を燃やして浮かぶ黒月の中枢。使者が封鎖機構を止めようとしている。", [{ name: "月蝕祭壇", groups: [["blackmoon_priest", "lunar_automaton", "blackmoon_priest"], ["lunar_automaton", "lunar_automaton"]] }, { name: "黒月中枢", groups: [["lunar_automaton", "blackmoon_heart"]] }], { gold: [87100, 103700], exp: [84300, 100400] }, [{ itemId: "royal_eclipse_fragment", chance: .38, quantity: [1, 2] }], { clearStoryId: "black_moon_prison_clear" }),
    exiled_king_crypt: route("exiled_king_crypt", "追放王の月棺", "追放王月棺", 90, 2460, 60600, 6, [{ type: "chapterCompleted", chapterId: "black_moon_prison" }], "黒月の裏側に隠された王墓。本編には不要だが、消された王の記憶が眠る。", [{ name: "王名なき墓道", groups: [["silver_chain_knight", "blackmoon_priest", "chain_wisp"]] }, { name: "月蝕の棺室", groups: [["exiled_king", "blackmoon_priest"]] }], { gold: [108800, 130100], exp: [105300, 126000] }, [{ itemId: "royal_eclipse_fragment", chance: .32, quantity: [1, 2] }], { requiredForStory: false, optionalStoryId: "exiled_king_crypt_clear" })
  });

  data.registry.entityList("recipes", [
    { id: "forge_moonchain_katana", resultId: "moonchain_katana", gold: 6900, materials: { moon_silver: 8, chain_core: 4, fallen_star_iron: 2 }, unlockAfter: "black_moon_prison" },
    { id: "forge_dreamweave_robe", resultId: "dreamweave_robe", gold: 7000, materials: { dream_dust: 8, sealed_memory: 4, eclipse_shard: 2 }, unlockAfter: "black_moon_prison" },
    { id: "forge_jailer_shield", resultId: "jailer_shield", gold: 7200, materials: { chain_core: 8, moon_silver: 5, floating_core: 2 }, unlockAfter: "black_moon_prison" }
  ]);

  data.registry.entities("storyScenes", {
    black_moon_prison_opening: { id: "black_moon_prison_opening", name: "空城より高い黒月", text: "日蝕の王座から伸びる最後の星路は、夜空に浮かぶ黒い月へ繋がっていた。リナは古い王統譜を閉じる。『あれは天体ではありません。王朝が、忘れたいものを閉じ込めた牢獄です』。" },
    moonshadow_dock_clear: { id: "moonshadow_dock_clear", name: "月舟が運んだ囚人", text: "接岸記録には、王朝の罪人ではなく歴代の王族が黒月へ運ばれたとある。罪状の欄はすべて空白だった。" },
    sealed_memory_ward_clear: { id: "sealed_memory_ward_clear", name: "使者が手放した名前", text: "封書の棚から女王の使者の記憶が見つかった。彼女は心核へ近づくため、自ら名前と過去を預けていた。" },
    silver_chain_gallery_clear: { id: "silver_chain_gallery_clear", name: "王を縛った将軍", text: "銀鎖将の命令書は、追放王を憎んでではなく、黒月の心核から守るため縛れと告げていた。牢獄そのものが囚人の記憶を食べている。" },
    dream_eater_spire_clear: { id: "dream_eater_spire_clear", name: "黒月を浮かべる夢", text: "塔の底で無数の夢が燃えていた。黒月は魔力ではなく、囚人たちが帰郷を願う力で空に留まっている。" },
    black_moon_prison_clear: { id: "black_moon_prison_clear", name: "心核から消えた使者", text: "心核は止まったが、使者の姿はなかった。残された短剣には『王朝の始まりへ戻る』と刻まれ、星図は東の始原樹海を指している。" },
    exiled_king_crypt_clear: { id: "exiled_king_crypt_clear", name: "追放王の遺言", text: "追放王は王朝を奪おうとしたのではない。星の力が記憶を喰らうことを知り、すべての星路を閉じようとして歴史から消されたのだ。" }
  });
  data.registry.entityList("storyChapters", [{
    id: "black_moon_prison", order: 10, number: 10, title: "第10章：黒月の監獄", recommendedLevelRange: [78, 86],
    openingStoryId: "black_moon_prison_opening", clearStoryId: "black_moon_prison_clear",
    objective: "5つの本編ダンジョンを順番に攻略し、黒月の心核を停止する", entryRequirements: [],
    unlockText: "追放王の月棺、月鎖の太刀・夢織りの法衣・月牢守の大盾のレシピ、5,000G、王蝕片×2",
    rewards: { gold: 5000, materials: { royal_eclipse_fragment: 2, guild_seal: 3 } }
  }]);
})();
