(function () {
  "use strict";
  window.GameUIViews = window.GameUIViews || {};
  const trackIds = () => window.GameData.facilities.trackOrder;

  function duration(milliseconds) {
    const minutes = Math.round(milliseconds / 60000);
    return minutes >= 60 && minutes % 60 === 0 ? `${minutes / 60}時間` : `${minutes}分`;
  }
  function productionText(id, entry, context) {
    const parts = [];
    const rewards = entry.rewards || {};
    if (rewards.gold) parts.push(context.formatGold(rewards.gold));
    Object.entries(rewards.materials || {}).forEach(([itemId, amount]) => parts.push(`${context.itemName(itemId)}×${amount}`));
    (entry.periodicRewards || []).forEach(periodic => parts.push(`${context.itemName(periodic.itemId)}×${periodic.quantity}／${periodic.everyCycles}回`));
    return parts.join("・");
  }
  function trackValue(id, trackId, entry, context) {
    if (trackId === "production") return productionText(id, entry, context);
    return duration(trackId === "storage" ? entry.duration : entry.interval);
  }
  function costText(cost, context) {
    return Object.entries(cost || {}).map(([itemId, amount]) => {
      const owned = window.Items.count(itemId), enough = owned >= amount;
      return `<span class="facility-cost ${enough ? "" : "is-short"}">${context.escape(context.itemName(itemId))} ${owned}/${amount}</span>`;
    }).join("");
  }
  function upgradeRow(id, trackId, context) {
    const definition = window.GameData.facilities.definitions[id], meta = window.GameData.facilities.tracks[trackId];
    const state = window.GameState.data.facilities[id], currentLevel = state.levels[trackId];
    const current = definition.upgrades[trackId][currentLevel - 1], request = window.Facilities.upgradeQuote(id, trackId);
    const next = request.maximum ? null : definition.upgrades[trackId][currentLevel];
    return `<article class="facility-upgrade-row"><div class="facility-upgrade-copy"><span><strong>${meta.name}</strong><small>Lv.${currentLevel}</small></span><p>${context.escape(trackValue(id, trackId, current, context))}${next ? ` <b>→ ${context.escape(trackValue(id, trackId, next, context))}</b>` : ""}</p></div><div class="facility-upgrade-action">${request.maximum ? '<span class="badge good">最大Lv</span>' : `<div class="facility-costs">${costText(request.cost, context)}</div><button class="button secondary" data-action="upgrade-facility" data-facility="${id}" data-track="${trackId}" ${request.affordable ? "" : "disabled"}>強化</button>`}</div></article>`;
  }
  function facilityCard(id, context) {
    const definition = window.GameData.facilities.definitions[id];
    if (!window.Facilities.unlocked(id)) {
      const chapter = window.GameData.storyChapters.find(entry => entry.id === definition.unlockAfter);
      return `<section class="facility-card is-locked"><header><div><span class="label">LOCKED FACILITY</span><h4>${definition.name}</h4></div><span class="badge">未解放</span></header><p class="facility-description">${definition.description}</p><p class="small-note">${context.escape(chapter?.title || "物語")}の攻略後に利用できます。</p></section>`;
    }
    const result = window.Facilities.quote(id), profile = window.Facilities.profile(id);
    if (!result) return `<section class="facility-card"><p class="small-note">施設を準備しています。画面を更新してください。</p></section>`;
    const rewards = [result.gold ? context.formatGold(result.gold) : "", ...Object.entries(result.materials).filter(([, amount]) => amount).map(([itemId, amount]) => `${context.escape(context.itemName(itemId))}×${amount}`)].filter(Boolean).join("・") || "まだ蓄積なし";
    const fill = Math.min(100, result.storedDuration / result.capacityMs * 100);
    return `<section class="facility-card" data-facility-card="${id}" data-ticks="${result.ticks}"><header><div><span class="label">FACILITY</span><h4>${definition.name}</h4></div><span class="badge">${trackIds().length}系統</span></header><p class="facility-description">${definition.description}</p><div class="facility-production"><span>現在の生産</span><strong>${context.escape(productionText(id, profile.production, context))}</strong><small>${duration(profile.intervalMs)}ごと・最大${duration(profile.capacityMs)}</small></div><div class="progress facility-progress"><i style="width:${fill}%"></i></div><div class="facility-stock"><span>保管中</span><strong>${rewards}</strong><small>${duration(result.storedDuration)} / ${duration(result.capacityMs)} · <span data-facility-next>${result.full ? "満杯：受け取るまで生産停止" : "次の生産まで " + context.time(result.remaining)}</span></small></div><button class="button primary full" data-action="collect-facility" data-facility="${id}" ${result.storedDuration ? "" : "disabled"}>生産物を受け取る</button><div class="facility-upgrades">${trackIds().map(trackId => upgradeRow(id, trackId, context)).join("")}</div></section>`;
  }
  function facilities(context) {
    const count = window.Facilities.collectable().length;
    return `<div class="section-heading"><div><span class="label">GUILD FACILITIES</span><h3>ギルド施設</h3></div><button class="button secondary" data-action="collect-all-facilities" ${count ? "" : "disabled"}>まとめて受取${count ? `（${count}施設）` : ""}</button></div><div class="facility-grid">${window.GameData.facilities.order.map(id => facilityCard(id, context)).join("")}</div><p class="small-note">素材を使って設備を改修します。章の進行だけでは生産性能は上がりません。強化時点までに完成していた生産物は保持されますが、作業途中の時間は改修時にリセットされます。</p>`;
  }
  function page(context) {
    const state = window.GameState.data;
    return `<div class="page-grid guild-grid"><div id="facilities-panel" class="panel wide">${facilities(context)}</div><section class="panel wide"><div class="section-heading"><div><span class="label">RECENT ACTIVITY</span><h3>ギルド記録</h3></div></div><div class="log-list">${state.logs.slice(0, 5).map(log => `<div class="log-row ${log.tone}"><time>${new Date(log.at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</time><p>${context.escape(log.text)}</p></div>`).join("")}</div></section></div>`;
  }
  window.GameUIViews.guild = { facilities, page };
})();
