(function () {
  "use strict";
  const data = window.GameData = window.GameData || {};

  const plans = {
    job: [
      { tier: "veteran", label: "熟練", scale: .55 },
      { tier: "mastery", label: "奥義", scale: .9 }
    ],
    race: [
      { tier: "awakening", label: "血脈覚醒", scale: .65 },
      { tier: "trueblood", label: "真なる血脈", scale: 1 }
    ],
    birth: [
      { tier: "growth20", label: "経験の芽", scale: .45 },
      { tier: "growth60", label: "研鑽の実り", scale: .7 },
      { tier: "legacy", label: "生涯の証", scale: 1 }
    ]
  };

  const initialPlans = {
    job: [
      { tier: "offense", label: "攻めの心得", modifiers: { outgoingPhysical: 1.04, outgoingMagic: 1.04 } },
      { tier: "guard", label: "守りの心得", modifiers: { incomingPhysical: .97, incomingMagic: .97 } },
      { tier: "accuracy", label: "戦闘集中", modifiers: { hitBonus: .025 } },
      { tier: "specialty", label: "職能発揮", modifiers: { criticalBonus: .015, healing: 1.025 } }
    ],
    race: [
      { tier: "offense", label: "血統の力", modifiers: { outgoingPhysical: 1.025, outgoingMagic: 1.025 } },
      { tier: "guard", label: "血統の守り", modifiers: { incomingPhysical: .98, incomingMagic: .98 } },
      { tier: "accuracy", label: "生来の感覚", modifiers: { hitBonus: .015 } },
      { tier: "specialty", label: "種族本能", modifiers: { evasionBonus: .01, criticalBonus: .01 } }
    ],
    birth: [
      { tier: "offense", label: "幼き日の鍛錬", modifiers: { outgoingPhysical: 1.015, outgoingMagic: 1.015 } },
      { tier: "guard", label: "暮らしの知恵", modifiers: { incomingPhysical: .985, incomingMagic: .985 } },
      { tier: "accuracy", label: "身についた勘", modifiers: { hitBonus: .01 } },
      { tier: "specialty", label: "生い立ちの個性", modifiers: { criticalBonus: .005, healing: 1.015 } }
    ]
  };

  const initialOverrides = {
    job: {
      cleric: {
        specialty: {
          name: "僧侶・応急祈祷",
          category: "healing",
          description: "傷ついた仲間1人を小さく回復する。Lv10で習得する「治癒」より効果は低い。",
          activation: { type: "active", cooldownTurns: 12 },
          targeting: { scope: "lowestHpAlly" },
          effects: [{ type: "heal", target: "lowestHpAlly", scalingStat: "magicHealing", multiplier: .72 }]
        }
      }
    }
  };

  function sourceTrait(type, ownerId) {
    const prefix = `${type}_${ownerId}`;
    return Object.values(data.skills).find(skill => skill.id.startsWith(prefix) && skill.effects.some(effect => effect.type === "combatModifier"));
  }

  function scaledModifier(value, scale) {
    if (value > 1) return 1 + (value - 1) * scale;
    if (value > 0 && value < 1) return 1 - (1 - value) * scale;
    return value * scale;
  }

  function effectText(modifiers) {
    const labels = {
      outgoingPhysical: "物理攻撃威力", outgoingMagic: "魔法攻撃威力",
      incomingPhysical: "物理被ダメージ", incomingMagic: "魔法被ダメージ",
      healing: "回復威力", hitBonus: "命中", evasionBonus: "回避", criticalBonus: "会心"
    };
    return Object.entries(modifiers).map(([key, value]) => key.endsWith("Bonus")
      ? `${labels[key]}${value >= 0 ? "+" : ""}${Math.round(value * 100)}pt`
      : `${labels[key]}×${Math.round(value * 100) / 100}`).join("、");
  }

  function create(type, owner, plan) {
    const source = sourceTrait(type, owner.id);
    if (!source) throw new Error(`${type}:${owner.id}の基礎特性が見つかりません。`);
    const base = source.effects.find(effect => effect.type === "combatModifier").modifiers;
    const modifiers = Object.fromEntries(Object.entries(base).map(([key, value]) => [key, scaledModifier(value, plan.scale)]));
    const id = `progression_${type}_${owner.id}_${plan.tier}`;
    data.skills[id] = {
      id,
      name: `${owner.name}・${plan.label}`,
      category: "passive",
      description: effectText(modifiers),
      activation: { type: "passive" },
      targeting: { scope: "self" },
      effects: [{ type: "combatModifier", modifiers }]
    };
  }

  function createInitial(type, owner, plan) {
    const id = `initial_${type}_${owner.id}_${plan.tier}`;
    const override = initialOverrides[type]?.[owner.id]?.[plan.tier];
    if (override) {
      data.skills[id] = Object.assign({ id }, override);
      return;
    }
    data.skills[id] = {
      id,
      name: `${owner.name}・${plan.label}`,
      category: "passive",
      description: `${effectText(plan.modifiers)}。装備スキルとは別枠で重なる。`,
      activation: { type: "passive" },
      targeting: { scope: "self" },
      effects: [{ type: "combatModifier", modifiers: Object.assign({}, plan.modifiers) }]
    };
  }

  Object.entries({ job: data.jobs, race: data.races, birth: data.births }).forEach(([type, table]) => {
    Object.values(table).forEach(owner => {
      initialPlans[type].forEach(plan => createInitial(type, owner, plan));
      plans[type].forEach(plan => create(type, owner, plan));
    });
  });
})();
