(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", async function () {
    const validation = window.GameState.loadError ? null : window.SaveTransfer.parse(JSON.stringify(window.GameState.data));
    const error = window.GameState.loadError || (!validation.ok && validation.message);
    if (error) {
      const panel = document.getElementById("app");
      panel.innerHTML = '<section class="panel"><h3>セーブを読み込めません</h3><p id="save-load-error"></p><p>自動変換・自動保存は停止しています。必要なデータを保存してから初期化してください。</p><button class="button ghost" id="download-unreadable-save">保存データを書き出す</button><button class="button danger" data-action="reset-save">セーブデータ初期化</button></section>';
      document.getElementById("save-load-error").textContent = error;
      document.getElementById("download-unreadable-save").addEventListener("click", () => {
        const raw = window.SaveStorage.get(window.SaveSystem.exportKey);
        if (!raw) return;
        const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
        const link = document.createElement("a");
        link.href = url; link.download = "guild-save-unreadable.json"; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
      document.querySelector('[data-action="reset-save"]').addEventListener("click", () => {
        if (!window.confirm("保存データを初期化しますか？必要なデータは先に書き出してください。")) return;
        try { window.GameState.reset(); window.location.reload(); }
        catch (failure) { document.getElementById("save-load-error").textContent = "初期化を保存できませんでした。保存設定を確認してください。"; }
      });
      return;
    }
    const progress = await window.GameClient.execute("progress.sync");
    const collection = await window.GameClient.execute("expedition.collect");
    window.UI.init();
    if (!progress.ok || !collection.ok) window.UI.showError((!progress.ok ? progress : collection).message);
  });
})();
