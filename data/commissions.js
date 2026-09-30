(function () {
  "use strict";
  window.GameData.commissions = [];
  const rows = [
    ["meadow", "slime", 60, "beast_hide", 2, 1],
    ["cave", "cave_bat", 130, "iron_ore", 3, 1],
    ["ruins", "wraith", 240, "magic_stone", 2, 1],
    ["observatory", "sky_knight", 400, "star_shard", 3, 2],
    ["cinder_throne", "cinder_sovereign", 900, "crown_core", 2, 2],
    ["mirror_palace", "mirror_queen", 1400, "tide_heart", 2, 2],
    ["hourglass_palace", "time_queen", 2100, "royal_spring", 2, 3],
    ["night_bloom_sanctuary", "nightbloom_oracle", 3000, "saint_thorn", 2, 3],
    ["aurora_summit", "aurora_warden", 4000, "aurora_feather", 2, 3],
    ["eclipsed_throne", "eclipse_regent", 5200, "eclipse_shard", 2, 3],
    ["blackmoon_core", "blackmoon_heart", 6600, "royal_eclipse_fragment", 2, 3]
  ];
  rows.forEach(([dungeonId, monsterId, gold, materialId, quantity, seals]) => {
    const dungeon = window.GameData.dungeons[dungeonId], monster = window.GameData.monsters[monsterId];
    window.GameData.commissions.push({ id: `first_${dungeonId}`, dungeonId, title: `${dungeon.shortName}の初回攻略`, description: `${dungeon.name}の全戦闘を突破する。`, type: "clear", target: 1, rewards: { gold, materials: { [materialId]: quantity, guild_seal: seals } } });
    window.GameData.commissions.push({ id: `hunt_${dungeonId}`, dungeonId, monsterId, title: `${monster.name}討伐`, description: `${dungeon.name}で${monster.name}を累計5体倒す。撤退しても討伐数は加算。`, type: "kills", target: 5, rewards: { gold, materials: { [materialId]: quantity, guild_seal: seals } } });
  });
})();
