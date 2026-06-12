export interface ParsedPacket {
  type: number;
  sequenceId: number;
  timestamp: number;
}

export interface EventFeatures {
  anomalyScore: number;
  confidence: number;
  durationMs: number;
  motionStateFlags: number;
  peakAccel: number;
  dominantFreq: number;
  zcr: number;
  spectralEntropy: number;
  eigenvalueRatio: number;
  motionPattern: MotionPattern;
  wearConfidence: number;
}

export interface EventPacket extends ParsedPacket, EventFeatures {}

export interface StatusPacket extends ParsedPacket {
  batteryLevel: number;
  isCharging: boolean;
  deviceHealthFlags: number;
  wearConfidence: number;
}

export interface SensorPacket extends ParsedPacket {
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
  resultant: number;
  jerk: number;
  anomalyScore: number;
}

export type MotionPattern = 
  | 'FALL_CANDIDATE'
  | 'STRUGGLE_CANDIDATE'
  | 'SEIZURE_CANDIDATE'
  | 'PINNED_CANDIDATE'
  | 'UNKNOWN_ANOMALY';

export type ThreatLevel = 
  | 'NORMAL'
  | 'LOW_ALERT'
  | 'ELEVATED'
  | 'HIGH'
  | 'CRITICAL';

export type LocationCategory = 
  | 'HOME'
  | 'KNOWN_SAFE'
  | 'UNKNOWN_URBAN'
  | 'UNKNOWN_ISOLATED'
  | 'INDOORS_KNOWN'
  | 'GPS_UNAVAILABLE';

export type EventOutcome = 'emergency' | 'false_positive' | 'unknown' | 'cancelled';

export interface ThreatContext {
  baseMotionScore: number;
  durationFactor: number;
  postAnomalyStillness: boolean;
  historicalAdjustment: number;
  locationMultiplier: number;
  timeMultiplier: number;
  soundEvidence: number;
  wearConfidence: number;
}

// SQLite Database Types
export interface EventRecord {
  id?: number;
  timestamp: number;
  anomaly_score: number;
  confidence: number;
  duration_ms: number;
  motion_pattern: string;
  threat_score: number;
  threat_level: string;
  outcome: string;
  location_lat?: number;
  location_lng?: number;
  location_label?: string;
  user_activity?: string;
  raw_packet_hex?: string;
  created_at?: number;
}

export interface ContactRecord {
  id?: number;
  name: string;
  phone: string;
  email?: string;
  notify_methods: string; // JSON array
  has_app: boolean;
  verified: boolean;
  priority: number;
}

export interface PatternRecord {
  id?: number;
  event_id?: number;
  anomaly_score: number;
  dominant_freq: number;
  zcr: number;
  spectral_entropy: number;
  eigenvalue_ratio: number;
  motion_flags: number;
  outcome: string;
  similarity_weight: number;
}

export interface SensorLogRecord {
  id?: number;
  event_id?: number;
  timestamp: number;
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
  resultant: number;
  jerk: number;
  anomaly_score: number;
}
