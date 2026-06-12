/**
 * Restart durability: enqueue, kill worker immediately, verify Postgres row + recovery.
 */
import { execSync } from "node:child_process";

const proj = "343b14aa-9976-4086-b010-01686aabbad3";
const envName = "production";
const env = { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: "0" };
const root = "d:/Dev/ai-search-os";
const userId = process.argv[2];
const base = "https://aisearchrank-agent-api-production.up.railway.app";

function rail(args) {
  return execSync(`railway ${args}`, { cwd: root, encoding: "utf8", env, stdio: "pipe" });
}

function ensureWorkerUp() {
  rail(`link --project aisearchrank-agent-api --environment ${envName} --service aisearchrank-agent-worker`);
  rail("scale us-west=1");
}

function killWorker() {
  rail(`link --project aisearchrank-agent-api --environment ${envName} --service aisearchrank-agent-worker`);
  rail("service restart -y");
}

function pgJob(jobId) {
  return execSync(`python scripts/_pg_job_status.py ${jobId}`, {
    cwd: root,
    encoding: "utf8",
    env: { ...env, PYTHONPATH: root },
  }).trim();
}

const vars = JSON.parse(
  rail(`variables --project ${proj} --environment ${envName} --service aisearchrank-agent-api --json`)
);
const apiKey = vars.AGENT_API_KEY;

async function api(path, opts = {}) {
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey, ...(opts.headers || {}) },
  });
  return { status: res.status, body: await res.json() };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pollStatus(jobId, maxMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const { body } = await api(`/agents/audit/status/${jobId}`);
    if (["done", "failed", "queued"].includes(body.status)) return body;
    await sleep(1500);
  }
  const { body } = await api(`/agents/audit/status/${jobId}`);
  return body;
}

try {
  console.log("ensure worker running");
  ensureWorkerUp();
  await sleep(20000);

  const { status, body } = await api("/agents/audit/run", {
    method: "POST",
    body: JSON.stringify({ site_url: "https://example.com", created_by: userId }),
  });
  if (status !== 202) throw new Error(`enqueue failed ${status}`);
  const jobId = body.job_id;
  console.log("enqueued:", jobId);

  let sawRunning = false;
  const pollStart = Date.now();
  while (Date.now() - pollStart < 3000) {
    const row = pgJob(jobId);
    if (row.includes("status=RUNNING")) {
      sawRunning = true;
      console.log("postgres RUNNING:", row);
      break;
    }
    await sleep(30);
  }

  console.log("restart worker (mid-flight attempt, sawRunning=" + sawRunning + ")");
  killWorker();
  await sleep(5000);

  const pgAfter = pgJob(jobId);
  console.log("postgres after kill:", pgAfter);
  if (!pgAfter.includes(jobId)) {
    console.log("RESTART_TEST_FAIL: postgres row lost");
    process.exit(1);
  }

  await sleep(25000);
  const final = await pollStatus(jobId, 90000);
  console.log("final status:", JSON.stringify(final));

  if (final.status === "done") {
    console.log("RESTART_TEST_OK: completed (arq retry or finished before kill)");
    process.exit(0);
  }
  if (final.status === "failed") {
    console.log("RESTART_TEST_OK: failed cleanly");
    process.exit(0);
  }
  if (final.status === "queued") {
    console.log("RESTART_TEST_OK: re-queued after worker kill");
    process.exit(0);
  }
  if (final.status === "running") {
    await sleep(60000);
    const late = await api(`/agents/audit/status/${jobId}`);
    console.log("late status:", JSON.stringify(late.body));
    if (late.body.status === "running") {
      console.log("RESTART_TEST_BUG: orphaned RUNNING >60s after worker restart");
      process.exit(1);
    }
    console.log("RESTART_TEST_OK: recovered from transient RUNNING");
    process.exit(0);
  }
  console.log("RESTART_TEST_INCONCLUSIVE");
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
