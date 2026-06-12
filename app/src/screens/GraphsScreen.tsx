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
    backgroundColor: '#000',
    padding: 20,
  },
  header: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 20,
  },
  graphPlaceholder: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    color: '#32D74B',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  placeholderSub: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
  }
});
