(function () {
  "use strict";
  const local = { execute: command => window.GameCommands.dispatch(command) };
  let transport = local, queue = Promise.resolve();
  const copy = value => JSON.parse(JSON.stringify(value));
  function execute(type, payload = {}) {
    let command;
    try { command = copy({ version: 1, type, payload }); }
    catch (error) { return Promise.resolve({ ok: false, message: "ゲーム操作の形式が不正です。" }); }
    const selectedTransport = transport;
    const operation = queue.then(async () => {
      try {
        const response = await selectedTransport.execute(command);
        if (!response || typeof response.ok !== "boolean") throw new Error("操作応答の形式が不正です。");
        return copy(response);
      } catch (error) { return { ok: false, message: "操作を完了できませんでした。しばらくしてから再度お試しください。" }; }
    });
    queue = operation.then(() => undefined, () => undefined);
    return operation;
  }
  window.GameClient = {
    execute,
    snapshot: () => copy(window.GameState.data),
    useTransport(next) {
      if (!next || typeof next.execute !== "function") throw new Error("操作窓口の形式が不正です。");
      transport = next;
    },
    useLocal() { transport = local; }
  };
})();
