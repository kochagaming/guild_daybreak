const fs = require("fs"), path = require("path"), assert = require("assert");
const root = path.resolve(__dirname, "..");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const gameState = fs.readFileSync(path.join(root, "js/gameState.js"), "utf8");

const readmeVersion = readme.match(/^# .+ (v\d+\.\d+)/m)?.[1];
const titleVersion = html.match(/<title>[^<]+ (v\d+\.\d+)<\/title>/)?.[1];
const visibleVersion = html.match(/<h1>[^<]+<\/h1><span>(v\d+\.\d+)<\/span>/)?.[1];
assert(readmeVersion && readmeVersion === titleVersion && titleVersion === visibleVersion, "README, document title and visible version must match");

const saveVersion = Number(gameState.match(/version:\s*(\d+),\s*\n\s*story:/)?.[1]);
assert(Number.isInteger(saveVersion));
assert(readme.includes(`現在のセーブ形式はバージョン${saveVersion}です`), "README must state the current save version");
assert(!/現在のセーブ形式は(?:バージョン)?9です/.test(readme), "obsolete save-version statements must be removed");

const chapterFiles = Array.from(html.matchAll(/src="data\/chapters\/chapter(\d+)\.js"/g), match => Number(match[1]));
assert.deepStrictEqual(chapterFiles, [4, 5, 6, 7, 8, 9, 10]);
chapterFiles.forEach(number => assert(readme.includes(`chapters/chapter${number}.js`), `README needs chapter${number}.js in the file map`));
console.log(`Documentation consistency test passed: ${readmeVersion}, save v${saveVersion}, chapter files ${chapterFiles.join(", ")}`);
