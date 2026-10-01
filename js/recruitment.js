(function () {
  "use strict";
  const data = () => window.GameData.recruitment;
  const defaultActionRates = () => Object.assign({}, window.GameData.combatRules.defaultActionRates);
  function state() { return window.GameState.data.recruitment; }
  function unlocked(field) { return !field.unlockAfter || window.GameState.data.story.completed.includes(field.unlockAfter); }
  function entryUnlocked(entry) { return !entry.unlockAfter || window.GameState.data.story.completed.includes(entry.unlockAfter); }
  function availableIds(table) { return Object.values(window.GameData[table]).filter(entryUnlocked).map(entry => entry.id); }
  function normalize(requirements) {
    const normalized = {};
    for (const field of data().fields) {
      const value = requirements[field.id] || "any";
      if (value !== "any" && (!unlocked(field) || !Object.prototype.hasOwnProperty.call(window.GameData[field.table], value) || !entryUnlocked(window.GameData[field.table][value]))) return null;
      normalized[field.id] = value;
    }
    return normalized;
  }
  function pick(random, values) { return values[Math.floor(random() * values.length)]; }
  function randomName(random) {
    const gender = pick(random, Object.keys(data().names));
    const culture = pick(random, Object.keys(data().names[gender]));
    return { gender, culture, name: pick(random, data().names[gender][culture]) };
  }
  function prefer(random, values, desired) {
    if (desired === "any") return pick(random, values);
    return random() < data().matchChance ? desired : pick(random, values.filter(value => value !== desired));
  }
  function preview(applicant) {
    return Object.assign({}, applicant, { level: 1, exp: 0, equipment: [], actionRates: defaultActionRates() });
  }
  function costBreakdown(applicant) {
    const pricing = data().pricing;
    const job = pricing.jobCosts[applicant.jobId] || 0;
    const race = pricing.raceCosts[applicant.raceId] || 0;
    const ability = Object.keys(pricing.abilityWeights).reduce((total, key) => {
      const amount = Math.max(0, (applicant.base[key] || 0) - pricing.abilityBaselines[key]);
      return total + amount * pricing.abilityWeights[key];
    }, 0);
    const raw = pricing.base + job + race + ability;
    const total = Math.ceil(raw / pricing.roundTo) * pricing.roundTo;
    return { base: pricing.base, job, race, ability, total };
  }
  function cost(applicant) { return costBreakdown(applicant).total; }
  function postingQuote(requirements = {}) {
    const normalized = normalize(requirements);
    if (!normalized) return null;
    const config = data().postingCost;
    const selections = Object.values(normalized).filter(value => value !== "any").length;
    const bracket = config.brackets.find(entry => selections <= entry.maximumSelections) || config.brackets[config.brackets.length - 1];
    const quantity = config.baseQuantity + selections * config.quantityPerSelection;
    const owned = window.Items.count(config.itemId);
    return { itemId: config.itemId, selections, quantity, applicants: bracket.applicants.slice(), owned, affordable: owned >= quantity };
  }
  function requirementPreview(requirements = {}) {
    const normalized = normalize(requirements);
    if (!normalized) return null;
    const sourceTypes = { jobId: "job", raceId: "race", birthId: "birth" };
    const sources = Object.entries(sourceTypes).filter(([fieldId]) => normalized[fieldId] !== "any").map(([fieldId, type]) => {
      const field = data().fields.find(entry => entry.id === fieldId), selected = window.GameData[field.table][normalized[fieldId]];
      return {
        type, id: selected.id, fieldName: field.name, name: selected.name, description: selected.description || "",
        skills: (window.GameData.skillGrants[type][selected.id] || []).map(grant => {
          const skill = window.GameData.skills[grant.skillId];
          return { id: grant.skillId, name: skill.name, description: skill.description, category: skill.category, initial: Boolean(grant.initial), level: grant.level };
        })
      };
    });
    const talent = normalized.focus === "any" ? null : window.GameData.recruitmentTalents[normalized.focus];
    return { selections: Object.values(normalized).filter(value => value !== "any").length, sources, talent };
  }
  function post(requirements = {}) {
    if (state().pending) return { ok: false, message: "応募者を1人雇用するか、全員を見送ってから再募集してください。" };
    const normalized = normalize(requirements);
    if (!normalized) return { ok: false, message: "未解放または不正な募集条件です。" };
    const quote = postingQuote(normalized);
    const materialName = window.GameData.items[quote.itemId].name;
    if (!quote.affordable) return { ok: false, message: `募集には${materialName}×${quote.quantity}が必要です。所持数が不足しています。` };
    window.Items.remove(quote.itemId, quote.quantity);
    const seed = Math.floor(window.GameRuntime.random() * 2147483646) + 1;
    const random = window.GameRuntime.seededRandom(seed);
    const count = quote.applicants[0] + Math.floor(random() * (quote.applicants[1] - quote.applicants[0] + 1)), number = state().nextId++;
    const candidates = Array.from({ length: count }, (_, index) => {
      const jobId = prefer(random, availableIds("jobs"), normalized.jobId);
      const talentId = prefer(random, Object.keys(window.GameData.recruitmentTalents), normalized.focus);
      const identity = randomName(random);
      const base = { hp: 45 + Math.floor(random() * 13), attack: 8 + Math.floor(random() * 5), defense: 6 + Math.floor(random() * 5) };
      Object.entries(window.GameData.recruitmentTalents[talentId].bonus).forEach(([key, value]) => { base[key] += value; });
      const candidate = {
        id: `applicant-${number}-${index + 1}`, name: identity.name, gender: identity.gender, nameCulture: identity.culture, jobId,
        raceId: prefer(random, availableIds("races"), normalized.raceId),
        birthId: prefer(random, availableIds("births"), normalized.birthId),
        talentId, base
      };
      candidate.portraitId = window.Characters.portraitId(candidate, random);
      return candidate;
    });
    // 必須の回復役などを募集できず、進行が運任せにならないようにする。
    if (normalized.jobId !== "any" && !candidates.some(candidate => candidate.jobId === normalized.jobId)) {
      const candidate = pick(random, candidates);
      candidate.jobId = normalized.jobId;
      candidate.portraitId = window.Characters.portraitId(candidate, random);
    }
    state().pending = { id: `recruitment-${number}`, createdAt: window.GameRuntime.now(), seed, requirements: normalized, candidates };
    window.GameState.addLog(`${materialName}×${quote.quantity}を使った募集に${count}人の冒険者が応募しました。`, "info");
    window.GameState.save();
    return { ok: true, cost: { itemId: quote.itemId, quantity: quote.quantity }, message: `${count}人が応募しました。能力と適性を比べて1人を選んでください。` };
  }
  function hire(applicantId, name) {
    const pending = state().pending;
    const applicant = pending && pending.candidates.find(candidate => candidate.id === applicantId);
    if (!applicant) return { ok: false, message: "この応募者はもう選べません。" };
    const cleanName = name === undefined ? applicant.name : String(name).trim().slice(0, 16);
    if (!cleanName) return { ok: false, message: "名前を入力してください。" };
    const game = window.GameState.data;
    const hiringCost = cost(applicant);
    if (game.gold < hiringCost) return { ok: false, message: `雇用には${hiringCost}G必要です。所持金が不足しています。` };
    game.gold -= hiringCost;
    const id = `adventurer-${game.meta.nextCharacterId++}`;
    game.characters.push({
      id, name: cleanName, gender: applicant.gender, nameCulture: applicant.nameCulture,
      jobId: applicant.jobId, raceId: applicant.raceId, birthId: applicant.birthId,
      portraitId: applicant.portraitId, talentId: applicant.talentId,
      recruitmentId: pending.id, level: 1, exp: 0, base: Object.assign({}, applicant.base),
      actionRates: defaultActionRates(), equipment: [], career: null, createdAt: window.GameRuntime.now()
    });
    state().pending = null;
    window.GameState.addLog(`${window.GameData.jobs[applicant.jobId].name}の${cleanName}を${hiringCost}Gで雇用しました。ほかの応募者は退出しました。`, "success");
    window.GameState.save();
    return { ok: true, id, cost: hiringCost, message: `${cleanName}を${hiringCost}Gで雇用しました。` };
  }
  function dismiss() {
    if (!state().pending) return { ok: false, message: "見送る応募者はいません。" };
    state().pending = null;
    window.GameState.addLog("今回の応募者を全員見送りました。新しい募集を出せます。", "info");
    window.GameState.save();
    return { ok: true, message: "全員を見送りました。" };
  }
  window.Recruitment = { post, hire, dismiss, state, unlocked, entryUnlocked, availableIds, normalize, preview, cost, costBreakdown, postingQuote, requirementPreview };
})();
