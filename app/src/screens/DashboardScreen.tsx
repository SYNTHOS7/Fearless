import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
        <Ionicons name="bluetooth" size={24} color="#32D74B" />
        <Text style={styles.statusText}>SafeBand: {deviceStatus}</Text>
      </View>

      <View style={styles.threatCard}>
        <Text style={styles.threatTitle}>Current Status</Text>
        <Text style={[styles.threatLevel, { color: threatLevel === 'NORMAL' ? '#32D74B' : '#FF453A' }]}>
          {threatLevel}
        </Text>
      </View>

      <TouchableOpacity style={styles.testButton} onPress={simulateAlert}>
        <Text style={styles.testButtonText}>Simulate Emergency</Text>
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
    backgroundColor: '#000',
    padding: 20,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 10,
  },
  threatCard: {
    backgroundColor: '#1C1C1E',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
  },
  threatTitle: {
    color: '#8E8E93',
    fontSize: 16,
    marginBottom: 10,
  },
  threatLevel: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});
