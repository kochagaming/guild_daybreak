(function () {
  "use strict";
  const data = window.GameData = window.GameData || {};
  const normalMaterial = .08, bossMaterial = .12, normalEquipment = .03, bossEquipment = .06;
  const definitions = {
    slime: { materials: [["sticky_fluid", .1], ["tattered_cloth", .04]], equipment: "slimecloth_mantle" },
    horn_rabbit: { material: "beast_sinew", equipment: "hornstring_bow" }, grass_wolf: { material: "beast_fang", equipment: "fang_blade" }, alpha_wolf: { material: "beast_hide", equipment: "hide_robe" },
    cave_bat: { material: "glow_crystal", equipment: "silkweave_robe" }, goblin: { material: "iron_ore", equipment: "glowsteel_sword" }, cave_spider: { material: "spider_silk", equipment: "silkweave_robe" }, stone_golem: { material: "glow_crystal", equipment: "delver_shield" },
    skeleton: { material: "ancient_fragment", equipment: "grave_gauntlets" }, wraith: { material: "soul_ash", equipment: "soul_veil" }, rune_guardian: { material: "magic_stone", equipment: "spirit_staff" }, ancient_sentinel: { material: "ancient_fragment", equipment: "relic_rapier" },
    star_harrier: { material: "storm_feather", equipment: "stormcloak" }, sky_knight: { material: "starsteel_ore", equipment: "starsteel_sword" }, storm_regent: { material: "star_shard", equipment: "comet_staff" },
    brook_sprite: { material: "wind_grass", equipment: "greenwood_staff" }, moss_boar: { material: "beast_hide", equipment: "windrunner_vest" }, road_brigand: { material: "craft_material", equipment: "fang_blade" }, ruin_rat: { material: "beast_sinew", equipment: "hide_robe" }, moonfang_alpha: { material: "beast_fang", equipment: "hornstring_bow" },
    toxic_newt: { material: "slime_gel", equipment: "silkweave_robe" }, sporeling: { material: "arcane_dust", equipment: "greenwood_staff" }, crystal_beetle: { material: "glow_crystal", equipment: "grave_gauntlets" }, clockwork_miner: { material: "iron_ore", equipment: "delver_shield" }, earth_oracle: { material: "magic_stone", equipment: "rune_gauntlets" },
    moon_scribe: { material: "soul_ash", equipment: "spirit_staff" }, void_moth: { material: "arcane_dust", equipment: "soul_veil" }, inverted_guard: { material: "ancient_fragment", equipment: "relic_rapier" }, star_devourer: { material: "star_shard", equipment: "starwoven_robe" }, astral_archon: { material: "starsteel_ore", equipment: "astral_katana" },
    ash_hound: { material: "ashwood", equipment: "ashweave_mantle" }, cloud_manta: { material: "skyglass", equipment: "dawn_rapier" }, gale_warden: { material: "skyglass", equipment: "ember_bulwark" }, glass_sprite: { material: "skyglass", equipment: "dawn_rapier" }, thorn_stalker: { material: "ashwood", equipment: "ashweave_mantle" }, mirror_stag: { material: "ashwood", equipment: "dawn_rapier" },
    cinder_imp: { material: "ember_ore", equipment: "ashweave_mantle" }, forge_golem: { material: "ember_ore", equipment: "ember_bulwark" }, molten_colossus: { material: "ember_ore", equipment: "ember_bulwark" }, ash_knight: { material: "crown_core", equipment: "dawn_rapier" }, ember_seer: { material: "ember_ore", equipment: "ashweave_mantle" },
    ash_captain: { material: "crown_core", equipment: "ember_bulwark" }, crown_guard: { material: "crown_core", equipment: "ember_bulwark" }, cinder_sovereign: { material: "crown_core", equipment: "dawn_rapier" }, ash_drake: { material: "elder_scale", equipment: "ashweave_mantle" }, elder_ash_dragon: { material: "elder_scale", equipment: "ember_bulwark" },
    frost_crab: { material: "frost_pearl", equipment: "frostseal_robe" }, brine_wisp: { material: "frost_pearl", equipment: "tideglass_bow" }, reef_guardian: { material: "frost_pearl", equipment: "abyssal_gauntlets" },
    drowned_scribe: { material: "drowned_ink", equipment: "frostseal_robe" }, ink_slime: { material: "drowned_ink", equipment: "frostseal_robe" }, archive_keeper: { material: "drowned_ink", equipment: "tideglass_bow" },
    glass_shark: { material: "mirror_scale", equipment: "tideglass_bow" }, ice_serpent: { material: "mirror_scale", equipment: "abyssal_gauntlets" }, blue_reef_lord: { material: "mirror_scale", equipment: "tideglass_bow" },
    drowned_knight: { material: "abyssal_iron", equipment: "abyssal_gauntlets" }, lantern_jelly: { material: "frost_pearl", equipment: "frostseal_robe" }, frost_admiral: { material: "abyssal_iron", equipment: "abyssal_gauntlets" },
    mirror_mermaid: { material: "mirror_scale", equipment: "tideglass_bow" }, tide_priest: { material: "drowned_ink", equipment: "frostseal_robe" }, mirror_queen: { material: "tide_heart", equipment: "tideglass_bow" },
    trench_maw: { material: "abyssal_iron", equipment: "abyssal_gauntlets" }, abyss_whale: { material: "tide_heart", equipment: "frostseal_robe" },
    gate_scarab: { material: "time_sand", equipment: "chronoglass_rapier" }, tide_clockwork: { material: "brass_gear", equipment: "brasswall_shield" }, gate_colossus: { material: "memory_glass", equipment: "memory_robe" },
    sand_jackal: { material: "time_sand", equipment: "chronoglass_rapier" }, glass_nomad: { material: "memory_glass", equipment: "memory_robe" }, brass_basilisk: { material: "brass_gear", equipment: "brasswall_shield" },
    minute_hand: { material: "brass_gear", equipment: "chronoglass_rapier" }, bell_wraith: { material: "time_sand", equipment: "memory_robe" }, clock_warden: { material: "memory_glass", equipment: "brasswall_shield" },
    gear_mason: { material: "brass_gear", equipment: "brasswall_shield" }, spring_guard: { material: "royal_spring", equipment: "chronoglass_rapier" }, gear_king: { material: "royal_spring", equipment: "chronoglass_rapier" },
    memory_doll: { material: "memory_glass", equipment: "memory_robe" }, hourglass_knight: { material: "time_sand", equipment: "chronoglass_rapier" }, time_queen: { material: "royal_spring", equipment: "memory_robe" },
    forgotten_titan: { material: "giant_core", equipment: "brasswall_shield" },
    blackwood_wolf: { material: "black_sap", equipment: "moonleaf_bow" }, sap_slime: { material: "black_sap", equipment: "nightbloom_robe" }, border_keeper: { material: "moonleaf", equipment: "thornplate_gauntlets" },
    whisper_moth: { material: "moonleaf", equipment: "nightbloom_robe" }, root_walker: { material: "black_sap", equipment: "thornplate_gauntlets" }, ancient_treant: { material: "saint_thorn", equipment: "moonleaf_bow" },
    marsh_witch: { material: "witch_ember", equipment: "nightbloom_robe" }, lantern_toad: { material: "black_sap", equipment: "thornplate_gauntlets" }, witchflame_hag: { material: "witch_ember", equipment: "nightbloom_robe" },
    thorn_acolyte: { material: "saint_thorn", equipment: "thornplate_gauntlets" }, briar_knight: { material: "saint_thorn", equipment: "moonleaf_bow" }, thorn_saint: { material: "saint_thorn", equipment: "thornplate_gauntlets" },
    nightbloom_fairy: { material: "moonleaf", equipment: "nightbloom_robe" }, dream_stalker: { material: "witch_ember", equipment: "moonleaf_bow" }, nightbloom_oracle: { material: "saint_thorn", equipment: "nightbloom_robe" },
    worldroot_devourer: { material: "worldroot_seed", equipment: "thornplate_gauntlets" },
    snow_hare: { material: "cloud_wool", equipment: "cloudweave_mantle" }, frost_ram: { material: "frost_steel", equipment: "thundersteel_katana" }, pass_colossus: { material: "frost_steel", equipment: "cloudweave_mantle" },
    ice_wisp: { material: "thunder_crystal", equipment: "aurora_staff" }, bridge_guard: { material: "frost_steel", equipment: "thundersteel_katana" }, frozen_judge: { material: "cloud_wool", equipment: "cloudweave_mantle" },
    thunder_hawk: { material: "aurora_feather", equipment: "cloudweave_mantle" }, storm_serpent: { material: "thunder_crystal", equipment: "thundersteel_katana" }, thunder_rook: { material: "thunder_crystal", equipment: "aurora_staff" },
    cloud_disciple: { material: "cloud_wool", equipment: "cloudweave_mantle" }, bell_yak: { material: "cloud_wool", equipment: "thundersteel_katana" }, sky_monk: { material: "aurora_feather", equipment: "cloudweave_mantle" },
    aurora_sprite: { material: "aurora_feather", equipment: "aurora_staff" }, summit_knight: { material: "frost_steel", equipment: "thundersteel_katana" }, aurora_warden: { material: "aurora_feather", equipment: "aurora_staff" },
    white_dragon: { material: "white_dragon_scale", equipment: "cloudweave_mantle" },
    starroad_scout: { material: "black_wing_feather", equipment: "starpiercer_rapier" }, winged_hound: { material: "black_wing_feather", equipment: "blackwing_plate" }, starroad_gatekeeper: { material: "floating_core", equipment: "blackwing_plate" },
    skyvine: { material: "eclipse_shard", equipment: "eclipse_staff" }, fallen_gardener: { material: "floating_core", equipment: "blackwing_plate" }, garden_seraph: { material: "eclipse_shard", equipment: "eclipse_staff" },
    blackwing_acolyte: { material: "black_wing_feather", equipment: "eclipse_staff" }, feather_blade: { material: "fallen_star_iron", equipment: "starpiercer_rapier" }, blackwing_marquis: { material: "black_wing_feather", equipment: "starpiercer_rapier" },
    starforged_soldier: { material: "fallen_star_iron", equipment: "blackwing_plate" }, furnace_wisp: { material: "eclipse_shard", equipment: "eclipse_staff" }, foundry_keeper: { material: "fallen_star_iron", equipment: "blackwing_plate" },
    eclipse_priest: { material: "eclipse_shard", equipment: "eclipse_staff" }, throne_guard: { material: "floating_core", equipment: "starpiercer_rapier" }, eclipse_regent: { material: "eclipse_shard", equipment: "eclipse_staff" },
    void_archon: { material: "void_star_crystal", equipment: "blackwing_plate" }
  };

  Object.entries(definitions).forEach(([monsterId, definition]) => {
    const monster = data.monsters[monsterId];
    if (!monster) return;
    const materialChance = monster.boss ? bossMaterial : normalMaterial;
    const equipmentChance = monster.boss ? bossEquipment : normalEquipment;
    const materials = definition.materials || [[definition.material, materialChance]];
    monster.signatureDrops = {
      materials: materials.map(([itemId, chance]) => ({ itemId, chance: chance == null ? materialChance : chance, quantity: [1, 1] })),
      equipment: { itemId: definition.equipment, chance: equipmentChance, quantity: [1, 1] }
    };
  });
})();
