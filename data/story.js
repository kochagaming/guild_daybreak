(function () {
  "use strict";

  const storyScenes = {
    prologue_opening: { id: "prologue_opening", name: "古い宿屋の看板", text: "町役場にも商会にも引き取られなかった古い宿を借り、受付台と掲示板だけの小さな冒険者ギルドを開いた。最初に扉を叩いたのは英雄ではなく、草原の道が途絶えて町のパンが尽きかけていると訴える粉屋だった。" },
    prologue_clear: { id: "prologue_clear", name: "最初の出発", text: "寄せ集めの装備を身につけた最初の仲間たちが草原へ出発した。マスターとリナが帳簿へ最初に用意したのは討伐数でも報酬額でもなく、帰還した一人ひとりの名を書く欄だった。" },
    roadside_opening: { id: "roadside_opening", name: "街道を塞ぐ群れ", text: "草原の狼、小川へ逸れた轍、峠の笛、止まった街道駅。別々に見えた異変を一本の道として調べるため、監察官カールと商人マルタを交えた最初の長期調査が始まった。" },
    roadside_clear: { id: "roadside_clear", name: "戻ってきた商隊", text: "商隊と避難者が町へ戻り、ギルドは正式な依頼仲介所として認められた。だが月牙狼が塞いでいた亀裂の奥から青い脈動が見つかり、街道の終点は地下の救助依頼へつながった。" },
    seal_opening: { id: "seal_opening", name: "地下の封鎖", text: "封鎖された坑道では、鉱夫を守るための機巧が届かない命令を待ち続け、救助路まで塞いでいた。壊して進むか、止め方を探すか。地底に残された人々の時間が迫る中、煤だらけの鍛冶師ミナがギルドへ助けを求めた。" },
    seal_clear: { id: "seal_clear", name: "星の扉", text: "最後の封鎖命令が止まり、救出された鉱夫と休むことを覚えた機巧が地上へ戻った。地脈祭壇の奥には星形の扉が残され、命令を送った王朝の時代へ続く、新たな問いが開いた。" },
    starfall_opening: { id: "starfall_opening", name: "星を繋ぐ灯火", text: "星形の石板と町に残る写本を重ねると、王朝滅亡の夜だけが同じ幅で切り取られていた。残された正史を読むのではなく、誰が何を消したのかを余白から確かめるため、古代遺跡への調査が始まった。" },
    starfall_clear: { id: "starfall_clear", name: "雷雲へ続く光の橋", text: "星環の中枢へ名の残らない作業者たちの印を返すと、雷雲の天文塔へ光の橋が伸びた。それは王朝の権威を示す道ではなく、各地から集めた力を運んだ仕組みの一部でもあった。" },
    observatory_clear: { id: "observatory_clear", name: "翼王が守った星図", text: "翼王が退いた天文塔で、各地の光が王都と遠い空へ集まる星図が動き出した。地図を所有するのではなく、歩いた者が異なる証言を書き足せる形で町へ持ち帰ることが、新しい遠征の始まりになった。" }
  };

  const storyChapters = [
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
      objective: "草原から月牙狼の巣まで、5つの本編ダンジョンを攻略する", entryRequirements: [],
      unlockText: "洞窟、燐鋼の剣・岩絹の法衣・坑道守りの盾を含む製作レシピ、150G、鉄鉱石×3",
      rewards: { gold: 150, materials: { iron_ore: 3, guild_seal: 1 } }
    },
    {
      id: "seal", order: 2, number: 2, title: "第2章：地下の封印", recommendedLevelRange: [7, 14],
      openingStoryId: "seal_opening", clearStoryId: "seal_clear",
      objective: "燐光の洞窟から地脈封印祭壇まで、5つの本編ダンジョンを攻略する", entryRequirements: [],
      unlockText: "古代遺跡、遺宝の細剣・霊灰の帳・古兵の篭手を含む製作レシピ、250G、魔石×1",
      rewards: { gold: 250, materials: { magic_stone: 1, guild_seal: 2 } }
    },
    {
      id: "starfall", order: 3, number: 3, title: "第3章：星を繋ぐ灯火", recommendedLevelRange: [14, 20],
      openingStoryId: "starfall_opening", clearStoryId: "starfall_clear",
      objective: "古代遺跡から星環の中枢まで、5つの本編ダンジョンを攻略する", entryRequirements: [],
      unlockText: "雷鳴の天文塔、彗星の導杖・雷羽の外套・星断ちの太刀を含む製作レシピ、400G、魔石×2、魔力の粉×4",
      rewards: { gold: 400, materials: { magic_stone: 2, arcane_dust: 4, guild_seal: 2 } }
    }
  ];
  window.GameData.registry.entities("storyScenes", storyScenes);
  window.GameData.registry.entityList("storyChapters", storyChapters);
})();
