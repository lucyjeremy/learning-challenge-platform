// 검증 단일 진입점 (3일차 p98~99). 앱은 web/ 에 있어서 npm 명령은 web/ 에서 실행해요.
// 빠른 검사: node scripts/verify.mjs  → git diff --check HEAD (공백 오류)
// 전체 검사: node scripts/verify.mjs --full → lint · typecheck · test
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const web = fileURLToPath(new URL("../web", import.meta.url));
const mode = process.argv[2];
if (mode && mode !== "--full") process.exit(2);
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const checks =
  mode === "--full"
    ? ["lint", "typecheck", "test"].map((s) => [npm, ["run", s], web])
    : [["git", ["diff", "--check", "HEAD"], root]];
for (const [cmd, args, cwd] of checks) {
  const result = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: cmd === "npm.cmd" }); // Windows의 npm.cmd는 셸로만 실행돼요
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
