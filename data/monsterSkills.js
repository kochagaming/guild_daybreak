(function () {
  "use strict";
  const data = window.GameData = window.GameData || {};

  data.monsterSkills = {
    viscous_wave: {
      id: "viscous_wave", name: "粘液波", period: 3, target: "all", damageType: "physical", multiplier: .72,
      description: "3ターンごとに隊列全体へ粘液を浴びせる。"
    },
    divine_mitosis: {
      id: "divine_mitosis", name: "神域分裂撃", period: 2, target: "single", targetRule: "rear_weighted", damageType: "physical", multiplier: 1.55,
      description: "2ターンごとに分裂し、後方を狙いやすい強打を放つ。"
    },
    memory_seal: {
      id: "memory_seal", name: "記憶封印", period: 3, target: "all", damageType: "magic", element: "dark", multiplier: .8,
      statusAttack: { statusId: "paralysis", chance: .22, duration: 1 },
      description: "3ターンごとに隊列全体へ闇の術を放ち、時折麻痺させる。"
    },
    blackmoon_liturgy: {
      id: "blackmoon_liturgy", name: "黒月典礼", period: 2, target: "all", damageType: "magic", element: "dark", multiplier: 1.05,
      statusAttack: { statusId: "chill", chance: .28, duration: 2 },
      description: "2ターンごとに黒月の冷気を降らせ、時折凍寒を与える。"
    }
  };

  const assign = (monsterId, difficultyId, skillId) => {
    const profile = data.monsterDifficultyProfiles?.[monsterId]?.[difficultyId];
    if (profile && !profile.skillIds.includes(skillId)) profile.skillIds.push(skillId);
  };
  assign("slime", "abyss", "viscous_wave");
  assign("slime", "divine", "divine_mitosis");
  assign("blackmoon_priest", "abyss", "memory_seal");
  assign("blackmoon_priest", "divine", "blackmoon_liturgy");
})();
