import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Easing,
} from 'react-native';

type ConnectionStatus = 'connected' | 'disconnected' | 'scanning' | 'connecting';

interface ConnectionBadgeProps {
  status: ConnectionStatus;
  deviceName?: string;
}

const ConnectionBadge: React.FC<ConnectionBadgeProps> = ({
  status,
  deviceName,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'scanning' || status === 'connecting') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.5,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.3,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 1,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
      opacityAnim.setValue(1);
    }
  }, [status]);

  const getDotColor = () => {
    switch (status) {
      case 'connected':
        return '#00E676';
      case 'disconnected':
        return '#FF1744';
      case 'scanning':
        return '#FFB300';
      case 'connecting':
        return '#00D9FF';
      default:
        return '#4A4A5A';
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'connected':
        return deviceName ? `Connected to ${deviceName}` : 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'scanning':
        return 'Scanning...';
      case 'connecting':
        return 'Connecting...';
      default:
        return 'Unknown';
    }
  };

  const dotColor = getDotColor();

  return (
    <View style={styles.container}>
      <View style={styles.dotContainer}>
        {/* Outer glow ring */}
        <Animated.View
          style={[
            styles.dotGlow,
            {
              backgroundColor: dotColor,
              transform: [{ scale: pulseAnim }],
              opacity: opacityAnim,
            },
          ]}
        />
        {/* Inner solid dot */}
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      </View>
      <Text style={styles.label}>{getLabel()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 31, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(42, 42, 58, 0.5)',
  },
  dotContainer: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  dotGlow: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    color: '#8E8EA0',
    fontSize: 13,
    fontWeight: '500',
  },
});

export default ConnectionBadge;
