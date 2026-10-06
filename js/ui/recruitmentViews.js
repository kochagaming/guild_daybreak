(function () {
  "use strict";

  window.GameUIViews = window.GameUIViews || {};

  function gold(value) { return `${Number(value).toLocaleString("ja-JP")}G`; }

  function priceDetails(applicant) {
    const price = window.Recruitment.costBreakdown(applicant);
    const subsidy = price.subsidy ? `<small>新設ギルド支援 −${gold(price.subsidy)}（最初の3人まで段階的に縮小）</small>` : "";
    return `<div class="hire-price-breakdown"><strong>雇用費 ${gold(price.total)}</strong><span>基本 ${gold(price.base)} ＋ 職業 ${gold(price.job)} ＋ 種族 ${gold(price.race)} ＋ 初期能力 ${gold(price.ability)}</span>${subsidy}<small>初期能力が高い応募者や、希少な職業・種族ほど契約金が上がります。</small></div>`;
  }

  function summary(requirements) {
    return window.GameData.config.recruitment.fields.map(field => `${field.name}：${requirements[field.id] === "any" ? "指定なし" : window.GameData[field.table][requirements[field.id]].name}`).join(" ／ ");
  }

  function requirementPreview(context, requirements) {
    const preview = window.Recruitment.requirementPreview(requirements);
    if (!preview) return '<p class="empty-line">現在の希望条件では確認できません。</p>';
    if (!preview.sources.length && !preview.talent) return '<p class="recruitment-preview-empty">職業・種族・生まれを指定すると、希望が通った場合のスキル構成をここで確認できます。</p>';
    const sources = preview.sources.map(source => {
      const initial = source.skills.filter(skill => skill.initial), progression = source.skills.filter(skill => !skill.initial);
      const rows = skills => skills.map(skill => `<details class="recruitment-skill-row"><summary><span class="skill-timing ${skill.initial ? "is-initial" : ""}">${skill.initial ? "初期" : `Lv.${skill.level}`}</span><strong>${context.escape(skill.name)}</strong><small>${context.escape(window.GameData.config.skillCategories[skill.category] || "スキル")}</small></summary><p>${context.escape(skill.description)}${skill.activation?.type === "active" ? ` 再使用：${skill.activation.cooldownTurns}ターン。` : ""}</p></details>`).join("");
      return `<details class="recruitment-origin-preview"><summary><span>${context.escape(source.fieldName)}</span><strong>${context.escape(source.name)}</strong><small>初期${initial.length}・成長${progression.length}</small></summary><p class="origin-preview-description">${context.escape(source.description)}</p><div class="recruitment-skill-rows">${rows(initial)}${rows(progression)}</div></details>`;
    }).join("");
    const talent = preview.talent ? `<div class="recruitment-talent-preview"><span>得意分野</span><strong>${context.escape(preview.talent.name)}</strong><p>${context.escape(preview.talent.description)}</p></div>` : "";
    return `<div class="recruitment-preview-heading"><strong>希望が通った場合の構成</strong><span>${preview.selections}項目指定</span></div><p class="small-note">初期スキルは雇用時から使用できます。レベル表示のあるスキルは到達時に習得します。スキル名を押すと効果を確認できます。</p><div class="recruitment-origin-previews">${sources}</div>${talent}`;
  }

  function applicantCard(context, applicant, requirements) {
    const { characterStatChips, escape, originBonuses, portraitImage, skillDisclosure } = context;
    const character = window.Recruitment.preview(applicant), stat = window.Characters.stats(character);
    const talent = window.GameData.recruitmentTalents[applicant.talentId];
    const cost = window.Recruitment.cost(applicant), affordable = window.GameState.data.gold >= cost;
    const matching = window.GameData.config.recruitment.fields.filter(field => requirements[field.id] !== "any").map(field => {
      const value = field.id === "focus" ? applicant.talentId : applicant[field.id];
      return `<span class="badge ${value === requirements[field.id] ? "good" : ""}">${escape(field.name)}：${value === requirements[field.id] ? "一致" : "希望と異なる"}</span>`;
    }).join("");
    const skills = window.Characters.skillProgression(character);
    const maxWeight = window.Characters.maxWeight(character);
    const skillRows = skills.map(skill => skillDisclosure(skill, { acquired: skill.initial || character.level >= skill.level })).join("");
    return `<details class="panel applicant-card compact-record"><summary class="record-summary">${portraitImage(character, true)}<span class="record-name"><strong>${escape(applicant.name)}</strong><small>${escape(window.GameData.jobs[applicant.jobId].name)} · ${escape(window.GameData.races[applicant.raceId].name)} · ${escape(window.GameData.births[applicant.birthId].name)}</small></span><span class="record-stats"><b>HP ${stat.hp}</b><b>攻 ${stat.attack}</b><b>防 ${stat.defense}</b><b>攻撃${stat.attackCount}回</b><b>重 ${maxWeight}</b></span><span class="applicant-badges"><span class="badge good">${escape(talent.name)}</span><span class="badge ${affordable ? "price" : "bad"}">${gold(cost)}</span></span><span class="record-chevron" aria-hidden="true">›</span></summary><div class="record-detail"><div class="applicant-matches">${matching || '<span class="badge">条件指定なし</span>'}</div><p class="applicant-talent"><strong>${escape(talent.name)}</strong>：${escape(talent.description)}</p>${characterStatChips(stat, maxWeight)}<p class="small-note">基礎能力：HP ${applicant.base.hp}／攻撃 ${applicant.base.attack}／防御 ${applicant.base.defense}。上の能力は出自補正を反映済み・装備なし。</p>${priceDetails(applicant)}<details class="applicant-details"><summary>能力補正・装備適性・習得スキル</summary>${originBonuses(character)}<p class="small-note">スキル名を押すと効果を確認できます。</p><div class="creation-skills">${skillRows}</div></details><button class="button primary full" data-action="review-applicant" data-applicant="${applicant.id}" ${affordable ? "" : "disabled"}>${affordable ? `雇用を確認（${gold(cost)}）` : `所持金不足（${gold(cost)}）`}</button></div></details>`;
  }

  function showReveal(context) {
    const { characterStatEntries, escape, navigate, portraitImage } = context;
    const pending = window.Recruitment.state().pending;
    if (!pending) return;
    const cards = pending.candidates.map((applicant, index) => {
      const character = window.Recruitment.preview(applicant);
      const talent = window.GameData.recruitmentTalents[applicant.talentId];
      const stat = window.Characters.stats(character);
      const cost = window.Recruitment.cost(applicant), affordable = window.GameState.data.gold >= cost;
      const statCells = characterStatEntries(stat, window.Characters.maxWeight(character)).map(entry => `<span data-stat="${entry.key}"><small>${entry.compactLabel}</small><b>${entry.value}</b></span>`).join("");
      return `<article class="reveal-applicant" style="--reveal-delay:${(index * .2).toFixed(1)}s"><i class="reveal-card-seal" aria-hidden="true"><span>✦</span><small>APPLICATION ${index + 1}</small></i><span class="reveal-number">志願者 ${index + 1}</span><div class="reveal-portrait">${portraitImage(character)}</div><span class="reveal-job">${escape(window.GameData.jobs[applicant.jobId].name)}</span><h4>${escape(applicant.name)}</h4><p>${escape(window.GameData.races[applicant.raceId].name)} · ${escape(window.GameData.births[applicant.birthId].name)}</p><small>${escape(talent.name)}</small><strong class="reveal-hire-cost ${affordable ? "" : "is-short"}">雇用費 ${gold(cost)}</strong><div class="reveal-stat-scroll" role="region" aria-label="${escape(applicant.name)}の全ステータス" tabindex="0"><div class="reveal-stats">${statCells}</div></div><span class="reveal-scroll-hint" aria-hidden="true">← 横にスライドして全能力を表示 →</span><button type="button" class="button primary reveal-hire-button" data-action="quick-hire-applicant" data-applicant="${applicant.id}" ${affordable ? "" : "disabled"}>${affordable ? `この冒険者を雇う` : "所持金不足"}</button></article>`;
    }).join("");
    window.RecruitmentReveal.start({
      root: document.getElementById("modal-root"), cards, count: pending.candidates.length,
      reducedMotion: Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches),
      isCurrent: () => window.Recruitment.state().pending?.id === pending.id,
      onFinish: () => { navigate("characters"); document.querySelector(".recruitment-board")?.focus?.(); }
    });
  }

  function openHire(context, applicantId) {
    const { escape, portraitImage, toast } = context;
    const applicant = window.Recruitment.state().pending?.candidates.find(candidate => candidate.id === applicantId);
    if (!applicant) { toast("この応募者はもう選べません。", "error"); return; }
    const cost = window.Recruitment.cost(applicant), affordable = window.GameState.data.gold >= cost;
    document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal hire-modal" role="dialog" aria-modal="true" aria-labelledby="hire-title"><h3 id="hire-title">${escape(applicant.name)}を雇用しますか？</h3><p>${escape(window.GameData.jobs[applicant.jobId].name)} ／ ${escape(window.GameData.races[applicant.raceId].name)} ／ ${escape(window.GameData.births[applicant.birthId].name)}</p><p>職業・種族・生まれ・能力は応募内容で確定します。名前だけ変更できます。画像は応募時のものを引き継ぎます。ほかの応募者は退出します。</p>${priceDetails(applicant)}<p class="hire-wallet ${affordable ? "" : "is-short"}">所持金 ${gold(window.GameState.data.gold)}${affordable ? ` ／ 雇用後 ${gold(window.GameState.data.gold - cost)}` : " ／ 所持金が不足しています"}</p><form id="hire-form" data-applicant="${applicant.id}"><label for="hire-name">名前<input id="hire-name" maxlength="16" required value="${escape(applicant.name)}"></label>${portraitImage(applicant, true)}<div class="modal-actions"><button class="button ghost" type="button" data-action="close-modal">戻る</button><button class="button primary" type="submit" ${affordable ? "" : "disabled"}>この1人を雇用する（${gold(cost)}）</button></div></form></div></div>`;
  }

  function openQuickHire(context, applicantId) {
    const { escape, navigate, portraitImage, toast } = context;
    const applicant = window.Recruitment.state().pending?.candidates.find(candidate => candidate.id === applicantId);
    if (!applicant) { toast("この応募者はもう選べません。", "error"); return; }
    const character = window.Recruitment.preview(applicant), stat = window.Characters.stats(character);
    const cost = window.Recruitment.cost(applicant), affordable = window.GameState.data.gold >= cost;
    navigate("characters");
    document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal quick-hire-modal" role="dialog" aria-modal="true" aria-labelledby="quick-hire-title"><span class="label">QUICK HIRE</span><h3 id="quick-hire-title">${escape(applicant.name)}を雇用しますか？</h3><div class="quick-hire-summary">${portraitImage(applicant, true)}<div><strong>${escape(window.GameData.jobs[applicant.jobId].name)}</strong><span>${escape(window.GameData.races[applicant.raceId].name)} · ${escape(window.GameData.births[applicant.birthId].name)}</span><small>HP ${stat.hp} ／ 攻撃 ${stat.attack} ／ 防御 ${stat.defense}</small></div></div>${priceDetails(applicant)}<p class="hire-wallet ${affordable ? "" : "is-short"}">所持金 ${gold(window.GameState.data.gold)}${affordable ? ` ／ 雇用後 ${gold(window.GameState.data.gold - cost)}` : " ／ 所持金が不足しています"}</p><p>現在の名前と画像で雇用します。ほかの応募者は退出します。名前を変えたい場合は「詳細を見る」を選んでください。</p><div class="modal-actions quick-hire-actions"><button class="button ghost" data-action="review-applicant" data-applicant="${applicant.id}">詳細を見る</button><button class="button primary" data-action="confirm-quick-hire" data-applicant="${applicant.id}" ${affordable ? "" : "disabled"}>このまま雇用（${gold(cost)}）</button></div></div></div>`;
  }

  window.GameUIViews.recruitment = { applicantCard, openHire, openQuickHire, showReveal, summary, requirementPreview };
})();

