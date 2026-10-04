"use strict";

const { loadGame } = require("./balance-report");

function equipmentTypeId(item) { return item.weaponType || item.armorType; }
function rounded(value, digits = 2) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function generate(options = {}) {
  const game = options.game || loadGame();
  const severeRegression = Number(options.severeRegression ?? .25);
  const maximumAdjustment = Number(game.GameData.config.equipmentBalance.maximumAutomaticAdjustment);
  const equipment = Object.values(game.GameData.items).filter(item => item.type === "weapon" || item.type === "armor");
  const types = Object.values(game.GameData.equipmentTypes).map(type => {
    const standard = game.GameData.config.shop.standardTiers.map(entry => {
      const itemId = entry.itemIds.find(id => equipmentTypeId(game.GameData.items[id]) === type.id);
      const item = game.GameData.items[itemId];
      return {
        tier: entry.tier, itemId, name: item.name,
        efficiency: rounded(game.Items.performancePerWeight(item), 3),
        adjustment: rounded(game.Items.tierEfficiencyMultiplier(item), 3)
      };
    });
    const regressions = standard.slice(1).map((entry, index) => {
      const previous = standard[index];
      const rate = entry.efficiency / previous.efficiency - 1;
      return rate < 0 ? { fromTier: previous.tier, toTier: entry.tier, rate: rounded(rate, 3), from: previous.efficiency, to: entry.efficiency } : null;
    }).filter(Boolean);
    const adjusted = equipment.filter(item => equipmentTypeId(item) === type.id)
      .map(item => ({ itemId: item.id, name: item.name, tier: item.tier, adjustment: rounded(game.Items.tierEfficiencyMultiplier(item), 3) }))
      .filter(item => item.adjustment > 1).sort((a, b) => b.adjustment - a.adjustment);
    return {
      id: type.id, name: type.name, category: type.category, standard, regressions, adjusted,
      severeRegressions: regressions.filter(entry => entry.rate <= -severeRegression),
      excessiveAdjustments: adjusted.filter(entry => entry.adjustment > maximumAdjustment)
    };
  });
  return {
    generatedAt: new Date().toISOString(), severeRegression, maximumAdjustment, types,
    summary: {
      equipment: equipment.length,
      adjusted: types.reduce((sum, type) => sum + type.adjusted.length, 0),
      regressions: types.reduce((sum, type) => sum + type.regressions.length, 0),
      severeRegressions: types.reduce((sum, type) => sum + type.severeRegressions.length, 0),
      excessiveAdjustments: types.reduce((sum, type) => sum + type.excessiveAdjustments.length, 0)
    }
  };
}

function textReport(report) {
  const lines = [
    "装備重量効率レポート",
    `装備 ${report.summary.equipment}点／自動補正 ${report.summary.adjusted}点／Tier間低下 ${report.summary.regressions}件`,
    `重大な低下 ${report.summary.severeRegressions}件／過大補正 ${report.summary.excessiveAdjustments}件`, ""
  ];
  report.types.forEach(type => {
    lines.push(`${type.name}：${type.standard.map(entry => `T${entry.tier} ${entry.efficiency}`).join(" → ")}`);
    type.regressions.forEach(entry => lines.push(`  ↳ T${entry.fromTier}→T${entry.toTier} ${rounded(entry.rate * 100, 1)}%${entry.rate <= -report.severeRegression ? " ⚠" : ""}`));
    if (type.adjusted.length) lines.push(`  補正上位：${type.adjusted.slice(0, 3).map(item => `${item.name}×${item.adjustment}`).join("／")}`);
  });
  return lines.join("\n");
}

if (require.main === module) {
  const report = generate();
  console.log(textReport(report));
  if (report.summary.severeRegressions || report.summary.excessiveAdjustments) process.exitCode = 1;
}

module.exports = { generate, textReport };
