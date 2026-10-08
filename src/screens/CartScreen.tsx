import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Linking,
  Platform,
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

  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');

  const shippingCost = cart.length > 0 ? 500 : 0;
  const grandTotal = totalAmount + shippingCost;

  const handleWhatsAppCheckout = () => {
    if (cart.length === 0) return;

    let itemsText = cart
      .map(
        (item, index) =>
          `${index + 1}. ${item.product.title} (x${item.quantity}) - ৳${(
            (item.customPackage ? item.customPackage.estimatedCostBDT : item.product.price) * item.quantity
          ).toLocaleString()}`
      )
      .join('\n');

    let message = `*Radical Engineering Order / Quotation Request*\n\n${itemsText}\n\n*Subtotal:* ৳${totalAmount.toLocaleString()}\n*Estimated Shipping/Site Transit:* ৳${shippingCost.toLocaleString()}\n*Grand Total:* ৳${grandTotal.toLocaleString()}`;

    if (customerName) message += `\n\n*Customer:* ${customerName}`;
    if (customerPhone) message += `\n*Phone:* ${customerPhone}`;
    if (customerAddress) message += `\n*Address:* ${customerAddress}`;
    if (notes) message += `\n*Notes:* ${notes}`;

    Linking.openURL(
      `https://wa.me/${APP_CONFIG.whatsappNumber.replace('+', '')}?text=${encodeURIComponent(message)}`
    );
  };

  const handleDirectSubmitOrder = () => {
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      Alert.alert('Required Fields', 'Please enter your Name, Phone Number, and Delivery Address.');
      return;
    }

    Alert.alert(
      'Order Submitted Successfully!',
      `Thank you, ${customerName}! Your order of ৳${grandTotal.toLocaleString()} has been received. Our engineering desk will call ${customerPhone} to confirm delivery and scheduling.`,
      [
        {
          text: 'OK',
          onPress: () => {
            clearCart();
            setCheckoutVisible(false);
            navigation.navigate('MainTabs', { screen: 'Home' });
          },
        },
      ]
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
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Equipment Subtotal</Text>
              <Text style={[styles.summaryVal, { color: colors.text }]}>
                {APP_CONFIG.currency} {totalAmount.toLocaleString()}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Estimated Courier / Site Transit
              </Text>
              <Text style={[styles.summaryVal, { color: colors.text }]}>
                {APP_CONFIG.currency} {shippingCost.toLocaleString()}
              </Text>
            </View>

            <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Grand Total</Text>
              <Text style={[styles.totalVal, { color: colors.primary }]}>
                {APP_CONFIG.currency} {grandTotal.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Order Actions */}
          <View style={styles.actionsCol}>
            <TouchableOpacity
              style={[styles.primaryCheckoutBtn, { backgroundColor: colors.primary }]}
              onPress={() => setCheckoutVisible(true)}
              activeOpacity={0.85}
            >
              <Text style={[styles.primaryCheckoutText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>Proceed to Checkout</Text>
              <Ionicons name="arrow-forward" size={18} color={isDark ? '#260B00' : '#FFFFFF'} />
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

      {/* Checkout Modal */}
      <Modal
        visible={checkoutVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCheckoutVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.surface,
                paddingBottom: bottomPadding + SPACING.md,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Checkout & Delivery</Text>
              <TouchableOpacity onPress={() => setCheckoutVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Customer Full Name *</Text>
                <TextInput
                  placeholder="e.g. Ashik Ali Shanto"
                  placeholderTextColor={colors.textMuted}
                  value={customerName}
                  onChangeText={setCustomerName}
                  style={[styles.formInput, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Mobile Phone Number *</Text>
                <TextInput
                  placeholder="e.g. 01760195100"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                  style={[styles.formInput, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Delivery / Installation Address *</Text>
                <TextInput
                  placeholder="House, Road, Area, District (e.g. Kishoreganj Sadar)"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={2}
                  value={customerAddress}
                  onChangeText={setCustomerAddress}
                  style={[styles.formInput, styles.textArea, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Special Notes (Optional)</Text>
                <TextInput
                  placeholder="Site survey timing, roof type, or wiring requirements"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={2}
                  value={notes}
                  onChangeText={setNotes}
                  style={[styles.formInput, styles.textArea, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
                />
              </View>

              <View style={[styles.modalTotalBox, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.modalTotalLabel, { color: colors.textSecondary }]}>Total Payable Amount:</Text>
                <Text style={[styles.modalTotalValue, { color: colors.primary }]}>
                  {APP_CONFIG.currency} {grandTotal.toLocaleString()}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.confirmOrderBtn, { backgroundColor: colors.primary }]}
                onPress={handleDirectSubmitOrder}
                activeOpacity={0.85}
              >
                <Text style={[styles.confirmOrderText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>Confirm & Submit Order</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalWhatsappBtn}
                onPress={handleWhatsAppCheckout}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                <Text style={styles.modalWhatsappText}>Send Order via WhatsApp</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  formGroup: {
    marginBottom: SPACING.sm + 4,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  formInput: {
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
    paddingVertical: 8,
  },
  modalTotalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginVertical: SPACING.md,
  },
  modalTotalLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalTotalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.primary,
  },
  confirmOrderBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  confirmOrderText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  modalWhatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  modalWhatsappText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});

