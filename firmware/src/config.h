/**
 * @file config.h
 * @brief Pin definitions, constants, and BLE UUIDs for Fearless wearable
 * 
 * Fearless — AI-Powered Safety Bracelet
 * Board: Seeed XIAO ESP32S3
 */

#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// PIN DEFINITIONS (Seeed XIAO ESP32S3)
// ============================================================================

#define I2C_SDA         5       // GPIO5  (D4) — MPU6050 SDA
#define I2C_SCL         6       // GPIO6  (D5) — MPU6050 SCL
#define MPU6050_INT     2       // GPIO2  (D1) — Interrupt, RTC-capable for deep sleep wake
#define BUZZER_PIN      1       // GPIO1  (D0) — Piezo buzzer
#define LED_PIN         21      // Onboard LED
#define BATTERY_PIN     A0      // ADC pin for battery voltage divider

// ============================================================================
// SAMPLING & DETECTION
// ============================================================================

#define SAMPLE_RATE_HZ          50      // IMU sampling rate
#define SAMPLE_INTERVAL_MS      (1000 / SAMPLE_RATE_HZ)  // 20ms per sample
#define WINDOW_SIZE             128     // Circular buffer size (samples)
#define STRIDE                  64      // Window stride for overlap

// ============================================================================
// THRESHOLD DETECTION
// ============================================================================

#define THREAT_THRESHOLD        80      // Confidence % to trigger alert
#define CONSECUTIVE_DETECTIONS  3       // Default consecutive detections needed

// Sensitivity presets: { accel_g, gyro_dps, consecutive_count }
// Low sensitivity — fewer false positives
#define SENS_LOW_ACCEL_G        2.5f
#define SENS_LOW_GYRO_DPS       300.0f
#define SENS_LOW_CONSECUTIVE    5

// Medium sensitivity — balanced
#define SENS_MED_ACCEL_G        2.0f
#define SENS_MED_GYRO_DPS       250.0f
#define SENS_MED_CONSECUTIVE    3

// High sensitivity — catches more events
#define SENS_HIGH_ACCEL_G       1.5f
#define SENS_HIGH_GYRO_DPS      200.0f
#define SENS_HIGH_CONSECUTIVE   2

// ============================================================================
// BLE CONFIGURATION
// ============================================================================

#define BLE_DEVICE_NAME         "Fearless"

// Fearless Service
#define SERVICE_UUID            "12345678-1234-5678-1234-56789abcdef0"
#define STRUGGLE_STATUS_UUID    "12345678-1234-5678-1234-56789abcdef1"
#define CONFIDENCE_UUID         "12345678-1234-5678-1234-56789abcdef2"
#define ALERT_CONTROL_UUID      "12345678-1234-5678-1234-56789abcdef3"
#define SENSITIVITY_UUID        "12345678-1234-5678-1234-56789abcdef4"

// Battery Service (standard BLE SIG)
#define BATTERY_SERVICE_UUID    "180F"
#define BATTERY_LEVEL_UUID      "2A19"

// ============================================================================
// TIMING
// ============================================================================

#define LED_BLINK_SLOW_MS       1000    // Idle blink interval
#define LED_BLINK_FAST_MS       250     // Connected blink interval
#define BATTERY_READ_INTERVAL   30000   // Read battery every 30s
#define DEBUG_PRINT_INTERVAL    500     // Serial debug every 500ms

// ============================================================================
// ALERT CONTROL VALUES (written by app)
// ============================================================================

#define ALERT_CANCEL    0x00
#define ALERT_CONFIRM   0x01
#define ALERT_RESET     0x02

// ============================================================================
// SENSITIVITY LEVELS (written by app)
// ============================================================================

enum SensitivityLevel : uint8_t {
    SENSITIVITY_LOW    = 0,
    SENSITIVITY_MEDIUM = 1,
    SENSITIVITY_HIGH   = 2
};

#endif // CONFIG_H
