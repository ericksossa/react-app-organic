import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { VoiceAssistantStatus } from '../state/useVoiceAssistant';

type VoiceSeedButtonProps = {
  status: VoiceAssistantStatus;
  disabled?: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  onPress: () => void;
  backgroundColor: string;
  iconColor: string;
  borderColor: string;
};

export const VoiceSeedButton = React.memo(function VoiceSeedButton({
  status,
  disabled,
  onPressIn,
  onPressOut,
  onPress,
  backgroundColor,
  iconColor,
  borderColor
}: VoiceSeedButtonProps) {
  const scale = useSharedValue(1);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const isListening = status === 'listening';
  const isProcessing = status === 'processing';

  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Buscar por voz"
        disabled={disabled}
        onPressIn={() => {
          scale.value = withSpring(0.95, { damping: 14, stiffness: 220 });
          onPressIn();
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 220 });
          onPressOut();
        }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.seed,
          {
            opacity: disabled ? 0.55 : pressed ? 0.88 : 1,
            backgroundColor,
            borderColor
          }
        ]}
      >
        <View style={styles.iconWrap}>
          <Feather name={isProcessing ? 'loader' : isListening ? 'radio' : 'mic'} size={16} color={iconColor} />
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  seed: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconWrap: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
