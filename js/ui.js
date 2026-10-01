(function () {
  "use strict";

  const pages = [
    ["home", "⌂", "ホーム", "GUILD CHRONICLE"], ["characters", "♙", "冒険者", "ADVENTURERS"],
    ["party", "♟", "パーティ", "PARTY FORMATION"],
    ["archives", "▤", "冒険者資料室", "ADVENTURER ARCHIVES", "資料室"],
    ["guild", "♜", "ギルド運営", "GUILD MANAGEMENT"],
    ["shop", "¤", "商店", "GENERAL STORE"], ["blacksmith", "⚒", "鍛冶屋", "BLACKSMITH"],
    ["inventory", "▣", "所持品", "INVENTORY"], ["settings", "⚙", "設定", "SETTINGS"]
  ];
  const mobilePrimaryPages = new Set(["home", "characters", "party", "inventory"]);
  let currentPage = "home";
  let archiveView = "commissions";
  const partyViews = Array.from({ length: window.Party.maximum() }, (_, index) => window.Party.expedition(index) ? "adventure" : "formation");
  let partyScreen = "overview";
  let partyOverviewScrollTop = 0;
  const explorationChoices = Array.from({ length: window.Party.maximum() }, (_, index) => {
    const plan = window.Party.plan(index);
    return plan ? { dungeonId: plan.dungeonId, chapterId: window.GameData.dungeons[plan.dungeonId]?.chapterId, [plan.dungeonId]: plan.timeMultiplier, [`${plan.dungeonId}:difficulty`]: plan.difficultyId } : {};
  });
  function reloadExplorationChoices() {
    explorationChoices.forEach((choices, index) => {
      Object.keys(choices).forEach(key => delete choices[key]);
      const plan = window.Party.plan(index);
      if (!plan) return;
      Object.assign(choices, { dungeonId: plan.dungeonId, chapterId: window.GameData.dungeons[plan.dungeonId]?.chapterId, [plan.dungeonId]: plan.timeMultiplier, [`${plan.dungeonId}:difficulty`]: plan.difficultyId });
    });
  }
  let toastTimer;
  let pendingImport = null;
  let pendingPresetAction = null;
  let pendingUpgrade = null;
  let pendingClassChange = null;
  let importRequest = 0;
  const inventoryView = { kind: "all", quality: "all", equipped: "all", lock: "all", sort: "newest", page: 0 };
  const blacksmithView = { query: "", category: "all", material: "all", status: "all", sort: "ready", page: 0 };
  const upgradeView = { query: "", kind: "all", status: "all", sort: "ready", page: 0 };
  let blacksmithScreen = "menu";
  const characterView = { query: "", job: "all", sort: "level", page: 0 };
  let characterScreen = "overview";
  let selectedCharacterId = null;
  let characterOverviewScrollTop = 0;
  const rosterView = { query: "", job: "all", scope: "all", sort: "level", page: 0 };
  const equipmentPicker = { characterId: null, query: "", kind: "all", quality: "all", sort: "recommended", page: 0 };
  let equipmentReturnToParty = false;
  let selectedPartyCharacterId = null;
  let equipmentChangeNotice = null;
  let facilityNoticeCount = -1;
  let equipmentChangeTimer = null;

  const escape = (text) => String(text).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  const formatGold = (amount) => `${Number(amount).toLocaleString("ja-JP")} G`;
  const itemName = (id) => window.GameData.items[id] ? window.GameData.items[id].name : "不明な品";
  const time = (milliseconds) => {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  };

  function toast(message, tone) {
    const region = document.getElementById("toast-region");
    region.innerHTML = `<div class="toast ${tone || ""}">${escape(message)}</div>`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { region.innerHTML = ""; }, 2800);
  }

  function empty(title, body, action) {
    return `<div class="empty-state"><div class="empty-icon">◇</div><h3>${title}</h3><p>${body}</p>${action || ""}</div>`;
  }

  function statBar(label, value, maximum, textValue) {
    const percent = Math.min(100, Math.max(0, value / maximum * 100));
    return `<div class="stat-row"><span>${label}</span><div class="bar"><i style="width:${percent}%"></i></div><strong>${textValue == null ? value : textValue}</strong></div>`;
  }
  function extraStats(stats, previous) {
    const fields = [["magicAttack", "魔法攻撃"], ["magicDefense", "魔法防御"], ["magicHealing", "魔法回復"]];
    return `<div class="bonus-chips">${fields.map(([key, label]) => `<span>${label} <strong>${stats[key] || 0}</strong>${previous ? statDiff((stats[key] || 0) - (previous[key] || 0)) : ""}</span>`).join("")}${stats.physicalPower == null ? "" : `<span>物理威力 <strong>${Math.round(stats.physicalPower * 100)}%</strong>${previous ? statDiff(Math.round((stats.physicalPower - (previous.physicalPower || 1)) * 100)) + "pt" : ""}</span><span>魔法威力 <strong>${Math.round(stats.magicPower * 100)}%</strong>${previous ? statDiff(Math.round((stats.magicPower - (previous.magicPower || 1)) * 100)) + "pt" : ""}</span>`}${stats.hitRate == null ? "" : `<span>命中精度 ${Math.round(stats.hitRate * 100)}%${previous ? statDiff(Math.round((stats.hitRate - (previous.hitRate || 0)) * 100)) + "pt" : ""}</span><span>回避 ${Math.round((stats.evasionRate || 0) * 100)}%${previous ? statDiff(Math.round(((stats.evasionRate || 0) - (previous.evasionRate || 0)) * 100)) + "pt" : ""}</span>`}${stats.speed == null ? "" : `<span>速度 ${stats.speed}${previous ? statDiff(stats.speed - (previous.speed || 0)) : ""}</span>`}${stats.attackCount == null ? "" : `<span>攻撃回数 <strong>${stats.attackCount}</strong>${previous ? statDiff(stats.attackCount - (previous.attackCount || 1)) : ""}</span>`}</div>`;
  }

  function battleLogEntries(entries) {
    const icons = { system: "✦", formation: "≡", encounter: "⚔", round: "—", hero: "›", skill: "✧", heal: "+", enemy: "‹", victory: "✓", defeat: "×", recovery: "+", warning: "!", burst: "⚡", weakness: "◇", status: "◈", arrival: "◆", explore: "…", story: "◇", treasure: "□", treasureGold: "G", treasureItem: "★", stairs: "↧" };
    return entries.map(entry => `<div class="battle-log-entry ${entry.kind}"><span class="battle-log-icon" aria-hidden="true">${icons[entry.kind] || "·"}</span><p>${escape(entry.text)}</p></div>`).join("");
  }

  function journeyEventRows(event) {
    const explorationKinds = new Set(["arrival", "explore", "story", "treasure", "treasureGold", "treasureItem", "stairs", "recovery"]);
    const encounterIndex = event.entries.findIndex(entry => entry.kind === "encounter");
    const terminalIndex = event.entries.findIndex(entry => ["victory", "defeat"].includes(entry.kind));
    function discoveries(entries) {
      const marker = { arrival: "◆", explore: "…", story: "◇", treasure: "□", treasureGold: "G", treasureItem: "★", stairs: "↧", recovery: "+" };
      return entries.filter(entry => explorationKinds.has(entry.kind)).map(entry => `<article class="journey-discovery ${entry.kind}"><span class="journey-discovery-marker" aria-hidden="true">${marker[entry.kind]}</span><div><small>${entry.kind === "arrival" ? event.title : entry.kind === "story" ? "物語の手掛かり" : entry.kind === "stairs" ? "次の区画" : entry.kind === "recovery" ? "小休止" : entry.kind.startsWith("treasure") ? "発見" : "探索中"}</small><p>${escape(entry.text)}</p></div></article>`).join("");
    }
    const before = discoveries(encounterIndex < 0 ? event.entries : event.entries.slice(0, encounterIndex));
    if (encounterIndex < 0) return before;
    const battleEnd = terminalIndex < 0 ? event.entries.length : terminalIndex + 1;
    const battle = event.entries.slice(encounterIndex, battleEnd).filter(entry => !explorationKinds.has(entry.kind));
    const combat = `<details class="journey-entry journey-encounter ${event.complete ? "is-complete" : "is-current"}" data-detail="journal-encounter-${event.number}" ${event.complete ? "" : "open"}><summary><span class="journey-marker">${event.number}</span><span><strong>${escape(event.title)}で敵と遭遇</strong><small>第${event.number}戦 · ${event.status}${event.complete ? "" : " · 戦況を更新中"}</small></span><span class="journey-status ${event.status === "撤退" ? "bad" : event.status === "勝利" ? "good" : ""}">${event.status}</span><span class="summary-chevron" aria-hidden="true">⌄</span></summary><div class="battle-log-list">${battleLogEntries(battle)}</div></details>`;
    return before + combat + discoveries(event.entries.slice(battleEnd));
  }

  function journalContents(journal) {
    const outcome = journal.outcome;
    const progress = Math.round(journal.progress * 100);
    const setup = journal.setup.length ? `<details class="journey-entry journey-setup" data-detail="journal-${journal.partyIndex}-setup"><summary><span class="journey-marker">出</span><span><strong>探索を開始</strong><small>隊列・装備スキル・行動率</small></span><span class="summary-chevron" aria-hidden="true">⌄</span></summary><div class="battle-log-list">${battleLogEntries(journal.setup)}</div></details>` : "";
    const encounters = journal.events.map(journeyEventRows).join("");
    const waiting = !journal.events.length ? '<div class="journey-waiting"><span>◇</span><p>目的地へ向かっています。最初の遭遇までお待ちください。</p></div>' : "";
    const footer = journal.active
      ? `<div class="journey-live"><span class="live-dot" aria-hidden="true"></span><strong>${escape(journal.status)}</strong><small>${journal.next ? `次の記録まで約 ${time(journal.next)}` : "まもなく帰還します"}</small></div>`
      : `<div class="journey-conclusion ${outcome.success ? "success" : "failure"}"><strong>${outcome.success ? "探索成功" : "探索から撤退"}</strong><span>${outcome.encountersCleared || 0}/${journal.totalEncounters}戦突破 · ${outcome.monstersDefeated || 0}体討伐</span></div>`;
    return `<div class="journey-progress"><div><span>${journal.active ? "探索進行" : "探索完了"}</span><strong>${progress}%</strong></div><div class="progress"><i style="width:${progress}%"></i></div></div><div class="journey-timeline">${setup}${encounters}${waiting}</div>${footer}`;
  }

  function activeJournalPanel(expedition) {
    const journal = window.ExpeditionLog.active(expedition);
    return `<section class="panel exploration-journal" data-active-journal="${journal.partyIndex}" data-journal-revision="${journal.revision}"><div class="section-heading"><div><span class="label">LIVE ADVENTURE LOG</span><h3>${escape(journal.dungeonName)}・探索の記録</h3></div><span class="badge good">このパーティは探索中</span></div>${journalContents(journal)}</section>`;
  }

  function completedJournalPanel(result) {
    if (!Array.isArray(result.battleLog) || !result.battleLog.length) return "";
    const journal = window.ExpeditionLog.completed(result);
    return `<section class="exploration-journal completed-journal"><div class="section-heading"><div><span class="label">ADVENTURE LOG</span><h4>探索の記録</h4></div><span class="badge ${result.success ? "good" : "bad"}">${result.success ? "成功" : "撤退"}</span></div>${journalContents(journal)}</section>`;
  }
  function resultCard(result) {
    if (!result) return `<div class="notice muted"><span class="notice-icon">◇</span><div><strong>まだ探索記録はありません</strong><p>パーティを編成し、最初の探索へ送り出しましょう。</p></div></div>`;
    const dungeon = window.DungeonDifficulty.variant(result.dungeonId, result.difficultyId || "normal");
    const drops = result.drops.length
      ? result.drops.map((drop) => `<span class="loot-chip ${drop.qualityId || ""} ${drop.newDiscovery ? "is-new-discovery" : ""}">${drop.newDiscovery ? '<b>NEW</b> ' : ""}${window.GameData.items[drop.itemId].icon} ${escape(drop.displayName || itemName(drop.itemId))}${drop.quantity > 1 ? ` ×${drop.quantity}` : ""}</span>`).join("")
      : `<span class="muted-text">装備・素材の発見なし</span>`;
    const levels = result.levelUps.length ? `<p class="level-up">レベルアップ：${result.levelUps.map((entry) => `${escape(entry.name)} Lv.${entry.level}`).join("、")}</p>` : "";
    const autoSales = result.autoSold?.length
      ? `<div class="auto-sell-result"><strong>自動売却 +${formatGold(result.autoSellGold || 0)}</strong><p>${result.autoSold.map(entry => escape(entry.displayName)).join("、")}</p></div>`
      : "";
    const experience = Array.isArray(result.experienceGains) && result.experienceGains.some(entry => entry.amount !== result.experienceGains[0].amount)
      ? `<div class="experience-gains">${result.experienceGains.map(entry => `<span>${escape(entry.name)} +${entry.amount} EXP</span>`).join("")}</div>`
      : `<strong>各 +${result.experienceGains?.[0]?.amount ?? result.exp} EXP</strong>`;
    const storyMoments = Array.isArray(result.storyMoments) && result.storyMoments.length
      ? `<section class="result-story-moments"><span class="label">STORY PROGRESS</span>${result.storyMoments.map(moment => {
        const scene = window.Story.scene(moment.sceneId), route = window.GameData.dungeons[moment.dungeonId];
        const momentLabel = moment.kind === "opening" ? "新しい探索地" : moment.kind === "discovery" ? "探索で判明" : "攻略後";
        return `<article><small>${momentLabel} · ${escape(route?.name || "物語")}</small><strong>${escape(scene?.name || "物語が進みました")}</strong><p>${escape(scene?.text || "")}</p></article>`;
      }).join("")}</section>` : "";
    const newObservations = Array.isArray(result.newObservationIds) && result.newObservationIds.length
      ? `<section class="result-observation-unlock"><span class="label">NEW FIELD NOTES</span><strong>観察日記に${result.newObservationIds.length}頁が加わりました</strong><p>${result.newObservationIds.map(id => window.ObservationJournal.note(id)?.title).filter(Boolean).map(escape).join("、")}</p><button class="button ghost" data-action="open-observations">観察日記を読む</button></section>`
      : "";
    const newItems = Array.isArray(result.newItemIds) && result.newItemIds.length
      ? `<section class="result-new-discoveries"><span class="label">FIRST DISCOVERY</span><strong>初めての品を${result.newItemIds.length}種類発見しました</strong><p>${result.newItemIds.map(id => `${window.GameData.items[id]?.icon || "◇"} ${escape(itemName(id))}`).join("　")}</p><button class="button ghost" data-action="open-item-codex">アイテム図鑑で確認</button></section>`
      : "";
    const firstClearReward = result.firstClearReward
      ? `<section class="result-first-clear"><span class="label">FIRST CLEAR</span><strong>${escape(window.DungeonDifficulty.tier(result.firstClearReward.difficultyId).name)}・初回踏破報酬</strong><p>${[result.firstClearReward.gold ? `所持金 +${formatGold(result.firstClearReward.gold)}` : "", ...result.firstClearReward.materials.map(entry => `${window.GameData.items[entry.itemId]?.icon || "◇"} ${escape(itemName(entry.itemId))}×${entry.quantity}`)].filter(Boolean).join("　")}</p></section>`
      : "";
    return `<article class="result-card ${result.success ? "success" : "failure"}">
      <div class="result-seal">${result.success ? "勝" : "退"}</div><div class="result-body">
      <div class="card-heading"><div><span class="label">最新の探索報告</span><h3>${escape(result.dungeonName || dungeon.name)} · ${result.timeMultiplier || 1}倍探索</h3></div><span class="badge ${result.success ? "good" : "bad"}">${result.success ? "探索成功" : "撤退"}</span></div>
      <p>${escape(result.partyNames.join("、"))}が帰還しました。</p>
      <div class="reward-line"><strong>+${formatGold(result.gold)}</strong>${experience}</div>
      <div class="loot-list">${drops}</div>${autoSales}${levels}${firstClearReward}${newItems}${newObservations}${storyMoments}${(result.storyCompleted || []).map(id => window.GameData.storyChapters.find(chapter => chapter.id === id)).filter(Boolean).map(chapter => `<div class="story-objective"><strong>${escape(chapter.title)}・達成</strong><p>解放・章報酬：${escape(chapter.unlockText)}</p></div>`).join("")}${tacticalReportPanel(result)}${memberReportPanel(result)}${completedJournalPanel(result)}</div></article>`;
  }

  function tacticalReportPanel(result) {
    const traits = result.strategyReport;
    const traitSummary = traits ? `<div class="mechanic-report"><strong>攻略特性への対応</strong><p>全体攻撃 ${traits.areaHits}発 ／ 防御無視 ${traits.penetrationHits}発 ／ 魔法弱点 ${traits.magicWeaknessHits}発（実ダメージ ${traits.magicWeaknessDamage}）</p><p>後列狙い ${traits.rearHits}回 ／ 実被ダメージ ${traits.rearDamage} ／ 戦闘不能 ${traits.rearKnockouts}人</p><small>攻撃は命中した対象ごとに集計。同じ一撃が複数の項目に含まれます。回復量は下の冒険者別戦績で確認できます。</small></div>` : "";
    const report = result.mechanicReport;
    const summary = report && report.warnings ? `<div class="mechanic-report"><strong>大技への対応</strong><p>予告${report.warnings}回 ／ 大技${report.bursts}回 ／ 防御で軽減${report.guardedHits}人回 ／ 軽減なし${report.unguardedHits}人回 ／ 隙への攻撃${report.weaknessHits}発</p><small>防御の集計は大技の被弾ごと。隙への攻撃には追撃・多段も含みます。</small></div>` : "";
    const facts = !result.success && Array.isArray(result.defeatFacts) && result.defeatFacts.length
      ? `<section class="defeat-hints"><h4>撤退時の観測記録</h4><ul>${result.defeatFacts.map(fact => `<li>${escape(fact)}</li>`).join("")}</ul></section>` : "";
    return traitSummary + summary + facts;
  }
  function memberReportPanel(result) {
    if (!Array.isArray(result.memberReports) || !result.memberReports.length) return "";
    return `<section class="member-report"><h4>冒険者ごとの戦績</h4><div class="report-scroll"><table><thead><tr><th scope="col">冒険者</th><th scope="col">与ダメージ</th><th scope="col">物理命中</th><th scope="col">回復量</th><th scope="col">被ダメージ</th><th scope="col">会心回数</th><th scope="col">帰還時HP</th></tr></thead><tbody>${result.memberReports.map(member => `<tr><th scope="row">${escape(member.name)}<small>${escape((window.GameData.jobs[member.jobId] || {}).name || "冒険者")}</small></th><td>${member.damageDealt}</td><td>${member.attackHits || 0}/${member.attackAttempts || 0}</td><td class="report-heal">${member.healingDone}</td><td>${member.damageTaken}</td><td>${member.criticalHits}</td><td>${member.remainingHp}/${member.maxHp}${member.remainingHp === 0 ? "（戦闘不能）" : ""}</td></tr>`).join("")}</tbody></table></div><p>与ダメージ・回復量は実際に減少・回復したHPの合計です。物理命中は通常攻撃と物理系の技の命中数／試行数です。被ダメージは回復しても累積します。</p></section>`;
  }

  function dungeonIntel(dungeon, monsters) {
    const strategy = dungeon.strategy;
    const loot = monsters.filter(monster => monster.bossDrop && window.Encyclopedia.item(monster.bossDrop.itemId)).map(monster => {
      const item = window.GameData.items[monster.bossDrop.itemId];
      return `<div class="boss-loot"><strong>発見記録：${escape(item.name)}</strong><p>${escape(item.effectDescription)}</p><small>この地で実物が確認された希少装備</small></div>`;
    }).join("");
    const known = monsters.map(monster => ({ monster, record: window.Encyclopedia.monster(monster.id) })).filter(entry => entry.record);
    const records = known.length ? known.map(({ monster, record }) => {
      const observation = record.observations || {};
      const signs = [];
      if ((observation.elementWeaknesses || []).length) signs.push(`弱点反応：${observation.elementWeaknesses.map(id => id === "magic" ? "魔法" : window.StatusCombat.elementLabel(id)).join("・")}`);
      if ((observation.elementResistances || []).length) signs.push(`耐性反応：${observation.elementResistances.map(id => window.StatusCombat.elementLabel(id)).join("・")}`);
      if (observation.rearTargeting) signs.push("隊列後方への攻撃を確認");
      if ((observation.burstRounds || []).length >= 2) signs.push(`大技発動ターン：${observation.burstRounds.join("・")}`);
      return `<li><strong>${escape(monster.name)}</strong><span>${escape(signs.join(" ／ ") || "遭遇記録のみ。詳しい性質は未検証")}</span></li>`;
    }).join("") : "<li><strong>未確認の気配</strong><span>現地から持ち帰った記録はまだありません。</span></li>";
    return `${strategy ? `<div class="dungeon-strategy"><strong>ギルドへの依頼</strong><p>${escape(dungeon.description)}</p><p class="strategy-advice">先行隊の噂：${escape(strategy.feature)}</p></div>` : ""}${loot}<details class="enemy-intel"><summary>これまでの現地記録</summary><ul>${records}</ul><p>命中、弱点、耐性、行動周期は実際の戦闘で確かめた内容だけが資料室へ残ります。</p></details>`;
  }

  function homePage() { return window.GameUIViews.home.page({ escape }); }

  function guildPage() {
    return window.GameUIViews.guild.page({ escape, formatGold, itemName, time });
  }

  function settingsPage() {
    return window.GameUIViews.settings.page();
  }

  function partyReportPanel() {
    const index = window.Party.selected();
    return `<section class="panel party-report"><div class="section-heading"><div><span class="label">LATEST REPORT</span><h3>${escape(window.Party.name(index))}の直近の探索結果</h3></div></div>${resultCard(window.GameState.data.partyResults[index])}<button class="button secondary" data-action="party-view" data-view="adventure">出撃先を選ぶ</button></section>`;
  }

  function facilitiesPanel() {
    return window.GameUIViews.guild.facilities({ escape, formatGold, itemName, time });
  }

  function itemEncyclopedia() {
    return window.GameUIViews.archives.items(archiveViewContext());
  }

  function monsterEncyclopedia() {
    return window.GameUIViews.archives.monsters(archiveViewContext());
  }

  function archivePage() {
    return window.GameUIViews.archives.page(archiveViewContext());
  }

  function archiveViewContext() {
    return { archiveView, escape, formatGold, itemName };
  }

  function commissionsPanel(dungeonId) {
    return window.GameUIViews.archives.commissions(archiveViewContext(), dungeonId);
  }
  function storyPanel() {
    return window.GameUIViews.home.story({ escape });
  }

  function storyArchive() {
    return window.GameUIViews.home.archive({ escape });
  }

  function characterCard(character) {
    return window.GameUIViews.characters.card(characterViewContext(), character);
  }

  function characterViewContext() {
    return { applicantCard, characterView, empty, equipmentSkillBadges, escape, extraStats, portraitImage, recruitmentRequirementPreview, recruitmentSummary, statBar };
  }

  function openClassChangeModal(characterId) {
    window.GameUIViews.classChange.open({ escape }, characterId);
  }

  function openClassChangeConfirmation(characterId, targetJobId) {
    window.GameUIViews.classChange.confirm({ escape, toast, setPending: value => { pendingClassChange = value; } }, characterId, targetJobId);
  }

  function recruitmentSummary(requirements) {
    return window.GameUIViews.recruitment.summary(requirements);
  }

  function recruitmentRequirementPreview(requirements) {
    return window.GameUIViews.recruitment.requirementPreview(recruitmentViewContext(), requirements);
  }

  function applicantCard(applicant, requirements) {
    return window.GameUIViews.recruitment.applicantCard(recruitmentViewContext(), applicant, requirements);
  }

  function recruitmentViewContext() {
    return { escape, extraStats, navigate, originBonuses, portraitImage, toast };
  }

  function charactersPage() {
    if (characterScreen === "detail") {
      const character = window.Characters.get(selectedCharacterId);
      if (character) {
        const header = window.GameUIViews.navigation.routeHeader({ backAction: "character-back", backLabel: "冒険者一覧", kicker: window.Characters.jobName(character), title: character.name, status: `Lv.${character.level}` });
        return `<div class="character-route character-route-detail">${header}${window.GameUIViews.characters.detail(characterViewContext(), character)}</div>`;
      }
      characterScreen = "overview"; selectedCharacterId = null;
    }
    return window.GameUIViews.characters.page(characterViewContext());
  }

  function showRecruitmentReveal() {
    window.GameUIViews.recruitment.showReveal(recruitmentViewContext());
  }

  function openHireModal(applicantId) {
    window.GameUIViews.recruitment.openHire(recruitmentViewContext(), applicantId);
  }

  function openQuickHireConfirmation(applicantId) {
    window.GameUIViews.recruitment.openQuickHire(recruitmentViewContext(), applicantId);
  }

  function portraitEditButton(character) {
    return window.GameUIViews.portraits.editButton(portraitViewContext(), character);
  }

  function openPortraitModal(characterId) {
    window.GameUIViews.portraits.open(portraitViewContext(), characterId);
  }

  function portraitImage(character, small) {
    return window.GameUIViews.portraits.image(portraitViewContext(), character, small);
  }

  function portraitPicker(character) {
    return window.GameUIViews.portraits.picker(portraitViewContext(), character);
  }

  function portraitViewContext() {
    return { canEdit: () => currentPage === "party", escape };
  }

  function originBonuses(character) {
    return window.GameUIViews.characters.originBonuses(characterViewContext(), character);
  }

  function statDiff(value) {
    if (!value) return `<span class="diff neutral">±0</span>`;
    return `<span class="diff ${value > 0 ? "positive" : "negative"}">${value > 0 ? "+" : ""}${value}</span>`;
  }

  const equipmentChangeFields = [
    ["hp", "最大HP"], ["attack", "物理攻撃"], ["defense", "物理防御"],
    ["magicAttack", "魔法攻撃"], ["magicDefense", "魔法防御"], ["magicHealing", "魔法回復"],
    ["hitRate", "命中率", "percent"], ["evasionRate", "回避率", "percent"],
    ["speed", "行動速度"], ["attackCount", "攻撃回数"], ["criticalRate", "会心率", "percent"],
    ["physicalPower", "物理威力", "percent"], ["magicPower", "魔法威力", "percent"],
    ["skillPower", "スキル威力", "percent"], ["healingPower", "回復威力", "percent"]
  ];

  function equipmentSnapshot(characterId) {
    const character = window.Characters.get(characterId);
    if (!character) return null;
    return {
      stats: window.Characters.stats(character),
      weight: window.Characters.equipmentWeight(character),
      maxWeight: window.Characters.maxWeight(character)
    };
  }

  function equipmentChangeValue(value, format) {
    if (format === "percent") return `${Math.round((Number(value) || 0) * 1000) / 10}%`;
    return String(Math.round((Number(value) || 0) * 10) / 10);
  }

  function setEquipmentChangeNotice(title, before, after) {
    if (!before || !after) return;
    const rows = equipmentChangeFields.map(([key, label, format]) => {
      const rawDelta = (Number(after.stats[key]) || 0) - (Number(before.stats[key]) || 0);
      const delta = format === "percent" ? Math.round(rawDelta * 1000) / 10 : Math.round(rawDelta * 10) / 10;
      if (!delta) return null;
      return {
        label,
        before: equipmentChangeValue(before.stats[key], format),
        after: equipmentChangeValue(after.stats[key], format),
        delta: `${delta > 0 ? "+" : ""}${delta}${format === "percent" ? "pt" : ""}`,
        tone: delta > 0 ? "positive" : "negative"
      };
    }).filter(Boolean);
    const weightDelta = Math.round((after.weight - before.weight) * 10) / 10;
    if (weightDelta) rows.push({
      label: "装備重量", before: String(before.weight), after: String(after.weight),
      delta: `${weightDelta > 0 ? "+" : ""}${weightDelta}`, tone: weightDelta > 0 ? "negative" : "positive"
    });
    equipmentChangeNotice = { title, rows, weight: `${after.weight} / ${after.maxWeight}` };
    clearTimeout(equipmentChangeTimer);
    equipmentChangeTimer = setTimeout(dismissEquipmentChangeNotice, 4500);
  }

  function dismissEquipmentChangeNotice() {
    equipmentChangeNotice = null;
    clearTimeout(equipmentChangeTimer);
    equipmentChangeTimer = null;
    const notice = document.getElementById("equipment-change-notice");
    if (notice && typeof notice.remove === "function") notice.remove();
  }

  function renderEquipmentModal(options) {
    const settings = options || {};
    const modalRoot = document.getElementById("modal-root");
    const previousModal = typeof modalRoot.querySelector === "function" ? modalRoot.querySelector(".equipment-modal") : null;
    const previousScrollTop = settings.preserveScroll && previousModal ? previousModal.scrollTop : 0;
    window.GameUIViews.equipment.render({ effectModifierText, empty, equipmentChangeNotice, equipmentPicker, equipmentReturnToParty, equipmentSkillBadges, escape, portraitEditButton, statDiff });
    const nextModal = typeof modalRoot.querySelector === "function" ? modalRoot.querySelector(".equipment-modal") : null;
    if (settings.preserveScroll && nextModal) nextModal.scrollTop = previousScrollTop;
    if (equipmentChangeNotice && nextModal && typeof nextModal.addEventListener === "function") {
      const noticeScrollTop = nextModal.scrollTop;
      const dismissOnUserScroll = () => {
        if (Math.abs(nextModal.scrollTop - noticeScrollTop) < 1) return;
        nextModal.removeEventListener?.("scroll", dismissOnUserScroll);
        dismissEquipmentChangeNotice();
      };
      nextModal.addEventListener("scroll", dismissOnUserScroll, { passive: true });
    }
  }

  function openEquipmentModal(characterId, returnToParty) {
    dismissEquipmentChangeNotice();
    equipmentReturnToParty = Boolean(returnToParty);
    if (equipmentPicker.characterId !== characterId) Object.assign(equipmentPicker, { characterId, query: "", kind: "all", quality: "all", sort: "recommended", page: 0 });
    renderEquipmentModal();
  }

  function equipmentSkillBadges(instance) {
    const skills = window.EquipmentSkills.skillSources(instance);
    return skills.length ? `<div class="equipment-skill-list">${skills.map(entry => `<span class="${entry.source === "超レア称号" ? "ultra-rare-skill" : ""}">${escape(entry.skill.name)}<small>${escape(entry.source)}</small></span>`).join("")}</div>` : "";
  }

  function effectModifierText(instance) {
    const modifiers = instance.modifiers || {};
    const affixes = Object.entries(window.GameData.affixes.labels).filter(([key]) => modifiers[key]).map(([key, label]) => `${label}+${modifiers[key]}${["hitRate", "evasionRate"].includes(key) ? "pt" : ""}`).join("・");
    const base = window.Items.template(instance.templateId);
    const ultra = window.EquipmentSkills.title(instance);
    return [affixes, ultra ? `【超レア称号：${ultra.name}】全装備性能2倍・${window.GameData.equipmentSkills[ultra.skillId].name}` : "", base.effectDescription ? `【ボス固有效果】${base.effectDescription}` : ""].filter(Boolean).join(" ／ ");
  }

  function partyViewContext() {
    return { activeJournalPanel, departureSummary, dungeonIntel, empty, escape, explorationChoices, formatGold, itemName, portraitImage, time };
  }

  function selectedDungeonId(partyIndex) {
    return window.GameUIViews.party.selectedDungeonId(partyViewContext(), partyIndex);
  }

  function selectedDungeon(partyIndex) {
    return window.GameUIViews.party.selectedDungeon(partyViewContext(), partyIndex);
  }

  function partyOverview() {
    return window.GameUIViews.party.overview(partyViewContext());
  }
  function presetsPanel() {
    const slots = window.Presets.slots();
    return `<section class="panel preset-panel"><h3>編成プリセット</h3><p>隊列・装備・行動率をまとめて保存。選択中の第${window.Party.selected() + 1}パーティへ呼び出します。装備ロックは変更しません。</p><form id="preset-form" class="preset-form"><label for="preset-slot">保存枠<select id="preset-slot">${slots.map((preset, slot) => `<option value="${slot}">${slot + 1}：${preset ? escape(preset.name) : "未保存"}</option>`).join("")}</select></label><label for="preset-name">名前<input id="preset-name" required maxlength="24" placeholder="洞窟攻略用など"></label><button type="submit" class="button secondary" ${window.Party.expedition() || !window.Party.members().length ? "disabled" : ""}>現在の編成を保存</button></form><div class="commission-grid">${slots.map((preset, slot) => {
      if (!preset) return `<article class="commission-card"><strong>${slot + 1}：未保存</strong></article>`;
      const check = window.Presets.check(slot);
      const members = preset.members.map((entry, position) => {
        const character = window.Characters.get(entry.characterId);
        const equipment = entry.equipment.map(id => {
          const item = window.Items.getInstance(id);
          return !id ? "未装備" : item ? window.Items.displayName(item) : `${id}（失われた装備）`;
        }).join("／") || "未装備";
        const rates = entry.actionRates || { attack: 40, technique: 25, spell: 20, healing: 15 };
        return `<li>${position + 1}：${escape(character?.name || entry.characterId)}<small>${escape(equipment)}<br>攻${rates.attack}%・技${rates.technique}%・呪${rates.spell}%・回${rates.healing}%</small></li>`;
      }).join("");
      return `<article class="commission-card"><h4>${slot + 1}：${escape(preset.name)}</h4><ul class="preset-members">${members}</ul><p class="small-note">${escape(check.message)}</p><div class="save-actions"><button class="button secondary" data-action="request-preset" data-kind="apply" data-slot="${slot}" ${check.ok ? "" : "disabled"}>呼び出す</button><button class="button ghost" data-action="request-preset" data-kind="delete" data-slot="${slot}">削除</button></div></article>`;
    }).join("")}</div></section>`;
  }
  function openPresetConfirmation(type, payload) {
    pendingPresetAction = { type, payload };
    const action = type === "preset.save" ? "上書き保存" : type === "preset.apply" ? "呼び出し" : "削除";
    const message = type === "preset.apply" ? "選択中のパーティの隊列と、保存された仲間の装備・行動率を置き換えます。外れる仲間の装備はそのまま残ります。" : type === "preset.save" ? "この枠の保存内容を現在の編成で置き換えます。" : "保存内容だけを削除します。冒険者・装備・現在の編成は削除しません。";
    document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="preset-confirm-title"><h3 id="preset-confirm-title">保存枠${payload.slot + 1}を${action}しますか？</h3><p>${message}</p><div class="modal-actions"><button class="button ghost" data-action="close-modal">戻る</button><button class="button primary" data-action="confirm-preset">${action}</button></div></div></div>`;
  }
  function partyPage() {
    if (partyScreen === "overview") return `<div class="party-route party-route-overview">${partyOverview()}</div>`;
    const index = window.Party.selected(), view = partyViews[index];
    const unreadResult = window.Party.result(index) && window.Party.result(index).viewed !== true;
    const links = [["formation", "メンバー編成"], ["adventure", window.Party.expedition(index) ? "探索ログ" : "出撃先指定"], ["results", `直近ログ${unreadResult ? "・新着" : ""}`]];
    const titles = { formation: "メンバー編成", adventure: window.Party.expedition(index) ? "探索ログ" : "出撃先を指定", results: "直近の探索結果" };
    const body = view === "adventure" ? adventureContent() : view === "results" ? partyReportPanel() : formationPage();
    const status = window.Party.expedition(index) ? "探索中" : `${window.Party.members(index).length}/${window.Party.memberLimit()}人`;
    const header = window.GameUIViews.navigation.routeHeader({ backAction: "party-back", backLabel: "パーティ一覧", kicker: `PARTY ${index + 1}`, title: `${window.Party.name(index)} — ${titles[view]}`, status });
    return `<div class="party-route party-route-detail">${header}<nav class="party-workflow" aria-label="パーティの操作">${links.map(([id, label]) => `<button type="button" class="button ${view === id ? "primary" : "ghost"}" data-action="party-view" data-view="${id}" ${view === id ? 'aria-current="page"' : ""}>${label}</button>`).join("")}</nav><div class="party-workspace">${body}</div></div>`;
  }

  function selectedFormationCharacter() {
    const characters = window.GameState.data.characters;
    let selected = window.Characters.get(selectedPartyCharacterId);
    if (!selected) selected = window.Party.members()[0] || characters[0] || null;
    selectedPartyCharacterId = selected?.id || null;
    return selected;
  }

  function formationInspector(character, selected, busy, elsewhere, full) {
    if (!character) return `<section class="panel character-inspector">${empty("冒険者がいません", "募集要項を出して仲間を雇用してください。")}</section>`;
    const stat = window.Characters.stats(character);
    const rates = window.Characters.actionRates(character);
    const active = selected.has(character.id);
    const reason = elsewhere ? "別パーティに所属中" : busy ? "探索中は編成変更不可" : full ? "パーティは満員です" : active ? "パーティから外す" : "このパーティに加える";
    const gear = character.equipment.map(window.Items.getInstance).filter(Boolean).map(instance => {
      const template = window.Items.template(instance.templateId), effect = window.Items.effects(instance);
      const typeName = template.type === "weapon" ? window.GameData.weaponTypes[template.weaponType] : window.GameData.armorTypes[template.armorType];
      return `<div class="inspector-gear-row"><span><strong>${escape(window.Items.displayName(instance))}</strong><small>${escape(typeName || "装備")} · 攻${effect.attack} 防${effect.defense} · 重${effect.weight}</small></span><button class="button ghost" data-action="unequip" data-character="${character.id}" data-instance="${instance.id}">外す</button></div>`;
    }).join("");
    const rateFields = [["attack", "攻撃"], ["technique", "技"], ["spell", "呪文"], ["healing", "回復"]].map(([key, label]) => `<label>${label}<input type="number" min="0" max="100" inputmode="numeric" name="${key}" value="${rates[key]}"><span>%</span></label>`).join("");
    return `<section class="panel character-inspector"><div class="inspector-head">${portraitEditButton(character)}<div><span class="label">SELECTED ADVENTURER</span><h3>${escape(character.name)}</h3><p>${escape(window.Characters.jobName(character))} · Lv.${character.level}</p></div><span class="badge ${active ? "good" : ""}">${active ? "編成中" : "待機中"}</span></div><div class="inspector-stats"><span>HP <strong>${stat.hp}</strong></span><span>攻撃 <strong>${stat.attack}</strong></span><span>防御 <strong>${stat.defense}</strong></span><span>攻撃回数 <strong>${stat.attackCount}</strong></span><span>命中精度 <strong>${Math.round(stat.hitRate * 100)}%</strong></span><span>速度 <strong>${stat.speed}</strong></span></div><button class="button ${active ? "ghost" : "primary"} full" data-action="toggle-party" data-character="${character.id}" ${busy || elsewhere || (!active && full) ? "disabled" : ""}>${escape(reason)}</button><section class="inspector-section"><div class="section-heading"><div><h4>装備</h4><small>${character.equipment.length}点 · 重量 ${window.Characters.equipmentWeight(character)}/${window.Characters.maxWeight(character)}</small></div><button class="button secondary" data-action="open-equipment" data-character="${character.id}">装備を変更</button></div><div class="inspector-gear-list">${gear || '<p class="empty-line">未装備</p>'}</div></section><section class="inspector-section"><h4>行動率</h4><form class="action-rate-form" data-character="${character.id}">${rateFields}<button class="button secondary" type="submit">保存</button></form><p class="policy-help">回復 → 呪文 → 技 → 攻撃の順で個別に判定し、すべて外れた場合は防御します。合計値の制限はありません。</p></section></section>`;
  }

  function acquisitionNumber(value, digits) {
    return Number(value).toFixed(digits == null ? 2 : digits).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
  }

  function acquisitionEffectText(effect) {
    const labels = {
      gold: "取得金額",
      experience: effect.scope === "self" ? "本人経験値" : "パーティ経験値",
      qualityRate: "上位品質付与率",
      itemRate: "アイテム獲得率",
      explorationTime: "探索時間"
    };
    const label = labels[effect.metric] || effect.metric;
    if (effect.operation === "multiplier") return `${label} ×${acquisitionNumber(effect.value)}`;
    if (["qualityRate", "itemRate"].includes(effect.metric)) return `${label} ${effect.value >= 0 ? "+" : ""}${acquisitionNumber(effect.value * 100, 1)}pt`;
    return `${label} ${effect.value >= 0 ? "+" : ""}${acquisitionNumber(effect.value, 0)}${effect.metric === "gold" ? "G" : ""}`;
  }

  function acquisitionModifierText(label, modifier, suffix) {
    const parts = [];
    if (modifier.multiplier !== 1) parts.push(`×${acquisitionNumber(modifier.multiplier)}`);
    if (modifier.flat) parts.push(`${modifier.flat > 0 ? "+" : ""}${acquisitionNumber(modifier.flat, suffix === "G" ? 0 : 1)}${suffix || ""}`);
    return parts.length ? `${label} ${parts.join(" ")}` : "";
  }

  function acquisitionSkillsPanel(members, compact) {
    if (!window.AcquisitionSkills) return "";
    const sources = members.map(member => ({
      id: member.id,
      skillIds: window.Characters.learnedSkills(member).map(skill => skill.id)
    }));
    const breakdown = window.AcquisitionSkills.breakdown(sources);
    const codeDefinitions = window.AccessCodes ? window.AccessCodes.redeemedDefinitions() : [];
    const bonuses = window.AccessCodes ? window.AccessCodes.applyAcquisitionBonuses(breakdown.bonuses) : breakdown.bonuses;
    bonuses.explorationTime.multiplier *= window.AccessCodes ? window.AccessCodes.explorationDurationMultiplier() : 1;
    const names = Object.fromEntries(members.map(member => [member.id, member.name]));
    const summary = [
      acquisitionModifierText("取得金額", bonuses.gold, "G"),
      acquisitionModifierText("パーティ経験値", bonuses.experience.party),
      acquisitionModifierText("上位品質付与率", bonuses.qualityRate),
      acquisitionModifierText("アイテム獲得率", bonuses.itemRate),
      acquisitionModifierText("探索時間", bonuses.explorationTime)
    ];
    Object.entries(bonuses.experience.members).forEach(([id, modifier]) => {
      summary.push(acquisitionModifierText(`${names[id] || "本人"}の経験値`, modifier));
    });
    const summaryHtml = summary.filter(Boolean).map(value => `<span class="acquisition-chip">${escape(value)}</span>`).join("");
    const skillRows = breakdown.entries.map(entry => {
      const skill = window.GameData.skills[entry.skillId];
      const ownerNames = entry.ownerIds.map(id => names[id] || "不明");
      const application = entry.scope === "self"
        ? `${ownerNames[0]}本人に適用`
        : entry.ownerIds.length > 1 ? `${ownerNames.join("・")}が所持／同一スキルは1回適用` : `${ownerNames[0]}から適用`;
      return `<li class="acquisition-skill-row"><div><strong>${escape(skill?.name || entry.skillId)}</strong><span>${entry.effects.map(acquisitionEffectText).map(escape).join("・")}</span></div><small>${escape(application)}</small></li>`;
    }).join("");
    const acquisitionCodeDefinitions = codeDefinitions.filter(definition => definition.effects.some(effect => ["acquisitionModifier", "explorationDurationMultiplier"].includes(effect.type)));
    const codeRows = acquisitionCodeDefinitions.map(definition => `<li class="acquisition-skill-row"><div><strong>${escape(definition.name)}</strong><span>${escape(definition.description)}</span></div><small>機能コードから適用</small></li>`).join("");
    const rows = skillRows + codeRows;
    return `<section class="panel acquisition-panel ${compact ? "is-compact" : ""}"><div class="section-heading"><div><span class="label">ACQUISITION EFFECTS</span><h3>獲得・探索補正</h3></div><span class="badge">${breakdown.entries.length + acquisitionCodeDefinitions.length}件</span></div>${summaryHtml ? `<div class="acquisition-summary">${summaryHtml}</div>` : '<p class="empty-line">現在適用される獲得・探索補正はありません。</p>'}${rows ? `<ul class="acquisition-skill-list">${rows}</ul>` : ""}<p class="small-note">同じパーティ効果は同一スキル名ごとに1回だけ、異なるスキルと機能コードは重ねて適用されます。</p></section>`;
  }

  function formationPage() {
    const members = window.Party.members(), selected = new Set(window.Party.ids()), busy = Boolean(window.Party.expedition());
    const selectedIndex = window.Party.selected();
    const otherIds = window.GameState.data.parties.flatMap((party, index) => index === selectedIndex ? [] : party);
    const otherExploring = window.GameState.data.expeditions.flatMap((expedition, index) => index === selectedIndex || !expedition ? [] : expedition.partyIds);
    const limit = window.Party.memberLimit(), characters = window.GameState.data.characters;
    const selectedCharacter = selectedFormationCharacter();
    const selectedElsewhere = selectedCharacter ? otherIds.includes(selectedCharacter.id) || otherExploring.includes(selectedCharacter.id) : false;
    const normalizedQuery = rosterView.query.trim().toLocaleLowerCase("ja");
    let roster = characters.filter(character => {
      const elsewhere = otherIds.includes(character.id) || otherExploring.includes(character.id);
      const scopeMatches = rosterView.scope === "all" || (rosterView.scope === "party" ? selected.has(character.id) : !elsewhere && !selected.has(character.id));
      return scopeMatches && (rosterView.job === "all" || character.jobId === rosterView.job)
        && (!normalizedQuery || character.name.toLocaleLowerCase("ja").includes(normalizedQuery) || window.Characters.jobName(character).toLocaleLowerCase("ja").includes(normalizedQuery)
          || (window.GameData.races[character.raceId]?.name || "").toLocaleLowerCase("ja").includes(normalizedQuery));
    }).sort((a, b) => rosterView.sort === "name" ? a.name.localeCompare(b.name, "ja") : rosterView.sort === "newest" ? b.createdAt - a.createdAt : b.level - a.level || a.name.localeCompare(b.name, "ja"));
    const pageSize = 20, pages = Math.max(1, Math.ceil(roster.length / pageSize));
    rosterView.page = Math.min(rosterView.page, pages - 1);
    const rosterRows = roster.slice(rosterView.page * pageSize, (rosterView.page + 1) * pageSize).map(character => {
      const stat = window.Characters.stats(character), active = selected.has(character.id);
      const elsewhere = otherIds.includes(character.id) || otherExploring.includes(character.id);
      const blocked = busy || elsewhere || (!active && members.length >= limit);
      const raceName = window.GameData.races[character.raceId]?.name || character.raceId;
      const currentWeight = window.Characters.equipmentWeight(character), maxWeight = window.Characters.maxWeight(character);
      const nearWeightLimit = maxWeight > 0 && currentWeight / maxWeight >= .9;
      return `<div class="roster-row ${character.id === selectedCharacter?.id ? "is-current" : ""} ${active ? "is-party-member" : ""}"><button class="roster-select" data-action="open-equipment" data-character="${character.id}"><span class="roster-position">${active ? window.Party.ids().indexOf(character.id) + 1 : "—"}</span>${portraitImage(character, true)}<span class="roster-name"><strong>${escape(character.name)}</strong><small>${escape(window.Characters.jobName(character))} · ${escape(raceName)} · Lv.${character.level}</small></span><span class="roster-quick-stats"><span>HP <strong>${stat.hp}</strong></span><span class="${nearWeightLimit ? "is-near-limit" : ""}">重量 <strong>${currentWeight}/${maxWeight}</strong></span></span><span class="badge ${active ? "good" : ""}">${elsewhere ? "別隊" : active ? "編成中" : members.length >= limit ? "人数上限" : "待機"}</span></button><button class="roster-quick-action ${active ? "remove" : "add"}" data-action="toggle-party" data-character="${character.id}" aria-label="${escape(character.name)}を${active ? "編成から外す" : "編成に加える"}" ${blocked ? "disabled" : ""}>${active ? "−" : "+"}</button></div>`;
    }).join("");
    const slots = Array.from({ length: limit }, (_, position) => {
      const member = members[position];
      if (!member) return `<div class="formation-slot-card is-empty"><span class="slot-number">${position + 1}</span><div><strong>空き枠</strong><small>${window.Party.positionName(position, Math.max(3, members.length || 1))}</small></div></div>`;
      const stat = window.Characters.stats(member), raceName = window.GameData.races[member.raceId]?.name || member.raceId;
      const currentWeight = window.Characters.equipmentWeight(member), maxWeight = window.Characters.maxWeight(member);
      const nearWeightLimit = maxWeight > 0 && currentWeight / maxWeight >= .9;
      return `<div class="formation-slot-card ${member.id === selectedCharacter?.id ? "is-current" : ""}"><span class="slot-number">${position + 1}</span><button class="slot-character" data-action="open-equipment" data-character="${member.id}">${portraitImage(member, true)}<span><strong>${escape(member.name)}</strong><small>${escape(window.Characters.jobName(member))} · ${escape(raceName)} · Lv.${member.level}</small><small class="slot-vitals ${nearWeightLimit ? "is-near-limit" : ""}">HP ${stat.hp} · 重量 ${currentWeight}/${maxWeight}</small></span></button><div class="formation-actions"><button class="formation-equip" data-action="open-equipment" data-character="${member.id}" aria-label="${escape(member.name)}の装備を変更">詳細</button><button data-action="move-party" data-character="${member.id}" data-direction="-1" aria-label="${escape(member.name)}を前へ" ${busy || position === 0 ? "disabled" : ""}>↑</button><button data-action="move-party" data-character="${member.id}" data-direction="1" aria-label="${escape(member.name)}を後ろへ" ${busy || position === members.length - 1 ? "disabled" : ""}>↓</button></div></div>`;
    }).join("");
    const jobOptions = Object.values(window.GameData.jobs).map(job => `<option value="${job.id}" ${rosterView.job === job.id ? "selected" : ""}>${escape(job.name)}</option>`).join("");
    return `<section class="panel formation-board"><div class="section-heading"><div><span class="label">PARTY LINEUP</span><h3>メンバー編成</h3></div><div class="formation-total"><strong>${members.length}/${limit}人</strong><span>戦力 ${Math.round(window.Party.power())}</span></div></div><p class="small-note">上から前衛です。キャラクターを開くと、専用の装備画面へ進みます。</p><div class="formation-slot-grid">${slots}</div><button class="button primary formation-depart" data-action="party-view" data-view="adventure" ${!members.length || busy ? "disabled" : ""}>出撃先を指定する</button></section>${acquisitionSkillsPanel(members)}<div class="formation-manager"><section class="panel roster-browser"><div class="section-heading"><div><span class="label">GUILD ROSTER</span><h3>所属冒険者</h3></div><button class="button ghost" data-nav="characters">仲間を募集</button></div><form id="party-roster-form" class="roster-controls"><label>検索<input id="party-roster-query" value="${escape(rosterView.query)}" placeholder="名前・職業・種族"></label><label>所属<select data-roster-filter="scope"><option value="all">全員</option><option value="party" ${rosterView.scope === "party" ? "selected" : ""}>編成中</option><option value="available" ${rosterView.scope === "available" ? "selected" : ""}>待機中</option></select></label><label>職業<select data-roster-filter="job"><option value="all">全職業</option>${jobOptions}</select></label><label>順序<select data-roster-filter="sort"><option value="level">レベル順</option><option value="name" ${rosterView.sort === "name" ? "selected" : ""}>名前順</option><option value="newest" ${rosterView.sort === "newest" ? "selected" : ""}>加入順</option></select></label><button class="button secondary" type="submit">検索</button></form><div class="roster-list">${rosterRows || '<p class="empty-line">条件に合う冒険者はいません。</p>'}</div><nav class="pagination" aria-label="冒険者一覧のページ"><button class="button ghost" data-action="roster-page" data-page="${rosterView.page - 1}" ${rosterView.page === 0 ? "disabled" : ""}>前へ</button><span>${rosterView.page + 1} / ${pages}ページ · ${roster.length}人</span><button class="button ghost" data-action="roster-page" data-page="${rosterView.page + 1}" ${rosterView.page >= pages - 1 ? "disabled" : ""}>次へ</button></nav></section></div><details class="workflow-details" data-detail="presets"><summary>編成プリセットを保存・呼び出し</summary>${presetsPanel()}</details><details class="workflow-details"><summary>隊列とスキルのルール</summary><p>近接は後方、遠距離は前方で攻撃力が下がります。併用時は両方の補正を乗算します。技・呪文・回復は各種類で使用後10ターン待機し、戦闘ごとにリセットします。</p></details>`;
  }
  function departureSummary() {
    const members = window.Party.members();
    return `<section class="panel departure-summary"><div class="section-heading"><div><span class="label">DEPARTURE PARTY</span><h3>${escape(window.Party.name())} · ${members.length}/${window.Party.memberLimit()}人</h3></div><button class="button ghost" data-action="party-view" data-view="formation">編成・装備を見直す</button></div><ol class="departure-members">${members.map((member, position) => `<li>${portraitEditButton(member)}<span><strong>${escape(member.name)}</strong><small>${window.Party.positionName(position, Math.max(3, members.length))} · Lv.${member.level} · ${escape(window.Characters.jobName(member))}</small></span></li>`).join("")}</ol><p class="small-note">上記の隊列・装備で出撃します。出撃後の変更は次回から反映されます。総合戦力 ${Math.round(window.Party.power())}</p></section>${acquisitionSkillsPanel(members, true)}`;
  }

  function adventureContent() {
    return window.GameUIViews.party.adventure(partyViewContext());
  }

  function dungeonCards() {
    return window.GameUIViews.party.dungeonCards(partyViewContext());
  }

  function shopStatValue(value, suffix) {
    const number = Number(value || 0);
    return number === 0 ? "—" : `${number > 0 ? "+" : ""}${number}${suffix || ""}`;
  }

  function equipmentStatEntries(item) {
    return [
      ["HP", item.hp, shopStatValue(item.hp)],
      ["物攻", item.attack, shopStatValue(item.attack)],
      ["物防", item.defense, shopStatValue(item.defense)],
      ["魔攻", item.magicAttack, shopStatValue(item.magicAttack)],
      ["魔防", item.magicDefense, shopStatValue(item.magicDefense)],
      ["魔回復", item.magicHealing, shopStatValue(item.magicHealing)],
      ["命中", item.hitRate, shopStatValue(Math.round(Number(item.hitRate || 0) * 100), "pt")],
      ["回避", item.evasionRate, shopStatValue(Math.round(Number(item.evasionRate || 0) * 100), "pt")],
      ["速度", item.speed, shopStatValue(item.speed)],
      ["攻撃回数", item.attackCount, shopStatValue(item.attackCount)],
      ["重量", item.weight, String(Number(item.weight || 0))]
    ].filter(([, rawValue]) => Number(rawValue || 0) !== 0);
  }

  function equipmentStatCells(item) {
    return equipmentStatEntries(item).map(([label, , value]) => `<span class="shop-stat-cell"><small>${label}</small><strong>${value}</strong></span>`).join("");
  }

  function shopEquipmentStats(item) {
    const skills = (item.skillIds || []).map(id => window.GameData.equipmentSkills[id]?.name).filter(Boolean).join("・");
    return `<div class="shop-stat-scroll" role="group" aria-label="${escape(item.name)}の有効なステータス"><div class="shop-stat-track">${equipmentStatCells(item)}</div></div><small class="equipment-skill-preview">固有スキル：${escape(skills || "なし")}</small>`;
  }

  function forgeEquipmentStats(item, skillText) {
    return `<span class="forge-stat-list" role="group" aria-label="${escape(item.name || "装備")}の有効なステータス">${equipmentStatCells(item)}</span>${skillText ? `<small class="forge-skill-preview">${escape(skillText)}</small>` : ""}`;
  }

  function itemCard(item, mode) {
    const purchasable = mode === "shop" || mode === "dailyShop";
    const range = item.type === "weapon" ? (item.range === "ranged" ? "遠距離" : "近接") : "";
    const primary = item.attack ? `攻 +${item.attack}` : item.defense ? `防 +${item.defense}` : "製作素材";
    const typeName = item.type === "weapon" ? window.GameData.weaponTypes[item.weaponType] : item.type === "armor" ? window.GameData.armorTypes[item.armorType] : "素材";
    const countText = item.attackCount ? ` · 攻撃回数 ${item.attackCount > 0 ? "+" : ""}${item.attackCount}` : "";
    const equipmentDetails = purchasable
      ? shopEquipmentStats(item)
      : `<p>${primary}${countText} · 重 ${item.weight}</p><details class="inline-item-detail"><summary>詳細性能</summary>${extraStats(item)}</details>`;
    const sold = Boolean(item.purchased), disabled = sold || window.GameState.data.gold < item.price;
    const action = mode === "dailyShop" ? `data-action="buy-daily" data-offer="${item.offerId}"` : `data-action="buy" data-item="${item.id}"`;
    return `<article class="item-card compact-item ${purchasable ? "shop-item-card" : ""} ${sold ? "sold-out" : ""}"><div class="item-icon">${item.icon}</div><div class="item-info"><span class="type-label">${item.type === "weapon" ? `${escape(typeName || "武器")} · ${range}` : item.type === "armor" ? escape(typeName || "防具") : "素材"}</span><h3>${escape(item.name)}</h3>${item.type === "material" ? `<p>${primary}</p>` : equipmentDetails}</div>${purchasable ? `<div class="item-action"><strong>${formatGold(item.price)}</strong><button class="button secondary" ${action} ${disabled ? "disabled" : ""}>${sold ? "売切" : "購入"}</button></div>` : `<strong class="quantity">× ${window.Items.count(item.id)}</strong>`}</article>`;
  }

  function inventoryEquipmentCard(group) {
    const instances = group.instances;
    const instance = instances.find(candidate => !window.Items.equippedBy(candidate.id) && !candidate.locked)
      || instances.find(candidate => !window.Items.equippedBy(candidate.id)) || instances[0];
    const base = window.Items.template(instance.templateId);
    const grade = window.Items.quality(instance);
    const effect = window.Items.effects(instance);
    const owners = instances.map(candidate => window.Items.equippedBy(candidate.id)).filter(Boolean);
    const locked = instances.filter(candidate => candidate.locked).length;
    const free = instances.length - owners.length;
    const typeName = base.type === "weapon" ? window.GameData.weaponTypes[base.weaponType] : window.GameData.armorTypes[base.armorType];
    const range = base.type === "weapon" ? (base.range === "ranged" ? "遠距離" : "近接") : "";
    const classification = [typeName, range, `品質：${grade.prefix || "標準"}`].filter(Boolean).join(" · ");
    const individualRows = instances.map((candidate, index) => {
      const owner = window.Items.equippedBy(candidate.id);
      const salvage = window.Items.salvageYield(candidate).map(entry => `${itemName(entry.itemId)}×${entry.quantity}`).join("、");
      return `<div class="equipment-instance-row"><span><strong>個体 ${index + 1}</strong><small>${owner ? `${escape(owner.name)}が装備中` : candidate.locked ? "ロック中" : "未装備"} · ${escape(candidate.id)}</small></span><button class="button ghost" data-action="toggle-item-lock" data-instance="${candidate.id}" aria-pressed="${Boolean(candidate.locked)}">${candidate.locked ? "🔒" : "ロック"}</button><button class="button ghost" data-action="request-dismantle" data-instance="${candidate.id}" title="${escape(salvage)}" ${owner || candidate.locked ? "disabled" : ""}>分解</button><button class="button secondary" data-action="request-sell" data-instance="${candidate.id}" ${owner || candidate.locked ? "disabled" : ""}>${formatGold(window.Items.sellValue(candidate))}</button></div>`;
    }).join("");
    const stateText = [owners.length ? `装備中 ${owners.length}` : "", locked ? `ロック ${locked}` : "", free ? `未装備 ${free}` : ""].filter(Boolean).join(" · ");
    const quote = window.AutoSell.stackQuote(group.key);
    const autoSellRule = window.AutoSell.ruleForStack(group.key);
    const autoSellAction = autoSellRule
      ? `<button class="button ghost" data-action="remove-auto-sell-rule" data-rule="${autoSellRule.id}">自動売却を解除</button>`
      : `<button class="button ghost" data-action="add-auto-sell-rule" data-instance="${instance.id}" ${base.unique ? "disabled" : ""}>${base.unique ? "固有品は登録不可" : "同じ性能を自動売却"}</button>`;
    const bulkSale = `<div class="stack-bulk-sale"><span>未装備・ロックなし ${quote.count}点</span><div>${autoSellAction}<button class="button secondary" data-action="request-sell-stack" data-stack="${encodeURIComponent(group.key)}" ${quote.count ? "" : "disabled"}>まとめて売る ${formatGold(quote.gold)}</button></div></div>`;
    return `<details class="owned-equipment equipment-stack compact-record quality-border-${grade.color} ${locked === instances.length ? "is-locked" : ""}" data-detail="equipment-stack-${encodeURIComponent(group.key)}"><summary class="record-summary"><span class="item-icon">${base.icon}</span><span class="record-name"><span class="quality-label quality-${grade.color}">${escape(classification)}</span><strong>${escape(window.Items.displayName(instance))}</strong><small>${stateText}</small></span><strong class="equipment-stack-count">×${instances.length}</strong><span class="record-stats"><b>HP +${effect.hp}</b><b>攻 +${effect.attack}</b><b>防 +${effect.defense}</b><b>重 ${effect.weight}</b></span><span class="record-chevron" aria-hidden="true">›</span></summary><div class="record-detail"><details class="inventory-item-performance"><summary>共通性能・追加効果</summary>${inventoryEquipmentStatChips(effect)}${equipmentSkillBadges(instance)}<p class="affix-line">${effectModifierText(instance) || "追加性能なし"}</p></details>${bulkSale}<section class="equipment-instance-list"><h4>個体を選ぶ</h4>${individualRows}</section></div></details>`;
  }

  function inventoryEquipmentStatChips(effect) {
    const signed = value => `${value > 0 ? "+" : ""}${value || 0}`;
    const fields = [
      ["HP", signed(effect.hp)], ["物理攻撃", signed(effect.attack)], ["魔法攻撃", signed(effect.magicAttack)],
      ["物理防御", signed(effect.defense)], ["魔法防御", signed(effect.magicDefense)], ["魔法回復", signed(effect.magicHealing)],
      ["命中精度", `${Math.round((effect.hitRate || 0) * 100)}%`], ["回避", `${Math.round((effect.evasionRate || 0) * 100)}%`],
      ["速度", signed(effect.speed)], ["攻撃回数", effect.attackCount || 0], ["重量", effect.weight || 0]
    ];
    return `<div class="equipment-stat-chips">${fields.map(([label, value]) => `<span><small>${label}</small><strong>${value}</strong></span>`).join("")}</div>`;
  }

  function autoSellPanel() {
    const config = window.AutoSell.state();
    const rules = config.rules.length ? config.rules.map(rule => `<li><span>${escape(rule.displayName)}<small>品質・強化・追加性能・超レア称号が完全一致</small></span><button class="button ghost" data-action="remove-auto-sell-rule" data-rule="${rule.id}">解除</button></li>`).join("") : `<li class="empty-line">登録された装備はありません。下の装備グループを開いて登録できます。</li>`;
    return `<details class="auto-sell-panel"><summary><span><strong>探索ドロップの自動売却</strong><small>${config.enabled ? `有効 · ${config.rules.length}種` : "無効"}</small></span><span class="record-chevron" aria-hidden="true">›</span></summary><div class="auto-sell-body"><label class="auto-sell-toggle"><input type="checkbox" data-auto-sell-enabled ${config.enabled ? "checked" : ""}><span><strong>自動売却を有効にする</strong><small>登録した装備と完全に同じ性能の探索ドロップだけを売却します。</small></span></label><p class="small-note">装備グループを開き「同じ性能を自動売却」で登録します。登録数に上限はありません。商店購入品・鍛冶製作品・ボス固有品・すでに所持している装備には適用しません。</p><ul class="auto-sell-rules">${rules}</ul></div></details>`;
  }

  function shopPage() {
    return window.GameUIViews.catalog.shop(catalogViewContext());
  }

  function inventoryPage() {
    const equipment = window.Items.queryEquipment(inventoryView);
    const equipmentGroups = window.Items.groupEquipment(equipment);
    const total = window.Items.equipmentList().length;
    const pageSize = 24, pages = Math.max(1, Math.ceil(equipmentGroups.length / pageSize));
    inventoryView.page = Math.min(inventoryView.page, pages - 1);
    const visibleEquipment = equipmentGroups.slice(inventoryView.page * pageSize, (inventoryView.page + 1) * pageSize);
    const materialItems = Object.values(window.GameData.items).filter((item) => item.type === "material" && window.Items.count(item.id));
    const qualityLegend = Object.values(window.GameData.qualities).filter((grade) => grade.id !== "standard").map((grade) => `<span class="quality-label quality-${grade.color}">${grade.prefix}</span>`).join("");
    return `<div class="page-intro inventory-intro"><div><p>品質・強化・追加性能・超レア称号が同じ装備は数量表示でまとめます。グループを開くと個体ごとに操作できます。</p><div class="quality-legend">${qualityLegend}</div></div><span class="muted-text">装備中・ロック中の品は売却・分解できません</span></div><div class="inventory-groups"><section class="panel"><div class="section-heading"><div><span class="label">EQUIPMENT</span><h3>装備品</h3></div><strong>${equipment.length}点 · ${equipmentGroups.length}種 / 全${total}点</strong></div>${autoSellPanel()}${inventoryControls()}<p class="compact-list-guide">同じ性能の装備はまとめて表示します。行を押すと性能・自動売却・個体一覧を確認できます。</p>${equipment.length ? `<div class="owned-equipment-grid">${visibleEquipment.map(inventoryEquipmentCard).join("")}</div><nav class="pagination" aria-label="装備品のページ"><button class="button ghost" data-action="inventory-page" data-page="${inventoryView.page - 1}" ${inventoryView.page === 0 ? "disabled" : ""}>前へ</button><span>${inventoryView.page + 1} / ${pages}ページ · ${equipmentGroups.length}種（${equipment.length}点）</span><button class="button ghost" data-action="inventory-page" data-page="${inventoryView.page + 1}" ${inventoryView.page >= pages - 1 ? "disabled" : ""}>次へ</button></nav>` : `<p class="empty-line">${total ? "条件に一致する装備がありません。絞り込みを解除してください。" : "装備品を所持していません"}</p>`}</section><section class="panel"><div class="section-heading"><div><span class="label">MATERIALS</span><h3>素材</h3></div><strong>${materialItems.reduce((sum, item) => sum + window.Items.count(item.id), 0)} 点</strong></div>${materialItems.length ? `<div class="item-list compact">${materialItems.map((item) => itemCard(item, "inventory")).join("")}</div>` : `<p class="empty-line">素材を所持していません</p>`}</section></div>`;
  }

  function inventoryControls() {
    const field = (key, label, entries) => `<label for="inventory-${key}">${label}<select id="inventory-${key}" data-inventory-filter="${key}">${entries.map(([id, name]) => `<option value="${id}" ${inventoryView[key] === id ? "selected" : ""}>${escape(name)}</option>`).join("")}</select></label>`;
    const types = [["all", "すべて"], ["unique", "ボス固有装備"], ["weapon", "武器すべて"], ...Object.entries(window.GameData.weaponTypes).map(([id, name]) => [`weapon:${id}`, name]), ["armor", "防具すべて"], ...Object.entries(window.GameData.armorTypes).map(([id, name]) => [`armor:${id}`, name])];
    return `<div class="inventory-controls">${field("kind", "装備種別", types)}${field("quality", "品質", [["all", "すべて"], ...Object.values(window.GameData.qualities).map(entry => [entry.id, entry.prefix || "標準"])])}${field("equipped", "装備状態", [["all", "すべて"], ["equipped", "装備中"], ["free", "未装備"]])}${field("lock", "ロック", [["all", "すべて"], ["locked", "ロック中"], ["unlocked", "ロックなし"]])}${field("sort", "並べ替え", [["newest", "新しい順"], ["oldest", "古い順"], ["name", "名前順"], ["quality", "品質順"], ["attack", "攻撃力が高い順"], ["defense", "防御力が高い順"], ["hp", "HPが高い順"], ["weight", "軽い順"], ["value", "売却価格が高い順"]])}<button class="button ghost" data-action="reset-inventory-filters">絞り込みを解除</button></div><p class="inventory-sort-note">能力順は装備単体の性能で比較します（キャラの適性補正は含みません）。</p>`;
  }

  function upgradesPanel() {
    return window.GameUIViews.catalog.upgrades(catalogViewContext());
  }

  function catalogViewContext() {
    return { escape, forgeEquipmentStats, formatGold, itemCard, itemName, blacksmithView, upgradeView };
  }

  function blacksmithPage() {
    const context = catalogViewContext();
    if (blacksmithScreen === "menu") return window.GameUIViews.catalog.blacksmithMenu(context);
    const title = blacksmithScreen === "upgrade" ? "装備を強化する" : "装備を製作する";
    const content = blacksmithScreen === "upgrade" ? upgradesPanel() : window.GameUIViews.catalog.blacksmith(context);
    return `<div class="blacksmith-subnav"><button class="button ghost" type="button" data-action="blacksmith-back">‹ 鍛冶メニュー</button><div><span class="label">BLACKSMITH</span><h3>${title}</h3></div></div>${content}`;
  }

  const renderers = { home: homePage, archives: archivePage, guild: guildPage, settings: settingsPage, characters: charactersPage, party: partyPage, shop: shopPage, blacksmith: blacksmithPage, inventory: inventoryPage };

  function archiveNoticeCounts() {
    const observations = window.ObservationJournal.unread().length;
    const rewards = window.Commissions.readyCount() + window.RecurringMissions.readyCount();
    const discoveries = window.Encyclopedia.unreadItems().length + window.Encyclopedia.unreadMonsters().length;
    return { observations, rewards, discoveries, total: observations + rewards + discoveries };
  }

  function openMobileNavigation() {
    const secondary = pages.filter(page => !mobilePrimaryPages.has(page[0]));
    const notices = archiveNoticeCounts();
    const facilities = window.Facilities.collectable().length;
    document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop mobile-nav-backdrop" data-action="close-modal"><div class="modal mobile-nav-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-nav-title"><div class="modal-heading"><div><span class="label">GUILD MENU</span><h3 id="mobile-nav-title">その他の施設</h3></div><button class="modal-close" data-action="close-modal" aria-label="メニューを閉じる">×</button></div><div class="mobile-nav-grid">${secondary.map(page => `<button type="button" class="mobile-nav-link ${page[0] === currentPage ? "active" : ""}" data-action="mobile-nav" data-page="${page[0]}"><span aria-hidden="true">${page[1]}</span><strong>${escape(page[2])}</strong><small>${escape(page[3])}</small>${page[0] === "archives" && notices.total ? `<i class="nav-notice archive" aria-label="受取可能な依頼${notices.rewards}件、観察日記の新着${notices.observations}件、図鑑の新発見${notices.discoveries}件">${notices.total}</i>` : page[0] === "guild" && facilities ? `<i class="nav-notice facility" aria-label="回収できる施設${facilities}件">${facilities}</i>` : ""}</button>`).join("")}</div><p class="mobile-nav-guide">ホーム・冒険者・パーティ・所持品は、画面下部からいつでも開けます。</p></div></div>`;
  }

  function renderNav() {
    const nav = document.getElementById("main-nav");
    const notices = archiveNoticeCounts();
    facilityNoticeCount = window.Facilities.collectable().length;
    const unreadPartyResults = window.Party.unreadResultCount();
    const secondaryTotal = notices.total + facilityNoticeCount;
    nav.innerHTML = pages.map((page) => `<button class="nav-button ${mobilePrimaryPages.has(page[0]) ? "mobile-primary" : "mobile-secondary"} ${page[0] === currentPage ? "active" : ""}" type="button" data-page="${page[0]}"><span aria-hidden="true">${page[1]}</span><strong data-short-label="${escape(page[4] || page[2])}">${page[2]}</strong>${page[0] === "party" && unreadPartyResults ? `<i class="nav-notice party" aria-label="未読の探索結果${unreadPartyResults}件">${unreadPartyResults}</i>` : page[0] === "archives" && notices.total ? `<i class="nav-notice archive" aria-label="受取可能な依頼${notices.rewards}件、観察日記の新着${notices.observations}件、図鑑の新発見${notices.discoveries}件">${notices.total}</i>` : page[0] === "guild" && facilityNoticeCount ? `<i class="nav-notice facility" aria-label="回収できる施設${facilityNoticeCount}件">${facilityNoticeCount}</i>` : ""}</button>`).join("") + `<button class="nav-button mobile-menu-button ${mobilePrimaryPages.has(currentPage) ? "" : "active"}" type="button" aria-haspopup="dialog"><span aria-hidden="true">☰</span><strong>メニュー</strong>${secondaryTotal ? `<i class="nav-notice menu" aria-label="メニュー内のお知らせ${secondaryTotal}件">${secondaryTotal}</i>` : ""}</button>`;
    nav.querySelectorAll(".nav-button[data-page]").forEach((button) => button.addEventListener("click", () => {
      if (button.dataset.page === "party") partyScreen = "overview";
      if (button.dataset.page === "characters") { characterScreen = "overview"; selectedCharacterId = null; }
      navigate(button.dataset.page);
    }));
    nav.querySelector?.(".mobile-menu-button")?.addEventListener("click", openMobileNavigation);
  }

  function refreshGlobalStatus() {
    const now = new Date(window.GameRuntime.now());
    const clock = document.getElementById("status-clock");
    const gold = document.getElementById("status-gold");
    const seals = document.getElementById("status-seals");
    if (clock) {
      clock.textContent = now.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      clock.setAttribute?.("datetime", now.toISOString());
    }
    if (gold) gold.textContent = formatGold(window.GameState.data.gold);
    if (seals) seals.textContent = Number(window.Items.count("guild_seal")).toLocaleString("ja-JP");
  }

  function render() {
    renderNav();
    const state = window.GameState.data;
    const page = pages.find((entry) => entry[0] === currentPage) || pages[0];
    const openDetails = new Set(Array.from(document.querySelectorAll("details[data-detail][open]"), detail => detail.dataset.detail));
    document.getElementById("app").innerHTML = renderers[currentPage]();
    document.querySelectorAll("details[data-detail]").forEach(detail => { detail.open = openDetails.has(detail.dataset.detail); });
    document.getElementById("page-title").textContent = page[2];
    document.getElementById("page-kicker").textContent = page[3];
    document.getElementById("sidebar-gold").textContent = formatGold(state.gold);
    document.getElementById("topbar-gold").textContent = formatGold(state.gold);
    document.getElementById("topbar-characters").textContent = `${state.characters.length} 人`;
    const status = document.getElementById("topbar-status");
    status.textContent = window.Dungeon.activeCount() ? `${window.Dungeon.activeCount()}組が探索中` : "待機中";
    status.classList.toggle("active", Boolean(window.Dungeon.activeCount()));
    refreshGlobalStatus();
    document.querySelectorAll("[data-nav]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.nav)));
  }

  function renderPreservingViewport() {
    const mainArea = document.querySelector(".main-area");
    const scrollTop = mainArea?.scrollTop || 0;
    render();
    const refreshedMainArea = document.querySelector(".main-area");
    if (refreshedMainArea) refreshedMainArea.scrollTop = scrollTop;
  }

  function navigate(page) {
    window.RecruitmentReveal.cancel();
    if (page === "characters" && currentPage !== "characters") { characterScreen = "overview"; selectedCharacterId = null; }
    if (page === "blacksmith") blacksmithScreen = "menu";
    currentPage = renderers[page] ? page : "home";
    document.querySelectorAll(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.page === currentPage));
    document.querySelector(".mobile-menu-button")?.classList.toggle("active", !mobilePrimaryPages.has(currentPage));
    render();
    document.querySelector(".main-area").scrollTop = 0;
  }

  let tickPending = false, collectionError = false;
  function refreshActiveJournal(node) {
    const partyIndex = Number(node.dataset.activeJournal);
    const expedition = window.Party.expedition(partyIndex);
    if (!expedition) return;
    const journal = window.ExpeditionLog.active(expedition);
    if (node.dataset.journalRevision === journal.revision) return;
    const open = new Set(Array.from(node.querySelectorAll("details[open]"), detail => detail.dataset.detail));
    node.innerHTML = `<div class="section-heading"><div><span class="label">LIVE ADVENTURE LOG</span><h3>${escape(journal.dungeonName)}・探索の記録</h3></div><span class="badge good">このパーティは探索中</span></div>${journalContents(journal)}`;
    node.dataset.journalRevision = journal.revision;
    node.querySelectorAll("details[data-detail]").forEach(detail => { if (open.has(detail.dataset.detail)) detail.open = true; });
  }
  async function tick() {
    refreshGlobalStatus();
    if (window.Facilities.collectable().length !== facilityNoticeCount) renderNav();
    if (tickPending) return;
    tickPending = true;
    const response = await window.GameClient.execute("expedition.collect");
    tickPending = false;
    if (!response.ok) {
      if (!collectionError) toast(response.message, "error");
      collectionError = true;
      return;
    }
    collectionError = false;
    const completed = response.result;
    if (completed || response.recurringChanged) {
      if (completed) {
        const journalNotice = completed.newObservationIds?.length ? ` 観察日記に新しい記録が${completed.newObservationIds.length}頁加わりました。` : "";
        toast((completed.success ? "探索隊が帰還しました！" : "探索隊が帰還しました。") + journalNotice, completed.success ? "success" : "error");
      }
      renderPreservingViewport();
      return;
    }
    document.querySelectorAll("[data-countdown]").forEach(node => { node.textContent = time(window.Dungeon.remaining(Number(node.dataset.countdown))); });
    document.querySelectorAll("[data-active-journal]").forEach(refreshActiveJournal);
    const facilityPanel = document.getElementById("facilities-panel");
    if (facilityPanel) {
      let refresh = false;
      facilityPanel.querySelectorAll("[data-facility-card]").forEach(node => {
        const quote = window.Facilities.quote(node.dataset.facilityCard);
        if (Number(node.dataset.ticks) !== quote.ticks) refresh = true;
        node.querySelector("[data-facility-next]").textContent = quote.full ? "満杯：受け取るまで生産停止" : "次の生産まで " + time(quote.remaining);
      });
      if (refresh) facilityPanel.innerHTML = facilitiesPanel();
    }
    document.querySelectorAll("[data-expedition]").forEach(node => {
      const expedition = window.Party.expedition(Number(node.dataset.expedition));
      const progress = node.querySelector(".progress i");
      const percent = node.querySelector("[data-overview-percent]");
      if (percent && expedition) percent.textContent = Math.floor(Math.min(100, Math.max(0, (window.GameRuntime.now() - expedition.startedAt) / (expedition.endsAt - expedition.startedAt) * 100)));
      if (progress && expedition) progress.style.width = `${Math.min(100, Math.max(0, (window.GameRuntime.now() - expedition.startedAt) / (expedition.endsAt - expedition.startedAt) * 100))}%`;
    });
  }

  function openItemActionModal(instanceId, actionType) {
    const instance = window.Items.getInstance(instanceId);
    if (!instance) return;
    if (instance.locked || window.Items.equippedBy(instanceId)) { toast("装備中・ロック中の品は売却・分解できません。", "error"); return; }
    const selling = actionType === "sell";
    const detail = selling
      ? `${formatGold(window.Items.sellValue(instance))}を受け取ります。`
      : `${window.Items.salvageYield(instance).map((entry) => `${itemName(entry.itemId)}×${entry.quantity}`).join("、")}を受け取ります。`;
    document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="item-action-title"><div class="modal-icon">${selling ? "G" : "⚒"}</div><h3 id="item-action-title">${escape(window.Items.displayName(instance))}を${selling ? "売却" : "分解"}しますか？</h3><p>${detail}<br>この操作で装備品は失われます。</p><div class="modal-actions"><button class="button ghost" data-action="close-modal">キャンセル</button><button class="button ${selling ? "primary" : "danger"}" data-action="confirm-item-action" data-kind="${actionType}" data-instance="${instanceId}">${selling ? "売却する" : "分解する"}</button></div></div></div>`;
  }

  async function handleClick(event) {
    if (event.target.closest("[data-portrait-character]")?.dataset.portraitCharacter) return;
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    // Inner dialog content must not inherit the backdrop close action.
    if (button.classList.contains("modal-backdrop") && event.target.closest(".modal")) return;
    const action = button.dataset.action;
    if (action === "portrait-page") {
      window.GameUIViews.portraits.stepPicker(button.closest("#portrait-form"), Number(button.dataset.direction));
      return;
    }
    if (action === "mobile-nav") {
      document.getElementById("modal-root").innerHTML = "";
      navigate(button.dataset.page);
      return;
    }
    if (action === "recruitment-reveal") { window.RecruitmentReveal.advance(); return; }
    if (action === "quick-hire-applicant") { openQuickHireConfirmation(button.dataset.applicant); return; }
    if (action === "confirm-quick-hire") {
      button.disabled = true;
      const hired = await window.GameClient.execute("recruitment.hire", { applicantId: button.dataset.applicant });
      if (!hired.ok) { button.disabled = false; toast(hired.message, "error"); return; }
      document.getElementById("modal-root").innerHTML = "";
      navigate("characters");
      toast(hired.message, "success");
      return;
    }
    if (action === "archive-view") {
      if (!["commissions", "observations", "origins", "items", "monsters"].includes(button.dataset.view)) return;
      if (["items", "monsters"].includes(button.dataset.view)) await window.GameClient.execute("encyclopedia.read", { kind: button.dataset.view });
      archiveView = button.dataset.view; render(); return;
    }
    if (action === "observation-read") {
      const result = await window.GameClient.execute("observation.read", { noteId: button.dataset.note });
      if (!result.ok) { toast(result.message, "error"); return; }
      const card = button.closest?.(".observation-note");
      if (card) {
        card.classList.remove("is-new");
        button.querySelector?.(".observation-new-badge")?.remove();
      } else render();
      renderNav();
      return;
    }
    if (action === "open-observations") {
      archiveView = "observations";
      navigate("archives");
      return;
    }
    if (action === "open-item-codex") {
      await window.GameClient.execute("encyclopedia.read", { kind: "items" });
      archiveView = "items";
      navigate("archives");
      return;
    }
    if (action === "party-open") {
      const index = Number(button.dataset.party), view = button.dataset.view;
      if (!["formation", "adventure", "results"].includes(view)) return;
      const result = await window.GameClient.execute("party.select", { partyIndex: index });
      if (!result.ok) { toast(result.message, "error"); return; }
      if (view === "results") {
        const read = await window.GameClient.execute("party.readResult", { partyIndex: index });
        if (!read.ok) { toast(read.message, "error"); return; }
      }
      partyOverviewScrollTop = document.querySelector(".main-area")?.scrollTop || 0;
      partyViews[index] = view; partyScreen = "detail"; selectedPartyCharacterId = null;
      navigate("party"); return;
    }
    if (action === "unlock-party") {
      const unlocked = await window.GameClient.execute("party.unlock", { partySlot: Number(button.dataset.party) + 1 });
      toast(unlocked.message, unlocked.ok ? "success" : "error");
      render(); return;
    }
    if (action === "party-back") {
      partyScreen = "overview"; selectedPartyCharacterId = null; render();
      document.querySelector(".main-area").scrollTop = partyOverviewScrollTop;
      return;
    }
    if (action === "rename-party") {
      const partyIndex = Number(button.dataset.party);
      if (!Number.isInteger(partyIndex) || partyIndex < 0 || partyIndex >= window.Party.limit()) return;
      document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" data-action="close-modal"><form id="party-name-form" class="modal" data-party="${partyIndex}" role="dialog" aria-modal="true" aria-labelledby="party-name-title"><h3 id="party-name-title">第${partyIndex + 1}パーティの名前を変更</h3><label for="party-name-input">名前<input id="party-name-input" name="name" maxlength="20" required value="${escape(window.Party.name(partyIndex))}" autocomplete="off"></label><p class="small-note">一覧、探索ログ、帰還記録で共通して表示されます。</p><div class="modal-actions"><button class="button ghost" type="button" data-action="close-modal">戻る</button><button class="button primary" type="submit">変更する</button></div></form></div>`;
      return;
    }
    if (action === "party-view") {
      if (!["formation", "adventure", "results"].includes(button.dataset.view)) return;
      if (button.dataset.view === "results" && window.Party.result()) {
        const read = await window.GameClient.execute("party.readResult", { partyIndex: window.Party.selected() });
        if (!read.ok) { toast(read.message, "error"); return; }
      }
      partyViews[window.Party.selected()] = button.dataset.view;
      partyScreen = "detail";
      navigate("party"); return;
    }
    if (action === "select-dungeon") {
      const dungeon = window.GameData.dungeons[button.dataset.dungeon];
      if (!dungeon || !window.Story.canEnter(dungeon.id) || window.Party.expedition()) return;
      const index = window.Party.selected(), choices = explorationChoices[index];
      const saved = await window.GameClient.execute("party.setPlan", { partyIndex: index, dungeonId: dungeon.id, difficultyId: choices[`${dungeon.id}:difficulty`] || "normal", timeMultiplier: Number(choices[dungeon.id] || 1) });
      if (!saved.ok) { toast(saved.message, "error"); return; }
      choices.dungeonId = dungeon.id;
      choices.chapterId = dungeon.chapterId;
      render(); return;
    }
    if (action === "select-dungeon-difficulty") {
      const dungeonId = button.dataset.dungeon, difficultyId = button.dataset.difficulty;
      if (window.Party.expedition() || !window.DungeonDifficulty.unlocked(dungeonId, difficultyId)) return;
      const index = window.Party.selected(), choices = explorationChoices[index];
      const saved = await window.GameClient.execute("party.setPlan", { partyIndex: index, dungeonId, difficultyId, timeMultiplier: Number(choices[dungeonId] || 1) });
      if (!saved.ok) { toast(saved.message, "error"); return; }
      choices[`${dungeonId}:difficulty`] = difficultyId;
      choices.dungeonId = dungeonId;
      choices.chapterId = window.GameData.dungeons[dungeonId].chapterId;
      render(); return;
    }
    if (action === "select-dungeon-chapter") {
      const chapterId = button.dataset.chapter;
      if (!window.GameData.storyChapters.some(chapter => chapter.id === chapterId) || !window.Story.chapterDungeons(chapterId).length) return;
      explorationChoices[window.Party.selected()].chapterId = chapterId;
      render(); return;
    }
    if (action === "depart-ready-parties") {
      const mainArea = document.querySelector(".main-area"), previousScrollTop = mainArea?.scrollTop || 0;
      const ready = Array.from({ length: window.Party.limit() }, (_, index) => index).filter(index => !window.Party.expedition(index) && window.Party.members(index).length && window.Party.plan(index));
      if (!ready.length) { toast("出撃できる待機パーティがありません。", "error"); return; }
      button.disabled = true;
      let departed = 0, failed = 0;
      for (const index of ready) {
        const plan = window.Party.plan(index);
        const result = await window.GameClient.execute("expedition.start", { partyIndex: index, dungeonId: plan.dungeonId, difficultyId: plan.difficultyId, timeMultiplier: plan.timeMultiplier });
        if (result.ok) departed++; else failed++;
      }
      toast(`${departed}隊が出発しました${failed ? `（${failed}隊は出撃できませんでした）` : ""}。`, failed && !departed ? "error" : "success");
      render();
      const refreshedMainArea = document.querySelector(".main-area");
      if (refreshedMainArea) refreshedMainArea.scrollTop = previousScrollTop;
      return;
    }
    if (action === "quick-start-party") {
      const index = Number(button.dataset.party);
      const destination = selectedDungeon(index);
      if (!destination) { toast("出撃先を選択してください。", "error"); return; }
      const mainArea = document.querySelector(".main-area");
      const previousScrollTop = mainArea?.scrollTop || 0;
      button.disabled = true;
      const selectedParty = await window.GameClient.execute("party.select", { partyIndex: index });
      if (!selectedParty.ok) { button.disabled = false; toast(selectedParty.message, "error"); return; }
      const difficultyId = window.GameUIViews.party.selectedDifficultyId(partyViewContext(), index, destination.id);
      const started = await window.GameClient.execute("expedition.start", { dungeonId: destination.id, difficultyId, partyIndex: index, timeMultiplier: Number(explorationChoices[index][destination.id] || 1) });
      if (!started.ok) { button.disabled = false; toast(started.message, "error"); render(); return; }
      toast("探索隊が出発しました。", "success");
      render();
      const refreshedMainArea = document.querySelector(".main-area");
      if (refreshedMainArea) refreshedMainArea.scrollTop = previousScrollTop;
      return;
    }
    if (action === "select-party-character") { selectedPartyCharacterId = button.dataset.character; openEquipmentModal(button.dataset.character, true); return; }
    if (action === "roster-page") { rosterView.page = Math.max(0, Number(button.dataset.page) || 0); render(); return; }
    if (action === "character-page") { characterView.page = Math.max(0, Number(button.dataset.page) || 0); render(); return; }
    if (action === "open-character") {
      const character = window.Characters.get(button.dataset.character);
      if (!character) return;
      characterOverviewScrollTop = document.querySelector(".main-area")?.scrollTop || 0;
      selectedCharacterId = character.id; characterScreen = "detail"; render();
      document.querySelector(".main-area").scrollTop = 0;
      return;
    }
    if (action === "character-back") {
      characterScreen = "overview"; selectedCharacterId = null; render();
      document.querySelector(".main-area").scrollTop = characterOverviewScrollTop;
      return;
    }
    if (action === "inventory-page") { inventoryView.page = Math.max(0, Number(button.dataset.page) || 0); render(); return; }
    if (action === "request-sell-stack") {
      let key;
      try { key = decodeURIComponent(button.dataset.stack); } catch (_) { return; }
      const quote = window.AutoSell.stackQuote(key);
      if (!quote.count) { toast("まとめて売却できる未装備品がありません。", "error"); render(); return; }
      const sample = quote.instances[0];
      document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="stack-sale-title"><h3 id="stack-sale-title">${escape(window.Items.displayName(sample))}をまとめて売りますか？</h3><p>未装備・ロックなしの${quote.count}点を${formatGold(quote.gold)}で売却します。装備中またはロック中の個体は残ります。</p><div class="modal-actions"><button class="button ghost" data-action="close-modal">戻る</button><button class="button danger" data-action="confirm-sell-stack" data-stack="${encodeURIComponent(key)}">${quote.count}点を売却</button></div></div></div>`;
      return;
    }
    if (action === "confirm-sell-stack") {
      let key;
      try { key = decodeURIComponent(button.dataset.stack); } catch (_) { return; }
      button.disabled = true;
      const sold = await window.GameClient.execute("equipment.sellStack", { stackKey: key });
      if (sold.ok) document.getElementById("modal-root").innerHTML = "";
      toast(sold.message, sold.ok ? "success" : "error"); render(); return;
    }
    if (action === "remove-auto-sell-rule") {
      const removed = await window.GameClient.execute("autosell.remove", { ruleId: button.dataset.rule });
      toast(removed.message, removed.ok ? "success" : "error"); render(); return;
    }
    if (action === "add-auto-sell-rule") {
      const added = await window.GameClient.execute("autosell.add", { instanceId: button.dataset.instance });
      toast(added.message, added.ok ? "success" : "error"); render(); return;
    }
    if (action === "recipe-page") { blacksmithView.page = Math.max(0, Number(button.dataset.page) || 0); render(); return; }
    if (action === "upgrade-page") { upgradeView.page = Math.max(0, Number(button.dataset.page) || 0); render(); return; }
    if (action === "reset-upgrade-filters") { Object.assign(upgradeView, { query: "", kind: "all", status: "all", sort: "ready", page: 0 }); render(); return; }
    if (action === "blacksmith-open") {
      if (!['craft', 'upgrade'].includes(button.dataset.view)) return;
      blacksmithScreen = button.dataset.view; blacksmithView.page = 0; render();
      document.querySelector(".main-area").scrollTop = 0; return;
    }
    if (action === "blacksmith-back") {
      blacksmithScreen = "menu"; render(); document.querySelector(".main-area").scrollTop = 0; return;
    }
    if (action === "equipment-page") { equipmentPicker.page = Math.max(0, Number(button.dataset.page) || 0); renderEquipmentModal(); return; }
    if (action === "request-upgrade") {
      const quote = window.Upgrades.quote(button.dataset.instance);
      if (!quote.ok) { toast(quote.message, "error"); render(); return; }
      pendingUpgrade = { instanceId: quote.instanceId, expectedLevel: quote.level };
      const item = window.Items.getInstance(quote.instanceId);
      const costs = Object.entries(quote.materials).map(([id, quantity]) => `${itemName(id)}×${quantity}`).join("・");
      const magicPreview = extraStats(quote.after, quote.before);
      document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="upgrade-title"><h3 id="upgrade-title">${escape(window.Items.displayName(item))}を＋${quote.next}へ強化しますか？</h3><p>攻撃 ${quote.before.attack} → ${quote.after.attack} ／ 防御 ${quote.before.defense} → ${quote.after.defense} ／ HP ${quote.before.hp} → ${quote.after.hp}</p>${magicPreview}<p>${formatGold(quote.gold)}と${escape(costs)}を消費します。取り消し・素材の返却はできません。</p><div class="modal-actions"><button class="button ghost" data-action="close-modal">戻る</button><button class="button primary" data-action="confirm-upgrade">強化する</button></div></div></div>`;
      return;
    }
    if (action === "confirm-upgrade") {
      if (!pendingUpgrade) return;
      const payload = pendingUpgrade; pendingUpgrade = null; button.disabled = true;
      const result = await window.GameClient.execute("equipment.upgrade", payload);
      document.getElementById("modal-root").innerHTML = "";
      toast(result.message, result.ok ? "success" : "error"); render(); return;
    }
    if (action === "request-preset") {
      openPresetConfirmation(`preset.${button.dataset.kind}`, { slot: Number(button.dataset.slot), ...(button.dataset.kind === "apply" ? { partyIndex: window.Party.selected() } : {}) });
      return;
    }
    if (action === "confirm-preset") {
      if (!pendingPresetAction) return;
      const request = pendingPresetAction;
      pendingPresetAction = null;
      button.disabled = true;
      const result = await window.GameClient.execute(request.type, request.payload);
      document.getElementById("modal-root").innerHTML = "";
      toast(result.message, result.ok ? "success" : "error");
      render();
      return;
    }
    if (action === "claim-commission") {
      button.disabled = true;
      const result = await window.GameClient.execute("commission.claim", { commissionId: button.dataset.commission });
      toast(result.message, result.ok ? "success" : "error");
      render();
      return;
    }
    if (action === "claim-recurring-mission") {
      button.disabled = true;
      const result = await window.GameClient.execute("recurringMission.claim", { groupId: button.dataset.group, missionId: button.dataset.mission });
      toast(result.message, result.ok ? "success" : "error");
      render();
      return;
    }
    if (action === "claim-all-recurring-missions") {
      button.disabled = true;
      const result = await window.GameClient.execute("recurringMission.claimAll", { groupId: button.dataset.group });
      toast(result.message, result.ok ? "success" : "error");
      render();
      return;
    }
    if (action === "review-applicant") { openHireModal(button.dataset.applicant); return; }
    if (action === "request-class-change") { pendingClassChange = null; openClassChangeModal(button.dataset.character); return; }
    if (action === "choose-class-change") { openClassChangeConfirmation(button.dataset.character, button.dataset.job); return; }
    if (action === "confirm-class-change") {
      if (!pendingClassChange) return;
      const payload = pendingClassChange; pendingClassChange = null; button.disabled = true;
      const changed = await window.GameClient.execute("character.classChange", payload);
      if (changed.ok) document.getElementById("modal-root").innerHTML = "";
      toast(changed.message, changed.ok ? "success" : "error"); render(); return;
    }
    if (action === "request-dismiss-applicants") {
      const pending = window.Recruitment.state().pending;
      const quote = pending && window.Recruitment.postingQuote(pending.requirements);
      const spent = quote ? `${escape(itemName(quote.itemId))}×${quote.quantity}` : "募集素材";
      document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="dismiss-title"><h3 id="dismiss-title">応募者を全員見送りますか？</h3><p>今回の応募者は退出します。使用した${spent}は返却されません。再募集では新しい応募者が現れます。</p><div class="modal-actions"><button class="button ghost" data-action="close-modal">戻る</button><button class="button danger" data-action="confirm-dismiss-applicants">全員を見送る</button></div></div></div>`;
      return;
    }
    if (action === "confirm-dismiss-applicants") {
      const dismissed = await window.GameClient.execute("recruitment.dismiss");
      if (!dismissed.ok) { toast(dismissed.message, "error"); return; }
      document.getElementById("modal-root").innerHTML = ""; render(); toast(dismissed.message, "success"); return;
    }
    if (action === "reset-inventory-filters") { Object.assign(inventoryView, { kind: "all", quality: "all", equipped: "all", lock: "all", page: 0 }); render(); return; }
    if (action === "reset-blacksmith-filters") {
      Object.assign(blacksmithView, { query: "", category: "all", material: "all", status: "all", sort: "ready", page: 0 });
      render(); return;
    }
    if (action === "export-save" || action === "export-before-import") {
      try { window.SaveTransfer.download(action === "export-before-import"); toast("バックアップファイルの保存を開始しました。", "success"); }
      catch (error) { toast(error.message, "error"); }
      return;
    }
    if (action === "import-save") { document.getElementById("save-import-file").click(); return; }
    if (action === "confirm-import") {
      if (!pendingImport) return;
      const restored = await window.GameClient.execute("save.import", { state: pendingImport });
      if (!restored.ok) { toast(restored.message, "error"); return; }
      pendingImport = null;
      document.getElementById("modal-root").innerHTML = "";
      reloadExplorationChoices();
      navigate("settings");
      toast("セーブを読み込みました。探索の経過時間は引き続き計算されます。", "success");
      return;
    }
    if (action === "unequip" || action === "equip-instance") {
      const characterId = button.dataset.character;
      const instance = window.Items.getInstance(button.dataset.instance);
      const before = equipmentSnapshot(characterId);
      const result = await window.GameClient.execute(action === "unequip" ? "equipment.unequip" : "equipment.equip", { characterId, instanceId: button.dataset.instance });
      if (!result.ok) { toast(result.message, "error"); return; }
      const after = equipmentSnapshot(characterId);
      setEquipmentChangeNotice(`${action === "unequip" ? "解除" : "装備"}：${instance ? window.Items.displayName(instance) : "装備品"}`, before, after);
      render();
      const modalRoot = document.getElementById("modal-root");
      if (equipmentPicker.characterId === characterId && modalRoot.innerHTML) renderEquipmentModal({ preserveScroll: true });
      else dismissEquipmentChangeNotice();
      toast(result.message, "success");
      return;
    }
    let result;
    if (action === "toggle-item-lock") {
      const instance = window.Items.getInstance(button.dataset.instance);
      result = await window.GameClient.execute("equipment.lock", { instanceId: button.dataset.instance, locked: instance ? !instance.locked : true });
    }
    if (action === "buy-daily") result = await window.GameClient.execute("shop.daily.buy", { offerId: button.dataset.offer });
    if (action === "buy") result = await window.GameClient.execute("shop.buy", { itemId: button.dataset.item });
    if (action === "craft") result = await window.GameClient.execute("blacksmith.craft", { recipeId: button.dataset.recipe });
    if (action === "select-party") { selectedPartyCharacterId = null; result = await window.GameClient.execute("party.select", { partyIndex: Number(button.dataset.party) }); }
    if (action === "toggle-party") { selectedPartyCharacterId = button.dataset.character; result = await window.GameClient.execute("party.toggle", { characterId: button.dataset.character, partyIndex: window.Party.selected() }); }
    if (action === "move-party") result = await window.GameClient.execute("party.move", { characterId: button.dataset.character, direction: Number(button.dataset.direction), partyIndex: window.Party.selected() });
    if (action === "collect-facility") result = await window.GameClient.execute("facility.collect", { facilityId: button.dataset.facility });
    if (action === "collect-all-facilities") result = await window.GameClient.execute("facility.collectAll");
    if (action === "upgrade-facility") result = await window.GameClient.execute("facility.upgrade", { facilityId: button.dataset.facility, trackId: button.dataset.track });
    if (action === "open-equipment") { selectedPartyCharacterId = button.dataset.character; openEquipmentModal(button.dataset.character, currentPage === "party"); return; }
    if (action === "request-sell") { openItemActionModal(button.dataset.instance, "sell"); return; }
    if (action === "request-dismantle") { openItemActionModal(button.dataset.instance, "dismantle"); return; }
    if (action === "confirm-item-action") {
      result = await window.GameClient.execute(button.dataset.kind === "sell" ? "equipment.sell" : "equipment.dismantle", { instanceId: button.dataset.instance });
      if (result.ok) document.getElementById("modal-root").innerHTML = "";
    }
    if (action === "reset-save") {
      document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="reset-title"><div class="modal-icon">!</div><h3 id="reset-title">セーブデータを初期化しますか？</h3><p>冒険者、装備、探索結果を含むすべての進行状況が失われます。</p><div class="modal-actions"><button class="button ghost" data-action="close-modal">キャンセル</button><button class="button danger" data-action="confirm-reset">初期化する</button></div></div></div>`;
      return;
    }
    if (action === "close-modal") { pendingImport = null; pendingClassChange = null; importRequest += 1; equipmentReturnToParty = false; dismissEquipmentChangeNotice(); document.getElementById("modal-root").innerHTML = ""; return; }
    if (action === "confirm-reset") { const reset = await window.GameClient.execute("save.reset"); if (!reset.ok) { toast(reset.message, "error"); return; } document.getElementById("modal-root").innerHTML = ""; currentPage = "home"; partyScreen = "overview"; partyViews.fill("formation"); reloadExplorationChoices(); archiveView = "commissions"; blacksmithScreen = "menu"; Object.assign(blacksmithView, { query: "", category: "all", material: "all", status: "all", sort: "ready", page: 0 }); toast("セーブデータを初期化しました。"); renderNav(); render(); return; }
    if (result && !result.ok) toast(result.message, "error");
    else if (result && result.message) toast(result.message, "success");
    render();
  }

  let recruitmentBusy = false;
  async function handleSubmit(event) {
    if (event.target.id === "party-name-form") {
      event.preventDefault();
      const result = await window.GameClient.execute("party.rename", { partyIndex: Number(event.target.dataset.party), name: event.target.elements.name.value });
      toast(result.message, result.ok ? "success" : "error");
      if (result.ok) document.getElementById("modal-root").innerHTML = "";
      render();
      return;
    }
    if (event.target.classList?.contains("access-code-form")) {
      event.preventDefault();
      const form = event.target, button = form.querySelector('button[type="submit"]');
      if (button.disabled) return;
      button.disabled = true;
      const result = await window.GameClient.execute("accessCode.redeem", { featureId: form.dataset.feature, code: form.elements.code.value });
      toast(result.message, result.ok ? "success" : "error");
      render();
      return;
    }
    if (event.target.classList?.contains("action-rate-form")) {
      event.preventDefault();
      const form = event.target;
      const rates = Object.fromEntries(["attack", "technique", "spell", "healing"].map(key => [key, Number(form.elements[key].value)]));
      const result = await window.GameClient.execute("character.actionRates", { characterId: form.dataset.character, rates });
      toast(result.message || (result.ok ? "行動率を保存しました。" : "保存できませんでした。"), result.ok ? "success" : "error");
      if (document.getElementById("modal-root").innerHTML && equipmentPicker.characterId === form.dataset.character) renderEquipmentModal(); else render();
      return;
    }
    if (event.target.id === "blacksmith-search-form") {
      event.preventDefault();
      blacksmithView.query = document.getElementById("blacksmith-query").value.trim().slice(0, 60);
      blacksmithView.page = 0; render(); return;
    }
    if (event.target.id === "upgrade-search-form") {
      event.preventDefault();
      upgradeView.query = document.getElementById("upgrade-query").value.trim().slice(0, 60);
      upgradeView.page = 0; render(); return;
    }
    if (event.target.id === "character-directory-form") {
      event.preventDefault();
      characterView.query = document.getElementById("character-directory-query").value.trim().slice(0, 40);
      characterView.page = 0; render(); return;
    }
    if (event.target.id === "party-roster-form") {
      event.preventDefault();
      rosterView.query = document.getElementById("party-roster-query").value.trim().slice(0, 40);
      rosterView.page = 0; render(); return;
    }
    if (event.target.id === "equipment-picker-form") {
      event.preventDefault();
      equipmentPicker.query = document.getElementById("equipment-picker-query").value.trim().slice(0, 60);
      equipmentPicker.page = 0; renderEquipmentModal(); return;
    }
    if (event.target.id === "portrait-form") {
      event.preventDefault();
      const form = event.target, button = form.querySelector('button[type="submit"]');
      if (button.disabled) return;
      button.disabled = true;
      const selected = form.querySelector('input[name="character-portrait"]:checked');
      const result = await window.GameClient.execute("character.portrait", { characterId: form.dataset.character, portraitId: selected?.value });
      if (result.ok) { document.getElementById("modal-root").innerHTML = ""; render(); }
      else button.disabled = false;
      toast(result.message, result.ok ? "success" : "error"); return;
    }
    if (event.target.id === "preset-form") {
      event.preventDefault();
      const payload = { slot: Number(document.getElementById("preset-slot").value), name: document.getElementById("preset-name").value, partyIndex: window.Party.selected() };
      if (window.Presets.slots()[payload.slot]) { openPresetConfirmation("preset.save", payload); return; }
      const button = event.target.querySelector('button[type="submit"]');
      button.disabled = true;
      const result = await window.GameClient.execute("preset.save", payload);
      toast(result.message, result.ok ? "success" : "error");
      render();
      return;
    }
    if (!["recruitment-form", "hire-form"].includes(event.target.id)) return;
    event.preventDefault();
    if (recruitmentBusy) return;
    recruitmentBusy = true;
    const form = event.target, button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    try {
      const result = form.id === "recruitment-form"
        ? await window.GameClient.execute("recruitment.post", Object.fromEntries(window.GameData.recruitment.fields.map(field => [field.id, document.getElementById("recruit-" + field.id).value])))
        : await window.GameClient.execute("recruitment.hire", { applicantId: form.dataset.applicant, name: form.querySelector("#hire-name").value });
      if (result.ok && form.id === "hire-form") document.getElementById("modal-root").innerHTML = "";
      toast(result.message, result.ok ? "success" : "error");
      render();
      if (result.ok && form.id === "recruitment-form") showRecruitmentReveal();
    } finally { recruitmentBusy = false; if (button) button.disabled = false; }
  }

  function init() {
    window.PortraitPress.bind(document, openPortraitModal, () => currentPage === "party");
    renderNav();
    document.addEventListener("click", handleClick);
    document.addEventListener("submit", handleSubmit);
    document.addEventListener("input", (event) => {
      if (event.target.hasAttribute?.("data-portrait-query")) {
        window.GameUIViews.portraits.refreshPicker(event.target.closest("#portrait-form"), true);
        return;
      }
      if (!event.target.hasAttribute?.("data-action-rate-slider")) return;
      const form = event.target.closest?.(".action-rate-form");
      if (!form) return;
      const value = Math.max(0, Math.min(100, Number(event.target.value) || 0));
      event.target.value = value;
      event.target.setAttribute?.("aria-label", `${event.target.name === "attack" ? "攻撃" : event.target.name === "technique" ? "技" : event.target.name === "spell" ? "呪文" : "回復"}行動率 ${value}%`);
      const valueOutput = event.target.parentElement?.querySelector?.("[data-action-rate-value]");
      if (valueOutput) valueOutput.textContent = `${value}%`;
    });
    document.getElementById("save-import-file").addEventListener("change", async (event) => {
      const file = event.target.files[0];
      event.target.value = "";
      if (!file) return;
      const request = ++importRequest;
      pendingImport = null;
      try {
        if (file.size > window.SaveTransfer.MAX_BYTES) throw new Error("ファイルは2MB以下にしてください。");
        const parsed = window.SaveTransfer.parse(await file.text());
        if (request !== importRequest) return;
        if (!parsed.ok) throw new Error(parsed.message);
        pendingImport = parsed.state;
        const state = parsed.state;
        document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="import-title"><h3 id="import-title">このセーブを読み込みますか？</h3><p>${escape(file.name)}</p><p>所持金：${formatGold(state.gold)}<br>冒険者：${state.characters.length}人<br>装備：${state.inventory.equipment.length}個<br>選考中：${state.recruitment.pending ? state.recruitment.pending.candidates.length + "人の応募者" : "なし"}<br>保存日時：${escape(new Date(state.meta.updatedAt).toLocaleString("ja-JP"))}<br>探索：${state.expeditions.map((entry, index) => entry ? `第${index + 1}：${escape(window.DungeonDifficulty.variant(entry.dungeonId, entry.difficultyId || "normal").name)}` : "").filter(Boolean).join(" ／ ") || "待機中"}</p><p>現在の進行状況を置き換えます。置き換え前のデータは直前バックアップに保存します。期限を過ぎた探索は読み込み後に完了します。</p><div class="modal-actions"><button class="button ghost" data-action="close-modal">キャンセル</button><button class="button danger" data-action="confirm-import">置き換えて読み込む</button></div></div></div>`;
      } catch (error) { if (request === importRequest) toast(error.message, "error"); }
    });
    document.addEventListener("change", async (event) => {
      if (event.target.hasAttribute("data-portrait-type")) {
        window.GameUIViews.portraits.refreshPicker(event.target.closest("#portrait-form"), true);
        return;
      }
      if (event.target.hasAttribute("data-auto-sell-enabled")) {
        const changed = await window.GameClient.execute("autosell.toggle", { enabled: event.target.checked });
        toast(changed.message, changed.ok ? "success" : "error"); render(); return;
      }
      if (event.target.hasAttribute("data-recruitment-field")) {
        const requirements = Object.fromEntries(window.GameData.recruitment.fields.map(field => [field.id, document.getElementById("recruit-" + field.id).value]));
        const quote = window.Recruitment.postingQuote(requirements);
        const panel = document.getElementById("recruitment-post-cost"), preview = document.getElementById("recruitment-requirement-preview"), button = document.getElementById("recruitment-submit");
        if (quote && panel && button) {
          panel.querySelector("[data-recruitment-cost]").textContent = quote.quantity;
          panel.querySelector("[data-recruitment-owned]").textContent = quote.owned;
          panel.querySelector("[data-recruitment-after]").textContent = Math.max(0, quote.owned - quote.quantity);
          panel.querySelector("[data-recruitment-applicants]").textContent = `応募予定 ${quote.applicants[0]}〜${quote.applicants[1]}人`;
          panel.querySelector("[data-recruitment-selections]").textContent = quote.selections;
          if (preview) preview.innerHTML = recruitmentRequirementPreview(requirements);
          panel.classList.toggle("is-short", !quote.affordable);
          button.disabled = !quote.affordable;
          button.textContent = quote.affordable ? "募集を出して応募者を待つ" : `${itemName(quote.itemId)}が不足しています`;
        }
        return;
      }
      if (event.target.hasAttribute("data-roster-filter")) {
        rosterView[event.target.dataset.rosterFilter] = event.target.value;
        rosterView.page = 0; render(); return;
      }
      if (event.target.hasAttribute("data-character-filter")) {
        characterView[event.target.dataset.characterFilter] = event.target.value;
        characterView.page = 0; render(); return;
      }
      if (event.target.hasAttribute("data-equipment-filter")) {
        equipmentPicker[event.target.dataset.equipmentFilter] = event.target.value;
        equipmentPicker.page = 0; renderEquipmentModal(); return;
      }
      if (event.target.hasAttribute("data-exploration-dungeon")) {
        const multiplier = Number(event.target.value), id = event.target.dataset.explorationDungeon;
        if (window.Exploration.valid(multiplier) && window.GameData.dungeons[id]) {
          explorationChoices[window.Party.selected()][id] = multiplier;
          if (selectedDungeonId(window.Party.selected()) === id) {
            const index = window.Party.selected();
            const difficultyId = window.GameUIViews.party.selectedDifficultyId(partyViewContext(), index, id);
            const saved = await window.GameClient.execute("party.setPlan", { partyIndex: index, dungeonId: id, difficultyId, timeMultiplier: multiplier });
            if (!saved.ok) { toast(saved.message, "error"); return; }
            render();
          }
        }
        return;
      }
      if (event.target.hasAttribute("data-inventory-filter")) {
        inventoryView[event.target.dataset.inventoryFilter] = event.target.value;
        inventoryView.page = 0;
        render();
        document.getElementById(event.target.id).focus();
        return;
      }
      if (event.target.hasAttribute("data-blacksmith-filter")) {
        blacksmithView[event.target.dataset.blacksmithFilter] = event.target.value;
        blacksmithView.page = 0;
        render();
        return;
      }
      if (event.target.hasAttribute("data-upgrade-filter")) {
        upgradeView[event.target.dataset.upgradeFilter] = event.target.value;
        upgradeView.page = 0; render(); return;
      }
    });
    render();
    setInterval(tick, 500);
  }

  window.UI = { init, render, navigate, showError: message => toast(message, "error") };
})();

