/**
 * @file sleep_manager.cpp
 * @brief Deep sleep and power management implementation
 */

#include "sleep_manager.h"
#include "config.h"
#include "buzzer.h"
#include "motion_detect.h"
#include <NimBLEDevice.h>

// 2 minutes of absolute stillness triggers deep sleep
#define INACTIVITY_TIMEOUT_MS  120000 
#define SLEEP_WARN_TIME_MS      10000 // Start warning 10s before sleep

static uint32_t _lastMotionTime = 0;
static bool _warned = false;

void sleepInit() {
    _lastMotionTime = millis();
    _warned = false;
    Serial.println("[SLEEP] Manager initialized. Timeout set to 2 mins.");
}

void sleepUpdate(float accelMag, float gyroMag, bool isConnected, MPU6050& mpu) {
    uint32_t now = millis();

    // Check if bracelet is moving:
    // Deviation from gravity (1.0g) > 0.15g OR gyro rotation > 15 dps
    bool isMoving = (fabsf(accelMag - 1.0f) > 0.15f) || (gyroMag > 15.0f);

    if (isMoving || isConnected) {
        _lastMotionTime = now;
        if (_warned) {
            Serial.println("[SLEEP] Activity detected, resetting sleep timer.");
            _warned = false;
        }
        return;
    }

    uint32_t idleDuration = now - _lastMotionTime;

    // Warning printout
    if (idleDuration >= (INACTIVITY_TIMEOUT_MS - SLEEP_WARN_TIME_MS) && !_warned) {
        Serial.printf("[SLEEP] WARNING: System inactive for %d seconds. Entering deep sleep soon...\n", 
                      idleDuration / 1000);
        
        // Short beep to notify user
        buzzerConfirmBeep();
        _warned = true;
    }

    // Trigger sleep
    if (idleDuration >= INACTIVITY_TIMEOUT_MS) {
        enterDeepSleep(mpu);
    }
}

void enterDeepSleep(MPU6050& mpu) {
    Serial.println("[SLEEP] Entering deep sleep now...");
    delay(10);

    // 1. Play alert beeps to confirm shutdown
    buzzerConfirmBeep();
    delay(200);
    buzzerConfirmBeep();
    delay(100);
    
    // Stop any running buzzer task/sound
    buzzerStop();

    // 2. Shut down BLE
    Serial.println("[SLEEP] Stopping BLE advertising and radio...");
    NimBLEDevice::deinit(true);

    // 3. Turn off status LED (XIAO ESP32S3 is active-low)
    digitalWrite(LED_PIN, HIGH);

    // 4. Configure MPU6050 Wake-on-Motion registers
    configureWakeOnMotion(mpu);

    // 5. Configure ESP32S3 ext0 wake source (GPIO2)
    // Wake-up occurs when the INT pin goes high (1)
    esp_sleep_enable_ext0_wakeup((gpio_num_t)MPU6050_INT, 1);

    // 6. Enter deep sleep mode
    Serial.flush();
    esp_deep_sleep_start();
}
