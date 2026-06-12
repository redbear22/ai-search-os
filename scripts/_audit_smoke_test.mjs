/**
 * Phase 1 smoke + restart durability test (no secrets printed).
 */
import { execSync } from "node:child_process";

const proj = "343b14aa-9976-4086-b010-01686aabbad3";
const env = { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: "0" };
const root = "d:/Dev/ai-search-os";

function rail(args) {
  return execSync(`railway ${args}`, { cwd: root, encoding: "utf8", env, stdio: "pipe" });
}

const userId = process.argv[2];
const mode = process.argv[3] || "smoke"; // smoke | restart
if (!userId) {
  console.error("usage: node _audit_smoke_test.mjs <user-id> [smoke|restart]");
  process.exit(1);
}

const vars = JSON.parse(
  rail(`variables --project ${proj} --environment production --service aisearchrank-agent-api --json`)
);
const apiKey = vars.AGENT_API_KEY;
if (!apiKey) {
  console.error("BLOCKER: AGENT_API_KEY not on Railway");
  process.exit(1);
}

const base = "https://aisearchrank-agent-api-production.up.railway.app";

async function api(path, opts = {}) {
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollUntil(jobId, predicate, maxMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const { status, body } = await api(`/agents/audit/status/${jobId}`);
    if (status !== 200) throw new Error(`status poll ${status}: ${JSON.stringify(body)}`);
    if (predicate(body)) return body;
    await sleep(1500);
  }
  throw new Error(`timeout waiting for job ${jobId}`);
}

async function runSmoke() {
  const { status, body } = await api("/agents/audit/run", {
    method: "POST",
    body: JSON.stringify({ site_url: "https://example.com", created_by: userId }),
  });
  console.log("POST /agents/audit/run:", status, JSON.stringify(body));
  if (status !== 202) process.exit(1);

  const jobId = body.job_id;
  const final = await pollUntil(jobId, (b) => b.status === "done" || b.status === "failed", 180000);
  console.log("final status:", JSON.stringify(final));

  if (final.status === "done") {
    const result = await api(`/agents/audit/result/${jobId}`);
    console.log("GET result:", result.status, "keys:", Object.keys(result.body).join(","));
    if (result.status !== 200) process.exit(1);
    console.log("SMOKE_OK");
    return jobId;
  }
  console.log("SMOKE_FAILED");
  process.exit(1);
}

async function runRestart() {
  const { status, body } = await api("/agents/audit/run", {
    method: "POST",
    body: JSON.stringify({ site_url: "https://example.com", created_by: userId }),
  });
  if (status !== 202) {
    console.log("enqueue failed", status, body);
    process.exit(1);
  }
  const jobId = body.job_id;
  console.log("restart_test job_id:", jobId);

  let sawRunning = false;
  const start = Date.now();
  while (Date.now() - start < 60000) {
    const { body: st } = await api(`/agents/audit/status/${jobId}`);
    console.log("poll:", st.status, st.progress, st.stage);
    if (st.status === "running") {
      sawRunning = true;
      break;
    }
    if (st.status === "done" || st.status === "failed") {
      console.log("RESTART_TEST_SKIP: job finished before RUNNING observed");
      process.exit(0);
    }
    await sleep(500);
  }

  if (!sawRunning) {
    console.log("RESTART_TEST_FAIL: never reached RUNNING in 60s");
    process.exit(1);
  }

  console.log("killing worker...");
  execSync(
    `railway redeploy --project ${proj} --environment production --service aisearchrank-agent-worker -y`,
    { cwd: root, env, stdio: "pipe" }
  );

  await sleep(20000);

  const { body: afterKill } = await api(`/agents/audit/status/${jobId}`);
  console.log("status after kill:", JSON.stringify(afterKill));

  // Poll for terminal or recovery for up to 3 min
  const end = await pollUntil(
    jobId,
    (b) => ["done", "failed", "queued"].includes(b.status) && (b.status !== "running" || b.progress > 0),
    180000
  ).catch((e) => {
    console.log("post-kill poll error:", e.message);
    return null;
  });

  const { body: final } = await api(`/agents/audit/status/${jobId}`);
  console.log("final after restart:", JSON.stringify(final));

  if (final.status === "running" && Date.now() - start > 120000) {
    console.log("RESTART_TEST_BUG: orphaned RUNNING");
    process.exit(1);
  }
  if (["done", "failed", "queued"].includes(final.status)) {
    console.log("RESTART_TEST_OK:", final.status);
    return;
  }
  console.log("RESTART_TEST_INCONCLUSIVE:", final.status);
}

if (mode === "restart") await runRestart();
else await runSmoke();
