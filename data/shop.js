(function () {
  "use strict";
  window.GameData = window.GameData || {};
  window.GameData.shop = {
    daily: {
      version: 1,
      offerCount: 10,
      resetHour: 4,
      priceRoundTo: 10,
      baseMarkup: 1.25,
      modifierWeights: {
        hp: 2, attack: 14, defense: 12,
        magicAttack: 14, magicDefense: 12, magicHealing: 12,
        hitRate: 5, evasionRate: 6, speed: 18, attackCount: 180
      },
      skillMarkup: .08
    }
  };
})();
