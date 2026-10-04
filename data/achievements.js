(function () {
  "use strict";

  const data = window.GameData = window.GameData || {};
  const achievements = [
    { id: "first_contract", category: "仲間", icon: "♙", name: "最初の契約", description: "冒険者を1人雇用する。", condition: { type: "characters", target: 1 } },
    { id: "busy_lobby", category: "仲間", icon: "♟", name: "賑わう宿", description: "冒険者を10人雇用する。", condition: { type: "characters", target: 10 } },
    { id: "grand_roster", category: "仲間", icon: "♛", name: "百戦の名簿", description: "冒険者を30人雇用する。", condition: { type: "characters", target: 30 } },
    { id: "six_companions", category: "仲間", icon: "⚑", name: "六人の旅支度", description: "6人編成のパーティを組む。", condition: { type: "partyMembers", target: 6 } },

    { id: "first_footprint", category: "遠征", icon: "◇", name: "最初の足跡", description: "ダンジョンを1か所攻略する。", condition: { type: "dungeonClears", target: 1 } },
    { id: "long_road", category: "遠征", icon: "◆", name: "長い道の先へ", description: "ダンジョンを25か所攻略する。", condition: { type: "dungeonClears", target: 25 } },
    { id: "story_midpoint", category: "遠征", icon: "✦", name: "物語の折り返し", description: "本編を8章まで達成する。", condition: { type: "chapters", target: 8 } },
    { id: "starless_night", category: "遠征", icon: "★", name: "星なき夜を越えて", description: "本編15章を達成する。", condition: { type: "chapters", target: 15 } },
    { id: "afterstar_wayfarer", category: "遠征", icon: "✺", name: "星後を歩く者", description: "星後領域を1章踏破する。", condition: { type: "postgameChapters", target: 1 } },
    { id: "five_reaches_wedge", category: "遠征", icon: "✥", name: "五界を分かつ楔", description: "五界喰らいの巣を攻略する。", secret: true, condition: { type: "specificDungeonClear", dungeonId: "five_reaches_nest", target: 1 } },
    { id: "hidden_path", category: "遠征", icon: "⌁", name: "脇道の向こう", description: "任意攻略のダンジョンを1か所踏破する。", condition: { type: "optionalClears", target: 1 } },
    { id: "unmapped_frontier", category: "遠征", icon: "⌖", name: "地図なき辺境", description: "任意攻略のダンジョンを6か所踏破する。", condition: { type: "optionalClears", target: 6 } },
    { id: "divine_threshold", category: "遠征", icon: "☼", name: "神域の門", description: "神域難易度を1か所攻略する。", condition: { type: "divineClears", target: 1 } },
    { id: "divine_pilgrim", category: "遠征", icon: "☀", name: "神域を歩む者", description: "神域難易度を10か所攻略する。", condition: { type: "divineClears", target: 10 } },

    { id: "first_hunt", category: "調査", icon: "⚔", name: "初討伐", description: "モンスターを1種類討伐する。", condition: { type: "monsterSpecies", target: 1 } },
    { id: "monster_scholar", category: "調査", icon: "◎", name: "魔物研究家", description: "モンスターを30種類討伐する。", condition: { type: "monsterSpecies", target: 30 } },
    { id: "hundred_hunt", category: "調査", icon: "†", name: "百体討伐", description: "モンスターを累計100体討伐する。", condition: { type: "monsterDefeats", target: 100 } },
    { id: "item_collector", category: "調査", icon: "▣", name: "収集家の棚", description: "アイテムを30種類発見する。", condition: { type: "itemTypes", target: 30 } },
    { id: "archive_keeper", category: "調査", icon: "▤", name: "書庫を満たす者", description: "アイテムを100種類発見する。", condition: { type: "itemTypes", target: 100 } },
    { id: "first_complete_set", category: "調査", icon: "▦", name: "三つ揃いの旅装", description: "装備組合せを1系統、全品発見する。", condition: { type: "equipmentSetCompletions", target: 1 } },
    { id: "set_curator", category: "調査", icon: "▥", name: "組合せを知る者", description: "装備組合せを4系統、全品発見する。", condition: { type: "equipmentSetCompletions", target: 4 } },
    { id: "first_travel_memory", category: "調査", icon: "☷", name: "旅の途中で", description: "同行者の知らなかった一面を記録する。", secret: true, condition: { type: "companionMemories", target: 1 } },
    { id: "shared_travel_memory", category: "調査", icon: "♙", name: "二人だけの歩幅", description: "二人の同行者が交わした旅の記憶を記録する。", secret: true, condition: { type: "companionPairMemories", target: 1 } },
    { id: "travel_memory_keeper", category: "調査", icon: "❖", name: "道程を綴る者", description: "異なる旅の記憶を12篇集める。", secret: true, condition: { type: "companionMemories", target: 12 } },
    { id: "four_travel_bonds", category: "調査", icon: "♜", name: "交わる四つの道", description: "同行の縁を4組結ぶ。", secret: true, condition: { type: "companionBonds", target: 4 } },
    { id: "eight_travel_bonds", category: "調査", icon: "✣", name: "旅路は一つではない", description: "同行の縁を8組結ぶ。", secret: true, condition: { type: "companionBonds", target: 8 } },
    { id: "all_route_signs", category: "調査", icon: "⌘", name: "道は戦場だけではない", description: "すべての種類の道中の出来事を記録する。", secret: true, condition: { type: "routeEventEncounters", target: "all" } },
    { id: "all_rumors_confirmed", category: "調査", icon: "☷", name: "噂を地図へ変える", description: "すべての種類の道中の噂を、実地で確かめる。", secret: true, condition: { type: "routeRumorConfirmations", target: "all" } },
    { id: "field_guide_complete", category: "調査", icon: "✥", name: "旅支度の集大成", description: "すべての道中知見を仲間へ共有する。", secret: true, condition: { type: "routeEventMasteries", target: "all" } },
    { id: "first_team_survey", category: "調査", icon: "結", name: "重なる足跡", description: "異なる得意分野を持つ冒険者たちが、初めて連携探索を行う。", secret: true, condition: { type: "teamSurveys", target: 1 } },
    { id: "ten_team_surveys", category: "調査", icon: "図", name: "皆で描いた地図", description: "連携探索を十度記録する。", secret: true, condition: { type: "teamSurveys", target: 10 } },
    { id: "sealed_chest_scholar", category: "調査", icon: "▧", name: "鉄と星の開錠録", description: "すべての封印箱について、開け方を仲間へ共有する。", secret: true, condition: { type: "treasureTierMasteries", target: "all" } },
    { id: "ultra_rare", category: "調査", icon: "✧", name: "名を持つ逸品", description: "超レア称号を持つ装備を1個手に入れる。", condition: { type: "ultraRareOwned", target: 1 } },
    { id: "growing_guild", category: "調査", icon: "⌂", name: "育つ仕事場", description: "ギルド施設を合計6回強化する。", condition: { type: "facilityUpgrades", target: 6 } }
  ];
  data.registry.entityList("achievements", achievements);
})();
