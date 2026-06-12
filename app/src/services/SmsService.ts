/**
 * Fearless App — SMS Service
 * ============================
 * Composes and opens the native SMS composer with a pre-filled emergency
 * message and location link, targeting one or more emergency contacts.
 * Uses expo-sms for cross-platform SMS support (Android primary).
 */

import * as SMS from 'expo-sms';

import type { Contact } from '../types';
import { buildEmergencyMessage } from '../utils/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SmsResult {
  /** Whether the SMS composer was successfully opened */
  success: boolean;
  /** Human-readable result description */
  message: string;
}

// ─── SMS Service ──────────────────────────────────────────────────────────────

class SmsService {
  /**
   * Check whether the device supports SMS sending.
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await SMS.isAvailableAsync();
    } catch {
      return false;
    }
  }

  /**
   * Open the SMS composer pre-filled with an emergency message
   * addressed to a single contact.
   *
   * @param contact   The emergency contact to message.
   * @param mapsUrl   Google Maps URL with the user's current location.
   */
  async sendToContact(contact: Contact, mapsUrl: string): Promise<SmsResult> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        return {
          success: false,
          message: 'SMS is not available on this device',
        };
      }

      const body = buildEmergencyMessage(
        contact.name,
        mapsUrl,
        contact.customMessage,
      );

      const { result } = await SMS.sendSMSAsync([contact.phone], body);

      return {
        success: result === 'sent' || result === 'unknown',
        message:
          result === 'sent'
            ? `Emergency SMS sent to ${contact.name}`
            : result === 'cancelled'
              ? `SMS to ${contact.name} was cancelled`
              : `SMS composer opened for ${contact.name}`,
      };
    } catch (error: any) {
      console.error('[SmsService] sendToContact failed:', error);
      return {
        success: false,
        message: `Failed to send SMS to ${contact.name}: ${error?.message ?? 'Unknown error'}`,
      };
    }
  }

  /**
   * Open the SMS composer pre-filled with an emergency message
   * addressed to ALL provided contacts at once.
   *
   * The message is generic (uses "Emergency Contact" instead of a
   * specific name) so it works for multiple recipients.
   *
   * @param contacts  Array of emergency contacts.
   * @param mapsUrl   Google Maps URL with the user's current location.
   */
  async sendToAllContacts(
    contacts: Contact[],
    mapsUrl: string,
  ): Promise<SmsResult> {
    if (contacts.length === 0) {
      return {
        success: false,
        message: 'No emergency contacts configured',
      };
    }

    try {
      const available = await this.isAvailable();
      if (!available) {
        return {
          success: false,
          message: 'SMS is not available on this device',
        };
      }

      const phoneNumbers = contacts.map((c) => c.phone);

      // Use a generic salutation for multi-recipient messages
      const body = buildEmergencyMessage('Emergency Contact', mapsUrl);

      const { result } = await SMS.sendSMSAsync(phoneNumbers, body);

      return {
        success: result === 'sent' || result === 'unknown',
        message:
          result === 'sent'
            ? `Emergency SMS sent to ${contacts.length} contact(s)`
            : result === 'cancelled'
              ? 'Emergency SMS was cancelled'
              : `SMS composer opened for ${contacts.length} contact(s)`,
      };
    } catch (error: any) {
      console.error('[SmsService] sendToAllContacts failed:', error);
      return {
        success: false,
        message: `Failed to send emergency SMS: ${error?.message ?? 'Unknown error'}`,
      };
    }
  }

  /**
   * Send individual, personalised SMS messages to each contact.
   * Opens the SMS composer sequentially for each contact.
   * Useful when custom messages differ per contact.
   *
   * @param contacts  Array of emergency contacts.
   * @param mapsUrl   Google Maps URL with the user's current location.
   * @returns Array of results, one per contact.
   */
  async sendIndividualMessages(
    contacts: Contact[],
    mapsUrl: string,
  ): Promise<SmsResult[]> {
    const results: SmsResult[] = [];

    for (const contact of contacts) {
      const result = await this.sendToContact(contact, mapsUrl);
      results.push(result);
    }

    return results;
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

const smsService = new SmsService();
export default smsService;
