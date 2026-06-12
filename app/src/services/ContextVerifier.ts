/**
 * Fearless App — Context Verifier
 * =================================
 * Phone-side verification that cross-checks the wearable's struggle
 * detection by analysing the phone's own accelerometer and ambient audio.
 *
 * This is a simple threshold-based approach (no ML) that produces a
 * secondary confidence score (0–100) to confirm or reject a bracelet alert.
 *
 * Sensors used:
 *   - expo-sensors (Accelerometer) — detects unusual motion / shaking
 *   - expo-audio (Recording)       — detects loud / distress audio levels
 */

import { Accelerometer } from 'expo-sensors';
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
} from 'expo-audio';

import type { VerificationResult } from '../types';
import {
  ACCEL_UNUSUAL_THRESHOLD,
  AUDIO_DISTRESS_THRESHOLD,
} from '../utils/constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Calculate the magnitude of a 3D acceleration vector. */
function accelMagnitude(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

/**
 * Map a raw sensor value to a 0–100 confidence score using linear interpolation.
 * Values below `low` → 0, above `high` → 100, linearly between.
 */
function linearScale(
  value: number,
  low: number,
  high: number,
): number {
  if (value <= low) return 0;
  if (value >= high) return 100;
  return Math.round(((value - low) / (high - low)) * 100);
}

// ─── Context Verifier ─────────────────────────────────────────────────────────

class ContextVerifier {
  /**
   * Run a full context verification pass.
   * Checks both accelerometer and (optionally) audio to produce
   * a combined confidence score.
   *
   * @param checkAudio  Whether to also analyse ambient audio levels.
   * @param durationMs  How long to sample sensors (default: 2 000 ms).
   * @returns A VerificationResult with individual and combined confidence scores.
   */
  async verify(
    checkAudio = false,
    durationMs = 2_000,
  ): Promise<VerificationResult> {
    const [motionConfidence, audioConfidence] = await Promise.all([
      this.checkMotion(durationMs),
      checkAudio ? this.checkAudio(durationMs) : Promise.resolve(0),
    ]);

    // Weighted combination: motion is primary, audio is supplementary
    const combined = checkAudio
      ? Math.round(motionConfidence * 0.6 + audioConfidence * 0.4)
      : motionConfidence;

    return {
      confidence: Math.min(combined, 100),
      motionConfidence,
      audioConfidence,
      timestamp: new Date().toISOString(),
    };
  }

  // ─── Accelerometer ──────────────────────────────────────────────────────

  /**
   * Sample the accelerometer for `durationMs` and return a confidence
   * score (0–100) indicating how "unusual" the motion was.
   *
   * High, erratic acceleration → high confidence of distress.
   */
  private async checkMotion(durationMs: number): Promise<number> {
    return new Promise<number>((resolve) => {
      const magnitudes: number[] = [];
      let subscription: ReturnType<typeof Accelerometer.addListener> | null = null;

      try {
        // Sample at ~50 Hz
        Accelerometer.setUpdateInterval(20);

        subscription = Accelerometer.addListener(({ x, y, z }) => {
          magnitudes.push(accelMagnitude(x, y, z));
        });

        // Stop after the sampling window
        setTimeout(() => {
          subscription?.remove();

          if (magnitudes.length === 0) {
            resolve(0);
            return;
          }

          // Compute stats
          const maxMag = Math.max(...magnitudes);
          const mean =
            magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;

          // Standard deviation — measures jerkiness
          const variance =
            magnitudes.reduce((sum, m) => sum + (m - mean) ** 2, 0) /
            magnitudes.length;
          const stdDev = Math.sqrt(variance);

          // Score based on peak magnitude and variability
          const peakScore = linearScale(
            maxMag,
            9.8,           // 1 g (normal gravity, phone on table)
            ACCEL_UNUSUAL_THRESHOLD,
          );
          const variabilityScore = linearScale(stdDev, 0.5, 5);

          // Combine: peak contributes more than variability
          const confidence = Math.round(
            peakScore * 0.65 + variabilityScore * 0.35,
          );

          resolve(Math.min(confidence, 100));
        }, durationMs);
      } catch (error) {
        console.warn('[ContextVerifier] Accelerometer error:', error);
        subscription?.remove();
        resolve(0);
      }
    });
  }

  // ─── Audio Analysis ──────────────────────────────────────────────────────

  /**
   * Record a short audio clip and estimate the ambient volume level.
   * Returns a confidence score (0–100) based on how loud the environment is.
   *
   * Uses expo-audio's `useAudioRecorder` indirectly through a stateless
   * recording approach — we start recording, measure metering, then stop.
   *
   * NOTE: expo-audio's Recording API requires permission.
   */
  private async checkAudio(durationMs: number): Promise<number> {
    try {
      // Request recording permission
      const permissionStatus = await AudioModule.requestRecordingPermissionsAsync();
      if (!permissionStatus.granted) {
        console.warn('[ContextVerifier] Audio recording permission denied');
        return 0;
      }

      // Create a recorder and start
      const recorder = new AudioModule.AudioRecorder(
        RecordingPresets.HIGH_QUALITY,
      );

      recorder.record();

      // Wait for the sampling window
      await new Promise((r) => setTimeout(r, durationMs));

      // Get metering info before stopping
      const status = recorder.getStatus();
      const meteringDb = status?.metering ?? -160; // dBFS, -160 = silence

      // Stop and release
      await recorder.stop();

      // Convert dBFS to a 0–1 normalised level
      // dBFS range: -160 (silence) to 0 (max amplitude)
      // We map -60 dB → 0.0 and -5 dB → 1.0
      const normalisedLevel = linearScale(meteringDb, -60, -5) / 100;

      const confidence = linearScale(
        normalisedLevel,
        0.2,
        AUDIO_DISTRESS_THRESHOLD,
      );

      return Math.min(confidence, 100);
    } catch (error) {
      console.warn('[ContextVerifier] Audio analysis error:', error);
      return 0; // Fail open — don't block alert due to audio failure
    }
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

const contextVerifier = new ContextVerifier();
export default contextVerifier;
