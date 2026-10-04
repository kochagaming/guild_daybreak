(function () {
  "use strict";

  window.GameUIViews = window.GameUIViews || {};

  function equipmentTypeId(item) { return item.weaponType || item.armorType; }

  function groupedEquipment(entries, renderEntry, emptyText, renderFooter, options = {}) {
    const detailPrefix = options.detailPrefix || "equipment";
    const groups = Object.values(window.GameData.equipmentTypes).map(type => ({
      type,
      entries: entries.filter(entry => equipmentTypeId(entry.item || entry) === type.id)
    })).filter(group => group.entries.length);
    if (!groups.length) return `<p class="empty-line">${emptyText}</p>`;
    return `<div class="equipment-type-groups">${groups.map(group => {
      const sorted = group.entries.slice().sort((a, b) => ((a.item || a).tier || 0) - ((b.item || b).tier || 0));
      const latestTier = Math.max(...sorted.map(entry => (entry.item || entry).tier || 0));
      const recent = options.collapseHistory ? sorted.filter(entry => ((entry.item || entry).tier || 0) >= latestTier - 1) : sorted;
      const history = options.collapseHistory ? sorted.filter(entry => ((entry.item || entry).tier || 0) < latestTier - 1) : [];
      const historyBlock = history.length ? `<details class="shop-stock-history"><summary>過去の品を表示 <span>${history.length}点</span></summary><div class="item-list">${history.map(renderEntry).join("")}</div></details>` : "";
      return `<details class="equipment-type-group" data-equipment-type="${group.type.id}" data-detail="${detailPrefix}-equipment-type-${group.type.id}"><summary><span><strong>${group.type.name}</strong><small>（${group.type.summary || (group.type.category === "weapon" ? "武器" : "防具")}）</small></span><span class="equipment-type-count">${group.entries.length}点</span><i class="record-chevron" aria-hidden="true">›</i></summary><div class="equipment-type-products item-list">${recent.map(renderEntry).join("")}${historyBlock}${renderFooter ? renderFooter(group.type, group.entries) : ""}</div></details>`;
    }).join("")}</div>`;
  }

  function blacksmithMenu(context) {
    const equipment = window.GameState.data.inventory.equipment;
    const craftable = window.Blacksmith.catalog({ status: "ready" }).length;
    const upgradeable = equipment.filter(item => window.Upgrades.quote(item.id).ok).length;
    return `<section class="panel blacksmith-menu"><div class="section-heading"><div><span class="label">BLACKSMITH MENU</span><h3>鍛冶メニュー</h3></div><div class="wallet">所持金 <strong>${context.formatGold(window.GameState.data.gold)}</strong></div></div><p class="small-note">行いたい作業を選んでください。製作と強化は別の画面で管理します。</p><div class="blacksmith-menu-grid"><button class="blacksmith-route-card" type="button" data-action="blacksmith-open" data-view="craft"><span aria-hidden="true">⚒</span><span><small>CRAFT</small><strong>装備を製作する</strong><em>素材と所持金から新しい武器・防具を作ります。</em></span><b>${craftable ? `製作可能 ${craftable}件` : "レシピを見る"}</b><i aria-hidden="true">›</i></button><button class="blacksmith-route-card" type="button" data-action="blacksmith-open" data-view="upgrade"><span aria-hidden="true">◆</span><span><small>UPGRADE</small><strong>装備を強化する</strong><em>所持している装備の強化段階を上げます。</em></span><b>${upgradeable ? `強化可能 ${upgradeable}点` : `所持装備 ${equipment.length}点`}</b><i aria-hidden="true">›</i></button></div></section>`;
  }

  function shop(context) {
    const goods = window.Shop.standardStock();
    const nextTier = (window.GameData.config.shop.standardTiers || []).find(entry => !window.Shop.standardTierUnlocked(entry));
    const dailyGoods = window.Shop.dailyStock().map(offer => {
      const base = window.Items.template(offer.templateId), effect = window.Items.effects(offer);
      return Object.assign({}, base, effect, {
        offerId: offer.id,
        qualityId: offer.qualityId,
        name: window.Items.displayName(offer),
        price: offer.price,
        purchased: offer.purchased,
        skillIds: window.EquipmentSkills.ids(offer)
      });
    });
    const daily = `<section class="daily-shop-section"><div class="section-heading"><div><span class="label">DAILY MARKET</span><h3>日替わり商品</h3></div><span class="badge">毎日4:00更新</span></div><p class="small-note">一度でも入手した装備から、性能の異なる10点が並びます。各商品は1日1点限りです。</p>${groupedEquipment(dailyGoods, item => context.itemCard(item, "dailyShop"), "日替わり商品はありません", null, { detailPrefix: "daily-shop" })}</section>`;
    const standard = groupedEquipment(goods, item => context.itemCard(item, "shop"), "販売中の装備はありません", null, { collapseHistory: true, detailPrefix: "standard-shop" });
    const nextUnlock = nextTier ? window.GameData.storyChapters.find(chapter => chapter.id === nextTier.unlockAfter) : null;
    const progression = nextTier ? `<p class="small-note">次の入荷：${context.escape(nextUnlock?.title || "物語の進行")}の完了後、Tier ${nextTier.tier}の汎用品</p>` : `<p class="small-note">すべての通常商品が入荷済みです。</p>`;
    return `<div class="page-intro"><p>物語が進むと、新しいTierの汎用品が入荷します。装備種別を開くと販売中の品を確認できます。</p><div class="wallet">所持金 <strong>${context.formatGold(window.GameState.data.gold)}</strong></div></div><div class="shop-sections">${daily}<section class="standard-shop-section"><div class="section-heading"><div><span class="label">STANDARD STOCK</span><h3>通常商品</h3></div><strong>${goods.length}点</strong></div>${progression}${standard}</section></div>`;
  }

  function upgrades(context) {
    const { escape, forgeEquipmentStats, formatGold, itemName, upgradeView: view } = context;
    const maximum = window.Upgrades.limit();
    const limits = window.GameData.config.upgrades.limits.map(entry => {
      const chapter = window.GameData.storyChapters.find(candidate => candidate.id === entry.chapterId);
      return `${chapter.title.split("：")[0]}：＋${entry.maximum}${window.GameState.data.story.completed.includes(entry.chapterId) ? "（解放済み）" : ""}`;
    }).join(" ／ ");
    const equipment = window.GameState.data.inventory.equipment;
    const words = view.query.toLocaleLowerCase("ja").split(/\s+/).filter(Boolean);
    const entries = equipment.map(item => ({ item, template: window.Items.template(item.templateId), quote: window.Upgrades.quote(item.id) })).filter(entry => {
      const typeId = entry.template.weaponType || entry.template.armorType;
      const itemStatus = entry.quote.level >= entry.quote.maximum ? "capped" : entry.quote.ok ? "ready" : "missing";
      const kindMatch = view.kind === "all" || view.kind === entry.template.type || view.kind === `${entry.template.type}:${typeId}`;
      return kindMatch && (view.status === "all" || view.status === itemStatus) && words.every(word => window.Items.displayName(entry.item).toLocaleLowerCase("ja").includes(word));
    }).sort((a, b) => {
      if (view.sort === "name") return window.Items.displayName(a.item).localeCompare(window.Items.displayName(b.item), "ja");
      if (view.sort === "level") return b.quote.level - a.quote.level || window.Items.displayName(a.item).localeCompare(window.Items.displayName(b.item), "ja");
      const rank = entry => entry.quote.ok ? 0 : entry.quote.level >= entry.quote.maximum ? 2 : 1;
      return rank(a) - rank(b) || a.quote.level - b.quote.level || window.Items.displayName(a.item).localeCompare(window.Items.displayName(b.item), "ja");
    });
    const entryById = new Map(entries.map(entry => [entry.item.id, entry]));
    const equipmentGroups = window.Items.groupEquipment(entries.map(entry => entry.item)).map(group => ({
      ...group,
      entries: group.instances.map(item => entryById.get(item.id)).filter(Boolean)
    }));
    const pageSize = 20, pages = Math.max(1, Math.ceil(equipmentGroups.length / pageSize));
    view.page = Math.min(view.page, pages - 1);
    const visible = equipmentGroups.slice(view.page * pageSize, (view.page + 1) * pageSize);
    const typeOptions = [["all", "すべて"], ["weapon", "武器すべて"], ...Object.entries(window.GameData.derived.weaponTypes).map(([id, name]) => [`weapon:${id}`, name]), ["armor", "防具すべて"], ...Object.entries(window.GameData.derived.armorTypes).map(([id, name]) => [`armor:${id}`, name])];
    const select = (key, label, options) => `<label>${label}<select data-upgrade-filter="${key}">${options.map(([id, name]) => `<option value="${id}" ${view[key] === id ? "selected" : ""}>${escape(name)}</option>`).join("")}</select></label>`;
    const statusOptions = [["all", "すべて"], ["ready", "強化可能"], ["missing", "素材・資金不足"], ["capped", "上限到達"]];
    const sortOptions = [["ready", "強化可能順"], ["level", "強化値が高い順"], ["name", "名前順"]];
    const label = (options, value, fallback) => options.find(([id]) => id === value)?.[1] || fallback;
    const filterSummary = [
      view.query ? `検索「${view.query}」` : "",
      view.kind === "all" ? "全種" : label(typeOptions, view.kind, "装備種別"),
      view.status === "all" ? "全状態" : label(statusOptions, view.status, "強化状態"),
      label(sortOptions, view.sort, "強化可能順")
    ].filter(Boolean).join("・");
    const controls = `<details class="compact-filter-panel blacksmith-filter-panel" data-detail="blacksmith-upgrade-filters"><summary><strong>絞り込み・並べ替え</strong><small>${escape(filterSummary)}</small><i aria-hidden="true">›</i></summary><form id="upgrade-search-form" class="blacksmith-controls upgrade-controls"><label class="blacksmith-search">検索<input id="upgrade-query" value="${escape(view.query)}" placeholder="装備名"></label>${select("kind", "装備種別", typeOptions)}${select("status", "強化状態", statusOptions)}${select("sort", "並べ替え", sortOptions)}<button class="button secondary" type="submit">検索</button><button class="button ghost" type="button" data-action="reset-upgrade-filters">解除</button></form></details>`;
    const cards = visible.map(group => {
      const { item, quote } = group.entries[0];
      const capped = quote.level >= quote.maximum;
      const comparison = ["attack", "defense", "hp", "magicAttack", "magicDefense", "magicHealing"].filter(key => Number(quote.before[key] || 0) !== 0 || Number(quote.after[key] || 0) !== 0).map(key => `${{ attack: "攻撃", defense: "防御", hp: "HP", magicAttack: "魔法攻撃", magicDefense: "魔法防御", magicHealing: "魔法回復" }[key]} ${quote.before[key]} → ${quote.after[key]}`).join(" ／ ");
      const cost = Object.entries(quote.materials).map(([id, quantity]) => `${itemName(id)} ${window.Items.count(id)}/${quantity}`).join("・");
      const learned = quote.addedSkills.length ? `<p class="upgrade-skill-unlock">新たな装備スキル：${quote.addedSkills.map(skill => escape(skill.name)).join("、")}</p>` : "";
      const readyCount = group.entries.filter(entry => entry.quote.ok).length;
      const owners = group.entries.filter(entry => window.Items.equippedBy(entry.item.id)).length;
      const instanceRows = group.entries.map((entry, index) => {
        const owner = window.Items.equippedBy(entry.item.id);
        const status = owner ? `${escape(owner.name)}が装備中` : entry.item.locked ? "ロック中" : "未装備";
        return `<div class="upgrade-instance-row"><span><strong>個体 ${index + 1}</strong><small>${status} · ${escape(entry.quote.message)}</small></span><button class="button secondary" data-action="request-upgrade" data-instance="${entry.item.id}" ${entry.quote.ok ? "" : "disabled"}>${entry.quote.level >= entry.quote.maximum ? "上限到達" : `＋${entry.quote.next}へ`}</button></div>`;
      }).join("");
      const state = capped ? "上限到達" : readyCount ? `強化可能 ${readyCount}/${group.entries.length}` : quote.message;
      return `<details class="commission-card compact-record upgrade-record" data-detail="upgrade-stack-${encodeURIComponent(group.key)}"><summary class="record-summary"><span class="record-name"><strong>${escape(window.Items.displayName(item))}</strong><small>${owners ? `装備中 ${owners}点 · ` : ""}${escape(state)}</small>${forgeEquipmentStats(quote.before)}</span><strong class="equipment-stack-count">×${group.entries.length}</strong><span class="record-stats"><b>＋${quote.level}</b><b>${capped ? "上限到達" : `次 ＋${quote.next}`}</b></span><span class="record-chevron" aria-hidden="true">›</span></summary><div class="record-detail">${capped ? "" : `<p>${escape(comparison)}</p>${learned}<p>必要（1点ごと）：${formatGold(quote.gold)}・${escape(cost)}</p>`}<section class="upgrade-instance-list"><h4>強化する個体を選ぶ</h4>${instanceRows}</section></div></details>`;
    }).join("");
    return `<section class="panel upgrade-panel"><div class="section-heading"><div><span class="label">EQUIPMENT UPGRADE</span><h3>装備強化</h3></div><strong>${equipmentGroups.length}種 · ${entries.length}/${equipment.length}点</strong></div><p>現在の上限：＋${maximum}。${escape(limits)}</p><p class="small-note">成功率100%。同じ性能・強化段階の装備はまとめて表示します。武器は1段階ごとに攻撃＋2、杖はさらに魔法攻撃・魔法回復＋2、防具は防御・魔法防御＋2・HP＋3。重量・品質・追加性能・固有效果は変わりません。</p>${controls}${cards ? `<div class="commission-grid">${cards}</div><nav class="pagination" aria-label="強化装備のページ"><button class="button ghost" data-action="upgrade-page" data-page="${view.page - 1}" ${view.page === 0 ? "disabled" : ""}>前へ</button><span>${view.page + 1}/${pages}ページ · ${equipmentGroups.length}種（${entries.length}点）</span><button class="button ghost" data-action="upgrade-page" data-page="${view.page + 1}" ${view.page >= pages - 1 ? "disabled" : ""}>次へ</button></nav>` : `<p class="empty-line">${equipment.length ? "条件に合う装備がありません。" : "装備を入手すると強化できます。"}</p>`}</section>`;
  }

  function blacksmith(context) {
    const { escape, forgeEquipmentStats, formatGold, itemName, blacksmithView: view } = context;
    const craftedInstance = view.lastCraftedInstanceId ? window.Items.getInstance(view.lastCraftedInstanceId) : null;
    const craftedBase = craftedInstance ? window.Items.template(craftedInstance.templateId) : null;
    const craftedEffects = craftedInstance ? window.Items.effects(craftedInstance) : null;
    const craftedSkills = craftedInstance ? window.EquipmentSkills.descriptions(craftedInstance).map(skill => skill.name).join("・") : "";
    const craftedSetProgress = (view.lastCraftedSetDiscoveries || []).map(entry => {
      const definition = window.GameData.equipmentSets?.[entry.setId];
      if (!definition) return "";
      const unlocked = (entry.newBonusSkillIds || []).map(id => window.GameData.equipmentSkills[id]?.name).filter(Boolean);
      return `<article><span><small>装備組合せ</small><strong>${escape(definition.name)}</strong></span><b>${entry.previousCount} → ${entry.count} / ${definition.itemIds.length}</b>${unlocked.length ? `<em>新効果：${unlocked.map(escape).join("・")}</em>` : ""}${entry.complete ? "<em>全品発見</em>" : ""}</article>`;
    }).join("");
    const craftedNotice = craftedInstance && craftedBase ? `<section class="crafted-equipment-notice"><span class="crafted-equipment-icon" aria-hidden="true">${craftedBase.icon}</span><div><small>CRAFT COMPLETE</small><strong>${escape(window.Items.displayName(craftedInstance))}</strong><span>${escape(window.Items.qualityDescription(craftedInstance))}</span>${forgeEquipmentStats({ ...craftedBase, ...craftedEffects, name: window.Items.displayName(craftedInstance) }, craftedSkills ? `固有スキル：${craftedSkills}` : "固有スキル：なし")}${craftedSetProgress ? `<div class="crafted-set-progress">${craftedSetProgress}</div>` : ""}</div><button class="button secondary" data-action="open-crafted-inventory" data-instance="${craftedInstance.id}">所持品で確認</button></section>` : "";
    const focusIds = new Set(Array.isArray(view.focusRecipeIds) ? view.focusRecipeIds : []);
    const recipes = window.Blacksmith.catalog(view).filter(recipe => !focusIds.size || focusIds.has(recipe.id));
    const unlockedTotal = window.GameData.recipes.filter(recipe => window.Blacksmith.status(recipe) !== "locked").length;
    const recipeGroups = Object.values(window.GameData.equipmentTypes).map(type => ({
      type,
      recipes: recipes.filter(recipe => equipmentTypeId(window.Blacksmith.result(recipe)) === type.id)
    })).filter(group => group.recipes.length);
    const groupsPerPage = 6, pages = Math.max(1, Math.ceil(recipeGroups.length / groupsPerPage));
    view.page = Math.min(view.page, pages - 1);
    const visibleGroups = recipeGroups.slice(view.page * groupsPerPage, (view.page + 1) * groupsPerPage);
    const visible = visibleGroups.flatMap(group => group.recipes);
    const categoryOptions = [
      ["all", "すべて"], ["weapon", "武器すべて"],
      ...Object.entries(window.GameData.derived.weaponTypes).filter(([id]) => window.GameData.recipes.some(recipe => window.Blacksmith.category(recipe) === `weapon:${id}`)).map(([id, name]) => [`weapon:${id}`, name]),
      ["armor", "防具すべて"],
      ...Object.entries(window.GameData.derived.armorTypes).filter(([id]) => window.GameData.recipes.some(recipe => window.Blacksmith.category(recipe) === `armor:${id}`)).map(([id, name]) => [`armor:${id}`, name])
    ];
    const materialIds = [...new Set(window.GameData.recipes.flatMap(recipe => Object.keys(recipe.materials)))].sort((a, b) => itemName(a).localeCompare(itemName(b), "ja"));
    const field = (key, label, entries) => `<label>${label}<select data-blacksmith-filter="${key}">${entries.map(([id, name]) => `<option value="${id}" ${view[key] === id ? "selected" : ""}>${escape(name)}</option>`).join("")}</select></label>`;
    const materialOptions = [["all", "すべて"], ...materialIds.map(id => [id, itemName(id)])];
    const statusOptions = [["all", "すべて"], ["ready", "製作可能"], ["missing", "素材・資金不足"], ["locked", "未解放"]];
    const sortOptions = [["ready", "製作可能順"], ["tierAsc", "Tierが低い順"], ["tierDesc", "Tierが高い順"], ["unlock", "解放章順"], ["name", "名前順"]];
    const label = (entries, value, fallback) => entries.find(([id]) => id === value)?.[1] || fallback;
    const filterSummary = [
      view.query ? `検索「${view.query}」` : "",
      view.category === "all" ? "全種" : label(categoryOptions, view.category, "分類"),
      view.material === "all" ? "" : label(materialOptions, view.material, "素材"),
      view.status === "all" ? "" : label(statusOptions, view.status, "製作状態"),
      label(sortOptions, view.sort, "製作可能順")
    ].filter(Boolean).join("・");
    const controls = `<details class="compact-filter-panel blacksmith-filter-panel" data-detail="blacksmith-craft-filters"><summary><strong>絞り込み・並べ替え</strong><small>${escape(filterSummary)}</small><i aria-hidden="true">›</i></summary><form id="blacksmith-search-form" class="blacksmith-controls"><label class="blacksmith-search">検索<input id="blacksmith-query" value="${escape(view.query)}" placeholder="レシピ・完成品・素材名"></label>${field("category", "分類", categoryOptions)}${field("material", "使用素材", materialOptions)}${field("status", "製作状態", statusOptions)}${field("sort", "並べ替え", sortOptions)}<button class="button secondary" type="submit">検索</button><button class="button ghost" type="button" data-action="reset-blacksmith-filters">解除</button></form></details>`;
    function recipeCard(recipe) {
      const item = window.Blacksmith.result(recipe), state = window.Blacksmith.status(recipe), ready = state === "ready";
      const typeId = item.weaponType || item.armorType, typeName = window.GameData.equipmentTypes[typeId]?.name || "装備";
      const range = item.type === "weapon" ? ` · ${item.range === "ranged" ? "遠距離" : "近接"}` : "";
      const materials = Object.entries(recipe.materials).map(([id, quantity]) => {
        const owned = window.Items.count(id), enough = owned >= quantity, shortage = Math.max(0, quantity - owned);
        const target = !enough && state !== "locked" ? `<button class="button ghost recipe-target-button" type="button" data-action="track-recipe-material" data-item="${id}" data-target-quantity="${shortage}">不足${shortage}個を探索目標</button>` : "";
        return `<span class="material-need ${enough ? "met" : "missing"}"><span>${escape(itemName(id))}<small>入手先：${escape(window.Blacksmith.materialSources(id).join("・") || "装備の分解")}</small></span><strong>${owned}/${quantity}</strong>${target}</span>`;
      }).join("");
      const skillNames = window.EquipmentSkills.pool(item).map(id => window.GameData.equipmentSkills[id]?.name).filter(Boolean);
      const skillPreview = `<div class="recipe-skill-pool"><strong>この装備の固有スキル</strong><p>${skillNames.map(name => `<span>${escape(name)}</span>`).join("") || "なし"}</p><small>製作品にも必ず同じスキルが付きます。強化段階に応じた武器種・防具種スキルは別に追加されます。</small></div>`;
      const setDefinitions = window.EquipmentSkills.setsForTemplate(item.id);
      const setPreview = setDefinitions.map(definition => {
        const knownIds = definition.itemIds.filter(id => window.Encyclopedia.item(id));
        const currentKnown = knownIds.includes(item.id), projectedCount = knownIds.length + (currentKnown ? 0 : 1);
        const next = definition.bonuses.find(bonus => bonus.count > knownIds.length);
        const revealsNext = !currentKnown && next && projectedCount >= next.count;
        const members = definition.itemIds.map(id => {
          const known = knownIds.includes(id), current = id === item.id;
          return `<span class="${known ? "is-known" : current ? "is-current" : "is-unknown"}">${known || current ? `${escape(window.GameData.items[id].icon || "◇")} ${escape(window.GameData.items[id].name)}` : "？ ？？？"}</span>`;
        }).join("");
        const guidance = knownIds.length === definition.itemIds.length
          ? "この装備組合せは全品発見済みです。"
          : revealsNext ? "この品を初めて作ると、新しい組合せ効果が判明します。"
            : !currentKnown ? "この品を初めて作ると、発見記録が1つ進みます。"
              : next ? `あと${next.count - knownIds.length}種類の異なる装備で、次の効果が判明します。` : "異なる系統品を探してみましょう。";
        return `<article class="recipe-set-preview ${knownIds.length === definition.itemIds.length ? "is-complete" : ""}"><header><span>装備組合せ</span><strong>${knownIds.length ? escape(definition.name) : "未記録の組合せ"}</strong><b>${knownIds.length}/${definition.itemIds.length}</b></header><div>${members}</div><small>${escape(guidance)}</small></article>`;
      }).join("");
      const setMark = setDefinitions.length ? '<em class="recipe-set-mark">組合せ</em>' : "";
      const locked = state === "locked";
      const label = ready ? "製作可能" : state === "missing" ? "素材不足" : "未解放";
      const focusedBadge = focusIds.has(recipe.id) && view.focusContext === "new" ? "新解放" : label;
      return `<details class="item-card compact-item shop-item-card forge-shop-card ${state} ${focusIds.has(recipe.id) ? "newly-unlocked" : ""}" data-detail="forge-recipe-${recipe.id}"><summary><span class="item-icon" aria-hidden="true">${item.icon}</span><span class="item-info"><span class="type-label">${escape(typeName)}${range} · Tier ${item.tier || 1}${setMark}</span><h3>${escape(item.name)}</h3>${forgeEquipmentStats(item)}</span><span class="item-action"><strong>${formatGold(recipe.gold)}</strong><span class="badge ${ready ? "good" : state === "missing" ? "bad" : ""}">${focusedBadge}</span><i class="record-chevron" aria-hidden="true">›</i></span></summary><div class="forge-shop-detail"><p class="recipe-source">${escape(window.Blacksmith.recipeName(recipe))}</p>${setPreview}${skillPreview}<div class="recipe-needs">${materials}<span class="material-need ${window.GameState.data.gold >= recipe.gold ? "met" : "missing"}"><span>工賃</span><strong>${formatGold(recipe.gold)}</strong></span></div>${locked ? `<p class="story-lock-condition">${escape(window.Story.recipeCondition(recipe))}</p><button class="button ghost full" data-nav="home">物語の依頼を確認</button>` : `<button class="button primary full" data-action="craft" data-recipe="${recipe.id}" ${ready ? "" : "disabled"}>${ready ? "この装備を製作する" : "素材または所持金が不足"}</button>`}</div></details>`;
    }
    const catalogEntries = visible.map(recipe => ({ recipe, item: window.Blacksmith.result(recipe) }));
    const futureRecipes = type => {
      const hidden = window.Blacksmith.hiddenLockedCount(`${type.category}:${type.id}`);
      return hidden ? `<div class="future-recipe-note"><strong>この先のレシピ ${hidden}件</strong><span>物語を進めると、次の1件が表示されます。</span></div>` : "";
    };
    const catalog = `<div class="blacksmith-shop-sections">${groupedEquipment(catalogEntries, entry => recipeCard(entry.recipe), "条件に一致するレシピがありません。", futureRecipes, { detailPrefix: "blacksmith-craft" })}</div>`;
    const focusReady = recipes.filter(recipe => window.Blacksmith.status(recipe) === "ready").length;
    const focusMissing = recipes.filter(recipe => window.Blacksmith.status(recipe) === "missing").length;
    const focusSummary = view.focusContext === "target" ? `<div class="recipe-focus-summary"><span class="${focusReady ? "ready" : "muted"}">製作可能 ${focusReady}件</span><span class="${focusMissing ? "missing" : "muted"}">素材・資金不足 ${focusMissing}件</span></div>` : "";
    const focusNotice = focusIds.size ? `<div class="notice recipe-focus-notice"><span class="notice-icon">⚒</span><div><strong>${view.focusContext === "target" ? `探索目標に関係する${recipes.length}件を表示中` : `今回解放された${recipes.length}件を表示中`}</strong><p>${view.focusContext === "target" ? "集めた素材を使う、解放済みの製作記録です。製作可能な品を先に並べています。" : "探索結果から追加された製作記録です。"}</p>${focusSummary}</div><button class="button ghost" type="button" data-action="reset-blacksmith-filters">すべてのレシピを見る</button></div>` : "";
    return `<div class="page-intro"><p>解放済みの品と、装備種別ごとに次に解放される1件を表示します。同じ種別のレシピは同じ枠にまとまります。完成品の品質は製作時に決まり、性能倍率は1〜5倍です。</p><div class="wallet">所持金 <strong>${formatGold(window.GameState.data.gold)}</strong></div></div>${craftedNotice}${focusNotice}${controls}<section class="panel forge-catalog"><div class="section-heading"><div><span class="label">RECIPES</span><h3>製作レシピ</h3></div><strong>解放 ${unlockedTotal}/${window.GameData.recipes.length}件</strong></div>${catalog}<nav class="pagination" aria-label="レシピ種別のページ"><button class="button ghost" data-action="recipe-page" data-page="${view.page - 1}" ${view.page === 0 ? "disabled" : ""}>前へ</button><span>${view.page + 1}/${pages}ページ · ${recipeGroups.length}種・${recipes.length}件</span><button class="button ghost" data-action="recipe-page" data-page="${view.page + 1}" ${view.page >= pages - 1 ? "disabled" : ""}>次へ</button></nav></section>`;
  }

  window.GameUIViews.catalog = { blacksmith, blacksmithMenu, shop, upgrades };
})();
