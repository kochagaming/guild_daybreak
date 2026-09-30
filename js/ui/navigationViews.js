(function () {
  "use strict";

  window.GameUIViews = window.GameUIViews || {};

  function routeHeader({ backAction, backLabel, kicker, title, status }) {
    return `<header class="route-header"><button type="button" class="route-back" data-action="${backAction}" aria-label="${backLabel}へ戻る"><span aria-hidden="true">‹</span><span>${backLabel}</span></button><div class="route-heading"><small>${kicker}</small><h2>${title}</h2></div>${status ? `<span class="route-status">${status}</span>` : '<span class="route-status-spacer" aria-hidden="true"></span>'}</header>`;
  }

  window.GameUIViews.navigation = { routeHeader };
})();
