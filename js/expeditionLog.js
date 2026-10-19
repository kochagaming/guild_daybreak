(function () {
  "use strict";
  const cache = new WeakMap();

  function preview(expedition) {
    if (!expedition) return null;
    if (!cache.has(expedition)) {
      const dungeon = window.DungeonDifficulty.variant(expedition.dungeonId, expedition.difficultyId || "normal");
      cache.set(expedition, window.Battle.resolve(expedition, dungeon));
    }
    return cache.get(expedition);
  }

  function grouped(log) {
    const setup = [], encounters = new Map();
    (log || []).forEach(entry => {
      if (!entry.encounter) setup.push(entry);
      else {
        if (!encounters.has(entry.encounter)) encounters.set(entry.encounter, []);
        encounters.get(entry.encounter).push(entry);
      }
    });
    return { setup, encounters };
  }

  function encounterTitle(number, entries, planned) {
    const opening = entries.find(entry => entry.kind === "encounter");
    if (opening) return opening.text.replace(/^第\d+戦：/, "").replace(/ — .*$/, "");
    return planned?.name || `第${number}戦`;
  }

  function observations(entries) {
    const definitions = [
      ["大技", entry => ["warning", "burst"].includes(entry.kind)],
      ["敵の特殊行動", entry => entry.kind === "enemy-skill"],
      ["即応", entry => /【リアクション】/.test(entry.text)],
      ["弱点", entry => entry.kind === "weakness" || /弱点|攻撃の好機/.test(entry.text)],
      ["耐性", entry => /耐性|抵抗|防いだ/.test(entry.text)],
      ["状態異常", entry => entry.kind === "status"],
      ["命中・回避", entry => /命中せず|回避された|回命中/.test(entry.text)],
      ["会心", entry => /会心/.test(entry.text)]
    ];
    return definitions.map(([label, matches]) => ({
      label,
      entries: Array.from(new Set((entries || []).filter(matches).map(entry => entry.text))).slice(0, 2)
    })).filter(group => group.entries.length);
  }

  function trackedMilestone(expedition, events, resolved) {
    const snapshot = expedition.trackedAchievement;
    const definition = snapshot && window.GameData.achievements.find(entry => entry.id === snapshot.id);
    if (!definition) return null;
    const condition = definition.condition || {};
    const visibleDefeats = events.flatMap(event => event.entries).reduce((sum, entry) => sum
      + Object.values(entry.defeatedMonsterCounts || {}).reduce((count, quantity) => count + Number(quantity || 0), 0), 0);
    const visibleSpecies = new Set(events.flatMap(event => event.entries).flatMap(entry => Object.entries(entry.defeatedMonsterCounts || {})
      .filter(([, quantity]) => Number(quantity) > 0).map(([monsterId]) => monsterId)));
    const potential = window.Achievements.expeditionPotential(definition, expedition.dungeonId, expedition.difficultyId || "normal");
    let gained = 0, possibleGain = potential.possibleGain, relevant = potential.relevant;
    if (condition.type === "monsterDefeats") {
      gained = visibleDefeats;
    } else if (condition.type === "monsterSpecies") {
      gained = [...visibleSpecies].filter(monsterId => !(window.GameState.data.encyclopedia?.monsters?.[monsterId]?.defeated > 0)).length;
    }
    const deterministicClearTypes = new Set(["dungeonClears", "optionalClears", "divineClears", "specificDungeonClear"]);
    if (resolved && deterministicClearTypes.has(condition.type) && possibleGain) gained = possibleGain;
    return {
      achievementId: definition.id,
      currentAtDeparture: snapshot.current,
      current: Math.min(snapshot.target, snapshot.current + gained),
      target: snapshot.target,
      gained,
      possibleGain: Math.max(gained, possibleGain),
      relevant
    };
  }

  function active(expedition, now = window.GameRuntime.now()) {
    const dungeon = window.DungeonDifficulty.variant(expedition.dungeonId, expedition.difficultyId || "normal");
    const outcome = preview(expedition), plan = window.Exploration.plan(dungeon, expedition.timeMultiplier || 1);
    const groups = grouped(outcome.battleLog);
    const duration = Math.max(1, expedition.endsAt - expedition.startedAt);
    const progress = Math.min(1, Math.max(0, (now - expedition.startedAt) / duration));
    const events = [];
    const trackedMonsterId = expedition.trackedMonsterId || null;
    let revision = `s${groups.setup.length}`;
    const actualEncounters = Math.max(0, ...groups.encounters.keys());
    let nextAt = expedition.startedAt + duration * (.22 / plan.encounters.length);
    for (let number = 1; number <= actualEncounters; number += 1) {
      const entries = groups.encounters.get(number) || [];
      const startProgress = (number - .78) / plan.encounters.length;
      const endProgress = number / plan.encounters.length;
      if (progress < startProgress) {
        nextAt = expedition.startedAt + duration * startProgress;
        break;
      }
      const fraction = Math.min(1, Math.max(0, (progress - startProgress) / Math.max(.001, endProgress - startProgress)));
      const visibleCount = fraction >= 1 ? entries.length : Math.max(1, Math.floor(entries.length * fraction));
      const visible = entries.slice(0, visibleCount).filter(entry => fraction >= 1 || !["victory", "defeat"].includes(entry.kind));
      const defeated = visible.some(entry => entry.kind === "defeat");
      const won = visible.some(entry => entry.kind === "victory");
      const fighting = visible.some(entry => entry.kind === "encounter");
      const visibleEncounter = visible.find(entry => entry.kind === "encounter");
      events.push({ number, title: encounterTitle(number, entries, plan.encounters[number - 1]), entries: visible, status: defeated ? "撤退" : won ? "勝利" : fighting ? "交戦中" : "探索中", complete: defeated || won, huntTargetPresent: Boolean(trackedMonsterId && visibleEncounter?.encounteredMonsterIds?.includes(trackedMonsterId)) });
      revision += `-${number}:${visible.length}:${fraction >= 1 ? 1 : 0}`;
      if (fraction < 1) {
        const nextEntryFraction = Math.min(1, (visibleCount + 1) / Math.max(1, entries.length));
        nextAt = expedition.startedAt + duration * (startProgress + (endProgress - startProgress) * nextEntryFraction);
        break;
      }
      nextAt = number < actualEncounters
        ? expedition.startedAt + duration * ((number + .22) / plan.encounters.length)
        : expedition.endsAt;
    }
    const last = events[events.length - 1];
    const resolved = last && last.complete && (last.status === "撤退" || events.length === plan.encounters.length);
    const next = Math.max(0, nextAt - now);
    const trackedMonsterQuantity = trackedMonsterId ? events.reduce((sum, event) => sum + event.entries.reduce((entrySum, entry) => entrySum + (entry.defeatedMonsterCounts?.[trackedMonsterId] || 0), 0), 0) : 0;
    const huntTarget = trackedMonsterId ? {
      monsterId: trackedMonsterId,
      goal: expedition.trackedMonsterGoal || 1,
      progressAtDeparture: expedition.trackedMonsterProgressAtDeparture || 0,
      quantity: trackedMonsterQuantity
    } : null;
    const trackedItemId = expedition.trackedItemId || null;
    const trackedItemQuantity = trackedItemId ? events.reduce((sum, event) => sum + event.entries.reduce((entrySum, entry) => entrySum
      + (entry.acquiredItemId === trackedItemId ? Number(entry.acquiredItemQuantity) || 0 : 0), 0), 0) : 0;
    const itemTarget = trackedItemId ? {
      itemId: trackedItemId,
      goal: expedition.trackedItemGoal || 1,
      progressAtDeparture: expedition.trackedItemProgressAtDeparture || 0,
      quantity: trackedItemQuantity
    } : null;
    const milestone = trackedMilestone(expedition, events, resolved && last?.status !== "撤退");
    return {
      active: true, revision, progress, setup: groups.setup, events,
      status: last?.status === "撤退" ? "撤退・帰還中" : resolved ? "帰還中" : last?.status === "交戦中" ? `第${last.number}戦・交戦中` : last ? `第${last.number}区画・探索中` : "探索中",
      next, outcome, totalEncounters: plan.encounters.length,
      dungeonName: dungeon.name,
      partyIndex: expedition.partyIndex || 0,
      partyNames: (expedition.partySnapshot || []).map(member => member.name).filter(Boolean),
      huntTarget,
      itemTarget,
      milestone
    };
  }

  function completed(result) {
    const groups = grouped(result.battleLog);
    const events = Array.from(groups.encounters.entries()).sort((a, b) => a[0] - b[0]).map(([number, entries]) => ({
      number, title: encounterTitle(number, entries), entries,
      status: entries.some(entry => entry.kind === "defeat") ? "撤退" : "勝利", complete: true,
      huntTargetPresent: Boolean(result.trackedMonsterId && entries.find(entry => entry.kind === "encounter")?.encounteredMonsterIds?.includes(result.trackedMonsterId))
    }));
    return {
      active: false, revision: `complete-${result.id || result.completedAt}`, progress: 1,
      setup: groups.setup, events, status: result.success ? "探索成功" : "撤退",
      next: 0, outcome: result, totalEncounters: result.totalEncounters || events.length,
      dungeonName: result.dungeonName || window.DungeonDifficulty.variant(result.dungeonId, result.difficultyId || "normal").name,
      partyIndex: result.partyIndex || 0,
      partyNames: (result.partyNames || result.partySetup?.map(member => member.name) || []).filter(Boolean)
    };
  }

  window.ExpeditionLog = { active, completed, preview, observations };
})();
