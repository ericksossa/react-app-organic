import React from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';

type IconName =
  | 'home'
  | 'leaf'
  | 'search'
  | 'cart'
  | 'bag'
  | 'sun'
  | 'moon'
  | 'bookmark'
  | 'share'
  | 'logout'
  | 'chevron-down'
  | 'back'
  | 'clock'
  | 'copy'
  | 'check-circle'
  | 'x-circle';

type Props = {
  name: IconName;
  color: string;
  size?: number;
};

export function AppIcon({ name, color, size = 18 }: Props) {
  if (name === 'leaf') {
    return <Ionicons name="leaf-outline" color={color} size={size} />;
  }

  const featherName: React.ComponentProps<typeof Feather>['name'] =
    name === 'home'
      ? 'home'
      : name === 'search'
        ? 'search'
        : name === 'cart' || name === 'bag'
          ? 'shopping-cart'
          : name === 'sun'
            ? 'sun'
            : name === 'moon'
              ? 'moon'
              : name === 'bookmark'
                ? 'bookmark'
                : name === 'share'
                  ? 'share-2'
                  : name === 'logout'
                    ? 'log-out'
                    : name === 'chevron-down'
                      ? 'chevron-down'
                      : name === 'back'
                        ? 'arrow-left'
                        : name === 'clock'
                          ? 'clock'
                          : name === 'copy'
                            ? 'copy'
                            : name === 'check-circle'
                              ? 'check-circle'
                              : 'x-circle';

  return <Feather name={featherName} color={color} size={size} />;
}
