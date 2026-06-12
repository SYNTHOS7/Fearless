import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { 
  ParsedPacket, 
  EventPacket, 
  StatusPacket, 
  SensorPacket, 
  MotionPattern,
  LocationCategory
} from '../types';
import { contextEngine } from './ContextEngine';
import { emergencyEngine } from './EmergencyEngine';
import { dbService } from './DatabaseService';

const SAFEBAND_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
const SAFEBAND_RX_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb';
const SAFEBAND_TX_UUID = '0000ffe2-0000-1000-8000-00805f9b34fb';

export class BLEService {
  private manager: BleManager;
  private device: Device | null = null;
  
  private lastSeqIds: Record<number, number> = {
    0x01: -1,
    0x02: -1,
    0x03: -1
  };

  public sensorBuffer: SensorPacket[] = [];
  private static readonly MAX_SENSOR_BUFFER = 250; // 10 seconds at 25Hz

  constructor() {
    this.manager = new BleManager();
  }

  public async connectToDevice(deviceId: string) {
    try {
      this.device = await this.manager.connectToDevice(deviceId);
      await this.device.discoverAllServicesAndCharacteristics();
      
      this.device.monitorCharacteristicForService(
        SAFEBAND_SERVICE_UUID,
        SAFEBAND_TX_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('BLE Monitor Error:', error);
            return;
          }
          if (characteristic?.value) {
            const bytes = new Uint8Array(Buffer.from(characteristic.value, 'base64'));
            this.parseIncomingPacket(bytes);
          }
        }
      );
    } catch (e) {
      console.error('Connection failed', e);
    }
  }

  public async disconnect() {
    if (this.device) {
      await this.manager.cancelDeviceConnection(this.device.id);
      this.device = null;
    }
  }

  private parseIncomingPacket(bytes: Uint8Array): void {
    if (bytes.length < 3) return;

    const type = bytes[0];
    
    // Validate checksum (XOR of all bytes except last)
    const checksum = bytes.slice(0, -1).reduce((acc, b) => acc ^ b, 0);
    if (checksum !== bytes[bytes.length - 1]) {
      console.warn('Checksum mismatch — dropping packet');
      return;
    }

    const seqId = bytes[1];
    if (this.lastSeqIds[type] !== -1 && seqId !== ((this.lastSeqIds[type] + 1) % 256)) {
      console.warn(`Packet dropped for type ${type}. Expected ${(this.lastSeqIds[type] + 1) % 256}, got ${seqId}`);
      this.requestResync();
    }
    this.lastSeqIds[type] = seqId;

    let parsed: ParsedPacket | null = null;
    switch(type) {
      case 0x01: 
        parsed = this.parseEventPacket(bytes);
        if (parsed) this.handleEventPacket(parsed as EventPacket);
        break;
      case 0x02: 
        parsed = this.parseStatusPacket(bytes);
        if (parsed) this.handleStatusPacket(parsed as StatusPacket);
        break;
      case 0x03: 
        parsed = this.parseSensorPacket(bytes);
        if (parsed) this.handleSensorPacket(parsed as SensorPacket);
        break;
    }
  }

  private async requestResync() {
    if (!this.device) return;
    const req = new Uint8Array([0x04, 0x00, 0x03]); // command 0x03 to resync
    req[2] = req[0] ^ req[1];
    try {
      await this.device.writeCharacteristicWithResponseForService(
        SAFEBAND_SERVICE_UUID,
        SAFEBAND_RX_UUID,
        Buffer.from(req).toString('base64')
      );
    } catch (e) {
      console.warn('Failed to send resync', e);
    }
  }

  private parseEventPacket(bytes: Uint8Array): EventPacket {
    // Expected structure per spec
    const anomalyScore = bytes[4];
    const confidence = bytes[5];
    const motionStateFlags = bytes[6];
    const durationMs = bytes[7] * 100;
    
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const peakAccel = view.getUint16(8, true); // Little endian
    const dominantFreq = bytes[10];
    const zcr = bytes[11];
    const spectralEntropy = bytes[12];
    const eigenvalueRatio = view.getUint16(13, true);
    const wearConfidence = bytes[16] || 100;

    const motionPattern = this.classifyPattern(motionStateFlags, peakAccel, dominantFreq, zcr, spectralEntropy, durationMs);

    return {
      type: 0x01,
      sequenceId: bytes[1],
      timestamp: Date.now(),
      anomalyScore,
      confidence,
      durationMs,
      motionStateFlags,
      peakAccel,
      dominantFreq,
      zcr,
      spectralEntropy,
      eigenvalueRatio,
      motionPattern,
      wearConfidence
    };
  }

  private classifyPattern(flags: number, peakAccel: number, freq: number, zcr: number, entropy: number, durationMs: number): MotionPattern {
    const isHighImpact = peakAccel > 3000;
    const isChaotic = (flags & 0x01) !== 0;
    const isLinear = (flags & 0x02) !== 0;
    const isPeriodic = (flags & 0x04) !== 0;
    const isRestrained = (flags & 0x08) !== 0;

    if (isHighImpact && isLinear && durationMs < 5000) return 'FALL_CANDIDATE';
    if (isChaotic && !isHighImpact && durationMs > 8000) return 'STRUGGLE_CANDIDATE';
    if (isPeriodic && entropy < 50 && durationMs > 10000) return 'SEIZURE_CANDIDATE';
    if (isRestrained && durationMs > 6000) return 'PINNED_CANDIDATE';
    
    return 'UNKNOWN_ANOMALY';
  }

  private parseStatusPacket(bytes: Uint8Array): StatusPacket {
    return {
      type: 0x02,
      sequenceId: bytes[1],
      timestamp: Date.now(),
      batteryLevel: bytes[4],
      isCharging: (bytes[5] === 1),
      deviceHealthFlags: bytes[6],
      wearConfidence: bytes[7] || 100
    };
  }

  private parseSensorPacket(bytes: Uint8Array): SensorPacket {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
      type: 0x03,
      sequenceId: bytes[1],
      timestamp: Date.now(),
      ax: view.getInt16(4, true),
      ay: view.getInt16(6, true),
      az: view.getInt16(8, true),
      gx: view.getInt16(10, true),
      gy: view.getInt16(12, true),
      gz: view.getInt16(14, true),
      resultant: view.getUint16(16, true),
      jerk: view.getUint16(18, true),
      anomalyScore: bytes[20]
    };
  }

  private async handleEventPacket(event: EventPacket) {
    // Trigger context engine
    // We mock LocationCategory for now, would typically come from user settings / current geofence
    const locCategory: LocationCategory = 'UNKNOWN_URBAN';
    const soundEvidence = 0; // Mock sound
    const postAnomalyStillness = false; // Mock stillness

    const { score, context, isEmergency } = await contextEngine.evaluateThreat(event, locCategory, soundEvidence, postAnomalyStillness);

    // Persist to DB
    let threatLevel = 'NORMAL';
    if (score > 0.88) threatLevel = 'CRITICAL';
    else if (score >= 0.72) threatLevel = 'HIGH';
    else if (score >= 0.55) threatLevel = 'ELEVATED';
    else if (score >= 0.40) threatLevel = 'LOW_ALERT';

    const eventId = await dbService.insertEvent({
      timestamp: event.timestamp,
      anomaly_score: event.anomalyScore,
      confidence: event.confidence,
      duration_ms: event.durationMs,
      motion_pattern: event.motionPattern,
      threat_score: score,
      threat_level: threatLevel,
      outcome: 'unknown',
    });

    if (isEmergency) {
      if (score > 0.88) {
        emergencyEngine.forceEmergency(eventId);
      } else {
        emergencyEngine.triggerPreAlert(eventId);
      }
    }
  }

  private handleStatusPacket(status: StatusPacket) {
    // Dispatch to app state manager if using redux/context
  }

  private handleSensorPacket(sensor: SensorPacket) {
    this.sensorBuffer.push(sensor);
    if (this.sensorBuffer.length > BLEService.MAX_SENSOR_BUFFER) {
      this.sensorBuffer.shift();
    }
  }
}

export const bleService = new BLEService();
