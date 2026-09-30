(function () {
  "use strict";
  const slots = () => window.GameState.data.presets.slots;
  const validSlot = slot => Number.isInteger(slot) && slot >= 0 && slot < 6;
  const validParty = index => Number.isInteger(index) && index >= 0 && index < window.Party.limit();
  function save(slot, name, partyIndex = window.Party.selected()) {
    if (!validSlot(slot) || !validParty(partyIndex)) return { ok: false, message: "保存枠またはパーティが不正です。" };
    if (window.Party.expedition(partyIndex)) return { ok: false, message: "探索中のパーティは保存できません。" };
    const members = window.Party.members(partyIndex), cleanName = String(name || "").trim();
    if (!cleanName || cleanName.length > 24) return { ok: false, message: "名前は1〜24文字で入力してください。" };
    if (!members.length) return { ok: false, message: "パーティを編成してから保存してください。" };
    if (members.length > window.Party.memberLimit()) return { ok: false, message: "現在の人数上限を超えています。" };
    slots()[slot] = { name: cleanName, savedAt: window.GameRuntime.now(), members: members.map(member => ({
      characterId: member.id, equipment: [...member.equipment],
      actionRates: window.Characters.actionRates(member)
    })) };
    window.GameState.save();
    return { ok: true, message: `「${cleanName}」を保存しました。` };
  }
  function check(slot, partyIndex = window.Party.selected()) {
    if (!validSlot(slot) || !validParty(partyIndex)) return { ok: false, message: "保存枠またはパーティが不正です。" };
    const preset = slots()[slot];
    if (!preset) return { ok: false, message: "この枠は未保存です。" };
    if (preset.members.length > window.Party.memberLimit()) return { ok: false, message: `現在は${window.Party.memberLimit()}人まで編成できます。物語を進めてください。` };
    if (window.Party.expedition(partyIndex)) return { ok: false, message: "探索中のパーティには呼び出せません。" };
    const ids = preset.members.map(member => member.characterId), used = new Set();
    for (const entry of preset.members) {
      const character = window.Characters.get(entry.characterId);
      if (!character) return { ok: false, message: `冒険者 ${entry.characterId} が見つかりません。` };
      if (window.GameState.data.parties.some((party, index) => index !== partyIndex && party.includes(character.id)) || window.GameState.data.expeditions.some(entry => entry?.partyIds.includes(character.id))) return { ok: false, message: `${character.name}が別パーティ所属、または探索中です。` };
      let weight = 0;
      for (const id of entry.equipment) {
        const item = window.Items.getInstance(id);
        if (!item) return { ok: false, message: `${character.name}の装備（${id}）がありません。売却・分解後は保存し直してください。` };
        if (used.has(id)) return { ok: false, message: "装備の重複・種類が不正です。" };
        used.add(id);
        const owner = window.Items.equippedBy(id);
        if (owner && !ids.includes(owner.id)) return { ok: false, message: `${window.Items.displayName(item)}は${owner.name}が装備中です。先に外してください。` };
        weight += window.Items.effects(item).weight;
      }
      if (weight > window.Characters.maxWeight(character) + .001) return { ok: false, message: `${character.name}の装備が重量超過です。` };
    }
    return { ok: true, message: "呼び出し可能です。" };
  }
  function apply(slot, partyIndex = window.Party.selected()) {
    const result = check(slot, partyIndex);
    if (!result.ok) return result;
    const preset = slots()[slot];
    // All checks precede changes; participant-to-participant swaps are applied together.
    preset.members.forEach(entry => {
      const character = window.Characters.get(entry.characterId);
      character.equipment = [...entry.equipment];
      character.actionRates = Object.assign({}, entry.actionRates);
    });
    window.GameState.data.parties[partyIndex] = preset.members.map(entry => entry.characterId);
    window.GameState.addLog(`第${partyIndex + 1}パーティへ「${preset.name}」を呼び出しました。`, "info");
    window.GameState.save();
    return { ok: true, message: `「${preset.name}」を呼び出しました。` };
  }
  function remove(slot) {
    if (!validSlot(slot) || !slots()[slot]) return { ok: false, message: "削除する保存枠がありません。" };
    slots()[slot] = null;
    window.GameState.save();
    return { ok: true, message: "プリセットを削除しました。冒険者・装備は残っています。" };
  }
  window.Presets = { save, check, apply, remove, slots };
})();
