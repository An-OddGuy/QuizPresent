# QuizPresent
Attendance you earn: present in the room (Bluetooth beacon) or proven competence (proctored remote quiz).
Static front end (GitHub Pages) + Firebase Realtime Database (free Spark plan) as the live backend.

## Demo mode (current)
- `DEMO_BLE = true` in `js/config.js`: the Bluetooth step is simulated, so no beacon is needed. The real Web Bluetooth + ESP32 code is already in place: flash `esp32/beacon.ino`, set `DEMO_BLE = false`.
- Three fixed lectures (Python/ML, Embedded Systems, Robotics) chosen from a dropdown on the professor page, each with its own 5-question quiz in `js/quizbank.js`.
- Students join with lecture code, name and **PRN**.
- **One strike, no second chances (remote mode):** leaving fullscreen, switching tab or switching window ends the attempt instantly. It is graded as failed, flagged to the professor with the reason, and that PRN is blocked from re-joining that test.

## What is real in this version
| Feature | How it works |
|---|---|
| Live backend | Firebase Realtime Database + anonymous auth. Professor and student pages sync through it. |
| Bluetooth | Simulated in demo mode. Real mode: Web Bluetooth connects to an ESP32 classroom beacon and reads its secret; the professor page checks it. |
| Camera | `getUserMedia`, remote mode only. Video stays on the student's device. |
| Eye tracking | MediaPipe Face Landmarker (iris + head yaw). Flags looking away, no face, multiple faces. Advisory only. |
| Tab-switch control | Fullscreen quiz. Leaving fullscreen, the tab or the window ends the attempt at once: it fails, goes to the professor, and the PRN is blocked for that test. Copy/paste blocked. |
| Grading | The professor page grades submissions, so the answer key never reaches students. |

Still simulated: lecture transcription and quiz generation (a fixed 5-question demo bank in `js/quizbank.js`) and the mic check.

## Honest limits
- A web page **cannot prevent** switching tabs or apps. It detects it and ends the attempt. A native/locked-down browser is the only hard block.
- The PRN block is keyed to the PRN, not the device, and any signed-in user can create a block entry. Fine for a demo; production needs server-side rules.
- Web Bluetooth works on Chrome/Edge (Android, Windows, macOS, Linux), HTTPS or localhost. **Not iPhone/Safari.** Students on iPhone use remote mode.
- The beacon check is spoofable by anyone who copies the name and reads the secret. Next step: a rotating token.
- Eye tracking is approximate (lighting, glasses, camera angle). Treat flags as evidence for the professor, not a verdict.
- Students write their own proctoring counters, so a determined student could tamper with them. Production fix: Cloud Functions for all grading and strikes.
- Anonymous auth means the professor identity is per-browser. Switch to Google sign-in before real use.
- Get consent and tell students exactly what is monitored before using camera tracking on real classes.

## Setup (about 15 minutes)
1. **Firebase:** console.firebase.google.com > Add project (Spark plan, free).
2. **Realtime Database:** Build > Realtime Database > Create. Open the *Rules* tab and paste `database.rules.json`.
3. **Auth:** Build > Authentication > Sign-in method > enable **Anonymous**.
4. **Web app config:** Project settings > Your apps > Web (`</>`). Copy the config into `js/config.js` (keep `databaseURL`).
5. **Authorised domains:** Authentication > Settings > Authorized domains > add `YOUR-USERNAME.github.io`.
6. **Beacon:** flash `esp32/beacon.ino` to an ESP32 (Arduino IDE). Keep `BEACON_NAME` and `ROOM_SECRET` equal to the fields on the professor page.
7. **Test locally:** run `python -m http.server 8000` and open `http://localhost:8000` (localhost counts as secure for camera and Bluetooth).

## Deploy to GitHub Pages
```
git init && git add . && git commit -m "QuizPresent"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/quizpresent.git
git push -u origin main
```
Then on GitHub: Settings > Pages > Source: *Deploy from a branch* > `main` / `(root)`. Your site: `https://YOUR-USERNAME.github.io/quizpresent/`.
The Firebase API key in `config.js` is meant to be public. Protect data with the rules, and restrict the key to your Pages domain in Google Cloud Console > APIs & Services > Credentials.

## Try it
1. Professor: `professor.html` > Start lecture > share the 4-letter code > End and generate quiz.
2. Student (Chrome): `student.html` > enter code and name > "I'm in the room" (pick the beacon) or "I'm remote" (camera + fullscreen).
3. Watch the table fill in. Adjust pass marks or flip any entry; students see the change live.
