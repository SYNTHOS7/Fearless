/**
 * Fearless App — Constants
 * =========================
 * Centralised constants: BLE UUIDs, default settings, theme colours, and alert messages.
 * All magic values live here so they're easy to change in one place.
 */

import type { Settings } from '../types';

// ─── BLE UUIDs ────────────────────────────────────────────────────────────────

/** Custom Fearless service exposed by the ESP32S3 wearable. */
export const FEARLESS_SERVICE_UUID = '12345678-1234-5678-1234-56789abcdef0';

/** Characteristics under the Fearless service. */
export const BLE_CHARACTERISTICS = {
  /** [Notify, Read] uint8 — 0=Normal, 1=Struggle, 2=Emergency */
  STRUGGLE_STATUS: '12345678-1234-5678-1234-56789abcdef1',
  /** [Notify, Read] uint8 — 0–100 confidence percentage */
  CONFIDENCE_LEVEL: '12345678-1234-5678-1234-56789abcdef2',
  /** [Write] uint8 — 0=Cancel, 1=Confirm, 2=Reset */
  ALERT_CONTROL: '12345678-1234-5678-1234-56789abcdef3',
  /** [Read, Write] uint8 — 1=Low, 2=Medium, 3=High */
  SENSITIVITY_CONFIG: '12345678-1234-5678-1234-56789abcdef4',
} as const;

/** Standard Bluetooth Battery Service. */
export const BATTERY_SERVICE_UUID = '0000180f-0000-1000-8000-00805f9b34fb';

/** Battery Level characteristic under the Battery Service. */
export const BATTERY_LEVEL_CHARACTERISTIC =
  '00002a19-0000-1000-8000-00805f9b34fb';

// ─── BLE Scan / Reconnect Timing ──────────────────────────────────────────────

/** How long to scan before giving up (ms). */
export const BLE_SCAN_TIMEOUT_MS = 15_000;

/** Base delay for exponential back-off reconnection (ms). */
export const RECONNECT_BASE_DELAY_MS = 1_000;

/** Maximum delay between reconnection attempts (ms). */
export const RECONNECT_MAX_DELAY_MS = 30_000;

/** Maximum number of consecutive reconnection attempts. */
export const RECONNECT_MAX_ATTEMPTS = 10;

// ─── Demo Mode Timing ────────────────────────────────────────────────────────

/** Interval between simulated BLE data packets (ms). */
export const DEMO_TICK_INTERVAL_MS = 2_000;

/** Chance (0–1) that a demo tick produces an elevated risk spike. */
export const DEMO_SPIKE_CHANCE = 0.08;

/** Chance (0–1) that a demo tick produces a danger-level spike. */
export const DEMO_DANGER_CHANCE = 0.02;

/** How much battery drops per demo tick (percentage points). */
export const DEMO_BATTERY_DRAIN_RATE = 0.05;

// ─── Default Settings ─────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: Settings = {
  sensitivity: 2, // Medium
  contextVerification: true,
  audioVerification: false,
  alertCountdown: 10, // seconds
  demoMode: true, // ON by default so app works without hardware
};

// ─── Thresholds ───────────────────────────────────────────────────────────────

/** Confidence thresholds for mapping raw confidence → RiskStatus. */
export const RISK_THRESHOLDS = {
  /** Confidence >= this value → 'danger' */
  DANGER: 70,
  /** Confidence >= this value → 'elevated' */
  ELEVATED: 30,
  /** Anything below ELEVATED → 'safe' */
} as const;

/** Accelerometer magnitude threshold for "unusual motion" (m/s²). */
export const ACCEL_UNUSUAL_THRESHOLD = 18;

/** Ambient audio RMS threshold for "loud / distress" level (0–1 normalised). */
export const AUDIO_DISTRESS_THRESHOLD = 0.6;

// ─── Theme Colours ────────────────────────────────────────────────────────────

export const COLORS = {
  // Brand
  primary: '#6C5CE7', // Purple — main CTA
  primaryDark: '#5A4BD1',
  primaryLight: '#A29BFE',

  // Status
  safe: '#00B894', // Green
  elevated: '#FDCB6E', // Amber / Yellow
  danger: '#E17055', // Red-Orange
  dangerDark: '#D63031', // Deep red

  // Neutrals
  background: '#0F0F1A', // Near-black
  surface: '#1A1A2E', // Dark card
  surfaceLight: '#25253D',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0CC',
  textMuted: '#6C6C8A',

  // Misc
  border: '#2D2D4A',
  overlay: 'rgba(0, 0, 0, 0.65)',
  white: '#FFFFFF',
  black: '#000000',
} as const;

// ─── Alert Messages ───────────────────────────────────────────────────────────

/**
 * Generate the emergency SMS body.
 * @param contactName  Name of the person being alerted.
 * @param mapsUrl      Google Maps link to the user's current location.
 */
export function buildEmergencyMessage(
  contactName: string,
  mapsUrl: string,
  customMessage?: string,
): string {
  const base =
    `🚨 FEARLESS EMERGENCY ALERT 🚨\n\n` +
    `Hi ${contactName}, this is an automated safety alert.\n` +
    `I may be in danger and need help immediately.\n\n` +
    `📍 My current location:\n${mapsUrl}\n`;

  const custom = customMessage
    ? `\n💬 Personal note: ${customMessage}\n`
    : '';

  const footer =
    `\nPlease try to reach me or call emergency services.\n` +
    `— Sent via Fearless Safety App`;

  return base + custom + footer;
}

/** User-facing status descriptions. */
export const STATUS_LABELS: Record<string, string> = {
  safe: 'All Clear',
  elevated: 'Elevated Risk',
  danger: 'Danger Detected',
  disconnected: 'Disconnected',
  scanning: 'Scanning…',
  connecting: 'Connecting…',
  connected: 'Connected',
};

/** Sensitivity level labels. */
export const SENSITIVITY_LABELS: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
};
