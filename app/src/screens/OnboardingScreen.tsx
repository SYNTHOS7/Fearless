import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function OnboardingScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to SafeBand</Text>
      <Text style={styles.subtitle}>Let's get your emergency system set up.</Text>

      <View style={styles.steps}>
        <Text style={styles.step}>1. Allow Bluetooth permissions</Text>
        <Text style={styles.step}>2. Pair your SafeBand</Text>
        <Text style={styles.step}>3. Allow Location permissions</Text>
        <Text style={styles.step}>4. Add an Emergency Contact</Text>
      </View>

      <TouchableOpacity 
        style={styles.btn} 
        onPress={() => navigation.replace('Main')}
      >
        <Text style={styles.btnText}>Start Setup (Mock)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 30,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    color: '#8E8E93',
    fontSize: 18,
    marginBottom: 40,
  },
  steps: {
    backgroundColor: '#1C1C1E',
    padding: 20,
    borderRadius: 12,
    marginBottom: 40,
  },
  step: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 15,
  },
  btn: {
    backgroundColor: '#32D74B',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
