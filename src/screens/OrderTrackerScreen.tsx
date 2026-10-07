import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';
import { Order } from '../types';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';

interface OrderTrackerScreenProps {
  navigation: any;
}

export const OrderTrackerScreen: React.FC<OrderTrackerScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();

  const [query, setQuery] = useState('RE-2026-8841');
  const [order, setOrder] = useState<Order | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (searchStr?: string) => {
    const q = searchStr || query;
    if (!q.trim()) return;
    setHasSearched(true);
    const found = await apiService.trackOrder(q);
    setOrder(found);
  };

  const handleSupportCall = () => {
    Linking.openURL(`tel:${APP_CONFIG.hotline1Raw}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        showBack
        onBack={() => navigation.goBack()}
        title="Order Tracker"
        subtitle="Engineering & Delivery"
        onOpenCart={() => navigation.navigate('Cart')}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Search Box */}
        <View style={[styles.searchCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Track Installation Status</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Enter your Radical Order ID or registered mobile phone number.
          </Text>

          <View style={[styles.inputRow, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              placeholder="e.g. RE-2026-8841 or 01712..."
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              style={[styles.input, { color: colors.text }]}
              autoCapitalize="characters"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.trackBtn}
            onPress={() => handleSearch()}
            activeOpacity={0.85}
          >
            <Text style={styles.trackBtnText}>Track Order</Text>
          </TouchableOpacity>

          {/* Quick sample chips */}
          <View style={styles.sampleChipsRow}>
            <Text style={[styles.sampleLabel, { color: colors.textMuted }]}>Try sample:</Text>
            <TouchableOpacity
              onPress={() => {
                setQuery('RE-2026-8841');
                handleSearch('RE-2026-8841');
              }}
              style={[styles.sampleChip, { borderColor: colors.border }]}
            >
              <Text style={[styles.sampleChipText, { color: COLORS.primary }]}>RE-2026-8841</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setQuery('RE-2026-7219');
                handleSearch('RE-2026-7219');
              }}
              style={[styles.sampleChip, { borderColor: colors.border }]}
            >
              <Text style={[styles.sampleChipText, { color: COLORS.primary }]}>RE-2026-7219</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tracking Result */}
        {order ? (
          <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Order Header */}
            <View style={styles.orderHeader}>
              <View>
                <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                <Text style={[styles.customerInfo, { color: colors.textSecondary }]}>
                  {order.customerName} • {order.phone}
                </Text>
                <Text style={[styles.orderAddress, { color: colors.textMuted }]}>
                  📍 {order.address}
                </Text>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.statusText, { color: '#B45309' }]}>
                  {order.status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Items Summary */}
            <View style={[styles.itemsSummaryBox, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.itemsHeading, { color: colors.textSecondary }]}>Ordered Items:</Text>
              {order.items.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.quantity}x {item.productTitle}
                  </Text>
                  <Text style={[styles.itemPrice, { color: colors.text }]}>
                    ৳ {(item.price * item.quantity).toLocaleString()}
                  </Text>
                </View>
              ))}
              <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.totalLabel, { color: colors.text }]}>Total Amount:</Text>
                <Text style={[styles.totalValue, { color: COLORS.primary }]}>
                  ৳ {order.totalAmount.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Stepper Timeline */}
            <Text style={[styles.timelineHeading, { color: colors.text }]}>Installation Timeline</Text>
            <View style={styles.timeline}>
              {order.trackingSteps.map((step, index) => {
                const isLast = index === order.trackingSteps.length - 1;
                return (
                  <View key={index} style={styles.timelineStep}>
                    <View style={styles.stepIndicatorCol}>
                      <View
                        style={[
                          styles.stepDot,
                          step.completed
                            ? styles.dotCompleted
                            : step.current
                            ? styles.dotCurrent
                            : { backgroundColor: colors.border },
                        ]}
                      >
                        {step.completed ? (
                          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                        ) : step.current ? (
                          <View style={styles.currentInnerDot} />
                        ) : null}
                      </View>
                      {!isLast && (
                        <View
                          style={[
                            styles.stepLine,
                            { backgroundColor: step.completed ? COLORS.primary : colors.border },
                          ]}
                        />
                      )}
                    </View>

                    <View style={styles.stepContent}>
                      <View style={styles.stepTitleRow}>
                        <Text
                          style={[
                            styles.stepTitle,
                            { color: colors.text },
                            step.current && { color: COLORS.primary, fontWeight: '800' },
                          ]}
                        >
                          {step.title}
                        </Text>
                        <Text style={[styles.stepTimestamp, { color: colors.textMuted }]}>
                          {step.timestamp}
                        </Text>
                      </View>
                      <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                        {step.description}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Support Call Action */}
            <TouchableOpacity
              style={styles.supportCallBtn}
              onPress={handleSupportCall}
              activeOpacity={0.85}
            >
              <Ionicons name="call" size={16} color={COLORS.primary} />
              <Text style={styles.supportCallText}>Contact Logistics Desk: {APP_CONFIG.hotline1}</Text>
            </TouchableOpacity>
          </View>
        ) : hasSearched ? (
          <View style={[styles.notFoundBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="alert-circle-outline" size={40} color={COLORS.warning} />
            <Text style={[styles.notFoundTitle, { color: colors.text }]}>Order Not Found</Text>
            <Text style={[styles.notFoundSub, { color: colors.textSecondary }]}>
              No order matches "{query}". Please check the ID or contact Radical Engineering support.
            </Text>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  searchCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  trackBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: SPACING.sm + 4,
  },
  trackBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  sampleChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md - 2,
    gap: 6,
    flexWrap: 'wrap',
  },
  sampleLabel: {
    fontSize: 11,
  },
  sampleChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  sampleChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  resultCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  customerInfo: {
    fontSize: 12,
    marginTop: 2,
  },
  orderAddress: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  itemsSummaryBox: {
    padding: SPACING.sm + 4,
    borderRadius: RADIUS.md,
    marginVertical: SPACING.md,
  },
  itemsHeading: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    marginTop: 6,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  timelineHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  timeline: {
    paddingLeft: 4,
  },
  timelineStep: {
    flexDirection: 'row',
    minHeight: 56,
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 24,
    marginRight: 10,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCompleted: {
    backgroundColor: COLORS.success,
  },
  dotCurrent: {
    backgroundColor: COLORS.primary,
  },
  currentInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  stepLine: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  stepContent: {
    flex: 1,
    paddingBottom: 14,
  },
  stepTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepTimestamp: {
    fontSize: 10,
  },
  stepDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  supportCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginTop: SPACING.sm,
    gap: 6,
  },
  supportCallText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  notFoundBox: {
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    textAlign: 'center',
  },
  notFoundTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  notFoundSub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});

