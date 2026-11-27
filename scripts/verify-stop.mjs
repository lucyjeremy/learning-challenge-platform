// Stop 훅에서 부르는 래퍼 (3일차 p100). 빠른 검사가 실패하면 원인을 stderr에 남기고 2를 반환해요.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const payload = JSON.parse(readFileSync(0, "utf8") || "{}");
if (payload.stop_hook_active) process.exit(0);
const verify = fileURLToPath(new URL("./verify.mjs", import.meta.url));
const run = spawnSync(process.execPath, [verify], { encoding: "utf8" });
if (run.status === 0) process.exit(0);
console.error("빠른 검사 실패. 원인을 수정하고 같은 검사를 다시 실행하세요.");
console.error((run.error?.message ?? run.stdout + run.stderr).slice(-1500));
process.exit(2);
