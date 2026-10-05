(function () {
  "use strict";
  const data = window.GameData;

  // 名前、肩書、人物説明、標準画像は加入状態や施設での役割から独立した人物の身元。
  // 加入可能性は companionProfiles の有無で表し、ここへ joinable を重複保存しない。
  const storyCharacters = {
    mina: { id: "mina", name: "ミナ", title: "地脈を聴く鍛冶師", description: "封鎖された採掘場で機巧の声を追っていたドワーフ。壊れたものを見捨てず、地底の道を切り開く。", portraitId: "companion-mina" },
    elena: { id: "elena", name: "エレナ", title: "欠け星の書記", description: "月碑の書庫で失われた星図を読み続けていたエルフ。記録にない道を自分の足で確かめようとする。", portraitId: "companion-elena" },
    garm: { id: "garm", name: "ガルム", title: "灰冠最後の盾", description: "滅びた灰冠王国の命令を守り続けていた騎士。過去の王ではなく、今を生きる者の盾になると決めた。", portraitId: "companion-garm" },
    shia: { id: "shia", name: "シア", title: "失われた潮歌", description: "沈んだ記録院の声を歌として覚えていた獣人の吟遊詩人。消された航路と名前を地上へ持ち帰る。", portraitId: "companion-shia" },
    tio: { id: "tio", name: "ティオ", title: "明日を数える機巧", description: "止まった砂の都で同じ一日を数え続けた機巧人。初めて訪れた明日の意味を知るため旅に加わる。", portraitId: "companion-tio" },
    rize: { id: "rize", name: "リゼ", title: "夜花の夢守", description: "黒樹海で他者の記憶を守ってきた妖精。森の外へ出て、消えていく物語を自分の言葉で残そうとする。", portraitId: "companion-rize" },
    kai: { id: "kai", name: "カイ", title: "極光を越えた巡礼者", description: "雷雪の山脈で星路を見張っていた竜人の狩人。空から来る災いを追い、守るべき地上を探している。", portraitId: "companion-kai" },
    noah: { id: "noah", name: "ノア", title: "眠れる星の器", description: "北天星墓の揺籃で目覚め、奪われた星核を追ってギルドに同行する。", portraitId: "companion-noah" },
    receptionist_rina: { id: "receptionist_rina", name: "リナ", title: "受付係", description: "依頼、募集、帰還報告を取りまとめるギルドの受付係。今起きている出来事を冒険者へつなぐ。" },
    inn_cook: { id: "inn_cook", name: "ベルタ", title: "宿の料理番", description: "古い宿の台所を預かる料理番。帰る場所の温かさを、鍋と小言で守っている。" },
    town_child: { id: "town_child", name: "ネネ", title: "町の子ども", description: "宿の掲示板と冒険者の土産話を誰より楽しみにしている町の子ども。" },
    miller_judit: { id: "miller_judit", name: "ユーディト", title: "粉屋", description: "町外れの水車小屋を営む粉屋。ギルドへ最初の正式な依頼を持ち込む。" },
    merchant_marta: { id: "merchant_marta", name: "マルタ", title: "荷馬車商", description: "街道を知り尽くした商人。宿の一角を店棚として借り、冒険者へ旅支度を融通する。" },
    road_warden_karl: { id: "road_warden_karl", name: "カール", title: "街道監察官", description: "町役場から派遣された街道監察官。剣より足跡と証言を信じ、第一章の調査に同行する。" },
    blacksmith_gregor: { id: "blacksmith_gregor", name: "グレゴール", title: "町鍛冶", description: "農具から旅装まで直す町鍛冶。持ち帰った素材の癖を読み、古い馬房へ炉を据える。" },
    archivist_else: { id: "archivist_else", name: "エルゼ", title: "記録司書", description: "閉鎖された町文庫の整理を続けていた司書。依頼書、証言、図鑑を資料室へ編み直す。" },
    brigand_rolf: { id: "brigand_rolf", name: "ロルフ", title: "峠のならず者", description: "峠で商隊を襲っていた一団の若者。追い詰められた末に、街道駅の真相を語る。" },
    stationmaster_johann: { id: "stationmaster_johann", name: "ヨハン", title: "街道駅の駅務長", description: "朽ちた街道駅に残り、逃げ込んだ旅人たちを守っていた駅務長。" },
    merchant_etta: { id: "merchant_etta", name: "エッダ", title: "若い荷馬車商", description: "途絶えた商隊の一員。危険を知らせるため、荷札と記録を街道へ残した。" },
    foreman_oskar: { id: "foreman_oskar", name: "オスカー", title: "坑道頭", description: "青い鉱石と地下の異変を追う坑道頭。街道の事件を次の章へ結ぶ。" },
    copyist_cecil: { id: "copyist_cecil", name: "セシル", title: "町の写本師", description: "古い写本の欠落を調べ、消された星の歴史を追う写本師。" },
    refugee_frieda: { id: "refugee_frieda", name: "フリーダ", title: "灰の国の避難民", description: "灰に覆われた故郷から逃れ、残された暮らしを語る避難民。" },
    fisher_nils: { id: "fisher_nils", name: "ニルス", title: "老漁師", description: "海の潮目と失われた航路を覚えている老漁師。" },
    caravan_zara: { id: "caravan_zara", name: "ザラ", title: "砂路の隊商主", description: "時の止まった砂漠を往来してきた隊商の主。" },
    herbalist_olga: { id: "herbalist_olga", name: "オルガ", title: "森辺の薬師", description: "黒樹海の草木と、森で失われた人々の名を知る薬師。" },
    pilgrim_hein: { id: "pilgrim_hein", name: "ハイン", title: "山麓の巡礼者", description: "雷雪の山脈を仰ぎ、途絶えた巡礼路の再開を願う旅人。" },
    watcher_lutz: { id: "watcher_lutz", name: "ルッツ", title: "町の鐘守", description: "空の異変を鐘楼から見続ける町の鐘守。" },
    dreamer_irma: { id: "dreamer_irma", name: "イルマ", title: "夢を失った旅人", description: "黒い月の夜から夢を見なくなった旅人。" },
    woodcutter_bram: { id: "woodcutter_bram", name: "ブラム", title: "木樵", description: "原初の森の境を知り、変わった木々の声を伝える木樵。" },
    boatman_ren: { id: "boatman_ren", name: "レン", title: "渡し守", description: "星海へ続く水路で旅人を渡してきた船頭。" },
    astronomer_adel: { id: "astronomer_adel", name: "アデル", title: "王都の天文官", description: "北天の星墓と王都の記録を照らし合わせる天文官。" },
    refugee_marek: { id: "refugee_marek", name: "マレク", title: "旧王都の住民", description: "帰れない王都の街並みを今も鮮明に覚える住民。" },
    bell_keeper_anna: { id: "bell_keeper_anna", name: "アンナ", title: "町の鐘楼守", description: "星なき夜にも時刻と帰還を告げ続ける鐘楼守。" }
  };

  data.registry.entities("storyCharacters", storyCharacters);
})();
