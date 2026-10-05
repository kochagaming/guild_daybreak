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

  function eventRows(context, events, options = {}) {
    const filtered = events.filter(event => options.includeOptional || event.dungeon?.requiredForStory !== false);
    return `<div class="story-timeline">${filtered.map(event => {
      const dungeonName = event.dungeon ? event.dungeon.name : event.chapter.title;
      const finalChapterScene = event.kind === "dungeonEnding" && event.scene.id === event.chapter.clearStoryId;
      const label = finalChapterScene ? "攻略・章完結" : event.label;
      return `<article class="story-event ${event.kind}"><span class="story-event-marker" aria-hidden="true"></span><div><span class="story-event-label">${context.escape(label)} · ${context.escape(dungeonName)}</span>${companionStoryFocus(context, event.scene, true)}<h4>${context.escape(event.scene.name)}</h4><p>${context.escape(event.scene.text)}</p></div></article>`;
    }).join("")}</div>`;
  }

  function story(context) {
    const state = window.GameState.data, storyState = window.Story.ensure(), focus = window.Story.focus(), chapter = focus.chapter, episode = window.Story.pendingEpisode();
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
      ? `<article class="story-current-scene is-unread"><span>未読の物語 · ${episode.entries.length}場面</span><h4>${context.escape(episode.title)}</h4><p>${context.escape(episode.entries.map(entry => entry.scene.name).join(" ／ "))}</p><small>本文は専用画面で表示します。最後まで読むと物語が記録され、次の探索地へ進めます。</small></article>`
      : `<article class="story-current-scene"><span>${context.escape(focus.label)}</span>${companionStoryFocus(context, narrative)}<h4>${context.escape(narrative?.name || "次の知らせを待つ")}</h4><p>${context.escape(narrative?.text || "現在公開されている物語をすべて読み終えました。")}</p></article>`;
    return `<section class="panel story-panel story-current ${mainStoryComplete ? "story-main-complete" : ""}" aria-labelledby="current-story-title">
      <div class="story-current-heading"><div><span class="label">${mainStoryComplete ? "MAIN STORY COMPLETE" : "GUILD CHRONICLE · CURRENT"}</span><h3 id="current-story-title">${mainStoryComplete ? "本編完結 — 星なき夜の果て" : chapter ? context.escape(chapter.title) : "ギルドの物語"}</h3></div><span class="badge ${focus.dungeon || mainStoryComplete ? "good" : ""}">${mainStoryComplete ? "15章 完結" : progress}</span></div>
      ${currentScene}
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
      return `<details class="story-chapter" data-detail="story-${chapter.id}"><summary><span><b>${context.escape(chapter.title)}</b><small>${events.length}件の物語記録</small></span><span class="badge good">達成済み</span></summary><div class="story-chapter-body">${eventRows(context, events)}<div class="story-objective"><strong>この章の依頼</strong><p>${context.escape(chapter.objective)}</p><strong>解放内容・章報酬（受取済み）</strong><p>${context.escape(window.Story.chapterUnlockText(chapter))}</p></div></div></details>`;
    }).join("");
    const focusedSceneId = window.Story.focus().scene?.id;
    const currentEvents = current ? window.Story.chapterTimeline(current.id).filter(event => event.dungeon?.requiredForStory !== false && event.scene.id !== focusedSceneId) : [];
    const currentHtml = current && currentEvents.length ? `<section class="story-in-progress"><div class="section-heading story-side-heading"><div><span class="label">IN PROGRESS</span><h3>進行中の記録</h3></div><span class="badge">${context.escape(current.title)}</span></div>${eventRows(context, currentEvents)}</section>` : "";
    const optional = Object.values(window.GameData.dungeons).filter(dungeon => !dungeon.requiredForStory && window.Story.canEnter(dungeon.id));
    const optionalHtml = optional.length ? `<div class="section-heading story-side-heading"><div><span class="label">SIDE STORY</span><h3>寄り道の記録</h3></div><span class="badge">${optional.length}件</span></div>${optional.map(dungeon => {
      const cleared = storyState.facts.clears.includes(dungeon.id), discovered = storyState.facts.discoveries.includes(dungeon.id), opening = window.Story.dungeonOpeningScene(dungeon), discovery = window.Story.dungeonDiscoveryScene(dungeon), ending = window.Story.dungeonEndingScene(dungeon);
      const chapter = window.GameData.storyChapters.find(entry => entry.id === dungeon.chapterId);
      const events = [{ id: `${dungeon.id}:open`, kind: "dungeonOpening", label: "探索地の解放", scene: opening, dungeon, chapter }];
      if (discovered && discovery) events.push({ id: `${dungeon.id}:discovery`, kind: "dungeonDiscovery", label: "探索で判明", scene: discovery, dungeon, chapter });
      if (cleared && ending) events.push({ id: `${dungeon.id}:end`, kind: "optionalEnding", label: "任意攻略", scene: ending, dungeon, chapter });
      return `<details class="story-chapter optional-story" data-detail="story-optional-${dungeon.id}"><summary><span><b>${context.escape(dungeon.name)}</b><small>${cleared ? "攻略済み" : "解放済み"}</small></span><span class="badge ${cleared ? "good" : ""}">${cleared ? "任意攻略" : "未攻略"}</span></summary><div class="story-chapter-body">${eventRows(context, events, { includeOptional: true })}</div></details>`;
    }).join("")}` : "";
    return `<section class="panel story-archive" aria-labelledby="story-archive-title"><div class="section-heading"><div><span class="label">STORY ARCHIVE</span><h3 id="story-archive-title">これまでのストーリー</h3></div><span class="badge">${completed.length}/${window.GameData.storyChapters.length}章</span></div><p class="small-note">物語は時系列で記録されます。章を開くと、探索地の解放、道中で判明した手掛かり、攻略後の出来事をまとめて読み返せます。</p>${chapterHtml || '<p class="empty-line">まだ達成済みの章はありません。現在の依頼を達成すると、ここに章の記録が追加されます。</p>'}${currentHtml}${optionalHtml}</section>`;
  }

  function page(context) { return story(context) + archive(context); }

  window.GameUIViews.home = { archive, page, story };
})();
