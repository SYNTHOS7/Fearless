import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BatteryIndicatorProps {
  level: number;
  isCharging?: boolean;
}

const BatteryIndicator: React.FC<BatteryIndicatorProps> = ({
  level,
  isCharging = false,
}) => {
  const getColor = () => {
    if (level > 50) return '#00E676';
    if (level > 20) return '#FFB300';
    return '#FF1744';
  };

  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    if (isCharging) return 'battery-charging';
    if (level > 75) return 'battery-full';
    if (level > 50) return 'battery-three-quarters' as any; // Fallback
    if (level > 25) return 'battery-half';
    if (level > 10) return 'battery-quarter' as any; // Fallback
    return 'battery-dead';
  };

  // Ionicons doesn't have quarter/three-quarters, use full/half/dead
  const getIonIcon = (): keyof typeof Ionicons.glyphMap => {
    if (isCharging) return 'battery-charging';
    if (level > 60) return 'battery-full';
    if (level > 30) return 'battery-half';
    return 'battery-dead';
  };

  const color = getColor();

  return (
    <View style={styles.container}>
      <Ionicons name={getIonIcon()} size={18} color={color} />
      <Text style={[styles.text, { color }]}>{Math.round(level)}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 31, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(42, 42, 58, 0.5)',
    gap: 4,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default BatteryIndicator;
