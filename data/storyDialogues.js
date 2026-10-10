(function () {
  "use strict";

  const data = window.GameData;
  const scripts = {};
  const storyCharacter = id => {
    const entry = data.storyCharacters[id];
    return entry ? { speakerId: id, speakerName: entry.name, speakerRole: entry.title } : { speakerId: id, speakerName: id, speakerRole: "町の人" };
  };
  const actors = {
    rina: storyCharacter("receptionist_rina"),
    owner: { speakerId: "guild_leader", speakerName: "マスター", speakerRole: "依頼と帰還を預かる者" },
    cook: storyCharacter("inn_cook"), child: storyCharacter("town_child"),
    marta: storyCharacter("merchant_marta"), karl: storyCharacter("road_warden_karl"),
    gregor: storyCharacter("blacksmith_gregor"), else: storyCharacter("archivist_else"),
    rolf: storyCharacter("brigand_rolf"), johann: storyCharacter("stationmaster_johann"),
    etta: storyCharacter("merchant_etta"), oskar: storyCharacter("foreman_oskar")
  };
  const witnesses = {
    prologue: storyCharacter("miller_judit"),
    roadside: actors.marta,
    seal: actors.oskar,
    starfall: storyCharacter("copyist_cecil"),
    ember_crown: storyCharacter("refugee_frieda"),
    mirror_tide: storyCharacter("fisher_nils"),
    clockwork_desert: storyCharacter("caravan_zara"),
    blackwood_pilgrimage: storyCharacter("herbalist_olga"),
    thunder_snow_peaks: storyCharacter("pilgrim_hein"),
    falling_sky_castle: storyCharacter("watcher_lutz"),
    black_moon_prison: storyCharacter("dreamer_irma"),
    primordial_forest: storyCharacter("woodcutter_bram"),
    starsea_corridor: storyCharacter("boatman_ren"),
    northern_star_tomb: storyCharacter("astronomer_adel"),
    returnless_capital: storyCharacter("refugee_marek"),
    end_of_starless_night: storyCharacter("bell_keeper_anna")
  };
  const chapterCompanions = {
    seal: "mina", starfall: "elena", ember_crown: "garm", mirror_tide: "shia",
    clockwork_desert: "tio", blackwood_pilgrimage: "rize", thunder_snow_peaks: "kai",
    falling_sky_castle: "elena", black_moon_prison: "tio", primordial_forest: "rize",
    starsea_corridor: "shia", northern_star_tomb: "noah", returnless_capital: "garm",
    end_of_starless_night: "noah"
  };
  const chapterMotifs = {
    roadside: {
      opening: "街道で途絶えたのは荷車だけではない。町の食卓、職人の注文、遠くの家族へ送る手紙まで、一本の道の向こうで止まっていた。",
      question: "狼を追い払って道が静かになっても、群れを街道へ押し出した理由が残れば同じことが起きる。敵の数より、普段と変わったものを探そう。",
      discovery: "痕跡は一つずつなら小さい。だが、杭、轍、火の跡を道の順に並べると、誰かが獣と人を同じ方向へ動かしている。",
      return: "荷車の鈴が町へ戻っても、街道が元通りになったとは限らない。人の手で変えられた跡を、次の道まで追いかけよう。"
    },
    seal: {
      opening: "坑道の機巧は、壊れた獣のように暴れているのではなかった。届かなくなった命令を、暗闇の中で今も待ち続けていた。",
      question: "刃を向ける前に、誰の命令を守っているのか確かめたい。止めることと壊すことは、同じじゃない。",
      discovery: "古い歯車の傷には、命令へ逆らって鉱夫を逃がした跡がある。機巧にも、最後に選んだ動きが残っている。",
      return: "地下から持ち帰ったのは鉱石より、命令が途切れた後にも残った選択だ。次の扉も、力だけでは開かないだろう。"
    },
    starfall: {
      opening: "切り取られた頁と欠けた碑文は、王朝が失った歴史ではなく、誰かが残したくなかった歴史の輪郭を作っていた。",
      question: "書かれていることだけを繋げれば、消した者の物語になる。空白がどこにあるかも地図へ記そう。",
      discovery: "星図の欠けは損傷ではない。同じ方角へ続く線だけが選んで削られている。隠された先には、まだ道がある。",
      return: "灯した星路は王朝の所有物ではない。帰る場所を探す者なら、誰でも読める地図として宿へ残そう。"
    },
    ember_crown: {
      opening: "灰の国では、滅びた王の命令だけが民より長く生き残っていた。城門を守る盾の向こうに、帰る家を失った人々がいる。",
      question: "王冠を奪うことが目的じゃない。古い忠誠が、今を生きる誰を傷つけているのか見極めよう。",
      discovery: "灰の下には略奪の跡ではなく、民を逃がすために開けられた通路がある。裏切りと呼ばれた者が、最後まで国を守っていた。",
      return: "王命が終わっても、灰の国に暮らす人は残る。次に守るものを選び直した者の名を、王の名より大きく書こう。"
    },
    mirror_tide: {
      opening: "白い海岸へ打ち上がる品には、持ち主の名だけがなかった。波は沈んだ人々の記憶を磨きながら、何度も地上へ返している。",
      question: "海の歌を魔物の誘いと決めつけない。誰の名を呼んでいるのか、言葉が消える前に聞き取ろう。",
      discovery: "鏡の潮は姿ではなく、忘れられた名前へ反応している。戦いの音を止めれば、歌の続きが聞こえるはずだ。",
      return: "海から戻した名を帳簿の戦果には数えない。一人ずつ声に出して、地上にいた証として残そう。"
    },
    clockwork_desert: {
      opening: "砂の都では同じ夕暮れが何度も繰り返され、住民は失った人と別れないために、明日そのものを閉じ込めていた。",
      question: "時計を動かせば救えるとは限らない。止まった一日の中で、彼らが何を手放せずにいるのか確かめよう。",
      discovery: "重なった日付の傷は故障の記録ではなく、同じ朝を覚え続けた者の証だ。進むには、忘れる以外の方法が要る。",
      return: "明日は昨日を捨てることではない。覚えたまま次の一日へ進めると、都の時計が初めて教えてくれた。"
    },
    blackwood_pilgrimage: {
      opening: "黒い森の眠りは呪いであると同時に、壊れそうな夢を守る避難所でもあった。目覚めさせるだけでは、救いにならない者もいる。",
      question: "眠りを敵と決める前に、誰の夢を何から守っているのか聞こう。朝を選ぶのは、目覚める本人であるべきだ。",
      discovery: "夢の小瓶には同じ景色が一つもない。森が奪ったのではなく、持ち主が預けた記憶まで混ざっている。",
      return: "空になった瓶は失敗の印ではない。持ち主へ夢が帰った証として、朝の光が入る窓辺へ並べよう。"
    },
    thunder_snow_peaks: {
      opening: "雷雪の峰を守る巡礼者たちは、空から来る災いを見張るうちに、足元で変わり続ける地上を知らなくなっていた。",
      question: "門を閉ざす理由だけでなく、門の向こうで何を守ろうとしたのかを問おう。答えは山頂ではなく、歩いてきた道にある。",
      discovery: "雪に埋もれた足跡は外へ向かっている。侵入者を拒む門の内側から、誰かが地上を知ろうとしていた。",
      return: "見張るだけでは守れないものがある。山で得た答えを、雪のない町でどう使うかまで見届けよう。"
    },
    falling_sky_castle: {
      opening: "落ちてくるように見えた空の城は、地上を狙っていたのではない。背後から迫る黒い月を避け、傷ついた翼で逃げ続けていた。",
      question: "砲口が地上を向いていても、城を敵と決めるのは早い。何から逃げ、何を差し出せるのか、交渉の余地を探そう。",
      discovery: "攻城兵器の照準は町ではなく黒月へずれている。城の者も、同じ脅威を見ているのかもしれない。",
      return: "勝者と敗者ではなく、互いに残した約束を書こう。取引で開いた道は、剣で奪った地図より壊れやすい。"
    },
    black_moon_prison: {
      opening: "黒月では時刻の代わりに記憶が燃え、囚人は昨日を失うことで今日を与えられていた。静かな牢ほど、消えた声が多い。",
      question: "心核を壊せば牢も消えるが、中で燃えている記憶まで戻らない。止める順番を間違えないよう、失われる声を数えよう。",
      discovery: "壁の傷は日数ではなく、忘れた名前の数だ。残っている順番を辿れば、心核へ届くまでの猶予が分かる。",
      return: "取り戻せなかった朝は、残った者が語り直せる。失った記憶を無かったことにせず、互いの言葉で補い続けよう。"
    },
    primordial_forest: {
      opening: "始原の森には文字より古い約束が根として残り、王朝の記録にない声が大地の下で今も息をしていた。",
      question: "読めないものを空白と呼ばない。筆を置いて、森がどんな形で記憶を渡すのか待とう。",
      discovery: "根の脈動は侵入を拒む怒りではなく、返されなかった代価を求める合図だ。古い取引を探せば戦いを終えられる。",
      return: "最初の物語は本へ閉じ込めず、森へ返したまま残そう。私たちは読んだ者ではなく、聞いた者として記録する。"
    },
    starsea_corridor: {
      opening: "地下の星海は空の写しではなかった。王朝が星と呼んだ力は、ここから汲み上げられ、地上の夜へ運ばれていた。",
      question: "心珠を戦利品にすれば海そのものが枯れる。流れを止めずに向きを変える方法を、歌と記録から探そう。",
      discovery: "古い帰還節は道順ではなく潮の動かし方を歌っている。失われた拍子を戻せば、星海が自ら出口を示す。",
      return: "海が示した道を所有してはいけない。次に渡る者も潮を読めるよう、歌と拍子を分けずに残そう。"
    },
    northern_star_tomb: {
      opening: "北天の墓で眠る器たちは、目覚める前から役目と番号を与えられていた。その一人だけが、夢の中で自分の名を選んでいる。",
      question: "器に戻せば力は得られる。けれど本人の名を失うなら、それは救出ではない。ノアが選ぶまで答えを急がない。",
      discovery: "棺に刻まれた番号の下へ、幼い筆跡で名前が書き足されている。器たちは眠る前から、役目とは別の自分を持っていた。",
      return: "選び直した名前を最初に記そう。星核の力より先に、その力を誰が使うと決めたのかを忘れないために。"
    },
    returnless_capital: {
      opening: "帰らずの王都には玉座を待つ亡霊と、王の帰還をもう望まない生者が同じ城壁の内側で暮らしていた。",
      question: "王都を取り戻すという言葉は誰のためのものか。玉座ではなく、今日ここで暮らす人々へ答えを聞こう。",
      discovery: "閉ざされた門の内側から、毎朝新しい生活の跡が増えている。滅びた都ではなく、名を変えつつある町だ。",
      return: "取り戻した力を古い王座へ返さず、今を生きる者へ結び直した。その選択こそ王都から持ち帰るべき記録だ。"
    },
    end_of_starless_night: {
      opening: "最後の天門へ並んだ者たちは、予言に選ばれた英雄ではない。それぞれの土地で過去を選び直し、同じ宿へ帰ると決めた仲間だった。",
      question: "世界を救うという大きな言葉で、八人の望みを一つにまとめない。それぞれが終わらせたい夜を聞いてから扉を開こう。",
      discovery: "空の主が集めた力には、これまで出会った土地の記憶が混ざっている。断ち切るだけでなく、一つずつ持ち主へ返す道がある。",
      return: "星なき夜が終わっても、宿の朝はいつも通り始まる。大きな結末の後にも届く小さな依頼を、同じ机で受け取ろう。"
    }
  };

  const setting = text => ({ kind: "setting", text });
  const narration = text => ({ kind: "narration", text });
  const dialogue = (actor, text) => ({ kind: "dialogue", ...actor, text });
  const companion = id => {
    const entry = data.storyCharacters[id];
    return entry ? { speakerId: id, speakerName: entry.name, speakerRole: entry.title } : actors.rina;
  };
  const resolvedScene = id => Object.assign({}, data.storyScenes[id], data.relations.storySceneOverlays[id] || {});
  const add = (sceneId, blocks) => {
    if (!data.storyScenes[sceneId]) return;
    scripts[sceneId] = { sceneId, blocks };
  };

  add("prologue_opening", [
    setting("雨上がりの朝。長く空き家だった宿の食堂には、磨き切れない古傷と、まだ木の匂いがする新しい掲示板が並んでいた。"),
    narration("軋む扉の上へ、冒険者ギルドの看板が掛けられた。立派な紋章も、大勢の英雄もいない。あるのは借りた机と、帳簿と、これから名前を書き込む余白だけだった。"),
    dialogue(actors.rina, "看板、少し右です。……そこ。これで道の向こうからでも読めます。たぶん、ですけど。"),
    dialogue(actors.cook, "昨夜まで雨漏りの桶を置いてた場所が受付台になるとはね。客が来なくても、鍋だけは焦がさないでおくよ。"),
    narration("最初に扉を叩いたのは、鎧を着た英雄ではなかった。粉で白くなった前掛けを握る、町外れの粉屋ユーディトだった。"),
    dialogue(witnesses.prologue, "草原の道が塞がれて、麦を運ぶ荷車が三日も戻りません。大きな依頼料は出せないけれど……あの道が閉じたままでは、町のパンが先になくなります。"),
    dialogue(actors.owner, "依頼を預かります。まず、帰ってこられる仲間を集めましょう。"),
    dialogue(actors.rina, "はい。最初の一枚は目立つ場所へ――と言いたいところですが、掲示板の前に荷箱が届いています。"),
    narration("話を聞いていたように、半開きの扉から赤茶色の髪の商人が顔を出した。背後の荷車には、鞘に入った剣や旅靴、包帯の箱が隙間なく積まれている。"),
    dialogue(actors.marta, "届いたんじゃなくて、道が危なくて先へ行けないの。私はマルタ。空いている壁を貸してくれるなら、店が動けるまで冒険者の旅支度をここで売らせて。"),
    dialogue(actors.rina, "依頼書の隣が値札だらけになりますよ。……でも、何も持たずに草原へ行かせるよりは良さそうです。マスター、棚を一つ貸しましょう。"),
    dialogue(actors.owner, "決まりだ。マルタは道具を、私たちは道を取り戻す。互いに帰ってきた時の場所も、ここに作ろう。"),
    narration("依頼書の横へ、小さな店棚が並んだ。小さなギルドの最初の仕事は、世界を救うことではなく、町の朝食と一本の街道を守ることから始まった。")
  ]);

  add("prologue_clear", [
    setting("出発の朝。宿の前には、寄せ集めの装備を身につけた冒険者と、見送りに来た町の人々が集まっていた。"),
    narration("立派とは言えない一隊だった。それでも、掲示板から依頼書を外して歩き出す背中は、昨日まで空っぽだった宿に確かな役目を与えた。"),
    dialogue(actors.child, "ねえ、本当に魔物をやっつけてくるの？　帰ってきたら、草原の向こうの話を聞かせて。"),
    dialogue(actors.cook, "土産話の前に全員で帰っておいで。冷めた煮込みでも、帰らない連中には食べさせられないからね。"),
    dialogue(actors.marta, "道中の記録袋と、拾った物を入れる麻袋。どちらも代金は帰ってからでいいわ。空のまま返すのは禁止よ。"),
    dialogue(actors.rina, "マルタ、それでは贈り物です。……けれど助かります。勝敗にかかわらず、見たものを記して持ち帰ってください。"),
    dialogue(actors.owner, "最初の約束は、勝つことではなく帰ることにしよう。行ってらっしゃい。"),
    narration("一隊が角を曲がって見えなくなっても、リナはしばらく戸口に立っていた。やがて受付へ戻り、帰還者の名を書く欄を、帳簿に人数分だけ用意した。")
  ]);

  add("roadside_opening", [
    setting("最初の一隊が草原へ向かう朝、宿の前には灰色の外套を着た男が立っていた。胸元には、町役場の街道監察章が光っている。"),
    dialogue(actors.karl, "街道監察官カールだ。町長から、新設ギルドが問題を増やさないか見届けろと言われた。私は君たちの仲間ではない。現場と報告書が食い違えば、遠慮なく止める。"),
    dialogue(actors.rina, "歓迎の言葉としては、ずいぶん固いですね。ですが、街道の古い記録を持つ人が同行してくれるなら助かります。"),
    dialogue(actors.karl, "同行ではない。監察だ。草原の狼を何頭倒しても、商隊が戻らなければ仕事を果たしたことにはならん。"),
    dialogue(actors.marta, "その点だけは賛成。私の仲間は荷車ごと消えたの。魔物退治の数ではなく、轍の行き先を見つけて。"),
    dialogue(actors.owner, "ならば目的は同じだ。カールは事実を、マルタは街道の癖を、私たちは現地を確かめる。得た情報は必ずここへ持ち帰る。"),
    narration("カールは返事の代わりに地図を広げ、草原、小川、峠、街道駅、そして月牙狼の巣へ細い線を引いた。疑い深い監察官の鉛筆が、第1章の道筋を初めて一枚につないだ。")
  ]);

  add("meadow_opening", [
    setting("町門を出ると、風鳴りの草原は一面の銀緑に波打っていた。美しい景色とは裏腹に、街道には新しい車輪の跡が一つもない。"),
    dialogue(actors.karl, "三日前までは、日の出ごとに二台は通った。静かすぎる。狼が居着いたなら、鳥まで消える理由がない。"),
    dialogue(actors.marta, "荷車は風上を通るわ。獣に匂いを拾われにくいから。南の轍ばかり見ていたら、何も見つからない。"),
    dialogue(actors.karl, "商人の勘か。"),
    dialogue(actors.marta, "何度も無事に帰った人間の知恵よ。役所の地図よりは、今日の道を知ってる。"),
    dialogue(actors.owner, "両方確かめよう。古い道筋と、いま使われている道筋。違いがあれば、そこに何かがある。"),
    narration("冒険者たちは二手に分かれず、互いの姿が見える距離で草をかき分けた。初めての探索は、敵を探すより先に、消えた日常の跡を探すことから始まった。")
  ]);

  add("meadow_discovery", [
    setting("草原の中央で、土へ斜めに打ち込まれた黒い杭が見つかった。表面には獣の毛が絡み、先端だけが不自然に街道の外を向いている。"),
    dialogue(actors.karl, "牧童が狼を遠ざけるための忌避杭だ。古い型だが、町でも使う。これだけなら事件とは言えない。"),
    dialogue(actors.marta, "遠ざける？　向きが逆よ。これは獣を街道から追い払うんじゃない。街道へ追い込むように並べてある。"),
    dialogue(actors.karl, "……確かに、風下側だけ煤が新しい。誰かが置き直したのか。"),
    dialogue(actors.marta, "私の御者なら、こんな場所で荷を止めない。轍が小川へ逸れた理由は、この先にあるわ。"),
    narration("カールは杭を引き抜かず、角度と間隔を帳面へ写した。先ほどまで『商人の勘』と呼んでいた話の横へ、彼は初めて『有力』と記した。")
  ]);

  add("meadow_clear", [
    setting("草原から戻った夜、宿の長机には黒い杭と欠けた刃が並べられた。鉄臭さに気づいた大柄な男が、食事の盆を置いて足を止める。"),
    dialogue(actors.karl, "町の備品台帳に、この杭はない。野盗の仕事にしては数が多く、同じ長さに切りそろえられている。"),
    dialogue(actors.gregor, "そいつは武器じゃない。荷箱の留め金を延ばして尖らせた粗仕事だ。炉を急いで使った痕がある。十本や二十本じゃ済まんだろう。"),
    dialogue(actors.rina, "グレゴールさん。農具の修理を頼んだ時は、冒険者の仕事には関わらないと言っていませんでしたか。"),
    dialogue(actors.gregor, "関わる気はないさ。ただ、こんな鉄屑を証拠の隣に積まれたら鍛冶屋として眠れん。裏の馬房を片づけろ。拾った武具と素材を持ってくれば、直すか作り直すか見てやる。"),
    dialogue(actors.owner, "炉と作業台はこちらで用意する。代わりに、この杭を作った炉の癖も探してほしい。"),
    dialogue(actors.gregor, "交渉成立だ。明日の朝には火を入れる。まずはその欠けた刃から、鉄がどこを通ってきたか聞いてみよう。"),
    narration("古い馬房の窓に、夜遅くまで橙色の火が揺れた。ギルドに鍛冶屋が開かれ、黒い杭の向こうにある小川へ、新しい調査の道が続いた。")
  ]);

  add("whispering_brook_opening", [
    setting("翌朝。マルタが濡れた地図を受付台へ広げ、カールは草原で写した杭の配置を重ねた。二つの線は、囁きの小川で交わっている。"),
    dialogue(actors.marta, "ここは浅いけれど、雨の後は荷車で渡れない。エッダなら北の飛び石へ回ったはず。あの子は水を怖がる馬を使っていたから。"),
    dialogue(actors.karl, "消えた商隊の御者を、名前まで覚えているのか。"),
    dialogue(actors.marta, "同じ道で稼ぐ人の顔を忘れたら、商人は値札しか見ていないのと同じよ。"),
    dialogue(actors.rina, "では北岸を重点的に。ただし、精霊を追い払うことだけを目的にしないでください。彼らが騒ぐ理由も記録を。"),
    dialogue(actors.owner, "荷車の跡と、そこに住むものの変化を一緒に追う。小川で何が道を曲げたのか確かめよう。"),
    narration("カールは地図の『荷車三台』という記述を消し、『エッダたち』と書き直した。数字だった行方不明者に、初めて名前が戻った。")
  ]);

  add("whispering_brook_discovery", [
    setting("北岸の葦の間から、真鍮の荷札と切れた馬具が見つかった。荷札には、マルタと同じ商会印が刻まれている。"),
    dialogue(actors.marta, "エッダの札よ。裏の傷は、荷を受け取るたび自分で数えた跡。ここまで来ていた。"),
    dialogue(actors.karl, "馬具は噛み切られていない。刃で切って馬を逃がしている。襲われる前に、誰かが荷車を捨てる決断をしたんだ。"),
    dialogue(actors.marta, "それなら、生きて歩いた人がいる。峠まで行けば、まだ追いつけるかもしれない。"),
    dialogue(actors.karl, "希望だけで追うつもりはない。だが、この切り口は逃走の証拠だ。急ぐ根拠にはなる。"),
    narration("冒険者たちは荷札を布で包み、馬具が落ちていた向きを記した。小川の音にかき消されそうな痕跡が、次の道をはっきり峠へ向けた。")
  ]);

  add("whispering_brook_clear", [
    setting("小川の記録が増え、受付台は濡れた紙と古い地図で埋まった。閉鎖された町文庫から来たエルゼが、その山を見て眉をひそめた。"),
    dialogue(actors.else, "黒い杭は鍛冶の記録、荷札は商会の記録、精霊の騒ぎは土地の記録。別々に積めば、同じ事件が三つあるように見えます。"),
    dialogue(actors.rina, "私は今の依頼と帰還時刻を扱うだけで手いっぱいです。古い記録まで同じ帳簿へ入れると、今日の仕事を見失います。"),
    dialogue(actors.else, "だから分けましょう。あなたは現在を、私は積み重なった事実を預かる。空いている二階の部屋と棚を貸してください。図鑑も依頼の控えも、調べ直せる資料にします。"),
    dialogue(actors.owner, "資料は隠さず、冒険者がいつでも確かめられる形に。噂と確認済みの事実も分けてほしい。"),
    dialogue(actors.else, "それが司書の仕事です。答えを書くのではなく、次に考える人が辿れる順番を作ります。"),
    narration("二階の一室に『冒険者資料室』の札が掛かった。エルゼが整理した最初の頁には、峠へ逃げた商隊と、獣を操る笛の可能性が並べて記された。")
  ]);

  add("brigand_pass_opening", [
    setting("追い剥ぎの峠には、雨で消えかけた焚き火跡と、荷車を横倒しにした即席の柵が残っていた。遠くで短い笛の音がし、森の獣が一斉に向きを変える。"),
    dialogue(actors.karl, "野盗が獣を避けているのではない。音で動かして、逃げ道を塞いでいる。草原の杭と同じ発想だ。"),
    dialogue(actors.marta, "でも、荷は全部奪われていない。食料と灯油だけがなくなってる。金目当てなら変よ。"),
    dialogue(actors.karl, "なら、峠に留まるためではなく、どこかへ運ぶための略奪か。見張りを生け捕りにできれば話を聞ける。"),
    dialogue(actors.owner, "降伏した者は討たない。荷の行方と、街道駅にいる人間のことを優先する。"),
    narration("剣を抜く前に、帰路と捕縛の手順が決められた。冒険者たちは笛の間隔を数えながら、崩れた柵の陰へ進んだ。")
  ]);

  add("brigand_pass_discovery", [
    setting("峠の見張り台で、骨笛と数枚の配給札が見つかった。笛には獣の牙が埋め込まれ、札には朽ちた街道駅の印がある。"),
    dialogue(actors.karl, "笛は狼を呼ぶためじゃない。嫌う音を出して追い立てる道具だ。だが、なぜ街道駅の配給札を野盗が持っている。"),
    dialogue(actors.marta, "襲った相手から奪ったとは限らないわ。食料と交換したのかもしれない。駅にはまだ人がいる。"),
    dialogue(actors.karl, "野盗と避難民が手を組んだ、と？"),
    dialogue(actors.marta, "決めつけるには早いって、あなたが草原で教えたでしょう。笛を持って帰って、使っていた本人に聞きましょう。"),
    narration("カールは小さく息を吐き、配給札を証拠袋へ入れた。監察官の報告書には『共謀』ではなく、『関係未確認』と書かれた。")
  ]);

  add("brigand_pass_clear", [
    setting("戦いの後、捕らえられた若い男が見張り台の壁にもたれていた。名をロルフといい、傷ついた手で空になった食料袋を握っている。"),
    dialogue(actors.rolf, "俺たちが荷を奪ったのは認める。だが街道駅の連中からじゃない。あそこへ逃げ込んだ旅人に食わせるためだ。月牙狼が道を塞いで、町へ助けを呼びに行けなかった。"),
    dialogue(actors.karl, "助けるためなら商隊を襲っていい、とはならない。笛で獣を街道へ追いやったせいで、別の誰かが死ぬところだった。"),
    dialogue(actors.rolf, "分かってる。最初は追い払うだけのつもりだった。群れがでかくなって、俺たちにも止められなくなったんだ。"),
    dialogue(actors.marta, "エッダという若い商人を見なかった？　この荷札の持ち主よ。"),
    dialogue(actors.rolf, "駅務長のヨハンが匿ってる。まだ生きてるはずだ。俺を縛ったままでいい。先にあいつらへ食料を届けてくれ。"),
    narration("カールはロルフの縄を確かめると、冒険者へ街道駅の鍵を渡した。罪の裁きは町へ戻ってから。今は、生きている者へ間に合うことが先だった。")
  ]);

  add("abandoned_station_opening", [
    setting("朽ちた街道駅へ近づくにつれ、道端には狼を遠ざける火と、旅人が残した白い布の目印が増えた。だが煙突から煙は上がっていない。"),
    dialogue(actors.karl, "ヨハンは元衛兵だ。避難者がいるなら、食料が尽きても駅を空にはしない。煙を止めたのは、見つからないためだろう。"),
    dialogue(actors.marta, "それなら、大声で呼ぶのも危ないわね。エッダは荷車の鈴を三回鳴らして、仲間だと知らせる癖がある。"),
    dialogue(actors.owner, "鈴を使おう。返事があるまで扉へ近づかない。中の人間にも、こちらを見極める時間が必要だ。"),
    dialogue(actors.karl, "了解した。……監察対象の指示に従うのは癪だが、筋は通っている。"),
    narration("三度の鈴が、灯の消えた宿場へ響いた。長い沈黙の後、板で塞がれた二階の窓が、指一本ほど静かに開いた。")
  ]);

  add("abandoned_station_discovery", [
    setting("駅の裏手で、破られた駅務日誌の頁が風に張りついていた。月の欠ける夜ごとに、巨大な狼が群れを東へ追うと記されている。"),
    dialogue(actors.karl, "黒い杭も野盗の笛も、元は群狼王から逃れるために作られた。対処が別の土地へ被害を押しつけ、街道全体を壊したんだ。"),
    dialogue(actors.marta, "誰か一人が全部を企んだわけじゃない。怖くて選んだことが、次の人を追い詰めていったのね。"),
    dialogue(actors.karl, "だからこそ、最後の原因を倒せば終わりだと決めつけるな。群狼王が何から逃げているかも確かめる。"),
    narration("冒険者たちは日誌の頁を乾いた布へ挟んだ。扉の向こうから、同じ鈴が今度は二度鳴り、内側の閂が外された。")
  ]);

  add("abandoned_station_clear", [
    setting("街道駅の食堂には、痩せた旅人たちが毛布を分け合っていた。駅務長ヨハンの隣で、腕に包帯を巻いたエッダがマルタの荷札を握っている。"),
    dialogue(actors.etta, "マルタさん……荷を捨てたから、商会には戻れないと思っていました。馬だけは逃がせたけど、品物は何一つ守れなくて。"),
    dialogue(actors.marta, "荷は仕入れ直せる。あなたの名前は仕入れ直せないの。帰って叱られるところまでが仕事よ。"),
    dialogue(actors.johann, "月牙狼はここを襲うために群れを集めているのではない。地下から青い光が漏れる夜だけ、巣の周りを掘り返して吠える。何かを外へ出すまいとしているように見えた。"),
    dialogue(actors.karl, "街道を守るためには群狼王を止める必要がある。だが、警告まで消してはならない。巣の奥を調べる隊と、避難者を町へ送る隊を分けよう。"),
    dialogue(actors.owner, "ヨハンとエッダたちは先に町へ。ロルフの仲間にも運搬を手伝わせる。償いは、生きた人間を帰すところから始めてもらう。"),
    narration("止まっていた街道駅の鐘が一度だけ鳴った。救出された人々の列が町へ向かい、その逆を冒険者たちが月牙狼の巣へ歩き始めた。")
  ]);

  add("moonfang_den_opening", [
    setting("出発前夜。宿の地図には、草原の杭、小川の荷札、峠の笛、街道駅の日誌が一本の赤い糸で結ばれていた。その終点が月牙狼の巣だった。"),
    dialogue(actors.karl, "群狼王を放置すれば街道は戻らない。だが討ち取ることだけを命令にはしない。ヨハンの証言どおり、地下の異変を抑えている可能性がある。"),
    dialogue(actors.rolf, "俺にも行かせてくれ。笛で追いやった群れの数は俺が一番知ってる。逃げ道を塞ぐ場所も分かる。"),
    dialogue(actors.karl, "お前は町で避難者の荷を運べ。責任を取る場所は戦場だけじゃない。知っている道は地図へ全部書け。"),
    dialogue(actors.marta, "カール、ずいぶんギルドらしい言い方になったじゃない。"),
    dialogue(actors.karl, "まだ監察中だ。結論は、全員が帰ってから書く。"),
    dialogue(actors.owner, "群狼王と戦う時も、巣の傷と青い光を見落とさない。街道を取り戻し、その先にある異変を持ち帰ろう。"),
    narration("夜明け前、カールは監察章を外套の内側へしまった。先頭に立つことも、冒険者を名乗ることもなく、彼は証人として一行と同じ道を歩いた。")
  ]);

  add("moonfang_den_discovery", [
    setting("巣の最深部。岩壁には巨大な爪痕が幾重にも刻まれ、その隙間から青い脈動が漏れていた。群狼王の前脚には、鉱石で焼けた古い傷がある。"),
    dialogue(actors.karl, "ヨハンの見立てが正しい。こいつは町を狙って群れを集めたんじゃない。地下から上がるものを恐れ、縄張りの外へ獣を押し出した。"),
    dialogue(actors.owner, "それでも人を襲った事実は変わらない。だが倒した後、この亀裂を放置すれば同じことが起きる。位置と脈動の間隔を記録しよう。"),
    narration("崩れた岩陰には、青い鉱石を調べに来た坑道頭オスカーの道具箱が残されていた。街道の終点は、地の底へ続く次の事件の入口でもあった。")
  ]);

  add("roadside_clear", [
    setting("月牙狼の遠吠えが消えた翌朝、止まっていた荷車が列をなして町門をくぐった。宿の前には乾いた麦の匂いと、久しぶりに聞く車輪の音が満ちた。"),
    narration("広間では、町役場の書記、救出された商人、峠から連行された者までが同じ長机を囲んだ。勝利を祝う宴の前に、カールの監察報告が読み上げられる。"),
    dialogue(actors.karl, "このギルドは討伐数だけで依頼を終わらせず、証言の食い違いを残し、救助と調査を優先した。街道復旧への寄与を認め、町の正式な依頼仲介所として推薦する。"),
    dialogue(actors.rina, "最初に宿へ来た時は、問題を増やさないか見届けるとおっしゃっていましたね。"),
    dialogue(actors.karl, "増えたのは問題ではなく帳簿だ。未整理のまま積めば、エルゼに叱られる。"),
    dialogue(actors.else, "もう叱る準備はできています。監察報告も資料室へ一部ください。都合の悪い行まで省かずに。"),
    dialogue(actors.gregor, "鍛冶場には黒い杭を一本残すぞ。何のために作った道具か忘れると、また同じ使い方をする。"),
    dialogue(actors.marta, "店棚は正式に借りるわ。エッダも戻ったし、止まっていた仕入れを再開できる。報酬とは別に、次の依頼人も連れてきたけれど。"),
    dialogue(actors.oskar, "坑道頭のオスカーだ。月牙狼の巣で見つかった青い鉱石は、封鎖された採掘場から出たものに違いない。地下には、まだ仲間が残っている。"),
    dialogue(actors.owner, "街道の記録を閉じよう。ただし、そこで見つけた青い脈動は次の頁へ移す。ギルドを、帰還を待つだけの宿から、帰還を支える場所へ育てていく。"),
    narration("掲示板から街道の依頼書が外され、その隣へ坑道の地図が留められた。受付、商店、鍛冶場、資料室を持つ小さなギルドは、今度は地の底へ続く声を受け取った。")
  ]);

  add("seal_opening", [
    setting("深夜。閉店後の食堂へ、煤だらけのドワーフと坑道頭が運び込まれた。二人の靴から落ちた青い粉が、床板の隙間で弱く光った。"),
    narration(resolvedScene("seal_opening").text),
    dialogue(witnesses.seal, "鉱夫を襲ったのは、昨日まで一緒に働いていた機巧です。殴り壊せば助かる命もある。だが、あれを作った職人の家族だって、この町にいるんです。"),
    dialogue(companion("mina"), "あいつらは暴れてるんじゃない。止まれという命令を、もらえなくなっただけだ。命令の音はもっと奥から聞こえる。私なら辿れる。"),
    dialogue(actors.rina, "討伐ではなく、停止と救助の依頼として受けます。持ち帰るべきものは鉱石より、残された人と記録です。"),
    dialogue(actors.owner, "ミナ、案内を頼めるか。ここへ帰る席も、工房の場所も空けておく。"),
    dialogue(companion("mina"), "先払いは飯一杯でいい。置いてきた連中を迎えたら、その工房で続きを話そう。"),
    narration("空だった工房に、一本の使い古した鎚が立て掛けられた。地下へ向かう遠征は、ギルドに最初の物語の仲間を迎えて始まった。")
  ]);

  add("seal_clear", [
    setting("救出された鉱夫たちが宿の長机を埋めた夜。食器の音に混じって、持ち帰られた小さな機巧が、直された脚で床を二度叩いた。"),
    narration(resolvedScene("seal_clear").text),
    dialogue(witnesses.seal, "全員ではありません。それでも、名前を呼んで返事をしてくれる者を、こんなに連れ帰ってくれた。坑道はもう、墓ではありません。"),
    dialogue(companion("mina"), "壊れたものは直せる。けど、忘れたことは勝手には戻らない。星の扉を作った連中が、何を置き去りにしたのか見届けたい。"),
    dialogue(actors.rina, "では、ミナの席は依頼人側ではなく、仲間の名簿へ移します。異論は……なさそうですね。"),
    dialogue(actors.owner, "工房の鍵を渡そう。次の扉を開ける道具は、ここで一緒に作る。"),
    narration("笑い声が落ち着いた頃、食堂の壁へ星形の石板が掛けられた。日々の依頼を扱う宿に、失われた時代へ続く窓が一つ増えた。")
  ]);

  add("starfall_opening", [
    setting("星形の石板を掲げて三日目、旅装の書記が宿を訪れた。彼女は注文もせず、壁の石板に欠けた文字を一つずつ書き写し始めた。"),
    narration(resolvedScene("starfall_opening").text),
    dialogue(witnesses.starfall, "町の古い写本にも同じ印があります。ただ、王朝が滅びた夜の頁だけが、どの本からも綺麗に切り取られている。"),
    dialogue(companion("elena"), "正しく残された記録だけを読んでも、消した者の望む歴史しか見えません。余白へ行き、何がないのかを確かめたいのです。"),
    dialogue(actors.rina, "遺跡の依頼書には、持ち帰る品だけでなく、見つからなかったものを書く欄も作ります。空欄も立派な手掛かりですから。"),
    dialogue(actors.owner, "エレナ、案内役ではなく一人の冒険者として同行してほしい。あなた自身の言葉も記録に残そう。"),
    dialogue(companion("elena"), "では最初の一行は、ここへ来た理由から。借り物ではない筆で書きます。"),
    narration("石板の写しと新しい依頼書が並べられた。ギルドは宝を求めて遺跡へ入るのではなく、奪われた物語の余白を探す旅へ出た。")
  ]);

  add("starfall_clear", [
    setting("雷雲へ伸びる光の橋が見えた夜、町の屋根には人々が集まった。遠い山の上で灯った星環は、ここからでも新しい星のように見えた。"),
    narration(resolvedScene("starfall_clear").text),
    dialogue(actors.child, "あれ、みんながつけた灯りなの？　じゃあ迷子になっても、町まで帰ってこられるね。"),
    dialogue(companion("elena"), "ええ。王朝のための橋でしたが、最初に道を見つけたのは名も残らない人々だった、と書き加えました。"),
    dialogue(actors.rina, "天文塔の攻略は王宮から頼まれていません。それでも、あの星図を確かめれば、この国の外にいる人々のことも分かるかもしれません。"),
    dialogue(actors.owner, "依頼がないなら、行くかどうかは私たちで決められる。帰りを待つ人のために、選んだ理由も残しておこう。"),
    narration("掲示板には報酬額のない一枚が加わった。仕事から始まったギルドが、自分たちの問いを持って歩き始めた瞬間だった。")
  ]);

  add("observatory_clear", [
    setting("翼王との戦いから戻った一行を迎え、宿の灯は夜明けまで消えなかった。食堂の中央には巨大な星図の写しが広げられ、町の者まで椅子を持ち寄った。"),
    narration(resolvedScene("observatory_clear").text),
    dialogue(companion("elena"), "王朝の道は一本ではありません。灰に覆われた国、凍った海、時の止まった砂漠……どれも今なお、誰かが暮らした痕跡を残しています。"),
    dialogue(witnesses.starfall, "古い本では、王都の外は余白でした。けれど余白だったのは、何もなかったからではなく、書く者が帰れなかったからなのですね。"),
    dialogue(actors.rina, "遠い土地から依頼人が来るのを待つだけでは、届かない声があります。遠征の理由は、私たち自身で選びましょう。"),
    dialogue(actors.owner, "地図を壁へ。帰ってきた者が線を足し、次に行く者が続きを読めるようにする。"),
    narration("星図は額へ収められず、何度でも書き足せる大きな紙として壁へ貼られた。宿の食堂はその夜から、知らない世界へ向かう作戦室にもなった。")
  ]);

  const contexts = {};
  Object.values(data.dungeons).forEach(dungeon => {
    const links = data.relations.dungeonStoryLinks[dungeon.id] || {};
    if (links.openingStoryId) contexts[links.openingStoryId] = { kind: "opening", dungeon, chapterId: dungeon.chapterId };
    if (links.discoveryStoryId) contexts[links.discoveryStoryId] = { kind: "discovery", dungeon, chapterId: dungeon.chapterId };
    if (dungeon.clearStoryId) contexts[dungeon.clearStoryId] = { kind: "ending", dungeon, chapterId: dungeon.chapterId };
    if (dungeon.optionalStoryId) contexts[dungeon.optionalStoryId] = { kind: "ending", dungeon, chapterId: dungeon.chapterId };
  });
  data.storyChapters.forEach(chapter => {
    contexts[chapter.openingStoryId] = { kind: "chapterOpening", chapter, chapterId: chapter.id };
    contexts[chapter.clearStoryId] = { kind: "chapterEnding", chapter, chapterId: chapter.id };
  });

  function chapterSpeaker(chapterId) {
    if (chapterCompanions[chapterId]) return companion(chapterCompanions[chapterId]);
    return chapterId === "roadside" ? actors.karl : actors.rina;
  }

  function contextualBlocks(sceneId, context) {
    const scene = resolvedScene(sceneId);
    const witness = witnesses[context.chapterId] || witnesses.roadside;
    const hero = chapterSpeaker(context.chapterId);
    const motif = chapterMotifs[context.chapterId];
    if (context.kind === "chapterOpening") {
      return [
        setting(`新しい地図が掲示板へ掛けられた朝。食堂には、${context.chapter.title}にまつわる噂を持つ旅人と町の者が集まった。`),
        narration(scene.text),
        ...(motif ? [narration(motif.opening)] : []),
        dialogue(witness, "地図の線だけなら、昔から知っています。けれど、その先から戻った人の声は一つとして同じではありません。どうか噂を答えだと思わず、見たものを持ち帰ってください。"),
        dialogue(hero, motif?.question || "なら、最初に聞いた話を正解にはしない。残された記録と、今そこにいる者の言葉を並べて、食い違うところから調べよう。"),
        dialogue(witness, "それなら私の話にも、確かめていない部分があると書いてください。怖かったことほど、人は見たことと想像したことを混ぜてしまいます。"),
        dialogue(actors.rina, "分かりました。証言、現地で確認した事実、まだ説明できないこと。その三つに頁を分けます。帰還のたびに、どの欄が変わったかも残しましょう。"),
        dialogue(actors.owner, "未知の場所ほど、結論を急がない。その証言を起点にしても、結末にはしない。全員が戻り、ここで続きを話せる遠征にしよう。"),
        dialogue(hero, "帰った時に同じ地図を囲めるよう、道中の判断も書き留める。戦うことになった理由まで持ち帰るよ。"),
        narration("暖炉のそばで交わされた言葉は、報酬欄より長く帳簿へ記された。新しい章は、剣を抜くより先に、人々の異なる記憶を聞くところから始まった。")
      ];
    }
    if (context.kind === "chapterEnding") {
      return [
        setting(`${context.chapter.title}の最後の遠征を終えた夜。帰還を知らせる鐘に応えて、依頼人だけでなく、旅の行方を案じていた町の人々も宿へ集まった。`),
        narration(scene.text),
        dialogue(hero, motif?.return || "出発前に聞いた話と、実際に見た景色は同じではなかった。それでも、ここで言葉にすれば、次に歩く者の手掛かりになる。"),
        dialogue(witness, "出発前の私は、あの土地を怖い噂の名前でしか呼べませんでした。話を聞けば、そこにも朝を待つ人がいた。私の証言も書き直させてください。"),
        dialogue(hero, "書き直すなら、都合の悪いところも残そう。間違えた道と、間に合わなかった声があったから、最後の選択を変えられた。"),
        dialogue(actors.rina, "討伐数の横へ、その二つを記します。助けられなかったことも、途中で選び直したことも、成功の陰へ隠しません。"),
        dialogue(actors.owner, "この章を終わりにする。ただし、そこで出会った人々の暮らしまで終わったことにはしない。続報が届けば、閉じた頁をまた開こう。"),
        dialogue(witness, "ええ。今度は噂ではなく、あの土地で生きる人の名前を添えて持ってきます。ここなら、続きを受け取ってもらえるから。"),
        narration("遅くまで灯った宿の窓から、町の道へ人々の話し声が流れていった。遠征の記録はギルドだけの所有物ではなく、世界を想像するための町の記憶になっていった。")
      ];
    }
    const dungeon = context.dungeon;
    if (context.kind === "opening") {
      return [
        setting(`受付台に「${dungeon.name}」の地図が広げられた。泥、潮、煤、あるいは古い香の匂いが紙に染みつき、その土地を歩いた者の時間を伝えている。`),
        narration(scene.text),
        dialogue(witness, `${dungeon.shortName}について、町ではいくつもの話が混ざっています。${dungeon.description}　少なくとも、何も知らずに近づいてよい場所ではありません。`),
        dialogue(hero, motif?.question || "話が混ざっているなら、怖いものだけを選ぶのは危険だ。最後に皆の証言が一致する場所と、食い違い始める場所を教えてほしい。"),
        dialogue(witness, "最後の目印は古い道標です。そこまでは誰の話も同じで、その先だけ、帰った者によって方角が違う。私が確かに案内できるのはそこまでです。"),
        dialogue(actors.rina, `では道標を最初の確認地点にします。地図へ帰路と野営地も書き込みました。${dungeon.shortName}で何を見つけても、推測と事実を分けて記録してください。`),
        dialogue(actors.owner, "依頼人の望む答えが、そのまま現地の真実とは限らない。道標の先で方角が違う理由と、戦うことになった理由を確かめながら進もう。"),
        dialogue(hero, "了解した。戻った時は、どの話が正しかったかだけでなく、なぜ違って聞こえたのかまで報告する。"),
        narration("冒険者たちは報酬袋より先に、証言を書き留めた紙を荷へ収めた。掲示板の短い依頼文は、こうして一つの遠征の始まりへ変わった。")
      ];
    }
    if (context.kind === "discovery") {
      return [
        setting(`${dungeon.name}の探索中。足を止めた一行の周囲には、戦いの跡だけでは説明できない生活と移動の痕跡が残されていた。一行は携行通信紙を開き、宿へ途中報告を送った。`),
        narration(scene.text),
        dialogue(hero, motif?.discovery || "ここに残っているのは、敵が通った跡だけじゃない。運んだもの、守ったもの、戻れなかった者の順まで読み取れる。"),
        dialogue(witness, "では、最初に聞かせた話も違っていたのでしょうか。私は、ここにいるものが道を塞いだとばかり思っていました。"),
        dialogue(hero, "全部が違うとは言えない。道を塞いだことと、ここで何かを守ろうとしたことは両立する。今は片方だけを消さずに持ち帰ろう。"),
        dialogue(actors.rina, "通信紙にも同じ印を書きました。分からない箇所は空欄のまま送ってください。宿にある別の証言と重ねれば、形が見えるかもしれません。"),
        dialogue(witness, "空欄を残すのは、知らないと認めるためなのですね。なら私も、思い出したことを答えにせず、いつどこで聞いたかから書き直します。"),
        narration("一行は足跡と印の位置を写し、断定できない部分には空欄を残した。先へ急げても、見落とした意味は帰り道では拾えない。"),
        narration("一行は見つけたものへ勝手な名前を付けず、形と位置と言葉をそのまま記した。後に宿で読み返した時、その慎重な余白が別の証言と結びつくことになる。")
      ];
    }
    return [
      setting(`${dungeon.name}から戻った一行を迎え、宿の戸口に帰還の灯がともされた。戦利品の箱が運び込まれるより早く、受付台には道中の記録が積まれた。`),
      narration(scene.text),
      dialogue(hero, motif?.return || "倒した相手の数より、なぜそこにいたのかを忘れたくない。次に同じ道を歩く者へ、見たままを渡そう。"),
      dialogue(witness, "町へ届く頃には、旅の話は勇ましい部分だけになってしまいます。迷った時、誰の言葉で道を選び直したのかも聞かせてください。"),
      dialogue(hero, "最初の判断は外れた。けれど、途中で見つけた痕跡と仲間の異論で引き返せた。助けられたのは、私たちの方でもある。"),
      dialogue(actors.rina, "では『成功』の一行だけで閉じません。報酬と素材は帳簿へ、迷いと選び直した理由は遠征録へ。どちらも持ち帰ったものです。"),
      dialogue(actors.owner, "記録を閉じる前に、帰れなかった者と、残してきた約束の名も書いておこう。次の遠征が、同じ見落としから始まらないように。"),
      dialogue(witness, "その頁を、依頼人にも読ませてください。結果だけでなく、何を託したのかを私たちも覚えておきたい。"),
      narration("夜が更けても、食堂の椅子は片づけられなかった。一つの攻略が終わるたび、宿には世界の輪郭を語る声が少しずつ増えていった。")
    ];
  }

  Object.keys(data.storyScenes).forEach(sceneId => {
    if (scripts[sceneId]) return;
    const context = contexts[sceneId] || { kind: "record", chapterId: "roadside", dungeon: { name: "名のない遠征地", shortName: "現地", description: "記録の少ない土地。" } };
    add(sceneId, contextualBlocks(sceneId, context));
  });

  data.registry.relations("storySceneScripts", scripts);
})();
