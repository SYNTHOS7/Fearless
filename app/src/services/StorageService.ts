/**
 * Fearless App — Storage Service
 * ================================
 * Persistence layer using @react-native-async-storage/async-storage.
 * Handles save/load of emergency contacts, app settings, and alert history.
 *
 * All data is JSON-serialised and stored under well-known keys.
 * Default values are returned when no persisted data exists yet.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Contact, Settings, AlertEvent } from '../types';
import { DEFAULT_SETTINGS } from '../utils/constants';

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  CONTACTS: '@fearless/contacts',
  SETTINGS: '@fearless/settings',
  ALERT_HISTORY: '@fearless/alert_history',
} as const;

// ─── Storage Service ──────────────────────────────────────────────────────────

class StorageService {
  // ─── Contacts ──────────────────────────────────────────────────────────

  /**
   * Load saved emergency contacts.
   * @returns Array of contacts (empty if none saved).
   */
  async getContacts(): Promise<Contact[]> {
    try {
      const json = await AsyncStorage.getItem(KEYS.CONTACTS);
      if (!json) return [];
      return JSON.parse(json) as Contact[];
    } catch (error) {
      console.error('[StorageService] Failed to load contacts:', error);
      return [];
    }
  }

  /**
   * Save the full contacts array, replacing any previous data.
   */
  async saveContacts(contacts: Contact[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.CONTACTS, JSON.stringify(contacts));
    } catch (error) {
      console.error('[StorageService] Failed to save contacts:', error);
    }
  }

  /**
   * Add a single contact and persist.
   */
  async addContact(contact: Contact): Promise<Contact[]> {
    const contacts = await this.getContacts();
    contacts.push(contact);
    await this.saveContacts(contacts);
    return contacts;
  }

  /**
   * Remove a contact by ID and persist.
   */
  async removeContact(contactId: string): Promise<Contact[]> {
    let contacts = await this.getContacts();
    contacts = contacts.filter((c) => c.id !== contactId);
    await this.saveContacts(contacts);
    return contacts;
  }

  /**
   * Update an existing contact (matched by ID) and persist.
   */
  async updateContact(updated: Contact): Promise<Contact[]> {
    const contacts = await this.getContacts();
    const index = contacts.findIndex((c) => c.id === updated.id);
    if (index !== -1) {
      contacts[index] = updated;
      await this.saveContacts(contacts);
    }
    return contacts;
  }

  // ─── Settings ──────────────────────────────────────────────────────────

  /**
   * Load saved settings.
   * @returns Merged settings (saved values override defaults).
   */
  async getSettings(): Promise<Settings> {
    try {
      const json = await AsyncStorage.getItem(KEYS.SETTINGS);
      if (!json) return { ...DEFAULT_SETTINGS };

      const saved = JSON.parse(json) as Partial<Settings>;
      // Merge with defaults so new settings keys are always present
      return { ...DEFAULT_SETTINGS, ...saved };
    } catch (error) {
      console.error('[StorageService] Failed to load settings:', error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Save the full settings object, replacing any previous data.
   */
  async saveSettings(settings: Settings): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('[StorageService] Failed to save settings:', error);
    }
  }

  /**
   * Update a subset of settings (partial merge) and persist.
   */
  async updateSettings(partial: Partial<Settings>): Promise<Settings> {
    const current = await this.getSettings();
    const updated: Settings = { ...current, ...partial };
    await this.saveSettings(updated);
    return updated;
  }

  // ─── Alert History ─────────────────────────────────────────────────────

  /**
   * Load the alert history.
   * @returns Array of past alert events, newest first.
   */
  async getAlertHistory(): Promise<AlertEvent[]> {
    try {
      const json = await AsyncStorage.getItem(KEYS.ALERT_HISTORY);
      if (!json) return [];
      return JSON.parse(json) as AlertEvent[];
    } catch (error) {
      console.error('[StorageService] Failed to load alert history:', error);
      return [];
    }
  }

  /**
   * Save the full alert history, replacing any previous data.
   */
  async saveAlertHistory(history: AlertEvent[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        KEYS.ALERT_HISTORY,
        JSON.stringify(history),
      );
    } catch (error) {
      console.error('[StorageService] Failed to save alert history:', error);
    }
  }

  /**
   * Append a new alert event to history and persist.
   * Keeps a maximum of 100 events (FIFO).
   */
  async addAlertEvent(event: AlertEvent): Promise<AlertEvent[]> {
    const history = await this.getAlertHistory();
    history.unshift(event); // newest first

    // Cap at 100 events
    if (history.length > 100) {
      history.length = 100;
    }

    await this.saveAlertHistory(history);
    return history;
  }

  /**
   * Mark an alert as dismissed in the history.
   */
  async dismissAlert(alertId: string): Promise<AlertEvent[]> {
    const history = await this.getAlertHistory();
    const event = history.find((e) => e.id === alertId);
    if (event) {
      event.dismissed = true;
      await this.saveAlertHistory(history);
    }
    return history;
  }

  /**
   * Clear all alert history.
   */
  async clearAlertHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.ALERT_HISTORY);
    } catch (error) {
      console.error('[StorageService] Failed to clear alert history:', error);
    }
  }

  // ─── Utility ───────────────────────────────────────────────────────────

  /**
   * Clear ALL Fearless app data from AsyncStorage.
   * Use with caution — this is a factory reset.
   */
  async clearAll(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(KEYS.CONTACTS),
        AsyncStorage.removeItem(KEYS.SETTINGS),
        AsyncStorage.removeItem(KEYS.ALERT_HISTORY),
      ]);
    } catch (error) {
      console.error('[StorageService] Failed to clear all data:', error);
    }
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

const storageService = new StorageService();
export default storageService;
