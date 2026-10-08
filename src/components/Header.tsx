import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar as RNStatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { HeaderLogo } from './HeaderLogo';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showLogo?: boolean;
  onBack?: () => void;
  onOpenCart?: () => void;
  onSearchPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  showLogo = false,
  onBack,
  onOpenCart,
  onSearchPress,
}) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { totalItemsCount } = useCart();
  const insets = useSafeAreaInsets();

  const androidStatusBar = RNStatusBar.currentHeight ?? 24;
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? androidStatusBar : 0);
  const safeTopPadding = topInset + 6;

  const shouldRenderLogo = showLogo || (!showBack && !title);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          paddingTop: safeTopPadding,
        },
      ]}
    >
      <View style={styles.leftContainer}>
        {showBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.iconButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : null}

        {shouldRenderLogo ? (
          <View style={styles.logoWrapper}>
            <HeaderLogo isDark={isDark} width={162} height={28} />
          </View>
        ) : title ? (
          <View style={styles.titleWrapper}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.rightContainer}>
        {onSearchPress && (
          <TouchableOpacity
            onPress={onSearchPress}
            style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]}
            accessibilityLabel="Search products"
          >
            <Ionicons name="search-outline" size={17} color={colors.text} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]}
          accessibilityLabel="Toggle theme"
        >
          <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={17} color={colors.text} />
        </TouchableOpacity>

        {onOpenCart && (
          <TouchableOpacity
            onPress={onOpenCart}
            style={[
              styles.actionBtn,
              styles.cartBtn,
              { backgroundColor: colors.primary },
            ]}
            accessibilityLabel="View shopping cart"
          >
            <Ionicons name="cart-outline" size={19} color={isDark ? '#260B00' : '#FFFFFF'} />
            {totalItemsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{totalItemsCount > 99 ? '99+' : totalItemsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm + 4,
    borderBottomWidth: 1,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.sm,
  },
  logoWrapper: {
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  titleWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
  },
  iconButton: {
    padding: SPACING.xs,
    marginRight: SPACING.xs + 2,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBtn: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
});
