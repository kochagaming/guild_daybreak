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

  function trackedHarvestReady(itemId, monsterId, dungeonId, difficultyId) {
    if (!itemId || !monsterId || !dungeonId || !window.MonsterLoot?.fixedDropIds) return false;
    const monsterRecord = window.Encyclopedia.monster(monsterId);
    const observedDrops = monsterRecord?.difficulties?.[difficultyId]?.drops || [];
    const habitatKnown = window.Encyclopedia.monsterHabitats(monsterId)
      .some(habitat => habitat.dungeonId === dungeonId && habitat.difficultyId === difficultyId);
    return habitatKnown
      && observedDrops.includes(itemId)
      && window.MonsterLoot.fixedDropIds(monsterId, difficultyId).includes(itemId);
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
    const habitatDiscovery = Array.isArray(result.newMonsterHabitats) && result.newMonsterHabitats.length ? `<span class="field-knowledge">新しい生息記録 ${result.newMonsterHabitats.length}種</span>` : "";
    const habitatSurvey = result.newMonsterHabitatSurvey ? `<span class="field-knowledge">現地調査 完了・印章+${result.newMonsterHabitatSurvey.sealReward}</span>` : "";
    const setDiscovery = Array.isArray(result.newSetDiscoveries) && result.newSetDiscoveries.length ? `<span class="set-discovery">組合せ ${result.newSetDiscoveries.length}件</span>` : "";
    const qualityRecord = Array.isArray(result.newBestQualities) && result.newBestQualities.length ? `<span class="quality-record">最高品質更新 ${result.newBestQualities.length}種</span>` : "";
    const ultraRare = ultraRareDrops.length ? `<span class="ultra-rare">超レア ${ultraRareDrops.length}点</span>` : "";
    const newUltraRare = Array.isArray(result.newUltraRareTitleIds) && result.newUltraRareTitleIds.length ? `<span class="ultra-title">新称号 ${result.newUltraRareTitleIds.length}種</span>` : "";
    const trackedItem = result.trackedItemId ? window.GameData.items[result.trackedItemId] : null;
    const trackedProgress = Number.isInteger(result.trackedItemProgress) && result.trackedItemGoal ? `・累計 ${result.trackedItemProgress}/${result.trackedItemGoal}` : "";
    const trackedHarvest = result.trackedItemHarvestId ? "・採取記録活用" : "";
    const tracked = trackedItem && result.trackedItemQuantity > 0 ? `<span class="tracked">目標 +${result.trackedItemQuantity} ${escape(trackedItem.name)}${trackedHarvest}${trackedProgress}</span>` : "";
    const trackedMonster = result.trackedMonsterId ? window.GameData.monsters[result.trackedMonsterId] : null;
    const trackedMonsterProgress = Number.isInteger(result.trackedMonsterProgress) && result.trackedMonsterGoal ? `・累計 ${result.trackedMonsterProgress}/${result.trackedMonsterGoal}` : "";
    const trackedTrail = result.trackedMonsterTrailId ? "・痕跡追跡" : "";
    const hunted = trackedMonster && result.trackedMonsterQuantity > 0 ? `<span class="tracked hunted">討伐 +${result.trackedMonsterQuantity}体 ${escape(trackedMonster.name)}${trackedTrail}${trackedMonsterProgress}</span>` : "";
    const huntMarks = (result.newMonsterHuntMarks || []).map(entry => {
      const monster = window.GameData.monsters[entry.monsterId], mark = window.Encyclopedia.huntMarks(entry.monsterId).find(candidate => candidate.threshold === entry.threshold);
      return monster && mark ? `${monster.name}・${mark.name}・印章+${entry.sealReward}` : "";
    }).filter(Boolean);
    const huntMark = huntMarks.length ? `<span class="field-knowledge">狩猟記録 ${escape(huntMarks.join("・"))}</span>` : "";
    const companionGrowthNames = (result.companionAdvancements || []).map(entry => window.Companions.definition(entry.companionId)?.name).filter(Boolean);
    const companionGrowth = companionGrowthNames.length ? `<span class="companion-growth">人物成長 ${escape(companionGrowthNames.join("・"))}</span>` : "";
    const learnedSkillCount = (result.levelUps || []).reduce((sum, entry) => sum + (entry.newSkillIds?.length || 0), 0);
    const skillGrowth = learnedSkillCount ? `<span class="skill-growth">新スキル ${learnedSkillCount}種</span>` : "";
    const fieldKnowledge = result.newRouteMasteryIds?.length ? `<span class="field-knowledge">新しい道中知見 ${result.newRouteMasteryIds.length}種</span>` : "";
    const rumorConfirmations = result.newRumorConfirmationIds?.length ? `<span class="field-knowledge">初めて確かめた噂 ${result.newRumorConfirmationIds.length}種${result.rumorConfirmationReward ? `・印章+${result.rumorConfirmationReward.quantity}` : ""}</span>` : "";
    const routeEvents = window.GameUIViews.results?.routeEvents(result) || [];
    const routeEvent = routeEvents[0];
    const routeEventChip = routeEvent ? `<span class="route-event ${routeEvent.success ? "success" : "failure"}">道中 ${routeEvent.rumorMatched ? "噂と一致・" : ""}${escape(routeEvent.name)}・${routeEvent.success ? "成功" : "失敗"}${routeEvent.naturalAptitudeApplied ? "・能力活用" : ""}${routeEvent.personalPracticeApplied ? "・経験活用" : ""}${routeEvent.masteryApplied ? "・記録活用" : ""}${routeEvents.length > 1 ? `・ほか${routeEvents.length - 1}件` : ""}</span>` : "";
    return `<div class="fleet-result-loot" aria-label="直近の獲得報酬">${routeEventChip}${rumorConfirmations}${fieldKnowledge}${habitatDiscovery}${habitatSurvey}${companionGrowth}${skillGrowth}${huntMark}${tracked}${hunted}${ultraRare}${newUltraRare}${discovery}${setDiscovery}${qualityRecord}<span class="gold">${formatGold(result.gold)}</span><span class="experience">${escape(experienceText)}</span>${breakdown("equipment", equipmentText, equipmentEntries, "獲得装備")}${breakdown("materials", materialText, materialEntries, "獲得素材")}</div>`;
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
        reputation: (() => { const reputation = window.Characters.recentExpeditionRole(member); return reputation?.title ? { kind: reputation.kind, label: reputation.label, title: reputation.title, icon: reputation.icon } : null; })(),
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
      const beforeReputation = before.reputation?.title || null, afterReputation = after.reputation?.title || null;
      if (beforeReputation !== afterReputation) facts.push(`仲間内の呼び名 ${beforeReputation || "なし"}→${afterReputation || "なし"}`);
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
    const status = summary => `${number(summary.statusInflicted)}/${number(summary.statusAttempts)}（抵抗${number(summary.statusResisted)}）`;
    const actions = summary => `回${number(summary.healingActions)}・呪${number(summary.spellActions)}・技${number(summary.techniqueActions)}・攻${number(summary.attackActions)}・防${number(summary.defendActions)}`;
    const rows = [
      ["到達", `${number(before.encountersCleared)}/${number(before.totalEncounters)}戦`, `${number(after.encountersCleared)}/${number(after.totalEncounters)}戦`],
      ["討伐", `${number(before.monstersDefeated)}体`, `${number(after.monstersDefeated)}体`],
      ["命中", hit(before), hit(after)],
      ["状態異常", status(before), status(after)],
      ["行動内訳", actions(before), actions(after)],
      ["与ダメージ", number(before.damageDealt), number(after.damageDealt)],
      ["被ダメージ", number(before.damageTaken), number(after.damageTaken)]
    ];
    if (before.damageSources && after.damageSources) {
      const sourceLabels = { physical: "被・物理", magic: "被・魔法", status: "被・状態異常", hazard: "被・道中" };
      Object.entries(sourceLabels).forEach(([id, label]) => {
        const oldValue = Number(before.damageSources[id]) || 0, newValue = Number(after.damageSources[id]) || 0;
        rows.push([label, number(oldValue), number(newValue)]);
      });
      [...new Set([...Object.keys(before.damageElements || {}), ...Object.keys(after.damageElements || {})])]
        .map(id => ({ id, before: Number(before.damageElements?.[id]) || 0, after: Number(after.damageElements?.[id]) || 0 }))
        .filter(entry => entry.before > 0 || entry.after > 0)
        .sort((a, b) => (b.before + b.after) - (a.before + a.after))
        .forEach(entry => {
          const element = window.GameData.elements[entry.id];
          rows.push([`被・${element?.icon || "◇"}${element?.name || entry.id}`, number(entry.before), number(entry.after)]);
        });
    }
    rows.push(
      ["回復", number(before.healingDone), number(after.healingDone)],
      ["戦闘不能", `${number(before.knockouts)}人`, `${number(after.knockouts)}人`]
    );
    return rows;
  }

  function history(context) {
    const { escape, formatGold, historyFocus } = context;
    const partyIndex = window.Party.selected();
    const entries = window.GameState.data.partyHistory?.[partyIndex] || [];
    if (!entries.length) return `<section class="panel party-history-page"><div class="notice muted"><span class="notice-icon">◇</span><div><strong>遠征履歴はまだありません</strong><p>探索から帰還すると、この隊の記録が最大10件まで残ります。</p></div></div></section>`;
    const currentSetup = currentPartySetup(partyIndex);
    const harvestGroups = new Map();
    entries.forEach(entry => {
      const harvest = entry.targetedHarvest;
      if (!harvest) return;
      const key = `${entry.dungeonId}:${entry.difficultyId || "normal"}:${harvest.monsterId}:${harvest.itemId}`;
      if (!harvestGroups.has(key)) harvestGroups.set(key, { dungeonId: entry.dungeonId, difficultyId: entry.difficultyId || "normal", timeMultiplier: entry.timeMultiplier || 1, monsterId: harvest.monsterId, itemId: harvest.itemId, attempts: 0, successes: 0, itemQuantity: 0, monsterQuantity: 0, recent: [] });
      const group = harvestGroups.get(key);
      group.attempts += 1;
      group.successes += harvest.itemQuantity > 0 ? 1 : 0;
      group.itemQuantity += harvest.itemQuantity;
      group.monsterQuantity += harvest.monsterQuantity;
      if (group.recent.length < 5) group.recent.push(harvest.itemQuantity > 0);
    });
    const harvestLedger = harvestGroups.size ? (() => {
      const groups = [...harvestGroups.values()];
      const attempts = groups.reduce((sum, group) => sum + group.attempts, 0);
      return `<details class="party-history-harvest-ledger"><summary><span><small>FIELD LEDGER</small><strong>狙い採りの足跡</strong></span><b>${groups.length}組・${attempts}遠征</b><i aria-hidden="true">›</i></summary><div>${groups.map(group => {
        const item = window.GameData.items[group.itemId], monster = window.GameData.monsters[group.monsterId];
        const dungeon = window.DungeonDifficulty.variant(group.dungeonId, group.difficultyId);
        if (!item || !monster || !dungeon) return "";
        const observation = group.attempts === 1
          ? "まだ一度の記録。次の遠征から手応えを比べられる。"
          : group.successes === 0
            ? `${group.attempts}度追ったが、まだ品は持ち帰れていない。`
            : group.successes === group.attempts
              ? `残る${group.attempts}度の記録では、毎回品を持ち帰っている。`
              : "持ち帰れた遠征と空振りの遠征がある。狙う道筋は確かめられている。";
        return `<article><header><strong>${escape(monster.icon || "♟")} ${escape(monster.name)} <i aria-hidden="true">→</i> ${escape(item.icon || "◇")} ${escape(item.name)}</strong><small>${escape(dungeon.name)} · ${group.timeMultiplier}倍探索</small></header><div><span>遠征 <b>${group.attempts}回</b></span><span>収穫 <b>${group.successes}回</b></span><span>品 <b>+${group.itemQuantity}</b></span><span>討伐 <b>${group.monsterQuantity}体</b></span></div><p><small>新しい順</small>${group.recent.map(found => `<i class="${found ? "is-found" : "is-missed"}">${found ? "収" : "空"}</i>`).join("")}</p><footer><span>${escape(observation)}</span><button type="button" class="text-button party-history-harvest-reuse" data-action="reuse-history-harvest" data-party="${partyIndex}" data-dungeon="${group.dungeonId}" data-difficulty="${group.difficultyId}" data-time="${group.timeMultiplier}" data-item="${escape(group.itemId)}" data-monster="${escape(group.monsterId)}" ${window.Party.expedition(partyIndex) ? "disabled" : ""}>この狩りを続ける</button></footer></article>`;
      }).join("")}</div></details>`;
    })() : "";
    const damageSourceLabels = { physical: "物理", magic: "魔法", status: "状態異常", hazard: "道中" };
    const records = entries.map((entry, index) => {
      const dungeon = window.DungeonDifficulty.variant(entry.dungeonId, entry.difficultyId || "normal");
      const completed = new Date(entry.completedAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
      const battle = entry.battle;
      const focusedMember = historyFocus?.entryId === entry.id ? battle?.members?.find(member => member.id === historyFocus.characterId) : null;
      const focusedRole = focusedMember ? window.Characters.expeditionRoleLabel((entry.memberHighlights || []).find(highlight => highlight.memberId === focusedMember.id)?.kind) : null;
      const focusedCompanions = focusedMember ? (battle?.members || []).filter(member => member.id !== focusedMember.id).map(member => member.name) : [];
      const focusedMemberRecord = focusedMember ? `<section class="party-history-character-focus"><span aria-hidden="true">◇</span><div><small>この人物の足跡から開きました</small><strong>${escape(focusedMember.name)}の記録をたどっています</strong><small>${focusedRole ? `今回の働き：${escape(focusedRole)} · ` : ""}${focusedCompanions.length ? `同行：${focusedCompanions.map(escape).join("、")}` : "同行者なし"}</small><p><b>与 ${focusedMember.damageDealt.toLocaleString("ja-JP")}</b><b>被 ${focusedMember.damageTaken.toLocaleString("ja-JP")}</b><b>回復 ${focusedMember.healingDone.toLocaleString("ja-JP")}</b><b>異常成功 ${focusedMember.statusInflicted.toLocaleString("ja-JP")}回</b><em>${focusedMember.knockedOut ? "戦闘不能帰還" : `残HP ${focusedMember.remainingHp.toLocaleString("ja-JP")}/${focusedMember.maxHp.toLocaleString("ja-JP")}`}</em></p><button type="button" class="text-button" data-action="open-adventurer-record" data-character="${escape(focusedMember.id)}">この冒険者の足跡へ戻る</button></div></section>` : "";
      const equipmentCount = entry.equipment.reduce((sum, item) => sum + item.quantity, 0);
      const materialCount = entry.materials.reduce((sum, item) => sum + item.quantity, 0);
      const battleSummary = battle
        ? `<div class="party-history-battle"><span>到達 <strong>${battle.encountersCleared}/${battle.totalEncounters}戦</strong></span><span>討伐 <strong>${battle.monstersDefeated}体</strong></span><span>命中 <strong>${battle.attackHits}/${battle.attackAttempts}</strong></span><span>状態異常 <strong>${battle.statusInflicted || 0}/${battle.statusAttempts || 0}</strong></span><span>与 <strong>${battle.damageDealt.toLocaleString("ja-JP")}</strong></span><span>被 <strong>${battle.damageTaken.toLocaleString("ja-JP")}</strong></span><span>回復 <strong>${battle.healingDone.toLocaleString("ja-JP")}</strong></span><span>戦闘不能 <strong>${battle.knockouts}人</strong></span></div>`
        : `<p class="small-note">この帰還時点では詳細戦績を保存していません。</p>`;
      const damageHistory = battle?.damageSources
        ? `<details class="party-history-damage"><summary>受けた傷の内訳 <span>${battle.damageTaken.toLocaleString("ja-JP")}</span></summary><div>${Object.entries(battle.damageSources).filter(([, value]) => value > 0).map(([id, value]) => `<span><small>${escape(damageSourceLabels[id] || id)}</small><strong>${value.toLocaleString("ja-JP")}</strong></span>`).join("")}${Object.entries(battle.damageElements || {}).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]).map(([id, value]) => { const element = window.GameData.elements[id]; return `<span class="element"><small>${escape(element?.icon || "◇")} ${escape(element?.name || id)}</small><strong>${value.toLocaleString("ja-JP")}</strong></span>`; }).join("")}</div></details>`
        : "";
      const usedSkills = Object.entries(battle?.skillUses || {}).map(([skillId, count]) => ({ skill: window.GameData.skills[skillId], count, damage: Number(battle.skillDamage?.[skillId]) || 0, healing: Number(battle.skillHealing?.[skillId]) || 0, statuses: Number(battle.skillStatusInflicted?.[skillId]) || 0 })).filter(entry => entry.skill && entry.count > 0).sort((a, b) => b.count - a.count || a.skill.name.localeCompare(b.skill.name, "ja"));
      const skillHistory = usedSkills.length ? `<details class="party-history-skills"><summary>発動技能 <span>${usedSkills.length}種・${usedSkills.reduce((sum, entry) => sum + entry.count, 0)}回</span></summary><div>${usedSkills.map(({ skill, count, damage, healing, statuses }) => { const cooldown = skill.activation?.type === "active" ? ` 再使用まで${skill.activation.cooldownTurns}ターン。` : ""; const performance = [`直接ダメージ ${damage}`, `実回復 ${healing}`, `異常成功 ${statuses}`].filter((label, index) => [damage, healing, statuses][index] > 0); return `<details><summary><strong>${escape(skill.name)}</strong><b>×${count}</b><i aria-hidden="true">›</i></summary><p>${escape(skill.description + cooldown)}</p>${performance.length ? `<small>${performance.map(escape).join("・")}</small>` : ""}</details>`; }).join("")}</div></details>` : "";
      const highlightViews = {
        exploration: ["路", "道中の難所を解いた", entry => `発見${entry.routeSuccesses}件・宝箱${entry.chestsOpened}個`],
        damage: ["剣", "敵陣を切り開いた", entry => `実ダメージ ${entry.value.toLocaleString("ja-JP")}`],
        healing: ["癒", "仲間の命をつないだ", entry => `実回復 ${entry.value.toLocaleString("ja-JP")}`],
        status: ["縛", "異変で戦機をつくった", entry => `成功 ${entry.value}/${entry.attempts}${entry.resisted ? `・抵抗 ${entry.resisted}` : ""}`],
        endurance: ["盾", "最後まで立ち続けた", entry => `被ダメージ ${entry.value.toLocaleString("ja-JP")}・帰還HP ${entry.remainingHp}/${entry.maxHp}`]
      };
      let memberHighlights = (entry.memberHighlights || []).length
        ? `<div class="party-history-contributions"><strong>遠征の働き</strong><div>${entry.memberHighlights.map(highlight => { const view = highlightViews[highlight.kind]; return `<span class="${highlight.kind}"><i>${view[0]}</i><small>${view[1]}</small><b>${escape(highlight.name)}</b><em>${escape(view[2](highlight))}</em></span>`; }).join("")}</div></div>`
        : "";
      const rivalryEvents = [...(entry.newBossRivalries || []).map(item => ({ ...item, avenged: false })), ...(entry.bossRevengeVictories || []).map(item => ({ ...item, avenged: true }))];
      if (rivalryEvents.length) memberHighlights += `<div class="party-history-rivalries"><strong>因縁の記録</strong><div>${rivalryEvents.map(item => `<span class="${item.avenged ? "is-avenged" : "is-active"}"><i>${item.avenged ? "雪" : "因"}</i><b>${escape(item.name)}</b><small>${escape(item.bossName)}・${item.avenged ? "雪辱" : "再戦を待つ"}</small></span>`).join("")}</div></div>`;
      const newPartyReputationMoment = entry.newPartyReputationMoment
        ? `<section class="party-history-new-mood"><small>この帰還で生まれた隊の空気</small><strong>${escape(entry.newPartyReputationMoment.label)}</strong><span>${entry.newPartyReputationMoment.memberNames.map(escape).join(" × ")}</span><p>${escape(entry.newPartyReputationMoment.text)}</p></section>`
        : "";
      const partyReturnMoment = entry.partyReturnMoment
        ? `<section class="party-history-return-mood"><small>帰路のひと幕 · ${entry.partyReturnMoment.memberNames.map(escape).join(" × ")}</small><strong>${escape(entry.partyReturnMoment.label)}</strong><p>${escape(entry.partyReturnMoment.text)}</p></section>`
        : "";
      const lootReaction = entry.lootReaction
        ? `<section class="party-history-loot-reaction"><span aria-hidden="true">${escape(window.GameData.items[entry.lootReaction.itemId]?.icon || "◇")}</span><div><small>戦利品を囲んで · ${escape(entry.lootReaction.reason)}</small><strong>${escape(entry.lootReaction.name)}${entry.lootReaction.roleTitle ? ` · ${escape(entry.lootReaction.roleTitle)}` : ""}</strong><p>${escape(entry.lootReaction.text)}</p></div></section>`
        : "";
      const sharedHuntLedgerTier = entry.newSharedHuntLedgerTier ? (() => {
        const milestone = entry.newSharedHuntLedgerTier;
        const monster = window.GameData.monsters[milestone.monsterId];
        const item = window.GameData.items[milestone.itemId];
        if (!monster || !item || !Array.isArray(milestone.memberNames) || milestone.memberNames.length < 2) return "";
        const bondKey = [...milestone.memberIds].sort().join("::");
        const tier = (window.GameData.config.explorationEvents?.targetedHarvestConsultation?.rememberedTiers || []).find(candidate => candidate.id === milestone.tierId);
        const epithet = tier?.epithet?.replace("{monster}", monster.name);
        return `<section class="party-history-shared-hunt-ledger"><span aria-hidden="true">帳</span><div><small>SHARED HUNT LEDGER · この帰還で育った二人の狩り帳</small><strong>${milestone.memberNames.map(escape).join(" × ")} · ${escape(milestone.tierName)}</strong><p>${escape(monster.icon || "♟")} ${escape(monster.name)} <i aria-hidden="true">→</i> ${escape(item.icon || "◇")} ${escape(item.name)} · 収穫${milestone.successes}回・${milestone.items}個</p>${tier ? `<small class="tier-story">${escape(tier.growth)}</small>` : ""}${epithet ? `<small class="tier-epithet">二人の呼び名 · ${escape(epithet)}</small>` : ""}</div><button type="button" class="text-button" data-action="open-adventurer-bonds" data-bond="${escape(bondKey)}" data-monster="${escape(milestone.monsterId)}" data-item="${escape(milestone.itemId)}">この頁を読む</button></section>`;
      })() : "";
      const sharedHuntLedgerProgress = entry.sharedHuntLedgerProgress && !entry.newSharedHuntLedgerTier ? (() => {
        const progress = entry.sharedHuntLedgerProgress;
        const monster = window.GameData.monsters[progress.monsterId], item = window.GameData.items[progress.itemId];
        if (!monster || !item || !Array.isArray(progress.memberNames) || progress.memberNames.length < 2) return "";
        const bondKey = [...progress.memberIds].sort().join("::");
        const nextTier = (window.GameData.config.explorationEvents?.targetedHarvestConsultation?.rememberedTiers || []).find(candidate => candidate.id === progress.nextTierId);
        const ratio = nextTier ? Math.min(100, Math.round(progress.successes / nextTier.minimumSuccesses * 100)) : 100;
        const next = nextTier ? `次の「${escape(progress.nextTierName)}」まであと${progress.remaining}回` : "狩り名が定着した最終頁";
        return `<section class="party-history-shared-hunt-ledger is-progress"><span aria-hidden="true">続</span><div><small>SHARED HUNT LEDGER · この帰還で重ねた狩り帳</small><strong>${progress.memberNames.map(escape).join(" × ")} · ${escape(progress.tierName)}</strong><p>${escape(monster.icon || "♟")} ${escape(monster.name)} <i aria-hidden="true">→</i> ${escape(item.icon || "◇")} ${escape(item.name)} · 収穫${progress.successes}回</p><em class="history-hunt-ledger-progress">${next}<i><b style="width:${ratio}%"></b></i></em></div><button type="button" class="text-button" data-action="open-adventurer-bonds" data-bond="${escape(bondKey)}" data-monster="${escape(progress.monsterId)}" data-item="${escape(progress.itemId)}">二人の頁を読む</button></section>`;
      })() : "";
      const namedHuntSupport = window.GameUIViews.results.namedHuntSupportPanel(entry, { escape });
      const targetedHarvest = entry.targetedHarvest ? (() => {
        const harvest = entry.targetedHarvest;
        const item = window.GameData.items[harvest.itemId];
        const monster = window.GameData.monsters[harvest.monsterId];
        if (!item || !monster) return "";
        const itemProgress = Number.isInteger(harvest.itemProgress) && harvest.itemGoal
          ? `<span>品の記録 <b>${harvest.itemProgress} / ${harvest.itemGoal}</b>${harvest.itemProgress >= harvest.itemGoal ? "・達成" : ""}</span>` : "";
        const monsterProgress = Number.isInteger(harvest.monsterProgress) && harvest.monsterGoal
          ? `<span>討伐記録 <b>${harvest.monsterProgress} / ${harvest.monsterGoal}</b>${harvest.monsterProgress >= harvest.monsterGoal ? "・達成" : ""}</span>` : "";
        const practice = harvest.practice ? `<small class="harvest-practice-note">${escape(harvest.practice.characterName)}が「${escape(harvest.practice.tierName)}」手覚えを活かした。</small>` : "";
        const persistence = harvest.persistence ? `<small class="harvest-practice-note">${escape(harvest.persistence.characterName)}が「${escape(harvest.persistence.tierName)}」空振りの跡を読み直した。</small>` : "";
        const consultation = window.Characters.targetedHarvestConsultation(harvest.practice, harvest.persistence);
        return `<section class="party-history-targeted-harvest"><small>TARGETED HARVEST · 狙い採りの記録</small><strong>${escape(monster.icon || "♟")} ${escape(monster.name)} <i aria-hidden="true">→</i> ${escape(item.icon || "◇")} ${escape(item.name)}</strong><div><span>討伐 <b>+${harvest.monsterQuantity}体</b></span><span class="${harvest.itemQuantity > 0 ? "is-found" : "is-missed"}">品 <b>${harvest.itemQuantity > 0 ? `+${harvest.itemQuantity}` : "今回は見つからず"}</b></span></div>${practice}${persistence}${consultation ? `<small class="harvest-consultation-note"><b>狩りの相談</b>${escape(consultation.return)}</small>` : ""}${itemProgress || monsterProgress ? `<p>${itemProgress}${monsterProgress}</p>` : ""}<button type="button" class="button secondary" data-action="reuse-history-harvest" data-party="${partyIndex}" data-dungeon="${entry.dungeonId}" data-difficulty="${entry.difficultyId || "normal"}" data-time="${entry.timeMultiplier || 1}" data-item="${escape(harvest.itemId)}" data-monster="${escape(harvest.monsterId)}" ${window.Party.expedition(partyIndex) ? "disabled" : ""}>同じ狙い採りを続ける</button></section>`;
      })() : "";
      const setup = Array.isArray(entry.partySetup) && entry.partySetup.length
        ? (() => { const archivedMood = window.Characters.expeditionRoleConversation(entry.partySetup); return `<details class="party-history-setup"><summary>遠征時の編成 ${entry.partySetup.length}人</summary><div>${archivedMood ? `<section class="party-history-mood"><small>遠征時の隊の空気</small><strong>${escape(archivedMood.label)}</strong><p>${escape(archivedMood.text)}</p></section>` : ""}${entry.partySetup.map(member => {
          const job = window.GameData.jobs[member.jobId]?.name || "冒険者", rates = member.actionRates;
          const recordTitle = (window.GameData.adventurerMilestones || []).find(item => item.id === member.recordTitleId);
          const omitted = Math.max(0, member.equipmentCount - member.equipmentNames.length);
          const equipment = member.equipmentNames.length ? member.equipmentNames.map(escape).join("・") + (omitted ? `・ほか${omitted}点` : "") : "装備なし";
          return `<article><span>${member.position + 1}</span><div><strong>${escape(member.name)}${member.reputation?.title ? `<em class="party-history-reputation">${escape(member.reputation.icon)} ${escape(member.reputation.title)}</em>` : ""}</strong><small>${recordTitle ? `${escape(recordTitle.icon)} ${escape(recordTitle.name)} · ` : ""}${escape(job)} · Lv.${member.level} · 重量 ${member.equipmentWeight}/${member.maximumWeight}</small><p>${equipment}</p></div><small>回${rates.healing}% → 呪${rates.spell}% → 技${rates.technique}% → 攻${rates.attack}%</small></article>`;
        }).join("")}</div></details>`; })()
        : `<p class="small-note">この帰還時点では遠征時の編成を保存していません。</p>`;
      const differences = Array.isArray(entry.partySetup) && entry.partySetup.length ? setupDifferences(entry.partySetup, currentSetup) : [];
      const comparison = Array.isArray(entry.partySetup) && entry.partySetup.length
        ? `<details class="party-history-changes"><summary>出撃時と現在の差 <span>${differences.length ? `${differences.length}人` : "変更なし"}</span></summary>${differences.length ? `<ul>${differences.map(change => `<li><strong>${escape(change.name)}</strong><span>${change.facts.map(escape).join("・")}</span></li>`).join("")}</ul>` : `<p>隊列、職業、レベル、行動率、装備、重量、仲間内の呼び名に変更はありません。</p>`}</details>`
        : "";
      const previous = entry.battle ? entries.slice(index + 1).find(candidate => sameExpeditionConditions(entry, candidate) && candidate.battle) : null;
      const previousSetupDifferences = previous && Array.isArray(previous.partySetup) && previous.partySetup.length && Array.isArray(entry.partySetup) && entry.partySetup.length
        ? setupDifferences(previous.partySetup, entry.partySetup, "今回") : [];
      const previousBattleRows = previous ? historyBattleComparison(previous.battle, entry.battle) : [];
      const previousSkillChanges = previous?.battle?.skillUses && entry.battle?.skillUses ? [...new Set([
        ...Object.keys(previous.battle.skillUses), ...Object.keys(entry.battle.skillUses),
        ...Object.keys(previous.battle.skillDamage || {}), ...Object.keys(entry.battle.skillDamage || {}),
        ...Object.keys(previous.battle.skillHealing || {}), ...Object.keys(entry.battle.skillHealing || {}),
        ...Object.keys(previous.battle.skillStatusInflicted || {}), ...Object.keys(entry.battle.skillStatusInflicted || {})
      ])].map(skillId => ({
        skill: window.GameData.skills[skillId],
        before: {
          uses: Number(previous.battle.skillUses[skillId]) || 0,
          damage: Number(previous.battle.skillDamage?.[skillId]) || 0,
          healing: Number(previous.battle.skillHealing?.[skillId]) || 0,
          statuses: Number(previous.battle.skillStatusInflicted?.[skillId]) || 0
        },
        current: {
          uses: Number(entry.battle.skillUses[skillId]) || 0,
          damage: Number(entry.battle.skillDamage?.[skillId]) || 0,
          healing: Number(entry.battle.skillHealing?.[skillId]) || 0,
          statuses: Number(entry.battle.skillStatusInflicted?.[skillId]) || 0
        }
      })).filter(item => item.skill && Object.keys(item.before).some(key => item.before[key] !== item.current[key]))
        .sort((a, b) => {
          const change = item => Object.keys(item.before).reduce((total, key) => total + Math.abs(item.current[key] - item.before[key]), 0);
          return change(b) - change(a) || a.skill.name.localeCompare(b.skill.name, "ja");
        }) : [];
      const previousSkillFacts = item => [
        `発動 ${item.before.uses.toLocaleString("ja-JP")}→${item.current.uses.toLocaleString("ja-JP")}回`,
        item.before.damage || item.current.damage ? `与 ${item.before.damage.toLocaleString("ja-JP")}→${item.current.damage.toLocaleString("ja-JP")}` : "",
        item.before.healing || item.current.healing ? `回復 ${item.before.healing.toLocaleString("ja-JP")}→${item.current.healing.toLocaleString("ja-JP")}` : "",
        item.before.statuses || item.current.statuses ? `異常成功 ${item.before.statuses.toLocaleString("ja-JP")}→${item.current.statuses.toLocaleString("ja-JP")}回` : ""
      ].filter(Boolean);
      const previousSkillSummary = previous?.battle?.skillUses && entry.battle?.skillUses
        ? `<details class="party-history-skill-comparison"><summary>技能の働きの差 <span>${previousSkillChanges.length ? `${previousSkillChanges.length}種` : "変化なし"}</span></summary>${previousSkillChanges.length ? `<ul>${previousSkillChanges.slice(0, 12).map(item => `<li><strong>${escape(item.skill.name)}</strong><span>${previousSkillFacts(item).map(escape).join("・")}</span></li>`).join("")}</ul>` : `<p>発動回数・与ダメージ・回復・状態異常成功に変化はありません。</p>`}</details>` : "";
      const previousMemberChanges = previous?.battle?.members && entry.battle?.members ? (() => {
        const previousMembers = new Map(previous.battle.members.map(member => [member.id, member]));
        const keys = ["damageDealt", "damageTaken", "healingDone", "statusInflicted", "remainingHp", "maxHp", "knockedOut"];
        return entry.battle.members.map(member => ({ member, before: previousMembers.get(member.id) }))
          .filter(item => item.before && keys.some(key => item.before[key] !== item.member[key]));
      })() : [];
      const previousMemberFacts = item => [
        `与 ${item.before.damageDealt.toLocaleString("ja-JP")}→${item.member.damageDealt.toLocaleString("ja-JP")}`,
        `被 ${item.before.damageTaken.toLocaleString("ja-JP")}→${item.member.damageTaken.toLocaleString("ja-JP")}`,
        `回復 ${item.before.healingDone.toLocaleString("ja-JP")}→${item.member.healingDone.toLocaleString("ja-JP")}`,
        `異常成功 ${item.before.statusInflicted.toLocaleString("ja-JP")}→${item.member.statusInflicted.toLocaleString("ja-JP")}回`,
        `残HP ${item.before.remainingHp.toLocaleString("ja-JP")}/${item.before.maxHp.toLocaleString("ja-JP")}→${item.member.remainingHp.toLocaleString("ja-JP")}/${item.member.maxHp.toLocaleString("ja-JP")}`
      ];
      const previousMemberSummary = previous?.battle?.members && entry.battle?.members
        ? `<details class="party-history-skill-comparison party-history-member-comparison"><summary>冒険者ごとの働きの差 <span>${previousMemberChanges.length ? `${previousMemberChanges.length}人` : "変化なし"}</span></summary>${previousMemberChanges.length ? `<ul>${previousMemberChanges.map(item => `<li><strong>${escape(item.member.name)}</strong><span>${previousMemberFacts(item).map(escape).join("・")}</span></li>`).join("")}</ul>` : `<p>同じ冒険者の与ダメージ・被ダメージ・回復・状態異常成功・残HPに変化はありません。</p>`}</details>` : "";
      const previousRouteSummary = previous && (previous.routeEvents?.length || entry.routeEvents?.length)
        ? `<span><small>道中成功</small><strong>${(previous.routeEvents || []).filter(event => event.success).length}/${(previous.routeEvents || []).length} → ${(entry.routeEvents || []).filter(event => event.success).length}/${(entry.routeEvents || []).length}</strong></span>`
        : "";
      const previousComparison = previous
        ? `<details class="party-history-attempt"><summary>同条件の前回との差 <span>${previousSetupDifferences.length ? `編成変更 ${previousSetupDifferences.length}人` : "編成変更なし"}</span></summary><div><small>前回 ${new Date(previous.completedAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small><div class="party-history-attempt-battle">${previousBattleRows.map(([label, oldValue, newValue]) => `<span><small>${label}</small><strong>${oldValue} → ${newValue}</strong></span>`).join("")}${previousRouteSummary}</div>${previousMemberSummary}${previousSkillSummary}${previousSetupDifferences.length ? `<ul>${previousSetupDifferences.map(change => `<li><strong>${escape(change.name)}</strong><span>${change.facts.map(escape).join("・")}</span></li>`).join("")}</ul>` : `<p>隊列、職業、レベル、行動率、装備、重量に変更はありません。</p>`}</div></details>`
        : "";
      const storyMoments = (entry.storyMoments || []).map(moment => {
        const scene = window.Story?.scene(moment.sceneId), place = window.GameData.dungeons[moment.dungeonId];
        if (!scene) return "";
        const label = { opening: "新たな探索地", discovery: "探索で判明", ending: "攻略後" }[moment.kind] || "遠征の記録";
        return `<article><small>${label} · ${escape(place?.name || dungeon.name)}</small><strong>${escape(scene.name)}</strong><p>${escape(scene.text)}</p></article>`;
      }).filter(Boolean).join("");
      const witnesses = (entry.partySetup || []).map(member => member.name).filter(Boolean);
      const story = storyMoments
        ? `<details class="party-history-story"><summary>物語の記録 <span>${entry.storyMoments.length}場面</span></summary><div>${storyMoments}${witnesses.length ? `<p class="party-history-witnesses">この遠征を歩いた冒険者：${escape(witnesses.join("、"))}</p>` : ""}</div></details>`
        : "";
      const adventurerBondMoments = (entry.adventurerBondMoments || []).map(moment => { const definition = window.GameData.config.explorationEvents.adventurerBondMoments.find(candidate => candidate.id === moment.id); return `<article><small>${moment.memberNames.map(escape).join("と")} · 同行${moment.sharedSorties}回</small><strong>${escape(definition?.title || "旅仲間のひと幕")}</strong><p>${escape(moment.text)}</p></article>`; }).join("");
      const adventurerBonds = adventurerBondMoments
        ? `<details class="party-history-story party-history-bonds"><summary>旅仲間の記録 <span>${entry.adventurerBondMoments.length}場面</span></summary><div>${adventurerBondMoments}</div></details>`
        : "";
      const bondTierEntries = (entry.newAdventurerBondTiers || []).map(tier => `<article><small>${tier.memberNames.map(escape).join("と")} · 同行${tier.sharedSorties}回</small><strong>旅仲間の呼吸が深まった</strong><p>${[tier.routeLabel ? `道中「${escape(tier.routeLabel)}」` : "", tier.battleLabel ? `戦列「${escape(tier.battleLabel)}」` : ""].filter(Boolean).join("・")}</p></article>`).join("");
      const bondTierGrowth = bondTierEntries
        ? `<details class="party-history-story party-history-bonds"><summary>旅仲間の成長 <span>${entry.newAdventurerBondTiers.length}組</span></summary><div>${bondTierEntries}</div></details>`
        : "";
      const battleBondEntries = (entry.bondFormations || []).map(formation => `<article><small>${(formation.positions || []).map(position => `${Number(position) + 1}列`).join("・")} · 同行${formation.sharedSorties || 0}回</small><strong>${(formation.memberNames || []).map(escape).join("と")} · ${escape(formation.label || "旅仲間の布陣")}</strong><p>隣り合った二人が、戦列で互いの合図を拾いました。</p></article>`).join("");
      const battleBonds = battleBondEntries
        ? `<details class="party-history-story party-history-bonds"><summary>戦列の連携 <span>${entry.bondFormations.length}組</span></summary><div>${battleBondEntries}</div></details>`
        : "";
      const routeEvents = (entry.routeEvents || []).map(event => {
        const definition = window.GameData.config.explorationEvents.routeEvents.find(candidate => candidate.id === event.id);
        const attributeDefinitions = window.GameData.config.characterGrowth?.attributes?.definitions || {};
        const aptitude = event.naturalAptitudeApplied && event.actorName && event.attributeIds?.length ? `<small>導いた者：${escape(event.actorName)}（${event.attributeIds.map(id => escape(attributeDefinitions[id]?.shortName || attributeDefinitions[id]?.name || id)).join("・")}）</small>` : "";
        return `<article class="${event.success ? "success" : "failure"} ${event.rumorMatched ? "is-rumor-match" : ""}"><span>${event.rumorMatched ? "噂" : event.success ? "成" : "否"}</span><div><strong>${event.teamSurveyApplied ? "連携探索 · " : ""}${event.rumorMatched ? "噂と一致 · " : ""}${escape(definition?.name || "道中の出来事")}${event.naturalAptitudeApplied ? " · 基礎能力を活用" : ""}${event.personalPracticeApplied ? " · 本人の経験" : ""}${event.masteryApplied ? " · 記録活用" : ""}${event.bondSupportApplied ? ` · ${escape(event.bondSupportLabel || "旅仲間の連携")}` : ""}</strong>${aptitude}${event.teamSurveyMemberNames?.length ? `<small>地図を重ねた者：${event.teamSurveyMemberNames.map(escape).join("、")}</small>` : ""}${event.bondSupportMemberNames?.length ? `<small>息を合わせた者：${event.bondSupportMemberNames.map(escape).join("、")}</small>` : ""}<p>${escape(event.text)}</p></div></article>`;
      }).join("");
      const routeMasteries = (entry.routeMasteryIds || []).map(id => window.GameData.config.explorationEvents.routeEvents.find(event => event.id === id)?.name).filter(Boolean);
      const journey = routeEvents
        ? `<details class="party-history-journey"><summary>道中の記録 <span>成功 ${(entry.routeEvents || []).filter(event => event.success).length}/${entry.routeEvents.length}${routeMasteries.length ? ` · 知見完成 ${routeMasteries.length}種` : ""}</span></summary><div>${routeMasteries.length ? `<p class="party-history-mastery">知見が仲間へ共有された：${escape(routeMasteries.join("、"))}</p>` : ""}${routeEvents}</div></details>`
        : "";
      const growthEntries = (entry.growth || []).filter(growth => growth?.name && Number.isInteger(growth.level));
      const learnedCount = growthEntries.reduce((sum, growth) => sum + (growth.newSkillIds?.length || 0), 0);
      const growth = growthEntries.length
        ? `<details class="party-history-growth"><summary>成長の記録 <span>${growthEntries.length}人${learnedCount ? ` · 新スキル${learnedCount}種` : ""}</span></summary><div>${growthEntries.map(member => {
          const skills = (member.newSkillIds || []).map(id => window.GameData.skills[id]).filter(Boolean);
          const attributeDefinitions = window.GameData.config.characterGrowth?.attributes?.definitions || {};
          const attributes = window.Characters.attributeKeys().filter(key => Number(member.attributeChanges?.[key]) > 0).map(key => `${attributeDefinitions[key]?.shortName || attributeDefinitions[key]?.name || key}+${member.attributeChanges[key]}`).join("・");
          const labels = { hp: "HP", attack: "物攻", defense: "物防", magicAttack: "魔攻", magicDefense: "魔防", magicHealing: "魔回", speed: "速度", maxWeight: "重量上限" };
          const stats = Object.entries(member.statChanges || {}).filter(([, value]) => value).map(([key, value]) => `${labels[key] || key}+${value}`).join("・");
          const detail = [stats, ...skills.map(skill => `${window.GameData.config.skillCategories[skill.category] || "スキル"}「${skill.name}」`)].filter(Boolean).join("／");
          return `<article><span><strong>${escape(member.name)}</strong><small>Lv.${member.level}へ成長</small></span><p>${attributes ? `<b>基礎 ${escape(attributes)}</b>${detail ? "<br>" : ""}` : ""}${escape(detail || (attributes ? "" : "能力と装備可能重量が上昇"))}</p></article>`;
        }).join("")}</div></details>`
        : "";
      const equipment = entry.equipment.length ? entry.equipment.map(item => `<li><span>${escape(item.name)}</span><strong>×${item.quantity}${item.autoSold ? "・売却済" : ""}</strong></li>`).join("") : "<li>装備なし</li>";
      const materials = entry.materials.length ? entry.materials.map(item => `<li><span>${escape(window.GameData.items[item.itemId]?.name || item.itemId)}</span><strong>×${item.quantity}</strong></li>`).join("") : "<li>素材なし</li>";
      const reuse = `<div class="party-history-reuse"><span><strong>この探索条件を呼び戻す</strong><small>${escape(dungeon.name)} · ${entry.timeMultiplier || 1}倍探索</small></span><button class="button secondary" data-action="reuse-history-plan" data-party="${partyIndex}" data-dungeon="${entry.dungeonId}" data-difficulty="${entry.difficultyId || "normal"}" data-time="${entry.timeMultiplier || 1}" ${window.Party.expedition(partyIndex) ? "disabled" : ""}>出撃先に指定</button></div>`;
      const focused = historyFocus?.entryId === entry.id;
      return `<details class="party-history-record ${entry.success ? "success" : "failure"} ${focused ? "is-character-focus" : ""}" data-history-id="${escape(entry.id)}" ${focused || (!historyFocus && index === 0) ? "open" : ""}><summary><span class="party-history-mark">${entry.success ? "勝" : "退"}</span><span class="party-history-name"><small>${focused ? "人物の足跡から選択" : index === 0 ? "最新の帰還" : completed} · ${entry.timeMultiplier || 1}倍探索</small><strong>${escape(dungeon.name)}</strong></span><span class="party-history-reward"><strong>${formatGold(entry.gold)}</strong><small>EXP +${entry.exp}</small></span><span class="record-chevron" aria-hidden="true">›</span></summary><div class="party-history-detail">${focusedMemberRecord}${battleSummary}${damageHistory}${skillHistory}${memberHighlights}${newPartyReputationMoment}${partyReturnMoment}${lootReaction}${namedHuntSupport}${sharedHuntLedgerTier}${sharedHuntLedgerProgress}${targetedHarvest}${battleBonds}${journey}${adventurerBonds}${bondTierGrowth}${growth}${story}${previousComparison}${setup}${comparison}<div class="party-history-loot"><section><strong>装備 ${equipmentCount}点</strong><ul>${equipment}</ul></section><section><strong>素材 ${materialCount}個</strong><ul>${materials}</ul></section></div>${reuse}</div></details>`;
    }).join("");
    return `<section class="panel party-history-page"><div class="section-heading"><div><span class="label">EXPEDITION HISTORY</span><h3>遠征履歴</h3><p>新しい順に最大10件。詳細戦績は実際の戦闘記録を集計しています。</p></div><button class="button primary" data-action="party-view" data-view="results" ${window.Party.result(partyIndex) ? "" : "disabled"}>直近ログを開く</button></div>${harvestLedger}<div class="party-history-list">${records}</div></section>`;
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
    const trackedMonsterTarget = window.Encyclopedia.trackedMonsterTarget();
    const trackedMonster = trackedMonsterTarget ? window.GameData.monsters[trackedMonsterTarget.monsterId] : null;
    const trackedMonsterHabitats = trackedMonster ? window.Encyclopedia.monsterHabitats(trackedMonster.id) : [];
    const trackedMonsterHabitatKeys = new Set(trackedMonsterHabitats.map(habitat => `${habitat.dungeonId}:${habitat.difficultyId}`));
    const monsterTargetLocations = trackedMonster ? Object.values(window.GameData.dungeons)
      .filter(dungeon => window.Story.canEnter(dungeon.id)
        && trackedMonsterHabitats.some(habitat => habitat.dungeonId === dungeon.id))
      .sort((left, right) => {
        const leftChapter = window.GameData.storyChapters.find(chapter => chapter.id === left.chapterId)?.order || 0;
        const rightChapter = window.GameData.storyChapters.find(chapter => chapter.id === right.chapterId)?.order || 0;
        return leftChapter - rightChapter || (left.orderInChapter || 0) - (right.orderInChapter || 0);
      }) : [];
    const monsterTargetRoutes = monsterTargetLocations.flatMap(dungeon => window.DungeonDifficulty.ids()
      .filter(difficultyId => window.DungeonDifficulty.unlocked(dungeon.id, difficultyId)
        && trackedMonsterHabitatKeys.has(`${dungeon.id}:${difficultyId}`))
      .map(difficultyId => ({ dungeonId: dungeon.id, difficultyId })));
    const knownMonsterTargetDifficulties = new Set(monsterTargetRoutes.map(route => route.difficultyId)).size;
    const monsterTargetRouteButtons = monsterTargetRoutes.slice(0, 8).map(route => {
      const variant = window.DungeonDifficulty.variant(route.dungeonId, route.difficultyId);
      return `<button class="fleet-target-route" data-action="open-target-destination" data-dungeon="${route.dungeonId}" data-difficulty="${route.difficultyId}" ${targetPartyIndexes.length ? "" : "disabled"}>${escape(variant.name)}</button>`;
    }).join("");
    const monsterTargetRouteList = monsterTargetRoutes.length
      ? `<nav class="fleet-target-routes" aria-label="討伐目標の生息を確認した探索地と難度">${monsterTargetRouteButtons}${monsterTargetRoutes.length > 8 ? `<span>ほか${monsterTargetRoutes.length - 8}件</span>` : ""}</nav>`
      : `<span class="fleet-target-no-route">挑戦可能な生息地の記録はまだありません</span>`;
    const monsterTargetComplete = trackedMonsterTarget && trackedMonsterTarget.progress >= trackedMonsterTarget.quantity;
    const monsterHuntPartyStates = trackedMonster ? Array.from({ length: window.Party.limit() }, (_, index) => {
      const expedition = window.Party.expedition(index), plan = window.Party.plan(index);
      if (expedition && expedition.trackedMonsterId === trackedMonster.id && trackedMonsterHabitatKeys.has(`${expedition.dungeonId}:${expedition.difficultyId || "normal"}`)) return "active";
      if (!expedition && window.Party.members(index).length && plan && trackedMonsterHabitatKeys.has(`${plan.dungeonId}:${plan.difficultyId || "normal"}`)) return "planned";
      return null;
    }) : [];
    const activeMonsterHuntParties = monsterHuntPartyStates.filter(state => state === "active").length;
    const plannedMonsterHuntParties = monsterHuntPartyStates.filter(state => state === "planned").length;
    const monsterHuntPartySummary = [activeMonsterHuntParties ? `追跡中 ${activeMonsterHuntParties}隊` : "", plannedMonsterHuntParties ? `出発待ち ${plannedMonsterHuntParties}隊` : ""].filter(Boolean).join("・") || "追跡へ向かう隊は未指定";
    const nextMonsterHuntMark = trackedMonster ? window.Encyclopedia.huntMarks(trackedMonster.id).find(mark => !mark.achieved) : null;
    const monsterDefeated = trackedMonster ? Math.max(0, Number(window.Encyclopedia.monster(trackedMonster.id)?.defeated) || 0) : 0;
    const nextMonsterHuntCount = nextMonsterHuntMark ? Math.max(1, nextMonsterHuntMark.threshold - monsterDefeated) : 100;
    const continueMonsterTarget = monsterTargetComplete
      ? `<button class="button primary" data-action="track-monster" data-monster="${escape(trackedMonster.id)}" data-target-quantity="${trackedMonsterTarget.progress + nextMonsterHuntCount}">${nextMonsterHuntMark ? "次の節目へ" : "さらに追う"}・あと${nextMonsterHuntCount}体</button>`
      : "";
    const monsterTargetStrip = trackedMonster ? `<section class="fleet-target-strip monster-target ${monsterTargetComplete ? "is-complete" : ""}"><span class="fleet-target-icon" aria-hidden="true">${escape(trackedMonster.icon || "♟")}</span><div><small>現在の討伐目標</small><strong>${escape(trackedMonster.name)}</strong><span>${monsterTargetComplete ? "達成" : "追跡中"} ${trackedMonsterTarget.progress}/${trackedMonsterTarget.quantity}体・生息地 ${monsterTargetLocations.length}か所／確認難度 ${knownMonsterTargetDifficulties}種・${monsterHuntPartySummary}</span><i><b style="width:${Math.min(100, trackedMonsterTarget.progress / trackedMonsterTarget.quantity * 100)}%"></b></i>${monsterTargetRouteList}</div><div>${continueMonsterTarget}<button class="button ghost" data-action="open-monster-codex">図鑑で変更</button></div></section>` : "";
    const harvestTargetRoutes = trackedItem && trackedMonster
      ? monsterTargetRoutes.filter(route => trackedHarvestReady(trackedItem.id, trackedMonster.id, route.dungeonId, route.difficultyId))
      : [];
    const harvestTargetRouteButtons = harvestTargetRoutes.slice(0, 4).map(route => {
      const variant = window.DungeonDifficulty.variant(route.dungeonId, route.difficultyId);
      return `<button class="fleet-target-route" data-action="open-target-destination" data-dungeon="${route.dungeonId}" data-difficulty="${route.difficultyId}" ${targetPartyIndexes.length ? "" : "disabled"}>${escape(variant.name)}</button>`;
    }).join("");
    const harvestTargetRouteList = harvestTargetRoutes.length
      ? `<nav class="fleet-target-routes" aria-label="狙い採りを確認した探索地と難度">${harvestTargetRouteButtons}${harvestTargetRoutes.length > 4 ? `<span>ほか${harvestTargetRoutes.length - 4}件</span>` : ""}</nav>`
      : "";
    const harvestLedgerPairs = trackedItem && trackedMonster ? window.Characters.sharedHuntLedgerPairs(trackedMonster.id, trackedItem.id) : [];
    const harvestLedgerPairList = harvestLedgerPairs.length ? `<div class="fleet-hunt-ledger-pairs"><small>この獲物の狩り帳 ${harvestLedgerPairs.length}組</small><div>${harvestLedgerPairs.slice(0, 3).map(pair => {
      const partyIndex = Array.from({ length: window.Party.limit() }, (_, index) => index).find(index => pair.memberIds.every(id => window.Party.ids(index).includes(id)));
      const partyState = Number.isInteger(partyIndex) ? `${escape(window.Party.name(partyIndex))}・${window.Party.expedition(partyIndex) ? "探索中" : "編成中"}` : "待機中の二人";
      const epithet = pair.tier?.epithet?.replace("{monster}", trackedMonster.name);
      const nextPage = pair.progress.nextTier
        ? `次の「${escape(pair.progress.nextTier.label)}」まであと${pair.progress.remaining}回`
        : "狩り名が定着した最終頁";
      return `<button type="button" data-action="open-adventurer-bonds" data-bond="${escape(pair.key)}" data-monster="${escape(trackedMonster.id)}" data-item="${escape(trackedItem.id)}"><strong>${pair.memberNames.map(escape).join(" × ")}</strong><span>${epithet ? `${escape(epithet)} · ` : ""}${escape(pair.tier?.label || "書き始めの頁")} · ${partyState}</span><em>${nextPage}<i><b style="width:${Math.round(pair.progress.ratio * 100)}%"></b></i></em></button>`;
    }).join("")}${harvestLedgerPairs.length > 3 ? `<small>ほか${harvestLedgerPairs.length - 3}組</small>` : ""}</div></div>` : "";
    const harvestTargetStrip = harvestTargetRoutes.length ? `<section class="fleet-target-strip harvest-target ${targetComplete && monsterTargetComplete ? "is-complete" : ""}"><span class="fleet-target-icon" aria-hidden="true">⌖</span><div><small>狙い採りの記録</small><strong>${escape(trackedMonster.icon || "♟")} ${escape(trackedMonster.name)} → ${escape(trackedItem.icon || "◇")} ${escape(trackedItem.name)}</strong><span>${monsterHuntPartySummary}・確認済みの探索地 ${harvestTargetRoutes.length}件</span><div class="harvest-target-progress"><span>品 ${trackedTarget.progress}/${trackedTarget.quantity}<i><b style="width:${Math.min(100, trackedTarget.progress / trackedTarget.quantity * 100)}%"></b></i></span><span>討伐 ${trackedMonsterTarget.progress}/${trackedMonsterTarget.quantity}体<i><b style="width:${Math.min(100, trackedMonsterTarget.progress / trackedMonsterTarget.quantity * 100)}%"></b></i></span></div>${harvestLedgerPairList}${harvestTargetRouteList}</div><div>${targetRecipeButton}${continueMonsterTarget}<button class="button ghost" data-action="open-item-codex">品の図鑑</button><button class="button ghost" data-action="open-monster-codex">魔物図鑑</button></div></section>` : "";
    const trackingStrips = harvestTargetStrip || `${targetStrip}${monsterTargetStrip}`;
    const partyPlanReady = index => {
      const members = window.Party.members(index), plan = window.Party.plan(index);
      return Boolean(!window.Party.expedition(index) && members.length && plan && window.DungeonPartyRules.check(plan.dungeonId, members).ok);
    };
    const readyPartyCount = Array.from({ length: window.Party.limit() }, (_, index) => index).filter(partyPlanReady).length;
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
        if (hasMembers && window.Party.plan(index) && partyPlanReady(index)) return 0;
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
        const entry = window.GameData.config.partyProgression.partySlots.unlocks.find(candidate => candidate.slot === slot);
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
      const partyRuleCheck = destination ? window.DungeonPartyRules.check(destination, members) : { ok: true, restricted: false, message: "" };
      const activeDungeon = expedition ? window.DungeonDifficulty.variant(expedition.dungeonId, expedition.difficultyId || "normal") : null;
      const restrictionWarning = !partyRuleCheck.ok ? `<small class="fleet-restriction-warning">編成条件未達：${escape(partyRuleCheck.message)}</small>` : "";
      const huntAssignment = monsterHuntPartyStates[index] === "active"
        ? `<small class="fleet-hunt-assignment is-active">${escape(trackedMonster.icon || "♟")} 討伐目標を追跡中</small>`
        : monsterHuntPartyStates[index] === "planned"
          ? `<small class="fleet-hunt-assignment">${escape(trackedMonster.icon || "♟")} 次の出撃で討伐地へ</small>`
          : "";
      const journey = expedition ? `<div class="fleet-journey" data-expedition="${index}"><strong>${escape(activeDungeon.name)} · ${expedition.timeMultiplier}倍探索</strong>${huntAssignment}<span>残り <strong class="fleet-timer" data-countdown="${index}">${time(window.Dungeon.remaining(index))}</strong></span><div class="progress"><i style="width:${percent}%"></i></div><small>時間経過 <span data-overview-percent>${Math.floor(percent)}</span>%</small></div>` : `<div class="fleet-journey"><strong>${members.length && destination ? `攻略先：${escape(destination.name)} · ${multiplier}倍探索` : members.length ? "攻略先を設定してください" : "仲間を加えてパーティを編成"}</strong>${huntAssignment}${restrictionWarning}${result ? `<small><span class="fleet-result-mark ${resultState}">${result.success ? "攻略成功" : "撤退"}</span>${escape(result.dungeonName || window.GameData.dungeons[result.dungeonId].name)}</small>${compactResultLoot(result, escape, formatGold)}${compactHistory(state.partyHistory[index], index, escape, formatGold)}` : "<small>探索記録なし</small>"}</div>`;
      const memberStrip = members.length ? members.map((member, position) => {
        const stat = window.Characters.stats(member);
        const recordTitle = window.Characters.recordTitle(member);
        return `<span class="fleet-member"${recordTitle ? ` title="${escape(recordTitle.name)}"` : ""}><span class="fleet-member-level">Lv.${member.level}</span>${portraitImage(member, true)}<strong>${escape(member.name)}</strong>${recordTitle ? `<small class="fleet-member-title">${escape(recordTitle.icon)} ${escape(recordTitle.name)}</small>` : ""}<small>HP ${stat.hp}</small><i>${position + 1}</i></span>`;
      }).join("") : `<span class="fleet-empty-member">メンバーなし</span>`;
      const partyName = window.Party.name(index);
      const memberLimit = window.Party.memberLimit(), vacancies = Math.max(0, memberLimit - members.length);
      const matchingPreset = window.Presets.slots().find((preset, slot) => preset && window.Presets.matches(slot, index));
      const changedPreset = matchingPreset ? null : window.Presets.slots().find((preset, slot) => preset && window.Presets.lineupMatches(slot, index));
      const presetState = matchingPreset ? `保存「${escape(matchingPreset.name)}」` : changedPreset ? `保存「${escape(changedPreset.name)}」と差あり` : "";
      const presetLink = presetState ? `<button class="fleet-preset-link ${changedPreset ? "is-changed" : ""}" data-action="open-party-presets" data-party="${index}" aria-label="${escape(partyName)}の編成プリセットを開く">${presetState}</button>` : "";
      const bondMembers = members.map((member, position) => ({
        id: member.id, name: member.name, position,
        sharedSorties: Object.fromEntries(window.Characters.sharedSorties(member).map(entry => [entry.characterId, entry.count]))
      }));
      const bondPairs = window.Battle.bondFormationPairs(bondMembers);
      const bondTitle = bondPairs.map(pair => `${pair.left.name}・${pair.right.name}：${pair.tier.label}`).join("／");
      const bondStatus = bondPairs.length ? `<span class="fleet-bond-status" title="${escape(bondTitle)}">旅仲間 ${bondPairs.length}組</span>` : "";
      const namedHunts = window.Characters.namedHuntsForMembers(members.map(member => member.id));
      const namedHunt = namedHunts[0];
      const namedHuntStatus = namedHunt
        ? `<button class="fleet-named-hunt-link" data-action="open-adventurer-bonds" data-bond="${escape(namedHunt.bondKey)}" data-monster="${escape(namedHunt.monsterId)}" data-item="${escape(namedHunt.itemId)}" aria-label="${escape(namedHunt.epithet)}の狩り帳を開く">狩り名「${escape(namedHunt.epithet)}」${namedHunts.length > 1 ? `ほか${namedHunts.length - 1}頁` : ""}</button>`
        : "";
      const memberIds = new Set(members.map(member => member.id));
      const developingHunts = window.Characters.developingHuntLedgers().filter(entry => entry.memberIds.every(id => memberIds.has(id)));
      const developingHunt = developingHunts.find(entry => entry.monsterId === trackedMonster?.id && entry.itemId === trackedItem?.id) || developingHunts[0];
      const developingHuntStatus = developingHunt
        ? `<button class="fleet-developing-hunt-link" data-action="open-adventurer-bonds" data-bond="${escape(developingHunt.bondKey)}" data-monster="${escape(developingHunt.monsterId)}" data-item="${escape(developingHunt.itemId)}" aria-label="${developingHunt.members.map(member => escape(member.name)).join("と")}の狩り帳を開く">狩り帳「${escape(developingHunt.monster.name)}」· 次の${escape(developingHunt.progress.nextTier.label)}まであと${developingHunt.progress.remaining}回${developingHunts.length > 1 ? `ほか${developingHunts.length - 1}頁` : ""}</button>`
        : "";
      const reputationMoment = window.Characters.expeditionRoleConversation(members);
      const partyMood = reputationMoment ? `<details class="fleet-party-mood"><summary><span>隊の空気</span><strong>${escape(reputationMoment.label)}</strong><i aria-hidden="true">⌄</i></summary><p>${escape(reputationMoment.text)}</p></details>` : "";
      const partyPower = Math.round(window.Party.power(index)).toLocaleString("ja-JP");
      return `<article class="party-overview-row ${active ? "is-selected" : ""} ${expedition ? "is-exploring" : result ? `is-last-${resultState}` : ""} ${unreadResult ? "has-unread-result" : ""}" data-party-overview="${index}"><div class="fleet-party"><button class="fleet-party-select" data-action="rename-party" data-party="${index}" aria-label="${escape(partyName)}の名前を変更"><span>${escape(partyName)}</span><i aria-hidden="true">✎</i></button><span class="fleet-status ${expedition ? "exploring" : resultState}">${status}</span>${unreadResult ? '<span class="fleet-new-result">NEW</span>' : ""}<div class="fleet-party-meta" aria-label="第${index + 1}隊の編成情報"><span>第${index + 1}隊</span><span>${members.length}/${memberLimit}人</span><span>${vacancies ? `空き${vacancies}` : "満員"}</span><span>戦力 ${partyPower}</span>${bondStatus}${namedHuntStatus}${developingHuntStatus}${presetLink}</div><div class="fleet-member-strip">${memberStrip}</div>${partyMood}</div>${journey}<div class="fleet-actions"><button class="button ghost" data-action="party-open" data-party="${index}" data-view="formation" aria-label="${escape(partyName)}を編成する">パーティを編成する</button>${expedition ? `<button class="button ghost" data-action="party-open" data-party="${index}" data-view="adventure" aria-label="${escape(partyName)}の探索ログ">探索ログ</button>` : `<button class="button primary" data-action="quick-start-party" data-party="${index}" aria-label="${escape(partyName)}を${destination ? escape(destination.name) : "設定した攻略先"}へ出撃" ${!members.length || !destination || !partyRuleCheck.ok ? "disabled" : ""}>出撃</button>`}<button class="button secondary ${unreadResult ? "has-notice" : ""}" data-action="party-open" data-party="${index}" data-view="results" aria-label="${escape(partyName)}の直近ログ${unreadResult ? "・未読" : ""}" ${!result ? "disabled" : ""}>直近ログ${unreadResult ? "・新着" : ""}</button></div></article>`;
    }).join("");
    const stateFilters = `<nav class="fleet-state-filters" aria-label="パーティの状態で絞り込み">${[["all", "全隊"], ["exploring", "探索中"], ["waiting", "待機中"], ["reports", "報告あり"]].map(([id, label]) => {
      const unread = id === "reports" ? unreadReports : 0;
      return `<button class="${partyOverviewFilter === id ? "is-active" : ""}${unread ? " has-unread" : ""}" data-action="party-overview-filter" data-filter="${id}" aria-pressed="${partyOverviewFilter === id}">${label} ${partyCounts[id]}${unread ? `<i aria-label="未読${unread}件">新${unread}</i>` : ""}</button>`;
    }).join("")}</nav>`;
    const emptyRows = rows || `<div class="fleet-filter-empty"><strong>該当するパーティはありません</strong><button class="button ghost" data-action="party-overview-filter" data-filter="all">全隊を表示</button></div>`;
    const futureSlots = partyOverviewFilter === "all" && hiddenPartyCount ? `<div class="fleet-future-slots"><span aria-hidden="true">＋</span><div><strong>さらに${hiddenPartyCount}枠のパーティを増設できます</strong><small>章を進めると、次の増設候補が順番に表示されます。第8枠はコード特典です。</small></div></div>` : "";
    return `<section class="panel party-overview"><div class="section-heading fleet-overview-heading"><div><span class="label">ADVENTURE PARTIES</span><h3>冒険の準備</h3></div><div class="fleet-overview-actions"><strong>${window.Dungeon.activeCount()}/${window.Party.limit()}隊が探索中</strong><button class="button primary" data-action="depart-ready-parties" ${readyPartyCount ? "" : "disabled"}>待機隊を一斉出撃${readyPartyCount ? ` (${readyPartyCount})` : ""}</button></div></div>${trackingStrips}${stateFilters}<div class="fleet-list">${emptyRows}</div>${futureSlots}<p class="small-note">一斉出撃は、編成済みで攻略先を保存してある待機隊だけを、押した時にまとめて出発させます。自動で再出撃はしません。個別の編成は「パーティを編成する」、進行中の記録は「探索ログ」、前回の結果は「直近ログ」から確認できます。</p></section>`;
  }

  function adventure(context) {
    const { activeJournalPanel, departureSummary, empty, escape, explorationChoices, time } = context;
    if (!window.Party.members().length) return empty("出撃する仲間を選んでください", "まず編成画面で冒険者を加えてください。", '<button class="button primary" data-action="party-view" data-view="formation">編成へ</button>');
    const expedition = window.Party.expedition();
    if (expedition) return `<section class="party-live-summary"><span>探索中</span><strong>${escape(window.DungeonDifficulty.variant(expedition.dungeonId, expedition.difficultyId || "normal").name)}</strong><small>帰還まで <b data-countdown="${window.Party.selected()}">${time(window.Dungeon.remaining())}</b></small></section>${departureSummary()}${activeJournalPanel(expedition)}`;
    const destination = selectedVariant(context, window.Party.selected());
    const multiplier = destination ? (explorationChoices[window.Party.selected()][destination.baseDungeonId] || 1) : 1;
    const partyRuleCheck = destination ? window.DungeonPartyRules.check(destination, window.Party.members()) : { ok: true, restricted: false, message: "" };
    const trackedTarget = window.Encyclopedia.trackedTarget();
    const tracked = trackedTarget ? window.GameData.items[trackedTarget.itemId] : null;
    const monsterTarget = window.Encyclopedia.trackedMonsterTarget();
    const trackedMonster = monsterTarget ? window.GameData.monsters[monsterTarget.monsterId] : null;
    const trackedHarvestReadyHere = Boolean(tracked && trackedMonster && destination
      && trackedHarvestReady(tracked.id, trackedMonster.id, destination.baseDungeonId, destination.difficultyId));
    const harvestPractitioner = trackedHarvestReadyHere ? window.Party.members().map(member => {
      const practice = window.Characters.targetedHarvestPractice(member, trackedMonster.id, tracked.id);
      return practice.tier ? { member, ...practice } : null;
    }).filter(Boolean).sort((left, right) => right.tier.multiplier - left.tier.multiplier || right.record.successes - left.record.successes)[0] || null : null;
    const harvestTracker = trackedHarvestReadyHere ? window.Party.members().map(member => {
      const persistence = window.Characters.targetedHarvestPersistence(member, trackedMonster.id, tracked.id);
      return persistence.tier ? { member, ...persistence } : null;
    }).filter(Boolean).sort((left, right) => right.tier.multiplier - left.tier.multiplier || right.misses - left.misses)[0] || null : null;
    const harvestConsultation = window.Characters.targetedHarvestConsultation(
      harvestPractitioner ? { characterId: harvestPractitioner.member.id, characterName: harvestPractitioner.member.name, tierName: harvestPractitioner.tier.label } : null,
      harvestTracker ? { characterId: harvestTracker.member.id, characterName: harvestTracker.member.name, tierName: harvestTracker.tier.label } : null
    );
    const harvestConsultationLedger = window.Characters.targetedHarvestConsultationLedger(
      harvestPractitioner ? { characterId: harvestPractitioner.member.id, characterName: harvestPractitioner.member.name } : null,
      harvestTracker ? { characterId: harvestTracker.member.id, characterName: harvestTracker.member.name } : null,
      trackedMonster?.id, tracked?.id
    );
    const harvestConsultationEpithet = harvestConsultationLedger?.tier.epithet?.replace("{monster}", trackedMonster?.name || "獲物");
    const harvestLedgerProgress = harvestConsultationLedger?.progress;
    const harvestLedgerProgressText = harvestLedgerProgress?.nextTier
      ? `次の頁「${escape(harvestLedgerProgress.nextTier.label)}」まであと${harvestLedgerProgress.remaining}回（${harvestLedgerProgress.successes}/${harvestLedgerProgress.nextTier.minimumSuccesses}）`
      : harvestLedgerProgress ? "狩り名が定着した最終頁" : "";
    const trackedGuide = tracked ? `<section class="tracked-loot-guide ${trackedTarget.progress >= trackedTarget.quantity ? "is-complete" : ""}"><span>探索目標</span><strong>${escape(tracked.icon || "◇")} ${escape(tracked.name)}</strong><small>${trackedTarget.progress >= trackedTarget.quantity ? "達成済み" : "収集中"} ${trackedTarget.progress}/${trackedTarget.quantity}・${trackedHarvestReadyHere ? `この土地では${escape(trackedMonster.name)}から狙って採る支度ができます。` : "過去の入手記録がある攻略先に印を付けています。"}</small></section>` : "";
    const trackedMonsterTrailReady = Boolean(trackedMonster && destination && !trackedMonster.boss
      && window.Encyclopedia.monsterHabitats(trackedMonster.id).some(habitat => habitat.dungeonId === destination.baseDungeonId && habitat.difficultyId === destination.difficultyId)
      && window.Encyclopedia.habitatSurvey(destination.baseDungeonId, destination.difficultyId).complete);
    const monsterGuide = trackedMonster ? `<section class="tracked-loot-guide tracked-monster-guide ${monsterTarget.progress >= monsterTarget.quantity ? "is-complete" : ""}"><span>討伐目標</span><strong>${escape(trackedMonster.icon || "♟")} ${escape(trackedMonster.name)}</strong><small>${monsterTarget.progress >= monsterTarget.quantity ? "達成済み" : "追跡中"} ${monsterTarget.progress}/${monsterTarget.quantity}体・${trackedMonsterTrailReady ? "この土地では現地調査簿を頼りに痕跡を追えます。" : "遭遇記録のある攻略先に印を付けています。"}</small></section>` : "";
    const harvestGuide = trackedHarvestReadyHere ? `<section class="tracked-loot-guide tracked-harvest-guide ${trackedTarget.progress >= trackedTarget.quantity && monsterTarget.progress >= monsterTarget.quantity ? "is-complete" : ""}"><span>狙い採り</span><strong>${escape(trackedMonster.icon || "♟")} ${escape(trackedMonster.name)} → ${escape(tracked.icon || "◇")} ${escape(tracked.name)}</strong><small>品 ${trackedTarget.progress}/${trackedTarget.quantity}・討伐 ${monsterTarget.progress}/${monsterTarget.quantity}体。この土地で確かめた採取記録を携えて出発します。</small>${harvestPractitioner ? `<small class="harvest-practice-note">${escape(harvestPractitioner.member.name)}には「${escape(harvestPractitioner.tier.label)}」手覚えがあります。</small>` : ""}${harvestTracker ? `<small class="harvest-practice-note">${escape(harvestTracker.member.name)}は「${escape(harvestTracker.tier.label)}」採れなかった跡も手掛かりにします。</small>` : ""}${harvestConsultation ? `<small class="harvest-consultation-note"><b>${harvestConsultationLedger ? `${harvestConsultationEpithet ? escape(harvestConsultationEpithet) : "二人の狩り帳"}・${escape(harvestConsultationLedger.tier.label)}` : "狩りの相談"}</b>${escape(harvestConsultationLedger ? `以前綴じた一冊を二人で開き直した。${harvestConsultationLedger.tier.departure}` : harvestConsultation.departure)}${harvestLedgerProgressText ? `<span class="harvest-ledger-progress">${harvestLedgerProgressText}<i><b style="width:${Math.round(harvestLedgerProgress.ratio * 100)}%"></b></i></span>` : ""}${harvestConsultationLedger?.tier.combatSupport ? `<em>${escape(harvestConsultationLedger.tier.combatSupport.label)} · ${escape(harvestConsultationLedger.tier.combatSupport.description)}</em>` : ""}</small>` : ""}</section>` : "";
    const trackingGuides = harvestGuide || `${trackedGuide}${monsterGuide}`;
    const restrictionMessage = !partyRuleCheck.ok ? `<small class="departure-restriction-warning">編成条件未達：${escape(partyRuleCheck.message)}</small>` : partyRuleCheck.restricted ? `<small class="departure-restriction-ready">編成条件を満たしています</small>` : "";
    return `${departureSummary()}<section class="departure-selection-bar"><div><span>選択中の攻略先</span><strong>${destination ? `${escape(destination.name)} · ${multiplier}倍探索` : "攻略先を選択してください"}</strong>${restrictionMessage}</div><button class="button primary" data-action="quick-start-party" data-party="${window.Party.selected()}" ${destination && partyRuleCheck.ok ? "" : "disabled"}>この攻略先へ出撃</button></section><div class="section-heading route-selection-heading"><div><span class="label">DESTINATION</span><h3>攻略先を選択</h3></div></div><p class="small-note">章を切り替えて攻略先を選びます。探索時間が長いほど連戦・報酬が増えますが、時間あたりの報酬は等倍が有利です。</p>${trackingGuides}${chapterNavigator(context)}${dungeonCards(context)}`;
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
    const monsterTarget = window.Encyclopedia.trackedMonsterTarget();
    const trackedMonster = monsterTarget ? window.GameData.monsters[monsterTarget.monsterId] : null;
    const trackedMonsterHabitatKeys = new Set((trackedMonster ? window.Encyclopedia.monsterHabitats(trackedMonster.id) : []).map(habitat => `${habitat.dungeonId}:${habitat.difficultyId}`));
    const partyHistory = window.GameState.data.partyHistory?.[partyIndex] || [];
    const currentRumor = window.ExpeditionRumors?.current() || null;
    function routeCards(group) { return group.map((dungeon, index) => {
      const emblem = dungeon.color === "green" ? "♧" : dungeon.color === "blue" ? "◭" : "⌘";
      const routeNumber = dungeon.requiredForStory ? String(dungeon.orderInChapter).padStart(2, "0") : String(index + 1).padStart(2, "0");
      const routeLabel = postgame ? `星後遠征 ${routeNumber}` : dungeon.requiredForStory ? `本編 ${routeNumber}` : `任意高難度 ${routeNumber}`;
      if (!window.Story.canEnter(dungeon.id)) return `<article class="dungeon-card compact-route locked-dungeon ${dungeon.color}"><div class="dungeon-route-summary"><span class="dungeon-route-emblem" aria-hidden="true">${emblem}</span><div class="dungeon-route-name"><span>${routeLabel}</span><h3>${escape(dungeon.name)}</h3><p>${escape(dungeon.description)}</p></div><span class="badge">未解放</span></div><div class="dungeon-route-locked"><p class="story-lock-condition">${escape(window.Story.dungeonCondition(dungeon.id))}</p><button class="button ghost" data-nav="home">物語を確認</button></div></article>`;
      const difficultyId = selectedDifficultyId(context, partyIndex, dungeon.id);
      const variant = window.DungeonDifficulty.variant(dungeon, difficultyId);
      const habitatSurvey = window.Encyclopedia.habitatSurvey(dungeon.id, difficultyId);
      const trackedTreasure = trackedSources?.treasures.some(source => source.dungeonId === dungeon.id);
      const trackedMonsters = trackedSources?.monsters.filter(source => source.dungeonId === dungeon.id && source.difficultyId === difficultyId) || [];
      const trackedHere = trackedTreasure || trackedMonsters.length > 0;
      const trackedClue = [trackedTreasure ? "宝箱" : "", trackedMonsters.length ? `${new Set(trackedMonsters.map(source => source.monsterId)).size}種の魔物` : ""].filter(Boolean).join("・");
      const lootTier = window.MonsterLoot ? Math.max(...window.MonsterLoot.standardPool(variant).map(item => item.tier || 1)) : 1;
      const drops = `討伐した魔物の分類に応じたTier ${lootTier}前後の装備。素材と固有品は魔物ごとに異なる。`;
      const monsterIds = Array.from(new Set(dungeon.encounters.flatMap(encounter => encounter.groups.flat())));
      const trackedMonsterHere = trackedMonster && trackedMonsterHabitatKeys.has(`${dungeon.id}:${difficultyId}`);
      const trackedMonsterTrailReady = trackedMonsterHere && habitatSurvey.complete && !trackedMonster.boss;
      const trackedHarvestReadyHere = trackedHere && trackedMonsterHere && trackedHarvestReady(trackedItem.id, trackedMonster.id, dungeon.id, difficultyId);
      const trackedBadge = trackedHere ? `<p class="tracked-loot-match"><span>探索目標の記録あり</span><strong>${escape(trackedItem.icon || "◇")} ${escape(trackedItem.name)}</strong><small>${trackedHarvestReadyHere ? `${escape(trackedMonster.name)}から狙って採れます` : escape(trackedClue)}</small></p>` : "";
      const trackedMonsterBadge = trackedMonsterHere ? `<p class="tracked-loot-match tracked-monster-match"><span>討伐目標の生息記録あり</span><strong>${escape(trackedMonster.icon || "♟")} ${escape(trackedMonster.name)}</strong><small>${trackedHarvestReadyHere ? "採取記録あり・対象品を狙えます" : trackedMonsterTrailReady ? "現地調査済み・痕跡を追えます" : "この攻略先で遭遇を確認済み"}</small></p>` : "";
      const trackedHarvestBadge = trackedHarvestReadyHere ? `<p class="tracked-loot-match tracked-harvest-match"><span>狙い採りの記録あり</span><strong>${escape(trackedMonster.icon || "♟")} ${escape(trackedMonster.name)} → ${escape(trackedItem.icon || "◇")} ${escape(trackedItem.name)}</strong><small>この難度で採取を確認済み</small></p>` : "";
      const trackingBadges = trackedHarvestBadge || `${trackedBadge}${trackedMonsterBadge}`;
      const monsters = monsterIds.map(id => window.DungeonDifficulty.monster(id, difficultyId));
      const monsterPreview = monsters.map(monster => {
        const knownHere = window.Encyclopedia.monsterHabitats(monster.id).some(habitat => habitat.dungeonId === dungeon.id && habitat.difficultyId === difficultyId);
        return `<span class="monster-chip ${monster.boss && knownHere ? "boss" : ""}">${knownHere ? `${monster.icon} ${escape(monster.name)}` : "？ 未確認"}</span>`;
      }).join("") + dungeonIntel(dungeon, monsters);
      const rivalBossIds = new Set(monsterIds.filter(id => window.GameData.monsters[id]?.boss));
      const rivalryMembers = window.Party.members(partyIndex).filter(member => window.Characters.activeBossRivalries(member).some(entry => rivalBossIds.has(entry.bossId)));
      const rivalryLead = rivalryMembers.length ? `<p class="dungeon-rivalry-lead"><span>因縁の再戦</span><strong>${rivalryMembers.map(member => escape(member.name)).join("、")}</strong><small>以前の撤退で見た動きを覚えている。</small></p>` : "";
      const namedHunts = window.Characters.namedHuntsForMembers(window.Party.ids(partyIndex), monsterIds)
        .filter(hunt => trackedHarvestReady(hunt.itemId, hunt.monsterId, dungeon.id, difficultyId));
      const namedHuntLead = namedHunts.length ? `<section class="dungeon-named-hunts"><header><span aria-hidden="true">狩</span><span><small>NAMED HUNTERS</small><strong>この隊の狩り名が通る獲物</strong></span></header><div>${namedHunts.slice(0, 2).map(hunt => `<article><span><strong>${escape(hunt.epithet)}</strong><small>${hunt.members.map(member => escape(member.name)).join(" × ")} · ${escape(hunt.item.name)}</small></span><button type="button" class="button ghost" data-action="prepare-named-hunt" data-bond="${escape(hunt.bondKey)}" data-monster="${escape(hunt.monsterId)}" data-item="${escape(hunt.itemId)}" data-dungeon="${escape(dungeon.id)}" data-difficulty="${escape(difficultyId)}" ${busy ? "disabled" : ""}>この名の狩りを支度</button></article>`).join("")}</div>${namedHunts.length > 2 ? `<small>ほか${namedHunts.length - 2}組の狩り名も、この探索地で手掛かりを使えます。</small>` : ""}</section>` : "";
      const selected = dungeon.id === selectedId;
      const partyRuleCheck = window.DungeonPartyRules.check(dungeon, window.Party.members(partyIndex));
      const restrictionCompanions = window.DungeonPartyRules.companionIds(dungeon)
        .map(id => window.Companions.definition(id))
        .filter(Boolean);
      const restrictionPortraits = restrictionCompanions.length
        ? `<div class="dungeon-restriction-companions">${restrictionCompanions.map(companion => {
          const portrait = window.GameData.portraits[companion.portraitId];
          return `<span>${portrait ? `<img src="${escape(portrait.image)}" alt="" loading="lazy">` : ""}<b>${escape(companion.name)}</b></span>`;
        }).join("")}</div>`
        : "";
      const partyRestriction = partyRuleCheck.restricted
        ? `<div class="dungeon-party-restriction ${partyRuleCheck.ok ? "is-ready" : "is-unmet"}"><span>編成条件</span><strong>${escape(partyRuleCheck.descriptions.join("・"))}</strong>${restrictionPortraits}<small>${partyRuleCheck.ok ? "現在のパーティは条件を満たしています。" : escape(partyRuleCheck.message)}</small></div>`
        : "";
      const multiplier = explorationChoices[window.Party.selected()][dungeon.id] || 1;
      const previousAttempt = partyHistory.find(entry => entry.dungeonId === dungeon.id
        && (entry.difficultyId || "normal") === difficultyId
        && (entry.timeMultiplier || 1) === multiplier
        && entry.battle);
      const previousBattle = previousAttempt?.battle;
      const previousAttemptRecord = previousBattle
        ? `<p class="dungeon-attempt-record ${previousAttempt.success ? "success" : "failure"}"><span>この隊の前回・${multiplier}倍探索</span><strong>${previousAttempt.success ? "攻略成功" : "撤退"}　${previousBattle.encountersCleared}/${previousBattle.totalEncounters}戦</strong><small>討伐 ${previousBattle.monstersDefeated}体</small></p>`
        : "";
      const previousRecord = previousAttemptRecord + rivalryLead;
      const rumorDefinition = currentRumor?.dungeonId === dungeon.id ? window.ExpeditionRumors.definition(currentRumor) : null;
      const rumorNote = rumorDefinition ? `<p class="dungeon-rumor-note"><span>${escape(rumorDefinition.icon)} 旅人の噂</span><strong>${escape(rumorDefinition.name)}</strong><small>${escape(rumorDefinition.text)}</small></p>` : "";
      const routeRumor = window.Exploration.routeRumor(dungeon);
      const routeRumorEntry = window.Exploration.routeRumorEntry(dungeon);
      const routeRumorRecord = window.Story.ensure().facts.routeEvents?.[routeRumorEntry.eventId];
      const routeRumorStatus = (routeRumorRecord?.rumorMatches || 0) > 0
        ? `<small class="dungeon-route-rumor-status is-confirmed">以前の遠征で、この兆しを実地確認済み</small>`
        : `<small class="dungeon-route-rumor-status">まだ記録と結び付いていない噂</small>`;
      const routeRumorLead = (routeRumorRecord?.rumorMatches || 0) > 0
        ? `<span class="dungeon-route-rumor-lead is-confirmed">噂を照合済み</span>`
        : `<span class="dungeon-route-rumor-lead">未照合の噂あり</span>`;
      const routeMasteryThreshold = window.GameData.config.explorationEvents?.routeMastery?.successes || 3;
      const knownRouteMasteryIds = (window.GameData.config.explorationEvents?.routeEvents || [])
        .filter(event => (window.Story.ensure().facts.routeEvents?.[event.id]?.successes || 0) >= routeMasteryThreshold)
        .map(event => event.id);
      const routeReadiness = window.Exploration.routeReadiness(dungeon, window.Party.members(partyIndex), knownRouteMasteryIds);
      const cleared = window.DungeonDifficulty.cleared(dungeon.id, difficultyId);
      const firstClearReward = !cleared ? window.DungeonDifficulty.firstClearReward(difficultyId) : null;
      const firstClearText = firstClearReward ? [firstClearReward.gold ? `${firstClearReward.gold.toLocaleString("ja-JP")} G` : "", ...Object.entries(firstClearReward.materials).map(([id, quantity]) => `${itemName(id)}×${quantity}`)].filter(Boolean).join("・") : "";
      const difficultyButtons = window.DungeonDifficulty.ids().map(id => {
        const tier = window.DungeonDifficulty.tier(id), unlocked = window.DungeonDifficulty.unlocked(dungeon.id, id), done = window.DungeonDifficulty.cleared(dungeon.id, id);
        return `<button class="dungeon-difficulty-option ${id === difficultyId ? "is-active" : ""} ${done ? "is-cleared" : ""}" data-action="select-dungeon-difficulty" data-dungeon="${dungeon.id}" data-difficulty="${id}" ${busy || !unlocked ? "disabled" : ""}><strong>${tier.name}</strong><small>${done ? "攻略済" : unlocked ? "挑戦可能" : "未解放"}</small></button>`;
      }).join("") + trackingBadges;
      return `<article class="dungeon-card compact-route route-choice ${selected ? "is-selected" : ""} ${nextRoute?.id === dungeon.id ? "is-next-route" : ""} ${cleared ? "is-cleared" : ""} ${rumorDefinition ? "has-rumor" : ""} ${dungeon.color}"><div class="dungeon-difficulty-selector" aria-label="${escape(dungeon.name)}の難易度">${difficultyButtons}</div><div class="dungeon-route-summary"><span class="dungeon-route-emblem" aria-hidden="true">${emblem}</span><div class="dungeon-route-name"><span>推奨Lv.${variant.recommendedLevel} · ${routeLabel}${cleared ? " · 攻略済" : nextRoute?.id === dungeon.id && difficultyId === "normal" ? " · 次の攻略先" : ""}</span><h3>${escape(variant.name)}</h3><p>${escape(dungeon.description)}</p></div><div class="dungeon-route-metrics"><span><small>基本時間</small><strong>${variant.duration}秒</strong></span><span><small>戦闘</small><strong>${variant.encounters.length}戦</strong></span><span class="${habitatSurvey.complete ? "is-complete" : ""}"><small>現地の気配</small><strong>${habitatSurvey.confirmed}/${habitatSurvey.total}種</strong></span></div></div>${routeRumorLead}${rumorNote}${previousRecord}${namedHuntLead}${firstClearText ? `<p class="difficulty-first-clear"><span>初回踏破</span><strong>${escape(firstClearText)}</strong></p>` : ""}${partyRestriction}<div class="dungeon-route-controls"><label for="exploration-${dungeon.id}"><span>探索時間</span><select id="exploration-${dungeon.id}" data-exploration-dungeon="${dungeon.id}" ${busy ? "disabled" : ""}>${[1, 2, 3, 4, 5, 6].map(value => `<option value="${value}" ${value === multiplier ? "selected" : ""}>${value}倍 · ${variant.duration * value}秒 · ${variant.encounters.length * value}戦</option>`).join("")}</select></label><button class="button ${selected ? "secondary" : "primary"}" data-action="select-dungeon" data-dungeon="${dungeon.id}" ${busy ? "disabled" : ""}>${selected ? "選択中" : "選択する"}</button></div><details class="dungeon-details" data-detail="route-${dungeon.id}"><summary>依頼・噂・現地記録を見る</summary><div class="dungeon-route-detail-grid"><div><h4>道中で聞いた話</h4><p class="dungeon-route-field-rumor">「${escape(routeRumor)}」</p>${routeRumorStatus}<p class="dungeon-route-readiness is-${routeReadiness.state}"><span>観察記録との照合</span><strong>${escape(routeReadiness.text)}</strong></p><h4>確認された気配</h4><div class="monster-preview">${monsterPreview}</div></div><div><h4>主な発見物</h4><p>${escape(drops)}</p><h4>探索時間と報酬</h4><p class="small-note">${multiplier}倍探索は${variant.encounters.length * multiplier}戦。${window.DungeonDifficulty.tier(difficultyId).name}では基本探索時間と敵の強さ、報酬が変化します。</p></div></div></details></article>`;
    }).join(""); }
    if (!chapter) return `<p class="small-note">攻略できる章がありません。</p>`;
    const progressLabel = postgame ? "領域踏破" : "本編攻略";
    const groupLabel = postgame ? "星後遠征" : "本編ルート";
    return `<section class="route-chapter-browser ${postgame ? "is-postgame" : ""}"><header class="route-chapter-overview"><div><span>${escape(chapter.title)}</span><h3>${progressLabel} ${clearedMain}/${mainRoutes.length}</h3></div><div class="route-chapter-progress" aria-label="${progressLabel}進捗 ${clearedMain}/${mainRoutes.length}"><i style="width:${mainRoutes.length ? clearedMain / mainRoutes.length * 100 : 0}%"></i></div><small>推奨Lv.${chapter.recommendedLevelRange[0]}〜${chapter.recommendedLevelRange[1]}</small></header><div class="route-group-heading"><strong>${groupLabel}</strong><span>${nextRoute ? `次は「${escape(nextRoute.name)}」` : clearedMain === mainRoutes.length ? `${progressLabel}済み` : "解放条件を満たしてください"}</span></div><div class="dungeon-grid dungeon-route-list">${routeCards(mainRoutes)}</div>${optionalRoutes.length ? `<section class="optional-route-group"><div class="route-group-heading"><strong>寄り道・高難度</strong><span>物語の進行には影響しません</span></div><div class="dungeon-grid dungeon-route-list">${routeCards(optionalRoutes)}</div></section>` : ""}</section>`;
  }

  window.GameUIViews.party = { adventure, dungeonCards, history, overview, selectedChapterId, selectedDifficultyId, selectedDungeon, selectedDungeonId, selectedVariant };
})();
