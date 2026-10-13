(function () {
  "use strict";

  const KEY = "guildChronicleStoryReaderBookmark_v1";
  const VERSION = 2;
  const LIMIT = 12;

  function validEntry(value) {
    return Boolean(value
      && typeof value.episodeId === "string"
      && value.episodeId
      && Number.isInteger(value.sceneIndex)
      && value.sceneIndex >= 0
      && Number.isFinite(value.sceneOffset)
      && value.sceneOffset >= 0
      && Number.isFinite(value.scrollTop)
      && value.scrollTop >= 0);
  }

  function stored() {
    try {
      const raw = window.SaveStorage.get(KEY);
      if (!raw) return null;
      const value = JSON.parse(raw);
      if (value?.version === VERSION && value.entries && typeof value.entries === "object") {
        const entries = Object.fromEntries(Object.entries(value.entries).filter(([, entry]) => validEntry(entry)));
        return { version: VERSION, entries };
      }
      if (value?.version === 1 && validEntry(value)) {
        const entry = Object.assign({}, value);
        delete entry.version;
        return { version: VERSION, entries: { [entry.episodeId]: entry } };
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  function read(episodeId) {
    const entry = stored()?.entries?.[episodeId];
    return entry ? Object.assign({ version: VERSION }, entry) : null;
  }

  function list() {
    return Object.values(stored()?.entries || {})
      .sort((left, right) => Number(right.updatedAt || 0) - Number(left.updatedAt || 0))
      .map(entry => Object.assign({ version: VERSION }, entry));
  }

  function write(episodeId, position) {
    const entry = {
      episodeId,
      sceneIndex: Math.max(0, Math.floor(Number(position?.sceneIndex) || 0)),
      sceneOffset: Math.max(0, Number(position?.sceneOffset) || 0),
      scrollTop: Math.max(0, Number(position?.scrollTop) || 0),
      updatedAt: window.GameRuntime.now()
    };
    try {
      const entries = Object.assign({}, stored()?.entries, { [episodeId]: entry });
      const retained = Object.fromEntries(Object.entries(entries)
        .sort((left, right) => Number(right[1].updatedAt || 0) - Number(left[1].updatedAt || 0))
        .slice(0, LIMIT));
      window.SaveStorage.set(KEY, JSON.stringify({ version: VERSION, entries: retained }));
      return true;
    } catch (_) {
      return false;
    }
  }

  function clear(episodeId = null) {
    try {
      if (episodeId) {
        const value = stored();
        if (!value?.entries?.[episodeId]) return false;
        const entries = Object.assign({}, value.entries);
        delete entries[episodeId];
        if (Object.keys(entries).length) window.SaveStorage.set(KEY, JSON.stringify({ version: VERSION, entries }));
        else window.SaveStorage.remove(KEY);
        return true;
      }
      window.SaveStorage.remove(KEY);
      return true;
    } catch (_) {
      return false;
    }
  }

  window.StoryReaderBookmark = Object.freeze({ key: KEY, read, list, write, clear });
})();
