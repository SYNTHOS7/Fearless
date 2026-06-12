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
            <Text style={styles.btnTextYes}>✅ Yes, real emergency</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnNo]}>
            <Text style={styles.btnTextNo}>❌ False alarm</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>What were you doing? (optional)</Text>
        <TextInput 
          style={styles.input} 
          placeholderTextColor="#800000" 
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
  card: {
    backgroundColor: '#FFF9C4', // Soft Yellow
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAE0A0'
  },
  cardTitle: {
    color: '#800000', // Maroon
    fontSize: 14,
    marginBottom: 15,
    fontWeight: '600'
  },
  question: {
    color: '#800000', // Maroon
    fontSize: 18,
    fontWeight: 'bold',
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
    backgroundColor: '#FFFFFF', // White buttons inside yellow card
    borderWidth: 1,
  },
  btnYes: {
    borderColor: '#32D74B',
  },
  btnNo: {
    borderColor: '#FF0000', // Red
  },
  btnTextYes: {
    color: '#32D74B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  btnTextNo: {
    color: '#FF0000', // Red
    fontSize: 16,
    fontWeight: 'bold',
  },
  label: {
    color: '#800000', // Maroon
    fontSize: 14,
    marginBottom: 10,
    fontWeight: '600'
  },
  input: {
    backgroundColor: '#FFFFFF', // White input
    color: '#800000',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EAE0A0'
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    color: '#800000', // Maroon
    fontSize: 16,
    fontWeight: 'bold'
  },
  doneBtn: {
    backgroundColor: '#800000', // Maroon
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 8,
  },
  doneText: {
    color: '#FFFFFF', // White
    fontSize: 16,
    fontWeight: 'bold',
  }
});
