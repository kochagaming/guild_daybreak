(function () {
  "use strict";

  function get(id) {
    return window.GameState.data.characters.find((character) => character.id === id);
  }

  function emptyExpeditionRecord() {
    return {
      sorties: 0, victories: 0, retreats: 0, encounterClears: 0,
      routeSuccesses: 0, routeEventSuccesses: {}, treasureOpenings: 0, teamSurveys: 0,
      targetedHarvestAttempts: 0, targetedHarvestSuccesses: 0, targetedHarvestItems: 0,
      targetedHarvestRecords: {},
      damageDealt: 0, healingDone: 0, damageTaken: 0, criticalHits: 0, statusAttempts: 0, statusInflicted: 0, knockouts: 0,
      bestDamage: 0, bestHealing: 0, bestEndurance: 0, bossRivalries: {}, skillRecords: {}, lastAt: null
    };
  }

  function expeditionRecord(character) {
    const record = character?.expeditionRecord;
    const normalized = Object.assign(emptyExpeditionRecord(), record && typeof record === "object" && !Array.isArray(record) ? record : {});
    normalized.routeEventSuccesses = Object.assign({}, record?.routeEventSuccesses || {});
    normalized.targetedHarvestRecords = Object.fromEntries(Object.entries(record?.targetedHarvestRecords || {}).map(([key, entry]) => [key, Object.assign({ attempts: 0, successes: 0, items: 0, lastAt: null }, entry)]));
    normalized.bossRivalries = Object.fromEntries(Object.entries(record?.bossRivalries || {}).map(([bossId, entry]) => [bossId, Object.assign({ defeats: 0, victories: 0, lastOutcome: null, lastAt: null }, entry)]));
    normalized.skillRecords = Object.fromEntries(Object.entries(record?.skillRecords || {}).map(([skillId, entry]) => [skillId, Object.assign({ uses: 0, damage: 0, healing: 0, statuses: 0 }, entry)]));
    return normalized;
  }

  const expeditionRoleDefinitions = Object.freeze({
    exploration: Object.freeze({ label: "道中の難所を解いた", title: "道案内", icon: "路" }),
    damage: Object.freeze({ label: "敵陣を切り開いた", title: "先陣", icon: "刃" }),
    healing: Object.freeze({ label: "仲間の命をつないだ", title: "癒し手", icon: "灯" }),
    status: Object.freeze({ label: "異変で戦機をつくった", title: "撹乱役", icon: "策" }),
    endurance: Object.freeze({ label: "最後まで立ち続けた", title: "守り手", icon: "盾" })
  });

  function expeditionRoleLabel(kind) {
    return expeditionRoleDefinitions[kind]?.label || "";
  }

  function recentExpeditionRole(character, limit = 5) {
    if (!character?.id) return null;
    const entries = (window.GameState.data.partyHistory || [])
      .flatMap(history => Array.isArray(history) ? history : [])
      .filter(entry => entry?.battle?.members?.some(member => member.id === character.id))
      .sort((left, right) => (Number(right.completedAt) || 0) - (Number(left.completedAt) || 0))
      .slice(0, Math.max(1, Math.round(Number(limit) || 5)));
    const roles = new Map();
    entries.forEach((entry, index) => {
      const kind = (entry.memberHighlights || []).find(highlight => highlight.memberId === character.id)?.kind;
      if (!expeditionRoleLabel(kind)) return;
      const role = roles.get(kind) || { kind, count: 0, score: 0, lastIndex: index };
      role.count += 1;
      role.score += Math.max(1, entries.length - index);
      role.lastIndex = Math.min(role.lastIndex, index);
      roles.set(kind, role);
    });
    const selected = [...roles.values()].sort((left, right) => right.count - left.count || right.score - left.score || left.lastIndex - right.lastIndex)[0];
    if (!selected) return null;
    const definition = expeditionRoleDefinitions[selected.kind];
    const established = selected.count >= 3;
    return Object.freeze({ ...selected, label: definition.label, title: established ? definition.title : null, icon: definition.icon, established, sampleSize: entries.length });
  }

  const expeditionRoleConversations = Object.freeze([
    Object.freeze({
      roles: ["exploration", "endurance"],
      departure: (guide, guard) => `${guide.name}「先の道を見てくる」　${guard.name}「なら、帰りの印は任せて」――道案内と守り手は、地図の端を一度だけ指でなぞった。`,
      success: [
        (guide, guard) => `${guide.name}「帰り道まで残っていた」　${guard.name}「印を消されないよう、最後まで見ていたから」――二人は泥の付いた地図を机の上へ広げた。`,
        (guide, guard) => `${guard.name}「全員、同じ入口へ戻れた」　${guide.name}「あなたの印が見えた時、ようやく帰った気がした」――数え直した足音は、一つも欠けていなかった。`
      ],
      failure: [
        (guide, guard) => `${guide.name}「道を読み違えた」　${guard.name}「それでも帰る印は見失わなかった。次はそこから始めよう」――破れた地図にも、帰路だけは濃く残った。`,
        (guide, guard) => `${guard.name}「戻る者は全員いる」　${guide.name}「なら、この遠回りも消さずに残す」――二人は行けなかった道へ、小さな×印を置いた。`
      ]
    }),
    Object.freeze({
      roles: ["status", "damage"],
      departure: (tactician, vanguard) => `${tactician.name}「合図で守りを崩す」　${vanguard.name}「その隙をもらう」――撹乱役と先陣は、短く手順を確かめた。`,
      success: [
        (tactician, vanguard) => `${vanguard.name}「あの合図、よく見えた」　${tactician.name}「次は半歩早く出しても拾えそうだね」――言葉より短い合図が、また一つ二人の間に増えた。`,
        (tactician, vanguard) => `${tactician.name}「崩れた瞬間にもう走っていた」　${vanguard.name}「あなたが笑ったから、行けると思った」――帰路でも二人の歩調だけは妙に速かった。`
      ],
      failure: [
        (tactician, vanguard) => `${vanguard.name}「合図を待てなかった」　${tactician.name}「私も遅かった。次は声じゃなく剣先を見る」――責める代わりに、二人は合図を一つ減らした。`,
        (tactician, vanguard) => `${tactician.name}「敵は崩れた。でも、退路まで読めなかった」　${vanguard.name}「なら次は、飛び込む前に一度振り返る」――失敗した手順も、二人の記録になった。`
      ]
    }),
    Object.freeze({
      roles: ["damage", "healing"],
      departure: (vanguard, healer) => `${vanguard.name}「前は任せて」　${healer.name}「戻ったら、傷を隠さないで」――先陣と癒し手は、いつもの距離で頷き合った。`,
      success: [
        (vanguard, healer) => `${healer.name}「傷を隠していない。今日は合格」　${vanguard.name}「隠すほど残っていないからね」――包帯を巻く手だけが、冗談を信じていなかった。`,
        (vanguard, healer) => `${vanguard.name}「前を空けずに済んだ」　${healer.name}「後ろで倒れさせないと決めていたから」――二人は互いの仕事を、自分の手柄には数えなかった。`
      ],
      failure: [
        (vanguard, healer) => `${vanguard.name}「前へ出すぎた」　${healer.name}「戻ってきたから叱れる。次は届く場所で戦って」――ほどかれた包帯の数が、今日の距離を語っていた。`,
        (vanguard, healer) => `${healer.name}「治せなかった傷を覚えておく」　${vanguard.name}「なら、受けなくていい傷を私が覚える」――二人は同じ撤退を、別々の頁へ書き留めた。`
      ]
    }),
    Object.freeze({
      roles: ["endurance", "healing"],
      departure: (guard, healer) => `${guard.name}「危なくなったら、こちらへ」　${healer.name}「そちらも治す人数に入っているから」――守り手と癒し手の声に、隊列の緊張が少しほどけた。`,
      success: [
        (guard, healer) => `${healer.name}「また最後まで立っていた」　${guard.name}「立てたのは、後ろから何度も呼ばれたからだ」――盾の傷と薬瓶の空きは、同じ数だけ増えていた。`,
        (guard, healer) => `${guard.name}「誰も置いてこなかった」　${healer.name}「あなたも含めて、ね」――癒し手は一番大きな傷を最後まで残しておかなかった。`
      ],
      failure: [
        (guard, healer) => `${guard.name}「守り切れなかった」　${healer.name}「退く時間は守ってくれた。今はそれを無かったことにしないで」――伏せた盾の横で、癒し手は残った薬を数えた。`,
        (guard, healer) => `${healer.name}「次は倒れる前に呼んで」　${guard.name}「声を出す余裕まで、守るものに入れておく」――二人は静かに、帰還者の傷を分け合った。`
      ]
    }),
    Object.freeze({
      roles: ["exploration", "status"],
      departure: (guide, tactician) => `${guide.name}「足跡は読める」　${tactician.name}「なら、待ち伏せる側の気持ちも読んでみよう」――道案内と撹乱役は、同じ痕跡を別の角度から覗き込んだ。`,
      success: [
        (guide, tactician) => `${guide.name}「足跡の先に、あなたの罠があった」　${tactician.name}「道を教えてくれたのはそっちでしょう」――二人の地図には、線と丸印が重なっていた。`,
        (guide, tactician) => `${tactician.name}「敵より先に迷わせられた」　${guide.name}「こちらが迷わなかったからね」――同じ曲がり角を見て、二人は違う理由で笑った。`
      ],
      failure: [
        (guide, tactician) => `${guide.name}「足跡は正しかった。でも考えを読み違えた」　${tactician.name}「次は逃げ道の方から考えよう」――二人は敵が来なかった場所も地図へ残した。`,
        (guide, tactician) => `${tactician.name}「罠を置く場所が一歩ずれた」　${guide.name}「道の癖を一つ見落とした。ずれた分は二人で直せる」――失敗の印は消さず、隣に新しい線を引いた。`
      ]
    })
  ]);

  function expeditionRolePair(members) {
    const reputed = (Array.isArray(members) ? members : []).map(member => {
      const isSnapshot = member && Object.prototype.hasOwnProperty.call(member, "reputation");
      const reputation = isSnapshot ? member.reputation : recentExpeditionRole(member);
      return reputation?.title ? { member, reputation } : null;
    }).filter(Boolean);
    const byRole = new Map();
    reputed.forEach(entry => { if (!byRole.has(entry.reputation.kind)) byRole.set(entry.reputation.kind, entry); });
    const definition = expeditionRoleConversations.find(entry => entry.roles.every(role => byRole.has(role)));
    return definition ? { definition, participants: definition.roles.map(role => byRole.get(role)) } : null;
  }

  function expeditionRoleConversation(members) {
    const pair = expeditionRolePair(members);
    if (!pair) return null;
    const { definition, participants } = pair;
    return Object.freeze({
      label: participants.map(entry => entry.reputation.title).join(" × "),
      roles: Object.freeze([...definition.roles]),
      memberIds: Object.freeze(participants.map(entry => entry.member.id)),
      memberNames: Object.freeze(participants.map(entry => entry.member.name)),
      text: definition.departure(...participants.map(entry => entry.member))
    });
  }

  function expeditionRoleReturnConversation(members, success, variant = 0) {
    const pair = expeditionRolePair(members);
    if (!pair) return null;
    const { definition, participants } = pair;
    const lines = success ? definition.success : definition.failure;
    const selected = lines[Math.abs(Math.trunc(Number(variant) || 0)) % lines.length];
    return Object.freeze({
      label: participants.map(entry => entry.reputation.title).join(" × "),
      roles: Object.freeze([...definition.roles]),
      memberIds: Object.freeze(participants.map(entry => entry.member.id)),
      memberNames: Object.freeze(participants.map(entry => entry.member.name)),
      text: selected(...participants.map(entry => entry.member))
    });
  }

  function expeditionRoleConversationChange(before, after) {
    if (!after) return null;
    const key = entry => entry ? `${entry.roles.join(":")}:${entry.memberIds.join(":")}` : "";
    return key(before) === key(after) ? null : after;
  }

  function skillMastery(recordOrUses) {
    const uses = Math.max(0, Math.round(Number(typeof recordOrUses === "object" ? recordOrUses?.uses : recordOrUses) || 0));
    const ranks = window.GameData.config.characterGrowth?.skillMasteryRanks || [];
    const current = [...ranks].reverse().find(rank => uses >= rank.minimumUses) || null;
    const next = ranks.find(rank => uses < rank.minimumUses) || null;
    const previousMinimum = current?.minimumUses || 0;
    return Object.freeze({ uses, current, next, remaining: next ? next.minimumUses - uses : 0, ratio: next ? Math.max(0, Math.min(1, (uses - previousMinimum) / (next.minimumUses - previousMinimum))) : 1 });
  }

  function signatureSkills(character) {
    return Object.freeze(Object.entries(expeditionRecord(character).skillRecords)
      .map(([skillId, record]) => {
        const skill = window.GameData.skills?.[skillId];
        return skill && Number(record.uses) > 0 ? Object.freeze({ skillId, skill, uses: Number(record.uses) || 0, damage: Number(record.damage) || 0, healing: Number(record.healing) || 0, statuses: Number(record.statuses) || 0, mastery: skillMastery(record) }) : null;
      })
      .filter(Boolean)
      .sort((left, right) => right.uses - left.uses || (right.damage + right.healing + right.statuses) - (left.damage + left.healing + left.statuses) || left.skill.name.localeCompare(right.skill.name, "ja")));
  }

  function bossRivalries(character) {
    return Object.freeze(Object.entries(expeditionRecord(character).bossRivalries).map(([bossId, entry]) => Object.freeze({ bossId, ...entry }))
      .sort((left, right) => (right.lastAt || 0) - (left.lastAt || 0)));
  }

  function activeBossRivalries(character) {
    return Object.freeze(bossRivalries(character).filter(entry => entry.lastOutcome === "defeat"));
  }

  function recordBossEncounter(character, bossId, victory, completedAt) {
    const boss = window.GameData.monsters?.[bossId];
    if (!character || !boss?.boss) return null;
    const record = expeditionRecord(character);
    const previous = record.bossRivalries[bossId] || { defeats: 0, victories: 0, lastOutcome: null, lastAt: null };
    const started = !victory && previous.lastOutcome !== "defeat";
    const avenged = victory && previous.lastOutcome === "defeat";
    const entry = {
      defeats: previous.defeats + (victory ? 0 : 1),
      victories: previous.victories + (victory ? 1 : 0),
      lastOutcome: victory ? "victory" : "defeat",
      lastAt: Number(completedAt) || window.GameRuntime.now()
    };
    record.bossRivalries[bossId] = entry;
    character.expeditionRecord = record;
    return { bossId, entry: Object.freeze({ ...entry }), started, avenged };
  }

  function routeExperience(character) {
    const counts = expeditionRecord(character).routeEventSuccesses;
    return Object.freeze((window.GameData.config.explorationEvents?.routeEvents || [])
      .map((event, index) => Object.freeze({ id: event.id, name: event.name, label: event.recordLabel, count: Math.max(0, Number(counts[event.id]) || 0), index }))
      .filter(entry => entry.count > 0)
      .sort((left, right) => right.count - left.count || left.index - right.index));
  }

  function routeSpecialties(character) {
    const threshold = window.GameData.config.explorationEvents?.personalPractice?.successes || 5;
    const milestones = window.GameData.adventurerMilestones || [];
    return Object.freeze(routeExperience(character).filter(entry => entry.count >= threshold).map(entry => {
      const milestone = milestones.find(candidate => candidate.condition?.type === "routeEventRecord" && candidate.condition.routeEventId === entry.id);
      return Object.freeze(Object.assign({}, entry, {
        icon: milestone?.icon || "路",
        title: milestone?.name || `${entry.name}の記章`
      }));
    }));
  }

  function treasureSpecialty(character) {
    const threshold = window.GameData.config.explorationEvents?.treasurePersonalPractice?.openings || 10;
    const count = expeditionRecord(character).treasureOpenings;
    if (count < threshold) return null;
    const milestone = (window.GameData.adventurerMilestones || []).find(candidate => candidate.id === "ten_sealed_chests");
    return Object.freeze({
      id: "treasure_opening", name: "開錠", label: "封印箱を開けた", count,
      icon: milestone?.icon || "鍵", title: milestone?.name || "開錠の記章"
    });
  }

  function fieldSpecialties(character) {
    const treasure = treasureSpecialty(character);
    return Object.freeze([...routeSpecialties(character), ...(treasure ? [treasure] : [])]);
  }

  function bondKey(leftId, rightId) { return [String(leftId), String(rightId)].sort().join("::"); }

  function sharedSorties(character) {
    if (!character?.id) return Object.freeze([]);
    const bonds = window.GameState.data.adventurerBonds || {}, pairs = bonds.pairs || {}, memories = bonds.memories || {};
    return Object.freeze(Object.entries(pairs).map(([key, count]) => {
      const ids = key.split("::");
      if (ids.length !== 2 || !ids.includes(character.id)) return null;
      const companionId = ids[0] === character.id ? ids[1] : ids[0];
      const companion = get(companionId);
      return companion ? Object.freeze({ characterId: companionId, name: companion.name, count: Math.max(0, Number(count) || 0), memoryIds: Object.freeze([...(memories[key] || [])]) }) : null;
    }).filter(Boolean).sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "ja")));
  }

  function recordSharedSortie(memberIds) {
    const unique = [...new Set((memberIds || []).filter(id => get(id)))];
    const store = window.GameState.data.adventurerBonds || (window.GameState.data.adventurerBonds = { version: 1, pairs: {}, memories: {} });
    if (!store.pairs || typeof store.pairs !== "object" || Array.isArray(store.pairs)) store.pairs = {};
    for (let left = 0; left < unique.length; left += 1) for (let right = left + 1; right < unique.length; right += 1) {
      const key = bondKey(unique[left], unique[right]);
      store.pairs[key] = Math.max(0, Number(store.pairs[key]) || 0) + 1;
    }
    return unique.length;
  }

  function bondMemories(leftId, rightId) {
    return Object.freeze([...(window.GameState.data.adventurerBonds?.memories?.[bondKey(leftId, rightId)] || [])]);
  }

  function sharedHuntLedger(leftId, rightId, monsterId, itemId) {
    const record = window.GameState.data.adventurerBonds?.huntLedgers?.[bondKey(leftId, rightId)]?.[`${monsterId}::${itemId}`];
    return record ? Object.freeze({ monsterId, itemId, successes: record.successes, items: record.items, lastAt: record.lastAt }) : null;
  }

  function sharedHuntLedgers(leftId, rightId) {
    return Object.entries(window.GameState.data.adventurerBonds?.huntLedgers?.[bondKey(leftId, rightId)] || {}).map(([targetKey, record]) => {
      const split = targetKey.indexOf("::"), monsterId = targetKey.slice(0, split), itemId = targetKey.slice(split + 2);
      return Object.freeze({ monsterId, itemId, successes: record.successes, items: record.items, lastAt: record.lastAt });
    }).filter(entry => window.GameData.monsters?.[entry.monsterId] && window.GameData.items?.[entry.itemId])
      .sort((left, right) => right.lastAt - left.lastAt || right.successes - left.successes || left.monsterId.localeCompare(right.monsterId));
  }

  function sharedHuntLedgerProgress(successes) {
    const count = Math.max(0, Math.floor(Number(successes) || 0));
    const tiers = [...(window.GameData.config.explorationEvents?.targetedHarvestConsultation?.rememberedTiers || [])]
      .sort((left, right) => left.minimumSuccesses - right.minimumSuccesses);
    const currentTier = [...tiers].reverse().find(entry => count >= entry.minimumSuccesses) || null;
    const nextTier = tiers.find(entry => count < entry.minimumSuccesses) || null;
    return Object.freeze({
      successes: count,
      currentTier,
      nextTier,
      remaining: nextTier ? Math.max(0, nextTier.minimumSuccesses - count) : 0,
      ratio: nextTier ? Math.max(0, Math.min(1, count / nextTier.minimumSuccesses)) : 1
    });
  }

  function sharedHuntLedgerPairs(monsterId, itemId) {
    const targetKey = `${monsterId}::${itemId}`;
    const tiers = window.GameData.config.explorationEvents?.targetedHarvestConsultation?.rememberedTiers || [];
    return Object.entries(window.GameState.data.adventurerBonds?.huntLedgers || {}).map(([key, ledgers]) => {
      const record = ledgers?.[targetKey];
      const memberIds = key.split("::"), members = memberIds.map(get);
      if (!record || memberIds.length !== 2 || members.some(member => !member)) return null;
      const tier = [...tiers].sort((left, right) => right.minimumSuccesses - left.minimumSuccesses)
        .find(entry => record.successes >= entry.minimumSuccesses) || null;
      return Object.freeze({
        key,
        memberIds: Object.freeze([...memberIds]),
        memberNames: Object.freeze(members.map(member => member.name)),
        record: Object.freeze({ monsterId, itemId, successes: record.successes, items: record.items, lastAt: record.lastAt }),
        tier,
        progress: sharedHuntLedgerProgress(record.successes)
      });
    }).filter(Boolean).sort((left, right) => right.record.lastAt - left.record.lastAt || right.record.successes - left.record.successes || left.key.localeCompare(right.key, "ja"));
  }

  function namedHuntEpithets() {
    const tiers = window.GameData.config.explorationEvents?.targetedHarvestConsultation?.rememberedTiers || [];
    return Object.entries(window.GameState.data.adventurerBonds?.huntLedgers || {}).flatMap(([bondKey, ledgers]) => {
      const memberIds = bondKey.split("::"), members = memberIds.map(get);
      if (memberIds.length !== 2 || members.some(member => !member)) return [];
      return Object.entries(ledgers || {}).map(([targetKey, record]) => {
        const split = targetKey.indexOf("::"), monsterId = targetKey.slice(0, split), itemId = targetKey.slice(split + 2);
        const monster = window.GameData.monsters?.[monsterId], item = window.GameData.items?.[itemId];
        const tier = [...tiers].sort((left, right) => right.minimumSuccesses - left.minimumSuccesses)
          .find(entry => record.successes >= entry.minimumSuccesses);
        if (!monster || !item || !tier?.epithet) return null;
        return Object.freeze({
          bondKey, memberIds: Object.freeze([...memberIds]), members: Object.freeze([...members]), monsterId, itemId, monster, item, tier,
          epithet: tier.epithet.replace("{monster}", monster.name), successes: record.successes, items: record.items, lastAt: record.lastAt
        });
      }).filter(Boolean);
    }).sort((left, right) => right.lastAt - left.lastAt || right.successes - left.successes || left.epithet.localeCompare(right.epithet, "ja"));
  }

  function developingHuntLedgers() {
    return Object.entries(window.GameState.data.adventurerBonds?.huntLedgers || {}).flatMap(([pairKey, ledgers]) => {
      const memberIds = pairKey.split("::"), members = memberIds.map(get);
      if (memberIds.length !== 2 || members.some(member => !member)) return [];
      return Object.entries(ledgers || {}).map(([targetKey, record]) => {
        const split = targetKey.indexOf("::"), monsterId = targetKey.slice(0, split), itemId = targetKey.slice(split + 2);
        const monster = window.GameData.monsters?.[monsterId], item = window.GameData.items?.[itemId];
        const progress = sharedHuntLedgerProgress(record.successes);
        if (!monster || !item || !progress.nextTier) return null;
        return Object.freeze({
          bondKey: pairKey,
          memberIds: Object.freeze([...memberIds]),
          members: Object.freeze([...members]),
          monsterId,
          itemId,
          monster,
          item,
          tier: progress.currentTier,
          progress,
          successes: record.successes,
          items: record.items,
          lastAt: record.lastAt
        });
      }).filter(Boolean);
    }).sort((left, right) => left.progress.remaining - right.progress.remaining || right.successes - left.successes || right.lastAt - left.lastAt || left.bondKey.localeCompare(right.bondKey, "ja"));
  }

  function namedHuntsForMembers(memberIds, monsterIds = null) {
    const members = new Set((memberIds || []).map(String));
    const monsters = monsterIds == null ? null : new Set((monsterIds || []).map(String));
    return Object.freeze(namedHuntEpithets().filter(entry => entry.memberIds.every(id => members.has(id))
      && (!monsters || monsters.has(entry.monsterId))));
  }

  function recordSharedHuntLedger(memberIds, monsterId, itemId, items, at) {
    const ids = [...new Set(memberIds || [])];
    const quantity = Math.max(0, Number(items) || 0);
    if (ids.length !== 2 || ids.some(id => !get(id)) || !window.GameData.monsters?.[monsterId] || !window.GameData.items?.[itemId] || quantity < 1) return false;
    const store = window.GameState.data.adventurerBonds || (window.GameState.data.adventurerBonds = { version: 1, pairs: {}, memories: {}, huntLedgers: {} });
    if (!store.huntLedgers || typeof store.huntLedgers !== "object" || Array.isArray(store.huntLedgers)) store.huntLedgers = {};
    const pairLedgers = store.huntLedgers[bondKey(ids[0], ids[1])] || (store.huntLedgers[bondKey(ids[0], ids[1])] = {});
    const targetKey = `${monsterId}::${itemId}`, record = pairLedgers[targetKey] || { successes: 0, items: 0, lastAt: 0 };
    record.successes += 1;
    record.items += quantity;
    record.lastAt = Math.max(0, Number(at) || window.GameRuntime.now());
    pairLedgers[targetKey] = record;
    return true;
  }

  function recordBondMemory(memberIds, momentId) {
    const ids = [...new Set(memberIds || [])];
    if (ids.length !== 2 || ids.some(id => !get(id)) || !(window.GameData.config.explorationEvents?.adventurerBondMoments || []).some(moment => moment.id === momentId)) return false;
    const store = window.GameState.data.adventurerBonds || (window.GameState.data.adventurerBonds = { version: 1, pairs: {}, memories: {} });
    if (!store.memories || typeof store.memories !== "object" || Array.isArray(store.memories)) store.memories = {};
    const key = bondKey(ids[0], ids[1]), memories = store.memories[key] || (store.memories[key] = []);
    if (memories.includes(momentId)) return false;
    memories.push(momentId);
    return true;
  }

  function expeditionMilestones(character) {
    const record = expeditionRecord(character);
    const masteryRanks = window.GameData.config.characterGrowth?.skillMasteryRanks || [];
    const masteredSkills = signatureSkills(character).filter(entry => entry.mastery.current);
    return (window.GameData.adventurerMilestones || []).map(definition => {
      const condition = definition.condition;
      const current = condition.type === "routeEventRecord"
        ? Math.max(0, Number(record.routeEventSuccesses?.[condition.routeEventId]) || 0)
        : condition.type === "specialtyCount"
          ? fieldSpecialties(character).length
          : condition.type === "sharedSorties"
            ? (sharedSorties(character)[0]?.count || 0)
             : condition.type === "itemDiscoveryCount"
               ? (window.Encyclopedia?.itemDiscoveriesByCharacter?.(character.id).length || 0)
             : condition.type === "monsterFirstDefeatCount"
               ? (window.Encyclopedia?.monsterFirstDefeatsByCharacter?.(character.id).length || 0)
            : condition.type === "skillMasteryCount"
              ? (() => {
                const required = masteryRanks.find(rank => rank.id === condition.rankId);
                return required ? masteredSkills.filter(entry => entry.mastery.current.minimumUses >= required.minimumUses).length : 0;
              })()
          : Math.max(0, Number(record[condition.field]) || 0);
      const target = definition.condition.minimum;
      return Object.freeze(Object.assign({}, definition, {
        current,
        target,
        complete: current >= target,
        ratio: Math.min(1, current / target)
      }));
    });
  }

  function recordTitle(character) {
    if (!character?.recordTitleId) return null;
    return expeditionMilestones(character).find(entry => entry.id === character.recordTitleId && entry.complete) || null;
  }

  function setRecordTitle(id, milestoneId) {
    const character = get(id);
    if (!character) return { ok: false, message: "冒険者が見つかりません。" };
    if (milestoneId == null) {
      character.recordTitleId = null;
      window.GameState.save();
      return { ok: true, message: "表示する記章を外しました。" };
    }
    const milestone = expeditionMilestones(character).find(entry => entry.id === milestoneId);
    if (!milestone || !milestone.complete) return { ok: false, message: "まだ獲得していない記章です。" };
    character.recordTitleId = milestone.id;
    window.GameState.save();
    return { ok: true, message: `「${milestone.name}」を表示する記章にしました。` };
  }

  function recordExpedition(character, report, success, encounterClears, completedAt) {
    if (!character || !report) return null;
    const record = expeditionRecord(character);
    const damage = Math.max(0, Math.round(Number(report.damageDealt) || 0));
    const healing = Math.max(0, Math.round(Number(report.healingDone) || 0));
    const taken = Math.max(0, Math.round(Number(report.damageTaken) || 0));
    record.sorties += 1;
    record.victories += success ? 1 : 0;
    record.retreats += success ? 0 : 1;
    record.encounterClears += Math.max(0, Math.round(Number(encounterClears) || 0));
    record.routeSuccesses += Math.max(0, Math.round(Number(report.routeSuccesses) || 0));
    Object.entries(report.routeEventSuccesses || {}).forEach(([eventId, count]) => {
      if (!(window.GameData.config.explorationEvents?.routeEvents || []).some(event => event.id === eventId)) return;
      record.routeEventSuccesses[eventId] = (record.routeEventSuccesses[eventId] || 0) + Math.max(0, Math.round(Number(count) || 0));
    });
    record.treasureOpenings += Math.max(0, Math.round(Number(report.treasureOpenings) || 0));
    record.teamSurveys += Math.max(0, Math.round(Number(report.teamSurveys) || 0));
    record.targetedHarvestAttempts += Math.max(0, Math.round(Number(report.targetedHarvestAttempts) || 0));
    record.targetedHarvestSuccesses += Math.max(0, Math.round(Number(report.targetedHarvestSuccesses) || 0));
    record.targetedHarvestItems += Math.max(0, Math.round(Number(report.targetedHarvestItems) || 0));
    if (report.targetedHarvestRecord?.monsterId && report.targetedHarvestRecord?.itemId) {
      const key = `${report.targetedHarvestRecord.monsterId}::${report.targetedHarvestRecord.itemId}`;
      const previous = record.targetedHarvestRecords[key] || { attempts: 0, successes: 0, items: 0, lastAt: null };
      record.targetedHarvestRecords[key] = {
        attempts: previous.attempts + Math.max(0, Math.round(Number(report.targetedHarvestRecord.attempts) || 0)),
        successes: previous.successes + Math.max(0, Math.round(Number(report.targetedHarvestRecord.successes) || 0)),
        items: previous.items + Math.max(0, Math.round(Number(report.targetedHarvestRecord.items) || 0)),
        lastAt: Number(completedAt) || window.GameRuntime.now()
      };
    }
    record.damageDealt += damage;
    record.healingDone += healing;
    record.damageTaken += taken;
    record.criticalHits += Math.max(0, Math.round(Number(report.criticalHits) || 0));
    record.statusAttempts += Math.max(0, Math.round(Number(report.statusAttempts) || 0));
    record.statusInflicted += Math.max(0, Math.round(Number(report.statusInflicted) || 0));
    record.knockouts += Number(report.remainingHp) <= 0 ? 1 : 0;
    record.bestDamage = Math.max(record.bestDamage, damage);
    record.bestHealing = Math.max(record.bestHealing, healing);
    if (Number(report.remainingHp) > 0) record.bestEndurance = Math.max(record.bestEndurance, taken);
    const usedSkillIds = new Set([
      ...Object.keys(report.skillUses || {}), ...Object.keys(report.skillDamage || {}),
      ...Object.keys(report.skillHealing || {}), ...Object.keys(report.skillStatusInflicted || {})
    ]);
    usedSkillIds.forEach(skillId => {
      if (!window.GameData.skills?.[skillId]) return;
      const previous = record.skillRecords[skillId] || { uses: 0, damage: 0, healing: 0, statuses: 0 };
      const next = {
        uses: previous.uses + Math.max(0, Math.round(Number(report.skillUses?.[skillId]) || 0)),
        damage: previous.damage + Math.max(0, Math.round(Number(report.skillDamage?.[skillId]) || 0)),
        healing: previous.healing + Math.max(0, Math.round(Number(report.skillHealing?.[skillId]) || 0)),
        statuses: previous.statuses + Math.max(0, Math.round(Number(report.skillStatusInflicted?.[skillId]) || 0))
      };
      if (next.uses > 0) record.skillRecords[skillId] = next;
    });
    record.lastAt = Number(completedAt) || window.GameRuntime.now();
    character.expeditionRecord = record;
    return record;
  }
  function targetedHarvestRecords(character) {
    return Object.entries(expeditionRecord(character).targetedHarvestRecords).map(([key, entry]) => {
      const [monsterId, itemId] = key.split("::");
      return Object.freeze({ monsterId, itemId, ...entry });
    }).filter(entry => window.GameData.monsters?.[entry.monsterId] && window.GameData.items?.[entry.itemId])
      .sort((left, right) => right.successes - left.successes || right.items - left.items || right.attempts - left.attempts || (right.lastAt || 0) - (left.lastAt || 0));
  }
  function targetedHarvestPractice(character, monsterId, itemId) {
    const record = targetedHarvestRecords(character).find(entry => entry.monsterId === monsterId && entry.itemId === itemId) || null;
    const tier = record ? [...(window.GameData.config.explorationEvents?.targetedHarvestPractice || [])]
      .sort((left, right) => right.minimumSuccesses - left.minimumSuccesses)
      .find(entry => record.successes >= entry.minimumSuccesses) || null : null;
    return Object.freeze({ record, tier });
  }
  function targetedHarvestPersistence(character, monsterId, itemId) {
    const record = targetedHarvestRecords(character).find(entry => entry.monsterId === monsterId && entry.itemId === itemId) || null;
    const misses = record ? Math.max(0, record.attempts - record.successes) : 0;
    const tier = record ? [...(window.GameData.config.explorationEvents?.targetedHarvestPersistence || [])]
      .sort((left, right) => right.minimumMisses - left.minimumMisses)
      .find(entry => misses >= entry.minimumMisses) || null : null;
    return Object.freeze({ record, misses, tier });
  }
  function targetedHarvestConsultation(practice, persistence) {
    if (!practice || !persistence || !practice.characterId || !persistence.characterId || practice.characterId === persistence.characterId) return null;
    const practicedName = String(practice.characterName || "手覚えのある者");
    const persistentName = String(persistence.characterName || "跡を読む者");
    return Object.freeze({
      memberIds: Object.freeze([practice.characterId, persistence.characterId]),
      memberNames: Object.freeze([practicedName, persistentName]),
      label: "採れた手順と、空振りの跡",
      departure: `${practicedName}が持ち帰れた時の手順を話すと、${persistentName}は空振りで消えた跡を地図へ重ねた。別々の経験が、一つの狩り支度になった。`,
      encounter: `${practicedName}「採れた時は、ここから手を入れた」　${persistentName}「外れた時は、この跡が先に消えた」――二人は成功と空振りの記録を、同じ手順へ重ねた。`,
      return: `${practicedName}の手覚えと、${persistentName}が拾った空振りの痕跡を、一冊の狩り記録として持ち帰った。`
    });
  }
  function targetedHarvestConsultationRemembered(practice, persistence, monsterId, itemId) {
    return Boolean(targetedHarvestConsultationLedger(practice, persistence, monsterId, itemId));
  }
  function targetedHarvestConsultationLedger(practice, persistence, monsterId, itemId) {
    const consultation = targetedHarvestConsultation(practice, persistence);
    const record = consultation && monsterId && itemId ? sharedHuntLedger(...consultation.memberIds, monsterId, itemId) : null;
    if (!record) return null;
    const tier = [...(window.GameData.config.explorationEvents?.targetedHarvestConsultation?.rememberedTiers || [])]
      .sort((left, right) => right.minimumSuccesses - left.minimumSuccesses)
      .find(entry => record.successes >= entry.minimumSuccesses) || null;
    return tier ? Object.freeze({ record, tier, progress: sharedHuntLedgerProgress(record.successes) }) : null;
  }
  function companionDefinition(character) {
    return character?.source?.type === "companion" ? window.Companions?.definition(character.source.companionId) || null : null;
  }
  function attributeConfig() { return window.GameData.config.characterGrowth?.attributes || {}; }
  function attributeKeys() { return attributeConfig().order || ["vitality", "strength", "fortitude", "intelligence", "spirit", "dexterity", "agility", "luck"]; }
  function baseAttributes(character) { return companionDefinition(character)?.attributes || character.attributes; }
  function attributeEquipmentBonuses(equipment) {
    const bonuses = Object.fromEntries(attributeKeys().map(key => [key, 0]));
    (equipment || []).map(entry => typeof entry === "string" ? window.Items.getInstance(entry) : entry).filter(Boolean).forEach(instance => {
      Object.entries(window.Items.attributeBonuses(instance)).forEach(([key, value]) => { if (key in bonuses) bonuses[key] += Number(value) || 0; });
    });
    return bonuses;
  }
  function attributeBreakdown(character, equipmentOverride) {
    const config = attributeConfig(), keys = attributeKeys(), seed = baseAttributes(character) || {};
    const job = window.GameData.jobs[character.jobId] || window.GameData.jobs.warrior;
    const sources = identityLayers(character), growth = Math.max(0, (Number(character.level) || 1) - 1);
    const equipment = equipmentOverride == null ? character.equipment : equipmentOverride;
    const gear = attributeEquipmentBonuses(equipment);
    const intrinsic = {}, total = {};
    keys.forEach(key => {
      const origin = sources.reduce((sum, source) => sum + (Number(source.data.attributeModifiers?.[key]) || 0), 0);
      const jobGrowth = 1 + (Number(job.attributeModifiers?.[key]) || 0) * (Number(config.jobGrowthModifierPerPoint) || 0);
      intrinsic[key] = Math.max(1, Math.round(((Number(seed[key]) || Number(config.expectedInitial) || 10) + origin + growth * (Number(config.growthPerLevel) || 0) * jobGrowth) * 10) / 10);
      total[key] = Math.max(1, Math.round((intrinsic[key] + gear[key]) * 10) / 10);
    });
    return { base: intrinsic, equipment: gear, total };
  }
  function attributes(character, equipmentOverride) { return attributeBreakdown(character, equipmentOverride).total; }
  function expectedAttribute(level) {
    const config = attributeConfig();
    return (Number(config.expectedInitial) || 10) + Math.max(0, (Number(level) || 1) - 1) * (Number(config.growthPerLevel) || 0);
  }
  function attributeChart(character, equipmentOverride) {
    const config = attributeConfig(), breakdown = attributeBreakdown(character, equipmentOverride), expected = expectedAttribute(character.level);
    const scale = value => Math.min(Number(config.chartMaximum) || 100, Math.max(0, Math.round(value / expected * (Number(config.chartStandard) || 50))));
    return { keys: attributeKeys(), base: Object.fromEntries(attributeKeys().map(key => [key, scale(breakdown.base[key])])), total: Object.fromEntries(attributeKeys().map(key => [key, scale(breakdown.total[key])])) };
  }
  function luckAcquisitionMultiplier(characters) {
    const members = (characters || []).filter(Boolean);
    if (!members.length) return 1;
    const luck = members.reduce((sum, character) => sum + attributeChart(character).total.luck, 0) / members.length;
    const rule = attributeConfig().luck || {};
    return Math.min(Number(rule.acquisitionMaximum) || 1.1, 1 + Math.max(0, luck - (Number(attributeConfig().chartStandard) || 50)) * (Number(rule.acquisitionPerChartPoint) || .002));
  }

  const actionRateKeys = ["attack", "technique", "spell", "healing"];
  const defaultActionRates = () => Object.assign({}, window.GameData.config.combatRules.defaultActionRates);
  function actionRates(character) {
    const rates = character && character.actionRates;
    return rates && actionRateKeys.every(key => Number.isInteger(rates[key]) && rates[key] >= 0 && rates[key] <= 100)
      ? Object.assign({}, rates) : defaultActionRates();
  }

  function attackCountRules() {
    return window.GameData.config.combatRules?.attackCountProgression || {
      minimum: 1, maximum: 8, speedBaseline: 8, speedPerAdditionalAttack: 8,
      speedWeights: { job: 1, level: 1, profile: 1, equipment: 1, equipmentSkills: 1 }, jobBonuses: {}
    };
  }

  function attackCountForSpeed(speed, jobId, explicitBonus) {
    const rules = attackCountRules();
    const speedAttacks = Math.floor(Math.max(0, Number(speed || 0) - rules.speedBaseline) / rules.speedPerAdditionalAttack);
    const count = rules.minimum + speedAttacks + (rules.jobBonuses?.[jobId] || 0) + (Number(explicitBonus) || 0);
    return Math.min(rules.maximum, Math.max(rules.minimum, Math.round(count)));
  }

  function attackCountFor(parts) {
    const rules = attackCountRules(), weights = rules.speedWeights || {};
    const weightedSpeed = ["job", "level", "profile", "equipment", "equipmentSkills"].reduce((total, key) =>
      total + (Number(parts?.[key]) || 0) * (Number(weights[key]) || 0), 0
    );
    return attackCountForSpeed(weightedSpeed, parts?.jobId, parts?.explicitBonus);
  }

  function matchingPortraits(character) {
    return Object.values(window.GameData.portraits || {}).filter(portrait =>
      portrait.sourceType === "job" && portrait.sourceId === character.jobId
      || portrait.sourceType === "race" && portrait.sourceId === character.raceId
      || portrait.sourceType === "birth" && portrait.sourceId === character.birthId
    );
  }

  function portraitChoices() {
    return Object.values(window.GameData.portraits || {});
  }

  function portraitId(character, random) {
    const defaults = { warrior: "knight", thief: "rogue", mage: "mage", cleric: "priest", knight: "knight", ranger: "ranger", berserker: "dwarf", monk: "rogue", samurai: "lancer", ninja: "rogue", bard: "ranger", druid: "priest", hexer: "mage", spellblade: "knight", summoner: "mage" };
    if (Object.prototype.hasOwnProperty.call(window.GameData.portraits || {}, character.portraitId)) return character.portraitId;
    const matches = matchingPortraits(character);
    if (matches.length) return matches[Math.floor((random ? random() : 0) * matches.length)].id;
    return defaults[character.jobId] || "knight";
  }

  function expToNext(level) { return 60 + (level - 1) * 45; }

  function origins(character) {
    return [
      window.GameData.races[character.raceId] || window.GameData.races.human,
      window.GameData.jobs[character.jobId] || window.GameData.jobs.warrior,
      window.GameData.births[character.birthId] || window.GameData.births.common
    ];
  }

  function identityLayers(character) {
    return [
      { type: "race", id: character.raceId, data: window.GameData.races[character.raceId] || window.GameData.races.human },
      { type: "job", id: character.jobId, data: window.GameData.jobs[character.jobId] || window.GameData.jobs.warrior },
      { type: "birth", id: character.birthId, data: window.GameData.births[character.birthId] || window.GameData.births.common }
    ];
  }

  function profile(character) {
    const result = { hpMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, weightMultiplier: 1, magicAttackMultiplier: 1, magicDefenseMultiplier: 1, magicHealingMultiplier: 1, hitBonus: 0, evasionBonus: 0, skillPower: 1, healingPower: 1, speedBonus: 0, criticalBonus: 0, weaponAffinity: {}, armorAffinity: {}, elementModifiers: {}, statusResistances: {} };
    identityLayers(character).forEach((source) => {
      const layer = source.data;
      ["skillPower", "healingPower"].forEach((key) => { result[key] *= layer[key] == null ? 1 : layer[key]; });
      Object.entries(layer.elementModifiers || {}).forEach(([id, multiplier]) => { result.elementModifiers[id] = (result.elementModifiers[id] || 1) * multiplier; });
      Object.entries(layer.statusResistances || {}).forEach(([id, resistance]) => { result.statusResistances[id] = 1 - (1 - (result.statusResistances[id] || 0)) * (1 - resistance); });
      Object.entries(window.GameData.relations.equipmentAffinities[source.type][source.id] || {}).forEach(([type, multiplier]) => {
        const category = window.GameData.equipmentTypes[type].category;
        const target = category === "weapon" ? result.weaponAffinity : result.armorAffinity;
        target[type] = (target[type] || 1) * multiplier;
      });
    });
    return result;
  }

  function equipmentEffects(character, instance) {
    const effect = window.Items.effects(instance);
    const item = window.Items.template(instance.templateId);
    const buffs = profile(character);
    const multiplier = item.type === "weapon" ? buffs.weaponAffinity[item.weaponType] || 1 : buffs.armorAffinity[item.armorType] || 1;
    return { hp: Math.round(effect.hp * multiplier), attack: Math.round(effect.attack * multiplier), defense: Math.round(effect.defense * multiplier), magicAttack: Math.round(effect.magicAttack * multiplier), magicDefense: Math.round(effect.magicDefense * multiplier), magicHealing: Math.round(effect.magicHealing * multiplier), hitRate: effect.hitRate || 0, evasionRate: effect.evasionRate || 0, speed: effect.speed || 0, attackCount: effect.attackCount || 0, weight: effect.weight, affinity: multiplier };
  }

  function averageEquipmentWeight() {
    const configured = window.GameData.config.characterGrowth?.averageEquipmentWeight;
    if (Number.isFinite(configured) && configured > 0) return configured;
    const weights = Object.values(window.GameData.items || {}).filter(item => ["weapon", "armor"].includes(item.type) && Number.isFinite(item.weight)).map(item => item.weight);
    return weights.length ? weights.reduce((total, weight) => total + weight, 0) / weights.length : 4;
  }

  function equipmentCapacityAtLevel(level) {
    const growth = window.GameData.config.characterGrowth || {};
    const milestones = growth.equipmentCapacityMilestones || [[1, 1], [200, 23]];
    const currentLevel = Math.max(1, Number(level) || 1);
    if (currentLevel <= milestones[0][0]) return milestones[0][1];
    for (let index = 1; index < milestones.length; index += 1) {
      const previous = milestones[index - 1], next = milestones[index];
      if (currentLevel <= next[0]) {
        const progress = (currentLevel - previous[0]) / (next[0] - previous[0]);
        return previous[1] + (next[1] - previous[1]) * progress;
      }
    }
    const last = milestones[milestones.length - 1];
    const extended = last[1] + (currentLevel - last[0]) / (growth.postMilestoneLevelsPerItem || 17);
    return Math.min(growth.maximumAverageItems || extended, extended);
  }

  function equipmentWeightUnitAtLevel(level) {
    const milestones = window.GameData.config.characterGrowth?.equipmentWeightUnitMilestones;
    if (!Array.isArray(milestones) || !milestones.length) return averageEquipmentWeight();
    const currentLevel = Math.max(1, Number(level) || 1);
    if (currentLevel <= milestones[0][0]) return milestones[0][1];
    for (let index = 1; index < milestones.length; index += 1) {
      const previous = milestones[index - 1], next = milestones[index];
      if (currentLevel <= next[0]) {
        const progress = (currentLevel - previous[0]) / (next[0] - previous[0]);
        return previous[1] + (next[1] - previous[1]) * progress;
      }
    }
    return milestones[milestones.length - 1][1];
  }

  function baseMaxWeight(level) { return equipmentCapacityAtLevel(level) * equipmentWeightUnitAtLevel(level); }

  function maxWeight(character) {
    const value = attributes(character), expected = expectedAttribute(character.level);
    const factor = .7 + .18 * value.strength / expected + .12 * value.fortitude / expected;
    return Math.round(baseMaxWeight(character.level) * Math.max(.45, factor) * 10) / 10;
  }

  function equipmentWeight(character) {
    return character.equipment.reduce((total, instanceId) => {
      const instance = window.Items.getInstance(instanceId);
      return Math.round((total + (instance ? window.Items.effects(instance).weight : 0)) * 10) / 10;
    }, 0);
  }

  function stats(character, equipmentOverride) {
    const job = window.GameData.jobs[character.jobId] || window.GameData.jobs.warrior;
    const buffs = profile(character);
    const equipped = (equipmentOverride || character.equipment).map(entry => typeof entry === "string" ? window.Items.getInstance(entry) : entry).filter(Boolean);
    const ability = attributes(character, equipped), expected = expectedAttribute(character.level), config = attributeConfig();
    const ratio = key => ability[key] / expected;
    const derivedValue = key => {
      const definition = config.derived?.[key];
      if (!definition) return 0;
      const roleFactor = (Number(definition.floor) || 0) + Object.entries(definition.weights || {}).reduce((sum, [attribute, weight]) => sum + ratio(attribute) * Number(weight), 0);
      return Math.max(1, Math.round(((Number(definition.base) || 0) + Math.max(0, character.level - 1) * (Number(definition.perLevel) || 0)) * roleFactor));
    };
    const bonuses = equipped.reduce((total, instance) => {
      const effect = equipmentEffects(character, instance);
      total.hp += effect.hp;
      total.attack += effect.attack;
      total.defense += effect.defense;
      total.magicAttack += effect.magicAttack;
      total.magicDefense += effect.magicDefense;
      total.magicHealing += effect.magicHealing;
      total.hitRate += effect.hitRate;
      total.evasionRate += effect.evasionRate;
      total.speed += effect.speed;
      total.attackCount += effect.attackCount;
      return total;
    }, { hp: 0, attack: 0, defense: 0, magicAttack: 0, magicDefense: 0, magicHealing: 0, hitRate: 0, evasionRate: 0, speed: 0, attackCount: 0 });
    const gearSkills = window.EquipmentSkills.aggregate(equipped);
    const rates = config.rates || {};
    const normalized = key => ratio(key) * (Number(config.expectedInitial) || 10);
    const attributePower = key => {
      const rule = config.powerMultipliers?.[key];
      if (!rule) return 1;
      const attributeRatio = ratio(rule.attribute);
      const value = 1 + (attributeRatio - 1) * (Number(rule.coefficient) || 0);
      return Math.min(Number(rule.maximum) || 1.5, Math.max(Number(rule.minimum) || .8, value));
    };
    const speed = Math.max(1, Math.round((Number(rates.speedBase) || 2) + normalized("agility") * (Number(rates.speedAgility) || .8) + bonuses.speed + gearSkills.bonuses.speed));
    const raw = {
      hp: derivedValue("hp") + bonuses.hp,
      attack: derivedValue("attack") + bonuses.attack,
      defense: derivedValue("defense") + bonuses.defense,
      magicAttack: derivedValue("magicAttack") + bonuses.magicAttack,
      magicDefense: derivedValue("magicDefense") + bonuses.magicDefense,
      magicHealing: derivedValue("magicHealing") + bonuses.magicHealing,
      hitRate: Math.min(Number(rates.hitMaximum) || 1.2, Math.max(Number(rates.hitMinimum) || .1, (Number(rates.hitBase) || .75) + normalized("dexterity") * (Number(rates.hitDexterity) || .015) + normalized("agility") * (Number(rates.hitAgility) || .005) + bonuses.hitRate + gearSkills.bonuses.hitRate)),
      evasionRate: Math.min(Number(rates.evasionMaximum) || .6, Math.max(0, (Number(rates.evasionBase) || 0) + Math.max(0, normalized("agility") - (Number(rates.evasionOffset) || 5)) * (Number(rates.evasionAgility) || .012) + (normalized("dexterity") - (Number(config.expectedInitial) || 10)) * (Number(rates.evasionDexterity) || .003) + bonuses.evasionRate + gearSkills.bonuses.evasionRate)),
      speed,
      attackCount: attackCountForSpeed(speed, character.jobId, bonuses.attackCount + gearSkills.bonuses.attackCount),
      criticalRate: Math.min(Number(rates.criticalMaximum) || .8, Math.max(0, (Number(rates.criticalBase) || .02) + normalized("luck") * (Number(rates.criticalLuck) || .005) + normalized("dexterity") * (Number(rates.criticalDexterity) || .003) + gearSkills.bonuses.criticalRate))
    };
    const attributeScores = attributeChart(character, equipped).total;
    raw.luck = ability.luck;
    raw.luckScore = attributeScores.luck;
    const statusInfliction = config.statusInfliction || {};
    raw.statusChanceBonus = Math.min(Number(statusInfliction.maximumBonus) || .15,
      Math.max(0, attributeScores.intelligence - (Number(config.chartStandard) || 50)) * (Number(statusInfliction.intelligencePerChartPoint) || 0)
      + Math.max(0, attributeScores.luck - (Number(config.chartStandard) || 50)) * (Number(config.luck?.statusChancePerPoint) || 0));
    const scaled = {};
    Object.keys(gearSkills.multipliers).forEach(key => { scaled[key] = raw[key] * gearSkills.multipliers[key]; });
    const converted = {};
    gearSkills.conversions.forEach(skill => {
      converted[skill.target] = (converted[skill.target] || 0) + scaled[skill.source] * skill.value;
    });
    Object.keys(gearSkills.multipliers).forEach(key => {
      raw[key] = Math.max(1, Math.round(scaled[key] + (converted[key] || 0) * gearSkills.multipliers[key]));
    });
    raw.physicalPower = attributePower("physicalPower") * gearSkills.physicalPower;
    raw.magicPower = attributePower("magicPower") * gearSkills.magicPower;
    raw.skillPower = buffs.skillPower;
    raw.healingPower = equipped.reduce((power, instance) => (window.Items.template(instance.templateId).specialEffects || []).filter(effect => effect.kind === "healing_boost").reduce((value, effect) => value * effect.multiplier, power), attributePower("healingPower") * buffs.healingPower * gearSkills.healingPower);
    raw.healingReceived = attributePower("healingReceived");
    raw.elementModifiers = Object.assign({}, buffs.elementModifiers);
    raw.statusResistances = Object.assign({}, buffs.statusResistances);
    const statusResistanceRules = config.statusResistances || {};
    Object.entries(statusResistanceRules.byStatus || {}).forEach(([statusId, rule]) => {
      const gained = Math.min(Number(statusResistanceRules.maximum) || .25, Math.max(0,
        (normalized(rule.attribute) - (Number(config.expectedInitial) || 10)) * (Number(statusResistanceRules.perPoint) || 0)));
      if (gained > 0) raw.statusResistances[statusId] = 1 - (1 - (raw.statusResistances[statusId] || 0)) * (1 - gained);
    });
    Object.entries(gearSkills.statusResistances).forEach(([id, resistance]) => {
      raw.statusResistances[id] = 1 - (1 - (raw.statusResistances[id] || 0)) * (1 - resistance);
    });
    raw.slayerMultipliers = Object.assign({}, gearSkills.slayers);
    return raw;
  }

  function statBreakdown(character, equipmentOverride) {
    const equipment = equipmentOverride == null ? character.equipment : equipmentOverride;
    const base = stats(character, []);
    const total = stats(character, equipment);
    const contribution = {};
    ["hp", "attack", "defense", "magicAttack", "magicDefense", "magicHealing", "hitRate", "evasionRate", "speed", "attackCount", "criticalRate", "statusChanceBonus", "physicalPower", "magicPower", "skillPower", "healingPower", "healingReceived"].forEach(key => {
      contribution[key] = (total[key] || 0) - (base[key] || 0);
    });
    return { base, equipment: contribution, total };
  }

  function skillProgression(character) {
    const grants = new Map();
    function grant(id, entry, source) {
      const skill = window.GameData.skills[id];
      if (!skill) return;
      const previous = grants.get(id);
      const initial = Boolean(entry.initial), level = initial ? 1 : entry.level;
      grants.set(id, Object.assign({}, skill, {
        level: previous ? Math.min(previous.level, level) : level,
        initial: Boolean(previous?.initial || initial),
        sources: previous ? [...previous.sources, source] : [source]
      }));
    }
    identityLayers(character).forEach((source) => {
      (window.GameData.relations.skillGrants[source.type][source.id] || []).forEach((entry) => {
        grant(entry.skillId, entry, source.data.name);
      });
    });
    if (character.career) {
      const former = window.GameData.jobs[character.career.previousJobId];
      (character.career.retainedSkillIds || []).forEach(id => grant(id, { level: 1, initial: true }, `前職・${former.name}`));
      if (character.career.master) {
        const masterSkillId = window.GameData.config.classChanges[character.jobId].masterSkillId;
        grant(masterSkillId, { level: 1, initial: true }, `${window.GameData.jobs[character.jobId].name}マスター`);
      }
    }
    const companion = companionDefinition(character);
    if (companion) {
      (window.Companions?.skillGrants(companion.id) || window.GameData.relations?.companionSkillGrants?.[companion.id] || []).forEach(entry => grant(entry.skillId, entry, `${companion.name}固有`));
    }
    return Array.from(grants.values()).sort((a, b) => Number(b.initial) - Number(a.initial) || a.level - b.level);
  }

  function jobName(character) {
    const name = (window.GameData.jobs[character.jobId] || window.GameData.jobs.warrior).name;
    return character.career?.master ? `${name}マスター` : name;
  }

  function learnedSkills(character) {
    return skillProgression(character).filter((skill) => skill.initial || character.level >= skill.level);
  }

  function weaponRange(character) {
    const ranges = new Set(character.equipment.map(window.Items.getInstance).filter(item => item && window.Items.template(item.templateId).type === "weapon").map(item => window.Items.template(item.templateId).range || "melee"));
    return ranges.size > 1 ? "mixed" : ranges.has("ranged") ? "ranged" : "melee";
  }

  function basicDamageType(character, equipmentOverride) {
    const equipment = equipmentOverride || character.equipment.map(window.Items.getInstance).filter(Boolean);
    const weapons = equipment.map(entry => typeof entry === "string" ? window.Items.getInstance(entry) : entry).filter(Boolean)
      .map(instance => window.Items.template(instance.templateId)).filter(item => item?.type === "weapon");
    return weapons.length && weapons.every(item => window.GameData.equipmentTypes[item.weaponType]?.basicDamageType === "magic") ? "magic" : "physical";
  }

  function specialEquipment(character) {
    return [...new Set(character.equipment.map(window.Items.getInstance).filter(Boolean).filter(instance => (window.Items.template(instance.templateId).specialEffects || []).length).map(instance => instance.templateId))];
  }

  function addExperience(character, amount) {
    character.exp += amount;
    let levels = 0;
    while (character.exp >= expToNext(character.level)) {
      character.exp -= expToNext(character.level);
      character.level += 1;
      levels += 1;
    }
    return levels;
  }

  function setActionRates(id, rates) {
    const character = get(id);
    if (!character) return { ok: false, message: "冒険者が見つかりません。" };
    if (!rates || !actionRateKeys.every(key => Number.isInteger(rates[key]) && rates[key] >= 0 && rates[key] <= 100)) return { ok: false, message: "4種類の行動率を、それぞれ0〜100%で設定してください。" };
    character.actionRates = Object.fromEntries(actionRateKeys.map(key => [key, rates[key]]));
    window.GameState.save();
    return { ok: true, message: "行動率を保存しました。" };
  }

  function setPortrait(id, selectedId) {
    const character = get(id);
    if (!character) return { ok: false, message: "冒険者が見つかりません。" };
    if (!Object.prototype.hasOwnProperty.call(window.GameData.portraits, selectedId)) return { ok: false, message: "画像が不正です。" };
    character.portraitId = selectedId;
    window.GameState.save();
    return { ok: true, message: "キャラクター画像を変更しました。" };
  }

  window.Characters = { get, stats, statBreakdown, attributes, attributeBreakdown, attributeChart, expectedAttribute, attributeKeys, luckAcquisitionMultiplier, addExperience, emptyExpeditionRecord, expeditionRecord, targetedHarvestRecords, targetedHarvestPractice, targetedHarvestPersistence, targetedHarvestConsultation, targetedHarvestConsultationRemembered, targetedHarvestConsultationLedger, sharedHuntLedger, sharedHuntLedgers, sharedHuntLedgerProgress, sharedHuntLedgerPairs, namedHuntEpithets, developingHuntLedgers, namedHuntsForMembers, recordSharedHuntLedger, expeditionRoleLabel, recentExpeditionRole, expeditionRoleConversation, expeditionRoleReturnConversation, expeditionRoleConversationChange, skillMastery, signatureSkills, bossRivalries, activeBossRivalries, recordBossEncounter, expeditionMilestones, routeExperience, routeSpecialties, treasureSpecialty, fieldSpecialties, sharedSorties, recordSharedSortie, recordBondMemory, bondMemories, recordTitle, setRecordTitle, recordExpedition, expToNext, maxWeight, baseMaxWeight, equipmentCapacityAtLevel, averageEquipmentWeight, equipmentWeightUnitAtLevel, equipmentWeight, learnedSkills, weaponRange, basicDamageType, origins, profile, equipmentEffects, skillProgression, portraitId, portraitChoices, matchingPortraits, actionRates, setActionRates, setPortrait, specialEquipment, jobName, baseAttributes, companionDefinition, attackCountFor, attackCountForSpeed };
})();
