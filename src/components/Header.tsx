import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  onOpenCart?: () => void;
  onSearchPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  onOpenCart,
  onSearchPress,
}) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { totalItemsCount } = useCart();

  const handleCall = () => {
    Linking.openURL(`tel:${APP_CONFIG.hotline1Raw}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.leftContainer}>
        {showBack ? (
          <TouchableOpacity onPress={onBack} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Ionicons name="sunny" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={[styles.brandTitle, { color: colors.text }]}>RADICAL</Text>
              <Text style={styles.brandSubtitle}>ENGINEERING</Text>
            </View>
          </View>
        )}

        {title && (
          <View style={styles.titleWrapper}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.rightContainer}>
        <TouchableOpacity onPress={handleCall} style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]}>
          <Ionicons name="call-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>

        {onSearchPress && (
          <TouchableOpacity onPress={onSearchPress} style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]}>
            <Ionicons name="search-outline" size={18} color={colors.text} />
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={toggleTheme} style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]}>
          <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color={colors.text} />
        </TouchableOpacity>

        {onOpenCart && (
          <TouchableOpacity onPress={onOpenCart} style={[styles.actionBtn, styles.cartBtn]}>
            <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
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
    paddingVertical: SPACING.sm + 4,
    borderBottomWidth: 1,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 2,
    marginTop: -2,
  },
  titleWrapper: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
  },
  iconButton: {
    padding: SPACING.xs,
    marginRight: SPACING.xs,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBtn: {
    backgroundColor: COLORS.primary,
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

