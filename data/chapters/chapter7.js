(function () {
  "use strict";
  const data = window.GameData;

  data.registry.entities("items", {
    black_sap: { id: "black_sap", name: "黒樹液", type: "material", price: 0, icon: "●" },
    moonleaf: { id: "moonleaf", name: "月光葉", type: "material", price: 0, icon: "☘" },
    witch_ember: { id: "witch_ember", name: "魔女火", type: "material", price: 0, icon: "✧" },
    saint_thorn: { id: "saint_thorn", name: "聖棘", type: "material", price: 0, icon: "†" },
    worldroot_seed: { id: "worldroot_seed", name: "世界根の種", type: "material", price: 0, icon: "◆" },
    moonleaf_bow: { id: "moonleaf_bow", name: "月葉の長弓", type: "weapon", weaponType: "bow", range: "ranged", tier: 8, price: 6800, attack: 48, attackCount: 4, hitRate: .26, criticalRate: .06, speed: 8, defense: 2, hp: 20, weight: 7, icon: "➶", craftOnly: true, salvage: { itemId: "moonleaf", quantity: 3 } },
    thornplate_gauntlets: { id: "thornplate_gauntlets", name: "棘甲の篭手", type: "armor", armorType: "gauntlet", tier: 8, price: 7000, attack: 25, defense: 34, magicDefense: 20, hitRate: .12, speed: 5, hp: 45, weight: 9, icon: "◆", craftOnly: true, salvage: { itemId: "saint_thorn", quantity: 2 } },
    nightbloom_robe: { id: "nightbloom_robe", name: "夜花の祭衣", type: "armor", armorType: "cloth", tier: 8, price: 6900, defense: 30, magicDefense: 52, magicAttack: 20, magicHealing: 24, evasionRate: .05, hp: 58, weight: 5, icon: "♜", craftOnly: true, salvage: { itemId: "moonleaf", quantity: 3 } },
    saint_thorn_sword: { id: "saint_thorn_sword", name: "棘聖女の剣", type: "weapon", weaponType: "sword", range: "melee", tier: 8, price: 9100, attack: 72, defense: 12, magicDefense: 8, hitRate: .1, criticalRate: .08, hp: 42, weight: 13, icon: "⚔", unique: true, salvage: { itemId: "saint_thorn", quantity: 3 }, specialEffects: [{ kind: "critical_followup", chance: .3, multiplier: .65 }], effectDescription: "会心時、攻撃力65%の追撃を1行動につき1回行う。追撃は会心せず、倒した場合は別の敵へ向かう。" },
    worldroot_mail: { id: "worldroot_mail", name: "世界根の樹鎧", type: "armor", armorType: "heavy", tier: 9, price: 10800, attack: 6, defense: 70, magicDefense: 45, hp: 145, weight: 22, icon: "▧", unique: true, salvage: { itemId: "worldroot_seed", quantity: 3 }, specialEffects: [{ kind: "weight_defense", multiplier: 1.3 }], effectDescription: "この鎧の実重量1につき防御+1.3。重量補正と防具適性を反映する。" }
  });

  const monsters = {
    blackwood_wolf: { id: "blackwood_wolf", name: "黒樹狼", hp: 2450, attack: 310, attackCount: 2, defense: 170, magicDefense: 125, speed: 54, icon: "◆", element: "nature", elementModifiers: { nature: .6, fire: 1.3 } },
    sap_slime: { id: "sap_slime", name: "黒蜜スライム", hp: 2800, attack: 285, defense: 205, magicDefense: 155, speed: 34, icon: "●", element: "nature", statusAttack: { statusId: "poison", chance: .28, duration: 3 }, elementModifiers: { nature: .55, fire: 1.3 } },
    border_keeper: { id: "border_keeper", name: "樹海境の番人", hp: 27000, attack: 350, defense: 225, magicDefense: 165, speed: 43, icon: "♛", boss: true, actions: 3, element: "nature", statusAttack: { statusId: "poison", chance: .25, duration: 3 }, statusResistances: { poison: .8 }, elementModifiers: { nature: .45, fire: 1.35 }, mechanic: { kind: "telegraphed_burst", name: "閉ざす根槍", period: 5, multiplier: 1.55, exposedMultiplier: 1.4, description: "地中へ根を巡らせ、次ターン終了時に全体を貫く。発動後は根が地上へ露出する。" } },
    whisper_moth: { id: "whisper_moth", name: "囁き蛾", hp: 2550, attack: 290, magicAttack: 340, defense: 135, magicDefense: 175, speed: 52, icon: "◇", damageType: "magic", element: "dark", targetRule: "rear_weighted", elementModifiers: { dark: .65, fire: 1.25 } },
    root_walker: { id: "root_walker", name: "歩根の木人", hp: 3200, attack: 335, defense: 230, magicDefense: 140, speed: 35, icon: "♜", element: "nature", statusResistances: { poison: 1 } },
    ancient_treant: { id: "ancient_treant", name: "古樹トレント", hp: 30500, attack: 370, defense: 245, magicDefense: 170, speed: 36, icon: "♛", boss: true, actions: 3, element: "nature", statusResistances: { poison: 1, paralysis: .6 }, elementModifiers: { nature: .4, fire: 1.4 }, mechanic: { kind: "telegraphed_burst", name: "年輪崩し", period: 4, multiplier: 1.6, exposedMultiplier: 1.45, description: "巨体を軋ませ、次ターン終了時に森全体を揺らす。発動後は古い幹が割れる。" } },
    marsh_witch: { id: "marsh_witch", name: "沼辺の魔女", hp: 2700, attack: 300, magicAttack: 375, defense: 145, magicDefense: 190, speed: 48, icon: "☾", damageType: "magic", element: "fire", statusAttack: { statusId: "burn", chance: .3, duration: 3 } },
    lantern_toad: { id: "lantern_toad", name: "灯籠蛙", hp: 3350, attack: 350, defense: 215, magicDefense: 165, speed: 37, icon: "●", element: "nature", statusAttack: { statusId: "poison", chance: .3, duration: 3 } },
    witchflame_hag: { id: "witchflame_hag", name: "魔女火の老婆", hp: 32500, attack: 335, magicAttack: 405, defense: 200, magicDefense: 205, speed: 47, icon: "♛", boss: true, actions: 3, damageType: "magic", element: "fire", statusAttack: { statusId: "burn", chance: .38, duration: 3 }, targetStatusId: "burn", statusResistances: { burn: 1, poison: .5 }, elementModifiers: { fire: .4, ice: 1.35 } },
    thorn_acolyte: { id: "thorn_acolyte", name: "棘冠の侍祭", hp: 3000, attack: 345, magicAttack: 350, defense: 190, magicDefense: 190, speed: 46, icon: "†", element: "nature" },
    briar_knight: { id: "briar_knight", name: "茨鎧の騎士", hp: 3650, attack: 385, defense: 255, magicDefense: 170, speed: 40, icon: "♟", element: "nature", statusAttack: { statusId: "poison", chance: .22, duration: 3 } },
    thorn_saint: { id: "thorn_saint", name: "棘聖女ロザリア", hp: 36500, attack: 420, defense: 260, magicDefense: 205, speed: 49, icon: "♛", boss: true, actions: 3, element: "nature", statusResistances: { poison: 1, paralysis: .7 }, elementModifiers: { nature: .4, fire: 1.35 }, bossDrop: { itemId: "saint_thorn_sword", chance: .08 }, mechanic: { kind: "telegraphed_burst", name: "殉花の茨冠", period: 4, multiplier: 1.6, exposedMultiplier: 1.45, statusAmplifier: { statusId: "poison", multiplier: 1.15 }, description: "茨冠を育て、次ターン終了時に全体を締め上げる。毒状態の相手へ威力が増す。" } },
    nightbloom_fairy: { id: "nightbloom_fairy", name: "夜花の妖精", hp: 2850, attack: 315, magicAttack: 400, defense: 150, magicDefense: 215, speed: 58, icon: "✧", damageType: "magic", element: "dark", targetRule: "rear_weighted" },
    dream_stalker: { id: "dream_stalker", name: "夢喰い獣", hp: 3500, attack: 405, defense: 215, magicDefense: 180, speed: 55, icon: "◆", element: "dark", targetRule: "rear_weighted" },
    nightbloom_oracle: { id: "nightbloom_oracle", name: "夜花の託宣者", hp: 41000, attack: 370, magicAttack: 445, defense: 245, magicDefense: 235, speed: 52, icon: "♛", boss: true, actions: 3, damageType: "magic", element: "dark", statusAttack: { statusId: "poison", chance: .35, duration: 3 }, elementModifiers: { dark: .4, fire: 1.3 }, statusResistances: { poison: .85, paralysis: .75 }, mechanic: { kind: "telegraphed_burst", name: "常夜開花", period: 4, multiplier: 1.65, exposedMultiplier: 1.5, description: "夜花を開き、次ターン終了時に全体へ闇の花粉を放つ。開花後は魔力が散る。" } },
    worldroot_devourer: { id: "worldroot_devourer", name: "世界根を喰らうもの", hp: 49000, attack: 465, defense: 278, magicDefense: 230, speed: 44, icon: "♛", boss: true, actions: 4, element: "dark", statusAttack: { statusId: "poison", chance: .4, duration: 3 }, elementModifiers: { dark: .35, fire: 1.4 }, statusResistances: { poison: 1, paralysis: .9, burn: .75 }, bossDrop: { itemId: "worldroot_mail", chance: .1 }, mechanic: { kind: "telegraphed_burst", name: "根界捕食", period: 3, multiplier: 1.65, exposedMultiplier: 1.55, description: "世界根を飲み込み、短い周期で全体を圧し潰す。発動後は種核が露出する。" } }
  };

  const materials = {
    blackwood_wolf: [["black_sap", .5, 1, 2]], sap_slime: [["black_sap", .55, 1, 2]], border_keeper: [["moonleaf", 1, 2, 4]],
    whisper_moth: [["moonleaf", .55, 1, 2]], root_walker: [["black_sap", .6, 1, 2]], ancient_treant: [["saint_thorn", 1, 2, 4]],
    marsh_witch: [["witch_ember", .55, 1, 2]], lantern_toad: [["black_sap", .6, 1, 2]], witchflame_hag: [["witch_ember", 1, 2, 4]],
    thorn_acolyte: [["saint_thorn", .5, 1, 2]], briar_knight: [["saint_thorn", .65, 1, 2]], thorn_saint: [["saint_thorn", 1, 2, 4]],
    nightbloom_fairy: [["moonleaf", .65, 1, 2]], dream_stalker: [["witch_ember", .6, 1, 2]], nightbloom_oracle: [["saint_thorn", 1, 2, 4]],
    worldroot_devourer: [["worldroot_seed", 1, 3, 5], ["black_sap", 1, 3, 5]]
  };
  data.registry.relations("monsterMaterialDrops", Object.fromEntries(Object.entries(materials).map(([id, entries]) => [id,
    entries.map(([itemId, chance, minimum, maximum]) => ({ itemId, chance, quantity: [minimum, maximum] }))
  ])));
  data.registry.entities("monsters", monsters);

  const route = (id, name, shortName, level, duration, difficulty, order, requirements, description, encounters, rewards, drops, extra = {}) => ({
    id, name, shortName, recommendedLevel: level, duration, difficulty, color: "green", chapterId: "blackwood_pilgrimage", orderInChapter: order, requiredForStory: true,
    unlockRequirements: requirements, description, strategy: { label: "黒樹海を調査する", feature: description, advice: "敵が残す状態異常と後列への攻撃を戦闘記録から確かめてください。", preparation: [] }, encounters, rewards, drops, ...extra
  });
  data.registry.entities("dungeons", {
    blackwood_border: route("blackwood_border", "黒樹海の境", "黒樹海境", 48, 1020, 8200, 1, [{ type: "chapterCompleted", chapterId: "clockwork_desert" }], "白砂の果てに立つ黒い森。根と獣が巡礼者の道を塞ぐ。", [{ name: "煤葉の獣道", groups: [["blackwood_wolf", "sap_slime"], ["blackwood_wolf", "blackwood_wolf"]] }, { name: "閉根の門", groups: [["border_keeper", "sap_slime"]] }], { gold: [15100, 17900], exp: [14600, 17300] }, [{ itemId: "black_sap", chance: .38, quantity: [1, 2] }], { clearStoryId: "blackwood_border_clear" }),
    whispering_roots: route("whispering_roots", "囁き根の回廊", "囁き根回廊", 50, 1080, 9200, 2, [{ type: "dungeonClear", dungeonId: "blackwood_border" }], "地上へ浮いた根が声を運ぶ回廊。囁きは隊列の最後尾から聞こえる。", [{ name: "反響する根道", groups: [["whisper_moth", "root_walker"], ["whisper_moth", "whisper_moth"]] }, { name: "千年樹洞", groups: [["root_walker", "ancient_treant"]] }], { gold: [16800, 19900], exp: [16200, 19200] }, [{ itemId: "moonleaf", chance: .38, quantity: [1, 2] }], { clearStoryId: "whispering_roots_clear" }),
    witch_lantern_marsh: route("witch_lantern_marsh", "魔女灯の沼", "魔女灯沼", 52, 1140, 10300, 3, [{ type: "dungeonClear", dungeonId: "whispering_roots" }], "消えない灯が水面を渡る沼。青い火に触れた者は同じ夢へ戻される。", [{ name: "灯籠の浅瀬", groups: [["marsh_witch", "lantern_toad"], ["lantern_toad", "lantern_toad"]] }, { name: "魔女火の庵", groups: [["lantern_toad", "witchflame_hag"]] }], { gold: [18700, 22200], exp: [18100, 21400] }, [{ itemId: "witch_ember", chance: .4, quantity: [1, 2] }], { clearStoryId: "witch_lantern_marsh_clear" }),
    thorn_cathedral: route("thorn_cathedral", "棘冠の聖堂", "棘冠聖堂", 54, 1200, 11500, 4, [{ type: "dungeonClear", dungeonId: "witch_lantern_marsh" }], "森を守るため自らを茨へ変えた騎士たちの聖堂。", [{ name: "棘列柱廊", groups: [["thorn_acolyte", "briar_knight"], ["briar_knight", "briar_knight"]] }, { name: "殉花の祭壇", groups: [["briar_knight", "thorn_saint"]] }], { gold: [20800, 24700], exp: [20100, 23800] }, [{ itemId: "saint_thorn", chance: .32, quantity: [1, 2] }], { clearStoryId: "thorn_cathedral_clear" }),
    night_bloom_sanctuary: route("night_bloom_sanctuary", "夜花の聖域", "夜花聖域", 56, 1260, 12900, 5, [{ type: "dungeonClear", dungeonId: "thorn_cathedral" }], "夜にだけ開く花が、森へ入った者の記憶を夢として咲かせる。", [{ name: "夢花の庭", groups: [["nightbloom_fairy", "dream_stalker", "nightbloom_fairy"], ["dream_stalker", "dream_stalker"]] }, { name: "常夜の花床", groups: [["dream_stalker", "nightbloom_oracle"]] }], { gold: [23200, 27600], exp: [22400, 26600] }, [{ itemId: "saint_thorn", chance: .34, quantity: [1, 2] }], { clearStoryId: "blackwood_pilgrimage_clear" }),
    devouring_tree_pit: route("devouring_tree_pit", "喰根の深穴", "喰根深穴", 60, 1440, 15800, 6, [{ type: "chapterCompleted", chapterId: "blackwood_pilgrimage" }], "世界根を内側から喰らうものが潜む深穴。本編には不要な危険地帯。", [{ name: "空洞根の坂", groups: [["root_walker", "dream_stalker", "root_walker"]] }, { name: "種核の底", groups: [["worldroot_devourer"]] }], { gold: [29000, 34800], exp: [28100, 33700] }, [{ itemId: "worldroot_seed", chance: .3, quantity: [1, 2] }], { requiredForStory: false, optionalStoryId: "devouring_tree_pit_clear" })
  });

  data.registry.entityList("recipes", [
    { id: "forge_moonleaf_bow", resultId: "moonleaf_bow", gold: 3400, materials: { moonleaf: 8, black_sap: 5, saint_thorn: 1 }, unlockAfter: "blackwood_pilgrimage" },
    { id: "forge_thornplate_gauntlets", resultId: "thornplate_gauntlets", gold: 3600, materials: { saint_thorn: 7, black_sap: 4, brass_gear: 2 }, unlockAfter: "blackwood_pilgrimage" },
    { id: "forge_nightbloom_robe", resultId: "nightbloom_robe", gold: 3500, materials: { moonleaf: 7, witch_ember: 4, time_sand: 2 }, unlockAfter: "blackwood_pilgrimage" }
  ]);

  data.registry.entities("storyScenes", {
    blackwood_pilgrimage_opening: { id: "blackwood_pilgrimage_opening", name: "砂漠の先で待つ黒い森", text: "時砂女王の使者が残した道標は、昼でも夜のように暗い森へ続いていた。リナは黒い葉を拾い、『森は侵入者を拒んでいるのではありません。何かを外へ出さないよう、道を閉じています』と告げた。" },
    blackwood_border_clear: { id: "blackwood_border_clear", name: "内側へ向いた番人", text: "境の番人が向けていた刃は旅人ではなく、森の奥だった。根に刻まれた巡礼印は、夜花の聖域へ助けを求める道を示す。" },
    whispering_roots_clear: { id: "whispering_roots_clear", name: "根が運んだ警告", text: "古樹の年輪には『花を眠らせよ』という警告が何百年も繰り返されていた。囁きは死者の声ではなく、世界根そのものの記憶だった。" },
    witch_lantern_marsh_clear: { id: "witch_lantern_marsh_clear", name: "燃える夢の道標", text: "魔女火は旅人を惑わせる灯ではなく、記憶を奪う夜花から夢を守る結界だった。最後の火は棘冠の聖堂を指している。" },
    thorn_cathedral_clear: { id: "thorn_cathedral_clear", name: "茨になった誓い", text: "棘聖女は夜花を封じるため、自らと騎士たちを森へ繋いでいた。封印は弱まり、聖域から黒い花粉が流れ始めている。" },
    blackwood_pilgrimage_clear: { id: "blackwood_pilgrimage_clear", name: "夜明けを選んだ花", text: "託宣者が眠りにつくと、夜花は記憶を夢へ閉じ込めることをやめた。黒樹海に細い朝日が差し、女王の使者が残した次の道標が北の山脈を指す。" },
    devouring_tree_pit_clear: { id: "devouring_tree_pit_clear", name: "森が隠した飢え", text: "世界根を喰らうものの腹から、王朝時代の採掘具が見つかった。怪物は森から生まれたのではない。誰かが世界根の力を掘り出すため、深穴へ放ったものだった。" }
  });
  data.registry.entityList("storyChapters", [{
    id: "blackwood_pilgrimage", order: 7, number: 7, title: "第7章：夜花の黒樹海", recommendedLevelRange: [48, 56],
    openingStoryId: "blackwood_pilgrimage_opening", clearStoryId: "blackwood_pilgrimage_clear",
    objective: "5つの本編ダンジョンを順番に攻略し、夜花の聖域を解放する", entryRequirements: [],
    unlockText: "喰根の深穴、黒樹薬草園、月葉の長弓・棘甲の篭手・夜花の祭衣のレシピ、2,500G、聖棘×2",
    rewards: { gold: 2500, materials: { saint_thorn: 2, guild_seal: 3 } }
  }]);
})();
