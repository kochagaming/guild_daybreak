(function () {
  "use strict";
  const data = window.GameData;

  data.registry.entities("items", {
    sky_dust: { id: "sky_dust", name: "天穹塵", type: "material", price: 0, icon: "✧" },
    constellation_fragment: { id: "constellation_fragment", name: "星座片", type: "material", price: 0, icon: "✦" },
    first_light: { id: "first_light", name: "始光", type: "material", price: 0, icon: "◇" },
    void_heart: { id: "void_heart", name: "虚空心", type: "material", price: 0, icon: "◆" },
    nameless_star: { id: "nameless_star", name: "名もなき星", type: "material", price: 0, icon: "◉" },
    heavensplit_rapier: { id: "heavensplit_rapier", name: "天裂きの細剣", type: "weapon", weaponType: "rapier", range: "melee", tier: 16, price: 26800, attack: 124, attackCount: 4, hitRate: .28, criticalRate: .18, speed: 20, weight: 7, icon: "†", craftOnly: true, salvage: { itemId: "constellation_fragment", quantity: 3 } },
    firstlight_robe: { id: "firstlight_robe", name: "始光の法衣", type: "armor", armorType: "cloth", tier: 16, price: 27200, defense: 68, magicDefense: 126, magicAttack: 68, magicHealing: 96, hp: 280, evasionRate: .1, weight: 5, icon: "♜", craftOnly: true, salvage: { itemId: "first_light", quantity: 3 } },
    constellation_leather: { id: "constellation_leather", name: "星座の軽鎧", type: "armor", armorType: "leather", tier: 16, price: 27500, attack: 28, defense: 98, magicDefense: 72, hp: 320, speed: 20, evasionRate: .12, weight: 8, icon: "♜", craftOnly: true, salvage: { itemId: "sky_dust", quantity: 3 } },
    nameless_staff: { id: "nameless_staff", name: "名もなき星の杖", type: "weapon", weaponType: "staff", range: "ranged", tier: 16, price: 31400, attack: 8, magicAttack: 172, magicHealing: 142, magicDefense: 72, hitRate: .22, hp: 260, weight: 9, icon: "⚕", unique: true, salvage: { itemId: "nameless_star", quantity: 4 } },
    afterstar_armor: { id: "afterstar_armor", name: "星後の神鎧", type: "armor", armorType: "heavy", tier: 17, price: 36800, defense: 196, magicDefense: 132, hp: 760, speed: -2, weight: 24, icon: "♜", unique: true, salvage: { itemId: "nameless_star", quantity: 4 }, specialEffects: [{ kind: "weight_defense", multiplier: 2.2, name: "終星装甲" }], effectDescription: "実重量1につき防御力が2.2上昇する。" }
  });

  const monsters = {
    gate_seraph: { id: "gate_seraph", name: "天門の熾使", hp: 16200, attack: 1080, magicAttack: 1390, defense: 700, magicDefense: 820, speed: 100, icon: "✧", damageType: "magic", element: "arcane", actions: 3 },
    void_hunter: { id: "void_hunter", name: "虚空猟兵", hp: 17600, attack: 1480, attackCount: 2, defense: 740, magicDefense: 680, speed: 108, icon: "◆", element: "dark", actions: 3, targetRule: "rear_weighted" },
    sky_threshold_warden: { id: "sky_threshold_warden", name: "天境の門守", hp: 276000, attack: 1420, magicAttack: 1410, defense: 900, magicDefense: 880, speed: 92, icon: "♛", boss: true, actions: 7, element: "arcane", elementModifiers: { arcane: .1, dark: 1.4 }, statusResistances: { paralysis: .95, chill: .95 }, mechanic: { kind: "telegraphed_burst", name: "天境閉鎖", period: 5, multiplier: 2.2, exposedMultiplier: 1.7, description: "天門の縁を閉じ、次ターン終了時に全隊列を虚空へ押し戻す。" } },
    broken_zodiac: { id: "broken_zodiac", name: "砕けた星座", hp: 15800, attack: 1060, magicAttack: 1410, defense: 660, magicDefense: 830, speed: 102, icon: "✦", damageType: "magic", element: "arcane", actions: 3 },
    constellation_beast: { id: "constellation_beast", name: "星座獣", hp: 18200, attack: 1510, defense: 770, magicDefense: 700, speed: 100, icon: "◆", element: "arcane", actions: 3 },
    astral_judge: { id: "astral_judge", name: "星界の裁定者", hp: 284000, attack: 1320, magicAttack: 1460, defense: 850, magicDefense: 930, speed: 98, icon: "♛", boss: true, actions: 7, damageType: "magic", element: "arcane", targetRule: "rear_weighted", statusAttack: { statusId: "paralysis", chance: .36, duration: 1 }, elementModifiers: { arcane: .1, dark: 1.4 }, statusResistances: { paralysis: 1, chill: .95 } },
    firstlight_echo: { id: "firstlight_echo", name: "始光の残響", hp: 16400, attack: 1100, magicAttack: 1440, defense: 680, magicDefense: 850, speed: 104, icon: "◇", damageType: "magic", element: "fire", actions: 3 },
    genesis_automaton: { id: "genesis_automaton", name: "創世機兵", hp: 19000, attack: 1540, defense: 850, magicDefense: 740, speed: 78, icon: "♜", element: "arcane", actions: 3 },
    archive_of_dawn: { id: "archive_of_dawn", name: "暁の記録体", hp: 294000, attack: 1360, magicAttack: 1490, defense: 890, magicDefense: 960, speed: 94, icon: "♛", boss: true, actions: 7, element: "fire", elementModifiers: { fire: .1, ice: 1.4 }, statusResistances: { burn: 1, paralysis: .95 }, mechanic: { kind: "telegraphed_burst", name: "創世再演", period: 4, multiplier: 2.25, exposedMultiplier: 1.7, description: "最初の光景を再演し、次ターン終了時に全隊列を始光で焼く。" } },
    throne_angel: { id: "throne_angel", name: "空王座の天使", hp: 17100, attack: 1130, magicAttack: 1470, defense: 720, magicDefense: 870, speed: 106, icon: "✧", damageType: "magic", element: "arcane", actions: 3 },
    starless_knight: { id: "starless_knight", name: "星なき騎士", hp: 19500, attack: 1580, defense: 880, magicDefense: 760, speed: 82, icon: "♜", element: "dark", actions: 3 },
    celestial_regent: { id: "celestial_regent", name: "天上の摂政", hp: 304000, attack: 1440, magicAttack: 1510, defense: 920, magicDefense: 970, speed: 96, icon: "♛", boss: true, actions: 7, element: "arcane", statusAttack: { statusId: "chill", chance: .36, duration: 2 }, elementModifiers: { arcane: .1, dark: 1.4 }, statusResistances: { chill: 1, paralysis: .95 } },
    sky_eye: { id: "sky_eye", name: "空主の眼", hp: 17900, attack: 1160, magicAttack: 1510, defense: 740, magicDefense: 900, speed: 110, icon: "◉", damageType: "magic", element: "dark", actions: 3, targetRule: "rear_weighted" },
    nameless_herald: { id: "nameless_herald", name: "無名星の先触れ", hp: 20200, attack: 1600, magicAttack: 1380, defense: 880, magicDefense: 820, speed: 104, icon: "◇", element: "arcane", actions: 3 },
    lord_beyond_sky: { id: "lord_beyond_sky", name: "空の彼方の主", hp: 338000, attack: 1530, magicAttack: 1580, defense: 960, magicDefense: 1020, speed: 102, icon: "♛", boss: true, actions: 8, damageType: "magic", element: "arcane", targetRule: "rear_weighted", statusAttack: { statusId: "burn", chance: .34, duration: 3 }, elementModifiers: { arcane: .05, dark: 1.45 }, statusResistances: { poison: 1, burn: .95, chill: .95, paralysis: .98 }, bossDrop: { itemId: "nameless_staff", chance: .08 }, mechanic: { kind: "telegraphed_burst", name: "星界回帰", period: 4, multiplier: 2.3, exposedMultiplier: 1.75, description: "地上の全星力を呼び戻し、次ターン終了時に全隊列へ終焉を降らせる。" } },
    afterstar_abomination: { id: "afterstar_abomination", name: "星後の異形神", hp: 412000, attack: 1710, magicAttack: 1640, defense: 1060, magicDefense: 1060, speed: 106, icon: "♛", boss: true, actions: 8, element: "dark", targetRule: "rear_weighted", elementModifiers: { dark: .05, fire: 1.45 }, statusResistances: { poison: 1, burn: .98, chill: .98, paralysis: .98 }, bossDrop: { itemId: "afterstar_armor", chance: .1 }, mechanic: { kind: "telegraphed_burst", name: "星後降誕", period: 4, multiplier: 2.4, exposedMultiplier: 1.8, description: "終わった星の残滓を神体へ集め、次ターン終了時に全隊列を消し去る。" } }
  };

  const materials = {
    gate_seraph: [["sky_dust", .55, 1, 2]], void_hunter: [["void_heart", .5, 1, 2]], sky_threshold_warden: [["sky_dust", 1, 2, 4]],
    broken_zodiac: [["constellation_fragment", .55, 1, 2]], constellation_beast: [["constellation_fragment", .5, 1, 2]], astral_judge: [["constellation_fragment", 1, 2, 4]],
    firstlight_echo: [["first_light", .55, 1, 2]], genesis_automaton: [["sky_dust", .55, 1, 2]], archive_of_dawn: [["first_light", 1, 2, 4]],
    throne_angel: [["sky_dust", .6, 1, 2]], starless_knight: [["void_heart", .6, 1, 2]], celestial_regent: [["void_heart", 1, 2, 4]],
    sky_eye: [["void_heart", .65, 1, 2]], nameless_herald: [["constellation_fragment", .65, 1, 3]], lord_beyond_sky: [["nameless_star", 1, 2, 4]],
    afterstar_abomination: [["nameless_star", 1, 3, 5], ["void_heart", 1, 3, 5]]
  };
  data.registry.relations("monsterMaterialDrops", Object.fromEntries(Object.entries(materials).map(([id, entries]) => [id,
    entries.map(([itemId, chance, minimum, maximum]) => ({ itemId, chance, quantity: [minimum, maximum] }))
  ])));
  data.registry.entities("monsters", monsters);

  const route = (id, name, shortName, duration, difficulty, order, requirements, description, encounters, rewards, drops, extra = {}) => ({
    id, name, shortName, recommendedLevel: 100, duration, difficulty, color: "gold", chapterId: "end_of_starless_night", orderInChapter: order, requiredForStory: true,
    unlockRequirements: requirements, description, strategy: { label: "星なき夜の果てへ進む", feature: description, advice: "足元には空があり、頭上には名を失った星々が沈んでいる。", preparation: [] }, encounters, rewards, drops, ...extra
  });
  data.registry.entities("dungeons", {
    sky_gate_ascent: route("sky_gate_ascent", "天門昇路", "天門昇路", 3420, 130200, 1, [{ type: "chapterCompleted", chapterId: "returnless_capital" }], "ノアが開いた天門を昇る光の道。地上へ戻そうとする門守が待つ。", [{ name: "逆さ星の階", groups: [["gate_seraph", "void_hunter"], ["gate_seraph", "gate_seraph"]] }, { name: "天境門", groups: [["void_hunter", "sky_threshold_warden"]] }], { gold: [225300, 268400], exp: [217900, 259600] }, [{ itemId: "sky_dust", chance: .45, quantity: [1, 2] }], { clearStoryId: "sky_gate_ascent_clear" }),
    broken_constellation: route("broken_constellation", "砕けた星座回廊", "砕星座回廊", 3480, 135400, 2, [{ type: "dungeonClear", dungeonId: "sky_gate_ascent" }], "役目を終えた世界の星座が流れ着く回廊。裁定者は地上を次の供物と定める。", [{ name: "星座の残骸", groups: [["broken_zodiac", "constellation_beast"], ["broken_zodiac", "broken_zodiac"]] }, { name: "星界裁定庭", groups: [["constellation_beast", "astral_judge"]] }], { gold: [234500, 279400], exp: [226800, 270200] }, [{ itemId: "constellation_fragment", chance: .46, quantity: [1, 2] }], { clearStoryId: "broken_constellation_clear" }),
    first_light_archive: route("first_light_archive", "始光の記録海", "始光記録海", 3540, 140800, 3, [{ type: "dungeonClear", dungeonId: "broken_constellation" }], "空の主が最初の星を生んだ記録の海。星海と王朝の本当の始まりが映る。", [{ name: "創世残響", groups: [["firstlight_echo", "genesis_automaton"], ["firstlight_echo", "firstlight_echo"]] }, { name: "暁の記録核", groups: [["genesis_automaton", "archive_of_dawn"]] }], { gold: [244000, 290700], exp: [236000, 281200] }, [{ itemId: "first_light", chance: .46, quantity: [1, 2] }], { clearStoryId: "first_light_archive_clear" }),
    throne_beyond_sky: route("throne_beyond_sky", "天外王座", "天外王座", 3600, 146400, 4, [{ type: "dungeonClear", dungeonId: "first_light_archive" }], "空の主へ仕える摂政が守る王座。地上の星を所有物と呼ぶ声が響く。", [{ name: "無星の参道", groups: [["throne_angel", "starless_knight"], ["throne_angel", "throne_angel"]] }, { name: "天上摂政座", groups: [["starless_knight", "celestial_regent"]] }], { gold: [253900, 302500], exp: [245600, 292600] }, [{ itemId: "void_heart", chance: .46, quantity: [1, 2] }], { clearStoryId: "throne_beyond_sky_clear" }),
    nameless_star_end: route("nameless_star_end", "名もなき星の果て", "無名星の果て", 3660, 152200, 5, [{ type: "dungeonClear", dungeonId: "throne_beyond_sky" }], "すべての星名が消える空の最奥。王朝を始めた主との最後の戦いが始まる。", [{ name: "空主の眼界", groups: [["sky_eye", "nameless_herald", "sky_eye"], ["nameless_herald", "nameless_herald"]] }, { name: "星なき夜の果て", groups: [["sky_eye", "lord_beyond_sky"]] }], { gold: [264200, 314800], exp: [255600, 304500] }, [{ itemId: "nameless_star", chance: .4, quantity: [1, 2] }], { clearStoryId: "end_of_starless_night_clear" }),
    afterstar_sanctum: route("afterstar_sanctum", "星後の神域", "星後神域", 4020, 176000, 6, [{ type: "chapterCompleted", chapterId: "end_of_starless_night" }], "星の循環が終わった後に現れた未知の神域。本編には不要だが、別世界から最初の異形が訪れる。", [{ name: "星後の空洞", groups: [["broken_zodiac", "sky_eye", "void_hunter"]] }, { name: "異形降誕座", groups: [["afterstar_abomination", "nameless_herald"]] }], { gold: [317000, 377500], exp: [306600, 365100] }, [{ itemId: "nameless_star", chance: .35, quantity: [1, 2] }], { recommendedLevel: 105, requiredForStory: false, optionalStoryId: "afterstar_sanctum_clear" })
  });

  data.registry.entityList("recipes", [
    { id: "forge_heavensplit_rapier", resultId: "heavensplit_rapier", gold: 13100, materials: { constellation_fragment: 8, sky_dust: 5, starblood_crystal: 2 }, unlockAfter: "end_of_starless_night" },
    { id: "forge_firstlight_robe", resultId: "firstlight_robe", gold: 13400, materials: { first_light: 8, void_heart: 4, eclipse_glass: 2 }, unlockAfter: "end_of_starless_night" },
    { id: "forge_constellation_leather", resultId: "constellation_leather", gold: 13600, materials: { sky_dust: 8, constellation_fragment: 5, royal_memory: 2 }, unlockAfter: "end_of_starless_night" }
  ]);

  data.registry.entities("storyScenes", {
    end_of_starless_night_opening: { id: "end_of_starless_night_opening", name: "空へ向かう冒険者たち", text: "王都の天門を前に、ノアはギルドの仲間を振り返った。王命でも予言でもない。名もない宿で始まった冒険者たちが、自分たちの意思で空へ踏み出す。" },
    sky_gate_ascent_clear: { id: "sky_gate_ascent_clear", name: "地上を離れる足跡", text: "門守を越えると、地上は小さな灯の集まりに見えた。リナは宿の灯を見つけ、『帰る場所があるから、空の果てまで行けます』と笑った。" },
    broken_constellation_clear: { id: "broken_constellation_clear", name: "終わった世界の星座", text: "砕けた星座は、空の主へ力を返し尽くした世界の墓標だった。地上の星海もまた、同じ循環のために育てられていた。" },
    first_light_archive_clear: { id: "first_light_archive_clear", name: "最初の星の記録", text: "空の主は星を生み、育った力を回収して次の星を作る。王朝はその仕組みを盗んだのではない。地上を収穫しやすく整える代行者として選ばれていた。" },
    throne_beyond_sky_clear: { id: "throne_beyond_sky_clear", name: "所有されない星", text: "摂政は地上の命を空の主の所有物と呼んだ。ノアは静かに首を振る。『生まれた場所が誰かのものでも、そこで生きた時間まで所有されはしません』。" },
    end_of_starless_night_clear: { id: "end_of_starless_night_clear", name: "星なき夜の終わり", text: "ノアが星核を砕き、冒険者たちが空の主の真名を呼ぶと、世界を巡る収穫の鎖は途切れた。王都へ戻った夜、名もなき宿の上には初めて誰のものでもない星が輝いた。ギルドの扉には、また新しい依頼が届いている。" },
    afterstar_sanctum_clear: { id: "afterstar_sanctum_clear", name: "星の後から来るもの", text: "循環の外側には、空の主さえ知らない世界が広がっていた。異形神の残した座標は五つの遠い領域を示す。大きな物語は終わったが、冒険者の旅に終わりはない。" }
  });
  data.registry.entityList("storyChapters", [{
    id: "end_of_starless_night", order: 15, number: 15, title: "第15章：星なき夜の果て", recommendedLevelRange: [100, 100],
    openingStoryId: "end_of_starless_night_opening", clearStoryId: "end_of_starless_night_clear",
    objective: "5つの本編ダンジョンを順番に攻略し、星を収穫する循環を終わらせる", entryRequirements: [],
    unlockText: "星後の神域、天裂きの細剣・始光の法衣・星座の軽鎧のレシピ、10,000G、名もなき星×2",
    rewards: { gold: 10000, materials: { nameless_star: 2, guild_seal: 5 } }
  }]);
})();
