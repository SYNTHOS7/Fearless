import React, { useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Easing,
  PanResponder,
  Platform,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface SosButtonProps {
  onActivate: () => void;
  disabled?: boolean;
  holdDuration?: number; // ms, default 2000
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SosButton: React.FC<SosButtonProps> = ({
  onActivate,
  disabled = false,
  holdDuration = 2000,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<Animated.CompositeAnimation | null>(null);
  const isHolding = useRef(false);

  const buttonSize = 120;
  const strokeWidth = 4;
  const progressRadius = (buttonSize + 16) / 2;
  const progressCircumference = 2 * Math.PI * progressRadius;

  // Ambient pulse animation
  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.6,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const startHold = useCallback(() => {
    if (disabled) return;
    isHolding.current = true;

    // Scale down slightly for press feel
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();

    // Start progress ring animation
    progressAnim.setValue(0);
    const progressAnimation = Animated.timing(progressAnim, {
      toValue: 1,
      duration: holdDuration,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    progressTimerRef.current = progressAnimation;
    progressAnimation.start(({ finished }) => {
      if (finished && isHolding.current) {
        // Long-press completed — trigger SOS
        triggerHaptic();
        onActivate();
        resetButton();
      }
    });
  }, [disabled, holdDuration, onActivate]);

  const cancelHold = useCallback(() => {
    isHolding.current = false;
    if (progressTimerRef.current) {
      progressTimerRef.current.stop();
    }
    resetButton();
  }, []);

  const resetButton = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const triggerHaptic = async () => {
    try {
      const Haptics = require('expo-haptics');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // Haptics not available
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => startHold(),
      onPanResponderRelease: () => cancelHold(),
      onPanResponderTerminate: () => cancelHold(),
    })
  ).current;

  const progressStrokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [progressCircumference, 0],
  });

  return (
    <View style={styles.wrapper}>
      {/* Outer glow rings */}
      <Animated.View
        style={[
          styles.glowRing,
          styles.glowRingOuter,
          { opacity: glowAnim, transform: [{ scale: pulseAnim }] },
        ]}
      />
      <Animated.View
        style={[
          styles.glowRing,
          styles.glowRingInner,
          {
            opacity: Animated.multiply(glowAnim, 1.5),
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* Progress ring SVG */}
      <View style={styles.progressContainer}>
        <Svg
          width={buttonSize + 24}
          height={buttonSize + 24}
          viewBox={`0 0 ${buttonSize + 24} ${buttonSize + 24}`}
        >
          {/* Background ring */}
          <Circle
            cx={(buttonSize + 24) / 2}
            cy={(buttonSize + 24) / 2}
            r={progressRadius}
            stroke="rgba(255, 23, 68, 0.15)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress ring */}
          <AnimatedCircle
            cx={(buttonSize + 24) / 2}
            cy={(buttonSize + 24) / 2}
            r={progressRadius}
            stroke="#FF1744"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${progressCircumference}`}
            strokeDashoffset={progressStrokeDashoffset}
            transform={`rotate(-90 ${(buttonSize + 24) / 2} ${(buttonSize + 24) / 2})`}
          />
        </Svg>
      </View>

      {/* Main button */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.button,
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            transform: [{ scale: scaleAnim }],
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <View style={styles.buttonInner}>
          <Text style={styles.sosText}>SOS</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 180,
    height: 180,
  },
  glowRing: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(255, 23, 68, 0.08)',
  },
  glowRingOuter: {
    width: 180,
    height: 180,
  },
  glowRingInner: {
    width: 155,
    height: 155,
  },
  progressContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#FF1744',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF1744',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  buttonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    // Inner gradient simulation
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    borderLeftColor: 'rgba(255, 255, 255, 0.05)',
    borderRightColor: 'rgba(0, 0, 0, 0.1)',
    borderBottomColor: 'rgba(0, 0, 0, 0.2)',
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});

export default SosButton;
