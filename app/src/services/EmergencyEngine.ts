import { Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

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
import bleManager from './BleManager';
import contextVerifier from './ContextVerifier';
import locationService from './LocationService';
import smsService from './SmsService';
import storageService from './StorageService';
import type { AlertEvent, AlertType, Settings, Contact } from '../types';
import { StruggleStatus, AlertControl } from '../types';

// ─── Emergency Engine Singleton ──────────────────────────────────────────────

class EmergencyEngine extends TinyEmitter {
  private alertState: 'idle' | 'countdown' | 'alerting' = 'idle';
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private countdownRemaining = 0;
  private activeAlert: AlertEvent | null = null;

  constructor() {
    super();
    // Listen to BleManager struggle updates
    bleManager.on('struggleUpdate', this.handleStruggleUpdate.bind(this));
  }

  // ─── Event Handler from Wearable ───────────────────────────────────────────

  private async handleStruggleUpdate(payload: { status: StruggleStatus; confidence: number }) {
    if (this.alertState !== 'idle') return; // Already processing or alerting

    // Trigger only on Struggle (1) or Emergency (2) status
    if (payload.status === StruggleStatus.Struggle || payload.status === StruggleStatus.Emergency) {
      console.log(`[EmergencyEngine] Wearable reported struggle! status=${payload.status}, confidence=${payload.confidence}`);
      
      const settings = await storageService.getSettings();
      
      // Perform phone verification if enabled
      let phoneConfidence = 100;
      if (settings.contextVerification) {
        console.log('[EmergencyEngine] Performing phone context verification...');
        const verifyResult = await contextVerifier.verify(
          settings.audioVerification,
          2000 // 2 seconds scan
        );
        phoneConfidence = verifyResult.confidence;
        console.log(`[EmergencyEngine] Context verification finished. Phone confidence: ${phoneConfidence}%`);
      }

      // Combine confidence: wearable is primary (60%), phone is context (40%)
      const combinedConfidence = settings.contextVerification
        ? Math.round(payload.confidence * 0.6 + phoneConfidence * 0.4)
        : payload.confidence;

      console.log(`[EmergencyEngine] Combined Confidence: ${combinedConfidence}%`);

      // If confidence exceeds threshold, start the emergency alert process
      if (combinedConfidence >= 70) {
        await this.startEmergencyFlow('struggle', combinedConfidence);
      }
    }
  }

  // ─── Emergency Flow Controls ────────────────────────────────────────────────

  /**
   * Start the countdown timer for dispatching the emergency alert.
   */
  private async startEmergencyFlow(type: AlertType, confidence: number) {
    if (this.alertState !== 'idle') return;

    const settings = await storageService.getSettings();
    const duration = settings.alertCountdown;

    this.alertState = 'countdown';
    this.countdownRemaining = duration;

    // Create the temporary alert event
    this.activeAlert = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      type,
      confidence,
      dismissed: false,
    };

    this.emitStateChange();

    // Start phone notification patterns (Vibrate & Haptics)
    Vibration.vibrate([500, 500, 500], true); // continuous vibration
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // Setup countdown timer interval
    this.countdownTimer = setInterval(async () => {
      this.countdownRemaining--;
      this.emit('tick', this.countdownRemaining);

      // Trigger a light warning haptic feedback on each tick
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (this.countdownRemaining <= 0) {
        this.clearTimer();
        await this.triggerSMSImmediate();
      }
    }, 1000);
  }

  /**
   * Triggers manual SOS, bypassing context verification.
   */
  async triggerManualSOS() {
    await this.startEmergencyFlow('manual', 100);
  }

  /**
   * Immediately dispatches the SMS alerts and stops the countdown timer.
   */
  async triggerSMSImmediate() {
    if (this.alertState === 'alerting') return;

    console.log('[EmergencyEngine] Countdown complete or forced. Dispatching emergency alerts...');
    this.clearTimer();
    Vibration.cancel();

    this.alertState = 'alerting';
    this.emitStateChange();

    // Trigger confirmation beep on wearable if connected
    try {
      await bleManager.writeAlertControl(AlertControl.Confirm);
    } catch (e) {
      console.warn('[EmergencyEngine] Could not send confirmation code to wearable:', e);
    }

    // 1. Get location coordinates
    console.log('[EmergencyEngine] Fetching GPS location...');
    const location = await locationService.getCurrentLocation();
    const fallbackLocation = !location ? await locationService.getLastKnownLocation() : null;
    const finalLocation = location || fallbackLocation;

    let mapsUrl = 'https://maps.google.com/?q=0,0'; // Default fallback
    if (finalLocation) {
      mapsUrl = finalLocation.mapsUrl;
      if (this.activeAlert) {
        this.activeAlert.location = {
          latitude: finalLocation.latitude,
          longitude: finalLocation.longitude,
          mapsUrl: finalLocation.mapsUrl,
        };
      }
    }

    // 2. Fetch emergency contacts
    const contacts = await storageService.getContacts();

    if (contacts.length === 0) {
      console.warn('[EmergencyEngine] No emergency contacts configured to send SMS!');
    } else {
      // 3. Open SMS composer with contacts & prefilled message
      console.log(`[EmergencyEngine] Opening SMS composer for ${contacts.length} contacts...`);
      await smsService.sendToAllContacts(contacts, mapsUrl);
    }

    // 4. Save alert event to storage history
    if (this.activeAlert) {
      await storageService.addAlertEvent(this.activeAlert);
    }

    this.emitStateChange();
    
    // Play an continuous alert haptic pattern to get attention
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }

  /**
   * Cancel the current alert (resets safety status back to normal).
   */
  async cancelAlert() {
    console.log('[EmergencyEngine] Emergency alert cancelled by user');
    this.clearTimer();
    Vibration.cancel();

    if (this.activeAlert) {
      this.activeAlert.dismissed = true;
      if (this.alertState === 'alerting') {
        // If alert was already dispatched, save it to history as dismissed/cancelled
        // Storage will record that it was sent but user marked it safe
        await storageService.dismissAlert(this.activeAlert.id);
      }
    }

    // Reset bracelet alarm status
    try {
      await bleManager.writeAlertControl(AlertControl.Reset);
    } catch (e) {
      console.warn('[EmergencyEngine] Could not write reset command to wearable:', e);
    }

    this.alertState = 'idle';
    this.countdownRemaining = 0;
    this.activeAlert = null;
    this.emitStateChange();
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private clearTimer() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private emitStateChange() {
    this.emit('stateChange', {
      state: this.alertState,
      remaining: this.countdownRemaining,
      activeAlert: this.activeAlert,
    });
  }

  // Getters for context consumption
  getState() {
    return {
      state: this.alertState,
      remaining: this.countdownRemaining,
      activeAlert: this.activeAlert,
    };
  }
}

const emergencyEngine = new EmergencyEngine();
export default emergencyEngine;
