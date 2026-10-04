(function () {
  "use strict";
  const data = window.GameData;
  const relations = data.relations;

  const arcs = {
    mina: { id: "mina", companionId: "mina", joinChapterId: "seal", featuredChapterIds: ["seal", "ember_crown", "clockwork_desert"], theme: "命令に従うだけだった機巧へ、自分で止まる自由を返す。" },
    elena: { id: "elena", companionId: "elena", joinChapterId: "starfall", featuredChapterIds: ["starfall", "falling_sky_castle", "primordial_forest"], theme: "残された記録を信じるだけでなく、欠けた歴史を自分で見届ける。" },
    garm: { id: "garm", companionId: "garm", joinChapterId: "ember_crown", featuredChapterIds: ["ember_crown", "returnless_capital", "end_of_starless_night"], theme: "滅びた王への忠誠を終え、今を生きる者の盾になる。" },
    shia: { id: "shia", companionId: "shia", joinChapterId: "mirror_tide", featuredChapterIds: ["mirror_tide", "starsea_corridor", "end_of_starless_night"], theme: "消された人々の名前を歌い、帰る場所のない記憶を地上へ届ける。" },
    tio: { id: "tio", companionId: "tio", joinChapterId: "clockwork_desert", featuredChapterIds: ["clockwork_desert", "black_moon_prison", "end_of_starless_night"], theme: "決められた一日を数える役目を捨て、まだ記録にない明日を選ぶ。" },
    rize: { id: "rize", companionId: "rize", joinChapterId: "blackwood_pilgrimage", featuredChapterIds: ["blackwood_pilgrimage", "primordial_forest", "end_of_starless_night"], theme: "他者の夢を守るだけでなく、自分の言葉で物語を残す。" },
    kai: { id: "kai", companionId: "kai", joinChapterId: "thunder_snow_peaks", featuredChapterIds: ["thunder_snow_peaks", "falling_sky_castle", "northern_star_tomb"], theme: "門だけを見張る巡礼を終え、守るべき地上を仲間と歩く。" },
    noah: { id: "noah", companionId: "noah", joinChapterId: "northern_star_tomb", featuredChapterIds: ["northern_star_tomb", "returnless_capital", "end_of_starless_night"], theme: "器として与えられた運命ではなく、自分の意思で星の力を終わらせる。" }
  };

  const chapter = id => data.storyChapters.find(entry => entry.id === id);
  const overlays = {};
  const triggers = [];
  const feature = (sceneId, protagonistId, castIds = []) => {
    if (!data.storyScenes[sceneId]) return;
    overlays[sceneId] = Object.assign({}, overlays[sceneId], {
      protagonistId,
      castIds: [...new Set([protagonistId, ...castIds])]
    });
  };

  Object.values(arcs).forEach(arc => {
    const target = chapter(arc.joinChapterId);
    if (!target) return;
    triggers.push({
      id: `join_companion_${arc.companionId}`,
      when: { type: "chapterActive", chapterId: arc.joinChapterId },
      effects: [{ type: "joinCompanion", companionId: arc.companionId }]
    });
    feature(target.openingStoryId, arc.companionId);
    Object.values(data.dungeons).filter(dungeon => dungeon.chapterId === target.id).forEach(dungeon => {
      const storyLinks = relations.dungeonStoryLinks[dungeon.id] || {};
      [storyLinks.openingStoryId, storyLinks.discoveryStoryId, dungeon.clearStoryId, dungeon.optionalStoryId].filter(Boolean).forEach(id => feature(id, arc.companionId));
    });
    feature(target.clearStoryId, arc.companionId);
  });

  const rewritten = {
    seal_opening: ["坑道から来た鍛冶師", "封鎖された坑道から、煤だらけのドワーフが一人でギルドへ辿り着いた。ミナは動き続ける機巧鉱夫の音を聞き分け、『あいつらは暴れてるんじゃない。止まり方を忘れたんだ』と救援を頼む。置いてきた仲間を自分の手で迎えるため、ミナはその場でギルドへ加わった。"],
    seal_clear: ["ミナが止めた最後の命令", "地脈の託宣機を前に、ミナは父の代から受け継いだ停止符を打ち込んだ。坑道に静けさが戻ると、使い古した鎚を背負い直す。『止めるだけじゃ駄目だな。次は、こいつらが自分で歩けるように直したい』。彼女の旅に新しい目的が生まれた。"],
    starfall_opening: ["欠けた星図の案内人", "星の扉の前で待っていたのは、月碑の文字を読める書記エレナだった。王朝の記録には意図的に切り取られた頁があるという。『正しい歴史を読むだけでは、欠けた場所へは行けません』。失われた道を自分の目で確かめるため、エレナはギルドへ加わった。"],
    starfall_clear: ["書記が余白へ記した一行", "星環が動き出すと、エレナは欠けた星図の余白へ初めて自分の言葉を書いた。『王朝の道を見つけたのは、名も残らない冒険者たちだった』。記録を読むだけだった書記は、自ら歩いた旅を新しい頁へ残した。"],
    ember_crown_opening: ["灰の国に残った騎士", "雲海の下で、灰をかぶった騎士ガルムが一人きりで城門を守っていた。王国はすでに滅び、門を通る民もいない。それでも命令を捨てられない彼に、ミナは『守る相手を自分で選べ』と告げる。今を生きる者を守るため、ガルムはその場でギルドへ加わった。"],
    ember_crown_clear: ["王ではなく人を守る盾", "灰冠王が抱えていた火を手放すと、ガルムもまた錆びた王命を炉へ投げ入れた。『私の盾は、もう墓標を守るためには使わない』。差し込んだ朝日の中、彼は初めて命令ではなく自分の意思で仲間の前へ立った。"],
    mirror_tide_opening: ["海底から聞こえた歌", "白霜の海岸で、シアは海中から届く名前を歌い続けていた。それは沈んだ記録院と、歴史から消された船乗りたちの名だった。『歌を止めたら、この人たちは二度目に死んでしまう』。名を地上へ届けるため、シアはギルドへ加わった。"],
    mirror_tide_clear: ["地上へ帰った潮歌", "鏡海女王が剣を収めると、シアの歌に応えて無数の名前が海面へ浮かんだ。彼女は最後の一節を歌い終え、それでも楽器をしまわなかった。『帰れなかった人たちの歌を、海のない場所にも届けたい』。その歌は次の旅へ続いていく。"],
    clockwork_desert_opening: ["同じ日を数える機巧", "止まった砂の都で、機巧人ティオは今日が繰り返されるたび壁へ一本の傷を刻んでいた。数えた日数は、本人にも読めないほど重なっている。『次の日というものを観測したい』。未知の明日を探すため、ティオはギルドへ加わった。"],
    clockwork_desert_clear: ["記録にない最初の朝", "ミナが未完成の解放歯車を組み上げても、都市の時計は最後の一秒で止まったままだった。時砂女王は『進めば、失った人々との今日が終わる』と手を離せない。ティオは女王と向き合い、『終わるのではなく、覚えたまま次へ進みます』と自分の内部時計で最後の一秒を刻んだ。戦いではなく一つの選択が砂時計を落とし、都市に初めて明日が訪れた。"],
    forgotten_titan_clear: ["巨人から受け継いだ自由時", "忘却の時計巨人は、都市を同じ一日へ閉じ込めるためではなく、いつか自ら歩き出すための動力を守っていた。ティオは巨人の核から時を刻む権限を受け取り、命令された秒ではなく自分で選んだ瞬間を内部時計へ刻む。『これからの時刻は、私が決めます』。"],
    blackwood_pilgrimage_opening: ["夢を返せない妖精", "黒樹海の入口で、リゼは眠った旅人たちの夢を小瓶へ移して守っていた。しかし夜花が力を増し、目覚めさせる場所が足りない。『誰かの思い出を守るだけで、私の言葉は何も残っていない』。夢を返す旅へ出るため、リゼはギルドへ加わった。"],
    blackwood_pilgrimage_clear: ["夢を返す夜明け", "託宣者を傷つければ、囚われた夢も壊れる。リゼは戦いを止め、シアの歌に合わせて小瓶の夢を一つずつ持ち主へ返した。空になった聖域で託宣者は自ら眠りを選び、夜花は朝を拒むのをやめる。リゼは最後の瓶へ自分が見た夜明けを吹き込み、『今度は守るだけじゃなく、一緒に物語を作りたい』と笑った。"],
    thunder_snow_peaks_opening: ["門の向こうを知らない巡礼者", "雷雪の山脈で、竜人の狩人カイは極光の門を見張り続けていた。空から降りる災いを警戒しながら、彼自身は山の外を知らない。『門を守るだけでは、地上の何を守ったことになる？』。地上を歩いて答えを探すため、カイはギルドへ加わった。"],
    thunder_snow_peaks_clear: ["極光を背にした答え", "山頂の守護者は武器を構えず、『門を越えて何を守る』と最後の問いを投げた。カイは空ではなく、ガルムの盾の向こうに見える仲間と地上を指す。『見張るだけの巡礼は終わりだ。歩いて知ったこの世界を守る』。答えを聞いた守護者は極光を解き、勝敗ではなく選択によって星路が開いた。"],
    northern_star_tomb_opening: ["器が見る夢", "凍った星海の岸で、一行はすでに揺籃を抜け出していた名もない青年と出会った。彼は夢の中で見つけた『ノア』を仮の名として選び、奪われた記憶を探しているという。器ではなく一人の人間として旅を始めるため、ノアはその場でギルドへ加わった。"],
    northern_star_tomb_clear: ["ノアが選んだ名前", "眠れる器は王朝が与えた番号ではなく、夢の中で見つけた『ノア』を改めて自分の名として選んだ。奪われた星核を取り戻さなければ、空の主が地上へ降りるという。『これは器の役目ではない。僕が選んだ旅です』。"],
    falling_sky_castle_opening: ["星図を読む者、空を狩る者", "エレナは欠けた星図を広げ、『城は攻めてくるのではなく、何かから逃げています』と告げた。黒い羽の落ち方を見たカイも、『なら狩るべきは城ではない。その背後だ』と風向きを示す。書庫と山で別々に得た知識が同じ道を指し、仲間たちは敵城へ攻め込むのではなく、逃走中の空中城との接触を試みた。"],
    falling_sky_castle_clear: ["空城と交わした取引", "蝕星王は地上を侵略する余力を失い、黒い月から逃れる道だけを求めていた。エレナは鋳造所の対地兵器を停止する代わりに、王へ黒月への星路を開かせる。カイが最後の砲身を空へ向け直すと、王は使者が奪った星図の写しを差し出した。倒した王から地図を得るのではなく、互いの脅威を退ける取引が次の道を開いた。"],
    black_moon_prison_opening: ["時計のない黒月", "黒月へ渡ったティオの時計は、初めて完全に沈黙した。そこでは囚人の記憶が時間の代わりに消費されている。『時刻は測れません。でも、失われる順番なら追えます』。ティオは自分の記録を頼りに、心核までの道を選ぶ。"],
    black_moon_prison_clear: ["一つの朝で止めた心核", "黒月の心核は、外から壊せば囚人の記憶まで燃やす仕組みだった。ティオは自分が初めて迎えた朝の記憶を炉へ差し出し、その一瞬を何度も循環させて心核を飽和させる。エレナは薄れていく朝の景色を隣で書き留め、『失くしても、あなたへ語り直せます』と約束した。心核は破壊ではなく、二人が分け合った記憶によって静止した。"],
    primordial_forest_opening: ["記録より古い声", "始原樹海で聞こえた囁きを、エレナの文献は一つも説明できなかった。リゼは根へ触れ、『これは文字になる前の物語』と答える。書記は筆を置き、夢守は耳を澄ます。二人は王朝より古い記憶を辿り始めた。"],
    primordial_forest_clear: ["森へ返した最初の記憶", "始原樹の心臓は力で止めるほど激しく脈打った。リゼが根の夢から初代王の幼い記憶を探し出し、エレナが欠けた名を読み上げて森へ返すと、大樹は奪われた代価を受け取って静まる。封印を壊す代わりに古い取引を終わらせ、根門は自ら星海への道を開いた。"],
    starsea_corridor_opening: ["潮歌が覚えていた星海", "地下に広がる青い海を見て、シアは沈んだ記録院で聞いた最古の歌を思い出した。星は空から落ちたのではなく、この海から汲み上げられたと歌詞は告げている。彼女の声を羅針盤に、一行は星海の源流へ進む。"],
    starsea_corridor_clear: ["逆流した星の潮", "心珠を砕けば星海そのものが枯れる。シアは取り戻した帰還節を歌い、ティオが失われた拍子を刻むことで、王都へ向かう流れを一巡だけ空へ逆流させた。澄んだ潮の奥に北へ昇る黒い光が現れ、戦利品ではなく、海が自ら次の行き先を示した。"],
    leviathan_trench_clear: ["星海へ帰った真名", "海竜が守っていたのは黒い星殻だけではなく、帰路を奪われた者たちの真名だった。シアが一人ずつ名を歌うと、深海に沈んでいた声が星光となって浮かび上がる。『帰る港がなくても、名前は帰せる』。潮歌は記憶を守る歌から、失われた者を送り届ける歌へ変わった。"],
    void_star_prison_clear: ["余白へ戻った虚星王", "虚星執政官の鎖から、王統譜にない王の名が一文字だけ現れた。エレナは残りを推測で埋めず、空白のまま旅で見た事実を書き添える。『分からないことを隠さず残すのも、書記の仕事です』。欠けた歴史は、初めて誰かに決められた結末から解放された。"],
    white_dragon_roost_clear: ["地上を映した極光眼", "白嶺竜はカイへ空の彼方ではなく、山麓で灯る小さな家々を見せた。彼は極光眼に映る地上を一つずつ覚え、『門ではなく、ここで生きる者を見張る』と弓を引く。古竜の白い羽が矢へ重なり、新しい天猟の軌道を描いた。"],
    star_eater_rootpit_clear: ["夢守が残した自分の頁", "原星喰らいが眠ると、リゼは守ってきた無数の夢を根へ返し、空いた小瓶へ自分の声を吹き込んだ。『これは誰かから預かった夢じゃない。私がここで選んだ物語』。その灯は仲間の傷と悪夢を同時にほどく、新しい夢守の力になった。"],
    hollow_coronation_clear: ["今を守る無冠の盾", "空王たちが差し出した冠を、ガルムは盾で静かに押し返した。『私が仕えるのは、過去の王でも未来の王でもない。いま隣に立つ者たちだ』。王名を刻んだ灰が消えると、盾には誰の紋章も持たない新しい守りが宿った。"],
    returnless_capital_opening: ["盾と器が帰る王都", "星を失った王都へ、ガルムはかつて守れなかった民の面影を見た。ノアは奪われた星核の鼓動を感じる。『今度は王座ではなく、ここで生きる人々を守る』『僕は器としてではなく、自分のものを取り戻す』。二人の決意が帰らずの門を開く。"],
    returnless_capital_clear: ["取り戻した星核、選び直した力", "簒奪者から星核を取り戻したノアは、器へ戻ることを拒んだ。星核を胸へ収める代わりに、自分の意思へ結び直す。北辰の脈動は新しい形へ変わり、誰かに使われるためではない力が目覚めた。"],
    end_of_starless_night_opening: ["八人が選んだ最後の遠征", "天門の前に、坑道、書庫、灰の国、鏡の海、砂の都、黒樹海、雷雪の峰、北天の墓で出会った八人が並んだ。誰も予言に選ばれた英雄ではない。それぞれが終えたい過去と始めたい明日を持ち、名もない宿の仲間として空へ踏み出す。"],
    end_of_starless_night_clear: ["星なき夜の終わり", "ノアが星核を砕き、八人と冒険者たちが空の主の真名を呼ぶと、世界を巡る収穫の鎖は途切れた。帰還後、ミナは工房を開き、エレナは余白のある本を選び、ガルムは宿の扉に盾を立てた。シアの歌にティオが時を刻み、リゼが物語を瓶へ残し、カイは初めて誰のものでもない星を見上げる。ギルドの扉には、また新しい依頼が届いていた。"]
  };
  Object.entries(rewritten).forEach(([id, [name, text]]) => {
    if (data.storyScenes[id]) overlays[id] = Object.assign({}, overlays[id], { name, text });
  });

  [
    ["falling_sky_castle_opening", "elena", ["kai"]],
    ["black_moon_prison_opening", "tio", []],
    ["primordial_forest_opening", "rize", ["elena"]],
    ["starsea_corridor_opening", "shia", []],
    ["returnless_capital_opening", "garm", ["noah"]],
    ["end_of_starless_night_opening", "noah", Object.keys(data.companions)],
    ["end_of_starless_night_clear", "noah", Object.keys(data.companions)]
  ].forEach(([sceneId, protagonistId, castIds]) => feature(sceneId, protagonistId, castIds));

  [
    ["white_sand_road_discovery", "tio", ["mina"]],
    ["whispering_roots_discovery", "rize", ["shia"]],
    ["frozen_sky_bridge_discovery", "kai", ["garm"]],
    ["sealed_memory_ward_discovery", "tio", ["elena"]],
    ["memory_moss_woods_discovery", "rize", ["elena"]],
    ["submerged_temple_discovery", "shia", ["tio"]],
    ["black_aurora_field_discovery", "noah", ["shia"]],
    ["north_return_road_discovery", "garm", ["noah"]],
    ["blackwood_pilgrimage_clear", "rize", ["shia"]],
    ["thunder_snow_peaks_clear", "kai", ["garm"]],
    ["falling_sky_castle_clear", "elena", ["kai"]],
    ["black_moon_prison_clear", "tio", ["elena"]],
    ["primordial_forest_clear", "rize", ["elena"]],
    ["starsea_corridor_clear", "shia", ["tio"]]
  ].forEach(([sceneId, protagonistId, castIds]) => feature(sceneId, protagonistId, castIds));

  triggers.push({
    id: "advance_companion_shia_starsea_song",
    when: { type: "dungeonCleared", dungeonId: "leviathan_trench" },
    effects: [{ type: "advanceCompanion", companionId: "shia", stageId: "starsea_song" }]
  });

  triggers.push({
    id: "advance_companion_tio_free_clock",
    when: { type: "dungeonCleared", dungeonId: "forgotten_titan_tomb" },
    effects: [{ type: "advanceCompanion", companionId: "tio", stageId: "free_clock" }]
  });

  triggers.push({
    id: "advance_companion_mina_free_hammer",
    when: { type: "chapterCompleted", chapterId: "clockwork_desert" },
    effects: [{ type: "advanceCompanion", companionId: "mina", stageId: "free_hammer" }]
  });
  feature(chapter("clockwork_desert").clearStoryId, "tio", ["mina"]);

  triggers.push({
    id: "advance_companion_noah_reclaimed_star",
    when: { type: "chapterCompleted", chapterId: "returnless_capital" },
    effects: [{ type: "advanceCompanion", companionId: "noah", stageId: "reclaimed_star" }]
  });
  feature(chapter("returnless_capital").clearStoryId, "noah", ["garm"]);

  [
    ["elena", "void_star_prison", "written_void_star"],
    ["kai", "white_dragon_roost", "earthward_hunter"],
    ["rize", "star_eater_rootpit", "own_story"],
    ["garm", "hollow_coronation", "present_bulwark"]
  ].forEach(([companionId, dungeonId, stageId]) => {
    triggers.push({
      id: `advance_companion_${companionId}_${stageId}`,
      when: { type: "dungeonCleared", dungeonId },
      effects: [{ type: "advanceCompanion", companionId, stageId }]
    });
    const links = relations.dungeonStoryLinks[dungeonId] || {};
    [links.openingStoryId, links.discoveryStoryId, data.dungeons[dungeonId]?.optionalStoryId].filter(Boolean).forEach(sceneId => feature(sceneId, companionId));
  });
  data.registry.relations("companionStoryArcs", arcs);
  data.registry.relations("storySceneOverlays", overlays);
  data.registry.relationList("storyTriggers", triggers);
})();
