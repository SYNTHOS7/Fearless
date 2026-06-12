import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function GraphsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Sensor Graphs</Text>
      <View style={styles.graphPlaceholder}>
        <Text style={styles.placeholderText}>Live Sensor Data Visualization</Text>
        <Text style={styles.placeholderSub}>Connect SafeBand to stream 25Hz telemetry</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White background
    padding: 20,
  },
  header: {
    color: '#800000', // Maroon
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 20,
  },
  graphPlaceholder: {
    flex: 1,
    backgroundColor: '#FFF9C4', // Soft Yellow
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: '#EAE0A0'
  },
  placeholderText: {
    color: '#800000', // Maroon
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  placeholderSub: {
    color: '#800000',
    fontSize: 14,
    textAlign: 'center',
  }
});
