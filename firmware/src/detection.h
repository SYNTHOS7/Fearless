/**
 * @file detection.h
 * @brief Threshold-based struggle detection for Fearless wearable
 * 
 * Uses acceleration magnitude, gyroscope magnitude, and jerk analysis
 * to detect physical struggle patterns. Supports three sensitivity levels.
 */

#ifndef DETECTION_H
#define DETECTION_H

#include <Arduino.h>
#include "config.h"

// Result of a detection cycle
struct DetectionResult {
    bool    isStruggle;     // true if struggle detected
    uint8_t confidence;     // 0–100 percentage
    float   accelMag;       // Current acceleration magnitude (g)
    float   gyroMag;        // Current gyroscope magnitude (°/s)
    float   jerk;           // Rate of change of accel magnitude (g/s)
};

// IMU sample (6-axis)
struct IMUSample {
    float ax, ay, az;       // Acceleration in g
    float gx, gy, gz;       // Gyroscope in °/s
};

/**
 * Initialize the detection engine
 */
void detectionInit();

/**
 * Push a new IMU sample into the circular buffer and run detection
 * @param sample The 6-axis IMU reading
 * @return DetectionResult with struggle status and confidence
 */
DetectionResult detectionUpdate(const IMUSample& sample);

/**
 * Set the sensitivity level
 * @param level SENSITIVITY_LOW, SENSITIVITY_MEDIUM, or SENSITIVITY_HIGH
 */
void detectionSetSensitivity(SensitivityLevel level);

/**
 * Get the current sensitivity level
 */
SensitivityLevel detectionGetSensitivity();

/**
 * Reset the detection state (clear buffer and counters)
 */
void detectionReset();

#endif // DETECTION_H
