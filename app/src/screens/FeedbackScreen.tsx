import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';

export default function FeedbackScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pending Feedback</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Motion Alert — 2 minutes ago</Text>
        <Text style={styles.question}>Was this alert accurate?</Text>
        
        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.btn, styles.btnYes]}>
            <Text style={styles.btnText}>✅ Yes, real emergency</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnNo]}>
            <Text style={styles.btnText}>❌ False alarm</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>What were you doing? (optional)</Text>
        <TextInput 
          style={styles.input} 
          placeholderTextColor="#666" 
          placeholder="e.g. running, dropped phone" 
        />

        <View style={styles.actionRow}>
          <TouchableOpacity>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneBtn}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
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
  card: {
    backgroundColor: '#1C1C1E',
    padding: 20,
    borderRadius: 12,
  },
  cardTitle: {
    color: '#8E8E93',
    fontSize: 14,
    marginBottom: 15,
  },
  question: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: 'column',
    gap: 10,
    marginBottom: 20,
  },
  btn: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnYes: {
    backgroundColor: 'rgba(50, 215, 75, 0.2)',
    borderWidth: 1,
    borderColor: '#32D74B',
  },
  btnNo: {
    backgroundColor: 'rgba(255, 69, 58, 0.2)',
    borderWidth: 1,
    borderColor: '#FF453A',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  label: {
    color: '#8E8E93',
    fontSize: 14,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#2C2C2E',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  doneBtn: {
    backgroundColor: '#0A84FF',
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 8,
  },
  doneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});
