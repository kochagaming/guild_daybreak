(function () {
  "use strict";
  function bind(document, open, enabled) {
    let hold = null, suppressClick = false;
    const cancel = () => {
      if (hold) clearTimeout(hold.timer);
      hold = null;
    };
    document.addEventListener("pointerdown", event => {
      cancel(); suppressClick = false;
      const target = event.target.closest("[data-portrait-character]");
      if (!enabled() || !target || event.button !== 0 || event.isPrimary === false) return;
      suppressClick = false;
      const pending = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      pending.timer = setTimeout(() => {
        if (hold !== pending || !enabled() || target.isConnected === false) return;
        suppressClick = true;
        hold = null;
        open(target.dataset.portraitCharacter);
      }, 600);
      hold = pending;
    });
    document.addEventListener("pointermove", event => {
      if (hold && event.pointerId === hold.pointerId && Math.hypot(event.clientX - hold.x, event.clientY - hold.y) > 12) cancel();
    });
    document.addEventListener("pointerup", cancel);
    document.addEventListener("pointercancel", cancel);
    document.addEventListener("scroll", cancel, true);
    document.addEventListener("visibilitychange", cancel);
    document.addEventListener("click", event => {
      if (suppressClick) { suppressClick = false; event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
    document.addEventListener("contextmenu", event => {
      if (enabled() && event.target.closest("[data-portrait-character]")) event.preventDefault();
    });
    document.addEventListener("keydown", event => {
      suppressClick = false;
      const target = event.target.closest("[data-portrait-character]");
      if (!target || !enabled() || !["Enter", " "].includes(event.key)) return;
      event.preventDefault(); cancel();
      if (!event.repeat) open(target.dataset.portraitCharacter);
    });
  }
  window.PortraitPress = { bind };
})();
