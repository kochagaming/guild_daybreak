(function () {
  "use strict";

  const data = window.GameData = window.GameData || {};
  const recurringMissions = Object.freeze({
    version: 2,
    destinations: Object.freeze({
      login: Object.freeze({ page: "home", label: "ホームへ" }),
      departure: Object.freeze({ page: "party", view: "adventure", label: "出撃先へ" }),
      clear: Object.freeze({ page: "party", view: "adventure", label: "出撃先へ" }),
      facility_collect: Object.freeze({ page: "guild", label: "施設へ" }),
      shop_purchase: Object.freeze({ page: "shop", label: "商店へ" }),
      craft: Object.freeze({ page: "blacksmith", view: "craft", label: "製作へ" }),
      equipment_upgrade: Object.freeze({ page: "blacksmith", view: "upgrade", label: "強化へ" })
    }),
    groups: Object.freeze([
      {
        id: "daily", name: "日課依頼", eyebrow: "DAILY REQUEST",
        completion: { issuerCharacterId: "receptionist_rina", text: "今日の仕事は、これですべて帳面に収まりました。あとは帰る人を迎えるだけです。" },
        schedule: { type: "daily", resetHour: 0 },
        selection: { strategy: "random", count: 3, pinnedIds: ["login"] },
        missions: [
          { id: "login", trigger: "login", issuerCharacterId: "receptionist_rina", flavor: "帳場の灯を点けました。今日の最初の一頁だけ、一緒に開いてください。", completionFlavor: "おかえりなさい、マスター。今日の帳面に、最初の印をつけておきます。", title: "ギルドへ顔を出す", description: "今日、ギルドを訪れる。", target: 1, rewards: { gold: 0, materials: { guild_seal: 1 } } },
          { id: "departure", trigger: "departure", issuerCharacterId: "receptionist_rina", flavor: "空の椅子より、帰りを待つ椅子がある方が宿らしいです。誰かを送り出しましょう。", completionFlavor: "出発を記しました。次は、帰還の足音を待つ番です。", title: "冒険者を送り出す", description: "いずれかのパーティを1回出撃させる。", target: 1, rewards: { gold: 0, materials: { guild_seal: 1 } } },
          { id: "clear", trigger: "clear", issuerCharacterId: "receptionist_rina", flavor: "勝ち負けだけでなく、無事に扉を開けて戻った報告を一つください。", completionFlavor: "無事の報告、確かに受け取りました。この一頁は、次の旅の道標になります。", title: "探索を成功させる", description: "いずれかのダンジョンを1回攻略する。", target: 1, rewards: { gold: 0, materials: { guild_seal: 1 } } },
          { id: "facility_collect", trigger: "facility_collect", issuerCharacterId: "receptionist_rina", flavor: "働く場所は、受け取る人がいて初めて続きます。保管庫を見てきてください。", completionFlavor: "成果も現場の声も届きました。働く人たちへ、こちらから礼を伝えます。", title: "施設の成果を受け取る", description: "いずれかのギルド施設から生産物を1回受け取る。", target: 1, rewards: { gold: 0, materials: { guild_seal: 1 } } },
          { id: "shop_purchase", trigger: "shop_purchase", issuerCharacterId: "merchant_marta", flavor: "道具は棚で待つより、旅の泥をつけた方が長持ちするんだ。ひとつ選んでおくれ。", completionFlavor: "いい選び方だ。棚にあった時より、ずっと道具らしい顔をしてるよ。", title: "旅支度を整える", description: "商店または日替わり商品で装備を1点購入する。", target: 1, rewards: { gold: 0, materials: { guild_seal: 1 } } },
          { id: "craft", trigger: "craft", issuerCharacterId: "blacksmith_gregor", flavor: "炉は火を入れなきゃ鈍る。素材を一つ、使える形にして持っていけ。", completionFlavor: "火も鉄も応えたな。あとは持ち主が、こいつに戦い方を教える番だ。", title: "鍛冶屋へ依頼する", description: "鍛冶屋で武器または防具を1点製作する。", target: 1, rewards: { gold: 0, materials: { guild_seal: 1 } } }
        ]
      },
      {
        id: "weekly", name: "週間依頼", eyebrow: "WEEKLY REQUEST",
        completion: { issuerCharacterId: "receptionist_rina", text: "今週の報告を綴じました。皆の働きが、町の次の一週間を少しだけ軽くしてくれます。" },
        schedule: { type: "weekly", resetHour: 0 },
        selection: { strategy: "random", count: 2 },
        missions: [
          { id: "departures_5", variantGroup: "departure", trigger: "departure", issuerCharacterId: "receptionist_rina", flavor: "五つの出発時刻を帳面に空けました。帰還の印まで、同じ頁へ並べましょう。", completionFlavor: "五つの旅立ちが、五つの帰る場所を作りました。帳面の余白まで、いい週です。", title: "五度の旅立ち", description: "今週、パーティを合計5回出撃させる。", target: 5, rewards: { gold: 500, materials: { guild_seal: 2 } } },
          { id: "departures_10", variantGroup: "departure", trigger: "departure", issuerCharacterId: "receptionist_rina", flavor: "宿の扉が休む暇もない週になりそうです。十度とも、帰りの足音まで数えます。", completionFlavor: "十度の出発、すべて記しました。扉の蝶番まで誇らしそうに鳴っています。", title: "絶えない遠征", description: "今週、パーティを合計10回出撃させる。", target: 10, rewards: { gold: 1200, materials: { guild_seal: 3 } } },
          { id: "clears_3", variantGroup: "clear", trigger: "clear", issuerCharacterId: "road_warden_karl", flavor: "三つの道から確かな帰還報告があれば、古い街道図へ安全な線を引き直せる。", completionFlavor: "三本の線がつながった。これで旅人へ、噂ではなく道を教えられる。", title: "三つの帰還報告", description: "今週、ダンジョン探索を合計3回成功させる。", target: 3, rewards: { gold: 700, materials: { guild_seal: 2 } } },
          { id: "clears_7", variantGroup: "clear", trigger: "clear", issuerCharacterId: "road_warden_karl", flavor: "一度の勝利では道は変わらない。七つの報告で、人が歩ける地図にしてくれ。", completionFlavor: "七つの帰還が地図を塗り替えた。来週から、この道は恐れではなく行き先になる。", title: "踏破週間", description: "今週、ダンジョン探索を合計7回成功させる。", target: 7, rewards: { gold: 1500, materials: { guild_seal: 3 } } },
          { id: "facility_collections_4", trigger: "facility_collect", issuerCharacterId: "receptionist_rina", flavor: "四度見回れば、働く人の困り事も見えてきます。成果と一緒に声も持ち帰ってください。", completionFlavor: "四度分の成果を受け取りました。次の仕込みが始められると、皆が笑っていましたよ。", title: "仕事場を見回る", description: "今週、ギルド施設の生産物を合計4回受け取る。", target: 4, rewards: { gold: 800, materials: { guild_seal: 2 } } },
          { id: "shop_purchases_3", trigger: "shop_purchase", issuerCharacterId: "merchant_marta", flavor: "違う旅に同じ支度は通じないよ。三品選んで、誰がどう使うか見せておくれ。", completionFlavor: "三品とも行き先が見える選び方だ。商人として、こういう買い物は嬉しいね。", title: "三度の旅支度", description: "今週、商店で装備を合計3点購入する。", target: 3, rewards: { gold: 900, materials: { guild_seal: 2 } } },
          { id: "crafts_3", trigger: "craft", issuerCharacterId: "blacksmith_gregor", flavor: "三つ作れば、偶然の出来と腕の差が分かる。素材の癖を炉へ持ってこい。", completionFlavor: "三品とも違う音で冷えた。素材の癖は掴んだ、次はもっといい物にできる。", title: "炉へ託す三品", description: "今週、鍛冶屋で装備を合計3点製作する。", target: 3, rewards: { gold: 1000, materials: { guild_seal: 2 } } },
          { id: "upgrades_3", trigger: "equipment_upgrade", issuerCharacterId: "blacksmith_gregor", flavor: "使った傷を消すだけが鍛冶じゃない。三品、持ち主の戦い方へ研ぎ直してやる。", completionFlavor: "三品とも、傷が強さに変わった。次の戦いでは前より素直に応えるはずだ。", title: "三つの研ぎ直し", description: "今週、装備を合計3回強化する。", target: 3, rewards: { gold: 1100, materials: { guild_seal: 2 } } }
        ]
      }
    ])
  });
  data.registry.config("recurringMissions", recurringMissions);
})();
