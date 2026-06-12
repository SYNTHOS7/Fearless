/**
 * Fearless App — Location Service
 * =================================
 * Handles GPS location permissions and retrieval using expo-location.
 * Returns high-accuracy coordinates and a pre-formatted Google Maps URL.
 */

import * as Location from 'expo-location';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LocationResult {
  latitude: number;
  longitude: number;
  /** Pre-formatted Google Maps URL for embedding in SMS */
  mapsUrl: string;
  /** Horizontal accuracy in metres (if available) */
  accuracy: number | null;
  /** ISO 8601 timestamp of the fix */
  timestamp: string;
}

// ─── Location Service ─────────────────────────────────────────────────────────

class LocationService {
  private permissionGranted = false;

  /**
   * Request foreground location permission from the user.
   * @returns `true` if permission was granted.
   */
  async requestPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      this.permissionGranted = status === 'granted';
      return this.permissionGranted;
    } catch (error) {
      console.warn('[LocationService] Permission request failed:', error);
      return false;
    }
  }

  /**
   * Check whether foreground location permission is already granted.
   */
  async hasPermission(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      this.permissionGranted = status === 'granted';
      return this.permissionGranted;
    } catch {
      return false;
    }
  }

  /**
   * Get the device's current location with high accuracy.
   * Automatically requests permission if not yet granted.
   *
   * @returns LocationResult or `null` if location is unavailable.
   */
  async getCurrentLocation(): Promise<LocationResult | null> {
    try {
      // Ensure we have permission
      if (!this.permissionGranted) {
        const granted = await this.requestPermission();
        if (!granted) {
          console.warn('[LocationService] Location permission denied');
          return null;
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude, accuracy } = location.coords;
      const mapsUrl = this.formatMapsUrl(latitude, longitude);

      return {
        latitude,
        longitude,
        mapsUrl,
        accuracy: accuracy ?? null,
        timestamp: new Date(location.timestamp).toISOString(),
      };
    } catch (error) {
      console.error('[LocationService] Failed to get location:', error);
      return null;
    }
  }

  /**
   * Format a latitude/longitude pair as a Google Maps URL.
   * The URL opens directly in Google Maps on mobile.
   */
  formatMapsUrl(latitude: number, longitude: number): string {
    return `https://maps.google.com/?q=${latitude},${longitude}`;
  }

  /**
   * Get last known location (faster, lower accuracy).
   * Useful as a fallback when high-accuracy GPS takes too long.
   */
  async getLastKnownLocation(): Promise<LocationResult | null> {
    try {
      if (!this.permissionGranted) {
        const granted = await this.requestPermission();
        if (!granted) return null;
      }

      const location = await Location.getLastKnownPositionAsync();
      if (!location) return null;

      const { latitude, longitude, accuracy } = location.coords;

      return {
        latitude,
        longitude,
        mapsUrl: this.formatMapsUrl(latitude, longitude),
        accuracy: accuracy ?? null,
        timestamp: new Date(location.timestamp).toISOString(),
      };
    } catch (error) {
      console.error('[LocationService] Last known location failed:', error);
      return null;
    }
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

const locationService = new LocationService();
export default locationService;
