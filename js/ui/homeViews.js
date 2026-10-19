(function () {
  "use strict";

  window.GameUIViews = window.GameUIViews || {};

  function routeProgress(context, chapter, focus) {
    const clears = window.Story.ensure().facts.clears;
    const pendingDestinationId = window.Story.pendingEpisode()?.destination?.id;
    const routes = window.Story.chapterDungeons(chapter.id).filter(dungeon => dungeon.requiredForStory);
    if (!routes.length) return "";
    return `<ol class="story-route-progress">${routes.map((dungeon, index) => {
      const cleared = clears.includes(dungeon.id), unlocked = window.Story.canEnter(dungeon.id), current = focus?.dungeon?.id === dungeon.id;
      const waiting = pendingDestinationId === dungeon.id;
      const state = cleared ? "攻略済み" : waiting ? "物語待ち" : current ? "現在地" : unlocked ? "解放済み" : "未解放";
      return `<li class="${cleared ? "cleared" : waiting || current ? "current" : unlocked ? "unlocked" : "locked"}"><span class="story-route-number">${cleared ? "✓" : index + 1}</span><span><strong>${context.escape(dungeon.name)}</strong><small>Lv.${dungeon.recommendedLevel} · ${state}</small></span></li>`;
    }).join("")}</ol>`;
  }

  function companionStoryFocus(context, scene, compact = false) {
    const protagonist = window.GameData.storyCharacters?.[scene?.protagonistId];
    if (!protagonist) return "";
    const portrait = window.GameData.portraits?.[protagonist.portraitId];
    const cast = (scene.castIds || []).filter(id => id !== protagonist.id).map(id => window.GameData.storyCharacters?.[id]?.name).filter(Boolean);
    return `<div class="story-companion-focus ${compact ? "compact" : ""}">${portrait ? `<img src="${context.escape(portrait.image)}" alt="">` : ""}<span><small>${compact ? "物語の視点" : "この記録の主人公"}</small><strong>${context.escape(protagonist.name)} · ${context.escape(protagonist.title)}</strong>${cast.length ? `<em>同行：${context.escape(cast.join("、"))}</em>` : ""}</span></div>`;
  }

  function storyCastStrip(context, characters, label = "今回の登場人物") {
    if (!characters.length) return "";
    return `<div class="story-cast-strip"><span>${context.escape(label)}</span><div>${characters.map(character => {
      const portrait = window.GameData.portraits?.[character.portraitId];
      return `<span class="story-cast-chip">${portrait ? `<img src="${context.escape(portrait.image)}" alt="">` : ""}<b>${context.escape(character.name)}</b><small>${context.escape(character.title)}</small></span>`;
    }).join("")}</div></div>`;
  }

  function storyMemoryBrief(context, guide) {
    if (!guide.latest) return "";
    return `<details class="story-memory-brief"><summary><span><small>PREVIOUSLY · 前回まで</small><strong>${context.escape(guide.latest.scene.name)}</strong></span><i aria-hidden="true">›</i></summary><div class="story-memory-brief-body"><p>${context.escape(guide.latest.scene.text)}</p><div class="story-memory-links">${guide.recent.map(event => `<button type="button" data-action="replay-story-scene" data-scene="${context.escape(event.scene.id)}"><small>${context.escape(event.label)}</small><strong>${context.escape(event.scene.name)}</strong></button>`).join("")}</div></div></details>`;
  }

  function characterArchive(context) {
    const records = window.Story.characterChronicles();
    if (!records.length) return "";
    return `<details class="story-character-archive"><summary><span><small>CAST ARCHIVE</small><strong>人物から物語を振り返る</strong></span><span class="badge">${records.length}人</span></summary><div class="story-character-grid">${records.map(record => {
      const portrait = window.GameData.portraits?.[record.character.portraitId];
      return `<details class="story-character-record"><summary>${portrait ? `<img src="${context.escape(portrait.image)}" alt="">` : ""}<span><strong>${context.escape(record.character.name)}</strong><small>${context.escape(record.character.title)} · ${record.events.length}場面</small></span><i aria-hidden="true">›</i></summary><div class="story-character-scenes">${record.events.map(event => `<button type="button" data-action="replay-story-scene" data-scene="${context.escape(event.scene.id)}"><span>${context.escape(event.chapter?.title || event.dungeon?.name || "過去の記録")}</span><strong>${context.escape(event.scene.name)}</strong><small>${context.escape(event.scene.text)}</small></button>`).join("")}</div></details>`;
    }).join("")}</div></details>`;
  }

  function storyMysteryEntry(context, mystery) {
    const latest = mystery.latestEvidence;
    const currentText = mystery.resolved ? mystery.resolution : (latest?.note || mystery.clue);
    const margin = !mystery.resolved && latest?.margin ? `<p class="story-mystery-margin"><b>帳面の余白</b>${context.escape(latest.margin)}</p>` : "";
    const evidence = mystery.discoveredEvidence?.length ? `<details class="story-mystery-evidence"><summary>集めた記録 <b>${mystery.evidenceCount}/${mystery.evidenceTotal}</b></summary><ol>${mystery.discoveredEvidence.map((entry, index) => `<li><button type="button" data-action="replay-story-scene" data-scene="${context.escape(entry.sceneId)}"><small>記録 ${index + 1}</small><span>${context.escape(entry.scene?.name || mystery.title)}</span></button><p>${context.escape(entry.note)}</p></li>`).join("")}</ol></details>` : "";
    return `<article class="${mystery.resolved ? "resolved" : "active"}"><span aria-hidden="true">${mystery.resolved ? "✓" : mystery.evidenceCount}</span><div><small>${mystery.resolved ? "解明した記録" : `手掛かり ${mystery.evidenceCount}/${mystery.evidenceTotal}`}</small><strong>${context.escape(mystery.title)}</strong><p>${context.escape(currentText)}</p>${margin}${evidence}</div></article>`;
  }

  function storyMysteryBoard(context, includeResolved = false) {
    const mysteries = window.Story.mysteries().filter(mystery => includeResolved || !mystery.resolved);
    if (!mysteries.length) return "";
    const active = mysteries.filter(mystery => !mystery.resolved).length;
    const entries = mysteries.map(mystery => storyMysteryEntry(context, mystery)).join("");
    return `<details class="story-mystery-board"><summary><span><small>THREADS</small><strong>${includeResolved ? "物語の手掛かり帳" : "いま追っている手掛かり"}</strong></span><span class="badge ${active ? "" : "good"}">${active ? `${active}件を追跡中` : `${mysteries.length}件解明`}</span></summary><div class="story-mystery-list">${entries}</div></details>`;
  }

  function eventRows(context, events, options = {}) {
    const filtered = events.filter(event => options.includeOptional || event.dungeon?.requiredForStory !== false);
    return `<div class="story-timeline">${filtered.map(event => {
      const dungeonName = event.dungeon ? event.dungeon.name : event.chapter.title;
      const finalChapterScene = event.kind === "dungeonEnding" && event.scene.id === event.chapter.clearStoryId;
      const label = finalChapterScene ? "攻略・章完結" : event.label;
      return `<article class="story-event ${event.kind}"><span class="story-event-marker" aria-hidden="true"></span><div><span class="story-event-label">${context.escape(label)} · ${context.escape(dungeonName)}</span>${companionStoryFocus(context, event.scene, true)}<h4>${context.escape(event.scene.name)}</h4><p>${context.escape(event.scene.text)}</p><button type="button" class="story-replay-button" data-action="replay-story-scene" data-scene="${context.escape(event.scene.id)}">会話と情景をすべて読む</button></div></article>`;
    }).join("")}</div>`;
  }

  function chapterReplayButton(context, chapter, events, label = "この章を最初から通して読む") {
    if (!chapter || !events.length) return "";
    return `<button type="button" class="story-chapter-replay" data-action="replay-story-chapter" data-chapter="${context.escape(chapter.id)}"><span><small>CHAPTER READER</small><strong>${context.escape(label)}</strong></span><em>${events.length}場面</em><i aria-hidden="true">›</i></button>`;
  }

  function chapterRecap(context, events) {
    if (!events.length) return "";
    const candidates = [
      { label: "はじまり", event: events[0] },
      { label: "転機", event: events[Math.floor((events.length - 1) / 2)] },
      { label: "結末", event: events.at(-1) }
    ];
    const seen = new Set();
    const beats = candidates.filter(({ event }) => event?.scene && !seen.has(event.scene.id) && seen.add(event.scene.id));
    return `<section class="story-chapter-recap" aria-label="章のあらすじ"><header><span><small>CHAPTER SUMMARY</small><strong>章の節目を振り返る</strong></span><em>${beats.length}つの記録</em></header><ol>${beats.map(({ label, event }) => `<li><button type="button" data-action="replay-story-scene" data-scene="${context.escape(event.scene.id)}"><span>${context.escape(label)}</span><div><strong>${context.escape(event.scene.name)}</strong><p>${context.escape(event.scene.text)}</p></div><i aria-hidden="true">›</i></button></li>`).join("")}</ol></section>`;
  }

  function completeTimeline(context, events) {
    if (!events.length) return "";
    return `<details class="story-complete-timeline"><summary><span><small>FULL TIMELINE</small><strong>全${events.length}場面の記録を開く</strong></span><i aria-hidden="true">＋</i></summary>${eventRows(context, events)}</details>`;
  }

  function storyReplayBookmarks(context) {
    const entries = (window.StoryReaderBookmark?.list?.() || []).filter(entry => entry.episodeId.startsWith("archive:chapter:"));
    const records = entries.map(entry => {
      const chapterId = entry.episodeId.slice("archive:chapter:".length);
      const chapter = window.GameData.storyChapters.find(candidate => candidate.id === chapterId);
      if (!chapter) return null;
      const events = window.Story.chapterTimeline(chapter.id).filter(event => window.Story.hasReadScene(event.scene.id));
      const event = events[Math.min(entry.sceneIndex, Math.max(0, events.length - 1))];
      return event ? { entry, chapter, event, total: events.length } : null;
    }).filter(Boolean).slice(0, 3);
    if (!records.length) return "";
    return `<section class="story-replay-bookmarks"><header><span><small>BOOKMARKS</small><strong>読みかけの章回想</strong></span><em>${records.length}件</em></header><div>${records.map(record => `<button type="button" data-action="replay-story-chapter" data-chapter="${context.escape(record.chapter.id)}"><span aria-hidden="true">◆</span><span><small>${context.escape(record.chapter.title)} · 場面 ${record.entry.sceneIndex + 1}/${record.total}</small><strong>${context.escape(record.event.scene.name)}から再開</strong></span><i aria-hidden="true">›</i></button>`).join("")}</div></section>`;
  }

  function guildHallWhisper(context) {
    const named = window.Characters.namedHuntEpithets()[0];
    const developing = window.Characters.developingHuntLedgers()[0];
    const hunt = developing && (!named || developing.lastAt > named.lastAt) ? developing : named;
    if (!hunt) return "";
    const names = hunt.members.map(member => member.name);
    const characters = window.GameData.storyCharacters || {};
    const rina = characters.receptionist_rina?.name || "リナ";
    const elseName = characters.archivist_else?.name || "エルゼ";
    const material = hunt.item.type === "material";
    const witness = material ? characters.merchant_marta : characters.blacksmith_gregor;
    const witnessName = witness?.name || (material ? "マルタ" : "グレゴール");
    const archivesOpen = Boolean(window.GuildServices?.unlocked?.("archives"));
    const witnessOpen = Boolean(window.GuildServices?.unlocked?.(material ? "shop" : "blacksmith"));
    if (!hunt.epithet) {
      const nextPage = hunt.progress.nextTier?.label || "次の頁";
      const remaining = hunt.progress.remaining;
      const lines = [
        `<p><b>${context.escape(rina)}</b>「同じ依頼書の余白に、${names.map(context.escape).join("さんと")}さんの筆跡が増えています。${context.escape(hunt.monster.name)}から${context.escape(hunt.item.name)}を持ち帰るたび、前より迷いが少なくなっていますね」</p>`,
        archivesOpen ? `<p><b>${context.escape(elseName)}</b>「いまは『${context.escape(hunt.tier?.label || "最初の記録")}』。あと${remaining}度、二人で持ち帰れば『${context.escape(nextPage)}』として綴じ直せます。数字より、余白の減り方を見てください」</p>` : "",
        `<p><b>${context.escape(names[0])}</b>「なら次も同じ二人で行こう。うまくいった道だけでなく、見失った場所も帰ったら書き足す」</p>`
      ].filter(Boolean).join("");
      return `<aside class="story-guild-whisper is-developing"><header><span aria-hidden="true">帳</span><span><small>AN UNFINISHED HUNT</small><strong>宿の広間で育つ狩り帳</strong></span></header><div>${lines}</div><button type="button" class="text-button" data-action="open-adventurer-bonds" data-bond="${context.escape(hunt.bondKey)}" data-monster="${context.escape(hunt.monsterId)}" data-item="${context.escape(hunt.itemId)}">二人の書きかけを読む · あと${remaining}回</button></aside>`;
    }
    const witnessLine = material
      ? `「${hunt.item.name}なら、見れば採れた場所が分かるよ。同じ傷、同じ泥――二人は偶然拾ったんじゃない。獲物の通り道を覚えたんだね」`
      : hunt.item.type === "armor"
        ? `「${hunt.item.name}の留め具に、毎度よく似た傷がある。二人とも${hunt.monster.name}の一撃を、同じ間合いで受け流しているらしい」`
        : `「${hunt.item.name}の刃こぼれが、毎度同じ場所に出ている。二人とも${hunt.monster.name}へ踏み込む時の呼吸が揃ってきた証拠だ」`;
    const hunterReply = material
      ? `「帰り道まで覚えておくよ。次は空の袋を、もう少し軽くして帰れる」`
      : `「呼び名より先に、次も二人で帰れる手順を覚えておくよ」`;
    const lines = [
      `<p><b>${context.escape(rina)}</b>「今朝から、町の子たちが『${context.escape(hunt.epithet)}』って呼んでいます。${names.map(context.escape).join("さんと")}さんのこと、もう覚えてしまったみたいです」</p>`,
      archivesOpen ? `<p><b>${context.escape(elseName)}</b>「名が先にあったのではありません。二人で${context.escape(hunt.item.name)}を持ち帰り続けた頁が、そう呼ばせたのでしょう。記録には、持ち帰った数だけでなく町の人が見た二人も残します」</p>` : "",
      witnessOpen ? `<p><b>${context.escape(witnessName)}</b>${context.escape(witnessLine)}</p>` : "",
      `<p><b>${context.escape(names[0])}</b>${context.escape(hunterReply)}</p>`
    ].filter(Boolean).join("");
    return `<aside class="story-guild-whisper"><header><span aria-hidden="true">聞</span><span><small>OVERHEARD AT THE INN</small><strong>宿の広間で広がった狩り名</strong></span></header><div>${lines}</div><button type="button" class="text-button" data-action="open-adventurer-bonds" data-bond="${context.escape(hunt.bondKey)}" data-monster="${context.escape(hunt.monsterId)}" data-item="${context.escape(hunt.itemId)}">町に広がった二人の頁を読む</button></aside>`;
  }

  function routeTraditionHallNotice(context) {
    const records = Object.values(window.GameState.data.story?.facts?.routeTraditionRecords || {})
      .filter(record => record && Array.isArray(record.memberNames) && record.memberNames.length === 3)
      .sort((left, right) => Number(right.establishedAt || 0) - Number(left.establishedAt || 0));
    const record = records[0];
    if (!record) return "";
    const destination = window.DungeonDifficulty.variant(record.dungeonId, record.difficultyId || "normal");
    if (!destination) return "";
    const characters = window.GameData.storyCharacters || {};
    const rina = characters.receptionist_rina?.name || "リナ";
    const elseName = characters.archivist_else?.name || "エルゼ";
    const founders = record.memberNames.map(context.escape);
    const speaker = founders[1];
    const assistedSorties = Math.max(0, Number(record.assistedSorties) || 0);
    const traditionTier = window.Exploration.routeTraditionTier(assistedSorties);
    const date = record.establishedAt ? new Date(record.establishedAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" }) : "帰還した日";
    const rinaLine = assistedSorties
      ? `「入口の地図へ、帰還の印が${assistedSorties}つ増えました。三人が残した目印を頼って、別の隊も同じ道から戻ってきています」`
      : "「三人が泥だらけで持ち帰った地図、入口の壁へ掛けました。今朝出た冒険者が、もう目印を書き写していましたよ」";
    return `<details class="story-route-tradition-whisper"><summary><span aria-hidden="true">標</span><span><small>A ROAD REMEMBERED · ${context.escape(date)}</small><strong>${context.escape(destination.name)}の道標が、町で使われ始めました</strong><em>${founders.join(" → ")} · ${context.escape(traditionTier?.label || "帰還簿の道標")} · ${assistedSorties ? `その後${assistedSorties}遠征を案内` : "次の遠征を待つ"}</em></span><i aria-hidden="true">›</i></summary><div><p><b>${context.escape(rina)}</b>${context.escape(rinaLine)}</p><p><b>${context.escape(elseName)}</b>「線だけでは道になりません。最初に見つけた者、教わった道へ自分の判断を足した者、それを初めて信じて歩いた者。三人の名が揃って、ようやく次の誰かへ渡せる記録になります」</p><p><b>${speaker}</b>「教わった道を、そのまま写したんじゃない。迷った場所まで残した。次に向かう人は、私たちより少しだけ遠くを見られるはずだ」</p><button type="button" class="text-button" data-action="open-route-atlas" data-dungeon="${context.escape(record.dungeonId)}" data-difficulty="${context.escape(record.difficultyId || "normal")}">資料室のこの道標を開く · 全${records.length}路</button></div></details>`;
  }

  function achievementHallNotice(context) {
    if (!window.GuildServices?.unlocked?.("archives")) return "";
    const rewards = window.Achievements.ready();
    if (!rewards.length) return "";
    const latest = rewards.map(entry => ({ entry, earned: window.Achievements.earnedOn(entry.id) }))
      .sort((left, right) => Number(right.earned?.completedAt || 0) - Number(left.earned?.completedAt || 0))[0].entry;
    const seals = rewards.reduce((sum, entry) => sum + (Number(entry.rewards?.materials?.guild_seal) || 0), 0);
    const characters = window.GameData.storyCharacters || {};
    const rina = characters.receptionist_rina?.name || "リナ";
    const elseName = characters.archivist_else?.name || "エルゼ";
    const remaining = rewards.length > 1 ? `ほか${rewards.length - 1}件と合わせて` : "";
    return `<aside class="story-guild-whisper is-achievement"><header><span aria-hidden="true">章</span><span><small>A MARK IN THE LEDGER</small><strong>宿の帳面に新しい記章</strong></span></header><div><p><b>${context.escape(rina)}</b>「マスター、書庫から知らせです。『${context.escape(latest.name)}』の頁に、エルゼさんが新しい印を押していました」</p><p><b>${context.escape(elseName)}</b>「これは褒賞というより、歩みを忘れないための目印です。${context.escape(remaining)}ギルド印章${seals}個を預かっています。次の旅へ持っていく前に、誰と何を成した記録なのか確かめてください」</p></div><button type="button" class="text-button" data-action="open-achievements">実績の頁を開く · 未受領${rewards.length}件</button></aside>`;
  }

  function trackedAchievement(context) {
    const goal = window.Achievements.tracked();
    if (!goal) return "";
    const remaining = Math.max(0, goal.target - goal.current);
    const destination = window.Achievements.destination(goal);
    const attributes = {
      recruitment: 'data-nav="characters"',
      formation: 'data-action="party-view" data-view="formation"',
      adventure: 'data-action="party-view" data-view="adventure"',
      monsters: 'data-action="open-monster-codex"',
      items: 'data-action="open-item-codex"',
      companions: 'data-action="open-companion-ledger"',
      observations: 'data-action="open-observations"',
      guild: 'data-nav="guild"',
      achievements: 'data-action="open-achievements"'
    }[destination.id];
    return `<aside class="story-achievement-target"><span aria-hidden="true">${context.escape(goal.icon)}</span><div><small>NEXT GUILD MILESTONE · ${context.escape(goal.category)}</small><strong>${context.escape(goal.name)}</strong><p>${context.escape(goal.description)}</p><div aria-label="${Math.min(goal.current, goal.target)} / ${goal.target}"><i style="width:${goal.ratio * 100}%"></i></div><em>${goal.complete ? "達成しました" : `あと${remaining.toLocaleString("ja-JP")} · ${Math.min(goal.current, goal.target)}/${goal.target}`}</em></div><nav><button type="button" ${attributes}>${context.escape(destination.label)} ›</button><button type="button" data-action="open-achievements">実績の頁へ</button></nav></aside>`;
  }

  function retreatCouncil(context) {
    const results = (window.GameState.data.partyResults || [])
      .filter(result => result && ((!result.success && result.retryPreparationGrowth?.failures) || (result.success && result.retryPreparation?.failures)))
      .sort((left, right) => Number(right.completedAt || 0) - Number(left.completedAt || 0));
    const result = results[0];
    if (!result) return "";
    const partyIndex = Number.isInteger(result.partyIndex) ? result.partyIndex : window.GameState.data.partyResults.indexOf(result);
    if (partyIndex < 0 || partyIndex >= window.Party.limit()) return "";
    const destination = window.DungeonDifficulty.variant(result.dungeonId, result.difficultyId || "normal");
    if (!destination) return "";
    const cast = window.GameData.storyCharacters || {};
    const rina = cast.receptionist_rina?.name || "リナ";
    const gregor = cast.blacksmith_gregor?.name || "グレゴール";
    const elseName = cast.archivist_else?.name || "エルゼ";
    const marta = cast.merchant_marta?.name || "マルタ";
    const reports = Array.isArray(result.memberReports) ? result.memberReports : [];
    const adventurer = result.partyNames?.[0] || reports[0]?.name || "帰還した冒険者";
    const partyName = window.Party.name(partyIndex);
    const preparationRecord = result.success ? result.retryPreparation : result.retryPreparationGrowth;
    const reduction = Math.round((Number(preparationRecord?.damageReduction) || 0) * 100);
    if (result.success) {
      const advisor = window.GuildServices?.unlocked?.("archives") ? elseName : window.GuildServices?.unlocked?.("blacksmith") ? gregor : rina;
      const advisorLine = advisor === elseName
        ? `消さずに残した${preparationRecord.failures}度の撤退記録へ、ようやく攻略の印が重なりました。失敗の頁も、ここまで読めば勝利の一部です。`
        : advisor === gregor
          ? `${preparationRecord.failures}度持ち帰った傷が、今度は全員を帰す備えになった。直した装具だけじゃない。使い手の方も、前とは違う音をしている。`
          : `${preparationRecord.failures}度の「おかえりなさい」を帳面から消さなくてよかったです。今日の攻略は、その全部の続きに書いておきます。`;
      return `<details class="story-retreat-council is-overcome" data-detail="retreat-council" ${result.viewed ? "" : "open"}><summary><span aria-hidden="true">越</span><span><small>THE RETURN AFTER RETRY · ${context.escape(partyName)}</small><strong>撤退記録を越えた夜</strong><em>${context.escape(destination.name)} · ${preparationRecord.failures}度の備えを攻略へ</em></span><i aria-hidden="true">›</i></summary><div><p><b>${context.escape(rina)}</b>「マスター、${context.escape(partyName)}が帰りました。今度は${context.escape(destination.name)}の地図に、退路ではなく攻略の印をつけています」</p><p><b>${context.escape(advisor)}</b>「${context.escape(advisorLine)}」</p><p><b>${context.escape(adventurer)}</b>「受ける傷を${reduction}%抑えたことより、どこで退くことになったか皆で覚えていたのが大きかった。前の自分たちを、置いていかずに済んだよ」</p><nav><button type="button" class="button primary" data-action="party-open" data-party="${partyIndex}" data-view="results">攻略報告を開く</button><button type="button" class="button ghost" data-action="party-open" data-party="${partyIndex}" data-view="history">再挑戦の歩みを見る</button><button type="button" class="button secondary" data-action="open-result-monsters" data-party="${partyIndex}" data-dungeon="${context.escape(result.dungeonId)}">越えた敵の記録</button></nav></div></details>`;
    }
    const sourceTotal = source => reports.reduce((sum, member) => sum + Math.max(0, Number(member.damageSources?.[source]) || 0), 0);
    const physicalDamage = sourceTotal("physical"), magicDamage = sourceTotal("magic");
    const attempts = reports.reduce((sum, member) => sum + Math.max(0, Number(member.attackAttempts) || 0), 0);
    const hits = reports.reduce((sum, member) => sum + Math.max(0, Number(member.attackHits) || 0), 0);
    const timedOut = (result.defeatFacts || []).some(fact => String(fact).includes("ターン終了時"));
    const exposed = Number(result.mechanicReport?.unguardedHits) || 0;
    const growth = result.retryPreparationGrowth;
    let advisor = rina, observation = "持ち帰った記録を一つずつ並べれば、次に変えるべきことが見えてきます。";
    if (timedOut && window.GuildServices?.unlocked?.("archives")) {
      advisor = elseName;
      observation = "最後まで立っていたのに、敵を倒し切る前に刻限が来ています。守りを減らすのではなく、命中した手数と使わなかった技から見直しましょう。";
    } else if (exposed > 0 && window.GuildServices?.unlocked?.("blacksmith")) {
      advisor = gregor;
      observation = `大技の前触れは見えていたが、防御なしの記録が${exposed}人回ある。鎧を重くする前に、技が来る番の守り方を揃えろ。`;
    } else if (magicDamage > physicalDamage && window.GuildServices?.unlocked?.("archives")) {
      advisor = elseName;
      observation = `傷の記録は、物理${physicalDamage}に対して魔法${magicDamage}。敵の名だけでなく、使った属性と魔法防御を照らし合わせるべき頁です。`;
    } else if (physicalDamage > 0 && window.GuildServices?.unlocked?.("blacksmith")) {
      advisor = gregor;
      observation = `受けた物理の傷は合計${physicalDamage}。誰が前で受け、どの防具が耐えたかを見れば、重さを増やさず直せる箇所がある。`;
    } else if (attempts >= 4 && hits / attempts < .65 && window.GuildServices?.unlocked?.("shop")) {
      advisor = marta;
      observation = `振った武器は${attempts}回、届いたのは${hits}回。高い品を買う前に、扱える武器と隊列を合わせた方が旅支度は軽く済むよ。`;
    }
    const preparation = growth.atMaximum
      ? `撤退記録は${growth.failures}度分で整った。次は受ける傷を${reduction}%抑えられる。`
      : `今回の道筋も残した。次は受ける傷を${reduction}%抑えたところから試せる。`;
    return `<details class="story-retreat-council" data-detail="retreat-council" ${result.viewed ? "" : "open"}><summary><span aria-hidden="true">策</span><span><small>AFTER THE RETREAT · ${context.escape(partyName)}</small><strong>撤退のあと、宿の作戦卓で</strong><em>${context.escape(destination.name)} · 次回の戦闘被ダメージ-${reduction}%</em></span><i aria-hidden="true">›</i></summary><div><p><b>${context.escape(rina)}</b>「マスター、${context.escape(partyName)}が戻りました。傷の手当てを先に済ませて、${context.escape(destination.name)}の地図を作戦卓へ広げています」</p><p><b>${context.escape(advisor)}</b>「${context.escape(observation)}」</p><p><b>${context.escape(adventurer)}</b>「${context.escape(preparation)}同じ場所へ戻るか、編成から変えるか。報告を見て決めよう」</p><nav><button type="button" class="button primary" data-action="party-open" data-party="${partyIndex}" data-view="results">撤退記録を開く</button><button type="button" class="button ghost" data-action="party-open" data-party="${partyIndex}" data-view="formation">編成を見直す</button><button type="button" class="button secondary" data-action="open-result-monsters" data-party="${partyIndex}" data-dungeon="${context.escape(result.dungeonId)}">敵の記録を見る</button></nav></div></details>`;
  }

  function story(context) {
    const state = window.GameState.data, storyState = window.Story.ensure(), focus = window.Story.focus(), chapter = focus.chapter, guide = window.Story.storyGuide(), episode = guide.episode;
    const finalChapter = window.Story.mainChapters().at(-1);
    const mainChapterCount = window.Story.mainChapters().filter(entry => Number(entry.number) >= 1).length;
    const mainStoryComplete = Boolean(finalChapter && storyState.completed.includes(finalChapter.id) && window.Story.mainComplete());
    const postgameChapterIds = new Set(window.Story.postgameChapters().map(entry => entry.id));
    const postgameRoutes = Object.values(window.GameData.dungeons).filter(dungeon => (dungeon.chapterId === finalChapter?.id && !dungeon.requiredForStory) || postgameChapterIds.has(dungeon.chapterId));
    const postgameCleared = postgameRoutes.filter(dungeon => storyState.facts.clears.includes(dungeon.id)).length;
    const nextPage = !state.characters.length ? "characters" : "party";
    const nextView = !state.parties[0].length ? "formation" : "adventure";
    const narrative = focus.scene;
    const progress = focus.total ? `${focus.cleared}/${focus.total}攻略` : chapter && storyState.completed.includes(chapter.id) ? "読了" : "準備中";
    const objective = episode ? episode.subtitle : focus.dungeon ? `${focus.dungeon.name}を探索し、最奥まで攻略する` : chapter?.objective;
    const currentScene = episode
      ? `<article class="story-current-scene is-unread"><span>未読の物語 · ${episode.entries.length}場面</span><h4>${context.escape(episode.title)}</h4><p>${context.escape(episode.entries.map(entry => entry.scene.name).join(" ／ "))}</p>${storyCastStrip(context, guide.cast)}<small>本文は専用画面で表示します。最後まで読むと物語が記録され、次の探索地へ進めます。</small></article>`
      : `<article class="story-current-scene"><span>${context.escape(focus.label)}</span>${companionStoryFocus(context, narrative)}<h4>${context.escape(narrative?.name || "次の知らせを待つ")}</h4><p>${context.escape(narrative?.text || "現在公開されている物語をすべて読み終えました。")}</p></article>`;
    return `<section class="panel story-panel story-current ${mainStoryComplete ? "story-main-complete" : ""}" aria-labelledby="current-story-title">
      <div class="story-current-heading"><div><span class="label">${mainStoryComplete ? "MAIN STORY COMPLETE" : "GUILD CHRONICLE · CURRENT"}</span><h3 id="current-story-title">${mainStoryComplete ? "本編完結 — 星なき夜の果て" : chapter ? context.escape(chapter.title) : "ギルドの物語"}</h3></div><span class="badge ${focus.dungeon || mainStoryComplete ? "good" : ""}">${mainStoryComplete ? "15章 完結" : progress}</span></div>
      ${storyMemoryBrief(context, guide)}
      ${currentScene}
      ${storyMysteryBoard(context)}
      ${trackedAchievement(context)}
      ${achievementHallNotice(context)}
      ${retreatCouncil(context)}
      ${routeTraditionHallNotice(context)}
      ${guildHallWhisper(context)}
      ${mainStoryComplete ? `<div class="story-completion-summary"><span aria-hidden="true">✦</span><div><strong>名もなき宿から始まった物語を見届けました</strong><p>全${mainChapterCount}章を達成。クリア後は「${context.escape(postgameRoutes.find(route => !storyState.facts.clears.includes(route.id))?.name || postgameRoutes[0]?.name || "星後の神域")}」など、星後の遠征へ挑めます。</p><small>クリア後探索 ${postgameCleared}/${postgameRoutes.length}攻略</small></div></div>` : ""}
      ${chapter && !storyState.completed.includes(chapter.id) ? `<div class="story-next-step"><span>次の目的</span><strong>${context.escape(objective || "ギルドで次の依頼を待つ")}</strong>${focus.dungeon ? `<small>${context.escape(focus.dungeon.description)}</small>` : chapter.id === "prologue" ? `<small>冒険者雇用：${state.characters.length ? "達成" : "未達成"} ／ 初出発：${storyState.facts.departed ? "達成" : "未達成"}</small>` : ""}</div>${routeProgress(context, chapter, focus)}` : ""}
      <div class="story-primary-action">${episode ? `<button class="button primary story-read-button" data-action="open-story-reader">物語を読む</button><small>タップして開き、最後まで読んでください</small>` : `<button class="button primary" ${nextPage === "characters" ? 'data-nav="characters"' : `data-action="party-view" data-view="${nextView}"`}>${nextPage === "characters" ? "仲間を募集する" : nextView === "formation" ? "パーティを編成する" : mainStoryComplete ? "クリア後の探索へ" : "探索・攻略へ"}</button>`}</div>
    </section>`;
  }

  function archive(context) {
    const storyState = window.Story.ensure();
    const completed = storyState.completed;
    const chapters = window.GameData.storyChapters.filter(chapter => completed.includes(chapter.id));
    const current = window.Story.current();
    const chapterHtml = chapters.map(chapter => {
      const events = window.Story.chapterTimeline(chapter.id);
      return `<details class="story-chapter" data-detail="story-${chapter.id}"><summary><span><b>${context.escape(chapter.title)}</b><small>${events.length}件の物語記録</small></span><span class="badge good">達成済み</span></summary><div class="story-chapter-body">${chapterRecap(context, events)}${chapterReplayButton(context, chapter, events)}${completeTimeline(context, events)}<div class="story-objective"><strong>この章の依頼</strong><p>${context.escape(chapter.objective)}</p><strong>解放内容・章報酬（受取済み）</strong><p>${context.escape(window.Story.chapterUnlockText(chapter))}</p></div></div></details>`;
    }).join("");
    const currentEvents = current ? window.Story.chapterTimeline(current.id).filter(event => event.dungeon?.requiredForStory !== false && window.Story.hasReadScene(event.scene.id)) : [];
    const currentHtml = current && currentEvents.length ? `<section class="story-in-progress"><div class="section-heading story-side-heading"><div><span class="label">IN PROGRESS</span><h3>進行中の記録</h3></div><span class="badge">${context.escape(current.title)}</span></div>${chapterRecap(context, currentEvents)}${chapterReplayButton(context, current, currentEvents, "ここまでの物語を通して読む")}${currentEvents.length > 3 ? completeTimeline(context, currentEvents) : eventRows(context, currentEvents)}</section>` : "";
    const optional = Object.values(window.GameData.dungeons).filter(dungeon => !dungeon.requiredForStory && window.Story.canEnter(dungeon.id));
    const optionalHtml = optional.length ? `<div class="section-heading story-side-heading"><div><span class="label">SIDE STORY</span><h3>寄り道の記録</h3></div><span class="badge">${optional.length}件</span></div>${optional.map(dungeon => {
      const cleared = storyState.facts.clears.includes(dungeon.id), discovered = storyState.facts.discoveries.includes(dungeon.id), opening = window.Story.dungeonOpeningScene(dungeon), discovery = window.Story.dungeonDiscoveryScene(dungeon), ending = window.Story.dungeonEndingScene(dungeon);
      const chapter = window.GameData.storyChapters.find(entry => entry.id === dungeon.chapterId);
      const events = [{ id: `${dungeon.id}:open`, kind: "dungeonOpening", label: "探索地の解放", scene: opening, dungeon, chapter }];
      if (discovered && discovery) events.push({ id: `${dungeon.id}:discovery`, kind: "dungeonDiscovery", label: "探索で判明", scene: discovery, dungeon, chapter });
      if (cleared && ending) events.push({ id: `${dungeon.id}:end`, kind: "optionalEnding", label: "任意攻略", scene: ending, dungeon, chapter });
      return `<details class="story-chapter optional-story" data-detail="story-optional-${dungeon.id}"><summary><span><b>${context.escape(dungeon.name)}</b><small>${cleared ? "攻略済み" : "解放済み"}</small></span><span class="badge ${cleared ? "good" : ""}">${cleared ? "任意攻略" : "未攻略"}</span></summary><div class="story-chapter-body">${eventRows(context, events, { includeOptional: true })}</div></details>`;
    }).join("")}` : "";
    const guide = window.Story.storyGuide();
    const bookmark = guide.latest ? `<div class="story-archive-bookmark"><span aria-hidden="true">◆</span><div><small>最後に読んだ記録</small><strong>${context.escape(guide.latest.scene.name)}</strong><p>${context.escape(guide.latest.scene.text)}</p></div><button type="button" class="button ghost" data-action="replay-story-scene" data-scene="${context.escape(guide.latest.scene.id)}">ここから思い出す</button></div>` : "";
    const indexButton = guide.readCount ? `<button type="button" class="story-index-open" data-action="open-story-index"><span aria-hidden="true">⌕</span><span><small>STORY INDEX</small><strong>言葉や人物から記録を探す</strong></span><i aria-hidden="true">›</i></button>` : "";
    return `<section class="panel story-archive" aria-labelledby="story-archive-title"><div class="section-heading"><div><span class="label">STORY ARCHIVE</span><h3 id="story-archive-title">これまでのストーリー</h3></div><span class="badge">${completed.length}/${window.GameData.storyChapters.length}章</span></div><p class="small-note">時系列、登場人物、章をまたぐ手掛かりから、過去の会話と情景を読み返せます。</p>${indexButton}${storyReplayBookmarks(context)}${bookmark}${storyMysteryBoard(context, true)}${characterArchive(context)}${chapterHtml || '<p class="empty-line">まだ達成済みの章はありません。現在の依頼を達成すると、ここに章の記録が追加されます。</p>'}${currentHtml}${optionalHtml}</section>`;
  }

  function page(context) { return story(context) + archive(context); }

  window.GameUIViews.home = { archive, page, retreatCouncil, story };
})();
