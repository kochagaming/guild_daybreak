(function () {
  "use strict";

  window.GameData.storyScenes = {
    prologue_opening: { id: "prologue_opening", name: "古い宿屋の看板", text: "古い宿屋に、ギルドの看板を掛けた。受付係リナが最初の依頼書を差し出す。『街道を歩く人たちが困っています。まずは仲間を迎えて、草原へ出発しましょう。』" },
    prologue_clear: { id: "prologue_clear", name: "最初の出発", text: "リナは出発した仲間たちを見送り、作業台を整えた。『帰ったら、持ち帰った素材で防具を作ってみましょう。』" },
    roadside_opening: { id: "roadside_opening", name: "街道を塞ぐ群れ", text: "街道の魔物は、ただ迷い込んだだけではなかった。狼の群れが商隊を追い立てている。『群れのボスを倒せば、途絶えた洞窟への道が開きます。装備と仲間を整えましょう。』" },
    roadside_clear: { id: "roadside_clear", name: "戻ってきた商隊", text: "商隊が街へ戻った。鉱夫から渡された地図には、洞窟の奥に不自然な封鎖が描かれている。ギルドは初めて、街の人々に名前を覚えてもらった。" },
    seal_opening: { id: "seal_opening", name: "地下の封鎖", text: "鉱夫たちを追い払っていたのは、古いゴーレムだった。『硬い守りには防御を無視する技が有効です。倒して、採掘場の封印を調べてください。』" },
    seal_clear: { id: "seal_clear", name: "星の扉", text: "ゴーレムの奥には、星をかたどった扉があった。拾った石板を読んだリナは、失われた王朝の遺跡を指す。『私たちの小さなギルドにも、次の仕事ができましたね。』" },
    starfall_opening: { id: "starfall_opening", name: "星を繋ぐ灯火", text: "石板が示すのは、遺跡と山頂の天文塔を結ぶ星の道だった。リナは二枚の依頼書を広げる。『攻略隊には番人を。もう一組には装備を整える素材集めをお願いしましょう。星の道が開けば、雷雲の上に進めます。』" },
    starfall_clear: { id: "starfall_clear", name: "雷雲へ続く光の橋", text: "番人の祭壇に灯火を掲げると、山頂へ光の橋が伸びた。『街道を守るところから、ここまで来たんですね。』雷鳴の向こうに、星図を抱く翼の王が待っている。" },
    observatory_clear: { id: "observatory_clear", name: "翼王が守った星図", text: "嵐を纏う翼王が退くと、天文塔の星図が静かに回り始めた。そこには王朝の滅亡で途切れた道と、さらに遠い土地へ延びる光が記されていた。リナは写しを抱え、『これは依頼ではなく、私たち自身が選ぶ次の旅ですね』と笑った。" }
  };

  window.GameData.storyChapters = [
    {
      id: "prologue", order: 0, number: 0, title: "序章：新米ギルド", recommendedLevelRange: [1, 1],
      openingStoryId: "prologue_opening", clearStoryId: "prologue_clear",
      objective: "冒険者を1人以上雇用し、草原へ初めて出発する",
      entryRequirements: [{ type: "characters", minimum: 1 }, { type: "departure" }],
      unlockText: "若木の祈杖・風走りの胴着・角弦の弓のレシピ、製作の準備金50G、獣の皮×2、粘液×1",
      rewards: { gold: 50, materials: { beast_hide: 2, slime_gel: 1, guild_seal: 1 } }
    },
    {
      id: "roadside", order: 1, number: 1, title: "第1章：街道の異変", recommendedLevelRange: [1, 7],
      openingStoryId: "roadside_opening", clearStoryId: "roadside_clear",
      objective: "風鳴りの草原を攻略する（全戦闘を突破）", entryRequirements: [],
      unlockText: "洞窟、燐鋼の剣・岩絹の法衣・坑道守りの盾を含む製作レシピ、150G、鉄鉱石×3",
      rewards: { gold: 150, materials: { iron_ore: 3, guild_seal: 1 } }
    },
    {
      id: "seal", order: 2, number: 2, title: "第2章：地下の封印", recommendedLevelRange: [7, 14],
      openingStoryId: "seal_opening", clearStoryId: "seal_clear",
      objective: "燐光の洞窟を攻略する（全戦闘を突破）", entryRequirements: [],
      unlockText: "古代遺跡、遺宝の細剣・霊灰の帳・古兵の篭手を含む製作レシピ、250G、魔石×1",
      rewards: { gold: 250, materials: { magic_stone: 1, guild_seal: 2 } }
    },
    {
      id: "starfall", order: 3, number: 3, title: "第3章：星を繋ぐ灯火", recommendedLevelRange: [14, 20],
      openingStoryId: "starfall_opening", clearStoryId: "starfall_clear",
      objective: "星喰らいの古代遺跡を攻略する（全戦闘を突破）", entryRequirements: [],
      unlockText: "雷鳴の天文塔、彗星の導杖・雷羽の外套・星断ちの太刀を含む製作レシピ、400G、魔石×2、魔力の粉×4",
      rewards: { gold: 400, materials: { magic_stone: 2, arcane_dust: 4, guild_seal: 2 } }
    }
  ];
})();
