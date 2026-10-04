(function () {
  "use strict";
  const data = window.GameData = window.GameData || {};
  const initial = skillId => ({ skillId, level: 1, initial: true });
  const at = (skillId, level) => ({ skillId, level, initial: false });
  const progression = (type, id, tier) => `progression_${type}_${id}_${tier}`;
  const initialSkill = (type, id, tier) => `initial_${type}_${id}_${tier}`;
  const trait = (type, id) => Object.values(data.skills).find(skill => skill.id.startsWith(`${type}_${id}`) && skill.effects.some(effect => effect.type === "combatModifier"))?.id;

  const jobActions = {
    warrior: ["power_strike", "rear_protection", "iron_guard"],
    thief: ["vital_strike", "counter_stance", "twin_strike", "venom_edge"],
    mage: ["fireball", "arcane_burst", "blizzard"],
    cleric: ["heal", "prayer", "purifying_light"],
    knight: ["knight_guard", "shield_bash"], ranger: ["aimed_shot", "arrow_rain"],
    berserker: ["frenzy", "last_fury"], monk: ["chi_strike", "flowing_counter"],
    samurai: ["iaijutsu", "samurai_guard"], ninja: ["shadow_blades", "smoke_counter"],
    bard: ["battle_song", "healing_song"], druid: ["thorn_lance", "nature_mend"],
    hexer: ["curse_bolt", "dark_wave"], spellblade: ["enchanted_slash", "runic_guard"],
    summoner: ["summon_fang", "spirit_mend"]
  };

  const raceActions = {
    human: "adaptive_strike", elf: "forest_shot", dwarf: "stone_guard", beastkin: "feral_pounce",
    halfling: "lucky_counter", gnome: "rune_spark", orc: "brutal_charge", goblin: "dirty_trick",
    dragonewt: "dragon_breath", fairy: "fairy_blessing", automaton: "self_repair", giantkin: "earth_shaker",
    demonkin: "abyss_bolt", celestial: "celestial_prayer", undead: "undying_will"
  };

  const birthActions = {
    common: [], guard: ["power_strike", "battle_command"], hunter: ["vital_strike"],
    arcane: ["fireball"], sacred: ["heal", "emergency_heal"], noble: ["battle_command"],
    mercenary: ["power_strike"], merchant: ["adaptive_strike"], blacksmith: ["stone_guard"],
    scholar: ["rune_spark"], frontier: ["feral_pounce"], orphan: ["vital_strike"],
    troupe: ["healing_song"], alchemist: ["fireball", "instant_detox"], dragon_ward: ["dragon_breath"]
  };

  const skillGrants = { job: {}, race: {}, birth: {} };

  Object.keys(data.jobs).forEach(id => {
    const actions = jobActions[id];
    skillGrants.job[id] = [
      ...["offense", "guard", "accuracy", "specialty"].map(tier => initial(initialSkill("job", id, tier))),
      at(actions[0] || trait("job", id), 10),
      at(actions[1] || progression("job", id, "veteran"), 40),
      at(actions[2] || trait("job", id), 70),
      at(actions[3] || progression("job", id, "mastery"), 100)
    ];
  });

  Object.keys(data.races).forEach(id => {
    skillGrants.race[id] = [
      ...["offense", "guard", "accuracy", "specialty"].map(tier => initial(initialSkill("race", id, tier))),
      at(raceActions[id], 1),
      at(trait("race", id), 30),
      at(progression("race", id, "awakening"), 60),
      at(progression("race", id, "trueblood"), 100)
    ];
  });

  Object.keys(data.births).forEach(id => {
    const actions = birthActions[id];
    skillGrants.birth[id] = [
      ...["offense", "guard", "accuracy", "specialty"].map(tier => initial(initialSkill("birth", id, tier))),
      at(trait("birth", id), 1),
      at(actions[0] || progression("birth", id, "growth20"), 20),
      at(actions[1] || progression("birth", id, "growth60"), 60),
      at(progression("birth", id, "legacy"), 100)
    ];
  });
  data.registry.relations("skillGrants", skillGrants);
})();
