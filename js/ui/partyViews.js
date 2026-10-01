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
    const latestCompleted = chapters.filter(chapter => window.Story.ensure().completed.includes(chapter.id)).slice(-1)[0];
    choices.chapterId = currentWithRoutes?.id
      || (selectedRouteChapter && chapters.some(chapter => chapter.id === selectedRouteChapter) ? selectedRouteChapter : null)
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
    const discovery = Array.isArray(result.newItemIds) && result.newItemIds.length ? `<span class="discovery">初発見 ${result.newItemIds.length}種</span>` : "";
    return `<div class="fleet-result-loot" aria-label="直近の獲得報酬">${discovery}<span class="gold">${formatGold(result.gold)}</span><span class="experience">${escape(experienceText)}</span><span class="equipment">${escape(equipmentText)}</span><span class="materials">${escape(materialText)}</span></div>`;
  }

  function compactHistory(history, escape, formatGold) {
    const older = (history || []).slice(1, 4);
    if (!older.length) return "";
    return `<details class="fleet-history"><summary>過去の帰還 ${older.length}件</summary><div>${older.map(entry => {
      const dungeon = window.DungeonDifficulty.variant(entry.dungeonId, entry.difficultyId || "normal");
      const equipmentCount = entry.equipment.reduce((sum, item) => sum + item.quantity, 0);
      const materialCount = entry.materials.reduce((sum, item) => sum + item.quantity, 0);
      const equipmentNames = Array.from(new Set(entry.equipment.map(item => item.name))).slice(0, 2).join("・");
      const materialNames = entry.materials.slice(0, 2).map(item => `${window.GameData.items[item.itemId].name}×${item.quantity}`).join("・");
      return `<article class="fleet-history-entry ${entry.success ? "success" : "failure"}"><span>${entry.success ? "成功" : "撤退"}</span><strong>${escape(dungeon.name)}</strong><small>${formatGold(entry.gold)}／EXP +${entry.exp}</small><p>${equipmentCount ? `装備${equipmentCount}点 ${escape(equipmentNames)}` : "装備なし"}　${materialCount ? `素材${materialCount}個 ${escape(materialNames)}` : "素材なし"}</p></article>`;
    }).join("")}</div></details>`;
  }

  function overview(context) {
    const { escape, explorationChoices, formatGold, portraitImage, time } = context;
    const selected = window.Party.selected(), state = window.GameState.data;
    const readyPartyCount = Array.from({ length: window.Party.limit() }, (_, index) => index)
      .filter(index => !window.Party.expedition(index) && window.Party.members(index).length && window.Party.plan(index)).length;
    const visiblePartyCount = Math.min(window.Party.maximum(), window.Party.limit() + 1);
    const hiddenPartyCount = window.Party.maximum() - visiblePartyCount;
    const rows = Array.from({ length: visiblePartyCount }, (_, index) => {
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
      const unreadResult = Boolean(!expedition && result && result.viewed !== true);
      const percent = expedition ? Math.min(100, Math.max(0, (window.GameRuntime.now() - expedition.startedAt) / (expedition.endsAt - expedition.startedAt) * 100)) : 0;
      const destination = selectedVariant(context, index), multiplier = destination ? (explorationChoices[index][destination.baseDungeonId] || 1) : 1;
      const activeDungeon = expedition ? window.DungeonDifficulty.variant(expedition.dungeonId, expedition.difficultyId || "normal") : null;
      const journey = expedition ? `<div class="fleet-journey" data-expedition="${index}"><strong>${escape(activeDungeon.name)} · ${expedition.timeMultiplier}倍探索</strong><span>残り <strong class="fleet-timer" data-countdown="${index}">${time(window.Dungeon.remaining(index))}</strong></span><div class="progress"><i style="width:${percent}%"></i></div><small>時間経過 <span data-overview-percent>${Math.floor(percent)}</span>%</small></div>` : `<div class="fleet-journey"><strong>${members.length && destination ? `攻略先：${escape(destination.name)} · ${multiplier}倍探索` : members.length ? "攻略先を設定してください" : "仲間を加えてパーティを編成"}</strong>${result ? `<small><span class="fleet-result-mark ${resultState}">${result.success ? "攻略成功" : "撤退"}</span>${escape(result.dungeonName || window.GameData.dungeons[result.dungeonId].name)}</small>${compactResultLoot(result, escape, formatGold)}${compactHistory(state.partyHistory[index], escape, formatGold)}` : "<small>探索記録なし</small>"}</div>`;
      const memberStrip = members.length ? members.map((member, position) => {
        const stat = window.Characters.stats(member);
        return `<span class="fleet-member"><span class="fleet-member-level">Lv.${member.level}</span>${portraitImage(member, true)}<strong>${escape(member.name)}</strong><small>HP ${stat.hp}</small><i>${position + 1}</i></span>`;
      }).join("") : `<span class="fleet-empty-member">メンバーなし</span>`;
      const partyName = window.Party.name(index);
      return `<article class="party-overview-row ${active ? "is-selected" : ""} ${expedition ? "is-exploring" : result ? `is-last-${resultState}` : ""} ${unreadResult ? "has-unread-result" : ""}" data-party-overview="${index}"><div class="fleet-party"><button class="fleet-party-select" data-action="rename-party" data-party="${index}" aria-label="${escape(partyName)}の名前を変更"><span>${escape(partyName)}</span><i aria-hidden="true">✎</i></button><span class="fleet-status ${expedition ? "exploring" : resultState}">${status}</span>${unreadResult ? '<span class="fleet-new-result">NEW</span>' : ""}<small>第${index + 1}隊 · ${members.length}/${window.Party.memberLimit()}人</small><div class="fleet-member-strip">${memberStrip}</div></div>${journey}<div class="fleet-actions"><button class="button ghost" data-action="party-open" data-party="${index}" data-view="formation" aria-label="${escape(partyName)}を編成する">パーティを編成する</button>${expedition ? `<button class="button ghost" data-action="party-open" data-party="${index}" data-view="adventure" aria-label="${escape(partyName)}の探索ログ">探索ログ</button>` : `<button class="button primary" data-action="quick-start-party" data-party="${index}" aria-label="${escape(partyName)}を${destination ? escape(destination.name) : "設定した攻略先"}へ出撃" ${!members.length || !destination ? "disabled" : ""}>出撃</button>`}<button class="button secondary ${unreadResult ? "has-notice" : ""}" data-action="party-open" data-party="${index}" data-view="results" aria-label="${escape(partyName)}の直近ログ${unreadResult ? "・未読" : ""}" ${!result ? "disabled" : ""}>直近ログ${unreadResult ? "・新着" : ""}</button></div></article>`;
    }).join("");
    const futureSlots = hiddenPartyCount ? `<div class="fleet-future-slots"><span aria-hidden="true">＋</span><div><strong>さらに${hiddenPartyCount}枠のパーティを増設できます</strong><small>章を進めると、次の増設候補が順番に表示されます。第8枠はコード特典です。</small></div></div>` : "";
    return `<section class="panel party-overview"><div class="section-heading fleet-overview-heading"><div><span class="label">ADVENTURE PARTIES</span><h3>冒険の準備</h3></div><div class="fleet-overview-actions"><strong>${window.Dungeon.activeCount()}/${window.Party.limit()}隊が探索中</strong><button class="button primary" data-action="depart-ready-parties" ${readyPartyCount ? "" : "disabled"}>待機隊を一斉出撃${readyPartyCount ? ` (${readyPartyCount})` : ""}</button></div></div><div class="fleet-list">${rows}</div>${futureSlots}<p class="small-note">一斉出撃は、編成済みで攻略先を保存してある待機隊だけを、押した時にまとめて出発させます。自動で再出撃はしません。個別の編成は「パーティを編成する」、進行中の記録は「探索ログ」、前回の結果は「直近ログ」から確認できます。</p></section>`;
  }

  function adventure(context) {
    const { activeJournalPanel, departureSummary, empty, escape, explorationChoices, time } = context;
    if (!window.Party.members().length) return empty("出撃する仲間を選んでください", "まず編成画面で冒険者を加えてください。", '<button class="button primary" data-action="party-view" data-view="formation">編成へ</button>');
    const expedition = window.Party.expedition();
    if (expedition) return `<section class="party-live-summary"><span>探索中</span><strong>${escape(window.DungeonDifficulty.variant(expedition.dungeonId, expedition.difficultyId || "normal").name)}</strong><small>帰還まで <b data-countdown="${window.Party.selected()}">${time(window.Dungeon.remaining())}</b></small></section>${departureSummary()}${activeJournalPanel(expedition)}`;
    const destination = selectedVariant(context, window.Party.selected());
    const multiplier = destination ? (explorationChoices[window.Party.selected()][destination.baseDungeonId] || 1) : 1;
    return `${departureSummary()}<section class="departure-selection-bar"><div><span>選択中の攻略先</span><strong>${destination ? `${escape(destination.name)} · ${multiplier}倍探索` : "攻略先を選択してください"}</strong></div><button class="button primary" data-action="quick-start-party" data-party="${window.Party.selected()}" ${destination ? "" : "disabled"}>この攻略先へ出撃</button></section><div class="section-heading route-selection-heading"><div><span class="label">DESTINATION</span><h3>攻略先を選択</h3></div></div><p class="small-note">章を切り替えて攻略先を選びます。探索時間が長いほど連戦・報酬が増えますが、時間あたりの報酬は等倍が有利です。</p>${chapterNavigator(context)}${dungeonCards(context)}`;
  }

  function chapterNavigator(context) {
    const { escape } = context;
    const partyIndex = window.Party.selected();
    const activeId = selectedChapterId(context, partyIndex);
    const story = window.Story.ensure();
    return `<nav class="route-chapter-tabs" aria-label="攻略する章">${routeChapters().map(chapter => {
      const routes = window.Story.chapterDungeons(chapter.id).filter(dungeon => dungeon.requiredForStory);
      const cleared = routes.filter(dungeon => story.facts.clears.includes(dungeon.id)).length;
      const enterable = window.Story.chapterDungeons(chapter.id).some(dungeon => window.Story.canEnter(dungeon.id));
      const complete = story.completed.includes(chapter.id);
      const shortTitle = chapter.title.split("：")[0];
      return `<button class="route-chapter-tab ${activeId === chapter.id ? "is-active" : ""} ${complete ? "is-complete" : ""} ${enterable ? "" : "is-locked"}" data-action="select-dungeon-chapter" data-chapter="${chapter.id}" aria-pressed="${activeId === chapter.id}"><strong>${escape(shortTitle)}</strong><span>${cleared}/${routes.length}${complete ? " 達成" : enterable ? " 攻略中" : " 未解放"}</span></button>`;
    }).join("")}</nav>`;
  }

  function dungeonCards(context) {
    const { dungeonIntel, escape, explorationChoices, itemName } = context;
    const busy = Boolean(window.Party.expedition());
    const partyIndex = window.Party.selected();
    const selectedId = selectedDungeonId(context, partyIndex);
    const chapterId = selectedChapterId(context, partyIndex);
    const chapter = window.GameData.storyChapters.find(candidate => candidate.id === chapterId);
    const routes = window.Story.chapterDungeons(chapterId);
    const mainRoutes = routes.filter(dungeon => dungeon.requiredForStory);
    const optionalRoutes = routes.filter(dungeon => !dungeon.requiredForStory);
    const clears = window.Story.ensure().facts.clears;
    const clearedMain = mainRoutes.filter(dungeon => clears.includes(dungeon.id)).length;
    const nextRoute = mainRoutes.find(dungeon => !clears.includes(dungeon.id) && window.Story.canEnter(dungeon.id));
    function routeCards(group) { return group.map((dungeon, index) => {
      const emblem = dungeon.color === "green" ? "♧" : dungeon.color === "blue" ? "◭" : "⌘";
      const routeNumber = dungeon.requiredForStory ? String(dungeon.orderInChapter).padStart(2, "0") : String(index + 1).padStart(2, "0");
      if (!window.Story.canEnter(dungeon.id)) return `<article class="dungeon-card compact-route locked-dungeon ${dungeon.color}"><div class="dungeon-route-summary"><span class="dungeon-route-emblem" aria-hidden="true">${emblem}</span><div class="dungeon-route-name"><span>${dungeon.requiredForStory ? `本編 ${routeNumber}` : `任意高難度 ${routeNumber}`}</span><h3>${escape(dungeon.name)}</h3><p>${escape(dungeon.description)}</p></div><span class="badge">未解放</span></div><div class="dungeon-route-locked"><p class="story-lock-condition">${escape(window.Story.dungeonCondition(dungeon.id))}</p><button class="button ghost" data-nav="home">物語を確認</button></div></article>`;
      const difficultyId = selectedDifficultyId(context, partyIndex, dungeon.id);
      const variant = window.DungeonDifficulty.variant(dungeon, difficultyId);
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
      }).join("");
      return `<article class="dungeon-card compact-route route-choice ${selected ? "is-selected" : ""} ${nextRoute?.id === dungeon.id ? "is-next-route" : ""} ${cleared ? "is-cleared" : ""} ${dungeon.color}"><div class="dungeon-difficulty-selector" aria-label="${escape(dungeon.name)}の難易度">${difficultyButtons}</div><div class="dungeon-route-summary"><span class="dungeon-route-emblem" aria-hidden="true">${emblem}</span><div class="dungeon-route-name"><span>推奨Lv.${variant.recommendedLevel}${dungeon.requiredForStory ? ` · 本編 ${routeNumber}` : " · 任意高難度"}${cleared ? " · 攻略済" : nextRoute?.id === dungeon.id && difficultyId === "normal" ? " · 次の攻略先" : ""}</span><h3>${escape(variant.name)}</h3><p>${escape(dungeon.description)}</p></div><div class="dungeon-route-metrics"><span><small>基本時間</small><strong>${variant.duration}秒</strong></span><span><small>戦闘</small><strong>${variant.encounters.length}戦</strong></span></div></div>${firstClearText ? `<p class="difficulty-first-clear"><span>初回踏破</span><strong>${escape(firstClearText)}</strong></p>` : ""}<div class="dungeon-route-controls"><label for="exploration-${dungeon.id}"><span>探索時間</span><select id="exploration-${dungeon.id}" data-exploration-dungeon="${dungeon.id}" ${busy ? "disabled" : ""}>${[1, 2, 3, 4, 5, 6].map(value => `<option value="${value}" ${value === multiplier ? "selected" : ""}>${value}倍 · ${variant.duration * value}秒 · ${variant.encounters.length * value}戦</option>`).join("")}</select></label><button class="button ${selected ? "secondary" : "primary"}" data-action="select-dungeon" data-dungeon="${dungeon.id}" ${busy ? "disabled" : ""}>${selected ? "選択中" : "選択する"}</button></div><details class="dungeon-details" data-detail="route-${dungeon.id}"><summary>依頼・噂・現地記録を見る</summary><div class="dungeon-route-detail-grid"><div><h4>確認された気配</h4><div class="monster-preview">${monsterPreview}</div></div><div><h4>主な発見物</h4><p>${escape(drops)}</p><h4>探索時間と報酬</h4><p class="small-note">${multiplier}倍探索は${variant.encounters.length * multiplier}戦。${window.DungeonDifficulty.tier(difficultyId).name}では基本探索時間と敵の強さ、報酬が変化します。</p></div></div></details></article>`;
    }).join(""); }
    if (!chapter) return `<p class="small-note">攻略できる章がありません。</p>`;
    return `<section class="route-chapter-browser"><header class="route-chapter-overview"><div><span>${escape(chapter.title)}</span><h3>本編攻略 ${clearedMain}/${mainRoutes.length}</h3></div><div class="route-chapter-progress" aria-label="本編攻略進捗 ${clearedMain}/${mainRoutes.length}"><i style="width:${mainRoutes.length ? clearedMain / mainRoutes.length * 100 : 0}%"></i></div><small>推奨Lv.${chapter.recommendedLevelRange[0]}〜${chapter.recommendedLevelRange[1]}</small></header><div class="route-group-heading"><strong>本編ルート</strong><span>${nextRoute ? `次は「${escape(nextRoute.name)}」` : clearedMain === mainRoutes.length ? "本編攻略済み" : "解放条件を満たしてください"}</span></div><div class="dungeon-grid dungeon-route-list">${routeCards(mainRoutes)}</div>${optionalRoutes.length ? `<section class="optional-route-group"><div class="route-group-heading"><strong>寄り道・高難度</strong><span>物語の進行には影響しません</span></div><div class="dungeon-grid dungeon-route-list">${routeCards(optionalRoutes)}</div></section>` : ""}</section>`;
  }

  window.GameUIViews.party = { adventure, dungeonCards, overview, selectedChapterId, selectedDifficultyId, selectedDungeon, selectedDungeonId, selectedVariant };
})();
