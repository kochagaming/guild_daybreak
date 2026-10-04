(function () {
  "use strict";

  const data = window.GameData = window.GameData || {};
  const routeSpecialistSuccesses = data.config.explorationEvents.personalPractice.successes;
  const completeFieldSpecialtyCount = data.config.explorationEvents.routeEvents.length + 1;
  data.registry.entityList("adventurerMilestones", [
    { id: "first_sortie", icon: "◇", name: "初陣の記章", description: "初めての遠征から帰還した証。", condition: { type: "record", field: "sorties", minimum: 1 } },
    { id: "ten_sorties", icon: "⌁", name: "馴染みの旅装", description: "幾度も同じ門をくぐった者の記録。", condition: { type: "record", field: "sorties", minimum: 10 } },
    { id: "fifty_sorties", icon: "◆", name: "遠路の記章", description: "長い遠征の積み重ねを刻んだ証。", condition: { type: "record", field: "sorties", minimum: 50 } },
    { id: "familiar_companion", icon: "握", name: "馴染みの同行章", description: "同じ仲間と五度の遠征を歩き、互いの歩幅を覚えた証。", condition: { type: "sharedSorties", minimum: 5 } },
    { id: "longtime_companion", icon: "結", name: "二十路の結び章", description: "同じ仲間と二十度の遠征を重ね、長い道を共にした証。", condition: { type: "sharedSorties", minimum: 20 } },
    { id: "ten_victories", icon: "⚑", name: "十勝の飾緒", description: "十度の攻略を成し遂げた者へ贈られる。", condition: { type: "record", field: "victories", minimum: 10 } },
    { id: "hundred_encounters", icon: "⚔", name: "百戦の留め金", description: "数多くの戦闘を越えた旅装の留め金。", condition: { type: "record", field: "encounterClears", minimum: 100 } },
    { id: "first_route_success", icon: "路", name: "先導の小章", description: "戦いの外で初めて仲間の道を拓いた証。", condition: { type: "record", field: "routeSuccesses", minimum: 1 } },
    { id: "ten_route_successes", icon: "⌖", name: "十路の羅針章", description: "十度の道中の難所を解いた探索者の証。", condition: { type: "record", field: "routeSuccesses", minimum: 10 } },
    { id: "first_team_survey_personal", icon: "結", name: "連携の小章", description: "仲間と得意分野を持ち寄り、初めて連携探索へ加わった証。", condition: { type: "record", field: "teamSurveys", minimum: 1 } },
    { id: "ten_team_surveys_personal", icon: "図", name: "十図の記章", description: "十度の連携探索へ加わり、仲間と地図を描いた証。", condition: { type: "record", field: "teamSurveys", minimum: 10 } },
    { id: "hidden_passage_specialist", icon: "⌘", name: "隠し道の記章", description: "隠し道を五度見つけ、仲間を先導した探索者の証。", condition: { type: "routeEventRecord", routeEventId: "hidden_passage", minimum: routeSpecialistSuccesses } },
    { id: "sheltered_camp_specialist", icon: "♨", name: "野営の記章", description: "安全な野営地を五度整え、一行の休息を支えた証。", condition: { type: "routeEventRecord", routeEventId: "sheltered_camp", minimum: routeSpecialistSuccesses } },
    { id: "unstable_footing_specialist", icon: "△", name: "足場渡りの記章", description: "危険な足場を五度導き、一行を無事に渡した証。", condition: { type: "routeEventRecord", routeEventId: "unstable_footing", minimum: routeSpecialistSuccesses } },
    { id: "forgotten_inscription_specialist", icon: "文", name: "碑文解読の記章", description: "忘れられた碑文を五度読み解き、過去の知恵を持ち帰った証。", condition: { type: "routeEventRecord", routeEventId: "forgotten_inscription", minimum: routeSpecialistSuccesses } },
    { id: "material_traces_specialist", icon: "採", name: "採取の記章", description: "素材の痕跡を五度追い、実りある採取へ導いた証。", condition: { type: "routeEventRecord", routeEventId: "material_traces", minimum: routeSpecialistSuccesses } },
    { id: "ancient_ward_specialist", icon: "環", name: "守護陣の記章", description: "古い守護陣を五度起動し、一行を災いから守った証。", condition: { type: "routeEventRecord", routeEventId: "ancient_ward", minimum: routeSpecialistSuccesses } },
    { id: "enemy_tracks_specialist", icon: "跡", name: "追跡の記章", description: "魔物の進路を五度読み、一行へ先手をもたらした証。", condition: { type: "routeEventRecord", routeEventId: "enemy_tracks", minimum: routeSpecialistSuccesses } },
    { id: "first_sealed_chest", icon: "▣", name: "開錠の小章", description: "初めて堅い錠や魔法封印を解いた証。", condition: { type: "record", field: "treasureOpenings", minimum: 1 } },
    { id: "ten_sealed_chests", icon: "✧", name: "十鍵の記章", description: "十の宝箱を開き、帰還袋を満たした者の証。", condition: { type: "record", field: "treasureOpenings", minimum: 10 } },
    { id: "three_field_specialties", icon: "羅", name: "多芸の記章", description: "三つの異なる道中の役目で、仲間に頼られるまで経験を重ねた証。", condition: { type: "specialtyCount", minimum: 3 } },
    { id: "all_field_specialties", icon: "星", name: "探索者の大記章", description: "あらゆる道中の難所と封印箱に通じた探索者の証。", condition: { type: "specialtyCount", minimum: completeFieldSpecialtyCount } },
    { id: "damage_ten_thousand", icon: "✦", name: "破城の痕", description: "積み重ねた一撃が大きな力となった証。", condition: { type: "record", field: "damageDealt", minimum: 10000 } },
    { id: "healing_five_thousand", icon: "✚", name: "命守りの記章", description: "仲間の命を幾度も繋いだ者の証。", condition: { type: "record", field: "healingDone", minimum: 5000 } },
    { id: "endurance_three_thousand", icon: "♜", name: "不落の傷章", description: "苛烈な攻撃を受けながら立ち続けた証。", condition: { type: "record", field: "bestEndurance", minimum: 3000 } },
    { id: "fifty_critical_hits", icon: "◎", name: "見切りの記章", description: "好機を逃さぬ一撃を重ねた者の証。", condition: { type: "record", field: "criticalHits", minimum: 50 } },
    { id: "hundred_victories", icon: "★", name: "百勝の星章", description: "百度の攻略を成し遂げた冒険者の大記録。", condition: { type: "record", field: "victories", minimum: 100 } }
  ]);
})();
