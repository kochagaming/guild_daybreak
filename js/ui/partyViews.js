(function () {
  "use strict";

  window.GameUIViews = window.GameUIViews || {};

  function routeChapters() {
    return window.GameData.storyChapters
      .filter(chapter => window.Story.chapterDungeons(chapter.id).length)
      .sort((a, b) => a.order - b.order);
  }

  function selectedChapterId(context, partyIndex) {
    const choices = context.explorationChoices[partyIndex] || (context.explorationChoices[partyIndex] = {});
    const chapters = routeChapters();
    if (choices.chapterId && chapters.some(chapter => chapter.id === choices.chapterId)) return choices.chapterId;
    const current = window.Story.current();
    const currentWithRoutes = current && chapters.find(chapter => chapter.id === current.id);
    const selectedRouteChapter = choices.dungeonId && window.GameData.dungeons[choices.dungeonId]?.chapterId;
    const nextPostgame = chapters.find(chapter => chapter.kind === "postgame" && !window.Story.ensure().completed.includes(chapter.id) && window.Story.chapterDungeons(chapter.id).some(dungeon => window.Story.canEnter(dungeon.id)));
    const latestCompleted = chapters.filter(chapter => window.Story.ensure().completed.includes(chapter.id)).slice(-1)[0];
    choices.chapterId = currentWithRoutes?.id
      || (selectedRouteChapter && chapters.some(chapter => chapter.id === selectedRouteChapter) ? selectedRouteChapter : null)
      || nextPostgame?.id
      || latestCompleted?.id
      || chapters.find(chapter => window.Story.chapterDungeons(chapter.id).some(dungeon => window.Story.canEnter(dungeon.id)))?.id
      || chapters[0]?.id
      || null;
    return choices.chapterId;
  }

  function selectedDungeonId(context, partyIndex) {
    const choices = context.explorationChoices[partyIndex] || (context.explorationChoices[partyIndex] = {});
    if (choices.dungeonId && window.GameData.dungeons[choices.dungeonId] && window.Story.canEnter(choices.dungeonId)) return choices.dungeonId;
    const chapterId = selectedChapterId(context, partyIndex);
    const chapterRoutes = window.Story.chapterDungeons(chapterId);
    const clears = window.Story.ensure().facts.clears;
    const first = chapterRoutes.find(dungeon => dungeon.requiredForStory && !clears.includes(dungeon.id) && window.Story.canEnter(dungeon.id))
      || chapterRoutes.find(dungeon => dungeon.requiredForStory && window.Story.canEnter(dungeon.id))
      || chapterRoutes.find(dungeon => window.Story.canEnter(dungeon.id))
      || Object.values(window.GameData.dungeons).find(dungeon => window.Story.canEnter(dungeon.id));
    choices.dungeonId = first?.id || null;
    return choices.dungeonId;
  }

  function selectedDungeon(context, partyIndex) {
    return window.GameData.dungeons[selectedDungeonId(context, partyIndex)] || null;
  }

  function selectedDifficultyId(context, partyIndex, dungeonId) {
    const choices = context.explorationChoices[partyIndex] || (context.explorationChoices[partyIndex] = {});
    const key = `${dungeonId}:difficulty`;
    if (!window.DungeonDifficulty.unlocked(dungeonId, choices[key] || "normal")) choices[key] = "normal";
    return choices[key] || "normal";
  }

  function selectedVariant(context, partyIndex) {
    const dungeon = selectedDungeon(context, partyIndex);
    return dungeon ? window.DungeonDifficulty.variant(dungeon, selectedDifficultyId(context, partyIndex, dungeon.id)) : null;
  }

  function compactResultLoot(result, escape, formatGold) {
    if (!result) return "";
    const drops = Array.isArray(result.drops) ? result.drops : [];
    const equipment = drops.filter(drop => ["weapon", "armor"].includes(window.GameData.items[drop.itemId]?.type));
    const ultraRareDrops = equipment.filter(drop => drop.ultraRareTitleId && window.GameData.ultraRareTitles[drop.ultraRareTitleId]);
    const autoSold = Array.isArray(result.autoSold) ? result.autoSold : [];
    const equipmentNames = [...equipment.map(drop => drop.displayName || window.GameData.items[drop.itemId]?.name), ...autoSold.map(drop => drop.displayName)].filter(Boolean);
    const distinctEquipment = Array.from(new Set(equipmentNames));
    const equipmentCount = equipment.reduce((sum, drop) => sum + (drop.quantity || 1), 0) + autoSold.length;
    const materialTotals = {};
    drops.filter(drop => window.GameData.items[drop.itemId]?.type === "material").forEach(drop => {
      materialTotals[drop.itemId] = (materialTotals[drop.itemId] || 0) + (drop.quantity || 1);
    });
    const materials = Object.entries(materialTotals);
    const materialCount = materials.reduce((sum, [, quantity]) => sum + quantity, 0);
    const experienceAmounts = (Array.isArray(result.experienceGains) ? result.experienceGains : [])
      .map(entry => Number(entry.amount) || 0);
    const minimumExperience = experienceAmounts.length ? Math.min(...experienceAmounts) : (result.exp || 0);
    const maximumExperience = experienceAmounts.length ? Math.max(...experienceAmounts) : (result.exp || 0);
    const experienceText = minimumExperience === maximumExperience
      ? `EXP +${minimumExperience}`
      : `EXP +${minimumExperience}〜${maximumExperience}`;
    function preview(values) {
      const visible = values.slice(0, 2).join("・");
      return visible + (values.length > 2 ? `・ほか${values.length - 2}種` : "");
    }
    const equipmentText = equipmentCount
      ? `装備 ${equipmentCount}点　${preview(distinctEquipment)}${autoSold.length ? `（自動売却 ${autoSold.length}点）` : ""}`
      : "装備なし";
    const materialText = materialCount
      ? `素材 ${materialCount}個　${preview(materials.map(([id, quantity]) => `${window.GameData.items[id].name}×${quantity}`))}`
      : "素材なし";
    function breakdown(kind, text, entries, label) {
      if (!entries.length) return `<span class="${kind}">${escape(text)}</span>`;
      const rows = entries.map(entry => `<li><span>${escape(entry.name)}</span><strong>×${entry.quantity}</strong>${entry.note ? `<small>${escape(entry.note)}</small>` : ""}</li>`).join("");
      return `<details class="fleet-loot-breakdown ${kind}"><summary aria-label="${escape(label)}の内訳を表示"><span>${escape(text)}</span><i aria-hidden="true">⌄</i></summary><ul aria-label="${escape(label)}の全件">${rows}</ul></details>`;
    }
    const equipmentEntries = [
      ...equipment.map(drop => ({
        name: drop.displayName || window.GameData.items[drop.itemId]?.name || drop.itemId,
        quantity: drop.quantity || 1,
        note: [drop.ultraRareTitleId ? `超レア・${window.GameData.ultraRareTitles[drop.ultraRareTitleId]?.name || "固有称号"}` : "", drop.newUltraRareTitle ? "新称号" : "", drop.newDiscovery ? "初発見" : drop.newBest ? "最高品質更新" : ""].filter(Boolean).join("・")
      })),
      ...autoSold.map(drop => ({ name: drop.displayName || window.GameData.items[drop.itemId]?.name || drop.itemId, quantity: 1, note: "自動売却済み" }))
    ];
    const materialEntries = materials.map(([id, quantity]) => ({ name: window.GameData.items[id]?.name || id, quantity, note: "" }));
    const discovery = Array.isArray(result.newItemIds) && result.newItemIds.length ? `<span class="discovery">初発見 ${result.newItemIds.length}種</span>` : "";
    const qualityRecord = Array.isArray(result.newBestQualities) && result.newBestQualities.length ? `<span class="quality-record">最高品質更新 ${result.newBestQualities.length}種</span>` : "";
    const ultraRare = ultraRareDrops.length ? `<span class="ultra-rare">超レア ${ultraRareDrops.length}点</span>` : "";
    const newUltraRare = Array.isArray(result.newUltraRareTitleIds) && result.newUltraRareTitleIds.length ? `<span class="ultra-title">新称号 ${result.newUltraRareTitleIds.length}種</span>` : "";
    const trackedItem = result.trackedItemId ? window.GameData.items[result.trackedItemId] : null;
    const trackedProgress = Number.isInteger(result.trackedItemProgress) && result.trackedItemGoal ? `・累計 ${result.trackedItemProgress}/${result.trackedItemGoal}` : "";
    const tracked = trackedItem && result.trackedItemQuantity > 0 ? `<span class="tracked">目標 +${result.trackedItemQuantity} ${escape(trackedItem.name)}${trackedProgress}</span>` : "";
    return `<div class="fleet-result-loot" aria-label="直近の獲得報酬">${tracked}${ultraRare}${newUltraRare}${discovery}${qualityRecord}<span class="gold">${formatGold(result.gold)}</span><span class="experience">${escape(experienceText)}</span>${breakdown("equipment", equipmentText, equipmentEntries, "獲得装備")}${breakdown("materials", materialText, materialEntries, "獲得素材")}</div>`;
  }

  function compactHistory(history, partyIndex, escape, formatGold) {
    const older = (history || []).slice(1, 4);
    if (!older.length) return "";
    const olderCount = Math.max(0, (history || []).length - 1);
    return `<details class="fleet-history"><summary>過去の帰還 ${olderCount}件</summary><div>${older.map(entry => {
      const dungeon = window.DungeonDifficulty.variant(entry.dungeonId, entry.difficultyId || "normal");
      const equipmentCount = entry.equipment.reduce((sum, item) => sum + item.quantity, 0);
      const materialCount = entry.materials.reduce((sum, item) => sum + item.quantity, 0);
      const equipmentNames = Array.from(new Set(entry.equipment.map(item => item.name))).slice(0, 2).join("・");
      const materialNames = entry.materials.slice(0, 2).map(item => `${window.GameData.items[item.itemId].name}×${item.quantity}`).join("・");
      return `<article class="fleet-history-entry ${entry.success ? "success" : "failure"}"><span>${entry.success ? "成功" : "撤退"}</span><strong>${escape(dungeon.name)}</strong><small>${formatGold(entry.gold)}／EXP +${entry.exp}</small><p>${equipmentCount ? `装備${equipmentCount}点 ${escape(equipmentNames)}` : "装備なし"}　${materialCount ? `素材${materialCount}個 ${escape(materialNames)}` : "素材なし"}</p></article>`;
    }).join("")}<button class="fleet-history-open" data-action="party-open" data-party="${partyIndex}" data-view="history">遠征履歴を開く（${(history || []).length}/10件）</button></div></details>`;
  }

  function currentPartySetup(partyIndex) {
    return window.Party.members(partyIndex).map((member, position) => {
      const equipment = member.equipment.map(id => window.Items.getInstance(id)).filter(Boolean);
      return {
        id: member.id, name: member.name, jobId: member.jobId || "warrior", level: member.level, position,
        actionRates: window.Characters.actionRates(member),
        equipmentCount: equipment.length,
        equipmentNames: equipment.slice(0, 8).map(instance => window.Items.displayName(instance)),
        equipmentWeight: window.Characters.equipmentWeight(member),
        maximumWeight: window.Characters.maxWeight(member)
      };
    });
  }

  function setupDifferences(recorded, current, afterLabel = "現在") {
    const currentById = new Map(current.map(member => [member.id, member]));
    const differences = [];
    recorded.forEach(before => {
      const after = currentById.get(before.id);
      if (!after) {
        differences.push({ name: before.name, facts: [`${afterLabel}のパーティには所属していない`] });
        return;
      }
      currentById.delete(before.id);
      const facts = [];
      if (before.position !== after.position) facts.push(`隊列 ${before.position + 1}列→${after.position + 1}列`);
      if (before.jobId !== after.jobId) {
        const beforeJob = window.GameData.jobs[before.jobId]?.name || before.jobId;
        const afterJob = window.GameData.jobs[after.jobId]?.name || after.jobId;
        facts.push(`職業 ${beforeJob}→${afterJob}`);
      }
      if (before.level !== after.level) facts.push(`Lv.${before.level}→${after.level}`);
      if (before.equipmentWeight !== after.equipmentWeight || before.maximumWeight !== after.maximumWeight) {
        facts.push(`重量 ${before.equipmentWeight}/${before.maximumWeight}→${after.equipmentWeight}/${after.maximumWeight}`);
      }
      const beforeEquipment = before.equipmentNames.join("\u0000"), afterEquipment = after.equipmentNames.join("\u0000");
      if (before.equipmentCount !== after.equipmentCount) facts.push(`装備 ${before.equipmentCount}→${after.equipmentCount}点`);
      if (beforeEquipment !== afterEquipment) facts.push("装備内容変更");
      const rateLabels = { healing: "回", spell: "呪", technique: "技", attack: "攻" };
      const changedRates = Object.keys(rateLabels).filter(key => before.actionRates[key] !== after.actionRates[key]);
      if (changedRates.length) facts.push(`行動率 ${changedRates.map(key => `${rateLabels[key]}${before.actionRates[key]}→${after.actionRates[key]}%`).join("・")}`);
      if (facts.length) differences.push({ name: after.name, facts });
    });
    currentById.forEach(member => differences.push({ name: member.name, facts: [`${afterLabel}の${member.position + 1}列目に加入`] }));
    return differences;
  }

  function sameExpeditionConditions(a, b) {
    return a.dungeonId === b.dungeonId
      && (a.difficultyId || "normal") === (b.difficultyId || "normal")
      && (a.timeMultiplier || 1) === (b.timeMultiplier || 1);
  }

  function historyBattleComparison(before, after) {
    const number = value => Number(value || 0).toLocaleString("ja-JP");
    const hit = summary => `${number(summary.attackHits)}/${number(summary.attackAttempts)}${summary.attackAttempts ? `（${Math.round(summary.attackHits / summary.attackAttempts * 100)}%）` : ""}`;
    return [
      ["到達", `${number(before.encountersCleared)}/${number(before.totalEncounters)}戦`, `${number(after.encountersCleared)}/${number(after.totalEncounters)}戦`],
      ["討伐", `${number(before.monstersDefeated)}体`, `${number(after.monstersDefeated)}体`],
      ["命中", hit(before), hit(after)],
      ["与ダメージ", number(before.damageDealt), number(after.damageDealt)],
      ["被ダメージ", number(before.damageTaken), number(after.damageTaken)],
      ["回復", number(before.healingDone), number(after.healingDone)],
      ["戦闘不能", `${number(before.knockouts)}人`, `${number(after.knockouts)}人`]
    ];
  }

  function history(context) {
    const { escape, formatGold } = context;
    const partyIndex = window.Party.selected();
    const entries = window.GameState.data.partyHistory?.[partyIndex] || [];
    if (!entries.length) return `<section class="panel party-history-page"><div class="notice muted"><span class="notice-icon">◇</span><div><strong>遠征履歴はまだありません</strong><p>探索から帰還すると、この隊の記録が最大10件まで残ります。</p></div></div></section>`;
    const currentSetup = currentPartySetup(partyIndex);
    const records = entries.map((entry, index) => {
      const dungeon = window.DungeonDifficulty.variant(entry.dungeonId, entry.difficultyId || "normal");
      const completed = new Date(entry.completedAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
      const battle = entry.battle;
      const equipmentCount = entry.equipment.reduce((sum, item) => sum + item.quantity, 0);
      const materialCount = entry.materials.reduce((sum, item) => sum + item.quantity, 0);
      const battleSummary = battle
        ? `<div class="party-history-battle"><span>到達 <strong>${battle.encountersCleared}/${battle.totalEncounters}戦</strong></span><span>討伐 <strong>${battle.monstersDefeated}体</strong></span><span>命中 <strong>${battle.attackHits}/${battle.attackAttempts}</strong></span><span>与 <strong>${battle.damageDealt.toLocaleString("ja-JP")}</strong></span><span>被 <strong>${battle.damageTaken.toLocaleString("ja-JP")}</strong></span><span>回復 <strong>${battle.healingDone.toLocaleString("ja-JP")}</strong></span><span>戦闘不能 <strong>${battle.knockouts}人</strong></span></div>`
        : `<p class="small-note">この帰還時点では詳細戦績を保存していません。</p>`;
      const setup = Array.isArray(entry.partySetup) && entry.partySetup.length
        ? `<details class="party-history-setup"><summary>遠征時の編成 ${entry.partySetup.length}人</summary><div>${entry.partySetup.map(member => {
          const job = window.GameData.jobs[member.jobId]?.name || "冒険者", rates = member.actionRates;
          const omitted = Math.max(0, member.equipmentCount - member.equipmentNames.length);
          const equipment = member.equipmentNames.length ? member.equipmentNames.map(escape).join("・") + (omitted ? `・ほか${omitted}点` : "") : "装備なし";
          return `<article><span>${member.position + 1}</span><div><strong>${escape(member.name)}</strong><small>${escape(job)} · Lv.${member.level} · 重量 ${member.equipmentWeight}/${member.maximumWeight}</small><p>${equipment}</p></div><small>回${rates.healing}% → 呪${rates.spell}% → 技${rates.technique}% → 攻${rates.attack}%</small></article>`;
        }).join("")}</div></details>`
        : `<p class="small-note">この帰還時点では遠征時の編成を保存していません。</p>`;
      const differences = Array.isArray(entry.partySetup) && entry.partySetup.length ? setupDifferences(entry.partySetup, currentSetup) : [];
      const comparison = Array.isArray(entry.partySetup) && entry.partySetup.length
        ? `<details class="party-history-changes"><summary>出撃時と現在の差 <span>${differences.length ? `${differences.length}人` : "変更なし"}</span></summary>${differences.length ? `<ul>${differences.map(change => `<li><strong>${escape(change.name)}</strong><span>${change.facts.map(escape).join("・")}</span></li>`).join("")}</ul>` : `<p>隊列、職業、レベル、行動率、装備、重量に変更はありません。</p>`}</details>`
        : "";
      const previous = entry.battle ? entries.slice(index + 1).find(candidate => sameExpeditionConditions(entry, candidate) && candidate.battle) : null;
      const previousSetupDifferences = previous && Array.isArray(previous.partySetup) && previous.partySetup.length && Array.isArray(entry.partySetup) && entry.partySetup.length
        ? setupDifferences(previous.partySetup, entry.partySetup, "今回") : [];
      const previousBattleRows = previous ? historyBattleComparison(previous.battle, entry.battle) : [];
      const previousComparison = previous
        ? `<details class="party-history-attempt"><summary>同条件の前回との差 <span>${previousSetupDifferences.length ? `編成変更 ${previousSetupDifferences.length}人` : "編成変更なし"}</span></summary><div><small>前回 ${new Date(previous.completedAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small><div class="party-history-attempt-battle">${previousBattleRows.map(([label, oldValue, newValue]) => `<span><small>${label}</small><strong>${oldValue} → ${newValue}</strong></span>`).join("")}</div>${previousSetupDifferences.length ? `<ul>${previousSetupDifferences.map(change => `<li><strong>${escape(change.name)}</strong><span>${change.facts.map(escape).join("・")}</span></li>`).join("")}</ul>` : `<p>隊列、職業、レベル、行動率、装備、重量に変更はありません。</p>`}</div></details>`
        : "";
      const equipment = entry.equipment.length ? entry.equipment.map(item => `<li><span>${escape(item.name)}</span><strong>×${item.quantity}${item.autoSold ? "・売却済" : ""}</strong></li>`).join("") : "<li>装備なし</li>";
      const materials = entry.materials.length ? entry.materials.map(item => `<li><span>${escape(window.GameData.items[item.itemId]?.name || item.itemId)}</span><strong>×${item.quantity}</strong></li>`).join("") : "<li>素材なし</li>";
      return `<details class="party-history-record ${entry.success ? "success" : "failure"}" ${index === 0 ? "open" : ""}><summary><span class="party-history-mark">${entry.success ? "勝" : "退"}</span><span class="party-history-name"><small>${index === 0 ? "最新の帰還" : completed} · ${entry.timeMultiplier || 1}倍探索</small><strong>${escape(dungeon.name)}</strong></span><span class="party-history-reward"><strong>${formatGold(entry.gold)}</strong><small>EXP +${entry.exp}</small></span><span class="record-chevron" aria-hidden="true">›</span></summary><div class="party-history-detail">${battleSummary}${previousComparison}${setup}${comparison}<div class="party-history-loot"><section><strong>装備 ${equipmentCount}点</strong><ul>${equipment}</ul></section><section><strong>素材 ${materialCount}個</strong><ul>${materials}</ul></section></div></div></details>`;
    }).join("");
    return `<section class="panel party-history-page"><div class="section-heading"><div><span class="label">EXPEDITION HISTORY</span><h3>遠征履歴</h3><p>新しい順に最大10件。詳細戦績は実際の戦闘記録を集計しています。</p></div><button class="button primary" data-action="party-view" data-view="results" ${window.Party.result(partyIndex) ? "" : "disabled"}>直近ログを開く</button></div><div class="party-history-list">${records}</div></section>`;
  }

  function overview(context) {
    const { escape, explorationChoices, formatGold, partyOverviewFilter = "all", portraitImage, time } = context;
    const selected = window.Party.selected(), state = window.GameState.data;
    const trackedTarget = window.Encyclopedia.trackedTarget();
    const trackedItem = trackedTarget ? window.GameData.items[trackedTarget.itemId] : null;
    const trackedSources = trackedItem ? window.Encyclopedia.itemAcquisitionSources(trackedItem.id) : null;
    const targetPartyIndexes = Array.from({ length: window.Party.limit() }, (_, index) => index).filter(index => !window.Party.expedition(index) && window.Party.members(index).length);
    const targetRouteMap = new Map();
    function addTargetRoute(dungeonId, difficultyId) {
      if (!window.Story.canEnter(dungeonId) || !window.DungeonDifficulty.unlocked(dungeonId, difficultyId)) return;
      const current = targetRouteMap.get(dungeonId);
      const rank = window.DungeonDifficulty.ids().indexOf(difficultyId);
      if (!current || rank < current.rank) targetRouteMap.set(dungeonId, { dungeonId, difficultyId, rank });
    }
    trackedSources?.treasures.forEach(source => addTargetRoute(source.dungeonId, "normal"));
    trackedSources?.monsters.forEach(source => addTargetRoute(source.dungeonId, source.difficultyId));
    const targetRoutes = Array.from(targetRouteMap.values());
    const targetRecipeIds = trackedItem ? window.GameData.recipes
      .filter(recipe => Object.prototype.hasOwnProperty.call(recipe.materials, trackedItem.id) && window.Blacksmith.status(recipe) !== "locked")
      .map(recipe => recipe.id) : [];
    const targetRouteButtons = targetRoutes.slice(0, 4).map(route => {
      const variant = window.DungeonDifficulty.variant(route.dungeonId, route.difficultyId);
      return `<button class="fleet-target-route" data-action="open-target-destination" data-dungeon="${route.dungeonId}" data-difficulty="${route.difficultyId}" ${targetPartyIndexes.length ? "" : "disabled"}>${escape(variant.name)}</button>`;
    }).join("");
    const targetRouteList = targetRoutes.length ? `<nav class="fleet-target-routes" aria-label="探索目標の入手記録がある探索地">${targetRouteButtons}${targetRoutes.length > 4 ? `<span>ほか${targetRoutes.length - 4}か所</span>` : ""}</nav>` : `<span class="fleet-target-no-route">挑戦可能な探索地の記録はまだありません</span>`;
    const targetComplete = trackedTarget && trackedTarget.progress >= trackedTarget.quantity;
    const targetRecipeButton = targetRecipeIds.length ? `<button class="button ${targetComplete ? "primary" : "ghost"}" data-action="open-target-recipes" data-recipes="${escape(targetRecipeIds.join(","))}">${targetComplete ? "製作へ" : "関連レシピ"}</button>` : "";
    const targetStrip = trackedItem ? `<section class="fleet-target-strip ${targetComplete ? "is-complete" : ""}"><span class="fleet-target-icon" aria-hidden="true">${escape(trackedItem.icon || "◇")}</span><div><small>現在の探索目標</small><strong>${escape(trackedItem.name)}</strong><span>${targetComplete ? "達成" : "収集中"} ${trackedTarget.progress}/${trackedTarget.quantity}・入手記録のある探索地 ${targetRoutes.length}か所</span><i><b style="width:${Math.min(100, trackedTarget.progress / trackedTarget.quantity * 100)}%"></b></i>${targetRouteList}</div><div>${targetRecipeButton}<button class="button ghost" data-action="open-item-codex">図鑑で変更</button></div></section>` : "";
    const readyPartyCount = Array.from({ length: window.Party.limit() }, (_, index) => index)
      .filter(index => !window.Party.expedition(index) && window.Party.members(index).length && window.Party.plan(index)).length;
    const visiblePartyCount = Math.min(window.Party.maximum(), window.Party.limit() + 1);
    const hiddenPartyCount = window.Party.maximum() - visiblePartyCount;
    const partyCounts = {
      all: window.Party.limit(),
      exploring: Array.from({ length: window.Party.limit() }, (_, index) => index).filter(index => window.Party.expedition(index)).length,
      waiting: Array.from({ length: window.Party.limit() }, (_, index) => index).filter(index => !window.Party.expedition(index)).length,
      reports: Array.from({ length: window.Party.limit() }, (_, index) => index).filter(index => state.partyResults[index]).length
    };
    const unreadReports = window.Party.unreadResultCount();
    const visibleIndexes = Array.from({ length: visiblePartyCount }, (_, index) => index).filter(index => {
      if (index >= window.Party.limit()) return partyOverviewFilter === "all";
      if (partyOverviewFilter === "exploring") return Boolean(window.Party.expedition(index));
      if (partyOverviewFilter === "waiting") return !window.Party.expedition(index);
      if (partyOverviewFilter === "reports") return Boolean(state.partyResults[index]);
      return true;
    });
    if (partyOverviewFilter === "exploring") {
      visibleIndexes.sort((left, right) => Number(window.Party.expedition(left)?.endsAt || Infinity) - Number(window.Party.expedition(right)?.endsAt || Infinity) || left - right);
    } else if (partyOverviewFilter === "waiting") {
      const readiness = index => {
        const hasMembers = window.Party.members(index).length > 0;
        if (hasMembers && window.Party.plan(index)) return 0;
        return hasMembers ? 1 : 2;
      };
      visibleIndexes.sort((left, right) => readiness(left) - readiness(right) || left - right);
    } else if (partyOverviewFilter === "reports") {
      visibleIndexes.sort((left, right) => {
        const leftResult = state.partyResults[left], rightResult = state.partyResults[right];
        const unreadDifference = Number(rightResult?.viewed !== true) - Number(leftResult?.viewed !== true);
        return unreadDifference || Number(rightResult?.completedAt || 0) - Number(leftResult?.completedAt || 0) || left - right;
      });
    }
    const rows = visibleIndexes.map(index => {
      const unlocked = index < window.Party.limit(), active = index === selected;
      if (!unlocked) {
        const slot = index + 1;
        const entry = window.GameData.partyProgression.partySlots.unlocks.find(candidate => candidate.slot === slot);
        const available = slot === window.Party.limit() + 1 && slot <= window.Party.availableLimit();
        const cost = entry ? `${formatGold(entry.gold)}・ギルド印章 ${entry.seals}` : "今後の物語で解放";
        return `<article class="party-overview-row is-locked" data-party-overview="${index}"><div><strong>第${slot}パーティ</strong><span class="fleet-status">${available ? "増設可能" : "未解放"}</span></div><div><p class="small-note">${available ? `増設費用：${cost}` : entry?.codeOnly ? "設定で追加パーティ増設権のコードを解放" : `第${entry?.chapterNumber || slot - 1}章クリアで増設権を獲得`}</p>${available ? `<button class="button primary" data-action="unlock-party" data-party="${index}">第${slot}パーティを増設</button>` : ""}</div></article>`;
      }
      const expedition = window.Party.expedition(index), result = state.partyResults[index];
      const members = window.Party.members(index);
      const status = expedition ? "探索中" : !members.length ? "未編成" : result ? (result.success ? "攻略成功" : "撤退") : "待機中";
      const resultState = !expedition && result ? (result.success ? "success" : "failure") : "";
      const unreadResult = Boolean(result && result.viewed !== true);
      const percent = expedition ? Math.min(100, Math.max(0, (window.GameRuntime.now() - expedition.startedAt) / (expedition.endsAt - expedition.startedAt) * 100)) : 0;
      const destination = selectedVariant(context, index), multiplier = destination ? (explorationChoices[index][destination.baseDungeonId] || 1) : 1;
      const activeDungeon = expedition ? window.DungeonDifficulty.variant(expedition.dungeonId, expedition.difficultyId || "normal") : null;
      const journey = expedition ? `<div class="fleet-journey" data-expedition="${index}"><strong>${escape(activeDungeon.name)} · ${expedition.timeMultiplier}倍探索</strong><span>残り <strong class="fleet-timer" data-countdown="${index}">${time(window.Dungeon.remaining(index))}</strong></span><div class="progress"><i style="width:${percent}%"></i></div><small>時間経過 <span data-overview-percent>${Math.floor(percent)}</span>%</small></div>` : `<div class="fleet-journey"><strong>${members.length && destination ? `攻略先：${escape(destination.name)} · ${multiplier}倍探索` : members.length ? "攻略先を設定してください" : "仲間を加えてパーティを編成"}</strong>${result ? `<small><span class="fleet-result-mark ${resultState}">${result.success ? "攻略成功" : "撤退"}</span>${escape(result.dungeonName || window.GameData.dungeons[result.dungeonId].name)}</small>${compactResultLoot(result, escape, formatGold)}${compactHistory(state.partyHistory[index], index, escape, formatGold)}` : "<small>探索記録なし</small>"}</div>`;
      const memberStrip = members.length ? members.map((member, position) => {
        const stat = window.Characters.stats(member);
        return `<span class="fleet-member"><span class="fleet-member-level">Lv.${member.level}</span>${portraitImage(member, true)}<strong>${escape(member.name)}</strong><small>HP ${stat.hp}</small><i>${position + 1}</i></span>`;
      }).join("") : `<span class="fleet-empty-member">メンバーなし</span>`;
      const partyName = window.Party.name(index);
      const memberLimit = window.Party.memberLimit(), vacancies = Math.max(0, memberLimit - members.length);
      const matchingPreset = window.Presets.slots().find((preset, slot) => preset && window.Presets.matches(slot, index));
      const changedPreset = matchingPreset ? null : window.Presets.slots().find((preset, slot) => preset && window.Presets.lineupMatches(slot, index));
      const presetState = matchingPreset ? `保存「${escape(matchingPreset.name)}」` : changedPreset ? `保存「${escape(changedPreset.name)}」と差あり` : "";
      const presetLink = presetState ? `<button class="fleet-preset-link ${changedPreset ? "is-changed" : ""}" data-action="open-party-presets" data-party="${index}" aria-label="${escape(partyName)}の編成プリセットを開く">${presetState}</button>` : "";
      const partyPower = Math.round(window.Party.power(index)).toLocaleString("ja-JP");
      return `<article class="party-overview-row ${active ? "is-selected" : ""} ${expedition ? "is-exploring" : result ? `is-last-${resultState}` : ""} ${unreadResult ? "has-unread-result" : ""}" data-party-overview="${index}"><div class="fleet-party"><button class="fleet-party-select" data-action="rename-party" data-party="${index}" aria-label="${escape(partyName)}の名前を変更"><span>${escape(partyName)}</span><i aria-hidden="true">✎</i></button><span class="fleet-status ${expedition ? "exploring" : resultState}">${status}</span>${unreadResult ? '<span class="fleet-new-result">NEW</span>' : ""}<div class="fleet-party-meta" aria-label="第${index + 1}隊の編成情報"><span>第${index + 1}隊</span><span>${members.length}/${memberLimit}人</span><span>${vacancies ? `空き${vacancies}` : "満員"}</span><span>戦力 ${partyPower}</span>${presetLink}</div><div class="fleet-member-strip">${memberStrip}</div></div>${journey}<div class="fleet-actions"><button class="button ghost" data-action="party-open" data-party="${index}" data-view="formation" aria-label="${escape(partyName)}を編成する">パーティを編成する</button>${expedition ? `<button class="button ghost" data-action="party-open" data-party="${index}" data-view="adventure" aria-label="${escape(partyName)}の探索ログ">探索ログ</button>` : `<button class="button primary" data-action="quick-start-party" data-party="${index}" aria-label="${escape(partyName)}を${destination ? escape(destination.name) : "設定した攻略先"}へ出撃" ${!members.length || !destination ? "disabled" : ""}>出撃</button>`}<button class="button secondary ${unreadResult ? "has-notice" : ""}" data-action="party-open" data-party="${index}" data-view="results" aria-label="${escape(partyName)}の直近ログ${unreadResult ? "・未読" : ""}" ${!result ? "disabled" : ""}>直近ログ${unreadResult ? "・新着" : ""}</button></div></article>`;
    }).join("");
    const stateFilters = `<nav class="fleet-state-filters" aria-label="パーティの状態で絞り込み">${[["all", "全隊"], ["exploring", "探索中"], ["waiting", "待機中"], ["reports", "報告あり"]].map(([id, label]) => {
      const unread = id === "reports" ? unreadReports : 0;
      return `<button class="${partyOverviewFilter === id ? "is-active" : ""}${unread ? " has-unread" : ""}" data-action="party-overview-filter" data-filter="${id}" aria-pressed="${partyOverviewFilter === id}">${label} ${partyCounts[id]}${unread ? `<i aria-label="未読${unread}件">新${unread}</i>` : ""}</button>`;
    }).join("")}</nav>`;
    const emptyRows = rows || `<div class="fleet-filter-empty"><strong>該当するパーティはありません</strong><button class="button ghost" data-action="party-overview-filter" data-filter="all">全隊を表示</button></div>`;
    const futureSlots = partyOverviewFilter === "all" && hiddenPartyCount ? `<div class="fleet-future-slots"><span aria-hidden="true">＋</span><div><strong>さらに${hiddenPartyCount}枠のパーティを増設できます</strong><small>章を進めると、次の増設候補が順番に表示されます。第8枠はコード特典です。</small></div></div>` : "";
    return `<section class="panel party-overview"><div class="section-heading fleet-overview-heading"><div><span class="label">ADVENTURE PARTIES</span><h3>冒険の準備</h3></div><div class="fleet-overview-actions"><strong>${window.Dungeon.activeCount()}/${window.Party.limit()}隊が探索中</strong><button class="button primary" data-action="depart-ready-parties" ${readyPartyCount ? "" : "disabled"}>待機隊を一斉出撃${readyPartyCount ? ` (${readyPartyCount})` : ""}</button></div></div>${targetStrip}${stateFilters}<div class="fleet-list">${emptyRows}</div>${futureSlots}<p class="small-note">一斉出撃は、編成済みで攻略先を保存してある待機隊だけを、押した時にまとめて出発させます。自動で再出撃はしません。個別の編成は「パーティを編成する」、進行中の記録は「探索ログ」、前回の結果は「直近ログ」から確認できます。</p></section>`;
  }

  function adventure(context) {
    const { activeJournalPanel, departureSummary, empty, escape, explorationChoices, time } = context;
    if (!window.Party.members().length) return empty("出撃する仲間を選んでください", "まず編成画面で冒険者を加えてください。", '<button class="button primary" data-action="party-view" data-view="formation">編成へ</button>');
    const expedition = window.Party.expedition();
    if (expedition) return `<section class="party-live-summary"><span>探索中</span><strong>${escape(window.DungeonDifficulty.variant(expedition.dungeonId, expedition.difficultyId || "normal").name)}</strong><small>帰還まで <b data-countdown="${window.Party.selected()}">${time(window.Dungeon.remaining())}</b></small></section>${departureSummary()}${activeJournalPanel(expedition)}`;
    const destination = selectedVariant(context, window.Party.selected());
    const multiplier = destination ? (explorationChoices[window.Party.selected()][destination.baseDungeonId] || 1) : 1;
    const trackedTarget = window.Encyclopedia.trackedTarget();
    const tracked = trackedTarget ? window.GameData.items[trackedTarget.itemId] : null;
    const trackedGuide = tracked ? `<section class="tracked-loot-guide ${trackedTarget.progress >= trackedTarget.quantity ? "is-complete" : ""}"><span>探索目標</span><strong>${escape(tracked.icon || "◇")} ${escape(tracked.name)}</strong><small>${trackedTarget.progress >= trackedTarget.quantity ? "達成済み" : "収集中"} ${trackedTarget.progress}/${trackedTarget.quantity}・過去の入手記録がある攻略先に印を付けています。</small></section>` : "";
    return `${departureSummary()}<section class="departure-selection-bar"><div><span>選択中の攻略先</span><strong>${destination ? `${escape(destination.name)} · ${multiplier}倍探索` : "攻略先を選択してください"}</strong></div><button class="button primary" data-action="quick-start-party" data-party="${window.Party.selected()}" ${destination ? "" : "disabled"}>この攻略先へ出撃</button></section><div class="section-heading route-selection-heading"><div><span class="label">DESTINATION</span><h3>攻略先を選択</h3></div></div><p class="small-note">章を切り替えて攻略先を選びます。探索時間が長いほど連戦・報酬が増えますが、時間あたりの報酬は等倍が有利です。</p>${trackedGuide}${chapterNavigator(context)}${dungeonCards(context)}`;
  }

  function chapterNavigator(context) {
    const { escape } = context;
    const partyIndex = window.Party.selected();
    const activeId = selectedChapterId(context, partyIndex);
    const story = window.Story.ensure();
    const chapters = routeChapters();
    const activeIndex = Math.max(0, chapters.findIndex(chapter => chapter.id === activeId));
    const start = Math.max(0, Math.min(activeIndex - 2, chapters.length - 5));
    const visible = chapters.slice(start, start + 5);
    function status(chapter) {
      const routes = window.Story.chapterDungeons(chapter.id).filter(dungeon => dungeon.requiredForStory);
      const cleared = routes.filter(dungeon => story.facts.clears.includes(dungeon.id)).length;
      const enterable = window.Story.chapterDungeons(chapter.id).some(dungeon => window.Story.canEnter(dungeon.id));
      const complete = story.completed.includes(chapter.id);
      return { routes, cleared, enterable, complete };
    }
    const options = chapters.map(chapter => {
      const state = status(chapter);
      return `<option value="${chapter.id}" ${activeId === chapter.id ? "selected" : ""}>${escape(chapter.title)} — ${state.cleared}/${state.routes.length}${state.complete ? " 達成" : state.enterable ? " 攻略中" : " 未解放"}</option>`;
    }).join("");
    const tabs = visible.map(chapter => {
      const { routes, cleared, enterable, complete } = status(chapter);
      const shortTitle = chapter.title.split("：")[0];
      return `<button class="route-chapter-tab ${activeId === chapter.id ? "is-active" : ""} ${complete ? "is-complete" : ""} ${enterable ? "" : "is-locked"}" data-action="select-dungeon-chapter" data-chapter="${chapter.id}" aria-pressed="${activeId === chapter.id}"><strong>${escape(shortTitle)}</strong><span>${cleared}/${routes.length}${complete ? " 達成" : enterable ? " 攻略中" : " 未解放"}</span></button>`;
    }).join("");
    return `<div class="route-chapter-navigator"><label class="route-chapter-select"><span>攻略する章</span><select data-dungeon-chapter-select aria-label="攻略する章を選択">${options}</select></label><nav class="route-chapter-tabs" aria-label="現在章付近の章">${tabs}</nav><small>${start + 1}〜${start + visible.length} / ${chapters.length}章を表示</small></div>`;
  }

  function dungeonCards(context) {
    const { dungeonIntel, escape, explorationChoices, itemName } = context;
    const busy = Boolean(window.Party.expedition());
    const partyIndex = window.Party.selected();
    const selectedId = selectedDungeonId(context, partyIndex);
    const chapterId = selectedChapterId(context, partyIndex);
    const chapter = window.GameData.storyChapters.find(candidate => candidate.id === chapterId);
    const postgame = chapter?.kind === "postgame";
    const routes = window.Story.chapterDungeons(chapterId);
    const mainRoutes = routes.filter(dungeon => dungeon.requiredForStory);
    const optionalRoutes = routes.filter(dungeon => !dungeon.requiredForStory);
    const clears = window.Story.ensure().facts.clears;
    const clearedMain = mainRoutes.filter(dungeon => clears.includes(dungeon.id)).length;
    const nextRoute = mainRoutes.find(dungeon => !clears.includes(dungeon.id) && window.Story.canEnter(dungeon.id));
    const trackedItemId = window.Encyclopedia.trackedItem();
    const trackedItem = trackedItemId ? window.GameData.items[trackedItemId] : null;
    const trackedSources = trackedItem ? window.Encyclopedia.itemAcquisitionSources(trackedItemId) : null;
    function routeCards(group) { return group.map((dungeon, index) => {
      const emblem = dungeon.color === "green" ? "♧" : dungeon.color === "blue" ? "◭" : "⌘";
      const routeNumber = dungeon.requiredForStory ? String(dungeon.orderInChapter).padStart(2, "0") : String(index + 1).padStart(2, "0");
      const routeLabel = postgame ? `星後遠征 ${routeNumber}` : dungeon.requiredForStory ? `本編 ${routeNumber}` : `任意高難度 ${routeNumber}`;
      if (!window.Story.canEnter(dungeon.id)) return `<article class="dungeon-card compact-route locked-dungeon ${dungeon.color}"><div class="dungeon-route-summary"><span class="dungeon-route-emblem" aria-hidden="true">${emblem}</span><div class="dungeon-route-name"><span>${routeLabel}</span><h3>${escape(dungeon.name)}</h3><p>${escape(dungeon.description)}</p></div><span class="badge">未解放</span></div><div class="dungeon-route-locked"><p class="story-lock-condition">${escape(window.Story.dungeonCondition(dungeon.id))}</p><button class="button ghost" data-nav="home">物語を確認</button></div></article>`;
      const difficultyId = selectedDifficultyId(context, partyIndex, dungeon.id);
      const variant = window.DungeonDifficulty.variant(dungeon, difficultyId);
      const trackedTreasure = trackedSources?.treasures.some(source => source.dungeonId === dungeon.id);
      const trackedMonsters = trackedSources?.monsters.filter(source => source.dungeonId === dungeon.id && source.difficultyId === difficultyId) || [];
      const trackedHere = trackedTreasure || trackedMonsters.length > 0;
      const trackedClue = [trackedTreasure ? "宝箱" : "", trackedMonsters.length ? `${new Set(trackedMonsters.map(source => source.monsterId)).size}種の魔物` : ""].filter(Boolean).join("・");
      const trackedBadge = trackedHere ? `<p class="tracked-loot-match"><span>探索目標の記録あり</span><strong>${escape(trackedItem.icon || "◇")} ${escape(trackedItem.name)}</strong><small>${escape(trackedClue)}</small></p>` : "";
      const lootTier = window.MonsterLoot ? Math.max(...window.MonsterLoot.standardPool(variant).map(item => item.tier || 1)) : 1;
      const drops = `討伐した魔物の分類に応じたTier ${lootTier}前後の装備。素材と固有品は魔物ごとに異なる。`;
      const monsterIds = Array.from(new Set(dungeon.encounters.flatMap(encounter => encounter.groups.flat())));
      const monsters = monsterIds.map(id => window.DungeonDifficulty.monster(id, difficultyId));
      const monsterPreview = monsters.map(monster => { const record = window.Encyclopedia.monster(monster.id); return `<span class="monster-chip ${monster.boss && record ? "boss" : ""}">${record ? `${monster.icon} ${escape(monster.name)}` : "？ 未確認"}</span>`; }).join("") + dungeonIntel(dungeon, monsters);
      const selected = dungeon.id === selectedId;
      const multiplier = explorationChoices[window.Party.selected()][dungeon.id] || 1;
      const cleared = window.DungeonDifficulty.cleared(dungeon.id, difficultyId);
      const firstClearReward = !cleared ? window.DungeonDifficulty.firstClearReward(difficultyId) : null;
      const firstClearText = firstClearReward ? [firstClearReward.gold ? `${firstClearReward.gold.toLocaleString("ja-JP")} G` : "", ...Object.entries(firstClearReward.materials).map(([id, quantity]) => `${itemName(id)}×${quantity}`)].filter(Boolean).join("・") : "";
      const difficultyButtons = window.DungeonDifficulty.ids().map(id => {
        const tier = window.DungeonDifficulty.tier(id), unlocked = window.DungeonDifficulty.unlocked(dungeon.id, id), done = window.DungeonDifficulty.cleared(dungeon.id, id);
        return `<button class="dungeon-difficulty-option ${id === difficultyId ? "is-active" : ""} ${done ? "is-cleared" : ""}" data-action="select-dungeon-difficulty" data-dungeon="${dungeon.id}" data-difficulty="${id}" ${busy || !unlocked ? "disabled" : ""}><strong>${tier.name}</strong><small>${done ? "攻略済" : unlocked ? "挑戦可能" : "未解放"}</small></button>`;
      }).join("") + trackedBadge;
      return `<article class="dungeon-card compact-route route-choice ${selected ? "is-selected" : ""} ${nextRoute?.id === dungeon.id ? "is-next-route" : ""} ${cleared ? "is-cleared" : ""} ${dungeon.color}"><div class="dungeon-difficulty-selector" aria-label="${escape(dungeon.name)}の難易度">${difficultyButtons}</div><div class="dungeon-route-summary"><span class="dungeon-route-emblem" aria-hidden="true">${emblem}</span><div class="dungeon-route-name"><span>推奨Lv.${variant.recommendedLevel} · ${routeLabel}${cleared ? " · 攻略済" : nextRoute?.id === dungeon.id && difficultyId === "normal" ? " · 次の攻略先" : ""}</span><h3>${escape(variant.name)}</h3><p>${escape(dungeon.description)}</p></div><div class="dungeon-route-metrics"><span><small>基本時間</small><strong>${variant.duration}秒</strong></span><span><small>戦闘</small><strong>${variant.encounters.length}戦</strong></span></div></div>${firstClearText ? `<p class="difficulty-first-clear"><span>初回踏破</span><strong>${escape(firstClearText)}</strong></p>` : ""}<div class="dungeon-route-controls"><label for="exploration-${dungeon.id}"><span>探索時間</span><select id="exploration-${dungeon.id}" data-exploration-dungeon="${dungeon.id}" ${busy ? "disabled" : ""}>${[1, 2, 3, 4, 5, 6].map(value => `<option value="${value}" ${value === multiplier ? "selected" : ""}>${value}倍 · ${variant.duration * value}秒 · ${variant.encounters.length * value}戦</option>`).join("")}</select></label><button class="button ${selected ? "secondary" : "primary"}" data-action="select-dungeon" data-dungeon="${dungeon.id}" ${busy ? "disabled" : ""}>${selected ? "選択中" : "選択する"}</button></div><details class="dungeon-details" data-detail="route-${dungeon.id}"><summary>依頼・噂・現地記録を見る</summary><div class="dungeon-route-detail-grid"><div><h4>確認された気配</h4><div class="monster-preview">${monsterPreview}</div></div><div><h4>主な発見物</h4><p>${escape(drops)}</p><h4>探索時間と報酬</h4><p class="small-note">${multiplier}倍探索は${variant.encounters.length * multiplier}戦。${window.DungeonDifficulty.tier(difficultyId).name}では基本探索時間と敵の強さ、報酬が変化します。</p></div></div></details></article>`;
    }).join(""); }
    if (!chapter) return `<p class="small-note">攻略できる章がありません。</p>`;
    const progressLabel = postgame ? "領域踏破" : "本編攻略";
    const groupLabel = postgame ? "星後遠征" : "本編ルート";
    return `<section class="route-chapter-browser ${postgame ? "is-postgame" : ""}"><header class="route-chapter-overview"><div><span>${escape(chapter.title)}</span><h3>${progressLabel} ${clearedMain}/${mainRoutes.length}</h3></div><div class="route-chapter-progress" aria-label="${progressLabel}進捗 ${clearedMain}/${mainRoutes.length}"><i style="width:${mainRoutes.length ? clearedMain / mainRoutes.length * 100 : 0}%"></i></div><small>推奨Lv.${chapter.recommendedLevelRange[0]}〜${chapter.recommendedLevelRange[1]}</small></header><div class="route-group-heading"><strong>${groupLabel}</strong><span>${nextRoute ? `次は「${escape(nextRoute.name)}」` : clearedMain === mainRoutes.length ? `${progressLabel}済み` : "解放条件を満たしてください"}</span></div><div class="dungeon-grid dungeon-route-list">${routeCards(mainRoutes)}</div>${optionalRoutes.length ? `<section class="optional-route-group"><div class="route-group-heading"><strong>寄り道・高難度</strong><span>物語の進行には影響しません</span></div><div class="dungeon-grid dungeon-route-list">${routeCards(optionalRoutes)}</div></section>` : ""}</section>`;
  }

  window.GameUIViews.party = { adventure, dungeonCards, history, overview, selectedChapterId, selectedDifficultyId, selectedDungeon, selectedDungeonId, selectedVariant };
})();
