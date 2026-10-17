import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';

interface CartScreenProps {
  navigation: any;
}

export const CartScreen: React.FC<CartScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { cart, removeFromCart, updateQuantity, clearCart, totalAmount } = useCart();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 10);

  const grandTotal = totalAmount;
  const hasOutOfStockItems = cart.some(item => !item.product.inStock);

  const handleProceedToCheckout = () => {
    if (hasOutOfStockItems) {
      const outOfStockTitles = cart
        .filter(item => !item.product.inStock)
        .map(item => item.product.title)
        .join('\n• ');
      Alert.alert(
        'Out of Stock Items in Cart',
        `The following items are out of stock and cannot be ordered:\n\n• ${outOfStockTitles}\n\nPlease remove them from your cart to proceed with checkout.`
      );
      return;
    }
    navigation.navigate('Checkout');
  };

  const handleWhatsAppCheckout = () => {
    if (cart.length === 0) return;

    if (hasOutOfStockItems) {
      Alert.alert(
        'Out of Stock Items in Cart',
        'Please remove out-of-stock items from your cart before requesting a quotation.'
      );
      return;
    }

    let itemsText = cart
      .map(
        (item, index) =>
          `${index + 1}. ${item.product.title} (x${item.quantity}) - ৳${(
            (item.customPackage ? item.customPackage.estimatedCostBDT : item.product.price) * item.quantity
          ).toLocaleString()}`
      )
      .join('\n');

    let message = `*Radical Engineering Order / Quotation Request*\n\n${itemsText}\n\n*Total Payable:* ৳${totalAmount.toLocaleString()}`;

    Linking.openURL(
      `https://wa.me/${APP_CONFIG.whatsappNumber.replace('+', '')}?text=${encodeURIComponent(message)}`
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        showBack
        onBack={() => navigation.goBack()}
        title="Quotation & Cart"
        subtitle={`${cart.length} items`}
      />

      {cart.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Your cart is empty</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Explore our high-efficiency solar panels, IPS systems, and batteries to get started.
          </Text>
          <TouchableOpacity
            style={[styles.browseBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Catalog' })}
          >
            <Text style={[styles.browseBtnText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>Browse Catalog</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {hasOutOfStockItems && (
            <View
              style={[
                styles.outOfStockCartBanner,
                {
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
                },
              ]}
            >
              <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
              <Text style={[styles.outOfStockCartBannerText, { color: COLORS.danger }]}>
                Items in your cart are currently out of stock. Please remove them before proceeding to checkout.
              </Text>
            </View>
          )}

          {/* Cart Items List */}
          {cart.map((item) => {
            const price = item.customPackage
              ? item.customPackage.estimatedCostBDT
              : item.product.price;
            return (
              <View
                key={item.id}
                style={[styles.cartItemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Image source={{ uri: item.product.image }} style={styles.itemImage} resizeMode="cover" />

                <View style={styles.itemDetails}>
                  <View style={styles.itemHeader}>
                    <Text style={[styles.itemBrand, { color: colors.textSecondary }]}>
                      {item.product.brand}
                    </Text>
                    <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                      <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
                    {item.product.title}
                  </Text>

                  {!item.product.inStock && (
                    <View
                      style={[
                        styles.outOfStockItemBadge,
                        { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' },
                      ]}
                    >
                      <Ionicons name="alert-circle" size={12} color={COLORS.danger} />
                      <Text style={[styles.outOfStockItemBadgeText, { color: COLORS.danger }]}>
                        Out of Stock • Remove to checkout
                      </Text>
                    </View>
                  )}

                  {item.customPackage && (
                    <View style={[styles.customBadge, { backgroundColor: isDark ? 'rgba(252, 185, 116, 0.15)' : '#F5EBE6' }]}>
                      <Text style={[styles.customBadgeText, { color: colors.primary }]}>Custom Sized IPS Package</Text>
                    </View>
                  )}

                  <View style={styles.priceAndQtyRow}>
                    <Text style={[styles.itemPrice, { color: colors.primary }]}>
                      {APP_CONFIG.currency} {price.toLocaleString()}
                    </Text>

                    <View style={[styles.qtyBox, { borderColor: colors.border, backgroundColor: colors.surfaceVariant }]}>
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.id, -1)}
                        style={styles.qtyBtn}
                      >
                        <Ionicons name="remove" size={14} color={colors.text} />
                      </TouchableOpacity>
                      <Text style={[styles.qtyText, { color: colors.text }]}>{item.quantity}</Text>
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.id, 1)}
                        style={styles.qtyBtn}
                      >
                        <Ionicons name="add" size={14} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Bill Summary */}
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Order Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Items</Text>
              <Text style={[styles.summaryVal, { color: colors.text }]}>
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </Text>
            </View>

            <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Total Amount</Text>
              <Text style={[styles.totalVal, { color: colors.primary }]}>
                {APP_CONFIG.currency} {totalAmount.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Order Actions */}
          <View style={styles.actionsCol}>
            <TouchableOpacity
              style={[
                styles.primaryCheckoutBtn,
                {
                  backgroundColor: hasOutOfStockItems
                    ? (isDark ? '#475569' : '#CBD5E1')
                    : colors.primary,
                },
              ]}
              onPress={handleProceedToCheckout}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.primaryCheckoutText,
                  {
                    color: hasOutOfStockItems
                      ? (isDark ? '#94A3B8' : '#64748B')
                      : isDark ? '#260B00' : '#FFFFFF',
                  },
                ]}
              >
                {hasOutOfStockItems ? 'Remove Out of Stock Items' : 'Proceed to Checkout'}
              </Text>
              <Ionicons
                name={hasOutOfStockItems ? 'alert-circle-outline' : 'arrow-forward'}
                size={18}
                color={
                  hasOutOfStockItems
                    ? (isDark ? '#94A3B8' : '#64748B')
                    : isDark ? '#260B00' : '#FFFFFF'
                }
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.whatsAppOrderBtn}
              onPress={handleWhatsAppCheckout}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
              <Text style={styles.whatsAppOrderText}>Instant WhatsApp Quotation</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 30 + bottomPadding }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: SPACING.md,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: SPACING.lg,
    lineHeight: 18,
  },
  browseBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.md,
  },
  browseBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  cartItemCard: {
    flexDirection: 'row',
    padding: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm + 2,
    alignItems: 'center',
  },
  itemImage: {
    width: 75,
    height: 75,
    borderRadius: RADIUS.sm,
    backgroundColor: '#E2E8F0',
  },
  itemDetails: {
    flex: 1,
    marginLeft: SPACING.sm + 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemBrand: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 2,
  },
  customBadge: {
    backgroundColor: COLORS.primaryLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 4,
  },
  customBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
  },
  priceAndQtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: '700',
  },
  summaryCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginTop: SPACING.md,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: SPACING.sm + 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: SPACING.sm + 2,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  actionsCol: {
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  primaryCheckoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    gap: 8,
  },
  primaryCheckoutText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  whatsAppOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    gap: 8,
  },
  whatsAppOrderText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  outOfStockCartBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  outOfStockCartBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  outOfStockItemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  outOfStockItemBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});

