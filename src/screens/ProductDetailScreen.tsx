import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { apiService } from '../services/api';
import { Product } from '../types';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';

interface ProductDetailScreenProps {
  navigation: any;
  route: any;
}

export const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { addToCart, toggleWishlist, isWishlisted } = useCart();
  const { productId } = route.params;

  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getProductById(productId).then(p => {
      setProduct(p);
      setLoading(false);
    });
  }, [productId]);

  if (loading) {
    return (
      <View style={[styles.centerBox, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.centerBox, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundText, { color: colors.text }]}>Product not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const wishlisted = isWishlisted(product.id);

  const handleWhatsAppConsult = () => {
    const message = encodeURIComponent(
      `Hello Radical Engineering, I am interested in: ${product.title} (${product.model}) priced at ${APP_CONFIG.currency} ${product.price}. Please provide stock and installation details.`
    );
    Linking.openURL(`https://wa.me/${APP_CONFIG.whatsappNumber.replace('+', '')}?text=${message}`);
  };

  const handleAddToCartAndCart = () => {
    addToCart(product, quantity);
    navigation.navigate('Cart');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        showBack
        onBack={() => navigation.goBack()}
        title={product.brand}
        onOpenCart={() => navigation.navigate('Cart')}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Product Image Stage */}
        <View style={styles.imageStage}>
          <Image source={{ uri: product.image }} style={styles.mainImage} resizeMode="cover" />
          <TouchableOpacity
            style={[styles.floatingWishlist, { backgroundColor: colors.surface }]}
            onPress={() => toggleWishlist(product.id)}
          >
            <Ionicons
              name={wishlisted ? 'heart' : 'heart-outline'}
              size={22}
              color={wishlisted ? COLORS.danger : colors.textSecondary}
            />
          </TouchableOpacity>
          {product.wattage ? (
            <View style={styles.wattageTag}>
              <Text style={styles.wattageTagText}>{product.wattage}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.contentBody}>
          {/* Category & Stock */}
          <View style={styles.metaRow}>
            <Text style={[styles.categoryBadge, { color: COLORS.primary }]}>
              {product.categoryName}
            </Text>
            <View style={[styles.stockBadge, { backgroundColor: product.inStock ? '#DCFCE7' : '#FEE2E2' }]}>
              <Text style={[styles.stockText, { color: product.inStock ? '#166534' : '#991B1B' }]}>
                {product.inStock ? 'In Stock' : 'Pre-Order'}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>{product.title}</Text>

          {/* Model & Ratings */}
          <View style={styles.subInfoRow}>
            <Text style={[styles.modelText, { color: colors.textSecondary }]}>
              Model: {product.model}
            </Text>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratingScore}>{product.rating}</Text>
              <Text style={[styles.reviewsCount, { color: colors.textMuted }]}>
                ({product.reviewsCount} reviews)
              </Text>
            </View>
          </View>

          {/* Price Box */}
          <View style={[styles.priceBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View>
              <Text style={styles.priceLabel}>Price</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceMain}>
                  {APP_CONFIG.currency} {product.price.toLocaleString()}
                </Text>
                {product.originalPrice && (
                  <Text style={[styles.originalPrice, { color: colors.textMuted }]}>
                    {APP_CONFIG.currency} {product.originalPrice.toLocaleString()}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.warrantyBox}>
              <Ionicons name="shield-checkmark" size={18} color={COLORS.success} />
              <Text style={[styles.warrantyText, { color: colors.text }]}>{product.warranty}</Text>
            </View>
          </View>

          {/* Quantity Selector */}
          <View style={styles.qtySection}>
            <Text style={[styles.qtyLabel, { color: colors.text }]}>Quantity:</Text>
            <View style={[styles.qtyControls, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <TouchableOpacity
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                style={styles.qtyBtn}
              >
                <Ionicons name="remove" size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.qtyValue, { color: colors.text }]}>{quantity}</Text>
              <TouchableOpacity
                onPress={() => setQuantity(quantity + 1)}
                style={styles.qtyBtn}
              >
                <Ionicons name="add" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          <View style={styles.detailSection}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Description</Text>
            <Text style={[styles.descText, { color: colors.textSecondary }]}>
              {product.description}
            </Text>
          </View>

          {/* Key Features */}
          {product.features && product.features.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>Key Highlights</Text>
              {product.features.map((feat, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} style={styles.featureIcon} />
                  <Text style={[styles.featureText, { color: colors.text }]}>{feat}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Technical Specifications */}
          {product.specs && Object.keys(product.specs).length > 0 && (
            <View style={styles.detailSection}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>
                Technical Specifications
              </Text>
              <View style={[styles.specsTable, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                {Object.entries(product.specs).map(([specKey, specVal], idx) => (
                  <View
                    key={specKey}
                    style={[
                      styles.specRow,
                      { borderBottomColor: colors.border },
                      idx === Object.keys(product.specs).length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <Text style={[styles.specKey, { color: colors.textSecondary }]}>{specKey}</Text>
                    <Text style={[styles.specVal, { color: colors.text }]}>{specVal}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.consultBtn}
          onPress={handleWhatsAppConsult}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
          <Text style={styles.consultBtnText}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addToCartBtn}
          onPress={() => addToCart(product, quantity)}
          activeOpacity={0.8}
        >
          <Ionicons name="cart" size={18} color="#FFFFFF" />
          <Text style={styles.addToCartBtnText}>Add to Cart</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buyNowBtn}
          onPress={handleAddToCartAndCart}
          activeOpacity={0.8}
        >
          <Text style={styles.buyNowBtnText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  backBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  imageStage: {
    width: '100%',
    height: 260,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  floatingWishlist: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  wattageTag: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  wattageTagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  contentBody: {
    padding: SPACING.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 6,
  },
  subInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modelText: {
    fontSize: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingScore: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  reviewsCount: {
    fontSize: 11,
  },
  priceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  priceLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  priceMain: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: 13,
    textDecorationLine: 'line-through',
  },
  warrantyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 130,
  },
  warrantyText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  qtySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  qtyLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '700',
  },
  detailSection: {
    marginBottom: SPACING.lg,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  descText: {
    fontSize: 13,
    lineHeight: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  featureIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  featureText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  specsTable: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  specRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  specKey: {
    flex: 1.2,
    fontSize: 12,
  },
  specVal: {
    flex: 1.5,
    fontSize: 12,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    borderTopWidth: 1,
    gap: 8,
  },
  consultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#25D366',
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    height: 44,
    gap: 4,
  },
  consultBtnText: {
    color: '#25D366',
    fontSize: 12,
    fontWeight: '700',
  },
  addToCartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.md,
    height: 44,
    gap: 6,
  },
  addToCartBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  buyNowBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 44,
  },
  buyNowBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

