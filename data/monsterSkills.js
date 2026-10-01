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
    },
    moonfang_howl: {
      id: "moonfang_howl", name: "月牙遠吠え", period: 3, target: "all", damageType: "physical", multiplier: .7,
      description: "3ターンごとに群れを震わせる咆哮で隊列全体を打つ。"
    },
    earthpulse_overload: {
      id: "earthpulse_overload", name: "地脈過負荷", period: 3, target: "all", damageType: "magic", element: "arcane", multiplier: .78,
      statusAttack: { statusId: "paralysis", chance: .18, duration: 1 },
      description: "3ターンごとに地脈を暴走させ、隊列全体を時折麻痺させる。"
    },
    orbit_execution: {
      id: "orbit_execution", name: "星環執行", period: 5, target: "single", targetRule: "rear_weighted", damageType: "magic", element: "arcane", multiplier: 1.6,
      description: "5ターンごとに星環を収束し、後方を狙いやすい一撃を放つ。"
    },
    cinder_coronation: {
      id: "cinder_coronation", name: "灼冠の宣告", period: 4, target: "all", damageType: "magic", element: "fire", multiplier: .9,
      statusAttack: { statusId: "burn", chance: .25, duration: 3 },
      description: "4ターンごとに灼けた灰を降らせ、隊列全体を時折火傷させる。"
    },
    mirror_refraction: {
      id: "mirror_refraction", name: "鏡潮屈折", period: 4, target: "all", damageType: "magic", element: "ice", multiplier: .85,
      statusAttack: { statusId: "chill", chance: .24, duration: 2 },
      description: "4ターンごとに鏡の潮を屈折させ、隊列全体へ凍寒を浴びせる。"
    },
    stolen_hour: {
      id: "stolen_hour", name: "奪われた一刻", period: 4, target: "single", targetRule: "rear_weighted", damageType: "magic", element: "arcane", multiplier: 1.55,
      statusAttack: { statusId: "paralysis", chance: .2, duration: 1 },
      description: "4ターンごとに後方の時を奪い、時折行動を封じる。"
    },
    nightbloom_spores: {
      id: "nightbloom_spores", name: "常夜の胞子", period: 4, target: "all", damageType: "magic", element: "dark", multiplier: .86,
      statusAttack: { statusId: "poison", chance: .28, duration: 3, potency: .04 },
      description: "4ターンごとに夜花の胞子を散らし、隊列全体を時折毒にする。"
    },
    aurora_prism: {
      id: "aurora_prism", name: "極光の稜鏡", period: 4, target: "all", damageType: "magic", element: "arcane", multiplier: .94,
      statusAttack: { statusId: "chill", chance: .24, duration: 2 },
      description: "4ターンごとに極光を稜鏡へ通し、隊列全体を時折凍寒にする。"
    },
    eclipse_decree: {
      id: "eclipse_decree", name: "蝕星の勅令", period: 4, target: "single", targetRule: "rear_weighted", damageType: "magic", element: "dark", multiplier: 1.7,
      description: "4ターンごとに王命を下し、後方を狙いやすい闇の一撃を放つ。"
    },
    memory_eclipse: {
      id: "memory_eclipse", name: "記憶月蝕", period: 4, target: "all", damageType: "magic", element: "dark", multiplier: 1,
      statusAttack: { statusId: "paralysis", chance: .2, duration: 1 },
      description: "4ターンごとに記憶を月蝕へ沈め、隊列全体を時折麻痺させる。"
    },
    divine_pack_eclipse: {
      id: "divine_pack_eclipse", name: "神狼月蝕", period: 3, target: "all", damageType: "physical", multiplier: .95,
      description: "月牙遠吠えと交互に、神狼の影が隊列全体へ襲いかかる。"
    },
    divine_fault: {
      id: "divine_fault", name: "神脈断層", period: 3, target: "all", damageType: "magic", element: "arcane", multiplier: 1,
      statusAttack: { statusId: "paralysis", chance: .25, duration: 1 },
      description: "地脈過負荷と交互に神脈を断ち、隊列全体を麻痺させやすい。"
    },
    celestial_verdict: {
      id: "celestial_verdict", name: "天環審判", period: 5, target: "all", damageType: "magic", element: "arcane", multiplier: 1.05,
      description: "星環執行と交互に、天環から隊列全体へ審判を降らせる。"
    },
    divine_ashfall: {
      id: "divine_ashfall", name: "神灰降臨", period: 4, target: "all", damageType: "magic", element: "fire", multiplier: 1.1,
      statusAttack: { statusId: "burn", chance: .3, duration: 3 },
      description: "灼冠の宣告と交互に神灰を降らせ、隊列全体を火傷させやすい。"
    },
    divine_tidal_mirror: {
      id: "divine_tidal_mirror", name: "神潮鏡界", period: 4, target: "all", damageType: "magic", element: "ice", multiplier: 1.05,
      statusAttack: { statusId: "chill", chance: .3, duration: 2 },
      description: "鏡潮屈折と交互に鏡界を満たし、隊列全体を凍寒にしやすい。"
    },
    divine_time_sentence: {
      id: "divine_time_sentence", name: "神刻宣告", period: 4, target: "all", damageType: "magic", element: "arcane", multiplier: 1.05,
      statusAttack: { statusId: "paralysis", chance: .25, duration: 1 },
      description: "奪われた一刻と交互に時を止め、隊列全体の行動を封じやすい。"
    },
    divine_nightbloom: {
      id: "divine_nightbloom", name: "神夜開花", period: 4, target: "all", damageType: "magic", element: "dark", multiplier: 1.05,
      statusAttack: { statusId: "poison", chance: .35, duration: 3, potency: .05 },
      description: "常夜の胞子と交互に神夜花を開き、隊列全体を毒にしやすい。"
    },
    divine_whiteout: {
      id: "divine_whiteout", name: "神嶺白界", period: 4, target: "all", damageType: "magic", element: "ice", multiplier: 1.1,
      statusAttack: { statusId: "chill", chance: .3, duration: 2 },
      description: "極光の稜鏡と交互に白界を広げ、隊列全体を凍寒にしやすい。"
    },
    divine_eclipse: {
      id: "divine_eclipse", name: "神蝕王命", period: 4, target: "all", damageType: "magic", element: "dark", multiplier: 1.1,
      statusAttack: { statusId: "paralysis", chance: .22, duration: 1 },
      description: "蝕星の勅令と交互に神蝕を広げ、隊列全体を時折麻痺させる。"
    },
    divine_blackmoon_memory: {
      id: "divine_blackmoon_memory", name: "神月記憶葬", period: 4, target: "all", damageType: "magic", element: "dark", multiplier: 1.15,
      statusAttack: { statusId: "chill", chance: .3, duration: 2 },
      description: "記憶月蝕と交互に黒月の記憶を葬り、隊列全体を凍寒にしやすい。"
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
  [
    ["moonfang_alpha", "moonfang_howl"],
    ["earth_oracle", "earthpulse_overload"],
    ["astral_archon", "orbit_execution"],
    ["cinder_sovereign", "cinder_coronation"],
    ["mirror_queen", "mirror_refraction"],
    ["time_queen", "stolen_hour"],
    ["nightbloom_oracle", "nightbloom_spores"],
    ["aurora_warden", "aurora_prism"],
    ["eclipse_regent", "eclipse_decree"],
    ["blackmoon_heart", "memory_eclipse"]
  ].forEach(([monsterId, skillId]) => assign(monsterId, "abyss", skillId));
  [
    ["moonfang_alpha", "divine_pack_eclipse"],
    ["earth_oracle", "divine_fault"],
    ["astral_archon", "celestial_verdict"],
    ["cinder_sovereign", "divine_ashfall"],
    ["mirror_queen", "divine_tidal_mirror"],
    ["time_queen", "divine_time_sentence"],
    ["nightbloom_oracle", "divine_nightbloom"],
    ["aurora_warden", "divine_whiteout"],
    ["eclipse_regent", "divine_eclipse"],
    ["blackmoon_heart", "divine_blackmoon_memory"]
  ].forEach(([monsterId, skillId]) => assign(monsterId, "divine", skillId));
})();
