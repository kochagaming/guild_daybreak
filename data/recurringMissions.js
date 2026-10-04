(function () {
  "use strict";

  const data = window.GameData = window.GameData || {};
  const recurringMissions = Object.freeze({
    version: 1,
    groups: Object.freeze([
      {
        id: "daily", name: "日課依頼", eyebrow: "DAILY REQUEST",
        schedule: { type: "daily", resetHour: 0 },
        selection: { strategy: "random", count: 3, pinnedIds: ["login"] },
        missions: [
          { id: "login", trigger: "login", title: "ギルドへ顔を出す", description: "今日、ギルドを訪れる。", target: 1, rewards: { gold: 0, materials: { guild_seal: 1 } } },
          { id: "departure", trigger: "departure", title: "冒険者を送り出す", description: "いずれかのパーティを1回出撃させる。", target: 1, rewards: { gold: 0, materials: { guild_seal: 1 } } },
          { id: "clear", trigger: "clear", title: "探索を成功させる", description: "いずれかのダンジョンを1回攻略する。", target: 1, rewards: { gold: 0, materials: { guild_seal: 1 } } },
          { id: "facility_collect", trigger: "facility_collect", title: "施設の成果を受け取る", description: "いずれかのギルド施設から生産物を1回受け取る。", target: 1, rewards: { gold: 0, materials: { guild_seal: 1 } } },
          { id: "shop_purchase", trigger: "shop_purchase", title: "旅支度を整える", description: "商店または日替わり商品で装備を1点購入する。", target: 1, rewards: { gold: 0, materials: { guild_seal: 1 } } },
          { id: "craft", trigger: "craft", title: "鍛冶屋へ依頼する", description: "鍛冶屋で武器または防具を1点製作する。", target: 1, rewards: { gold: 0, materials: { guild_seal: 1 } } }
        ]
      },
      {
        id: "weekly", name: "週間依頼", eyebrow: "WEEKLY REQUEST",
        schedule: { type: "weekly", resetHour: 0 },
        selection: { strategy: "random", count: 2 },
        missions: [
          { id: "departures_5", trigger: "departure", title: "五度の旅立ち", description: "今週、パーティを合計5回出撃させる。", target: 5, rewards: { gold: 500, materials: { guild_seal: 2 } } },
          { id: "departures_10", trigger: "departure", title: "絶えない遠征", description: "今週、パーティを合計10回出撃させる。", target: 10, rewards: { gold: 1200, materials: { guild_seal: 3 } } },
          { id: "clears_3", trigger: "clear", title: "三つの帰還報告", description: "今週、ダンジョン探索を合計3回成功させる。", target: 3, rewards: { gold: 700, materials: { guild_seal: 2 } } },
          { id: "clears_7", trigger: "clear", title: "踏破週間", description: "今週、ダンジョン探索を合計7回成功させる。", target: 7, rewards: { gold: 1500, materials: { guild_seal: 3 } } }
        ]
      }
    ])
  });
  data.registry.config("recurringMissions", recurringMissions);
})();
