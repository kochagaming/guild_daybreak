(function () {
  "use strict";

  window.GameData = window.GameData || {};
  window.GameData.recipes = [
    { id: "forge_moon_rapier", resultId: "moon_rapier", gold: 340, materials: { iron_ore: 4, magic_stone: 2 }, unlockAfter: "seal" },
    { id: "forge_dragon_nodachi", resultId: "dragon_nodachi", gold: 420, materials: { iron_ore: 7, beast_fang: 3, magic_stone: 1 }, unlockAfter: "seal" },
    { id: "forge_tower_shield", resultId: "tower_shield", gold: 360, materials: { iron_ore: 8, magic_stone: 1 }, unlockAfter: "seal" },
    { id: "forge_rune_gauntlets", resultId: "rune_gauntlets", gold: 320, materials: { iron_ore: 3, arcane_dust: 3, magic_stone: 1 }, unlockAfter: "seal" },
    { id: "forge_silver_rapier", resultId: "silver_rapier", gold: 110, materials: { iron_ore: 2, craft_material: 2 }, unlockAfter: "roadside" },
    { id: "forge_steel_katana", resultId: "steel_katana", gold: 150, materials: { iron_ore: 4, beast_fang: 1 }, unlockAfter: "roadside" },
    { id: "forge_iron_shield", resultId: "iron_shield", gold: 110, materials: { iron_ore: 4 }, unlockAfter: "roadside" },
    { id: "forge_iron_gauntlets", resultId: "iron_gauntlets", gold: 100, materials: { iron_ore: 2, beast_hide: 1 }, unlockAfter: "roadside" },
    { id: "forge_starsteel_sword", resultId: "starsteel_sword", gold: 500, materials: { star_shard: 5, iron_ore: 6, magic_stone: 2 }, unlockAfter: "starfall" },
    { id: "forge_starwoven_robe", resultId: "starwoven_robe", gold: 460, materials: { star_shard: 4, arcane_dust: 5, magic_stone: 2 }, unlockAfter: "starfall" },
    { id: "forge_fang_blade", resultId: "fang_blade", gold: 140, materials: { beast_fang: 3, iron_ore: 2, slime_gel: 1 }, unlockAfter: "roadside" },
    { id: "forge_hide_robe", resultId: "hide_robe", gold: 120, materials: { beast_hide: 4, slime_gel: 2 } },
    { id: "forge_spirit_staff", resultId: "spirit_staff", gold: 300, materials: { arcane_dust: 4, magic_stone: 1, slime_gel: 2 }, unlockAfter: "seal" },
    { id: "forge_iron_sword", resultId: "iron_sword", gold: 100, materials: { iron_ore: 3 }, unlockAfter: "roadside" },
    { id: "forge_hunter_bow", resultId: "hunter_bow", gold: 120, materials: { craft_material: 3, iron_ore: 1 }, unlockAfter: "roadside" },
    { id: "forge_leather_armor", resultId: "leather_armor", gold: 90, materials: { craft_material: 2 } },
    { id: "forge_steel_sword", resultId: "steel_sword", gold: 300, materials: { iron_ore: 5, magic_stone: 1 }, unlockAfter: "seal" },
    { id: "forge_iron_armor", resultId: "iron_armor", gold: 260, materials: { iron_ore: 6, magic_stone: 1 }, unlockAfter: "seal" },
    { id: "forge_arcane_staff", resultId: "arcane_staff", gold: 320, materials: { iron_ore: 4, magic_stone: 2 }, unlockAfter: "seal" },

    { id: "forge_greenwood_staff", resultId: "greenwood_staff", gold: 55, materials: { craft_material: 1, wind_grass: 2 }, unlockAfter: "prologue" },
    { id: "forge_windrunner_vest", resultId: "windrunner_vest", gold: 60, materials: { beast_hide: 2, beast_sinew: 1, wind_grass: 1 }, unlockAfter: "prologue" },
    { id: "forge_hornstring_bow", resultId: "hornstring_bow", gold: 65, materials: { craft_material: 1, beast_sinew: 2 }, unlockAfter: "prologue" },

    { id: "forge_glowsteel_sword", resultId: "glowsteel_sword", gold: 145, materials: { iron_ore: 3, glow_crystal: 2 }, unlockAfter: "roadside" },
    { id: "forge_silkweave_robe", resultId: "silkweave_robe", gold: 135, materials: { spider_silk: 3, glow_crystal: 1 }, unlockAfter: "roadside" },
    { id: "forge_delver_shield", resultId: "delver_shield", gold: 150, materials: { iron_ore: 4, glow_crystal: 2 }, unlockAfter: "roadside" },

    { id: "forge_relic_rapier", resultId: "relic_rapier", gold: 325, materials: { ancient_fragment: 3, magic_stone: 1, iron_ore: 2 }, unlockAfter: "seal" },
    { id: "forge_soul_veil", resultId: "soul_veil", gold: 315, materials: { soul_ash: 3, arcane_dust: 2, magic_stone: 1 }, unlockAfter: "seal" },
    { id: "forge_grave_gauntlets", resultId: "grave_gauntlets", gold: 300, materials: { ancient_fragment: 3, soul_ash: 1, iron_ore: 2 }, unlockAfter: "seal" },

    { id: "forge_comet_staff", resultId: "comet_staff", gold: 540, materials: { starsteel_ore: 3, star_shard: 3, magic_stone: 2 }, unlockAfter: "starfall" },
    { id: "forge_stormcloak", resultId: "stormcloak", gold: 520, materials: { storm_feather: 4, star_shard: 2, arcane_dust: 3 }, unlockAfter: "starfall" },
    { id: "forge_astral_katana", resultId: "astral_katana", gold: 560, materials: { starsteel_ore: 4, storm_feather: 2, star_shard: 3 }, unlockAfter: "starfall" }
  ];
})();
