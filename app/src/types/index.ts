/**
 * Fearless App — Type Definitions
 * ================================
 * Central type definitions for the Fearless safety wearable companion app.
 * All interfaces, types, and enums used across the service layer.
 */

// ─── Emergency Contact ────────────────────────────────────────────────────────

/** A trusted contact who will receive emergency SMS alerts. */
export interface Contact {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Display name of the contact */
  name: string;
  /** Phone number in E.164 format (e.g. "+1234567890") */
  phone: string;
  /** Relationship label (e.g. "Mom", "Partner", "Friend") */
  relationship: string;
  /** Optional custom message appended to the emergency SMS */
  customMessage?: string;
}

// ─── BLE Device ───────────────────────────────────────────────────────────────

/** Represents a discovered Fearless BLE wearable bracelet. */
export interface BleDevice {
  /** BLE peripheral identifier */
  id: string;
  /** Advertised device name (e.g. "Fearless-XXXX") */
  name: string;
  /** Received Signal Strength Indicator in dBm */
  rssi: number;
}

// ─── Alert Event ──────────────────────────────────────────────────────────────

/** The type of struggle detected by the wearable or context verifier. */
export type AlertType = 'struggle' | 'emergency' | 'manual';

/** A recorded alert event with full context. */
export interface AlertEvent {
  /** Unique identifier (UUID v4) */
  id: string;
  /** ISO 8601 timestamp of when the alert was triggered */
  timestamp: string;
  /** Classification of the alert trigger */
  type: AlertType;
  /** Combined confidence score from bracelet + phone verification (0–100) */
  confidence: number;
  /** GPS location at the time of the alert, if available */
  location?: {
    latitude: number;
    longitude: number;
    /** Pre-formatted Google Maps URL for easy sharing */
    mapsUrl: string;
  };
  /** Whether the user dismissed / cancelled this alert during countdown */
  dismissed: boolean;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

/** Sensitivity level for the wearable's struggle detection algorithm. */
export type SensitivityLevel = 1 | 2 | 3; // 1=Low, 2=Medium, 3=High

/** Countdown duration before emergency SMS is dispatched (seconds). */
export type CountdownDuration = 5 | 10 | 15;

/** User-configurable app settings persisted to AsyncStorage. */
export interface Settings {
  /** Bracelet detection sensitivity: 1=Low, 2=Medium, 3=High */
  sensitivity: SensitivityLevel;
  /** Whether to cross-check with phone accelerometer data */
  contextVerification: boolean;
  /** Whether to analyze ambient audio for distress confirmation */
  audioVerification: boolean;
  /** Seconds to wait before auto-sending emergency SMS */
  alertCountdown: CountdownDuration;
  /** Run in demo/simulation mode without real BLE hardware */
  demoMode: boolean;
}

// ─── Status Enums ─────────────────────────────────────────────────────────────

/** Current risk assessment level derived from struggle status + confidence. */
export type RiskStatus = 'safe' | 'elevated' | 'danger';

/** BLE connection lifecycle state. */
export type ConnectionStatus =
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected';

// ─── BLE Characteristic Values ────────────────────────────────────────────────

/**
 * Raw struggle status byte from the wearable.
 * Maps to the Struggle Status Characteristic (UUID ...def1).
 */
export enum StruggleStatus {
  Normal = 0,
  Struggle = 1,
  Emergency = 2,
}

/**
 * Alert control commands sent TO the wearable.
 * Maps to the Alert Control Characteristic (UUID ...def3).
 */
export enum AlertControl {
  Cancel = 0,
  Confirm = 1,
  Reset = 2,
}

// ─── Event Payloads ───────────────────────────────────────────────────────────

/** Payload emitted by BleManager on struggle status change. */
export interface StruggleEventPayload {
  status: StruggleStatus;
  confidence: number;
  timestamp: string;
}

/** Payload emitted by BleManager on battery level change. */
export interface BatteryEventPayload {
  level: number;
  timestamp: string;
}

/** Payload emitted by ContextVerifier after analysis. */
export interface VerificationResult {
  /** Combined confidence from accelerometer + audio (0–100) */
  confidence: number;
  /** Individual accelerometer-based confidence */
  motionConfidence: number;
  /** Individual audio-based confidence */
  audioConfidence: number;
  /** ISO 8601 timestamp */
  timestamp: string;
}

/** Payload emitted by EmergencyEngine during countdown. */
export interface CountdownPayload {
  /** Seconds remaining */
  remaining: number;
  /** Total countdown duration */
  total: number;
}

/** Payload emitted by EmergencyEngine when an alert resolves. */
export interface AlertResolvedPayload {
  alert: AlertEvent;
  /** Whether SMS was actually dispatched */
  smsDispatched: boolean;
}
