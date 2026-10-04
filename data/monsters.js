(function () {
  "use strict";

  window.GameData = window.GameData || {};
  const monsters = {
    slime: { id: "slime", name: "スライム", hp: 18, attack: 4, defense: 1, icon: "●", elementModifiers: { fire: 1.25, ice: .75 }, statusResistances: { poison: .5 } },
    horn_rabbit: { id: "horn_rabbit", name: "ツノウサギ", hp: 24, attack: 8, attackCount: 2, defense: 2, icon: "♘" },
    grass_wolf: { id: "grass_wolf", name: "草原オオカミ", hp: 34, attack: 10, attackCount: 2, defense: 3, icon: "◆" },
    alpha_wolf: { id: "alpha_wolf", name: "群れのボス", hp: 66, attack: 14, defense: 4, icon: "♛", boss: true, bossDrop: { itemId: "wolf_fang_bow", chance: .12 } },
    cave_bat: { id: "cave_bat", name: "洞窟コウモリ", hp: 48, attack: 16, attackCount: 2, defense: 4, icon: "⌁" },
    goblin: { id: "goblin", name: "ゴブリン", hp: 62, attack: 18, defense: 7, icon: "♟" },
    cave_spider: { id: "cave_spider", name: "岩グモ", hp: 70, attack: 19, defense: 18, icon: "✣", elementModifiers: { fire: 1.25, nature: .75 }, statusAttack: { statusId: "poison", chance: .35, duration: 3, potency: .04 }, magicVulnerability: 1.25, traitDescription: "硬い装甲・魔法攻撃の被ダメージ1.25倍。防御無視も有効。" },
    stone_golem: { id: "stone_golem", name: "坑道ゴーレム", hp: 165, attack: 25, defense: 26, icon: "▦", boss: true, actions: 2, elementModifiers: { lightning: 1.2, fire: .8 }, statusResistances: { poison: 1, paralysis: .5 }, bossDrop: { itemId: "golem_plate", chance: .1 }, magicVulnerability: 1.25, traitDescription: "硬い装甲・魔法攻撃の被ダメージ1.25倍。防御無視も有効。" },
    skeleton: { id: "skeleton", name: "古代兵の骸", hp: 110, attack: 22, defense: 10, icon: "☠" },
    wraith: { id: "wraith", name: "遺跡の亡霊", hp: 120, attack: 24, defense: 10, icon: "◉", damageType: "magic", element: "dark", elementModifiers: { dark: .65, fire: 1.15 }, statusResistances: { poison: 1 }, statusAttack: { statusId: "paralysis", chance: .25, duration: 1 }, targetRule: "rear", traitDescription: "最後尾の生存者を狙う。最後尾が倒れると次に後ろの仲間へ移る。" },
    rune_guardian: { id: "rune_guardian", name: "魔導守護者", hp: 160, attack: 26, defense: 13, icon: "✧", damageType: "magic", element: "arcane", elementModifiers: { arcane: .7, lightning: 1.2 }, statusResistances: { paralysis: .35 } },
    ancient_sentinel: { id: "ancient_sentinel", name: "星喰らいの番人", hp: 410, attack: 34, defense: 17, icon: "♜", boss: true, actions: 2, element: "arcane", elementModifiers: { arcane: .7, lightning: 1.2 }, statusResistances: { poison: .6, paralysis: .5 }, bossDrop: { itemId: "sentinel_staff", chance: .08 } }
  };
  const materials = {
    star_harrier: [["star_shard", .55, 1, 2], ["beast_fang", .4, 1, 2], ["storm_feather", .55, 1, 2]],
    sky_knight: [["star_shard", .65, 1, 2], ["iron_ore", .6, 2, 3], ["starsteel_ore", .5, 1, 2]],
    storm_regent: [["star_shard", 1, 2, 4], ["magic_stone", .8, 1, 2], ["storm_feather", 1, 2, 4], ["starsteel_ore", .8, 1, 3]],
    slime: [["slime_gel", .6, 1, 2], ["wind_grass", .35, 1, 1]],
    horn_rabbit: [["beast_hide", .55, 1, 1], ["wind_grass", .5, 1, 2], ["beast_sinew", .35, 1, 1]],
    grass_wolf: [["beast_fang", .55, 1, 2], ["beast_hide", .35, 1, 1], ["beast_sinew", .45, 1, 2]],
    alpha_wolf: [["beast_fang", .85, 1, 3], ["beast_hide", .6, 1, 2], ["beast_sinew", .7, 1, 2]],
    cave_bat: [["beast_hide", .4, 1, 1], ["iron_ore", .35, 1, 1], ["glow_crystal", .45, 1, 1]],
    goblin: [["iron_ore", .6, 1, 2], ["beast_fang", .25, 1, 1], ["glow_crystal", .3, 1, 1]],
    cave_spider: [["slime_gel", .5, 1, 2], ["iron_ore", .5, 1, 2], ["spider_silk", .7, 1, 2]],
    stone_golem: [["iron_ore", .85, 2, 4], ["glow_crystal", .75, 1, 3]],
    skeleton: [["iron_ore", .5, 1, 2], ["arcane_dust", .3, 1, 1], ["ancient_fragment", .55, 1, 2]],
    wraith: [["arcane_dust", .65, 1, 2], ["magic_stone", .2, 1, 1], ["soul_ash", .65, 1, 2]],
    rune_guardian: [["magic_stone", .45, 1, 1], ["arcane_dust", .5, 1, 2], ["ancient_fragment", .55, 1, 2], ["soul_ash", .3, 1, 1]],
    ancient_sentinel: [["magic_stone", .8, 1, 2], ["arcane_dust", .85, 2, 3], ["ancient_fragment", 1, 2, 4], ["soul_ash", .8, 1, 3]]
  };
  Object.assign(monsters, {
    star_harrier: { id: "star_harrier", name: "雷羽の狩鳥", hp: 155, attack: 31, attackCount: 3, defense: 12, speed: 20, icon: "◆", element: "lightning", elementModifiers: { lightning: .65, ice: 1.25 }, statusAttack: { statusId: "paralysis", chance: .2, duration: 1 } },
    sky_knight: { id: "sky_knight", name: "星鎧の騎士", hp: 225, attack: 35, defense: 20, speed: 15, icon: "♟", element: "lightning", elementModifiers: { lightning: .75, ice: 1.15 }, statusResistances: { paralysis: .3 } },
    storm_regent: { id: "storm_regent", name: "嵐を纏う翼王", hp: 900, attack: 58, defense: 19, speed: 19, icon: "♛", boss: true, actions: 2, bossDrop: { itemId: "tempest_bow", chance: .08 }, element: "lightning", elementModifiers: { lightning: .5, ice: 1.3 }, statusResistances: { poison: .5, paralysis: .7 }, mechanic: { kind: "telegraphed_burst", name: "天雷崩落", period: 4, multiplier: 1.6, exposedMultiplier: 1.5, description: "雷を溜めた次ターンの終了時に全体大技。防御スキルで半減でき、大技の次ターンは行動せず被ダメージ1.5倍。通常ターンは2回攻撃。" } }
  });
  window.GameData.registry.relations("monsterMaterialDrops", Object.fromEntries(Object.entries(materials).map(([id, entries]) => [id,
    entries.map(([itemId, chance, minimum, maximum]) => ({ itemId, chance, quantity: [minimum, maximum] }))
  ])));
  window.GameData.registry.entities("monsters", monsters);
})();
