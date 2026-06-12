import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

type RiskStatus = 'safe' | 'elevated' | 'danger';

interface RiskMeterProps {
  level: number; // 0-100
  status: RiskStatus;
  size?: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RiskMeter: React.FC<RiskMeterProps> = ({
  level,
  status,
  size = 220,
}) => {
  const animatedLevel = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const strokeWidth = 12;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Animate level changes
  useEffect(() => {
    Animated.timing(animatedLevel, {
      toValue: level,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [level]);

  // Pulse animation for danger state
  useEffect(() => {
    if (status === 'danger') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.06,
              duration: 900,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(glowOpacity, {
              toValue: 0.6,
              duration: 900,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 900,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(glowOpacity, {
              toValue: 0.2,
              duration: 900,
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
      glowOpacity.setValue(0);
    }
  }, [status]);

  const getStatusColor = () => {
    if (level <= 30) return '#00E676';
    if (level <= 60) return '#FFB300';
    if (level <= 80) return '#FF9100';
    return '#FF1744';
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'safe':
        return 'All Clear';
      case 'elevated':
        return 'Monitoring';
      case 'danger':
        return '⚠️ ALERT';
      default:
        return 'Unknown';
    }
  };

  const getGradientColors = () => {
    if (level <= 30) return ['#00E676', '#69F0AE'];
    if (level <= 60) return ['#FFB300', '#FFC107'];
    if (level <= 80) return ['#FF9100', '#FF6D00'];
    return ['#FF1744', '#D50000'];
  };

  const statusColor = getStatusColor();
  const gradColors = getGradientColors();

  // Calculate stroke dashoffset from animated value
  const strokeDashoffset = animatedLevel.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, circumference * 0.15], // Leave a small gap
    extrapolate: 'clamp',
  });

  // Animated display value
  const displayLevel = animatedLevel.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 100],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { width: size, height: size, transform: [{ scale: pulseAnim }] },
      ]}
    >
      {/* Glow effect for danger */}
      <Animated.View
        style={[
          styles.dangerGlow,
          {
            width: size + 40,
            height: size + 40,
            borderRadius: (size + 40) / 2,
            backgroundColor: 'rgba(255, 23, 68, 0.15)',
            opacity: glowOpacity,
          },
        ]}
      />

      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={gradColors[0]} />
            <Stop offset="100%" stopColor={gradColors[1]} />
          </LinearGradient>
        </Defs>

        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(42, 42, 58, 0.5)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />

        {/* Animated fill arc */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#riskGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${center} ${center})`}
        />

        {/* Inner decorative ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius - 20}
          stroke="rgba(42, 42, 58, 0.2)"
          strokeWidth={1}
          fill="none"
        />
      </Svg>

      {/* Center content overlay */}
      <View style={[styles.centerContent, { width: size, height: size }]}>
        <AnimatedText
          animatedValue={displayLevel}
          color={statusColor}
        />
        <Text style={[styles.percentSign, { color: statusColor }]}>%</Text>
        <Text style={[styles.statusLabel, { color: statusColor }]}>
          {getStatusLabel()}
        </Text>
      </View>
    </Animated.View>
  );
};

// Animated number display component
const AnimatedText: React.FC<{
  animatedValue: Animated.AnimatedInterpolation<number>;
  color: string;
}> = ({ animatedValue, color }) => {
  const [displayText, setDisplayText] = React.useState('0');

  useEffect(() => {
    const listenerId = animatedValue.addListener(({ value }) => {
      setDisplayText(Math.round(value).toString());
    });
    return () => {
      animatedValue.removeListener(listenerId);
    };
  }, [animatedValue]);

  return (
    <Text style={[styles.levelText, { color }]}>
      {displayText}
    </Text>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerGlow: {
    position: 'absolute',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: {
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: -2,
  },
  percentSign: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: -8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
});

export default RiskMeter;
