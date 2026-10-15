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
    const attributeDefinitions = window.GameData.config.characterGrowth?.attributes?.definitions || {};
    return `<section class="result-level-ups"><span class="label">LEVEL UP</span>${result.levelUps.map(entry => {
      const learned = (entry.newSkillIds || []).map(id => window.GameData.skills[id]).filter(Boolean);
      const attributeChanges = window.Characters.attributeKeys().filter(key => Number(entry.attributeChanges?.[key]) > 0).map(key => `<span><small>${escape(attributeDefinitions[key]?.shortName || attributeDefinitions[key]?.name || key)}</small><strong>+${entry.attributeChanges[key]}</strong></span>`).join("");
      const statChanges = Object.entries(entry.statChanges || {}).filter(([, value]) => value).map(([key, value]) => `<span><small>${statLabels[key] || escape(key)}</small><strong>+${value}</strong></span>`).join("");
      const learnedRows = learned.map(skill => {
        const kind = window.GameData.config.skillCategories[skill.category] || "スキル";
        const cooldown = skill.activation?.type === "active" ? ` 再使用まで${skill.activation.cooldownTurns}ターン。` : "";
        return `<details class="result-learned-skill"><summary><small>${escape(kind)}</small><strong>${escape(skill.name)}</strong><i aria-hidden="true">›</i></summary><p>${escape(skill.description + cooldown)}</p></details>`;
      }).join("");
      return `<article><div><strong>${escape(entry.name)} Lv.${entry.level}</strong><small>${entry.levels > 1 ? `${entry.levels}レベル上昇` : "レベルアップ"}</small>${attributeChanges ? `<div class="result-growth-group"><em>基礎能力</em><div class="result-growth-stats primary">${attributeChanges}</div></div>` : ""}${statChanges ? `<div class="result-growth-group"><em>戦闘能力</em><div class="result-growth-stats">${statChanges}</div></div>` : ""}</div>${learnedRows ? `<div class="result-learned-skills"><span>新しく習得</span>${learnedRows}</div>` : ""}</article>`;
    }).join("")}</section>`;
  }

  function highlights(result) {
    const equipmentQuantity = result.drops.reduce((sum, drop) => sum + (["weapon", "armor"].includes(window.GameData.items[drop.itemId]?.type) ? (drop.quantity || 1) : 0), 0);
    const materialQuantity = result.drops.reduce((sum, drop) => sum + (window.GameData.items[drop.itemId]?.type === "material" ? (drop.quantity || 1) : 0), 0);
    const growthCount = result.levelUps.length + (result.companionAdvancements?.length || 0) + (result.newCompanionIds?.length || 0);
    const discoveryCount = (result.newItemIds?.length || 0) + (result.newSetDiscoveries?.length || 0) + (result.newRecipeIds?.length || 0) + (result.newObservationIds?.length || 0) + (result.newMonsterInsights?.length || 0) + (result.newMonsterHabitats?.length || 0);
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
      naturalAptitudeApplied: Boolean(entry.routeNaturalAptitudeApplied),
      actorName: entry.explorationActorName || null,
      attributeIds: [...(entry.explorationAttributeIds || [])],
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
    const definitions = window.GameData.config.characterGrowth?.attributes?.definitions || {};
    const aptitudeText = entry => entry.naturalAptitudeApplied && entry.actorName && entry.attributeIds.length
      ? `<small>導いた者：${escape(entry.actorName)}（${entry.attributeIds.map(id => escape(definitions[id]?.shortName || definitions[id]?.name || id)).join("・")}）</small>` : "";
    return `<section class="result-route-events"><div><span class="label">JOURNEY DISCOVERY</span><strong>道中で起きたこと</strong></div>${entries.map(entry => `<article class="${entry.success ? "success" : "failure"} ${entry.rumorMatched ? "is-rumor-match" : ""}"><span aria-hidden="true">${entry.kind === "secret" ? "?" : entry.kind === "camp" ? "♨" : entry.kind === "lore" ? "文" : entry.kind === "gather" ? "採" : "!"}</span><div><strong>${entry.teamSurveyApplied ? "熟練者の連携探索 · " : ""}${entry.rumorMatched ? "噂と一致 · " : ""}${escape(entry.name)} · ${entry.success ? "成功" : "失敗"}${entry.naturalAptitudeApplied ? " · 基礎能力を活用" : ""}${entry.personalPracticeApplied ? " · 本人の経験を活用" : ""}${entry.masteryApplied ? " · 観察記録を活用" : ""}${entry.bondSupportApplied ? ` · ${escape(entry.bondSupportLabel || "旅仲間の連携")}` : ""}</strong>${aptitudeText(entry)}${entry.teamSurveyMemberNames?.length ? `<small>地図を重ねた者：${entry.teamSurveyMemberNames.map(escape).join("、")}</small>` : ""}${entry.bondSupportMemberNames?.length ? `<small>息を合わせた者：${entry.bondSupportMemberNames.map(escape).join("、")}</small>` : ""}<p>${escape(entry.text)}</p></div></article>`).join("")}<button class="button ghost" data-action="jump-result-section" data-target="result-battle-records">探索ログで確認</button></section>`;
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

  function namedHuntRecognitionScene(entry, monster, item, epithet, context) {
    if (!epithet || !item) return "";
    const cast = window.GameData.storyCharacters || {};
    const rina = cast.receptionist_rina?.name || "リナ";
    const witness = item.type === "material" ? cast.merchant_marta : cast.blacksmith_gregor;
    const witnessName = witness?.name || (item.type === "material" ? "マルタ" : "グレゴール");
    const witnessLine = item.type === "material"
      ? `「待って。その${item.name}、売り荷の山へ混ぜないでおくれ。どれも同じ場所で採れた痕がある。二人が${monster?.name || "獲物"}の道を見つけた証拠だよ」`
      : item.type === "armor"
        ? `「その${item.name}は先に工房へ寄越してくれ。同じ受け流し方で付いた傷なら、二人の間合いまで直す時の手掛かりになる」`
        : `「その${item.name}は研ぐ前に見せてくれ。刃の欠け方まで揃っているなら、二人が踏み込む合図を覚えた証拠だ」`;
    const replyName = entry.memberNames?.[1] || entry.memberNames?.[0] || "冒険者";
    return `<div class="result-hunt-recognition-scene"><small>宿の戸口で</small><p><b>${context.escape(rina)}</b>「お帰りなさい。……もう遅いですよ。外で待っていた子たちが、先に『${context.escape(epithet)}』って呼んでしまいました」</p><p><b>${context.escape(witnessName)}</b>${context.escape(witnessLine)}</p><p><b>${context.escape(replyName)}</b>「なら、次もその名に恥じない帰り方をしよう。呼ばれるのは、二人とも戻ってからでいい」</p></div>`;
  }

  function sharedHuntLedgerTierPanel(result, context) {
    const entry = result.newSharedHuntLedgerTier;
    if (!entry) return "";
    const monster = window.GameData.monsters[entry.monsterId], item = window.GameData.items[entry.itemId];
    const bondKey = [...entry.memberIds].sort().join("::");
    const tier = (window.GameData.config.explorationEvents?.targetedHarvestConsultation?.rememberedTiers || []).find(candidate => candidate.id === entry.tierId);
    const epithet = tier?.epithet?.replace("{monster}", monster?.name || "獲物");
    const reward = result.namedHuntRecognitionReward, rewardItem = reward ? window.GameData.items[reward.itemId] : null;
    return `<section class="result-new-discoveries result-adventurer-bond-tiers result-shared-hunt-ledger"><span class="label">SHARED HUNT LEDGER</span><strong>二人の狩り帳に、新しい頁が加わりました</strong><div><article><span aria-hidden="true">帳</span><p><b>${entry.memberNames.map(context.escape).join("と")}</b><small>${context.escape(monster?.name || "魔物")} → ${context.escape(item?.name || "品")}</small><em>${context.escape(entry.tierName)}</em></p></article></div>${tier ? `<p class="result-hunt-ledger-story">${context.escape(tier.growth)}</p>` : ""}${epithet ? `<p class="result-hunt-ledger-epithet">ギルドでは、二人を「${context.escape(epithet)}」と呼び始めた。</p>${namedHuntRecognitionScene(entry, monster, item, epithet, context)}` : ""}${rewardItem ? `<p class="result-hunt-ledger-reward"><b>狩り名の証</b><span>${context.escape(rewardItem.icon || "◆")} ${context.escape(rewardItem.name)} ×${reward.quantity}</span><small>町に呼び名が根づいた祝いとして贈られました。</small></p>` : ""}${tier?.combatSupport ? `<p class="result-hunt-ledger-support"><b>${context.escape(tier.combatSupport.label)}</b>${context.escape(tier.combatSupport.description)}</p>` : ""}<button class="button secondary" data-action="open-adventurer-bonds" data-bond="${context.escape(bondKey)}" data-monster="${context.escape(entry.monsterId)}" data-item="${context.escape(entry.itemId)}">この頁を旅仲間の記憶で読む</button></section>`;
  }

  function sharedHuntLedgerProgressPanel(result, context) {
    const entry = result.sharedHuntLedgerProgress;
    if (!entry || result.newSharedHuntLedgerTier) return "";
    const monster = window.GameData.monsters[entry.monsterId], item = window.GameData.items[entry.itemId];
    if (!monster || !item) return "";
    const bondKey = [...entry.memberIds].sort().join("::");
    const nextTier = (window.GameData.config.explorationEvents?.targetedHarvestConsultation?.rememberedTiers || []).find(candidate => candidate.id === entry.nextTierId);
    const percent = nextTier ? Math.min(100, Math.round(entry.successes / nextTier.minimumSuccesses * 100)) : 100;
    const next = nextTier ? `次の「${context.escape(entry.nextTierName)}」まであと${entry.remaining}回` : "狩り名が定着した頁を重ねています";
    return `<section class="result-hunt-ledger-progress-card"><span aria-hidden="true">帳</span><div><small>SHARED HUNT LEDGER · 狩り帳の続き</small><strong>${entry.memberNames.map(context.escape).join("と")}が、また一度持ち帰りました</strong><p>${context.escape(monster.icon || "♟")} ${context.escape(monster.name)} <i aria-hidden="true">→</i> ${context.escape(item.icon || "◇")} ${context.escape(item.name)} · 収穫${entry.successes}回</p><em>${next}<i><b style="width:${percent}%"></b></i></em></div><button type="button" class="text-button" data-action="open-adventurer-bonds" data-bond="${context.escape(bondKey)}" data-monster="${context.escape(entry.monsterId)}" data-item="${context.escape(entry.itemId)}">二人の頁を読む</button></section>`;
  }

  function namedHuntSupportPanel(result, context) {
    const tier = (window.GameData.config.explorationEvents?.targetedHarvestConsultation?.rememberedTiers || [])
      .find(entry => entry.id === result.trackedHarvestConsultationTier?.tierId);
    const practice = result.trackedHarvestPractice, persistence = result.trackedHarvestPersistence;
    const monster = window.GameData.monsters[result.trackedItemHarvestMonsterId];
    const item = window.GameData.items[result.trackedItemHarvestId];
    if (!tier?.epithet || !tier.combatSupport || !practice?.characterId || !persistence?.characterId || practice.characterId === persistence.characterId || !monster || !item) return "";
    const marker = `・${tier.combatSupport.label}】`;
    const encounters = new Set((result.battleLog || []).filter(entry => entry.kind === "formation" && entry.text.includes(marker)).map(entry => entry.encounter));
    if (!encounters.size) return "";
    const memberIds = [practice.characterId, persistence.characterId], memberNames = [practice.characterName, persistence.characterName];
    const epithet = tier.epithet.replace("{monster}", monster.name);
    return `<section class="result-named-hunt-support"><span aria-hidden="true">狩</span><div><small>NAMED HUNTERS · ${encounters.size}戦で発揮</small><strong>${context.escape(epithet)} · ${context.escape(tier.combatSupport.label)}</strong><p>${memberNames.map(context.escape).join("と")}は、${context.escape(monster.name)}との戦いで狩り帳から育った合図を使った。</p><em>${context.escape(tier.combatSupport.description)}</em></div><button type="button" class="text-button" data-action="open-adventurer-bonds" data-bond="${context.escape([...memberIds].sort().join("::"))}" data-monster="${context.escape(monster.id)}" data-item="${context.escape(item.id)}">二人の頁を読む</button></section>`;
  }

  function bondFormationPanel(result, context) {
    const { escape } = context;
    const entries = Array.isArray(result.bondFormations) ? result.bondFormations : [];
    if (!entries.length) return "";
    return `<section class="result-route-events result-bond-formations"><div><span class="label">BATTLE COMPANIONS</span><strong>戦列で息を合わせた仲間</strong></div>${entries.map(entry => `<article class="success"><span aria-hidden="true">結</span><div><strong>${(entry.memberNames || []).map(escape).join("と")} · ${escape(entry.label || "旅仲間の布陣")}</strong><small>${(entry.positions || []).map(position => `${Number(position) + 1}列`).join("・")}で隣接 · 同行${entry.sharedSorties || 0}回</small><p>互いの合図が届く距離で、戦いの呼吸を合わせました。</p></div></article>`).join("")}<button class="button ghost" data-action="jump-result-section" data-target="result-battle-records">戦闘ログで確認</button></section>`;
  }

  function bossRivalryPanel(result, context) {
    const { escape } = context;
    const started = Array.isArray(result.newBossRivalries) ? result.newBossRivalries : [];
    const avenged = Array.isArray(result.bossRevengeVictories) ? result.bossRevengeVictories : [];
    if (!started.length && !avenged.length) return "";
    const rows = [
      ...started.map(entry => ({ ...entry, state: "active", mark: "因", title: "撤退の痛みを忘れない" })),
      ...avenged.map(entry => ({ ...entry, state: "avenged", mark: "雪", title: "因縁を越えた" }))
    ];
    return `<section class="result-boss-rivalries"><div><span class="label">RIVALRY RECORD</span><strong>${avenged.length ? "冒険者の因縁に決着が刻まれました" : "次の遠征へ持ち越す因縁が残りました"}</strong></div><div>${rows.map(entry => `<article class="is-${entry.state}"><span aria-hidden="true">${entry.mark}</span><div><small>${escape(entry.title)}</small><strong>${escape(entry.name)} × ${escape(entry.bossName)}</strong><button class="text-button" data-action="open-adventurer-record" data-character="${escape(entry.characterId)}">この冒険者の足跡を見る</button></div></article>`).join("")}</div></section>`;
  }

  function treasurePanel(result, context) {
    const { escape } = context;
    const definitions = new Map((window.GameData.config.explorationEvents?.treasure?.types || []).map(entry => [entry.id, entry]));
    const log = result.battleLog || [];
    const entries = log.filter(entry => entry.kind === "treasure").map(entry => {
      const reward = log.find(candidate => candidate.encounter === entry.encounter && ["treasureGold", "treasureItem"].includes(candidate.kind));
      const definition = definitions.get(entry.treasureTierId) || { name: "宝箱", rank: 0 };
      return { definition, opened: entry.treasureOpened !== false, masteryApplied: Boolean(entry.treasureMasteryApplied), personalPracticeApplied: Boolean(entry.treasurePersonalPracticeApplied), naturalAptitudeApplied: Boolean(entry.treasureNaturalAptitudeApplied), actorName: entry.explorationActorName || null, attributeIds: [...(entry.explorationAttributeIds || [])], reward: reward?.text || "中身を持ち帰れなかった" };
    });
    if (!entries.length) return "";
    const bestRank = Math.max(...entries.map(entry => entry.definition.rank || 0));
    const openedCount = entries.filter(entry => entry.opened).length;
    const newlyMastered = new Set(result.newTreasureMasteryIds || []);
    const attributeDefinitions = window.GameData.config.characterGrowth?.attributes?.definitions || {};
    const aptitudeText = entry => entry.naturalAptitudeApplied && entry.actorName && entry.attributeIds.length
      ? `${entry.actorName}の${entry.attributeIds.map(id => attributeDefinitions[id]?.shortName || attributeDefinitions[id]?.name || id).join("・")}を活用 · ` : entry.naturalAptitudeApplied ? "基礎能力を活用 · " : "";
    return `<section class="result-treasure-finds rank-${bestRank}"><div><span class="label">TREASURE FOUND</span><strong>道中で${entries.length}個の宝箱を発見 · 開封${openedCount}個</strong>${newlyMastered.size ? `<small>開け方の記録を新たに共有しました</small>` : ""}</div><div class="result-treasure-list">${entries.map(entry => `<article class="rank-${entry.definition.rank || 0} ${entry.opened ? "is-opened" : "is-partial"}"><span aria-hidden="true">${entry.definition.rank >= 2 ? "✦" : entry.definition.rank === 1 ? "▣" : "□"}</span><div><strong>${escape(entry.definition.name)} · ${entry.opened ? "開封" : "一部回収"}${newlyMastered.has(entry.definition.id) ? " · 知見完成" : ""}</strong><small>${escape(aptitudeText(entry))}${entry.personalPracticeApplied ? "本人の開錠経験を活用 · " : ""}${entry.masteryApplied ? "共有した開錠記録を活用 · " : ""}${escape(entry.reward)}</small></div></article>`).join("")}</div></section>`;
  }

  function memberHighlightPanel(result, context) {
    const { escape } = context;
    const entries = window.Dungeon.memberHighlights(result);
    if (!entries.length) return "";
    const views = {
      exploration: { mark: "路", title: "道中の難所を解いた", detail: entry => `発見${entry.routeSuccesses}件・宝箱${entry.chestsOpened}個` },
      damage: { mark: "剣", title: "敵陣を切り開いた", detail: entry => `実ダメージ ${entry.value.toLocaleString("ja-JP")}` },
      healing: { mark: "癒", title: "仲間の命をつないだ", detail: entry => `実回復 ${entry.value.toLocaleString("ja-JP")}` },
      status: { mark: "縛", title: "異変で戦機をつくった", detail: entry => `成功 ${entry.value}/${entry.attempts}${entry.resisted ? `・抵抗 ${entry.resisted}` : ""}` },
      endurance: { mark: "盾", title: "最後まで立ち続けた", detail: entry => `被ダメージ ${entry.value.toLocaleString("ja-JP")}・帰還HP ${entry.remainingHp}/${entry.maxHp}` }
    };
    return `<section class="result-member-highlights"><div><span class="label">ADVENTURERS IN ACTION</span><strong>この遠征で刻まれた働き</strong></div><div>${entries.map(entry => { const view = views[entry.kind]; return `<article class="${entry.kind}"><span aria-hidden="true">${view.mark}</span><div><small>${view.title}</small><strong>${escape(entry.name)}</strong><p>${escape(view.detail(entry))}</p></div></article>`; }).join("")}</div></section>`;
  }

  function adventurerReputationPanel(result, context) {
    const { escape } = context;
    const entries = Array.isArray(result.newAdventurerReputations) ? result.newAdventurerReputations : [];
    if (!entries.length) return "";
    return `<section class="result-new-discoveries result-adventurer-reputations"><span class="label">NEW REPUTATION</span><strong>重ねた働きに、仲間から呼び名が付きました</strong><div>${entries.map(entry => `<article><span aria-hidden="true">${escape(entry.icon)}</span><p><small>${escape(entry.name)}</small><b>${escape(entry.title)}</b><em>「${escape(entry.label)}」とたびたび記された</em></p><button class="text-button" data-action="open-adventurer-record" data-character="${escape(entry.characterId)}">足跡を見る</button></article>`).join("")}</div></section>`;
  }

  function targetedHarvestPracticePanel(result, context) {
    const { escape } = context;
    const entries = Array.isArray(result.newTargetedHarvestPractices) ? result.newTargetedHarvestPractices : [];
    if (!entries.length) return "";
    return `<section class="result-new-discoveries result-adventurer-milestones result-harvest-practices"><span class="label">HUNTING PRACTICE</span><strong>繰り返した狙い採りが、手覚えになりました</strong><small>成功した狩りの記憶は、この魔物と品の組み合わせにだけ残ります。</small><div>${entries.map(entry => { const monster = window.GameData.monsters[entry.monsterId], item = window.GameData.items[entry.itemId]; return `<article><span>${escape(entry.name)}</span><p><b>${escape(monster?.icon || "♟")} ${escape(monster?.name || "魔物")} → ${escape(item?.icon || "◇")} ${escape(item?.name || "品")}</b><small>${escape(entry.tierName)}</small></p><button class="button ghost" data-action="open-adventurer-record" data-character="${escape(entry.characterId)}">足跡を見る</button></article>`; }).join("")}</div></section>`;
  }

  function targetedHarvestPersistencePanel(result, context) {
    const { escape } = context;
    const entries = Array.isArray(result.newTargetedHarvestPersistences) ? result.newTargetedHarvestPersistences : [];
    if (!entries.length) return "";
    return `<section class="result-new-discoveries result-adventurer-milestones result-harvest-practices"><span class="label">FIELD CLUE FOUND</span><strong>空振りの積み重ねから、新しい手掛かりを得ました</strong><small>持ち帰れなかった旅も、この魔物と品の組み合わせにだけ残る経験です。</small><div>${entries.map(entry => { const monster = window.GameData.monsters[entry.monsterId], item = window.GameData.items[entry.itemId]; return `<article><span>${escape(entry.name)}</span><p><b>${escape(monster?.icon || "♟")} ${escape(monster?.name || "魔物")} → ${escape(item?.icon || "◇")} ${escape(item?.name || "品")}</b><small>${escape(entry.tierName)}</small></p><button class="button ghost" data-action="open-adventurer-record" data-character="${escape(entry.characterId)}">足跡を見る</button></article>`; }).join("")}</div></section>`;
  }

  function partyReputationMomentPanel(result, context) {
    const { escape } = context;
    const moment = result.newPartyReputationMoment;
    if (!moment) return "";
    return `<section class="result-new-discoveries result-party-reputation-moment"><span class="label">NEW PARTY DYNAMIC</span><strong>重ねた遠征が、二人だけの呼吸になりました</strong><article><small>${escape((moment.memberNames || []).join(" × "))}</small><b>${escape(moment.label)}</b><p>${escape(moment.text)}</p></article></section>`;
  }

  function partyReturnMomentPanel(result, context) {
    const { escape } = context;
    const moment = result.partyReturnMoment;
    if (!moment) return "";
    return `<section class="result-party-return-moment"><div><span class="label">ON THE WAY HOME</span><strong>帰路のひと幕</strong></div><span><small>${escape((moment.memberNames || []).join(" × "))}</small><b>${escape(moment.label)}</b></span><p>${escape(moment.text)}</p></section>`;
  }

  function lootReactionPanel(result, context) {
    const { escape } = context;
    const reaction = result.lootReaction;
    if (!reaction) return "";
    const item = window.GameData.items[reaction.itemId];
    return `<section class="result-loot-reaction"><span aria-hidden="true">${escape(item?.icon || "◇")}</span><div><small>戦利品を囲んで · ${escape(reaction.reason)}</small><strong>${escape(reaction.name)}${reaction.roleTitle ? ` · ${escape(reaction.roleTitle)}` : ""}</strong><p>${escape(reaction.text)}</p></div></section>`;
  }

  function signatureSkillPanel(result, context) {
    const { escape } = context;
    const ranks = window.GameData.config.characterGrowth?.skillMasteryRanks || [];
    const rankMap = new Map(ranks.map((rank, index) => [rank.id, { ...rank, index }]));
    const entries = (result.memberReports || []).map(member => Object.entries(member.skillUses || {}).map(([skillId, count]) => {
      const skill = window.GameData.skills[skillId], rank = rankMap.get(member.skillMasteryIds?.[skillId]);
      return skill && rank && count > 0 ? { member, skill, rank, count } : null;
    }).filter(Boolean).sort((left, right) => right.rank.index - left.rank.index || right.count - left.count)[0]).filter(Boolean);
    if (!entries.length) return "";
    return `<section class="result-signature-skills"><div><span class="label">FAMILIAR TECHNIQUES</span><strong>使い込んだ技能が戦場に現れました</strong></div><div>${entries.map(entry => `<article><span aria-hidden="true">${entry.skill.category === "healing" ? "癒" : entry.skill.category === "spell" ? "呪" : "技"}</span><p><small>${escape(entry.member.name)}</small><strong>${escape(entry.skill.name)} · ${escape(entry.rank.name)}</strong><em>今回 ${entry.count}回発動</em></p></article>`).join("")}</div></section>`;
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

  function monsterFirstDefeatPanel(result, context) {
    const entries = Array.isArray(result.newMonsterFirstDefeats) ? result.newMonsterFirstDefeats : [];
    if (!entries.length) return "";
    const names = entries.map(entry => window.GameData.monsters[entry.monsterId]?.name || entry.monsterId);
    return `<section class="result-new-discoveries result-monster-first-defeats"><span class="label">FIRST GUILD VICTORY</span><strong>ギルドで初めて討ち取った魔物が記録されました</strong><p>${names.map(name => `◆ ${context.escape(name)}`).join("　")}</p><small>${context.escape(entries[0].partyName)}の全員が、初討伐隊として図鑑に残ります。</small><button class="button ghost" data-action="open-result-monsters" data-dungeon="${context.escape(result.dungeonId)}">初討伐の記録を見る</button></section>`;
  }

  function monsterHabitatPanel(result, context) {
    const entries = Array.isArray(result.newMonsterHabitats) ? result.newMonsterHabitats : [];
    if (!entries.length) return "";
    const routes = new Map();
    entries.forEach(entry => {
      const key = `${entry.dungeonId}:${entry.difficultyId}`, route = window.DungeonDifficulty.variant(entry.dungeonId, entry.difficultyId);
      if (!routes.has(key)) routes.set(key, { name: route.name, monsters: [] });
      routes.get(key).monsters.push(window.GameData.monsters[entry.monsterId]?.name || entry.monsterId);
    });
    const rows = Array.from(routes.values()).map(route => `<li><strong>${context.escape(route.name)}</strong><span>${route.monsters.map(context.escape).join("・")}</span></li>`).join("");
    const completed = result.newMonsterHabitatSurvey
      ? `<p class="habitat-survey-complete"><b>現地調査 完了</b><span>確認できる${result.newMonsterHabitatSurvey.total}種すべての気配が記録に揃いました。調査謝礼：ギルド印章 +${result.newMonsterHabitatSurvey.sealReward}</span></p>`
      : "";
    return `<section class="result-new-discoveries result-monster-habitats"><span class="label">NEW HABITAT RECORD</span><strong>新しい生息記録を${entries.length}種確認しました</strong><ul>${rows}</ul>${completed}<small>次からは、この探索地と難度を討伐目標の行き先として選べます。</small><button class="button ghost" data-action="open-result-monsters" data-dungeon="${context.escape(result.dungeonId)}">生息記録を見る</button></section>`;
  }

  function monsterHuntMarkPanel(result, context) {
    const entries = Array.isArray(result.newMonsterHuntMarks) ? result.newMonsterHuntMarks : [];
    if (!entries.length) return "";
    const rows = entries.map(entry => {
      const monster = window.GameData.monsters[entry.monsterId], mark = window.Encyclopedia.huntMarks(entry.monsterId).find(candidate => candidate.threshold === entry.threshold);
      return monster && mark ? `<li><i>${context.escape(mark.icon)}</i><span><strong>${context.escape(monster.name)}・${context.escape(mark.name)}</strong><small>${context.escape(mark.description)}　調査謝礼：ギルド印章 +${entry.sealReward}</small></span></li>` : "";
    }).filter(Boolean).join("");
    return rows ? `<section class="result-new-discoveries result-monster-hunt-marks"><span class="label">HUNTING RECORD</span><strong>狩猟記録に新しい節目が刻まれました</strong><ul>${rows}</ul><button class="button ghost" data-action="open-result-monsters" data-dungeon="${context.escape(result.dungeonId)}">討伐の節目を見る</button></section>` : "";
  }

  function attemptComparison(result, context = {}) {
    const escape = context.escape || (value => String(value));
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
    const status = summary => `${number(summary.statusInflicted)}/${number(summary.statusAttempts)}（抵抗${number(summary.statusResisted)}）`;
    const actions = summary => `回${number(summary.healingActions)}・呪${number(summary.spellActions)}・技${number(summary.techniqueActions)}・攻${number(summary.attackActions)}・防${number(summary.defendActions)}`;
    const rewards = record => `${number(record.gold)}G・経験値${number(record.exp)}`;
    const loot = record => {
      if (Array.isArray(record.equipment) && Array.isArray(record.materials)) {
        const equipment = record.equipment.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
        const materials = record.materials.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
        return `装備${number(equipment)}・素材${number(materials)}`;
      }
      let equipment = Array.isArray(record.autoSold) ? record.autoSold.length : 0, materials = 0;
      (record.drops || []).forEach(drop => {
        const item = window.GameData.items[drop.itemId];
        if (["weapon", "armor"].includes(item?.type)) equipment += Number(drop.quantity) || 0;
        if (item?.type === "material") materials += Number(drop.quantity) || 0;
      });
      return `装備${number(equipment)}・素材${number(materials)}`;
    };
    const setupChanges = (() => {
      if (!Array.isArray(previous.partySetup) || !Array.isArray(result.partySetup)) return [];
      const beforeMembers = new Map(previous.partySetup.map(member => [member.id, member]));
      const currentMembers = new Map(result.partySetup.map(member => [member.id, member]));
      const changes = [];
      previous.partySetup.filter(member => !currentMembers.has(member.id)).forEach(member => changes.push(`${member.name}が隊列を離れた`));
      result.partySetup.filter(member => !beforeMembers.has(member.id)).forEach(member => changes.push(`${member.name}が隊列に加わった`));
      const actionLabels = { healing: "回", spell: "呪", technique: "技", attack: "攻" };
      result.partySetup.filter(member => beforeMembers.has(member.id)).forEach(member => {
        const old = beforeMembers.get(member.id);
        if (old.jobId !== member.jobId) changes.push(`${member.name}：${window.GameData.jobs[old.jobId]?.name || old.jobId}から${window.GameData.jobs[member.jobId]?.name || member.jobId}へ転職`);
        if (old.position !== member.position) changes.push(`${member.name}：${Number(old.position) + 1}列から${Number(member.position) + 1}列へ移動`);
        if (JSON.stringify(old.equipmentNames || []) !== JSON.stringify(member.equipmentNames || [])) changes.push(`${member.name}：装備構成を変更（${old.equipmentCount || 0}点→${member.equipmentCount || 0}点）`);
        const actionChanges = Object.keys(actionLabels).filter(key => Number(old.actionRates?.[key] ?? 100) !== Number(member.actionRates?.[key] ?? 100))
          .map(key => `${actionLabels[key]}${Number(old.actionRates?.[key] ?? 100)}→${Number(member.actionRates?.[key] ?? 100)}%`);
        if (actionChanges.length) changes.push(`${member.name}：行動率 ${actionChanges.join("・")}`);
      });
      return changes;
    })();
    const skillChanges = before.skillUses && current.skillUses ? [...new Set([
      ...Object.keys(before.skillUses), ...Object.keys(current.skillUses),
      ...Object.keys(before.skillDamage || {}), ...Object.keys(current.skillDamage || {}),
      ...Object.keys(before.skillHealing || {}), ...Object.keys(current.skillHealing || {}),
      ...Object.keys(before.skillStatusInflicted || {}), ...Object.keys(current.skillStatusInflicted || {})
    ])].map(skillId => ({
      skill: window.GameData.skills[skillId],
      before: {
        uses: Number(before.skillUses[skillId]) || 0,
        damage: Number(before.skillDamage?.[skillId]) || 0,
        healing: Number(before.skillHealing?.[skillId]) || 0,
        statuses: Number(before.skillStatusInflicted?.[skillId]) || 0
      },
      current: {
        uses: Number(current.skillUses[skillId]) || 0,
        damage: Number(current.skillDamage?.[skillId]) || 0,
        healing: Number(current.skillHealing?.[skillId]) || 0,
        statuses: Number(current.skillStatusInflicted?.[skillId]) || 0
      }
    })).filter(entry => entry.skill && Object.keys(entry.before).some(key => entry.before[key] !== entry.current[key]))
      .sort((a, b) => {
        const change = entry => Object.keys(entry.before).reduce((total, key) => total + Math.abs(entry.current[key] - entry.before[key]), 0);
        return change(b) - change(a) || a.skill.name.localeCompare(b.skill.name, "ja");
      }) : [];
    const skillChangeFacts = entry => [
      `発動 ${number(entry.before.uses)}→${number(entry.current.uses)}回`,
      entry.before.damage || entry.current.damage ? `与 ${number(entry.before.damage)}→${number(entry.current.damage)}` : "",
      entry.before.healing || entry.current.healing ? `回復 ${number(entry.before.healing)}→${number(entry.current.healing)}` : "",
      entry.before.statuses || entry.current.statuses ? `異常成功 ${number(entry.before.statuses)}→${number(entry.current.statuses)}回` : ""
    ].filter(Boolean);
    const memberChanges = (() => {
      if (!Array.isArray(before.members) || !Array.isArray(current.members)) return [];
      const previousMembers = new Map(before.members.map(member => [member.id, member]));
      const keys = ["damageDealt", "damageTaken", "healingDone", "statusInflicted", "remainingHp", "maxHp", "knockedOut"];
      return current.members.map(member => ({ member, before: previousMembers.get(member.id) }))
        .filter(entry => entry.before && keys.some(key => entry.before[key] !== entry.member[key]));
    })();
    const memberChangeFacts = entry => [
      `与 ${number(entry.before.damageDealt)}→${number(entry.member.damageDealt)}`,
      `被 ${number(entry.before.damageTaken)}→${number(entry.member.damageTaken)}`,
      `回復 ${number(entry.before.healingDone)}→${number(entry.member.healingDone)}`,
      `異常成功 ${number(entry.before.statusInflicted)}→${number(entry.member.statusInflicted)}回`,
      `残HP ${number(entry.before.remainingHp)}/${number(entry.before.maxHp)}→${number(entry.member.remainingHp)}/${number(entry.member.maxHp)}`
    ];
    const damageRows = (() => {
      if (!before.damageSources || !current.damageSources) return [];
      const sourceLabels = { physical: "物理", magic: "魔法", status: "状態異常", hazard: "道中" };
      const sources = Object.keys(sourceLabels).map(id => ({
        label: sourceLabels[id],
        before: Number(before.damageSources[id]) || 0,
        current: Number(current.damageSources[id]) || 0
      }));
      const elements = [...new Set([...Object.keys(before.damageElements || {}), ...Object.keys(current.damageElements || {})])].map(id => {
        const element = window.GameData.elements[id];
        return {
          label: `${element?.icon || "◇"} ${element?.name || id}`,
          before: Number(before.damageElements?.[id]) || 0,
          current: Number(current.damageElements?.[id]) || 0
        };
      }).filter(entry => entry.before > 0 || entry.current > 0)
        .sort((a, b) => (b.before + b.current) - (a.before + a.current) || a.label.localeCompare(b.label, "ja"));
      return [...sources, ...elements];
    })();
    const rows = [
      ["到達戦", `${number(before.encountersCleared)}/${number(before.totalEncounters)}`, `${number(current.encountersCleared)}/${number(current.totalEncounters)}`],
      ["討伐", `${number(before.monstersDefeated)}体`, `${number(current.monstersDefeated)}体`],
      ["物理命中", hit(before), hit(current)],
      ["状態異常", status(before), status(current)],
      ["行動内訳", actions(before), actions(current)],
      ["与ダメージ", number(before.damageDealt), number(current.damageDealt)],
      ["被ダメージ", number(before.damageTaken), number(current.damageTaken)],
      ["回復", number(before.healingDone), number(current.healingDone)],
      ["戦闘不能", `${number(before.knockouts)}人`, `${number(current.knockouts)}人`],
      ["報酬", rewards(previous), rewards(result)],
      ["戦利品", loot(previous), loot(result)]
    ];
    const setup = Array.isArray(previous.partySetup) && Array.isArray(result.partySetup)
      ? `<details class="attempt-setup-changes"><summary><span><small>PARTY CHANGES</small><strong>前回から変えた編成</strong></span><b>${setupChanges.length ? `${setupChanges.length}件` : "変更なし"}</b><i aria-hidden="true">›</i></summary><div>${setupChanges.length ? `<ul>${setupChanges.slice(0, 10).map(change => `<li>${escape(change)}</li>`).join("")}</ul>` : `<p>隊列・装備・行動率は前回と同じです。</p>`}</div></details>` : "";
    const damage = damageRows.length
      ? `<details class="attempt-setup-changes attempt-damage-changes"><summary><span><small>INCOMING DAMAGE</small><strong>受けた傷の変化</strong></span><b>${damageRows.length}項目</b><i aria-hidden="true">›</i></summary><div><ul>${damageRows.map(entry => `<li><strong>${escape(entry.label)}</strong><span>${number(entry.before)} → ${number(entry.current)}</span></li>`).join("")}</ul></div></details>` : "";
    const memberPerformance = Array.isArray(before.members) && Array.isArray(current.members)
      ? `<details class="attempt-setup-changes attempt-member-changes"><summary><span><small>MEMBER RESULTS</small><strong>冒険者ごとの働き</strong></span><b>${memberChanges.length ? `${memberChanges.length}人` : "変化なし"}</b><i aria-hidden="true">›</i></summary><div>${memberChanges.length ? `<ul>${memberChanges.map(entry => `<li><strong>${escape(entry.member.name)}</strong><span>${memberChangeFacts(entry).map(escape).join("・")}</span></li>`).join("")}</ul>` : `<p>同じ冒険者の与ダメージ・被ダメージ・回復・状態異常成功・残HPに変化はありません。</p>`}</div></details>` : "";
    const skills = before.skillUses && current.skillUses
      ? `<details class="attempt-setup-changes attempt-skill-changes"><summary><span><small>SKILL RESULTS</small><strong>技能の働きの変化</strong></span><b>${skillChanges.length ? `${skillChanges.length}種` : "変化なし"}</b><i aria-hidden="true">›</i></summary><div>${skillChanges.length ? `<ul>${skillChanges.slice(0, 12).map(entry => `<li><strong>${escape(entry.skill.name)}</strong><span>${skillChangeFacts(entry).map(escape).join("・")}</span></li>`).join("")}</ul>` : `<p>発動回数・与ダメージ・回復・状態異常成功に変化はありません。</p>`}</div></details>` : "";
    return `<section class="attempt-comparison"><div><span class="label">PREVIOUS ATTEMPT</span><h4>同じ探索条件の前回記録</h4><p>前回と今回に起きた事実だけを並べています。</p></div><div class="attempt-comparison-grid">${rows.map(([label, oldValue, newValue]) => `<div class="attempt-comparison-row"><span>${label}</span><small>前回</small><strong>${oldValue}</strong><i aria-hidden="true">→</i><small>今回</small><strong>${newValue}</strong></div>`).join("")}</div>${damage}${memberPerformance}${setup}${skills}</section>`;
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
    return `<section class="member-report"><h4>冒険者ごとの戦績</h4><div class="report-scroll"><table><thead><tr><th scope="col">冒険者</th><th scope="col">与ダメージ</th><th scope="col">物理命中</th><th scope="col">状態異常</th><th scope="col">回復量</th><th scope="col">被ダメージ</th><th scope="col">会心回数</th><th scope="col">帰還時HP</th></tr></thead><tbody>${result.memberReports.map(member => `<tr><th scope="row">${escape(member.name)}<small>${escape((window.GameData.jobs[member.jobId] || {}).name || "冒険者")}</small><small>攻${member.attackActions || 0}・技${member.techniqueActions || 0}・呪${member.spellActions || 0}・回${member.healingActions || 0}・防${member.defendActions || 0}${member.statusSkippedTurns ? `・不能${member.statusSkippedTurns}` : ""}</small></th><td>${member.damageDealt}</td><td>${member.attackHits || 0}/${member.attackAttempts || 0}</td><td class="report-status">${member.statusInflicted || 0}/${member.statusAttempts || 0}${member.statusResisted ? `<small>抵抗${member.statusResisted}</small>` : ""}</td><td class="report-heal">${member.healingDone}${member.healingAttempted ? `<small>試行${member.healingAttempted}・超過${member.overhealing || 0}</small>` : ""}</td><td>${member.damageTaken}</td><td>${member.criticalHits}</td><td>${member.remainingHp}/${member.maxHp}${member.remainingHp === 0 ? "（戦闘不能）" : ""}</td></tr>`).join("")}</tbody></table></div><p>与ダメージ・回復量は実際に減少・回復したHPの合計です。物理命中と状態異常は成功数／試行数で、「抵抗」は相手の耐性に防がれた回数です。「不能」は状態異常で行動できなかった回数です。被ダメージは回復しても累積します。</p></section>`;
  }

  function damageTakenPanel(result, context) {
    const { escape } = context;
    const sourceLabels = { physical: "物理", magic: "魔法", status: "状態異常", hazard: "道中の負傷" };
    const members = (result.memberReports || []).filter(member => member.damageTaken > 0 && member.damageSources);
    if (!members.length) return "";
    const sourceRows = member => Object.entries(member.damageSources || {}).filter(([, value]) => value > 0)
      .map(([id, value]) => `<span><small>${escape(sourceLabels[id] || id)}</small><b>${value.toLocaleString("ja-JP")}</b></span>`).join("");
    const elementRows = member => Object.entries(member.damageElements || {}).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1])
      .map(([id, value]) => { const element = window.GameData.elements[id]; return `<span class="element"><small>${escape(element?.icon || "◇")} ${escape(element?.name || id)}</small><b>${value.toLocaleString("ja-JP")}</b></span>`; }).join("");
    const total = members.reduce((sum, member) => sum + member.damageTaken, 0);
    return `<details class="result-skill-usage result-damage-breakdown"><summary><span><small>INCOMING DAMAGE</small><strong>受けた傷の内訳</strong></span><b>合計 ${total.toLocaleString("ja-JP")}</b><i aria-hidden="true">›</i></summary><div>${members.map(member => `<article><strong>${escape(member.name)}<small> 被 ${member.damageTaken.toLocaleString("ja-JP")}</small></strong><div>${sourceRows(member)}${elementRows(member)}</div></article>`).join("")}<p>属性は攻撃そのものから受けた実ダメージです。状態異常と道中の負傷は別に記録しています。</p></div></details>`;
  }

  function skillUsagePanel(result, context) {
    const { escape } = context;
    const members = (result.memberReports || []).map(member => ({
      name: member.name,
      uses: Object.entries(member.skillUses || {}).map(([skillId, count]) => ({
        skill: window.GameData.skills[skillId], count,
        damage: Number(member.skillDamage?.[skillId]) || 0,
        healing: Number(member.skillHealing?.[skillId]) || 0,
        statuses: Number(member.skillStatusInflicted?.[skillId]) || 0
      })).filter(entry => entry.skill && entry.count > 0).sort((a, b) => b.count - a.count || a.skill.name.localeCompare(b.skill.name, "ja"))
    })).filter(member => member.uses.length);
    if (!members.length) return "";
    const totalUses = members.reduce((total, member) => total + member.uses.reduce((sum, entry) => sum + entry.count, 0), 0);
    const uniqueSkills = new Set(members.flatMap(member => member.uses.map(entry => entry.skill.id))).size;
    return `<details class="result-skill-usage"><summary><span><small>SKILLS USED</small><strong>発動した技・呪文・回復</strong></span><b>${uniqueSkills}種・${totalUses}回</b><i aria-hidden="true">›</i></summary><div>${members.map(member => `<article><strong>${escape(member.name)}</strong><div>${member.uses.map(({ skill, count, damage, healing, statuses }) => { const cooldown = skill.activation?.type === "active" ? ` 再使用まで${skill.activation.cooldownTurns}ターン。` : ""; const performance = [`直接ダメージ ${damage}`, `実回復 ${healing}`, `異常成功 ${statuses}`].filter((label, index) => [damage, healing, statuses][index] > 0); return `<details><summary><span>${escape(skill.name)}</span><b>×${count}</b><i aria-hidden="true">›</i></summary><p>${escape(skill.description + cooldown)}</p>${performance.length ? `<small class="result-skill-performance">${performance.map(escape).join("・")}</small>` : ""}</details>`; }).join("")}</div></article>`).join("")}</div></details>`;
  }

  function companionGrowthSummary(entry, context) {
    const { escape } = context;
    const companion = window.Companions.definition(entry.companionId);
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

  window.GameUIViews.results = { adventurerBondMomentPanel, adventurerBondTierPanel, sharedHuntLedgerTierPanel, sharedHuntLedgerProgressPanel, namedHuntSupportPanel, adventurerReputationPanel, targetedHarvestPracticePanel, targetedHarvestPersistencePanel, partyReputationMomentPanel, partyReturnMomentPanel, lootReactionPanel, attemptComparison, bondFormationPanel, bossRivalryPanel, companionGrowthSummary, damageTakenPanel, growthPanel, highlights, lootPanel, memberHighlightPanel, memberReport, monsterFirstDefeatPanel, monsterHabitatPanel, monsterHuntMarkPanel, monsterInsightPanel, routeEvents, routeEventPanel, signatureSkillPanel, skillUsagePanel, tacticalReport, treasurePanel };
})();
