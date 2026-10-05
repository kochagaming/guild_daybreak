(function () {
  "use strict";

  window.GameUIViews = window.GameUIViews || {};

  const explorationKinds = new Set(["arrival", "explore", "story", "companion", "bond", "secret", "camp", "hazard", "lore", "gather", "treasure", "treasureGold", "treasureItem", "stairs", "recovery"]);
  const logIcons = { system: "✦", formation: "≡", encounter: "⚔", round: "—", hero: "›", skill: "✧", heal: "+", guard: "▣", enemy: "‹", "enemy-skill": "※", victory: "✓", defeat: "×", recovery: "+", warning: "!", burst: "⚡", weakness: "◇", status: "◈", arrival: "◆", explore: "…", story: "◇", companion: "♙", bond: "結", secret: "?", camp: "♨", hazard: "!", lore: "文", gather: "採", treasure: "□", treasureGold: "G", treasureItem: "★", stairs: "↧" };
  const discoveryMarkers = { arrival: "◆", explore: "…", story: "◇", companion: "♙", bond: "結", secret: "?", camp: "♨", hazard: "!", lore: "文", gather: "採", treasure: "□", treasureGold: "G", treasureItem: "★", stairs: "↧", recovery: "+" };

  function battleLogEntries(entries, context) {
    const { escape } = context;
    return entries.map(entry => `<div class="battle-log-entry ${entry.kind}"><span class="battle-log-icon" aria-hidden="true">${logIcons[entry.kind] || "·"}</span><p>${escape(entry.text)}</p></div>`).join("");
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

  function eventRows(event, partyNames, context) {
    const { escape } = context;
    const encounterIndex = event.entries.findIndex(entry => entry.kind === "encounter");
    const terminalIndex = event.entries.findIndex(entry => ["victory", "defeat"].includes(entry.kind));
    function discoveries(entries) {
      return entries.filter(entry => explorationKinds.has(entry.kind)).map(entry => {
        const routeDefinition = entry.routeEventId
          ? (window.GameData.config.explorationEvents?.routeEvents || []).find(candidate => candidate.id === entry.routeEventId)
          : null;
        const witnesses = entry.kind === "story" && partyNames.length
          ? `<span class="journey-witnesses">この場を歩いた冒険者　${partyNames.map(escape).join("・")}</span>` : "";
        const label = routeDefinition?.name || (entry.kind === "arrival" ? event.title : entry.kind === "story" ? "物語の手掛かり" : entry.kind === "companion" ? "道中のひと幕" : entry.kind === "bond" ? "旅仲間のひと幕" : entry.kind === "secret" ? "隠された道" : entry.kind === "camp" ? "野営" : entry.kind === "hazard" ? "危険な道" : entry.kind === "lore" ? "古い記録" : entry.kind === "gather" ? "素材採取" : entry.kind === "stairs" ? "次の区画" : entry.kind === "recovery" ? "小休止" : entry.kind.startsWith("treasure") ? "発見" : "探索中");
        const routeTags = routeDefinition
          ? `<span class="journey-route-tags"><b class="${entry.routeEventSuccess ? "success" : "failure"}">${entry.routeEventSuccess ? "成功" : "失敗"}</b>${entry.routeTeamSurveyApplied ? "<b class=\"mastery\">連携探索</b>" : ""}${entry.routeBondSupportApplied ? "<b class=\"mastery\">旅仲間の連携</b>" : ""}${entry.routeRumorMatched ? "<b class=\"rumor\">噂と一致</b>" : ""}${entry.routeEventPersonalPracticeApplied ? "<b class=\"mastery\">本人の経験</b>" : ""}${entry.routeEventMasteryApplied ? "<b class=\"mastery\">観察記録を活用</b>" : ""}</span>`
          : entry.kind === "treasure" && entry.treasurePersonalPracticeApplied ? '<span class="journey-route-tags"><b class="mastery">本人の開錠経験</b></span>' : "";
        const surveyCast = entry.routeTeamSurveyApplied && entry.routeTeamSurveyMemberNames?.length
          ? `<span class="journey-witnesses">地図を重ねた者　${entry.routeTeamSurveyMemberNames.map(escape).join("・")}</span>` : "";
        const supportCast = entry.routeBondSupportApplied && entry.routeBondSupportMemberNames?.length
          ? `<span class="journey-witnesses">息を合わせた者　${entry.routeBondSupportMemberNames.map(escape).join("・")}</span>` : "";
        const cast = entry.kind === "companion" ? companionCast(entry, context) : "";
        const bondCast = entry.kind === "bond" && entry.adventurerBondMemberNames?.length
          ? `<span class="journey-witnesses">共に歩いた者　${entry.adventurerBondMemberNames.map(escape).join("・")} · 同行${entry.sharedSorties}回</span>` : "";
        return `<article class="journey-discovery ${entry.kind}${routeDefinition ? ` is-route-event ${entry.routeEventSuccess ? "route-success" : "route-failure"}` : ""}"><span class="journey-discovery-marker" aria-hidden="true">${discoveryMarkers[entry.kind]}</span><div><small>${escape(label)}</small>${routeTags}${cast}<p>${escape(entry.text)}</p>${bondCast}${surveyCast}${supportCast}${witnesses}</div></article>`;
      }).join("");
    }
    const before = discoveries(encounterIndex < 0 ? event.entries : event.entries.slice(0, encounterIndex));
    if (encounterIndex < 0) return before;
    const battleEnd = terminalIndex < 0 ? event.entries.length : terminalIndex + 1;
    const battle = event.entries.slice(encounterIndex, battleEnd).filter(entry => !explorationKinds.has(entry.kind));
    const defeated = event.status === "撤退";
    const combat = `<details class="journey-entry journey-encounter ${event.complete ? "is-complete" : "is-current"} ${defeated ? "is-defeat" : ""}" data-detail="journal-encounter-${event.number}" ${!event.complete || defeated ? "open" : ""}><summary><span class="journey-marker">${event.number}</span><span><strong>${escape(event.title)}で敵と遭遇</strong><small>第${event.number}戦 · ${escape(event.status)}${event.complete ? "" : " · 戦況を更新中"}</small></span><span class="journey-status ${defeated ? "bad" : event.status === "勝利" ? "good" : ""}">${escape(event.status)}</span><span class="summary-chevron" aria-hidden="true">⌄</span></summary>${observationSummary(battle, event, context)}<div class="battle-log-list">${battleLogEntries(battle, context)}</div></details>`;
    return before + combat + discoveries(event.entries.slice(battleEnd));
  }

  function contents(journal, context) {
    const { escape, time } = context;
    const outcome = journal.outcome;
    const progress = Math.round(journal.progress * 100);
    const setup = journal.setup.length ? `<details class="journey-entry journey-setup" data-detail="journal-${journal.partyIndex}-setup"><summary><span class="journey-marker">出</span><span><strong>探索を開始</strong><small>隊列・装備スキル・行動率</small></span><span class="summary-chevron" aria-hidden="true">⌄</span></summary><div class="battle-log-list">${battleLogEntries(journal.setup, context)}</div></details>` : "";
    const encounters = journal.events.map(event => eventRows(event, journal.partyNames, context)).join("");
    const waiting = !journal.events.length ? '<div class="journey-waiting"><span>◇</span><p>目的地へ向かっています。最初の遭遇までお待ちください。</p></div>' : "";
    const footer = journal.active
      ? `<div class="journey-live"><span class="live-dot" aria-hidden="true"></span><strong>${escape(journal.status)}</strong><small>${journal.next ? `次の記録まで約 ${time(journal.next)}` : "まもなく帰還します"}</small></div>`
      : `<div class="journey-conclusion ${outcome.success ? "success" : "failure"}"><strong>${outcome.success ? "探索成功" : "探索から撤退"}</strong><span>${outcome.encountersCleared || 0}/${journal.totalEncounters}戦突破 · ${outcome.monstersDefeated || 0}体討伐</span></div>`;
    return `<div class="journey-progress"><div><span>${journal.active ? "探索進行" : "探索完了"}</span><strong>${progress}%</strong></div><div class="progress"><i style="width:${progress}%"></i></div></div><div class="journey-timeline">${setup}${encounters}${waiting}</div>${footer}`;
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
