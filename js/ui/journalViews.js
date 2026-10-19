(function () {
  "use strict";

  window.GameUIViews = window.GameUIViews || {};

  const explorationKinds = new Set(["arrival", "explore", "story", "companion", "bond", "secret", "camp", "hazard", "lore", "gather", "treasure", "treasureGold", "treasureItem", "stairs", "recovery"]);
  const logIcons = { system: "✦", reputation: "誉", formation: "≡", encounter: "⚔", round: "—", hero: "›", skill: "✧", heal: "+", guard: "▣", enemy: "‹", "enemy-skill": "※", victory: "✓", defeat: "×", recovery: "+", warning: "!", burst: "⚡", weakness: "◇", status: "◈", arrival: "◆", explore: "…", story: "◇", companion: "♙", bond: "結", secret: "?", camp: "♨", hazard: "!", lore: "文", gather: "採", treasure: "□", treasureGold: "G", treasureItem: "★", stairs: "↧" };
  const discoveryMarkers = { arrival: "◆", explore: "…", story: "◇", companion: "♙", bond: "結", secret: "?", camp: "♨", hazard: "!", lore: "文", gather: "採", treasure: "□", treasureGold: "G", treasureItem: "★", stairs: "↧", recovery: "+" };

  function battleLogEntries(entries, context, trackedItemId = null) {
    const { escape } = context;
    return entries.map(entry => {
      const targetItemFound = Boolean(trackedItemId && entry.acquiredItemId === trackedItemId);
      return `<div class="battle-log-entry ${entry.kind}${entry.chapterMapGuidance ? " chapter-map-guidance" : ""}${targetItemFound ? " target-item-acquired" : ""}"><span class="battle-log-icon" aria-hidden="true">${targetItemFound ? "採" : entry.chapterMapGuidance ? "図" : logIcons[entry.kind] || "·"}</span><p>${escape(entry.text)}</p>${targetItemFound ? `<button type="button" class="battle-log-target-badge" data-action="open-item-codex" data-item="${escape(entry.acquiredItemId)}" aria-label="探索目標の図鑑を開く">探索目標 ›</button>` : ""}</div>`;
    }).join("");
  }

  function observationSummary(entries, event, context) {
    const { escape } = context;
    const rows = window.ExpeditionLog.observations(entries).map(group => `<li><b>${escape(group.label)}</b><span>${group.entries.map(escape).join(" ／ ")}</span></li>`);
    if (!rows.length) return "";
    const defeated = event.status === "撤退";
    return `<details class="battle-observation-summary" data-detail="journal-observations-${event.number}" ${defeated ? "open" : ""}><summary><strong>観測要点</strong><span>${rows.length}項目</span><i aria-hidden="true">›</i></summary><ul>${rows.join("")}</ul></details>`;
  }

  function companionCast(entry, context) {
    const { escape } = context;
    const cast = (entry.companionIds || []).map(id => {
      const companion = window.Companions.definition(id);
      const portrait = companion && window.GameData.portraits[companion.portraitId];
      if (!companion) return "";
      const image = portrait ? `<img src="${escape(portrait.image)}" alt="" loading="lazy">` : '<span class="journey-companion-fallback" aria-hidden="true">♙</span>';
      return `<span class="journey-companion-person">${image}<span><b>${escape(companion.name)}</b><em>${escape(companion.title)}</em></span></span>`;
    }).filter(Boolean);
    return cast.length ? `<span class="journey-companion-cast" aria-label="登場人物">${cast.join('<i aria-hidden="true">×</i>')}</span>` : "";
  }

  function eventRows(event, partyNames, context, trackedItemId = null) {
    const { escape } = context;
    const encounterIndex = event.entries.findIndex(entry => entry.kind === "encounter");
    const terminalIndex = event.entries.findIndex(entry => ["victory", "defeat"].includes(entry.kind));
    function discoveries(entries) {
      return entries.filter(entry => explorationKinds.has(entry.kind)).map(entry => {
        const targetItemFound = Boolean(trackedItemId && entry.acquiredItemId === trackedItemId);
        const routeDefinition = entry.routeEventId
          ? (window.GameData.config.explorationEvents?.routeEvents || []).find(candidate => candidate.id === entry.routeEventId)
          : null;
        const witnesses = entry.kind === "story" && partyNames.length
          ? `<span class="journey-witnesses">この場を歩いた冒険者　${partyNames.map(escape).join("・")}</span>` : "";
        const label = routeDefinition?.name || (entry.kind === "arrival" ? event.title : entry.kind === "story" ? "物語の手掛かり" : entry.kind === "companion" ? "道中のひと幕" : entry.kind === "bond" ? "旅仲間のひと幕" : entry.kind === "secret" ? "隠された道" : entry.kind === "camp" ? "野営" : entry.kind === "hazard" ? "危険な道" : entry.kind === "lore" ? "古い記録" : entry.kind === "gather" ? "素材採取" : entry.kind === "stairs" ? "次の区画" : entry.kind === "recovery" ? "小休止" : entry.kind.startsWith("treasure") ? "発見" : "探索中");
        const routeTags = routeDefinition
          ? `<span class="journey-route-tags"><b class="${entry.routeEventSuccess ? "success" : "failure"}">${entry.routeEventSuccess ? "成功" : "失敗"}</b>${entry.routeDestinationFamiliarityApplied ? "<b class=\"mastery\">土地勘</b>" : ""}${entry.routeTeamSurveyApplied ? "<b class=\"mastery\">連携探索</b>" : ""}${entry.routeBondSupportApplied ? "<b class=\"mastery\">旅仲間の連携</b>" : ""}${entry.routeRumorMatched ? "<b class=\"rumor\">噂と一致</b>" : ""}${entry.routeNaturalAptitudeApplied ? "<b class=\"mastery\">基礎能力を活用</b>" : ""}${entry.routeEventPersonalPracticeApplied ? "<b class=\"mastery\">本人の経験</b>" : ""}${entry.routeEventMasteryApplied ? "<b class=\"mastery\">観察記録を活用</b>" : ""}</span>`
          : entry.kind === "treasure" && (entry.treasurePersonalPracticeApplied || entry.treasureNaturalAptitudeApplied) ? `<span class="journey-route-tags">${entry.treasureNaturalAptitudeApplied ? '<b class="mastery">基礎能力を活用</b>' : ""}${entry.treasurePersonalPracticeApplied ? '<b class="mastery">本人の開錠経験</b>' : ""}</span>` : "";
        const surveyCast = entry.routeTeamSurveyApplied && entry.routeTeamSurveyMemberNames?.length
          ? `<span class="journey-witnesses">地図を重ねた者　${entry.routeTeamSurveyMemberNames.map(escape).join("・")}</span>` : "";
        const familiarityCast = entry.routeDestinationFamiliarityApplied && entry.routeDestinationFamiliarityMemberNames?.length
          ? `<span class="journey-witnesses">道を覚えていた者　${entry.routeDestinationFamiliarityMemberNames.map(escape).join("・")}</span>` : "";
        const supportCast = entry.routeBondSupportApplied && entry.routeBondSupportMemberNames?.length
          ? `<span class="journey-witnesses">息を合わせた者　${entry.routeBondSupportMemberNames.map(escape).join("・")}</span>` : "";
        const attributeDefinitions = window.GameData.config.characterGrowth?.attributes?.definitions || {};
        const aptitudeCast = (entry.routeNaturalAptitudeApplied || entry.treasureNaturalAptitudeApplied) && entry.explorationActorName && entry.explorationAttributeIds?.length
          ? `<span class="journey-witnesses">力を活かした者　${escape(entry.explorationActorName)}（${entry.explorationAttributeIds.map(id => escape(attributeDefinitions[id]?.shortName || attributeDefinitions[id]?.name || id)).join("・")}）</span>` : "";
        const cast = entry.kind === "companion" ? companionCast(entry, context) : "";
        const bondCast = entry.kind === "bond" && entry.adventurerBondMemberNames?.length
          ? `<span class="journey-witnesses">共に歩いた者　${entry.adventurerBondMemberNames.map(escape).join("・")} · 同行${entry.sharedSorties}回</span>` : "";
        return `<article class="journey-discovery ${entry.kind}${routeDefinition ? ` is-route-event ${entry.routeEventSuccess ? "route-success" : "route-failure"}` : ""}${targetItemFound ? " target-item-acquired" : ""}"><span class="journey-discovery-marker" aria-hidden="true">${targetItemFound ? "採" : discoveryMarkers[entry.kind]}</span><div><small>${escape(label)}${targetItemFound ? `<button type="button" class="journey-target-item-badge" data-action="open-item-codex" data-item="${escape(entry.acquiredItemId)}" aria-label="探索目標の図鑑を開く">探索目標 ›</button>` : ""}</small>${routeTags}${cast}<p>${escape(entry.text)}</p>${aptitudeCast}${bondCast}${surveyCast}${supportCast}${familiarityCast}${witnesses}</div></article>`;
      }).join("");
    }
    const before = discoveries(encounterIndex < 0 ? event.entries : event.entries.slice(0, encounterIndex));
    if (encounterIndex < 0) return before;
    const battleEnd = terminalIndex < 0 ? event.entries.length : terminalIndex + 1;
    const battle = event.entries.slice(encounterIndex, battleEnd).filter(entry => !explorationKinds.has(entry.kind));
    const defeated = event.status === "撤退";
    const huntTarget = event.huntTargetPresent ? '<span class="journey-hunt-target-badge">討伐対象</span>' : "";
    const combat = `<details class="journey-entry journey-encounter ${event.complete ? "is-complete" : "is-current"} ${defeated ? "is-defeat" : ""} ${event.huntTargetPresent ? "has-hunt-target" : ""}" data-detail="journal-encounter-${event.number}" ${!event.complete || defeated ? "open" : ""}><summary><span class="journey-marker">${event.number}</span><span><strong>${escape(event.title)}で敵と遭遇</strong><small>第${event.number}戦 · ${escape(event.status)}${event.complete ? "" : " · 戦況を更新中"}</small></span>${huntTarget}<span class="journey-status ${defeated ? "bad" : event.status === "勝利" ? "good" : ""}">${escape(event.status)}</span><span class="summary-chevron" aria-hidden="true">⌄</span></summary>${observationSummary(battle, event, context)}<div class="battle-log-list">${battleLogEntries(battle, context, trackedItemId)}</div></details>`;
    const aftermath = event.entries.slice(battleEnd).map(entry => explorationKinds.has(entry.kind)
      ? discoveries([entry])
      : `<div class="journey-aftermath-log">${battleLogEntries([entry], context, trackedItemId)}</div>`).join("");
    return before + combat + aftermath;
  }

  function contents(journal, context) {
    const { escape, time } = context;
    const outcome = journal.outcome;
    const progress = Math.round(journal.progress * 100);
    const trackedItemId = journal.itemTarget?.itemId || outcome?.trackedItemId || null;
    const hasReputations = journal.setup.some(entry => entry.kind === "reputation");
    const hasChapterMap = journal.setup.some(entry => entry.chapterMapGuidance);
    const setup = journal.setup.length ? `<details class="journey-entry journey-setup" data-detail="journal-${journal.partyIndex}-setup"><summary><span class="journey-marker">出</span><span><strong>探索を開始</strong><small>隊列・装備スキル・行動率${hasReputations ? "・仲間内の呼び名" : ""}${hasChapterMap ? "・踏破図" : ""}</small></span><span class="summary-chevron" aria-hidden="true">⌄</span></summary><div class="battle-log-list">${battleLogEntries(journal.setup, context, trackedItemId)}</div></details>` : "";
    const hunt = journal.active && journal.huntTarget ? (() => {
      const monster = window.GameData.monsters[journal.huntTarget.monsterId];
      if (!monster) return "";
      const total = journal.huntTarget.progressAtDeparture + journal.huntTarget.quantity;
      const complete = total >= journal.huntTarget.goal;
      return `<section class="journey-hunt-progress ${complete ? "is-complete" : ""}"><span aria-hidden="true">${escape(monster.icon || "♟")}</span><div><small>討伐目標を追跡中</small><strong>${escape(monster.name)}　${total}/${journal.huntTarget.goal}体</strong><i><b style="width:${Math.min(100, total / journal.huntTarget.goal * 100)}%"></b></i></div><em>${journal.huntTarget.quantity ? `この遠征で +${journal.huntTarget.quantity}体` : "まだ足跡を追っている"}</em></section>`;
    })() : "";
    const itemHunt = journal.active && journal.itemTarget ? (() => {
      const item = window.GameData.items[journal.itemTarget.itemId];
      if (!item) return "";
      const total = journal.itemTarget.progressAtDeparture + journal.itemTarget.quantity;
      const complete = total >= journal.itemTarget.goal;
      return `<section class="journey-item-progress ${complete ? "is-complete" : ""}"><span aria-hidden="true">採</span><div><small>${complete ? "探索目標を達成" : "探索目標を追跡中"}</small><strong>${escape(item.name)}　${total}/${journal.itemTarget.goal}個</strong><i><b style="width:${Math.min(100, total / journal.itemTarget.goal * 100)}%"></b></i></div><em>${complete ? `必要数に到達 · 今回 +${journal.itemTarget.quantity}個` : journal.itemTarget.quantity ? `この遠征で +${journal.itemTarget.quantity}個` : "まだ発見していない"}</em></section>`;
    })() : "";
    const milestone = journal.active && journal.milestone ? (() => {
      const tracked = journal.milestone;
      const achievement = window.GameData.achievements.find(entry => entry.id === tracked.achievementId);
      if (!achievement) return "";
      const note = tracked.gained
        ? `この遠征で仮記録 +${tracked.gained}`
        : tracked.relevant && tracked.possibleGain
          ? `攻略できれば +${tracked.possibleGain}`
          : tracked.relevant ? "帰還時に成果を記帳" : "旅とともに持ち出した目標";
      return `<section class="journey-milestone-progress ${tracked.gained ? "has-progress" : ""}"><span aria-hidden="true">${escape(achievement.icon)}</span><div><small>実績目標を携行中 · ${escape(achievement.category)}</small><strong>${escape(achievement.name)}　${tracked.current}/${tracked.target}</strong><i><b style="width:${Math.min(100, tracked.current / tracked.target * 100)}%"></b></i></div><em>${note}</em></section>`;
    })() : "";
    const encounters = journal.events.map(event => eventRows(event, journal.partyNames, context, trackedItemId)).join("");
    const waiting = !journal.events.length ? '<div class="journey-waiting"><span>◇</span><p>目的地へ向かっています。最初の遭遇までお待ちください。</p></div>' : "";
    const footer = journal.active
      ? `<div class="journey-live"><span class="live-dot" aria-hidden="true"></span><strong>${escape(journal.status)}</strong><small>${journal.next ? `次の記録まで約 ${time(journal.next)}` : "まもなく帰還します"}</small></div>`
      : `<div class="journey-conclusion ${outcome.success ? "success" : "failure"}"><strong>${outcome.success ? "探索成功" : "探索から撤退"}</strong><span>${outcome.encountersCleared || 0}/${journal.totalEncounters}戦突破 · ${outcome.monstersDefeated || 0}体討伐</span></div>`;
    return `<div class="journey-progress"><div><span>${journal.active ? "探索進行" : "探索完了"}</span><strong>${progress}%</strong></div><div class="progress"><i style="width:${progress}%"></i></div></div>${milestone}${itemHunt}${hunt}<div class="journey-timeline">${setup}${encounters}${waiting}</div>${footer}`;
  }

  function activePanel(expedition, context) {
    const journal = window.ExpeditionLog.active(expedition);
    return `<section class="panel exploration-journal" data-active-journal="${journal.partyIndex}" data-journal-revision="${journal.revision}"><div class="section-heading"><div><span class="label">LIVE ADVENTURE LOG</span><h3>${context.escape(journal.dungeonName)}・探索の記録</h3></div><span class="badge good">このパーティは探索中</span></div>${contents(journal, context)}</section>`;
  }

  function completedPanel(result, context) {
    if (!Array.isArray(result.battleLog) || !result.battleLog.length) return "";
    const journal = window.ExpeditionLog.completed(result);
    return `<section id="result-battle-records" class="exploration-journal completed-journal"><div class="section-heading"><div><span class="label">ADVENTURE LOG</span><h4>探索の記録</h4></div><span class="badge ${result.success ? "good" : "bad"}">${result.success ? "成功" : "撤退"}</span></div>${contents(journal, context)}</section>`;
  }

  window.GameUIViews.journal = { activePanel, completedPanel, contents };
})();
