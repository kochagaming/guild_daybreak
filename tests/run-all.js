const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const directory = __dirname;
const filters = process.argv.slice(2).map(value => value.toLowerCase());
const tests = fs.readdirSync(directory)
  .filter(name => name.endsWith(".test.js"))
  .filter(name => !filters.length || filters.some(filter => name.toLowerCase().includes(filter)))
  .sort((a, b) => a.localeCompare(b, "en"));

if (!tests.length) {
  console.error(`条件に合うテストがありません: ${filters.join(", ") || "*.test.js"}`);
  process.exitCode = 1;
} else {
  const failures = [];
  tests.forEach((name, index) => {
    console.log(`\n[${index + 1}/${tests.length}] ${name}`);
    const result = spawnSync(process.execPath, [path.join(directory, name)], { stdio: "inherit" });
    if (result.status !== 0) failures.push(name);
  });

  console.log(`\n実行 ${tests.length}件 / 成功 ${tests.length - failures.length}件 / 失敗 ${failures.length}件`);
  if (failures.length) {
    console.error(`失敗: ${failures.join(", ")}`);
    process.exitCode = 1;
  }
}
