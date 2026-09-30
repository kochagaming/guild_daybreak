(function () {
  "use strict";

  window.GameUIViews = window.GameUIViews || {};

  function equipmentTypeId(item) { return item.weaponType || item.armorType; }

  function groupedEquipment(entries, renderEntry, emptyText) {
    const groups = Object.values(window.GameData.equipmentTypes).map(type => ({
      type,
      entries: entries.filter(entry => equipmentTypeId(entry.item || entry) === type.id)
    })).filter(group => group.entries.length);
    if (!groups.length) return `<p class="empty-line">${emptyText}</p>`;
    return `<div class="equipment-type-groups">${groups.map(group => `<details class="equipment-type-group"><summary><span><strong>${group.type.name}</strong><small>（${group.type.summary || (group.type.category === "weapon" ? "武器" : "防具")}）</small></span><span class="equipment-type-count">${group.entries.length}点</span><i class="record-chevron" aria-hidden="true">›</i></summary><div class="equipment-type-products item-list">${group.entries.map(renderEntry).join("")}</div></details>`).join("")}</div>`;
  }

  function shop(context) {
    const goods = Object.values(window.GameData.items).filter(item => item.type !== "material" && !item.unique && !item.craftOnly && !item.dropOnly);
    const dailyGoods = window.Shop.dailyStock().map(offer => {
      const base = window.Items.template(offer.templateId), effect = window.Items.effects(offer);
      return Object.assign({}, base, effect, {
        offerId: offer.id,
        name: window.Items.displayName(offer),
        price: offer.price,
        purchased: offer.purchased,
        skillIds: window.EquipmentSkills.ids(offer)
      });
    });
    const daily = `<section class="daily-shop-section"><div class="section-heading"><div><span class="label">DAILY MARKET</span><h3>日替わり商品</h3></div><span class="badge">毎日4:00更新</span></div><p class="small-note">一度でも入手した装備から、性能の異なる10点が並びます。各商品は1日1点限りです。</p>${groupedEquipment(dailyGoods, item => context.itemCard(item, "dailyShop"), "日替わり商品はありません")}</section>`;
    const standard = groupedEquipment(goods, item => context.itemCard(item, "shop"), "販売中の装備はありません");
    return `<div class="page-intro"><p>装備種別を開くと、その種別の特徴と販売中の品を確認できます。</p><div class="wallet">所持金 <strong>${context.formatGold(window.GameState.data.gold)}</strong></div></div><div class="shop-sections">${daily}<section class="standard-shop-section"><div class="section-heading"><div><span class="label">STANDARD STOCK</span><h3>通常商品</h3></div><strong>${goods.length}点</strong></div>${standard}</section></div>`;
  }

  function upgrades(context) {
    const { escape, forgeEquipmentStats, formatGold, itemName } = context;
    const maximum = window.Upgrades.limit();
    const limits = window.GameData.upgrades.limits.map(entry => {
      const chapter = window.GameData.storyChapters.find(candidate => candidate.id === entry.chapterId);
      return `${chapter.title.split("：")[0]}：＋${entry.maximum}${window.GameState.data.story.completed.includes(entry.chapterId) ? "（解放済み）" : ""}`;
    }).join(" ／ ");
    const equipment = window.GameState.data.inventory.equipment;
    return `<section class="panel upgrade-panel"><h3>装備強化</h3><p>現在の上限：＋${maximum}。${escape(limits)}</p><p class="small-note">成功率100%。武器は1段階ごとに攻撃＋2、杖はさらに魔法攻撃・魔法回復＋2、防具は防御・魔法防御＋2・HP＋3。重量・品質・追加性能・固有效果は変わりません。ロック中の品も強化できます。</p>${equipment.length ? `<div class="commission-grid">${equipment.map(item => {
      const quote = window.Upgrades.quote(item.id), owner = window.Items.equippedBy(item.id);
      const capped = quote.level >= quote.maximum;
      const comparison = ["attack", "defense", "hp", "magicAttack", "magicDefense", "magicHealing"].filter(key => Number(quote.before[key] || 0) !== 0 || Number(quote.after[key] || 0) !== 0).map(key => `${{ attack: "攻撃", defense: "防御", hp: "HP", magicAttack: "魔法攻撃", magicDefense: "魔法防御", magicHealing: "魔法回復" }[key]} ${quote.before[key]} → ${quote.after[key]}`).join(" ／ ");
      const cost = Object.entries(quote.materials).map(([id, quantity]) => `${itemName(id)} ${window.Items.count(id)}/${quantity}`).join("・");
      const learned = quote.addedSkills.length ? `<p class="upgrade-skill-unlock">新たな装備スキル：${quote.addedSkills.map(skill => escape(skill.name)).join("、")}</p>` : "";
      return `<details class="commission-card compact-record upgrade-record"><summary class="record-summary"><span class="record-name"><strong>${escape(window.Items.displayName(item))}</strong><small>${owner ? `${escape(owner.name)}が装備中` : "未装備"}${item.locked ? "・ロック中" : ""}</small>${forgeEquipmentStats(quote.before)}</span><span class="record-stats"><b>＋${quote.level}</b><b>${capped ? "上限到達" : `次 ＋${quote.next}`}</b></span><span class="record-chevron" aria-hidden="true">›</span></summary><div class="record-detail">${capped ? "" : `<p>${escape(comparison)}</p>${learned}<p>必要：${formatGold(quote.gold)}・${escape(cost)}</p>`}<p class="small-note">${escape(quote.message)}</p><button class="button secondary" data-action="request-upgrade" data-instance="${item.id}" ${quote.ok ? "" : "disabled"}>${capped ? "上限到達" : "強化内容を確認"}</button></div></details>`;
    }).join("")}</div>` : `<p>装備を入手すると強化できます。</p>`}</section>`;
  }

  function blacksmith(context) {
    const { escape, forgeEquipmentStats, formatGold, itemName, blacksmithView: view } = context;
    const recipes = window.Blacksmith.query(view);
    const pageSize = 12, pages = Math.max(1, Math.ceil(recipes.length / pageSize));
    view.page = Math.min(view.page, pages - 1);
    const visible = recipes.slice(view.page * pageSize, (view.page + 1) * pageSize);
    const categoryOptions = [
      ["all", "すべて"], ["weapon", "武器すべて"],
      ...Object.entries(window.GameData.weaponTypes).filter(([id]) => window.GameData.recipes.some(recipe => window.Blacksmith.category(recipe) === `weapon:${id}`)).map(([id, name]) => [`weapon:${id}`, name]),
      ["armor", "防具すべて"],
      ...Object.entries(window.GameData.armorTypes).filter(([id]) => window.GameData.recipes.some(recipe => window.Blacksmith.category(recipe) === `armor:${id}`)).map(([id, name]) => [`armor:${id}`, name])
    ];
    const materialIds = [...new Set(window.GameData.recipes.flatMap(recipe => Object.keys(recipe.materials)))].sort((a, b) => itemName(a).localeCompare(itemName(b), "ja"));
    const field = (key, label, entries) => `<label>${label}<select data-blacksmith-filter="${key}">${entries.map(([id, name]) => `<option value="${id}" ${view[key] === id ? "selected" : ""}>${escape(name)}</option>`).join("")}</select></label>`;
    const controls = `<form id="blacksmith-search-form" class="blacksmith-controls"><label class="blacksmith-search">検索<input id="blacksmith-query" value="${escape(view.query)}" placeholder="レシピ・完成品・素材名"></label>${field("category", "分類", categoryOptions)}${field("material", "使用素材", [["all", "すべて"], ...materialIds.map(id => [id, itemName(id)])])}${field("status", "製作状態", [["all", "すべて"], ["ready", "製作可能"], ["missing", "素材・資金不足"], ["locked", "未解放"]])}${field("sort", "並べ替え", [["ready", "製作可能順"], ["tierAsc", "Tierが低い順"], ["tierDesc", "Tierが高い順"], ["unlock", "解放章順"], ["name", "名前順"]])}<button class="button secondary" type="submit">検索</button><button class="button ghost" type="button" data-action="reset-blacksmith-filters">解除</button></form>`;
    function recipeCard(recipe) {
      const item = window.Blacksmith.result(recipe), state = window.Blacksmith.status(recipe), ready = state === "ready";
      const typeId = item.weaponType || item.armorType, typeName = window.GameData.equipmentTypes[typeId]?.name || "装備";
      const range = item.type === "weapon" ? ` · ${item.range === "ranged" ? "遠距離" : "近接"}` : "";
      const materials = Object.entries(recipe.materials).map(([id, quantity]) => {
        const owned = window.Items.count(id), enough = owned >= quantity;
        return `<span class="material-need ${enough ? "met" : "missing"}"><span>${escape(itemName(id))}<small>入手先：${escape(window.Blacksmith.materialSources(id).join("・") || "装備の分解")}</small></span><strong>${owned}/${quantity}</strong></span>`;
      }).join("");
      const skillNames = window.EquipmentSkills.pool(item).map(id => window.GameData.equipmentSkills[id]?.name).filter(Boolean);
      const skillPreview = `<div class="recipe-skill-pool"><strong>この装備の固有スキル</strong><p>${skillNames.map(name => `<span>${escape(name)}</span>`).join("") || "なし"}</p><small>製作品にも必ず同じスキルが付きます。強化段階に応じた武器種・防具種スキルは別に追加されます。</small></div>`;
      const locked = state === "locked";
      const label = ready ? "製作可能" : state === "missing" ? "素材不足" : "未解放";
      return `<details class="item-card compact-item shop-item-card forge-shop-card ${state}"><summary><span class="item-icon" aria-hidden="true">${item.icon}</span><span class="item-info"><span class="type-label">${escape(typeName)}${range} · Tier ${item.tier || 1}</span><h3>${escape(item.name)}</h3>${forgeEquipmentStats(item)}</span><span class="item-action"><strong>${formatGold(recipe.gold)}</strong><span class="badge ${ready ? "good" : state === "missing" ? "bad" : ""}">${label}</span><i class="record-chevron" aria-hidden="true">›</i></span></summary><div class="forge-shop-detail"><p class="recipe-source">${escape(window.Blacksmith.recipeName(recipe))}</p>${skillPreview}<div class="recipe-needs">${materials}<span class="material-need ${window.GameState.data.gold >= recipe.gold ? "met" : "missing"}"><span>工賃</span><strong>${formatGold(recipe.gold)}</strong></span></div>${locked ? `<p class="story-lock-condition">${escape(window.Story.recipeCondition(recipe))}</p><button class="button ghost full" data-nav="home">物語の依頼を確認</button>` : `<button class="button primary full" data-action="craft" data-recipe="${recipe.id}" ${ready ? "" : "disabled"}>${ready ? "この装備を製作する" : "素材または所持金が不足"}</button>`}</div></details>`;
    }
    const catalogEntries = visible.map(recipe => ({ recipe, item: window.Blacksmith.result(recipe) }));
    const catalog = `<div class="blacksmith-shop-sections">${groupedEquipment(catalogEntries, entry => recipeCard(entry.recipe), "条件に一致するレシピがありません。")}</div>`;
    return `<div class="page-intro"><p>商店と同じように品を一覧から選び、装備種別を開いて完成品の性能と必要素材を確認できます。</p><div class="wallet">所持金 <strong>${formatGold(window.GameState.data.gold)}</strong></div></div>${controls}<section class="panel forge-catalog"><div class="section-heading"><div><span class="label">RECIPES</span><h3>製作レシピ</h3></div><strong>${recipes.length}/${window.GameData.recipes.length}件</strong></div>${catalog}<nav class="pagination" aria-label="レシピのページ"><button class="button ghost" data-action="recipe-page" data-page="${view.page - 1}" ${view.page === 0 ? "disabled" : ""}>前へ</button><span>${view.page + 1}/${pages}ページ · ${recipes.length}件</span><button class="button ghost" data-action="recipe-page" data-page="${view.page + 1}" ${view.page >= pages - 1 ? "disabled" : ""}>次へ</button></nav></section>`;
  }

  window.GameUIViews.catalog = { blacksmith, shop, upgrades };
})();
