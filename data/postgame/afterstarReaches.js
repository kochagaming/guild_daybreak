(function () {
  "use strict";
  const data = window.GameData;

  Object.assign(data.items, {
    gray_tide_salt: { id: "gray_tide_salt", name: "灰潮塩", type: "material", price: 0, icon: "◇" },
    ember_pearl: { id: "ember_pearl", name: "燼火真珠", type: "material", price: 0, icon: "●" },
    aftersea_heart: { id: "aftersea_heart", name: "星後海の心核", type: "material", price: 0, icon: "◆" },
    void_glass: { id: "void_glass", name: "虚風玻璃", type: "material", price: 0, icon: "◇" },
    worldskin_moss: { id: "worldskin_moss", name: "世界皮苔", type: "material", price: 0, icon: "♧" },
    silent_iron: { id: "silent_iron", name: "無響鉄", type: "material", price: 0, icon: "■" },
    watcher_lens: { id: "watcher_lens", name: "遠見眼晶", type: "material", price: 0, icon: "◉" },
    boundary_fragment: { id: "boundary_fragment", name: "境界片", type: "material", price: 0, icon: "✦" },
    ashwake_sabre: { id: "ashwake_sabre", name: "灰波の曲刀", type: "weapon", weaponType: "katana", range: "melee", tier: 17, price: 33800, attack: 212, hitRate: .18, criticalRate: .2, speed: 18, weight: 11, icon: "⚔", dropOnly: true, salvage: { itemId: "gray_tide_salt", quantity: 3 }, skillIds: ["attack_105", "physical_power_3", "critical_4", "speed_2"] },
    cinderveil_cloak: { id: "cinderveil_cloak", name: "燼霞の外套", type: "armor", armorType: "cloth", tier: 17, price: 34200, defense: 78, magicDefense: 142, magicAttack: 72, magicHealing: 88, hp: 340, evasionRate: .12, speed: 14, weight: 6, icon: "♜", dropOnly: true, salvage: { itemId: "ember_pearl", quantity: 3 }, skillIds: ["magic_defense_105", "magic_attack_105", "evasion_4", "burn_resistance_35"] },
    graytide_aegis: { id: "graytide_aegis", name: "灰潮の大盾", type: "armor", armorType: "shield", tier: 17, price: 36500, defense: 188, magicDefense: 126, hp: 720, evasionRate: -.08, weight: 23, icon: "⬟", dropOnly: true, salvage: { itemId: "aftersea_heart", quantity: 3 }, skillIds: ["defense_105", "magic_defense_105", "hp_105", "defense_to_hp_2"] },
    aftersea_staff: { id: "aftersea_staff", name: "星後海の導杖", type: "weapon", weaponType: "staff", range: "ranged", tier: 17, price: 38200, attack: 9, magicAttack: 196, magicHealing: 162, magicDefense: 86, hitRate: .24, hp: 320, weight: 10, icon: "⚕", craftOnly: true, salvage: { itemId: "aftersea_heart", quantity: 3 }, skillIds: ["magic_power_3", "magic_attack_105", "magic_healing_105", "spirit_slayer_15"] },
    horizon_rapier: { id: "horizon_rapier", name: "界渡りの細剣", type: "weapon", weaponType: "rapier", range: "melee", tier: 18, price: 41800, attack: 164, attackCount: 4, hitRate: .32, criticalRate: .2, speed: 24, weight: 8, icon: "†", craftOnly: true, salvage: { itemId: "void_glass", quantity: 3 }, skillIds: ["accuracy_4", "attack_count_1", "critical_4", "speed_2", "demon_slayer_15"] },
    watcher_robe: { id: "watcher_robe", name: "遠見の星衣", type: "armor", armorType: "cloth", tier: 18, price: 42200, defense: 84, magicDefense: 168, magicAttack: 94, magicHealing: 124, hp: 420, evasionRate: .14, weight: 6, icon: "♜", craftOnly: true, salvage: { itemId: "watcher_lens", quantity: 3 }, skillIds: ["magic_defense_105", "magic_attack_105", "magic_healing_105", "evasion_4", "spirit_slayer_15"] },
    ashsea_crown: { id: "ashsea_crown", name: "灰海王の冠鎧", type: "armor", armorType: "heavy", tier: 18, price: 44800, defense: 226, magicDefense: 156, hp: 920, attack: 34, weight: 27, icon: "♜", unique: true, salvage: { itemId: "aftersea_heart", quantity: 5 }, specialEffects: [{ kind: "weight_defense", multiplier: 2.4, name: "灰海王装" }], effectDescription: "実重量1につき防御力が2.4上昇する。", skillIds: ["defense_105", "magic_defense_105", "hp_105", "defense_to_hp_2", "demon_slayer_15"] },
    distant_eye_bow: { id: "distant_eye_bow", name: "遠界眼の長弓", type: "weapon", weaponType: "bow", range: "ranged", tier: 19, price: 51200, attack: 236, attackCount: 3, hitRate: .38, criticalRate: .22, evasionRate: -.04, speed: 20, weight: 13, icon: "➳", unique: true, salvage: { itemId: "watcher_lens", quantity: 5 }, skillIds: ["physical_power_3", "accuracy_4", "attack_count_1", "critical_4", "celestial_slayer_15"] },
    boundary_plate: { id: "boundary_plate", name: "境界喰らいの重鎧", type: "armor", armorType: "heavy", tier: 19, price: 56800, defense: 274, magicDefense: 188, hp: 1180, weight: 30, icon: "♜", unique: true, salvage: { itemId: "boundary_fragment", quantity: 5 }, specialEffects: [{ kind: "weight_defense", multiplier: 2.6, name: "界壁装甲" }], effectDescription: "実重量1につき防御力が2.6上昇する。", skillIds: ["defense_105", "magic_defense_105", "hp_105", "defense_to_hp_2", "dragon_slayer_15"] }
  });

  Object.assign(data.monsters, {
    ashfin_raider: { id: "ashfin_raider", name: "灰鰭の略奪者", hp: 22600, attack: 1720, attackCount: 2, defense: 920, magicDefense: 810, speed: 118, icon: "⚔", element: "dark", actions: 3, targetRule: "rear_weighted" },
    cinder_jelly: { id: "cinder_jelly", name: "燼火クラゲ", hp: 20800, attack: 1210, magicAttack: 1690, defense: 770, magicDefense: 980, speed: 112, icon: "✦", damageType: "magic", element: "fire", actions: 3, statusAttack: { statusId: "burn", chance: .32, duration: 3 } },
    ashsea_leviathan: { id: "ashsea_leviathan", name: "灰海王リヴァイアサン", hp: 468000, attack: 1810, magicAttack: 1740, defense: 1160, magicDefense: 1110, speed: 108, icon: "♛", boss: true, actions: 8, element: "dark", targetRule: "rear_weighted", statusAttack: { statusId: "burn", chance: .38, duration: 3 }, elementModifiers: { dark: .05, ice: 1.45 }, statusResistances: { poison: 1, burn: 1, chill: .9, paralysis: .98 }, bossDrop: { itemId: "ashsea_crown", chance: .08 }, mechanic: { kind: "telegraphed_burst", name: "灰潮呑星", period: 4, multiplier: 2.45, exposedMultiplier: 1.8, description: "消えた星の灰を大波へ変え、次ターン終了時に全隊列を呑み込む。" } },
    glasswing_scout: { id: "glasswing_scout", name: "玻璃翼の斥候", hp: 23400, attack: 1790, defense: 860, magicDefense: 900, speed: 132, icon: "◇", element: "arcane", actions: 3, targetRule: "rear_weighted" },
    inverted_gale: { id: "inverted_gale", name: "逆巻く虚風", hp: 21800, attack: 1260, magicAttack: 1770, defense: 790, magicDefense: 1030, speed: 126, icon: "✧", damageType: "magic", element: "arcane", actions: 3, statusAttack: { statusId: "chill", chance: .34, duration: 2 } },
    mirrorstorm_sovereign: { id: "mirrorstorm_sovereign", name: "鏡嵐の主", hp: 492000, attack: 1730, magicAttack: 1840, defense: 1100, magicDefense: 1210, speed: 122, icon: "♛", boss: true, actions: 8, damageType: "magic", element: "arcane", elementModifiers: { arcane: .05, dark: 1.45 }, statusResistances: { chill: 1, paralysis: .98 } },
    skinroot_stalker: { id: "skinroot_stalker", name: "世界皮の根猟師", hp: 24800, attack: 1860, defense: 980, magicDefense: 900, speed: 116, icon: "♧", element: "dark", actions: 3 },
    dream_sporeling: { id: "dream_sporeling", name: "夢胞子", hp: 22600, attack: 1310, magicAttack: 1820, defense: 800, magicDefense: 1080, speed: 118, icon: "✦", damageType: "magic", element: "dark", actions: 3, statusAttack: { statusId: "poison", chance: .36, duration: 3 } },
    worldskin_gardener: { id: "worldskin_gardener", name: "世界皮の庭師", hp: 518000, attack: 1900, magicAttack: 1780, defense: 1260, magicDefense: 1140, speed: 106, icon: "♛", boss: true, actions: 8, element: "dark", statusResistances: { poison: 1, paralysis: .95 }, mechanic: { kind: "telegraphed_burst", name: "世界皮縫合", period: 5, multiplier: 2.5, exposedMultiplier: 1.8, description: "剥がれた世界の皮を縫い合わせ、次ターン終了時に全隊列を根で締め上げる。" } },
    silent_legionary: { id: "silent_legionary", name: "無響の軍団兵", hp: 26200, attack: 1940, defense: 1120, magicDefense: 940, speed: 108, icon: "♜", element: "arcane", actions: 3 },
    echo_wraith: { id: "echo_wraith", name: "残響亡霊", hp: 23200, attack: 1350, magicAttack: 1900, defense: 820, magicDefense: 1120, speed: 124, icon: "◇", damageType: "magic", element: "dark", actions: 3, targetRule: "rear_weighted" },
    nameless_bell: { id: "nameless_bell", name: "名を消す大鐘", hp: 548000, attack: 1840, magicAttack: 1950, defense: 1320, magicDefense: 1230, speed: 98, icon: "♛", boss: true, actions: 8, damageType: "magic", element: "arcane", statusAttack: { statusId: "paralysis", chance: .38, duration: 1 }, statusResistances: { paralysis: 1, chill: .98 }, mechanic: { kind: "telegraphed_burst", name: "無名の鐘音", period: 4, multiplier: 2.55, exposedMultiplier: 1.85, description: "あらゆる名を鐘へ集め、次ターン終了時に全隊列の存在を揺らす。" } },
    boundary_eye: { id: "boundary_eye", name: "境界の眼", hp: 24400, attack: 1400, magicAttack: 1970, defense: 860, magicDefense: 1180, speed: 134, icon: "◉", damageType: "magic", element: "arcane", actions: 3, targetRule: "rear_weighted" },
    horizon_scribe: { id: "horizon_scribe", name: "地平の記述者", hp: 27200, attack: 2020, defense: 1040, magicDefense: 1080, speed: 120, icon: "▤", element: "dark", actions: 3 },
    distant_observer: { id: "distant_observer", name: "遠界の観測者", hp: 592000, attack: 1960, magicAttack: 2070, defense: 1360, magicDefense: 1390, speed: 118, icon: "♛", boss: true, actions: 9, damageType: "magic", element: "arcane", targetRule: "rear_weighted", statusAttack: { statusId: "chill", chance: .4, duration: 2 }, elementModifiers: { arcane: .02, dark: 1.5 }, statusResistances: { poison: 1, burn: .98, chill: 1, paralysis: 1 }, bossDrop: { itemId: "distant_eye_bow", chance: .08 }, mechanic: { kind: "telegraphed_burst", name: "遠界測定", period: 4, multiplier: 2.6, exposedMultiplier: 1.85, description: "遠征隊の存在値を測り終え、次ターン終了時に全隊列を観測光で貫く。" } },
    reach_devourer: { id: "reach_devourer", name: "五界喰らい", hp: 724000, attack: 2240, magicAttack: 2160, defense: 1540, magicDefense: 1490, speed: 122, icon: "♛", boss: true, actions: 9, element: "dark", targetRule: "rear_weighted", elementModifiers: { dark: .02, fire: 1.5 }, statusResistances: { poison: 1, burn: 1, chill: .98, paralysis: 1 }, bossDrop: { itemId: "boundary_plate", chance: .1 }, mechanic: { kind: "telegraphed_burst", name: "五界圧壊", period: 4, multiplier: 2.75, exposedMultiplier: 1.9, description: "五つの領域境界を一つに重ね、次ターン終了時に全隊列を押し潰す。" } }
  });

  const drop = (itemId, chance, quantity = [1, 1]) => ({ itemId, chance, quantity });
  data.monsters.ashfin_raider.materialDrops = [drop("gray_tide_salt", .65, [1, 2])];
  data.monsters.cinder_jelly.materialDrops = [drop("ember_pearl", .6, [1, 2])];
  data.monsters.ashsea_leviathan.materialDrops = [drop("aftersea_heart", 1, [2, 4]), drop("ember_pearl", 1, [2, 4])];
  data.monsters.ashfin_raider.signatureDrops = { materials: [drop("gray_tide_salt", .08)], equipment: drop("ashwake_sabre", .03) };
  data.monsters.cinder_jelly.signatureDrops = { materials: [drop("ember_pearl", .08)], equipment: drop("cinderveil_cloak", .03) };
  data.monsters.ashsea_leviathan.signatureDrops = { materials: [drop("aftersea_heart", .12)], equipment: drop("graytide_aegis", .06) };
  const laterDrops = {
    glasswing_scout: ["void_glass", "ashwake_sabre"], inverted_gale: ["void_glass", "cinderveil_cloak"], mirrorstorm_sovereign: ["void_glass", "graytide_aegis"],
    skinroot_stalker: ["worldskin_moss", "ashwake_sabre"], dream_sporeling: ["worldskin_moss", "cinderveil_cloak"], worldskin_gardener: ["worldskin_moss", "graytide_aegis"],
    silent_legionary: ["silent_iron", "graytide_aegis"], echo_wraith: ["silent_iron", "cinderveil_cloak"], nameless_bell: ["silent_iron", "ashwake_sabre"],
    boundary_eye: ["watcher_lens", "cinderveil_cloak"], horizon_scribe: ["watcher_lens", "ashwake_sabre"], distant_observer: ["watcher_lens", "graytide_aegis"],
    reach_devourer: ["boundary_fragment", "graytide_aegis"]
  };
  Object.entries(laterDrops).forEach(([id, [materialId, equipmentId]]) => {
    const boss = Boolean(data.monsters[id].boss);
    data.monsters[id].materialDrops = [drop(materialId, boss ? 1 : .62, boss ? [2, 4] : [1, 2])];
    data.monsters[id].signatureDrops = { materials: [drop(materialId, boss ? .12 : .08)], equipment: drop(equipmentId, boss ? .06 : .03) };
  });

  Object.assign(data.monsterFamilies, {
    ashfin_raider: ["humanoid", "aquatic"],
    cinder_jelly: ["amorphous", "aquatic", "spirit"],
    ashsea_leviathan: ["dragon", "aquatic", "giant", "demon"],
    glasswing_scout: ["humanoid", "celestial"], inverted_gale: ["spirit", "celestial"], mirrorstorm_sovereign: ["spirit", "celestial", "giant"],
    skinroot_stalker: ["plant", "beast"], dream_sporeling: ["plant", "spirit"], worldskin_gardener: ["plant", "giant", "celestial"],
    silent_legionary: ["humanoid", "construct"], echo_wraith: ["undead", "spirit"], nameless_bell: ["construct", "giant", "spirit"],
    boundary_eye: ["amorphous", "celestial"], horizon_scribe: ["humanoid", "celestial"], distant_observer: ["celestial", "construct", "giant"],
    reach_devourer: ["dragon", "demon", "giant"]
  });

  data.dungeons.gray_ash_sea = {
    id: "gray_ash_sea", name: "灰の海", shortName: "灰の海", recommendedLevel: 110, duration: 4320, difficulty: 192000, color: "purple",
    chapterId: "afterstar_reaches_1", orderInChapter: 1, requiredForStory: true,
    unlockRequirements: [{ type: "dungeonClear", dungeonId: "afterstar_sanctum" }],
    description: "星後の神域から流れ着いた、星の灰が波打つ最初の異界。灰潮の底で巨大な心音が響く。",
    strategy: { label: "灰の海へ渡る", feature: "燃える灰潮と後列を狙う略奪者が同時に押し寄せる。", advice: "灰の波が赤く光る直前、海上の影は一斉に身を伏せるという。", preparation: [] },
    encounters: [
      { name: "灰波の海路", groups: [["ashfin_raider", "cinder_jelly", "ashfin_raider"], ["cinder_jelly", "cinder_jelly"]] },
      { name: "沈星海溝", groups: [["ashfin_raider", "ashsea_leviathan"]] }
    ],
    rewards: { gold: [352000, 419000], exp: [340000, 405000] },
    drops: [drop("gray_tide_salt", .5, [1, 3]), drop("ember_pearl", .42, [1, 2])],
    openingStoryId: "gray_ash_sea_opening", discoveryStoryId: "gray_ash_sea_discovery", clearStoryId: "gray_ash_sea_clear"
  };

  const reach = (id, name, shortName, level, duration, difficulty, order, previousId, description, feature, encounters, materialId, rewards, extra = {}) => ({
    id, name, shortName, recommendedLevel: level, duration, difficulty, color: "purple",
    chapterId: "afterstar_reaches_1", orderInChapter: order, requiredForStory: true,
    unlockRequirements: [{ type: "dungeonClear", dungeonId: previousId }], description,
    strategy: { label: `${shortName}へ進む`, feature, advice: "異界の住民が動きを止める瞬間には、必ず景色のどこかが先に歪む。", preparation: [] },
    encounters, rewards, drops: [drop(materialId, .48, [1, 3])],
    openingStoryId: `${id}_opening`, discoveryStoryId: `${id}_discovery`, clearStoryId: `${id}_clear`, ...extra
  });
  Object.assign(data.dungeons, {
    inverted_glass_canyon: reach("inverted_glass_canyon", "逆さ風の玻璃峡谷", "玻璃峡谷", 111, 4440, 202000, 2, "gray_ash_sea", "空へ落ちる玻璃の峡谷。上下を失った風が遠征隊を鏡嵐の中心へ運ぶ。", "後列を狙う玻璃翼と、行動を鈍らせる虚風が峡谷を巡る。", [
      { name: "落空の尾根", groups: [["glasswing_scout", "inverted_gale", "glasswing_scout"], ["inverted_gale", "inverted_gale"]] },
      { name: "鏡嵐眼", groups: [["glasswing_scout", "mirrorstorm_sovereign"]] }
    ], "void_glass", { gold: [372000, 443000], exp: [360000, 429000] }),
    worldskin_garden: reach("worldskin_garden", "世界皮の菌庭", "世界皮菌庭", 112, 4560, 213000, 3, "inverted_glass_canyon", "役目を終えた世界の表皮に、記憶を食べる巨大な菌庭が根を張る。", "毒を撒く胞子と硬い根が長期戦を狙い、庭師が世界皮を縫い直す。", [
      { name: "夢胞子の森", groups: [["skinroot_stalker", "dream_sporeling", "dream_sporeling"], ["skinroot_stalker", "skinroot_stalker"]] },
      { name: "世界皮温室", groups: [["dream_sporeling", "worldskin_gardener"]] }
    ], "worldskin_moss", { gold: [393000, 468000], exp: [381000, 454000] }),
    silent_iron_city: reach("silent_iron_city", "声なき鉄都", "無響鉄都", 113, 4680, 225000, 4, "worldskin_garden", "音と名前を炉へ捧げ、無響鉄を鋳続ける空のない都市。", "高い防御の軍団兵が前を塞ぎ、残響亡霊と大鐘が後列へ魔力を通す。", [
      { name: "無音鋳路", groups: [["silent_legionary", "echo_wraith", "silent_legionary"], ["echo_wraith", "echo_wraith"]] },
      { name: "名消し鐘楼", groups: [["silent_legionary", "nameless_bell"]] }
    ], "silent_iron", { gold: [415000, 494000], exp: [402000, 479000] }),
    distant_observatory: reach("distant_observatory", "遠界観測座", "遠界観測座", 115, 4860, 239000, 5, "silent_iron_city", "五領域の中心で、地上のギルドを星後から見つめ続ける巨大な観測施設。", "素早い眼が後列を測り、記述者が観測結果を物理攻撃として書き込む。", [
      { name: "地平記録廊", groups: [["boundary_eye", "horizon_scribe", "boundary_eye"], ["horizon_scribe", "horizon_scribe"]] },
      { name: "遠界測定室", groups: [["boundary_eye", "distant_observer"]] }
    ], "watcher_lens", { gold: [439000, 523000], exp: [425000, 506000] }),
    five_reaches_nest: reach("five_reaches_nest", "五界喰らいの巣", "五界喰らい", 120, 5280, 278000, 6, "distant_observatory", "五つの領域の境を食べ、ひとつの歪んだ世界へ育てようとする異形の巣。", "各領域の性質を取り込んだ巨体が、短い周期で全隊列を圧壊する。", [
      { name: "境界残滓", groups: [["glasswing_scout", "dream_sporeling", "echo_wraith"], ["boundary_eye", "silent_legionary"]] },
      { name: "五界胃袋", groups: [["reach_devourer", "horizon_scribe"]] }
    ], "boundary_fragment", { gold: [526000, 626000], exp: [509000, 606000] }, {
      requiredForStory: false,
      unlockRequirements: [{ type: "chapterCompleted", chapterId: "afterstar_reaches_1" }],
      clearStoryId: undefined,
      optionalStoryId: "five_reaches_nest_clear"
    })
  });

  data.recipes.push(
    { id: "forge_aftersea_staff", resultId: "aftersea_staff", gold: 16800, materials: { aftersea_heart: 6, ember_pearl: 8, gray_tide_salt: 10 }, unlockAfter: "afterstar_reaches_1" },
    { id: "forge_horizon_rapier", resultId: "horizon_rapier", gold: 18200, materials: { void_glass: 8, silent_iron: 6, watcher_lens: 3 }, unlockAfter: "afterstar_reaches_1" },
    { id: "forge_watcher_robe", resultId: "watcher_robe", gold: 18600, materials: { watcher_lens: 8, worldskin_moss: 6, boundary_fragment: 2 }, unlockAfter: "afterstar_reaches_1" }
  );

  Object.assign(data.storyScenes, {
    afterstar_reaches_1_opening: { id: "afterstar_reaches_1_opening", name: "五つの座標", text: "異形神の残した座標の一つが、宿の古地図に灰色の海を描いた。空の主の循環から外れた世界へ、ギルドは初めて自らの意志で遠征隊を送る。" },
    gray_ash_sea_opening: { id: "gray_ash_sea_opening", name: "灰色の渡航路", text: "星後の神域に生まれた裂け目を越えると、海も空も灰で満ちていた。遠くの波間で、山ほどの影がゆっくりと向きを変える。" },
    gray_ash_sea_discovery: { id: "gray_ash_sea_discovery", name: "燃える潮目", text: "灰の海は死んでいない。沈んだ星の熱を食べる生き物たちが、燼火の潮目を渡って別の領域へ移動している。" },
    gray_ash_sea_clear: { id: "gray_ash_sea_clear", name: "最初の領域標", text: "灰海王が沈むと、海底から次の座標を刻んだ領域標が浮上した。風景を上下逆さに映す、玻璃の峡谷へ道が繋がる。" },
    inverted_glass_canyon_opening: { id: "inverted_glass_canyon_opening", name: "空へ落ちる谷", text: "領域標を越えた船は、空へ向かって落ち始めた。砕けた大地の間を、鏡のような風が逆巻いている。" },
    inverted_glass_canyon_discovery: { id: "inverted_glass_canyon_discovery", name: "映された別の遠征隊", text: "玻璃の壁には、まだ訪れていない土地を歩く遠征隊の姿が映る。観測者は未来ではなく、無数の可能性を並べているらしい。" },
    inverted_glass_canyon_clear: { id: "inverted_glass_canyon_clear", name: "鏡嵐の外側", text: "鏡嵐が消えると、世界の表皮から菌糸が伸びる緑の庭が現れた。根は遠征隊の記憶へ向かっている。" },
    worldskin_garden_opening: { id: "worldskin_garden_opening", name: "世界の傷に咲くもの", text: "終わった世界の表皮を苗床に、巨大な菌庭が広がっている。胞子に触れた者は、忘れていた夢を口にした。" },
    worldskin_garden_discovery: { id: "worldskin_garden_discovery", name: "育てられる世界", text: "庭師は新しい世界を作っているのではない。観測に適した形へ古い世界を縫い直し、同じ出来事を何度も育てている。" },
    worldskin_garden_clear: { id: "worldskin_garden_clear", name: "菌糸の記録路", text: "庭師の根を辿ると、音を吸う黒い鉄道へ続いた。線路の先には、誰にも呼ばれなくなった都市がある。" },
    silent_iron_city_opening: { id: "silent_iron_city_opening", name: "音を捧げる都", text: "鉄都では槌も鐘も鳴らない。住民は自分の名を炉へ投げ、観測者へ届かない無響鉄を作り続けている。" },
    silent_iron_city_discovery: { id: "silent_iron_city_discovery", name: "消えた名の行方", text: "炉へ捧げられた名は消えていなかった。大鐘に蓄えられ、観測座が世界を識別するための番号へ変えられている。" },
    silent_iron_city_clear: { id: "silent_iron_city_clear", name: "鐘の中の座標", text: "大鐘の内側に、すべての観測線が集まる座標が刻まれていた。五領域の中心、遠界観測座への扉が開く。" },
    distant_observatory_opening: { id: "distant_observatory_opening", name: "見られていた旅", text: "観測座の壁一面に、名もなき宿から今日までの冒険が映っている。偶然だと思っていた出会いまで、誰かが記録していた。" },
    distant_observatory_discovery: { id: "distant_observatory_discovery", name: "選ばれなかった結末", text: "観測者は運命を操ってはいない。無数の遠征を眺め、最も遠くへ届いた一行が次の扉を開くのを待っていた。" },
    distant_observatory_clear: { id: "distant_observatory_clear", name: "観測を終える者", text: "遠界の観測者が沈黙すると、記録の中の冒険者たちも歩みを止めた。残された地図には、まだ四つの星後領域と、それらを呑み込む空白が描かれている。" },
    five_reaches_nest_opening: { id: "five_reaches_nest_opening", name: "繋がりすぎた境界", text: "観測座の地下で、五つの領域が肉のように癒着している。境界を食べる何かが、遠い世界を一つの巣へ変え始めた。" },
    five_reaches_nest_discovery: { id: "five_reaches_nest_discovery", name: "空白の幼体", text: "五界喰らいは侵略者ではなく、地図に描かれた空白から生まれた幼体だった。観測される世界が増えるほど、その胃袋も広がる。" },
    five_reaches_nest_clear: { id: "five_reaches_nest_clear", name: "五界を分かつ楔", text: "巣を断つと五領域は再び離れ、境界片が楔となって残った。その表面には、次の領域へ渡った何者かの手形が焼き付いている。" }
  });

  data.storyChapters.push({
    id: "afterstar_reaches_1", order: 16, number: 16, kind: "postgame", title: "星後領域 I：五界の標", recommendedLevelRange: [108, 115],
    openingStoryId: "afterstar_reaches_1_opening", clearStoryId: "distant_observatory_clear",
    objective: "五つの異界を踏破し、遠界観測座に残された星後の地図を確保する",
    entryRequirements: [{ type: "dungeonClear", dungeonId: "afterstar_sanctum" }],
    unlockText: "五界喰らいの巣、星後海の導杖・界渡りの細剣・遠見の星衣のレシピ、15,000G、遠見眼晶×2",
    rewards: { gold: 15000, materials: { watcher_lens: 2, guild_seal: 5 } }
  });
})();
