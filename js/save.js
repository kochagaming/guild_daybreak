(function () {
  "use strict";

  const SAVE_KEY = "guildChronicleSave_v01";

  window.SaveSystem = {
    load() {
      this.loadError = null;
      try {
        const raw = window.SaveStorage.get(SAVE_KEY);
        if (raw === null) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("セーブの形式が不正です。");
        return parsed;
      } catch (error) {
        console.warn("セーブデータを読み込めませんでした。", error);
        this.loadError = "セーブデータを読み込めませんでした。保存内容は変更していません。";
        return null;
      }
    },
    save(state) {
      const updatedAt = window.GameRuntime.now();
      const snapshot = Object.assign({}, state, { meta: Object.assign({}, state.meta, { updatedAt }) });
      window.SaveStorage.set(SAVE_KEY, JSON.stringify(snapshot));
      state.meta.updatedAt = updatedAt;
    },
    readBackup() { return window.SaveStorage.get(`${SAVE_KEY}_before_import`); },
    replaceWithBackup(next, current) {
      window.SaveStorage.set(`${SAVE_KEY}_before_import`, JSON.stringify(current));
      this.save(next);
    },
    exportKey: SAVE_KEY
  };
})();
