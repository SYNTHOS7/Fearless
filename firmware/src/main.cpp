/**
 * @file main.cpp
 * @brief Fearless Wearable Safety Bracelet — Main Firmware
 * 
 * Hardware: Seeed XIAO ESP32S3 + MPU6050 + Piezo Buzzer
 * Framework: Arduino + NimBLE + electroniccats/MPU6050
 * 
 * Features:
 *   - 50Hz IMU sampling (non-blocking via millis())
 *   - Threshold-based struggle detection with 3 sensitivity levels
 *   - BLE GATT server (Fearless Service + Battery Service)
 *   - Non-blocking buzzer alert patterns
 *   - LED status indication
 *   - Battery voltage monitoring
 *   - Serial debug output
 * 
 * BLE Characteristics:
 *   - Struggle Status  (notify)  — 0 = safe, 1 = struggle detected
 *   - Confidence       (notify)  — 0–100 percentage
 *   - Alert Control    (write)   — 0x00=cancel, 0x01=confirm, 0x02=reset
 *   - Sensitivity      (r/w)    — 0=low, 1=medium, 2=high
 *   - Battery Level    (notify)  — 0–100 percentage
 */

#include <Arduino.h>
#include <Wire.h>
#include <MPU6050.h>
#include <NimBLEDevice.h>

#include "config.h"
#include "buzzer.h"
#include "detection.h"
#include "sleep_manager.h"

// ============================================================================
// GLOBALS
// ============================================================================

// --- MPU6050 ---
MPU6050 mpu;
bool mpuReady = false;

// --- BLE ---
NimBLEServer*         pServer         = nullptr;
NimBLECharacteristic* pStruggleChar   = nullptr;
NimBLECharacteristic* pConfidenceChar = nullptr;
NimBLECharacteristic* pAlertCtrlChar  = nullptr;
NimBLECharacteristic* pSensitivityChar= nullptr;
NimBLECharacteristic* pBatteryChar    = nullptr;

bool deviceConnected    = false;
bool prevConnected      = false;
bool alertActive        = false;

// --- Timing ---
uint32_t lastSampleTime   = 0;
uint32_t lastBatteryRead  = 0;
uint32_t lastDebugPrint   = 0;
uint32_t lastLedToggle    = 0;
bool     ledState         = false;

// --- Detection state ---
uint8_t  lastStruggleStatus = 0;
uint8_t  lastConfidence     = 0;
uint16_t detectionCount     = 0;    // Consecutive struggle detections

// ============================================================================
// BLE CALLBACKS
// ============================================================================

/**
 * Server connection callbacks — track connect/disconnect
 */
class ServerCallbacks : public NimBLEServerCallbacks {
    void onConnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo) override {
        deviceConnected = true;
        Serial.println("[BLE] Client connected: " + String(connInfo.getAddress().toString().c_str()));
    }

    void onDisconnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo, int reason) override {
        deviceConnected = false;
        Serial.println("[BLE] Client disconnected, reason: " + String(reason));
        // Restart advertising
        NimBLEDevice::startAdvertising();
        Serial.println("[BLE] Advertising restarted");
    }
};

/**
 * Alert Control characteristic callback — handles cancel/confirm/reset from app
 */
class AlertControlCallback : public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic* pCharacteristic, NimBLEConnInfo& connInfo) override {
        uint8_t value = pCharacteristic->getValue<uint8_t>();
        
        switch (value) {
            case ALERT_CANCEL:
                Serial.println("[BLE] Alert CANCELLED by app");
                alertActive = false;
                buzzerStop();
                detectionCount = 0;
                // Notify status change
                if (pStruggleChar) {
                    uint8_t status = 0;
                    pStruggleChar->setValue(status);
                    if (deviceConnected) pStruggleChar->notify();
                }
                break;
                
            case ALERT_CONFIRM:
                Serial.println("[BLE] Alert CONFIRMED by app");
                buzzerConfirmBeep();
                // Alert stays active — app handles emergency response
                break;
                
            case ALERT_RESET:
                Serial.println("[BLE] System RESET by app");
                alertActive = false;
                buzzerStop();
                detectionReset();
                detectionCount = 0;
                lastStruggleStatus = 0;
                lastConfidence = 0;
                if (pStruggleChar) {
                    uint8_t status = 0;
                    pStruggleChar->setValue(status);
                    if (deviceConnected) pStruggleChar->notify();
                }
                if (pConfidenceChar) {
                    uint8_t conf = 0;
                    pConfidenceChar->setValue(conf);
                    if (deviceConnected) pConfidenceChar->notify();
                }
                break;
                
            default:
                Serial.println("[BLE] Unknown alert control value: " + String(value));
                break;
        }
    }
};

/**
 * Sensitivity characteristic callback — changes detection sensitivity from app
 */
class SensitivityCallback : public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic* pCharacteristic, NimBLEConnInfo& connInfo) override {
        uint8_t value = pCharacteristic->getValue<uint8_t>();
        
        if (value <= SENSITIVITY_HIGH) {
            detectionSetSensitivity((SensitivityLevel)value);
            Serial.println("[BLE] Sensitivity set to: " + String(value));
        } else {
            Serial.println("[BLE] Invalid sensitivity value: " + String(value));
        }
    }
    
    void onRead(NimBLECharacteristic* pCharacteristic, NimBLEConnInfo& connInfo) override {
        uint8_t level = (uint8_t)detectionGetSensitivity();
        pCharacteristic->setValue(level);
    }
};

// ============================================================================
// SETUP FUNCTIONS
// ============================================================================

/**
 * Initialize MPU6050 over I2C
 */
void setupMPU6050() {
    Serial.println("[MPU] Initializing I2C (SDA=" + String(I2C_SDA) + 
                   ", SCL=" + String(I2C_SCL) + ")...");
    Wire.begin(I2C_SDA, I2C_SCL);
    Wire.setClock(400000);  // 400kHz fast I2C
    
    Serial.println("[MPU] Initializing MPU6050...");
    mpu.initialize();
    
    // Test connection
    if (mpu.testConnection()) {
        Serial.println("[MPU] MPU6050 connected successfully!");
        mpuReady = true;
    } else {
        Serial.println("[MPU] !!! MPU6050 connection FAILED !!!");
        mpuReady = false;
        return;
    }
    
    // Configure ranges
    mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_8);   // ±8g for struggle detection
    mpu.setFullScaleGyroRange(MPU6050_GYRO_FS_1000);  // ±1000°/s
    mpu.setDLPFMode(MPU6050_DLPF_BW_42);              // 42Hz low-pass filter
    
    Serial.println("[MPU] Config: ±8g accel, ±1000°/s gyro, 42Hz LPF");
    
    // Configure interrupt pin
    pinMode(MPU6050_INT, INPUT);
}

/**
 * Initialize NimBLE GATT server with all services and characteristics
 */
void setupBLE() {
    Serial.println("[BLE] Initializing NimBLE...");
    
    NimBLEDevice::init(BLE_DEVICE_NAME);
    NimBLEDevice::setPower(ESP_PWR_LVL_P9);  // Max TX power for range
    
    // Create server
    pServer = NimBLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks());
    
    // ---- Fearless Service ----
    NimBLEService* pService = pServer->createService(SERVICE_UUID);
    
    // Struggle Status — notify only
    pStruggleChar = pService->createCharacteristic(
        STRUGGLE_STATUS_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );
    uint8_t initStatus = 0;
    pStruggleChar->setValue(initStatus);
    
    // Confidence — notify only
    pConfidenceChar = pService->createCharacteristic(
        CONFIDENCE_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );
    uint8_t initConf = 0;
    pConfidenceChar->setValue(initConf);
    
    // Alert Control — write only (from app)
    pAlertCtrlChar = pService->createCharacteristic(
        ALERT_CONTROL_UUID,
        NIMBLE_PROPERTY::WRITE
    );
    pAlertCtrlChar->setCallbacks(new AlertControlCallback());
    
    // Sensitivity — read/write
    pSensitivityChar = pService->createCharacteristic(
        SENSITIVITY_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE
    );
    pSensitivityChar->setCallbacks(new SensitivityCallback());
    uint8_t initSens = SENSITIVITY_MEDIUM;
    pSensitivityChar->setValue(initSens);
    
    pService->start();
    
    // ---- Battery Service (standard BLE SIG) ----
    NimBLEService* pBattService = pServer->createService(BATTERY_SERVICE_UUID);
    
    pBatteryChar = pBattService->createCharacteristic(
        BATTERY_LEVEL_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );
    uint8_t initBatt = 100;
    pBatteryChar->setValue(initBatt);
    
    pBattService->start();
    
    // ---- Advertising ----
    NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->addServiceUUID(BATTERY_SERVICE_UUID);
    pAdvertising->setMinPreferred(0x06);  // Connection interval hint
    pAdvertising->setMaxPreferred(0x12);
    NimBLEDevice::startAdvertising();
    
    Serial.println("[BLE] GATT server started, advertising as '" BLE_DEVICE_NAME "'");
    Serial.println("[BLE] Service UUID: " SERVICE_UUID);
}

// ============================================================================
// BATTERY MONITORING
// ============================================================================

/**
 * Read battery voltage via ADC and estimate percentage
 * XIAO ESP32S3: Battery voltage through voltage divider
 * Typical LiPo: 4.2V full → 3.0V empty
 */
uint8_t readBatteryLevel() {
    uint32_t raw = analogRead(BATTERY_PIN);
    
    // XIAO ESP32S3 ADC: 12-bit (0–4095), reference ~3.3V
    // Voltage divider factor depends on board design (typically 2:1)
    float voltage = (raw / 4095.0f) * 3.3f * 2.0f;  // Adjust multiplier for your divider
    
    // Map LiPo voltage to percentage
    // 4.2V = 100%, 3.7V = ~50%, 3.0V = 0%
    float percentage;
    if (voltage >= 4.2f) {
        percentage = 100.0f;
    } else if (voltage >= 3.7f) {
        // 3.7–4.2V → 50–100%
        percentage = 50.0f + ((voltage - 3.7f) / 0.5f) * 50.0f;
    } else if (voltage >= 3.0f) {
        // 3.0–3.7V → 0–50%
        percentage = ((voltage - 3.0f) / 0.7f) * 50.0f;
    } else {
        percentage = 0.0f;
    }
    
    return (uint8_t)constrain(percentage, 0.0f, 100.0f);
}

// ============================================================================
// LED STATUS
// ============================================================================

/**
 * Update LED blink pattern based on state
 *   - Slow blink: idle/monitoring (no BLE connection)
 *   - Fast blink: BLE connected
 *   - Solid ON:   alert active
 */
void updateLED() {
    uint32_t now = millis();
    
    if (alertActive) {
        // Solid ON during alert
        if (!ledState) {
            digitalWrite(LED_PIN, LOW);  // XIAO LED is active-low
            ledState = true;
        }
        return;
    }
    
    uint32_t interval = deviceConnected ? LED_BLINK_FAST_MS : LED_BLINK_SLOW_MS;
    
    if (now - lastLedToggle >= interval) {
        ledState = !ledState;
        digitalWrite(LED_PIN, ledState ? LOW : HIGH);  // Active-low
        lastLedToggle = now;
    }
}

// ============================================================================
// MAIN SETUP
// ============================================================================

void setup() {
    // Serial for debug
    Serial.begin(115200);
    delay(1000);  // Wait for serial monitor
    
    Serial.println();
    Serial.println("╔══════════════════════════════════════╗");
    Serial.println("║     FEARLESS SAFETY BRACELET v1.0    ║");
    Serial.println("║     Makers Conclave 2026             ║");
    Serial.println("╚══════════════════════════════════════╝");
    Serial.println();
    
    // LED setup
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, HIGH);  // Off (active-low)
    Serial.println("[INIT] LED initialized on GPIO " + String(LED_PIN));
    
    // Buzzer
    buzzerInit(BUZZER_PIN);
    
    // Detection engine
    detectionInit();
    
    // MPU6050
    setupMPU6050();
    
    // BLE
    setupBLE();
    
    // Sleep Manager
    sleepInit();
    
    // Battery ADC
    analogReadResolution(12);
    pinMode(BATTERY_PIN, INPUT);
    Serial.println("[INIT] Battery ADC configured");
    
    // Startup beep
    buzzerConfirmBeep();
    
    Serial.println();
    Serial.println("[INIT] ===== SYSTEM READY =====");
    Serial.println("[INIT] Sampling at " + String(SAMPLE_RATE_HZ) + "Hz (" + 
                   String(SAMPLE_INTERVAL_MS) + "ms interval)");
    Serial.println("[INIT] Window: " + String(WINDOW_SIZE) + " samples, Stride: " + 
                   String(STRIDE));
    Serial.println();
}

// ============================================================================
// MAIN LOOP
// ============================================================================

void loop() {
    uint32_t now = millis();
    
    // ------------------------------------------------------------------
    // 1. IMU SAMPLING at 50Hz (non-blocking)
    // ------------------------------------------------------------------
    if (mpuReady && (now - lastSampleTime >= SAMPLE_INTERVAL_MS)) {
        lastSampleTime = now;
        
        // Read raw values from MPU6050
        int16_t rawAx, rawAy, rawAz, rawGx, rawGy, rawGz;
        mpu.getMotion6(&rawAx, &rawAy, &rawAz, &rawGx, &rawGy, &rawGz);
        
        // Convert to physical units
        // ±8g range: sensitivity = 4096 LSB/g
        // ±1000°/s range: sensitivity = 32.8 LSB/°/s
        IMUSample sample;
        sample.ax = rawAx / 4096.0f;
        sample.ay = rawAy / 4096.0f;
        sample.az = rawAz / 4096.0f;
        sample.gx = rawGx / 32.8f;
        sample.gy = rawGy / 32.8f;
        sample.gz = rawGz / 32.8f;
        
        // Run detection
        DetectionResult result = detectionUpdate(sample);
        
        // Update power sleep manager
        sleepUpdate(result.accelMag, result.gyroMag, deviceConnected, mpu);
        
        // --- Handle struggle detection ---
        if (result.isStruggle && !alertActive) {
            detectionCount++;
            
            if (detectionCount >= CONSECUTIVE_DETECTIONS) {
                // STRUGGLE CONFIRMED — trigger alert!
                alertActive = true;
                Serial.println();
                Serial.println("!!! ========================== !!!");
                Serial.println("!!! STRUGGLE DETECTED — ALERT  !!!");
                Serial.println("!!! ========================== !!!");
                Serial.println("!!! Confidence: " + String(result.confidence) + "%");
                Serial.println("!!! Accel: " + String(result.accelMag, 2) + "g");
                Serial.println("!!! Gyro: " + String(result.gyroMag, 1) + "°/s");
                Serial.println();
                
                // Start buzzer alarm
                buzzerAlertPattern();
                
                // Notify BLE
                if (pStruggleChar) {
                    uint8_t status = 1;
                    pStruggleChar->setValue(status);
                    if (deviceConnected) pStruggleChar->notify();
                }
            }
        } else if (!result.isStruggle) {
            // Decay detection count when no struggle
            if (detectionCount > 0) detectionCount--;
        }
        
        // --- Update confidence characteristic ---
        if (result.confidence != lastConfidence) {
            lastConfidence = result.confidence;
            if (pConfidenceChar) {
                pConfidenceChar->setValue(lastConfidence);
                if (deviceConnected) pConfidenceChar->notify();
            }
        }
        
        // --- Debug output ---
        if (now - lastDebugPrint >= DEBUG_PRINT_INTERVAL) {
            lastDebugPrint = now;
            
            Serial.printf("[IMU] ax=%.2f ay=%.2f az=%.2f | gx=%.1f gy=%.1f gz=%.1f\n",
                         sample.ax, sample.ay, sample.az,
                         sample.gx, sample.gy, sample.gz);
            Serial.printf("[DET] accelMag=%.2fg gyroMag=%.1f°/s jerk=%.2fg/s "
                         "conf=%d%% hits=%d alert=%s\n",
                         result.accelMag, result.gyroMag, result.jerk,
                         result.confidence, detectionCount,
                         alertActive ? "YES" : "no");
            
            if (deviceConnected) {
                Serial.println("[BLE] Connected — notifications active");
            }
        }
    }
    
    // ------------------------------------------------------------------
    // 2. BUZZER UPDATE (non-blocking pattern engine)
    // ------------------------------------------------------------------
    buzzerUpdate();
    
    // ------------------------------------------------------------------
    // 3. LED STATUS UPDATE
    // ------------------------------------------------------------------
    updateLED();
    
    // ------------------------------------------------------------------
    // 4. BATTERY MONITORING (every 30 seconds)
    // ------------------------------------------------------------------
    if (now - lastBatteryRead >= BATTERY_READ_INTERVAL) {
        lastBatteryRead = now;
        
        uint8_t battLevel = readBatteryLevel();
        
        if (pBatteryChar) {
            pBatteryChar->setValue(battLevel);
            if (deviceConnected) pBatteryChar->notify();
        }
        
        Serial.println("[BATT] Level: " + String(battLevel) + "%");
    }
    
    // ------------------------------------------------------------------
    // 5. BLE RECONNECTION HANDLING
    // ------------------------------------------------------------------
    if (!deviceConnected && prevConnected) {
        // Just disconnected — advertising was restarted in callback
        prevConnected = false;
    }
    if (deviceConnected && !prevConnected) {
        prevConnected = true;
    }
}
