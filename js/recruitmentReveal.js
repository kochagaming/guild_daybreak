(function () {
  "use strict";
  let active = null;
  function focusReveal(root) {
    const target = root.querySelector?.("[data-reveal-focus]") || root.querySelector?.("[data-reveal-action]");
    if (target) target.scrollTop = 0;
    const backdrop = root.querySelector?.("[data-recruitment-reveal]");
    if (backdrop) backdrop.scrollTop = 0;
    target?.focus?.({ preventScroll: true });
  }
  function cancel() {
    if (!active) return;
    clearTimeout(active.timer);
    active.root.onkeydown = null;
    if (active.root.innerHTML.includes("data-recruitment-reveal")) active.root.innerHTML = "";
    active = null;
  }
  function valid(entry) {
    return active === entry && entry.isCurrent() && entry.root.innerHTML.includes("data-recruitment-reveal");
  }
  function reveal(instant = false) {
    const entry = active;
    if (!entry) return;
    if (!valid(entry)) { cancel(); return; }
    clearTimeout(entry.timer);
    entry.revealed = true;
    const confetti = Array.from({ length: 18 }, (_, index) => `<i style="--confetti-left:${3 + index * 5.5}%;--confetti-delay:${(index * .035).toFixed(3)}s"></i>`).join("");
    entry.root.innerHTML = `<div class="modal-backdrop recruitment-reveal-backdrop reveal-result-backdrop${instant ? " instant-result" : ""}" data-recruitment-reveal><div class="reveal-result-flash" aria-hidden="true"></div><div class="reveal-confetti" aria-hidden="true">${confetti}</div><section class="modal recruitment-reveal is-revealed${instant ? " instant-reveal" : ""}" role="dialog" aria-modal="true" aria-labelledby="reveal-title" tabindex="-1" data-reveal-focus><div class="reveal-result-heading"><span class="label">ADVENTURER REGISTRY</span><span class="reveal-complete-mark" aria-hidden="true"><b>${entry.count}</b><small>APPLICATIONS</small></span><h3 id="reveal-title">${entry.count}人の冒険者が応募しました</h3><p>封蝋が解かれ、志願者の名が冒険者名簿に刻まれました。</p></div><div class="reveal-applicants">${entry.cards}</div><p class="reveal-note">カードからそのまま雇用するか、詳細画面で能力・適性・スキルを比較できます。</p><button type="button" class="button ghost reveal-details-button" data-action="recruitment-reveal" data-reveal-action>全員の詳細を比較する</button></section></div>`;
    focusReveal(entry.root);
  }
  function advance() {
    if (!active) return;
    if (!valid(active)) { cancel(); return; }
    if (!active.revealed) { reveal(true); return; }
    const finish = active.onFinish;
    cancel();
    finish();
  }
  function start(options) {
    cancel();
    const entry = { ...options, revealed: false, timer: null };
    active = entry;
    const sparks = Array.from({ length: 14 }, (_, index) => `<i style="--spark-left:${4 + index * 7}%;--spark-delay:${(index * .09).toFixed(2)}s"></i>`).join("");
    const glyphs = Array.from({ length: 10 }, (_, index) => `<i style="--glyph-left:${6 + index * 9.4}%;--glyph-top:${8 + (index % 4) * 19}%;--glyph-size:${.6 + (index % 3) * .25}rem;--glyph-delay:${(index * .09).toFixed(2)}s">${["✦", "◇", "✧", "△", "⋄"][index % 5]}</i>`).join("");
    const silhouettes = Array.from({ length: entry.count }, (_, index) => `<i style="--arrival:${index}"></i>`).join("");
    entry.root.innerHTML = `<div class="modal-backdrop recruitment-reveal-backdrop" data-recruitment-reveal><section class="modal recruitment-reveal recruitment-summoning" role="dialog" aria-modal="true" aria-labelledby="reveal-title" tabindex="-1" data-reveal-focus><span class="label">ADVENTURER RECRUITMENT</span><h3 id="reveal-title">新たな冒険者との出会い</h3><div class="reveal-stage" aria-hidden="true"><div class="reveal-vignette"></div><div class="reveal-stars">${glyphs}</div><div class="reveal-rays"></div><div class="reveal-contracts"><i></i><i></i><i></i></div><div class="reveal-sparks">${sparks}</div><div class="reveal-rune"><i></i><i></i><span>✦</span></div><div class="reveal-gate"><div class="reveal-gate-crown"><i></i><b>ADVENTURERS</b><i></i></div><i class="reveal-door left"></i><i class="reveal-door right"></i><div class="reveal-seal"><span>✧</span><strong>募集状を開封</strong><small>${entry.count}つの気配を確認</small></div><div class="reveal-silhouettes">${silhouettes}</div><div class="reveal-mist"></div></div><div class="reveal-beam"></div><div class="reveal-burst"></div></div><div class="reveal-phase" aria-hidden="true"><i></i><i></i><i></i><i></i></div><p class="reveal-message" role="status"><span>募集状を掲示しています</span><span>ギルド印章が金色に輝く</span><span>${entry.count}人の足音が近づいてくる</span><span>志願者の封蝋を開きます</span></p><button type="button" class="button ghost reveal-skip-button" data-action="recruitment-reveal" data-reveal-action>演出をスキップ</button></section></div>`;
    entry.root.onkeydown = event => {
      if (event.key === "Escape") { event.preventDefault(); advance(); }
      if (event.key === "Tab") {
        const actions = Array.from(entry.root.querySelectorAll?.("button:not([disabled])") || []);
        if (!actions.length) return;
        const index = actions.indexOf(document.activeElement);
        if (event.shiftKey && index <= 0) { event.preventDefault(); actions[actions.length - 1].focus(); }
        else if (!event.shiftKey && index === actions.length - 1) { event.preventDefault(); actions[0].focus(); }
      }
    };
    if (options.reducedMotion) reveal(true);
    else { entry.timer = setTimeout(reveal, 2200); focusReveal(entry.root); }
  }
  window.RecruitmentReveal = { start, advance, cancel };
})();
