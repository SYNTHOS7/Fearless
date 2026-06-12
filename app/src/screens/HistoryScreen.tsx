import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { dbService } from '../services/DatabaseService';
import { EventRecord } from '../types';

export default function HistoryScreen() {
  const [events, setEvents] = useState<EventRecord[]>([]);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const data = await dbService.getRecentEvents();
    setEvents(data);
  };

  const renderItem = ({ item }: { item: EventRecord }) => (
    <View style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <Text style={styles.eventTime}>{new Date(item.timestamp).toLocaleString()}</Text>
        <Text style={[styles.threatBadge, { backgroundColor: getThreatColor(item.threat_level) }]}>
          {item.threat_level}
        </Text>
      </View>
      <Text style={styles.detailText}>Pattern: {item.motion_pattern}</Text>
      <Text style={styles.detailText}>Location: {item.location_label || 'Unknown'}</Text>
      <Text style={styles.detailText}>Outcome: {item.outcome}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Event History</Text>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id!.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

function getThreatColor(level: string) {
  switch (level) {
    case 'CRITICAL': return '#FF0000'; // Red
    case 'HIGH': return '#FF453A'; 
    case 'ELEVATED': return '#FF9F0A';
    case 'LOW_ALERT': return '#FFD60A';
    default: return '#32D74B';
  }
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
  eventCard: {
    backgroundColor: '#FFF9C4', // Soft yellow
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#EAE0A0'
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  eventTime: {
    color: '#800000', // Maroon
    fontSize: 16,
    fontWeight: 'bold',
  },
  threatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  detailText: {
    color: '#800000', // Maroon text for details
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500'
  }
});
