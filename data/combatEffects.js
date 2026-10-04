(function () {
  "use strict";
  const data = window.GameData = window.GameData || {};

  const elements = {
    neutral: { id: "neutral", name: "無属性", icon: "◇" },
    fire: { id: "fire", name: "炎", icon: "🔥" },
    ice: { id: "ice", name: "氷", icon: "❄" },
    lightning: { id: "lightning", name: "雷", icon: "ϟ" },
    water: { id: "water", name: "水", icon: "≋" },
    nature: { id: "nature", name: "自然", icon: "❧" },
    dark: { id: "dark", name: "闇", icon: "☾" },
    arcane: { id: "arcane", name: "魔力", icon: "✦" }
  };
  const statusEffects = {
    poison: { id: "poison", name: "毒", icon: "☠", cleansePriority: 70, defaultDuration: 3, defaultPotency: .04, periodic: true, description: "ターン開始時に最大HPの4%前後のダメージ" },
    burn: { id: "burn", name: "火傷", icon: "🔥", cleansePriority: 60, defaultDuration: 3, defaultPotency: .03, periodic: true, attackMultiplier: .9, description: "ターン開始時にダメージを受け、物理攻撃力が10%低下" },
    paralysis: { id: "paralysis", name: "麻痺", icon: "ϟ", cleansePriority: 100, defaultDuration: 1, skipTurn: true, description: "次のターンの行動を行えない" },
    chill: { id: "chill", name: "凍寒", icon: "❄", cleansePriority: 80, defaultDuration: 3, speedMultiplier: .7, evasionMultiplier: .65, description: "行動速度30%・回避35%低下" }
  };
  data.registry.entities("elements", elements);
  data.registry.entities("statusEffects", statusEffects);

})();
