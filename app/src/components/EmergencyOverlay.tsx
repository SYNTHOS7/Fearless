import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';

interface EmergencyOverlayProps {
  state: 'IDLE' | 'PRE_ALERT' | 'EMERGENCY' | 'CANCELLED';
  countdown: number;
  onCancel: () => void;
  onForce: () => void;
}

export default function EmergencyOverlay({ state, countdown, onCancel, onForce }: EmergencyOverlayProps) {
  if (state === 'IDLE') return null;

  return (
    <Modal visible={true} transparent={true} animationType="fade">
      <View style={[styles.container, state === 'EMERGENCY' ? styles.bgEmergency : styles.bgPreAlert]}>
        
        {state === 'PRE_ALERT' && (
          <>
            <Text style={styles.title}>ARE YOU OK?</Text>
            <Text style={styles.subtitle}>Emergency protocol initiating in</Text>
            <Text style={styles.countdown}>{countdown}</Text>

            <TouchableOpacity style={styles.btnCancel} onPress={onCancel}>
              <Text style={styles.btnCancelText}>I'M SAFE</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnForce} onPress={onForce}>
              <Text style={styles.btnForceText}>HELP ME NOW</Text>
            </TouchableOpacity>
          </>
        )}

        {state === 'EMERGENCY' && (
          <>
            <Text style={styles.title}>EMERGENCY ALERT SENT</Text>
            <Text style={styles.subtitle}>Notifying contacts and broadcasting location.</Text>
            
            <TouchableOpacity style={styles.btnCancel} onPress={onCancel}>
              <Text style={styles.btnCancelText}>CANCEL ALERT</Text>
            </TouchableOpacity>
          </>
        )}

        {state === 'CANCELLED' && (
          <>
            <Text style={styles.title}>ALERT CANCELLED</Text>
            <Text style={styles.subtitle}>Your contacts have been updated.</Text>
          </>
        )}

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  bgPreAlert: {
    backgroundColor: 'rgba(255, 69, 58, 0.95)',
  },
  bgEmergency: {
    backgroundColor: 'rgba(255, 0, 0, 1)',
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    opacity: 0.9,
  },
  countdown: {
    color: '#fff',
    fontSize: 100,
    fontWeight: 'bold',
    marginBottom: 60,
  },
  btnCancel: {
    backgroundColor: '#fff',
    width: '100%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  btnCancelText: {
    color: '#FF453A',
    fontSize: 20,
    fontWeight: 'bold',
  },
  btnForce: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#fff',
    width: '100%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnForceText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  }
});
