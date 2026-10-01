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
    void_archon: { material: "void_star_crystal", equipment: "blackwing_plate" },
    moon_skiff_raider: { material: "moon_silver", equipment: "moonchain_katana" }, lunar_hound: { material: "dream_dust", equipment: "dreamweave_robe" }, mooring_warden: { material: "chain_core", equipment: "jailer_shield" },
    memory_leech: { material: "sealed_memory", equipment: "dreamweave_robe" }, sealed_librarian: { material: "sealed_memory", equipment: "dreamweave_robe" }, archive_jailer: { material: "sealed_memory", equipment: "jailer_shield" },
    silver_chain_knight: { material: "moon_silver", equipment: "moonchain_katana" }, chain_wisp: { material: "chain_core", equipment: "dreamweave_robe" }, chain_matriarch: { material: "chain_core", equipment: "jailer_shield" },
    dream_eater: { material: "dream_dust", equipment: "dreamweave_robe" }, sleepwalker_guard: { material: "moon_silver", equipment: "moonchain_katana" }, nightmare_oracle: { material: "dream_dust", equipment: "dreamweave_robe" },
    blackmoon_priest: { material: "sealed_memory", equipment: "dreamweave_robe" }, lunar_automaton: { material: "chain_core", equipment: "jailer_shield" }, blackmoon_heart: { material: "royal_eclipse_fragment", equipment: "moonchain_katana" },
    exiled_king: { material: "royal_eclipse_fragment", equipment: "moonchain_katana" },
    root_sentinel: { material: "primordial_bark", equipment: "ancestor_leather" }, starseed_moth: { material: "star_seed", equipment: "starroot_staff" }, ancient_gatekeeper: { material: "primordial_bark", equipment: "originwood_bow" },
    amber_slime: { material: "origin_amber", equipment: "ancestor_leather" }, memory_deer: { material: "memory_moss", equipment: "originwood_bow" }, seed_mother: { material: "star_seed", equipment: "starroot_staff" },
    moss_wraith: { material: "memory_moss", equipment: "ancestor_leather" }, origin_scribe: { material: "origin_amber", equipment: "starroot_staff" }, forgotten_druid: { material: "memory_moss", equipment: "originwood_bow" },
    ancestor_knight: { material: "primordial_bark", equipment: "ancestor_leather" }, firstborn_spirit: { material: "star_seed", equipment: "starroot_staff" }, first_priestess: { material: "origin_amber", equipment: "ancestor_leather" },
    worldroot_guard: { material: "primordial_bark", equipment: "ancestor_leather" }, star_bloom_seraph: { material: "star_seed", equipment: "starroot_staff" }, origin_heart: { material: "first_star_core", equipment: "originwood_bow" },
    primordial_devourer: { material: "first_star_core", equipment: "originwood_bow" },
    foam_scout: { material: "abyssal_salt", equipment: "navigator_gauntlet" }, light_jelly: { material: "blue_star_sand", equipment: "abyssal_robe" }, tide_gatekeeper: { material: "abyssal_salt", equipment: "starsea_rapier" },
    drowned_sailor: { material: "tide_memory", equipment: "starsea_rapier" }, memory_shell: { material: "sea_glass_core", equipment: "abyssal_robe" }, lost_cartographer: { material: "tide_memory", equipment: "navigator_gauntlet" },
    current_wraith: { material: "tide_memory", equipment: "abyssal_robe" }, star_coral: { material: "blue_star_sand", equipment: "navigator_gauntlet" }, reef_oracle: { material: "sea_glass_core", equipment: "starsea_rapier" },
    sunken_knight: { material: "abyssal_salt", equipment: "starsea_rapier" }, tide_siren: { material: "blue_star_sand", equipment: "abyssal_robe" }, temple_warden: { material: "sea_glass_core", equipment: "navigator_gauntlet" },
    void_ray: { material: "blue_star_sand", equipment: "abyssal_robe" }, starsea_serpent: { material: "abyssal_salt", equipment: "starsea_rapier" }, starsea_core: { material: "starsea_heart", equipment: "navigator_gauntlet" },
    abyssal_leviathan: { material: "starsea_heart", equipment: "navigator_gauntlet" },
    frostwalker: { material: "black_ice", equipment: "aurora_heavy" }, aurora_wolf: { material: "star_sinew", equipment: "northstar_katana" }, shore_warden: { material: "black_ice", equipment: "vessel_shield" },
    blacklight_wisp: { material: "aurora_ore", equipment: "northstar_katana" }, stargrave_knight: { material: "vessel_fragment", equipment: "aurora_heavy" }, aurora_mourner: { material: "aurora_ore", equipment: "vessel_shield" },
    crater_beast: { material: "star_sinew", equipment: "northstar_katana" }, fallen_seraph: { material: "aurora_ore", equipment: "aurora_heavy" }, grave_colossus: { material: "vessel_fragment", equipment: "vessel_shield" },
    vessel_guard: { material: "vessel_fragment", equipment: "aurora_heavy" }, dream_drake: { material: "star_sinew", equipment: "northstar_katana" }, chamber_keeper: { material: "vessel_fragment", equipment: "vessel_shield" },
    northstar_pilgrim: { material: "black_ice", equipment: "aurora_heavy" }, hollow_vessel: { material: "vessel_fragment", equipment: "vessel_shield" }, sleeping_vessel: { material: "northstar_core", equipment: "northstar_katana" },
    worldscar_dragon: { material: "northstar_core", equipment: "northstar_katana" },
    starved_citizen: { material: "eclipse_glass", equipment: "starveil_cloth" }, eclipse_hound: { material: "starblood_crystal", equipment: "eclipse_sword" }, fallen_gate_captain: { material: "eclipse_glass", equipment: "skykey_gauntlet" },
    blackstar_acolyte: { material: "starblood_crystal", equipment: "starveil_cloth" }, crown_automaton: { material: "skykey_fragment", equipment: "skykey_gauntlet" }, palace_inquisitor: { material: "starblood_crystal", equipment: "eclipse_sword" },
    memory_ghost: { material: "royal_memory", equipment: "starveil_cloth" }, royal_chimera: { material: "starblood_crystal", equipment: "eclipse_sword" }, archive_sentinel: { material: "royal_memory", equipment: "skykey_gauntlet" },
    skykey_guard: { material: "skykey_fragment", equipment: "skykey_gauntlet" }, void_magister: { material: "eclipse_glass", equipment: "starveil_cloth" }, gate_archon: { material: "skykey_fragment", equipment: "eclipse_sword" },
    eclipse_guard: { material: "eclipse_glass", equipment: "eclipse_sword" }, false_queen: { material: "royal_memory", equipment: "starveil_cloth" }, starbound_usurper: { material: "throne_star_core", equipment: "skykey_gauntlet" },
    hollow_king: { material: "throne_star_core", equipment: "skykey_gauntlet" },
    gate_seraph: { material: "sky_dust", equipment: "firstlight_robe" }, void_hunter: { material: "void_heart", equipment: "heavensplit_rapier" }, sky_threshold_warden: { material: "sky_dust", equipment: "constellation_leather" },
    broken_zodiac: { material: "constellation_fragment", equipment: "firstlight_robe" }, constellation_beast: { material: "constellation_fragment", equipment: "heavensplit_rapier" }, astral_judge: { material: "constellation_fragment", equipment: "constellation_leather" },
    firstlight_echo: { material: "first_light", equipment: "firstlight_robe" }, genesis_automaton: { material: "sky_dust", equipment: "constellation_leather" }, archive_of_dawn: { material: "first_light", equipment: "heavensplit_rapier" },
    throne_angel: { material: "sky_dust", equipment: "firstlight_robe" }, starless_knight: { material: "void_heart", equipment: "heavensplit_rapier" }, celestial_regent: { material: "void_heart", equipment: "constellation_leather" },
    sky_eye: { material: "void_heart", equipment: "firstlight_robe" }, nameless_herald: { material: "constellation_fragment", equipment: "heavensplit_rapier" }, lord_beyond_sky: { material: "nameless_star", equipment: "constellation_leather" },
    afterstar_abomination: { material: "nameless_star", equipment: "constellation_leather" }
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
