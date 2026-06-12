import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';

export default function SettingsScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Settings</Text>
        <View style={styles.row}>
          <Text style={styles.rowText}>SafeBand Status</Text>
          <Text style={styles.valueText}>Connected</Text>
        </View>
        <TouchableOpacity style={styles.row}>
          <Text style={styles.linkText}>Forget Device</Text>
        </TouchableOpacity>
        <View style={styles.row}>
          <Text style={styles.rowText}>Sensitivity</Text>
          <Text style={styles.valueText}>Balanced</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Contacts</Text>
        <TouchableOpacity style={styles.row}>
          <Text style={styles.rowText}>Mom</Text>
          <Text style={styles.valueText}>SMS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row}>
          <Text style={styles.linkText}>+ Add Contact</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Context Engine</Text>
        <View style={styles.row}>
          <Text style={styles.rowText}>Use Location Context</Text>
          <Switch value={true} onValueChange={() => {}} trackColor={{ true: '#FF0000', false: '#CCC' }} />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowText}>Use Audio Context</Text>
          <Switch value={false} onValueChange={() => {}} trackColor={{ true: '#FF0000', false: '#CCC' }} />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowText}>Auto-call Services</Text>
          <Switch value={false} onValueChange={() => {}} trackColor={{ true: '#FF0000', false: '#CCC' }} />
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White background
  },
  header: {
    color: '#800000', // Maroon
    fontSize: 28,
    fontWeight: 'bold',
    margin: 20,
    marginTop: 40,
  },
  section: {
    marginBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#EAE0A0', // Light yellow border
  },
  sectionTitle: {
    color: '#800000', // Maroon
    fontSize: 14,
    textTransform: 'uppercase',
    marginHorizontal: 20,
    marginVertical: 10,
    fontWeight: 'bold'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF9C4', // Soft Yellow rows
    padding: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE0A0',
  },
  rowText: {
    color: '#800000', // Maroon
    fontSize: 16,
    fontWeight: '600'
  },
  valueText: {
    color: '#800000',
    fontSize: 16,
  },
  linkText: {
    color: '#FF0000', // Red for interactive links
    fontSize: 16,
    fontWeight: 'bold'
  }
});
