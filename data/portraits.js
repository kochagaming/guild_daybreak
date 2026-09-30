(function () {
  "use strict";
  const data = window.GameData = window.GameData || {};
  data.portraits = {
    knight: { id: "knight", name: "盾を構える騎士", image: "assets/characters/individual/legacy-00.png", legacy: true },
    rogue: { id: "rogue", name: "双刃の盗賊", image: "assets/characters/individual/legacy-01.png", legacy: true },
    mage: { id: "mage", name: "星読みの魔術師", image: "assets/characters/individual/legacy-02.png", legacy: true },
    priest: { id: "priest", name: "祈りの僧侶", image: "assets/characters/individual/legacy-03.png", legacy: true },
    archer: { id: "archer", name: "森の弓使い", image: "assets/characters/individual/legacy-04.png", legacy: true },
    dwarf: { id: "dwarf", name: "斧の重戦士", image: "assets/characters/individual/legacy-05.png", legacy: true },
    lancer: { id: "lancer", name: "旅する槍使い", image: "assets/characters/individual/legacy-06.png", legacy: true },
    ranger: { id: "ranger", name: "外套の狩人", image: "assets/characters/individual/legacy-07.png", legacy: true }
  };
  const groups = [
    { type: "job", label: "職業", table: data.jobs, files: [
      "jobs-1-v3", "jobs-2-v3", "jobs-3-v3"
    ] },
    { type: "race", label: "種族", table: data.races, files: [
      "races-1-v3", "races-2-v3", "races-3-v3"
    ] },
    { type: "birth", label: "生まれ", table: data.births, files: [
      "births-1-v3", "births-2-v3", "births-3-v3"
    ] }
  ];
  groups.forEach(group => Object.values(group.table).forEach((entry, index) => group.files.forEach((file, variantIndex) => {
    const variant = variantIndex + 1, id = `${group.type}-${entry.id}-${variant}`;
    data.portraits[id] = {
      id,
      name: `${entry.name}・外見${variant}`,
      image: `assets/characters/individual/${file}-${String(index).padStart(2, "0")}.png`,
      sourceType: group.type, sourceId: entry.id, sourceLabel: group.label, variant
    };
  })));
})();
