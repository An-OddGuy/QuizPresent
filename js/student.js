import { ready, db, ref, set, update, get, onValue } from "./firebase.js";
import { connectBeacon, bleSupported } from "./ble.js";
import { loadModel, startCamera, monitor, guard } from "./proctor.js";
import { evaluate, fresh } from "./rules.js";
import { DEMO_BLE } from "./config.js";
const $ = id => document.getElementById(id);
const uid = (await ready).uid;
let code, name, prn, sid, me, meta, quiz, mine = null, grade = null, ov = null, mode, picks = [], timer, secs = 480, submitted = false, stopMon, stopGuard, stream;
const show = id => ["s0", "s1", "s2", "s3"].forEach(s => $(s).hidden = s !== id);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

$("join").onclick = async () => {
  code = $("code").value.trim().toUpperCase(); name = $("name").value.trim() || "Student"; prn = $("prn").value.trim();
  if (!/^\d{8,14}$/.test(prn)) { $("jerr").textContent = "Enter your PRN (digits only)."; return; }
  const s = await get(ref(db, `sessions/${code}/meta`));
  if (!s.exists()) { $("jerr").textContent = "No lecture with that code."; return; }
  if ((await get(ref(db, `sessions/${code}/blocked/${prn}`))).exists()) { $("jerr").textContent = "This PRN is blocked from this test after leaving a proctored quiz."; return; }
  sid = `${uid}_${prn}`; // one record per browser+PRN, so two students on one device never share a grade
  me = ref(db, `sessions/${code}/students/${sid}`);
  await set(me, { name, prn, status: "joined", joinedAt: Date.now() });
  show("s1"); watch();
};
function watch() {
  onValue(ref(db, `sessions/${code}/meta`), s => { meta = s.val(); if (!meta) return location.reload(); paint(); result(); });
  onValue(ref(db, `sessions/${code}/quiz`), s => { quiz = s.val(); paint(); });
  onValue(ref(db, `sessions/${code}/grades/${sid}`), s => { grade = s.val() || {}; result(); });
  onValue(ref(db, `sessions/${code}/over/${sid}`), s => { ov = s.val(); result(); });
  onValue(me, s => { mine = s.val(); result(); });
}
function paint() {
  const live = meta && meta.phase === "ready" && quiz, idle = $("s1").hidden === false && !mode;
  $("status").textContent = live ? `${meta.title}: the quiz is ready. Choose how you are attending.` : "Waiting for the professor to generate the quiz…";
  $("c-in").disabled = !live || !idle || (!DEMO_BLE && !bleSupported()); $("c-rem").disabled = !live || !idle;
  if (!DEMO_BLE && !bleSupported()) $("msg").textContent = "Bluetooth needs Chrome or Edge (not iPhone). You can still attend remotely.";
}
$("c-in").onclick = async () => {
  try {
    if (DEMO_BLE) {
      $("msg").textContent = "Scanning for the classroom beacon (demo mode)…"; await new Promise(r => setTimeout(r, 1200));
      mode = "in"; await update(me, { mode, bleSim: true, status: "taking" });
    } else {
      $("msg").textContent = "Pick the classroom beacon in the Bluetooth popup…";
      const r = await connectBeacon(meta.beacon);
      mode = "in"; await update(me, { mode, bleToken: r.token, bleDevice: r.deviceName, status: "taking" });
    }
    startQuiz();
  } catch (e) { mode = undefined; $("msg").textContent = "Bluetooth failed: " + e.message + ". Try again, move closer, or ask your professor."; }
};
$("c-rem").onclick = () => { $("setup").hidden = false; };
let camAllowed = false;
$("c-go").onclick = async () => {
  try {
    // Step 1: ask for camera permission BEFORE fullscreen (the prompt would otherwise kick us out of it)
    if (!camAllowed) {
      $("pmsg").textContent = "Requesting camera permission…";
      const test = await navigator.mediaDevices.getUserMedia({ video: true });
      test.getTracks().forEach(t => t.stop());
      camAllowed = true;
      $("pmsg").textContent = "Loading eye-tracking model…";
      await loadModel();
    }
    // Step 2: fullscreen. If the browser says the click is too old, ask for one more click.
    try {
      await document.documentElement.requestFullscreen();
    } catch (e) {
      $("pmsg").textContent = "Camera allowed. Click the button again to enter fullscreen and start the quiz.";
      $("c-go").textContent = "Enter fullscreen & start";
      return;
    }
    // Step 3: start the camera (no prompt now) and begin
    $("pmsg").textContent = "Starting camera…";
    stream = await startCamera($("cam"));
    mode = "rem"; await update(me, { mode, status: "taking" }); startQuiz();
  } catch (e) {
    $("pmsg").textContent = "Could not start proctoring: " + e.message;
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
  }
};
function startQuiz() {
  show("s2"); picks = []; secs = 480; submitted = false;
  const t = $("modetag");
  t.textContent = mode === "in" ? "Collaboration mode" : "Remote mode (proctored)"; t.className = "tag " + (mode === "in" ? "c" : "r");
  $("modehelp").textContent = mode === "in" ? "Discuss with the people around you. Option order is shuffled on each phone." : "Solo and proctored. Leaving fullscreen or switching tab ends your attempt immediately. Keep your face in view.";
  const order = quiz.map(q => shuffle(q.o.map((_, i) => i)));
  $("quiz").innerHTML = quiz.map((q, i) => `<div style="margin-bottom:14px"><p><b>${i + 1}. ${q.q}</b>${q.n ? ' <span class="tag r">niche</span>' : ""}</p>` + order[i].map(oi => `<button class="opt" aria-pressed="false" data-q="${i}" data-o="${oi}">${q.o[oi]}</button>`).join("") + "</div>").join("");
  $("quiz").querySelectorAll(".opt").forEach(b => b.onclick = () => { const qi = +b.dataset.q; picks[qi] = +b.dataset.o; $("quiz").querySelectorAll(`[data-q="${qi}"]`).forEach(x => x.setAttribute("aria-pressed", x === b)); });
  if (mode === "rem") {
    $("cam").hidden = false; stopGuard = guard(why => finish(true, why));
    let last = 0;
    stopMon = monitor($("cam"), ev => {
      if (ev.flag) $("note").textContent = "Eye-tracking flag: " + ev.type.replace("_", " ") + ". Your professor will see this.";
      if (Date.now() - last < 3000) return; last = Date.now();
      const s = ev.stats, pct = Math.round(100 * (s.away + s.noFace + s.multi) / Math.max(1, s.frames));
      update(me, { proctor: { state: ev.type, awayPct: pct, noFace: s.noFace, multi: s.multi, flags: s.flags } });
    });
  }
  timer = setInterval(tick, 1000); tick();
}
function tick() { $("timer").textContent = Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0"); if (secs-- <= 0) finish(); }
$("submit").onclick = () => finish();
async function finish(dq = false, why = null) {
  if (submitted) return; submitted = true;
  clearInterval(timer); stopMon && stopMon(); stopGuard && stopGuard();
  if (stream) stream.getTracks().forEach(t => t.stop());
  $("cam").hidden = true;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
  await update(me, { status: "submitted", answers: quiz.map((_, i) => picks[i] ?? -1), disqualified: !!dq, kickReason: why, submittedAt: Date.now() });
  if (dq) await set(ref(db, `sessions/${code}/blocked/${prn}`), true).catch(() => { });
  show("s3"); result();
}
window.addEventListener("beforeunload", e => { if (mode === "rem" && !submitted && !$("s2").hidden) { e.preventDefault(); e.returnValue = ""; } });
function result() {
  if ($("s3").hidden || !mine || !meta) return;
  const f = fresh(mine, grade), ev = evaluate({ ...mine, ...f }, meta.th, ov);
  if (mine.disqualified) { $("res-h").textContent = "Attempt failed"; $("res-h").style.color = "var(--rust)"; $("res-p").textContent = `You left the proctored quiz (${String(mine.kickReason || "left quiz").replace(/_/g, " ")}). The attempt was reported to your professor and your PRN is blocked for this test.`; return; }
  if (!ev) { $("res-h").textContent = "Submitted"; $("res-h").style.color = ""; $("res-p").textContent = "Waiting for your professor's page to grade your answers…"; return; }
  const sc = f.score;
  $("res-h").textContent = ev.ok ? "Attendance recorded" : "Not enough for attendance"; $("res-h").style.color = ev.ok ? "var(--teal)" : "var(--rust)";
  $("res-p").textContent = `You scored ${sc}/5 (needed ${ev.need}).` + (mine.mode === "in" && f.verified === false ? " The classroom beacon could not be verified." : "") + (ev.overridden ? " Your professor set this by hand." : "");
}
