(function () {
  "use strict";
  const data = window.GameData = window.GameData || {};

  data.creatureFamilies = {
    humanoid: { id: "humanoid", name: "人型", weaponTypes: ["sword", "rapier", "katana", "bow", "staff"], armorTypes: ["cloth", "leather", "heavy", "shield", "gauntlet"] },
    beast: { id: "beast", name: "獣", weaponTypes: ["bow", "katana"], armorTypes: ["leather", "gauntlet"] },
    dragon: { id: "dragon", name: "竜", weaponTypes: ["sword", "katana", "staff"], armorTypes: ["heavy", "shield"] },
    undead: { id: "undead", name: "不死", weaponTypes: ["sword", "rapier", "staff"], armorTypes: ["cloth", "heavy", "shield"] },
    construct: { id: "construct", name: "機械・造物", weaponTypes: ["sword", "staff"], armorTypes: ["heavy", "shield", "gauntlet"] },
    spirit: { id: "spirit", name: "精霊", weaponTypes: ["staff", "bow"], armorTypes: ["cloth", "leather"] },
    amorphous: { id: "amorphous", name: "不定形", weaponTypes: ["staff", "rapier"], armorTypes: ["cloth", "leather"] },
    insect: { id: "insect", name: "虫", weaponTypes: ["rapier", "bow"], armorTypes: ["leather", "gauntlet"] },
    plant: { id: "plant", name: "植物", weaponTypes: ["staff", "bow"], armorTypes: ["cloth", "leather"] },
    demon: { id: "demon", name: "魔族", weaponTypes: ["sword", "katana", "staff"], armorTypes: ["cloth", "heavy"] },
    celestial: { id: "celestial", name: "天上", weaponTypes: ["rapier", "bow", "staff"], armorTypes: ["cloth", "shield"] },
    aquatic: { id: "aquatic", name: "水棲", weaponTypes: ["rapier", "bow", "staff"], armorTypes: ["cloth", "leather"] },
    giant: { id: "giant", name: "巨人", weaponTypes: ["sword", "katana"], armorTypes: ["heavy", "shield", "gauntlet"] }
  };

  data.adventurerFamilies = {
    human: ["humanoid"], elf: ["humanoid"], dwarf: ["humanoid"], beastkin: ["humanoid", "beast"],
    halfling: ["humanoid"], gnome: ["humanoid"], orc: ["humanoid"], goblin: ["humanoid"],
    dragonewt: ["humanoid", "dragon"], fairy: ["spirit"], automaton: ["construct"], giantkin: ["humanoid", "giant"],
    demonkin: ["humanoid", "demon"], celestial: ["celestial"], undead: ["undead"]
  };

  data.monsterFamilies = {
    slime: ["amorphous"], horn_rabbit: ["beast"], grass_wolf: ["beast"], alpha_wolf: ["beast"],
    cave_bat: ["beast"], goblin: ["humanoid"], cave_spider: ["insect"], stone_golem: ["construct"],
    skeleton: ["undead"], wraith: ["undead", "spirit"], rune_guardian: ["construct"], ancient_sentinel: ["construct"],
    star_harrier: ["beast", "celestial"], sky_knight: ["humanoid", "celestial"], storm_regent: ["beast", "celestial"],
    brook_sprite: ["spirit", "aquatic"], moss_boar: ["beast"], road_brigand: ["humanoid"], ruin_rat: ["beast"], moonfang_alpha: ["beast"],
    toxic_newt: ["beast", "aquatic"], sporeling: ["plant"], crystal_beetle: ["insect"], clockwork_miner: ["construct"], earth_oracle: ["construct"],
    moon_scribe: ["undead", "spirit"], void_moth: ["insect"], inverted_guard: ["construct"], star_devourer: ["spirit", "demon"], astral_archon: ["celestial", "construct"],
    ash_hound: ["beast"], cloud_manta: ["beast", "aquatic"], gale_warden: ["construct"], glass_sprite: ["spirit"], thorn_stalker: ["plant"], mirror_stag: ["beast"],
    cinder_imp: ["demon"], forge_golem: ["construct"], molten_colossus: ["construct", "giant"], ash_knight: ["humanoid"], ember_seer: ["humanoid"],
    ash_captain: ["humanoid"], crown_guard: ["humanoid"], cinder_sovereign: ["humanoid", "demon"], ash_drake: ["dragon"], elder_ash_dragon: ["dragon"],
    frost_crab: ["aquatic"], brine_wisp: ["spirit", "aquatic"], reef_guardian: ["construct", "aquatic"],
    drowned_scribe: ["undead", "humanoid"], ink_slime: ["amorphous", "aquatic"], archive_keeper: ["undead", "spirit"],
    glass_shark: ["beast", "aquatic"], ice_serpent: ["beast", "aquatic"], blue_reef_lord: ["beast", "aquatic"],
    drowned_knight: ["undead", "humanoid"], lantern_jelly: ["amorphous", "aquatic"], frost_admiral: ["undead", "humanoid"],
    mirror_mermaid: ["humanoid", "aquatic"], tide_priest: ["humanoid", "aquatic"], mirror_queen: ["humanoid", "aquatic"],
    trench_maw: ["beast", "aquatic"], abyss_whale: ["beast", "aquatic", "giant"],
    gate_scarab: ["insect", "construct"], tide_clockwork: ["construct", "aquatic"], gate_colossus: ["construct", "giant"],
    sand_jackal: ["beast"], glass_nomad: ["humanoid", "construct"], brass_basilisk: ["construct", "beast"],
    minute_hand: ["construct"], bell_wraith: ["undead", "spirit"], clock_warden: ["construct"],
    gear_mason: ["construct"], spring_guard: ["construct", "humanoid"], gear_king: ["construct", "humanoid"],
    memory_doll: ["construct", "spirit"], hourglass_knight: ["construct", "humanoid"], time_queen: ["humanoid", "spirit"],
    forgotten_titan: ["construct", "giant"],
    blackwood_wolf: ["beast"], sap_slime: ["amorphous", "plant"], border_keeper: ["construct", "plant"],
    whisper_moth: ["insect", "spirit"], root_walker: ["plant", "construct"], ancient_treant: ["plant", "giant"],
    marsh_witch: ["humanoid", "demon"], lantern_toad: ["beast", "aquatic"], witchflame_hag: ["humanoid", "demon"],
    thorn_acolyte: ["humanoid", "plant"], briar_knight: ["humanoid", "plant"], thorn_saint: ["humanoid", "plant"],
    nightbloom_fairy: ["spirit", "plant"], dream_stalker: ["beast", "demon"], nightbloom_oracle: ["spirit", "plant"],
    worldroot_devourer: ["plant", "giant", "demon"],
    snow_hare: ["beast"], frost_ram: ["beast"], pass_colossus: ["construct", "giant"],
    ice_wisp: ["spirit"], bridge_guard: ["humanoid", "construct"], frozen_judge: ["construct", "celestial"],
    thunder_hawk: ["beast", "celestial"], storm_serpent: ["beast", "dragon"], thunder_rook: ["beast", "celestial"],
    cloud_disciple: ["humanoid"], bell_yak: ["beast", "giant"], sky_monk: ["humanoid", "celestial"],
    aurora_sprite: ["spirit", "celestial"], summit_knight: ["humanoid", "celestial"], aurora_warden: ["celestial", "construct"],
    white_dragon: ["dragon", "celestial"],
    starroad_scout: ["humanoid", "celestial"], winged_hound: ["beast", "demon"], starroad_gatekeeper: ["construct", "celestial"],
    skyvine: ["plant", "celestial"], fallen_gardener: ["construct", "plant"], garden_seraph: ["celestial", "spirit"],
    blackwing_acolyte: ["humanoid", "demon"], feather_blade: ["humanoid", "celestial"], blackwing_marquis: ["humanoid", "demon", "celestial"],
    starforged_soldier: ["construct", "humanoid"], furnace_wisp: ["spirit"], foundry_keeper: ["construct", "giant"],
    eclipse_priest: ["humanoid", "demon"], throne_guard: ["construct", "celestial"], eclipse_regent: ["humanoid", "celestial", "demon"],
    void_archon: ["celestial", "demon", "spirit"]
  };

  data.monsterLoot = { normalChance: .1, bossChance: .2, weaponWeight: .62 };
})();
