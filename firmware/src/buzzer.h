/**
 * @file buzzer.h
 * @brief Non-blocking buzzer pattern controller for Fearless wearable
 * 
 * Provides emergency alert patterns, confirmation beeps, and cancel
 * functionality — all driven by millis() so nothing blocks the main loop.
 */

#ifndef BUZZER_H
#define BUZZER_H

#include <Arduino.h>

// Buzzer pattern types
enum BuzzerPattern : uint8_t {
    BUZZER_OFF = 0,
    BUZZER_ALERT,       // Rapid beeping: 100ms on / 100ms off for 10 seconds
    BUZZER_CONFIRM,     // Single 200ms beep
    BUZZER_CANCEL       // Two short beeps to acknowledge cancel
};

/**
 * Initialize the buzzer pin
 * @param pin GPIO pin connected to the piezo buzzer
 */
void buzzerInit(uint8_t pin);

/**
 * Start the emergency alert pattern (rapid beeping for 10s)
 */
void buzzerAlertPattern();

/**
 * Play a single confirmation beep (200ms)
 */
void buzzerConfirmBeep();

/**
 * Play cancel acknowledgment (two short beeps)
 */
void buzzerCancelBeep();

/**
 * Immediately stop the buzzer
 */
void buzzerStop();

/**
 * Update buzzer state — call this every loop iteration
 * Handles non-blocking timing for all patterns
 */
void buzzerUpdate();

/**
 * Check if the buzzer is currently active
 * @return true if a pattern is playing
 */
bool buzzerIsActive();

#endif // BUZZER_H
