(function () {
  "use strict";
  const data = window.GameData = window.GameData || {};

  data.registry.config("companions", { rosterLimit: 8 });
  const companions = {
    mina: {
      id: "mina", name: "ミナ", title: "地脈を聴く鍛冶師",
      description: "封鎖された採掘場で機巧の声を追っていたドワーフ。壊れたものを見捨てず、地底の道を切り開く。",
      jobId: "warrior", raceId: "dwarf", birthId: "blacksmith", portraitId: "companion-mina", previousPortraitIds: ["birth-blacksmith-1"], initialLevel: 14,
      baseStats: { hp: 62, attack: 10, defense: 13, magicAttack: 4, magicDefense: 8, magicHealing: 3 }
    },
    elena: {
      id: "elena", name: "エレナ", title: "欠け星の書記",
      description: "月碑の書庫で失われた星図を読み続けていたエルフ。記録にない道を自分の足で確かめようとする。",
      jobId: "mage", raceId: "elf", birthId: "scholar", portraitId: "companion-elena", previousPortraitIds: ["job-mage-2"], initialLevel: 20,
      baseStats: { hp: 40, attack: 6, defense: 5, magicAttack: 15, magicDefense: 13, magicHealing: 7 }
    },
    garm: {
      id: "garm", name: "ガルム", title: "灰冠最後の盾",
      description: "滅びた灰冠王国の命令を守り続けていた騎士。過去の王ではなく、今を生きる者の盾になると決めた。",
      jobId: "knight", raceId: "human", birthId: "guard", portraitId: "companion-garm", previousPortraitIds: ["job-knight-3"], initialLevel: 30,
      baseStats: { hp: 68, attack: 13, defense: 15, magicAttack: 4, magicDefense: 9, magicHealing: 3 }
    },
    shia: {
      id: "shia", name: "シア", title: "失われた潮歌",
      description: "沈んだ記録院の声を歌として覚えていた獣人の吟遊詩人。消された航路と名前を地上へ持ち帰る。",
      jobId: "bard", raceId: "beastkin", birthId: "troupe", portraitId: "companion-shia", previousPortraitIds: ["job-bard-2"], initialLevel: 37,
      baseStats: { hp: 48, attack: 7, defense: 7, magicAttack: 10, magicDefense: 12, magicHealing: 14 }
    },
    tio: {
      id: "tio", name: "ティオ", title: "明日を数える機巧",
      description: "止まった砂の都で同じ一日を数え続けた機巧人。初めて訪れた明日の意味を知るため旅に加わる。",
      jobId: "thief", raceId: "automaton", birthId: "alchemist", portraitId: "companion-tio", previousPortraitIds: ["race-automaton-2"], initialLevel: 46,
      baseStats: { hp: 54, attack: 12, defense: 11, magicAttack: 10, magicDefense: 10, magicHealing: 5 }
    },
    rize: {
      id: "rize", name: "リゼ", title: "夜花の夢守",
      description: "黒樹海で他者の記憶を守ってきた妖精。森の外へ出て、消えていく物語を自分の言葉で残そうとする。",
      jobId: "druid", raceId: "fairy", birthId: "frontier", portraitId: "companion-rize", previousPortraitIds: ["job-druid-3"], initialLevel: 56,
      baseStats: { hp: 46, attack: 6, defense: 7, magicAttack: 13, magicDefense: 13, magicHealing: 14 }
    },
    kai: {
      id: "kai", name: "カイ", title: "極光を越えた巡礼者",
      description: "雷雪の山脈で星路を見張っていた竜人の狩人。空から来る災いを追い、守るべき地上を探している。",
      jobId: "ranger", raceId: "dragonewt", birthId: "dragon_ward", portraitId: "companion-kai", previousPortraitIds: ["job-ranger-1"], initialLevel: 66,
      baseStats: { hp: 60, attack: 15, defense: 11, magicAttack: 7, magicDefense: 10, magicHealing: 5 }
    },
    noah: {
      id: "noah",
      name: "ノア",
      title: "眠れる星の器",
      description: "北天星墓の揺籃で目覚め、奪われた星核を追ってギルドに同行する。",
      jobId: "spellblade",
      raceId: "celestial",
      birthId: "arcane",
      portraitId: "companion-noah",
      previousPortraitIds: ["race-celestial-2"],
      initialLevel: 97,
      baseStats: { hp: 52, attack: 11, defense: 9, magicAttack: 14, magicDefense: 13, magicHealing: 8 }
    }
  };

  const skillGrants = {
    mina: [
      { skillId: "companion_mina_earth_listener", level: 1, initial: true },
      { skillId: "companion_mina_tunnel_breaker", level: 1, initial: true }
    ],
    elena: [
      { skillId: "companion_elena_lost_astrolabe", level: 1, initial: true },
      { skillId: "companion_elena_star_projection", level: 1, initial: true }
    ],
    garm: [
      { skillId: "companion_garm_last_bulwark", level: 1, initial: true },
      { skillId: "companion_garm_ash_guard", level: 1, initial: true }
    ],
    shia: [
      { skillId: "companion_shia_tide_memory", level: 1, initial: true },
      { skillId: "companion_shia_homecoming_song", level: 1, initial: true }
    ],
    tio: [
      { skillId: "companion_tio_tomorrow_clock", level: 1, initial: true },
      { skillId: "companion_tio_second_hand", level: 1, initial: true }
    ],
    rize: [
      { skillId: "companion_rize_dream_keeper", level: 1, initial: true },
      { skillId: "companion_rize_nightbloom_dew", level: 1, initial: true }
    ],
    kai: [
      { skillId: "companion_kai_aurora_eye", level: 1, initial: true },
      { skillId: "companion_kai_skyhunt", level: 1, initial: true }
    ],
    noah: [
      { skillId: "companion_noah_star_vessel", level: 1, initial: true },
      { skillId: "companion_noah_northstar_pulse", level: 1, initial: true }
    ]
  };

  const progressions = Object.fromEntries(Object.keys(companions).map(companionId => [companionId, {
    companionId,
    initialStageId: "base",
    stages: {
      base: { id: "base", name: "出会い", previousStageId: null, addSkillIds: [], replacements: {} }
    }
  }]));
  progressions.mina.stages.free_hammer = {
    id: "free_hammer", name: "命令を断つ鍛槌", previousStageId: "base",
    addSkillIds: ["companion_mina_machinist_oath"],
    replacements: { companion_mina_tunnel_breaker: "companion_mina_liberation_hammer" }
  };
  progressions.tio.stages.free_clock = {
    id: "free_clock", name: "自分の時を刻む機巧", previousStageId: "base",
    addSkillIds: ["companion_tio_free_clock"],
    replacements: { companion_tio_second_hand: "companion_tio_epoch_break" }
  };
  progressions.shia.stages.starsea_song = {
    id: "starsea_song", name: "星海へ名を返す歌い手", previousStageId: "base",
    addSkillIds: ["companion_shia_true_name_chorus"],
    replacements: { companion_shia_homecoming_song: "companion_shia_starsea_hymn" }
  };
  progressions.noah.stages.reclaimed_star = {
    id: "reclaimed_star", name: "星核を取り戻した器", previousStageId: "base",
    addSkillIds: ["companion_noah_star_resolve"],
    replacements: { companion_noah_northstar_pulse: "companion_noah_awakened_pulse" }
  };
  progressions.elena.stages.written_void_star = {
    id: "written_void_star", name: "余白へ虚星を記す書記", previousStageId: "base",
    addSkillIds: ["companion_elena_living_history"],
    replacements: { companion_elena_star_projection: "companion_elena_void_projection" }
  };
  progressions.garm.stages.present_bulwark = {
    id: "present_bulwark", name: "今を守る無冠の盾", previousStageId: "base",
    addSkillIds: ["companion_garm_living_bulwark"],
    replacements: { companion_garm_ash_guard: "companion_garm_crownless_guard" }
  };
  progressions.rize.stages.own_story = {
    id: "own_story", name: "自分の物語を語る夢守", previousStageId: "base",
    addSkillIds: ["companion_rize_own_tale"],
    replacements: { companion_rize_nightbloom_dew: "companion_rize_story_dreamlight" }
  };
  progressions.kai.stages.earthward_hunter = {
    id: "earthward_hunter", name: "地上を選んだ天猟士", previousStageId: "base",
    addSkillIds: ["companion_kai_earthward_eye"],
    replacements: { companion_kai_skyhunt: "companion_kai_whitewing_hunt" }
  };
  data.registry.entities("companions", companions);
  data.registry.relations("companionSkillGrants", skillGrants);
  data.registry.relations("companionProgressions", progressions);
})();
