import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function OnboardingScreen({ navigation, onComplete }: any) {
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

      <TouchableOpacity onPress={() => {
        if (onComplete) {
          onComplete();
        } else if (navigation) {
          navigation.replace('Main');
        }
      }}>
        <LinearGradient
          colors={['#800000', '#D32F2F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.btn}
        >
          <Text style={styles.btnText}>Start Setup</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White background
    padding: 30,
    justifyContent: 'center',
  },
  title: {
    color: '#800000', // Maroon
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    color: '#800000', // Maroon
    fontSize: 18,
    marginBottom: 40,
    fontWeight: '600'
  },
  steps: {
    backgroundColor: '#FFF9C4', // Soft Yellow
    padding: 20,
    borderRadius: 12,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#EAE0A0'
  },
  step: {
    color: '#800000', // Maroon
    fontSize: 16,
    marginBottom: 15,
    fontWeight: '600'
  },
  btn: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFFFFF', // White on Rainbow gradient
    fontSize: 20,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  }
});
