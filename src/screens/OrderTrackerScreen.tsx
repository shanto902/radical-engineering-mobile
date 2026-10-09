import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Header } from "../components/Header";
import { useTheme } from "../context/ThemeContext";
import { apiService } from "../services/api";
import { storageService } from "../services/storage";
import { TrackedOrder } from "../types";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import { APP_CONFIG } from "../constants/config";

interface OrderTrackerScreenProps {
  navigation: any;
  route?: any;
}

const STATUS_STEPS = [
  "Pending",
  "Placed",
  "Processing",
  "Shipped",
  "Delivered",
];

function formatOrderDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${month} ${day}, ${year} • ${hours}:${minutes} ${ampm}`;
  } catch {
    return dateStr;
  }
}

export const OrderTrackerScreen: React.FC<OrderTrackerScreenProps> = ({
  navigation,
  route,
}) => {
  const { colors, isDark } = useTheme();

  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const paramQuery = route?.params?.query || route?.params?.orderId;
    if (paramQuery && typeof paramQuery === "string") {
      const trimmed = paramQuery.trim();
      setQuery(trimmed);
      handleSearch(trimmed);
    } else {
      // Check if user has a saved customer phone on this device
      storageService.getCheckoutCustomerInfo().then((saved) => {
        if (saved?.phone) {
          setQuery((prev) => (prev ? prev : saved.phone));
        }
      });
    }
  }, [route?.params?.query, route?.params?.orderId]);

  const handleCopyOrderId = async (orderId: string) => {
    try {
      await Clipboard.setStringAsync(orderId);
      setCopiedOrderId(orderId);
      setTimeout(() => {
        setCopiedOrderId((prev) => (prev === orderId ? null : prev));
      }, 2000);
    } catch (err) {
      console.warn("Failed to copy order ID:", err);
    }
  };

  const getStepIndex = (status: string) => {
    return STATUS_STEPS.findIndex(
      (step) => step.toLowerCase() === status.toLowerCase(),
    );
  };

  const getStatusMeta = (status: string) => {
    const s = (status || "").toLowerCase().trim();
    switch (s) {
      case "delivered":
        return {
          label: "DELIVERED",
          color: "#16A34A",
          bgColor: isDark ? "rgba(22, 163, 74, 0.2)" : "#DCFCE7",
        };
      case "processing":
        return {
          label: "PROCESSING",
          color: "#D97706",
          bgColor: isDark ? "rgba(217, 119, 6, 0.2)" : "#FEF3C7",
        };
      case "placed":
        return {
          label: "PLACED",
          color: colors.primary,
          bgColor: isDark ? "rgba(252, 185, 116, 0.18)" : "#F5EBE6",
        };
      case "shipped":
        return {
          label: "SHIPPED",
          color: "#4F46E5",
          bgColor: isDark ? "rgba(79, 70, 229, 0.2)" : "#EEF2FF",
        };
      case "cancel":
      case "cancelled":
        return {
          label: "CANCELLED",
          color: "#DC2626",
          bgColor: isDark ? "rgba(220, 38, 38, 0.2)" : "#FEE2E2",
        };
      case "pending":
      default:
        return {
          label: s ? s.toUpperCase() : "PENDING",
          color: "#2563EB",
          bgColor: isDark ? "rgba(37, 99, 235, 0.2)" : "#DBEAFE",
        };
    }
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  const handleSearch = async (searchStr?: string) => {
    const q = (searchStr !== undefined ? searchStr : query).trim();
    if (!q) {
      Alert.alert(
        "Enter Mobile or Order ID",
        "Please enter your mobile phone number (e.g. 017xxxxxxxx) or Order ID to track.",
      );
      return;
    }

    setLoading(true);
    try {
      const results = await apiService.trackOrders(q);
      setOrders(results);
      setHasSearched(true);
      if (results.length > 0) {
        setExpandedOrderId(results[0].id);
      } else {
        setExpandedOrderId(null);
      }
    } catch (err) {
      console.warn("Error fetching orders:", err);
      setOrders([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
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
        subtitle="Track Your Orders"
        onOpenCart={() => navigation.navigate("Cart")}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Search Box */}
        <View
          style={[
            styles.searchCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Track Installation & Delivery
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Enter your mobile number or Radical Order ID to inspect live
            progress.
          </Text>

          <View
            style={[
              styles.inputRow,
              {
                backgroundColor: colors.surfaceVariant,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              placeholder="Your Mobile (017xxxxxxx) or Order ID"
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => handleSearch()}
              returnKeyType="search"
              keyboardType="default"
              style={[styles.input, { color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => setQuery("")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.trackBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleSearch()}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.btnLoadingRow}>
                <ActivityIndicator
                  size="small"
                  color={isDark ? "#260B00" : "#FFFFFF"}
                />
                <Text
                  style={[
                    styles.trackBtnText,
                    { color: isDark ? "#260B00" : "#FFFFFF" },
                  ]}
                >
                  Searching...
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.trackBtnText,
                  { color: isDark ? "#260B00" : "#FFFFFF" },
                ]}
              >
                Track Orders
              </Text>
            )}
          </TouchableOpacity>

          {/* Quick sample chips */}
        </View>

        {/* Loading Spinner */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Fetching order details...
            </Text>
          </View>
        )}

        {/* Search Results */}
        {!loading && hasSearched && (
          <>
            {orders.length > 0 ? (
              <View style={styles.resultsContainer}>
                <View style={styles.resultsHeaderRow}>
                  <Text
                    style={[styles.resultsHeaderTitle, { color: colors.text }]}
                  >
                    Your Orders ({orders.length})
                  </Text>
                  <Text
                    style={[
                      styles.resultsHeaderSub,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Tap to expand details
                  </Text>
                </View>

                {orders.map((item) => {
                  const currentStep = getStepIndex(item.status);
                  const isExpanded = expandedOrderId === item.id;
                  const meta = getStatusMeta(item.status);
                  const isCancelled =
                    item.status === "cancel" || item.status === "cancelled";

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.orderCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: isExpanded
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                    >
                      {/* Collapsed Header / Accordion trigger */}
                      <TouchableOpacity
                        style={styles.orderHeaderTouch}
                        onPress={() => toggleExpand(item.id)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.orderHeaderTop}>
                          <View style={styles.orderIdCol}>
                            <View style={styles.orderIdRow}>
                              <Ionicons
                                name="receipt-outline"
                                size={16}
                                color={colors.primary}
                              />
                              <Text
                                style={[
                                  styles.orderIdText,
                                  { color: colors.text },
                                ]}
                              >
                                #{item.orderId}
                              </Text>

                              <TouchableOpacity
                                style={[
                                  styles.copyBtn,
                                  {
                                    backgroundColor:
                                      copiedOrderId === item.orderId
                                        ? isDark
                                          ? "rgba(22, 163, 74, 0.2)"
                                          : "#DCFCE7"
                                        : isDark
                                        ? "rgba(252, 185, 116, 0.12)"
                                        : "#F5EBE6",
                                    borderColor:
                                      copiedOrderId === item.orderId
                                        ? "#16A34A"
                                        : colors.border,
                                  },
                                ]}
                                onPress={(e) => {
                                  e.stopPropagation?.();
                                  handleCopyOrderId(item.orderId);
                                }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                activeOpacity={0.7}
                              >
                                <Ionicons
                                  name={
                                    copiedOrderId === item.orderId
                                      ? "checkmark-circle"
                                      : "copy-outline"
                                  }
                                  size={12}
                                  color={
                                    copiedOrderId === item.orderId
                                      ? "#16A34A"
                                      : colors.primary
                                  }
                                />
                                <Text
                                  style={[
                                    styles.copyBtnText,
                                    {
                                      color:
                                        copiedOrderId === item.orderId
                                          ? "#16A34A"
                                          : colors.primary,
                                    },
                                  ]}
                                >
                                  {copiedOrderId === item.orderId
                                    ? "Copied"
                                    : "Copy"}
                                </Text>
                              </TouchableOpacity>
                            </View>
                            <Text
                              style={[
                                styles.orderPlacedText,
                                { color: colors.textSecondary },
                              ]}
                            >
                              Placed: {formatOrderDate(item.placedAt)}
                            </Text>
                          </View>

                          <View style={styles.headerRightCol}>
                            <View
                              style={[
                                styles.statusBadge,
                                { backgroundColor: meta.bgColor },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusBadgeText,
                                  { color: meta.color },
                                ]}
                              >
                                {meta.label}
                              </Text>
                            </View>
                            <Ionicons
                              name={isExpanded ? "chevron-up" : "chevron-down"}
                              size={18}
                              color={colors.textSecondary}
                              style={{ marginTop: 4 }}
                            />
                          </View>
                        </View>
                      </TouchableOpacity>

                      {/* Expanded Order Details */}
                      {isExpanded && (
                        <View
                          style={[
                            styles.expandedContent,
                            { borderTopColor: colors.border },
                          ]}
                        >
                          {/* Customer & Address Details */}
                          <View
                            style={[
                              styles.infoBox,
                              { backgroundColor: colors.surfaceVariant },
                            ]}
                          >
                            <View style={styles.infoRow}>
                              <Text
                                style={[
                                  styles.infoLabel,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Order ID:
                              </Text>
                              <Text
                                style={[
                                  styles.infoValue,
                                  { color: colors.primary, fontWeight: "700" },
                                ]}
                              >
                                #{item.orderId}
                              </Text>
                              <TouchableOpacity
                                style={[
                                  styles.copyIconBtn,
                                  {
                                    backgroundColor:
                                      copiedOrderId === item.orderId
                                        ? isDark
                                          ? "rgba(22, 163, 74, 0.2)"
                                          : "#DCFCE7"
                                        : colors.surface,
                                    borderColor:
                                      copiedOrderId === item.orderId
                                        ? "#16A34A"
                                        : colors.border,
                                  },
                                ]}
                                onPress={() => handleCopyOrderId(item.orderId)}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              >
                                <Ionicons
                                  name={
                                    copiedOrderId === item.orderId
                                      ? "checkmark"
                                      : "copy-outline"
                                  }
                                  size={13}
                                  color={
                                    copiedOrderId === item.orderId
                                      ? "#16A34A"
                                      : colors.primary
                                  }
                                />
                              </TouchableOpacity>
                            </View>
                            <View style={styles.infoRow}>
                              <Text
                                style={[
                                  styles.infoLabel,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Name:
                              </Text>
                              <Text
                                style={[
                                  styles.infoValue,
                                  { color: colors.text },
                                ]}
                              >
                                {item.customerName}
                              </Text>
                            </View>
                            <View style={styles.infoRow}>
                              <Text
                                style={[
                                  styles.infoLabel,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Phone:
                              </Text>
                              <Text
                                style={[
                                  styles.infoValue,
                                  { color: colors.text },
                                ]}
                              >
                                {item.phone}
                              </Text>
                            </View>
                            <View style={styles.infoRow}>
                              <Text
                                style={[
                                  styles.infoLabel,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Total:
                              </Text>
                              <Text
                                style={[
                                  styles.infoValue,
                                  { color: colors.primary, fontWeight: "800" },
                                ]}
                              >
                                ৳ {item.total.toLocaleString()}
                              </Text>
                            </View>
                            {Boolean(item.address) && (
                              <View
                                style={[
                                  styles.infoRow,
                                  { alignItems: "flex-start" },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.infoLabel,
                                    { color: colors.textSecondary },
                                  ]}
                                >
                                  Address:
                                </Text>
                                <Text
                                  style={[
                                    styles.infoValue,
                                    { color: colors.text, flex: 1 },
                                  ]}
                                >
                                  {item.address}
                                </Text>
                              </View>
                            )}
                          </View>

                          {/* Order Stepper Timeline */}
                          <Text
                            style={[
                              styles.sectionSubtitle,
                              { color: colors.text },
                            ]}
                          >
                            Installation Timeline
                          </Text>

                          {isCancelled ? (
                            <View
                              style={[
                                styles.cancelledBanner,
                                {
                                  backgroundColor: isDark
                                    ? "rgba(220, 38, 38, 0.15)"
                                    : "#FEE2E2",
                                  borderColor: "#DC2626",
                                },
                              ]}
                            >
                              <Ionicons
                                name="alert-circle"
                                size={20}
                                color="#DC2626"
                              />
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={[
                                    styles.cancelledTitle,
                                    { color: "#DC2626" },
                                  ]}
                                >
                                  Order Cancelled
                                </Text>
                                <Text
                                  style={[
                                    styles.cancelledDesc,
                                    {
                                      color: isDark
                                        ? colors.textSecondary
                                        : "#991B1B",
                                    },
                                  ]}
                                >
                                  This order has been marked as cancelled.
                                  Contact our logistics desk for further
                                  assistance.
                                </Text>
                              </View>
                            </View>
                          ) : (
                            <View
                              style={[
                                styles.timelineBox,
                                { backgroundColor: colors.surfaceVariant },
                              ]}
                            >
                              <View style={styles.stepsRow}>
                                {STATUS_STEPS.map((step, idx) => {
                                  const isCompleted =
                                    currentStep >= 0 && idx <= currentStep;
                                  const isCurrent = idx === currentStep;
                                  const isFirst = idx === 0;
                                  const isLast =
                                    idx === STATUS_STEPS.length - 1;

                                  return (
                                    <View key={step} style={styles.stepItem}>
                                      {/* Node with connectors */}
                                      <View style={styles.nodeWrapper}>
                                        {!isFirst && (
                                          <View
                                            style={[
                                              styles.connectorLine,
                                              styles.leftConnector,
                                              {
                                                backgroundColor:
                                                  idx <= currentStep
                                                    ? colors.primary
                                                    : colors.border,
                                              },
                                            ]}
                                          />
                                        )}
                                        {!isLast && (
                                          <View
                                            style={[
                                              styles.connectorLine,
                                              styles.rightConnector,
                                              {
                                                backgroundColor:
                                                  idx < currentStep
                                                    ? colors.primary
                                                    : colors.border,
                                              },
                                            ]}
                                          />
                                        )}
                                        <View
                                          style={[
                                            styles.nodeCircle,
                                            isCompleted
                                              ? [
                                                  styles.nodeCompleted,
                                                  {
                                                    backgroundColor:
                                                      colors.primary,
                                                    borderColor: colors.primary,
                                                  },
                                                ]
                                              : [
                                                  styles.nodeInactive,
                                                  {
                                                    backgroundColor:
                                                      colors.surface,
                                                    borderColor: colors.border,
                                                  },
                                                ],
                                          ]}
                                        >
                                          {isCompleted ? (
                                            <Ionicons
                                              name="checkmark"
                                              size={11}
                                              color={
                                                isDark ? "#260B00" : "#FFFFFF"
                                              }
                                            />
                                          ) : (
                                            <View
                                              style={[
                                                styles.nodeDot,
                                                {
                                                  backgroundColor:
                                                    colors.border,
                                                },
                                              ]}
                                            />
                                          )}
                                        </View>
                                      </View>

                                      <Text
                                        style={[
                                          styles.stepLabel,
                                          {
                                            color: isCurrent
                                              ? colors.primary
                                              : isCompleted
                                                ? colors.text
                                                : colors.textMuted,
                                          },
                                          isCurrent && { fontWeight: "700" },
                                        ]}
                                        numberOfLines={1}
                                      >
                                        {step}
                                      </Text>
                                    </View>
                                  );
                                })}
                              </View>
                            </View>
                          )}

                          {/* Items List */}
                          <Text
                            style={[
                              styles.sectionSubtitle,
                              { color: colors.text },
                            ]}
                          >
                            Items ({item.items.length})
                          </Text>
                          <View
                            style={[
                              styles.itemsBox,
                              { backgroundColor: colors.surfaceVariant },
                            ]}
                          >
                            {item.items.length > 0 ? (
                              item.items.map((it, idx) => (
                                <View
                                  key={idx}
                                  style={[
                                    styles.itemRow,
                                    idx > 0 && [
                                      styles.itemDivider,
                                      { borderTopColor: colors.border },
                                    ],
                                  ]}
                                >
                                  <View style={styles.itemTitleCol}>
                                    <Text
                                      style={[
                                        styles.itemName,
                                        { color: colors.text },
                                      ]}
                                    >
                                      • {it.productName}
                                    </Text>
                                  </View>
                                  <View
                                    style={[
                                      styles.qtyBadge,
                                      {
                                        backgroundColor: isDark
                                          ? "rgba(252, 185, 116, 0.15)"
                                          : "#F5EBE6",
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.qtyText,
                                        { color: colors.primary },
                                      ]}
                                    >
                                      x {it.quantity}
                                    </Text>
                                  </View>
                                </View>
                              ))
                            ) : (
                              <Text
                                style={[
                                  styles.noItemsText,
                                  { color: colors.textMuted },
                                ]}
                              >
                                Custom package or hardware kit
                              </Text>
                            )}
                          </View>

                          {/* Action Buttons */}
                          <View style={styles.actionRow}>
                            <TouchableOpacity
                              style={[
                                styles.actionBtn,
                                styles.callBtn,
                                { borderColor: colors.primary },
                              ]}
                              onPress={handleSupportCall}
                              activeOpacity={0.8}
                            >
                              <Ionicons
                                name="call"
                                size={15}
                                color={colors.primary}
                              />
                              <Text
                                style={[
                                  styles.actionBtnText,
                                  { color: colors.primary },
                                ]}
                              >
                                Call Support
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.actionBtn, styles.whatsappBtn]}
                              onPress={() => {
                                const msg = `Hello Radical Engineering! I am tracking Order #${item.orderId} (Status: ${item.status.toUpperCase()}). Please update me on delivery.`;
                                Linking.openURL(
                                  `https://wa.me/${APP_CONFIG.whatsappNumber.replace("+", "")}?text=${encodeURIComponent(msg)}`,
                                );
                              }}
                              activeOpacity={0.8}
                            >
                              <Ionicons
                                name="logo-whatsapp"
                                size={15}
                                color="#FFFFFF"
                              />
                              <Text
                                style={[
                                  styles.actionBtnText,
                                  { color: "#FFFFFF" },
                                ]}
                              >
                                WhatsApp
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View
                style={[
                  styles.notFoundBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="search-outline"
                  size={44}
                  color={COLORS.warning}
                />
                <Text style={[styles.notFoundTitle, { color: colors.text }]}>
                  No Orders Found
                </Text>
                <Text
                  style={[styles.notFoundSub, { color: colors.textSecondary }]}
                >
                  No records match "{query}". Please verify your mobile phone
                  number (017xxxxxxxx) or Order ID.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.supportCallBtn,
                    { borderColor: colors.primary },
                  ]}
                  onPress={handleSupportCall}
                  activeOpacity={0.85}
                >
                  <Ionicons name="call" size={16} color={colors.primary} />
                  <Text
                    style={[styles.supportCallText, { color: colors.primary }]}
                  >
                    Contact Hotline: {APP_CONFIG.hotline1}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

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
    fontSize: 16,
    fontWeight: "800",
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 46,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  trackBtn: {
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.sm + 4,
  },
  btnLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  trackBtnText: {
    fontWeight: "800",
    fontSize: 14,
  },
  sampleChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.md - 2,
    gap: 6,
    flexWrap: "wrap",
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
    fontWeight: "700",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  resultsContainer: {
    marginTop: SPACING.xs,
  },
  resultsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: SPACING.sm,
  },
  resultsHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  resultsHeaderSub: {
    fontSize: 11,
  },
  orderCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
    overflow: "hidden",
  },
  orderHeaderTouch: {
    padding: SPACING.md,
  },
  orderHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  orderIdCol: {
    flex: 1,
  },
  orderIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  orderIdText: {
    fontSize: 15,
    fontWeight: "800",
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    gap: 4,
  },
  copyBtnText: {
    fontSize: 10,
    fontWeight: "700",
  },
  copyIconBtn: {
    padding: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    marginLeft: 6,
  },
  orderPlacedText: {
    fontSize: 11,
    marginTop: 3,
  },
  headerRightCol: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  expandedContent: {
    borderTopWidth: 1,
    padding: SPACING.md,
    paddingTop: SPACING.sm + 4,
  },
  infoBox: {
    padding: SPACING.sm + 4,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    gap: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "700",
    width: 60,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  cancelledBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.sm + 4,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
    gap: 10,
  },
  cancelledTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  cancelledDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  timelineBox: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  stepsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  stepItem: {
    flex: 1,
    alignItems: "center",
  },
  nodeWrapper: {
    width: "100%",
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 6,
  },
  connectorLine: {
    position: "absolute",
    top: 10,
    height: 2,
    width: "50%",
    zIndex: 1,
  },
  leftConnector: {
    left: 0,
  },
  rightConnector: {
    right: 0,
  },
  nodeCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  nodeCompleted: {},
  nodeInactive: {},
  nodeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stepLabel: {
    fontSize: 9,
    textAlign: "center",
  },
  itemsBox: {
    padding: SPACING.sm + 4,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  itemDivider: {
    marginTop: 4,
    paddingTop: 8,
  },
  itemTitleCol: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  itemName: {
    fontSize: 12,
    fontWeight: "600",
  },
  qtyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    flexShrink: 0,
  },
  qtyText: {
    fontSize: 11,
    fontWeight: "800",
  },
  noItemsText: {
    fontSize: 11,
    fontStyle: "italic",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  callBtn: {
    borderWidth: 1,
  },
  whatsappBtn: {
    backgroundColor: "#25D366",
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  notFoundBox: {
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: "center",
    marginTop: SPACING.sm,
  },
  notFoundTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: SPACING.sm,
  },
  notFoundSub: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  supportCallBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.md,
    gap: 6,
  },
  supportCallText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
