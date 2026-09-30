(function () {
  "use strict";
  let clock = () => Date.now();
  let random = () => Math.random();
  function now() { return clock(); }
  function nextRandom() { return random(); }
  function configure(options) {
    if (options.now !== undefined && typeof options.now !== "function") throw new Error("時計は関数で指定してください。");
    if (options.random !== undefined && typeof options.random !== "function") throw new Error("乱数は関数で指定してください。");
    if (options.now) clock = options.now;
    if (options.random) random = options.random;
  }
  function reset() { clock = () => Date.now(); random = () => Math.random(); }
  function seededRandom(seed) {
    let value = Math.abs(Number(seed) || 1) % 2147483647;
    if (value === 0) value = 1;
    return function () { value = value * 16807 % 2147483647; return (value - 1) / 2147483646; };
  }
  window.GameRuntime = { now, random: nextRandom, configure, reset, seededRandom };
})();
