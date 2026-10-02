(function () {
  "use strict";

  window.GameUIViews = window.GameUIViews || {};

  function sortValue(character, instance, sort) {
    const effect = window.Characters.equipmentEffects(character, instance);
    if (sort === "attack") return effect.attack * Math.max(1, effect.attackCount + 1) + effect.magicAttack;
    if (sort === "defense") return effect.defense + effect.magicDefense;
    if (sort === "weight") return -effect.weight;
    if (sort === "newest") return instance.acquiredAt || 0;
    return effect.attack * 2 + effect.attackCount * 12 + effect.magicAttack * 2 + effect.defense * 1.5 + effect.magicDefense * 1.5 + effect.magicHealing * 1.5 + effect.hitRate * 200 + effect.hp * .25 - effect.weight;
  }

  function rounded(value, digits) {
    const scale = 10 ** (digits || 0);
    return Math.round((Number(value) || 0) * scale) / scale;
  }

  function breakdownValue(value, format) {
    if (format === "percent") return `${rounded(value * 100, 1)}%`;
    return String(rounded(value, 1));
  }

  function breakdownDelta(value, format) {
    const converted = format === "percent" ? rounded(value * 100, 1) : rounded(value, 1);
    return `${Math.abs(converted)}${format === "percent" ? "pt" : ""}`;
  }

  function candidateComparison(current, after) {
    const fields = [
      ["hp", "HP"], ["attack", "物攻"], ["defense", "物防"],
      ["magicAttack", "魔攻"], ["magicDefense", "魔防"], ["magicHealing", "魔回"],
      ["hitRate", "命中", "percent"], ["evasionRate", "回避", "percent"],
      ["speed", "速度"], ["attackCount", "回数"], ["criticalRate", "会心", "percent"],
      ["physicalPower", "物理威力", "percent"], ["magicPower", "魔法威力", "percent"],
      ["skillPower", "技威力", "percent"], ["healingPower", "回復威力", "percent"]
    ];
    return fields.map(([key, label, format]) => {
      const raw = (Number(after[key]) || 0) - (Number(current[key]) || 0);
      const delta = format === "percent" ? rounded(raw * 100, 1) : rounded(raw, 1);
      if (!delta) return "";
      const value = format === "percent" ? `${rounded((Number(after[key]) || 0) * 100, 1)}%` : rounded(after[key], 1);
      return `<span><b>${label}</b><strong>${value}</strong><em class="${delta > 0 ? "positive" : "negative"}">${delta > 0 ? "+" : ""}${delta}${format === "percent" ? "pt" : ""}</em></span>`;
    }).filter(Boolean).join("");
  }

  function characterAbilitySheet(character, escape) {
    const breakdown = window.Characters.statBreakdown(character);
    const stats = [
      ["hp", "最大HP"], ["attack", "物理攻撃"], ["defense", "物理防御"],
      ["magicAttack", "魔法攻撃"], ["magicDefense", "魔法防御"], ["magicHealing", "魔法回復"],
      ["hitRate", "命中率", "percent"], ["evasionRate", "回避率", "percent"],
      ["speed", "行動速度"], ["attackCount", "攻撃回数"], ["criticalRate", "会心率", "percent"],
      ["physicalPower", "物理攻撃威力", "percent"], ["magicPower", "魔法攻撃威力", "percent"],
      ["skillPower", "スキル威力", "percent"], ["healingPower", "回復威力", "percent"]
    ];
    const statRows = stats.map(([key, label, format]) => `<div class="equipment-breakdown-row" role="row"><span class="equipment-breakdown-name" role="rowheader">${label}</span><span class="equipment-breakdown-values" role="cell"><span>${breakdownValue(breakdown.base[key], format)}</span><i>${breakdown.equipment[key] < 0 ? "−" : "+"}</i><b class="${breakdown.equipment[key] < 0 ? "negative" : breakdown.equipment[key] > 0 ? "positive" : ""}">${breakdownDelta(breakdown.equipment[key], format)}</b><i>=</i><strong>${breakdownValue(breakdown.total[key], format)}</strong></span></div>`).join("");
    const learnedSkills = window.Characters.learnedSkills(character);
    const abilityRow = (kind, kindClass, name, description, source) => `<li><details class="equipment-ability-entry"><summary><span class="equipment-ability-kind ${kindClass || ""}">${escape(kind)}</span><strong>${escape(name)}</strong><i aria-hidden="true">›</i></summary><div class="equipment-ability-detail"><p>${escape(description)}</p>${source ? `<small>${escape(source)}</small>` : ""}</div></details></li>`;
    const skillRow = skill => {
      const cooldown = skill.activation?.type === "active" ? ` 再使用：${skill.activation.cooldownTurns}ターン。` : "";
      return abilityRow(window.GameData.skillCategories[skill.category] || "スキル", skill.category === "passive" ? "passive" : skill.category === "reaction" ? "reaction" : "", skill.name, `${skill.description}${cooldown}`, `習得元：${skill.sources.join("・")}`);
    };
    const techniques = learnedSkills.filter(skill => skill.category === "technique"), spells = learnedSkills.filter(skill => skill.category === "spell"), healing = learnedSkills.filter(skill => skill.category === "healing");
    const inherentTraits = learnedSkills.filter(skill => skill.category === "passive" || skill.category === "reaction");
    const techniqueRows = techniques.map(skillRow).join(""), spellRows = spells.map(skillRow).join(""), healingRows = healing.map(skillRow).join(""), inherentTraitRows = inherentTraits.map(skillRow).join("");
    const equipped = character.equipment.map(window.Items.getInstance).filter(Boolean);
    const gearSkills = new Map();
    equipped.forEach(instance => window.EquipmentSkills.ids(instance).forEach(id => {
      const skill = window.GameData.equipmentSkills[id];
      if (!skill) return;
      if (!gearSkills.has(id)) gearSkills.set(id, { skill, items: [] });
      gearSkills.get(id).items.push(window.Items.displayName(instance));
    }));
    const gearSkillRows = Array.from(gearSkills.values()).map(entry => abilityRow("装備", "passive", entry.skill.name, `${entry.skill.description} 同名効果は重複しません。`, `装備元：${[...new Set(entry.items)].join("・")}`)).join("");
    const specialItems = [...new Map(equipped.filter(instance => window.Items.template(instance.templateId).effectDescription).map(instance => [instance.templateId, window.Items.template(instance.templateId)])).values()];
    const specialRows = specialItems.map(item => abilityRow("固有", "unique", item.name, item.effectDescription, "ボス固有装備")).join("");
    const elementTraits = Object.entries(breakdown.total.elementModifiers || {}).filter(([, value]) => value !== 1).map(([id, value]) => `<span>${escape(window.GameData.elements[id]?.name || id)}被害 <strong>${rounded(value * 100, 1)}%</strong></span>`);
    const statusTraits = Object.entries(breakdown.total.statusResistances || {}).filter(([, value]) => value > 0).map(([id, value]) => `<span>${escape(window.GameData.statusEffects[id]?.name || id)}耐性 <strong>${rounded(value * 100, 1)}%</strong></span>`);
    const traits = [...elementTraits, ...statusTraits];
    return `<div class="equipment-character-sheet"><section class="equipment-stat-section"><div class="equipment-sheet-heading"><h4>戦闘能力</h4><span>冒険者 ＋ 装備 ＝ 合計</span></div><div class="equipment-breakdown" role="table" aria-label="冒険者の能力と装備による増減">${statRows}</div><div class="equipment-capacity-line"><span>装備重量</span><strong>${window.Characters.equipmentWeight(character)} / ${window.Characters.maxWeight(character)}</strong><small>${window.Characters.weaponRange(character) === "mixed" ? "近接・遠距離併用" : window.Characters.weaponRange(character) === "ranged" ? "遠距離" : "近接"}</small></div><p class="equipment-breakdown-note">装備欄は、適性・品質・追加性能・強化・装備スキル・固有效果を反映した最終的な増減です。</p>${traits.length ? `<div class="equipment-trait-list">${traits.join("")}</div>` : ""}</section><section class="equipment-ability-section"><div class="equipment-sheet-heading"><h4>技</h4><span>${techniques.length}種</span></div><ul class="equipment-ability-list">${techniqueRows || '<li class="is-empty">現在使える技はありません。</li>'}</ul></section><section class="equipment-ability-section"><div class="equipment-sheet-heading"><h4>呪文</h4><span>${spells.length}種</span></div><ul class="equipment-ability-list">${spellRows || '<li class="is-empty">現在使える呪文はありません。</li>'}</ul></section><section class="equipment-ability-section"><div class="equipment-sheet-heading"><h4>回復</h4><span>${healing.length}種</span></div><ul class="equipment-ability-list">${healingRows || '<li class="is-empty">現在使える回復はありません。</li>'}</ul></section><section class="equipment-ability-section equipment-trait-section"><div class="equipment-sheet-heading"><h4>特性・装備効果</h4><span>${inherentTraits.length + gearSkills.size + specialItems.length}種</span></div><ul class="equipment-ability-list">${inherentTraitRows}${gearSkillRows}${specialRows}${!inherentTraitRows && !gearSkillRows && !specialRows ? '<li class="is-empty">発動中の特性・装備効果はありません。</li>' : ""}</ul></section></div>`;
  }

  function render(context) {
    const { actionRatePresets, effectModifierText, empty, equipmentChangeNotice, equipmentPicker, equipmentReturnToParty, equipmentSkillBadges, escape, portraitEditButton } = context;
    const characterId = equipmentPicker.characterId;
    const character = window.Characters.get(characterId);
    if (!character) return;
    const current = window.Characters.stats(character);
    const normalizedQuery = equipmentPicker.query.trim().toLocaleLowerCase("ja");
    const selectedType = String(equipmentPicker.kind || "all").split(":");
    const matchesType = item => equipmentPicker.kind === "all"
      || (selectedType.length === 1 ? item.type === selectedType[0] : item.type === selectedType[0] && (item.weaponType || item.armorType) === selectedType[1]);
    const candidates = window.Items.available().filter(instance => {
      const item = window.Items.template(instance.templateId);
      const canEquip = window.Items.canEquip(characterId, instance.id).ok;
      return matchesType(item)
        && (equipmentPicker.quality === "all" || instance.qualityId === equipmentPicker.quality)
        && (equipmentPicker.fit === "all" || (equipmentPicker.fit === "available" ? canEquip : !canEquip))
        && (!normalizedQuery || window.Items.displayName(instance).toLocaleLowerCase("ja").includes(normalizedQuery)
          || window.EquipmentSkills.descriptions(instance).some(skill => skill.name.toLocaleLowerCase("ja").includes(normalizedQuery)));
    }).sort((a, b) => Number(b.id === equipmentPicker.focusInstanceId) - Number(a.id === equipmentPicker.focusInstanceId)
      || sortValue(character, b, equipmentPicker.sort) - sortValue(character, a, equipmentPicker.sort)
      || Number(b.id.split("-")[1]) - Number(a.id.split("-")[1]));
    const candidateGroups = window.Items.groupEquipment(candidates);
    const pageSize = 24, pages = Math.max(1, Math.ceil(candidateGroups.length / pageSize));
    equipmentPicker.page = Math.min(equipmentPicker.page, pages - 1);
    const visible = candidateGroups.slice(equipmentPicker.page * pageSize, (equipmentPicker.page + 1) * pageSize);
    const cards = visible.map(group => {
      const focused = group.instances.some(candidate => candidate.id === equipmentPicker.focusInstanceId);
      const instance = group.instances.find(candidate => candidate.id === equipmentPicker.focusInstanceId) || group.representative;
      const effect = window.Characters.equipmentEffects(character, instance);
      const check = window.Items.canEquip(characterId, instance.id);
      const grade = window.Items.quality(instance);
      const template = window.Items.template(instance.templateId);
      const typeName = template.type === "weapon" ? window.GameData.weaponTypes[template.weaponType] : window.GameData.armorTypes[template.armorType];
      const rangeName = template.type === "weapon" ? (template.range === "ranged" ? "遠距離" : "近接") : "防具";
      const after = window.Characters.stats(character, [...character.equipment, instance.id]);
      return `<div class="equipment-picker-row equipment-stack compact-record quality-border-${grade.color} ${focused ? "is-focused-equipment" : ""}"><details class="equipment-picker-disclosure" ${focused ? "open" : ""}><summary class="record-summary"><span class="record-name"><span class="quality-label quality-${grade.color}">${escape(typeName)} · 品質：${escape(window.Items.qualityCompact(instance))}</span><strong>${escape(window.Items.displayName(instance))}</strong><small>${focused ? "選択した装備 · " : ""}${rangeName} · 重${effect.weight}</small></span><strong class="equipment-stack-count">×${group.instances.length}</strong><span class="record-stats"><b>HP ${effect.hp ? `+${effect.hp}` : "—"}</b><b>攻 ${effect.attack ? `+${effect.attack}` : "—"}</b><b>防 ${effect.defense ? `+${effect.defense}` : "—"}</b><b>命中 ${effect.hitRate ? `+${Math.round(effect.hitRate * 100)}pt` : "—"}</b><b>回数 ${effect.attackCount ? `${effect.attackCount > 0 ? "+" : ""}${effect.attackCount}` : "—"}</b></span><span class="record-chevron" aria-hidden="true">›</span></summary><div class="equipment-picker-detail"><div class="equipment-picker-diff"><small>装備後に変わる能力</small>${candidateComparison(current, after)}</div><div class="equipment-picker-skill">${equipmentSkillBadges(instance)}${Object.values(instance.modifiers || {}).some(Boolean) ? `<small>${escape(effectModifierText(instance))}</small>` : ""}</div><button class="button primary" data-action="equip-instance" data-character="${characterId}" data-instance="${instance.id}" ${check.ok ? "" : "disabled"}>${check.ok ? `1個装備する（残り${group.instances.length}）` : escape(check.message)}</button></div></details><button type="button" class="button primary equipment-quick-equip" data-action="equip-instance" data-character="${characterId}" data-instance="${instance.id}" ${check.ok ? "" : "disabled"}>${check.ok ? "装備" : "不可"}</button></div>`;
    }).join("");
    const equipped = character.equipment.map(window.Items.getInstance).filter(Boolean).map(instance => {
      const template = window.Items.template(instance.templateId), effect = window.Items.effects(instance);
      const typeName = template.type === "weapon" ? window.GameData.weaponTypes[template.weaponType] : window.GameData.armorTypes[template.armorType];
      return `<div><span><strong>${escape(window.Items.displayName(instance))}</strong><small>${escape(typeName || "装備")} · 攻${effect.attack} 防${effect.defense} · 重${effect.weight}</small></span><button class="button ghost" data-action="unequip" data-character="${character.id}" data-instance="${instance.id}">外す</button></div>`;
    }).join("");
    const qualityOptions = Object.values(window.GameData.qualities).sort((a, b) => a.rank - b.rank).map(quality => `<option value="${quality.id}" ${equipmentPicker.quality === quality.id ? "selected" : ""}>${escape(quality.prefix || "標準")}</option>`).join("");
    const filtersActive = Boolean(equipmentPicker.query || equipmentPicker.kind !== "all" || equipmentPicker.quality !== "all" || equipmentPicker.fit !== "all" || equipmentPicker.sort !== "recommended" || equipmentPicker.page);
    const equipmentTypeOptions = ["weapon", "armor"].map(category => {
      const label = category === "weapon" ? "武器" : "防具";
      const exactTypes = Object.values(window.GameData.equipmentTypes).filter(type => type.category === category).map(type => `<option value="${category}:${type.id}" ${equipmentPicker.kind === `${category}:${type.id}` ? "selected" : ""}>${escape(type.name)}</option>`).join("");
      return `<optgroup label="${label}"><option value="${category}" ${equipmentPicker.kind === category ? "selected" : ""}>${label}すべて</option>${exactTypes}</optgroup>`;
    }).join("");
    const rates = window.Characters.actionRates(character);
    const rateFields = [["attack", "攻撃"], ["technique", "技"], ["spell", "呪文"], ["healing", "回復"]].map(([key, label]) => `<label><span>${label}</span><input type="range" min="0" max="100" step="1" name="${key}" value="${rates[key]}" data-action-rate-slider aria-label="${label}行動率 ${rates[key]}%"><output data-action-rate-value>${rates[key]}%</output></label>`).join("");
    const currentWeight = window.Characters.equipmentWeight(character), maxWeight = window.Characters.maxWeight(character);
    const partyIndex = window.GameState.data.parties.findIndex(party => party.includes(character.id));
    const routeActions = equipmentPicker.origin === "inventory" ? `<div class="equipment-route-actions"><button class="button ghost" data-action="close-modal">所持品へ戻る</button><button class="button primary" data-action="review-equipped-character" data-character="${character.id}">${partyIndex >= 0 ? "パーティ編成で確認" : "冒険者詳細で確認"}</button></div>` : "";
    const changeNotice = equipmentChangeNotice ? `<aside id="equipment-change-notice" class="equipment-change-notice" role="status" aria-live="polite"><strong>${escape(equipmentChangeNotice.title)}</strong><div>${equipmentChangeNotice.rows.length ? equipmentChangeNotice.rows.map(row => `<span><b>${escape(row.label)}</b><small>${escape(row.before)} → ${escape(row.after)}</small><em class="${row.tone}">${escape(row.delta)}</em></span>`).join("") : '<span><b>能力値</b><small>変化なし</small></span>'}</div><p>重量 ${escape(equipmentChangeNotice.weight)}</p>${routeActions}</aside>` : "";
    const characterControls = `<div class="equipment-persistent-weight" aria-label="現在の装備重量"><span>装備重量</span><strong>${currentWeight} / ${maxWeight}</strong><small>残り ${Math.max(0, Math.round((maxWeight - currentWeight) * 10) / 10)}</small></div>${changeNotice}<details class="equipment-character-settings" open><summary>${portraitEditButton(character)}<span><strong>${escape(character.name)}</strong><small>Lv.${character.level} · ${escape(window.Characters.jobName(character))} · 能力・技・呪文・回復・特性</small></span><i>›</i></summary>${characterAbilitySheet(character, escape)}<form class="action-rate-form" data-character="${character.id}"><div class="action-rate-heading"><strong>行動率</strong><output class="action-rate-total is-valid" data-action-rate-total>優先順 回復 → 呪文 → 技 → 攻撃</output></div>${actionRatePresets()}${rateFields}<p class="action-rate-guide">使用可能な行動を優先順に個別判定します。すべての判定に失敗した場合は防御します。合計値の制限はありません。</p><button class="button secondary" type="submit">保存</button></form></details>`;
    document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop equipment-modal-backdrop ${equipmentReturnToParty ? "party-equipment-route" : ""}" data-action="close-modal"><div class="modal equipment-modal" role="dialog" aria-modal="true" aria-labelledby="equipment-title"><div class="modal-heading equipment-modal-heading"><div><span class="label">${equipmentReturnToParty ? `第${window.Party.selected() + 1}パーティ › CHARACTER EQUIPMENT` : "EQUIPMENT"}</span><h3 id="equipment-title">${escape(character.name)}の装備</h3></div><button class="modal-close party-equipment-back" data-action="close-modal" aria-label="${equipmentReturnToParty ? "メンバー編成へ戻る" : "閉じる"}">${equipmentReturnToParty ? "‹ 編成へ" : "×"}</button></div>${characterControls}<div class="equipment-picker-summary"><div><span>装備数</span><strong>${character.equipment.length}</strong></div><div><span>重量</span><strong>${window.Characters.equipmentWeight(character)} / ${window.Characters.maxWeight(character)}</strong></div><div><span>候補</span><strong>${candidateGroups.length}種 · ${candidates.length}点</strong></div></div><details class="equipped-compact" ${character.equipment.length ? "open" : ""}><summary>装備中 ${character.equipment.length}点　<span>タップして確認・外す</span></summary><div>${equipped || '<p class="empty-line">未装備</p>'}</div><footer class="equipped-compact-actions">${partyIndex >= 0 ? `<button class="button secondary" type="button" data-action="open-party-presets" data-party="${partyIndex}">編成プリセット</button>` : ""}<button class="button ghost" type="button" data-action="request-unequip-all" data-character="${character.id}" ${character.equipment.length ? "" : "disabled"}>装備をすべて外す</button></footer></details><form id="equipment-picker-form" class="equipment-picker-controls"><label class="equipment-search">検索<input id="equipment-picker-query" value="${escape(equipmentPicker.query)}" placeholder="装備名・スキル名"></label><label>装備種別<select id="equipment-picker-kind" data-equipment-filter="kind"><option value="all">すべて</option>${equipmentTypeOptions}</select></label><label>品質<select id="equipment-picker-quality" data-equipment-filter="quality"><option value="all">すべて</option>${qualityOptions}</select></label><label>重量条件<select id="equipment-picker-fit" data-equipment-filter="fit"><option value="all">すべて</option><option value="available" ${equipmentPicker.fit === "available" ? "selected" : ""}>装備可能</option><option value="overweight" ${equipmentPicker.fit === "overweight" ? "selected" : ""}>重量超過</option></select></label><label>順序<select id="equipment-picker-sort" data-equipment-filter="sort"><option value="recommended" ${equipmentPicker.sort === "recommended" ? "selected" : ""}>おすすめ</option><option value="attack" ${equipmentPicker.sort === "attack" ? "selected" : ""}>攻撃性能</option><option value="defense" ${equipmentPicker.sort === "defense" ? "selected" : ""}>防御性能</option><option value="weight" ${equipmentPicker.sort === "weight" ? "selected" : ""}>軽い順</option><option value="newest" ${equipmentPicker.sort === "newest" ? "selected" : ""}>入手順</option></select></label><button class="button secondary equipment-search-button" type="submit">検索</button><button class="button ghost equipment-reset-button" type="button" data-action="reset-equipment-filters" ${filtersActive ? "" : "disabled"}>条件を解除</button></form><p class="mobile-equipment-guide">装備種別・品質・重量条件を組み合わせて候補を絞り込めます。</p>${candidates.length ? `<div class="equipment-picker-list">${cards}</div><nav class="pagination" aria-label="装備候補のページ"><button class="button ghost" data-action="equipment-page" data-page="${equipmentPicker.page - 1}" ${equipmentPicker.page === 0 ? "disabled" : ""}>前へ</button><span>${equipmentPicker.page + 1} / ${pages}ページ · ${candidateGroups.length}種</span><button class="button ghost" data-action="equipment-page" data-page="${equipmentPicker.page + 1}" ${equipmentPicker.page >= pages - 1 ? "disabled" : ""}>次へ</button></nav>` : empty("条件に合う装備がありません", "記憶している条件を解除すると、所持しているすべての装備へ戻れます。", '<button class="button secondary" type="button" data-action="reset-equipment-filters">すべての装備を表示</button>')}</div></div>`;
  }

  window.GameUIViews.equipment = { render };
})();
