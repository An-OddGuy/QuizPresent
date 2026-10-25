// QuizPresent classroom beacon for ESP32 (Arduino IDE, board: "ESP32 Dev Module").
// Use the SAME name and secret on the professor page.
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#define SERVICE_UUID "7a1b0001-8f3e-4c7a-9b52-0d1c0a5e11aa"
#define CHAR_UUID    "7a1b0002-8f3e-4c7a-9b52-0d1c0a5e11aa"
const char* BEACON_NAME = "QuizPresent-Room101";
const char* ROOM_SECRET = "change-me-123";
void setup() {
  BLEDevice::init(BEACON_NAME);
  BLEServer* server = BLEDevice::createServer();
  BLEService* svc = server->createService(SERVICE_UUID);
  BLECharacteristic* c = svc->createCharacteristic(CHAR_UUID, BLECharacteristic::PROPERTY_READ);
  c->setValue(ROOM_SECRET);
  svc->start();
  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();
}
void loop() { delay(1000); }
