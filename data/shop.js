(function () {
  "use strict";
  window.GameData = window.GameData || {};
  const data = window.GameData;
  const shop = {
    standardTiers: [],
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

  const unlocks = [null, "roadside", "seal", "starfall", "ember_crown", "mirror_tide", "clockwork_desert", "blackwood_pilgrimage", "thunder_snow_peaks", "falling_sky_castle", "black_moon_prison", "primordial_forest", "starsea_corridor", "northern_star_tomb", "returnless_capital", "end_of_starless_night"];
  const series = ["旅立ち", "鉄", "鋼", "銀鋼", "暁鉄", "潮銀", "時晶", "月樹", "雷鋼", "黒翼", "黒月", "始原", "星海", "北辰", "天鍵", "終星"];
  const existing = {
    1: { rapier: "bronze_rapier", sword: "wooden_sword", katana: "iron_katana", bow: "short_bow", cloth: "cloth_clothes", shield: "wooden_shield", gauntlet: "leather_gloves" },
    2: { sword: "iron_sword", bow: "hunter_bow", leather: "leather_armor" },
    3: { sword: "steel_sword", staff: "arcane_staff", heavy: "iron_armor" }
  };
  const tierSkills = (basic, advanced, expert) => tier => [basic, tier >= 3 ? advanced : null, tier >= 7 ? expert : null].filter(Boolean);
  const definitions = {
    rapier: { type: "weapon", label: "細剣", icon: "†", range: "melee", skills: tierSkills("accuracy_4", "critical_4", "attack_count_1"), stats: tier => ({ attack: tier * 4, attackCount: 1, hitRate: .06 + tier * .01, speed: Math.ceil(tier / 3), weight: 2 + Math.floor(tier / 4) }) },
    sword: { type: "weapon", label: "剣", icon: "⚔", range: "melee", skills: tierSkills("attack_105", "physical_power_3", "hp_105"), stats: tier => ({ attack: tier * 6, hitRate: .02 + tier * .01, defense: Math.floor(tier / 3), weight: 4 + Math.floor(tier / 3) }) },
    katana: { type: "weapon", label: "太刀", icon: "⌁", range: "melee", skills: tierSkills("physical_power_3", "critical_4", "attack_105"), stats: tier => ({ attack: tier * 9, attackCount: -1, hitRate: .01, speed: Math.floor(tier / 4), weight: 6 + Math.floor(tier / 3) }) },
    bow: { type: "weapon", label: "弓", icon: "➳", range: "ranged", skills: tierSkills("accuracy_4", "physical_power_3", "attack_count_1"), stats: tier => ({ attack: tier * 5, attackCount: 1, hitRate: .05 + tier * .01, speed: Math.ceil(tier / 4), weight: 3 + Math.floor(tier / 4) }) },
    staff: { type: "weapon", label: "杖", icon: "⚕", range: "ranged", skills: tierSkills("magic_attack_105", "magic_power_3", "magic_healing_105"), stats: tier => ({ attack: Math.max(1, Math.floor(tier / 2)), magicAttack: tier * 7, magicHealing: tier * 5, hitRate: .03 + tier * .01, hp: tier * 2, weight: 4 + Math.floor(tier / 4) }) },
    cloth: { type: "armor", label: "法衣", icon: "♜", skills: tierSkills("magic_defense_105", "magic_healing_105", "hp_105"), stats: tier => ({ defense: tier * 3, magicDefense: tier * 5, magicHealing: tier * 2, hp: tier * 3, weight: 2 + Math.floor(tier / 6) }) },
    leather: { type: "armor", label: "軽鎧", icon: "♜", skills: tierSkills("evasion_4", "speed_2", "accuracy_4"), stats: tier => ({ defense: tier * 4, magicDefense: tier * 2, hp: tier * 6, speed: Math.ceil(tier / 3), evasionRate: .02, weight: 3 + Math.floor(tier / 5) }) },
    heavy: { type: "armor", label: "重鎧", icon: "♜", skills: tierSkills("defense_105", "hp_105", "magic_defense_105"), stats: tier => ({ defense: tier * 7, magicDefense: tier * 3, hp: tier * 10, weight: 8 + Math.floor(tier / 3) }) },
    shield: { type: "armor", label: "盾", icon: "⬟", skills: tierSkills("defense_105", "hp_105", "magic_defense_105"), stats: tier => ({ defense: tier * 8, magicDefense: tier * 4, hp: tier * 8, weight: 6 + Math.floor(tier / 3) }) },
    gauntlet: { type: "armor", label: "篭手", icon: "✥", skills: tierSkills("accuracy_4", "attack_105", "speed_2"), stats: tier => ({ attack: tier * 2, defense: tier * 3, hitRate: .03 + tier * .005, speed: Math.ceil(tier / 4), weight: 2 + Math.floor(tier / 5) }) }
  };
  for (let tier = 1; tier <= series.length; tier += 1) {
    const itemIds = [];
    Object.entries(definitions).forEach(([typeId, definition]) => {
      const id = existing[tier]?.[typeId] || `standard_t${tier}_${typeId}`;
      const generated = !data.items[id];
      if (!data.items[id]) {
        const typeKey = definition.type === "weapon" ? "weaponType" : "armorType";
        data.registry.entities("items", { [id]: {
          id, name: `${series[tier - 1]}の${definition.label}`, type: definition.type, [typeKey]: typeId,
          tier, price: Math.ceil((45 + tier * tier * 55) / 10) * 10, icon: definition.icon,
          attack: 0, defense: 0, hp: 0, weight: 0, ...definition.stats(tier),
          ...(definition.range ? { range: definition.range } : {}),
          salvage: { itemId: tier >= 3 ? "iron_ore" : "craft_material", quantity: Math.max(1, Math.ceil(tier / 3)) }
        } });
      }
      if (generated) data.registry.relations("itemSkillGrants", { [id]: definition.skills(tier) });
      itemIds.push(id);
    });
    shop.standardTiers.push({ tier, unlockAfter: unlocks[tier - 1], itemIds });
  }
  data.registry.config("shop", shop);
})();
