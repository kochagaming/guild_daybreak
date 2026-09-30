(function () {
  "use strict";
  window.GameData.recruitment = {
    version: 2, matchChance: .8,
    pricing: {
      base: 30,
      roundTo: 5,
      abilityBaselines: { hp: 45, attack: 8, defense: 6 },
      abilityWeights: { hp: 1, attack: 6, defense: 5 },
      jobCosts: {
        warrior: 25, thief: 20, mage: 30, cleric: 25,
        knight: 40, ranger: 35, berserker: 45, monk: 35,
        samurai: 55, ninja: 60, bard: 48, druid: 52,
        hexer: 75, spellblade: 80, summoner: 75
      },
      raceCosts: {
        human: 0, elf: 10, dwarf: 12, beastkin: 15,
        halfling: 18, gnome: 22, orc: 28, goblin: 16,
        dragonewt: 40, fairy: 42, automaton: 42, giantkin: 48,
        demonkin: 58, celestial: 60, undead: 55
      }
    },
    postingCost: {
      itemId: "guild_seal",
      baseQuantity: 1,
      quantityPerSelection: 1,
      brackets: [
        { maximumSelections: 1, applicants: [2, 4] },
        { maximumSelections: 3, applicants: [3, 5] },
        { maximumSelections: 4, applicants: [4, 5] }
      ]
    },
    fields: [
      { id: "jobId", name: "希望職業", table: "jobs", unlockAfter: null, condition: "最初から指定できます" },
      { id: "raceId", name: "希望種族", table: "races", unlockAfter: "roadside", condition: "第1章：草原攻略で指定可能" },
      { id: "birthId", name: "希望の生まれ", table: "births", unlockAfter: "seal", condition: "第2章：洞窟攻略で指定可能" },
      { id: "focus", name: "希望の得意分野", table: "recruitmentTalents", unlockAfter: "starfall", condition: "第3章：古代遺跡攻略で指定可能" }
    ],
    nameCultures: {
      japanese: "日本風", german: "ドイツ風", chinese: "中国風", english: "英米風", russian: "ロシア風"
    },
    names: {
      male: {
        japanese: ["レン", "ハル", "ソウ", "リク", "カイト", "ユウト", "ナオキ", "タクミ", "ケント", "シン"],
        german: ["ハンス", "フリッツ", "カール", "オットー", "クラウス", "ヨハン", "ルッツ", "グスタフ", "エーリヒ", "フランツ"],
        chinese: ["ウェイ", "ハオ", "ジュン", "レイ", "タオ", "ミン", "ロン", "チェン", "シャン", "ユエン"],
        english: ["ジョン", "ジェイ", "エリック", "ロイド", "ケイン", "ノア", "リアム", "ルーク", "オーウェン", "ディーン"],
        russian: ["イワン", "ボリス", "ユーリ", "レフ", "ミハイル", "ニコライ", "アレク", "パベル", "セルゲイ", "ワジム"]
      },
      female: {
        japanese: ["アオイ", "ミオ", "ユイ", "リン", "サクラ", "ヒナ", "ナナ", "ミサキ", "カエデ", "アカリ"],
        german: ["エマ", "ハイジ", "クララ", "イルゼ", "リーゼ", "グレタ", "ヘルガ", "エルザ", "フリーダ", "マルタ"],
        chinese: ["メイ", "リンファ", "ラン", "リー", "シュエ", "シャオ", "ユエ", "チン", "フェイ", "ニン"],
        english: ["エミリー", "ソフィア", "アリス", "リリー", "ケイト", "ルーシー", "メアリ", "クロエ", "エイミー", "グレース"],
        russian: ["アンナ", "ニーナ", "イリナ", "オルガ", "ナディア", "ターニャ", "ミラ", "カーチャ", "ラーダ", "ゾーヤ"]
      }
    }
  };
  window.GameData.recruitmentTalents = {
    hardy: { id: "hardy", name: "頑健", description: "基礎HPに+3。応募時の能力値に反映済み。", bonus: { hp: 3 } },
    striker: { id: "striker", name: "攻撃が得意", description: "基礎攻撃に+1。応募時の能力値に反映済み。", bonus: { attack: 1 } },
    steady: { id: "steady", name: "守りが得意", description: "基礎防御に+1。応募時の能力値に反映済み。", bonus: { defense: 1 } }
  };
  window.GameData.recruitment.fields.filter(field => field.unlockAfter).forEach(field => {
    const chapter = window.GameData.storyChapters.find(chapter => chapter.id === field.unlockAfter);
    if (chapter) chapter.unlockText += `、${field.name}の指定`;
  });
  const additions = {
    roadside: "新しい職業4種・種族4種・生まれ3種の募集候補",
    seal: "新しい職業4種・種族4種・生まれ4種の募集候補",
    starfall: "上級職業3種・希少種族3種・特殊な生まれ3種の募集候補"
  };
  Object.entries(additions).forEach(([chapterId, text]) => {
    const chapter = window.GameData.storyChapters.find(chapter => chapter.id === chapterId);
    if (chapter) chapter.unlockText += `、${text}`;
  });
})();
