(function () {
  "use strict";
  const data = window.GameData;

  Object.assign(data.items, {
    abyssal_salt: { id: "abyssal_salt", name: "深海塩", type: "material", price: 0, icon: "◇" },
    blue_star_sand: { id: "blue_star_sand", name: "蒼星砂", type: "material", price: 0, icon: "✦" },
    tide_memory: { id: "tide_memory", name: "潮の記憶", type: "material", price: 0, icon: "≋" },
    sea_glass_core: { id: "sea_glass_core", name: "海玻璃核", type: "material", price: 0, icon: "◆" },
    starsea_heart: { id: "starsea_heart", name: "星海心珠", type: "material", price: 0, icon: "◉" },
    starsea_rapier: { id: "starsea_rapier", name: "星海の細剣", type: "weapon", weaponType: "rapier", range: "melee", tier: 13, price: 18100, attack: 82, attackCount: 3, hitRate: .24, criticalRate: .14, speed: 15, weight: 6, icon: "†", craftOnly: true, salvage: { itemId: "blue_star_sand", quantity: 3 } },
    abyssal_robe: { id: "abyssal_robe", name: "深潮の法衣", type: "armor", armorType: "cloth", tier: 13, price: 18400, defense: 48, magicDefense: 88, magicAttack: 38, magicHealing: 62, hp: 190, evasionRate: .08, weight: 5, icon: "♜", craftOnly: true, salvage: { itemId: "abyssal_salt", quantity: 3 } },
    navigator_gauntlet: { id: "navigator_gauntlet", name: "星路の篭手", type: "armor", armorType: "gauntlet", tier: 13, price: 18600, attack: 32, defense: 48, hitRate: .16, speed: 16, attackCount: 1, weight: 5, icon: "✥", craftOnly: true, salvage: { itemId: "tide_memory", quantity: 3 } },
    tide_oracle_staff: { id: "tide_oracle_staff", name: "潮告げの星杖", type: "weapon", weaponType: "staff", range: "ranged", tier: 13, price: 21800, attack: 6, magicAttack: 122, magicHealing: 104, magicDefense: 42, hitRate: .18, hp: 160, weight: 8, icon: "⚕", unique: true, salvage: { itemId: "sea_glass_core", quantity: 4 } },
    leviathan_aegis: { id: "leviathan_aegis", name: "星海竜の大盾", type: "armor", armorType: "shield", tier: 14, price: 25200, defense: 138, magicDefense: 92, hp: 520, evasionRate: -.08, weight: 20, icon: "⬟", unique: true, salvage: { itemId: "starsea_heart", quantity: 4 }, specialEffects: [{ kind: "weight_defense", multiplier: 1.7, name: "海圧装甲" }], effectDescription: "実重量1につき防御力が1.7上昇する。" }
  });

  Object.assign(data.monsters, {
    foam_scout: { id: "foam_scout", name: "泡影の斥候", hp: 10300, attack: 940, defense: 470, magicDefense: 450, speed: 88, icon: "◇", element: "water", actions: 2, targetRule: "rear_weighted" },
    light_jelly: { id: "light_jelly", name: "星灯クラゲ", hp: 9200, attack: 720, magicAttack: 950, defense: 410, magicDefense: 540, speed: 70, icon: "✦", damageType: "magic", element: "arcane", actions: 2 },
    tide_gatekeeper: { id: "tide_gatekeeper", name: "潮門の番竜", hp: 143000, attack: 1040, defense: 610, magicDefense: 570, speed: 70, icon: "♛", boss: true, actions: 5, element: "water", elementModifiers: { water: .25, lightning: 1.4 }, statusResistances: { chill: 1, paralysis: .85 }, mechanic: { kind: "telegraphed_burst", name: "潮門崩し", period: 5, multiplier: 1.9, exposedMultiplier: 1.55, description: "海流を門へ圧縮し、次ターン終了時に全隊列へ解き放つ。" } },
    drowned_sailor: { id: "drowned_sailor", name: "沈没船の水夫", hp: 10800, attack: 990, defense: 490, magicDefense: 470, speed: 72, icon: "♟", element: "water", actions: 2 },
    memory_shell: { id: "memory_shell", name: "記憶貝", hp: 11800, attack: 760, magicAttack: 940, defense: 580, magicDefense: 620, speed: 52, icon: "◆", damageType: "magic", element: "water" },
    lost_cartographer: { id: "lost_cartographer", name: "失われた海図師", hp: 147000, attack: 860, magicAttack: 1010, defense: 560, magicDefense: 630, speed: 76, icon: "♛", boss: true, actions: 5, damageType: "magic", element: "arcane", targetRule: "rear_weighted", statusAttack: { statusId: "chill", chance: .34, duration: 2 }, elementModifiers: { arcane: .3, dark: 1.35 }, statusResistances: { chill: .9, paralysis: .85 } },
    current_wraith: { id: "current_wraith", name: "海流の亡霊", hp: 10100, attack: 760, magicAttack: 990, defense: 430, magicDefense: 560, speed: 84, icon: "◇", damageType: "magic", element: "water", actions: 2 },
    star_coral: { id: "star_coral", name: "星珊瑚の巨像", hp: 12600, attack: 1020, defense: 650, magicDefense: 530, speed: 55, icon: "♜", element: "arcane", actions: 2 },
    reef_oracle: { id: "reef_oracle", name: "星礁の託宣者", hp: 151000, attack: 880, magicAttack: 1040, defense: 590, magicDefense: 650, speed: 78, icon: "♛", boss: true, actions: 5, damageType: "magic", element: "arcane", statusAttack: { statusId: "paralysis", chance: .3, duration: 1 }, elementModifiers: { arcane: .25, dark: 1.4 }, statusResistances: { paralysis: .95, chill: .8 } },
    sunken_knight: { id: "sunken_knight", name: "海底神殿の騎士", hp: 11900, attack: 1080, defense: 630, magicDefense: 510, speed: 68, icon: "♜", element: "water", actions: 2 },
    tide_siren: { id: "tide_siren", name: "潮歌のセイレーン", hp: 10500, attack: 780, magicAttack: 1050, defense: 450, magicDefense: 610, speed: 90, icon: "♪", damageType: "magic", element: "water", actions: 2, targetRule: "rear_weighted" },
    temple_warden: { id: "temple_warden", name: "星海神殿の守り手", hp: 158000, attack: 980, magicAttack: 1060, defense: 650, magicDefense: 660, speed: 74, icon: "♛", boss: true, actions: 5, element: "water", elementModifiers: { water: .2, lightning: 1.4 }, statusResistances: { chill: 1, poison: .8 }, bossDrop: { itemId: "tide_oracle_staff", chance: .08 }, mechanic: { kind: "telegraphed_burst", name: "星潮祈祷", period: 4, multiplier: 1.95, exposedMultiplier: 1.55, description: "神殿の星潮を束ね、次ターン終了時に全隊列へ降らせる。" } },
    void_ray: { id: "void_ray", name: "虚空エイ", hp: 11200, attack: 820, magicAttack: 1080, defense: 470, magicDefense: 620, speed: 92, icon: "◆", damageType: "magic", element: "dark", actions: 2 },
    starsea_serpent: { id: "starsea_serpent", name: "星海蛇", hp: 13200, attack: 1120, defense: 600, magicDefense: 570, speed: 79, icon: "≋", element: "water", actions: 3, targetRule: "rear_weighted" },
    starsea_core: { id: "starsea_core", name: "星海の心珠", hp: 169000, attack: 990, magicAttack: 1110, defense: 660, magicDefense: 690, speed: 77, icon: "♛", boss: true, actions: 5, damageType: "magic", element: "arcane", statusAttack: { statusId: "chill", chance: .34, duration: 2 }, elementModifiers: { arcane: .2, dark: 1.4 }, statusResistances: { chill: 1, paralysis: .9 }, mechanic: { kind: "telegraphed_burst", name: "星海脈動", period: 4, multiplier: 2, exposedMultiplier: 1.6, description: "海底を巡る星光を心珠へ集め、次ターン終了時に爆発させる。" } },
    abyssal_leviathan: { id: "abyssal_leviathan", name: "星喰いの海竜", hp: 212000, attack: 1200, magicAttack: 1120, defense: 720, magicDefense: 680, speed: 80, icon: "♛", boss: true, actions: 6, element: "water", targetRule: "rear_weighted", elementModifiers: { water: .15, lightning: 1.45 }, statusResistances: { chill: 1, poison: .95, paralysis: .95 }, bossDrop: { itemId: "leviathan_aegis", chance: .1 }, mechanic: { kind: "telegraphed_burst", name: "深淵大渦", period: 4, multiplier: 2.1, exposedMultiplier: 1.65, description: "海溝全体を渦へ変え、次ターン終了時に全隊列を深淵へ引き込む。" } }
  });

  const materials = {
    foam_scout: [["abyssal_salt", .55, 1, 2]], light_jelly: [["blue_star_sand", .5, 1, 2]], tide_gatekeeper: [["abyssal_salt", 1, 2, 4]],
    drowned_sailor: [["tide_memory", .55, 1, 2]], memory_shell: [["sea_glass_core", .5, 1, 2]], lost_cartographer: [["tide_memory", 1, 2, 4]],
    current_wraith: [["tide_memory", .55, 1, 2]], star_coral: [["blue_star_sand", .55, 1, 2]], reef_oracle: [["sea_glass_core", 1, 2, 4]],
    sunken_knight: [["abyssal_salt", .6, 1, 2]], tide_siren: [["blue_star_sand", .6, 1, 2]], temple_warden: [["sea_glass_core", 1, 2, 4]],
    void_ray: [["blue_star_sand", .65, 1, 2]], starsea_serpent: [["abyssal_salt", .65, 1, 3]], starsea_core: [["starsea_heart", 1, 2, 4]],
    abyssal_leviathan: [["starsea_heart", 1, 3, 5], ["sea_glass_core", 1, 3, 5]]
  };
  Object.entries(materials).forEach(([id, drops]) => { data.monsters[id].materialDrops = drops.map(([itemId, chance, minimum, maximum]) => ({ itemId, chance, quantity: [minimum, maximum] })); });

  const route = (id, name, shortName, level, duration, difficulty, order, requirements, description, encounters, rewards, drops, extra = {}) => ({
    id, name, shortName, recommendedLevel: level, duration, difficulty, color: "blue", chapterId: "starsea_corridor", orderInChapter: order, requiredForStory: true,
    unlockRequirements: requirements, description, strategy: { label: "沈んだ星路を辿る", feature: description, advice: "潮の向きが変わるたび、遠くで青い星光が瞬いている。", preparation: [] }, encounters, rewards, drops, ...extra
  });
  Object.assign(data.dungeons, {
    rootsea_descent: route("rootsea_descent", "根海への降路", "根海降路", 92, 2520, 69200, 1, [{ type: "chapterCompleted", chapterId: "primordial_forest" }], "始原樹の根を伝って地下の海へ降りる道。泡の向こうで古い番竜が星路を塞ぐ。", [{ name: "青泡の斜路", groups: [["foam_scout", "light_jelly"], ["foam_scout", "foam_scout"]] }, { name: "根海の潮門", groups: [["light_jelly", "tide_gatekeeper"]] }], { gold: [121500, 144800], exp: [117500, 139900] }, [{ itemId: "abyssal_salt", chance: .43, quantity: [1, 2] }], { clearStoryId: "rootsea_descent_clear" }),
    drowned_chartroom: route("drowned_chartroom", "沈んだ海図室", "沈没海図室", 92, 2580, 72400, 2, [{ type: "dungeonClear", dungeonId: "rootsea_descent" }], "星海を渡った者たちの海図が眠る沈没船。記憶を吸った貝が航路を囁く。", [{ name: "記憶貝の船倉", groups: [["drowned_sailor", "memory_shell"], ["drowned_sailor", "drowned_sailor"]] }, { name: "最後の海図卓", groups: [["memory_shell", "lost_cartographer"]] }], { gold: [126800, 151100], exp: [122600, 146100] }, [{ itemId: "tide_memory", chance: .44, quantity: [1, 2] }], { clearStoryId: "drowned_chartroom_clear" }),
    stellar_reef: route("stellar_reef", "星明かりの大礁", "星明大礁", 93, 2640, 75800, 3, [{ type: "dungeonClear", dungeonId: "drowned_chartroom" }], "海底の星光を蓄える珊瑚礁。亡霊の海流が王朝へ向かう力の流れを映す。", [{ name: "星珊瑚群", groups: [["current_wraith", "star_coral"], ["current_wraith", "current_wraith"]] }, { name: "託宣の星礁", groups: [["star_coral", "reef_oracle"]] }], { gold: [132400, 157800], exp: [128000, 152600] }, [{ itemId: "blue_star_sand", chance: .45, quantity: [1, 2] }], { clearStoryId: "stellar_reef_clear" }),
    submerged_temple: route("submerged_temple", "海底星神殿", "海底星神殿", 93, 2700, 79400, 4, [{ type: "dungeonClear", dungeonId: "stellar_reef" }], "星を空へ帰す儀式が行われた水没神殿。潮歌が閉ざされた祭壇を揺らす。", [{ name: "潮歌の回廊", groups: [["sunken_knight", "tide_siren"], ["sunken_knight", "sunken_knight"]] }, { name: "星潮祭壇", groups: [["tide_siren", "temple_warden"]] }], { gold: [138200, 164700], exp: [133700, 159400] }, [{ itemId: "sea_glass_core", chance: .44, quantity: [1, 2] }], { clearStoryId: "submerged_temple_clear" }),
    starsea_nucleus: route("starsea_nucleus", "星海の核域", "星海核域", 94, 2760, 83200, 5, [{ type: "dungeonClear", dungeonId: "submerged_temple" }], "地下の星海を循環させる心珠の領域。黒い鱗の主が上層へ続く光を追っている。", [{ name: "虚空の潮路", groups: [["void_ray", "starsea_serpent", "void_ray"], ["starsea_serpent", "starsea_serpent"]] }, { name: "心珠の間", groups: [["void_ray", "starsea_core"]] }], { gold: [144300, 171900], exp: [139600, 166500] }, [{ itemId: "starsea_heart", chance: .4, quantity: [1, 2] }], { clearStoryId: "starsea_corridor_clear" }),
    leviathan_trench: route("leviathan_trench", "星喰い竜の海溝", "星喰海溝", 96, 3060, 98200, 6, [{ type: "chapterCompleted", chapterId: "starsea_corridor" }], "星海の底で帰還する星を待つ大海竜の巣。本編には不要だが、黒い鱗の由来へ迫れる。", [{ name: "無光海溝", groups: [["current_wraith", "void_ray", "starsea_serpent"]] }, { name: "深淵の大渦", groups: [["abyssal_leviathan", "light_jelly"]] }], { gold: [173500, 206800], exp: [167900, 200100] }, [{ itemId: "starsea_heart", chance: .35, quantity: [1, 2] }], { requiredForStory: false, optionalStoryId: "leviathan_trench_clear" })
  });

  data.recipes.push(
    { id: "forge_starsea_rapier", resultId: "starsea_rapier", gold: 9200, materials: { blue_star_sand: 8, tide_memory: 5, primordial_bark: 2 }, unlockAfter: "starsea_corridor" },
    { id: "forge_abyssal_robe", resultId: "abyssal_robe", gold: 9400, materials: { abyssal_salt: 8, sea_glass_core: 4, star_seed: 2 }, unlockAfter: "starsea_corridor" },
    { id: "forge_navigator_gauntlet", resultId: "navigator_gauntlet", gold: 9500, materials: { tide_memory: 8, blue_star_sand: 5, origin_amber: 2 }, unlockAfter: "starsea_corridor" }
  );

  Object.assign(data.storyScenes, {
    starsea_corridor_opening: { id: "starsea_corridor_opening", name: "根の下に広がる空", text: "始原樹の根門を降りた先には、天井のない青い海が広がっていた。リナは水面を流れる光を見つめる。『星は空から落ちたのではなく、この海から汲み上げられていたのかもしれません』。" },
    rootsea_descent_clear: { id: "rootsea_descent_clear", name: "海へ沈む根", text: "潮門の先で根は無数の船着き場へ分かれていた。王朝は森から星力を奪っただけでなく、地下の海を渡るための港まで築いていた。" },
    drowned_chartroom_clear: { id: "drowned_chartroom_clear", name: "帰り道のない海図", text: "海図には星海から地上へ向かう航路だけが描かれ、戻る道は塗り潰されていた。海図師の記憶は、王命によって帰路を消した夜を繰り返している。" },
    stellar_reef_clear: { id: "stellar_reef_clear", name: "星を運ぶ潮", text: "大礁の星光は一つの流れとなり、王都のさらに北へ向かっていた。空へ帰れなかった力は、今も誰かの器へ注がれ続けている。" },
    submerged_temple_clear: { id: "submerged_temple_clear", name: "閉ざされた送星儀式", text: "祭壇には星力を空へ返す古い儀式が刻まれていた。初代王はその儀式を封じ、星を地上へ留めることで王朝を築いたのだ。" },
    starsea_corridor_clear: { id: "starsea_corridor_clear", name: "北へ昇る黒い光", text: "心珠を鎮めると、星海の流れは一瞬だけ澄んだ。その奥で黒い光が北の山脈へ昇っていく。女王の使者は、星を宿す最後の器を追っている。" },
    leviathan_trench_clear: { id: "leviathan_trench_clear", name: "海竜が守った欠片", text: "海竜の盾の内側には、空から落ちたものではない黒い星殻が残されていた。それは北方で眠る『星の器』と同じ脈動を刻んでいる。" }
  });
  data.storyChapters.push({
    id: "starsea_corridor", order: 12, number: 12, title: "第12章：星海回廊", recommendedLevelRange: [92, 94],
    openingStoryId: "starsea_corridor_opening", clearStoryId: "starsea_corridor_clear",
    objective: "5つの本編ダンジョンを順番に攻略し、星海の心珠を鎮める", entryRequirements: [],
    unlockText: "星喰い竜の海溝、星海の細剣・深潮の法衣・星路の篭手のレシピ、7,000G、星海心珠×2",
    rewards: { gold: 7000, materials: { starsea_heart: 2, guild_seal: 3 } }
  });
})();
