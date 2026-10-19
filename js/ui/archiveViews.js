(function () {
  "use strict";

  window.GameUIViews = window.GameUIViews || {};

  function commissions(context, dungeonId) {
    const current = window.Commissions.state();
    const recurringState = window.RecurringMissions.state();
    const recurringBoards = window.RecurringMissions.definitions().map(group => {
      const cycle = recurringState.groups[group.id], entries = window.RecurringMissions.active(group.id);
      const readyEntries = entries.filter(entry => window.RecurringMissions.ready(group.id, entry));
      const allReported = entries.length > 0 && entries.every(entry => cycle.claimed.includes(entry.id));
      const cards = entries.map(entry => {
        const progress = cycle.progress[entry.id] || 0, claimed = cycle.claimed.includes(entry.id), ready = progress >= entry.target;
        const rewards = [entry.rewards.gold ? context.formatGold(entry.rewards.gold) : "", ...Object.entries(entry.rewards.materials || {}).map(([id, quantity]) => `${context.itemName(id)}×${quantity}`)].filter(Boolean).join("・");
        const issuer = window.GameData.storyCharacters?.[entry.issuerCharacterId];
        const issuerLine = ready ? entry.completionFlavor : entry.flavor;
        const flavor = issuer && issuerLine ? `<p class="recurring-mission-issuer ${ready ? "is-complete" : ""}"><b>${context.escape(issuer.name)}</b>「${context.escape(issuerLine)}」</p>` : "";
        const issuerMark = issuer ? `<span class="recurring-mission-person" aria-hidden="true"><b>${context.escape(issuer.name.slice(0, 1))}</b><small>${context.escape(issuer.title)}</small></span>` : "";
        const route = window.RecurringMissions.destination(entry.trigger);
        const action = claimed ? '<button class="button secondary" disabled>報告済</button>' : ready ? `<button class="button primary" data-action="claim-recurring-mission" data-group="${group.id}" data-mission="${entry.id}">報告</button>` : route ? `<button class="button ghost" data-action="open-recurring-destination" data-page="${context.escape(route.page)}" data-view="${context.escape(route.view || "")}">${context.escape(route.label)}</button>` : '<button class="button secondary" disabled>進行中</button>';
        return `<article class="recurring-mission-card ${claimed ? "is-claimed" : ready ? "is-ready" : ""}">${issuerMark}<div class="recurring-mission-copy"><div class="card-heading"><h4>${context.escape(entry.title)}</h4><span class="badge ${claimed || ready ? "good" : ""}">${claimed ? "報告済み" : ready ? "報告可能" : `${progress}/${entry.target}`}</span></div>${flavor}<p>${context.escape(entry.description)}</p><small>報酬　${context.escape(rewards)}</small></div>${action}</article>`;
      }).join("");
      const period = group.schedule.type === "weekly" ? `${cycle.periodKey.replaceAll("-", "/")}開始の週` : `本日 ${cycle.periodKey.replaceAll("-", "/")}`;
      const completionIssuer = window.GameData.storyCharacters?.[group.completion?.issuerCharacterId];
      const completion = allReported && completionIssuer ? `<div class="recurring-board-completion"><span aria-hidden="true">✓</span><p><small>ALL REPORTED · ${context.escape(completionIssuer.title)}</small><strong>${context.escape(completionIssuer.name)}</strong>「${context.escape(group.completion.text)}」</p></div>` : "";
      return `<details class="panel wide recurring-mission-board${allReported ? " is-complete" : ""}" ${group.schedule.type === "daily" ? "open" : ""}><summary class="recurring-board-summary"><span><small>${context.escape(group.eyebrow)}</small><strong>${context.escape(group.name)}</strong></span><span class="badge ${allReported ? "good" : ""}">${allReported ? "すべて報告済み" : `${cycle.claimed.length}/${entries.length} 報告`}</span><i aria-hidden="true">›</i></summary><div class="recurring-board-body"><div class="recurring-mission-toolbar"><p class="small-note">${context.escape(period)}　端末時刻を基準に更新</p><button class="button secondary" data-action="claim-all-recurring-missions" data-group="${group.id}" ${readyEntries.length ? "" : "disabled"}>まとめて報告</button></div>${completion}<div class="recurring-mission-list">${cards}</div></div></details>`;
    }).join("");
    const quests = window.GameData.commissions.filter(quest => !dungeonId || quest.dungeonId === dungeonId);
    const questCards = quests.map(quest => {
      const unlocked = window.Story.canEnter(quest.dungeonId), progress = current.progress[quest.id] || 0;
      const claimed = current.claimed.includes(quest.id), ready = progress >= quest.target;
      const reward = `${context.formatGold(quest.rewards.gold)}・${Object.entries(quest.rewards.materials).map(([id, quantity]) => `${context.itemName(id)}×${quantity}`).join("・")}`;
      const html = `<article class="commission-card"><div class="card-heading"><h4>${context.escape(quest.title)}</h4><span class="badge ${claimed || ready ? "good" : ""}">${!unlocked ? "未解放" : claimed ? "受取済み" : ready ? "達成" : `${progress}/${quest.target}`}</span></div><p>${context.escape(quest.description)}</p><p>報酬：${context.escape(reward)}</p>${unlocked ? `<button class="button secondary" data-action="claim-commission" data-commission="${quest.id}" ${claimed || !ready ? "disabled" : ""}>${claimed ? "受取済み" : ready ? "報酬を受け取る" : "未達成"}</button>` : `<p class="story-lock-condition">${context.escape(window.Story.dungeonCondition(quest.dungeonId))}</p>`}</article>`;
      return { unlocked, claimed, html };
    });
    const activeCards = questCards.filter(entry => entry.unlocked && !entry.claimed);
    const completedCards = questCards.filter(entry => entry.unlocked && entry.claimed);
    const lockedCards = questCards.filter(entry => !entry.unlocked);
    const archive = (label, note, entries, kind) => entries.length ? `<details class="commission-archive-panel ${kind}"><summary><strong>${label}</strong><small>${entries.length}件 · ${note}</small><i aria-hidden="true">›</i></summary><div class="commission-grid">${entries.map(entry => entry.html).join("")}</div></details>` : "";
    const active = activeCards.length ? `<div class="commission-grid">${activeCards.map(entry => entry.html).join("")}</div>` : '<p class="empty-line">現在進行中の通常依頼はありません。</p>';
    return `<section class="panel wide"><div class="section-heading"><div><p class="eyebrow">GUILD REQUEST BOARD</p><h3>ギルド依頼掲示板</h3></div></div><p class="small-note">定期依頼と、探索地ごとの通常依頼を確認できます。</p></section>${recurringBoards}<section class="panel wide"><div class="section-heading"><div><p class="eyebrow">GUILD REQUEST</p><h3>通常依頼</h3></div><strong>進行中 ${activeCards.length}件</strong></div><p class="small-note">受注は不要。探索地の解放とともに進行し、各報酬は一度だけ受け取れます。</p>${active}${archive("受取済みの依頼", "記録を開く", completedCards, "is-completed")}${archive("この先の依頼", "物語の進行で解放", lockedCards, "is-locked")}</section>`;
  }

  function items(context) {
    const all = Object.values(window.GameData.items);
    const discovered = all.filter(item => window.Encyclopedia.item(item.id)).length;
    const trackedTarget = window.Encyclopedia.trackedTarget();
    const trackedItemId = trackedTarget?.itemId || null;
    const trackedItem = trackedItemId ? window.GameData.items[trackedItemId] : null;
    const trackedMonsterTarget = window.Encyclopedia.trackedMonsterTarget();
    const recentDiscoveries = window.Encyclopedia.recentItemDiscoveries(6);
    const activeCharacterIds = new Set(window.GameState.data.characters.map(character => character.id));
    const itemReturnsByItem = new Map();
    (window.GameState.data.partyHistory || []).forEach((history, partyIndex) => (history || []).forEach(entry => {
      const quantities = new Map();
      [...(entry.equipment || []), ...(entry.materials || [])].forEach(drop => quantities.set(drop.itemId, (quantities.get(drop.itemId) || 0) + (Number(drop.quantity) || 1)));
      quantities.forEach((quantity, itemId) => {
        if (!itemReturnsByItem.has(itemId)) itemReturnsByItem.set(itemId, []);
        itemReturnsByItem.get(itemId).push({ partyIndex, historyId: entry.id, completedAt: entry.completedAt, dungeonId: entry.dungeonId, difficultyId: entry.difficultyId || "normal", timeMultiplier: entry.timeMultiplier || 1, success: Boolean(entry.success), quantity, memberNames: (entry.partySetup || []).map(member => member.name).filter(Boolean) });
      });
    }));
    itemReturnsByItem.forEach(entries => entries.sort((left, right) => right.completedAt - left.completedAt));
    const namedHuntsByItem = new Map(), developingHuntsByItem = new Map();
    window.Characters.namedHuntEpithets().forEach(entry => namedHuntsByItem.set(entry.itemId, [...(namedHuntsByItem.get(entry.itemId) || []), entry]));
    window.Characters.developingHuntLedgers().forEach(entry => developingHuntsByItem.set(entry.itemId, [...(developingHuntsByItem.get(entry.itemId) || []), entry]));
    const unknownStack = count => `<article class="codex-card is-unknown codex-unknown-stack" aria-label="未発見のアイテム${count}点"><div class="codex-icon">？</div><span class="type-label">未発見</span><h4>？？？ ×${count}</h4><p>この分類には、まだ記録されていない品があります。入手すると個別の情報が開きます。</p></article>`;
    const ultraRareTitles = Object.values(window.GameData.ultraRareTitles || {});
    const knownUltraRareTitles = ultraRareTitles.filter(title => window.Encyclopedia.ultraRareTitle(title.id));
    const ultraRareCards = knownUltraRareTitles.map(title => {
      const skill = window.GameData.equipmentSkills[title.skillId];
      return `<article class="ultra-title-card"><span aria-hidden="true">✧</span><div><small>超レア称号</small><strong>★${context.escape(title.name)}</strong><p>${context.escape(skill?.name || "固有技能")}・${context.escape(skill?.description || "特別な力を宿す。")}</p></div></article>`;
    }).join("");
    const unknownUltraRareCount = ultraRareTitles.length - knownUltraRareTitles.length;
    const ultraRareLedger = `<section class="ultra-title-ledger"><div class="ultra-title-heading"><div><span>ULTRA RARE TITLES</span><h4>名を持つ逸品の記録</h4></div><strong>${knownUltraRareTitles.length} / ${ultraRareTitles.length}</strong></div><p>探索で実物を持ち帰った称号だけを記録します。装備を手放しても発見記録は残ります。</p><div class="ultra-title-grid">${ultraRareCards || '<p class="empty-line">名を持つ逸品はまだ見つかっていません。</p>'}${unknownUltraRareCount ? `<article class="ultra-title-card is-unknown"><span>？</span><div><small>未発見</small><strong>？？？ ×${unknownUltraRareCount}</strong><p>探索の戦利品に、ごくまれに現れます。</p></div></article>` : ""}</div></section>`;
    const equipmentSets = Object.values(window.GameData.equipmentSets || {});
    const setRecords = equipmentSets.map(definition => {
      const knownItemIds = definition.itemIds.filter(id => window.Encyclopedia.item(id));
      return { definition, knownItemIds, complete: knownItemIds.length === definition.itemIds.length };
    });
    const visibleSetRecords = setRecords.filter(entry => entry.knownItemIds.length);
    const equipmentSetCards = visibleSetRecords.map(entry => {
      const itemChips = entry.definition.itemIds.map(itemId => {
        const item = window.GameData.items[itemId], known = entry.knownItemIds.includes(itemId);
        return `<span class="${known ? "is-known" : "is-unknown"}">${known ? `${context.escape(item.icon || "◇")} ${context.escape(item.name)}` : "？ ？？？"}</span>`;
      }).join("");
      const bonuses = entry.definition.bonuses.map(bonus => {
        const skill = window.GameData.equipmentSkills[bonus.skillId], revealed = entry.knownItemIds.length >= bonus.count;
        return revealed
          ? `<li class="is-revealed"><strong>${bonus.count}種類：${context.escape(skill.name)}</strong><small>${context.escape(skill.description)}</small></li>`
          : `<li><strong>${bonus.count}種類の組合せ</strong><small>まだ効果は判明していない</small></li>`;
      }).join("");
      return `<article class="equipment-set-card ${entry.complete ? "is-complete" : ""}"><header><div><small>${entry.complete ? "全品発見" : "装備組合せ"}</small><strong>${context.escape(entry.definition.name)}</strong></div><b>${entry.knownItemIds.length}/${entry.definition.itemIds.length}</b></header><p>${context.escape(entry.definition.description)}</p><div class="equipment-set-items">${itemChips}</div><ul>${bonuses}</ul></article>`;
    }).join("");
    const unknownSetCount = setRecords.length - visibleSetRecords.length;
    const equipmentSetLedger = equipmentSets.length ? `<section class="equipment-set-ledger"><div class="ultra-title-heading"><div><span>EQUIPMENT COMBINATIONS</span><h4>装備組合せの記録</h4></div><strong>全品発見 ${setRecords.filter(entry => entry.complete).length} / ${equipmentSets.length}</strong></div><p>一つでも持ち帰った系統だけを記録します。異なる装備をそろえると効果が判明し、同じ装備を複数持っても種類数は増えません。</p><div class="equipment-set-grid">${equipmentSetCards || '<p class="empty-line">組合せに属する装備はまだ見つかっていません。</p>'}${unknownSetCount ? `<article class="equipment-set-card is-unknown"><header><div><small>未発見</small><strong>？？？ ×${unknownSetCount}</strong></div><b>？</b></header><p>系統に属する装備を一つ入手すると記録が開きます。</p></article>` : ""}</div></section>` : "";
    const discoveryLedger = recentDiscoveries.length ? `<section class="recent-discovery-ledger"><header><div><span>RECENT FIRST FINDS</span><h4>最近の初発見</h4></div><strong>${recentDiscoveries.length}件</strong></header><p>新しい品を最初に持ち帰った冒険者と、その時の探索地です。</p><div>${recentDiscoveries.map(entry => { const item = window.GameData.items[entry.itemId], dungeon = window.DungeonDifficulty.variant(entry.dungeonId, entry.difficultyId); const inner = `<i aria-hidden="true">${context.escape(item?.icon || "◇")}</i><span><strong>${context.escape(item?.name || entry.itemId)}</strong><small>${context.escape(entry.name)}${entry.roleTitle ? `・${context.escape(entry.roleTitle)}` : ""}</small><em>${context.escape(dungeon.name)}・${new Date(entry.completedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}</em></span><b aria-hidden="true">›</b>`; return activeCharacterIds.has(entry.characterId) ? `<button type="button" data-action="open-adventurer-record" data-character="${context.escape(entry.characterId)}">${inner}</button>` : `<article>${inner}</article>`; }).join("")}</div></section>` : "";
    function card(item) {
      const count = window.Encyclopedia.item(item.id);
      const equipmentType = window.GameData.equipmentTypes[item.weaponType || item.armorType];
      const type = item.type === "material" ? "素材" : `${item.type === "weapon" ? "武器" : "防具"}・${equipmentType?.name || "その他"}`;
      const effect = item.type === "material" ? null : window.Items.standardEffects(item.id);
      const bestQualityId = item.type === "material" ? null : window.Encyclopedia.bestQuality(item.id);
      const bestQuality = bestQualityId ? window.GameData.qualities[bestQualityId] : null;
      const firstDiscovery = window.Encyclopedia.itemDiscovery(item.id);
      const stats = item.type === "material" ? "製作や強化に使用する素材" : [effect.attack ? `攻撃 ${effect.attack}` : "", effect.magicAttack ? `魔法攻撃 ${effect.magicAttack}` : "", effect.defense ? `防御 ${effect.defense}` : "", effect.magicDefense ? `魔法防御 ${effect.magicDefense}` : "", effect.magicHealing ? `魔法回復 ${effect.magicHealing}` : "", effect.hp ? `HP ${effect.hp}` : "", `重量 ${effect.weight || 0}`, item.type === "weapon" ? (item.range === "ranged" ? "遠距離" : "近接") : ""].filter(Boolean).join(" ／ ");
      const sources = window.Encyclopedia.itemAcquisitionSources(item.id);
      const monsterGroups = new Map();
      sources.monsters.forEach(source => {
        const key = `${source.dungeonId}:${source.monsterId}:${source.kind}`;
        if (!monsterGroups.has(key)) monsterGroups.set(key, { dungeonId: source.dungeonId, monsterId: source.monsterId, kind: source.kind, difficulties: [] });
        monsterGroups.get(key).difficulties.push(source.difficultyId);
      });
      const sourceRows = [];
      if (sources.shop) sourceRows.push('<li class="has-action"><strong>商店</strong><span>購入</span><button type="button" class="item-source-action" data-action="mobile-nav" data-page="shop">商店へ ›</button></li>');
      sources.recipes.forEach(recipe => {
        const available = window.Blacksmith.status(window.GameData.recipes.find(entry => entry.id === recipe.id)) !== "locked";
        const action = available ? `<button type="button" class="item-source-action" data-action="open-target-recipes" data-recipes="${context.escape(recipe.id)}">製作へ ›</button>` : "";
        sourceRows.push(`<li class="${action ? "has-action" : ""}"><strong>鍛冶屋</strong><span>${context.escape(recipe.name || item.name)}を製作</span>${action}</li>`);
      });
      sources.treasures.forEach(source => {
        const available = window.Story.canEnter(source.dungeonId) && window.DungeonDifficulty.unlocked(source.dungeonId, "normal");
        const action = available ? `<button type="button" class="item-source-action" data-action="open-target-destination" data-dungeon="${context.escape(source.dungeonId)}" data-difficulty="normal">探索地へ ›</button>` : "";
        sourceRows.push(`<li class="${action ? "has-action" : ""}"><strong>${context.escape(source.dungeonName)}</strong><span>宝箱</span>${action}</li>`);
      });
      monsterGroups.forEach(source => {
        const dungeon = window.GameData.dungeons[source.dungeonId], monster = window.GameData.monsters[source.monsterId];
        const difficulties = window.DungeonDifficulty.ids().filter(id => source.difficulties.includes(id)).map(id => window.DungeonDifficulty.tier(id).name).join("・");
        const monsterRecord = window.Encyclopedia.monster(source.monsterId);
        const observedFixed = source.kind === "fixed" && source.difficulties.some(difficultyId =>
          (monsterRecord?.difficulties?.[difficultyId]?.drops || []).includes(item.id)
          && window.MonsterLoot.fixedDropIds(source.monsterId, difficultyId).includes(item.id));
        const paired = observedFixed && trackedItemId === item.id && trackedMonsterTarget?.monsterId === source.monsterId;
        const huntAction = observedFixed
          ? `<button type="button" class="item-source-action item-source-hunt" data-action="resume-ledger-hunt" data-item="${context.escape(item.id)}" data-monster="${context.escape(source.monsterId)}" ${paired ? "disabled" : ""}>${paired ? "追跡中" : "この獲物を追う ›"}</button>`
          : "";
        sourceRows.push(`<li class="${huntAction ? "has-action" : ""}"><strong>${context.escape(dungeon.name)}</strong><span>${context.escape(monster.name)}を討伐 <b>${context.escape(difficulties)}</b>${source.kind === "fixed" ? "・固有" : "・通常装備"}</span>${huntAction}</li>`);
      });
      const acquisition = `<details class="item-acquisition"><summary>入手元を確認 <span>${sourceRows.length}件</span></summary><ul>${sourceRows.join("") || '<li><span>装備の分解・章報酬など</span></li>'}</ul></details>`;
      const discoveryRecord = firstDiscovery ? (() => {
        const dungeon = window.DungeonDifficulty.variant(firstDiscovery.dungeonId, firstDiscovery.difficultyId);
        const date = new Date(firstDiscovery.completedAt).toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric" });
        return `<section class="codex-first-discovery"><span aria-hidden="true">✦</span><div><small>最初の持ち帰り</small><strong>${context.escape(firstDiscovery.name)}${firstDiscovery.roleTitle ? `・${context.escape(firstDiscovery.roleTitle)}` : ""}</strong><p>${context.escape(dungeon.name)}から帰還した ${context.escape(date)}</p></div></section>`;
      })() : "";
      const itemReturns = itemReturnsByItem.get(item.id) || [];
      const bestReturn = itemReturns.reduce((best, entry) => !best || entry.quantity > best.quantity || (entry.quantity === best.quantity && entry.completedAt > best.completedAt) ? entry : best, null);
      const recentReturns = itemReturns.filter(entry => entry.historyId !== bestReturn?.historyId).slice(0, 2);
      const retraceParty = record => {
        const partyIndexes = Array.from({ length: window.Party.limit() }, (_, index) => index);
        if (record.partyIndex < window.Party.limit() && !window.Party.expedition(record.partyIndex)) return record.partyIndex;
        const selectedPartyIndex = window.Party.selected();
        return !window.Party.expedition(selectedPartyIndex) ? selectedPartyIndex : partyIndexes.find(index => !window.Party.expedition(index));
      };
      const routeRecordMap = new Map();
      itemReturns.forEach(entry => {
        const key = `${entry.dungeonId}:${entry.difficultyId}:${entry.timeMultiplier}`;
        const current = routeRecordMap.get(key);
        if (!current || entry.quantity > current.quantity || (entry.quantity === current.quantity && entry.completedAt > current.completedAt)) routeRecordMap.set(key, entry);
      });
      const routeRecords = Array.from(routeRecordMap.values()).sort((left, right) => right.quantity - left.quantity || right.completedAt - left.completedAt);
      const routeRecordLedger = routeRecords.length > 1 ? `<section class="item-route-records"><header><span>ROUTE RECORDS</span><strong>探索条件ごとの記録</strong><small>${routeRecords.length}通り</small></header><div>${routeRecords.slice(0, 5).map(entry => {
        const dungeon = window.DungeonDifficulty.variant(entry.dungeonId, entry.difficultyId);
        const party = entry.memberNames.length ? entry.memberNames.join("・") : `第${entry.partyIndex + 1}隊`;
        const readyPartyIndex = retraceParty(entry), waiting = readyPartyIndex == null, nextTarget = Math.min(999, entry.quantity + 1);
        return `<article><button type="button" class="item-route-record-open" data-action="open-item-history" data-party="${entry.partyIndex}" data-history="${context.escape(entry.historyId)}" data-item="${context.escape(item.id)}"><span><strong>${context.escape(dungeon.name)} · ${entry.timeMultiplier}倍探索</strong><small>${context.escape(party)}</small></span><b>+${entry.quantity}</b><i aria-hidden="true">›</i></button><button type="button" class="item-route-record-retrace" data-action="retrace-history-item" data-party="${waiting ? entry.partyIndex : readyPartyIndex}" data-dungeon="${context.escape(entry.dungeonId)}" data-difficulty="${context.escape(entry.difficultyId)}" data-time="${entry.timeMultiplier}" data-item="${context.escape(item.id)}" data-target="${nextTarget}" ${waiting || entry.quantity >= 999 ? "disabled" : ""}>${entry.quantity >= 999 ? "上限" : waiting ? "帰還待ち" : `${nextTarget}個へ`}</button></article>`;
      }).join("")}</div>${routeRecords.length > 5 ? `<small>ほか${routeRecords.length - 5}通りの記録</small>` : ""}</section>` : "";
      const bestReturnRecord = bestReturn ? (() => {
        const dungeon = window.DungeonDifficulty.variant(bestReturn.dungeonId, bestReturn.difficultyId);
        const party = bestReturn.memberNames.length ? bestReturn.memberNames.join("・") : `第${bestReturn.partyIndex + 1}隊`;
        const retracePartyIndex = retraceParty(bestReturn);
        const waiting = retracePartyIndex == null;
        const targetQuantity = Math.min(999, bestReturn.quantity + 1);
        const retraceLabel = waiting ? "待機隊の帰還後に再訪" : retracePartyIndex === bestReturn.partyIndex ? `次は${targetQuantity}個を目指す` : `第${retracePartyIndex + 1}隊で${targetQuantity}個へ`;
        return `<article class="item-return-best"><button type="button" class="item-return-best-record" data-action="open-item-history" data-party="${bestReturn.partyIndex}" data-history="${context.escape(bestReturn.historyId)}" data-item="${context.escape(item.id)}"><span><small>BEST RETURN · 最高の持ち帰り</small><strong>${context.escape(dungeon.name)} · ${bestReturn.timeMultiplier}倍探索</strong><em>${context.escape(party)}</em></span><b>+${bestReturn.quantity}</b><i aria-hidden="true">›</i></button><button type="button" class="item-return-best-retrace" data-action="retrace-history-item" data-party="${waiting ? bestReturn.partyIndex : retracePartyIndex}" data-dungeon="${context.escape(bestReturn.dungeonId)}" data-difficulty="${context.escape(bestReturn.difficultyId)}" data-time="${bestReturn.timeMultiplier}" data-item="${context.escape(item.id)}" data-target="${targetQuantity}" ${waiting ? "disabled" : ""}>${retraceLabel}</button></article>`;
      })() : "";
      const returnHistory = itemReturns.length ? `<details class="item-return-history"><summary><span>最近の持ち帰り</span><b>全${itemReturns.length}件</b></summary><div>${bestReturnRecord}${routeRecordLedger}${recentReturns.length ? '<small class="item-return-recent-label">RECENT RETURNS · 直近の記録</small>' : ""}${recentReturns.map(entry => {
        const dungeon = window.DungeonDifficulty.variant(entry.dungeonId, entry.difficultyId);
        const date = new Date(entry.completedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
        const party = entry.memberNames.length ? entry.memberNames.join("・") : `第${entry.partyIndex + 1}隊`;
        return `<button type="button" data-action="open-item-history" data-party="${entry.partyIndex}" data-history="${context.escape(entry.historyId)}" data-item="${context.escape(item.id)}"><span><strong>${context.escape(dungeon.name)}</strong><small>${context.escape(party)} · ${context.escape(date)}</small></span><em class="${entry.success ? "success" : "failure"}">${entry.success ? "帰還" : "撤退"} · +${entry.quantity}</em><i aria-hidden="true">›</i></button>`;
      }).join("")}</div></details>` : "";
      const namedHunters = namedHuntsByItem.get(item.id) || [], developingHunters = developingHuntsByItem.get(item.id) || [];
      const sharedHuntRows = [
        ...namedHunters.map(entry => ({ kind: "named", entry })),
        ...developingHunters.map(entry => ({ kind: "developing", entry }))
      ];
      const sharedHuntLedger = sharedHuntRows.length ? `<details class="monster-shared-hunt-ledger item-shared-hunt-ledger"><summary><span><small>SHARED HUNT RECORDS</small><strong>この品を追う二人</strong></span><b>${namedHunters.length ? `狩り名 ${namedHunters.length}組` : `育成中 ${developingHunters.length}組`}</b><i aria-hidden="true">›</i></summary><div>${sharedHuntRows.slice(0, 4).map(({ kind, entry }) => kind === "named"
        ? `<button type="button" data-action="open-adventurer-bonds" data-bond="${context.escape(entry.bondKey)}" data-monster="${context.escape(entry.monsterId)}" data-item="${context.escape(entry.itemId)}"><span aria-hidden="true">狩</span><span><strong>${context.escape(entry.epithet)}</strong><small>${context.escape(entry.monster.name)} · ${entry.members.map(member => context.escape(member.name)).join("と")}</small></span><em>頁を読む</em></button>`
        : `<button type="button" data-action="resume-ledger-hunt" data-monster="${context.escape(entry.monsterId)}" data-item="${context.escape(entry.itemId)}"><span aria-hidden="true">続</span><span><strong>${context.escape(entry.monster.name)} · ${entry.members.map(member => context.escape(member.name)).join("と")}</strong><small>${context.escape(entry.tier?.label || "書き始めの頁")} → ${context.escape(entry.progress.nextTier.label)} · あと${entry.progress.remaining}回</small></span><em>追う</em></button>`).join("")}${sharedHuntRows.length > 4 ? `<small>ほか${sharedHuntRows.length - 4}組は「狩り名の帳」に記録されています。</small>` : ""}</div></details>` : "";
      const tracked = item.id === trackedItemId;
      const focused = item.id === context.itemFocus;
      return `<article class="codex-card ${tracked ? "is-tracked-item" : ""}${focused ? " is-focused-item" : ""}" data-item-codex="${context.escape(item.id)}"><div class="codex-icon">${item.icon || "◇"}</div><span class="type-label">${type}${item.unique ? "・ボス固有" : ""}${focused ? "・探索記録から表示" : ""}</span><h4>${context.escape(item.name)}</h4><p>${context.escape(stats)}</p>${bestQuality ? `<p class="codex-quality-record"><span>最高品質</span><strong class="quality-${bestQuality.color}">${context.escape(bestQuality.prefix || "標準")}</strong></p>` : ""}${item.effectDescription ? `<p class="codex-effect">${context.escape(item.effectDescription)}</p>` : ""}${discoveryRecord}${acquisition}${returnHistory}${sharedHuntLedger}<footer class="codex-item-footer"><small>累計入手 ${count}個</small><button class="button ${tracked ? "secondary" : "ghost"}" data-action="track-item" data-item="${item.id}" ${tracked ? "disabled" : ""}>${tracked ? "探索目標" : "探索目標にする"}</button></footer></article>`;
    }
    const weaponOrder = ["sword", "rapier", "katana", "bow", "staff"];
    const armorOrder = ["cloth", "leather", "heavy", "shield", "gauntlet"];
    const groups = [
      ...weaponOrder.map(id => ({ id: `weapon-${id}`, heading: `武器・${window.GameData.equipmentTypes[id].name}`, description: "同じ武器種の装備", items: all.filter(item => item.type === "weapon" && item.weaponType === id) })),
      ...armorOrder.map(id => ({ id: `armor-${id}`, heading: `防具・${window.GameData.equipmentTypes[id].name}`, description: "同じ防具種の装備", items: all.filter(item => item.type === "armor" && item.armorType === id) })),
      { id: "materials", heading: "素材", description: "製作・強化・募集などに使用する品", items: all.filter(item => item.type === "material") }
    ].filter(group => group.items.length);
    const content = groups.map((group, index) => {
      const sorted = group.items.slice().sort((a, b) => (a.tier || 0) - (b.tier || 0) || a.name.localeCompare(b.name, "ja"));
      const known = sorted.filter(item => window.Encyclopedia.item(item.id));
      const unknownCount = sorted.length - known.length;
      const containsFocus = known.some(item => item.id === context.itemFocus);
      return `<details class="monster-dungeon-group item-codex-group${containsFocus ? " is-focused-group" : ""}" ${index === 0 || containsFocus ? "open" : ""}><summary><span><strong>${context.escape(group.heading)}</strong><small>${context.escape(group.description)}</small></span><b>発見 ${known.length}/${sorted.length}</b><i aria-hidden="true">›</i></summary><div class="codex-grid">${known.map(card).join("")}${unknownCount ? unknownStack(unknownCount) : ""}</div></details>`;
    }).join("");
    const trackedPanel = trackedItem ? `<section class="codex-tracked-target ${trackedTarget.progress >= trackedTarget.quantity ? "is-complete" : ""}"><span>現在の探索目標</span><strong>${context.escape(trackedItem.icon || "◇")} ${context.escape(trackedItem.name)}</strong><small>入手記録のある攻略先に印が付きます。</small><div class="codex-target-progress"><span>${trackedTarget.progress >= trackedTarget.quantity ? "達成" : "収集中"}</span><strong>${trackedTarget.progress} / ${trackedTarget.quantity}</strong><i><b style="width:${Math.min(100, trackedTarget.progress / trackedTarget.quantity * 100)}%"></b></i></div><form id="item-target-form" data-item="${trackedItem.id}"><label>必要数<input type="number" name="targetQuantity" min="1" max="999" inputmode="numeric" value="${trackedTarget.quantity}" required></label><button class="button secondary" type="submit">更新</button></form><button class="button ghost" data-action="clear-tracked-item">解除</button></section>` : `<section class="codex-tracked-target is-empty"><span>探索目標</span><p>発見済みの品から一つ選ぶと、攻略先で入手記録を照合できます。</p></section>`;
    return `<section class="panel archive-content item-codex"><div class="section-heading"><div><span class="label">ITEM ENCYCLOPEDIA</span><h3>アイテム図鑑</h3></div><strong>${discovered} / ${all.length}</strong></div><p>武器種、防具種、素材に分けて記録しています。一度でも入手した品は、売却や製作に使った後も図鑑に残ります。未発見品は分類ごとにまとめて伏せています。</p>${trackedPanel}${discoveryLedger}${equipmentSetLedger}${ultraRareLedger}${content}</section>`;
  }

  function monsters(context) {
    const all = Object.values(window.GameData.monsters);
    const recentEncounters = context.monsterEncounters || {};
    const recentDefeats = context.monsterDefeats || {};
    const discovered = all.filter(monster => window.Encyclopedia.monster(monster.id)).length;
    const defeated = all.filter(monster => window.Encyclopedia.monster(monster.id)?.defeated).length;
    const itemTarget = window.Encyclopedia.trackedTarget();
    const monsterTarget = window.Encyclopedia.trackedMonsterTarget();
    const chapterOrder = Object.fromEntries(window.GameData.storyChapters.map(chapter => [chapter.id, chapter.order]));
    const dungeons = Object.values(window.GameData.dungeons).slice().sort((a, b) => Number(b.id === context.monsterDungeonId) - Number(a.id === context.monsterDungeonId) || (chapterOrder[a.chapterId] || 999) - (chapterOrder[b.chapterId] || 999) || a.orderInChapter - b.orderInChapter);
    function isShopEquipment(itemId) {
      const item = window.GameData.items[itemId];
      return ["weapon", "armor"].includes(item?.type) && !item.unique && !item.craftOnly && !item.dropOnly;
    }
    function configuredDrops(monster, difficultyId) {
      const result = [...window.MonsterLoot.materialDrops(monster).map(drop => drop.itemId)];
      const titled = window.DungeonDifficulty.monster(monster, difficultyId);
      (titled.signatureDropTiers || []).forEach(entry => {
        (entry.drops.materials || []).forEach(drop => result.push(drop.itemId));
        if (entry.drops.equipment) result.push(entry.drops.equipment.itemId);
      });
      if (monster.bossDrop) result.push(monster.bossDrop.itemId);
      return Array.from(new Set(result)).filter(id => !isShopEquipment(id));
    }
    function difficultyDrops(monster, record, difficultyId) {
      const tier = window.DungeonDifficulty.tier(difficultyId);
      const entry = record.difficulties?.[difficultyId];
      if (!entry?.encountered) return `<section class="monster-difficulty-drop is-unknown"><strong>${tier.name}</strong><span>${context.escape(tier.namePrefix + monster.name)}</span><small>未遭遇</small></section>`;
      const titled = window.DungeonDifficulty.monster(monster, difficultyId);
      const configured = configuredDrops(monster, difficultyId);
      const observed = new Set(entry.drops || []);
      const configuredSkills = titled.difficultySkillIds || [];
      const observedSkills = new Set(entry.skillIds || []);
      const skills = configuredSkills.filter(id => observedSkills.has(id)).map(id => window.GameData.monsterSkills?.[id]).filter(Boolean);
      const unknownSkills = configuredSkills.length - skills.length;
      const drops = configured.filter(id => observed.has(id)).map(id => {
        const item = window.GameData.items[id];
        const paired = itemTarget?.itemId === id && monsterTarget?.monsterId === monster.id;
        return window.Encyclopedia.item(id)
          ? `<button type="button" class="monster-drop-chip is-action ${paired ? "is-paired" : ""}" data-action="track-harvest" data-item="${context.escape(id)}" data-monster="${context.escape(monster.id)}" ${paired ? "disabled" : ""}><span>${context.escape(item?.icon || "◇")} ${context.escape(item?.name || id)}</span><i>${paired ? "追跡中" : "この品を追う"}</i></button>`
          : `<span class="monster-drop-chip">${context.escape(item?.icon || "◇")} ${context.escape(item?.name || id)}</span>`;
      }).join("");
      const unknown = configured.length - configured.filter(id => observed.has(id)).length;
      return `<section class="monster-difficulty-drop"><strong>${tier.name}</strong><span>${context.escape(tier.namePrefix + monster.name)}</span><div>${drops || '<small>ドロップはまだ確認されていない</small>'}${unknown > 0 ? `<span class="monster-drop-unknown">未確認 ${unknown}種</span>` : ""}</div>${skills.length || unknownSkills ? `<div class="monster-skill-record">${skills.map(skill => `<details class="monster-skill-chip"><summary>${context.escape(skill.name)}・${skill.period}T</summary><p>${context.escape(skill.description)}</p></details>`).join("")}${unknownSkills ? `<span class="monster-skill-unknown">固有技 未確認 ${unknownSkills}種</span>` : ""}</div>` : ""}<small>遭遇 ${entry.encountered}体 ／ 討伐 ${entry.defeated}体</small></section>`;
    }
    function monsterCard(monster, dungeonId) {
      const record = window.Encyclopedia.monster(monster.id);
      const knownHere = window.Encyclopedia.monsterHabitats(monster.id).some(habitat => habitat.dungeonId === dungeonId);
      const recentCount = Number(recentEncounters[monster.id]) || 0;
      const recentDefeated = Number(recentDefeats[monster.id]) || 0;
      if (!record || !knownHere) return `<article class="codex-card is-unknown" aria-label="未遭遇のモンスター"><div class="codex-icon">？</div><span class="type-label">未遭遇</span><h4>？？？</h4><p>この探索地で遭遇すると登録されます。</p></article>`;
      const familyNames = window.CreatureFamilies ? window.CreatureFamilies.labels(window.CreatureFamilies.familyIdsForMonster(monster.id)) : [];
      const observed = record.observations || {}, facts = [];
      if (observed.incomingAttempts) facts.push(`こちらの攻撃は${observed.incomingHits}/${observed.incomingAttempts}回命中`);
      if (observed.maxAttackCount) facts.push(`一度に最大${observed.maxAttackCount}回の攻撃を確認`);
      if (observed.magicAttack) facts.push("魔法攻撃を確認");
      if (observed.rearTargeting) facts.push("隊列後方への攻撃を確認");
      if ((observed.attackElements || []).length) facts.push(`攻撃属性：${observed.attackElements.map(id => window.StatusCombat.elementLabel(id)).join("・")}`);
      if ((observed.statusAttacks || []).length) facts.push(`使用した状態異常：${observed.statusAttacks.map(id => window.GameData.statusEffects[id]?.name || id).join("・")}`);
      if ((observed.elementWeaknesses || []).length) facts.push(`弱点反応：${observed.elementWeaknesses.map(id => id === "magic" ? "魔法" : window.StatusCombat.elementLabel(id)).join("・")}`);
      if ((observed.elementResistances || []).length) facts.push(`耐性反応：${observed.elementResistances.map(id => window.StatusCombat.elementLabel(id)).join("・")}`);
      if ((observed.statusResisted || []).length) facts.push(`防がれた状態異常：${observed.statusResisted.map(id => window.GameData.statusEffects[id]?.name || id).join("・")}`);
      if ((observed.statusLanded || []).length) facts.push(`有効だった状態異常：${observed.statusLanded.map(id => window.GameData.statusEffects[id]?.name || id).join("・")}`);
      if ((observed.burstRounds || []).length >= 2) {
        const rounds = observed.burstRounds, interval = rounds[rounds.length - 1] - rounds[rounds.length - 2];
        facts.push(`大技は${interval}ターン間隔で再発動を確認`);
      }
      const study = Math.min(3, 1 + (record.defeated > 0 ? 1 : 0) + (record.defeated >= 3 && observed.incomingAttempts >= 8 ? 1 : 0));
      const stats = study >= 3 ? `<p>検証値：HP ${monster.hp} ／ 物攻 ${monster.attack} ／ 物防 ${monster.defense}<br>魔攻 ${monster.magicAttack ?? monster.attack} ／ 魔防 ${monster.magicDefense ?? monster.defense} ／ 速度 ${monster.speed || 9}</p>` : "";
      const firstDefeat = record.firstDefeat;
      const firstDefeatRecord = firstDefeat ? (() => {
        const dungeon = window.DungeonDifficulty.variant(firstDefeat.dungeonId, firstDefeat.difficultyId || "normal");
        const names = firstDefeat.members.map(member => `${member.name}${member.roleTitle ? `・${member.roleTitle}` : ""}`).join("、");
        const date = new Date(firstDefeat.completedAt).toLocaleDateString("ja-JP");
        return `<div class="monster-first-defeat"><span>初討伐隊</span><strong>${context.escape(firstDefeat.partyName)}</strong><p>${context.escape(names)}</p><small>${context.escape(dungeon?.name || "探索地不明")} · ${context.escape(date)}</small></div>`;
      })() : "";
      const huntMarks = window.Encyclopedia.huntMarks(monster.id);
      const achievedHuntMarks = huntMarks.filter(mark => mark.achieved);
      const nextHuntMark = huntMarks.find(mark => !mark.achieved);
      const huntLedger = record.defeated ? `<div class="monster-hunt-ledger"><span>討伐の節目</span><div>${achievedHuntMarks.map(mark => `<abbr title="${context.escape(mark.description)}"><i>${context.escape(mark.icon)}</i>${context.escape(mark.name)}<em>固有品 ×${mark.fixedLootMultiplier}</em></abbr>`).join("") || "<small>最初の節目へ記録中</small>"}</div>${nextHuntMark ? `<small>次は「${context.escape(nextHuntMark.name)}」まで ${record.defeated} / ${nextHuntMark.threshold}体・調査謝礼 印章${nextHuntMark.sealReward}個・固有品を見つけやすくなる</small>` : "<small>すべての狩猟記録が刻まれ、固有品の発見率は最大です。</small>"}</div>` : "";
      const namedHunters = window.Characters.namedHuntEpithets().filter(entry => entry.monsterId === monster.id);
      const developingHunters = window.Characters.developingHuntLedgers().filter(entry => entry.monsterId === monster.id);
      const sharedHuntRows = [
        ...namedHunters.map(entry => ({ kind: "named", entry })),
        ...developingHunters.map(entry => ({ kind: "developing", entry }))
      ];
      const sharedHuntLedger = sharedHuntRows.length ? `<details class="monster-shared-hunt-ledger"><summary><span><small>SHARED HUNT RECORDS</small><strong>この獲物を追う二人</strong></span><b>${namedHunters.length ? `狩り名 ${namedHunters.length}組` : `育成中 ${developingHunters.length}組`}</b><i aria-hidden="true">›</i></summary><div>${sharedHuntRows.slice(0, 4).map(({ kind, entry }) => kind === "named"
        ? `<button type="button" data-action="open-adventurer-bonds" data-bond="${context.escape(entry.bondKey)}" data-monster="${context.escape(entry.monsterId)}" data-item="${context.escape(entry.itemId)}"><span aria-hidden="true">狩</span><span><strong>${context.escape(entry.epithet)}</strong><small>${entry.members.map(member => context.escape(member.name)).join("と")} · ${context.escape(entry.item.name)}</small></span><em>頁を読む</em></button>`
        : `<button type="button" data-action="resume-ledger-hunt" data-monster="${context.escape(entry.monsterId)}" data-item="${context.escape(entry.itemId)}"><span aria-hidden="true">続</span><span><strong>${entry.members.map(member => context.escape(member.name)).join("と")}</strong><small>${context.escape(entry.tier?.label || "書き始めの頁")} → ${context.escape(entry.progress.nextTier.label)} · あと${entry.progress.remaining}回</small></span><em>追う</em></button>`).join("")}${sharedHuntRows.length > 4 ? `<small>ほか${sharedHuntRows.length - 4}組は「狩り名の帳」に記録されています。</small>` : ""}</div></details>` : "";
      const nextTargetMark = huntMarks.find(mark => !mark.achieved);
      const suggestedHuntCount = nextTargetMark ? Math.max(1, nextTargetMark.threshold - record.defeated) : 100;
      const sameTarget = monsterTarget?.monsterId === monster.id;
      const targetReached = sameTarget && monsterTarget.progress >= monsterTarget.quantity;
      const suggestedTargetQuantity = sameTarget ? monsterTarget.progress + suggestedHuntCount : suggestedHuntCount;
      const targetAction = sameTarget && !targetReached
        ? `<button class="button secondary" disabled>討伐目標に指定中・残り${Math.max(0, monsterTarget.quantity - monsterTarget.progress)}体</button>`
        : `<button class="button ghost" data-action="track-monster" data-monster="${context.escape(monster.id)}" data-target-quantity="${suggestedTargetQuantity}">${sameTarget ? "次の節目まで続ける" : "次の節目まで追う"}・あと${suggestedHuntCount}体</button>`;
      const difficultyRows = window.DungeonDifficulty.ids().map(id => difficultyDrops(monster, record, id)).join("");
      return `<article class="codex-card monster-codex-card ${recentCount ? "is-recent-encounter" : ""} ${monster.boss && record.defeated ? "is-boss" : ""}"><div class="codex-icon">${monster.icon || "◆"}</div><span class="type-label">${recentCount ? `今回 遭遇${recentCount}体・討伐${recentDefeated}体 ／ ` : ""}調査段階 ${study}/3${record.defeated ? "・討伐済み" : "・未討伐"}</span><h4>${context.escape(monster.name)}</h4><p class="monster-family-line">分類：${context.escape(familyNames.join("・") || "不明")}</p>${stats}<p class="codex-effect">${context.escape(facts.join("。 ") || "名前と生息地だけが記録されている。さらに遭遇し、異なる攻撃を試すと記録が増える。")}</p>${firstDefeatRecord}${huntLedger}${sharedHuntLedger}<div class="monster-difficulty-drops">${difficultyRows}</div><small>総遭遇 ${record.encountered}体 ／ 総討伐 ${record.defeated}体</small>${targetAction}</article>`;
    }
    const groups = dungeons.map((dungeon, index) => {
      const unlocked = window.Story.canEnter(dungeon.id);
      const monsterIds = Array.from(new Set(dungeon.encounters.flatMap(encounter => encounter.groups.flat()))).sort((a, b) => Number(Boolean(recentEncounters[b])) - Number(Boolean(recentEncounters[a])));
      const found = monsterIds.filter(id => window.Encyclopedia.monsterHabitats(id).some(habitat => habitat.dungeonId === dungeon.id)).length;
      const cards = unlocked ? monsterIds.map(id => monsterCard(window.GameData.monsters[id], dungeon.id)).join("") : `<div class="monster-dungeon-locked">物語を進めると調査記録が開きます。</div>`;
      const surveyRewards = { normal: 1, abyss: 2, divine: 3 };
      const surveys = unlocked ? window.DungeonDifficulty.ids().map(difficultyId => {
        const tier = window.DungeonDifficulty.tier(difficultyId);
        const available = window.DungeonDifficulty.unlocked(dungeon.id, difficultyId);
        if (!available) return `<article class="is-locked"><span>${context.escape(tier.name)}</span><strong>未解放</strong><small>前の難度を踏破すると記録できます</small></article>`;
        const survey = window.Encyclopedia.habitatSurvey(dungeon.id, difficultyId);
        return `<article class="${survey.complete ? "is-complete" : ""}"><span>${context.escape(tier.name)}</span><strong>${survey.confirmed}/${survey.total}種</strong><small>${survey.complete ? `記録完了・謝礼 印章${surveyRewards[difficultyId]}個` : "気配を記録中"}</small></article>`;
      }).join("") : "";
      const surveyPanel = surveys ? `<section class="monster-habitat-surveys"><header><strong>現地調査</strong><small>難度ごとに確認した気配</small></header><div>${surveys}</div></section>` : "";
      const focused = dungeon.id === context.monsterDungeonId;
      return `<details class="monster-dungeon-group ${focused ? "is-focused-dungeon" : ""}" data-dungeon="${dungeon.id}" ${focused || index === 0 ? "open" : ""}><summary><span><strong>${context.escape(dungeon.name)}</strong><small>${focused ? "直前の探索で遭遇 · " : ""}${context.escape(dungeon.description)}</small></span><b>${unlocked ? `発見 ${found}/${monsterIds.length}` : "未解放"}</b><i aria-hidden="true">›</i></summary>${surveyPanel}<div class="codex-grid">${cards}</div></details>`;
    }).join("");
    const recentCount = Object.keys(recentEncounters).length;
    const recentDefeatCount = Object.values(recentDefeats).reduce((sum, count) => sum + (Number(count) || 0), 0);
    const returnRoute = context.monsterDungeonId && context.returnPartyIndex != null ? `<section class="monster-expedition-context"><div><span>直前の探索記録</span><strong>遭遇 ${recentCount}種 ／ 討伐 ${recentDefeatCount}体</strong><small>強調された記録には、この帰還報告での遭遇数と討伐数を表示しています。</small></div><button class="button secondary" data-action="return-to-result-report" data-party="${context.returnPartyIndex}">帰還報告へ戻る</button></section>` : "";
    const recentFirstDefeats = window.Encyclopedia.recentMonsterFirstDefeats(6);
    const victoryLedger = recentFirstDefeats.length ? `<section class="recent-discovery-ledger recent-victory-ledger"><header><div><span>RECENT FIRST VICTORIES</span><h4>最近の初討伐</h4></div><strong>${recentFirstDefeats.length}件</strong></header><p>ギルドで初めて打ち勝った魔物と、その場にいた仲間です。</p><div>${recentFirstDefeats.map(entry => { const monster = window.GameData.monsters[entry.monsterId], dungeon = window.DungeonDifficulty.variant(entry.dungeonId, entry.difficultyId); const members = entry.members.map(member => member.name).join("・"); return `<article><i aria-hidden="true">${context.escape(monster?.icon || "◆")}</i><span><strong>${context.escape(monster?.name || entry.monsterId)}</strong><small>${context.escape(entry.partyName)}・${context.escape(members)}</small><em>${context.escape(dungeon.name)}・${new Date(entry.completedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}</em></span></article>`; }).join("")}</div></section>` : "";
    const surveyRewards = { normal: 1, abyss: 2, divine: 3 };
    const surveyLedgerEntries = window.DungeonDifficulty.ids().map(difficultyId => {
      const tier = window.DungeonDifficulty.tier(difficultyId);
      const routes = dungeons.filter(dungeon => window.Story.canEnter(dungeon.id) && window.DungeonDifficulty.unlocked(dungeon.id, difficultyId));
      const complete = routes.filter(dungeon => window.Encyclopedia.habitatSurvey(dungeon.id, difficultyId).complete).length;
      const percentage = routes.length ? Math.round(complete / routes.length * 100) : 0;
      const nextRoute = routes.find(dungeon => !window.Encyclopedia.habitatSurvey(dungeon.id, difficultyId).complete);
      const action = nextRoute ? `<button type="button" data-action="open-survey-route" data-dungeon="${context.escape(nextRoute.id)}" data-difficulty="${context.escape(difficultyId)}">未完の土地を見る</button>` : "";
      return `<article class="${routes.length && complete === routes.length ? "is-complete" : ""}"><span>${context.escape(tier.name)}</span><strong>${complete}/${routes.length}か所</strong><i><b style="width:${percentage}%"></b></i><small>完了謝礼 各${surveyRewards[difficultyId]}個</small>${action}</article>`;
    }).join("");
    const completedSurveys = dungeons.reduce((sum, dungeon) => sum + window.DungeonDifficulty.ids().filter(difficultyId => window.Story.canEnter(dungeon.id) && window.DungeonDifficulty.unlocked(dungeon.id, difficultyId) && window.Encyclopedia.habitatSurvey(dungeon.id, difficultyId).complete).length, 0);
    const availableSurveys = dungeons.reduce((sum, dungeon) => sum + window.DungeonDifficulty.ids().filter(difficultyId => window.Story.canEnter(dungeon.id) && window.DungeonDifficulty.unlocked(dungeon.id, difficultyId)).length, 0);
    const surveyLedger = `<section class="habitat-survey-ledger"><header><div><span>FIELD SURVEY LEDGER</span><h4>現地調査簿</h4></div><strong>${completedSurveys}/${availableSurveys} 完了</strong></header><p>物語で歩ける土地について、難度ごとの気配が揃った記録です。</p><div>${surveyLedgerEntries}</div></section>`;
    const trackedMonster = monsterTarget ? window.GameData.monsters[monsterTarget.monsterId] : null;
    const targetPanel = trackedMonster ? `<section class="codex-tracked-target ${monsterTarget.progress >= monsterTarget.quantity ? "is-complete" : ""}"><span>現在の討伐目標</span><strong>${context.escape(trackedMonster.icon || "◆")} ${context.escape(trackedMonster.name)}</strong><small>生息を確認した攻略先に印が付きます。</small><div class="codex-target-progress"><span>${monsterTarget.progress >= monsterTarget.quantity ? "達成" : "追跡中"}</span><strong>${monsterTarget.progress} / ${monsterTarget.quantity}</strong><i><b style="width:${Math.min(100, monsterTarget.progress / monsterTarget.quantity * 100)}%"></b></i></div><form id="monster-target-form" data-monster="${context.escape(trackedMonster.id)}"><label>目標数<input type="number" name="targetQuantity" min="1" max="999" inputmode="numeric" value="${monsterTarget.quantity}" required></label><button class="button secondary" type="submit">更新</button></form><button class="button ghost" data-action="clear-tracked-monster">解除</button></section>` : `<section class="codex-tracked-target is-empty"><span>討伐目標</span><p>遭遇済みの魔物を一種選ぶと、攻略先で生息記録を照合できます。</p></section>`;
    return `<section class="panel archive-content monster-codex"><div class="section-heading"><div><span class="label">MONSTER ENCYCLOPEDIA</span><h3>モンスター図鑑</h3></div><strong>発見 ${discovered} / ${all.length}・討伐 ${defeated}</strong></div>${returnRoute}<p>ダンジョンごとに生息するモンスターを確認できます。難易度別ドロップは実際に確認した品だけを表示し、商店で購入できる通常武器・防具は記載しません。</p>${targetPanel}${surveyLedger}${victoryLedger}${groups}</section>`;
  }

  function originBonusText(type, entry) {
    const multiplierLabels = { hpMultiplier: "HP", attackMultiplier: "物理攻撃", defenseMultiplier: "物理防御", magicAttackMultiplier: "魔法攻撃", magicDefenseMultiplier: "魔法防御", magicHealingMultiplier: "魔法回復", weightMultiplier: "重量上限", skillPower: "スキル威力", healingPower: "回復威力" };
    const bonusLabels = { speedBonus: "速度", criticalBonus: "会心", hitBonus: "命中", evasionBonus: "回避" };
    const values = [];
    Object.entries(multiplierLabels).forEach(([key, label]) => {
      const value = entry[key] == null ? 1 : entry[key];
      if (value !== 1) values.push(`${label}×${value.toFixed(2)}`);
    });
    Object.entries(bonusLabels).forEach(([key, label]) => {
      const value = entry[key] || 0;
      if (value) values.push(`${label}${value > 0 ? "+" : ""}${key === "speedBonus" ? value : `${Math.round(value * 100)}pt`}`);
    });
    if (type === "job") {
      values.unshift(`基礎速度${entry.speed}`, `基礎命中${Math.round(entry.hitRate * 100)}%`, `基礎回避${Math.round(entry.evasionRate * 100)}%`, `基礎会心${Math.round(entry.criticalRate * 100)}%`);
    }
    Object.entries(entry.elementModifiers || {}).forEach(([id, value]) => values.push(`${window.GameData.elements[id]?.name || id}被害×${value.toFixed(2)}`));
    Object.entries(entry.statusResistances || {}).forEach(([id, value]) => values.push(`${window.GameData.statusEffects[id]?.name || id}耐性${Math.round(value * 100)}%`));
    return values;
  }

  function originEntry(context, type, entry) {
    const unlocked = window.Recruitment.entryUnlocked(entry);
    const typeName = { job: "職業", race: "種族", birth: "生まれ" }[type];
    const icon = entry.icon || (type === "race" ? "◇" : "⌂");
    if (!unlocked) {
      const chapter = window.GameData.storyChapters.find(candidate => candidate.id === entry.unlockAfter);
      return `<article class="origin-codex-entry is-locked"><span class="origin-codex-icon">？</span><span><strong>${context.escape(entry.name)}</strong><small>${context.escape(chapter?.title || "物語")}達成で解放</small></span><span class="badge">未解放</span></article>`;
    }
    const bonuses = originBonusText(type, entry);
    const affinities = Object.entries(window.GameData.relations.equipmentAffinities[type][entry.id] || {}).filter(([, value]) => value !== 1).map(([id, value]) => `${window.GameData.equipmentTypes[id].name}×${value.toFixed(2)}`);
    const skills = (window.GameData.relations.skillGrants[type][entry.id] || []).slice().sort((a, b) => Number(b.initial) - Number(a.initial) || a.level - b.level).map(grant => {
      const skill = window.GameData.skills[grant.skillId];
      const cooldown = skill.activation?.type === "active" ? ` 再使用：${skill.activation.cooldownTurns}ターン。` : "";
      return `<li><span>${grant.initial ? "初期" : `Lv.${grant.level}`}</span><div><strong>${context.escape(window.GameData.config.skillCategories[skill.category])} · ${context.escape(skill.name)}</strong><small>${context.escape(skill.description)}${cooldown}</small></div></li>`;
    }).join("");
    return `<details class="origin-codex-entry"><summary><span class="origin-codex-icon">${context.escape(icon)}</span><span><strong>${context.escape(entry.name)}</strong><small>${context.escape(entry.description)}</small></span><span class="badge good">${typeName}</span><i aria-hidden="true">›</i></summary><div class="origin-codex-detail"><h5>能力補正</h5><div class="origin-codex-chips">${bonuses.map(value => `<span>${context.escape(value)}</span>`).join("") || "<span>固有の数値補正なし</span>"}</div><h5>装備適性</h5><div class="origin-codex-chips">${affinities.map(value => `<span>${context.escape(value)}</span>`).join("") || "<span>標準適性</span>"}</div><h5>習得スキル</h5><ul class="origin-skill-list">${skills || '<li class="is-empty">習得スキルなし</li>'}</ul></div></details>`;
  }

  function origins(context) {
    const groups = [
      ["job", "職業", "初期スキル4種に加え、Lv.10・40・70・100で職業技能を習得します。", window.GameData.jobs],
      ["race", "種族", "初期スキル4種に加え、Lv.1・30・60・100で血脈の力を習得します。", window.GameData.races],
      ["birth", "生まれ", "初期スキル4種に加え、Lv.1・20・60・100で経験に根差した技能を習得します。", window.GameData.births]
    ];
    const content = groups.map(([type, name, description, table], index) => {
      const entries = Object.values(table), unlocked = entries.filter(window.Recruitment.entryUnlocked).length;
      return `<details class="origin-codex-group" ${index === 0 ? "open" : ""}><summary><span><strong>${name}</strong><small>${description}</small></span><b>${unlocked}/${entries.length}</b><i aria-hidden="true">›</i></summary><div class="origin-codex-list">${entries.map(entry => originEntry(context, type, entry)).join("")}</div></details>`;
    }).join("");
    return `<section class="panel archive-content origin-codex"><div class="section-heading"><div><span class="label">ADVENTURER COMPENDIUM</span><h3>冒険者体系</h3></div><strong>職業15・種族15・生まれ15</strong></div><p>募集で選べる冒険者の素質と、レベルで習得するスキルを確認できます。未解放の項目は物語を進めると閲覧可能になります。</p>${content}</section>`;
  }

  function companions(context) {
    const story = window.Story.ensure(), currentChapter = window.Story.current();
    const chapterOrder = Object.fromEntries(window.GameData.storyChapters.map(chapter => [chapter.id, chapter.order]));
    const currentOrder = currentChapter ? currentChapter.order : Number.MAX_SAFE_INTEGER;
    const arcs = Object.values(window.GameData.relations.companionStoryArcs).sort((a, b) => chapterOrder[a.joinChapterId] - chapterOrder[b.joinChapterId]);
    const joined = new Set(story.joinedCompanionIds);
    const known = arcs.filter(arc => joined.has(arc.companionId) || currentOrder >= chapterOrder[arc.joinChapterId]);
    const allMoments = window.GameData.config.explorationEvents?.companionMoments || [];
    const momentMap = new Map(allMoments.map(moment => [moment.id, moment]));
    const witnessedMemories = new Set(story.facts.companionMoments || []);
    const relationshipMap = new Map();
    allMoments.filter(moment => moment.companionIds.length > 1).forEach(moment => {
      const ids = [...moment.companionIds].sort(), key = ids.join(":"), witnessed = moment.lines.reduce((count, line, lineIndex) => count + (witnessedMemories.has(`${moment.id}:${lineIndex}`) ? 1 : 0), 0);
      if (!witnessed) return;
      const record = relationshipMap.get(key) || { ids, titles: [], memories: 0, bonds: 0 };
      record.titles.push(moment.title);
      record.memories += witnessed;
      if (witnessed === moment.lines.length) record.bonds += 1;
      relationshipMap.set(key, record);
    });
    const relationships = [...relationshipMap.values()];
    const relationshipHistory = relationships.length ? `<section class="companion-relationships"><div class="section-heading compact"><div><span class="label">TRAVEL COMPANIONS</span><h4>同行の記録</h4></div><strong>${relationships.length}組</strong></div><p>共に歩いた旅の中で、初めて見えた人物同士のつながりです。</p><div class="companion-relationship-list">${relationships.map(record => {
      const people = record.ids.map(id => window.Companions.definition(id)).filter(Boolean);
      return `<article class="${record.bonds ? "is-bonded" : ""}"><span class="companion-relationship-portraits">${people.map(person => `<img src="${context.escape(window.GameData.portraits[person.portraitId]?.image || "")}" alt="">`).join("")}</span><span><strong>${context.escape(people.map(person => person.name).join("と"))}</strong><small>${context.escape(record.titles.join("・"))}</small></span><em>${record.bonds ? "縁が結ばれた" : `${record.memories}篇`}</em></article>`;
    }).join("")}</div></section>` : "";
    const cards = known.map((arc, index) => {
      const companion = window.Companions.definition(arc.companionId), portrait = window.GameData.portraits[companion.portraitId];
      const joinedCharacter = window.Companions.character(companion.id), isJoined = joined.has(companion.id) && Boolean(joinedCharacter);
      const joiningChapter = window.GameData.storyChapters.find(chapter => chapter.id === arc.joinChapterId);
      const recordedChapters = arc.featuredChapterIds.map(id => window.GameData.storyChapters.find(chapter => chapter.id === id)).filter(chapter => chapter && (story.completed.includes(chapter.id) || currentChapter?.id === chapter.id));
      const skills = isJoined ? window.Companions.skillGrants(companion.id).map(grant => window.GameData.skills[grant.skillId]).filter(Boolean) : [];
      const growthStage = isJoined ? window.Companions.stage(companion.id) : null;
      const growthStages = isJoined ? window.Companions.stageChain(companion.id) : [];
      const growthHistory = growthStages.length ? `<h5>人物の歩み</h5><ol class="companion-growth-timeline">${growthStages.map((stage, stageIndex) => `<li class="${stageIndex === growthStages.length - 1 ? "is-current" : ""}"><span>${stageIndex + 1}</span><strong>${context.escape(stage.name)}</strong>${stageIndex === growthStages.length - 1 ? "<small>現在</small>" : ""}</li>`).join("")}</ol>` : "";
      const memories = (story.facts.companionMoments || []).map(key => {
        const split = key.lastIndexOf(":"), moment = momentMap.get(key.slice(0, split)), lineIndex = Number(key.slice(split + 1));
        return moment && moment.companionIds.includes(companion.id) ? { moment, line: moment.lines[lineIndex] } : null;
      }).filter(Boolean);
      const memoryHistory = memories.length ? `<h5>旅の記憶 <small>${memories.length}件</small></h5><ol class="companion-memory-list">${memories.map(memory => {
        const partners = memory.moment.companionIds.filter(id => id !== companion.id).map(id => window.Companions.definition(id)?.name).filter(Boolean);
        return `<li><strong>${context.escape(memory.moment.title)}</strong>${partners.length ? `<small>${context.escape(partners.join("・"))}と同行</small>` : ""}<p>${context.escape(memory.line)}</p></li>`;
      }).join("")}</ol>` : "";
      return `<details class="companion-ledger-card ${isJoined ? "is-joined" : "is-traveling"}" ${index === known.length - 1 ? "open" : ""}><summary><img src="${context.escape(portrait?.image || "")}" alt=""><span><small>${isJoined ? "物語加入" : "物語に登場"}</small><strong>${context.escape(companion.name)}</strong><em>${context.escape(companion.title)}</em></span><b class="badge ${isJoined ? "good" : ""}">${isJoined ? `Lv.${joinedCharacter.level}` : "登場"}</b><i aria-hidden="true">›</i></summary><div class="companion-ledger-detail"><p>${context.escape(companion.description)}</p><blockquote>${context.escape(arc.theme)}</blockquote><div class="companion-ledger-facts"><span>初登場・加入<strong>${context.escape(joiningChapter.title)}</strong></span><span>種族・職業<strong>${context.escape(window.GameData.races[companion.raceId].name)}・${context.escape(window.GameData.jobs[companion.jobId].name)}</strong></span>${growthStage ? `<span>物語成長段階<strong>${context.escape(growthStage.name)}</strong></span>` : ""}</div>${growthHistory}<h5>人物が関わった記録</h5><div class="companion-story-chips">${recordedChapters.map(chapter => `<span>${context.escape(chapter.title)}</span>`).join("") || '<span>物語はまだ始まったばかり</span>'}</div>${memoryHistory}${isJoined ? `<h5>現在の固有スキル</h5><ul class="companion-skill-summary">${skills.map(skill => `<li><strong>${context.escape(skill.name)}</strong><small>${context.escape(skill.description)}</small></li>`).join("")}</ul>` : `<p class="companion-travel-note">初登場時の物語効果が同期されると、その場でギルドへ加わります。</p>`}</div></details>`;
    }).join("");
    const unknown = arcs.length - known.length;
    return `<section class="panel archive-content companion-ledger"><div class="section-heading"><div><span class="label">STORY COMPANIONS</span><h3>人物録</h3></div><strong>${joined.size} / ${window.GameData.config.companions.rosterLimit}人加入</strong></div><p>遠征の途中で出会い、ギルドの物語を共に歩いた人物の記録です。まだ出会っていない人物の名前や役割は伏せられています。</p>${relationshipHistory}<div class="companion-ledger-list">${cards || '<p class="empty-line">物語を進めると、出会った人物がここに記録されます。</p>'}${unknown ? `<article class="companion-ledger-unknown"><span>？</span><div><strong>未遭遇の人物 ×${unknown}</strong><small>新たな土地で出会うまで記録は開きません。</small></div></article>` : ""}</div></section>`;
  }

  function observationUnlocked(note) {
    return window.ObservationJournal.unlocked(note);
  }

  function rumorLedger(context) {
    const definitions = window.GameData.config.explorationEvents?.routeEvents || [];
    const records = window.Story.ensure().facts.routeEvents || {};
    const masteryRequired = window.GameData.config.explorationEvents?.routeMastery?.successes || 3;
    const confirmed = definitions.filter(event => (records[event.id]?.rumorMatches || 0) > 0).length;
    const routeFor = eventId => Object.values(window.GameData.dungeons)
      .filter(dungeon => window.Story.canEnter(dungeon.id) && window.Exploration.routeRumorEntry(dungeon).eventId === eventId)
      .sort((a, b) => Number(window.Story.ensure().facts.clears.includes(a.id)) - Number(window.Story.ensure().facts.clears.includes(b.id)) || a.recommendedLevel - b.recommendedLevel)[0] || null;
    const marks = { secret: "?", camp: "♨", hazard: "!", lore: "文", gather: "採" };
    const entries = definitions.map(event => {
      const record = records[event.id] || { encounters: 0, successes: 0, rumorMatches: 0 };
      const witnessed = record.encounters > 0;
      const matched = record.rumorMatches > 0;
      const mastered = record.successes >= masteryRequired;
      const state = mastered ? "mastered" : matched ? "confirmed" : witnessed ? "witnessed" : "unknown";
      const label = mastered ? "知見を共有済み" : matched ? "噂と実地記録が一致" : witnessed ? "兆しは観測・噂は未照合" : "まだ見ぬ兆し";
      const route = matched ? null : routeFor(event.id);
      const lead = route ? `<button type="button" data-action="open-rumor-route" data-dungeon="${route.id}"><span>噂を追う</span><small>${context.escape(route.name)}</small></button>` : "";
      return `<article class="rumor-ledger-entry is-${state}"><span aria-hidden="true">${marks[event.kind] || "◇"}</span><div><small>${label}</small><strong>${witnessed ? context.escape(event.name) : "記録のない兆し"}</strong>${matched ? "<em>照合済</em>" : ""}</div>${lead}</article>`;
    }).join("");
    return `<details class="rumor-ledger" ${confirmed && confirmed < definitions.length ? "open" : ""}><summary><span><small>FIELD RUMOR LEDGER</small><strong>噂の照合録</strong></span><b>${confirmed} / ${definitions.length}種</b><i aria-hidden="true">›</i></summary><div><p>土地で聞いた話と、実際の遠征で起きたことを重ねた記録です。まだ名のない兆しは、探索ログから探してください。</p><div class="rumor-ledger-grid">${entries}</div></div></details>`;
  }

  function observations(context) {
    const notes = window.GameData.observationNotes || [];
    const chapterMapUsage = (chapterId, difficultyId) => {
      const records = [];
      (window.GameState.data.partyHistory || []).forEach((history, partyIndex) => {
        (history || []).forEach(entry => {
          const dungeon = window.GameData.dungeons[entry.dungeonId];
          if (!entry.chapterMapBenefit || dungeon?.chapterId !== chapterId || (entry.difficultyId || "normal") !== difficultyId) return;
          records.push({ entry, partyIndex });
        });
      });
      records.sort((left, right) => (right.entry.completedAt || 0) - (left.entry.completedAt || 0));
      const latest = records[0] || null;
      return {
        count: records.length,
        secondsSaved: records.reduce((total, record) => total + Math.max(0, Number(record.entry.chapterMapBenefit.secondsSaved) || 0), 0),
        latestDungeonId: latest?.entry.dungeonId || null,
        latestPartyIndex: latest?.partyIndex ?? null
      };
    };
    const chapterMapTarget = (chapterId, difficultyId) => {
      const itemTarget = window.Encyclopedia.trackedTarget();
      const monsterTarget = window.Encyclopedia.trackedMonsterTarget();
      const activeItem = itemTarget && itemTarget.progress < itemTarget.quantity ? window.GameData.items[itemTarget.itemId] : null;
      const activeMonster = monsterTarget && monsterTarget.progress < monsterTarget.quantity ? window.GameData.monsters[monsterTarget.monsterId] : null;
      if (!activeItem && !activeMonster) return null;
      const itemSources = activeItem ? window.Encyclopedia.itemAcquisitionSources(activeItem.id) : null;
      const monsterHabitats = new Set(activeMonster ? window.Encyclopedia.monsterHabitats(activeMonster.id).map(entry => `${entry.dungeonId}:${entry.difficultyId}`) : []);
      const routes = Object.values(window.GameData.dungeons)
        .filter(dungeon => dungeon.chapterId === chapterId && window.Story.canEnter(dungeon.id) && window.DungeonDifficulty.unlocked(dungeon.id, difficultyId))
        .map(dungeon => {
          const itemMatched = Boolean(itemSources && (itemSources.treasures.some(source => source.dungeonId === dungeon.id)
            || itemSources.monsters.some(source => source.dungeonId === dungeon.id && source.difficultyId === difficultyId)));
          const monsterMatched = Boolean(activeMonster && monsterHabitats.has(`${dungeon.id}:${difficultyId}`));
          return { dungeon, itemMatched, monsterMatched, score: Number(itemMatched) + Number(monsterMatched) };
        })
        .filter(entry => entry.score > 0)
        .sort((left, right) => right.score - left.score || (left.dungeon.orderInChapter || 0) - (right.dungeon.orderInChapter || 0) || left.dungeon.id.localeCompare(right.dungeon.id, "en"));
      const best = routes[0];
      if (!best) return null;
      const targets = [best.itemMatched ? activeItem.name : null, best.monsterMatched ? activeMonster.name : null].filter(Boolean);
      return { dungeonId: best.dungeon.id, label: targets.join("・") };
    };
    const focusedNote = notes.find(note => note.id === context.observationFocus && observationUnlocked(note)) || null;
    const unlockedCount = notes.filter(observationUnlocked).length;
    const categories = Array.from(new Set(notes.map(note => note.category)));
    const volumes = categories.map((category, categoryIndex) => {
      const entries = notes.filter(note => note.category === category);
      const unlockedInCategory = entries.filter(observationUnlocked).length;
      const pages = entries.map((note, noteIndex) => {
        if (!observationUnlocked(note)) {
          const routeRecord = note.unlock?.type === "routeEventMastered" ? window.Story.ensure().facts.routeEvents?.[note.unlock.routeEventId] : null;
          const treasureRecord = note.unlock?.type === "treasureTierMastered" ? window.Story.ensure().facts.treasureTiers?.[note.unlock.treasureTierId] : null;
          const sharedSorties = note.unlock?.type === "sharedSorties" ? Math.max(0, ...Object.values(window.GameState.data.adventurerBonds?.pairs || {}).map(count => Number(count) || 0)) : null;
          const masteryRank = note.unlock?.type === "skillMastery" ? (window.GameData.config.characterGrowth?.skillMasteryRanks || []).find(rank => rank.id === note.unlock.rankId) : null;
          const skillUses = masteryRank ? Math.max(0, ...window.GameState.data.characters.flatMap(character => Object.values(character.expeditionRecord?.skillRecords || {}).map(record => Number(record.uses) || 0))) : null;
          const harvestTier = note.unlock?.type === "targetedHarvestPractice" ? (window.GameData.config.explorationEvents?.targetedHarvestPractice || []).find(tier => tier.id === note.unlock.tierId) : null;
          const harvestSuccesses = harvestTier ? Math.max(0, ...window.GameState.data.characters.flatMap(character => Object.values(character.expeditionRecord?.targetedHarvestRecords || {}).map(record => Number(record.successes) || 0))) : null;
          const persistenceTier = note.unlock?.type === "targetedHarvestPersistence" ? (window.GameData.config.explorationEvents?.targetedHarvestPersistence || []).find(tier => tier.id === note.unlock.tierId) : null;
          const harvestMisses = persistenceTier ? Math.max(0, ...window.GameState.data.characters.flatMap(character => Object.values(character.expeditionRecord?.targetedHarvestRecords || {}).map(record => Math.max(0, Number(record.attempts || 0) - Number(record.successes || 0))))) : null;
          const chapterAtlas = note.unlock?.type === "difficultyChapterCompleted" ? window.Achievements.difficultyChapterAtlas(note.unlock.difficultyId) : [];
          const chapterMap = chapterAtlas.filter(chapter => chapter.opened && !chapter.complete)
            .sort((left, right) => left.remaining - right.remaining || right.cleared - left.cleared || left.order - right.order)[0] || null;
          const chapterRoute = chapterMap?.nextDungeonId ? window.DungeonDifficulty.variant(chapterMap.nextDungeonId, note.unlock.difficultyId) : null;
          const practice = routeRecord ? { value: routeRecord.successes || 0, target: note.unlock.successes, label: "書き留めた成功" }
            : treasureRecord ? { value: treasureRecord.openings || 0, target: note.unlock.openings, label: "開封の記録" }
              : sharedSorties != null ? { value: sharedSorties, target: note.unlock.minimum, label: "最も長い同行" }
                : skillUses != null ? { value: skillUses, target: masteryRank.minimumUses, label: "最も多い技能発動" }
                  : harvestSuccesses != null ? { value: harvestSuccesses, target: harvestTier.minimumSuccesses, label: "最も深い狙い採り" }
                    : harvestMisses != null ? { value: harvestMisses, target: persistenceTier.minimumMisses, label: "書き留めた空振り" }
                      : chapterMap ? { value: chapterMap.cleared, target: chapterMap.total, label: `最も近い踏破図・${chapterMap.chapterTitle}` } : null;
          const practiceProgress = practice
            ? `<div class="field-practice-progress"><span>${practice.label}</span><strong>${Math.min(practice.value, practice.target)} / ${practice.target}</strong><i><b style="width:${Math.min(100, practice.value / practice.target * 100)}%"></b></i></div>`
            : "";
          const chapterLead = chapterRoute
            ? `<button type="button" class="field-practice-route" data-action="open-target-destination" data-dungeon="${context.escape(chapterRoute.baseDungeonId)}" data-difficulty="${context.escape(note.unlock.difficultyId)}">${context.escape(chapterRoute.name)}の記録を取りに行く ›</button>` : "";
          return `<article class="observation-note is-locked"><div class="observation-note-summary"><span class="observation-note-mark">？</span><span><small>まだ白い頁</small><strong>未整理の観察記録</strong><em>${context.escape(note.unlockHint)}</em>${practiceProgress}${chapterLead}</span><span class="badge">未記入</span></div></article>`;
        }
        const isNew = !window.ObservationJournal.isRead(note.id);
        const paragraphs = note.paragraphs.map(paragraph => `<p>${context.escape(paragraph)}</p>`).join("");
        const findings = note.findings.map(finding => `<li>${context.escape(finding)}</li>`).join("");
        const focused = focusedNote?.id === note.id;
        const livingAtlas = (() => {
          if (note.unlock?.type !== "difficultyChapterCompleted") return "";
          const atlas = window.Achievements.difficultyChapterAtlas(note.unlock.difficultyId);
          const completed = atlas.filter(chapter => chapter.complete);
          const next = atlas.filter(chapter => chapter.opened && !chapter.complete)
            .sort((left, right) => left.remaining - right.remaining || right.cleared - left.cleared || left.order - right.order)[0] || null;
          const maps = [...completed, ...(next ? [next] : [])];
          if (!maps.length) return "";
          const rows = maps.map(chapter => {
            const route = chapter.nextDungeonId ? window.DungeonDifficulty.variant(chapter.nextDungeonId, note.unlock.difficultyId) : null;
            const usage = chapter.complete ? chapterMapUsage(chapter.chapterId, note.unlock.difficultyId) : null;
            const target = chapter.complete ? chapterMapTarget(chapter.chapterId, note.unlock.difficultyId) : null;
            const replayDungeonId = target?.dungeonId || usage?.latestDungeonId || (chapter.complete ? Object.values(window.GameData.dungeons)
              .filter(dungeon => dungeon.chapterId === chapter.chapterId && dungeon.requiredForStory)
              .sort((left, right) => (left.orderInChapter || 0) - (right.orderInChapter || 0) || left.id.localeCompare(right.id, "en"))[0]?.id : null);
            const replayRoute = replayDungeonId ? window.DungeonDifficulty.variant(replayDungeonId, note.unlock.difficultyId) : null;
            const stitches = Array.from({ length: chapter.total }, (_, index) => `<i class="${index < chapter.cleared ? "is-filled" : ""}"></i>`).join("");
            const usageRecord = chapter.complete
              ? `<span class="observation-map-use"><small>最近の帰還簿</small><strong>${usage.count ? `${usage.count}回の道案内 · 計${usage.secondsSaved}秒短縮` : "まだ使われていない地図"}</strong>${usage.count && usage.latestDungeonId ? `<em>最後に${context.escape(window.Party.name(usage.latestPartyIndex))}が${context.escape(window.DungeonDifficulty.variant(usage.latestDungeonId, note.unlock.difficultyId).name)}で使用</em>` : ""}${target && replayRoute ? `<em class="is-target">現在の目標「${context.escape(target.label)}」の手掛かりは${context.escape(replayRoute.name)}にあります</em>` : ""}</span>`
              : "";
            const action = chapter.complete && replayRoute
              ? `<button type="button" data-action="open-target-destination" data-dungeon="${context.escape(replayRoute.baseDungeonId)}" data-difficulty="${context.escape(note.unlock.difficultyId)}">${target ? "目標の道をたどる" : usage.count ? "最後の道をたどる" : "地図を使いに行く"} ›</button>`
              : route ? `<button type="button" data-action="open-target-destination" data-dungeon="${context.escape(route.baseDungeonId)}" data-difficulty="${context.escape(note.unlock.difficultyId)}">${context.escape(route.name)}へ ›</button>` : "";
            return `<li class="${chapter.complete ? "is-complete" : "is-next"}"><span><small>${chapter.complete ? "綴じ込み済み" : "次に綴じる地図"}</small><strong>${context.escape(chapter.chapterTitle)}</strong><em>${context.escape(chapter.difficultyName)} ${chapter.cleared} / ${chapter.total}</em></span><span class="observation-atlas-stitches" aria-label="${chapter.cleared} / ${chapter.total}">${stitches}</span>${chapter.complete ? '<b>完成</b>' : ""}${usageRecord}${action}</li>`;
          }).join("");
          return `<details class="observation-living-atlas" ${focused || completed.length <= 1 ? "open" : ""}><summary><span><small>LIVING CHAPTER MAPS</small><strong>綴じられた踏破図</strong></span><b>${completed.length}章</b><i aria-hidden="true">›</i></summary><p>新しい章を同じ難度で歩き切るたび、この頁にも一枚ずつ地図が増えていきます。</p><ol>${rows}</ol></details>`;
        })();
        return `<details class="observation-note ${isNew ? "is-new" : ""} ${focused ? "is-focused" : ""}" data-observation="${context.escape(note.id)}" ${focused || (!focusedNote && categoryIndex === 0 && noteIndex === 0) ? "open" : ""}><summary class="observation-note-summary" data-action="observation-read" data-note="${note.id}"><span class="observation-note-mark">${context.escape(note.icon)}</span><span><small>${context.escape(note.author)}</small><strong>${context.escape(note.title)}</strong><em>${context.escape(note.lead)}</em></span>${isNew ? '<span class="observation-new-badge">新着</span>' : ""}<i aria-hidden="true">›</i></summary><div class="observation-note-body">${paragraphs}${livingAtlas}<div class="observation-findings"><span>頁端の覚え書き</span><ul>${findings}</ul></div></div></details>`;
      }).join("");
      return `<section class="observation-volume"><div class="observation-volume-heading"><div><span>FIELD NOTES</span><h4>${context.escape(category)}</h4></div><b>${unlockedInCategory}/${entries.length}頁</b></div><div class="observation-note-list">${pages}</div></section>`;
    }).join("");
    return `<section class="panel archive-content observation-ledger"><div class="section-heading"><div><span class="label">KEEPER'S FIELD JOURNAL</span><h3>観察日記</h3></div><strong>${unlockedCount} / ${notes.length}頁</strong></div><p class="observation-intro">帰還した冒険者や書庫係が、実地で確かめたことを綴った日記です。物語を進め、新しい土地や戦いを経験すると、白かった頁に少しずつ記録が増えていきます。</p>${rumorLedger(context)}${volumes}</section>`;
  }

  function achievements(context) {
    const all = window.Achievements.entries(), summary = window.Achievements.summary();
    const focusedAchievement = all.find(entry => entry.id === context.achievementFocus) || null;
    const nextGoals = window.Achievements.nextGoals(3);
    const trackedGoal = window.Achievements.tracked();
    const readyRewards = window.Achievements.ready();
    const goalAction = entry => {
      const destination = window.Achievements.destination(entry);
      const attributes = {
        recruitment: 'data-nav="characters"',
        formation: 'data-action="party-view" data-view="formation"',
        adventure: 'data-action="party-view" data-view="adventure"',
        monsters: 'data-action="open-monster-codex"',
        items: 'data-action="open-item-codex"',
        companions: 'data-action="open-companion-ledger"',
        observations: 'data-action="open-observations"',
        records: 'data-action="archive-view" data-view="records"',
        guild: 'data-nav="guild"',
        achievements: 'data-action="open-achievements"'
      }[destination.id];
      return { label: destination.label, attributes };
    };
    const nextGoalCards = nextGoals.map(entry => {
      const action = goalAction(entry);
      const isTracked = trackedGoal?.id === entry.id;
      return `<article class="${isTracked ? "is-tracked" : ""}"><span aria-hidden="true">${context.escape(entry.icon)}</span><div><small>${context.escape(entry.category)}</small><strong>${context.escape(entry.name)}</strong><em>あと ${Math.max(0, entry.target - entry.current).toLocaleString("ja-JP")}</em><div aria-label="${Math.min(entry.current, entry.target)} / ${entry.target}"><i style="width:${entry.ratio * 100}%"></i></div><span class="achievement-goal-actions"><button type="button" ${action.attributes}>${action.label}<i aria-hidden="true">›</i></button><button type="button" class="track" data-action="track-achievement" data-achievement="${context.escape(entry.id)}">${isTracked ? "追跡を外す" : "目標にする"}<i aria-hidden="true">${isTracked ? "✓" : "＋"}</i></button></span></div></article>`;
    }).join("");
    const nextGoalPanel = nextGoals.length
      ? `<section class="achievement-next-goals"><header><span><small>NEXT MILESTONES</small><strong>あと少しの記録</strong></span><b>${nextGoals.length}件</b></header><div>${nextGoalCards}</div></section>`
      : `<section class="achievement-next-goals is-complete"><header><span><small>LEDGER COMPLETE</small><strong>すべての記録が刻まれました</strong></span><b>完了</b></header></section>`;
    const activeCategories = new Set([...nextGoals.map(entry => entry.category), focusedAchievement?.category].filter(Boolean));
    const categories = Array.from(new Set(all.map(entry => entry.category)));
    const groups = categories.map(category => {
      const entries = all.filter(entry => entry.category === category);
      const completed = entries.filter(entry => entry.complete).length;
      const cards = entries.map(entry => {
        const concealed = entry.secret && !entry.complete;
        const nextAchievement = entry.nextAchievementId ? window.GameData.achievements.find(candidate => candidate.id === entry.nextAchievementId) : null;
        const earnedOn = entry.complete ? window.Achievements.earnedOn(entry.id) : null;
        const earnedDungeon = earnedOn ? window.DungeonDifficulty.variant(earnedOn.dungeonId, earnedOn.difficultyId) : null;
        const provenance = earnedOn && earnedDungeon
          ? `<button type="button" class="achievement-provenance" data-action="open-achievement-history" data-party="${earnedOn.partyIndex}" data-history="${context.escape(earnedOn.historyId || "")}"><span><b>${context.escape(earnedDungeon.name)}への遠征で達成 · ${new Date(earnedOn.completedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}</b>${earnedOn.memberNames.length ? `<small>達成隊：${earnedOn.memberNames.map(context.escape).join("、")}</small>` : ""}</span><i aria-hidden="true">履歴へ ›</i></button>`
          : "";
        const rewardSeals = Number(entry.rewards?.materials?.guild_seal) || 0;
        const reward = entry.complete
          ? window.Achievements.isClaimed(entry.id)
            ? `<small class="achievement-reward-state is-claimed">記念のギルド印章${rewardSeals}個・受取済み</small>`
            : `<button type="button" class="achievement-claim-action" data-action="claim-achievement" data-achievement="${context.escape(entry.id)}">記念のギルド印章${rewardSeals}個を受け取る</button>`
          : "";
        const continuation = !concealed && nextAchievement ? `<small class="achievement-continuation">この先の記章　${context.escape(nextAchievement.icon)} ${context.escape(nextAchievement.name)}</small>` : "";
        const atlas = !concealed && !entry.complete && entry.condition.type === "difficultyChapters"
          ? window.Achievements.difficultyChapterAtlas(entry.condition.difficultyId) : [];
        const nextChapter = atlas.filter(chapter => chapter.opened && !chapter.complete)
          .sort((left, right) => left.remaining - right.remaining || right.cleared - left.cleared || left.order - right.order)[0] || null;
        const nextRoute = nextChapter?.nextDungeonId
          ? window.DungeonDifficulty.variant(nextChapter.nextDungeonId, entry.condition.difficultyId) : null;
        const chapterGuide = nextChapter
          ? `<aside class="achievement-chapter-guide"><span><small>NEXT CHAPTER MAP</small><b>${context.escape(nextChapter.chapterTitle)}</b><em>${context.escape(nextChapter.difficultyName)} ${nextChapter.cleared}/${nextChapter.total}・あと${nextChapter.remaining}か所</em></span><i aria-hidden="true"><b style="width:${nextChapter.ratio * 100}%"></b></i>${nextRoute ? `<button type="button" data-action="open-target-destination" data-dungeon="${context.escape(nextRoute.baseDungeonId)}" data-difficulty="${context.escape(entry.condition.difficultyId)}">${context.escape(nextRoute.name)}へ ›</button>` : ""}</aside>`
          : "";
        return `<article class="achievement-card ${entry.complete ? "is-complete" : ""} ${concealed ? "is-secret" : ""} ${focusedAchievement?.id === entry.id ? "is-focused" : ""}" data-achievement="${context.escape(entry.id)}"><span class="achievement-icon" aria-hidden="true">${concealed ? "？" : context.escape(entry.icon)}</span><div class="achievement-copy"><small>${entry.complete ? "達成" : concealed ? "未発見" : entry.category}</small><strong>${concealed ? "未記入の実績" : context.escape(entry.name)}</strong><p>${concealed ? "まだ書庫へ持ち帰られていない記録です。" : context.escape(entry.description)}</p>${continuation}${chapterGuide}${provenance}${concealed ? "" : `<div class="achievement-meter" aria-label="${Math.min(entry.current, entry.target)} / ${entry.target}"><i style="width:${entry.ratio * 100}%"></i></div><em>${Math.min(entry.current, entry.target)} / ${entry.target}</em>${reward}`}</div></article>`;
      }).join("");
      const remaining = entries.length - completed;
      return `<details class="achievement-group ${remaining ? "" : "is-complete"}" ${activeCategories.has(category) ? "open" : ""}><summary class="achievement-group-heading"><h4>${context.escape(category)}</h4><span><small>${remaining ? `残り${remaining}` : "完了"}</small><strong>${completed}/${entries.length}</strong><i aria-hidden="true">⌄</i></span></summary><div class="achievement-grid">${cards}</div></details>`;
    }).join("");
    const rewardPanel = readyRewards.length ? `<section class="achievement-ready-rewards"><span><small>ACHIEVEMENT REWARDS</small><strong>達成を記念する印章があります</strong><em>${readyRewards.length}件・ギルド印章 ${readyRewards.reduce((sum, entry) => sum + (Number(entry.rewards?.materials?.guild_seal) || 0), 0)}個</em></span><button type="button" class="button primary" data-action="claim-all-achievements">まとめて受け取る</button></section>` : "";
    return `<section class="panel archive-content achievement-ledger"><div class="section-heading"><div><span class="label">GUILD MILESTONES</span><h3>実績の記録</h3></div><strong>${summary.completed} / ${summary.total}</strong></div><p>仲間との出会い、踏破した土地、持ち帰った発見を一冊にまとめています。記録は現在のギルドの歩みから自動で刻まれます。</p>${rewardPanel}<div class="achievement-total"><span>全体の達成度</span><div><i style="width:${summary.ratio * 100}%"></i></div><strong>${Math.round(summary.ratio * 100)}%</strong></div>${nextGoalPanel}${groups}</section>`;
  }

  function adventurerRecords(context) {
    const characters = window.GameState.data.characters;
    const number = value => Number(value || 0).toLocaleString("ja-JP");
    const characterMap = new Map(characters.map(character => [character.id, character]));
    const bondDefinitions = new Map((window.GameData.config.explorationEvents?.adventurerBondMoments || []).map(moment => [moment.id, moment]));
    const relationshipRecords = Object.entries(window.GameState.data.adventurerBonds?.memories || {}).map(([key, memoryIds]) => {
      const ids = key.split("::"), people = ids.map(id => characterMap.get(id));
      if (people.some(person => !person) || !memoryIds.length) return null;
      const sharedSorties = Number(window.GameState.data.adventurerBonds?.pairs?.[key]) || 0;
      const memories = memoryIds.map(id => bondDefinitions.get(id)).filter(Boolean);
      const huntLedgers = window.Characters.sharedHuntLedgers(...ids);
      const available = [...bondDefinitions.values()].filter(moment => memoryIds.includes(moment.id) || !moment.trigger && sharedSorties >= moment.minimumSharedSorties).length;
      return { key, ids, people, sharedSorties, memories, huntLedgers: huntLedgers.map(ledger => ({ ...ledger, tier: [...(window.GameData.config.explorationEvents?.targetedHarvestConsultation?.rememberedTiers || [])].reverse().find(tier => ledger.successes >= tier.minimumSuccesses), progress: window.Characters.sharedHuntLedgerProgress(ledger.successes) })), available };
    }).filter(Boolean).sort((left, right) => {
      const leftFocused = left.key === context.bondFocus?.key, rightFocused = right.key === context.bondFocus?.key;
      return Number(rightFocused) - Number(leftFocused) || right.memories.length - left.memories.length || right.sharedSorties - left.sharedSorties || left.key.localeCompare(right.key, "ja");
    });
    const namedHunts = window.Characters.namedHuntEpithets();
    const developingHunts = window.Characters.developingHuntLedgers();
    const routeLineages = window.Characters.routeMentorshipLineages();
    const routeTraditionKeys = window.GameState.data.story.facts.routeTraditions || [];
    const routeTraditionSet = new Set(routeTraditionKeys);
    const routeTraditionRecords = window.GameState.data.story.facts.routeTraditionRecords || {};
    const routeAtlasChapters = [...window.GameData.storyChapters].sort((left, right) => left.order - right.order).map(chapter => {
      const routes = Object.values(window.GameData.dungeons)
        .filter(dungeon => dungeon.chapterId === chapter.id && window.Story.canEnter(dungeon.id))
        .sort((left, right) => (left.orderInChapter || 0) - (right.orderInChapter || 0))
        .flatMap(dungeon => window.DungeonDifficulty.available(dungeon.id).map(difficultyId => {
          const key = `${dungeon.id}:${difficultyId}`;
          return { key, dungeon, difficultyId, destination: window.DungeonDifficulty.variant(dungeon.id, difficultyId), established: routeTraditionSet.has(key), record: routeTraditionRecords[key] };
        }));
      return { chapter, routes, established: routes.filter(route => route.established).length };
    }).filter(entry => entry.routes.length);
    const availableRouteCount = routeAtlasChapters.reduce((total, entry) => total + entry.routes.length, 0);
    const routeTraditionGoals = window.Achievements.entries().filter(entry => entry.condition.type === "routeTraditions");
    const routeTraditionGoal = routeTraditionGoals.find(entry => !entry.complete) || routeTraditionGoals.at(-1) || null;
    const routeTraditionProgress = routeTraditionGoal ? `<footer><span><small>NEXT ATLAS MILESTONE</small><strong>${context.escape(routeTraditionGoal.complete ? "すべての節目を達成" : routeTraditionGoal.name)}</strong></span><div><i style="width:${routeTraditionGoal.ratio * 100}%"></i></div><b>${Math.min(routeTraditionGoal.current, routeTraditionGoal.target)} / ${routeTraditionGoal.target}</b></footer>` : "";
    const routeAtlas = routeAtlasChapters.map(({ chapter, routes, established }) => `<section class="route-atlas-chapter ${established === routes.length ? "is-complete" : ""} ${routes.some(route => route.key === context.routeAtlasFocus) ? "is-focused-chapter" : ""}"><header><span><small>CHAPTER ${chapter.number || "序"}</small><strong>${context.escape(chapter.title)}</strong></span><b>${established} / ${routes.length}</b></header><div>${routes.map(route => {
      if (!route.established) return `<button type="button" class="route-atlas-empty" data-action="open-target-destination" data-dungeon="${context.escape(route.dungeon.id)}" data-difficulty="${context.escape(route.difficultyId)}" data-route-tradition="true"><i aria-hidden="true">空</i><span><strong>${context.escape(route.destination.name)}</strong><small>まだ道標なし · 三代を編成して向かう</small></span><b>選ぶ</b><i aria-hidden="true">›</i></button>`;
      const founders = route.record?.memberNames?.length === 3 ? route.record.memberNames.map(context.escape).join(" → ") : "最初の三人の名は古い帰還簿にのみ残る";
      const date = route.record?.establishedAt ? new Date(route.record.establishedAt).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" }) : "成立日不詳";
      const assistedSorties = Math.max(0, Number(route.record?.assistedSorties) || 0);
      const traditionTier = window.Exploration.routeTraditionTier(assistedSorties);
      const traditionTiers = window.GameData.config.explorationEvents?.routeTradition?.tiers || [];
      const traditionTierIndex = traditionTiers.findIndex(tier => tier.id === traditionTier?.id);
      const nextTraditionTier = traditionTiers[traditionTierIndex + 1] || null;
      const traditionProgress = nextTraditionTier ? `次の「${context.escape(nextTraditionTier.label)}」まであと${nextTraditionTier.minimumAssists - assistedSorties}遠征` : "町に定着した最終段階";
      const focused = route.key === context.routeAtlasFocus;
      return `<article class="route-atlas-established ${focused ? "is-focused" : ""}"><i aria-hidden="true">標</i><span><strong>${context.escape(route.destination.name)}</strong><small>${founders}</small><em>${focused ? "いま開いた道標 · " : ""}${context.escape(date)} · ${context.escape(traditionTier?.label || "帰還簿の道標")} · 道中判定 +${Math.round((traditionTier?.successChanceBonus || .01) * 100)}%</em><small>${assistedSorties ? `その後${assistedSorties}遠征を案内` : "次の遠征を待つ"} · ${traditionProgress}</small></span></article>`;
    }).join("")}</div></section>`).join("");
    const routeTraditionLedger = `<details class="adventurer-signature-ledger route-tradition-ledger" ${!routeTraditionKeys.length || context.routeAtlasFocus ? "open" : ""}><summary><span><small>GUILD ROUTE ATLAS</small><strong>ギルドの道標帳</strong></span><b>${routeTraditionKeys.length} / ${availableRouteCount}路</b><i aria-hidden="true">›</i></summary><div>${routeTraditionKeys.length ? "" : '<section class="route-atlas-intro"><strong>最初の道標はまだありません</strong><p>案内役から道を継いだ者と、その地を初めて歩く仲間を同じ遠征へ。三代が無事に帰れば、以後の全パーティを助ける目印が残ります。</p></section>'}${routeAtlas}${routeTraditionProgress}</div></details>`;
    const routeLineageLedger = routeLineages.length ? `<details class="adventurer-signature-ledger route-lineage-ledger"><summary><span><small>ROUTE LINEAGE</small><strong>帰り道の系譜</strong></span><b>${routeLineages.length}件</b><i aria-hidden="true">›</i></summary><div>${routeLineages.slice(0, 12).map(entry => { const destination = window.DungeonDifficulty.variant(entry.dungeonId, entry.difficultyId); const inherited = entry.inheritedFromId ? "受け継いだ道" : "最初の伝授"; return `<button type="button" data-action="open-adventurer-record" data-character="${context.escape(entry.apprenticeId)}"><i aria-hidden="true">路</i><span><strong>${entry.characterNames.map(context.escape).join(" → ")}</strong><small>${context.escape(destination.name)} · ${inherited} · ${new Date(entry.completedAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}</small></span><b>${entry.characterNames.length}人</b><i aria-hidden="true">›</i></button>`; }).join("")}${routeLineages.length > 12 ? `<small>ほか${routeLineages.length - 12}件は、それぞれの冒険者の足跡に残っています。</small>` : ""}</div></details>` : "";
    const developingHuntPages = developingHunts.length ? `<section class="named-hunt-next-ledgers"><header><span><small>NEXT HUNTING NAMES</small><strong>狩り名へ近い頁</strong></span><b>${developingHunts.length}頁</b></header><div>${developingHunts.slice(0, 6).map(entry => `<button type="button" data-action="resume-ledger-hunt" data-monster="${context.escape(entry.monsterId)}" data-item="${context.escape(entry.itemId)}"><i aria-hidden="true">続</i><span><strong>${entry.members.map(person => context.escape(person.name)).join("と")} · ${context.escape(entry.monster.name)}</strong><small>${context.escape(entry.tier?.label || "書き始めの頁")} → ${context.escape(entry.progress.nextTier.label)} · あと${number(entry.progress.remaining)}回</small></span><b>追う</b><i aria-hidden="true">›</i></button>`).join("")}</div>${developingHunts.length > 6 ? `<small>ほか${developingHunts.length - 6}頁は、それぞれの旅仲間の記憶に残っています。</small>` : ""}</section>` : "";
    const namedHuntLedger = namedHunts.length || developingHunts.length ? `<details class="adventurer-signature-ledger named-hunt-ledger"><summary><span><small>HUNTING EPITHETS</small><strong>狩り名の帳</strong></span><b>${namedHunts.length}名・育成中${developingHunts.length}頁</b><i aria-hidden="true">›</i></summary><div>${namedHunts.slice(0, 10).map(entry => `<button type="button" data-action="open-adventurer-bonds" data-bond="${context.escape(entry.bondKey)}" data-monster="${context.escape(entry.monsterId)}" data-item="${context.escape(entry.itemId)}"><i aria-hidden="true">狩</i><span><strong>${context.escape(entry.epithet)}</strong><small>${entry.members.map(person => context.escape(person.name)).join("と")} · ${context.escape(entry.item.name)}</small></span><b>${number(entry.successes)}猟</b><i aria-hidden="true">›</i></button>`).join("")}${namedHunts.length > 10 ? `<small>ほか${namedHunts.length - 10}組は、それぞれの旅仲間の記憶に残っています。</small>` : ""}${developingHuntPages}</div></details>` : "";
    const relationshipLedger = relationshipRecords.length ? `<section class="adventurer-bond-ledger"><div class="section-heading compact"><div><span class="label">TRAVEL MEMORIES</span><h4>旅仲間の記憶</h4></div><strong>${relationshipRecords.length}組</strong></div><p>募集で加わった冒険者たちが、共に歩いた遠征で見せたひと幕です。記憶は二人の間に一つだけ残ります。</p><div class="adventurer-bond-list">${relationshipRecords.map(record => {
      const focused = record.key === context.bondFocus?.key;
      return `<details class="${focused ? "is-focused" : ""}" data-bond="${context.escape(record.key)}" ${focused ? "open" : ""}><summary><span aria-hidden="true">結</span><span><strong>${record.people.map(person => context.escape(person.name)).join("と")}</strong><small>${focused ? "帰還記録から開きました · " : ""}同行 ${number(record.sharedSorties)}回</small></span><b>${record.memories.length}/${record.available}篇</b><i aria-hidden="true">›</i></summary><ol>${record.memories.map(memory => `<li><strong>${context.escape(memory.title)}</strong><p>${context.escape(String(memory.text).replace(/\{(\w+)\}/g, (match, name) => ({ left: record.people[0].name, right: record.people[1].name })[name] ?? match))}</p></li>`).join("")}${record.huntLedgers.map(ledger => {
        const focusedPage = focused && ledger.monsterId === context.bondFocus?.monsterId && ledger.itemId === context.bondFocus?.itemId;
        const epithet = ledger.tier?.epithet?.replace("{monster}", window.GameData.monsters[ledger.monsterId].name);
        const progressText = ledger.progress.nextTier ? `次の頁「${ledger.progress.nextTier.label}」まであと${ledger.progress.remaining}回` : "狩り名が定着した最終頁";
        return `<li class="shared-hunt-ledger-page ${focusedPage ? "is-focused" : ""}"><strong>${focusedPage ? "この帰還で育った頁 · " : "狩り帳の頁 · "}${context.escape(window.GameData.monsters[ledger.monsterId].name)}</strong><small>${context.escape(ledger.tier?.label || "書き始めの頁")}</small>${epithet ? `<em class="shared-hunt-ledger-epithet">二人の呼び名 · ${context.escape(epithet)}</em>` : ""}<p>${context.escape(window.GameData.items[ledger.itemId].name)}を二人で持ち帰った記録。収穫 ${number(ledger.successes)}回・${number(ledger.items)}点。</p><div class="shared-hunt-ledger-progress"><span>${context.escape(progressText)}</span><i><b style="width:${Math.round(ledger.progress.ratio * 100)}%"></b></i></div>${ledger.tier?.description ? `<p class="shared-hunt-ledger-story">${context.escape(ledger.tier.description)}</p>` : ""}${ledger.tier?.combatSupport ? `<p class="shared-hunt-ledger-support"><b>${context.escape(ledger.tier.combatSupport.label)}</b>${context.escape(ledger.tier.combatSupport.description)}</p>` : ""}<button type="button" class="text-button" data-action="resume-ledger-hunt" data-monster="${context.escape(ledger.monsterId)}" data-item="${context.escape(ledger.itemId)}">この狩りをもう一度追う</button></li>`;
      }).join("")}</ol></details>`;
    }).join("")}</div></section>` : "";
    const signatureEntries = characters.flatMap(character => window.Characters.signatureSkills(character)
      .filter(entry => entry.mastery.current)
      .map(entry => ({ character, ...entry })))
      .sort((left, right) => right.mastery.current.minimumUses - left.mastery.current.minimumUses || right.uses - left.uses || left.character.name.localeCompare(right.character.name, "ja"));
    const signatureCharacters = new Set(signatureEntries.map(entry => entry.character.id)).size;
    const signatureLedger = signatureEntries.length ? `<details class="adventurer-signature-ledger"><summary><span><small>SIGNATURE SKILLS</small><strong>技能の使い手</strong></span><b>${signatureCharacters}人・${signatureEntries.length}技</b><i aria-hidden="true">›</i></summary><div>${signatureEntries.slice(0, 12).map(entry => `<button type="button" data-action="open-adventurer-record" data-character="${entry.character.id}">${context.portraitImage(entry.character, true)}<span><strong>${context.escape(entry.character.name)}</strong><small>${context.escape(entry.skill.name)} · ${context.escape(entry.mastery.current.name)}</small></span><b>${number(entry.uses)}回</b><i aria-hidden="true">›</i></button>`).join("")}${signatureEntries.length > 12 ? `<small>ほか${signatureEntries.length - 12}件は各冒険者の足跡に記録されています。</small>` : ""}</div></details>` : "";
    const boards = [
      { field: "sorties", label: "遠征回数", unit: "回", icon: "⌁" },
      { field: "victories", label: "攻略回数", unit: "回", icon: "⚑" },
      { field: "encounterClears", label: "突破した戦闘", unit: "戦", icon: "⚔" },
      { field: "bestDamage", label: "一遠征の与ダメージ", unit: "", icon: "✦" },
      { field: "bestHealing", label: "一遠征の回復", unit: "", icon: "✚" },
      { field: "bestEndurance", label: "生還した被ダメージ", unit: "", icon: "♜" }
    ];
    const earned = characters.reduce((total, character) => total + window.Characters.expeditionMilestones(character).filter(entry => entry.complete).length, 0);
    const ranking = board => characters.map(character => ({ character, value: window.Characters.expeditionRecord(character)[board.field] || 0 }))
      .filter(entry => entry.value > 0)
      .sort((a, b) => b.value - a.value || b.character.level - a.character.level || a.character.name.localeCompare(b.character.name, "ja"))
      .slice(0, 5);
    const contents = boards.map(board => {
      const entries = ranking(board);
      return `<section class="adventurer-record-board"><header><span aria-hidden="true">${board.icon}</span><div><small>EXPEDITION RECORD</small><h4>${context.escape(board.label)}</h4></div></header>${entries.length ? `<ol>${entries.map((entry, index) => {
        const title = window.Characters.recordTitle(entry.character);
        return `<li><button type="button" data-action="open-adventurer-record" data-character="${entry.character.id}"><b>${index + 1}</b>${context.portraitImage(entry.character, true)}<span><strong>${context.escape(entry.character.name)}</strong><small>${context.escape(window.Characters.jobName(entry.character))} · Lv.${entry.character.level}${title ? ` · ${context.escape(title.icon)} ${context.escape(title.name)}` : ""}</small></span><em>${number(entry.value)}${board.unit}</em><i aria-hidden="true">›</i></button></li>`;
      }).join("")}</ol>` : '<p>まだ記録はありません。</p>'}</section>`;
    }).join("");
    return `<section class="panel archive-content adventurer-record-ledger"><div class="section-heading"><div><span class="label">ADVENTURER RECORDS</span><h3>遠征者の記録</h3></div><strong>個人記章 ${earned}</strong></div><p>帰還した冒険者たちの足跡を、六つの記録に分けて綴っています。順位は能力の優劣ではなく、実際に歩いた遠征の記録です。</p>${routeTraditionLedger}${signatureLedger}${namedHuntLedger}${routeLineageLedger}${relationshipLedger}${characters.length ? `<div class="adventurer-record-boards">${contents}</div>` : '<div class="notice muted"><span class="notice-icon">◇</span><div><strong>まだ記録はありません</strong><p>最初の冒険者を雇用すると、この頁に名前が刻まれます。</p></div></div>'}</section>`;
  }

  function page(context) {
    const unread = window.ObservationJournal.unread().length;
    const storyState = window.Story.ensure(), currentStoryChapter = window.Story.current();
    const storyChapterOrder = Object.fromEntries(window.GameData.storyChapters.map(chapter => [chapter.id, chapter.order]));
    const currentStoryOrder = currentStoryChapter ? currentStoryChapter.order : Number.MAX_SAFE_INTEGER;
    const storyJoinedOrReached = arc => storyState.joinedCompanionIds.includes(arc.companionId) || currentStoryOrder >= storyChapterOrder[arc.joinChapterId];
    const readyRewards = window.Commissions.readyCount() + window.RecurringMissions.readyCount();
    const unreadItems = window.Encyclopedia.unreadItems().length + window.Encyclopedia.unreadUltraRareTitles().length, unreadMonsters = window.Encyclopedia.unreadMonsters().length;
    const itemDefinitions = Object.values(window.GameData.items), monsterDefinitions = Object.values(window.GameData.monsters), notes = window.GameData.observationNotes || [];
    const itemFound = itemDefinitions.filter(item => window.Encyclopedia.item(item.id)).length;
    const ultraRareFound = Object.keys(window.GameData.ultraRareTitles || {}).filter(id => window.Encyclopedia.ultraRareTitle(id)).length;
    const monsterFound = monsterDefinitions.filter(monster => window.Encyclopedia.monster(monster.id)).length;
    const monsterDefeated = monsterDefinitions.filter(monster => window.Encyclopedia.monster(monster.id)?.defeated).length;
    const noteFound = notes.filter(note => window.ObservationJournal.unlocked(note)).length;
    const originDefinitions = [...Object.values(window.GameData.jobs), ...Object.values(window.GameData.races), ...Object.values(window.GameData.births)];
    const originFound = originDefinitions.filter(window.Recruitment.entryUnlocked).length;
    const achievementSummary = window.Achievements.summary();
    const achievementRewards = window.Achievements.ready().length;
    const earnedAdventurerMilestones = window.GameState.data.characters.reduce((total, character) => total + window.Characters.expeditionMilestones(character).filter(entry => entry.complete).length, 0);
    const possibleAdventurerMilestones = window.GameState.data.characters.length * (window.GameData.adventurerMilestones || []).length;
    const progress = [
      ["items", "発見した品", itemFound, itemDefinitions.length, "◇"],
      ["items", "超レア称号", ultraRareFound, Object.keys(window.GameData.ultraRareTitles || {}).length, "✧"],
      ["monsters", "遭遇した魔物", monsterFound, monsterDefinitions.length, "◆"],
      ["monsters", "討伐記録", monsterDefeated, monsterDefinitions.length, "⚔"],
      ["observations", "観察日記", noteFound, notes.length, "▤"],
      ["companions", "出会った人物", Object.values(window.GameData.relations.companionStoryArcs).filter(arc => storyJoinedOrReached(arc)).length, window.GameData.config.companions.rosterLimit, "♟"],
      ["records", "個人記章", earnedAdventurerMilestones, possibleAdventurerMilestones, "✦"],
      ["origins", "解放した素質", originFound, originDefinitions.length, "♙"],
      ["achievements", "達成した実績", achievementSummary.completed, achievementSummary.total, "★"]
    ];
    const dashboard = `<section class="archive-progress" aria-label="収集記録">${progress.map(([view, label, found, total, icon]) => `<button type="button" data-action="archive-view" data-view="${view}"><span aria-hidden="true">${icon}</span><small>${label}</small><strong>${found}<i>/</i>${total}</strong><em><i style="width:${total ? found / total * 100 : 0}%"></i></em></button>`).join("")}</section>`;
    const tabs = [["commissions", `依頼掲示板${readyRewards ? `<span class="archive-tab-notice request">${readyRewards}</span>` : ""}`], ["observations", `観察日記${unread ? `<span class="archive-tab-notice observation">${unread}</span>` : ""}`], ["companions", "人物録"], ["records", "遠征者記録"], ["achievements", `実績${achievementRewards ? `<span class="archive-tab-notice achievement">${achievementRewards}</span>` : ""}`], ["origins", "冒険者体系"], ["items", `アイテム図鑑${unreadItems ? `<span class="archive-tab-notice discovery">${unreadItems}</span>` : ""}`], ["monsters", `モンスター図鑑${unreadMonsters ? `<span class="archive-tab-notice discovery">${unreadMonsters}</span>` : ""}`]];
    const body = context.archiveView === "items" ? items(context) : context.archiveView === "monsters" ? monsters(context) : context.archiveView === "origins" ? origins(context) : context.archiveView === "companions" ? companions(context) : context.archiveView === "records" ? adventurerRecords(context) : context.archiveView === "observations" ? observations(context) : context.archiveView === "achievements" ? achievements(context) : commissions(context);
    return `<section class="panel archive-header"><div class="section-heading"><div><span class="label">ADVENTURER ARCHIVES</span><h3>冒険者資料室</h3></div></div><p>ギルドの依頼と、これまでの冒険で集めた知識を確認できます。未確認の情報は伏せたまま、持ち帰った記録だけが増えていきます。</p>${dashboard}<div class="archive-tabs" role="tablist" aria-label="資料の種類">${tabs.map(([id, label]) => `<button type="button" role="tab" class="button ${context.archiveView === id ? "secondary" : "ghost"}" aria-selected="${context.archiveView === id}" data-action="archive-view" data-view="${id}">${label}</button>`).join("")}</div></section>${body}`;
  }

  window.GameUIViews.archives = { commissions, items, monsters, origins, companions, adventurerRecords, observations, achievements, page };
})();
