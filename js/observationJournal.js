(function () {
  "use strict";

  function state(target = window.GameState.data) {
    if (!target.observationJournal) target.observationJournal = { version: 1, readIds: [] };
    return target.observationJournal;
  }

  function note(id) {
    return (window.GameData.observationNotes || []).find(entry => entry.id === id) || null;
  }

  function unlocked(entry) {
    return entry?.unlock?.type === "always" || Boolean(entry && window.Story.requirementSatisfied(entry.unlock));
  }

  function isRead(id) { return state().readIds.includes(id); }
  function unlockedNotes() { return (window.GameData.observationNotes || []).filter(unlocked); }
  function unread() { return unlockedNotes().filter(entry => !isRead(entry.id)); }

  function markRead(id) {
    const entry = note(id);
    if (!entry || !unlocked(entry)) return { ok: false, message: "まだ読めない記録です。" };
    const journal = state();
    if (!journal.readIds.includes(id)) {
      journal.readIds.push(id);
      window.GameState.save();
    }
    return { ok: true, message: "観察日記を読みました。" };
  }

  window.ObservationJournal = { state, note, unlocked, unlockedNotes, isRead, unread, markRead };
})();
