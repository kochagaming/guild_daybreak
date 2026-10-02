const assert = require("assert");
const audit = require("../tools/equipment-efficiency-report");

const report = audit.generate();
assert.strictEqual(report.types.length, 10);
assert(report.types.every(type => type.standard.length === 16 && type.standard.every(entry => entry.efficiency > 0)));
assert(report.summary.equipment >= 250 && report.summary.adjusted > 0);
assert.strictEqual(report.summary.regressions, 0, "Standard equipment efficiency must never fall at the next Tier");
assert.strictEqual(report.summary.severeRegressions, 0, "Standard equipment must not lose 25% or more efficiency at the next Tier");
assert.strictEqual(report.summary.excessiveAdjustments, 0, "Automatic balance corrections must remain within the declared safety limit");
const text = audit.textReport(report);
assert(text.includes("装備重量効率レポート") && text.includes("Tier間低下") && text.includes("補正上位"));

console.log("Equipment efficiency report test passed: type/Tier trends, regressions and automatic-adjustment safety limits");
