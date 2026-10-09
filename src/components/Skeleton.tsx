import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  StyleProp,
  ViewStyle,
  DimensionValue,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../constants/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = RADIUS.sm,
  style,
}) => {
  const { isDark } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: isDark ? [0.25, 0.65] : [0.4, 0.9],
  });

  const baseColor = isDark ? '#334155' : '#E2E8F0';

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseColor,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const ProductCardSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.productCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.cardShadow,
        },
      ]}
    >
      {/* Image Skeleton */}
      <View style={styles.imageWrapper}>
        <Skeleton width="100%" height={140} borderRadius={0} />
      </View>

      {/* Body Skeleton */}
      <View style={styles.body}>
        {/* Brand & Stock indicator */}
        <View style={styles.rowBetween}>
          <Skeleton width={55} height={10} borderRadius={RADIUS.xs} />
          <Skeleton width={40} height={10} borderRadius={RADIUS.xs} />
        </View>

        {/* Title lines */}
        <View style={{ marginTop: 6, gap: 4 }}>
          <Skeleton width="92%" height={12} borderRadius={RADIUS.xs} />
          <Skeleton width="65%" height={12} borderRadius={RADIUS.xs} />
        </View>

        {/* Subtag / Warranty */}
        <View style={{ marginTop: 8 }}>
          <Skeleton width="50%" height={10} borderRadius={RADIUS.xs} />
        </View>

        {/* Footer: Price + Cart icon */}
        <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
          <View style={{ gap: 3 }}>
            <Skeleton width={75} height={14} borderRadius={RADIUS.xs} />
            <Skeleton width={50} height={10} borderRadius={RADIUS.xs} />
          </View>
          <Skeleton width={28} height={28} borderRadius={14} />
        </View>
      </View>
    </View>
  );
};

export const ProductGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <View style={styles.gridContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={`skeleton-card-${index}`} />
      ))}
    </View>
  );
};

export const ProductDetailSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.detailContainer, { backgroundColor: colors.background }]}>
      {/* Hero Image Container */}
      <View style={[styles.detailHeroWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Skeleton width="100%" height={260} borderRadius={RADIUS.lg} />
      </View>

      <View style={styles.detailContent}>
        {/* Badges Row */}
        <View style={styles.detailBadgesRow}>
          <Skeleton width={80} height={22} borderRadius={RADIUS.full} />
          <Skeleton width={70} height={22} borderRadius={RADIUS.full} />
          <Skeleton width={60} height={22} borderRadius={RADIUS.full} />
        </View>

        {/* Title */}
        <View style={{ marginTop: 12, gap: 6 }}>
          <Skeleton width="90%" height={22} borderRadius={RADIUS.sm} />
          <Skeleton width="60%" height={18} borderRadius={RADIUS.sm} />
        </View>

        {/* Price Card */}
        <View style={[styles.detailPriceBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ gap: 4 }}>
            <Skeleton width={110} height={24} borderRadius={RADIUS.sm} />
            <Skeleton width={80} height={12} borderRadius={RADIUS.xs} />
          </View>
          <Skeleton width={70} height={26} borderRadius={RADIUS.sm} />
        </View>

        {/* Specification Cards Grid */}
        <View style={styles.specsGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View
              key={`spec-box-${i}`}
              style={[styles.specBox, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Skeleton width={40} height={12} borderRadius={RADIUS.xs} />
              <Skeleton width={65} height={14} borderRadius={RADIUS.xs} style={{ marginTop: 6 }} />
            </View>
          ))}
        </View>

        {/* Description Lines */}
        <View style={[styles.descBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Skeleton width={120} height={16} borderRadius={RADIUS.xs} />
          <View style={{ marginTop: 10, gap: 6 }}>
            <Skeleton width="100%" height={12} borderRadius={RADIUS.xs} />
            <Skeleton width="95%" height={12} borderRadius={RADIUS.xs} />
            <Skeleton width="88%" height={12} borderRadius={RADIUS.xs} />
            <Skeleton width="70%" height={12} borderRadius={RADIUS.xs} />
          </View>
        </View>
      </View>
    </View>
  );
};

export const ProjectCardSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.projectCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.cardShadow,
        },
      ]}
    >
      <Skeleton width="100%" height={180} borderRadius={0} />

      <View style={styles.projectBody}>
        {/* Meta row */}
        <View style={styles.rowBetween}>
          <Skeleton width={80} height={20} borderRadius={RADIUS.sm} />
          <Skeleton width={70} height={12} borderRadius={RADIUS.xs} />
        </View>

        {/* Title */}
        <View style={{ marginTop: 10, gap: 6 }}>
          <Skeleton width="95%" height={16} borderRadius={RADIUS.xs} />
          <Skeleton width="70%" height={16} borderRadius={RADIUS.xs} />
        </View>

        {/* Location row */}
        <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Skeleton width={14} height={14} borderRadius={7} />
          <Skeleton width={120} height={12} borderRadius={RADIUS.xs} />
        </View>

        {/* Description lines */}
        <View style={{ marginTop: 10, gap: 5 }}>
          <Skeleton width="100%" height={11} borderRadius={RADIUS.xs} />
          <Skeleton width="85%" height={11} borderRadius={RADIUS.xs} />
        </View>

        {/* Action Button */}
        <View style={{ marginTop: 14 }}>
          <Skeleton width="100%" height={38} borderRadius={RADIUS.md} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  productCard: {
    width: '48%',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },
  projectCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  projectBody: {
    padding: SPACING.md,
  },
  imageWrapper: {
    width: '100%',
    height: 140,
    overflow: 'hidden',
  },
  body: {
    padding: SPACING.sm + 2,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    marginTop: 8,
    paddingTop: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
  },
  detailContainer: {
    flex: 1,
    padding: SPACING.md,
  },
  detailHeroWrapper: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    padding: SPACING.sm,
    alignItems: 'center',
  },
  detailContent: {
    marginTop: SPACING.md,
  },
  detailBadgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailPriceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.md,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  specBox: {
    width: '48%',
    padding: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  descBox: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.md,
  },
});

