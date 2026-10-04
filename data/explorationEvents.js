(function () {
  "use strict";
  const data = window.GameData = window.GameData || {};
  const explorationEvents = {
    treasure: {
      extraChance: .2, equipmentChance: .06, goldMinimumRate: .08, goldMaximumRate: .16,
      types: [
        { id: "weathered", name: "古びた木箱", rank: 0, weight: 70, equipmentChanceMultiplier: .65, goldMultiplier: .75 },
        {
          id: "ironbound", name: "鉄縁の宝箱", rank: 1, weight: 25, equipmentChanceMultiplier: 1.25, goldMultiplier: 1.2,
          challenge: {
            aptitudeIds: ["scouting", "traversal"], baseChance: .72, maximumChance: .96, failureGoldMultiplier: .4,
            successText: "{name}が錠と蝶番の癖を見抜き、音を立てずに蓋を開いた。",
            failureText: "固い錠を完全には外せず、こじ開けた隙間から拾えるものだけを回収した。"
          }
        },
        {
          id: "starsealed", name: "星紋の宝箱", rank: 2, weight: 5, equipmentChanceMultiplier: 3, goldMultiplier: 2,
          challenge: {
            aptitudeIds: ["arcana", "scouting"], baseChance: .55, maximumChance: .9, failureGoldMultiplier: .3,
            successText: "{name}が星紋の流れを読み、途切れた光を結んで封印を解いた。",
            failureText: "星紋の封印は最後まで解けず、こぼれ出た僅かな中身だけを持ち帰った。"
          }
        }
      ]
    },
    routeMastery: { successes: 3, successChanceBonus: .08 },
    personalPractice: { successes: 5, successChanceBonus: .05 },
    treasurePersonalPractice: { openings: 10, successChanceBonus: .05 },
    teamSurvey: { specialtyCount: 3, memberCount: 2, extraEvents: 1 },
    rumorWeightMultiplier: 2,
    rumorConfirmationReward: { itemId: "guild_seal", quantity: 1 },
    treasureMastery: { openings: 3, successChanceBonus: .08 },
    companionBondReward: { itemId: "guild_seal", quantity: 1 },
    adventurerBondMomentChance: .35,
    adventurerBondRouteSupport: [
      { minimumSharedSorties: 5, successChanceBonus: .03, label: "歩調の合う支え" },
      { minimumSharedSorties: 20, successChanceBonus: .06, label: "阿吽の支え" }
    ],
    adventurerBondBattleSupport: [
      { minimumSharedSorties: 5, statMultiplier: 1.02, label: "合図の通る間合い" },
      { minimumSharedSorties: 20, statMultiplier: 1.04, label: "背中を預ける布陣" }
    ],
    adventurerBondMoments: [
      { id: "shared_rest", title: "先回りした休息", minimumSharedSorties: 5, text: "{left}が足を止めるより先に、{right}はいつもの休憩場所を見つけて荷を下ろした。二人の間では、合図より先に歩調が揃っていた。" },
      { id: "shared_crossroad", title: "相談のいらない分かれ道", minimumSharedSorties: 5, text: "分かれ道で{left}が地図を開くと、{right}は迷わず片方の道を指した。何度も同じ景色を見た二人には、相談の前から答えが分かっていた。" },
      { id: "shared_maintenance", title: "旅支度の順番", minimumSharedSorties: 5, text: "{right}が装具の緩みに気づき、{left}へ無言で留め具を渡した。小さな手入れの順番まで、いつの間にか旅支度の一部になっていた。" },
      { id: "trusted_signal", title: "二人だけの合図", minimumSharedSorties: 20, text: "暗がりで{left}が指を二度鳴らすと、{right}は振り返らず隊列を止めた。長い旅の間に、二人だけの短い合図がいくつも増えていた。" },
      { id: "trusted_watch", title: "交代を告げない夜", minimumSharedSorties: 20, text: "野営の火が小さくなる頃、{right}は眠った{left}の分まで見張りを引き受けた。明日の夜は交代することを、言葉にせずとも互いに知っている。" },
      { id: "trusted_return", title: "次の帰り道", minimumSharedSorties: 20, text: "帰り道を確かめる{left}へ、{right}が『またここを歩く気だろう』と笑った。二人にとって遠征は、帰還して終わるものではなくなっていた。" }
    ],
    aptitudes: {
      scouting: {
        jobIds: ["thief", "ranger", "ninja"], raceIds: ["elf", "beastkin", "halfling", "goblin"], birthIds: ["hunter", "frontier", "orphan"],
        bonuses: { job: .35, race: .16, birth: .14 }
      },
      camping: {
        jobIds: ["cleric", "bard", "druid", "summoner"], raceIds: ["fairy", "celestial", "gnome"], birthIds: ["sacred", "troupe", "alchemist"],
        bonuses: { job: .35, race: .16, birth: .14 }
      },
      traversal: {
        jobIds: ["warrior", "knight", "monk", "spellblade"], raceIds: ["dwarf", "orc", "dragonewt", "automaton", "giantkin"], birthIds: ["guard", "mercenary", "blacksmith", "dragon_ward"],
        bonuses: { job: .35, race: .16, birth: .14 }
      },
      arcana: {
        jobIds: ["mage", "spellblade", "summoner", "druid"], raceIds: ["elf", "fairy", "celestial", "demonkin"], birthIds: ["scholar", "alchemist", "sacred", "noble"],
        bonuses: { job: .35, race: .16, birth: .14 }
      },
      gathering: {
        jobIds: ["ranger", "druid", "thief", "summoner"], raceIds: ["elf", "beastkin", "gnome", "halfling"], birthIds: ["hunter", "frontier", "alchemist", "orphan"],
        bonuses: { job: .35, race: .16, birth: .14 }
      }
    },
    routeEvents: [
      { id: "hidden_passage", name: "隠し道", recordLabel: "隠し道を見つけた", kind: "secret", aptitudeId: "scouting", baseChance: .22, maximumChance: .82, successText: "{name}が壁の継ぎ目から隠し通路を見つけた。奥に残されていた{gold}Gを回収した。", failureText: "不自然な壁の継ぎ目を見つけたが、奥へ続く仕掛けは動かなかった。", effect: { type: "gold", on: "success", minimumRate: .04, maximumRate: .09 } },
      { id: "sheltered_camp", name: "野営地", recordLabel: "野営地を整えた", kind: "camp", aptitudeId: "camping", baseChance: .3, maximumChance: .86, successText: "{name}が風を避けられる場所を見つけ、傷と装具を整える短い野営を設けた。", failureText: "休めそうな場所を調べたが、魔物の気配が近く足を止められなかった。", effect: { type: "recovery", on: "success", rate: .12 } },
      { id: "unstable_footing", name: "危険な足場", recordLabel: "危険な足場を導いた", kind: "hazard", aptitudeId: "traversal", baseChance: .24, maximumChance: .8, successText: "{name}が足場の崩れる兆しに気づき、全員を安全な道へ導いた。", failureText: "不安定な足場が崩れ、一行は傷を負いながら先へ進んだ。", effect: { type: "damage", on: "failure", rate: .05 } },
      { id: "forgotten_inscription", name: "忘れられた碑文", recordLabel: "碑文を読み解いた", kind: "lore", aptitudeId: "arcana", baseChance: .24, maximumChance: .82, successText: "{name}が欠けた文字へ魔力を通し、古い記憶を読み解いた。一行はその知見から経験を得た。", failureText: "風化した碑文を写し取ったが、欠けた文字の意味までは読み解けなかった。", effect: { type: "experience", on: "success", minimumRate: .04, maximumRate: .08 } },
      { id: "material_traces", name: "素材の痕跡", recordLabel: "素材の痕跡を追った", kind: "gather", aptitudeId: "gathering", baseChance: .27, maximumChance: .84, successText: "{name}が魔物の通り道と地形を読み、「{item}」を{quantity}個見つけた。", failureText: "使えそうな痕跡を追ったが、採取できる素材はすでに持ち去られていた。", effect: { type: "material", on: "success", minimumQuantity: 1, maximumQuantity: 2 } },
      { id: "ancient_ward", name: "古い守護陣", recordLabel: "守護陣を起動した", kind: "lore", aptitudeId: "arcana", baseChance: .2, maximumChance: .78, successText: "{name}が薄れた守護陣へ魔力を通した。淡い光が一行を包み、次の戦いから身を守る。", failureText: "床に守護陣らしい線を見つけたが、欠けた術式は光を取り戻さなかった。", effect: { type: "ward", on: "success", rate: .15 } },
      { id: "enemy_tracks", name: "魔物の足跡", recordLabel: "魔物の進路を読んだ", kind: "secret", aptitudeId: "scouting", baseChance: .23, maximumChance: .81, successText: "{name}が新しい足跡から魔物の進路を読み、見通しのよい場所へ先回りした。次の戦いは一行が先に備えられる。", failureText: "魔物の足跡を追ったが、古い跡が入り混じり、進路までは読めなかった。", effect: { type: "initiative", on: "success", rate: .2 } }
    ],
    companionMoments: [
      { id: "mina_earth_echo", title: "地脈の響き", companionIds: ["mina"], lines: ["ミナは壁へ耳を当て、地脈の響きから崩れにくい道を選んだ。", "ミナは壊れた留め具を拾い、歩きながら使える形へ打ち直した。"] },
      { id: "elena_blank_map", title: "地図の余白", companionIds: ["elena"], lines: ["エレナは地図の余白へ新しい道を書き込み、記録にない景色を嬉しそうに見回した。", "エレナは古い印を写し取り、帰還したら資料室へ残すと小さく頷いた。"] },
      { id: "garm_rearguard", title: "最後尾の盾", companionIds: ["garm"], lines: ["ガルムは足を止め、全員が通り過ぎるまで黙って背後を見張った。", "ガルムは古傷の残る盾を確かめ、先頭へ戻って歩き出した。"] },
      { id: "shia_tide_song", title: "道を結ぶ潮歌", companionIds: ["shia"], lines: ["シアが短い潮歌を口ずさむと、迷っていた足音が同じ歩調へ揃った。", "シアは風の反響へ耳を澄ませ、声がよく戻る方角を進路に選んだ。"] },
      { id: "tio_new_route", title: "昨日になかった道", companionIds: ["tio"], lines: ["ティオは歩数と経過時間を数え直し、昨日まで存在しなかった近道を見つけた。", "ティオの胸で小さな歯車が鳴り、危険が近づく前に隊列へ合図を送った。"] },
      { id: "rize_memory_flower", title: "草花の記憶", companionIds: ["rize"], lines: ["リゼが眠る草花へ触れると、誰かが通り過ぎた記憶が淡い光になって浮かんだ。", "リゼは仲間の不安な夢を小瓶へ預かり、帰るまで失くさないと微笑んだ。"] },
      { id: "kai_wind_measure", title: "風を測る矢", companionIds: ["kai"], lines: ["カイは高い足場へ登り、風向きと獣の動きから安全な道を見極めた。", "カイは空へ一度だけ矢を放ち、戻ってきた反響から奥行きを測った。"] },
      { id: "noah_earthbound_step", title: "地上を選ぶ足", companionIds: ["noah"], lines: ["ノアの胸で星の光が一度だけ瞬き、暗がりに埋もれた道の輪郭を照らした。", "ノアは遠い空を見上げたあと、自分で選んだ足取りで仲間の後を追った。"] },
      { id: "mina_unbound_hammer", title: "命令のない修繕", companionIds: ["mina"], requiredStages: { mina: "free_hammer" }, lines: ["ミナは修理を終えた機巧へ命令を与えず、『止まる時は自分で決めな』と送り出した。", "崩れた足場を直したミナは、誰にも命じられないまま仲間の歩幅へ戻った。"] },
      { id: "elena_living_record", title: "生きている記録", companionIds: ["elena"], requiredStages: { elena: "written_void_star" }, lines: ["エレナは古い記述を写す手を止め、今ここにいる仲間の言葉を先に余白へ残した。", "エレナは欠けた碑文を無理に補わず、『分からなかったことも記録よ』と頁を閉じた。"] },
      { id: "garm_crownless_watch", title: "王なき見張り", companionIds: ["garm"], requiredStages: { garm: "present_bulwark" }, lines: ["ガルムは古い王国の方角ではなく、笑い声のする野営地へ盾を向けて腰を下ろした。", "誰の命令も待たず、ガルムは疲れた仲間の荷を受け取って先頭へ立った。"] },
      { id: "shia_returned_names", title: "返された名前", companionIds: ["shia"], requiredStages: { shia: "starsea_song" }, lines: ["シアの新しい歌には失われた名だけでなく、今日ここを歩く仲間の名も加わっていた。", "シアは潮歌の終わりを悲歌にせず、帰った後に歌う次の節を口ずさんだ。"] },
      { id: "tio_own_time", title: "自分で数える時", companionIds: ["tio"], requiredStages: { tio: "free_clock" }, lines: ["ティオは最短経路を示したあと、景色のよい遠回りも自分の選択肢へ書き加えた。", "決められた時刻を告げる鐘がなくても、ティオは仲間と休む時間を自分で決めた。"] },
      { id: "rize_own_words", title: "自分の言葉", companionIds: ["rize"], requiredStages: { rize: "own_story" }, lines: ["リゼは拾った夢を誰かの物語へ戻さず、自分が感じた色を自分の言葉で語った。", "リゼは守った記憶の隣に、今日自分が笑った理由を小さく書き添えた。"] },
      { id: "kai_chosen_ground", title: "選んだ地上", companionIds: ["kai"], requiredStages: { kai: "earthward_hunter" }, lines: ["カイは空の異変を見上げたあと、まず足元の小さな花を踏まない道を選んだ。", "かつて門だけを見張ったカイは、仲間が帰る地上の目印を一つずつ確かめた。"] },
      { id: "noah_reclaimed_light", title: "取り戻した星明かり", companionIds: ["noah"], requiredStages: { noah: "reclaimed_star" }, lines: ["ノアは胸の星を隠さず灯し、それを命令の印ではなく仲間の足元を照らす光にした。", "星核の鼓動を確かめたノアは、『これは僕の歩く速さだ』と静かに笑った。"] },
      { id: "mina_tio_machine_doubt", title: "機械の迷い", companionIds: ["mina", "tio"], lines: ["ミナがティオの腕の歯車を調整すると、ティオは初めて聞く軽い駆動音に何度も手を開いた。", "ティオが示した誤差を、ミナは『機械の迷いも悪くない』と笑って地図へ残した。"] },
      { id: "elena_rize_flower_mark", title: "余白の花印", companionIds: ["elena", "rize"], lines: ["リゼが見た夢をエレナが書き留める。言葉にならない部分には、二人で小さな花印を置いた。", "エレナが余白を空けると、リゼは『そこには明日の話を書こう』と覗き込んだ。"] },
      { id: "garm_shia_marching_song", title: "忘れた行軍歌", companionIds: ["garm", "shia"], lines: ["シアの歌が途切れないよう、ガルムは風上に盾を立てて静かな場所を作った。", "ガルムが昔の行軍歌を一節だけ口ずさみ、シアは知らないふりで次の節を重ねた。"] },
      { id: "kai_noah_ground_arrow", title: "地上へ戻る印", companionIds: ["kai", "noah"], lines: ["カイが空の傷を指すと、ノアは恐れず見上げ、『今度は地上から選ぶ』と答えた。", "ノアの星明かりを目印に、カイは地上へ戻るための矢印を岩へ刻んだ。"] },
      { id: "mina_elena_unwritten_tool", title: "記録にない道具", companionIds: ["mina", "elena"], lines: ["エレナが用途不明と記した金具を、ミナは荷を結ぶ留め具へ作り替えた。余白には二人分の注釈が増えた。", "ミナの即興の修理を見たエレナは、完成図ではなく迷った手順から先に書き留めた。"] },
      { id: "garm_kai_quiet_watch", title: "二つの見張り方", companionIds: ["garm", "kai"], lines: ["遠くを見るカイと背後を守るガルムは、一言も交わさず互いの死角を埋めていた。", "カイが見つけた細い退路へ、ガルムは全員が迷わないよう盾の跡を残した。"] },
      { id: "shia_rize_dream_refrain", title: "夢から戻る歌", companionIds: ["shia", "rize"], lines: ["リゼが拾った途切れた夢を、シアは名もない歌の続きにして持ち主へ返した。", "シアの潮歌に合わせ、リゼの小瓶の中で悪夢が静かな夜の色へほどけていった。"] },
      { id: "tio_noah_counted_stars", title: "数えられない星", companionIds: ["tio", "noah"], lines: ["ティオが星の間隔を数え続ける隣で、ノアは『数え終わらないから空なんだ』と笑った。", "ノアの星明かりに生じた揺らぎを、ティオは誤差ではなく今日の記憶として保存した。"] }
    ],
    environments: {
      green: {
        eventWeights: { hidden_passage: 5, sheltered_camp: 3, unstable_footing: 2, forgotten_inscription: 2, material_traces: 6, ancient_ward: 1, enemy_tracks: 6 },
        rumors: [
          { eventId: "material_traces", text: "背の高い草の獣道には、魔物が運び損ねた欠片が残るらしい。" },
          { eventId: "hidden_passage", text: "風が壁際だけ揺れる場所では、地図にない道へ抜けられることがある。" },
          { eventId: "enemy_tracks", text: "草がまだ起き上がっていない獣道を辿れば、魔物より先に戦場へ着けるという。" }
        ],
        levelName: number => `第${number}区画`,
        arrivals: ["風に揺れる草をかき分け、新しい区画へ入った。", "獣道をたどり、見通しのよい場所へ出た。", "古い街道跡を見つけ、その先へ進んだ。"],
        discoveries: ["折れた枝と新しい足跡が残っている。", "風の音に混じって、遠くから魔物の鳴き声が聞こえる。", "背の高い草の陰に、誰かが休んだ跡を見つけた。", "苔むした道標が次の進路を示している。"]
      },
      blue: {
        eventWeights: { hidden_passage: 3, sheltered_camp: 2, unstable_footing: 5, forgotten_inscription: 3, material_traces: 5, ancient_ward: 2, enemy_tracks: 4 },
        rumors: [
          { eventId: "unstable_footing", text: "坑道の石が低く鳴ったら、次の一歩を急いではいけない。" },
          { eventId: "material_traces", text: "古い採掘跡には、魔物が巣へ運ぶ途中で落とした素材が残るという。" },
          { eventId: "enemy_tracks", text: "坑道の砂に残る爪跡は、次に魔物が曲がる方角まで教えるらしい。" }
        ],
        levelName: number => `地下${number}層`,
        arrivals: ["湿った石段を下り、次の層へ到着した。", "淡い鉱石の光を頼りに奥へ進んだ。", "狭い裂け目を抜け、広い坑道へ出た。"],
        discoveries: ["壁面に採掘された跡が続いている。", "暗がりから水滴の音が規則的に響く。", "足元に魔物が引きずったらしい痕跡がある。", "崩れた支柱の向こうに古い通路を見つけた。"]
      },
      purple: {
        eventWeights: { hidden_passage: 5, sheltered_camp: 2, unstable_footing: 3, forgotten_inscription: 6, material_traces: 2, ancient_ward: 7, enemy_tracks: 3 },
        rumors: [
          { eventId: "forgotten_inscription", text: "欠けた碑文は文字より先に、触れた魔力へ昔の記憶を返すらしい。" },
          { eventId: "hidden_passage", text: "灯りが不自然に揺れる回廊には、閉ざされた脇道が眠っている。" },
          { eventId: "ancient_ward", text: "床の円環が僅かに温かい場所では、古い守りがまだ次の戦いを待っている。" }
        ],
        levelName: number => `第${number}階層`,
        arrivals: ["古い紋章の刻まれた門をくぐった。", "崩れかけた階段を上り、次の階層へ到着した。", "魔力の残滓を追って遺構の奥へ進んだ。"],
        discoveries: ["壁画の一部が淡く光り、失われた道を示している。", "床に残る焦げ跡から、ここで戦いがあったと分かる。", "封印文字の刻まれた扉は、すでに何者かに破られている。", "静かな回廊に、金属の擦れる音が響いた。"]
      },
      red: {
        eventWeights: { hidden_passage: 2, sheltered_camp: 2, unstable_footing: 16, forgotten_inscription: 2, material_traces: 2, ancient_ward: 1, enemy_tracks: 3 },
        rumors: [
          { eventId: "unstable_footing", text: "赤い岩場では、ひびの色より踏んだ時の音を信じた方がよい。" },
          { eventId: "unstable_footing", text: "灰が薄く積もる場所ほど、見えない亀裂が足元を走っている。" },
          { eventId: "enemy_tracks", text: "灰に沈んだ足跡の縁が赤いうちは、その主へ先回りできるかもしれない。" }
        ],
        levelName: number => `第${number}区画`,
        arrivals: ["熱気の満ちた通路を抜け、次の区画へ進んだ。", "赤く照らされた岩場へ到着した。", "灰の積もる坂道を越え、奥地へ踏み込んだ。"],
        discoveries: ["地面の亀裂から熱い風が吹き上がっている。", "焼け焦げた装具が道の端に残されている。", "大きな爪痕が岩壁を深く削っている。", "遠くで何か巨大なものが動く振動を感じた。"]
      },
      gold: {
        eventWeights: { hidden_passage: 4, sheltered_camp: 2, unstable_footing: 4, forgotten_inscription: 5, material_traces: 3, ancient_ward: 8, enemy_tracks: 4 },
        rumors: [
          { eventId: "forgotten_inscription", text: "止まった歯車の裏には、今も読まれるのを待つ星文字がある。" },
          { eventId: "hidden_passage", text: "金色の塵が吸い込まれる壁は、空洞の向こうへ続いているという。" },
          { eventId: "ancient_ward", text: "星を囲む円環へ正しい順で触れると、光が盾の形に立ち上がるらしい。" }
        ],
        levelName: number => `第${number}区画`,
        arrivals: ["金色の塵が舞う通路を抜け、次の区画へ入った。", "止まった歯車の隙間を通り、奥へ進んだ。", "淡い星明かりを頼りに、広い区画へ出た。"],
        discoveries: ["砂に半ば埋もれた機巧の部品を見つけた。", "遠くで古い歯車が一度だけ軋んだ。", "床を走る光の筋が別の通路へ続いている。", "誰かが星の位置を刻んだ目印が残っている。"]
      },
      silver: {
        eventWeights: { hidden_passage: 3, sheltered_camp: 3, unstable_footing: 4, forgotten_inscription: 4, material_traces: 3, ancient_ward: 5, enemy_tracks: 4 },
        rumors: [
          { eventId: "sheltered_camp", text: "雪が積もらない岩陰は、短く息を整える場所になる。" },
          { eventId: "forgotten_inscription", text: "凍った壁の青い光には、古い言葉の並びが残っているらしい。" },
          { eventId: "ancient_ward", text: "凍りつかない紋様の内側では、冷たい光が刃を逸らすという。" }
        ],
        levelName: number => `第${number}層`,
        arrivals: ["白い霧をかき分け、凍てついた層へ入った。", "薄氷を避けながら、銀色の岩棚へ進んだ。", "雪に埋もれた階段を見つけ、その先へ下りた。"],
        discoveries: ["雪面に途中で消えた足跡が残っている。", "凍った壁の奥で青白い光が揺れた。", "風を避けられそうな岩陰を見つけた。", "ひび割れた氷の下から低い音が響いている。"]
      },
      default: {
        eventWeights: { hidden_passage: 1, sheltered_camp: 1, unstable_footing: 1, forgotten_inscription: 1, material_traces: 1, ancient_ward: 1, enemy_tracks: 1 },
        rumors: [
          { eventId: "material_traces", text: "戦いの跡だけでなく、風や足跡にも旅を助ける手掛かりが残る。" },
          { eventId: "hidden_passage", text: "急いで通り過ぎた場所ほど、帰り道で違う顔を見せることがある。" },
          { eventId: "ancient_ward", text: "消えかけた円環の中には、まだ旅人を守る光が残ることがある。" },
          { eventId: "enemy_tracks", text: "新しい足跡を正しく読めば、待ち伏せられる前に相手の道へ回れる。" }
        ],
        levelName: number => `第${number}区画`,
        arrivals: ["周囲を警戒しながら、新しい区画へ進んだ。", "分かれ道を調べ、奥へ続く道を選んだ。"],
        discoveries: ["辺りを調べると、何者かが通った痕跡を見つけた。", "慎重に周囲を調べながら先へ進む。", "少し先から魔物の気配がする。"]
      }
    }
  };
  data.registry.config("explorationEvents", explorationEvents);
})();
