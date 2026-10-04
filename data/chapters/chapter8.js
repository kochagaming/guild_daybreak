(function () {
  "use strict";
  const data = window.GameData;

  data.registry.entities("items", {
    frost_steel: { id: "frost_steel", name: "霜鋼", type: "material", price: 0, icon: "◇" },
    thunder_crystal: { id: "thunder_crystal", name: "雷晶", type: "material", price: 0, icon: "ϟ" },
    cloud_wool: { id: "cloud_wool", name: "雲羊毛", type: "material", price: 0, icon: "☁" },
    aurora_feather: { id: "aurora_feather", name: "極光羽", type: "material", price: 0, icon: "✧" },
    white_dragon_scale: { id: "white_dragon_scale", name: "白竜鱗", type: "material", price: 0, icon: "◆" },
    thundersteel_katana: { id: "thundersteel_katana", name: "雷鋼の太刀", type: "weapon", weaponType: "katana", range: "melee", tier: 9, price: 8900, attack: 88, attackCount: -1, hitRate: .1, criticalRate: .12, speed: 5, defense: 5, hp: 35, weight: 14, icon: "⚔", craftOnly: true, salvage: { itemId: "thunder_crystal", quantity: 3 } },
    cloudweave_mantle: { id: "cloudweave_mantle", name: "雲織りの外套", type: "armor", armorType: "leather", tier: 9, price: 8600, attack: 8, defense: 42, magicDefense: 38, evasionRate: .09, speed: 9, hp: 72, weight: 6, icon: "♜", craftOnly: true, salvage: { itemId: "cloud_wool", quantity: 3 } },
    aurora_staff: { id: "aurora_staff", name: "極光の杖", type: "weapon", weaponType: "staff", range: "ranged", tier: 9, price: 9000, attack: 8, magicAttack: 64, magicHealing: 48, magicDefense: 14, hitRate: .12, speed: 7, hp: 50, weight: 7, icon: "⚕", craftOnly: true, salvage: { itemId: "aurora_feather", quantity: 2 } },
    sky_monk_gauntlets: { id: "sky_monk_gauntlets", name: "雲上導師の篭手", type: "armor", armorType: "gauntlet", tier: 9, price: 11200, attack: 38, defense: 46, magicDefense: 32, hitRate: .15, speed: 8, hp: 68, weight: 10, icon: "◆", unique: true, salvage: { itemId: "aurora_feather", quantity: 3 }, specialEffects: [{ kind: "critical_followup", multiplier: .7, name: "雷掌の追撃" }], effectDescription: "会心時、攻撃力70%の雷掌による追撃を1行動につき1回行う。" },
    white_dragon_shield: { id: "white_dragon_shield", name: "白竜鱗の大盾", type: "armor", armorType: "shield", tier: 10, price: 13500, attack: 0, defense: 82, magicDefense: 58, hp: 180, weight: 24, icon: "⬟", unique: true, salvage: { itemId: "white_dragon_scale", quantity: 3 }, specialEffects: [{ kind: "weight_defense", multiplier: 1.4 }], effectDescription: "この盾の実重量1につき防御+1.4。重量補正と防具適性を反映する。" }
  });

  const monsters = {
    snow_hare: { id: "snow_hare", name: "雪走兎", hp: 3400, attack: 380, attackCount: 3, defense: 205, magicDefense: 160, speed: 66, icon: "◆", element: "ice", elementModifiers: { ice: .6, fire: 1.3 } },
    frost_ram: { id: "frost_ram", name: "霜角羊", hp: 4100, attack: 410, defense: 270, magicDefense: 175, speed: 42, icon: "♜", element: "ice", statusAttack: { statusId: "chill", chance: .25, duration: 3 } },
    pass_colossus: { id: "pass_colossus", name: "雪路の巨像", hp: 40000, attack: 445, defense: 295, magicDefense: 205, speed: 38, icon: "♛", boss: true, actions: 3, element: "ice", statusAttack: { statusId: "chill", chance: .28, duration: 3 }, elementModifiers: { ice: .4, fire: 1.35 }, statusResistances: { chill: .9, paralysis: .65 }, mechanic: { kind: "telegraphed_burst", name: "雪崩の踏圧", period: 5, multiplier: 1.6, exposedMultiplier: 1.4, description: "斜面へ衝撃を蓄え、次ターン終了時に雪崩を起こす。発動後は巨体が雪へ沈む。" } },
    ice_wisp: { id: "ice_wisp", name: "氷灯の精", hp: 3300, attack: 340, magicAttack: 430, defense: 160, magicDefense: 225, speed: 59, icon: "✧", damageType: "magic", element: "ice", statusAttack: { statusId: "chill", chance: .3, duration: 3 } },
    bridge_guard: { id: "bridge_guard", name: "凍橋の衛兵", hp: 4300, attack: 435, defense: 285, magicDefense: 195, speed: 45, icon: "♟", element: "ice" },
    frozen_judge: { id: "frozen_judge", name: "凍橋の審判者", hp: 43000, attack: 470, magicAttack: 440, defense: 300, magicDefense: 225, speed: 46, icon: "♛", boss: true, actions: 3, element: "ice", statusAttack: { statusId: "chill", chance: .35, duration: 3 }, targetStatusId: "chill", elementModifiers: { ice: .4, fire: 1.35 }, statusResistances: { chill: 1, paralysis: .7 } },
    thunder_hawk: { id: "thunder_hawk", name: "雷羽鷹", hp: 3600, attack: 420, magicAttack: 400, defense: 190, magicDefense: 190, speed: 68, icon: "➶", element: "lightning", targetRule: "rear_weighted", statusAttack: { statusId: "paralysis", chance: .22, duration: 1 } },
    storm_serpent: { id: "storm_serpent", name: "嵐尾蛇", hp: 4500, attack: 455, defense: 245, magicDefense: 205, speed: 56, icon: "ϟ", element: "lightning", statusAttack: { statusId: "paralysis", chance: .28, duration: 1 } },
    thunder_rook: { id: "thunder_rook", name: "雷巣の王鳥", hp: 46500, attack: 500, defense: 285, magicDefense: 230, speed: 62, icon: "♛", boss: true, actions: 3, element: "lightning", targetRule: "rear_weighted", statusAttack: { statusId: "paralysis", chance: .3, duration: 1 }, elementModifiers: { lightning: .4, ice: 1.3 }, statusResistances: { paralysis: .85, chill: .6 }, mechanic: { kind: "telegraphed_burst", name: "天巣落雷", period: 4, multiplier: 1.6, exposedMultiplier: 1.45, description: "雷雲を巣へ集め、次ターン終了時に全体へ落雷を放つ。発動後は翼が痺れる。" } },
    cloud_disciple: { id: "cloud_disciple", name: "雲上の修行僧", hp: 4000, attack: 450, defense: 245, magicDefense: 220, speed: 58, icon: "†", element: "lightning" },
    bell_yak: { id: "bell_yak", name: "鐘角ヤク", hp: 5000, attack: 475, defense: 300, magicDefense: 190, speed: 40, icon: "♜", element: "ice", statusAttack: { statusId: "chill", chance: .25, duration: 3 } },
    sky_monk: { id: "sky_monk", name: "雲上導師テンライ", hp: 50000, attack: 525, magicAttack: 460, defense: 310, magicDefense: 245, speed: 58, icon: "♛", boss: true, actions: 3, element: "lightning", statusAttack: { statusId: "paralysis", chance: .3, duration: 1 }, elementModifiers: { lightning: .4, dark: 1.25 }, statusResistances: { paralysis: .9, chill: .75 }, bossDrop: { itemId: "sky_monk_gauntlets", chance: .08 }, mechanic: { kind: "telegraphed_burst", name: "雷禅一掌", period: 4, multiplier: 1.65, exposedMultiplier: 1.45, description: "呼吸を整え、次ターン終了時に雷を帯びた全体掌打を放つ。発動後は構えが解ける。" } },
    aurora_sprite: { id: "aurora_sprite", name: "極光の小精", hp: 3700, attack: 360, magicAttack: 470, defense: 170, magicDefense: 250, speed: 64, icon: "✧", damageType: "magic", element: "arcane", targetRule: "rear_weighted" },
    summit_knight: { id: "summit_knight", name: "頂雪の騎士", hp: 4800, attack: 500, defense: 305, magicDefense: 220, speed: 49, icon: "♟", element: "ice", statusAttack: { statusId: "chill", chance: .28, duration: 3 } },
    aurora_warden: { id: "aurora_warden", name: "極光峰の守護者", hp: 55000, attack: 470, magicAttack: 530, defense: 305, magicDefense: 275, speed: 57, icon: "♛", boss: true, actions: 3, damageType: "magic", element: "arcane", statusAttack: { statusId: "chill", chance: .35, duration: 3 }, elementModifiers: { arcane: .4, dark: 1.3 }, statusResistances: { chill: .85, paralysis: .8 }, mechanic: { kind: "telegraphed_burst", name: "極光天蓋", period: 4, multiplier: 1.65, exposedMultiplier: 1.5, statusAmplifier: { statusId: "chill", multiplier: 1.15 }, description: "極光を天蓋へ満たし、次ターン終了時に全体魔法。凍寒中の相手へ威力が増す。" } },
    white_dragon: { id: "white_dragon", name: "白嶺竜アルヴァ", hp: 85000, attack: 650, magicAttack: 625, defense: 360, magicDefense: 300, speed: 54, icon: "♛", boss: true, actions: 4, damageType: "magic", element: "ice", statusAttack: { statusId: "chill", chance: .4, duration: 3 }, elementModifiers: { ice: .3, fire: 1.4 }, statusResistances: { chill: 1, paralysis: .9, burn: .75 }, bossDrop: { itemId: "white_dragon_shield", chance: .1 }, mechanic: { kind: "telegraphed_burst", name: "白界竜息", period: 3, multiplier: 1.8, exposedMultiplier: 1.55, description: "白い竜息を短い周期で放ち、山頂すべてを凍らせる。発動後は胸元の鱗が開く。" } }
  };

  const materials = {
    snow_hare: [["cloud_wool", .5, 1, 2]], frost_ram: [["frost_steel", .55, 1, 2]], pass_colossus: [["frost_steel", 1, 2, 4]],
    ice_wisp: [["thunder_crystal", .5, 1, 2]], bridge_guard: [["frost_steel", .6, 1, 2]], frozen_judge: [["cloud_wool", 1, 2, 4]],
    thunder_hawk: [["aurora_feather", .35, 1, 1]], storm_serpent: [["thunder_crystal", .6, 1, 2]], thunder_rook: [["thunder_crystal", 1, 2, 4]],
    cloud_disciple: [["cloud_wool", .55, 1, 2]], bell_yak: [["cloud_wool", .65, 1, 2]], sky_monk: [["aurora_feather", 1, 2, 4]],
    aurora_sprite: [["aurora_feather", .5, 1, 2]], summit_knight: [["frost_steel", .7, 1, 3]], aurora_warden: [["aurora_feather", 1, 2, 4]],
    white_dragon: [["white_dragon_scale", 1, 3, 5], ["frost_steel", 1, 3, 5]]
  };
  data.registry.relations("monsterMaterialDrops", Object.fromEntries(Object.entries(materials).map(([id, entries]) => [id,
    entries.map(([itemId, chance, minimum, maximum]) => ({ itemId, chance, quantity: [minimum, maximum] }))
  ])));
  data.registry.entities("monsters", monsters);

  const route = (id, name, shortName, level, duration, difficulty, order, requirements, description, encounters, rewards, drops, extra = {}) => ({
    id, name, shortName, recommendedLevel: level, duration, difficulty, color: "blue", chapterId: "thunder_snow_peaks", orderInChapter: order, requiredForStory: true,
    unlockRequirements: requirements, description, strategy: { label: "雷雪の山路を調べる", feature: description, advice: "凍寒と麻痺、後列への攻撃を戦闘記録から見極めてください。", preparation: [] }, encounters, rewards, drops, ...extra
  });
  data.registry.entities("dungeons", {
    snowbound_foothill: route("snowbound_foothill", "雪封じの山麓", "雪封山麓", 58, 1320, 14300, 1, [{ type: "chapterCompleted", chapterId: "blackwood_pilgrimage" }], "黒樹海を越えた先の雪路。巨像の足音が雪崩を呼ぶ。", [{ name: "霜角の坂", groups: [["snow_hare", "frost_ram"], ["frost_ram", "frost_ram"]] }, { name: "雪封の関", groups: [["pass_colossus", "frost_ram"]] }], { gold: [25800, 30700], exp: [24900, 29600] }, [{ itemId: "frost_steel", chance: .38, quantity: [1, 2] }], { clearStoryId: "snowbound_foothill_clear" }),
    frozen_sky_bridge: route("frozen_sky_bridge", "凍空の吊橋", "凍空吊橋", 60, 1380, 15900, 2, [{ type: "dungeonClear", dungeonId: "snowbound_foothill" }], "谷を渡る氷の吊橋。凍りついた審判者が巡礼者の目的を問う。", [{ name: "氷灯の橋路", groups: [["ice_wisp", "bridge_guard"], ["bridge_guard", "bridge_guard"]] }, { name: "白審の橋台", groups: [["bridge_guard", "frozen_judge"]] }], { gold: [28200, 33500], exp: [27200, 32300] }, [{ itemId: "cloud_wool", chance: .38, quantity: [1, 2] }], { clearStoryId: "frozen_sky_bridge_clear" }),
    thunder_nest: route("thunder_nest", "雷雲の巣", "雷雲巣", 62, 1440, 17600, 3, [{ type: "dungeonClear", dungeonId: "frozen_sky_bridge" }], "雷雲の中に浮く王鳥の巣。後列へ落雷が走る。", [{ name: "雷羽の尾根", groups: [["thunder_hawk", "storm_serpent"], ["thunder_hawk", "thunder_hawk"]] }, { name: "天巣の眼", groups: [["storm_serpent", "thunder_rook"]] }], { gold: [30800, 36600], exp: [29700, 35300] }, [{ itemId: "thunder_crystal", chance: .4, quantity: [1, 2] }], { clearStoryId: "thunder_nest_clear" }),
    cloud_monastery: route("cloud_monastery", "雲上の修道院", "雲上修道院", 64, 1500, 19400, 4, [{ type: "dungeonClear", dungeonId: "thunder_nest" }], "雷を呼吸へ変える修行僧たちの院。峰へ至る者を試す。", [{ name: "鐘雪の回廊", groups: [["cloud_disciple", "bell_yak"], ["cloud_disciple", "cloud_disciple"]] }, { name: "雷禅の道場", groups: [["bell_yak", "sky_monk"]] }], { gold: [33700, 40100], exp: [32500, 38600] }, [{ itemId: "aurora_feather", chance: .3, quantity: [1, 2] }], { clearStoryId: "cloud_monastery_clear" }),
    aurora_summit: route("aurora_summit", "極光の山頂", "極光山頂", 66, 1560, 21400, 5, [{ type: "dungeonClear", dungeonId: "cloud_monastery" }], "夜空と雪原が極光で繋がる山頂。守護者は北へ渡る星路を閉ざす。", [{ name: "光雪の階", groups: [["aurora_sprite", "summit_knight", "aurora_sprite"], ["summit_knight", "summit_knight"]] }, { name: "極光天蓋", groups: [["summit_knight", "aurora_warden"]] }], { gold: [36900, 43900], exp: [35600, 42300] }, [{ itemId: "aurora_feather", chance: .35, quantity: [1, 2] }], { clearStoryId: "thunder_snow_peaks_clear" }),
    white_dragon_roost: route("white_dragon_roost", "白嶺竜の雪窟", "白竜雪窟", 70, 1800, 28000, 6, [{ type: "chapterCompleted", chapterId: "thunder_snow_peaks" }], "極光の裏側にある古竜の雪窟。本編には不要な危険地帯。", [{ name: "竜鱗の氷洞", groups: [["summit_knight", "ice_wisp", "summit_knight"]] }, { name: "白界の寝床", groups: [["white_dragon", "aurora_sprite"]] }], { gold: [45600, 54800], exp: [44100, 52900] }, [{ itemId: "white_dragon_scale", chance: .3, quantity: [1, 2] }], { requiredForStory: false, optionalStoryId: "white_dragon_roost_clear" })
  });

  data.registry.entityList("recipes", [
    { id: "forge_thundersteel_katana", resultId: "thundersteel_katana", gold: 4700, materials: { frost_steel: 8, thunder_crystal: 5, aurora_feather: 1 }, unlockAfter: "thunder_snow_peaks" },
    { id: "forge_cloudweave_mantle", resultId: "cloudweave_mantle", gold: 4500, materials: { cloud_wool: 8, aurora_feather: 3, moonleaf: 2 }, unlockAfter: "thunder_snow_peaks" },
    { id: "forge_aurora_staff", resultId: "aurora_staff", gold: 4800, materials: { aurora_feather: 7, thunder_crystal: 4, memory_glass: 2 }, unlockAfter: "thunder_snow_peaks" }
  ]);

  data.registry.entities("storyScenes", {
    thunder_snow_peaks_opening: { id: "thunder_snow_peaks_opening", name: "黒樹海の先の白い壁", text: "女王の使者を追う一行の前に、雷雲を抱いた山脈が立ちはだかった。リナは雪に埋もれた巡礼杖を拾い、『使者は山を越えています。極光の向こうに、王朝が隠した星路があるようです』と告げた。" },
    snowbound_foothill_clear: { id: "snowbound_foothill_clear", name: "雪崩に埋もれた巡礼印", text: "巨像の足元から、黒樹海と同じ巡礼印が刻まれた石標が現れた。印は凍空の吊橋と、その先の雷雲を指している。" },
    frozen_sky_bridge_clear: { id: "frozen_sky_bridge_clear", name: "審判者が守った問い", text: "橋の審判者は通行を拒んでいたのではない。『何を忘れ、何を持って山を越えるか』という古い問いを、答える者が来るまで守っていた。" },
    thunder_nest_clear: { id: "thunder_nest_clear", name: "雷羽に残る伝言", text: "王鳥の巣から、女王の使者が結んだ黒い布が見つかった。布には『星路は王朝の逃げ道ではない』と短く記されている。" },
    cloud_monastery_clear: { id: "cloud_monastery_clear", name: "雷を聴く者たち", text: "雲上導師は使者を峰へ通していた。導師の記録によれば、極光の星路は北へ逃げるためではなく、空から何かが降りるのを防ぐ門だった。" },
    thunder_snow_peaks_clear: { id: "thunder_snow_peaks_clear", name: "極光の向こうの星路", text: "守護者が光を解くと、極光は道となって北の夜空へ伸びた。使者の足跡はそこで途切れ、代わりに空から落ちた巨大な黒い羽が残されていた。" },
    white_dragon_roost_clear: { id: "white_dragon_roost_clear", name: "白竜が見張った空", text: "白嶺竜の鱗には、星路の向こうから降りる黒い翼との戦いが刻まれていた。古竜は宝を守っていたのではなく、山脈を最後の盾として眠り続けていた。" }
  });
  data.registry.entityList("storyChapters", [{
    id: "thunder_snow_peaks", order: 8, number: 8, title: "第8章：雷雪の山脈", recommendedLevelRange: [58, 66],
    openingStoryId: "thunder_snow_peaks_opening", clearStoryId: "thunder_snow_peaks_clear",
    objective: "5つの本編ダンジョンを順番に攻略し、極光の山頂を解放する", entryRequirements: [],
    unlockText: "白嶺竜の雪窟、雷鋼の太刀・雲織りの外套・極光の杖のレシピ、3,000G、極光羽×2",
    rewards: { gold: 3000, materials: { aurora_feather: 2, guild_seal: 3 } }
  }]);
})();
