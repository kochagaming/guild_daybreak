(function () {
  "use strict";
  const data = window.GameData = window.GameData || {};
  const set = (id, name, description, itemIds, twoPieceSkillId, threePieceSkillId) => ({
    id, name, description, itemIds, bonuses: [
      { count: 2, skillId: twoPieceSkillId },
      { count: 3, skillId: threePieceSkillId }
    ]
  });
  const equipmentSets = Object.fromEntries([
    set("windtrail_craft", "風渡りの旅装", "草原で集めた素材から生まれた、軽やかな旅支度。", ["greenwood_staff", "windrunner_vest", "hornstring_bow"], "set_windtrail_2", "set_windtrail_3"),
    set("glowdeep_craft", "燐光坑道の備え", "暗い坑道を互いの灯で進むための装具。", ["glowsteel_sword", "silkweave_robe", "delver_shield"], "set_glowdeep_2", "set_glowdeep_3"),
    set("ancient_echo_craft", "古代兵の残響", "失われた兵と祈り手の技を一つに束ねる遺装。", ["relic_rapier", "soul_veil", "grave_gauntlets"], "set_ancient_echo_2", "set_ancient_echo_3"),
    set("starfall_craft", "星落ちの旅装", "天文塔に残った星と嵐の力を呼び合わせる装具。", ["comet_staff", "stormcloak", "astral_katana"], "set_starfall_2", "set_starfall_3"),
    set("ashcrown_craft", "熾火王冠の旅装", "灰の街道と燃える王冠を越えた職人たちの装具。", ["dawn_rapier", "ember_bulwark", "ashweave_mantle"], "set_ashcrown_2", "set_ashcrown_3"),
    set("mirrortide_craft", "鏡潮の祭具", "凍てた潮と深海の祈りを一つに結んだ祭具。", ["tideglass_bow", "frostseal_robe", "abyssal_gauntlets"], "set_mirrortide_2", "set_mirrortide_3"),
    set("timewheel_craft", "時環の遺装", "砂時計の迷宮で失われた時を刻み直す装具。", ["chronoglass_rapier", "brasswall_shield", "memory_robe"], "set_timewheel_2", "set_timewheel_3"),
    set("moonbriar_craft", "月棘の巡礼装", "黒森の月明かりと聖棘を編み込んだ巡礼者の装具。", ["moonleaf_bow", "thornplate_gauntlets", "nightbloom_robe"], "set_moonbriar_2", "set_moonbriar_3"),
    set("thunderpeak_craft", "雷雪峰の武装", "凍てた峰を渡り、雷雲へ挑む者のための武装。", ["thundersteel_katana", "cloudweave_mantle", "aurora_staff"], "set_thunderpeak_2", "set_thunderpeak_3"),
    set("blackwing_craft", "黒翼星城の遺装", "落ちた空城に残る黒翼と星蝕の力を束ねた装具。", ["starpiercer_rapier", "blackwing_plate", "eclipse_staff"], "set_blackwing_2", "set_blackwing_3"),
    set("moonprison_craft", "月牢の夢装", "黒月の牢で夢と記憶を守るために編まれた装具。", ["moonchain_katana", "dreamweave_robe", "jailer_shield"], "set_moonprison_2", "set_moonprison_3"),
    set("firstroot_craft", "始原樹の狩装", "古い森の根と星の芽吹きを受け継ぐ狩人の装具。", ["originwood_bow", "starroot_staff", "ancestor_leather"], "set_firstroot_2", "set_firstroot_3"),
    set("starsea_craft", "星海航路の装具", "沈んだ星の道を読み、深潮を渡る者の装具。", ["starsea_rapier", "abyssal_robe", "navigator_gauntlet"], "set_starsea_2", "set_starsea_3"),
    set("northstar_craft", "北辰星器の重装", "眠る星器を守り、北辰の竜へ挑む者の重装。", ["northstar_katana", "aurora_heavy", "vessel_shield"], "set_northstar_2", "set_northstar_3"),
    set("skykey_craft", "星蝕天鍵の装具", "帰らずの都で星蝕の門を開くために鍛えられた装具。", ["eclipse_sword", "starveil_cloth", "skykey_gauntlet"], "set_skykey_2", "set_skykey_3"),
    set("firstlight_craft", "始光星座の装具", "名もなき夜の終わりに、始まりの光を結ぶ装具。", ["heavensplit_rapier", "firstlight_robe", "constellation_leather"], "set_firstlight_2", "set_firstlight_3"),
    set("afterstar_craft", "星後境界の旅装", "星の物語を越え、まだ名のない境界を歩く者の旅装。", ["aftersea_staff", "horizon_rapier", "watcher_robe"], "set_afterstar_2", "set_afterstar_3")
  ].map(entry => [entry.id, entry]));
  data.registry.entities("equipmentSets", equipmentSets);
})();
