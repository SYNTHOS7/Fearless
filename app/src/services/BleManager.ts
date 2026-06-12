/**
 * Fearless App — BLE Manager (Singleton)
 * ========================================
 * Manages the full BLE lifecycle: scanning, connecting, monitoring
 * characteristics, and writing commands to the ESP32S3 wearable.
 *
 * When `demoMode` is enabled, the manager skips real BLE and instead
 * generates simulated data via setInterval so the app can be demonstrated
 * without physical hardware.
 *
 * Events emitted:
 *   'connectionChange'   → ConnectionStatus
 *   'struggleUpdate'     → StruggleEventPayload
 *   'batteryUpdate'      → BatteryEventPayload
 *   'deviceDiscovered'   → BleDevice
 *   'error'              → { message: string; code?: string }
 */

import { Platform } from 'react-native';

class TinyEmitter {
  private listeners: { [event: string]: Function[] } = {};

  on(event: string, callback: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Function): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event: string, ...args: any[]): void {
    if (!this.listeners[event]) return;
    for (const callback of this.listeners[event]) {
      callback(...args);
    }
  }

  removeAllListeners(): void {
    this.listeners = {};
  }
}
import type { BleManager as RNBleManagerType, Device, Subscription } from 'react-native-ble-plx';

let RNBleManager: any;
if (Platform.OS !== 'web') {
  RNBleManager = require('react-native-ble-plx').BleManager;
}

import type {
  BleDevice,
  ConnectionStatus,
  StruggleEventPayload,
  BatteryEventPayload,
  SensitivityLevel,
  StruggleStatus as StruggleStatusType,
} from '../types';
import { StruggleStatus, AlertControl } from '../types';
import {
  FEARLESS_SERVICE_UUID,
  BLE_CHARACTERISTICS,
  BATTERY_SERVICE_UUID,
  BATTERY_LEVEL_CHARACTERISTIC,
  BLE_SCAN_TIMEOUT_MS,
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_MAX_DELAY_MS,
  RECONNECT_MAX_ATTEMPTS,
  DEMO_TICK_INTERVAL_MS,
  DEMO_SPIKE_CHANCE,
  DEMO_DANGER_CHANCE,
  DEMO_BATTERY_DRAIN_RATE,
} from '../utils/constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Decode a single-byte base64-encoded BLE value into a uint8. */
function decodeUint8(base64: string | null): number {
  if (!base64) return 0;
  // React-Native atob polyfill or manual decode for single byte
  const raw = globalThis.atob(base64);
  return raw.charCodeAt(0);
}

/** Encode a uint8 to base64 for BLE write. */
function encodeUint8(value: number): string {
  return globalThis.btoa(String.fromCharCode(value & 0xff));
}

/** Clamp a number between min and max. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─── BLE Manager Singleton ───────────────────────────────────────────────────

class FearlessBleManager extends TinyEmitter {
  // --- BLE internals ---
  private manager: RNBleManagerType | null = null;
  private connectedDevice: Device | null = null;
  private subscriptions: Subscription[] = [];
  private scanTimeout: ReturnType<typeof setTimeout> | null = null;

  // --- Reconnection state ---
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  // --- Demo mode ---
  private _demoMode = false;
  private demoInterval: ReturnType<typeof setInterval> | null = null;
  private demoBattery = 95;

  // --- Public state ---
  private _connectionStatus: ConnectionStatus = 'disconnected';
  private _lastStruggleStatus: StruggleStatusType = StruggleStatus.Normal;
  private _lastConfidence = 0;
  private _batteryLevel = -1; // -1 = unknown

  // ─── Getters ──────────────────────────────────────────────────────────────

  get connectionStatus(): ConnectionStatus {
    return this._connectionStatus;
  }

  get lastStruggleStatus(): StruggleStatusType {
    return this._lastStruggleStatus;
  }

  get lastConfidence(): number {
    return this._lastConfidence;
  }

  get batteryLevel(): number {
    return this._batteryLevel;
  }

  get demoMode(): boolean {
    return this._demoMode;
  }

  // ─── Initialisation ──────────────────────────────────────────────────────

  /**
   * Initialise the BLE stack. Must be called once before scanning.
   * On Android, this also waits for the Bluetooth adapter to power on.
   */
  async initialise(): Promise<void> {
    if (this.manager) return; // already initialised

    try {
      this.manager = new RNBleManager();
    } catch (e) {
      console.warn('[BleManager] Native BLE module not found. Falling back to Demo Mode.', e);
      this.setDemoMode(true);
      return;
    }

    // Wait for Bluetooth to be powered on (Android only)
    if (Platform.OS === 'android') {
      await new Promise<void>((resolve) => {
        const sub = this.manager!.onStateChange((state) => {
          if (state === 'PoweredOn') {
            sub.remove();
            resolve();
          }
        }, true);
      });
    }
  }

  // ─── Demo Mode ────────────────────────────────────────────────────────────

  /** Enable or disable demo / simulation mode. */
  setDemoMode(enabled: boolean): void {
    this._demoMode = enabled;

    if (enabled) {
      this.stopRealBle();
      this.startDemoSimulation();
    } else {
      this.stopDemoSimulation();
    }
  }

  /** Start generating fake BLE data at a regular interval. */
  private startDemoSimulation(): void {
    this.stopDemoSimulation(); // ensure no double-interval

    this.demoBattery = 95;
    this._batteryLevel = this.demoBattery;
    this.setConnectionStatus('connected');

    // Emit initial "device found"
    this.emit('deviceDiscovered', {
      id: 'demo-device-001',
      name: 'Fearless-DEMO',
      rssi: -42,
    } satisfies BleDevice);

    this.demoInterval = setInterval(() => {
      this.generateDemoTick();
    }, DEMO_TICK_INTERVAL_MS);
  }

  /** Generate one tick of simulated BLE data. */
  private generateDemoTick(): void {
    const rand = Math.random();
    let status: StruggleStatusType = StruggleStatus.Normal;
    let confidence = Math.floor(Math.random() * 15); // baseline 0–14

    if (rand < DEMO_DANGER_CHANCE) {
      // ~2 % chance of full emergency
      status = StruggleStatus.Emergency;
      confidence = 80 + Math.floor(Math.random() * 21); // 80–100
    } else if (rand < DEMO_DANGER_CHANCE + DEMO_SPIKE_CHANCE) {
      // ~8 % chance of struggle / elevated
      status = StruggleStatus.Struggle;
      confidence = 40 + Math.floor(Math.random() * 40); // 40–79
    }

    this._lastStruggleStatus = status;
    this._lastConfidence = confidence;

    const payload: StruggleEventPayload = {
      status,
      confidence,
      timestamp: new Date().toISOString(),
    };
    this.emit('struggleUpdate', payload);

    // Slow battery drain
    this.demoBattery = Math.max(0, this.demoBattery - DEMO_BATTERY_DRAIN_RATE);
    this._batteryLevel = Math.round(this.demoBattery);

    this.emit('batteryUpdate', {
      level: this._batteryLevel,
      timestamp: new Date().toISOString(),
    } satisfies BatteryEventPayload);
  }

  /**
   * Manually trigger a fake alert in demo mode.
   * Useful for demo presentations.
   */
  triggerDemoAlert(): void {
    if (!this._demoMode) return;

    this._lastStruggleStatus = StruggleStatus.Emergency;
    this._lastConfidence = 92;

    this.emit('struggleUpdate', {
      status: StruggleStatus.Emergency,
      confidence: 92,
      timestamp: new Date().toISOString(),
    } satisfies StruggleEventPayload);
  }

  private stopDemoSimulation(): void {
    if (this.demoInterval) {
      clearInterval(this.demoInterval);
      this.demoInterval = null;
    }
  }

  // ─── Real BLE — Scanning ─────────────────────────────────────────────────

  /**
   * Start scanning for Fearless wearable devices.
   * Automatically stops after `BLE_SCAN_TIMEOUT_MS`.
   */
  async startScan(): Promise<void> {
    if (this._demoMode) {
      this.startDemoSimulation();
      return;
    }

    await this.initialise();

    this.setConnectionStatus('scanning');

    // Safety: stop any previous scan
    this.manager!.stopDeviceScan();

    this.manager!.startDeviceScan(
      [FEARLESS_SERVICE_UUID],
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          this.emitError('Scan failed', error.message);
          this.setConnectionStatus('disconnected');
          return;
        }

        if (device && device.name?.startsWith('Fearless')) {
          const bleDevice: BleDevice = {
            id: device.id,
            name: device.name ?? 'Fearless Device',
            rssi: device.rssi ?? -100,
          };
          this.emit('deviceDiscovered', bleDevice);
        }
      },
    );

    // Auto-stop scan after timeout
    this.scanTimeout = setTimeout(() => {
      this.stopScan();
    }, BLE_SCAN_TIMEOUT_MS);
  }

  /** Stop the current BLE scan. */
  stopScan(): void {
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
    this.manager?.stopDeviceScan();

    if (this._connectionStatus === 'scanning') {
      this.setConnectionStatus('disconnected');
    }
  }

  // ─── Real BLE — Connection ───────────────────────────────────────────────

  /**
   * Connect to a Fearless device by its peripheral ID.
   * Automatically discovers services and subscribes to notify characteristics.
   */
  async connect(deviceId: string): Promise<void> {
    if (this._demoMode) return;

    await this.initialise();
    this.stopScan();
    this.setConnectionStatus('connecting');
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;

    try {
      const device = await this.manager!.connectToDevice(deviceId, {
        autoConnect: false,
        requestMTU: 512,
      });

      await device.discoverAllServicesAndCharacteristics();
      this.connectedDevice = device;
      this.setConnectionStatus('connected');

      // Monitor disconnect for auto-reconnect
      device.onDisconnected((error, dev) => {
        this.handleDisconnect(dev?.id ?? deviceId);
      });

      // Subscribe to notify characteristics
      await this.subscribeToCharacteristics(device);

      // Read initial battery level
      await this.readBatteryLevel();
    } catch (error: any) {
      this.emitError('Connection failed', error?.message);
      this.scheduleReconnect(deviceId);
    }
  }

  /** Gracefully disconnect from the current device. */
  async disconnect(): Promise<void> {
    this.shouldReconnect = false;
    this.clearReconnectTimer();
    this.unsubscribeAll();

    if (this.connectedDevice) {
      try {
        await this.manager?.cancelDeviceConnection(this.connectedDevice.id);
      } catch {
        // Already disconnected — ignore
      }
      this.connectedDevice = null;
    }

    this.setConnectionStatus('disconnected');
  }

  // ─── Characteristic Subscriptions ─────────────────────────────────────────

  private async subscribeToCharacteristics(device: Device): Promise<void> {
    // 1. Struggle Status (Notify)
    const struggleSub = device.monitorCharacteristicForService(
      FEARLESS_SERVICE_UUID,
      BLE_CHARACTERISTICS.STRUGGLE_STATUS,
      (error, char) => {
        if (error) {
          this.emitError('Struggle monitor error', error.message);
          return;
        }
        if (char?.value) {
          this._lastStruggleStatus = decodeUint8(char.value) as StruggleStatusType;

          // Also read latest confidence
          this.readConfidence();

          this.emit('struggleUpdate', {
            status: this._lastStruggleStatus,
            confidence: this._lastConfidence,
            timestamp: new Date().toISOString(),
          } satisfies StruggleEventPayload);
        }
      },
    );
    this.subscriptions.push(struggleSub);

    // 2. Confidence Level (Notify)
    const confSub = device.monitorCharacteristicForService(
      FEARLESS_SERVICE_UUID,
      BLE_CHARACTERISTICS.CONFIDENCE_LEVEL,
      (error, char) => {
        if (error) {
          this.emitError('Confidence monitor error', error.message);
          return;
        }
        if (char?.value) {
          this._lastConfidence = clamp(decodeUint8(char.value), 0, 100);
        }
      },
    );
    this.subscriptions.push(confSub);

    // 3. Battery Level (Notify)
    try {
      const batSub = device.monitorCharacteristicForService(
        BATTERY_SERVICE_UUID,
        BATTERY_LEVEL_CHARACTERISTIC,
        (error, char) => {
          if (error) return; // battery notify is optional
          if (char?.value) {
            this._batteryLevel = clamp(decodeUint8(char.value), 0, 100);
            this.emit('batteryUpdate', {
              level: this._batteryLevel,
              timestamp: new Date().toISOString(),
            } satisfies BatteryEventPayload);
          }
        },
      );
      this.subscriptions.push(batSub);
    } catch {
      // Battery notify may not be supported — fall back to polling
    }
  }

  /** Read the confidence characteristic once. */
  private async readConfidence(): Promise<void> {
    if (!this.connectedDevice) return;
    try {
      const char = await this.connectedDevice.readCharacteristicForService(
        FEARLESS_SERVICE_UUID,
        BLE_CHARACTERISTICS.CONFIDENCE_LEVEL,
      );
      if (char?.value) {
        this._lastConfidence = clamp(decodeUint8(char.value), 0, 100);
      }
    } catch {
      // Non-critical — confidence will be updated on next notify
    }
  }

  /** Remove all active characteristic subscriptions. */
  private unsubscribeAll(): void {
    for (const sub of this.subscriptions) {
      sub.remove();
    }
    this.subscriptions = [];
  }

  // ─── Read / Write Operations ──────────────────────────────────────────────

  /** Read the current battery level from the Battery Service. */
  async readBatteryLevel(): Promise<number> {
    if (this._demoMode) return this._batteryLevel;

    if (!this.connectedDevice) return -1;

    try {
      const char = await this.connectedDevice.readCharacteristicForService(
        BATTERY_SERVICE_UUID,
        BATTERY_LEVEL_CHARACTERISTIC,
      );
      if (char?.value) {
        this._batteryLevel = clamp(decodeUint8(char.value), 0, 100);
        this.emit('batteryUpdate', {
          level: this._batteryLevel,
          timestamp: new Date().toISOString(),
        } satisfies BatteryEventPayload);
      }
    } catch (error: any) {
      this.emitError('Battery read failed', error?.message);
    }

    return this._batteryLevel;
  }

  /** Read the current sensitivity config from the wearable. */
  async readSensitivity(): Promise<SensitivityLevel> {
    if (this._demoMode) return 2;

    if (!this.connectedDevice) return 2;

    try {
      const char = await this.connectedDevice.readCharacteristicForService(
        FEARLESS_SERVICE_UUID,
        BLE_CHARACTERISTICS.SENSITIVITY_CONFIG,
      );
      if (char?.value) {
        const raw = decodeUint8(char.value);
        return clamp(raw, 1, 3) as SensitivityLevel;
      }
    } catch (error: any) {
      this.emitError('Sensitivity read failed', error?.message);
    }

    return 2; // default Medium
  }

  /** Write a new sensitivity level to the wearable. */
  async writeSensitivity(level: SensitivityLevel): Promise<void> {
    if (this._demoMode) return;

    if (!this.connectedDevice) {
      this.emitError('Cannot write sensitivity', 'No device connected');
      return;
    }

    try {
      await this.connectedDevice.writeCharacteristicWithResponseForService(
        FEARLESS_SERVICE_UUID,
        BLE_CHARACTERISTICS.SENSITIVITY_CONFIG,
        encodeUint8(level),
      );
    } catch (error: any) {
      this.emitError('Sensitivity write failed', error?.message);
    }
  }

  /** Send an alert control command to the wearable. */
  async writeAlertControl(command: AlertControl): Promise<void> {
    if (this._demoMode) return;

    if (!this.connectedDevice) return;

    try {
      await this.connectedDevice.writeCharacteristicWithResponseForService(
        FEARLESS_SERVICE_UUID,
        BLE_CHARACTERISTICS.ALERT_CONTROL,
        encodeUint8(command),
      );
    } catch (error: any) {
      this.emitError('Alert control write failed', error?.message);
    }
  }

  // ─── Auto-Reconnect ──────────────────────────────────────────────────────

  private handleDisconnect(deviceId: string): void {
    this.connectedDevice = null;
    this.unsubscribeAll();
    this.setConnectionStatus('disconnected');

    if (this.shouldReconnect) {
      this.scheduleReconnect(deviceId);
    }
  }

  private scheduleReconnect(deviceId: string): void {
    if (this.reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
      this.emitError(
        'Reconnection failed',
        `Gave up after ${RECONNECT_MAX_ATTEMPTS} attempts`,
      );
      return;
    }

    // Exponential back-off: 1s, 2s, 4s, 8s … capped at 30s
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts),
      RECONNECT_MAX_DELAY_MS,
    );

    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect(deviceId);
      } catch {
        // connect() will internally schedule the next attempt
      }
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private setConnectionStatus(status: ConnectionStatus): void {
    if (this._connectionStatus === status) return;
    this._connectionStatus = status;
    this.emit('connectionChange', status);
  }

  private emitError(message: string, detail?: string): void {
    this.emit('error', {
      message: detail ? `${message}: ${detail}` : message,
    });
  }

  /** Tear down all real BLE resources. */
  private stopRealBle(): void {
    this.stopScan();
    this.disconnect().catch(() => {});
  }

  /** Full cleanup — call on app unmount. */
  destroy(): void {
    this.stopDemoSimulation();
    this.stopRealBle();
    this.manager?.destroy();
    this.manager = null;
    this.removeAllListeners();
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

/** The single shared BLE manager instance for the entire app. */
const bleManager = new FearlessBleManager();
export default bleManager;
