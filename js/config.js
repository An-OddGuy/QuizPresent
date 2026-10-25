// No secrets live in this file. Values come from js/env.js, which is generated from .env (local)
// or GitHub Secrets (deploy) by scripts/build-config.mjs.
import { ENV } from "./env.js";
export const DEMO_BLE = ENV.DEMO_BLE;
export const firebaseConfig = ENV.firebase;
