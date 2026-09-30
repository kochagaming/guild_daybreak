(function () {
  "use strict";
  const data = window.GameData = window.GameData || {};
  data.equipmentTypes = {
    rapier: { id: "rapier", name: "細剣", category: "weapon", summary: "命中・攻撃回数・速度" },
    sword: { id: "sword", name: "剣", category: "weapon", summary: "攻撃力・防御力" },
    katana: { id: "katana", name: "刀", category: "weapon", summary: "高い攻撃力・少ない攻撃回数" },
    bow: { id: "bow", name: "弓", category: "weapon", summary: "遠距離攻撃・命中" },
    staff: { id: "staff", name: "杖", category: "weapon", summary: "魔法攻撃・魔法回復", basicDamageType: "magic" },
    cloth: { id: "cloth", name: "布装備", category: "armor", summary: "魔法防御・軽量" },
    leather: { id: "leather", name: "革装備", category: "armor", summary: "HP・速度・回避" },
    heavy: { id: "heavy", name: "重装備", category: "armor", summary: "高い防御力・重量" },
    shield: { id: "shield", name: "盾", category: "armor", summary: "防御力・HP" },
    gauntlet: { id: "gauntlet", name: "小手", category: "armor", summary: "命中・攻撃補助" }
  };
  data.weaponTypes = Object.fromEntries(Object.values(data.equipmentTypes).filter(entry => entry.category === "weapon").map(entry => [entry.id, entry.name]));
  data.armorTypes = Object.fromEntries(Object.values(data.equipmentTypes).filter(entry => entry.category === "armor").map(entry => [entry.id, entry.name]));
  data.equipmentAffinities = {
    job: {
      warrior: { sword: 1.15, katana: 1.1, heavy: 1.2, shield: 1.15 }, thief: { rapier: 1.15, sword: 1.05, bow: 1.1, leather: 1.15, gauntlet: 1.15 },
      mage: { staff: 1.2, cloth: 1.15, heavy: .8 }, cleric: { staff: 1.1, cloth: 1.1, shield: 1.1 },
      knight: { sword: 1.08, heavy: 1.22, shield: 1.22 }, ranger: { bow: 1.22, rapier: 1.08, leather: 1.15, gauntlet: 1.08 },
      berserker: { sword: 1.18, katana: 1.15, leather: 1.05, heavy: .92 }, monk: { rapier: 1.08, gauntlet: 1.25, cloth: 1.08, heavy: .78 },
      samurai: { katana: 1.25, sword: 1.08, gauntlet: 1.12, heavy: 1.05 }, ninja: { rapier: 1.2, katana: 1.12, bow: 1.08, leather: 1.18, heavy: .72 },
      bard: { rapier: 1.1, bow: 1.08, staff: 1.05, cloth: 1.12, leather: 1.08 }, druid: { staff: 1.18, bow: 1.05, cloth: 1.12, leather: 1.08 },
      hexer: { staff: 1.24, cloth: 1.16, heavy: .7 }, spellblade: { sword: 1.15, rapier: 1.1, staff: 1.08, leather: 1.1, gauntlet: 1.08 },
      summoner: { staff: 1.22, cloth: 1.15, heavy: .72 }
    },
    race: {
      human: {}, elf: { rapier: 1.1, bow: 1.2, staff: 1.1, cloth: 1.15, heavy: .85 }, dwarf: { sword: 1.1, bow: .9, heavy: 1.2, shield: 1.15, gauntlet: 1.1 },
      beastkin: { rapier: 1.08, leather: 1.15, gauntlet: 1.12 }, halfling: { rapier: 1.12, bow: 1.08, leather: 1.12 }, gnome: { staff: 1.18, cloth: 1.12, gauntlet: 1.08 },
      orc: { sword: 1.12, katana: 1.08, heavy: 1.1 }, goblin: { rapier: 1.12, bow: 1.08, leather: 1.08 }, dragonewt: { sword: 1.1, staff: 1.05, heavy: 1.12 },
      fairy: { staff: 1.22, cloth: 1.2 }, automaton: { sword: 1.05, staff: 1.05, heavy: 1.2, shield: 1.12, gauntlet: 1.12 }, giantkin: { sword: 1.15, katana: 1.1, heavy: 1.15, shield: 1.08 },
      demonkin: { staff: 1.2, rapier: 1.08, cloth: 1.12 }, celestial: { staff: 1.18, bow: 1.08, cloth: 1.18 }, undead: { sword: 1.05, staff: 1.12, heavy: 1.08, cloth: 1.08 }
    },
    birth: {
      common: {}, guard: { sword: 1.1, heavy: 1.1, shield: 1.1 }, hunter: { rapier: 1.08, bow: 1.15, leather: 1.1, gauntlet: 1.1 },
      arcane: { staff: 1.15, cloth: 1.1 }, sacred: { staff: 1.08, cloth: 1.1 }, noble: { rapier: 1.1, sword: 1.05, shield: 1.08 },
      mercenary: { sword: 1.08, bow: 1.05, leather: 1.1 }, merchant: { rapier: 1.08, bow: 1.08, cloth: 1.05, leather: 1.05 },
      blacksmith: { sword: 1.1, katana: 1.08, heavy: 1.12, shield: 1.08, gauntlet: 1.1 }, scholar: { staff: 1.12, cloth: 1.08 },
      frontier: { bow: 1.1, sword: 1.05, leather: 1.12 }, orphan: { rapier: 1.1, leather: 1.08 }, troupe: { rapier: 1.08, bow: 1.05, cloth: 1.08 },
      alchemist: { staff: 1.12, cloth: 1.08, gauntlet: 1.12 }, dragon_ward: { katana: 1.1, bow: 1.08, heavy: 1.1, shield: 1.08 }
    }
  };
})();
