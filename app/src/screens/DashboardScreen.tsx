import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { emergencyEngine } from '../services/EmergencyEngine';
import { dbService } from '../services/DatabaseService';
import EmergencyOverlay from '../components/EmergencyOverlay';

export default function DashboardScreen() {
  const [threatLevel, setThreatLevel] = useState('NORMAL');
  const [deviceStatus, setDeviceStatus] = useState('Connected');
  const [emergencyState, setEmergencyState] = useState<'IDLE' | 'PRE_ALERT' | 'EMERGENCY' | 'CANCELLED'>('IDLE');
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    emergencyEngine.setOnStateChange((state, remaining) => {
      setEmergencyState(state);
      if (remaining !== undefined) setCountdown(remaining);
    });
  }, []);

  const simulateAlert = () => {
    emergencyEngine.triggerPreAlert(Date.now());
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusCard}>
        <Ionicons name="bluetooth" size={24} color="#800000" />
        <Text style={styles.statusText}>SafeBand: {deviceStatus}</Text>
      </View>

      <View style={styles.threatCard}>
        <Text style={styles.threatTitle}>Current Status</Text>
        <Text style={[styles.threatLevel, { color: threatLevel === 'NORMAL' ? '#32D74B' : '#FF0000' }]}>
          {threatLevel}
        </Text>
      </View>

      <TouchableOpacity onPress={simulateAlert}>
        <LinearGradient
          colors={['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.testButton}
        >
          <Text style={styles.testButtonText}>Simulate Emergency</Text>
        </LinearGradient>
      </TouchableOpacity>

      {emergencyState !== 'IDLE' && (
        <EmergencyOverlay 
          state={emergencyState} 
          countdown={countdown} 
          onCancel={() => emergencyEngine.cancelAlert(Date.now())}
          onForce={() => emergencyEngine.forceEmergency(Date.now())}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White background
    padding: 20,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9C4', // Soft Yellow card
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EAE0A0'
  },
  statusText: {
    color: '#800000', // Maroon text
    fontSize: 18,
    marginLeft: 10,
    fontWeight: '600'
  },
  threatCard: {
    backgroundColor: '#FFF9C4', // Yellow card
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#EAE0A0'
  },
  threatTitle: {
    color: '#800000', // Maroon
    fontSize: 18,
    marginBottom: 10,
    fontWeight: 'bold'
  },
  threatLevel: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  testButton: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#FFFFFF', // White text on Rainbow gradient
    fontSize: 18,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  }
});
