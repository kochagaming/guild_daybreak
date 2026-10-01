(function () {
  "use strict";
  const data = window.GameData;

  Object.assign(data.items, {
    eclipse_glass: { id: "eclipse_glass", name: "蝕玻璃", type: "material", price: 0, icon: "◇" },
    starblood_crystal: { id: "starblood_crystal", name: "星血晶", type: "material", price: 0, icon: "◆" },
    royal_memory: { id: "royal_memory", name: "王家の記憶", type: "material", price: 0, icon: "▤" },
    skykey_fragment: { id: "skykey_fragment", name: "天鍵片", type: "material", price: 0, icon: "✦" },
    throne_star_core: { id: "throne_star_core", name: "王座星核", type: "material", price: 0, icon: "◉" },
    eclipse_sword: { id: "eclipse_sword", name: "星蝕の長剣", type: "weapon", weaponType: "sword", range: "melee", tier: 15, price: 23600, attack: 174, defense: 46, hitRate: .16, criticalRate: .16, hp: 180, weight: 12, icon: "⚔", craftOnly: true, salvage: { itemId: "starblood_crystal", quantity: 3 } },
    starveil_cloth: { id: "starveil_cloth", name: "星帷子の法衣", type: "armor", armorType: "cloth", tier: 15, price: 23900, defense: 58, magicDefense: 106, magicAttack: 52, magicHealing: 78, hp: 220, evasionRate: .09, weight: 5, icon: "♜", craftOnly: true, salvage: { itemId: "eclipse_glass", quantity: 3 } },
    skykey_gauntlet: { id: "skykey_gauntlet", name: "天鍵の篭手", type: "armor", armorType: "gauntlet", tier: 15, price: 24200, attack: 48, defense: 64, hitRate: .18, speed: 20, attackCount: 1, weight: 6, icon: "✥", craftOnly: true, salvage: { itemId: "skykey_fragment", quantity: 3 } },
    regent_staff: { id: "regent_staff", name: "星を継ぐ王杖", type: "weapon", weaponType: "staff", range: "ranged", tier: 15, price: 27600, attack: 7, magicAttack: 146, magicHealing: 118, magicDefense: 56, hitRate: .2, hp: 210, weight: 9, icon: "⚕", unique: true, salvage: { itemId: "throne_star_core", quantity: 4 } },
    hollow_throne_shield: { id: "hollow_throne_shield", name: "空王座の大盾", type: "armor", armorType: "shield", tier: 16, price: 31800, defense: 164, magicDefense: 112, hp: 620, evasionRate: -.08, weight: 22, icon: "⬟", unique: true, salvage: { itemId: "throne_star_core", quantity: 4 }, specialEffects: [{ kind: "weight_defense", multiplier: 2, name: "空冠装甲" }], effectDescription: "実重量1につき防御力が2上昇する。" }
  });

  Object.assign(data.monsters, {
    starved_citizen: { id: "starved_citizen", name: "星渇きの都民", hp: 13900, attack: 1190, defense: 640, magicDefense: 610, speed: 82, icon: "♟", element: "dark", actions: 2 },
    eclipse_hound: { id: "eclipse_hound", name: "蝕影の猟犬", hp: 12500, attack: 1280, attackCount: 2, defense: 560, magicDefense: 560, speed: 104, icon: "◆", element: "dark", actions: 2, targetRule: "rear_weighted" },
    fallen_gate_captain: { id: "fallen_gate_captain", name: "帰都門の堕隊長", hp: 221000, attack: 1310, defense: 820, magicDefense: 720, speed: 78, icon: "♛", boss: true, actions: 6, element: "dark", elementModifiers: { dark: .15, arcane: 1.4 }, statusResistances: { poison: .9, paralysis: .9 }, mechanic: { kind: "telegraphed_burst", name: "閉都号令", period: 5, multiplier: 2.1, exposedMultiplier: 1.65, description: "外郭の星杭を起動し、次ターン終了時に全隊列を封鎖する。" } },
    blackstar_acolyte: { id: "blackstar_acolyte", name: "黒星の侍祭", hp: 12400, attack: 900, magicAttack: 1250, defense: 520, magicDefense: 720, speed: 94, icon: "✦", damageType: "magic", element: "dark", actions: 2 },
    crown_automaton: { id: "crown_automaton", name: "王冠機兵", hp: 14800, attack: 1300, defense: 780, magicDefense: 640, speed: 70, icon: "♜", element: "arcane", actions: 2 },
    palace_inquisitor: { id: "palace_inquisitor", name: "沈黙宮の審問官", hp: 228000, attack: 1080, magicAttack: 1280, defense: 740, magicDefense: 790, speed: 88, icon: "♛", boss: true, actions: 6, damageType: "magic", element: "dark", targetRule: "rear_weighted", statusAttack: { statusId: "paralysis", chance: .35, duration: 1 }, elementModifiers: { dark: .15, fire: 1.4 }, statusResistances: { paralysis: .95, chill: .9 } },
    memory_ghost: { id: "memory_ghost", name: "王記の残霊", hp: 12700, attack: 920, magicAttack: 1270, defense: 530, magicDefense: 750, speed: 92, icon: "◇", damageType: "magic", element: "arcane", actions: 2 },
    royal_chimera: { id: "royal_chimera", name: "王統の合成獣", hp: 15100, attack: 1350, defense: 690, magicDefense: 620, speed: 88, icon: "◆", element: "dark", actions: 3 },
    archive_sentinel: { id: "archive_sentinel", name: "王家記憶庫の番人", hp: 235000, attack: 1320, defense: 850, magicDefense: 760, speed: 68, icon: "♛", boss: true, actions: 6, element: "arcane", elementModifiers: { arcane: .15, dark: 1.4 }, statusResistances: { poison: 1, paralysis: .9 }, mechanic: { kind: "telegraphed_burst", name: "記憶抹消", period: 4, multiplier: 2.15, exposedMultiplier: 1.65, description: "王家の記憶を白光へ変え、次ターン終了時に全隊列を呑み込む。" } },
    skykey_guard: { id: "skykey_guard", name: "天鍵塔の衛兵", hp: 15400, attack: 1340, defense: 780, magicDefense: 660, speed: 80, icon: "♜", element: "arcane", actions: 2 },
    void_magister: { id: "void_magister", name: "虚天の導師", hp: 13300, attack: 940, magicAttack: 1320, defense: 570, magicDefense: 760, speed: 98, icon: "✧", damageType: "magic", element: "dark", actions: 2, targetRule: "rear_weighted" },
    gate_archon: { id: "gate_archon", name: "天門執政官", hp: 242000, attack: 1250, magicAttack: 1320, defense: 800, magicDefense: 810, speed: 86, icon: "♛", boss: true, actions: 6, element: "arcane", statusAttack: { statusId: "chill", chance: .35, duration: 2 }, elementModifiers: { arcane: .15, dark: 1.4 }, statusResistances: { chill: .95, paralysis: .9 } },
    eclipse_guard: { id: "eclipse_guard", name: "蝕王座の近衛", hp: 15800, attack: 1380, defense: 820, magicDefense: 680, speed: 82, icon: "♜", element: "dark", actions: 2 },
    false_queen: { id: "false_queen", name: "星影の偽女王", hp: 14400, attack: 1010, magicAttack: 1350, defense: 620, magicDefense: 790, speed: 96, icon: "♛", damageType: "magic", element: "arcane", actions: 3 },
    starbound_usurper: { id: "starbound_usurper", name: "星を纏う簒奪者", hp: 255000, attack: 1330, magicAttack: 1380, defense: 820, magicDefense: 840, speed: 90, icon: "♛", boss: true, actions: 6, damageType: "magic", element: "dark", targetRule: "rear_weighted", statusAttack: { statusId: "burn", chance: .32, duration: 3 }, elementModifiers: { dark: .1, arcane: 1.4 }, statusResistances: { burn: .95, paralysis: .95 }, bossDrop: { itemId: "regent_staff", chance: .08 }, mechanic: { kind: "telegraphed_burst", name: "王都星蝕", period: 4, multiplier: 2.2, exposedMultiplier: 1.7, description: "王都に蓄えた星力を奪い、次ターン終了時に全隊列へ落とす。" } },
    hollow_king: { id: "hollow_king", name: "冠なき空王", hp: 306000, attack: 1490, magicAttack: 1370, defense: 900, magicDefense: 820, speed: 88, icon: "♛", boss: true, actions: 7, element: "arcane", targetRule: "rear_weighted", elementModifiers: { arcane: .1, dark: 1.45 }, statusResistances: { poison: 1, burn: .95, paralysis: .95 }, bossDrop: { itemId: "hollow_throne_shield", chance: .1 }, mechanic: { kind: "telegraphed_burst", name: "無冠戴天", period: 4, multiplier: 2.25, exposedMultiplier: 1.75, description: "空の王座を地上へ重ね、次ターン終了時に全隊列を圧壊する。" } }
  });

  const materials = {
    starved_citizen: [["eclipse_glass", .55, 1, 2]], eclipse_hound: [["starblood_crystal", .5, 1, 2]], fallen_gate_captain: [["eclipse_glass", 1, 2, 4]],
    blackstar_acolyte: [["starblood_crystal", .55, 1, 2]], crown_automaton: [["skykey_fragment", .5, 1, 2]], palace_inquisitor: [["starblood_crystal", 1, 2, 4]],
    memory_ghost: [["royal_memory", .55, 1, 2]], royal_chimera: [["starblood_crystal", .55, 1, 2]], archive_sentinel: [["royal_memory", 1, 2, 4]],
    skykey_guard: [["skykey_fragment", .6, 1, 2]], void_magister: [["eclipse_glass", .6, 1, 2]], gate_archon: [["skykey_fragment", 1, 2, 4]],
    eclipse_guard: [["eclipse_glass", .65, 1, 2]], false_queen: [["royal_memory", .65, 1, 3]], starbound_usurper: [["throne_star_core", 1, 2, 4]],
    hollow_king: [["throne_star_core", 1, 3, 5], ["royal_memory", 1, 3, 5]]
  };
  Object.entries(materials).forEach(([id, drops]) => { data.monsters[id].materialDrops = drops.map(([itemId, chance, minimum, maximum]) => ({ itemId, chance, quantity: [minimum, maximum] })); });

  const route = (id, name, shortName, level, duration, difficulty, order, requirements, description, encounters, rewards, drops, extra = {}) => ({
    id, name, shortName, recommendedLevel: level, duration, difficulty, color: "purple", chapterId: "returnless_capital", orderInChapter: order, requiredForStory: true,
    unlockRequirements: requirements, description, strategy: { label: "星蝕の王都へ帰る", feature: description, advice: "北から王都へ近づくほど、空の星が一つずつ消えていく。", preparation: [] }, encounters, rewards, drops, ...extra
  });
  Object.assign(data.dungeons, {
    north_return_road: route("north_return_road", "北帰の城道", "北帰城道", 98, 3120, 107200, 1, [{ type: "chapterCompleted", chapterId: "northern_star_tomb" }], "ノアと王都へ戻る凍結街道。城門は内側から閉ざされ、星渇きの民がさまよう。", [{ name: "凍れる帰路", groups: [["starved_citizen", "eclipse_hound"], ["starved_citizen", "starved_citizen"]] }, { name: "帰都門", groups: [["eclipse_hound", "fallen_gate_captain"]] }], { gold: [184800, 220100], exp: [178800, 213000] }, [{ itemId: "eclipse_glass", chance: .45, quantity: [1, 2] }], { clearStoryId: "north_return_road_clear" }),
    silent_outer_city: route("silent_outer_city", "声なき王都外郭", "沈黙外郭", 98, 3180, 111400, 2, [{ type: "dungeonClear", dungeonId: "north_return_road" }], "星力を抜かれた外郭。偽女王に従う侍祭と王冠機兵が沈黙を強いる。", [{ name: "無言の大路", groups: [["blackstar_acolyte", "crown_automaton"], ["blackstar_acolyte", "blackstar_acolyte"]] }, { name: "沈黙宮門", groups: [["crown_automaton", "palace_inquisitor"]] }], { gold: [192300, 229100], exp: [186000, 221600] }, [{ itemId: "starblood_crystal", chance: .45, quantity: [1, 2] }], { clearStoryId: "silent_outer_city_clear" }),
    royal_memory_vault: route("royal_memory_vault", "王家記憶庫", "王家記憶庫", 99, 3240, 115800, 3, [{ type: "dungeonClear", dungeonId: "silent_outer_city" }], "代々の王が失った記憶を封じた地下庫。簒奪者の正体を示す記録が眠る。", [{ name: "追憶回廊", groups: [["memory_ghost", "royal_chimera"], ["memory_ghost", "memory_ghost"]] }, { name: "王記中枢", groups: [["royal_chimera", "archive_sentinel"]] }], { gold: [200100, 238400], exp: [193500, 230500] }, [{ itemId: "royal_memory", chance: .45, quantity: [1, 2] }], { clearStoryId: "royal_memory_vault_clear" }),
    skykey_spire: route("skykey_spire", "天鍵の尖塔", "天鍵尖塔", 99, 3300, 120400, 4, [{ type: "dungeonClear", dungeonId: "royal_memory_vault" }], "王都の星力を空の門へ送る尖塔。天鍵はすでに起動し、夜空へ亀裂を刻む。", [{ name: "昇星螺旋", groups: [["skykey_guard", "void_magister"], ["skykey_guard", "skykey_guard"]] }, { name: "天鍵機関", groups: [["void_magister", "gate_archon"]] }], { gold: [208200, 248000], exp: [201400, 240000] }, [{ itemId: "skykey_fragment", chance: .45, quantity: [1, 2] }], { clearStoryId: "skykey_spire_clear" }),
    usurper_throne: route("usurper_throne", "簒奪者の星王座", "簒奪星王座", 99, 3360, 125200, 5, [{ type: "dungeonClear", dungeonId: "skykey_spire" }], "偽女王と簒奪者が天門を見上げる王座。奪われた星核を取り戻す最後の地上戦。", [{ name: "蝕星謁見路", groups: [["eclipse_guard", "false_queen", "eclipse_guard"], ["false_queen", "false_queen"]] }, { name: "簒奪星座", groups: [["eclipse_guard", "starbound_usurper"]] }], { gold: [216600, 258000], exp: [209500, 249600] }, [{ itemId: "throne_star_core", chance: .4, quantity: [1, 2] }], { clearStoryId: "returnless_capital_clear" }),
    hollow_coronation: route("hollow_coronation", "空冠の地下宮", "空冠地下宮", 100, 3660, 143000, 6, [{ type: "chapterCompleted", chapterId: "returnless_capital" }], "歴代の失敗した王を一つに束ねた地下王座。本編には不要だが、王朝最後の秘儀が残る。", [{ name: "無冠王廊", groups: [["memory_ghost", "crown_automaton", "eclipse_guard"]] }, { name: "空王戴冠室", groups: [["hollow_king", "void_magister"]] }], { gold: [259900, 309400], exp: [251300, 299300] }, [{ itemId: "throne_star_core", chance: .35, quantity: [1, 2] }], { requiredForStory: false, optionalStoryId: "hollow_coronation_clear" })
  });

  data.recipes.push(
    { id: "forge_eclipse_sword", resultId: "eclipse_sword", gold: 11600, materials: { starblood_crystal: 8, royal_memory: 5, aurora_ore: 2 }, unlockAfter: "returnless_capital" },
    { id: "forge_starveil_cloth", resultId: "starveil_cloth", gold: 11800, materials: { eclipse_glass: 8, skykey_fragment: 4, black_ice: 2 }, unlockAfter: "returnless_capital" },
    { id: "forge_skykey_gauntlet", resultId: "skykey_gauntlet", gold: 12000, materials: { skykey_fragment: 8, starblood_crystal: 5, vessel_fragment: 2 }, unlockAfter: "returnless_capital" }
  );

  Object.assign(data.storyScenes, {
    returnless_capital_opening: { id: "returnless_capital_opening", name: "星の消える王都", text: "ノアを連れて北から戻ると、王都の上空だけ星が消えていた。天を貫く黒い光柱の下で、女王の使者が王座へ向かっている。『あの人は私の星核を使って、空の主を呼ぶつもりです』。" },
    north_return_road_clear: { id: "north_return_road_clear", name: "閉ざされた帰都門", text: "門衛の記録には、星力をすべて王宮へ送る命令が残っていた。民の命を燃料にしてでも、天門を完成させるつもりらしい。" },
    silent_outer_city_clear: { id: "silent_outer_city_clear", name: "偽女王の布告", text: "街角の布告は、現女王が病に倒れ、遠征から帰った王妹が摂政になったと告げていた。だが肖像の顔は、黒月で消えた使者そのものだった。" },
    royal_memory_vault_clear: { id: "royal_memory_vault_clear", name: "王妹の記憶", text: "記憶庫で使者の正体が明らかになる。彼女は初代王の妹イルマの記憶を継ぐ器であり、王朝を終わらせるため何代も姿を変えてきた。" },
    skykey_spire_clear: { id: "skykey_spire_clear", name: "開き始めた天門", text: "天鍵を止めても、空の亀裂は閉じなかった。門の向こうから巨大な眼が地上を覗き、ノアの星核へ呼びかけている。" },
    returnless_capital_clear: { id: "returnless_capital_clear", name: "地上最後の王座", text: "簒奪者を倒し星核を取り戻した瞬間、ノアは自ら天門を完全に開いた。『ここで閉じても、また誰かが星を奪います。空へ行って、始まりそのものを終わらせましょう』。" },
    hollow_coronation_clear: { id: "hollow_coronation_clear", name: "冠を拒んだ名", text: "空王の中には、王になることを拒んだ者たちの記憶が残っていた。彼らが守った真名は、空の主を地上へ縛る最後の鎖になる。" }
  });
  data.storyChapters.push({
    id: "returnless_capital", order: 14, number: 14, title: "第14章：帰らずの王都", recommendedLevelRange: [98, 99],
    openingStoryId: "returnless_capital_opening", clearStoryId: "returnless_capital_clear",
    objective: "5つの本編ダンジョンを順番に攻略し、奪われた星核を取り戻す", entryRequirements: [],
    unlockText: "空冠の地下宮、星蝕の長剣・星帷子の法衣・天鍵の篭手のレシピ、9,000G、王座星核×2",
    rewards: { gold: 9000, materials: { throne_star_core: 2, guild_seal: 4 } }
  });
})();
