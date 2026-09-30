(function () {
  "use strict";

  const config = () => window.GameData.shop?.daily || {
    version: 1, offerCount: 10, resetHour: 4, priceRoundTo: 10,
    baseMarkup: 1.25, modifierWeights: {}, skillMarkup: .08
  };
  function dailyState() { return window.GameState.data.dailyShop; }
  const pad = value => String(value).padStart(2, "0");

  function dateKey(milliseconds = window.GameRuntime.now()) {
    const date = new Date(milliseconds - config().resetHour * 60 * 60 * 1000);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function hash(text) {
    let value = 2166136261;
    for (let index = 0; index < text.length; index += 1) value = Math.imul(value ^ text.charCodeAt(index), 16777619);
    return value >>> 0;
  }

  function knownEquipmentIds() {
    return Object.keys(window.GameState.data.encyclopedia.items || {}).filter(id => {
      const item = window.GameData.items[id];
      const acquired = window.Encyclopedia ? window.Encyclopedia.item(id) : window.GameState.data.encyclopedia.items[id];
      return item && ["weapon", "armor"].includes(item.type) && acquired > 0;
    }).sort();
  }

  function shuffled(values, random) {
    const result = values.slice();
    for (let index = result.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
  }

  function dailyPrice(instance) {
    const settings = config(), base = window.Items.template(instance.templateId), grade = window.Items.quality(instance);
    const modifierValue = Object.entries(instance.modifiers || {}).reduce((total, [key, value]) => total + Math.max(0, Number(value) || 0) * (settings.modifierWeights[key] || 1), 0);
    const skillMultiplier = 1 + window.EquipmentSkills.ids(instance).length * settings.skillMarkup;
    const raw = (base.price * grade.valueMultiplier * settings.baseMarkup + modifierValue) * skillMultiplier;
    return Math.max(settings.priceRoundTo, Math.ceil(raw / settings.priceRoundTo) * settings.priceRoundTo);
  }

  function createOffers(key) {
    const ids = knownEquipmentIds();
    if (!ids.length) return [];
    const random = window.GameRuntime.seededRandom(hash(`daily-shop:${key}:${ids.join(",")}`));
    const ordered = shuffled(ids, random), offers = [];
    for (let index = 0; index < config().offerCount; index += 1) {
      // 発見済みが10種類未満なら、同じ装備の別性能を並べて常に10枠を保つ。
      const templateId = ordered[index % ordered.length];
      const rolled = window.Items.rollInstance(templateId, { source: "daily_shop", random });
      const offer = Object.assign({}, rolled, { id: `daily-${key}-${index + 1}`, price: 0, purchased: false });
      offer.price = dailyPrice(offer);
      offers.push(offer);
    }
    return offers;
  }

  function sync(milliseconds = window.GameRuntime.now()) {
    const key = dateKey(milliseconds), current = dailyState();
    if (current.dateKey === key && current.offers.length === config().offerCount) return false;
    current.version = config().version;
    current.dateKey = key;
    current.offers = createOffers(key);
    return true;
  }

  function dailyStock() { return dailyState().offers; }

  function buyDaily(offerId) {
    sync();
    const offer = dailyStock().find(entry => entry.id === offerId);
    if (!offer) return { ok: false, message: "この日替わり商品は販売されていません。" };
    if (offer.purchased) return { ok: false, message: "この商品は売り切れです。" };
    if (window.GameState.data.gold < offer.price) return { ok: false, message: "所持金が足りません。" };
    window.GameState.data.gold -= offer.price;
    const result = window.Items.add(offer.templateId, 1, {
      source: "daily_shop", qualityId: offer.qualityId,
      ultraRareTitleId: offer.ultraRareTitleId,
      modifiers: Object.assign({}, offer.modifiers)
    });
    const instance = result.instances[0];
    if (!instance) return { ok: false, message: "日替わり商品を受け取れませんでした。" };
    offer.purchased = true;
    if (window.RecurringMissions) window.RecurringMissions.record("shop_purchase");
    window.GameState.addLog(`日替わり商品「${window.Items.displayName(instance)}」を${offer.price}Gで購入しました。`, "success");
    window.GameState.save();
    return { ok: true, message: `${window.Items.displayName(instance)}を購入しました。`, instance };
  }

  function buy(itemId) {
    if (!Object.prototype.hasOwnProperty.call(window.GameData.items, itemId)) return { ok: false, message: "この品は購入できません。" };
    const item = window.GameData.items[itemId];
    const state = window.GameState.data;
    if (!item || item.type === "material" || item.unique || item.craftOnly || item.dropOnly) return { ok: false, message: "この品は購入できません。" };
    if (state.gold < item.price) return { ok: false, message: "所持金が足りません。" };
    state.gold -= item.price;
    const instance = window.Items.add(itemId, 1, { source: "shop" }).instances[0];
    if (window.RecurringMissions) window.RecurringMissions.record("shop_purchase");
    window.GameState.addLog(`商店で${window.Items.displayName(instance)}を購入しました。`, "success");
    window.GameState.save();
    return { ok: true, message: `${window.Items.displayName(instance)}を購入しました。`, instance };
  }

  window.Shop = { buy, buyDaily, dailyStock, dailyPrice, knownEquipmentIds, dateKey, sync };
})();
