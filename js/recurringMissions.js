(function () {
  "use strict";

  const definitions = () => window.GameData.config.recurringMissions.groups;
  const state = () => window.GameState.data.recurringMissions;
  const pad = value => String(value).padStart(2, "0");

  function shiftedDate(milliseconds, resetHour) {
    return new Date(milliseconds - (resetHour || 0) * 60 * 60 * 1000);
  }

  function periodKey(group, milliseconds = window.GameRuntime.now()) {
    const date = shiftedDate(milliseconds, group.schedule.resetHour);
    if (group.schedule.type === "daily") return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    if (group.schedule.type === "weekly") {
      const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const day = monday.getDay() || 7;
      monday.setDate(monday.getDate() - day + 1);
      return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
    }
    throw new Error(`未対応の定期依頼周期です: ${group.schedule.type}`);
  }

  function hash(text) {
    let value = 2166136261;
    for (let index = 0; index < text.length; index += 1) value = Math.imul(value ^ text.charCodeAt(index), 16777619);
    return value >>> 0;
  }

  function selectedIds(group, key) {
    const candidates = group.missions.map(mission => mission.id);
    const count = Math.min(group.selection.count, candidates.length);
    if (group.selection.strategy === "all" || count === candidates.length) return candidates;
    const pinned = (group.selection.pinnedIds || []).filter(id => candidates.includes(id)).slice(0, count);
    const random = candidates.filter(id => !pinned.includes(id)).map(id => ({ id, order: hash(`${group.id}:${key}:${id}`) }))
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)).slice(0, count - pinned.length).map(entry => entry.id);
    return pinned.concat(random);
  }

  function createCycle(group, key) {
    return { periodKey: key, selectedIds: selectedIds(group, key), progress: {}, claimed: [] };
  }

  function initialState(milliseconds = window.GameRuntime.now()) {
    const result = { version: 1, groups: {} };
    definitions().forEach(group => {
      const current = createCycle(group, periodKey(group, milliseconds));
      group.missions.filter(entry => current.selectedIds.includes(entry.id) && entry.trigger === "login").forEach(entry => { current.progress[entry.id] = entry.target; });
      result.groups[group.id] = current;
    });
    return result;
  }

  function groupDefinition(groupId) { return definitions().find(group => group.id === groupId); }
  function cycle(groupId) { return state().groups[groupId]; }
  function mission(group, missionId) { return group.missions.find(entry => entry.id === missionId); }

  function sync(milliseconds = window.GameRuntime.now()) {
    let changed = false;
    definitions().forEach(group => {
      const key = periodKey(group, milliseconds), current = cycle(group.id);
      if (!current || current.periodKey !== key) {
        state().groups[group.id] = createCycle(group, key);
        changed = true;
      }
      const loginMissions = group.missions.filter(entry => cycle(group.id).selectedIds.includes(entry.id) && entry.trigger === "login");
      loginMissions.forEach(entry => {
        if ((cycle(group.id).progress[entry.id] || 0) < entry.target) {
          cycle(group.id).progress[entry.id] = entry.target;
          changed = true;
        }
      });
    });
    return changed;
  }

  function record(trigger, amount = 1) {
    sync();
    let changed = false;
    definitions().forEach(group => group.missions.filter(entry => cycle(group.id).selectedIds.includes(entry.id) && entry.trigger === trigger).forEach(entry => {
      const before = cycle(group.id).progress[entry.id] || 0, after = Math.min(entry.target, before + amount);
      if (after !== before) { cycle(group.id).progress[entry.id] = after; changed = true; }
    }));
    return changed;
  }

  function ready(groupId, entry) {
    const current = cycle(groupId);
    return current.selectedIds.includes(entry.id) && !current.claimed.includes(entry.id) && (current.progress[entry.id] || 0) >= entry.target;
  }

  function grant(groupId, entry) {
    cycle(groupId).claimed.push(entry.id);
    window.GameState.data.gold += entry.rewards.gold || 0;
    Object.entries(entry.rewards.materials || {}).forEach(([itemId, quantity]) => window.Items.add(itemId, quantity));
  }

  function claim(groupId, missionId) {
    sync();
    const group = groupDefinition(groupId), entry = group && mission(group, missionId), current = cycle(groupId);
    if (!group || !entry || !current?.selectedIds.includes(missionId)) return { ok: false, message: "定期依頼が見つかりません。" };
    if (current.claimed.includes(missionId)) return { ok: false, message: "この依頼報酬は受け取り済みです。" };
    if (!ready(groupId, entry)) return { ok: false, message: "まだ依頼を達成していません。" };
    grant(groupId, entry);
    window.GameState.addLog(`${group.name}「${entry.title}」の報酬を受け取りました。`, "success");
    window.GameState.save();
    return { ok: true, message: `「${entry.title}」の報酬を受け取りました。` };
  }

  function claimAll(groupId) {
    sync();
    const group = groupDefinition(groupId);
    if (!group) return { ok: false, message: "定期依頼の区分が見つかりません。" };
    const entries = group.missions.filter(entry => ready(groupId, entry));
    if (!entries.length) return { ok: false, message: "受け取れる依頼報酬はありません。" };
    entries.forEach(entry => grant(groupId, entry));
    window.GameState.addLog(`${group.name}${entries.length}件の報酬をまとめて受け取りました。`, "success");
    window.GameState.save();
    return { ok: true, message: `${group.name}の報酬${entries.length}件を受け取りました。` };
  }

  function active(groupId) {
    const group = groupDefinition(groupId), current = cycle(groupId);
    return group && current ? current.selectedIds.map(id => mission(group, id)).filter(Boolean) : [];
  }

  function readyCount() {
    return definitions().reduce((total, group) => total + active(group.id).filter(entry => ready(group.id, entry)).length, 0);
  }

  window.RecurringMissions = { initialState, state, definitions, periodKey, selectionFor: selectedIds, sync, record, ready, readyCount, claim, claimAll, active };
})();
