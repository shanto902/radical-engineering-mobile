import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Keyboard,
  Linking,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Header } from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { apiService } from '../services/api';
import { storageService } from '../services/storage';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';

interface CheckoutScreenProps {
  navigation: any;
}

// Particle for celebration animation
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: string;
}

const CELEBRATION_COLORS = [
  '#FF6B00',
  '#10B981',
  '#3B82F6',
  '#F59E0B',
  '#EC4899',
  '#8B5CF6',
  '#06B6D4',
];

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { cart, totalAmount, clearCart } = useCart();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 10);

  // Form Fields (Phone FIRST as requested)
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isCustomerInfoLoaded, setIsCustomerInfoLoaded] = useState(false);

  // Load saved customer information from local storage on mount
  useEffect(() => {
    let isMounted = true;
    const loadSavedCustomerInfo = async () => {
      try {
        const saved = await storageService.getCheckoutCustomerInfo();
        if (saved && isMounted) {
          if (saved.phone) setPhone(saved.phone);
          if (saved.name) setName(saved.name);
          if (saved.address) setAddress(saved.address);
          if (saved.notes) setNotes(saved.notes);
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) {
          setIsCustomerInfoLoaded(true);
        }
      }
    };

    loadSavedCustomerInfo();
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-save customer information to local storage on changes
  useEffect(() => {
    if (isCustomerInfoLoaded) {
      if (phone.trim() || name.trim() || address.trim() || notes.trim()) {
        storageService.saveCheckoutCustomerInfo({
          phone: phone.trim(),
          name: name.trim(),
          address: address.trim(),
          notes: notes.trim(),
        });
      }
    }
  }, [phone, name, address, notes, isCustomerInfoLoaded]);

  // Lookup & Submit States
  const [customerLookupStatus, setCustomerLookupStatus] = useState<
    'idle' | 'searching' | 'found' | 'not_found'
  >('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrderData, setPlacedOrderData] = useState<{
    orderId: string;
    customerName: string;
    phone: string;
    total: number;
  } | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  // Animation values
  const overlayFadeAnim = useRef(new Animated.Value(0)).current;
  const modalScaleAnim = useRef(new Animated.Value(0.3)).current;
  const checkmarkScaleAnim = useRef(new Animated.Value(0)).current;
  const particlesAnim = useRef(new Animated.Value(0)).current;

  // Generate confetti particles
  const particles = useRef<Particle[]>(
    Array.from({ length: 28 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 280,
      y: -Math.random() * 220 - 40,
      size: Math.floor(Math.random() * 6) + 6,
      color: CELEBRATION_COLORS[i % CELEBRATION_COLORS.length],
      rotation: `${Math.floor(Math.random() * 360)}deg`,
    }))
  ).current;

  const grandTotal = totalAmount;

  // Phone input handler with auto-lookup on 11 digits
  const handlePhoneChange = async (text: string) => {
    setPhone(text);
    const clean = text.replace(/[\s\-\(\)]/g, '');
    let norm = clean;
    if (norm.startsWith('+880')) norm = '0' + norm.substring(4);
    else if (norm.startsWith('880')) norm = '0' + norm.substring(3);

    if (norm.length === 11 && /^01[0-9]{9}$/.test(norm)) {
      setCustomerLookupStatus('searching');
      try {
        const previousOrder = await apiService.getLastOrderByPhone(norm);
        if (previousOrder) {
          setCustomerLookupStatus('found');
          if (previousOrder.name) setName(previousOrder.name);
          if (previousOrder.address) setAddress(previousOrder.address);
        } else {
          setCustomerLookupStatus('not_found');
        }
      } catch {
        setCustomerLookupStatus('idle');
      }
    } else {
      if (customerLookupStatus !== 'idle') {
        setCustomerLookupStatus('idle');
      }
    }
  };

  // Launch celebratory purchase animation when order is created
  useEffect(() => {
    if (placedOrderData) {
      overlayFadeAnim.setValue(0);
      modalScaleAnim.setValue(0.3);
      checkmarkScaleAnim.setValue(0);
      particlesAnim.setValue(0);

      Animated.sequence([
        // Step 1: Fade in overlay and scale in modal
        Animated.parallel([
          Animated.timing(overlayFadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.spring(modalScaleAnim, {
            toValue: 1,
            friction: 6,
            tension: 50,
            useNativeDriver: true,
          }),
        ]),
        // Step 2: Spring the checkmark badge and burst particles
        Animated.parallel([
          Animated.spring(checkmarkScaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(particlesAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [placedOrderData]);

  // Copy order ID
  const handleCopyOrderId = async (id: string) => {
    try {
      await Clipboard.setStringAsync(id);
      setCopiedOrderId(true);
      setTimeout(() => setCopiedOrderId(false), 2000);
    } catch {
      // ignore
    }
  };

  // Submit Order with 1-tap responsiveness
  const handleSubmitOrder = async () => {
    // Immediately dismiss keyboard on first tap
    Keyboard.dismiss();

    if (isSubmitting) return;

    const clean = phone.replace(/[\s\-\(\)]/g, '');
    let norm = clean;
    if (norm.startsWith('+880')) norm = '0' + norm.substring(4);
    else if (norm.startsWith('880')) norm = '0' + norm.substring(3);

    if (!norm || !/^01[0-9]{9}$/.test(norm)) {
      Alert.alert(
        'Valid Phone Required',
        'Please enter a valid 11-digit Bangladeshi mobile number (e.g. 017xxxxxxxx).'
      );
      return;
    }

    if (!name.trim()) {
      Alert.alert('Customer Name Required', 'Please enter your full name to proceed.');
      return;
    }

    if (!address.trim()) {
      Alert.alert('Delivery Address Required', 'Please enter your delivery or installation address.');
      return;
    }

    if (cart.length === 0) {
      Alert.alert('Cart Is Empty', 'Please add products to your cart before placing an order.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await apiService.createOrder({
        name: name.trim(),
        phone: norm,
        address: address.trim(),
        notes: notes.trim() || undefined,
        total: grandTotal,
        items: cart.map((item) => ({
          id: item.product.id,
          productTitle: item.product.title,
          quantity: item.quantity,
          price: item.customPackage ? item.customPackage.estimatedCostBDT : item.product.price,
        })),
      });

      if (result.success && result.orderId) {
        const orderId = result.orderId;
        const buyerName = name.trim();
        const buyerPhone = norm;
        const buyerTotal = grandTotal;

        // Persist customer information to local device storage
        storageService.saveCheckoutCustomerInfo({
          phone: buyerPhone,
          name: buyerName,
          address: address.trim(),
          notes: notes.trim(),
        });

        // Save order to device order history
        storageService.saveLocalPlacedOrder({
          orderId,
          customerName: buyerName,
          phone: buyerPhone,
          total: buyerTotal,
          date: new Date().toISOString(),
          itemsCount: cart.reduce((sum, item) => sum + item.quantity, 0),
        });

        // Clear cart and show animation modal
        clearCart();
        setPlacedOrderData({
          orderId,
          customerName: buyerName,
          phone: buyerPhone,
          total: buyerTotal,
        });
      } else {
        Alert.alert(
          'Order Submission Failed',
          result.error || 'Could not place order. Please try again or order via WhatsApp.'
        );
      }
    } catch (err: any) {
      console.error('Order creation error:', err);
      Alert.alert(
        'Connection Error',
        'Could not reach server. Please check your internet connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // WhatsApp Checkout Option
  const handleWhatsAppCheckout = () => {
    Keyboard.dismiss();
    if (cart.length === 0) return;

    let itemsText = cart
      .map(
        (item, index) =>
          `${index + 1}. ${item.product.title} (x${item.quantity}) - ৳${(
            (item.customPackage ? item.customPackage.estimatedCostBDT : item.product.price) * item.quantity
          ).toLocaleString()}`
      )
      .join('\n');

    let message = `*Radical Engineering Order / Quotation Request*\n\n${itemsText}\n\n*Total Payable:* ৳${totalAmount.toLocaleString()}`;

    if (phone) message += `\n\n*Phone:* ${phone}`;
    if (name) message += `\n*Customer:* ${name}`;
    if (address) message += `\n*Address:* ${address}`;
    if (notes) message += `\n*Notes:* ${notes}`;

    Linking.openURL(
      `https://wa.me/${APP_CONFIG.whatsappNumber.replace('+', '')}?text=${encodeURIComponent(message)}`
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        showBack
        onBack={() => navigation.goBack()}
        title="Checkout & Delivery"
        subtitle={`${cart.length} items • ৳${grandTotal.toLocaleString()}`}
      />

      {cart.length === 0 && !placedOrderData ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Your cart is empty</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Add solar panels, inverters, or battery packages to proceed with checkout.
          </Text>
          <TouchableOpacity
            style={[styles.browseBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Catalog' })}
          >
            <Text style={[styles.browseBtnText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>
              Browse Catalog
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + bottomPadding }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Section 1: Customer Shipping Form (Phone FIRST) */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.headerIconWrap, { backgroundColor: isDark ? 'rgba(252, 185, 116, 0.15)' : '#F5EBE6' }]}>
                <Ionicons name="person-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Shipping & Contact Details</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                  {phone || name || address
                    ? 'Saved on this phone for faster checkout'
                    : 'Enter phone first to auto-fill previous orders'}
                </Text>
              </View>
              {(phone || name || address) && (
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      'Clear Saved Details',
                      'Do you want to clear your saved contact and shipping information from this phone?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Clear',
                          style: 'destructive',
                          onPress: () => {
                            setPhone('');
                            setName('');
                            setAddress('');
                            setNotes('');
                            setCustomerLookupStatus('idle');
                            storageService.clearCheckoutCustomerInfo();
                          },
                        },
                      ]
                    );
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.clearHeaderBtn}
                >
                  <Ionicons name="trash-outline" size={13} color={colors.textSecondary} />
                  <Text style={[styles.clearHeaderText, { color: colors.textSecondary }]}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Field 1: Phone Number (FIRST) */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Mobile Phone Number <Text style={{ color: COLORS.danger }}>*</Text>
                </Text>
                {customerLookupStatus === 'searching' && (
                  <View style={styles.lookupBadge}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.lookupText, { color: colors.primary }]}>Searching...</Text>
                  </View>
                )}
                {customerLookupStatus === 'found' && (
                  <View style={[styles.lookupBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7' }]}>
                    <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                    <Text style={[styles.lookupText, { color: '#16A34A' }]}>Auto-filled!</Text>
                  </View>
                )}
              </View>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: customerLookupStatus === 'found' ? '#16A34A' : colors.border,
                  },
                ]}
              >
                <Ionicons name="call-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <TextInput
                  placeholder="01XXXXXXXXX (e.g. 01760195100)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={handlePhoneChange}
                  style={[styles.input, { color: colors.text }]}
                  returnKeyType="next"
                />
              </View>
              <Text style={[styles.fieldHint, { color: colors.textMuted }]}>
                11-digit Bangladeshi mobile number
              </Text>
            </View>

            {/* Field 2: Full Name */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                Customer Full Name <Text style={{ color: COLORS.danger }}>*</Text>
              </Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                <Ionicons name="person-circle-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <TextInput
                  placeholder="e.g. Ashik Ali Shanto"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  style={[styles.input, { color: colors.text }]}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Field 3: Address */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                Delivery / Installation Address <Text style={{ color: COLORS.danger }}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  styles.textAreaWrap,
                  { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={colors.textSecondary}
                  style={{ marginRight: 8, marginTop: 4 }}
                />
                <TextInput
                  placeholder="House, Road, Area, District (e.g. Station Road, Kishoreganj Sadar)"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  value={address}
                  onChangeText={setAddress}
                  style={[styles.input, styles.textArea, { color: colors.text }]}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Field 4: Special Notes */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Special Notes (Optional)</Text>
              <View
                style={[
                  styles.inputWrap,
                  styles.textAreaWrap,
                  { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={colors.textSecondary}
                  style={{ marginRight: 8, marginTop: 4 }}
                />
                <TextInput
                  placeholder="Site survey time, roof tin/concrete type, or wiring requirements"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={2}
                  value={notes}
                  onChangeText={setNotes}
                  style={[styles.input, styles.textArea, { color: colors.text }]}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          {/* Section 2: Order Items Summary */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.headerIconWrap, { backgroundColor: isDark ? 'rgba(252, 185, 116, 0.15)' : '#F5EBE6' }]}>
                <Ionicons name="cube-outline" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Order Items ({cart.length})</Text>
            </View>

            {cart.map((item, idx) => {
              const itemPrice = item.customPackage
                ? item.customPackage.estimatedCostBDT
                : item.product.price;
              return (
                <View
                  key={item.id}
                  style={[
                    styles.itemRow,
                    idx < cart.length - 1 && [styles.itemDivider, { borderBottomColor: colors.border }],
                  ]}
                >
                  <Image source={{ uri: item.product.image }} style={styles.itemImage} resizeMode="cover" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
                      {item.product.title}
                    </Text>
                    <Text style={[styles.itemSub, { color: colors.textSecondary }]}>
                      {item.quantity} × {APP_CONFIG.currency} {itemPrice.toLocaleString()}
                    </Text>
                  </View>
                  <Text style={[styles.itemTotal, { color: colors.text }]}>
                    {APP_CONFIG.currency} {(itemPrice * item.quantity).toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Section 3: Billing & Cost Breakdown */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.headerIconWrap, { backgroundColor: isDark ? 'rgba(252, 185, 116, 0.15)' : '#F5EBE6' }]}>
                <Ionicons name="receipt-outline" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Bill Summary</Text>
            </View>

            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Total Order Items</Text>
              <Text style={[styles.billValue, { color: colors.text }]}>
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </Text>
            </View>

            <View style={[styles.billTotalRow, { borderTopColor: colors.border }]}>
              <View>
                <Text style={[styles.billTotalLabel, { color: colors.text }]}>Total Payable Amount</Text>
                <Text style={[styles.billTotalHint, { color: colors.textMuted }]}>Cash on Delivery / Direct Bank</Text>
              </View>
              <Text style={[styles.billTotalValue, { color: colors.primary }]}>
                {APP_CONFIG.currency} {grandTotal.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Section 4: Action Buttons (Optimized for 1-tap submission) */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[
                styles.submitOrderBtn,
                { backgroundColor: colors.primary, opacity: isSubmitting ? 0.75 : 1 },
              ]}
              onPress={handleSubmitOrder}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <View style={styles.btnLoadingRow}>
                  <ActivityIndicator color={isDark ? '#260B00' : '#FFFFFF'} size="small" />
                  <Text style={[styles.submitOrderText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>
                    Placing Order...
                  </Text>
                </View>
              ) : (
                <View style={styles.btnLoadingRow}>
                  <Ionicons name="shield-checkmark" size={18} color={isDark ? '#260B00' : '#FFFFFF'} />
                  <Text style={[styles.submitOrderText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>
                    Confirm & Place Order
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color={isDark ? '#260B00' : '#FFFFFF'} />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.whatsAppOrderBtn}
              onPress={handleWhatsAppCheckout}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
              <Text style={styles.whatsAppOrderText}>Instant WhatsApp Order / Quotation</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Full-Screen Purchase Celebration Animation Overlay */}
      {placedOrderData && (
        <Animated.View style={[styles.celebrationOverlay, { opacity: overlayFadeAnim }]}>
          {/* Confetti Particles Burst */}
          <View style={styles.particlesContainer} pointerEvents="none">
            {particles.map((p) => {
              const translateX = particlesAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, p.x],
              });
              const translateY = particlesAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, p.y],
              });
              const particleOpacity = particlesAnim.interpolate({
                inputRange: [0, 0.7, 1],
                outputRange: [1, 0.9, 0],
              });

              return (
                <Animated.View
                  key={p.id}
                  style={[
                    styles.particle,
                    {
                      width: p.size,
                      height: p.size,
                      borderRadius: p.size / 2,
                      backgroundColor: p.color,
                      transform: [{ translateX }, { translateY }, { rotate: p.rotation }],
                      opacity: particleOpacity,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Animated Success Card */}
          <Animated.View
            style={[
              styles.successCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                transform: [{ scale: modalScaleAnim }],
              },
            ]}
          >
            {/* Animated Checkmark Badge */}
            <Animated.View
              style={[
                styles.successIconWrapper,
                {
                  transform: [{ scale: checkmarkScaleAnim }],
                },
              ]}
            >
              <Ionicons name="checkmark-circle" size={72} color="#16A34A" />
            </Animated.View>

            <Text style={[styles.successTitle, { color: colors.text }]}>Order Placed Successfully!</Text>
            <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
              Thank you, <Text style={{ fontWeight: '700', color: colors.text }}>{placedOrderData.customerName}</Text>! Your equipment order has been registered in our system.
            </Text>

            {/* Order ID Badge with Copy Option */}
            <TouchableOpacity
              style={[styles.orderIdBadge, { backgroundColor: isDark ? 'rgba(252, 185, 116, 0.15)' : '#F5EBE6' }]}
              onPress={() => handleCopyOrderId(placedOrderData.orderId)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.orderIdLabel, { color: colors.textSecondary }]}>Order ID:</Text>
                <Text style={[styles.orderIdValue, { color: colors.primary }]}>
                  #{placedOrderData.orderId}
                </Text>
              </View>
              <View style={styles.copyBtnWrap}>
                <Ionicons
                  name={copiedOrderId ? 'checkmark' : 'copy-outline'}
                  size={14}
                  color={copiedOrderId ? '#16A34A' : colors.primary}
                />
                <Text style={[styles.copyText, { color: copiedOrderId ? '#16A34A' : colors.primary }]}>
                  {copiedOrderId ? 'Copied' : 'Copy'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Total summary info */}
            <View style={[styles.orderSummaryBox, { backgroundColor: colors.surfaceVariant }]}>
              <View style={styles.summaryInfoRow}>
                <Text style={[styles.summaryInfoLabel, { color: colors.textSecondary }]}>Total Amount:</Text>
                <Text style={[styles.summaryInfoValue, { color: colors.primary }]}>
                  {APP_CONFIG.currency} {placedOrderData.total.toLocaleString()}
                </Text>
              </View>
              <View style={styles.summaryInfoRow}>
                <Text style={[styles.summaryInfoLabel, { color: colors.textSecondary }]}>Contact Phone:</Text>
                <Text style={[styles.summaryInfoValue, { color: colors.text }]}>{placedOrderData.phone}</Text>
              </View>
              <View style={styles.summaryInfoRow}>
                <Text style={[styles.summaryInfoLabel, { color: colors.textSecondary }]}>Status:</Text>
                <View style={styles.statusPill}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>PENDING CONFIRMATION</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.deliveryNote, { color: colors.textMuted }]}>
              Our engineering desk will contact you shortly to confirm delivery schedules and site requirements.
            </Text>

            {/* Navigation buttons */}
            <View style={styles.successActionsCol}>
              <TouchableOpacity
                style={[styles.trackOrderBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  const id = placedOrderData.orderId;
                  setPlacedOrderData(null);
                  navigation.replace('OrderTracker', { query: id });
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="search" size={16} color={isDark ? '#260B00' : '#FFFFFF'} />
                <Text style={[styles.trackOrderText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>
                  Track Order Timeline
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.homeBtn, { borderColor: colors.border }]}
                onPress={() => {
                  setPlacedOrderData(null);
                  navigation.navigate('MainTabs', { screen: 'Home' });
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.homeBtnText, { color: colors.text }]}>Continue Shopping</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
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
    gap: SPACING.md,
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.md,
  },
  browseBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: SPACING.md,
  },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  clearHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
  },
  clearHeaderText: {
    fontSize: 11,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: SPACING.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  lookupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  lookupText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 6,
  },
  textAreaWrap: {
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  textArea: {
    minHeight: 56,
  },
  fieldHint: {
    fontSize: 11,
    marginTop: 4,
    marginLeft: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  itemDivider: {
    borderBottomWidth: 1,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    backgroundColor: '#F3F4F6',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemSub: {
    fontSize: 12,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '700',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  billLabel: {
    fontSize: 13,
  },
  billValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  billTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 8,
  },
  billTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  billTotalHint: {
    fontSize: 11,
    marginTop: 2,
  },
  billTotalValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  actionsContainer: {
    gap: 10,
    marginTop: 6,
  },
  submitOrderBtn: {
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitOrderText: {
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
    fontSize: 13,
    fontWeight: '700',
  },
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    zIndex: 999,
  },
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
  },
  successCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconWrapper: {
    marginBottom: 10,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  orderIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    marginVertical: 14,
  },
  orderIdLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderIdValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  copyBtnWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  orderSummaryBox: {
    width: '100%',
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  summaryInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryInfoLabel: {
    fontSize: 12,
  },
  summaryInfoValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3B82F6',
  },
  deliveryNote: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  successActionsCol: {
    width: '100%',
    gap: 10,
  },
  trackOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  trackOrderText: {
    fontSize: 14,
    fontWeight: '700',
  },
  homeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  homeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
