(function () {
  "use strict";
  const local = {
    get: key => localStorage.getItem(key),
    set: (key, value) => localStorage.setItem(key, value),
    remove: key => localStorage.removeItem(key)
  };
  let adapter = local;
  window.SaveStorage = {
    get: key => adapter.get(key),
    set: (key, value) => adapter.set(key, value),
    remove: key => adapter.remove(key),
    use(next) {
      if (!next || !["get", "set", "remove"].every(key => typeof next[key] === "function")) throw new Error("保存先の形式が不正です。");
      adapter = next;
    },
    useLocal() { adapter = local; }
  };
})();
