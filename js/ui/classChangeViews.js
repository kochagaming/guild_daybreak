(function () {
  "use strict";

  window.GameUIViews = window.GameUIViews || {};

  function requirementText(requirement) {
    const value = requirement.percent ? `${Math.round(requirement.current * 100)}%` : requirement.current;
    const minimum = requirement.percent ? `${Math.round(requirement.minimum * 100)}%` : requirement.minimum;
    return `${requirement.label} ${value} / ${minimum}`;
  }

  function open(context, characterId) {
    const character = window.Characters.get(characterId);
    if (!character) return;
    const choices = Object.values(window.GameData.jobs).map(job => {
      const quote = window.ClassChange.quote(characterId, job.id);
      const requirements = quote.requirements.map(requirement => `<li class="${requirement.met ? "met" : "unmet"}">${requirement.met ? "✓" : "×"} ${context.escape(requirementText(requirement))}</li>`).join("");
      const masterSkill = quote.master ? window.GameData.skills[window.GameData.config.classChanges[job.id].masterSkillId] : null;
      return `<article class="class-change-choice ${quote.eligible ? "is-eligible" : ""}"><div><span class="badge ${quote.master ? "good" : ""}">${quote.master ? "マスター職" : "通常転職"}</span><h4>${context.escape(quote.master ? job.name + "マスター" : job.name)}</h4></div><p>${context.escape(job.description)}</p><ul>${requirements}</ul>${masterSkill ? `<p class="master-skill"><strong>マスター専用：${context.escape(masterSkill.name)}</strong><br>${context.escape(masterSkill.description)}</p>` : ""}<button class="button ${quote.eligible ? "primary" : "ghost"}" data-action="choose-class-change" data-character="${character.id}" data-job="${job.id}" ${quote.eligible ? "" : "disabled"}>${context.escape(quote.message)}</button></article>`;
    }).join("");
    document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal class-change-modal" role="dialog" aria-modal="true" aria-labelledby="class-change-title"><div class="modal-heading"><div><span class="label">CLASS CHANGE</span><h3 id="class-change-title">${context.escape(character.name)}の転職</h3></div><button class="modal-close" data-action="close-modal" aria-label="閉じる">×</button></div><p>転職は生涯に一度だけです。判定は現在の装備を含む能力で行います。同じ職業を選ぶ場合はLv.50以上でマスター職になります。</p><div class="class-change-grid">${choices}</div></div></div>`;
  }

  function confirm(context, characterId, targetJobId) {
    const character = window.Characters.get(characterId), quote = window.ClassChange.quote(characterId, targetJobId);
    if (!character || !quote.ok || !quote.eligible) { context.toast(quote.message || "転職できません。", "error"); return; }
    context.setPending({ characterId, targetJobId });
    const destination = quote.master ? `${window.GameData.jobs[targetJobId].name}マスター` : window.GameData.jobs[targetJobId].name;
    const retained = quote.retainedSkillIds.map(id => window.GameData.skills[id]?.name).filter(Boolean).join("・") || "なし";
    document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="class-change-confirm-title"><h3 id="class-change-confirm-title">${context.escape(destination)}へ転職しますか？</h3><p>この操作は取り消せません。Lv.${character.level}から<strong>Lv.1・経験値0</strong>になり、装備${quote.unequippedCount}点をすべて外します。</p><p>保持する習得済みスキル：${context.escape(retained)}</p><div class="modal-actions"><button class="button ghost" data-action="request-class-change" data-character="${character.id}">戻る</button><button class="button danger" data-action="confirm-class-change">転職を確定する</button></div></div></div>`;
  }

  window.GameUIViews.classChange = { confirm, open };
})();
