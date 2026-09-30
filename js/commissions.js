(function () {
  "use strict";
  function state() { return window.GameState.data.commissions; }
  function recordResult(result, counts) {
    const current = state();
    window.GameData.commissions.filter(quest => quest.dungeonId === result.dungeonId).forEach(quest => {
      if (current.claimed.includes(quest.id)) return;
      // Long expeditions retain actual kill reports, but receive fewer quest credits.
      const gained = quest.type === "clear" ? (result.success ? 1 : 0) : Math.floor((counts[quest.monsterId] || 0) / (result.timeMultiplier || 1));
      current.progress[quest.id] = Math.min(quest.target, (current.progress[quest.id] || 0) + gained);
    });
  }
  function claim(id) {
    const current = state(), quest = window.GameData.commissions.find(quest => quest.id === id);
    if (!quest || !window.Story.canEnter(quest.dungeonId)) return { ok: false, message: "この依頼は未解放です。" };
    if (current.claimed.includes(id)) return { ok: false, message: "この報酬は受け取り済みです。" };
    if ((current.progress[id] || 0) < quest.target) return { ok: false, message: "まだ依頼を達成していません。" };
    current.claimed.push(id);
    window.GameState.data.gold += quest.rewards.gold;
    Object.entries(quest.rewards.materials).forEach(([itemId, quantity]) => window.Items.add(itemId, quantity));
    const materials = Object.entries(quest.rewards.materials).map(([itemId, quantity]) => `${window.GameData.items[itemId].name}×${quantity}`).join("、");
    window.GameState.addLog(`依頼「${quest.title}」の報酬を受け取りました。${quest.rewards.gold}G、${materials}を獲得。`, "success");
    window.GameState.save();
    return { ok: true, message: `「${quest.title}」の報酬を受け取りました。` };
  }
  function readyCount() {
    const current = state();
    return window.GameData.commissions.filter(quest => window.Story.canEnter(quest.dungeonId)
      && !current.claimed.includes(quest.id) && (current.progress[quest.id] || 0) >= quest.target).length;
  }
  window.Commissions = { state, recordResult, claim, readyCount };
})();
