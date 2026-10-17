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
import { useNetwork } from '../context/NetworkContext';
import { useCart } from '../context/CartContext';
import { apiService } from '../services/api';
import { storageService } from '../services/storage';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';
import { ExtraCharge, CartItem } from '../types';

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
  const { isOffline } = useNetwork();
  const { cart, totalAmount, clearCart, updateCartItems } = useCart();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 10);
  const hasOutOfStockItems = cart.some(item => !item.product.inStock);

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

  // Parse numeric weight in kg from product
  const parseProductWeightKg = (product: any): number => {
    if (!product) return 0;
    const raw =
      product.weight ??
      product.specs?.['Weight'] ??
      product.specs?.['Filled Weight'] ??
      product.specs?.['Net Weight'] ??
      '';
    if (raw === undefined || raw === null || raw === '') return 0;

    if (typeof raw === 'number') {
      return raw > 0 ? raw : 0;
    }

    const str = String(raw).trim().toLowerCase();
    if (!str || str === '0') return 0;

    // Handle grams (e.g., "500 g", "500g")
    const gramMatch = str.match(/([\d\.]+)\s*g(?!m|ram)/);
    if (gramMatch && !str.includes('kg')) {
      const gVal = parseFloat(gramMatch[1]);
      return isNaN(gVal) ? 0 : gVal / 1000;
    }

    // Handle kilograms (e.g. "27.5 kg", "27.5kg", "25")
    const match = str.match(/([\d\.]+)/);
    if (match) {
      const val = parseFloat(match[1]);
      return isNaN(val) ? 0 : val;
    }
    return 0;
  };

  // Directus Settings State (e.g. delivery_charge, per_kg_charge)
  const [deliveryCharge, setDeliveryCharge] = useState<number>(150);
  const [perKgCharge, setPerKgCharge] = useState<number>(0);
  const [isLoadingDeliveryCharge, setIsLoadingDeliveryCharge] = useState<boolean>(true);

  // Pricing Integrity & Revalidation States
  const [isRevalidatingPricing, setIsRevalidatingPricing] = useState<boolean>(true);
  const [priceNotice, setPriceNotice] = useState<string | null>(null);

  // Fulfillment Method: 'delivery' (Doorstep) vs 'pickup' (Store)
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'delivery' | 'pickup'>('delivery');

  // Hydrate / sync weights for all cart items from API
  const [syncedWeights, setSyncedWeights] = useState<Record<string, number>>({});

  // 1st Fetch last_revalidate_time & Directus settings to guarantee pricing data integrity
  useEffect(() => {
    let isMounted = true;
    const checkPricingIntegrityAndSettings = async () => {
      setIsRevalidatingPricing(true);
      try {
        // Step 1: Read locally cached last_revalidate_time
        const storedRevalidateTime = await storageService.getLastRevalidateTime();

        // Step 2: 1st Fetch remote settings (singleton) from Directus with forceRefresh
        const settings = await apiService.getSettings(true);
        if (!isMounted) return;

        // Apply updated delivery charge & per_kg_charge
        if (settings.delivery_charge !== undefined && settings.delivery_charge !== null) {
          const dVal = Number(settings.delivery_charge);
          if (!isNaN(dVal)) setDeliveryCharge(dVal);
        }
        if (settings.per_kg_charge !== undefined && settings.per_kg_charge !== null) {
          const pVal = Number(settings.per_kg_charge);
          if (!isNaN(pVal)) setPerKgCharge(pVal);
        }
        setIsLoadingDeliveryCharge(false);

        const remoteRevalidateTime = settings.last_revalidate_time
          ? String(settings.last_revalidate_time)
          : null;

        // Step 3: Compare stored timestamp vs remote timestamp
        // If times do NOT match (or first visit), refetch products here to ensure pricing integrity!
        const isTimeMismatch =
          !storedRevalidateTime ||
          (remoteRevalidateTime !== null && storedRevalidateTime !== remoteRevalidateTime);

        if (isTimeMismatch && cart.length > 0) {
          const updatedCart: CartItem[] = [];
          const removedCallForPriceTitles: string[] = [];
          const priceChanges: { title: string; oldPrice: number; newPrice: number }[] = [];
          const newWeightMap: Record<string, number> = {};

          await Promise.all(
            cart.map(async (item) => {
              if (item.customPackage) {
                // System Builder packages have customized calculated components
                updatedCart.push(item);
                return;
              }

              try {
                const freshProduct = await apiService.getProductById(item.product.id);
                if (freshProduct) {
                  const oldPrice = item.product.price;
                  const newPrice = freshProduct.price;

                  // Update weight
                  const freshWeight = parseProductWeightKg(freshProduct);
                  if (freshWeight > 0) {
                    newWeightMap[item.id] = freshWeight;
                  }

                  // If price is 0, it's Call for Price and cannot be checked out online
                  if (newPrice <= 0) {
                    removedCallForPriceTitles.push(freshProduct.title || item.product.title);
                    return; // Dropped from checkout
                  }

                  if (oldPrice !== newPrice) {
                    priceChanges.push({
                      title: freshProduct.title || item.product.title,
                      oldPrice,
                      newPrice,
                    });
                  }

                  updatedCart.push({
                    ...item,
                    product: freshProduct,
                  });
                  return;
                }
              } catch (err) {
                console.warn('Failed to refetch product for checkout integrity:', item.product.id, err);
              }

              // Fallback: keep existing item if network fails for this item
              updatedCart.push(item);
            })
          );

          if (isMounted) {
            updateCartItems(updatedCart);
            if (Object.keys(newWeightMap).length > 0) {
              setSyncedWeights((prev) => ({ ...prev, ...newWeightMap }));
            }

            // Successfully refetched & verified: update stored revalidation time
            if (remoteRevalidateTime) {
              await storageService.saveLastRevalidateTime(remoteRevalidateTime);
            }

            if (removedCallForPriceTitles.length > 0) {
              const msg = `Items updated to 'Call for Price' (${removedCallForPriceTitles.join(
                ', '
              )}) were removed from online checkout.`;
              setPriceNotice(msg);
              Alert.alert('Items Unavailable Online', msg);
            } else if (priceChanges.length > 0) {
              const detail = priceChanges
                .map(
                  (p) =>
                    `• ${p.title}: ৳${p.oldPrice.toLocaleString()} → ৳${p.newPrice.toLocaleString()}`
                )
                .join('\n');
              const msg = `Pricing updated for ${priceChanges.length} item(s) to match current catalog rates.`;
              setPriceNotice(msg);
              Alert.alert('Pricing Updated', `${msg}\n\n${detail}`);
            }
          }
        } else if (remoteRevalidateTime && isMounted) {
          // Stored time matches remote time: data is intact!
          await storageService.saveLastRevalidateTime(remoteRevalidateTime);
        }
      } catch (err) {
        console.warn('Revalidation check failed on checkout:', err);
      } finally {
        if (isMounted) {
          setIsRevalidatingPricing(false);
          setIsLoadingDeliveryCharge(false);
        }
      }
    };

    checkPricingIntegrityAndSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync remaining weights if any item was missing
  useEffect(() => {
    let isMounted = true;
    const syncMissingWeights = async () => {
      const map: Record<string, number> = {};
      await Promise.all(
        cart.map(async (item) => {
          if (syncedWeights[item.id] !== undefined) return;
          const directWeight = parseProductWeightKg(item.product);
          if (directWeight > 0) {
            map[item.id] = directWeight;
          } else if (item.product?.id) {
            try {
              const fresh = await apiService.getProductById(item.product.id);
              if (fresh) {
                const w = parseProductWeightKg(fresh);
                if (w > 0) {
                  map[item.id] = w;
                }
              }
            } catch {
              // ignore
            }
          }
        })
      );
      if (isMounted && Object.keys(map).length > 0) {
        setSyncedWeights((prev) => ({ ...prev, ...map }));
      }
    };

    if (cart.length > 0) {
      syncMissingWeights();
    }
    return () => {
      isMounted = false;
    };
  }, [cart]);

  // Calculate total package weight of all cart items (kg * quantity)
  const totalCartWeightKg = cart.reduce((sum, item) => {
    const itemWeight = syncedWeights[item.id] ?? parseProductWeightKg(item.product);
    return sum + itemWeight * (item.quantity || 1);
  }, 0);

  // Delivery charge formula: delivery_charge + ( product weight * per_kg_charge )
  const baseDeliveryCharge = deliveryCharge;
  const weightCharge = perKgCharge > 0 ? Math.round(totalCartWeightKg * perKgCharge) : 0;

  // Pick up from store has 0 delivery charge
  const effectiveDeliveryCharge =
    fulfillmentMethod === 'pickup' ? 0 : baseDeliveryCharge + weightCharge;
  const grandTotal = totalAmount + effectiveDeliveryCharge;

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

    if (isSubmitting || isRevalidatingPricing || isOffline) {
      if (isOffline) {
        Alert.alert(
          'No Internet Connection',
          'Please connect to the internet to confirm and place your order.'
        );
      }
      return;
    }

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

    if (fulfillmentMethod === 'delivery' && !address.trim()) {
      Alert.alert('Delivery Address Required', 'Please enter your delivery or installation address.');
      return;
    }

    if (cart.length === 0) {
      Alert.alert('Cart Is Empty', 'Please add products to your cart before placing an order.');
      return;
    }

    if (hasOutOfStockItems) {
      const outOfStockTitles = cart
        .filter(item => !item.product.inStock)
        .map(item => item.product.title)
        .join('\n• ');
      Alert.alert(
        'Out of Stock Items in Order',
        `The following items are currently out of stock and cannot be purchased:\n\n• ${outOfStockTitles}\n\nPlease remove them from your cart to proceed with placing the order.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const weightLabel =
        totalCartWeightKg % 1 === 0 ? totalCartWeightKg : totalCartWeightKg.toFixed(1);

      const extraChargesList: ExtraCharge[] = [];
      if (fulfillmentMethod === 'delivery' && effectiveDeliveryCharge > 0) {
        if (weightCharge > 0) {
          extraChargesList.push({
            name: 'Base Delivery Charge',
            cost: String(baseDeliveryCharge),
          });
          extraChargesList.push({
            name: `Weight Charge (${weightLabel} kg @ ৳${perKgCharge}/kg)`,
            cost: String(weightCharge),
          });
        } else {
          extraChargesList.push({
            name: 'Base Delivery Charge',
            cost: String(effectiveDeliveryCharge),
          });
        }
      }

      const rawBaseAddress =
        fulfillmentMethod === 'pickup'
          ? (address.trim() || `Radical Engineering Showroom: ${APP_CONFIG.address}`)
          : address.trim();

      const cleanBaseAddress = rawBaseAddress.replace(/^\[Store Pickup\]\s*/i, '').trim();

      const fulfillmentSuffix =
        fulfillmentMethod === 'pickup'
          ? '\n[Special Notes: [Fullfillment: Store Pickup]]'
          : '\n[Special Note: [Fullfilment: Home Delivery]]';

      const orderAddress = `${cleanBaseAddress}${fulfillmentSuffix}`;

      const orderNotes = notes.trim() || undefined;

      const result = await apiService.createOrder({
        name: name.trim(),
        phone: norm,
        address: orderAddress,
        notes: orderNotes || undefined,
        total: grandTotal,
        deliveryCharge: effectiveDeliveryCharge,
        extraCharges: extraChargesList,
        items: cart.map((item) => ({
          id: item.product.id,
          productTitle: item.product.title,
          quantity: item.quantity,
          price: item.customPackage ? item.customPackage.estimatedCostBDT : item.product.price,
          inStock: item.product.inStock,
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

  const handleWhatsAppCheckout = () => {
    Keyboard.dismiss();
    if (cart.length === 0) return;

    if (hasOutOfStockItems) {
      Alert.alert(
        'Out of Stock Items in Order',
        'Please remove out-of-stock items before requesting an order quotation.'
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

    let message = `*Radical Engineering Order / Quotation Request*\n\n${itemsText}\n\n*Fulfillment:* ${
      fulfillmentMethod === 'pickup' ? 'Pick up from Store (Showroom)' : 'Home Delivery'
    }\n*Items Subtotal:* ৳${totalAmount.toLocaleString()}\n*Delivery Fee:* ${
      fulfillmentMethod === 'pickup'
        ? '৳0 (Store Pickup)'
        : effectiveDeliveryCharge > 0
        ? `৳${effectiveDeliveryCharge.toLocaleString()}`
        : 'Free'
    }\n*Total Payable:* ৳${grandTotal.toLocaleString()}`;

    if (phone) message += `\n\n*Phone:* ${phone}`;
    if (name) message += `\n*Customer:* ${name}`;
    if (fulfillmentMethod === 'pickup') {
      message += `\n*Store Location:* ${APP_CONFIG.address}`;
      if (address) message += `\n*Customer Note/Area:* ${address}`;
    } else {
      if (address) message += `\n*Delivery Address:* ${address}`;
    }
    if (notes) message += `\n*Special Notes:* ${notes}`;

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
          {/* Real-time Pricing Notice Banner if prices revalidated */}
          {priceNotice && (
            <View
              style={[
                styles.priceNoticeBanner,
                {
                  backgroundColor: isDark ? 'rgba(252, 185, 116, 0.12)' : '#FFFBEB',
                  borderColor: isDark ? 'rgba(252, 185, 116, 0.3)' : '#FDE68A',
                },
              ]}
            >
              <Ionicons name="information-circle" size={18} color={COLORS.warning} />
              <Text style={[styles.priceNoticeText, { color: colors.text }]}>
                {priceNotice}
              </Text>
              <TouchableOpacity
                onPress={() => setPriceNotice(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Offline Warning Banner on Checkout */}
          {isOffline && (
            <View
              style={[
                styles.offlineNoticeBanner,
                {
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
                },
              ]}
            >
              <Ionicons name="cloud-offline" size={20} color="#EF4444" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.offlineNoticeTitle, { color: '#EF4444' }]}>
                  You are currently offline
                </Text>
                <Text style={[styles.offlineNoticeSub, { color: colors.textSecondary }]}>
                  Please connect to the internet to verify pricing and place your order.
                </Text>
              </View>
            </View>
          )}

          {/* Section 0: Order Fulfillment Option (Delivery vs Pick up from Store) */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.headerIconWrap, { backgroundColor: isDark ? 'rgba(252, 185, 116, 0.15)' : '#F5EBE6' }]}>
                <Ionicons name="swap-horizontal-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Order Fulfillment</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                  Choose home delivery or collect in person
                </Text>
              </View>
            </View>

            <View style={styles.fulfillmentOptionsRow}>
              {/* Option 1: Doorstep Delivery */}
              <TouchableOpacity
                style={[
                  styles.fulfillmentOption,
                  {
                    backgroundColor:
                      fulfillmentMethod === 'delivery'
                        ? (isDark ? 'rgba(255, 107, 0, 0.15)' : '#FFF7ED')
                        : colors.surfaceVariant,
                    borderColor: fulfillmentMethod === 'delivery' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setFulfillmentMethod('delivery')}
                activeOpacity={0.8}
              >
                <View style={styles.fulfillmentRadioRow}>
                  <View
                    style={[
                      styles.radioCircle,
                      { borderColor: fulfillmentMethod === 'delivery' ? colors.primary : colors.textMuted },
                    ]}
                  >
                    {fulfillmentMethod === 'delivery' && (
                      <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                  <Ionicons
                    name="bicycle"
                    size={20}
                    color={fulfillmentMethod === 'delivery' ? colors.primary : colors.textSecondary}
                  />
                </View>
                <Text
                  style={[
                    styles.fulfillmentTitle,
                    { color: fulfillmentMethod === 'delivery' ? colors.primary : colors.text },
                  ]}
                >
                  Home Delivery
                </Text>
                <Text style={[styles.fulfillmentSub, { color: colors.textSecondary }]}>
                  {isLoadingDeliveryCharge
                    ? 'Calculating...'
                    : effectiveDeliveryCharge > 0
                    ? `৳${effectiveDeliveryCharge.toLocaleString()} fee`
                    : 'Free delivery'}
                </Text>
              </TouchableOpacity>

              {/* Option 2: Pick up from store */}
              <TouchableOpacity
                style={[
                  styles.fulfillmentOption,
                  {
                    backgroundColor:
                      fulfillmentMethod === 'pickup'
                        ? (isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5')
                        : colors.surfaceVariant,
                    borderColor: fulfillmentMethod === 'pickup' ? '#10B981' : colors.border,
                  },
                ]}
                onPress={() => setFulfillmentMethod('pickup')}
                activeOpacity={0.8}
              >
                <View style={styles.fulfillmentRadioRow}>
                  <View
                    style={[
                      styles.radioCircle,
                      { borderColor: fulfillmentMethod === 'pickup' ? '#10B981' : colors.textMuted },
                    ]}
                  >
                    {fulfillmentMethod === 'pickup' && (
                      <View style={[styles.radioDot, { backgroundColor: '#10B981' }]} />
                    )}
                  </View>
                  <Ionicons
                    name="storefront"
                    size={20}
                    color={fulfillmentMethod === 'pickup' ? '#10B981' : colors.textSecondary}
                  />
                </View>
                <Text
                  style={[
                    styles.fulfillmentTitle,
                    { color: fulfillmentMethod === 'pickup' ? (isDark ? '#34D399' : '#065F46') : colors.text },
                  ]}
                >
                  Pick up from Store
                </Text>
                <Text style={[styles.fulfillmentSub, { color: '#10B981', fontWeight: '700' }]}>
                  ৳0 Fee (Free)
                </Text>
              </TouchableOpacity>
            </View>

            {fulfillmentMethod === 'pickup' && (
              <View
                style={[
                  styles.pickupInfoBox,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#F0FDF4',
                    borderColor: isDark ? '#065F46' : '#BBF7D0',
                  },
                ]}
              >
                <Ionicons name="location-sharp" size={18} color="#10B981" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickupInfoTitle, { color: isDark ? '#34D399' : '#065F46' }]}>
                    Pickup Showroom Location
                  </Text>
                  <Text style={[styles.pickupInfoAddress, { color: colors.text }]}>
                    {APP_CONFIG.address}
                  </Text>
                  <Text style={[styles.pickupInfoHint, { color: colors.textSecondary }]}>
                    Delivery charge is ৳0. Our team will prepare your items for showroom collection.
                  </Text>
                </View>
              </View>
            )}

            {fulfillmentMethod === 'delivery' && !isLoadingDeliveryCharge && (
              <View
                style={[
                  styles.deliveryHelperCard,
                  {
                    backgroundColor: isDark ? 'rgba(255, 107, 0, 0.08)' : '#FFF7ED',
                    borderColor: isDark ? 'rgba(255, 107, 0, 0.25)' : '#FFEDD5',
                  },
                ]}
              >
                <View style={styles.deliveryHelperHeader}>
                  <Ionicons name="calculator-outline" size={15} color={colors.primary} />
                  <Text style={[styles.deliveryHelperTitle, { color: colors.primary }]}>
                    Delivery Charge Calculation
                  </Text>
                </View>
                {totalCartWeightKg > 0 && perKgCharge > 0 ? (
                  <>
                    <Text style={[styles.deliveryHelperFormula, { color: colors.text }]}>
                      Base Delivery (৳{baseDeliveryCharge.toLocaleString()}) + Weight (৳{perKgCharge}/kg × {totalCartWeightKg % 1 === 0 ? totalCartWeightKg : totalCartWeightKg.toFixed(1)} kg = ৳{weightCharge.toLocaleString()}) = ৳{effectiveDeliveryCharge.toLocaleString()}
                    </Text>
                    <Text style={[styles.deliveryHelperHint, { color: colors.textSecondary }]}>
                      Total shipment weight calculated from product specifications ({totalCartWeightKg % 1 === 0 ? totalCartWeightKg : totalCartWeightKg.toFixed(1)} kg)
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.deliveryHelperFormula, { color: colors.text }]}>
                      Base delivery charge: ৳{baseDeliveryCharge.toLocaleString()}
                    </Text>
                    {totalCartWeightKg > 0 ? (
                      <Text style={[styles.deliveryHelperHint, { color: colors.textSecondary }]}>
                        Total package weight: {totalCartWeightKg % 1 === 0 ? totalCartWeightKg : totalCartWeightKg.toFixed(1)} kg (standard delivery applied)
                      </Text>
                    ) : null}
                  </>
                )}
              </View>
            )}
          </View>

          {/* Section 1: Customer Shipping Form (Phone FIRST) */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.headerIconWrap, { backgroundColor: isDark ? 'rgba(252, 185, 116, 0.15)' : '#F5EBE6' }]}>
                <Ionicons name="person-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {fulfillmentMethod === 'pickup' ? 'Contact Details' : 'Shipping & Contact Details'}
                </Text>
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
                {fulfillmentMethod === 'delivery' ? (
                  <>
                    Delivery / Installation Address <Text style={{ color: COLORS.danger }}>*</Text>
                  </>
                ) : (
                  <>
                    Contact Address / Area <Text style={{ color: colors.textMuted }}>(Optional for store pickup)</Text>
                  </>
                )}
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  styles.textAreaWrap,
                  { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name={fulfillmentMethod === 'delivery' ? 'location-outline' : 'map-outline'}
                  size={18}
                  color={colors.textSecondary}
                  style={{ marginRight: 8, marginTop: 4 }}
                />
                <TextInput
                  placeholder={
                    fulfillmentMethod === 'delivery'
                      ? 'House, Road, Area, District (e.g. Station Road, Kishoreganj Sadar)'
                      : 'Your area or home address (Optional)'
                  }
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
          </View>

          {/* Section 2: Order Items Summary */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.headerIconWrap, { backgroundColor: isDark ? 'rgba(252, 185, 116, 0.15)' : '#F5EBE6' }]}>
                <Ionicons name="cube-outline" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Order Items ({cart.length})</Text>
            </View>

            {hasOutOfStockItems && (
              <View
                style={[
                  styles.outOfStockCheckoutBanner,
                  {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
                  },
                ]}
              >
                <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
                <Text style={[styles.outOfStockCheckoutBannerText, { color: COLORS.danger }]}>
                  This order contains out-of-stock items. Please return to your cart to remove them.
                </Text>
              </View>
            )}

            {cart.map((item, idx) => {
              const itemPrice = item.customPackage
                ? item.customPackage.estimatedCostBDT
                : item.product.price;
              const itemWeight = syncedWeights[item.id] ?? parseProductWeightKg(item.product);
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
                    {!item.product.inStock && (
                      <View
                        style={[
                          styles.outOfStockItemBadge,
                          { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' },
                        ]}
                      >
                        <Ionicons name="alert-circle" size={11} color={COLORS.danger} />
                        <Text style={[styles.outOfStockItemBadgeText, { color: COLORS.danger }]}>
                          Out of Stock
                        </Text>
                      </View>
                    )}
                    <View style={styles.itemMetaLine}>
                      <Text style={[styles.itemSub, { color: colors.textSecondary }]}>
                        {item.quantity} × {APP_CONFIG.currency} {itemPrice.toLocaleString()}
                      </Text>
                      {itemWeight > 0 ? (
                        <View style={[styles.itemWeightBadge, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                          <Ionicons name="scale-outline" size={11} color={colors.textSecondary} />
                          <Text style={[styles.itemWeightText, { color: colors.textSecondary }]}>
                            {itemWeight % 1 === 0 ? itemWeight : itemWeight.toFixed(1)} kg
                            {item.quantity > 1 ? ` (${(itemWeight * item.quantity) % 1 === 0 ? itemWeight * item.quantity : (itemWeight * item.quantity).toFixed(1)} kg)` : ''}
                          </Text>
                        </View>
                      ) : null}
                    </View>
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

            <View style={styles.billRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Items Subtotal</Text>
                {isRevalidatingPricing && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
              </View>
              <Text style={[styles.billValue, { color: colors.text }]}>
                {APP_CONFIG.currency} {totalAmount.toLocaleString()}
              </Text>
            </View>

            <View style={styles.billRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons
                  name={fulfillmentMethod === 'pickup' ? 'storefront-outline' : 'bicycle-outline'}
                  size={15}
                  color={colors.textSecondary}
                />
                <Text style={[styles.billLabel, { color: colors.textSecondary }]}>
                  {fulfillmentMethod === 'pickup' ? 'Store Pickup Fee' : 'Delivery Charge'}
                </Text>
              </View>
              {fulfillmentMethod === 'pickup' ? (
                <Text style={[styles.billValue, { color: '#10B981', fontWeight: '700' }]}>
                  ৳0 (Free)
                </Text>
              ) : isLoadingDeliveryCharge ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text
                  style={[
                    styles.billValue,
                    { color: effectiveDeliveryCharge > 0 ? colors.text : '#10B981' },
                  ]}
                >
                  {effectiveDeliveryCharge > 0 ? `${APP_CONFIG.currency} ${effectiveDeliveryCharge.toLocaleString()}` : 'Free Delivery'}
                </Text>
              )}
            </View>

            {/* Delivery Charge Formula Breakdown */}
            {fulfillmentMethod === 'delivery' && !isLoadingDeliveryCharge && (
              <View
                style={[
                  styles.billHelperRow,
                  { backgroundColor: isDark ? 'rgba(255, 107, 0, 0.08)' : '#FFF7ED' },
                ]}
              >
                <Ionicons name="information-circle-outline" size={13} color={colors.primary} />
                <Text style={[styles.billHelperText, { color: colors.primary }]}>
                  {totalCartWeightKg > 0 && perKgCharge > 0
                    ? `Base ৳${baseDeliveryCharge.toLocaleString()} + Weight (${totalCartWeightKg % 1 === 0 ? totalCartWeightKg : totalCartWeightKg.toFixed(1)} kg × ৳${perKgCharge}/kg = ৳${weightCharge.toLocaleString()})`
                    : `Base fee ৳${baseDeliveryCharge.toLocaleString()}${totalCartWeightKg > 0 ? ` • Total weight ${totalCartWeightKg % 1 === 0 ? totalCartWeightKg : totalCartWeightKg.toFixed(1)} kg` : ''}`}
                </Text>
              </View>
            )}

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
                {
                  backgroundColor: hasOutOfStockItems
                    ? (isDark ? '#475569' : '#CBD5E1')
                    : isOffline
                    ? (isDark ? '#334155' : '#94A3B8')
                    : colors.primary,
                  opacity: isSubmitting || isRevalidatingPricing || isOffline ? 0.75 : 1,
                },
              ]}
              onPress={handleSubmitOrder}
              disabled={isSubmitting || isRevalidatingPricing || isOffline}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <View style={styles.btnLoadingRow}>
                  <ActivityIndicator color={isDark ? '#260B00' : '#FFFFFF'} size="small" />
                  <Text style={[styles.submitOrderText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>
                    Placing Order...
                  </Text>
                </View>
              ) : isRevalidatingPricing ? (
                <View style={styles.btnLoadingRow}>
                  <ActivityIndicator color={isDark ? '#260B00' : '#FFFFFF'} size="small" />
                  <Text style={[styles.submitOrderText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>
                    Verifying Store Pricing...
                  </Text>
                </View>
              ) : isOffline ? (
                <View style={styles.btnLoadingRow}>
                  <Ionicons name="cloud-offline-outline" size={18} color="#FFFFFF" />
                  <Text style={[styles.submitOrderText, { color: '#FFFFFF' }]}>
                    Offline • Connect to Confirm Order
                  </Text>
                </View>
              ) : hasOutOfStockItems ? (
                <View style={styles.btnLoadingRow}>
                  <Ionicons name="alert-circle-outline" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                  <Text style={[styles.submitOrderText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Remove Out of Stock Items to Order
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
  fulfillmentOptionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  fulfillmentOption: {
    flex: 1,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    gap: 4,
  },
  fulfillmentRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fulfillmentTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  fulfillmentSub: {
    fontSize: 11,
    marginTop: 2,
  },
  pickupInfoBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: 12,
  },
  pickupInfoTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  pickupInfoAddress: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    marginBottom: 4,
  },
  pickupInfoHint: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  deliveryHelperCard: {
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: 10,
    gap: 4,
  },
  deliveryHelperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  deliveryHelperTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  deliveryHelperFormula: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  deliveryHelperHint: {
    fontSize: 11,
    lineHeight: 15,
  },
  itemMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  itemWeightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: RADIUS.xs,
  },
  itemWeightText: {
    fontSize: 10,
    fontWeight: '600',
  },
  billHelperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    marginTop: 2,
    marginBottom: 4,
  },
  billHelperText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  priceNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.xs,
  },
  priceNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  offlineNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.xs,
  },
  offlineNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  offlineNoticeSub: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  outOfStockCheckoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  outOfStockCheckoutBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  outOfStockItemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  outOfStockItemBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
