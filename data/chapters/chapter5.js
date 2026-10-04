(function () {
  "use strict";
  const data = window.GameData;

  data.registry.entities("items", {
    frost_pearl: { id: "frost_pearl", name: "霜真珠", type: "material", price: 0, icon: "○" },
    drowned_ink: { id: "drowned_ink", name: "沈黙の墨", type: "material", price: 0, icon: "☾" },
    abyssal_iron: { id: "abyssal_iron", name: "深海鉄", type: "material", price: 0, icon: "◆" },
    mirror_scale: { id: "mirror_scale", name: "鏡鱗", type: "material", price: 0, icon: "◇" },
    tide_heart: { id: "tide_heart", name: "潮騒の心核", type: "material", price: 0, icon: "✦" },

    tideglass_bow: { id: "tideglass_bow", name: "潮玻璃の長弓", type: "weapon", weaponType: "bow", range: "ranged", tier: 6, price: 3300, attack: 34, magicAttack: 12, attackCount: 2, hitRate: .13, speed: 5, defense: 0, hp: 12, weight: 7, icon: "➳", craftOnly: true, salvage: { itemId: "mirror_scale", quantity: 2 } },
    frostseal_robe: { id: "frostseal_robe", name: "霜印の祭衣", type: "armor", armorType: "cloth", tier: 6, price: 3200, attack: 0, defense: 22, magicDefense: 29, magicHealing: 12, hp: 34, evasionRate: .03, weight: 4, icon: "♜", craftOnly: true, salvage: { itemId: "frost_pearl", quantity: 2 } },
    abyssal_gauntlets: { id: "abyssal_gauntlets", name: "深海鉄の篭手", type: "armor", armorType: "gauntlet", tier: 6, price: 3400, attack: 10, defense: 13, magicDefense: 8, hitRate: .07, speed: 3, hp: 16, weight: 5, icon: "✥", craftOnly: true, salvage: { itemId: "abyssal_iron", quantity: 2 } },
    mirror_queen_rapier: { id: "mirror_queen_rapier", name: "鏡海女王の細剣", type: "weapon", weaponType: "rapier", range: "melee", tier: 6, price: 4800, attack: 31, magicAttack: 22, attackCount: 3, hitRate: .18, speed: 7, defense: 2, hp: 18, weight: 6, icon: "†", unique: true, salvage: { itemId: "tide_heart", quantity: 2 }, specialEffects: [{ kind: "critical_followup", multiplier: .7, name: "鏡波の追撃" }], effectDescription: "会心時、攻撃力70%の追撃を1行動につき1回。追撃は会心せず、倒した場合は別の敵へ。" },
    abyss_whale_shield: { id: "abyss_whale_shield", name: "深淵鯨の大盾", type: "armor", armorType: "shield", tier: 7, price: 6200, attack: 0, defense: 35, magicDefense: 23, hp: 60, weight: 15, icon: "⬟", unique: true, salvage: { itemId: "tide_heart", quantity: 3 }, specialEffects: [{ kind: "weight_defense", multiplier: 1 }], effectDescription: "この盾の実重量1につき防御+1。重量補正と防具適性を反映する。" }
  });

  const monsters = {
    frost_crab: { id: "frost_crab", name: "霜甲ガニ", hp: 800, attack: 120, defense: 110, magicDefense: 45, speed: 32, icon: "⬟", element: "ice", statusAttack: { statusId: "chill", chance: .2, duration: 3 }, elementModifiers: { ice: .55, lightning: 1.3 }, statusResistances: { poison: .4, chill: .5 } },
    brine_wisp: { id: "brine_wisp", name: "潮霊", hp: 650, attack: 140, defense: 85, magicDefense: 55, speed: 38, icon: "◌", damageType: "magic", element: "ice", statusAttack: { statusId: "chill", chance: .28, duration: 3 }, elementModifiers: { ice: .6, fire: 1.2 }, statusResistances: { chill: .65 } },
    reef_guardian: { id: "reef_guardian", name: "白礁の番人", hp: 7000, attack: 210, defense: 140, magicDefense: 70, speed: 35, icon: "♜", boss: true, actions: 3, element: "ice", statusAttack: { statusId: "chill", chance: .32, duration: 3 }, elementModifiers: { ice: .5, lightning: 1.3 }, statusResistances: { chill: .7 } },
    drowned_scribe: { id: "drowned_scribe", name: "水没書庫の写本師", hp: 850, attack: 185, defense: 100, magicDefense: 60, speed: 38, icon: "☾", damageType: "magic", element: "dark", targetRule: "rear", traitDescription: "最後尾の生存者を狙う。", elementModifiers: { dark: .65, fire: 1.2 } },
    ink_slime: { id: "ink_slime", name: "墨溜まり", hp: 1000, attack: 155, defense: 120, magicDefense: 65, speed: 30, icon: "●", element: "dark", statusAttack: { statusId: "poison", chance: .35, duration: 3, potency: .05 }, elementModifiers: { dark: .7, lightning: 1.2 } },
    archive_keeper: { id: "archive_keeper", name: "沈黙の司書", hp: 8000, attack: 230, magicAttack: 300, defense: 150, magicDefense: 75, speed: 42, icon: "♛", boss: true, actions: 3, damageType: "magic", element: "dark", statusAttack: { statusId: "poison", chance: .25, duration: 3, potency: .03 }, traitDescription: "消えない墨毒を刻む。状態異常解除がなければ長期戦ほど傷が深くなる。", elementModifiers: { dark: .55, fire: 1.3 } },
    glass_shark: { id: "glass_shark", name: "玻璃ザメ", hp: 1100, attack: 165, attackCount: 2, defense: 130, magicDefense: 65, speed: 40, icon: "◇", element: "ice", elementModifiers: { ice: .6, lightning: 1.25 } },
    ice_serpent: { id: "ice_serpent", name: "氷脈の海蛇", hp: 1200, attack: 175, defense: 140, magicDefense: 70, speed: 36, icon: "⌁", element: "ice", statusAttack: { statusId: "paralysis", chance: .22, duration: 1 }, elementModifiers: { ice: .5, fire: 1.25 } },
    blue_reef_lord: { id: "blue_reef_lord", name: "蒼礁の主", hp: 9000, attack: 235, defense: 160, magicDefense: 80, speed: 38, icon: "♛", boss: true, actions: 3, element: "ice", statusAttack: { statusId: "chill", chance: .34, duration: 3 }, targetStatusId: "chill", traitDescription: "凍寒状態の冒険者を優先して狙う。", elementModifiers: { ice: .45, lightning: 1.3 }, statusResistances: { chill: .75 } },
    drowned_knight: { id: "drowned_knight", name: "沈船騎士", hp: 1300, attack: 185, defense: 150, magicDefense: 80, speed: 34, icon: "♟", element: "dark", elementModifiers: { dark: .7, lightning: 1.2 } },
    lantern_jelly: { id: "lantern_jelly", name: "灯クラゲ", hp: 1000, attack: 200, defense: 100, magicDefense: 70, speed: 40, icon: "✧", damageType: "magic", element: "lightning", statusAttack: { statusId: "paralysis", chance: .3, duration: 1 }, elementModifiers: { lightning: .6, fire: 1.2 } },
    frost_admiral: { id: "frost_admiral", name: "凍れる提督", hp: 13000, attack: 260, defense: 175, magicDefense: 90, speed: 40, icon: "♛", boss: true, actions: 2, element: "ice", statusAttack: { statusId: "chill", chance: .36, duration: 3 }, targetRule: "rear_weighted", traitDescription: "前衛を迂回し、後列へ凍てつく斬撃を集める。", elementModifiers: { ice: .5, fire: 1.3 }, statusResistances: { chill: .8 } },
    mirror_mermaid: { id: "mirror_mermaid", name: "鏡歌の人魚", hp: 1200, attack: 180, magicAttack: 215, defense: 110, magicDefense: 70, speed: 42, icon: "♪", damageType: "magic", element: "arcane", targetRule: "rear", traitDescription: "最後尾の生存者を狙う。", elementModifiers: { arcane: .6, lightning: 1.25 } },
    tide_priest: { id: "tide_priest", name: "潮環の祭司", hp: 1300, attack: 175, magicAttack: 205, defense: 130, magicDefense: 80, speed: 36, icon: "☾", damageType: "magic", element: "ice", elementModifiers: { ice: .55, fire: 1.25 } },
    mirror_queen: { id: "mirror_queen", name: "鏡海女王ネレイス", hp: 15500, attack: 190, magicAttack: 290, defense: 120, magicDefense: 140, speed: 45, icon: "♛", boss: true, actions: 3, damageType: "magic", element: "ice", statusAttack: { statusId: "chill", chance: .42, duration: 3 }, elementModifiers: { ice: .4, lightning: 1.35 }, statusResistances: { poison: .7, paralysis: .65, chill: .9 }, bossDrop: { itemId: "mirror_queen_rapier", chance: .08 }, mechanic: { kind: "telegraphed_burst", name: "静海の戴冠", period: 4, multiplier: 1.5, exposedMultiplier: 1.5, statusAmplifier: { statusId: "chill", multiplier: 1.15 }, description: "鏡の潮を集めた次ターン終了時に全体攻撃。凍寒中の相手には威力1.15倍。防御・解除・耐性で被害を抑えられ、発動後は隙が生まれる。" } },
    trench_maw: { id: "trench_maw", name: "海溝の大顎", hp: 2500, attack: 245, defense: 170, magicDefense: 90, speed: 38, actions: 2, icon: "◆", element: "dark", elementModifiers: { dark: .55, lightning: 1.3 } },
    abyss_whale: { id: "abyss_whale", name: "深淵鯨アビサル", hp: 18000, attack: 260, magicAttack: 310, defense: 110, magicDefense: 140, speed: 42, icon: "♛", boss: true, actions: 3, damageType: "magic", element: "dark", elementModifiers: { dark: .4, lightning: 1.4 }, statusResistances: { poison: 1, paralysis: .8 }, bossDrop: { itemId: "abyss_whale_shield", chance: .1 }, mechanic: { kind: "telegraphed_burst", name: "深淵の潮声", period: 3, multiplier: 1.7, exposedMultiplier: 1.55, description: "短い周期で全体へ潮圧を放つ。防御で軽減でき、発動後は隙が生まれる。" } }
  };

  const materialDrops = {
    frost_crab: [["frost_pearl", .45, 1, 2]], brine_wisp: [["frost_pearl", .5, 1, 2]], reef_guardian: [["frost_pearl", 1, 2, 4]],
    drowned_scribe: [["drowned_ink", .55, 1, 2]], ink_slime: [["drowned_ink", .6, 1, 2]], archive_keeper: [["drowned_ink", 1, 2, 4]],
    glass_shark: [["mirror_scale", .5, 1, 2]], ice_serpent: [["mirror_scale", .65, 1, 2]], blue_reef_lord: [["mirror_scale", 1, 2, 4]],
    drowned_knight: [["abyssal_iron", .6, 1, 2]], lantern_jelly: [["frost_pearl", .5, 1, 2]], frost_admiral: [["abyssal_iron", 1, 2, 4]],
    mirror_mermaid: [["mirror_scale", .65, 1, 2]], tide_priest: [["drowned_ink", .55, 1, 2]], mirror_queen: [["tide_heart", 1, 2, 3], ["mirror_scale", 1, 3, 5]],
    trench_maw: [["abyssal_iron", .7, 1, 3]], abyss_whale: [["tide_heart", 1, 3, 5], ["abyssal_iron", 1, 3, 5]]
  };
  data.registry.relations("monsterMaterialDrops", Object.fromEntries(Object.entries(materialDrops).map(([id, entries]) => [id,
    entries.map(([itemId, chance, minimum, maximum]) => ({ itemId, chance, quantity: [minimum, maximum] }))
  ])));
  data.registry.entities("monsters", monsters);

  const route = (id, name, shortName, level, duration, difficulty, order, requirements, description, encounters, rewards, drops, extra = {}) => ({
    id, name, shortName, recommendedLevel: level, duration, difficulty, color: "blue", chapterId: "mirror_tide", orderInChapter: order, requiredForStory: true,
    unlockRequirements: requirements, description, strategy: { label: "潮の異変を調べる", feature: description, advice: "現地の戦闘記録から有効な手段を探してください。", preparation: [] }, encounters, rewards, drops, ...extra
  });
  data.registry.entities("dungeons", {
    frost_coast: route("frost_coast", "白霜の海岸", "白霜海岸", 28, 510, 1850, 1, [{ type: "chapterCompleted", chapterId: "ember_crown" }], "季節外れの霜に覆われ、波音だけが遠く響く海岸。", [{ name: "凍る波打ち際", groups: [["frost_crab", "frost_crab"], ["brine_wisp", "frost_crab"]] }, { name: "白礁の門", groups: [["reef_guardian", "frost_crab"]] }], { gold: [3300, 4000], exp: [3200, 3900] }, [{ itemId: "frost_pearl", chance: .35, quantity: [1, 2] }], { clearStoryId: "frost_coast_clear" }),
    drowned_archive: route("drowned_archive", "水没した記録院", "水没記録院", 30, 540, 2100, 2, [{ type: "dungeonClear", dungeonId: "frost_coast" }], "海中へ沈んだ王朝の記録院。文字を消す黒い潮が満ちている。", [{ name: "沈んだ閲覧室", groups: [["drowned_scribe", "ink_slime"], ["ink_slime", "ink_slime"]] }, { name: "封印書架", groups: [["drowned_scribe", "archive_keeper"]] }], { gold: [3800, 4600], exp: [3700, 4500] }, [{ itemId: "drowned_ink", chance: .4, quantity: [1, 2] }], { clearStoryId: "drowned_archive_clear" }),
    blue_reef: route("blue_reef", "蒼晶珊瑚の回廊", "蒼晶回廊", 32, 570, 2400, 3, [{ type: "dungeonClear", dungeonId: "drowned_archive" }], "海底で玻璃のような珊瑚が育つ、光の迷路。", [{ name: "玻璃の狭間", groups: [["glass_shark", "glass_shark"], ["ice_serpent", "glass_shark"]] }, { name: "蒼礁の心臓", groups: [["blue_reef_lord", "ice_serpent"]] }], { gold: [4350, 5250], exp: [4250, 5100] }, [{ itemId: "mirror_scale", chance: .4, quantity: [1, 2] }], { clearStoryId: "blue_reef_clear" }),
    silent_fleet: route("silent_fleet", "沈黙の船墓場", "沈黙船墓", 34, 600, 2700, 4, [{ type: "dungeonClear", dungeonId: "blue_reef" }], "凍りついた艦隊が霧の中を漂う、帰港しない船の墓場。", [{ name: "折れた旗艦路", groups: [["drowned_knight", "lantern_jelly"], ["drowned_knight", "drowned_knight"]] }, { name: "凍れる旗艦", groups: [["frost_admiral", "drowned_knight", "lantern_jelly"]] }], { gold: [5000, 6000], exp: [4900, 5900] }, [{ itemId: "abyssal_iron", chance: .4, quantity: [1, 2] }], { clearStoryId: "silent_fleet_clear" }),
    mirror_palace: route("mirror_palace", "鏡潮の宮殿", "鏡潮宮殿", 36, 660, 3100, 5, [{ type: "dungeonClear", dungeonId: "silent_fleet" }], "海面と海底が鏡写しになる、潮の王家の宮殿。", [{ name: "逆波の舞台", groups: [["mirror_mermaid", "tide_priest", "mirror_mermaid"], ["tide_priest", "tide_priest"]] }, { name: "静海の玉座", groups: [["tide_priest", "mirror_queen"]] }], { gold: [5800, 7000], exp: [5700, 6800] }, [{ itemId: "tide_heart", chance: .22, quantity: [1, 1] }], { clearStoryId: "mirror_tide_clear" }),
    abyssal_trench: route("abyssal_trench", "深淵鯨の海溝", "深淵海溝", 40, 780, 3900, 6, [{ type: "chapterCompleted", chapterId: "mirror_tide" }], "音も光も沈む海溝。巨大な潮声だけが海底から届く。", [{ name: "光なき斜面", groups: [["trench_maw", "trench_maw"]] }, { name: "深淵の底", groups: [["trench_maw", "abyss_whale"]] }], { gold: [7600, 9200], exp: [7400, 8900] }, [{ itemId: "tide_heart", chance: .3, quantity: [1, 2] }], { requiredForStory: false, optionalStoryId: "abyssal_trench_clear" })
  });

  data.registry.entityList("recipes", [
    { id: "forge_tideglass_bow", resultId: "tideglass_bow", gold: 1450, materials: { mirror_scale: 6, frost_pearl: 3, skyglass: 2 }, unlockAfter: "mirror_tide" },
    { id: "forge_frostseal_robe", resultId: "frostseal_robe", gold: 1400, materials: { frost_pearl: 6, drowned_ink: 3, ashwood: 2 }, unlockAfter: "mirror_tide" },
    { id: "forge_abyssal_gauntlets", resultId: "abyssal_gauntlets", gold: 1500, materials: { abyssal_iron: 6, drowned_ink: 2, ember_ore: 2 }, unlockAfter: "mirror_tide" }
  ]);

  data.registry.entities("storyScenes", {
    mirror_tide_opening: { id: "mirror_tide_opening", name: "灰の先にある海", text: "灰冠の大地に戻った風は、冷たい潮の匂いを運んできた。海図には存在しない海岸と、海中へ沈む古い街道が描き出される。リナは濡れた地図を広げ、『消された記録を追いましょう。今度の道は、海の底へ続いています』と告げた。" },
    frost_coast_clear: { id: "frost_coast_clear", name: "波が運んだ黒い頁", text: "白礁の番人が崩れると、凍った波間から黒い頁が流れ着いた。文字は読めないが、王朝の記録院を示す印だけが残っている。" },
    drowned_archive_clear: { id: "drowned_archive_clear", name: "消された航海記録", text: "沈黙の司書が守っていた帳簿には、灰冠王国へ火を運んだ船団の名があった。最後の航路だけが、何者かの墨で塗り潰されている。" },
    blue_reef_clear: { id: "blue_reef_clear", name: "珊瑚に閉じ込められた声", text: "蒼い珊瑚から、帰港を許されなかった船員たちの声が響いた。彼らの艦隊はいまも、鏡の宮殿を隠す霧の中を巡っている。" },
    silent_fleet_clear: { id: "silent_fleet_clear", name: "提督が守った海図", text: "凍れる提督の羅針盤は、霧の向こうにある鏡潮の宮殿を指した。船団は遭難したのではなく、海の王家との約束を守って航路を閉ざしていた。" },
    mirror_tide_clear: { id: "mirror_tide_clear", name: "海が記憶を返す時", text: "鏡海女王が剣を収めると、黒い潮は澄み、消された航海記録が海面へ浮かび上がった。王朝が隠した道はさらに深い海溝へ続くが、まずは長い沈黙が終わった。" },
    abyssal_trench_clear: { id: "abyssal_trench_clear", name: "深淵の底で聞いた歌", text: "深淵鯨の潮声は警告だった。海溝の底には、王朝より古い門が眠っている。鯨は大盾となる鱗を残し、門のさらに先へ姿を消した。" }
  });
  data.registry.entityList("storyChapters", [{
    id: "mirror_tide", order: 5, number: 5, title: "第5章：鏡潮の海", recommendedLevelRange: [28, 36], openingStoryId: "mirror_tide_opening", clearStoryId: "mirror_tide_clear",
    objective: "5つの本編ダンジョンを順番に攻略し、鏡潮の宮殿へ到達する", entryRequirements: [],
    unlockText: "深淵鯨の海溝、潮玻璃の長弓・霜印の祭衣・深海鉄の篭手のレシピ、2,000G、潮騒の心核×2",
    rewards: { gold: 2000, materials: { tide_heart: 2, guild_seal: 4 } }
  }]);
})();
