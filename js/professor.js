import { ready, db, ref, set, update, remove, onValue, loginProfessor, logout } from "./firebase.js";
import { LECTURES } from "./quizbank.js";
import { DEMO_BLE } from "./config.js";
import { evaluate, fresh } from "./rules.js";
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// ---- login gate: handlers are attached BEFORE we wait for sign-in ----
const doLogin = async () => {
  $("li-err").textContent = ""; $("li-go").disabled = true;
  try { await loginProfessor($("li-user").value, $("li-pass").value); }
  catch (e) {
    $("li-err").textContent = e.code === "auth/too-many-requests" ? "Too many attempts. Wait a few minutes and try again." : "Wrong username or password.";
    $("li-go").disabled = false;
  }
};
$("li-go").onclick = doLogin;
$("li-pass").onkeydown = e => { if (e.key === "Enter") doLogin(); };
$("logout").onclick = logout;
const uid = (await ready).uid;
$("login").hidden = true; $("app").hidden = false;
$("lecture").innerHTML = LECTURES.map((l, i) => `<option value="${i}">${l.title}</option>`).join(""); $("demo").hidden = !DEMO_BLE;
$("sub").textContent = "Connected. Start a lecture to get a join code.";
const blocked = new Set();
let code = null, meta = null, key = null, students = {}, grades = {}, over = {}, offs = [];
const P = p => ref(db, `sessions/${code}/${p}`);

$("start").onclick = async () => {
  code = Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 24)]).join("");
  await set(P("meta"), { owner: uid, phase: "listening", lectureId: LECTURES[+$("lecture").value].id, title: LECTURES[+$("lecture").value].title, beacon: $("beacon").value.trim(), th: { c: 4, r: 3 }, createdAt: Date.now() });
  attach(); 
};
$("gen").onclick = async () => {
  const quiz = LECTURES.find(l => l.id === meta.lectureId).quiz;
  await set(P("key"), { answers: quiz.map(q => q.a), secret: $("secret").value.trim() });
  await set(P("quiz"), quiz.map(({ q, o, n }) => ({ q, o, n: n || 0 })));
  await update(P("meta"), { phase: "ready" });
};
$("reset").onclick = async () => { offs.forEach(f => f()); offs = []; await remove(ref(db, `sessions/${code}`)); code = meta = key = null; students = grades = over = {}; render(); };
document.querySelectorAll("[data-k]").forEach(b => b.onclick = () => {
  if (!meta) return; const k = b.dataset.k, v = Math.max(1, Math.min(5, meta.th[k] + +b.dataset.d)); update(P("meta/th"), { [k]: v });
});
function attach() {
  offs.push(onValue(P("meta"), s => { meta = s.val(); render(); }));
  offs.push(onValue(P("key"), s => { key = s.val(); work(); }));
  offs.push(onValue(P("students"), s => { students = s.val() || {}; work(); render(); }));
  offs.push(onValue(P("grades"), s => { grades = s.val() || {}; render(); }));
  offs.push(onValue(P("over"), s => { over = s.val() || {}; render(); }));
}
// The professor page grades submissions and checks the beacon secret, so the answer key never reaches students.
function work() {
  if (!key) return;
  for (const [id, s] of Object.entries(students)) {
    const f = fresh(s, grades[id]), patch = {};
    if (s.status === "submitted" && f.score === undefined && s.answers) { patch.score = key.answers.reduce((n, a, i) => n + (s.answers[i] === a ? 1 : 0), 0); patch.at = s.submittedAt; }
    if (s.mode === "in" && f.verified === undefined && (s.bleSim || s.bleToken !== undefined)) { patch.verified = s.bleSim ? true : s.bleToken === key.secret; patch.vat = s.joinedAt; }
    if (s.disqualified && s.prn && !blocked.has(s.prn)) { blocked.add(s.prn); set(P(`blocked/${s.prn}`), true); }
    if (Object.keys(patch).length) update(P(`grades/${id}`), patch);
  }
}
function render() {
  $("start").disabled = !!meta; $("gen").disabled = !meta || meta.phase !== "listening"; $("reset").disabled = !meta;
  if (!meta) { $("live").innerHTML = ""; $("count").textContent = "No session yet."; $("rows").innerHTML = ""; return; }
  $("tc").textContent = meta.th.c; $("tr").textContent = meta.th.r;
  $("live").innerHTML = `<p class="mute">Join code</p><p class="big">${code}</p><p class="mute">${esc(meta.title)} · ${DEMO_BLE ? "Bluetooth simulated" : "Beacon: " + esc(meta.beacon)} · ${meta.phase === "ready" ? "Quiz is live for students." : "Listening to the lecture (simulated). Generate the quiz when it ends."}</p>`;
  const ids = Object.keys(students);
  $("count").textContent = `${ids.length} joined, ${ids.filter(i => students[i].status === "submitted").length} submitted.`;
  $("rows").innerHTML = ids.map(id => {
    const s = students[id], g = fresh(s, grades[id]), ev = evaluate({ ...s, ...g }, meta.th, over[id]);
    const bea = s.mode !== "in" ? "–" : g.verified === undefined ? "…" : g.verified ? '<span class="ok">' + (s.bleSim ? "simulated" : "verified") + "</span>" : '<span class="bad">failed</span>';
    const p = s.proctor, pro = s.mode !== "rem" ? "–" : s.disqualified ? `<span class="bad">Kicked: ${esc(String(s.kickReason || "left quiz").replace(/_/g, " "))}</span>` : p ? `away ${p.awayPct}%, ${p.flags} gaze flags` : "clean so far";
    const st = !ev ? '<span class="mute">' + (s.status === "submitted" ? "grading…" : "in progress") + "</span>" : `<span class="${ev.ok ? "ok" : "bad"}">${ev.ok ? "Present" : s.disqualified ? "Failed, PRN blocked" : "Absent"}${ev.overridden ? " (override)" : ""}</span>`;
    return `<tr><td>${esc(s.name || "?")}<br><span class="mute">${esc(s.prn || "")}</span></td><td>${s.mode ? `<span class="tag ${s.mode === "in" ? "c" : "r"}">${s.mode === "in" ? "In class" : "Remote"}</span>` : "–"}</td><td>${bea}</td><td>${pro}</td><td>${g.score === undefined ? "–" : g.score + "/5"}</td><td>${st}</td><td>${ev ? `<button class="b alt" data-id="${esc(id)}">Flip</button>` : ""}</td></tr>`;
  }).join("");
}
$("rows").addEventListener("click", e => {
  const b = e.target.closest("button[data-id]"); if (!b) return;
  const id = b.dataset.id, ev = evaluate({ ...students[id], ...fresh(students[id], grades[id]) }, meta.th, over[id]);
  set(P(`over/${id}`), !ev.ok);
});
render();
