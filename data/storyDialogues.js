(function () {
  "use strict";

  const data = window.GameData;
  const scripts = {};
  const actors = {
    rina: { speakerId: "receptionist_rina", speakerName: "リナ", speakerRole: "受付係" },
    owner: { speakerId: "guild_owner", speakerName: "ギルドオーナー", speakerRole: "あなた" },
    leader: { speakerId: "expedition_leader", speakerName: "遠征隊長", speakerRole: "冒険者" },
    cook: { speakerId: "inn_cook", speakerName: "ベルタ", speakerRole: "宿の料理番" },
    child: { speakerId: "town_child", speakerName: "ネネ", speakerRole: "町の子ども" }
  };
  const witnesses = {
    prologue: { speakerId: "miller_judit", speakerName: "ユーディト", speakerRole: "粉屋" },
    roadside: { speakerId: "merchant_marta", speakerName: "マルタ", speakerRole: "荷馬車商" },
    seal: { speakerId: "foreman_oskar", speakerName: "オスカー", speakerRole: "坑道頭" },
    starfall: { speakerId: "copyist_cecil", speakerName: "セシル", speakerRole: "町の写本師" },
    ember_crown: { speakerId: "refugee_frieda", speakerName: "フリーダ", speakerRole: "灰の国の避難民" },
    mirror_tide: { speakerId: "fisher_nils", speakerName: "ニルス", speakerRole: "老漁師" },
    clockwork_desert: { speakerId: "caravan_zara", speakerName: "ザラ", speakerRole: "砂路の隊商主" },
    blackwood_pilgrimage: { speakerId: "herbalist_olga", speakerName: "オルガ", speakerRole: "森辺の薬師" },
    thunder_snow_peaks: { speakerId: "pilgrim_hein", speakerName: "ハイン", speakerRole: "山麓の巡礼者" },
    falling_sky_castle: { speakerId: "watcher_lutz", speakerName: "ルッツ", speakerRole: "町の鐘守" },
    black_moon_prison: { speakerId: "dreamer_irma", speakerName: "イルマ", speakerRole: "夢を失った旅人" },
    primordial_forest: { speakerId: "woodcutter_bram", speakerName: "ブラム", speakerRole: "木樵" },
    starsea_corridor: { speakerId: "boatman_ren", speakerName: "レン", speakerRole: "渡し守" },
    northern_star_tomb: { speakerId: "astronomer_adel", speakerName: "アデル", speakerRole: "王都の天文官" },
    returnless_capital: { speakerId: "refugee_marek", speakerName: "マレク", speakerRole: "旧王都の住民" },
    end_of_starless_night: { speakerId: "bell_keeper_anna", speakerName: "アンナ", speakerRole: "町の鐘楼守" }
  };
  const chapterCompanions = {
    seal: "mina", starfall: "elena", ember_crown: "garm", mirror_tide: "shia",
    clockwork_desert: "tio", blackwood_pilgrimage: "rize", thunder_snow_peaks: "kai",
    falling_sky_castle: "elena", black_moon_prison: "tio", primordial_forest: "rize",
    starsea_corridor: "shia", northern_star_tomb: "noah", returnless_capital: "garm",
    end_of_starless_night: "noah"
  };

  const setting = text => ({ kind: "setting", text });
  const narration = text => ({ kind: "narration", text });
  const dialogue = (actor, text) => ({ kind: "dialogue", ...actor, text });
  const companion = id => {
    const entry = data.companions[id];
    return entry ? { speakerId: id, speakerName: entry.name, speakerRole: entry.title } : actors.leader;
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
    narration("最初に扉を叩いたのは、鎧を着た英雄ではなかった。粉で白くなった前掛けを握る、町外れの粉屋だった。"),
    dialogue(witnesses.prologue, "草原の道が塞がれて、麦を運ぶ荷車が三日も戻りません。大きな依頼料は出せないけれど……あの道が閉じたままでは、町のパンが先になくなります。"),
    dialogue(actors.owner, "依頼を預かります。まず、帰ってこられる仲間を集めましょう。"),
    dialogue(actors.rina, "はい、オーナー。最初の一枚は、目立つ場所へ貼ります。ここから私たちの記録を始めましょう。"),
    narration("真新しい依頼書の端が、開いた窓から入る風に揺れた。小さなギルドの最初の仕事は、世界を救うことではなく、町の朝食を守ることから始まった。")
  ]);

  add("prologue_clear", [
    setting("出発の朝。宿の前には、寄せ集めの装備を身につけた冒険者と、見送りに来た町の人々が集まっていた。"),
    narration("立派とは言えない一隊だった。それでも、掲示板から依頼書を外して歩き出す背中は、昨日まで空っぽだった宿に確かな役目を与えた。"),
    dialogue(actors.child, "ねえ、本当に魔物をやっつけてくるの？　帰ってきたら、草原の向こうの話を聞かせて。"),
    dialogue(actors.cook, "土産話の前に全員で帰っておいで。冷めた煮込みでも、帰らない連中には食べさせられないからね。"),
    dialogue(actors.rina, "道中の記録袋と、素材を入れる麻袋です。傷んだ装備も捨てずに持ち帰ってください。鍛冶場の準備をして待っています。"),
    dialogue(actors.owner, "最初の約束は、勝つことではなく帰ることにしよう。行ってらっしゃい。"),
    narration("一隊が角を曲がって見えなくなっても、リナはしばらく戸口に立っていた。やがて受付へ戻り、帰還者の名を書く欄を、帳簿に人数分だけ用意した。")
  ]);

  add("roadside_opening", [
    setting("夕刻の食堂。濡れた外套を着た商人たちが暖炉を囲み、卓上には草原から持ち帰られた黒い杭と、泥に汚れた荷札が置かれていた。"),
    narration("街道を荒らすものは、飢えた魔物だけではないらしい。草原、小川、峠、朽ちた宿場。途切れた轍をつなぐほど、誰かが獣と人の流れを意図して変えている形跡が見えてきた。"),
    dialogue(witnesses.roadside, "護衛を増やしても駄目でした。獣はまるで、逃げ道まで知っているみたいに荷車を追い込むんです。峠では、人影を見た者もいます。"),
    dialogue(actors.rina, "一度の討伐では街道は戻りません。残された痕跡を拾いながら、道を一つずつ確かめる必要があります。"),
    dialogue(actors.owner, "依頼を五つに分けよう。無理に先へ進まず、得た情報を次の隊へ渡せる形で残す。"),
    dialogue(witnesses.roadside, "それなら私たちも、戻った荷車の時刻を記録します。戦うことはできなくても、道の癖なら商人の方が詳しい。"),
    narration("冒険者だけでなく、商人や御者も地図を囲んだ。ギルドの仕事は剣を振るう者だけで成り立たない。その夜、街道の地図には初めて、町の人々の言葉で印が増えていった。")
  ]);

  add("roadside_clear", [
    setting("月牙狼の遠吠えが消えた翌朝、止まっていた荷車が列をなして町門をくぐった。宿の前には乾いた麦の匂いと、久しぶりに聞く車輪の音が満ちた。"),
    narration("街道は戻った。しかし、群れを追い立てていた黒い杭と、荷に紛れていた青い鉱石は、騒ぎが一つの巣穴だけで終わらないことを告げていた。"),
    dialogue(witnesses.roadside, "約束の荷を全部届けられました。これは報酬とは別です。洞窟から逃げてきた鉱夫に託された地図で……あの人たちは、まだ地下に仲間を残しています。"),
    dialogue(actors.cook, "町じゃもう、あんたたちの宿じゃなくて『冒険者の宿』って呼ばれてるよ。看板に負けないくらい、床も賑やかになったね。"),
    dialogue(actors.rina, "喜ぶのは、戻った人たちへ食事を出してからにしましょう。次の依頼人は、泥ではなく煤をかぶって待っています。"),
    dialogue(actors.owner, "街道の記録を閉じる。次は、地下で止まった時間を迎えに行こう。"),
    narration("掲示板から街道の依頼書が外され、その隣へ坑道の地図が留められた。町に覚えられたギルドの名は、今度は地の底へ届こうとしていた。")
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
    return chapterCompanions[chapterId] ? companion(chapterCompanions[chapterId]) : actors.leader;
  }

  function contextualBlocks(sceneId, context) {
    const scene = resolvedScene(sceneId);
    const witness = witnesses[context.chapterId] || witnesses.roadside;
    const hero = chapterSpeaker(context.chapterId);
    if (context.kind === "chapterOpening") {
      return [
        setting(`新しい地図が掲示板へ掛けられた朝。食堂には、${context.chapter.title}にまつわる噂を持つ旅人と町の者が集まった。`),
        narration(scene.text),
        dialogue(witness, "地図の線だけなら、昔から知っています。けれど、その先から戻った人の声は一つとして同じではありません。どうか噂を答えだと思わず、見たものを持ち帰ってください。"),
        dialogue(hero, "残された記録と、今そこにいる者の言葉は違うかもしれない。敵と決める前に、何を守っているのか確かめよう。"),
        dialogue(actors.rina, "依頼書は一枚にまとめません。土地ごとの証言を綴じ、帰還のたびに次の頁を開きます。"),
        dialogue(actors.owner, "未知の場所ほど、結論を急がない。全員が戻り、ここで続きを話せる遠征にしよう。"),
        narration("暖炉のそばで交わされた言葉は、報酬欄より長く帳簿へ記された。新しい章は、剣を抜くより先に、人々の異なる記憶を聞くところから始まった。")
      ];
    }
    if (context.kind === "chapterEnding") {
      return [
        setting(`${context.chapter.title}の最後の遠征を終えた夜。帰還を知らせる鐘に応えて、依頼人だけでなく、旅の行方を案じていた町の人々も宿へ集まった。`),
        narration(scene.text),
        dialogue(hero, "出発前に聞いた話と、実際に見た景色は同じではなかった。それでも、ここで言葉にすれば、次に歩く者の手掛かりになる。"),
        dialogue(witness, "私たちは遠い土地を、怖い噂の名前でしか呼べませんでした。あなたたちの話を聞いて、そこにも朝を待つ人がいたのだと分かりました。"),
        dialogue(actors.rina, "討伐数だけでは、この旅は残せませんね。助けられなかったことも、選び直したことも、消さずに綴じておきます。"),
        dialogue(actors.owner, "この章を終わりにする。ただし、そこで出会った人々の暮らしまで終わったことにはしない。"),
        narration("遅くまで灯った宿の窓から、町の道へ人々の話し声が流れていった。遠征の記録はギルドだけの所有物ではなく、世界を想像するための町の記憶になっていった。")
      ];
    }
    const dungeon = context.dungeon;
    if (context.kind === "opening") {
      return [
        setting(`受付台に「${dungeon.name}」の地図が広げられた。泥、潮、煤、あるいは古い香の匂いが紙に染みつき、その土地を歩いた者の時間を伝えている。`),
        narration(scene.text),
        dialogue(witness, `${dungeon.shortName}について、町ではいくつもの話が混ざっています。${dungeon.description}　少なくとも、何も知らずに近づいてよい場所ではありません。`),
        dialogue(actors.rina, `地図へ帰路と野営地を先に書き込みました。${dungeon.shortName}で何を見つけても、推測と事実を分けて記録してください。`),
        dialogue(actors.owner, "依頼人の望む答えが、そのまま現地の真実とは限らない。戦う理由を確かめながら進もう。"),
        narration("冒険者たちは報酬袋より先に、証言を書き留めた紙を荷へ収めた。掲示板の短い依頼文は、こうして一つの遠征の始まりへ変わった。")
      ];
    }
    if (context.kind === "discovery") {
      return [
        setting(`${dungeon.name}の探索中。足を止めた一行の周囲には、戦いの跡だけでは説明できない生活と移動の痕跡が残されていた。`),
        narration(scene.text),
        dialogue(hero, "ここに残っているのは、敵が通った跡だけじゃない。運んだもの、守ったもの、戻れなかった者の順まで読み取れる。"),
        dialogue(actors.leader, "印を写しておこう。先へ急げても、見落とした意味は帰り道で拾えない。"),
        narration("一行は見つけたものへ勝手な名前を付けず、形と位置と言葉をそのまま記した。後に宿で読み返した時、その慎重な余白が別の証言と結びつくことになる。")
      ];
    }
    return [
      setting(`${dungeon.name}から戻った一行を迎え、宿の戸口に帰還の灯がともされた。戦利品の箱が運び込まれるより早く、受付台には道中の記録が積まれた。`),
      narration(scene.text),
      dialogue(hero, "倒した相手の数より、なぜそこにいたのかを忘れたくない。次に同じ道を歩く者へ、見たままを渡そう。"),
      dialogue(witness, "町へ届く頃には、旅の話は勇ましい部分だけになってしまいます。迷ったことも、助けられたことも聞かせてください。"),
      dialogue(actors.rina, "報酬と素材は帳簿へ。言葉は遠征録へ分けて残します。どちらも、このギルドが持ち帰った大切なものです。"),
      dialogue(actors.owner, "記録を閉じる前に、帰れなかった者と、残してきた約束の名も書いておこう。"),
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
