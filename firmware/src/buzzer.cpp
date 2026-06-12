/**
 * @file buzzer.cpp
 * @brief Non-blocking buzzer pattern implementation for Fearless wearable
 * 
 * All patterns use millis()-based timing so they never block the main loop.
 * The buzzerUpdate() function must be called every iteration of loop().
 */

#include "buzzer.h"
#include "config.h"

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------
static uint8_t  _pin            = 0;
static BuzzerPattern _pattern   = BUZZER_OFF;
static bool     _buzzerOn       = false;
static uint32_t _lastToggle     = 0;
static uint32_t _patternStart   = 0;
static uint8_t  _beepCount      = 0;
static uint8_t  _beepsTarget    = 0;

// Pattern timing constants
static const uint32_t ALERT_ON_MS       = 100;    // Alert beep ON duration
static const uint32_t ALERT_OFF_MS      = 100;    // Alert beep OFF duration
static const uint32_t ALERT_DURATION_MS = 10000;  // Total alert duration (10s)
static const uint32_t CONFIRM_BEEP_MS   = 200;    // Confirm beep duration
static const uint32_t CANCEL_BEEP_MS    = 80;     // Cancel beep duration
static const uint32_t CANCEL_GAP_MS     = 80;     // Gap between cancel beeps

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

static void _buzzerHigh() {
    digitalWrite(_pin, HIGH);
    _buzzerOn = true;
}

static void _buzzerLow() {
    digitalWrite(_pin, LOW);
    _buzzerOn = false;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

void buzzerInit(uint8_t pin) {
    _pin = pin;
    pinMode(_pin, OUTPUT);
    _buzzerLow();
    _pattern = BUZZER_OFF;
    Serial.println("[BUZZER] Initialized on GPIO " + String(_pin));
}

void buzzerAlertPattern() {
    _pattern      = BUZZER_ALERT;
    _patternStart = millis();
    _lastToggle   = millis();
    _buzzerHigh();
    Serial.println("[BUZZER] >>> ALERT PATTERN STARTED <<<");
}

void buzzerConfirmBeep() {
    _pattern      = BUZZER_CONFIRM;
    _patternStart = millis();
    _lastToggle   = millis();
    _buzzerHigh();
    Serial.println("[BUZZER] Confirm beep");
}

void buzzerCancelBeep() {
    _pattern      = BUZZER_CANCEL;
    _patternStart = millis();
    _lastToggle   = millis();
    _beepCount    = 0;
    _beepsTarget  = 2;
    _buzzerHigh();
    Serial.println("[BUZZER] Cancel acknowledgment");
}

void buzzerStop() {
    _buzzerLow();
    _pattern = BUZZER_OFF;
    Serial.println("[BUZZER] Stopped");
}

bool buzzerIsActive() {
    return _pattern != BUZZER_OFF;
}

void buzzerUpdate() {
    if (_pattern == BUZZER_OFF) return;

    uint32_t now = millis();

    switch (_pattern) {
        // ---- Emergency alert: rapid toggle for 10 seconds ----
        case BUZZER_ALERT: {
            // Check if total duration exceeded
            if (now - _patternStart >= ALERT_DURATION_MS) {
                buzzerStop();
                Serial.println("[BUZZER] Alert pattern completed (10s)");
                return;
            }
            // Toggle on/off
            uint32_t interval = _buzzerOn ? ALERT_ON_MS : ALERT_OFF_MS;
            if (now - _lastToggle >= interval) {
                if (_buzzerOn) {
                    _buzzerLow();
                } else {
                    _buzzerHigh();
                }
                _lastToggle = now;
            }
            break;
        }

        // ---- Single confirmation beep ----
        case BUZZER_CONFIRM: {
            if (now - _patternStart >= CONFIRM_BEEP_MS) {
                buzzerStop();
            }
            break;
        }

        // ---- Two short cancel beeps ----
        case BUZZER_CANCEL: {
            uint32_t elapsed = now - _lastToggle;
            if (_buzzerOn && elapsed >= CANCEL_BEEP_MS) {
                _buzzerLow();
                _lastToggle = now;
                _beepCount++;
            } else if (!_buzzerOn && elapsed >= CANCEL_GAP_MS) {
                if (_beepCount >= _beepsTarget) {
                    buzzerStop();
                } else {
                    _buzzerHigh();
                    _lastToggle = now;
                }
            }
            break;
        }

        default:
            break;
    }
}
