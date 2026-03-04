import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppSkeleton } from './AppSkeleton';

export function CatalogLoadingSkeleton() {
  return (
    <View style={styles.stackMd}>
      <AppSkeleton height={320} radius={22} />
      <AppSkeleton height={188} radius={16} />
      <AppSkeleton height={188} radius={16} />
    </View>
  );
}

export function ProductDetailLoadingSkeleton() {
  return (
    <View style={styles.stackMd}>
      <AppSkeleton height={280} radius={24} />
      <AppSkeleton height={18} width="64%" />
      <AppSkeleton height={14} width="42%" />
      <AppSkeleton height={56} radius={14} />
      <AppSkeleton height={56} radius={14} />
      <AppSkeleton height={48} radius={14} />
    </View>
  );
}

export function CartLoadingSkeleton() {
  return (
    <View style={styles.stackMd}>
      <AppSkeleton height={88} radius={18} />
      <AppSkeleton height={88} radius={18} />
      <AppSkeleton height={88} radius={18} />
    </View>
  );
}

export function AddressListLoadingSkeleton() {
  return (
    <View style={styles.stackSm}>
      <AppSkeleton height={58} radius={14} />
      <AppSkeleton height={58} radius={14} />
      <AppSkeleton height={58} radius={14} />
    </View>
  );
}

export function ZoneListLoadingSkeleton() {
  return (
    <View style={styles.stackSm}>
      <AppSkeleton height={54} radius={14} />
      <AppSkeleton height={54} radius={14} />
      <AppSkeleton height={54} radius={14} />
    </View>
  );
}

export function OrderDetailLoadingSkeleton() {
  return (
    <View style={styles.stackMd}>
      <AppSkeleton width="48%" />
      <AppSkeleton width="62%" />
      <AppSkeleton width="40%" />
      <AppSkeleton height={52} radius={12} />
      <AppSkeleton height={52} radius={12} />
    </View>
  );
}

export function OrdersListLoadingSkeleton() {
  return (
    <View style={styles.stackMd}>
      <View style={styles.skeletonRow}>
        <AppSkeleton style={styles.skeletonLineLg} />
        <AppSkeleton style={styles.skeletonLineSm} />
      </View>
      <View style={styles.skeletonRow}>
        <AppSkeleton style={styles.skeletonLineLg} />
        <AppSkeleton style={styles.skeletonLineSm} />
      </View>
      <View style={styles.skeletonRow}>
        <AppSkeleton style={styles.skeletonLineLg} />
        <AppSkeleton style={styles.skeletonLineSm} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stackMd: {
    gap: 10
  },
  stackSm: {
    gap: 8
  },
  skeletonRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    minHeight: 66,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8
  },
  skeletonLineLg: {
    height: 14,
    width: '56%',
    borderRadius: 999
  },
  skeletonLineSm: {
    height: 12,
    width: '34%',
    borderRadius: 999
  }
});
