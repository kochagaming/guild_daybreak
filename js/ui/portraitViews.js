(function () {
  "use strict";

  window.GameUIViews = window.GameUIViews || {};
  const PAGE_SIZE = 15;

  function image(context, character, small) {
    const portrait = window.GameData.portraits[window.Characters.portraitId(character)];
    return `<span class="character-avatar ${small ? "compact" : ""}" role="img" aria-label="${context.escape(portrait.name)}"><img class="character-avatar-image" src="${portrait.image}?v=48" alt="" loading="lazy"></span>`;
  }

  function editButton(context, character) {
    return `<button type="button" class="portrait-edit-button" data-portrait-character="${character.id}" aria-label="${context.escape(character.name)}の画像を変更（長押し、またはEnter）" title="画像を長押しして変更">${image(context, character, true)}</button>`;
  }

  function portraitType(portrait) {
    return portrait.legacy ? "legacy" : portrait.companionId ? "companion" : portrait.sourceType || "all";
  }

  function catalog(choices, options) {
    const type = options?.type || "all";
    const query = String(options?.query || "").trim().toLocaleLowerCase("ja-JP");
    const pageSize = Math.max(1, Number(options?.pageSize) || PAGE_SIZE);
    const filtered = choices.filter(portrait => (type === "all" || portraitType(portrait) === type)
      && (!query || portrait.name.toLocaleLowerCase("ja-JP").includes(query)));
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const page = Math.max(0, Math.min(pages - 1, Number(options?.page) || 0));
    return { filtered, items: filtered.slice(page * pageSize, (page + 1) * pageSize), page, pages, pageSize, total: filtered.length };
  }

  function initialCatalog(choices, selected) {
    const type = portraitType(selected);
    const sameType = choices.filter(portrait => portraitType(portrait) === type);
    const selectedIndex = Math.max(0, sameType.findIndex(portrait => portrait.id === selected.id));
    return catalog(choices, { type, page: Math.floor(selectedIndex / PAGE_SIZE), pageSize: PAGE_SIZE });
  }

  function refreshPicker(form, resetPage) {
    if (!form) return;
    const query = form.querySelector("[data-portrait-query]")?.value || "";
    const type = form.querySelector("[data-portrait-type]")?.value || "all";
    const labels = Array.from(form.querySelectorAll(".portrait-option"));
    const matching = labels.filter(label => (type === "all" || label.dataset.portraitType === type)
      && (!query.trim() || label.dataset.portraitName.includes(query.trim().toLocaleLowerCase("ja-JP"))));
    const pages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
    const requested = resetPage ? 0 : Number(form.dataset.portraitPage) || 0;
    const page = Math.max(0, Math.min(pages - 1, requested));
    const visible = new Set(matching.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE));
    labels.forEach(label => { label.hidden = !visible.has(label); });
    form.dataset.portraitPage = page;
    const count = form.querySelector("[data-portrait-count]");
    const position = form.querySelector("[data-portrait-page-label]");
    const previous = form.querySelector('[data-action="portrait-page"][data-direction="-1"]');
    const next = form.querySelector('[data-action="portrait-page"][data-direction="1"]');
    if (count) count.textContent = matching.length ? `${page * PAGE_SIZE + 1}〜${Math.min((page + 1) * PAGE_SIZE, matching.length)} / ${matching.length}種類` : "該当する画像はありません";
    if (position) position.textContent = `${page + 1} / ${pages}ページ`;
    if (previous) previous.disabled = page === 0;
    if (next) next.disabled = page >= pages - 1 || matching.length === 0;
  }

  function stepPicker(form, direction) {
    if (!form) return;
    form.dataset.portraitPage = (Number(form.dataset.portraitPage) || 0) + Number(direction || 0);
    refreshPicker(form, false);
    form.querySelector(".portrait-catalog-tools")?.scrollIntoView?.({ block: "nearest" });
  }

  function picker(context, character) {
    const selectedId = window.Characters.portraitId(character), choices = window.Characters.portraitChoices(character);
    const selected = window.GameData.portraits[selectedId];
    const initialType = portraitType(selected), initial = initialCatalog(choices, selected);
    const visibleIds = new Set(initial.items.map(portrait => portrait.id));
    const options = [["all", "すべて"], ["job", "職業画像"], ["race", "種族画像"], ["birth", "生まれ画像"], ["companion", "物語人物"], ["legacy", "従来の画像"]]
      .map(([value, label]) => `<option value="${value}" ${value === initialType ? "selected" : ""}>${label}</option>`).join("");
    const portraits = choices.map(portrait => `<label class="portrait-option" data-portrait-type="${portraitType(portrait)}" data-portrait-name="${context.escape(portrait.name.toLocaleLowerCase("ja-JP"))}" ${visibleIds.has(portrait.id) ? "" : "hidden"}><input type="radio" name="character-portrait" value="${portrait.id}" ${portrait.id === selectedId ? "checked" : ""} required><span class="portrait-option-body">${image(context, { portraitId: portrait.id })}<span>${context.escape(portrait.name)}</span><small class="portrait-selected">選択中</small></span></label>`).join("");
    return `<fieldset class="portrait-picker"><legend>キャラクター画像を選択</legend><p>職業・種族・生まれに関係なく、全${choices.length}種類から選べます。見た目のみで能力には影響しません。</p><div class="portrait-catalog-tools"><label>名称で検索<input type="search" data-portrait-query maxlength="30" placeholder="例：戦士、神官の家"></label><label>分類<select data-portrait-type>${options}</select></label></div><div class="portrait-catalog-meta"><span data-portrait-count>${initial.page * PAGE_SIZE + 1}〜${Math.min((initial.page + 1) * PAGE_SIZE, initial.total)} / ${initial.total}種類</span><span data-portrait-page-label>${initial.page + 1} / ${initial.pages}ページ</span></div><div class="portrait-options">${portraits}</div><div class="portrait-pagination" aria-label="キャラクター画像のページ切り替え"><button type="button" class="button ghost" data-action="portrait-page" data-direction="-1" ${initial.page === 0 ? "disabled" : ""}>前へ</button><button type="button" class="button ghost" data-action="portrait-page" data-direction="1" ${initial.page >= initial.pages - 1 ? "disabled" : ""}>次へ</button></div></fieldset>`;
  }

  function open(context, characterId) {
    const character = window.Characters.get(characterId);
    if (!character || !context.canEdit()) return;
    const choices = window.Characters.portraitChoices(character);
    const selected = window.GameData.portraits[window.Characters.portraitId(character)];
    const initial = initialCatalog(choices, selected);
    document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal portrait-modal" role="dialog" aria-modal="true" aria-labelledby="portrait-title"><h3 id="portrait-title">${context.escape(character.name)}の画像を変更</h3><form id="portrait-form" data-character="${characterId}" data-portrait-page="${initial.page}">${picker(context, character)}<div class="modal-actions"><button type="button" class="button ghost" data-action="close-modal">キャンセル</button><button type="submit" class="button primary">変更を保存</button></div></form></div></div>`;
  }

  window.GameUIViews.portraits = { catalog, editButton, image, open, picker, refreshPicker, stepPicker };
})();
