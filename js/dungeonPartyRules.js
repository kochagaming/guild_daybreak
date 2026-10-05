(function () {
  "use strict";

  function dungeon(source) {
    return typeof source === "string" ? window.GameData.dungeons[source] : source;
  }
  function rules(source) {
    const entry = dungeon(source);
    return entry ? window.GameData.relations?.dungeonPartyRestrictions?.[entry.id] || [] : [];
  }
  function companionIds(source) {
    return Array.from(new Set(rules(source).flatMap(rule => rule.companionIds || [])));
  }
  function raceNames(ids) { return ids.map(id => window.GameData.races[id]?.name || id); }
  function companionNames(ids) { return ids.map(id => window.Companions.definition(id)?.name || id); }
  function describeRule(rule) {
    if (rule.type === "allowedRaces") return `${raceNames(rule.raceIds).join("・")}のみ編成可能`;
    if (rule.type === "onlyCompanions") return `${companionNames(rule.companionIds).join("・")}のみ出撃可能`;
    if (rule.type === "requiredCompanions") {
      const names = companionNames(rule.companionIds).join("・");
      return rule.match === "any" ? `${names}のうち1人以上を含む` : `${names}を含む編成`;
    }
    return "特別な編成条件";
  }
  function companionId(member) {
    return member?.source?.type === "companion" ? member.source.companionId : null;
  }
  function evaluate(rule, members) {
    if (rule.type === "allowedRaces") {
      const invalid = members.filter(member => !rule.raceIds.includes(member.raceId));
      return { ok: !invalid.length, rule, message: invalid.length ? `${describeRule(rule)}です。条件外：${invalid.map(member => member.name).join("、")}` : describeRule(rule) };
    }
    if (rule.type === "onlyCompanions") {
      const invalid = members.filter(member => !rule.companionIds.includes(companionId(member)));
      return { ok: !invalid.length, rule, message: invalid.length ? `${describeRule(rule)}です。条件外：${invalid.map(member => member.name).join("、")}` : describeRule(rule) };
    }
    if (rule.type === "requiredCompanions") {
      const present = new Set(members.map(companionId).filter(Boolean));
      const missing = rule.companionIds.filter(id => !present.has(id));
      const ok = rule.match === "any" ? missing.length < rule.companionIds.length : !missing.length;
      const needed = rule.match === "any" ? rule.companionIds : missing;
      return { ok, rule, message: ok ? describeRule(rule) : `${companionNames(needed).join("・")}を編成してください。` };
    }
    return { ok: false, rule, message: "未対応の編成条件です。" };
  }
  function check(source, members) {
    const conditions = rules(source).map(rule => evaluate(rule, members || []));
    const failed = conditions.filter(condition => !condition.ok);
    return {
      ok: !failed.length,
      restricted: conditions.length > 0,
      conditions,
      descriptions: conditions.map(condition => describeRule(condition.rule)),
      message: failed.map(condition => condition.message).join(" ")
    };
  }

  window.DungeonPartyRules = { check, companionIds, describeRule, evaluate, rules };
})();
