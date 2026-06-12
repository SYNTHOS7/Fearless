import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AudioModule } from 'expo-audio';

import { useAppContext } from '../context/AppContext';
import locationService from '../services/LocationService';
import GlassCard from '../components/GlassCard';
import { COLORS } from '../utils/constants';
import type { BleDevice } from '../types';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const {
    startScan,
    stopScan,
    discoveredDevices,
    connectionStatus,
    connectDevice,
    addContact,
    settings,
    updateSettings,
  } = useAppContext();

  // Wizard Steps: 1 = Intro/Permissions, 2 = Pair Bracelet, 3 = First Contact
  const [step, setStep] = useState(1);
  const [permissionsApproved, setPermissionsApproved] = useState(false);
  const [pairingDevice, setPairingDevice] = useState<string | null>(null);

  // Form State for first contact
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelationship, setContactRelationship] = useState('Partner');

  // Request all permissions
  const requestAppPermissions = async () => {
    try {
      const locationGranted = await locationService.requestPermission();
      const audioResult = await AudioModule.requestRecordingPermissionsAsync();
      
      // SMS and BLE permissions are handled by expo packages natively upon use,
      // but triggering pre-check ensures smooth operations.
      
      if (locationGranted && audioResult.granted) {
        setPermissionsApproved(true);
        setStep(2);
      } else {
        Alert.alert(
          'Permissions Required',
          'Location and Audio permissions are required to detect danger and fetch coordinates during emergencies. Please enable them in your settings.',
          [
            { text: 'Try Again', onPress: requestAppPermissions },
            { 
              text: 'Use Demo Mode Only', 
              onPress: async () => {
                await updateSettings({ demoMode: true });
                setPermissionsApproved(true);
                setStep(2);
              }
            }
          ]
        );
      }
    } catch (e) {
      console.warn('[Onboarding] Error requesting permissions:', e);
      // Fallback for environment constraints
      setStep(2);
    }
  };

  // Start BLE Scan on entering step 2
  useEffect(() => {
    if (step === 2) {
      startScan().catch(err => console.log('Scan start failed:', err));
      return () => {
        stopScan();
      };
    }
  }, [step]);

  // If connection succeeds, move to step 3
  useEffect(() => {
    if (step === 2 && connectionStatus === 'connected' && pairingDevice) {
      setPairingDevice(null);
      setStep(3);
    }
  }, [connectionStatus, pairingDevice, step]);

  const handleDeviceSelect = async (device: BleDevice) => {
    setPairingDevice(device.id);
    try {
      await connectDevice(device.id, device.name);
    } catch (e: any) {
      setPairingDevice(null);
      Alert.alert('Connection Failed', e?.message || 'Please check your bluetooth settings and try again.');
    }
  };

  const handleSkipPairing = async () => {
    stopScan();
    // Enable demo mode if skip pairing is tapped
    await updateSettings({ demoMode: true });
    setStep(3);
  };

  const handleContactSave = async () => {
    if (!contactName.trim()) {
      Alert.alert('Validation Error', 'Please enter your contact\'s name.');
      return;
    }

    const phoneRegex = /^\+?[0-9\s-]{7,15}$/;
    if (!contactPhone.trim() || !phoneRegex.test(contactPhone.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid phone number.');
      return;
    }

    try {
      await addContact({
        name: contactName.trim(),
        phone: contactPhone.trim(),
        relationship: contactRelationship,
      });

      // Complete Onboarding
      onComplete();
    } catch (e: any) {
      Alert.alert('Setup Error', e?.message || 'Could not save contact.');
    }
  };

  // ─── Rendering Step 1 ──────────────────────────────────────────────────────
  
  const renderStep1 = () => (
    <View style={styles.cardContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="shield-half" size={64} color={COLORS.primary} />
      </View>
      <Text style={styles.stepTitle}>Welcome to Fearless</Text>
      <Text style={styles.stepDesc}>
        Project Fearless uses an AI safety bracelet to detect physical struggle or attacks and automatically pre-fills emergency messages for your contacts.
      </Text>
      
      <GlassCard style={styles.permissionCard}>
        <View style={styles.permissionItem}>
          <Ionicons name="location-outline" size={20} color={COLORS.primaryLight} />
          <View style={styles.permissionDetails}>
            <Text style={styles.permissionName}>GPS Location</Text>
            <Text style={styles.permissionDesc}>Share your maps link with emergency contacts.</Text>
          </View>
        </View>
        <View style={styles.permissionItem}>
          <Ionicons name="mic-outline" size={20} color={COLORS.primaryLight} />
          <View style={styles.permissionDetails}>
            <Text style={styles.permissionName}>Audio Monitoring</Text>
            <Text style={styles.permissionDesc}>Confirm screams or distress signals from your phone.</Text>
          </View>
        </View>
      </GlassCard>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={requestAppPermissions}
        activeOpacity={0.7}
      >
        <Text style={styles.actionButtonText}>Get Started</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  // ─── Rendering Step 2 ──────────────────────────────────────────────────────

  const renderStep2 = () => (
    <View style={styles.cardContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="bluetooth" size={64} color={COLORS.primary} />
      </View>
      <Text style={styles.stepTitle}>Pair Your Bracelet</Text>
      <Text style={styles.stepDesc}>
        Turn on your Fearless bracelet. We are scanning for bluetooth devices nearby.
      </Text>

      <View style={styles.deviceListWrapper}>
        <Text style={styles.listLabel}>DISCOVERED DEVICES</Text>
        {discoveredDevices.length === 0 ? (
          <View style={styles.scanningBox}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.scanningText}>Searching for Fearless bands...</Text>
          </View>
        ) : (
          <ScrollView style={styles.devicesScroll} nestedScrollEnabled>
            {discoveredDevices.map((device) => {
              const isConnecting = pairingDevice === device.id;
              return (
                <TouchableOpacity
                  key={device.id}
                  style={styles.deviceRow}
                  onPress={() => handleDeviceSelect(device)}
                  disabled={pairingDevice !== null}
                  activeOpacity={0.7}
                >
                  <View style={styles.deviceRowLeft}>
                    <Ionicons name="watch-outline" size={20} color={COLORS.white} />
                    <Text style={styles.deviceRowName}>{device.name}</Text>
                  </View>
                  {isConnecting ? (
                    <ActivityIndicator size="small" color={COLORS.primaryLight} />
                  ) : (
                    <View style={styles.deviceRowRight}>
                      <Ionicons name="wifi" size={16} color={COLORS.safe} />
                      <Text style={styles.deviceRssi}>{device.rssi} dBm</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={handleSkipPairing}
        activeOpacity={0.7}
      >
        <Text style={styles.secondaryButtonText}>Skip & Use Simulation Mode</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Rendering Step 3 ──────────────────────────────────────────────────────

  const renderStep3 = () => (
    <View style={styles.cardContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="person-add" size={64} color={COLORS.primary} />
      </View>
      <Text style={styles.stepTitle}>Add Emergency Contact</Text>
      <Text style={styles.stepDesc}>
        Add one trusted contact (mom, partner, friend) to pre-fill emergency SMS messages.
      </Text>

      <View style={styles.formContainer}>
        {/* Contact Name */}
        <View style={styles.onboardInputGroup}>
          <Text style={styles.onboardInputLabel}>Full Name</Text>
          <TextInput
            style={styles.onboardInput}
            placeholder="e.g. John Doe"
            placeholderTextColor={COLORS.textMuted}
            value={contactName}
            onChangeText={setContactName}
            autoCorrect={false}
          />
        </View>

        {/* Contact Phone */}
        <View style={styles.onboardInputGroup}>
          <Text style={styles.onboardInputLabel}>Phone Number</Text>
          <TextInput
            style={styles.onboardInput}
            placeholder="e.g. +1234567890"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
            value={contactPhone}
            onChangeText={setContactPhone}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Relationship Picker */}
        <View style={styles.onboardInputGroup}>
          <Text style={styles.onboardInputLabel}>Relationship</Text>
          <View style={styles.chipsRow}>
            {['Partner', 'Mom', 'Dad', 'Friend'].map((rel) => {
              const active = contactRelationship === rel;
              return (
                <TouchableOpacity
                  key={rel}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setRelationship(rel)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {rel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleContactSave}
        activeOpacity={0.7}
      >
        <Text style={styles.actionButtonText}>Finish Setup</Text>
        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  const setRelationship = (rel: string) => {
    setContactRelationship(rel);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollWrapper}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step Indicator */}
        <View style={styles.dotsRow}>
          <View style={[styles.dot, step >= 1 && styles.dotActive]} />
          <View style={[styles.dot, step >= 2 && styles.dotActive]} />
          <View style={[styles.dot, step >= 3 && styles.dotActive]} />
        </View>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollWrapper: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 20,
  },

  // Main Card Details
  cardContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(108, 92, 231, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.15)',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 12,
  },
  stepDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 10,
  },

  // Step 1 Permissions Card
  permissionCard: {
    width: '100%',
    marginBottom: 36,
    gap: 16,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  permissionDetails: {
    flex: 1,
  },
  permissionName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  permissionDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Wizard Action Buttons
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },

  // Step 2 Device Scanning
  deviceListWrapper: {
    width: '100%',
    marginBottom: 24,
  },
  listLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  scanningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 20,
  },
  scanningText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  devicesScroll: {
    maxHeight: 180,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 6,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(42, 42, 58, 0.4)',
  },
  deviceRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deviceRowName: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  deviceRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deviceRssi: {
    color: COLORS.textMuted,
    fontSize: 11,
  },

  // Step 3 Form Setup
  formContainer: {
    width: '100%',
    marginBottom: 36,
  },
  onboardInputGroup: {
    marginBottom: 20,
  },
  onboardInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  onboardInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.white,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.primaryLight,
  },
});

export default OnboardingScreen;
