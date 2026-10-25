// Web Bluetooth: Chrome/Edge (Android, Windows, macOS, Linux, ChromeOS), HTTPS or localhost. Not iOS.
export const SERVICE = "7a1b0001-8f3e-4c7a-9b52-0d1c0a5e11aa";
export const CHAR = "7a1b0002-8f3e-4c7a-9b52-0d1c0a5e11aa";
export const bleSupported = () => !!navigator.bluetooth;
// Must be called from a click. The browser's chooser lists only beacons currently in range.
export async function connectBeacon(name) {
  const device = await navigator.bluetooth.requestDevice({ filters: [{ name }], optionalServices: [SERVICE] });
  const server = await device.gatt.connect();
  try {
    const svc = await server.getPrimaryService(SERVICE);
    const ch = await svc.getCharacteristic(CHAR);
    const token = new TextDecoder().decode(await ch.readValue());
    return { deviceName: device.name, token };
  } finally { server.disconnect(); }
}
