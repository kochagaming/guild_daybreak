(function () {
  "use strict";

  window.GameUIViews = window.GameUIViews || {};

  function commissions(context, dungeonId) {
    const current = window.Commissions.state();
    const recurringState = window.RecurringMissions.state();
    const recurringBoards = window.RecurringMissions.definitions().map(group => {
      const cycle = recurringState.groups[group.id], entries = window.RecurringMissions.active(group.id);
      const readyEntries = entries.filter(entry => window.RecurringMissions.ready(group.id, entry));
      const cards = entries.map(entry => {
        const progress = cycle.progress[entry.id] || 0, claimed = cycle.claimed.includes(entry.id), ready = progress >= entry.target;
        const rewards = [entry.rewards.gold ? context.formatGold(entry.rewards.gold) : "", ...Object.entries(entry.rewards.materials || {}).map(([id, quantity]) => `${context.itemName(id)}×${quantity}`)].filter(Boolean).join("・");
        return `<article class="recurring-mission-card ${claimed ? "is-claimed" : ready ? "is-ready" : ""}"><div class="recurring-mission-copy"><div class="card-heading"><h4>${context.escape(entry.title)}</h4><span class="badge ${claimed || ready ? "good" : ""}">${claimed ? "受取済み" : ready ? "達成" : `${progress}/${entry.target}`}</span></div><p>${context.escape(entry.description)}</p><small>報酬　${context.escape(rewards)}</small></div><button class="button ${ready && !claimed ? "primary" : "secondary"}" data-action="claim-recurring-mission" data-group="${group.id}" data-mission="${entry.id}" ${claimed || !ready ? "disabled" : ""}>${claimed ? "受取済" : "受取"}</button></article>`;
      }).join("");
      const period = group.schedule.type === "weekly" ? `${cycle.periodKey.replaceAll("-", "/")}開始の週` : `本日 ${cycle.periodKey.replaceAll("-", "/")}`;
      return `<details class="panel wide recurring-mission-board" ${group.schedule.type === "daily" ? "open" : ""}><summary class="recurring-board-summary"><span><small>${context.escape(group.eyebrow)}</small><strong>${context.escape(group.name)}</strong></span><span class="badge">${cycle.claimed.length}/${entries.length} 受取</span><i aria-hidden="true">›</i></summary><div class="recurring-board-body"><div class="recurring-mission-toolbar"><p class="small-note">${context.escape(period)}　端末時刻を基準に更新</p><button class="button secondary" data-action="claim-all-recurring-missions" data-group="${group.id}" ${readyEntries.length ? "" : "disabled"}>まとめて受け取る</button></div><div class="recurring-mission-list">${cards}</div></div></details>`;
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
    function card(item) {
      const count = window.Encyclopedia.item(item.id);
      const equipmentType = window.GameData.equipmentTypes[item.weaponType || item.armorType];
      const type = item.type === "material" ? "素材" : `${item.type === "weapon" ? "武器" : "防具"}・${equipmentType?.name || "その他"}`;
      const effect = item.type === "material" ? null : window.Items.standardEffects(item.id);
      const bestQualityId = item.type === "material" ? null : window.Encyclopedia.bestQuality(item.id);
      const bestQuality = bestQualityId ? window.GameData.qualities[bestQualityId] : null;
      const stats = item.type === "material" ? "製作や強化に使用する素材" : [effect.attack ? `攻撃 ${effect.attack}` : "", effect.magicAttack ? `魔法攻撃 ${effect.magicAttack}` : "", effect.defense ? `防御 ${effect.defense}` : "", effect.magicDefense ? `魔法防御 ${effect.magicDefense}` : "", effect.magicHealing ? `魔法回復 ${effect.magicHealing}` : "", effect.hp ? `HP ${effect.hp}` : "", `重量 ${effect.weight || 0}`, item.type === "weapon" ? (item.range === "ranged" ? "遠距離" : "近接") : ""].filter(Boolean).join(" ／ ");
      const sources = window.Encyclopedia.itemAcquisitionSources(item.id);
      const monsterGroups = new Map();
      sources.monsters.forEach(source => {
        const key = `${source.dungeonId}:${source.monsterId}:${source.kind}`;
        if (!monsterGroups.has(key)) monsterGroups.set(key, { dungeonId: source.dungeonId, monsterId: source.monsterId, kind: source.kind, difficulties: [] });
        monsterGroups.get(key).difficulties.push(source.difficultyId);
      });
      const sourceRows = [];
      if (sources.shop) sourceRows.push('<li><strong>商店</strong><span>購入</span></li>');
      sources.recipes.forEach(recipe => sourceRows.push(`<li><strong>鍛冶屋</strong><span>${context.escape(recipe.name || item.name)}を製作</span></li>`));
      sources.treasures.forEach(source => sourceRows.push(`<li><strong>${context.escape(source.dungeonName)}</strong><span>宝箱</span></li>`));
      monsterGroups.forEach(source => {
        const dungeon = window.GameData.dungeons[source.dungeonId], monster = window.GameData.monsters[source.monsterId];
        const difficulties = window.DungeonDifficulty.ids().filter(id => source.difficulties.includes(id)).map(id => window.DungeonDifficulty.tier(id).name).join("・");
        sourceRows.push(`<li><strong>${context.escape(dungeon.name)}</strong><span>${context.escape(monster.name)}を討伐 <b>${context.escape(difficulties)}</b>${source.kind === "fixed" ? "・固有" : "・通常装備"}</span></li>`);
      });
      const acquisition = `<details class="item-acquisition"><summary>入手元を確認 <span>${sourceRows.length}件</span></summary><ul>${sourceRows.join("") || '<li><span>装備の分解・章報酬など</span></li>'}</ul></details>`;
      const tracked = item.id === trackedItemId;
      return `<article class="codex-card ${tracked ? "is-tracked-item" : ""}"><div class="codex-icon">${item.icon || "◇"}</div><span class="type-label">${type}${item.unique ? "・ボス固有" : ""}</span><h4>${context.escape(item.name)}</h4><p>${context.escape(stats)}</p>${bestQuality ? `<p class="codex-quality-record"><span>最高品質</span><strong class="quality-${bestQuality.color}">${context.escape(bestQuality.prefix || "標準")}</strong></p>` : ""}${item.effectDescription ? `<p class="codex-effect">${context.escape(item.effectDescription)}</p>` : ""}${acquisition}<footer class="codex-item-footer"><small>累計入手 ${count}個</small><button class="button ${tracked ? "secondary" : "ghost"}" data-action="track-item" data-item="${item.id}" ${tracked ? "disabled" : ""}>${tracked ? "探索目標" : "探索目標にする"}</button></footer></article>`;
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
      return `<details class="monster-dungeon-group item-codex-group" ${index === 0 ? "open" : ""}><summary><span><strong>${context.escape(group.heading)}</strong><small>${context.escape(group.description)}</small></span><b>発見 ${known.length}/${sorted.length}</b><i aria-hidden="true">›</i></summary><div class="codex-grid">${known.map(card).join("")}${unknownCount ? unknownStack(unknownCount) : ""}</div></details>`;
    }).join("");
    const trackedPanel = trackedItem ? `<section class="codex-tracked-target ${trackedTarget.progress >= trackedTarget.quantity ? "is-complete" : ""}"><span>現在の探索目標</span><strong>${context.escape(trackedItem.icon || "◇")} ${context.escape(trackedItem.name)}</strong><small>入手記録のある攻略先に印が付きます。</small><div class="codex-target-progress"><span>${trackedTarget.progress >= trackedTarget.quantity ? "達成" : "収集中"}</span><strong>${trackedTarget.progress} / ${trackedTarget.quantity}</strong><i><b style="width:${Math.min(100, trackedTarget.progress / trackedTarget.quantity * 100)}%"></b></i></div><form id="item-target-form" data-item="${trackedItem.id}"><label>必要数<input type="number" name="targetQuantity" min="1" max="999" inputmode="numeric" value="${trackedTarget.quantity}" required></label><button class="button secondary" type="submit">更新</button></form><button class="button ghost" data-action="clear-tracked-item">解除</button></section>` : `<section class="codex-tracked-target is-empty"><span>探索目標</span><p>発見済みの品から一つ選ぶと、攻略先で入手記録を照合できます。</p></section>`;
    return `<section class="panel archive-content item-codex"><div class="section-heading"><div><span class="label">ITEM ENCYCLOPEDIA</span><h3>アイテム図鑑</h3></div><strong>${discovered} / ${all.length}</strong></div><p>武器種、防具種、素材に分けて記録しています。一度でも入手した品は、売却や製作に使った後も図鑑に残ります。未発見品は分類ごとにまとめて伏せています。</p>${trackedPanel}${equipmentSetLedger}${ultraRareLedger}${content}</section>`;
  }

  function monsters(context) {
    const all = Object.values(window.GameData.monsters);
    const recentEncounters = context.monsterEncounters || {};
    const recentDefeats = context.monsterDefeats || {};
    const discovered = all.filter(monster => window.Encyclopedia.monster(monster.id)).length;
    const defeated = all.filter(monster => window.Encyclopedia.monster(monster.id)?.defeated).length;
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
        return `<span class="monster-drop-chip">${context.escape(item?.icon || "◇")} ${context.escape(item?.name || id)}</span>`;
      }).join("");
      const unknown = configured.length - configured.filter(id => observed.has(id)).length;
      return `<section class="monster-difficulty-drop"><strong>${tier.name}</strong><span>${context.escape(tier.namePrefix + monster.name)}</span><div>${drops || '<small>ドロップはまだ確認されていない</small>'}${unknown > 0 ? `<span class="monster-drop-unknown">未確認 ${unknown}種</span>` : ""}</div>${skills.length || unknownSkills ? `<div class="monster-skill-record">${skills.map(skill => `<details class="monster-skill-chip"><summary>${context.escape(skill.name)}・${skill.period}T</summary><p>${context.escape(skill.description)}</p></details>`).join("")}${unknownSkills ? `<span class="monster-skill-unknown">固有技 未確認 ${unknownSkills}種</span>` : ""}</div>` : ""}<small>遭遇 ${entry.encountered}体 ／ 討伐 ${entry.defeated}体</small></section>`;
    }
    function monsterCard(monster) {
      const record = window.Encyclopedia.monster(monster.id);
      const recentCount = Number(recentEncounters[monster.id]) || 0;
      const recentDefeated = Number(recentDefeats[monster.id]) || 0;
      if (!record) return `<article class="codex-card is-unknown" aria-label="未遭遇のモンスター"><div class="codex-icon">？</div><span class="type-label">未遭遇</span><h4>？？？</h4><p>探索中に遭遇すると登録されます。</p></article>`;
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
      const difficultyRows = window.DungeonDifficulty.ids().map(id => difficultyDrops(monster, record, id)).join("");
      return `<article class="codex-card monster-codex-card ${recentCount ? "is-recent-encounter" : ""} ${monster.boss && record.defeated ? "is-boss" : ""}"><div class="codex-icon">${monster.icon || "◆"}</div><span class="type-label">${recentCount ? `今回 遭遇${recentCount}体・討伐${recentDefeated}体 ／ ` : ""}調査段階 ${study}/3${record.defeated ? "・討伐済み" : "・未討伐"}</span><h4>${context.escape(monster.name)}</h4><p class="monster-family-line">分類：${context.escape(familyNames.join("・") || "不明")}</p>${stats}<p class="codex-effect">${context.escape(facts.join("。 ") || "名前と生息地だけが記録されている。さらに遭遇し、異なる攻撃を試すと記録が増える。")}</p><div class="monster-difficulty-drops">${difficultyRows}</div><small>総遭遇 ${record.encountered}体 ／ 総討伐 ${record.defeated}体</small></article>`;
    }
    const groups = dungeons.map((dungeon, index) => {
      const unlocked = window.Story.canEnter(dungeon.id);
      const monsterIds = Array.from(new Set(dungeon.encounters.flatMap(encounter => encounter.groups.flat()))).sort((a, b) => Number(Boolean(recentEncounters[b])) - Number(Boolean(recentEncounters[a])));
      const found = monsterIds.filter(id => window.Encyclopedia.monster(id)).length;
      const cards = unlocked ? monsterIds.map(id => monsterCard(window.GameData.monsters[id])).join("") : `<div class="monster-dungeon-locked">物語を進めると調査記録が開きます。</div>`;
      const focused = dungeon.id === context.monsterDungeonId;
      return `<details class="monster-dungeon-group ${focused ? "is-focused-dungeon" : ""}" data-dungeon="${dungeon.id}" ${focused || index === 0 ? "open" : ""}><summary><span><strong>${context.escape(dungeon.name)}</strong><small>${focused ? "直前の探索で遭遇 · " : ""}${context.escape(dungeon.description)}</small></span><b>${unlocked ? `発見 ${found}/${monsterIds.length}` : "未解放"}</b><i aria-hidden="true">›</i></summary><div class="codex-grid">${cards}</div></details>`;
    }).join("");
    const recentCount = Object.keys(recentEncounters).length;
    const recentDefeatCount = Object.values(recentDefeats).reduce((sum, count) => sum + (Number(count) || 0), 0);
    const returnRoute = context.monsterDungeonId && context.returnPartyIndex != null ? `<section class="monster-expedition-context"><div><span>直前の探索記録</span><strong>遭遇 ${recentCount}種 ／ 討伐 ${recentDefeatCount}体</strong><small>強調された記録には、この帰還報告での遭遇数と討伐数を表示しています。</small></div><button class="button secondary" data-action="return-to-result-report" data-party="${context.returnPartyIndex}">帰還報告へ戻る</button></section>` : "";
    return `<section class="panel archive-content monster-codex"><div class="section-heading"><div><span class="label">MONSTER ENCYCLOPEDIA</span><h3>モンスター図鑑</h3></div><strong>発見 ${discovered} / ${all.length}・討伐 ${defeated}</strong></div>${returnRoute}<p>ダンジョンごとに生息するモンスターを確認できます。難易度別ドロップは実際に確認した品だけを表示し、商店で購入できる通常武器・防具は記載しません。</p>${groups}</section>`;
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
          const practice = routeRecord ? { value: routeRecord.successes || 0, target: note.unlock.successes, label: "書き留めた成功" }
            : treasureRecord ? { value: treasureRecord.openings || 0, target: note.unlock.openings, label: "開封の記録" }
              : sharedSorties != null ? { value: sharedSorties, target: note.unlock.minimum, label: "最も長い同行" } : null;
          const practiceProgress = practice
            ? `<div class="field-practice-progress"><span>${practice.label}</span><strong>${Math.min(practice.value, practice.target)} / ${practice.target}</strong><i><b style="width:${Math.min(100, practice.value / practice.target * 100)}%"></b></i></div>`
            : "";
          return `<article class="observation-note is-locked"><div class="observation-note-summary"><span class="observation-note-mark">？</span><span><small>まだ白い頁</small><strong>未整理の観察記録</strong><em>${context.escape(note.unlockHint)}</em>${practiceProgress}</span><span class="badge">未記入</span></div></article>`;
        }
        const isNew = !window.ObservationJournal.isRead(note.id);
        const paragraphs = note.paragraphs.map(paragraph => `<p>${context.escape(paragraph)}</p>`).join("");
        const findings = note.findings.map(finding => `<li>${context.escape(finding)}</li>`).join("");
        return `<details class="observation-note ${isNew ? "is-new" : ""}" ${categoryIndex === 0 && noteIndex === 0 ? "open" : ""}><summary class="observation-note-summary" data-action="observation-read" data-note="${note.id}"><span class="observation-note-mark">${context.escape(note.icon)}</span><span><small>${context.escape(note.author)}</small><strong>${context.escape(note.title)}</strong><em>${context.escape(note.lead)}</em></span>${isNew ? '<span class="observation-new-badge">新着</span>' : ""}<i aria-hidden="true">›</i></summary><div class="observation-note-body">${paragraphs}<div class="observation-findings"><span>頁端の覚え書き</span><ul>${findings}</ul></div></div></details>`;
      }).join("");
      return `<section class="observation-volume"><div class="observation-volume-heading"><div><span>FIELD NOTES</span><h4>${context.escape(category)}</h4></div><b>${unlockedInCategory}/${entries.length}頁</b></div><div class="observation-note-list">${pages}</div></section>`;
    }).join("");
    return `<section class="panel archive-content observation-ledger"><div class="section-heading"><div><span class="label">KEEPER'S FIELD JOURNAL</span><h3>観察日記</h3></div><strong>${unlockedCount} / ${notes.length}頁</strong></div><p class="observation-intro">帰還した冒険者や書庫係が、実地で確かめたことを綴った日記です。物語を進め、新しい土地や戦いを経験すると、白かった頁に少しずつ記録が増えていきます。</p>${rumorLedger(context)}${volumes}</section>`;
  }

  function achievements(context) {
    const all = window.Achievements.entries(), summary = window.Achievements.summary();
    const categories = Array.from(new Set(all.map(entry => entry.category)));
    const groups = categories.map(category => {
      const entries = all.filter(entry => entry.category === category);
      const completed = entries.filter(entry => entry.complete).length;
      const cards = entries.map(entry => {
        const concealed = entry.secret && !entry.complete;
        return `<article class="achievement-card ${entry.complete ? "is-complete" : ""} ${concealed ? "is-secret" : ""}" data-achievement="${context.escape(entry.id)}"><span class="achievement-icon" aria-hidden="true">${concealed ? "？" : context.escape(entry.icon)}</span><div class="achievement-copy"><small>${entry.complete ? "達成" : concealed ? "未発見" : entry.category}</small><strong>${concealed ? "未記入の実績" : context.escape(entry.name)}</strong><p>${concealed ? "まだ書庫へ持ち帰られていない記録です。" : context.escape(entry.description)}</p>${concealed ? "" : `<div class="achievement-meter" aria-label="${Math.min(entry.current, entry.target)} / ${entry.target}"><i style="width:${entry.ratio * 100}%"></i></div><em>${Math.min(entry.current, entry.target)} / ${entry.target}</em>`}</div></article>`;
      }).join("");
      return `<section class="achievement-group"><div class="achievement-group-heading"><h4>${context.escape(category)}</h4><strong>${completed}/${entries.length}</strong></div><div class="achievement-grid">${cards}</div></section>`;
    }).join("");
    return `<section class="panel archive-content achievement-ledger"><div class="section-heading"><div><span class="label">GUILD MILESTONES</span><h3>実績の記録</h3></div><strong>${summary.completed} / ${summary.total}</strong></div><p>仲間との出会い、踏破した土地、持ち帰った発見を一冊にまとめています。記録は現在のギルドの歩みから自動で刻まれます。</p><div class="achievement-total"><span>全体の達成度</span><div><i style="width:${summary.ratio * 100}%"></i></div><strong>${Math.round(summary.ratio * 100)}%</strong></div>${groups}</section>`;
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
      const available = [...bondDefinitions.values()].filter(moment => sharedSorties >= moment.minimumSharedSorties).length;
      return { key, ids, people, sharedSorties, memories, available };
    }).filter(Boolean).sort((left, right) => right.memories.length - left.memories.length || right.sharedSorties - left.sharedSorties || left.key.localeCompare(right.key, "ja"));
    const relationshipLedger = relationshipRecords.length ? `<section class="adventurer-bond-ledger"><div class="section-heading compact"><div><span class="label">TRAVEL MEMORIES</span><h4>旅仲間の記憶</h4></div><strong>${relationshipRecords.length}組</strong></div><p>募集で加わった冒険者たちが、共に歩いた遠征で見せたひと幕です。記憶は二人の間に一つだけ残ります。</p><div class="adventurer-bond-list">${relationshipRecords.map(record => `<details><summary><span aria-hidden="true">結</span><span><strong>${record.people.map(person => context.escape(person.name)).join("と")}</strong><small>同行 ${number(record.sharedSorties)}回</small></span><b>${record.memories.length}/${record.available}篇</b><i aria-hidden="true">›</i></summary><ol>${record.memories.map(memory => `<li><strong>${context.escape(memory.title)}</strong><p>${context.escape(String(memory.text).replace(/\{(\w+)\}/g, (match, name) => ({ left: record.people[0].name, right: record.people[1].name })[name] ?? match))}</p></li>`).join("")}</ol></details>`).join("")}</div></section>` : "";
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
    return `<section class="panel archive-content adventurer-record-ledger"><div class="section-heading"><div><span class="label">ADVENTURER RECORDS</span><h3>遠征者の記録</h3></div><strong>個人記章 ${earned}</strong></div><p>帰還した冒険者たちの足跡を、六つの記録に分けて綴っています。順位は能力の優劣ではなく、実際に歩いた遠征の記録です。</p>${relationshipLedger}${characters.length ? `<div class="adventurer-record-boards">${contents}</div>` : '<div class="notice muted"><span class="notice-icon">◇</span><div><strong>まだ記録はありません</strong><p>最初の冒険者を雇用すると、この頁に名前が刻まれます。</p></div></div>'}</section>`;
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
    const tabs = [["commissions", `依頼掲示板${readyRewards ? `<span class="archive-tab-notice request">${readyRewards}</span>` : ""}`], ["observations", `観察日記${unread ? `<span class="archive-tab-notice observation">${unread}</span>` : ""}`], ["companions", "人物録"], ["records", "遠征者記録"], ["achievements", "実績"], ["origins", "冒険者体系"], ["items", `アイテム図鑑${unreadItems ? `<span class="archive-tab-notice discovery">${unreadItems}</span>` : ""}`], ["monsters", `モンスター図鑑${unreadMonsters ? `<span class="archive-tab-notice discovery">${unreadMonsters}</span>` : ""}`]];
    const body = context.archiveView === "items" ? items(context) : context.archiveView === "monsters" ? monsters(context) : context.archiveView === "origins" ? origins(context) : context.archiveView === "companions" ? companions(context) : context.archiveView === "records" ? adventurerRecords(context) : context.archiveView === "observations" ? observations(context) : context.archiveView === "achievements" ? achievements(context) : commissions(context);
    return `<section class="panel archive-header"><div class="section-heading"><div><span class="label">ADVENTURER ARCHIVES</span><h3>冒険者資料室</h3></div></div><p>ギルドの依頼と、これまでの冒険で集めた知識を確認できます。未確認の情報は伏せたまま、持ち帰った記録だけが増えていきます。</p>${dashboard}<div class="archive-tabs" role="tablist" aria-label="資料の種類">${tabs.map(([id, label]) => `<button type="button" role="tab" class="button ${context.archiveView === id ? "secondary" : "ghost"}" aria-selected="${context.archiveView === id}" data-action="archive-view" data-view="${id}">${label}</button>`).join("")}</div></section>${body}`;
  }

  window.GameUIViews.archives = { commissions, items, monsters, origins, companions, adventurerRecords, observations, achievements, page };
})();
