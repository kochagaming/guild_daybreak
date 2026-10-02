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
  let archiveMonsterDungeonId = null;
  let archiveMonsterEncounters = {};
  let archiveReturnPartyIndex = null;
  const partyViews = Array.from({ length: window.Party.maximum() }, (_, index) => window.Party.expedition(index) ? "adventure" : "formation");
  let partyScreen = "overview";
  let partyOverviewScrollTop = 0;
  let partyOverviewFilter = "all";
  let presetSaveSlot = 0;
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
  let pendingUnequipAll = null;
  let importRequest = 0;
  const inventoryView = { kind: "all", quality: "all", equipped: "all", lock: "all", sort: "newest", page: 0, focusInstanceId: null, focusLabel: null };
  const blacksmithView = { query: "", category: "all", material: "all", status: "all", sort: "ready", page: 0, focusRecipeIds: [], focusContext: "", lastCraftedInstanceId: null };
  const upgradeView = { query: "", kind: "all", status: "all", sort: "ready", page: 0 };
  let blacksmithScreen = "menu";
  const characterView = { query: "", job: "all", sort: "level", page: 0 };
  let characterScreen = "overview";
  let selectedCharacterId = null;
  let characterOverviewScrollTop = 0;
  const rosterView = { query: "", job: "all", scope: "all", sort: "level", page: 0 };
  const equipmentPickerDefaults = { query: "", kind: "all", quality: "all", fit: "all", sort: "recommended", page: 0 };
  const equipmentPicker = { characterId: null, ...equipmentPickerDefaults, focusInstanceId: null, origin: null };
  const equipmentPickerViews = new Map();
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
  function actionRatePresets() {
    return `<div class="action-rate-presets" role="group" aria-label="行動率の入力補助"><span>かんたん入力</span>${window.GameData.combatRules.actionPresets.map(preset => `<button type="button" class="button ghost" data-action="action-rate-preset" data-preset="${preset.id}">${escape(preset.name)}</button>`).join("")}</div>`;
  }
  function actionRateProfile(character) {
    const rates = window.Characters.actionRates(character);
    const preset = window.GameData.combatRules.actionPresets.find(entry => Object.keys(entry.rates).every(key => entry.rates[key] === rates[key]));
    return preset ? preset.name : `回${rates.healing}・呪${rates.spell}・技${rates.technique}・攻${rates.attack}`;
  }
  function extraStats(stats, previous) {
    const fields = [["magicAttack", "魔法攻撃"], ["magicDefense", "魔法防御"], ["magicHealing", "魔法回復"]];
    return `<div class="bonus-chips">${fields.map(([key, label]) => `<span>${label} <strong>${stats[key] || 0}</strong>${previous ? statDiff((stats[key] || 0) - (previous[key] || 0)) : ""}</span>`).join("")}${stats.physicalPower == null ? "" : `<span>物理威力 <strong>${Math.round(stats.physicalPower * 100)}%</strong>${previous ? statDiff(Math.round((stats.physicalPower - (previous.physicalPower || 1)) * 100)) + "pt" : ""}</span><span>魔法威力 <strong>${Math.round(stats.magicPower * 100)}%</strong>${previous ? statDiff(Math.round((stats.magicPower - (previous.magicPower || 1)) * 100)) + "pt" : ""}</span>`}${stats.hitRate == null ? "" : `<span>命中精度 ${Math.round(stats.hitRate * 100)}%${previous ? statDiff(Math.round((stats.hitRate - (previous.hitRate || 0)) * 100)) + "pt" : ""}</span><span>回避 ${Math.round((stats.evasionRate || 0) * 100)}%${previous ? statDiff(Math.round(((stats.evasionRate || 0) - (previous.evasionRate || 0)) * 100)) + "pt" : ""}</span>`}${stats.speed == null ? "" : `<span>速度 ${stats.speed}${previous ? statDiff(stats.speed - (previous.speed || 0)) : ""}</span>`}${stats.attackCount == null ? "" : `<span>攻撃回数 <strong>${stats.attackCount}</strong>${previous ? statDiff(stats.attackCount - (previous.attackCount || 1)) : ""}</span>`}</div>`;
  }

  function battleLogEntries(entries) {
    const icons = { system: "✦", formation: "≡", encounter: "⚔", round: "—", hero: "›", skill: "✧", heal: "+", enemy: "‹", victory: "✓", defeat: "×", recovery: "+", warning: "!", burst: "⚡", weakness: "◇", status: "◈", arrival: "◆", explore: "…", story: "◇", treasure: "□", treasureGold: "G", treasureItem: "★", stairs: "↧" };
    return entries.map(entry => `<div class="battle-log-entry ${entry.kind}"><span class="battle-log-icon" aria-hidden="true">${icons[entry.kind] || "·"}</span><p>${escape(entry.text)}</p></div>`).join("");
  }

  function battleObservationSummary(entries, event) {
    const definitions = [
      ["大技", entry => ["warning", "burst"].includes(entry.kind)],
      ["弱点", entry => entry.kind === "weakness" || /弱点|攻撃の好機/.test(entry.text)],
      ["耐性", entry => /耐性|抵抗|防いだ/.test(entry.text)],
      ["状態異常", entry => entry.kind === "status"],
      ["命中・回避", entry => /命中せず|回避された|回命中/.test(entry.text)],
      ["会心", entry => /会心/.test(entry.text)]
    ];
    const rows = definitions.map(([label, matches]) => {
      const observations = Array.from(new Set(entries.filter(matches).map(entry => entry.text))).slice(0, 2);
      return observations.length ? `<li><b>${label}</b><span>${observations.map(escape).join(" ／ ")}</span></li>` : "";
    }).filter(Boolean);
    if (!rows.length) return "";
    const defeated = event.status === "撤退";
    return `<details class="battle-observation-summary" data-detail="journal-observations-${event.number}" ${defeated ? "open" : ""}><summary><strong>観測要点</strong><span>${rows.length}項目</span><i aria-hidden="true">›</i></summary><ul>${rows.join("")}</ul></details>`;
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
    const defeated = event.status === "撤退";
    const combat = `<details class="journey-entry journey-encounter ${event.complete ? "is-complete" : "is-current"} ${defeated ? "is-defeat" : ""}" data-detail="journal-encounter-${event.number}" ${!event.complete || defeated ? "open" : ""}><summary><span class="journey-marker">${event.number}</span><span><strong>${escape(event.title)}で敵と遭遇</strong><small>第${event.number}戦 · ${event.status}${event.complete ? "" : " · 戦況を更新中"}</small></span><span class="journey-status ${defeated ? "bad" : event.status === "勝利" ? "good" : ""}">${event.status}</span><span class="summary-chevron" aria-hidden="true">⌄</span></summary>${battleObservationSummary(battle, event)}<div class="battle-log-list">${battleLogEntries(battle)}</div></details>`;
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
    return `<section id="result-battle-records" class="exploration-journal completed-journal"><div class="section-heading"><div><span class="label">ADVENTURE LOG</span><h4>探索の記録</h4></div><span class="badge ${result.success ? "good" : "bad"}">${result.success ? "成功" : "撤退"}</span></div>${journalContents(journal)}</section>`;
  }

  function attemptComparisonPanel(result) {
    const partyIndex = Number.isInteger(result.partyIndex) ? result.partyIndex : window.Party.selected();
    const history = window.GameState.data.partyHistory?.[partyIndex] || [];
    const difficultyId = result.difficultyId || "normal", timeMultiplier = result.timeMultiplier || 1;
    const previous = history.find(entry => entry.id !== result.id && entry.dungeonId === result.dungeonId
      && (entry.difficultyId || "normal") === difficultyId && (entry.timeMultiplier || 1) === timeMultiplier && entry.battle);
    if (!previous) return "";
    const current = window.Dungeon.battleSummary(result), before = previous.battle;
    const number = value => Number(value || 0).toLocaleString("ja-JP");
    const hit = summary => `${number(summary.attackHits)}/${number(summary.attackAttempts)}${summary.attackAttempts ? `（${Math.round(summary.attackHits / summary.attackAttempts * 100)}%）` : ""}`;
    const rows = [
      ["到達戦", `${number(before.encountersCleared)}/${number(before.totalEncounters)}`, `${number(current.encountersCleared)}/${number(current.totalEncounters)}`],
      ["討伐", `${number(before.monstersDefeated)}体`, `${number(current.monstersDefeated)}体`],
      ["物理命中", hit(before), hit(current)],
      ["与ダメージ", number(before.damageDealt), number(current.damageDealt)],
      ["被ダメージ", number(before.damageTaken), number(current.damageTaken)],
      ["回復", number(before.healingDone), number(current.healingDone)],
      ["戦闘不能", `${number(before.knockouts)}人`, `${number(current.knockouts)}人`]
    ];
    return `<section class="attempt-comparison"><div><span class="label">PREVIOUS ATTEMPT</span><h4>同じ探索条件の前回記録</h4><p>前回と今回に起きた事実だけを並べています。</p></div><div class="attempt-comparison-grid">${rows.map(([label, oldValue, newValue]) => `<div class="attempt-comparison-row"><span>${label}</span><small>前回</small><strong>${oldValue}</strong><i aria-hidden="true">→</i><small>今回</small><strong>${newValue}</strong></div>`).join("")}</div></section>`;
  }

  function resultCard(result) {
    if (!result) return `<div class="notice muted"><span class="notice-icon">◇</span><div><strong>まだ探索記録はありません</strong><p>パーティを編成し、最初の探索へ送り出しましょう。</p></div></div>`;
    const dungeon = window.DungeonDifficulty.variant(result.dungeonId, result.difficultyId || "normal");
    const ultraRareDrops = result.drops.filter(drop => drop.ultraRareTitleId && window.GameData.ultraRareTitles[drop.ultraRareTitleId]);
    const drops = result.drops.length
      ? result.drops.map((drop) => {
        const retainedInstance = drop.instanceId ? window.Items.getInstance(drop.instanceId) : null;
        const classes = `loot-chip ${drop.qualityId || ""} ${drop.newDiscovery ? "is-new-discovery" : ""} ${drop.newBest ? "is-quality-best" : ""} ${drop.ultraRareTitleId ? "is-ultra-rare" : ""}`;
        const contents = `${drop.ultraRareTitleId ? '<b>ULTRA</b> ' : ""}${drop.newDiscovery ? '<b>NEW</b> ' : drop.newBest ? '<b>BEST</b> ' : ""}${window.GameData.items[drop.itemId].icon} ${escape(drop.displayName || itemName(drop.itemId))}${drop.quantity > 1 ? ` ×${drop.quantity}` : ""}`;
        return retainedInstance
          ? `<button class="${classes} is-openable" data-action="open-loot-instance" data-instance="${retainedInstance.id}" aria-label="${escape(drop.displayName || itemName(drop.itemId))}を所持品で確認">${contents}</button>`
          : `<span class="${classes}">${contents}</span>`;
      }).join("")
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
    const bestQualities = Array.isArray(result.newBestQualities) && result.newBestQualities.length
      ? `<section class="result-best-qualities"><span class="label">QUALITY RECORD</span><strong>過去最高の品質を${result.newBestQualities.length}種類更新しました</strong><p>${result.newBestQualities.map(entry => `${window.GameData.items[entry.itemId]?.icon || "◇"} ${escape((window.GameData.qualities[entry.qualityId]?.prefix || "標準") + itemName(entry.itemId))}`).join("　")}</p><button class="button ghost" data-action="open-item-codex">アイテム図鑑で確認</button></section>`
      : "";
    const newUltraRareTitleIds = new Set(result.newUltraRareTitleIds || []);
    const ultraRares = ultraRareDrops.length
      ? `<section class="result-ultra-rares"><span class="label">${newUltraRareTitleIds.size ? "NEW ULTRA RARE" : "ULTRA RARE"}</span><strong>名を持つ逸品を${ultraRareDrops.length}点発見しました${newUltraRareTitleIds.size ? `・新しい称号 ${newUltraRareTitleIds.size}種` : ""}</strong>${ultraRareDrops.map(drop => { const title = window.GameData.ultraRareTitles[drop.ultraRareTitleId]; const skill = window.GameData.equipmentSkills[title.skillId]; return `<article><span>${window.GameData.items[drop.itemId]?.icon || "✧"}</span><div><strong>${escape(drop.displayName || itemName(drop.itemId))}${drop.newUltraRareTitle ? "　NEW" : ""}</strong><small>全装備性能2倍・${escape(skill?.name || "固有技能")}</small></div></article>`; }).join("")}<button class="button ghost" data-action="open-item-codex">称号記録を確認</button></section>`
      : "";
    const newRecipes = Array.isArray(result.newRecipeIds) && result.newRecipeIds.length
      ? `<section class="result-new-discoveries"><span class="label">NEW RECIPES</span><strong>鍛冶屋に新しい製作記録が加わりました</strong><p>${result.newRecipeIds.map(id => window.GameData.recipes.find(recipe => recipe.id === id)).filter(Boolean).map(recipe => `${window.GameData.items[recipe.resultId]?.icon || "⚒"} ${escape(itemName(recipe.resultId))}`).join("　")}</p><button class="button ghost" data-action="open-new-recipes" data-recipes="${escape(result.newRecipeIds.join(","))}">鍛冶屋で確認</button></section>`
      : "";
    const firstClearReward = result.firstClearReward
      ? `<section class="result-first-clear"><span class="label">FIRST CLEAR</span><strong>${escape(window.DungeonDifficulty.tier(result.firstClearReward.difficultyId).name)}・初回踏破報酬</strong><p>${[result.firstClearReward.gold ? `所持金 +${formatGold(result.firstClearReward.gold)}` : "", ...result.firstClearReward.materials.map(entry => `${window.GameData.items[entry.itemId]?.icon || "◇"} ${escape(itemName(entry.itemId))}×${entry.quantity}`)].filter(Boolean).join("　")}</p></section>`
      : "";
    const trackedItem = result.trackedItemId ? window.GameData.items[result.trackedItemId] : null;
    const trackedRecipeIds = trackedItem ? window.GameData.recipes
      .filter(recipe => Object.prototype.hasOwnProperty.call(recipe.materials, trackedItem.id) && window.Blacksmith.status(recipe) !== "locked")
      .map(recipe => recipe.id) : [];
    const trackedComplete = Number.isInteger(result.trackedItemProgress) && result.trackedItemGoal && result.trackedItemProgress >= result.trackedItemGoal;
    const targetProgress = Number.isInteger(result.trackedItemProgress) && result.trackedItemGoal
      ? `<small>累計 ${result.trackedItemProgress} / ${result.trackedItemGoal}${trackedComplete ? "・目標達成" : ""}</small>`
      : `<small>探索目標は継続中です。図鑑から解除・変更できます。</small>`;
    const trackedRecipeAction = trackedRecipeIds.length
      ? `<button class="button ${trackedComplete ? "primary" : "ghost"}" data-action="open-target-recipes" data-recipes="${escape(trackedRecipeIds.join(","))}">${trackedComplete ? "集めた素材で製作へ" : "関連レシピを確認"}</button>`
      : "";
    const trackedAchievement = trackedItem && result.trackedItemQuantity > 0
      ? `<section class="result-tracked-achievement"><span class="label">EXPEDITION TARGET</span><strong>探索目標を発見しました</strong><p>${escape(trackedItem.icon || "◇")} ${escape(trackedItem.name)} ×${result.trackedItemQuantity}</p>${targetProgress}${trackedRecipeAction ? `<div class="result-tracked-actions">${trackedRecipeAction}</div>` : ""}</section>`
      : "";
    const failureEvidenceLinks = !result.success ? `<nav class="failure-evidence-links" aria-label="撤退記録の確認"><span>撤退の記録をたどる</span><button class="button ghost" data-action="jump-result-section" data-target="defeat-observations">観測された事実</button><button class="button ghost" data-action="jump-result-section" data-target="result-battle-records">該当戦闘ログ</button><button class="button secondary" data-action="open-result-monsters" data-dungeon="${result.dungeonId}">遭遇した敵の記録</button></nav>` : "";
    return `<article class="result-card ${result.success ? "success" : "failure"}">
      <div class="result-seal">${result.success ? "勝" : "退"}</div><div class="result-body">
      <div class="card-heading"><div><span class="label">最新の探索報告</span><h3>${escape(result.dungeonName || dungeon.name)} · ${result.timeMultiplier || 1}倍探索</h3></div><span class="badge ${result.success ? "good" : "bad"}">${result.success ? "探索成功" : "撤退"}</span></div>
      <p>${escape(result.partyNames.join("、"))}が帰還しました。</p>
      <div class="reward-line"><strong>+${formatGold(result.gold)}</strong>${experience}</div>
      <div class="loot-list">${drops}</div>${trackedAchievement}${ultraRares}${autoSales}${levels}${firstClearReward}${newItems}${bestQualities}${newRecipes}${newObservations}${storyMoments}${(result.storyCompleted || []).map(id => window.GameData.storyChapters.find(chapter => chapter.id === id)).filter(Boolean).map(chapter => `<div class="story-objective"><strong>${escape(chapter.title)}・達成</strong><p>解放・章報酬：${escape(chapter.unlockText)}</p></div>`).join("")}${attemptComparisonPanel(result)}${failureEvidenceLinks}${tacticalReportPanel(result)}${memberReportPanel(result)}${completedJournalPanel(result)}</div></article>`;
  }

  function tacticalReportPanel(result) {
    const traits = result.strategyReport;
    const traitSummary = traits ? `<div class="mechanic-report"><strong>攻略特性への対応</strong><p>全体攻撃 ${traits.areaHits}発 ／ 防御無視 ${traits.penetrationHits}発 ／ 魔法弱点 ${traits.magicWeaknessHits}発（実ダメージ ${traits.magicWeaknessDamage}）</p><p>後列狙い ${traits.rearHits}回 ／ 実被ダメージ ${traits.rearDamage} ／ 戦闘不能 ${traits.rearKnockouts}人</p><small>攻撃は命中した対象ごとに集計。同じ一撃が複数の項目に含まれます。回復量は下の冒険者別戦績で確認できます。</small></div>` : "";
    const report = result.mechanicReport;
    const summary = report && report.warnings ? `<div class="mechanic-report"><strong>大技への対応</strong><p>予告${report.warnings}回 ／ 大技${report.bursts}回 ／ 防御で軽減${report.guardedHits}人回 ／ 軽減なし${report.unguardedHits}人回 ／ 隙への攻撃${report.weaknessHits}発</p><small>防御の集計は大技の被弾ごと。隙への攻撃には追撃・多段も含みます。</small></div>` : "";
    const facts = !result.success && Array.isArray(result.defeatFacts) && result.defeatFacts.length
      ? `<section id="defeat-observations" class="defeat-hints"><h4>撤退時の観測記録</h4><ul>${result.defeatFacts.map(fact => `<li>${escape(fact)}</li>`).join("")}</ul></section>` : "";
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
    const result = window.GameState.data.partyResults[index];
    const expedition = window.Party.expedition(index);
    const reportIndexes = Array.from({ length: window.Party.limit() }, (_, partyIndex) => partyIndex).filter(partyIndex => window.Party.result(partyIndex));
    const reportPosition = Math.max(0, reportIndexes.indexOf(index));
    const previousReportIndex = reportPosition > 0 ? reportIndexes[reportPosition - 1] : null;
    const nextReportIndex = reportPosition < reportIndexes.length - 1 ? reportIndexes[reportPosition + 1] : null;
    const nextUnreadIndex = reportIndexes.find(partyIndex => partyIndex !== index && window.Party.result(partyIndex)?.viewed !== true);
    const unreadCount = reportIndexes.filter(partyIndex => window.Party.result(partyIndex)?.viewed !== true).length;
    const reportNavigation = reportIndexes.length > 1 ? `<nav class="report-party-navigation" aria-label="パーティ帰還報告の切り替え"><button class="button ghost" data-action="switch-party-result" data-party="${previousReportIndex ?? ""}" ${previousReportIndex == null ? "disabled" : ""}>‹ 前の隊</button><span>${reportPosition + 1} / ${reportIndexes.length}件${unreadCount ? ` · 未読${unreadCount}` : ""}</span>${nextUnreadIndex != null ? `<button class="button primary" data-action="switch-party-result" data-party="${nextUnreadIndex}">次の未読報告</button>` : `<button class="button ghost" data-action="switch-party-result" data-party="${nextReportIndex ?? ""}" ${nextReportIndex == null ? "disabled" : ""}>次の隊 ›</button>`}</nav>` : "";
    const previousRoute = result ? window.DungeonDifficulty.variant(result.dungeonId, result.difficultyId || "normal") : null;
    const repeatActions = result ? `<section class="report-repeat-departure ${expedition ? "is-active" : ""}"><div><span>${expedition ? "再探索中" : "直前の探索条件"}</span><strong>${escape(previousRoute?.name || result.dungeonName || "探索地")} · ${result.timeMultiplier || 1}倍探索</strong><small>${expedition ? "同じ条件で出発しました。進行中の記録を確認できます。" : "自動周回はせず、押した時だけ同じ条件で1回出発します。"}</small></div><div>${expedition ? '<button class="button primary" data-action="party-view" data-view="adventure">探索ログを見る</button>' : '<button class="button primary" data-action="repeat-expedition">同じ条件で再出撃</button>'}<button class="button ghost" data-action="party-view" data-view="formation" ${expedition ? "disabled" : ""}>編成を見直す</button><button class="button secondary" data-action="party-view" data-view="adventure" ${expedition ? "disabled" : ""}>出撃先を変更</button></div></section>` : '<button class="button secondary" data-action="party-view" data-view="adventure">出撃先を選ぶ</button>';
    return `<section class="panel party-report"><div class="section-heading"><div><span class="label">LATEST REPORT</span><h3>${escape(window.Party.name(index))}の直近の探索結果</h3></div></div>${reportNavigation}${resultCard(result)}${repeatActions}</section>`;
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
    return { archiveView, escape, formatGold, itemName, monsterDungeonId: archiveMonsterDungeonId, monsterEncounters: archiveMonsterEncounters, returnPartyIndex: archiveReturnPartyIndex };
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
    window.GameUIViews.equipment.render({ actionRatePresets, effectModifierText, empty, equipmentChangeNotice, equipmentPicker, equipmentReturnToParty, equipmentSkillBadges, escape, portraitEditButton });
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

  function rememberEquipmentPickerView() {
    if (!equipmentPicker.characterId || equipmentPicker.origin === "inventory") return;
    equipmentPickerViews.set(equipmentPicker.characterId, Object.fromEntries(Object.keys(equipmentPickerDefaults).map(key => [key, equipmentPicker[key]])));
  }

  function openEquipmentModal(characterId, returnToParty, focusInstanceId = null) {
    dismissEquipmentChangeNotice();
    equipmentReturnToParty = Boolean(returnToParty);
    if (equipmentPicker.characterId !== characterId) rememberEquipmentPickerView();
    if (focusInstanceId) {
      const instance = window.Items.getInstance(focusInstanceId);
      const base = instance ? window.Items.template(instance.templateId) : null;
      if (instance && base) Object.assign(equipmentPicker, { characterId, query: base.name, kind: `${base.type}:${base.weaponType || base.armorType}`, quality: instance.qualityId, fit: "all", sort: "recommended", page: 0, focusInstanceId: instance.id, origin: "inventory" });
    } else {
      if (equipmentPicker.characterId !== characterId || equipmentPicker.origin === "inventory") Object.assign(equipmentPicker, equipmentPickerDefaults, equipmentPickerViews.get(characterId) || {}, { characterId });
      equipmentPicker.focusInstanceId = null;
      equipmentPicker.origin = returnToParty ? "party" : "character";
    }
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
    return { activeJournalPanel, departureSummary, dungeonIntel, empty, escape, explorationChoices, formatGold, itemName, partyOverviewFilter, portraitImage, time };
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
    presetSaveSlot = Math.max(0, Math.min(slots.length - 1, presetSaveSlot));
    const initialPreset = slots[presetSaveSlot] || null;
    const records = slots.map((preset, slot) => {
      if (!preset) return `<div class="preset-record-empty"><span>${slot + 1}</span><strong>未保存</strong><small>この枠は空いています</small></div>`;
      const check = window.Presets.check(slot);
      const matchesCurrent = window.Presets.matches(slot);
      let totalEquipment = 0, totalWeight = 0;
      const members = preset.members.map((entry, position) => {
        const character = window.Characters.get(entry.characterId);
        const equipment = entry.equipment.map(id => {
          const item = window.Items.getInstance(id);
          if (item) { totalEquipment += 1; totalWeight += window.Items.effects(item).weight; }
          return !id ? "未装備" : item ? window.Items.displayName(item) : `${id}（失われた装備）`;
        }).join("／") || "未装備";
        const rates = entry.actionRates || window.GameData.combatRules.defaultActionRates;
        const memberWeight = entry.equipment.reduce((sum, id) => {
          const item = window.Items.getInstance(id);
          return sum + (item ? window.Items.effects(item).weight : 0);
        }, 0);
        return `<li><span><b>${position + 1}</b><strong>${escape(character?.name || entry.characterId)}</strong><small>装備${entry.equipment.length}点 · 重量${Math.round(memberWeight * 10) / 10}</small></span><small>回${rates.healing}・呪${rates.spell}・技${rates.technique}・攻${rates.attack}</small><p>${escape(equipment)}</p></li>`;
      }).join("");
      const savedAt = new Date(preset.savedAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
      return `<details class="preset-record"><summary><span class="preset-slot-number">${slot + 1}</span><span class="preset-record-name"><strong>${escape(preset.name)}</strong><small>${preset.members.length}人 · 装備${totalEquipment}点 · 重量${Math.round(totalWeight * 10) / 10} · ${escape(savedAt)}</small></span><span class="badge ${matchesCurrent ? "current" : check.ok ? "good" : "bad"}">${matchesCurrent ? "現在と同じ" : check.ok ? "呼出可" : "要確認"}</span><i aria-hidden="true">›</i></summary><div class="preset-record-detail"><ul class="preset-members">${members}</ul><p class="small-note">${escape(matchesCurrent ? "現在の隊列・装備・行動率と一致しています。" : check.message)}</p><div class="save-actions"><button class="button secondary" data-action="request-preset" data-kind="apply" data-slot="${slot}" ${check.ok && !matchesCurrent ? "" : "disabled"}>${matchesCurrent ? "適用済み" : "この編成を呼び出す"}</button><button class="button ghost" data-action="request-preset" data-kind="delete" data-slot="${slot}">削除</button></div></div></details>`;
    }).join("");
    return `<section class="panel preset-panel"><h3>編成プリセット</h3><p>隊列・装備・行動率をまとめて保存。選択中の第${window.Party.selected() + 1}パーティへ呼び出します。装備ロックは変更しません。</p><form id="preset-form" class="preset-form"><label for="preset-slot">保存枠<select id="preset-slot">${slots.map((preset, slot) => `<option value="${slot}" ${slot === presetSaveSlot ? "selected" : ""}>${slot + 1}：${preset ? escape(preset.name) : "未保存"}</option>`).join("")}</select></label><label for="preset-name">名前<input id="preset-name" required maxlength="24" placeholder="洞窟攻略用など" value="${initialPreset ? escape(initialPreset.name) : ""}"></label><button id="preset-save-button" type="submit" class="button secondary" ${window.Party.expedition() || !window.Party.members().length ? "disabled" : ""}>${initialPreset ? "上書き内容を確認" : "新規保存"}</button></form><div class="preset-record-list">${records}</div></section>`;
  }
  function presetApplyPreview(slot, partyIndex) {
    const preset = window.Presets.slots()[slot];
    if (!preset) return "";
    const current = window.Party.members(partyIndex), currentPosition = new Map(current.map((member, index) => [member.id, index]));
    const targetIds = new Set(preset.members.map(entry => entry.characterId));
    const rateText = rates => `回${rates.healing}・呪${rates.spell}・技${rates.technique}・攻${rates.attack}`;
    const itemNames = ids => ids.map(id => {
      const instance = window.Items.getInstance(id);
      return instance ? window.Items.displayName(instance) : `${id}（なし）`;
    });
    const rows = [];
    preset.members.forEach((entry, targetPosition) => {
      const character = window.Characters.get(entry.characterId);
      if (!character) return;
      const facts = [], beforePosition = currentPosition.get(character.id);
      if (beforePosition == null) facts.push(`加入 → ${targetPosition + 1}番`);
      else if (beforePosition !== targetPosition) facts.push(`隊列 ${beforePosition + 1}番 → ${targetPosition + 1}番`);
      const beforeEquipment = character.equipment || [], afterEquipment = entry.equipment || [];
      const removed = beforeEquipment.filter(id => !afterEquipment.includes(id)), added = afterEquipment.filter(id => !beforeEquipment.includes(id));
      if (removed.length || added.length) {
        facts.push(`装備 ${beforeEquipment.length}点 → ${afterEquipment.length}点`);
        if (removed.length) facts.push(`外す：${itemNames(removed).join("・")}`);
        if (added.length) facts.push(`装備：${itemNames(added).join("・")}`);
      }
      const beforeRates = window.Characters.actionRates(character), afterRates = entry.actionRates || window.GameData.combatRules.defaultActionRates;
      if (["healing", "spell", "technique", "attack"].some(key => beforeRates[key] !== afterRates[key])) facts.push(`行動率 ${rateText(beforeRates)} → ${rateText(afterRates)}`);
      if (facts.length) rows.push(`<li><strong>${escape(character.name)}</strong><span>${facts.map(escape).join(" ／ ")}</span></li>`);
    });
    current.filter(member => !targetIds.has(member.id)).forEach(member => rows.push(`<li><strong>${escape(member.name)}</strong><span>編成から外れる（現在の装備は保持）</span></li>`));
    return `<section class="preset-change-preview"><h4>呼び出し前の変更確認</h4>${rows.length ? `<ul>${rows.join("")}</ul>` : "<p>現在の編成と保存内容は同じです。</p>"}</section>`;
  }
  function presetSavePreview(slot, partyIndex) {
    const preset = window.Presets.slots()[slot];
    if (!preset) return "";
    const current = window.Party.members(partyIndex), savedById = new Map(preset.members.map((entry, index) => [entry.characterId, { entry, index }]));
    const currentIds = new Set(current.map(member => member.id));
    const rateText = rates => `回${rates.healing}・呪${rates.spell}・技${rates.technique}・攻${rates.attack}`;
    const itemNames = ids => ids.map(id => {
      const instance = window.Items.getInstance(id);
      return instance ? window.Items.displayName(instance) : `${id}（なし）`;
    });
    const rows = [];
    current.forEach((character, currentIndex) => {
      const saved = savedById.get(character.id), facts = [];
      if (!saved) facts.push(`新たに保存 → ${currentIndex + 1}番`);
      else if (saved.index !== currentIndex) facts.push(`隊列 ${saved.index + 1}番 → ${currentIndex + 1}番`);
      const beforeEquipment = saved?.entry.equipment || [], afterEquipment = character.equipment || [];
      const removed = beforeEquipment.filter(id => !afterEquipment.includes(id)), added = afterEquipment.filter(id => !beforeEquipment.includes(id));
      if (removed.length || added.length) {
        facts.push(`装備 ${beforeEquipment.length}点 → ${afterEquipment.length}点`);
        if (removed.length) facts.push(`保存から外す：${itemNames(removed).join("・")}`);
        if (added.length) facts.push(`保存へ追加：${itemNames(added).join("・")}`);
      }
      if (saved) {
        const beforeRates = saved.entry.actionRates || window.GameData.combatRules.defaultActionRates, afterRates = window.Characters.actionRates(character);
        if (["healing", "spell", "technique", "attack"].some(key => beforeRates[key] !== afterRates[key])) facts.push(`行動率 ${rateText(beforeRates)} → ${rateText(afterRates)}`);
      }
      if (facts.length) rows.push(`<li><strong>${escape(character.name)}</strong><span>${facts.map(escape).join(" ／ ")}</span></li>`);
    });
    preset.members.filter(entry => !currentIds.has(entry.characterId)).forEach(entry => {
      const character = window.Characters.get(entry.characterId);
      rows.push(`<li><strong>${escape(character?.name || entry.characterId)}</strong><span>保存内容から外れる</span></li>`);
    });
    return `<section class="preset-change-preview"><h4>上書き前の変更確認</h4>${rows.length ? `<ul>${rows.join("")}</ul>` : "<p>現在の編成と保存内容は同じです。</p>"}</section>`;
  }
  function openPresetConfirmation(type, payload) {
    pendingPresetAction = { type, payload };
    const action = type === "preset.save" ? "上書き保存" : type === "preset.apply" ? "呼び出し" : "削除";
    const message = type === "preset.apply" ? "選択中のパーティの隊列と、保存された仲間の装備・行動率を置き換えます。外れる仲間の装備はそのまま残ります。" : type === "preset.save" ? "この枠の保存内容を現在の編成で置き換えます。" : "保存内容だけを削除します。冒険者・装備・現在の編成は削除しません。";
    const partyIndex = payload.partyIndex ?? window.Party.selected();
    const preview = type === "preset.apply" ? presetApplyPreview(payload.slot, partyIndex) : type === "preset.save" ? presetSavePreview(payload.slot, partyIndex) : "";
    document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal preset-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="preset-confirm-title"><h3 id="preset-confirm-title">保存枠${payload.slot + 1}を${action}しますか？</h3><p>${message}</p>${preview}<div class="modal-actions"><button class="button ghost" data-action="close-modal">戻る</button><button class="button primary" data-action="confirm-preset">${action}</button></div></div></div>`;
  }
  function partyPage() {
    if (partyScreen === "overview") return `<div class="party-route party-route-overview">${partyOverview()}</div>`;
    const index = window.Party.selected(), view = partyViews[index];
    const unreadResult = window.Party.result(index) && window.Party.result(index).viewed !== true;
    const links = [["formation", "メンバー編成"], ["adventure", window.Party.expedition(index) ? "探索ログ" : "出撃先指定"], ["results", `直近ログ${unreadResult ? "・新着" : ""}`], ["history", "遠征履歴"]];
    const titles = { formation: "メンバー編成", adventure: window.Party.expedition(index) ? "探索ログ" : "出撃先を指定", results: "直近の探索結果", history: "遠征履歴" };
    const body = view === "adventure" ? adventureContent() : view === "results" ? partyReportPanel() : view === "history" ? window.GameUIViews.party.history(partyViewContext()) : formationPage();
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
      return `<div class="formation-slot-card ${member.id === selectedCharacter?.id ? "is-current" : ""}"><span class="slot-number">${position + 1}</span><button class="slot-character" data-action="open-equipment" data-character="${member.id}">${portraitImage(member, true)}<span><strong>${escape(member.name)}</strong><small>${escape(window.Characters.jobName(member))} · ${escape(raceName)} · Lv.${member.level}</small><small class="slot-vitals ${nearWeightLimit ? "is-near-limit" : ""}">HP ${stat.hp} · 重量 ${currentWeight}/${maxWeight} · 行動 ${escape(actionRateProfile(member))}</small></span></button><div class="formation-actions"><button class="formation-equip" data-action="open-equipment" data-character="${member.id}" aria-label="${escape(member.name)}の装備を変更">詳細</button><button data-action="move-party" data-character="${member.id}" data-direction="-1" aria-label="${escape(member.name)}を前へ" ${busy || position === 0 ? "disabled" : ""}>↑</button><button data-action="move-party" data-character="${member.id}" data-direction="1" aria-label="${escape(member.name)}を後ろへ" ${busy || position === members.length - 1 ? "disabled" : ""}>↓</button></div></div>`;
    }).join("");
    const jobOptions = Object.values(window.GameData.jobs).map(job => `<option value="${job.id}" ${rosterView.job === job.id ? "selected" : ""}>${escape(job.name)}</option>`).join("");
    const partyActionPresets = `<div class="party-action-presets"><span><strong>行動率を一括設定</strong><small>${busy ? "探索中の戦闘は変わらず、次回出撃から反映" : "編成中の全員へ適用"}</small></span><div>${window.GameData.combatRules.actionPresets.map(preset => `<button type="button" class="button ghost" data-action="party-action-preset" data-preset="${preset.id}" ${members.length ? "" : "disabled"}>${escape(preset.name)}</button>`).join("")}</div></div>`;
    const availableCount = window.GameState.data.characters.filter(character => !window.GameState.data.parties.some(party => party.includes(character.id))).length;
    const scopeShortcuts = `<div class="roster-scope-shortcuts" role="group" aria-label="所属冒険者の表示範囲"><button class="${rosterView.scope === "all" ? "is-active" : ""}" data-action="roster-scope" data-scope="all" aria-pressed="${rosterView.scope === "all"}">全員</button><button class="${rosterView.scope === "party" ? "is-active" : ""}" data-action="roster-scope" data-scope="party" aria-pressed="${rosterView.scope === "party"}">編成中 ${members.length}</button><button class="${rosterView.scope === "available" ? "is-active" : ""}" data-action="roster-scope" data-scope="available" aria-pressed="${rosterView.scope === "available"}">待機中 ${availableCount}</button></div>`;
    const rosterFilterSummary = [({ all: "全員", party: "編成中", available: "待機中" })[rosterView.scope], rosterView.job === "all" ? "全職業" : window.GameData.jobs[rosterView.job]?.name, ({ level: "レベル順", name: "名前順", newest: "加入順" })[rosterView.sort], rosterView.query ? `「${rosterView.query}」` : ""].filter(Boolean).join("・");
    return `<section class="panel formation-board"><div class="section-heading"><div><span class="label">PARTY LINEUP</span><h3>メンバー編成</h3></div><div class="formation-total"><strong>${members.length}/${limit}人</strong><span>戦力 ${Math.round(window.Party.power())}</span></div></div><p class="small-note">上から前衛です。キャラクターを開くと、専用の装備画面へ進みます。</p>${partyActionPresets}<div class="formation-slot-grid">${slots}</div><button class="button primary formation-depart" data-action="party-view" data-view="adventure" ${!members.length || busy ? "disabled" : ""}>出撃先を指定する</button></section>${acquisitionSkillsPanel(members)}<div class="formation-manager"><section class="panel roster-browser"><div class="section-heading"><div><span class="label">GUILD ROSTER</span><h3>所属冒険者</h3></div><button class="button ghost" data-nav="characters">仲間を募集</button></div>${scopeShortcuts}<details class="compact-filter-panel roster-filter-panel" data-detail="party-roster-filters"><summary><strong>絞り込み・並べ替え</strong><small>${escape(rosterFilterSummary)}</small><i aria-hidden="true">›</i></summary><form id="party-roster-form" class="roster-controls"><label>検索<input id="party-roster-query" value="${escape(rosterView.query)}" placeholder="名前・職業・種族"></label><label>所属<select data-roster-filter="scope"><option value="all">全員</option><option value="party" ${rosterView.scope === "party" ? "selected" : ""}>編成中</option><option value="available" ${rosterView.scope === "available" ? "selected" : ""}>待機中</option></select></label><label>職業<select data-roster-filter="job"><option value="all">全職業</option>${jobOptions}</select></label><label>順序<select data-roster-filter="sort"><option value="level">レベル順</option><option value="name" ${rosterView.sort === "name" ? "selected" : ""}>名前順</option><option value="newest" ${rosterView.sort === "newest" ? "selected" : ""}>加入順</option></select></label><button class="button secondary" type="submit">検索</button></form></details><div class="roster-list">${rosterRows || '<div class="roster-empty"><p class="empty-line">条件に合う冒険者はいません。</p><button class="button ghost" data-action="reset-roster-filters">条件を解除</button></div>'}</div><nav class="pagination" aria-label="冒険者一覧のページ"><button class="button ghost" data-action="roster-page" data-page="${rosterView.page - 1}" ${rosterView.page === 0 ? "disabled" : ""}>前へ</button><span>${rosterView.page + 1} / ${pages}ページ · ${roster.length}人</span><button class="button ghost" data-action="roster-page" data-page="${rosterView.page + 1}" ${rosterView.page >= pages - 1 ? "disabled" : ""}>次へ</button></nav></section></div><details class="workflow-details" data-detail="presets"><summary>編成プリセットを保存・呼び出し</summary>${presetsPanel()}</details><details class="workflow-details"><summary>隊列とスキルのルール</summary><p>近接は後方、遠距離は前方で攻撃力が下がります。併用時は両方の補正を乗算します。技・呪文・回復はスキルごとに再使用ターンが異なり、待機中でも別のスキルは使用できます。待機は戦闘ごとにリセットします。</p></details>`;
  }
  function departureSummary() {
    const members = window.Party.members();
    return `<section class="panel departure-summary"><div class="section-heading"><div><span class="label">DEPARTURE PARTY</span><h3>${escape(window.Party.name())} · ${members.length}/${window.Party.memberLimit()}人</h3></div><button class="button ghost" data-action="party-view" data-view="formation">編成・装備を見直す</button></div><ol class="departure-members">${members.map((member, position) => `<li>${portraitEditButton(member)}<span><strong>${escape(member.name)}</strong><small>${window.Party.positionName(position, Math.max(3, members.length))} · Lv.${member.level} · ${escape(window.Characters.jobName(member))}</small><small class="departure-action-profile">行動 ${escape(actionRateProfile(member))}</small></span></li>`).join("")}</ol><p class="small-note">上記の隊列・装備・行動率で出撃します。出撃後の変更は次回から反映されます。総合戦力 ${Math.round(window.Party.power())}</p></section>${acquisitionSkillsPanel(members, true)}`;
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
    const stats = item?.id && window.GameData.items[item.id] === item && ["weapon", "armor"].includes(item.type)
      ? window.Items.standardEffects(item.id)
      : item;
    return [
      ["HP", stats.hp, shopStatValue(stats.hp)],
      ["物攻", stats.attack, shopStatValue(stats.attack)],
      ["物防", stats.defense, shopStatValue(stats.defense)],
      ["魔攻", stats.magicAttack, shopStatValue(stats.magicAttack)],
      ["魔防", stats.magicDefense, shopStatValue(stats.magicDefense)],
      ["魔回復", stats.magicHealing, shopStatValue(stats.magicHealing)],
      ["命中", stats.hitRate, shopStatValue(Math.round(Number(stats.hitRate || 0) * 100), "pt")],
      ["回避", stats.evasionRate, shopStatValue(Math.round(Number(stats.evasionRate || 0) * 100), "pt")],
      ["速度", stats.speed, shopStatValue(stats.speed)],
      ["攻撃回数", stats.attackCount, shopStatValue(stats.attackCount)],
      ["重量", stats.weight, String(Number(stats.weight || 0))]
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
    const qualityText = item.type === "material" ? "" : ` · ${window.Items.qualityCompact(item.qualityId || "standard")}`;
    return `<article class="item-card compact-item ${purchasable ? "shop-item-card" : ""} ${sold ? "sold-out" : ""}"><div class="item-icon">${item.icon}</div><div class="item-info"><span class="type-label">${item.type === "weapon" ? `${escape(typeName || "武器")} · ${range}` : item.type === "armor" ? escape(typeName || "防具") : "素材"}${escape(qualityText)}</span><h3>${escape(item.name)}</h3>${item.type === "material" ? `<p>${primary}</p>` : equipmentDetails}</div>${purchasable ? `<div class="item-action"><strong>${formatGold(item.price)}</strong><button class="button secondary" ${action} ${disabled ? "disabled" : ""}>${sold ? "売切" : "購入"}</button></div>` : `<strong class="quantity">× ${window.Items.count(item.id)}</strong>`}</article>`;
  }

  function inventoryEquipmentCard(group) {
    const instances = group.instances;
    const focused = inventoryView.focusInstanceId && instances.some(candidate => candidate.id === inventoryView.focusInstanceId);
    const instance = instances.find(candidate => candidate.id === inventoryView.focusInstanceId)
      || instances.find(candidate => !window.Items.equippedBy(candidate.id) && !candidate.locked)
      || instances.find(candidate => !window.Items.equippedBy(candidate.id)) || instances[0];
    const base = window.Items.template(instance.templateId);
    const grade = window.Items.quality(instance);
    const effect = window.Items.effects(instance);
    const owners = instances.map(candidate => window.Items.equippedBy(candidate.id)).filter(Boolean);
    const locked = instances.filter(candidate => candidate.locked).length;
    const free = instances.length - owners.length;
    const typeName = base.type === "weapon" ? window.GameData.weaponTypes[base.weaponType] : window.GameData.armorTypes[base.armorType];
    const range = base.type === "weapon" ? (base.range === "ranged" ? "遠距離" : "近接") : "";
    const classification = [typeName, range, `品質：${window.Items.qualityCompact(instance)}`].filter(Boolean).join(" · ");
    const focusLabel = inventoryView.focusLabel || "注目中の装備";
    const individualRows = instances.map((candidate, index) => {
      const owner = window.Items.equippedBy(candidate.id);
      const salvage = window.Items.salvageYield(candidate).map(entry => `${itemName(entry.itemId)}×${entry.quantity}`).join("、");
      const isFocused = candidate.id === inventoryView.focusInstanceId;
      return `<div class="equipment-instance-row ${isFocused ? "is-focused-instance" : ""}" ${isFocused ? 'data-focused-instance="true"' : ""}><span><strong>${isFocused ? escape(focusLabel) : `個体 ${index + 1}`}</strong><small>${owner ? `${escape(owner.name)}が装備中` : candidate.locked ? "ロック中" : "未装備"} · ${escape(candidate.id)}</small></span><button class="button ghost" data-action="toggle-item-lock" data-instance="${candidate.id}" aria-pressed="${Boolean(candidate.locked)}">${candidate.locked ? "🔒" : "ロック"}</button><button class="button ghost" data-action="request-dismantle" data-instance="${candidate.id}" title="${escape(salvage)}" ${owner || candidate.locked ? "disabled" : ""}>分解</button><button class="button secondary" data-action="request-sell" data-instance="${candidate.id}" ${owner || candidate.locked ? "disabled" : ""}>${formatGold(window.Items.sellValue(candidate))}</button></div>`;
    }).join("");
    const stateText = [owners.length ? `装備中 ${owners.length}` : "", locked ? `ロック ${locked}` : "", free ? `未装備 ${free}` : ""].filter(Boolean).join(" · ");
    const quote = window.AutoSell.stackQuote(group.key);
    const autoSellRule = window.AutoSell.ruleForStack(group.key);
    const autoSellAction = autoSellRule
      ? `<button class="button ghost" data-action="remove-auto-sell-rule" data-rule="${autoSellRule.id}">自動売却を解除</button>`
      : `<button class="button ghost" data-action="add-auto-sell-rule" data-instance="${instance.id}" ${base.unique ? "disabled" : ""}>${base.unique ? "固有品は登録不可" : "同じ性能を自動売却"}</button>`;
    const bulkSale = `<div class="stack-bulk-sale"><span>未装備・ロックなし ${quote.count}点</span><div>${autoSellAction}<button class="button secondary" data-action="request-sell-stack" data-stack="${encodeURIComponent(group.key)}" ${quote.count ? "" : "disabled"}>まとめて売る ${formatGold(quote.gold)}</button></div></div>`;
    const equipmentRoute = focused && !window.Items.equippedBy(instance.id) ? `<button class="button primary focused-equipment-route" data-action="choose-equipment-character" data-instance="${instance.id}">${escape(focusLabel)}を冒険者に装備</button>` : "";
    return `<details class="owned-equipment equipment-stack compact-record quality-border-${grade.color} ${locked === instances.length ? "is-locked" : ""} ${focused ? "is-focused-equipment" : ""}" data-detail="equipment-stack-${encodeURIComponent(group.key)}" ${focused ? "open" : ""}><summary class="record-summary"><span class="item-icon">${base.icon}</span><span class="record-name"><span class="quality-label quality-${grade.color}">${escape(classification)}</span><strong>${escape(window.Items.displayName(instance))}</strong><small>${focused ? `${escape(focusLabel)} · ${stateText}` : stateText}</small></span><strong class="equipment-stack-count">×${instances.length}</strong><span class="record-stats"><b>HP +${effect.hp}</b><b>攻 +${effect.attack}</b><b>防 +${effect.defense}</b><b>重 ${effect.weight}</b></span><span class="record-chevron" aria-hidden="true">›</span></summary><div class="record-detail"><details class="inventory-item-performance"><summary>共通性能・追加効果</summary>${inventoryEquipmentStatChips(effect)}${equipmentSkillBadges(instance)}<p class="affix-line">${effectModifierText(instance) || "追加性能なし"}</p></details>${equipmentRoute}${bulkSale}<section class="equipment-instance-list"><h4>個体を選ぶ</h4>${individualRows}</section></div></details>`;
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
    return `<details class="auto-sell-panel" data-detail="inventory-auto-sell"><summary><span><strong>探索ドロップの自動売却</strong><small>${config.enabled ? `有効 · ${config.rules.length}種` : "無効"}</small></span><span class="record-chevron" aria-hidden="true">›</span></summary><div class="auto-sell-body"><label class="auto-sell-toggle"><input type="checkbox" data-auto-sell-enabled ${config.enabled ? "checked" : ""}><span><strong>自動売却を有効にする</strong><small>登録した装備と完全に同じ性能の探索ドロップだけを売却します。</small></span></label><p class="small-note">装備グループを開き「同じ性能を自動売却」で登録します。登録数に上限はありません。商店購入品・鍛冶製作品・ボス固有品・すでに所持している装備には適用しません。</p><ul class="auto-sell-rules">${rules}</ul></div></details>`;
  }

  function shopPage() {
    return window.GameUIViews.catalog.shop(catalogViewContext());
  }

  function inventoryPage() {
    const equipment = window.Items.queryEquipment(inventoryView);
    const equipmentGroups = window.Items.groupEquipment(equipment).sort((a, b) => Number(b.instances.some(instance => instance.id === inventoryView.focusInstanceId)) - Number(a.instances.some(instance => instance.id === inventoryView.focusInstanceId)));
    const total = window.Items.equipmentList().length;
    const pageSize = 24, pages = Math.max(1, Math.ceil(equipmentGroups.length / pageSize));
    inventoryView.page = Math.min(inventoryView.page, pages - 1);
    const visibleEquipment = equipmentGroups.slice(inventoryView.page * pageSize, (inventoryView.page + 1) * pageSize);
    const materialItems = Object.values(window.GameData.items).filter((item) => item.type === "material" && window.Items.count(item.id));
    const qualityLegend = Object.values(window.GameData.qualities).sort((a, b) => a.rank - b.rank).map((grade) => `<span class="quality-label quality-${grade.color}">${escape(window.Items.qualityCompact(grade.id))}</span>`).join("");
    const qualityGuide = `<details class="quality-guide"><summary>品質倍率を確認 <span>${Object.keys(window.GameData.qualities).length}種類</span></summary><div class="quality-legend">${qualityLegend}</div></details>`;
    const materialTotal = materialItems.reduce((sum, item) => sum + window.Items.count(item.id), 0);
    const materials = materialItems.length ? `<div class="item-list compact">${materialItems.map((item) => itemCard(item, "inventory")).join("")}</div>` : `<p class="empty-line">素材を所持していません</p>`;
    return `<div class="page-intro inventory-intro"><div><p>品質・強化・追加性能・超レア称号が同じ装備は数量表示でまとめます。グループを開くと個体ごとに操作できます。</p>${qualityGuide}</div><span class="muted-text">装備中・ロック中の品は売却・分解できません</span></div><div class="inventory-groups"><section class="panel inventory-equipment-panel"><div class="section-heading"><div><span class="label">EQUIPMENT</span><h3>装備品</h3></div><strong>${equipment.length}点 · ${equipmentGroups.length}種 / 全${total}点</strong></div>${autoSellPanel()}${inventoryControls()}<p class="compact-list-guide">同じ性能の装備はまとめて表示します。行を押すと性能・自動売却・個体一覧を確認できます。</p>${equipment.length ? `<div class="owned-equipment-grid">${visibleEquipment.map(inventoryEquipmentCard).join("")}</div><nav class="pagination" aria-label="装備品のページ"><button class="button ghost" data-action="inventory-page" data-page="${inventoryView.page - 1}" ${inventoryView.page === 0 ? "disabled" : ""}>前へ</button><span>${inventoryView.page + 1} / ${pages}ページ · ${equipmentGroups.length}種（${equipment.length}点）</span><button class="button ghost" data-action="inventory-page" data-page="${inventoryView.page + 1}" ${inventoryView.page >= pages - 1 ? "disabled" : ""}>次へ</button></nav>` : `<p class="empty-line">${total ? "条件に一致する装備がありません。絞り込みを解除してください。" : "装備品を所持していません"}</p>`}</section><details class="panel inventory-material-panel" data-detail="inventory-materials"><summary class="section-heading inventory-material-summary"><div><span class="label">MATERIALS</span><h3>素材</h3></div><span class="inventory-material-total"><strong>${materialItems.length}種 · ${materialTotal}点</strong><i class="record-chevron" aria-hidden="true">›</i></span></summary><div class="inventory-material-body">${materials}</div></details></div>`;
  }

  function inventoryControls() {
    const field = (key, label, entries) => `<label for="inventory-${key}">${label}<select id="inventory-${key}" data-inventory-filter="${key}">${entries.map(([id, name]) => `<option value="${id}" ${inventoryView[key] === id ? "selected" : ""}>${escape(name)}</option>`).join("")}</select></label>`;
    const types = [["all", "すべて"], ["unique", "ボス固有装備"], ["weapon", "武器すべて"], ...Object.entries(window.GameData.weaponTypes).map(([id, name]) => [`weapon:${id}`, name]), ["armor", "防具すべて"], ...Object.entries(window.GameData.armorTypes).map(([id, name]) => [`armor:${id}`, name])];
    const qualities = [["all", "すべて"], ...Object.values(window.GameData.qualities).sort((a, b) => a.rank - b.rank).map(entry => [entry.id, entry.prefix || "標準"])];
    const equippedStates = [["all", "すべて"], ["equipped", "装備中"], ["free", "未装備"]];
    const lockStates = [["all", "すべて"], ["locked", "ロック中"], ["unlocked", "ロックなし"]];
    const sorts = [["newest", "新しい順"], ["oldest", "古い順"], ["name", "名前順"], ["quality", "品質順"], ["attack", "攻撃力が高い順"], ["defense", "防御力が高い順"], ["hp", "HPが高い順"], ["weight", "軽い順"], ["value", "売却価格が高い順"]];
    const label = (entries, value, fallback) => entries.find(([id]) => id === value)?.[1] || fallback;
    const summary = [
      inventoryView.kind === "all" ? "全種" : label(types, inventoryView.kind, "装備種別"),
      inventoryView.quality === "all" ? "全品質" : label(qualities, inventoryView.quality, "品質"),
      inventoryView.equipped === "all" ? "" : label(equippedStates, inventoryView.equipped, "装備状態"),
      inventoryView.lock === "all" ? "" : label(lockStates, inventoryView.lock, "ロック"),
      label(sorts, inventoryView.sort, "新しい順")
    ].filter(Boolean).join("・");
    return `<details class="compact-filter-panel inventory-filter-panel" data-detail="inventory-filters"><summary><strong>絞り込み・並べ替え</strong><small>${escape(summary)}</small><i aria-hidden="true">›</i></summary><div class="inventory-controls">${field("kind", "装備種別", types)}${field("quality", "品質", qualities)}${field("equipped", "装備状態", equippedStates)}${field("lock", "ロック", lockStates)}${field("sort", "並べ替え", sorts)}<button class="button ghost" data-action="reset-inventory-filters">絞り込みを解除</button></div></details>`;
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
    const discoveries = window.Encyclopedia.unreadItems().length + window.Encyclopedia.unreadUltraRareTitles().length + window.Encyclopedia.unreadMonsters().length;
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

  function renderAtListStart(selector) {
    render();
    const target = document.querySelector(selector);
    if (typeof target?.scrollIntoView === "function") target.scrollIntoView({ block: "start" });
    else {
      const mainArea = document.querySelector(".main-area");
      if (mainArea) mainArea.scrollTop = 0;
    }
  }

  function navigate(page) {
    window.RecruitmentReveal.cancel();
    if (page === "characters" && currentPage !== "characters") { characterScreen = "overview"; selectedCharacterId = null; }
    if (page === "blacksmith") { blacksmithScreen = "menu"; blacksmithView.focusRecipeIds = []; blacksmithView.focusContext = ""; blacksmithView.lastCraftedInstanceId = null; }
    if (page === "inventory") { inventoryView.focusInstanceId = null; inventoryView.focusLabel = null; }
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
        const recipeNotice = completed.newRecipeIds?.length ? ` 製作記録が${completed.newRecipeIds.length}件解放されました。` : "";
        toast((completed.success ? "探索隊が帰還しました！" : "探索隊が帰還しました。") + journalNotice + recipeNotice, completed.success ? "success" : "error");
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

  function openInventoryInstance(instanceId, focusLabel = "注目中の装備") {
    const instance = window.Items.getInstance(instanceId);
    const base = instance ? window.Items.template(instance.templateId) : null;
    if (!instance || !base) return false;
    Object.assign(inventoryView, {
      kind: `${base.type}:${base.weaponType || base.armorType}`,
      quality: instance.qualityId,
      equipped: "all",
      lock: "all",
      sort: "newest",
      page: 0,
      focusInstanceId: null,
      focusLabel: null
    });
    navigate("inventory");
    inventoryView.focusInstanceId = instance.id;
    inventoryView.focusLabel = focusLabel;
    render();
    return true;
  }

  function openEquipmentCharacterChooser(instanceId) {
    const instance = window.Items.getInstance(instanceId);
    const base = instance ? window.Items.template(instance.templateId) : null;
    if (!instance || !base) { toast("この装備は現在の所持品にありません。", "error"); return; }
    const owner = window.Items.equippedBy(instance.id);
    if (owner) { toast(`${owner.name}が装備中です。`, "error"); return; }
    const effect = window.Items.effects(instance);
    const assignments = new Map();
    window.GameState.data.parties.forEach((party, index) => party.forEach(characterId => assignments.set(characterId, index)));
    const entries = window.GameState.data.characters.map(character => ({
      character,
      check: window.Items.canEquip(character.id, instance.id),
      partyIndex: assignments.has(character.id) ? assignments.get(character.id) : -1
    })).sort((a, b) => Number(b.check.ok) - Number(a.check.ok)
      || Number(b.partyIndex >= 0) - Number(a.partyIndex >= 0)
      || (a.partyIndex < 0 ? 99 : a.partyIndex) - (b.partyIndex < 0 ? 99 : b.partyIndex)
      || b.character.level - a.character.level);
    const rows = entries.map(({ character, check, partyIndex }) => {
      const currentWeight = window.Characters.equipmentWeight(character);
      const maxWeight = window.Characters.maxWeight(character);
      const projected = Math.round((currentWeight + effect.weight) * 10) / 10;
      const raceName = window.GameData.races[character.raceId]?.name || "種族不明";
      return `<button class="equipment-character-choice ${check.ok ? "can-equip" : "cannot-equip"}" data-action="inspect-equipment-character" data-character="${character.id}" data-instance="${instance.id}" ${check.ok ? "" : "disabled"}>${portraitImage(character, true)}<span><strong>${escape(character.name)}</strong><small>${partyIndex >= 0 ? `第${partyIndex + 1}パーティ` : "待機中"} · ${escape(window.Characters.jobName(character))} · ${escape(raceName)} · Lv.${character.level}</small></span><span class="equipment-character-weight"><small>装備後重量</small><strong>${projected} / ${maxWeight}</strong></span><em>${check.ok ? "装備画面へ" : escape(check.message)}</em></button>`;
    }).join("");
    document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal equipment-character-modal" role="dialog" aria-modal="true" aria-labelledby="equipment-character-title"><div class="modal-heading"><div><span class="label">EQUIPMENT ROUTE</span><h3 id="equipment-character-title">誰が装備するか選ぶ</h3></div><button class="modal-close" data-action="close-modal" aria-label="閉じる">×</button></div><div class="equipment-character-item"><span class="item-icon">${base.icon}</span><span><strong>${escape(window.Items.displayName(instance))}</strong><small>${base.type === "weapon" ? escape(window.GameData.weaponTypes[base.weaponType] || "武器") : escape(window.GameData.armorTypes[base.armorType] || "防具")} · 重量 ${effect.weight}</small></span></div><p class="small-note">装備できる冒険者を先に表示します。冒険者を選ぶと、この装備を絞り込んだ比較画面へ進みます。</p><div class="equipment-character-list">${rows || '<p class="empty-line">所属冒険者がいません。</p>'}</div></div></div>`;
  }

  async function openTrackedDestination(partyIndex, dungeonId, difficultyId) {
    const dungeon = window.GameData.dungeons[dungeonId];
    if (!Number.isInteger(partyIndex) || partyIndex < 0 || partyIndex >= window.Party.limit() || !dungeon) return false;
    if (window.Party.expedition(partyIndex) || !window.Party.members(partyIndex).length) {
      toast("このパーティでは攻略先を変更できません。", "error");
      return false;
    }
    if (!window.Story.canEnter(dungeon.id) || !window.DungeonDifficulty.unlocked(dungeon.id, difficultyId)) return false;
    const selected = await window.GameClient.execute("party.select", { partyIndex });
    if (!selected.ok) { toast(selected.message, "error"); return false; }
    const choices = explorationChoices[partyIndex];
    const timeMultiplier = Number(choices[dungeon.id] || 1);
    const saved = await window.GameClient.execute("party.setPlan", { partyIndex, dungeonId: dungeon.id, difficultyId, timeMultiplier });
    if (!saved.ok) { toast(saved.message, "error"); return false; }
    choices.chapterId = dungeon.chapterId;
    choices.dungeonId = dungeon.id;
    choices[dungeon.id] = timeMultiplier;
    choices[`${dungeon.id}:difficulty`] = difficultyId;
    document.getElementById("modal-root").innerHTML = "";
    partyOverviewScrollTop = document.querySelector(".main-area")?.scrollTop || 0;
    partyViews[partyIndex] = "adventure";
    partyScreen = "detail";
    selectedPartyCharacterId = null;
    navigate("party");
    return true;
  }

  async function handleClick(event) {
    if (event.target.closest("[data-portrait-character]")?.dataset.portraitCharacter) return;
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    // Inner dialog content must not inherit the backdrop close action.
    if (button.classList.contains("modal-backdrop") && event.target.closest(".modal")) return;
    const action = button.dataset.action;
    if (action === "action-rate-preset") {
      const preset = window.GameData.combatRules.actionPresets.find(entry => entry.id === button.dataset.preset);
      const form = button.closest?.(".action-rate-form");
      if (!preset || !form) return;
      Object.entries(preset.rates).forEach(([key, value]) => {
        const input = form.elements[key];
        if (!input) return;
        input.value = value;
        input.setAttribute?.("aria-label", `${key === "attack" ? "攻撃" : key === "technique" ? "技" : key === "spell" ? "呪文" : "回復"}行動率 ${value}%`);
        const output = input.parentElement?.querySelector?.("[data-action-rate-value]");
        if (output) output.textContent = `${value}%`;
      });
      return;
    }
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
      if (!["commissions", "observations", "achievements", "origins", "items", "monsters"].includes(button.dataset.view)) return;
      if (["items", "monsters"].includes(button.dataset.view)) await window.GameClient.execute("encyclopedia.read", { kind: button.dataset.view });
      archiveMonsterDungeonId = null;
      archiveMonsterEncounters = {};
      archiveReturnPartyIndex = null;
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
    if (action === "jump-result-section") {
      const target = document.getElementById(button.dataset.target);
      if (!target) return;
      if (button.dataset.target === "result-battle-records") {
        const encounter = target.querySelector?.("details.journey-encounter.is-defeat") || target.querySelector?.("details.journey-encounter");
        if (encounter) encounter.open = true;
      }
      target.scrollIntoView?.({ behavior: "smooth", block: "start" });
      return;
    }
    if (action === "open-result-monsters") {
      if (!window.GameData.dungeons[button.dataset.dungeon]) return;
      const partyIndex = window.Party.selected();
      const report = window.Party.result(partyIndex);
      await window.GameClient.execute("encyclopedia.read", { kind: "monsters" });
      archiveMonsterDungeonId = button.dataset.dungeon;
      archiveMonsterEncounters = Object.assign({}, report?.monsterEncounters || {});
      archiveReturnPartyIndex = report ? partyIndex : null;
      archiveView = "monsters";
      navigate("archives");
      return;
    }
    if (action === "return-to-result-report") {
      const partyIndex = Number(button.dataset.party);
      if (!Number.isInteger(partyIndex) || !window.Party.result(partyIndex)) return;
      const selected = await window.GameClient.execute("party.select", { partyIndex });
      if (!selected.ok) { toast(selected.message, "error"); return; }
      await window.GameClient.execute("party.readResult", { partyIndex });
      archiveMonsterDungeonId = null;
      archiveMonsterEncounters = {};
      archiveReturnPartyIndex = null;
      partyViews[partyIndex] = "results";
      partyScreen = "detail";
      navigate("party");
      return;
    }
    if (action === "track-item") {
      const result = await window.GameClient.execute("encyclopedia.trackItem", { itemId: button.dataset.item });
      if (!result.ok) { toast(result.message, "error"); return; }
      render(); toast(result.message, "success"); return;
    }
    if (action === "track-recipe-material") {
      const result = await window.GameClient.execute("encyclopedia.trackRequirement", { itemId: button.dataset.item, targetQuantity: Number(button.dataset.targetQuantity) });
      if (!result.ok) { toast(result.message, "error"); return; }
      render(); toast(`${result.message} パーティの出撃先で入手記録を確認できます。`, "success"); return;
    }
    if (action === "clear-tracked-item") {
      const result = await window.GameClient.execute("encyclopedia.clearTrackedItem", {});
      if (!result.ok) { toast(result.message, "error"); return; }
      render(); toast(result.message, "success"); return;
    }
    if (action === "open-new-recipes") {
      const recipeIds = String(button.dataset.recipes || "").split(",").filter(id => window.GameData.recipes.some(recipe => recipe.id === id));
      navigate("blacksmith");
      blacksmithScreen = "craft";
      Object.assign(blacksmithView, { query: "", category: "all", material: "all", status: "all", sort: "ready", page: 0, focusRecipeIds: recipeIds, focusContext: "new" });
      render();
      document.querySelector(".main-area").scrollTop = 0;
      return;
    }
    if (action === "open-target-recipes") {
      const recipeIds = String(button.dataset.recipes || "").split(",").filter(id => window.GameData.recipes.some(recipe => recipe.id === id && window.Blacksmith.status(recipe) !== "locked"));
      if (!recipeIds.length) return;
      navigate("blacksmith");
      blacksmithScreen = "craft";
      Object.assign(blacksmithView, { query: "", category: "all", material: "all", status: "all", sort: "ready", page: 0, focusRecipeIds: recipeIds, focusContext: "target" });
      render();
      document.querySelector(".main-area").scrollTop = 0;
      return;
    }
    if (action === "open-crafted-inventory") {
      openInventoryInstance(button.dataset.instance, "今回の製作品");
      return;
    }
    if (action === "open-loot-instance") {
      if (!openInventoryInstance(button.dataset.instance, "今回の戦利品")) toast("この装備は現在の所持品にありません。", "error");
      return;
    }
    if (action === "choose-equipment-character") {
      openEquipmentCharacterChooser(button.dataset.instance);
      return;
    }
    if (action === "inspect-equipment-character") {
      document.getElementById("modal-root").innerHTML = "";
      openEquipmentModal(button.dataset.character, false, button.dataset.instance);
      return;
    }
    if (action === "review-equipped-character") {
      const character = window.Characters.get(button.dataset.character);
      if (!character) return;
      document.getElementById("modal-root").innerHTML = "";
      equipmentReturnToParty = false;
      equipmentPicker.focusInstanceId = null;
      equipmentPicker.origin = null;
      dismissEquipmentChangeNotice();
      const partyIndex = window.GameState.data.parties.findIndex(party => party.includes(character.id));
      if (partyIndex >= 0) {
        const selected = await window.GameClient.execute("party.select", { partyIndex });
        if (!selected.ok) { toast(selected.message, "error"); return; }
        partyViews[partyIndex] = "formation";
        partyScreen = "detail";
        selectedPartyCharacterId = character.id;
        navigate("party");
      } else {
        navigate("characters");
        selectedCharacterId = character.id;
        characterScreen = "detail";
        render();
        document.querySelector(".main-area").scrollTop = 0;
      }
      return;
    }
    if (action === "open-party-presets") {
      const index = Number(button.dataset.party);
      if (!Number.isInteger(index) || index < 0 || index >= window.Party.limit()) return;
      const selected = await window.GameClient.execute("party.select", { partyIndex: index });
      if (!selected.ok) { toast(selected.message, "error"); return; }
      rememberEquipmentPickerView();
      equipmentReturnToParty = false; equipmentPicker.focusInstanceId = null; equipmentPicker.origin = null;
      document.getElementById("modal-root").innerHTML = "";
      partyViews[index] = "formation"; partyScreen = "detail"; selectedPartyCharacterId = null;
      navigate("party");
      const presets = document.querySelector('[data-detail="presets"]');
      if (presets) { presets.open = true; presets.scrollIntoView?.({ block: "start", behavior: "smooth" }); }
      return;
    }
    if (action === "open-target-destination") {
      const dungeon = window.GameData.dungeons[button.dataset.dungeon];
      const difficultyId = button.dataset.difficulty || "normal";
      if (!dungeon || !window.Story.canEnter(dungeon.id) || !window.DungeonDifficulty.unlocked(dungeon.id, difficultyId)) return;
      const candidates = Array.from({ length: window.Party.limit() }, (_, index) => index).filter(index => !window.Party.expedition(index) && window.Party.members(index).length);
      if (!candidates.length) {
        toast("待機中でメンバーのいるパーティがありません。", "error");
        return;
      }
      if (candidates.length === 1) {
        await openTrackedDestination(candidates[0], dungeon.id, difficultyId);
        return;
      }
      const destination = window.DungeonDifficulty.variant(dungeon.id, difficultyId);
      const choices = candidates.map(index => {
        const plan = window.Party.plan(index);
        const current = plan ? window.DungeonDifficulty.variant(plan.dungeonId, plan.difficultyId || "normal").name : "攻略先未指定";
        return `<button class="target-party-choice" data-action="confirm-target-destination" data-party="${index}" data-dungeon="${dungeon.id}" data-difficulty="${difficultyId}"><span><strong>${escape(window.Party.name(index))}</strong><small>${window.Party.members(index).length}人 · 現在 ${escape(current)}</small></span><i aria-hidden="true">›</i></button>`;
      }).join("");
      document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal target-party-modal" role="dialog" aria-modal="true" aria-labelledby="target-party-title"><div class="modal-icon">♙</div><h3 id="target-party-title">${escape(destination.name)}へ向かうパーティ</h3><p>攻略先を設定する待機隊を選んでください。この操作だけでは出撃しません。</p><div class="target-party-list">${choices}</div><div class="modal-actions"><button class="button ghost" data-action="close-modal">戻る</button></div></div></div>`;
      return;
    }
    if (action === "confirm-target-destination") {
      await openTrackedDestination(Number(button.dataset.party), button.dataset.dungeon, button.dataset.difficulty || "normal");
      return;
    }
    if (action === "party-open") {
      const index = Number(button.dataset.party), view = button.dataset.view;
      if (!["formation", "adventure", "results", "history"].includes(view)) return;
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
    if (action === "switch-party-result") {
      const index = Number(button.dataset.party);
      if (!Number.isInteger(index) || index < 0 || index >= window.Party.limit() || !window.Party.result(index)) return;
      const selected = await window.GameClient.execute("party.select", { partyIndex: index });
      if (!selected.ok) { toast(selected.message, "error"); return; }
      const read = await window.GameClient.execute("party.readResult", { partyIndex: index });
      if (!read.ok) { toast(read.message, "error"); return; }
      partyViews[index] = "results";
      partyScreen = "detail";
      selectedPartyCharacterId = null;
      render();
      document.querySelector(".main-area").scrollTop = 0;
      return;
    }
    if (action === "unlock-party") {
      const unlocked = await window.GameClient.execute("party.unlock", { partySlot: Number(button.dataset.party) + 1 });
      toast(unlocked.message, unlocked.ok ? "success" : "error");
      render(); return;
    }
    if (action === "party-back") {
      const showNextUnread = partyOverviewFilter === "reports" && window.Party.unreadResultCount() > 0;
      partyScreen = "overview"; selectedPartyCharacterId = null; render();
      document.querySelector(".main-area").scrollTop = showNextUnread ? 0 : partyOverviewScrollTop;
      return;
    }
    if (action === "rename-party") {
      const partyIndex = Number(button.dataset.party);
      if (!Number.isInteger(partyIndex) || partyIndex < 0 || partyIndex >= window.Party.limit()) return;
      document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" data-action="close-modal"><form id="party-name-form" class="modal" data-party="${partyIndex}" role="dialog" aria-modal="true" aria-labelledby="party-name-title"><h3 id="party-name-title">第${partyIndex + 1}パーティの名前を変更</h3><label for="party-name-input">名前<input id="party-name-input" name="name" maxlength="20" required value="${escape(window.Party.name(partyIndex))}" autocomplete="off"></label><p class="small-note">一覧、探索ログ、帰還記録で共通して表示されます。</p><div class="modal-actions"><button class="button ghost" type="button" data-action="close-modal">戻る</button><button class="button primary" type="submit">変更する</button></div></form></div>`;
      return;
    }
    if (action === "party-view") {
      if (!["formation", "adventure", "results", "history"].includes(button.dataset.view)) return;
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
    if (action === "repeat-expedition") {
      const index = window.Party.selected();
      const previous = window.Party.result(index);
      if (!previous || window.Party.expedition(index)) { toast("再出撃できる帰還記録がありません。", "error"); render(); return; }
      button.disabled = true;
      const started = await window.GameClient.execute("expedition.start", {
        dungeonId: previous.dungeonId,
        difficultyId: previous.difficultyId || "normal",
        partyIndex: index,
        timeMultiplier: previous.timeMultiplier || 1
      });
      if (!started.ok) { button.disabled = false; toast(started.message, "error"); render(); return; }
      toast("直前と同じ条件で再出発しました。", "success");
      render();
      return;
    }
    if (action === "select-party-character") { selectedPartyCharacterId = button.dataset.character; openEquipmentModal(button.dataset.character, true); return; }
    if (action === "roster-page") { rosterView.page = Math.max(0, Number(button.dataset.page) || 0); renderAtListStart(".roster-browser"); return; }
    if (action === "party-overview-filter") {
      if (!["all", "exploring", "waiting", "reports"].includes(button.dataset.filter)) return;
      partyOverviewFilter = button.dataset.filter; renderPreservingViewport(); return;
    }
    if (action === "roster-scope") {
      if (!["all", "party", "available"].includes(button.dataset.scope)) return;
      rosterView.scope = button.dataset.scope; rosterView.page = 0; renderPreservingViewport(); return;
    }
    if (action === "reset-roster-filters") {
      Object.assign(rosterView, { query: "", job: "all", scope: "all", sort: "level", page: 0 });
      renderPreservingViewport(); return;
    }
    if (action === "character-page") { characterView.page = Math.max(0, Number(button.dataset.page) || 0); renderAtListStart(".character-directory"); return; }
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
    if (action === "inventory-page") { inventoryView.page = Math.max(0, Number(button.dataset.page) || 0); inventoryView.focusInstanceId = null; inventoryView.focusLabel = null; renderAtListStart(".inventory-equipment-panel"); return; }
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
      toast(sold.message, sold.ok ? "success" : "error"); renderPreservingViewport(); return;
    }
    if (action === "remove-auto-sell-rule") {
      const removed = await window.GameClient.execute("autosell.remove", { ruleId: button.dataset.rule });
      toast(removed.message, removed.ok ? "success" : "error"); renderPreservingViewport(); return;
    }
    if (action === "add-auto-sell-rule") {
      const added = await window.GameClient.execute("autosell.add", { instanceId: button.dataset.instance });
      toast(added.message, added.ok ? "success" : "error"); renderPreservingViewport(); return;
    }
    if (action === "recipe-page") { blacksmithView.page = Math.max(0, Number(button.dataset.page) || 0); renderAtListStart(".forge-catalog"); return; }
    if (action === "upgrade-page") { upgradeView.page = Math.max(0, Number(button.dataset.page) || 0); renderAtListStart(".upgrade-panel"); return; }
    if (action === "reset-upgrade-filters") { Object.assign(upgradeView, { query: "", kind: "all", status: "all", sort: "ready", page: 0 }); renderPreservingViewport(); return; }
    if (action === "blacksmith-open") {
      if (!['craft', 'upgrade'].includes(button.dataset.view)) return;
      blacksmithScreen = button.dataset.view; blacksmithView.page = 0; blacksmithView.focusRecipeIds = []; blacksmithView.focusContext = ""; blacksmithView.lastCraftedInstanceId = null; render();
      document.querySelector(".main-area").scrollTop = 0; return;
    }
    if (action === "blacksmith-back") {
      blacksmithScreen = "menu"; render(); document.querySelector(".main-area").scrollTop = 0; return;
    }
    if (action === "reset-equipment-filters") {
      Object.assign(equipmentPicker, equipmentPickerDefaults, { focusInstanceId: null });
      rememberEquipmentPickerView(); renderEquipmentModal(); return;
    }
    if (action === "equipment-page") { equipmentPicker.page = Math.max(0, Number(button.dataset.page) || 0); equipmentPicker.focusInstanceId = null; rememberEquipmentPickerView(); renderEquipmentModal(); return; }
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
      toast(result.message, result.ok ? "success" : "error"); renderPreservingViewport(); return;
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
      renderPreservingViewport();
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
    if (action === "reset-inventory-filters") { Object.assign(inventoryView, { kind: "all", quality: "all", equipped: "all", lock: "all", page: 0, focusInstanceId: null, focusLabel: null }); renderPreservingViewport(); return; }
    if (action === "reset-blacksmith-filters") {
      Object.assign(blacksmithView, { query: "", category: "all", material: "all", status: "all", sort: "ready", page: 0, focusRecipeIds: [], focusContext: "" });
      renderPreservingViewport(); return;
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
    if (action === "request-unequip-all") {
      const character = window.Characters.get(button.dataset.character);
      if (!character || !character.equipment.length) return;
      pendingUnequipAll = character.id;
      const weight = window.Characters.equipmentWeight(character);
      document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" data-action="cancel-unequip-all"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="unequip-all-title"><div class="modal-icon">◇</div><h3 id="unequip-all-title">${escape(character.name)}の装備をすべて外しますか？</h3><p>装備中の${character.equipment.length}点（合計重量${weight}）を所持品へ戻します。装備品が失われることはありません。</p><div class="modal-actions"><button class="button ghost" data-action="cancel-unequip-all">装備画面へ戻る</button><button class="button danger" data-action="confirm-unequip-all">すべて外す</button></div></div></div>`;
      return;
    }
    if (action === "cancel-unequip-all") {
      pendingUnequipAll = null; renderEquipmentModal(); return;
    }
    if (action === "confirm-unequip-all") {
      const characterId = pendingUnequipAll;
      pendingUnequipAll = null;
      const before = equipmentSnapshot(characterId);
      const result = await window.GameClient.execute("equipment.unequipAll", { characterId });
      if (!result.ok) { toast(result.message, "error"); renderEquipmentModal(); return; }
      setEquipmentChangeNotice(`装備を一括解除（${result.count}点）`, before, equipmentSnapshot(characterId));
      render(); renderEquipmentModal(); toast(result.message, "success"); return;
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
    let result, preserveViewport = false;
    if (action === "toggle-item-lock") {
      preserveViewport = true;
      const instance = window.Items.getInstance(button.dataset.instance);
      result = await window.GameClient.execute("equipment.lock", { instanceId: button.dataset.instance, locked: instance ? !instance.locked : true });
    }
    if (action === "buy-daily") { preserveViewport = true; result = await window.GameClient.execute("shop.daily.buy", { offerId: button.dataset.offer }); }
    if (action === "buy") { preserveViewport = true; result = await window.GameClient.execute("shop.buy", { itemId: button.dataset.item }); }
    if (action === "craft") {
      preserveViewport = true;
      result = await window.GameClient.execute("blacksmith.craft", { recipeId: button.dataset.recipe });
      if (result?.ok && result.instance?.id) blacksmithView.lastCraftedInstanceId = result.instance.id;
    }
    if (action === "select-party") { selectedPartyCharacterId = null; result = await window.GameClient.execute("party.select", { partyIndex: Number(button.dataset.party) }); }
    if (action === "toggle-party") { selectedPartyCharacterId = button.dataset.character; preserveViewport = currentPage === "party"; result = await window.GameClient.execute("party.toggle", { characterId: button.dataset.character, partyIndex: window.Party.selected() }); }
    if (action === "move-party") result = await window.GameClient.execute("party.move", { characterId: button.dataset.character, direction: Number(button.dataset.direction), partyIndex: window.Party.selected() });
    if (action === "party-action-preset") result = await window.GameClient.execute("party.actionPreset", { presetId: button.dataset.preset, partyIndex: window.Party.selected() });
    if (action === "collect-facility") result = await window.GameClient.execute("facility.collect", { facilityId: button.dataset.facility });
    if (action === "collect-all-facilities") result = await window.GameClient.execute("facility.collectAll");
    if (action === "upgrade-facility") result = await window.GameClient.execute("facility.upgrade", { facilityId: button.dataset.facility, trackId: button.dataset.track });
    if (action === "request-reset-facility") {
      const facilityId = button.dataset.facility, definition = window.GameData.facilities.definitions[facilityId], quote = window.Facilities.resetQuote(facilityId);
      if (!definition || !quote?.canReset) { toast("リセットできる施設強化がありません。", "error"); return; }
      const spent = [quote.spent.gold ? formatGold(quote.spent.gold) : "", ...Object.entries(quote.spent.materials || {}).map(([itemId, amount]) => `${escape(itemName(itemId))}×${amount}`)].filter(Boolean).join("・") || "なし";
      document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="facility-reset-title"><div class="modal-icon">↺</div><h3 id="facility-reset-title">${escape(definition.name)}の強化をリセットしますか？</h3><p>生産量・保管庫・作業速度をすべてLv.1へ戻し、強化枠を振り直せる状態にします。</p><p><strong>使用済みの所持金と素材は返却されません：${spent}</strong></p><p>保管中の生産物は維持されます。保管時間が初期上限を超えている場合は満杯として扱われます。</p><div class="modal-actions"><button class="button ghost" type="button" data-action="close-modal">戻る</button><button class="button danger" type="button" data-action="confirm-reset-facility" data-facility="${facilityId}">費用を戻さずリセット</button></div></div></div>`;
      return;
    }
    if (action === "confirm-reset-facility") {
      result = await window.GameClient.execute("facility.reset", { facilityId: button.dataset.facility });
      if (result.ok) document.getElementById("modal-root").innerHTML = "";
    }
    if (action === "open-equipment") { selectedPartyCharacterId = button.dataset.character; openEquipmentModal(button.dataset.character, currentPage === "party"); return; }
    if (action === "request-sell") { openItemActionModal(button.dataset.instance, "sell"); return; }
    if (action === "request-dismantle") { openItemActionModal(button.dataset.instance, "dismantle"); return; }
    if (action === "confirm-item-action") {
      preserveViewport = true;
      result = await window.GameClient.execute(button.dataset.kind === "sell" ? "equipment.sell" : "equipment.dismantle", { instanceId: button.dataset.instance });
      if (result.ok) document.getElementById("modal-root").innerHTML = "";
    }
    if (action === "reset-save") {
      document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="reset-title"><div class="modal-icon">!</div><h3 id="reset-title">セーブデータを初期化しますか？</h3><p>冒険者、装備、探索結果を含むすべての進行状況が失われます。</p><div class="modal-actions"><button class="button ghost" data-action="close-modal">キャンセル</button><button class="button danger" data-action="confirm-reset">初期化する</button></div></div></div>`;
      return;
    }
    if (action === "close-modal") { pendingImport = null; pendingClassChange = null; pendingUnequipAll = null; importRequest += 1; equipmentReturnToParty = false; rememberEquipmentPickerView(); equipmentPicker.focusInstanceId = null; equipmentPicker.origin = null; dismissEquipmentChangeNotice(); document.getElementById("modal-root").innerHTML = ""; return; }
    if (action === "confirm-reset") { const reset = await window.GameClient.execute("save.reset"); if (!reset.ok) { toast(reset.message, "error"); return; } equipmentPickerViews.clear(); Object.assign(equipmentPicker, { characterId: null, ...equipmentPickerDefaults, focusInstanceId: null, origin: null }); document.getElementById("modal-root").innerHTML = ""; currentPage = "home"; partyScreen = "overview"; partyOverviewFilter = "all"; partyViews.fill("formation"); reloadExplorationChoices(); archiveView = "commissions"; blacksmithScreen = "menu"; Object.assign(blacksmithView, { query: "", category: "all", material: "all", status: "all", sort: "ready", page: 0, focusRecipeIds: [], focusContext: "", lastCraftedInstanceId: null }); toast("セーブデータを初期化しました。"); renderNav(); render(); return; }
    if (result && !result.ok) toast(result.message, "error");
    else if (result && result.message) toast(result.message, "success");
    if (preserveViewport) renderPreservingViewport();
    else render();
  }

  let recruitmentBusy = false;
  async function handleSubmit(event) {
    if (event.target.id === "item-target-form") {
      event.preventDefault();
      const form = event.target;
      const result = await window.GameClient.execute("encyclopedia.trackItem", { itemId: form.dataset.item, targetQuantity: Number(form.elements.targetQuantity.value) });
      toast(result.message, result.ok ? "success" : "error");
      render();
      return;
    }
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
      blacksmithView.page = 0; blacksmithView.focusRecipeIds = []; blacksmithView.focusContext = ""; renderPreservingViewport(); return;
    }
    if (event.target.id === "upgrade-search-form") {
      event.preventDefault();
      upgradeView.query = document.getElementById("upgrade-query").value.trim().slice(0, 60);
      upgradeView.page = 0; renderPreservingViewport(); return;
    }
    if (event.target.id === "character-directory-form") {
      event.preventDefault();
      characterView.query = document.getElementById("character-directory-query").value.trim().slice(0, 40);
      characterView.page = 0; renderPreservingViewport(); return;
    }
    if (event.target.id === "party-roster-form") {
      event.preventDefault();
      rosterView.query = document.getElementById("party-roster-query").value.trim().slice(0, 40);
      rosterView.page = 0; renderPreservingViewport(); return;
    }
    if (event.target.id === "equipment-picker-form") {
      event.preventDefault();
      equipmentPicker.query = document.getElementById("equipment-picker-query").value.trim().slice(0, 60);
      equipmentPicker.page = 0; equipmentPicker.focusInstanceId = null; rememberEquipmentPickerView(); renderEquipmentModal(); return;
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
      presetSaveSlot = payload.slot;
      if (window.Presets.slots()[payload.slot]) { openPresetConfirmation("preset.save", payload); return; }
      const button = event.target.querySelector('button[type="submit"]');
      button.disabled = true;
      const result = await window.GameClient.execute("preset.save", payload);
      toast(result.message, result.ok ? "success" : "error");
      renderPreservingViewport();
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
      if (event.target.id === "preset-slot") {
        presetSaveSlot = Number(event.target.value);
        const preset = window.Presets.slots()[presetSaveSlot] || null;
        const name = document.getElementById("preset-name"), button = document.getElementById("preset-save-button");
        if (name) name.value = preset ? preset.name : "";
        if (button) button.textContent = preset ? "上書き内容を確認" : "新規保存";
        return;
      }
      if (event.target.hasAttribute("data-dungeon-chapter-select")) {
        const chapterId = event.target.value;
        if (window.GameData.storyChapters.some(chapter => chapter.id === chapterId) && window.Story.chapterDungeons(chapterId).length) {
          explorationChoices[window.Party.selected()].chapterId = chapterId;
          render();
        }
        return;
      }
      if (event.target.hasAttribute("data-portrait-type")) {
        window.GameUIViews.portraits.refreshPicker(event.target.closest("#portrait-form"), true);
        return;
      }
      if (event.target.hasAttribute("data-auto-sell-enabled")) {
        const changed = await window.GameClient.execute("autosell.toggle", { enabled: event.target.checked });
        toast(changed.message, changed.ok ? "success" : "error"); renderPreservingViewport(); return;
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
        rosterView.page = 0; renderPreservingViewport(); return;
      }
      if (event.target.hasAttribute("data-character-filter")) {
        characterView[event.target.dataset.characterFilter] = event.target.value;
        characterView.page = 0; renderPreservingViewport(); return;
      }
      if (event.target.hasAttribute("data-equipment-filter")) {
        equipmentPicker[event.target.dataset.equipmentFilter] = event.target.value;
        equipmentPicker.page = 0; equipmentPicker.focusInstanceId = null; rememberEquipmentPickerView(); renderEquipmentModal(); return;
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
        inventoryView.focusInstanceId = null;
        inventoryView.focusLabel = null;
        renderPreservingViewport();
        document.getElementById(event.target.id).focus();
        return;
      }
      if (event.target.hasAttribute("data-blacksmith-filter")) {
        blacksmithView[event.target.dataset.blacksmithFilter] = event.target.value;
        blacksmithView.focusRecipeIds = [];
        blacksmithView.focusContext = "";
        blacksmithView.page = 0;
        renderPreservingViewport();
        return;
      }
      if (event.target.hasAttribute("data-upgrade-filter")) {
        upgradeView[event.target.dataset.upgradeFilter] = event.target.value;
        upgradeView.page = 0; renderPreservingViewport(); return;
      }
    });
    render();
    setInterval(tick, 500);
  }

  window.UI = { init, render, navigate, showError: message => toast(message, "error") };
})();

