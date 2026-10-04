(function () {
  "use strict";

  window.GameUIViews = window.GameUIViews || {};

  function lootPanel(result, context) {
    const { escape, itemName } = context;
    const entries = result.drops.length ? result.drops.map(drop => {
      const retainedInstance = drop.instanceId ? window.Items.getInstance(drop.instanceId) : null;
      const classes = `loot-chip ${drop.qualityId || ""} ${drop.newDiscovery ? "is-new-discovery" : ""} ${drop.newBest ? "is-quality-best" : ""} ${drop.ultraRareTitleId ? "is-ultra-rare" : ""}`;
      const displayName = drop.displayName || itemName(drop.itemId);
      const contents = `${drop.ultraRareTitleId ? '<b>ULTRA</b> ' : ""}${drop.newDiscovery ? '<b>NEW</b> ' : drop.newBest ? '<b>BEST</b> ' : ""}${window.GameData.items[drop.itemId].icon} ${escape(displayName)}${drop.quantity > 1 ? ` ×${drop.quantity}` : ""}`;
      return retainedInstance
        ? `<span class="result-loot-entry ${retainedInstance.locked ? "is-locked" : ""}"><button class="${classes} is-openable" data-action="open-loot-instance" data-instance="${retainedInstance.id}" aria-label="${escape(displayName)}を所持品で確認">${contents}</button><button class="result-loot-lock" data-action="toggle-item-lock" data-instance="${retainedInstance.id}" aria-pressed="${Boolean(retainedInstance.locked)}" aria-label="${escape(displayName)}の${retainedInstance.locked ? "保護を解除" : "売却・分解を防ぐ"}">${retainedInstance.locked ? "🔒" : "保護"}</button></span>`
        : `<span class="${classes}">${contents}</span>`;
    }) : [];
    const contents = entries.length ? entries.join("") : `<span class="muted-text">装備・素材の発見なし</span>`;
    const totalQuantity = result.drops.reduce((sum, drop) => sum + (drop.quantity || 1), 0);
    return entries.length > 8
      ? `<details class="result-loot-disclosure" data-detail="result-loot"><summary><span><small>戦利品の内訳</small><strong>全${totalQuantity}点を確認</strong></span><i class="summary-chevron" aria-hidden="true">⌄</i></summary><div class="loot-list">${contents}</div></details>`
      : `<div class="loot-list">${contents}</div>`;
  }

  function growthPanel(result, context) {
    const { escape } = context;
    if (!result.levelUps.length) return "";
    const statLabels = { hp: "HP", attack: "物攻", defense: "物防", magicAttack: "魔攻", magicDefense: "魔防", magicHealing: "魔回", speed: "速度", maxWeight: "重量上限" };
    return `<section class="result-level-ups"><span class="label">LEVEL UP</span>${result.levelUps.map(entry => {
      const learned = (entry.newSkillIds || []).map(id => window.GameData.skills[id]).filter(Boolean);
      const statChanges = Object.entries(entry.statChanges || {}).filter(([, value]) => value).map(([key, value]) => `<span><small>${statLabels[key] || escape(key)}</small><strong>+${value}</strong></span>`).join("");
      const learnedRows = learned.map(skill => {
        const kind = window.GameData.config.skillCategories[skill.category] || "スキル";
        const cooldown = skill.activation?.type === "active" ? ` 再使用まで${skill.activation.cooldownTurns}ターン。` : "";
        return `<details class="result-learned-skill"><summary><small>${escape(kind)}</small><strong>${escape(skill.name)}</strong><i aria-hidden="true">›</i></summary><p>${escape(skill.description + cooldown)}</p></details>`;
      }).join("");
      return `<article><div><strong>${escape(entry.name)} Lv.${entry.level}</strong><small>${entry.levels > 1 ? `${entry.levels}レベル上昇` : "レベルアップ"}</small>${statChanges ? `<div class="result-growth-stats">${statChanges}</div>` : ""}</div>${learnedRows ? `<div class="result-learned-skills"><span>新しく習得</span>${learnedRows}</div>` : ""}</article>`;
    }).join("")}</section>`;
  }

  function highlights(result) {
    const equipmentQuantity = result.drops.reduce((sum, drop) => sum + (["weapon", "armor"].includes(window.GameData.items[drop.itemId]?.type) ? (drop.quantity || 1) : 0), 0);
    const materialQuantity = result.drops.reduce((sum, drop) => sum + (window.GameData.items[drop.itemId]?.type === "material" ? (drop.quantity || 1) : 0), 0);
    const growthCount = result.levelUps.length + (result.companionAdvancements?.length || 0) + (result.newCompanionIds?.length || 0);
    const discoveryCount = (result.newItemIds?.length || 0) + (result.newSetDiscoveries?.length || 0) + (result.newRecipeIds?.length || 0) + (result.newObservationIds?.length || 0) + (result.newMonsterInsights?.length || 0);
    const storyCount = (result.storyMoments?.length || 0) + (result.storyCompleted?.length || 0);
    const ultraRareCount = result.drops.filter(drop => drop.ultraRareTitleId && window.GameData.ultraRareTitles[drop.ultraRareTitleId]).length;
    const entries = [
      equipmentQuantity ? ["装備", `${equipmentQuantity}点`, "equipment"] : null,
      materialQuantity ? ["素材", `${materialQuantity}個`, "material"] : null,
      result.autoSold?.length ? ["自動売却", `${result.autoSold.length}点`, "sale"] : null,
      growthCount ? ["成長", `${growthCount}件`, "growth"] : null,
      discoveryCount ? ["新発見", `${discoveryCount}件`, "discovery"] : null,
      ultraRareCount ? ["超レア", `${ultraRareCount}点`, "ultra"] : null,
      storyCount ? ["物語", `${storyCount}場面`, "story"] : null
    ].filter(Boolean);
    return entries.length
      ? `<div class="result-highlight-strip" aria-label="今回の成果">${entries.map(([label, value, kind]) => `<span class="result-highlight ${kind}"><small>${label}</small><strong>${value}</strong></span>`).join("")}</div>`
      : `<div class="result-highlight-strip is-empty"><span class="result-highlight"><small>戦利品</small><strong>発見なし</strong></span></div>`;
  }

  function routeEvents(result) {
    const definitions = new Map((window.GameData.config.explorationEvents?.routeEvents || []).map(event => [event.id, event]));
    return (result.battleLog || []).filter(entry => entry.routeEventId && definitions.has(entry.routeEventId)).map(entry => ({
      id: entry.routeEventId,
      name: definitions.get(entry.routeEventId).name,
      kind: definitions.get(entry.routeEventId).kind,
      success: Boolean(entry.routeEventSuccess),
      masteryApplied: Boolean(entry.routeEventMasteryApplied),
      personalPracticeApplied: Boolean(entry.routeEventPersonalPracticeApplied),
      teamSurveyApplied: Boolean(entry.routeTeamSurveyApplied),
      teamSurveyMemberNames: [...(entry.routeTeamSurveyMemberNames || [])],
      bondSupportApplied: Boolean(entry.routeBondSupportApplied),
      bondSupportMemberNames: [...(entry.routeBondSupportMemberNames || [])],
      bondSupportLabel: entry.routeBondSupportLabel || null,
      rumorMatched: Boolean(entry.routeRumorMatched),
      text: entry.text
    }));
  }

  function routeEventPanel(result, context) {
    const { escape } = context;
    const entries = routeEvents(result);
    if (!entries.length) return "";
    return `<section class="result-route-events"><div><span class="label">JOURNEY DISCOVERY</span><strong>道中で起きたこと</strong></div>${entries.map(entry => `<article class="${entry.success ? "success" : "failure"} ${entry.rumorMatched ? "is-rumor-match" : ""}"><span aria-hidden="true">${entry.kind === "secret" ? "?" : entry.kind === "camp" ? "♨" : entry.kind === "lore" ? "文" : entry.kind === "gather" ? "採" : "!"}</span><div><strong>${entry.teamSurveyApplied ? "熟練者の連携探索 · " : ""}${entry.rumorMatched ? "噂と一致 · " : ""}${escape(entry.name)} · ${entry.success ? "成功" : "失敗"}${entry.personalPracticeApplied ? " · 本人の経験を活用" : ""}${entry.masteryApplied ? " · 観察記録を活用" : ""}${entry.bondSupportApplied ? ` · ${escape(entry.bondSupportLabel || "旅仲間の連携")}` : ""}</strong>${entry.teamSurveyMemberNames?.length ? `<small>地図を重ねた者：${entry.teamSurveyMemberNames.map(escape).join("、")}</small>` : ""}${entry.bondSupportMemberNames?.length ? `<small>息を合わせた者：${entry.bondSupportMemberNames.map(escape).join("、")}</small>` : ""}<p>${escape(entry.text)}</p></div></article>`).join("")}<button class="button ghost" data-action="jump-result-section" data-target="result-battle-records">探索ログで確認</button></section>`;
  }

  function adventurerBondMomentPanel(result, context) {
    const { escape } = context;
    const entries = (result.battleLog || []).filter(entry => entry.kind === "bond");
    if (!entries.length) return "";
    const newIds = new Set(result.newAdventurerBondMomentIds || []), definitions = new Map((window.GameData.config.explorationEvents?.adventurerBondMoments || []).map(moment => [moment.id, moment]));
    return `<section class="result-route-events result-bond-moments"><div><span class="label">TRAVEL COMPANIONS</span><strong>旅を重ねた仲間のひと幕</strong></div>${entries.map(entry => `<article class="success"><span aria-hidden="true">結</span><div><strong>${newIds.has(entry.adventurerBondMomentId) ? "NEW · " : ""}${escape(definitions.get(entry.adventurerBondMomentId)?.title || "旅仲間の記憶")} · ${(entry.adventurerBondMemberNames || []).map(escape).join("と")}</strong><small>同行${entry.sharedSorties}回${newIds.has(entry.adventurerBondMomentId) ? " · 二人の記憶に残りました" : ""}</small><p>${escape(entry.text)}</p></div></article>`).join("")}<div class="result-bond-actions"><button class="button ghost" data-action="jump-result-section" data-target="result-battle-records">探索ログで確認</button><button class="button secondary" data-action="open-adventurer-bonds">旅仲間の記憶を読む</button></div></section>`;
  }

  function adventurerBondTierPanel(result, context) {
    const { escape } = context;
    const entries = Array.isArray(result.newAdventurerBondTiers) ? result.newAdventurerBondTiers : [];
    if (!entries.length) return "";
    return `<section class="result-new-discoveries result-adventurer-bond-tiers"><span class="label">TRAVEL BOND DEEPENED</span><strong>旅を重ねた二人の呼吸が変わりました</strong><div>${entries.map(entry => `<article><span aria-hidden="true">結</span><p><b>${entry.memberNames.map(escape).join("と")}</b><small>同行${entry.sharedSorties}回</small>${entry.routeLabel ? `<em>道中 · ${escape(entry.routeLabel)}</em>` : ""}${entry.battleLabel ? `<em>戦列 · ${escape(entry.battleLabel)}</em>` : ""}</p></article>`).join("")}</div><button class="button secondary" data-action="open-adventurer-bonds">二人の記録を見る</button></section>`;
  }

  function bondFormationPanel(result, context) {
    const { escape } = context;
    const entries = Array.isArray(result.bondFormations) ? result.bondFormations : [];
    if (!entries.length) return "";
    return `<section class="result-route-events result-bond-formations"><div><span class="label">BATTLE COMPANIONS</span><strong>戦列で息を合わせた仲間</strong></div>${entries.map(entry => `<article class="success"><span aria-hidden="true">結</span><div><strong>${(entry.memberNames || []).map(escape).join("と")} · ${escape(entry.label || "旅仲間の布陣")}</strong><small>${(entry.positions || []).map(position => `${Number(position) + 1}列`).join("・")}で隣接 · 同行${entry.sharedSorties || 0}回</small><p>互いの合図が届く距離で、戦いの呼吸を合わせました。</p></div></article>`).join("")}<button class="button ghost" data-action="jump-result-section" data-target="result-battle-records">戦闘ログで確認</button></section>`;
  }

  function treasurePanel(result, context) {
    const { escape } = context;
    const definitions = new Map((window.GameData.config.explorationEvents?.treasure?.types || []).map(entry => [entry.id, entry]));
    const log = result.battleLog || [];
    const entries = log.filter(entry => entry.kind === "treasure").map(entry => {
      const reward = log.find(candidate => candidate.encounter === entry.encounter && ["treasureGold", "treasureItem"].includes(candidate.kind));
      const definition = definitions.get(entry.treasureTierId) || { name: "宝箱", rank: 0 };
      return { definition, opened: entry.treasureOpened !== false, masteryApplied: Boolean(entry.treasureMasteryApplied), personalPracticeApplied: Boolean(entry.treasurePersonalPracticeApplied), reward: reward?.text || "中身を持ち帰れなかった" };
    });
    if (!entries.length) return "";
    const bestRank = Math.max(...entries.map(entry => entry.definition.rank || 0));
    const openedCount = entries.filter(entry => entry.opened).length;
    const newlyMastered = new Set(result.newTreasureMasteryIds || []);
    return `<section class="result-treasure-finds rank-${bestRank}"><div><span class="label">TREASURE FOUND</span><strong>道中で${entries.length}個の宝箱を発見 · 開封${openedCount}個</strong>${newlyMastered.size ? `<small>開け方の記録を新たに共有しました</small>` : ""}</div><div class="result-treasure-list">${entries.map(entry => `<article class="rank-${entry.definition.rank || 0} ${entry.opened ? "is-opened" : "is-partial"}"><span aria-hidden="true">${entry.definition.rank >= 2 ? "✦" : entry.definition.rank === 1 ? "▣" : "□"}</span><div><strong>${escape(entry.definition.name)} · ${entry.opened ? "開封" : "一部回収"}${newlyMastered.has(entry.definition.id) ? " · 知見完成" : ""}</strong><small>${entry.personalPracticeApplied ? "本人の開錠経験を活用 · " : ""}${entry.masteryApplied ? "共有した開錠記録を活用 · " : ""}${escape(entry.reward)}</small></div></article>`).join("")}</div></section>`;
  }

  function memberHighlightPanel(result, context) {
    const { escape } = context;
    const entries = window.Dungeon.memberHighlights(result);
    if (!entries.length) return "";
    const views = {
      exploration: { mark: "路", title: "道中の難所を解いた", detail: entry => `発見${entry.routeSuccesses}件・宝箱${entry.chestsOpened}個` },
      damage: { mark: "剣", title: "敵陣を切り開いた", detail: entry => `実ダメージ ${entry.value.toLocaleString("ja-JP")}` },
      healing: { mark: "癒", title: "仲間の命をつないだ", detail: entry => `実回復 ${entry.value.toLocaleString("ja-JP")}` },
      endurance: { mark: "盾", title: "最後まで立ち続けた", detail: entry => `被ダメージ ${entry.value.toLocaleString("ja-JP")}・帰還HP ${entry.remainingHp}/${entry.maxHp}` }
    };
    return `<section class="result-member-highlights"><div><span class="label">ADVENTURERS IN ACTION</span><strong>この遠征で刻まれた働き</strong></div><div>${entries.map(entry => { const view = views[entry.kind]; return `<article class="${entry.kind}"><span aria-hidden="true">${view.mark}</span><div><small>${view.title}</small><strong>${escape(entry.name)}</strong><p>${escape(view.detail(entry))}</p></div></article>`; }).join("")}</div></section>`;
  }

  function monsterInsightPanel(result, context) {
    const { escape } = context;
    const insights = Array.isArray(result.newMonsterInsights) ? result.newMonsterInsights : [];
    if (!insights.length) return "";
    const elementName = id => id === "magic" ? "魔法そのもの" : window.GameData.elements[id]?.name || id;
    const statusName = id => window.GameData.statusEffects[id]?.name || id;
    const skillName = id => window.GameData.monsterSkills[id]?.name || id;
    const rows = insights.map(insight => {
      const facts = [];
      if (insight.firstEncounter) facts.push("初遭遇");
      if (insight.maxAttackCount != null) facts.push(`一度に最大${insight.maxAttackCount}回攻撃`);
      if (insight.magicAttack) facts.push("魔法行動");
      if (insight.rearTargeting) facts.push("後列狙い");
      if ((insight.burstRounds || []).length) facts.push(`大技 ${insight.burstRounds.map(round => `第${round}T`).join("・")}`);
      const list = (label, values, resolver) => {
        const names = (values || []).map(resolver).filter(Boolean);
        if (names.length) facts.push(`${label} ${names.join("・")}`);
      };
      list("攻撃属性", insight.attackElements, elementName);
      list("付与攻撃", insight.statusAttacks, statusName);
      list("弱点", insight.elementWeaknesses, elementName);
      list("耐性", insight.elementResistances, elementName);
      list("有効な異常", insight.statusLanded, statusName);
      list("抵抗された異常", insight.statusResisted, statusName);
      list("固有行動", insight.difficultySkillIds, skillName);
      return `<li><strong>${escape(window.GameData.monsters[insight.monsterId]?.name || insight.monsterId)}</strong><span>${facts.map(escape).join(" ／ ")}</span></li>`;
    }).join("");
    return `<section class="result-new-discoveries result-monster-insights"><span class="label">NEW ENEMY FINDINGS</span><strong>敵の新しい性質を${insights.length}種記録しました</strong><ul>${rows}</ul><button class="button ghost" data-action="open-result-monsters" data-dungeon="${escape(result.dungeonId)}">モンスター図鑑で確認</button></section>`;
  }

  function attemptComparison(result) {
    const partyIndex = Number.isInteger(result.partyIndex) ? result.partyIndex : window.Party.selected();
    const history = window.GameState.data.partyHistory?.[partyIndex] || [];
    const difficultyId = result.difficultyId || "normal";
    const timeMultiplier = result.timeMultiplier || 1;
    const previous = history.find(entry => entry.id !== result.id && entry.dungeonId === result.dungeonId
      && (entry.difficultyId || "normal") === difficultyId && (entry.timeMultiplier || 1) === timeMultiplier && entry.battle);
    if (!previous) return "";
    const current = window.Dungeon.battleSummary(result);
    const before = previous.battle;
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

  function tacticalReport(result, context) {
    const { escape } = context;
    const elementName = id => id === "magic" ? "魔法そのもの" : window.GameData.elements[id]?.name || id;
    const statusName = id => window.GameData.statusEffects[id]?.name || id;
    const observationRows = Object.entries(result.monsterObservations || {}).map(([monsterId, observation]) => {
      const facts = [];
      const fact = (label, value) => {
        if (value == null || value === "") return;
        facts.push(`<span><small>${escape(label)}</small>${escape(value)}</span>`);
      };
      const list = (label, values, resolver) => {
        const names = [...new Set(values || [])].map(resolver).filter(Boolean);
        if (names.length) facts.push(`<span><small>${label}</small>${names.map(escape).join("・")}</span>`);
      };
      if (observation.incomingAttempts > 0) fact("攻撃命中", `${observation.incomingHits || 0}/${observation.incomingAttempts}回`);
      if (observation.enemyTurns > 0) fact("観測行動", `${observation.enemyTurns}回`);
      if (observation.maxAttackCount > 0) fact("一度の攻撃", `最大${observation.maxAttackCount}回`);
      if (observation.magicAttack) fact("魔法行動", "確認");
      if (observation.rearTargeting) fact("狙い", "後列への攻撃を確認");
      if ((observation.burstRounds || []).length) fact("大技ターン", observation.burstRounds.map(round => `第${round}T`).join("・"));
      list("攻撃属性", observation.attackElements, elementName);
      list("付与攻撃", observation.statusAttacks, statusName);
      list("弱点", observation.elementWeaknesses, elementName);
      list("耐性", observation.elementResistances, elementName);
      list("通用した異常", observation.statusLanded, statusName);
      list("抵抗された異常", observation.statusResisted, statusName);
      list("確認した固有行動", observation.difficultySkillIds, id => window.GameData.monsterSkills[id]?.name || id);
      if (!facts.length) return "";
      return `<li><strong>${escape(window.GameData.monsters[monsterId]?.name || monsterId)}</strong><div>${facts.join("")}</div></li>`;
    }).filter(Boolean);
    const observations = observationRows.length
      ? `<details class="result-combat-observations"><summary><span><small>FIELD NOTES</small><strong>今回観測した敵の性質</strong></span><b>${observationRows.length}種</b><i aria-hidden="true">›</i></summary><div><p>この遠征の戦闘で実際に確認できた事実だけを記録しています。</p><ul>${observationRows.join("")}</ul><div class="observation-actions"><button class="button secondary" data-action="open-result-monsters" data-dungeon="${escape(result.dungeonId)}">資料室の記録と照合</button></div></div></details>`
      : "";
    const traits = result.strategyReport;
    const traitSummary = traits ? `<div class="mechanic-report"><strong>攻略特性への対応</strong><p>全体攻撃 ${traits.areaHits}発 ／ 防御無視 ${traits.penetrationHits}発 ／ 魔法弱点 ${traits.magicWeaknessHits}発（実ダメージ ${traits.magicWeaknessDamage}）</p><p>後列狙い ${traits.rearHits}回 ／ 実被ダメージ ${traits.rearDamage} ／ 戦闘不能 ${traits.rearKnockouts}人</p><small>攻撃は命中した対象ごとに集計。同じ一撃が複数の項目に含まれます。回復量は下の冒険者別戦績で確認できます。</small></div>` : "";
    const report = result.mechanicReport;
    const summary = report && report.warnings ? `<div class="mechanic-report"><strong>大技への対応</strong><p>予告${report.warnings}回 ／ 大技${report.bursts}回 ／ 防御で軽減${report.guardedHits}人回 ／ 軽減なし${report.unguardedHits}人回 ／ 隙への攻撃${report.weaknessHits}発</p><small>防御の集計は大技の被弾ごと。隙への攻撃には追撃・多段も含みます。</small></div>` : "";
    const facts = !result.success && Array.isArray(result.defeatFacts) && result.defeatFacts.length
      ? `<section id="defeat-observations" class="defeat-hints"><h4>撤退時の観測記録</h4><ul>${result.defeatFacts.map(fact => `<li>${escape(fact)}</li>`).join("")}</ul></section>` : "";
    return observations + traitSummary + summary + facts;
  }

  function memberReport(result, context) {
    const { escape } = context;
    if (!Array.isArray(result.memberReports) || !result.memberReports.length) return "";
    return `<section class="member-report"><h4>冒険者ごとの戦績</h4><div class="report-scroll"><table><thead><tr><th scope="col">冒険者</th><th scope="col">与ダメージ</th><th scope="col">物理命中</th><th scope="col">回復量</th><th scope="col">被ダメージ</th><th scope="col">会心回数</th><th scope="col">帰還時HP</th></tr></thead><tbody>${result.memberReports.map(member => `<tr><th scope="row">${escape(member.name)}<small>${escape((window.GameData.jobs[member.jobId] || {}).name || "冒険者")}</small><small>攻${member.attackActions || 0}・技${member.techniqueActions || 0}・呪${member.spellActions || 0}・回${member.healingActions || 0}・防${member.defendActions || 0}${member.statusSkippedTurns ? `・不能${member.statusSkippedTurns}` : ""}</small></th><td>${member.damageDealt}</td><td>${member.attackHits || 0}/${member.attackAttempts || 0}</td><td class="report-heal">${member.healingDone}${member.healingAttempted ? `<small>試行${member.healingAttempted}・超過${member.overhealing || 0}</small>` : ""}</td><td>${member.damageTaken}</td><td>${member.criticalHits}</td><td>${member.remainingHp}/${member.maxHp}${member.remainingHp === 0 ? "（戦闘不能）" : ""}</td></tr>`).join("")}</tbody></table></div><p>与ダメージ・回復量は実際に減少・回復したHPの合計です。物理命中は通常攻撃と物理系の技の命中数／試行数です。「不能」は状態異常で行動できなかった回数です。被ダメージは回復しても累積します。</p></section>`;
  }

  function companionGrowthSummary(entry, context) {
    const { escape } = context;
    const companion = window.GameData.companions[entry.companionId];
    const stage = window.GameData.relations.companionProgressions[entry.companionId]?.stages?.[entry.stageId];
    const replacements = Object.entries(stage?.replacements || {}).map(([fromId, toId]) => {
      const from = window.GameData.skills[fromId];
      const to = window.GameData.skills[toId];
      return from && to ? `<span>${escape(from.name)} → <strong>${escape(to.name)}</strong></span>` : "";
    }).filter(Boolean);
    const additions = (stage?.addSkillIds || []).map(skillId => window.GameData.skills[skillId]).filter(Boolean)
      .map(skill => `<span>新規 <strong>${escape(skill.name)}</strong></span>`);
    const changes = replacements.concat(additions);
    return `<article class="companion-growth-result"><strong>${escape(companion?.name || "人物")}が「${escape(stage?.name || "新たな段階")}」へ成長しました</strong>${changes.length ? `<div class="companion-growth-skills">${changes.join("")}</div>` : ""}<p>人物録または装備画面で現在の固有スキルを確認できます。</p></article>`;
  }

  window.GameUIViews.results = { adventurerBondMomentPanel, adventurerBondTierPanel, attemptComparison, bondFormationPanel, companionGrowthSummary, growthPanel, highlights, lootPanel, memberHighlightPanel, memberReport, monsterInsightPanel, routeEvents, routeEventPanel, tacticalReport, treasurePanel };
})();
