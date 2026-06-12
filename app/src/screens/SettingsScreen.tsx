import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppContext } from '../context/AppContext';
import GlassCard from '../components/GlassCard';
import BatteryIndicator from '../components/BatteryIndicator';
import ConnectionBadge from '../components/ConnectionBadge';
import { COLORS, SENSITIVITY_LABELS } from '../utils/constants';
import type { SensitivityLevel, CountdownDuration } from '../types';

const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    settings,
    updateSettings,
    connectionStatus,
    pairedDevice,
    batteryLevel,
    disconnectDevice,
    clearHistory,
  } = useAppContext();

  // Handles sensitivity changes
  const handleSensitivityChange = async (level: SensitivityLevel) => {
    try {
      await updateSettings({ sensitivity: level });
    } catch (e: any) {
      Alert.alert('Config Error', 'Failed to update sensitivity on the device.');
    }
  };

  // Handles countdown duration updates
  const handleCountdownChange = async (duration: CountdownDuration) => {
    await updateSettings({ alertCountdown: duration });
  };

  // Handles toggle changes
  const handleToggleContext = async (val: boolean) => {
    await updateSettings({ contextVerification: val });
  };

  const handleToggleAudio = async (val: boolean) => {
    await updateSettings({ audioVerification: val });
  };

  const handleToggleDemoMode = async (val: boolean) => {
    await updateSettings({ demoMode: val });
  };

  // Confirm and perform unpairing
  const handleUnpair = () => {
    Alert.alert(
      'Unpair Bracelet',
      'Are you sure you want to disconnect and unpair the Fearless bracelet?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpair',
          style: 'destructive',
          onPress: async () => {
            await disconnectDevice();
          },
        },
      ]
    );
  };

  // Confirm clearing alert logs
  const handleClearLogs = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all alert history logs? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Configure safety limits and bracelet</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Device Pairing Panel ───────────────────── */}
        <Text style={styles.sectionTitle}>WEARABLE DEVICE</Text>
        {connectionStatus === 'connected' || pairedDevice ? (
          <GlassCard style={styles.deviceCard}>
            <View style={styles.deviceInfoRow}>
              <View style={styles.deviceIconBg}>
                <Ionicons name="watch" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.deviceDetails}>
                <Text style={styles.deviceName}>
                  {pairedDevice?.name || 'Fearless Bracelet'}
                </Text>
                <Text style={styles.deviceMac}>
                  ID: {pairedDevice?.id || 'demo-device-001'}
                </Text>
              </View>
              {connectionStatus === 'connected' && (
                <BatteryIndicator level={batteryLevel} />
              )}
            </View>

            <View style={styles.deviceDivider} />

            <View style={styles.statusBadgeRow}>
              <ConnectionBadge status={connectionStatus} />
              <TouchableOpacity
                style={styles.unpairButton}
                onPress={handleUnpair}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                <Text style={styles.unpairText}>Unpair</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        ) : (
          <GlassCard style={styles.noDeviceCard}>
            <Ionicons name="bluetooth-outline" size={28} color={COLORS.textMuted} />
            <Text style={styles.noDeviceTitle}>No Device Paired</Text>
            <Text style={styles.noDeviceText}>
              Pair a Fearless safety bracelet to enable hardware struggle detection and buzz feedback.
            </Text>
          </GlassCard>
        )}

        {/* ─── AI Detection Sensitivity ────────────────── */}
        <Text style={styles.sectionTitle}>AI SENSITIVITY</Text>
        <GlassCard style={styles.settingGroupCard}>
          <Text style={styles.settingLabel}>Bracelet Struggle Detection</Text>
          <Text style={styles.settingDesc}>
            Lower sensitivity prevents false alarms during physical activity (running/gym), while higher sensitivity triggers alarms with lighter movements.
          </Text>

          <View style={styles.selectorGrid}>
            {([1, 2, 3] as SensitivityLevel[]).map((level) => {
              const isSelected = settings.sensitivity === level;
              return (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.selectorButton,
                    isSelected && styles.selectorButtonActive,
                  ]}
                  onPress={() => handleSensitivityChange(level)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.selectorText,
                      isSelected && styles.selectorTextActive,
                    ]}
                  >
                    {SENSITIVITY_LABELS[level]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassCard>

        {/* ─── Phone Verification Settings ──────────────── */}
        <Text style={styles.sectionTitle}>PHONE-SIDE CROSS-CHECK</Text>
        <GlassCard style={styles.settingGroupCard}>
          {/* Motion Verification */}
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchTitle}>Verify Phone Acceleration</Text>
              <Text style={styles.switchDesc}>
                Cross-check with phone's accelerometer. Tethers alarm only if phone also undergoes shaking or impact.
              </Text>
            </View>
            <Switch
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
              value={settings.contextVerification}
              onValueChange={handleToggleContext}
            />
          </View>

          <View style={styles.settingDivider} />

          {/* Audio Verification */}
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchTitle}>Analyze Distress Audio</Text>
              <Text style={styles.switchDesc}>
                Scan ambient microphone levels during a struggle alert. Confirms emergency if distress screaming or crashing is detected.
              </Text>
            </View>
            <Switch
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
              value={settings.audioVerification}
              onValueChange={handleToggleAudio}
            />
          </View>
        </GlassCard>

        {/* ─── Alarm Delay Countdown ─────────────────── */}
        <Text style={styles.sectionTitle}>ALARM DELAY COUNTDOWN</Text>
        <GlassCard style={styles.settingGroupCard}>
          <Text style={styles.settingLabel}>Countdown Window</Text>
          <Text style={styles.settingDesc}>
            Time given to cancel an alert on the app screen before emergency contacts are notified.
          </Text>

          <View style={styles.selectorGrid}>
            {([5, 10, 15] as CountdownDuration[]).map((dur) => {
              const isSelected = settings.alertCountdown === dur;
              return (
                <TouchableOpacity
                  key={dur}
                  style={[
                    styles.selectorButton,
                    isSelected && styles.selectorButtonActive,
                  ]}
                  onPress={() => handleCountdownChange(dur)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.selectorText,
                      isSelected && styles.selectorTextActive,
                    ]}
                  >
                    {dur}s
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassCard>

        {/* ─── Development & Demos ─────────────────────── */}
        <Text style={styles.sectionTitle}>DEMO & SYSTEM LOGS</Text>
        <GlassCard style={styles.settingGroupCard}>
          {/* Demo Mode Toggle */}
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchTitle}>BLE Simulation Mode</Text>
              <Text style={styles.switchDesc}>
                Generates mock wrist movements, struggle events, and battery logs. Run without the physical bracelet.
              </Text>
            </View>
            <Switch
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
              value={settings.demoMode}
              onValueChange={handleToggleDemoMode}
            />
          </View>

          <View style={styles.settingDivider} />

          {/* Clear Log Button */}
          <TouchableOpacity
            style={styles.actionRowButton}
            onPress={handleClearLogs}
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.actionRowTitle}>Wipe Emergency History</Text>
              <Text style={styles.actionRowDesc}>
                Clears all previous SOS triggers and activity history logs.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </GlassCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginTop: 24,
    marginBottom: 10,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
  },

  // Paired Device Panel
  deviceCard: {
    marginBottom: 8,
  },
  deviceInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deviceIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  deviceMac: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  deviceDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unpairButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(225, 112, 85, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  unpairText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '600',
  },

  // Unpaired State Card
  noDeviceCard: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDeviceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 12,
    marginBottom: 6,
  },
  noDeviceText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },

  // General Settings Card Styling
  settingGroupCard: {
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 6,
  },
  settingDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  settingDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },

  // Selection Pill Grid
  selectorGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  selectorButtonActive: {
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    borderColor: COLORS.primary,
  },
  selectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  selectorTextActive: {
    color: COLORS.primaryLight,
    fontWeight: '700',
  },

  // Toggle Switch Row
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  switchDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },

  // Action / Clickable Settings Item
  actionRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionRowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.danger,
    marginBottom: 4,
  },
  actionRowDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
});

export default SettingsScreen;
