import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { navigate } from '../navigation/navigationRef';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';

export const CartToast: React.FC = () => {
  const { toast, hideToast } = useCart();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (toast) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Reset animation values for a snappy bottom slide-up entrance
      translateY.setValue(100);
      opacity.setValue(0);
      scale.setValue(0.92);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 6,
          speed: 14,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        dismissToast();
      }, 3500);
    } else {
      dismissToast();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [toast?.timestamp]);

  const dismissToast = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.92,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      hideToast();
    });
  };

  const handleViewCart = () => {
    dismissToast();
    navigate('Cart');
  };

  if (!toast) {
    return null;
  }

  const { product, quantity } = toast;
  // Position the pop up directly above the bottom navbar (tab bar height: ~60 + safeBottom)
  const safeBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 8);
  const bottomPosition = safeBottom + 70;

  return (
    <View style={[styles.outerContainer, { bottom: bottomPosition }]} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.toastCard,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: isDark ? '#334155' : '#E2E8F0',
            shadowColor: '#000000',
            transform: [{ translateY }, { scale }],
            opacity,
          },
        ]}
      >
        {/* Left Thumbnail */}
        <View style={[styles.imageWrapper, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
          {product.image ? (
            <Image
              source={{ uri: product.image }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="cube-outline" size={24} color={colors.primary} />
          )}
          <View style={styles.successDot}>
            <Ionicons name="checkmark" size={10} color="#FFFFFF" />
          </View>
        </View>

        {/* Center Details */}
        <TouchableOpacity
          style={styles.infoCol}
          activeOpacity={0.8}
          onPress={handleViewCart}
        >
          <View style={styles.titleRow}>
            <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
            <Text style={[styles.statusText, { color: COLORS.success }]}>
              {quantity > 1 ? `${quantity}x Added to Cart` : 'Added to Cart!'}
            </Text>
          </View>
          <Text style={[styles.productTitle, { color: colors.text }]} numberOfLines={1}>
            {product.title}
          </Text>
          <Text style={[styles.productPrice, { color: colors.primary }]}>
            {APP_CONFIG.currency} {(product.price * quantity).toLocaleString()}
          </Text>
        </TouchableOpacity>

        {/* Right CTA & Close */}
        <View style={styles.actionsCol}>
          <TouchableOpacity
            style={[styles.viewCartBtn, { backgroundColor: colors.primary }]}
            onPress={handleViewCart}
            activeOpacity={0.85}
          >
            <Text style={[styles.viewCartText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>
              View Cart
            </Text>
            <Ionicons
              name="arrow-forward"
              size={13}
              color={isDark ? '#260B00' : '#FFFFFF'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={dismissToast}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 999999,
    alignItems: 'center',
  },
  toastCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    elevation: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  imageWrapper: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
    marginRight: 10,
  },
  thumbnail: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
  },
  successDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.success,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: SPACING.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  productPrice: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 1,
  },
  actionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
  },
  viewCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    gap: 3,
  },
  viewCartText: {
    fontSize: 11,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
});
