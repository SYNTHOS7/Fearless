import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { dbService } from './DatabaseService';
import storageService from './StorageService';

type EmergencyState = 'IDLE' | 'PRE_ALERT' | 'EMERGENCY' | 'CANCELLED';

export class EmergencyEngine {
  private state: EmergencyState = 'IDLE';
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private soundObject: Audio.Sound | null = null;
  private onStateChangeCallback: ((state: EmergencyState, remaining?: number) => void) | null = null;

  public setOnStateChange(callback: (state: EmergencyState, remaining?: number) => void) {
    this.onStateChangeCallback = callback;
  }

  public async triggerPreAlert(eventId: number) {
    if (this.state !== 'IDLE') return;
    
    this.state = 'PRE_ALERT';
    let remaining = 15;
    
    this.notifyState(remaining);
    this.startHaptics();

    this.countdownTimer = setInterval(async () => {
      remaining--;
      this.notifyState(remaining);

      if (remaining <= 0) {
        this.clearTimer();
        await this.executeEmergencyProtocol(eventId);
      }
    }, 1000);
  }

  public async cancelAlert(eventId: number) {
    this.clearTimer();
    this.stopAlarm();
    this.state = 'CANCELLED';
    this.notifyState();
    
    await dbService.updateEventOutcome(eventId, 'cancelled', 'User cancelled alert');
    
    setTimeout(() => {
      this.state = 'IDLE';
      this.notifyState();
    }, 3000);
  }

  public async forceEmergency(eventId: number) {
    this.clearTimer();
    await this.executeEmergencyProtocol(eventId);
  }

  private async executeEmergencyProtocol(eventId: number) {
    this.state = 'EMERGENCY';
    this.notifyState();

    // 1. Local Alarm
    await this.playAlarm();

    // 2. Location Snapshot
    let locationStr = 'Location Unavailable';
    let mapUrl = '';
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        mapUrl = `https://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`;
        
        // Try reverse geocode
        const geocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        });
        
        if (geocode.length > 0) {
          const addr = geocode[0];
          locationStr = `${addr.street ?? ''} ${addr.city ?? ''}, ${addr.region ?? ''}`;
        } else {
          locationStr = 'Approximate Location';
        }

        // Update event record with location
        // We'd ideally fetch the event, update lat/lng and label
      }
    } catch (e) {
      console.warn('Failed to get location for emergency', e);
    }

    // 3. Notify Contacts
    const contacts = await storageService.getContacts();
    const phoneNumbers = contacts.map(c => c.phone);
    
    const message = `🚨 EMERGENCY ALERT from SafeBand\nPossible emergency detected at:\n${locationStr}\n${mapUrl}\n\nTime: ${new Date().toLocaleString()}\n\nTo confirm you received this: reply OK`;

    if (phoneNumbers.length > 0) {
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        // Note: In a real background scenario, this would use a backend API (Twilio) 
        // to send SMS automatically since iOS/Android prevent fully silent SMS from apps.
        // For Expo, this opens the SMS composer if in foreground.
        console.log("Mocking Background SMS/VOIP to:", phoneNumbers, "Message:", message);
        // await SMS.sendSMSAsync(phoneNumbers, message);
      } else {
        console.log("SMS not available, falling back to VOIP mock...");
      }
    }

    // 4. Sensor Log Upload (Mock)
    console.log(`Mocking Sensor Log Upload for Event ID: ${eventId}`);
  }

  private notifyState(remaining?: number) {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.state, remaining);
    }
  }

  private clearTimer() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private startHaptics() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }

  private async playAlarm() {
    try {
      if (!this.soundObject) {
        /*
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/alarm.mp3'),
          { shouldPlay: true, isLooping: true, volume: 1.0 }
        );
        this.soundObject = sound;
        */
        console.warn("Alarm sound played (mock)");
      } else {
        await this.soundObject.playAsync();
      }
    } catch (e) {
      console.warn("Could not play alarm sound. Ensure assets/alarm.mp3 exists.", e);
    }
  }

  private async stopAlarm() {
    if (this.soundObject) {
      await this.soundObject.stopAsync();
      await this.soundObject.unloadAsync();
      this.soundObject = null;
    }
  }
}

export const emergencyEngine = new EmergencyEngine();
