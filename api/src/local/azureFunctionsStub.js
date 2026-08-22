// `@azure/functions` の差し替え用スタブ。
//
// api/src/functions/*.js は `app.http(name, config)` で自身を登録するが、
// 実際の登録先 (Functions ホスト) はローカルには存在しない。
// このスタブはその登録内容を配列に溜めるだけで、functionsAdapter がそれを Express に流し込む。
//
// 本番 Node では functionsAdapter が require を差し替えてこのモジュールを注入する。
// Jest ではテスト側が jest.mock("@azure/functions", () => require(".../azureFunctionsStub"))
// で同じモジュールを注入する。どちらの経路でも同じ配列が埋まる。

const registrations = [];

const app = {
  http: (name, config) => {
    registrations.push({ name, ...config });
  },
};

module.exports = { app, registrations };
