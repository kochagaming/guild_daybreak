(function () {
  "use strict";

  const data = window.GameData = window.GameData || {};
  // 同じ重量なら高Tier装備ほど強くなるための共通基準。
  // 装備種ごとに直前Tierの実効値を引き継ぎ、Tierが1上がるごとに役割性能/重量を4%以上高める。
  const equipmentBalance = Object.freeze({
    efficiencyGrowthPerTier: .04,
    maximumAutomaticAdjustment: 2.5,
    // Tier 1商店品から算出した固定値。読み込み順や追加コンテンツに左右されない基準にする。
    referenceEfficiency: Object.freeze({
      rapier: 3, sword: 2, katana: 7 / 3, bow: 2, staff: 2.4,
      cloth: 8, leather: 2.3, heavy: 23 / 16, shield: 3.3, gauntlet: 3
    }),
    scoreWeights: Object.freeze({
      rapier: Object.freeze({ attack: 1 }),
      sword: Object.freeze({ attack: 1, defense: .4, hp: .05 }),
      katana: Object.freeze({ attack: 1 }),
      bow: Object.freeze({ attack: 1 }),
      staff: Object.freeze({ magicAttack: 1, magicHealing: .5, hp: .05 }),
      cloth: Object.freeze({ defense: 1, magicDefense: 1, magicHealing: .5, hp: .15 }),
      leather: Object.freeze({ defense: 1, magicDefense: 1, hp: .15 }),
      heavy: Object.freeze({ defense: 1, magicDefense: 1, hp: .15 }),
      shield: Object.freeze({ defense: 1, magicDefense: 1, hp: .15 }),
      gauntlet: Object.freeze({ attack: .5, defense: 1, magicDefense: .5 })
    })
  });
  data.registry.config("equipmentBalance", equipmentBalance);
  const items = {
    wooden_sword: { id: "wooden_sword", name: "木の剣", type: "weapon", weaponType: "sword", range: "melee", tier: 1, price: 80, attack: 4, hitRate: .02, defense: 0, hp: 0, weight: 2, salvage: { itemId: "craft_material", quantity: 1 }, icon: "⚔" },
    iron_sword: { id: "iron_sword", name: "鉄の剣", type: "weapon", weaponType: "sword", range: "melee", tier: 2, price: 220, attack: 9, hitRate: .03, defense: 0, hp: 0, weight: 5, salvage: { itemId: "iron_ore", quantity: 2 }, icon: "⚔" },
    steel_sword: { id: "steel_sword", name: "鋼の剣", type: "weapon", weaponType: "sword", range: "melee", tier: 3, price: 520, attack: 16, hitRate: .04, defense: 0, hp: 0, weight: 8, salvage: { itemId: "iron_ore", quantity: 4 }, icon: "⚔" },
    short_bow: { id: "short_bow", name: "短弓", type: "weapon", weaponType: "bow", range: "ranged", tier: 1, price: 100, attack: 4, attackCount: 1, hitRate: .05, defense: 0, hp: 0, weight: 2, salvage: { itemId: "craft_material", quantity: 1 }, icon: "➳" },
    hunter_bow: { id: "hunter_bow", name: "狩人の弓", type: "weapon", weaponType: "bow", range: "ranged", tier: 2, price: 260, attack: 9, attackCount: 1, hitRate: .07, defense: 0, hp: 0, weight: 4, salvage: { itemId: "craft_material", quantity: 2 }, icon: "➳" },
    arcane_staff: { id: "arcane_staff", name: "魔導杖", type: "weapon", weaponType: "staff", range: "ranged", tier: 3, price: 540, attack: 2, magicAttack: 16, magicHealing: 13, hitRate: .04, defense: 0, hp: 0, weight: 6, salvage: { itemId: "iron_ore", quantity: 3 }, icon: "⚕" },
    cloth_clothes: { id: "cloth_clothes", name: "布の服", type: "armor", armorType: "cloth", tier: 1, price: 60, attack: 0, defense: 3, hp: 0, weight: 1, salvage: { itemId: "craft_material", quantity: 1 }, icon: "♜" },
    leather_armor: { id: "leather_armor", name: "革の鎧", type: "armor", armorType: "leather", tier: 2, price: 190, attack: 0, defense: 7, hp: 0, weight: 4, salvage: { itemId: "craft_material", quantity: 2 }, icon: "♜" },
    iron_armor: { id: "iron_armor", name: "鉄の鎧", type: "armor", armorType: "heavy", tier: 3, price: 480, attack: 0, defense: 13, hp: 0, weight: 7, salvage: { itemId: "iron_ore", quantity: 4 }, icon: "♜" },
    craft_material: { id: "craft_material", name: "加工材", type: "material", price: 0, attack: 0, defense: 0, hp: 0, weight: 0, icon: "◇" },
    iron_ore: { id: "iron_ore", name: "鉄鉱石", type: "material", price: 0, attack: 0, defense: 0, icon: "◆" },
    magic_stone: { id: "magic_stone", name: "魔石", type: "material", price: 0, attack: 0, defense: 0, hp: 0, weight: 0, icon: "✦" },
    guild_seal: { id: "guild_seal", name: "ギルド印章", type: "material", price: 0, attack: 0, defense: 0, hp: 0, weight: 0, icon: "◆" }
  };
  Object.assign(items, {
    bronze_rapier: { id: "bronze_rapier", name: "青銅の細剣", type: "weapon", weaponType: "rapier", range: "melee", tier: 1, price: 110, attack: 3, attackCount: 1, hitRate: .08, speed: 1, defense: 0, hp: 0, weight: 1, icon: "†", salvage: { itemId: "craft_material", quantity: 1 } },
    silver_rapier: { id: "silver_rapier", name: "銀の細剣", type: "weapon", weaponType: "rapier", range: "melee", tier: 2, price: 280, attack: 7, attackCount: 1, hitRate: .1, speed: 2, defense: 0, hp: 0, weight: 3, icon: "†", craftOnly: true, salvage: { itemId: "iron_ore", quantity: 2 } },
    moon_rapier: { id: "moon_rapier", name: "月光の細剣", type: "weapon", weaponType: "rapier", range: "melee", tier: 3, price: 620, attack: 12, magicAttack: 5, attackCount: 2, hitRate: .12, speed: 2, defense: 0, hp: 0, weight: 5, icon: "†", craftOnly: true, salvage: { itemId: "magic_stone", quantity: 1 } },
    iron_katana: { id: "iron_katana", name: "鉄刀", type: "weapon", weaponType: "katana", range: "melee", tier: 1, price: 130, attack: 7, attackCount: -1, hitRate: .01, defense: 0, hp: 0, weight: 3, icon: "⌁", salvage: { itemId: "iron_ore", quantity: 1 } },
    steel_katana: { id: "steel_katana", name: "鋼刀", type: "weapon", weaponType: "katana", range: "melee", tier: 2, price: 340, attack: 16, attackCount: -1, hitRate: .02, defense: 0, hp: 0, weight: 6, icon: "⌁", craftOnly: true, salvage: { itemId: "iron_ore", quantity: 3 } },
    dragon_nodachi: { id: "dragon_nodachi", name: "竜断ちの大太刀", type: "weapon", weaponType: "katana", range: "melee", tier: 3, price: 760, attack: 28, attackCount: -1, hitRate: 0, defense: 0, hp: 0, weight: 10, icon: "⌁", craftOnly: true, salvage: { itemId: "iron_ore", quantity: 5 } },
    wooden_shield: { id: "wooden_shield", name: "木の盾", type: "armor", armorType: "shield", tier: 1, price: 90, attack: 0, defense: 4, magicDefense: 2, hp: 4, weight: 2, icon: "⬟", salvage: { itemId: "craft_material", quantity: 1 } },
    iron_shield: { id: "iron_shield", name: "鉄の盾", type: "armor", armorType: "shield", tier: 2, price: 250, attack: 0, defense: 9, magicDefense: 3, hp: 8, weight: 5, icon: "⬟", craftOnly: true, salvage: { itemId: "iron_ore", quantity: 3 } },
    tower_shield: { id: "tower_shield", name: "城塞の大盾", type: "armor", armorType: "shield", tier: 3, price: 590, attack: 0, defense: 16, magicDefense: 5, hp: 16, weight: 9, icon: "⬟", craftOnly: true, salvage: { itemId: "iron_ore", quantity: 5 } },
    leather_gloves: { id: "leather_gloves", name: "革の手袋", type: "armor", armorType: "gauntlet", tier: 1, price: 85, attack: 1, defense: 2, hitRate: .03, speed: 1, hp: 0, weight: 1, icon: "✥", salvage: { itemId: "craft_material", quantity: 1 } },
    iron_gauntlets: { id: "iron_gauntlets", name: "鉄の小手", type: "armor", armorType: "gauntlet", tier: 2, price: 230, attack: 3, defense: 4, hitRate: .04, speed: 1, hp: 0, weight: 2, icon: "✥", craftOnly: true, salvage: { itemId: "iron_ore", quantity: 2 } },
    rune_gauntlets: { id: "rune_gauntlets", name: "ルーンの小手", type: "armor", armorType: "gauntlet", tier: 3, price: 560, attack: 4, defense: 5, magicDefense: 4, hitRate: .05, speed: 2, hp: 0, weight: 3, icon: "✥", craftOnly: true, salvage: { itemId: "magic_stone", quantity: 1 } },
    star_shard: { id: "star_shard", name: "星屑の欠片", type: "material", price: 0, icon: "✦" },
    starsteel_sword: { id: "starsteel_sword", name: "星鋼の剣", type: "weapon", weaponType: "sword", range: "melee", tier: 4, price: 1100, attack: 25, hitRate: .05, defense: 2, hp: 0, weight: 9, icon: "⚔", craftOnly: true, salvage: { itemId: "star_shard", quantity: 2 } },
    starwoven_robe: { id: "starwoven_robe", name: "星織りの法衣", type: "armor", armorType: "cloth", tier: 4, price: 1050, attack: 0, defense: 15, hp: 20, weight: 3, icon: "♜", craftOnly: true, salvage: { itemId: "star_shard", quantity: 2 } },
    tempest_bow: { id: "tempest_bow", name: "翼王の雷弓", type: "weapon", weaponType: "bow", range: "ranged", tier: 4, price: 1800, attack: 23, attackCount: 1, hitRate: .1, defense: 0, hp: 10, weight: 5, icon: "➳", unique: true, salvage: { itemId: "star_shard", quantity: 3 }, specialEffects: [{ kind: "critical_followup", multiplier: .5, name: "雷の追撃" }], effectDescription: "会心時、攻撃力50%の雷の追撃を1行動につき1回。追撃は会心せず、倒した場合は別の敵へ。" },
    slime_gel: { id: "slime_gel", name: "粘液", type: "material", price: 0, icon: "◇" },
    sticky_fluid: { id: "sticky_fluid", name: "ねばねばした液体", type: "material", price: 0, icon: "◉" },
    tattered_cloth: { id: "tattered_cloth", name: "ぼろぼろの布切れ", type: "material", price: 0, icon: "▧" },
    slimecloth_mantle: { id: "slimecloth_mantle", name: "粘液染みの外套", type: "armor", armorType: "cloth", tier: 1, price: 95, attack: 0, defense: 2, magicDefense: 3, hp: 6, evasionRate: .01, weight: 1, icon: "♜", dropOnly: true, salvage: { itemId: "sticky_fluid", quantity: 1 } },
    abyss_slime_core: { id: "abyss_slime_core", name: "魔境の粘核", type: "material", price: 0, icon: "◉" },
    divine_slime_core: { id: "divine_slime_core", name: "神域の虹粘核", type: "material", price: 0, icon: "✦" },
    abyss_slime_mantle: { id: "abyss_slime_mantle", name: "魔境粘液の外套", type: "armor", armorType: "cloth", tier: 2, price: 360, attack: 0, defense: 6, magicDefense: 9, hp: 18, evasionRate: .02, weight: 2, icon: "♜", dropOnly: true, salvage: { itemId: "abyss_slime_core", quantity: 1 } },
    divine_slime_mantle: { id: "divine_slime_mantle", name: "神域流動の法衣", type: "armor", armorType: "cloth", tier: 3, price: 980, attack: 0, defense: 12, magicDefense: 18, magicHealing: 5, hp: 36, evasionRate: .04, weight: 2, icon: "♜", dropOnly: true, salvage: { itemId: "divine_slime_core", quantity: 1 } },
    beast_hide: { id: "beast_hide", name: "獣の皮", type: "material", price: 0, icon: "◇" },
    beast_fang: { id: "beast_fang", name: "獣の牙", type: "material", price: 0, icon: "◆" },
    arcane_dust: { id: "arcane_dust", name: "魔力の粉", type: "material", price: 0, icon: "✦" },
    fang_blade: { id: "fang_blade", name: "獣牙の剣", type: "weapon", weaponType: "sword", range: "melee", tier: 2, price: 320, attack: 11, hitRate: .04, defense: 0, hp: 0, weight: 4, icon: "⚔", craftOnly: true, salvage: { itemId: "beast_fang", quantity: 1 } },
    hide_robe: { id: "hide_robe", name: "獣皮の軽鎧", type: "armor", armorType: "leather", tier: 2, price: 280, attack: 0, defense: 5, hp: 12, weight: 2, icon: "♜", craftOnly: true, salvage: { itemId: "beast_hide", quantity: 1 } },
    spirit_staff: { id: "spirit_staff", name: "霊紋の杖", type: "weapon", weaponType: "staff", range: "ranged", tier: 3, price: 650, attack: 3, magicAttack: 18, magicHealing: 14, hitRate: .05, defense: 0, hp: 4, weight: 4, icon: "⚕", craftOnly: true, salvage: { itemId: "arcane_dust", quantity: 1 } },
    wolf_fang_bow: { id: "wolf_fang_bow", name: "群狼の牙弓", type: "weapon", weaponType: "bow", range: "ranged", tier: 2, price: 500, attack: 8, attackCount: 1, hitRate: .08, defense: 0, hp: 0, weight: 3, icon: "➳", unique: true, salvage: { itemId: "craft_material", quantity: 3 }, specialEffects: [{ kind: "critical_followup", multiplier: .5 }], effectDescription: "会心時、攻撃力50%の追撃を1行動につき1回。追撃は会心せず、倒した場合は別の敵へ。" },
    golem_plate: { id: "golem_plate", name: "坑道王の重鎧", type: "armor", armorType: "heavy", tier: 3, price: 1000, attack: 0, defense: 9, hp: 10, weight: 8, icon: "♜", unique: true, salvage: { itemId: "iron_ore", quantity: 5 }, specialEffects: [{ kind: "weight_defense", multiplier: 1 }], effectDescription: "この鎧の実重量1につき防御+1（端数切り捨て）。品質の重量補正を反映し、その後に防具適性を適用。" },
    sentinel_staff: { id: "sentinel_staff", name: "星守りの祈杖", type: "weapon", weaponType: "staff", range: "ranged", tier: 3, price: 1200, attack: 2, magicAttack: 15, magicHealing: 12, hitRate: .06, defense: 0, hp: 8, weight: 5, icon: "⚕", unique: true, salvage: { itemId: "magic_stone", quantity: 1 }, specialEffects: [{ kind: "healing_boost", multiplier: 1.35 }], effectDescription: "単体・全体回復スキルの回復量1.35倍。種族・職業・生まれの補正と乗算。小休止には効果なし。" },

    wind_grass: { id: "wind_grass", name: "風切草", type: "material", price: 0, icon: "❧" },
    beast_sinew: { id: "beast_sinew", name: "丈夫な獣腱", type: "material", price: 0, icon: "⌁" },
    glow_crystal: { id: "glow_crystal", name: "燐光晶", type: "material", price: 0, icon: "◇" },
    spider_silk: { id: "spider_silk", name: "岩蜘蛛の糸", type: "material", price: 0, icon: "⌘" },
    ancient_fragment: { id: "ancient_fragment", name: "古代装具の欠片", type: "material", price: 0, icon: "▧" },
    soul_ash: { id: "soul_ash", name: "霊灰", type: "material", price: 0, icon: "◌" },
    storm_feather: { id: "storm_feather", name: "雷羽", type: "material", price: 0, icon: "ϟ" },
    starsteel_ore: { id: "starsteel_ore", name: "星鋼鉱", type: "material", price: 0, icon: "✧" },

    greenwood_staff: { id: "greenwood_staff", name: "若木の祈杖", type: "weapon", weaponType: "staff", range: "ranged", tier: 1, price: 115, attack: 1, magicAttack: 6, magicHealing: 6, hitRate: .03, defense: 0, hp: 3, weight: 2, icon: "⚕", craftOnly: true, salvage: { itemId: "wind_grass", quantity: 1 } },
    windrunner_vest: { id: "windrunner_vest", name: "風走りの胴着", type: "armor", armorType: "leather", tier: 1, price: 105, attack: 0, defense: 3, magicDefense: 1, hp: 5, speed: 2, evasionRate: .02, weight: 1, icon: "♜", craftOnly: true, salvage: { itemId: "beast_sinew", quantity: 1 } },
    hornstring_bow: { id: "hornstring_bow", name: "角弦の弓", type: "weapon", weaponType: "bow", range: "ranged", tier: 1, price: 125, attack: 5, attackCount: 1, hitRate: .06, speed: 1, defense: 0, hp: 0, weight: 2, icon: "➳", craftOnly: true, salvage: { itemId: "beast_sinew", quantity: 1 } },

    glowsteel_sword: { id: "glowsteel_sword", name: "燐鋼の剣", type: "weapon", weaponType: "sword", range: "melee", tier: 2, price: 350, attack: 11, magicAttack: 3, hitRate: .04, defense: 0, hp: 0, weight: 5, icon: "⚔", craftOnly: true, salvage: { itemId: "glow_crystal", quantity: 1 } },
    silkweave_robe: { id: "silkweave_robe", name: "岩絹の法衣", type: "armor", armorType: "cloth", tier: 2, price: 330, attack: 0, defense: 5, magicDefense: 7, hp: 7, speed: 1, evasionRate: .02, weight: 1, icon: "♜", craftOnly: true, salvage: { itemId: "spider_silk", quantity: 1 } },
    delver_shield: { id: "delver_shield", name: "坑道守りの盾", type: "armor", armorType: "shield", tier: 2, price: 345, attack: 0, defense: 10, magicDefense: 4, hp: 10, weight: 5, icon: "⬟", craftOnly: true, salvage: { itemId: "glow_crystal", quantity: 1 } },

    relic_rapier: { id: "relic_rapier", name: "遺宝の細剣", type: "weapon", weaponType: "rapier", range: "melee", tier: 3, price: 690, attack: 11, magicAttack: 6, attackCount: 2, hitRate: .11, speed: 3, defense: 0, hp: 0, weight: 4, icon: "†", craftOnly: true, salvage: { itemId: "ancient_fragment", quantity: 1 } },
    soul_veil: { id: "soul_veil", name: "霊灰の帳", type: "armor", armorType: "cloth", tier: 3, price: 680, attack: 0, defense: 8, magicDefense: 12, magicHealing: 4, hp: 14, weight: 2, icon: "♜", craftOnly: true, salvage: { itemId: "soul_ash", quantity: 1 } },
    grave_gauntlets: { id: "grave_gauntlets", name: "古兵の篭手", type: "armor", armorType: "gauntlet", tier: 3, price: 660, attack: 5, defense: 6, magicDefense: 3, hitRate: .05, speed: 1, hp: 0, weight: 3, icon: "✥", craftOnly: true, salvage: { itemId: "ancient_fragment", quantity: 1 } },

    comet_staff: { id: "comet_staff", name: "彗星の導杖", type: "weapon", weaponType: "staff", range: "ranged", tier: 4, price: 1180, attack: 2, magicAttack: 25, magicHealing: 20, hitRate: .06, defense: 0, hp: 8, weight: 5, icon: "⚕", craftOnly: true, salvage: { itemId: "starsteel_ore", quantity: 1 } },
    stormcloak: { id: "stormcloak", name: "雷羽の外套", type: "armor", armorType: "leather", tier: 4, price: 1160, attack: 0, defense: 12, magicDefense: 13, hp: 18, speed: 4, evasionRate: .04, weight: 3, icon: "♜", craftOnly: true, salvage: { itemId: "storm_feather", quantity: 1 } },
    astral_katana: { id: "astral_katana", name: "星断ちの太刀", type: "weapon", weaponType: "katana", range: "melee", tier: 4, price: 1240, attack: 33, magicAttack: 5, attackCount: -1, hitRate: .03, defense: 2, hp: 0, weight: 10, icon: "⌁", craftOnly: true, salvage: { itemId: "starsteel_ore", quantity: 2 } }
  });
  window.GameData.registry.entities("items", items);
})();
