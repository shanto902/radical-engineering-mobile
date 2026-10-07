import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
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
  const { colors } = useTheme();
  const { addToCart, toggleWishlist, isWishlisted } = useCart();
  const wishlisted = isWishlisted(product.id);

  if (horizontal) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={[
          styles.horizontalCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Image source={{ uri: product.image }} style={styles.horizontalImage} resizeMode="cover" />
        <View style={styles.horizontalDetails}>
          <View style={styles.badgeRow}>
            {product.wattage ? (
              <View style={styles.wattageBadge}>
                <Text style={styles.wattageText}>{product.wattage}</Text>
              </View>
            ) : null}
            <Text style={[styles.brandText, { color: colors.textSecondary }]}>{product.brand}</Text>
          </View>

          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {product.title}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {APP_CONFIG.currency} {product.price.toLocaleString()}
            </Text>
            {product.originalPrice && (
              <Text style={[styles.originalPrice, { color: colors.textMuted }]}>
                {APP_CONFIG.currency} {product.originalPrice.toLocaleString()}
              </Text>
            )}
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
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
        <TouchableOpacity
          onPress={() => toggleWishlist(product.id)}
          style={[styles.wishlistBtn, { backgroundColor: colors.surface }]}
        >
          <Ionicons
            name={wishlisted ? 'heart' : 'heart-outline'}
            size={18}
            color={wishlisted ? COLORS.danger : colors.textSecondary}
          />
        </TouchableOpacity>
        {product.wattage ? (
          <View style={styles.badgeOverlay}>
            <Text style={styles.badgeOverlayText}>{product.wattage}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.infoContainer}>
        <Text style={[styles.brand, { color: colors.textSecondary }]}>{product.brand}</Text>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {product.title}
        </Text>

        <View style={styles.ratingRow}>
          <Ionicons name="star" size={13} color="#F59E0B" />
          <Text style={[styles.ratingText, { color: colors.text }]}>{product.rating}</Text>
          <Text style={[styles.reviewsText, { color: colors.textMuted }]}>
            ({product.reviewsCount})
          </Text>
        </View>

        <View style={styles.footerRow}>
          <View>
            <Text style={styles.price}>
              {APP_CONFIG.currency} {product.price.toLocaleString()}
            </Text>
            {product.originalPrice && (
              <Text style={[styles.originalPrice, { color: colors.textMuted }]}>
                {APP_CONFIG.currency} {product.originalPrice.toLocaleString()}
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={() => addToCart(product)}
            style={styles.addCartBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="cart-outline" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
    width: '48%',
    marginBottom: SPACING.md,
  },
  imageContainer: {
    width: '100%',
    height: 130,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  wishlistBtn: {
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
    shadowRadius: 2,
    elevation: 2,
  },
  badgeOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  badgeOverlayText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  infoContainer: {
    padding: SPACING.sm + 2,
  },
  brand: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    height: 36,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reviewsText: {
    fontSize: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  addCartBtn: {
    backgroundColor: COLORS.primary,
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Horizontal layout
  horizontalCard: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    alignItems: 'center',
  },
  horizontalImage: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.sm,
    backgroundColor: '#F1F5F9',
  },
  horizontalDetails: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  wattageBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  wattageText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '700',
  },
  brandText: {
    fontSize: 11,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
});

