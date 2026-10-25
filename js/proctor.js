import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
// Tunable thresholds (0.5 = looking straight at the screen)
export const GAZE_LO = 0.33, GAZE_HI = 0.67, YAW_LO = 0.30, YAW_HI = 0.70, AWAY_MS = 2000;
let lm = null;
export async function loadModel() {
  if (lm) return lm;
  const fs = await FilesetResolver.forVisionTasks(WASM);
  lm = await FaceLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: MODEL, delegate: "GPU" }, runningMode: "VIDEO", numFaces: 2 });
  return lm;
}
export async function startCamera(video) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false });
  video.srcObject = stream; await video.play(); return stream;
}
const ratio = (v, a, b) => (v - a) / (b - a || 1e-6);
function analyse(f) {
  const eye = (iris, c1, c2) => { const [lo, hi] = [f[c1].x, f[c2].x].sort((a, b) => a - b); return ratio(f[iris].x, lo, hi); };
  const gaze = (eye(468, 33, 133) + eye(473, 362, 263)) / 2;  // iris position inside the eye
  const yaw = ratio(f[1].x, f[234].x, f[454].x);              // nose between the cheeks
  return gaze < GAZE_LO || gaze > GAZE_HI || yaw < YAW_LO || yaw > YAW_HI;
}
// Runs ~5 times a second. Video never leaves the device; only counters are reported.
export function monitor(video, onTick) {
  const st = { frames: 0, away: 0, noFace: 0, multi: 0, flags: 0 };
  let since = null, flagged = false;
  const id = setInterval(() => {
    if (video.readyState < 2) return;
    const faces = lm.detectForVideo(video, performance.now()).faceLandmarks || [];
    st.frames++;
    let state = "ok";
    if (faces.length === 0) { state = "no_face"; st.noFace++; }
    else if (faces.length > 1) { state = "multiple_faces"; st.multi++; }
    else if (analyse(faces[0])) { state = "looking_away"; st.away++; }
    let flag = false;
    if (state !== "ok") {
      since ??= performance.now();
      if (!flagged && performance.now() - since > AWAY_MS) { flagged = true; st.flags++; flag = true; }
    } else { since = null; flagged = false; }
    onTick({ type: state, flag, stats: { ...st } });
  }, 200);
  return () => clearInterval(id);
}
// Browsers cannot block tab switching; they can detect it. The first event ends the attempt (the caller decides).
export function guard(onStrike) {
  let last = 0;
  const hit = w => { const n = Date.now(); if (n - last < 1500) return; last = n; onStrike(w); };
  const vis = () => { if (document.hidden) hit("tab_hidden"); };
  const blur = () => hit("window_blur");
  const fs = () => { if (!document.fullscreenElement) hit("left_fullscreen"); };
  const stop = e => e.preventDefault();
  const key = e => { const k = e.key.toLowerCase(); if (((e.ctrlKey || e.metaKey) && k.length === 1 && "cvxapsuf".includes(k)) || k === "f12" || k === "printscreen") e.preventDefault(); };
  const blocked = ["contextmenu", "copy", "cut", "paste", "dragstart"];
  document.addEventListener("visibilitychange", vis); window.addEventListener("blur", blur);
  document.addEventListener("fullscreenchange", fs); document.addEventListener("keydown", key);
  blocked.forEach(t => document.addEventListener(t, stop));
  return () => {
    document.removeEventListener("visibilitychange", vis); window.removeEventListener("blur", blur);
    document.removeEventListener("fullscreenchange", fs); document.removeEventListener("keydown", key);
    blocked.forEach(t => document.removeEventListener(t, stop));
  };
}
