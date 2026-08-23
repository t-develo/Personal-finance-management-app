"use strict";

// /healthz (deploy/update.sh が更新後の生存確認に使う) の検証。
process.env.STORE_BACKEND = "sqlite";
process.env.SQLITE_PATH = ":memory:";
process.env.LOCAL_USER_ID = "local-test-user";
process.env.FRONTEND_DIST = "/nonexistent-dist-for-tests";

jest.mock("@azure/functions", () => require("../local/azureFunctionsStub"));

const fs = require("fs");
const os = require("os");
const path = require("path");

const { createServer, buildHealth, readCommit } = require("../local/server");
const sqliteStore = require("../shared/store.sqlite");

let server;
let baseUrl;

beforeAll(async () => {
  jest.spyOn(console, "warn").mockImplementation(() => {});
  await new Promise((resolve) => {
    server = createServer().listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  sqliteStore.closeDb();
  jest.restoreAllMocks();
});

/** .git の最小構造を作る。 */
function makeRepo(head, refs = {}, packedRefs = null) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kakei-health-"));
  const gitDir = path.join(root, ".git");
  fs.mkdirSync(gitDir, { recursive: true });
  fs.writeFileSync(path.join(gitDir, "HEAD"), head);
  for (const [ref, sha] of Object.entries(refs)) {
    const file = path.join(gitDir, ref);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${sha}\n`);
  }
  if (packedRefs !== null) {
    fs.writeFileSync(path.join(gitDir, "packed-refs"), packedRefs);
  }
  return root;
}

describe("GET /healthz", () => {
  it("200 と稼働情報を返す", async () => {
    const res = await fetch(`${baseUrl}/healthz`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.backend).toBe("sqlite");
    // FRONTEND_DIST は存在しないパスを指しているので false になる
    expect(body.frontendDist).toBe(false);
    expect(typeof body.uptimeSec).toBe("number");
    expect(body).toHaveProperty("commit");
  });

  it("SPA フォールバックに飲み込まれず JSON を返す", async () => {
    const res = await fetch(`${baseUrl}/healthz`);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
  });
});

describe("buildHealth", () => {
  it("backend は STORE_BACKEND を反映し、未設定なら azure になる", () => {
    expect(buildHealth().backend).toBe("sqlite");

    const original = process.env.STORE_BACKEND;
    delete process.env.STORE_BACKEND;
    try {
      expect(buildHealth().backend).toBe("azure");
    } finally {
      process.env.STORE_BACKEND = original;
    }
  });
});

describe("readCommit", () => {
  it("HEAD が指す ref ファイルから SHA を読む", () => {
    const sha = "a".repeat(40);
    const root = makeRepo("ref: refs/heads/main\n", { "refs/heads/main": sha });
    expect(readCommit(root)).toBe(sha);
  });

  it("ref ファイルが無ければ packed-refs から引く", () => {
    const sha = "b".repeat(40);
    const root = makeRepo(
      "ref: refs/heads/main\n",
      {},
      `# pack-refs with: peeled fully-peeled sorted \n${sha} refs/heads/main\n`
    );
    expect(readCommit(root)).toBe(sha);
  });

  it("detached HEAD では SHA をそのまま返す", () => {
    const sha = "c".repeat(40);
    expect(readCommit(makeRepo(`${sha}\n`))).toBe(sha);
  });

  it("git 管理外なら null を返す (例外は投げない)", () => {
    expect(readCommit(fs.mkdtempSync(path.join(os.tmpdir(), "kakei-nogit-")))).toBeNull();
  });
});
