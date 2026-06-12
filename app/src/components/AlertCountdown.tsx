import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AlertCountdownProps {
  seconds: number;
  onCancel: () => void;
  onComplete: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AlertCountdown: React.FC<AlertCountdownProps> = ({
  seconds,
  onCancel,
  onComplete,
}) => {
  const [remaining, setRemaining] = useState(seconds);
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const numberAnim = useRef(new Animated.Value(1)).current;
  const bgPulse = useRef(new Animated.Value(0)).current;

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Background pulse
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(bgPulse, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bgPulse, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Countdown logic
  useEffect(() => {
    if (remaining <= 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      // Animate number change
      Animated.sequence([
        Animated.timing(numberAnim, {
          toValue: 0.3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(numberAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      setRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [remaining, onComplete]);

  const bgOpacity = bgPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 0.95],
  });

  return (
    <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
      {/* Pulsing red background */}
      <Animated.View
        style={[
          styles.bgPulse,
          { opacity: bgOpacity },
        ]}
      />

      <Animated.View
        style={[
          styles.content,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Warning icon */}
        <View style={styles.warningIcon}>
          <Ionicons name="warning" size={48} color="#FF1744" />
        </View>

        {/* Countdown number */}
        <Animated.Text
          style={[styles.countdown, { transform: [{ scale: numberAnim }] }]}
        >
          {remaining}
        </Animated.Text>

        <Text style={styles.alertText}>Emergency Alert in</Text>
        <Text style={styles.secondsText}>
          {remaining} second{remaining !== 1 ? 's' : ''}
        </Text>

        <Text style={styles.subText}>
          Sending location and alert to your emergency contacts
        </Text>

        {/* Cancel button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <Ionicons name="close-circle" size={24} color="#FFFFFF" />
          <Text style={styles.cancelText}>CANCEL</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgPulse: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 10, 15, 0.95)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  warningIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 23, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 23, 68, 0.3)',
  },
  countdown: {
    fontSize: 120,
    fontWeight: '900',
    color: '#FF1744',
    lineHeight: 130,
    textShadowColor: 'rgba(255, 23, 68, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },
  alertText: {
    fontSize: 18,
    color: '#8E8EA0',
    marginTop: 8,
    fontWeight: '400',
  },
  secondsText: {
    fontSize: 22,
    color: '#FF1744',
    fontWeight: '700',
    marginTop: 4,
  },
  subText: {
    fontSize: 14,
    color: '#4A4A5A',
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 8,
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
});

export default AlertCountdown;
