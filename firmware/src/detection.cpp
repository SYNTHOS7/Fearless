/**
 * @file detection.cpp
 * @brief Threshold-based struggle detection engine for Fearless wearable
 * 
 * Algorithm overview:
 *   1. Compute acceleration magnitude: sqrt(ax² + ay² + az²)
 *   2. Compute gyroscope magnitude:   sqrt(gx² + gy² + gz²)
 *   3. Compute jerk: |current_accel_mag - previous_accel_mag| * sample_rate
 *   4. If accel_mag > threshold AND gyro_mag > threshold for N consecutive
 *      samples → struggle detected
 *   5. Confidence = how far above threshold the values are, clamped to 0–100
 *
 * Three sensitivity presets are available (Low / Medium / High).
 */

#include "detection.h"
#include <math.h>

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

// Circular buffer
static IMUSample _buffer[WINDOW_SIZE];
static uint16_t  _bufHead       = 0;
static uint16_t  _sampleCount   = 0;

// Detection state
static float    _prevAccelMag   = 1.0f;    // Assume 1g at rest
static uint16_t _consecutiveHits = 0;
static bool     _struggleActive = false;

// Current sensitivity thresholds
static float    _threshAccelG   = SENS_MED_ACCEL_G;
static float    _threshGyroDPS  = SENS_MED_GYRO_DPS;
static uint16_t _threshConsec   = SENS_MED_CONSECUTIVE;
static SensitivityLevel _currentLevel = SENSITIVITY_MEDIUM;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate confidence as a percentage based on how far above threshold
 * the measured values are. Uses both accel and gyro contributions.
 */
static uint8_t calcConfidence(float accelMag, float gyroMag, float jerk) {
    // How much above threshold (0.0 = at threshold, 1.0 = 2x threshold)
    float accelExcess = (accelMag - _threshAccelG) / _threshAccelG;
    float gyroExcess  = (gyroMag  - _threshGyroDPS) / _threshGyroDPS;
    
    // Clamp to [0, 1]
    accelExcess = constrain(accelExcess, 0.0f, 1.0f);
    gyroExcess  = constrain(gyroExcess,  0.0f, 1.0f);
    
    // Jerk contribution — high jerk = more likely a struggle vs steady motion
    float jerkContrib = constrain(jerk / 10.0f, 0.0f, 1.0f);
    
    // Weighted combination: 40% accel, 35% gyro, 25% jerk
    float raw = (accelExcess * 0.40f) + (gyroExcess * 0.35f) + (jerkContrib * 0.25f);
    
    // Scale to 0–100, with a floor at 50% when thresholds are met
    uint8_t confidence = (uint8_t)(50.0f + raw * 50.0f);
    return constrain(confidence, 0, 100);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

void detectionInit() {
    memset(_buffer, 0, sizeof(_buffer));
    _bufHead         = 0;
    _sampleCount     = 0;
    _prevAccelMag    = 1.0f;
    _consecutiveHits = 0;
    _struggleActive  = false;
    
    detectionSetSensitivity(SENSITIVITY_MEDIUM);
    Serial.println("[DETECT] Initialized — sensitivity: MEDIUM");
}

DetectionResult detectionUpdate(const IMUSample& sample) {
    DetectionResult result;
    result.isStruggle = false;
    result.confidence = 0;
    
    // Store sample in circular buffer
    _buffer[_bufHead] = sample;
    _bufHead = (_bufHead + 1) % WINDOW_SIZE;
    if (_sampleCount < WINDOW_SIZE) _sampleCount++;
    
    // --- 1. Acceleration magnitude (in g) ---
    float accelMag = sqrtf(sample.ax * sample.ax + 
                           sample.ay * sample.ay + 
                           sample.az * sample.az);
    
    // --- 2. Gyroscope magnitude (in °/s) ---
    float gyroMag = sqrtf(sample.gx * sample.gx + 
                          sample.gy * sample.gy + 
                          sample.gz * sample.gz);
    
    // --- 3. Jerk: rate of change of accel magnitude (g/s) ---
    float jerk = fabsf(accelMag - _prevAccelMag) * (float)SAMPLE_RATE_HZ;
    _prevAccelMag = accelMag;
    
    result.accelMag = accelMag;
    result.gyroMag  = gyroMag;
    result.jerk     = jerk;
    
    // --- 4. Threshold check ---
    bool thresholdMet = (accelMag > _threshAccelG) && (gyroMag > _threshGyroDPS);
    
    if (thresholdMet) {
        _consecutiveHits++;
        
        // Calculate confidence even before triggering
        result.confidence = calcConfidence(accelMag, gyroMag, jerk);
        
        // --- 5. Consecutive detection check ---
        if (_consecutiveHits >= _threshConsec) {
            result.isStruggle = true;
            _struggleActive = true;
        }
    } else {
        // Reset consecutive counter if threshold not met
        if (_consecutiveHits > 0) {
            _consecutiveHits--;  // Gradual decay instead of instant reset
        }
        
        // If values are significantly below threshold, calculate low confidence
        if (accelMag > _threshAccelG * 0.7f || gyroMag > _threshGyroDPS * 0.7f) {
            // Some activity detected but below threshold
            float partial = ((accelMag / _threshAccelG) + (gyroMag / _threshGyroDPS)) / 2.0f;
            result.confidence = (uint8_t)(partial * 40.0f);  // Max ~40% when below threshold
        }
        
        // Clear struggle if below threshold for a while
        if (_consecutiveHits == 0) {
            _struggleActive = false;
        }
    }
    
    return result;
}

void detectionSetSensitivity(SensitivityLevel level) {
    _currentLevel = level;
    
    switch (level) {
        case SENSITIVITY_LOW:
            _threshAccelG  = SENS_LOW_ACCEL_G;
            _threshGyroDPS = SENS_LOW_GYRO_DPS;
            _threshConsec  = SENS_LOW_CONSECUTIVE;
            Serial.println("[DETECT] Sensitivity: LOW (accel>2.5g, gyro>300°/s, 5 hits)");
            break;
            
        case SENSITIVITY_HIGH:
            _threshAccelG  = SENS_HIGH_ACCEL_G;
            _threshGyroDPS = SENS_HIGH_GYRO_DPS;
            _threshConsec  = SENS_HIGH_CONSECUTIVE;
            Serial.println("[DETECT] Sensitivity: HIGH (accel>1.5g, gyro>200°/s, 2 hits)");
            break;
            
        case SENSITIVITY_MEDIUM:
        default:
            _threshAccelG  = SENS_MED_ACCEL_G;
            _threshGyroDPS = SENS_MED_GYRO_DPS;
            _threshConsec  = SENS_MED_CONSECUTIVE;
            Serial.println("[DETECT] Sensitivity: MEDIUM (accel>2.0g, gyro>250°/s, 3 hits)");
            break;
    }
    
    // Reset consecutive counter on sensitivity change
    _consecutiveHits = 0;
}

SensitivityLevel detectionGetSensitivity() {
    return _currentLevel;
}

void detectionReset() {
    memset(_buffer, 0, sizeof(_buffer));
    _bufHead         = 0;
    _sampleCount     = 0;
    _prevAccelMag    = 1.0f;
    _consecutiveHits = 0;
    _struggleActive  = false;
    Serial.println("[DETECT] State reset");
}
