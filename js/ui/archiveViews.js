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
      return `<section class="panel wide recurring-mission-board"><div class="section-heading"><div><p class="eyebrow">${context.escape(group.eyebrow)}</p><h3>${context.escape(group.name)}</h3></div><span class="badge">${cycle.claimed.length}/${entries.length} 受取</span></div><div class="recurring-mission-toolbar"><p class="small-note">${context.escape(period)}　端末時刻を基準に更新</p><button class="button secondary" data-action="claim-all-recurring-missions" data-group="${group.id}" ${readyEntries.length ? "" : "disabled"}>まとめて受け取る</button></div><div class="recurring-mission-list">${cards}</div></section>`;
    }).join("");
    const quests = window.GameData.commissions.filter(quest => !dungeonId || quest.dungeonId === dungeonId);
    const cards = quests.map(quest => {
      const unlocked = window.Story.canEnter(quest.dungeonId), progress = current.progress[quest.id] || 0;
      const claimed = current.claimed.includes(quest.id), ready = progress >= quest.target;
      const reward = `${context.formatGold(quest.rewards.gold)}・${Object.entries(quest.rewards.materials).map(([id, quantity]) => `${context.itemName(id)}×${quantity}`).join("・")}`;
      return `<article class="commission-card"><div class="card-heading"><h4>${context.escape(quest.title)}</h4><span class="badge ${claimed || ready ? "good" : ""}">${!unlocked ? "未解放" : claimed ? "受取済み" : ready ? "達成" : `${progress}/${quest.target}`}</span></div><p>${context.escape(quest.description)}</p><p>報酬：${context.escape(reward)}</p>${unlocked ? `<button class="button secondary" data-action="claim-commission" data-commission="${quest.id}" ${claimed || !ready ? "disabled" : ""}>${claimed ? "受取済み" : ready ? "報酬を受け取る" : "未達成"}</button>` : `<p class="story-lock-condition">${context.escape(window.Story.dungeonCondition(quest.dungeonId))}</p>`}</article>`;
    }).join("");
    return `<section class="panel wide"><div class="section-heading"><div><p class="eyebrow">GUILD REQUEST BOARD</p><h3>ギルド依頼掲示板</h3></div></div><p class="small-note">定期依頼と、探索地ごとの通常依頼を確認できます。</p></section>${recurringBoards}<section class="panel wide"><div class="section-heading"><div><p class="eyebrow">GUILD REQUEST</p><h3>通常依頼</h3></div></div><p class="small-note">受注は不要。探索地の解放とともに進行し、各報酬は一度だけ受け取れます。</p><div class="commission-grid">${cards}</div></section>`;
  }

  function items(context) {
    const all = Object.values(window.GameData.items);
    const discovered = all.filter(item => window.Encyclopedia.item(item.id)).length;
    function card(item) {
      const count = window.Encyclopedia.item(item.id);
      if (!count) return `<article class="codex-card is-unknown" aria-label="未発見のアイテム"><div class="codex-icon">？</div><span class="type-label">未発見</span><h4>？？？</h4><p>入手すると情報が登録されます。</p></article>`;
      const equipmentType = window.GameData.equipmentTypes[item.weaponType || item.armorType];
      const type = item.type === "material" ? "素材" : `${item.type === "weapon" ? "武器" : "防具"}・${equipmentType?.name || "その他"}`;
      const stats = item.type === "material" ? "製作や強化に使用する素材" : [item.attack ? `攻撃 ${item.attack}` : "", item.magicAttack ? `魔法攻撃 ${item.magicAttack}` : "", item.defense ? `防御 ${item.defense}` : "", item.magicDefense ? `魔法防御 ${item.magicDefense}` : "", item.magicHealing ? `魔法回復 ${item.magicHealing}` : "", item.hp ? `HP ${item.hp}` : "", `重量 ${item.weight || 0}`, item.type === "weapon" ? (item.range === "ranged" ? "遠距離" : "近接") : ""].filter(Boolean).join(" ／ ");
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
      return `<article class="codex-card"><div class="codex-icon">${item.icon || "◇"}</div><span class="type-label">${type}${item.unique ? "・ボス固有" : ""}</span><h4>${context.escape(item.name)}</h4><p>${context.escape(stats)}</p>${item.effectDescription ? `<p class="codex-effect">${context.escape(item.effectDescription)}</p>` : ""}${acquisition}<small>累計入手 ${count}個</small></article>`;
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
      const found = sorted.filter(item => window.Encyclopedia.item(item.id)).length;
      return `<details class="monster-dungeon-group item-codex-group" ${index === 0 ? "open" : ""}><summary><span><strong>${context.escape(group.heading)}</strong><small>${context.escape(group.description)}</small></span><b>発見 ${found}/${sorted.length}</b><i aria-hidden="true">›</i></summary><div class="codex-grid">${sorted.map(card).join("")}</div></details>`;
    }).join("");
    return `<section class="panel archive-content item-codex"><div class="section-heading"><div><span class="label">ITEM ENCYCLOPEDIA</span><h3>アイテム図鑑</h3></div><strong>${discovered} / ${all.length}</strong></div><p>武器種、防具種、素材に分けて記録しています。一度でも入手した品は、売却や製作に使った後も図鑑に残ります。</p>${content}</section>`;
  }

  function monsters(context) {
    const all = Object.values(window.GameData.monsters);
    const discovered = all.filter(monster => window.Encyclopedia.monster(monster.id)).length;
    const defeated = all.filter(monster => window.Encyclopedia.monster(monster.id)?.defeated).length;
    const chapterOrder = Object.fromEntries(window.GameData.storyChapters.map(chapter => [chapter.id, chapter.order]));
    const dungeons = Object.values(window.GameData.dungeons).slice().sort((a, b) => (chapterOrder[a.chapterId] || 999) - (chapterOrder[b.chapterId] || 999) || a.orderInChapter - b.orderInChapter);
    function isShopEquipment(itemId) {
      const item = window.GameData.items[itemId];
      return ["weapon", "armor"].includes(item?.type) && !item.unique && !item.craftOnly && !item.dropOnly;
    }
    function configuredDrops(monster, difficultyId) {
      const result = [...(monster.materialDrops || []).map(drop => drop.itemId)];
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
      const configured = configuredDrops(monster, difficultyId);
      const observed = new Set(entry.drops || []);
      const drops = configured.filter(id => observed.has(id)).map(id => {
        const item = window.GameData.items[id];
        return `<span class="monster-drop-chip">${context.escape(item?.icon || "◇")} ${context.escape(item?.name || id)}</span>`;
      }).join("");
      const unknown = configured.length - configured.filter(id => observed.has(id)).length;
      return `<section class="monster-difficulty-drop"><strong>${tier.name}</strong><span>${context.escape(tier.namePrefix + monster.name)}</span><div>${drops || '<small>ドロップはまだ確認されていない</small>'}${unknown > 0 ? `<span class="monster-drop-unknown">未確認 ${unknown}種</span>` : ""}</div><small>遭遇 ${entry.encountered}体 ／ 討伐 ${entry.defeated}体</small></section>`;
    }
    function monsterCard(monster) {
      const record = window.Encyclopedia.monster(monster.id);
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
      return `<article class="codex-card monster-codex-card ${monster.boss && record.defeated ? "is-boss" : ""}"><div class="codex-icon">${monster.icon || "◆"}</div><span class="type-label">調査段階 ${study}/3${record.defeated ? "・討伐済み" : "・未討伐"}</span><h4>${context.escape(monster.name)}</h4><p class="monster-family-line">分類：${context.escape(familyNames.join("・") || "不明")}</p>${stats}<p class="codex-effect">${context.escape(facts.join("。 ") || "名前と生息地だけが記録されている。さらに遭遇し、異なる攻撃を試すと記録が増える。")}</p><div class="monster-difficulty-drops">${difficultyRows}</div><small>総遭遇 ${record.encountered}体 ／ 総討伐 ${record.defeated}体</small></article>`;
    }
    const groups = dungeons.map((dungeon, index) => {
      const unlocked = window.Story.canEnter(dungeon.id);
      const monsterIds = Array.from(new Set(dungeon.encounters.flatMap(encounter => encounter.groups.flat())));
      const found = monsterIds.filter(id => window.Encyclopedia.monster(id)).length;
      const cards = unlocked ? monsterIds.map(id => monsterCard(window.GameData.monsters[id])).join("") : `<div class="monster-dungeon-locked">物語を進めると調査記録が開きます。</div>`;
      return `<details class="monster-dungeon-group" ${index === 0 ? "open" : ""}><summary><span><strong>${context.escape(dungeon.name)}</strong><small>${context.escape(dungeon.description)}</small></span><b>${unlocked ? `発見 ${found}/${monsterIds.length}` : "未解放"}</b><i aria-hidden="true">›</i></summary><div class="codex-grid">${cards}</div></details>`;
    }).join("");
    return `<section class="panel archive-content monster-codex"><div class="section-heading"><div><span class="label">MONSTER ENCYCLOPEDIA</span><h3>モンスター図鑑</h3></div><strong>発見 ${discovered} / ${all.length}・討伐 ${defeated}</strong></div><p>ダンジョンごとに生息するモンスターを確認できます。難易度別ドロップは実際に確認した品だけを表示し、商店で購入できる通常武器・防具は記載しません。</p>${groups}</section>`;
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
    const affinities = Object.entries(window.GameData.equipmentAffinities[type][entry.id] || {}).filter(([, value]) => value !== 1).map(([id, value]) => `${window.GameData.equipmentTypes[id].name}×${value.toFixed(2)}`);
    const skills = (window.GameData.skillGrants[type][entry.id] || []).slice().sort((a, b) => Number(b.initial) - Number(a.initial) || a.level - b.level).map(grant => {
      const skill = window.GameData.skills[grant.skillId];
      return `<li><span>${grant.initial ? "初期" : `Lv.${grant.level}`}</span><div><strong>${context.escape(window.GameData.skillCategories[skill.category])} · ${context.escape(skill.name)}</strong><small>${context.escape(skill.description)}</small></div></li>`;
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

  function observationUnlocked(note) {
    return window.ObservationJournal.unlocked(note);
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
          return `<article class="observation-note is-locked"><div class="observation-note-summary"><span class="observation-note-mark">？</span><span><small>まだ白い頁</small><strong>未整理の観察記録</strong><em>${context.escape(note.unlockHint)}</em></span><span class="badge">未記入</span></div></article>`;
        }
        const isNew = !window.ObservationJournal.isRead(note.id);
        const paragraphs = note.paragraphs.map(paragraph => `<p>${context.escape(paragraph)}</p>`).join("");
        const findings = note.findings.map(finding => `<li>${context.escape(finding)}</li>`).join("");
        return `<details class="observation-note ${isNew ? "is-new" : ""}" ${categoryIndex === 0 && noteIndex === 0 ? "open" : ""}><summary class="observation-note-summary" data-action="observation-read" data-note="${note.id}"><span class="observation-note-mark">${context.escape(note.icon)}</span><span><small>${context.escape(note.author)}</small><strong>${context.escape(note.title)}</strong><em>${context.escape(note.lead)}</em></span>${isNew ? '<span class="observation-new-badge">新着</span>' : ""}<i aria-hidden="true">›</i></summary><div class="observation-note-body">${paragraphs}<div class="observation-findings"><span>頁端の覚え書き</span><ul>${findings}</ul></div></div></details>`;
      }).join("");
      return `<section class="observation-volume"><div class="observation-volume-heading"><div><span>FIELD NOTES</span><h4>${context.escape(category)}</h4></div><b>${unlockedInCategory}/${entries.length}頁</b></div><div class="observation-note-list">${pages}</div></section>`;
    }).join("");
    return `<section class="panel archive-content observation-ledger"><div class="section-heading"><div><span class="label">KEEPER'S FIELD JOURNAL</span><h3>観察日記</h3></div><strong>${unlockedCount} / ${notes.length}頁</strong></div><p class="observation-intro">帰還した冒険者や書庫係が、実地で確かめたことを綴った日記です。物語を進め、新しい土地や戦いを経験すると、白かった頁に少しずつ記録が増えていきます。</p>${volumes}</section>`;
  }

  function page(context) {
    const unread = window.ObservationJournal.unread().length;
    const readyRewards = window.Commissions.readyCount() + window.RecurringMissions.readyCount();
    const unreadItems = window.Encyclopedia.unreadItems().length, unreadMonsters = window.Encyclopedia.unreadMonsters().length;
    const itemDefinitions = Object.values(window.GameData.items), monsterDefinitions = Object.values(window.GameData.monsters), notes = window.GameData.observationNotes || [];
    const itemFound = itemDefinitions.filter(item => window.Encyclopedia.item(item.id)).length;
    const monsterFound = monsterDefinitions.filter(monster => window.Encyclopedia.monster(monster.id)).length;
    const monsterDefeated = monsterDefinitions.filter(monster => window.Encyclopedia.monster(monster.id)?.defeated).length;
    const noteFound = notes.filter(note => window.ObservationJournal.unlocked(note)).length;
    const originDefinitions = [...Object.values(window.GameData.jobs), ...Object.values(window.GameData.races), ...Object.values(window.GameData.births)];
    const originFound = originDefinitions.filter(window.Recruitment.entryUnlocked).length;
    const progress = [
      ["items", "発見した品", itemFound, itemDefinitions.length, "◇"],
      ["monsters", "遭遇した魔物", monsterFound, monsterDefinitions.length, "◆"],
      ["monsters", "討伐記録", monsterDefeated, monsterDefinitions.length, "⚔"],
      ["observations", "観察日記", noteFound, notes.length, "▤"],
      ["origins", "解放した素質", originFound, originDefinitions.length, "♙"]
    ];
    const dashboard = `<section class="archive-progress" aria-label="収集記録">${progress.map(([view, label, found, total, icon]) => `<button type="button" data-action="archive-view" data-view="${view}"><span aria-hidden="true">${icon}</span><small>${label}</small><strong>${found}<i>/</i>${total}</strong><em><i style="width:${total ? found / total * 100 : 0}%"></i></em></button>`).join("")}</section>`;
    const tabs = [["commissions", `依頼掲示板${readyRewards ? `<span class="archive-tab-notice request">${readyRewards}</span>` : ""}`], ["observations", `観察日記${unread ? `<span class="archive-tab-notice observation">${unread}</span>` : ""}`], ["origins", "冒険者体系"], ["items", `アイテム図鑑${unreadItems ? `<span class="archive-tab-notice discovery">${unreadItems}</span>` : ""}`], ["monsters", `モンスター図鑑${unreadMonsters ? `<span class="archive-tab-notice discovery">${unreadMonsters}</span>` : ""}`]];
    const body = context.archiveView === "items" ? items(context) : context.archiveView === "monsters" ? monsters(context) : context.archiveView === "origins" ? origins(context) : context.archiveView === "observations" ? observations(context) : commissions(context);
    return `<section class="panel archive-header"><div class="section-heading"><div><span class="label">ADVENTURER ARCHIVES</span><h3>冒険者資料室</h3></div></div><p>ギルドの依頼と、これまでの冒険で集めた知識を確認できます。未確認の情報は伏せたまま、持ち帰った記録だけが増えていきます。</p>${dashboard}<div class="archive-tabs" role="tablist" aria-label="資料の種類">${tabs.map(([id, label]) => `<button type="button" role="tab" class="button ${context.archiveView === id ? "secondary" : "ghost"}" aria-selected="${context.archiveView === id}" data-action="archive-view" data-view="${id}">${label}</button>`).join("")}</div></section>${body}`;
  }

  window.GameUIViews.archives = { commissions, items, monsters, origins, observations, page };
})();
