(function () {
  "use strict";

  window.GameUIViews = window.GameUIViews || {};

  function page() {
    const codeCard = definition => {
      const unlocked = window.AccessCodes.redeemed(definition.id);
      return `<section class="code-unlock-card ${unlocked ? "is-unlocked" : ""}"><div><span class="badge ${unlocked ? "good" : ""}">${unlocked ? "解放済み" : "未解放"}</span><h4>${definition.name}</h4><p>${definition.description}</p></div><form class="access-code-form" data-feature="${definition.id}"><label>この機能のコード<input name="code" inputmode="numeric" autocomplete="off" maxlength="64" placeholder="コードを入力" ${unlocked ? "disabled" : "required"}></label><button class="button ${unlocked ? "ghost" : "primary"}" type="submit" ${unlocked ? "disabled" : ""}>${unlocked ? "解放済み" : "コードを使用"}</button></form></section>`;
    };
    const cards = Object.values(window.GameData.accessCodes).map(codeCard).join("");
    return `<div class="page-grid settings-grid"><section class="panel wide code-unlock-panel"><div class="section-heading"><div><span class="label">ACCESS CODE</span><h3>機能コード</h3></div></div><p>解放したい機能の欄へ、それぞれ専用のコードを入力してください。探索関連の特典は新しく出撃した探索から適用されます。</p><div class="code-unlock-grid">${cards}</div></section><section class="panel wide save-panel"><h3>セーブのバックアップ</h3><p>JSONファイルに保存して、別のブラウザでも続きから遊べます。読み込みは現在の進行状況を置き換えます。</p><div class="save-actions"><button class="button secondary" data-action="export-save">セーブを書き出す</button><button class="button ghost" data-action="import-save">セーブを読み込む</button><button class="button ghost" data-action="export-before-import">読み込み前のバックアップを書き出す</button></div><p class="small-note">対応形式：バージョン11のJSON、最大2MB。読み込み前のバックアップは1件だけブラウザ内に保存します。大切なデータはファイルにも書き出してください。</p></section><section class="panel wide save-panel"><h3>セーブデータ初期化</h3><p>冒険者・装備・探索を含むすべての進行状況がリセットされ、コード解放も未解放に戻ります。必要なセーブは先に書き出してください。</p><button class="button danger" data-action="reset-save">セーブデータ初期化</button></section></div>`;
  }

  window.GameUIViews.settings = { page };
})();
