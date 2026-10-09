import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  horizontal?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress, horizontal = false }) => {
  const { colors, isDark } = useTheme();
  const { addToCart, toggleWishlist, isWishlisted } = useCart();
  const wishlisted = isWishlisted(product.id);

  if (horizontal) {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        style={[
          styles.horizontalCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.cardShadow,
          },
        ]}
      >
        <View style={[styles.horizontalImageWrapper, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
          <Image
            source={{ uri: product.image }}
            style={styles.imageBackdrop}
            resizeMode="cover"
            blurRadius={Platform.OS === 'android' ? 10 : 16}
          />
          <View
            style={[
              styles.imageOverlay,
              { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.25)' },
            ]}
          />
          <Image
            source={{ uri: product.image }}
            style={styles.horizontalImage}
            resizeMode="contain"
          />
          {product.wattage && (
            <View style={styles.horizontalWattTag}>
              <Text style={styles.horizontalWattText}>{product.wattage}</Text>
            </View>
          )}
        </View>

        <View style={styles.horizontalDetails}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.brandBadge, { color: colors.primary }]} numberOfLines={1}>
              {product.brand}
            </Text>
            {product.subCategory && (
              <View style={[styles.subCatPill, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <Text style={[styles.subCatText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {product.subCategory}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={2}>
            {product.title}
          </Text>

          <View style={styles.priceAndActionRow}>
            <View>
              <Text style={[styles.priceMain, { color: colors.primary }]}>
                {APP_CONFIG.currency} {product.price.toLocaleString()}
              </Text>
              {product.originalPrice && (
                <Text style={[styles.strikePrice, { color: colors.textMuted }]}>
                  {APP_CONFIG.currency} {product.originalPrice.toLocaleString()}
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={() => addToCart(product)}
              style={[styles.addCartBtnSmall, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Ionicons name="cart-outline" size={16} color={isDark ? '#260B00' : '#FFFFFF'} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.gridCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.cardShadow,
        },
      ]}
    >
      {/* Image Container with Badges */}
      <View style={[styles.imageContainer, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
        <Image
          source={{ uri: product.image }}
          style={styles.imageBackdrop}
          resizeMode="cover"
          blurRadius={Platform.OS === 'android' ? 12 : 20}
        />
        <View
          style={[
            styles.imageOverlay,
            { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.25)' },
          ]}
        />
        <Image
          source={{ uri: product.image }}
          style={styles.productImage}
          resizeMode="contain"
        />

        {/* Floating Wishlist Button */}
        <TouchableOpacity
          onPress={() => toggleWishlist(product.id)}
          style={[styles.floatingWishlist, { backgroundColor: colors.surface }]}
          activeOpacity={0.8}
        >
          <Ionicons
            name={wishlisted ? 'heart' : 'heart-outline'}
            size={16}
            color={wishlisted ? COLORS.danger : colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Capacity / Wattage Tag */}
        {product.wattage ? (
          <View style={styles.floatingWattBadge}>
            <Ionicons name="flash" size={10} color="#FFFFFF" />
            <Text style={styles.floatingWattText}>{product.wattage}</Text>
          </View>
        ) : null}

        {/* Discount Badge */}
        {product.discountPercent ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{product.discountPercent}%</Text>
          </View>
        ) : null}
      </View>

      {/* Product Content Body */}
      <View style={styles.contentBody}>
        {/* Brand & Stock Status */}
        <View style={styles.metaRow}>
          <Text style={[styles.brandText, { color: colors.primary }]} numberOfLines={1}>
            {product.brand}
          </Text>
          <View style={styles.stockIndicator}>
            <View style={[styles.stockDot, { backgroundColor: product.inStock ? COLORS.success : COLORS.warning }]} />
            <Text style={[styles.stockStatusText, { color: colors.textSecondary }]}>
              {product.inStock ? 'In Stock' : 'Order'}
            </Text>
          </View>
        </View>

        {/* Product Title */}
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {product.title}
        </Text>

        {/* Sub-category / Warranty tag */}
        {product.warranty ? (
          <View style={styles.subTagRow}>
            <Ionicons name="shield-checkmark-outline" size={11} color={COLORS.success} />
            <Text style={[styles.subTagText, { color: colors.textSecondary }]} numberOfLines={1}>
              {product.warranty}
            </Text>
          </View>
        ) : null}

        {/* Price & Add to Cart Footer */}
        <View style={styles.footerRow}>
          <View style={styles.priceColumn}>
            <Text style={[styles.price, { color: colors.primary }]}>
              {APP_CONFIG.currency} {product.price.toLocaleString()}
            </Text>
            {product.originalPrice ? (
              <Text style={[styles.originalPrice, { color: colors.textMuted }]}>
                {APP_CONFIG.currency} {product.originalPrice.toLocaleString()}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={() => addToCart(product)}
            style={[styles.addCartBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Ionicons name="cart" size={16} color={isDark ? '#260B00' : '#FFFFFF'} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gridCard: {
    width: '48%',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  imageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#F1F5F9',
    position: 'relative',
    overflow: 'hidden',
  },
  imageBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.85,
    transform: [{ scale: 1.15 }],
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  floatingWishlist: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  floatingWattBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    gap: 3,
  },
  floatingWattText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.danger,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  contentBody: {
    padding: SPACING.sm + 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  brandText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  stockIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockStatusText: {
    fontSize: 9,
    fontWeight: '600',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    height: 36,
    marginBottom: 4,
  },
  subTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  subTagText: {
    fontSize: 10,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 0.5,
    borderTopColor: '#F1F5F9',
    paddingTop: 6,
  },
  priceColumn: {
    flex: 1,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: 10,
    textDecorationLine: 'line-through',
    marginTop: 1,
  },
  addCartBtn: {
    backgroundColor: COLORS.primary,
    width: 34,
    height: 34,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  // Horizontal Styles
  horizontalCard: {
    flexDirection: 'row',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    padding: SPACING.sm,
    marginBottom: SPACING.sm + 2,
    alignItems: 'center',
  },
  horizontalImageWrapper: {
    width: 90,
    height: 90,
    borderRadius: RADIUS.md,
    backgroundColor: '#F1F5F9',
    position: 'relative',
    overflow: 'hidden',
  },
  horizontalImage: {
    width: '100%',
    height: '100%',
  },
  horizontalWattTag: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  horizontalWattText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  horizontalDetails: {
    flex: 1,
    marginLeft: SPACING.sm + 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  brandBadge: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  subCatPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subCatText: {
    fontSize: 9,
    fontWeight: '600',
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 6,
  },
  priceAndActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceMain: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  strikePrice: {
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  addCartBtnSmall: {
    backgroundColor: COLORS.primary,
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
