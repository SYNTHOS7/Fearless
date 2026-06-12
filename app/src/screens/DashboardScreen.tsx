import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  StatusBar,
  Animated,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppContext } from '../context/AppContext';
import RiskMeter from '../components/RiskMeter';
import SosButton from '../components/SosButton';
import ConnectionBadge from '../components/ConnectionBadge';
import BatteryIndicator from '../components/BatteryIndicator';
import GlassCard from '../components/GlassCard';
import AlertCountdown from '../components/AlertCountdown';
import { COLORS, STATUS_LABELS } from '../utils/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    connectionStatus,
    pairedDevice,
    batteryLevel,
    riskLevel,
    riskStatus,
    lastStruggleStatus,
    settings,
    alertState,
    alertHistory,
    triggerManualSos,
    cancelEmergency,
    confirmEmergency,
  } = useAppContext();

  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fade in on mount
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Format timestamp helper
  const formatTimeAgo = (timestampStr: string) => {
    const now = new Date();
    const date = new Date(timestampStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHrs < 24) return `${diffHrs} hr ago`;
    return date.toLocaleDateString();
  };

  const getStatusDisplay = () => {
    if (connectionStatus !== 'connected') {
      return {
        text: STATUS_LABELS[connectionStatus] || 'Disconnected',
        color: COLORS.textMuted,
        description: 'Connect your bracelet to resume scanning.',
      };
    }

    switch (riskStatus) {
      case 'safe':
        return {
          text: 'All Clear',
          color: COLORS.safe,
          description: 'No threat detected. You are safe.',
        };
      case 'elevated':
        return {
          text: 'Monitoring',
          color: COLORS.elevated,
          description: 'Elevated wrist motion. Monitoring closely.',
        };
      case 'danger':
        return {
          text: '⚠️ ALERT ACTIVE',
          color: COLORS.danger,
          description: 'Struggle pattern confirmed. Triggering emergency.',
        };
      default:
        return {
          text: 'All Clear',
          color: COLORS.safe,
          description: 'No threat detected.',
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  // Get active motion label
  const getMotionLabel = () => {
    if (connectionStatus !== 'connected') return 'Offline';
    if (riskLevel > 70) return 'Erratic / Attack';
    if (riskLevel > 30) return 'High Activity';
    return 'Calm / Resting';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <Animated.View style={[styles.animatedContainer, { opacity: fadeAnim }]}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        >
          {/* ─── Header ───────────────────────────────── */}
          <View style={styles.header}>
            <View>
              <Text style={styles.appTitle}>Fearless</Text>
              <Text style={styles.appSubtitle}>AI Wearable Safety System</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={[
                styles.liveIndicator,
                connectionStatus !== 'connected' && styles.liveIndicatorOffline
              ]}>
                <View style={[
                  styles.liveDot,
                  connectionStatus !== 'connected' && styles.liveDotOffline
                ]} />
                <Text style={[
                  styles.liveText,
                  connectionStatus !== 'connected' && styles.liveTextOffline
                ]}>
                  {connectionStatus === 'connected' ? 'LIVE' : 'OFFLINE'}
                </Text>
              </View>
            </View>
          </View>

          {/* ─── Status Row ───────────────────────────── */}
          <View style={styles.statusRow}>
            <ConnectionBadge
              status={connectionStatus}
              deviceName={pairedDevice?.name}
            />
            <BatteryIndicator level={batteryLevel} />
          </View>

          {/* ─── Risk Meter ───────────────────────────── */}
          <View style={styles.meterSection}>
            <RiskMeter level={riskLevel} status={riskStatus} size={220} />
          </View>

          {/* ─── Status Text ──────────────────────────── */}
          <View style={styles.statusTextSection}>
            <Text style={[styles.statusText, { color: statusDisplay.color }]}>
              {statusDisplay.text}
            </Text>
            <Text style={styles.statusDescription}>
              {statusDisplay.description}
            </Text>
          </View>

          {/* ─── Live Status Card ─────────────────────── */}
          <GlassCard style={styles.liveCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="pulse" size={18} color={COLORS.primaryLight} />
                <Text style={styles.cardTitle}>Live Analytics</Text>
              </View>
              <Text style={styles.cardTime}>
                Sensors: {connectionStatus === 'connected' ? 'Connected' : 'Offline'}
              </Text>
            </View>
            
            <View style={styles.sensorGrid}>
              <View style={styles.sensorItem}>
                <Ionicons name="body" size={20} color={COLORS.primaryLight} />
                <Text style={styles.sensorValue}>
                  {riskLevel}%
                </Text>
                <Text style={styles.sensorLabel}>AI Risk</Text>
              </View>
              <View style={styles.sensorDivider} />
              <View style={styles.sensorItem}>
                <Ionicons name="walk" size={20} color="#00D9FF" />
                <Text style={styles.sensorValue}>
                  {getMotionLabel()}
                </Text>
                <Text style={styles.sensorLabel}>Motion</Text>
              </View>
              <View style={styles.sensorDivider} />
              <View style={styles.sensorItem}>
                <Ionicons name="shield" size={20} color={COLORS.safe} />
                <Text style={styles.sensorValue}>
                  {settings.contextVerification ? 'Active' : 'Muted'}
                </Text>
                <Text style={styles.sensorLabel}>Verification</Text>
              </View>
            </View>
          </GlassCard>

          {/* ─── SOS Button ───────────────────────────── */}
          <View style={styles.sosSection}>
            <SosButton onActivate={triggerManualSos} />
            <Text style={styles.sosHint}>Hold for 2 seconds to trigger manual SOS</Text>
          </View>

          {/* ─── Activity Log ─────────────────────────── */}
          <View style={styles.logSection}>
            <Text style={styles.sectionTitle}>RECENT INCIDENTS</Text>
            {alertHistory.length === 0 ? (
              <GlassCard style={styles.emptyLogCard}>
                <Ionicons name="checkbox-outline" size={22} color={COLORS.textMuted} />
                <Text style={styles.emptyLogText}>No emergency logs recorded</Text>
              </GlassCard>
            ) : (
              alertHistory.slice(0, 5).map((log) => {
                const isManual = log.type === 'manual';
                const isDismissed = log.dismissed;
                return (
                  <GlassCard key={log.id} style={styles.logCard}>
                    <View style={styles.logRow}>
                      <View
                        style={[
                          styles.logIconContainer,
                          {
                            backgroundColor: isDismissed
                              ? 'rgba(0, 184, 148, 0.1)'
                              : 'rgba(225, 112, 85, 0.1)',
                          },
                        ]}
                      >
                        <Ionicons
                          name={isDismissed ? 'shield-checkmark-outline' : 'warning-outline'}
                          size={16}
                          color={isDismissed ? COLORS.safe : COLORS.danger}
                        />
                      </View>
                      <View style={styles.logContent}>
                        <Text style={styles.logMessage}>
                          {isManual ? 'Manual SOS Alert' : 'Struggle Detected'}
                          {isDismissed ? ' (Cancelled)' : ' (SMS Dispatched)'}
                        </Text>
                        <Text style={styles.logTime}>
                          {formatTimeAgo(log.timestamp)}
                        </Text>
                      </View>
                      <Ionicons
                        name={isDismissed ? 'checkmark-circle' : 'alert-circle'}
                        size={18}
                        color={isDismissed ? COLORS.safe : COLORS.danger}
                      />
                    </View>
                  </GlassCard>
                );
              })
            )}
          </View>
        </ScrollView>
      </Animated.View>

      {/* ─── Alert Countdown Overlay ──────────────── */}
      {alertState === 'countdown' && (
        <AlertCountdown
          seconds={settings.alertCountdown}
          onCancel={cancelEmergency}
          onComplete={confirmEmergency}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  animatedContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 184, 148, 0.2)',
  },
  liveIndicatorOffline: {
    backgroundColor: 'rgba(108, 108, 138, 0.1)',
    borderColor: 'rgba(108, 108, 138, 0.2)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.safe,
    marginRight: 6,
  },
  liveDotOffline: {
    backgroundColor: COLORS.textMuted,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.safe,
    letterSpacing: 1.5,
  },
  liveTextOffline: {
    color: COLORS.textMuted,
  },

  // Status Row
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },

  // Meter
  meterSection: {
    alignItems: 'center',
    marginBottom: 16,
  },

  // Status Text
  statusTextSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusText: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statusDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },

  // Live Card
  liveCard: {
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  cardTime: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  sensorGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  sensorItem: {
    alignItems: 'center',
    flex: 1,
  },
  sensorValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 6,
  },
  sensorLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sensorDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(42, 42, 58, 0.5)',
  },

  // SOS
  sosSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  sosHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 12,
  },

  // Log
  logSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  logCard: {
    marginBottom: 8,
    padding: 12,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logContent: {
    flex: 1,
  },
  logMessage: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '500',
  },
  logTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  emptyLogCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyLogText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});

export default DashboardScreen;
