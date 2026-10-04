(function () {
  "use strict";
  const data = window.GameData = window.GameData || {};
  const combatRules = {
    maxTurnsPerEncounter: 30,
    betweenEncounterRecovery: .12,
    minimumHitChance: .1,
    maximumHitChance: .99,
    criticalChanceCap: .95,
    defaultGuardDamageMultiplier: .5,
    damageFormula: {
      defenseCoefficient: .52,
      criticalMultiplier: 1.65,
      varianceMinimum: .9,
      varianceMaximum: 1.1,
      minimumDamage: 1,
      additionalHitAccuracy: .6,
      additionalHitAccuracyDecay: .9,
      additionalHitDamageDecay: .9,
      fullPowerHitCount: 2
    },
    attackCountProgression: {
      minimum: 1,
      maximum: 8,
      speedBaseline: 8,
      speedPerAdditionalAttack: 8,
      speedWeights: { job: 1, level: 1, profile: 1, equipment: 1, equipmentSkills: 1 },
      jobBonuses: {}
    },
    targeting: {
      hero: {
        basePositionStep: .56,
        rearTargetingScale: 1.5,
        minimumPositionStep: .2,
        maximumPositionStep: 1.8
      },
      profiles: {
        random: { mode: "uniform" },
        front: { mode: "front" },
        front_weighted: { mode: "positionStep", step: .68 },
        rear: { mode: "rear" },
        rear_weighted: { mode: "reversePositionStep", step: .68 },
        lowest_hp: { mode: "lowestHp" }
      }
    },
    actionPriority: ["healing", "spell", "technique", "attack"],
    defaultActionRates: { attack: 100, technique: 100, spell: 100, healing: 100 },
    actionPresets: [
      { id: "all", name: "全100", rates: { attack: 100, technique: 100, spell: 100, healing: 100 } },
      { id: "physical", name: "物理重視", rates: { attack: 100, technique: 100, spell: 0, healing: 30 } },
      { id: "magic", name: "魔法重視", rates: { attack: 30, technique: 0, spell: 100, healing: 30 } },
      { id: "healing", name: "回復重視", rates: { attack: 30, technique: 0, spell: 30, healing: 100 } }
    ]
  };
  data.registry.config("combatRules", combatRules);

  const activeCooldownTurns = Object.freeze({
    power_strike: 10, iron_guard: 10, vital_strike: 9, twin_strike: 16,
    fireball: 10, arcane_burst: 20, heal: 8, prayer: 18,
    shield_bash: 10, knight_guard: 10, aimed_shot: 10, arrow_rain: 20,
    frenzy: 18, chi_strike: 12, iaijutsu: 15, samurai_guard: 10,
    shadow_blades: 14, healing_song: 16, thorn_lance: 12, nature_mend: 18,
    curse_bolt: 14, dark_wave: 20, enchanted_slash: 12, runic_guard: 10,
    summon_fang: 16, spirit_mend: 18, adaptive_strike: 18, forest_shot: 16,
    stone_guard: 10, feral_pounce: 16, rune_spark: 16, brutal_charge: 16,
    dirty_trick: 14, dragon_breath: 20, fairy_blessing: 16, earth_shaker: 20,
    abyss_bolt: 16, celestial_prayer: 20, venom_edge: 16, blizzard: 24,
    purifying_light: 24, master_arcane_burst: 30, master_prayer: 30,
    companion_mina_tunnel_breaker: 12, companion_mina_liberation_hammer: 16, companion_elena_star_projection: 18, companion_elena_void_projection: 20,
    companion_garm_ash_guard: 10, companion_garm_crownless_guard: 14, companion_shia_homecoming_song: 16, companion_shia_starsea_hymn: 18,
    companion_tio_second_hand: 14, companion_tio_epoch_break: 13, companion_rize_nightbloom_dew: 16,
    companion_rize_story_dreamlight: 18, companion_kai_skyhunt: 15, companion_kai_whitewing_hunt: 18, companion_noah_awakened_pulse: 14
  });
  const active = (id, name, category, scope, effect, description) => ({
    id, name, category, description,
    activation: { type: "active", cooldownTurns: activeCooldownTurns[id] },
    targeting: { scope },
    effects: [effect]
  });
  const damage = (multiplier, options) => Object.assign({
    type: "damage", damageType: "physical", multiplier, hits: 1,
    defensePenetration: 0, criticalBonus: 0
  }, options || {});
  const heal = (multiplier, target) => ({ type: "heal", target, scalingStat: "magicHealing", multiplier });
  const guard = { type: "guard", damageMultiplier: .5 };
  const passive = (id, name, effect, description) => ({
    id, name, category: "passive", description,
    activation: { type: "passive" }, targeting: { scope: "self" }, effects: [effect]
  });
  const reaction = (id, name, threshold, multiplier, description) => ({
    id, name, category: "reaction", description,
    activation: { type: "reaction", trigger: "hpBelow", threshold, limitPerEncounter: 1 },
    targeting: { scope: "self" },
    effects: [{ type: "heal", target: "self", scalingStat: "maxHp", multiplier, flatBonus: 0, useHealingModifiers: false }]
  });
  const statusReaction = (id, name, statusIds, description) => ({
    id, name, category: "reaction", description,
    activation: { type: "reaction", trigger: "statusApplied", statusIds: statusIds.slice(), limitPerEncounter: 1 },
    targeting: { scope: "self" },
    effects: [{ type: "cleanse", count: 1, statusIds: statusIds.slice() }]
  });

  const skills = {
    power_strike: active("power_strike", "強撃", "technique", "singleEnemy", damage(1.5), "威力150%の近接攻撃"),
    iron_guard: active("iron_guard", "鉄壁の構え", "technique", "self", guard, "次に受けるダメージを半減。大技予告へ反応した場合は、その大技まで構えを保持"),
    vital_strike: active("vital_strike", "急所突き", "technique", "singleEnemy", damage(1.1, { criticalBonus: .45 }), "会心率の高い攻撃"),
    twin_strike: active("twin_strike", "連撃", "technique", "singleEnemy", damage(.72, { hits: 2 }), "威力72%で2回攻撃"),
    fireball: active("fireball", "火球", "spell", "singleEnemy", damage(1.35, { damageType: "magic", defensePenetration: .65 }), "防御を65%無視する魔法攻撃。魔法に弱い敵にはさらに威力増加"),
    arcane_burst: active("arcane_burst", "魔力奔流", "spell", "allEnemies", damage(.82, { damageType: "magic", defensePenetration: .5 }), "防御を50%無視する全体魔法攻撃。魔法に弱い敵にはさらに威力増加"),
    heal: active("heal", "治癒", "healing", "lowestHpAlly", heal(1.55, "lowestHpAlly"), "傷ついた仲間1人を回復"),
    prayer: active("prayer", "癒やしの祈り", "healing", "allAllies", heal(.72, "allAllies"), "仲間全員を少量回復"),
    shield_bash: active("shield_bash", "盾撃", "technique", "singleEnemy", damage(1.25, { defensePenetration: .15 }), "守りを崩す威力125%の攻撃"),
    knight_guard: active("knight_guard", "騎士の守勢", "technique", "self", guard, "次に受けるダメージを半減"),
    aimed_shot: active("aimed_shot", "狙い撃ち", "technique", "singleEnemy", damage(1.35, { criticalBonus: .15 }), "会心率の高い威力135%の遠距離攻撃"),
    arrow_rain: active("arrow_rain", "矢の雨", "technique", "allEnemies", damage(.62), "敵全体へ矢を降らせる"),
    frenzy: active("frenzy", "狂乱撃", "technique", "singleEnemy", damage(.64, { hits: 3 }), "威力64%で3回攻撃"),
    last_fury: reaction("last_fury", "不屈の怒り", .5, .18, "HP半分未満で一度だけ最大HPの18%を回復"),
    chi_strike: active("chi_strike", "発勁", "technique", "singleEnemy", damage(1.4, { defensePenetration: .3 }), "防御を30%無視する威力140%の攻撃"),
    flowing_counter: passive("flowing_counter", "流水の構え", { type: "counter", chance: .28, multiplier: 1 }, "被弾後28%で即座に反撃"),
    iaijutsu: active("iaijutsu", "居合斬り", "technique", "singleEnemy", damage(1.7, { criticalBonus: .2 }), "会心率の高い威力170%の一閃"),
    samurai_guard: active("samurai_guard", "見切り", "technique", "self", guard, "次に受けるダメージを半減"),
    shadow_blades: active("shadow_blades", "影分身斬り", "technique", "singleEnemy", damage(.7, { hits: 2 }), "威力70%で2回攻撃"),
    smoke_counter: passive("smoke_counter", "煙返し", { type: "counter", chance: .35, multiplier: 1 }, "被弾後35%で即座に反撃"),
    battle_song: passive("battle_song", "戦歌", { type: "statMultiplier", target: "party", stat: "attack", multiplier: 1.2, stacking: "highest" }, "生存中、パーティ全体の物理攻撃力を1.2倍"),
    healing_song: active("healing_song", "癒やしの旋律", "healing", "allAllies", heal(.62, "allAllies"), "仲間全員を少量回復"),
    thorn_lance: active("thorn_lance", "茨の槍", "spell", "singleEnemy", damage(1.25, { damageType: "magic", defensePenetration: .4 }), "魔法防御を40%無視する自然魔法"),
    nature_mend: active("nature_mend", "森の治癒", "healing", "allAllies", heal(.68, "allAllies"), "自然の力で仲間全員を回復"),
    curse_bolt: active("curse_bolt", "呪詛弾", "spell", "singleEnemy", damage(1.45, { damageType: "magic", defensePenetration: .55 }), "魔法防御を55%無視する呪文"),
    dark_wave: active("dark_wave", "暗黒波", "spell", "allEnemies", damage(.88, { damageType: "magic", defensePenetration: .45 }), "敵全体を覆う暗黒魔法"),
    enchanted_slash: active("enchanted_slash", "魔装斬り", "spell", "singleEnemy", damage(1.35, { damageType: "magic", defensePenetration: .35 }), "魔力をまとった威力135%の斬撃"),
    runic_guard: active("runic_guard", "護りのルーン", "technique", "self", guard, "次に受けるダメージを半減"),
    summon_fang: active("summon_fang", "召喚・双牙", "spell", "singleEnemy", damage(.76, { damageType: "magic", hits: 2, defensePenetration: .3 }), "魔獣を呼び威力76%で2回攻撃"),
    spirit_mend: active("spirit_mend", "精霊の加護", "healing", "allAllies", heal(.72, "allAllies"), "精霊が仲間全員を回復"),
    adaptive_strike: active("adaptive_strike", "臨機の一撃", "technique", "singleEnemy", damage(1.25), "状況を見極めた威力125%の攻撃"),
    forest_shot: active("forest_shot", "森の導き", "technique", "singleEnemy", damage(1.2, { defensePenetration: .3 }), "防御を30%無視する攻撃"),
    stone_guard: active("stone_guard", "岩の守り", "technique", "self", guard, "次に受けるダメージを半減"),
    feral_pounce: active("feral_pounce", "獣の飛びかかり", "technique", "singleEnemy", damage(1.3, { criticalBonus: .15 }), "会心率の高い威力130%の攻撃"),
    lucky_counter: passive("lucky_counter", "幸運の切り返し", { type: "counter", chance: .22, multiplier: 1 }, "被弾後22%で即座に反撃"),
    rune_spark: active("rune_spark", "ルーン火花", "spell", "singleEnemy", damage(1.25, { damageType: "magic", defensePenetration: .4 }), "魔法防御を40%無視する魔法攻撃"),
    brutal_charge: active("brutal_charge", "猛進", "technique", "singleEnemy", damage(1.45), "力任せの威力145%の攻撃"),
    dirty_trick: active("dirty_trick", "不意打ち", "technique", "singleEnemy", damage(1.15, { criticalBonus: .35 }), "会心率の高い奇襲攻撃"),
    dragon_breath: active("dragon_breath", "竜の息吹", "spell", "allEnemies", damage(.7, { damageType: "magic", defensePenetration: .25 }), "敵全体を焼く竜の息吹"),
    fairy_blessing: active("fairy_blessing", "妖精の祝福", "healing", "allAllies", heal(.58, "allAllies"), "仲間全員を少量回復"),
    self_repair: reaction("self_repair", "自己修復", .5, .22, "HP半分未満で一度だけ最大HPの22%を回復"),
    earth_shaker: active("earth_shaker", "大地揺らし", "technique", "allEnemies", damage(.68), "怪力で敵全体を攻撃"),
    abyss_bolt: active("abyss_bolt", "深淵の矢", "spell", "singleEnemy", damage(1.4, { damageType: "magic", defensePenetration: .5 }), "魔法防御を50%無視する暗黒魔法"),
    celestial_prayer: active("celestial_prayer", "天上の祈り", "healing", "allAllies", heal(.78, "allAllies"), "仲間全員を回復"),
    undying_will: reaction("undying_will", "不滅の意志", .5, .25, "HP半分未満で一度だけ最大HPの25%を回復"),
    rear_protection: passive("rear_protection", "後方守護", { type: "rearProtection", multiplier: 2 / 3, stacking: "strongest" }, "生存中、自分より後ろの味方の被ダメージを2/3倍。同効果は重複しない"),
    battle_command: passive("battle_command", "戦陣の号令", { type: "statMultiplier", target: "party", stat: "attack", multiplier: 1.2, stacking: "highest" }, "生存中、パーティ全員の物理攻撃力を1.2倍。同効果は重複しない"),
    counter_stance: passive("counter_stance", "反撃の心得", { type: "counter", chance: .3, multiplier: 1 }, "ダメージを受けて生存すると30%で即座に物理反撃。反撃からの連鎖なし"),
    emergency_heal: reaction("emergency_heal", "生命の灯", .5, .2, "ダメージでHPが半分未満になると即座に最大HPの20%回復。毒・火傷でも発動し、1戦闘1回、戦闘不能時は発動しない"),
    instant_detox: statusReaction("instant_detox", "即時調薬", ["poison"], "毒を受けると即座に薬を調合して解除する。1戦闘1回"),
    venom_edge: active("venom_edge", "毒刃", "technique", "singleEnemy", damage(1.2, { criticalBonus: .1 }), "毒を塗った刃で攻撃し、敵を毒状態にする"),
    blizzard: active("blizzard", "吹雪", "spell", "allEnemies", damage(.7, { damageType: "magic", defensePenetration: .4 }), "敵全体への氷属性魔法。低確率で麻痺させる"),
    purifying_light: active("purifying_light", "浄化の光", "healing", "allAllies", heal(.82, "allAllies"), "仲間全員を回復し、状態異常を2つ解除"),
    master_rear_protection: passive("master_rear_protection", "鉄城の守護", { type: "rearProtection", multiplier: .5, stacking: "strongest" }, "生存中、自分より後ろの味方の被ダメージを1/2倍。同効果は最も強いものだけ有効"),
    master_counter_stance: passive("master_counter_stance", "刹那の反撃", { type: "counter", chance: .45, multiplier: 1 }, "ダメージを受けて生存すると45%で即座に物理反撃。反撃からの連鎖なし"),
    master_arcane_burst: active("master_arcane_burst", "大魔力奔流", "spell", "allEnemies", damage(1.05, { damageType: "magic", defensePenetration: .7 }), "防御を70%無視する威力105%の全体魔法攻撃"),
    master_prayer: active("master_prayer", "大いなる祈り", "healing", "allAllies", heal(1.05, "allAllies"), "仲間全員を通常より大きく回復")
  };

  const trait = (id, name, modifiers, description) => passive(id, name, { type: "combatModifier", modifiers }, description);
  Object.assign(skills, {
    companion_mina_earth_listener: trait("companion_mina_earth_listener", "地脈聴き", { incomingPhysical: .9, hitBonus: .04 }, "物理攻撃から受けるダメージを10%軽減し、命中率を4pt上げるミナ固有の技量"),
    companion_mina_tunnel_breaker: active("companion_mina_tunnel_breaker", "坑道崩し", "technique", "singleEnemy", damage(1.45, { defensePenetration: .3 }), "防御を30%無視する威力145%のミナ固有技"),
    companion_mina_liberation_hammer: active("companion_mina_liberation_hammer", "解縛の鍛槌", "technique", "singleEnemy", damage(1.72, { defensePenetration: .45 }), "防御を45%無視する威力172%の一撃。命令に縛られた機巧を解放した経験から生まれたミナの強化技"),
    companion_mina_machinist_oath: trait("companion_mina_machinist_oath", "機巧師の誓い", { outgoingPhysical: 1.08, incomingPhysical: .94 }, "物理攻撃の威力を1.08倍にし、物理から受けるダメージを6%軽減するミナの成長スキル"),
    companion_elena_lost_astrolabe: trait("companion_elena_lost_astrolabe", "欠け星の天球儀", { outgoingMagic: 1.12, hitBonus: .04 }, "魔法攻撃の威力を1.12倍にし、命中率を4pt上げるエレナ固有の星読み"),
    companion_elena_star_projection: active("companion_elena_star_projection", "星図投射", "spell", "allEnemies", damage(.72, { damageType: "magic", defensePenetration: .45, element: "arcane" }), "敵全体へ魔法防御を45%無視するエレナ固有の魔力攻撃"),
    companion_elena_void_projection: active("companion_elena_void_projection", "虚星図投射", "spell", "allEnemies", damage(.88, { damageType: "magic", defensePenetration: .58, element: "arcane" }), "消された星図を再構成し、敵全体へ魔法防御を58%無視するエレナの強化呪文"),
    companion_elena_living_history: trait("companion_elena_living_history", "生きた星史", { outgoingMagic: 1.1, hitBonus: .05 }, "自ら歩いた歴史を術式へ変え、魔法攻撃の威力を1.10倍、命中率を5pt上げるエレナの成長スキル"),
    companion_garm_last_bulwark: passive("companion_garm_last_bulwark", "最後の城壁", { type: "rearProtection", multiplier: .7, stacking: "strongest" }, "生存中、自分より後ろの味方が受けるダメージを70%にするガルム固有の守り"),
    companion_garm_ash_guard: active("companion_garm_ash_guard", "灰冠の守勢", "technique", "self", guard, "次に受けるダメージを半減するガルム固有技"),
    companion_garm_crownless_guard: active("companion_garm_crownless_guard", "無冠の守勢", "technique", "self", { type: "guard", damageMultiplier: .3 }, "王命ではなく仲間のために構え、次に受けるダメージを30%まで軽減するガルムの強化技"),
    companion_garm_living_bulwark: trait("companion_garm_living_bulwark", "今を守る城壁", { incomingPhysical: .9, incomingMagic: .94 }, "物理から受けるダメージを10%、魔法から受けるダメージを6%軽減するガルムの成長スキル"),
    companion_shia_tide_memory: trait("companion_shia_tide_memory", "潮の記憶", { healing: 1.14, incomingMagic: .94 }, "回復の効果を1.14倍にし、魔法から受けるダメージを6%軽減するシア固有の歌"),
    companion_shia_homecoming_song: active("companion_shia_homecoming_song", "帰港の歌", "healing", "allAllies", heal(.66, "allAllies"), "仲間全員を回復するシア固有の歌"),
    companion_shia_starsea_hymn: active("companion_shia_starsea_hymn", "星海帰名歌", "healing", "allAllies", heal(.82, "allAllies"), "仲間全員を回復し、状態異常を1つ解除するシアの強化歌"),
    companion_shia_true_name_chorus: trait("companion_shia_true_name_chorus", "真名の斉唱", { healing: 1.12, incomingMagic: .9 }, "回復の効果を1.12倍にし、魔法から受けるダメージを10%軽減するシアの成長スキル"),
    companion_tio_tomorrow_clock: trait("companion_tio_tomorrow_clock", "明日の時計", { criticalBonus: .04, evasionBonus: .05 }, "会心率を4pt、回避率を5pt上げるティオ固有の機構"),
    companion_tio_second_hand: active("companion_tio_second_hand", "秒針連撃", "technique", "singleEnemy", damage(.78, { hits: 2, criticalBonus: .12 }), "威力78%で2回攻撃するティオ固有技"),
    companion_tio_epoch_break: active("companion_tio_epoch_break", "刻環破り", "technique", "singleEnemy", damage(.72, { hits: 3, criticalBonus: .16, defensePenetration: .2 }), "威力72%で3回攻撃し、防御を20%無視するティオの強化技"),
    companion_tio_free_clock: trait("companion_tio_free_clock", "自由時の機構", { criticalBonus: .06, evasionBonus: .07, rearTargeting: .18 }, "会心率を6pt、回避率を7pt上げ、後列を狙いやすくするティオの成長スキル"),
    companion_rize_dream_keeper: trait("companion_rize_dream_keeper", "夢守の翅", { healing: 1.12, incomingMagic: .92 }, "回復の効果を1.12倍にし、魔法から受けるダメージを8%軽減するリゼ固有の加護"),
    companion_rize_nightbloom_dew: active("companion_rize_nightbloom_dew", "夜花の雫", "healing", "allAllies", heal(.7, "allAllies"), "夜花の雫で仲間全員を回復するリゼ固有の術"),
    companion_rize_story_dreamlight: active("companion_rize_story_dreamlight", "物語の夢灯", "healing", "allAllies", heal(.84, "allAllies"), "自分の物語を灯に変え、仲間全員を回復して状態異常を1つ解除するリゼの強化術"),
    companion_rize_own_tale: trait("companion_rize_own_tale", "夢守自身の物語", { healing: 1.1, outgoingMagic: 1.08 }, "回復の効果を1.10倍、魔法攻撃の威力を1.08倍にするリゼの成長スキル"),
    companion_kai_aurora_eye: trait("companion_kai_aurora_eye", "極光眼", { hitBonus: .08, rearTargeting: .35 }, "命中率を8pt上げ、後列を狙いやすくするカイ固有の眼力"),
    companion_kai_skyhunt: active("companion_kai_skyhunt", "天猟", "technique", "singleEnemy", damage(1.5, { defensePenetration: .25, criticalBonus: .18 }), "防御を25%無視する会心率の高いカイ固有技"),
    companion_kai_whitewing_hunt: active("companion_kai_whitewing_hunt", "白界穿ち", "technique", "singleEnemy", damage(1.75, { defensePenetration: .35, criticalBonus: .25 }), "白竜と見た地上を守るため、防御を35%無視する威力175%のカイの強化技"),
    companion_kai_earthward_eye: trait("companion_kai_earthward_eye", "地上を映す極光眼", { outgoingPhysical: 1.08, hitBonus: .06, rearTargeting: .2 }, "物理攻撃の威力を1.08倍、命中率を6pt上げ、後列をさらに狙いやすくするカイの成長スキル"),
    companion_noah_star_vessel: trait("companion_noah_star_vessel", "拒星の器", { outgoingMagic: 1.1, incomingMagic: .9 }, "魔法攻撃の威力を1.10倍にし、魔法から受けるダメージを10%軽減するノア固有の力"),
    companion_noah_northstar_pulse: {
      id: "companion_noah_northstar_pulse", name: "北辰の脈動", category: "spell",
      description: "星核の残響を解き放ち、敵全体へ魔法防御を55%無視する魔力属性攻撃を行うノア固有の呪文",
      activation: { type: "active", cooldownTurns: 16 }, targeting: { scope: "allEnemies" },
      effects: [{ type: "damage", damageType: "magic", multiplier: .92, hits: 1, defensePenetration: .55, criticalBonus: 0, element: "arcane" }]
    },
    companion_noah_awakened_pulse: active("companion_noah_awakened_pulse", "北辰星核の脈動", "spell", "allEnemies", damage(1.05, { damageType: "magic", defensePenetration: .65, element: "arcane" }), "取り戻した星核を解放し、敵全体へ魔法防御を65%無視するノア固有の強化呪文"),
    companion_noah_star_resolve: trait("companion_noah_star_resolve", "人としての星願", { outgoingMagic: 1.12, criticalBonus: .05 }, "魔法攻撃の威力を1.12倍にし、会心率を5pt上げるノアの成長スキル"),
    job_warrior_discipline: trait("job_warrior_discipline", "前衛の鍛錬", { incomingPhysical: .92 }, "物理攻撃から受けるダメージを8%軽減"),
    job_thief_opening: trait("job_thief_opening", "急所の見切り", { criticalBonus: .07, rearTargeting: .12 }, "会心率+7pt、後列への狙いやすさ上昇"),
    job_mage_focus: trait("job_mage_focus", "魔力収束", { outgoingMagic: 1.12 }, "魔法攻撃の威力を1.12倍"),
    job_cleric_devotion: trait("job_cleric_devotion", "献身の祈り", { healing: 1.15 }, "戦闘中に使う回復スキルの効果を1.15倍"),
    job_knight_fortress: trait("job_knight_fortress", "城壁の構え", { incomingPhysical: .88 }, "物理攻撃から受けるダメージを12%軽減"),
    job_ranger_eagle_eye: trait("job_ranger_eagle_eye", "鷹の目", { hitBonus: .07, rearTargeting: .3 }, "命中率+7pt、後列への狙いやすさが大きく上昇"),
    job_berserker_fury: trait("job_berserker_fury", "捨て身の猛威", { outgoingPhysical: 1.15, incomingPhysical: 1.06 }, "物理攻撃の威力を1.15倍にするが、物理被ダメージが1.06倍"),
    job_monk_flow: trait("job_monk_flow", "無拍子", { evasionBonus: .06 }, "回避率+6pt"),
    job_samurai_focus: trait("job_samurai_focus", "一刀専心", { outgoingPhysical: 1.08, criticalBonus: .05 }, "物理攻撃の威力を1.08倍、会心率+5pt"),
    job_ninja_shadow: trait("job_ninja_shadow", "影歩き", { evasionBonus: .08, rearTargeting: .22 }, "回避率+8pt、後列への狙いやすさ上昇"),
    job_bard_resonance: trait("job_bard_resonance", "共鳴する調べ", { healing: 1.08 }, "戦闘中に使う回復スキルの効果を1.08倍"),
    job_druid_cycle: trait("job_druid_cycle", "生命の循環", { outgoingMagic: 1.06, healing: 1.08 }, "魔法攻撃を1.06倍、回復スキルを1.08倍"),
    job_hexer_malediction: trait("job_hexer_malediction", "呪力増幅", { outgoingMagic: 1.14 }, "魔法攻撃の威力を1.14倍"),
    job_spellblade_dual: trait("job_spellblade_dual", "魔刃同調", { outgoingPhysical: 1.07, outgoingMagic: 1.07 }, "物理・魔法攻撃の威力を1.07倍"),
    job_summoner_pact: trait("job_summoner_pact", "精霊契約", { outgoingMagic: 1.08, healing: 1.08 }, "魔法攻撃と回復スキルの効果を1.08倍"),

    race_human_adapt: trait("race_human_adapt", "人の適応力", { outgoingPhysical: 1.04, outgoingMagic: 1.04 }, "物理・魔法攻撃の威力を1.04倍"),
    race_elf_senses: trait("race_elf_senses", "森人の感覚", { hitBonus: .03, evasionBonus: .03 }, "命中率と回避率+3pt"),
    race_dwarf_stoneblood: trait("race_dwarf_stoneblood", "石の血脈", { incomingPhysical: .9 }, "物理攻撃から受けるダメージを10%軽減"),
    race_beastkin_instinct: trait("race_beastkin_instinct", "狩猟本能", { criticalBonus: .06 }, "会心率+6pt"),
    race_halfling_luck: trait("race_halfling_luck", "小さき幸運", { evasionBonus: .06 }, "回避率+6pt"),
    race_gnome_runes: trait("race_gnome_runes", "ルーン思考", { outgoingMagic: 1.08 }, "魔法攻撃の威力を1.08倍"),
    race_orc_might: trait("race_orc_might", "荒野の剛力", { outgoingPhysical: 1.1 }, "物理攻撃の威力を1.10倍"),
    race_goblin_cunning: trait("race_goblin_cunning", "小鬼の狡知", { hitBonus: .03, criticalBonus: .04 }, "命中率+3pt、会心率+4pt"),
    race_dragonewt_scales: trait("race_dragonewt_scales", "竜鱗", { incomingMagic: .9 }, "魔法攻撃から受けるダメージを10%軽減"),
    race_fairy_wings: trait("race_fairy_wings", "魔力の翅", { outgoingMagic: 1.1, healing: 1.08 }, "魔法攻撃を1.10倍、回復スキルを1.08倍"),
    race_automaton_shell: trait("race_automaton_shell", "鋼殻機構", { incomingPhysical: .88 }, "物理攻撃から受けるダメージを12%軽減"),
    race_giantkin_force: trait("race_giantkin_force", "巨躯の圧力", { outgoingPhysical: 1.12, hitBonus: -.03 }, "物理攻撃を1.12倍にするが、命中率-3pt"),
    race_demonkin_arcana: trait("race_demonkin_arcana", "深魔の血", { outgoingMagic: 1.12 }, "魔法攻撃の威力を1.12倍"),
    race_celestial_grace: trait("race_celestial_grace", "天上の加護", { incomingMagic: .92, healing: 1.12 }, "魔法被ダメージを8%軽減し、回復スキルを1.12倍"),
    race_undead_body: trait("race_undead_body", "死なずの体", { incomingPhysical: .95, incomingMagic: .9 }, "物理被ダメージを5%、魔法被ダメージを10%軽減"),

    birth_common_resolve: trait("birth_common_resolve", "地道な心得", { outgoingPhysical: 1.02, outgoingMagic: 1.02 }, "物理・魔法攻撃の威力を1.02倍"),
    birth_guard_drill: trait("birth_guard_drill", "衛兵式受け身", { incomingPhysical: .96 }, "物理攻撃から受けるダメージを4%軽減"),
    birth_hunter_tracking: trait("birth_hunter_tracking", "追跡の勘", { hitBonus: .04 }, "命中率+4pt"),
    birth_arcane_lessons: trait("birth_arcane_lessons", "幼き魔術教育", { outgoingMagic: 1.06 }, "魔法攻撃の威力を1.06倍"),
    birth_sacred_care: trait("birth_sacred_care", "施療の作法", { healing: 1.08 }, "戦闘中に使う回復スキルの効果を1.08倍"),
    birth_noble_command: trait("birth_noble_command", "貴族の胆力", { incomingMagic: .96 }, "魔法攻撃から受けるダメージを4%軽減"),
    birth_mercenary_habit: trait("birth_mercenary_habit", "戦場慣れ", { outgoingPhysical: 1.05 }, "物理攻撃の威力を1.05倍"),
    birth_merchant_foresight: trait("birth_merchant_foresight", "危険察知", { evasionBonus: .03 }, "回避率+3pt"),
    birth_blacksmith_eye: trait("birth_blacksmith_eye", "武具の目利き", { incomingPhysical: .95 }, "物理攻撃から受けるダメージを5%軽減"),
    birth_scholar_theory: trait("birth_scholar_theory", "魔術理論", { outgoingMagic: 1.05 }, "魔法攻撃の威力を1.05倍"),
    birth_frontier_grit: trait("birth_frontier_grit", "辺境の粘り", { incomingPhysical: .96 }, "物理攻撃から受けるダメージを4%軽減"),
    birth_orphan_reflex: trait("birth_orphan_reflex", "生存反射", { evasionBonus: .04 }, "回避率+4pt"),
    birth_troupe_rhythm: trait("birth_troupe_rhythm", "旅の律動", { healing: 1.05 }, "戦闘中に使う回復スキルの効果を1.05倍"),
    birth_alchemist_measure: trait("birth_alchemist_measure", "精密調合", { outgoingMagic: 1.04, hitBonus: .02 }, "魔法攻撃を1.04倍、命中率+2pt"),
    birth_dragon_warding: trait("birth_dragon_warding", "竜災の備え", { incomingMagic: .93 }, "魔法攻撃から受けるダメージを7%軽減")
  });

  const element = (skillId, elementId) => { skills[skillId].effects.find(entry => entry.type === "damage").element = elementId; };
  const status = (skillId, statusId, chance, duration, potency) => {
    skills[skillId].effects.push({ type: "applyStatus", statusId, chance, duration, ...(potency == null ? {} : { potency }) });
  };
  const cleanse = (skillId, count, statusIds) => {
    skills[skillId].effects.push({ type: "cleanse", count, statusIds: statusIds || "all" });
  };

  const acquisition = (skillId, metric, operation, value, scope = "party") => {
    skills[skillId].effects.push({ type: "acquisitionModifier", metric, operation, value, scope, stacking: scope === "party" ? "uniqueSkill" : "personal" });
  };
  acquisition("birth_merchant_foresight", "gold", "multiplier", 1.08);
  acquisition("birth_merchant_foresight", "gold", "flat", 5);
  acquisition("birth_scholar_theory", "experience", "multiplier", 1.12, "self");
  acquisition("job_bard_resonance", "experience", "multiplier", 1.06);
  acquisition("race_halfling_luck", "qualityRate", "multiplier", 1.5);
  acquisition("job_ranger_eagle_eye", "itemRate", "multiplier", 1.12);
  acquisition("birth_frontier_grit", "explorationTime", "multiplier", .9);
  skills.birth_merchant_foresight.description += "。探索で得る金額をパーティ全体で1.08倍し、さらに5G加算";
  skills.birth_scholar_theory.description += "。自身の取得経験値を1.12倍";
  skills.job_bard_resonance.description += "。パーティ全員の取得経験値を1.06倍";
  skills.race_halfling_luck.description += "。探索で得る装備の上位品質付与率を1.50倍";
  skills.job_ranger_eagle_eye.description += "。アイテム獲得率を1.12倍";
  skills.birth_frontier_grit.description += "。探索時間を0.90倍";

  element("fireball", "fire"); status("fireball", "burn", .45, 3, .03);
  element("arcane_burst", "arcane");
  element("master_arcane_burst", "arcane");
  element("thorn_lance", "nature"); status("thorn_lance", "poison", .5, 3, .04);
  element("curse_bolt", "dark"); status("curse_bolt", "poison", .4, 3, .05);
  element("dark_wave", "dark");
  element("enchanted_slash", "arcane");
  element("summon_fang", "nature");
  element("rune_spark", "lightning"); status("rune_spark", "paralysis", .25, 1);
  element("dragon_breath", "fire"); status("dragon_breath", "burn", .35, 3, .03);
  element("abyss_bolt", "dark");
  status("venom_edge", "poison", .55, 3, .04);
  element("blizzard", "ice"); status("blizzard", "paralysis", .2, 1);
  cleanse("prayer", 1, "all");
  cleanse("nature_mend", 1, ["poison", "burn"]);
  skills.birth_dragon_warding.effects.push({ type: "slayer", familyId: "dragon", value: 1.1 });
  skills.birth_dragon_warding.description += "。竜分類への与ダメージ1.10倍";
  skills.race_celestial_grace.effects.push({ type: "slayer", familyId: "undead", value: 1.2 });
  skills.race_celestial_grace.description += "。不死分類への与ダメージ1.20倍";
  cleanse("spirit_mend", 1, "all");
  cleanse("companion_shia_starsea_hymn", 1, "all");
  cleanse("companion_rize_story_dreamlight", 1, "all");
  cleanse("master_prayer", 2, "all");
  cleanse("purifying_light", 2, "all");

  skills.fireball.description = "炎属性の魔法攻撃。45%で3ターンの火傷を付与";
  skills.thorn_lance.description = "自然属性の魔法攻撃。50%で3ターンの毒を付与";
  skills.rune_spark.description = "雷属性の魔法攻撃。25%で次ターン行動不能の麻痺を付与";
  skills.dragon_breath.description = "敵全体への炎属性攻撃。35%で3ターンの火傷を付与";
  skills.prayer.description = "仲間全員を回復し、それぞれの状態異常を1つ解除";
  skills.nature_mend.description = "仲間全員を回復し、毒または火傷を1つ解除";
  skills.spirit_mend.description = "仲間全員を回復し、それぞれの状態異常を1つ解除";
  skills.master_prayer.description = "仲間全員を大きく回復し、それぞれの状態異常を2つ解除";
  data.registry.entities("skills", skills);
})();
