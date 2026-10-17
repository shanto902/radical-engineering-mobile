import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Share,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { Header } from "../components/Header";
import { useTheme } from "../context/ThemeContext";
import { useCart } from "../context/CartContext";
import { apiService } from "../services/api";
import { Product, ProductDoc } from "../types";
import { RichText, decodeEntities } from "../components/RichText";
import { ProductDetailSkeleton } from "../components/Skeleton";
import { ImageZoomModal } from "../components/ImageZoomModal";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import { APP_CONFIG } from "../constants/config";

interface ProductDetailScreenProps {
  navigation: any;
  route: any;
}

type DetailTab = "overview" | "specs" | "support";
type SupportSubTab = "manuals" | "warranty";

const getSpecIcon = (key: string): keyof typeof Ionicons.glyphMap => {
  const k = key.toLowerCase();
  if (k.includes("weight")) return "scale-outline";
  if (k.includes("brand")) return "pricetag-outline";
  if (k.includes("model") || k.includes("sku")) return "barcode-outline";
  if (k.includes("category")) return "grid-outline";
  if (k.includes("warranty")) return "shield-checkmark-outline";
  if (k.includes("stock")) return "cube-outline";
  if (k.includes("datasheet") || k.includes("pdf")) return "document-text-outline";
  if (k.includes("manual")) return "book-outline";
  if (k.includes("dimension")) return "resize-outline";
  if (k.includes("voltage")) return "flash-outline";
  if (k.includes("power") || k.includes("watt")) return "flash";
  return "hardware-chip-outline";
};

export const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { colors, isDark } = useTheme();
  const { addToCart, toggleWishlist, isWishlisted, hideToast } = useCart();
  const { productId } = route.params;
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(
    insets.bottom,
    Platform.OS === "android" ? 16 : 10,
  );

  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [supportSubTab, setSupportSubTab] = useState<SupportSubTab>("manuals");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [zoomModalVisible, setZoomModalVisible] = useState(false);
  const [zoomInitialIndex, setZoomInitialIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSelectedImageIndex(0);
    apiService.getProductById(productId).then((p) => {
      setProduct(p);
      setLoading(false);
    });
  }, [productId]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header
          showBack
          onBack={() => navigation.goBack()}
          title="Product Specs"
          subtitle="Loading Details..."
          onOpenCart={() => navigation.navigate("Cart")}
        />
        <ScrollView showsVerticalScrollIndicator={false}>
          <ProductDetailSkeleton />
        </ScrollView>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.centerBox, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
        <Text style={[styles.notFoundText, { color: colors.text }]}>
          Product details unavailable
        </Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnText}>Return to Catalog</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const wishlisted = isWishlisted(product.id);
  const isCallForPrice = !product.price || product.price <= 0;
  const allImages =
    product.images && product.images.length > 0
      ? product.images
      : product.image
        ? [product.image]
        : [];
  const activeImage = allImages[selectedImageIndex] || product.image || "";

  const handleShare = async () => {
    try {
      const priceText = isCallForPrice
        ? "Call for Price"
        : `${APP_CONFIG.currency} ${product.price.toLocaleString()}`;
      await Share.share({
        title: product.title,
        message: `${product.title} - ${priceText}\nAvailable at Radical Engineering (${APP_CONFIG.website})`,
      });
    } catch {
      // ignore
    }
  };

  const handleWhatsAppConsult = () => {
    const priceText = isCallForPrice
      ? "Call for Price (Quote Needed)"
      : `${APP_CONFIG.currency} ${product.price.toLocaleString()}`;
    const inquiryText = isCallForPrice
      ? "Please share the latest price quote, availability, and delivery/installation details."
      : "Please confirm availability, warranty, and delivery/installation details to my location.";
    const message = encodeURIComponent(
      `Hello Radical Engineering,\n\nI am interested in:\nProduct: ${product.title}\nBrand: ${product.brand || 'Radical Engineering'}\nSKU: ${product.sku || product.model}\nPrice: ${priceText}\n\n${inquiryText}`,
    );
    Linking.openURL(
      `https://wa.me/${APP_CONFIG.whatsappNumber.replace("+", "")}?text=${message}`,
    );
  };

  const handleCallHotline = () => {
    Linking.openURL(`tel:${APP_CONFIG.hotline1Raw}`);
  };

  const handleOpenPdf = async (doc: ProductDoc) => {
    if (!doc.url) return;
    try {
      await WebBrowser.openBrowserAsync(doc.url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        toolbarColor: colors.primary,
        controlsColor: "#FFFFFF",
        showTitle: true,
        enableDefaultShareMenuItem: true,
      });
    } catch {
      Linking.openURL(doc.url);
    }
  };

  const handleSharePdf = async (doc: ProductDoc) => {
    try {
      await Share.share({
        title: `${product.title} - ${doc.title}`,
        message: `Download ${doc.title} for ${product.title} from Radical Engineering:\n${doc.url}`,
      });
    } catch {
      // ignore
    }
  };

  const handleRequestManual = () => {
    const message = encodeURIComponent(
      `Hello Radical Engineering,\n\nI need the official PDF technical datasheet / manual for:\n${product.title} (Brand: ${product.brand}, SKU: ${product.sku || product.model}).\n\nPlease share the document file or link.`,
    );
    Linking.openURL(
      `https://wa.me/${APP_CONFIG.whatsappNumber.replace("+", "")}?text=${message}`,
    );
  };

  const handleAddToCartAndCart = () => {
    if (isCallForPrice || !product.inStock) {
      if (!product.inStock) {
        Alert.alert("Out of Stock", "This product is currently out of stock.");
      }
      return;
    }
    hideToast();
    addToCart(product, quantity, undefined, false);
    navigation.navigate("Cart");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        showBack
        onBack={() => navigation.goBack()}
        title={product.brand || product.categoryName || product.title}
        subtitle={product.brand ? product.categoryName : undefined}
        onOpenCart={() => navigation.navigate("Cart")}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image Stage with Atmospheric Backdrop */}
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => {
            setZoomInitialIndex(selectedImageIndex);
            setZoomModalVisible(true);
          }}
          style={[
            styles.heroImageContainer,
            { backgroundColor: isDark ? "#0F172A" : "#F1F5F9" },
          ]}
        >
          {/* Blurred Atmospheric Backdrop */}
          <Image
            source={{ uri: activeImage }}
            style={styles.heroImageBackdrop}
            resizeMode="cover"
            blurRadius={Platform.OS === "android" ? 14 : 24}
          />
          <View
            style={[
              styles.heroImageOverlay,
              {
                backgroundColor: isDark
                  ? "rgba(0, 0, 0, 0.4)"
                  : "rgba(255, 255, 255, 0.25)",
              },
            ]}
          />

          {/* Centered Contain Foreground Image */}
          <Image
            source={{ uri: activeImage }}
            style={styles.mainHeroImage}
            resizeMode="contain"
          />

          {/* Floating Top Actions: Wishlist, Share, Expand/Zoom */}
          <View style={styles.floatingTopActions}>
            <TouchableOpacity
              style={[
                styles.floatingActionBtn,
                { backgroundColor: colors.surface },
              ]}
              onPress={() => toggleWishlist(product.id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={wishlisted ? "heart" : "heart-outline"}
                size={20}
                color={wishlisted ? COLORS.danger : colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.floatingActionBtn,
                { backgroundColor: colors.surface },
              ]}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Ionicons
                name="share-social-outline"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.floatingActionBtn,
                { backgroundColor: colors.surface },
              ]}
              onPress={() => {
                setZoomInitialIndex(selectedImageIndex);
                setZoomModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="expand-outline"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Floating Image Counter Badge (if multiple images) */}
          {allImages.length > 1 && (
            <View style={styles.floatingCounterBadge}>
              <Ionicons name="images" size={12} color="#FFFFFF" />
              <Text style={styles.floatingCounterText}>
                {selectedImageIndex + 1} / {allImages.length}
              </Text>
            </View>
          )}

          {/* Floating Feature Tags */}
          <View style={styles.floatingBadgesRow}>
            {product.wattage ? (
              <View style={styles.wattagePill}>
                <Ionicons name="flash" size={13} color="#FFFFFF" />
                <Text style={styles.wattagePillText}>{product.wattage}</Text>
              </View>
            ) : null}

            {!product.wattage && (product.weight || product.specs['Weight']) ? (
              <View style={styles.weightPill}>
                <Ionicons name="scale-outline" size={12} color="#FFFFFF" />
                <Text style={styles.weightPillText}>{product.weight || product.specs['Weight']}</Text>
              </View>
            ) : null}

            {product.subCategory ? (
              <View style={styles.subCatPill}>
                <Text style={styles.subCatPillText}>{product.subCategory}</Text>
              </View>
            ) : null}

            <View
              style={[
                styles.stockPill,
                { backgroundColor: product.inStock ? "#16A34A" : COLORS.danger },
              ]}
            >
              <View style={styles.stockDotWhite} />
              <Text style={styles.stockPillText}>
                {product.inStock ? "In Stock" : "Out of Stock"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Gallery Thumbnails Strip (when product has multiple images) */}
        {allImages.length > 1 && (
          <View
            style={[
              styles.galleryContainer,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <View style={styles.galleryHeader}>
              <View style={styles.galleryHeaderLeft}>
                <Ionicons
                  name="images-outline"
                  size={14}
                  color={colors.primary}
                />
                <Text
                  style={[styles.galleryTitle, { color: colors.textSecondary }]}
                >
                  GALLERY ({allImages.length} PHOTOS)
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setZoomInitialIndex(selectedImageIndex);
                  setZoomModalVisible(true);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.galleryZoomHint}
              >
                <Ionicons
                  name="expand-outline"
                  size={13}
                  color={colors.primary}
                />
                <Text
                  style={[
                    styles.galleryZoomHintText,
                    { color: colors.primary },
                  ]}
                >
                  Pinch to Zoom
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryScroll}
            >
              {allImages.map((imgUri, idx) => {
                const isSelected = idx === selectedImageIndex;
                return (
                  <TouchableOpacity
                    key={`gallery-thumb-${idx}`}
                    activeOpacity={0.8}
                    onPress={() => setSelectedImageIndex(idx)}
                    style={[
                      styles.galleryThumbWrapper,
                      {
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                        backgroundColor: isDark ? "#0F172A" : "#F1F5F9",
                      },
                      isSelected && styles.galleryThumbActive,
                    ]}
                  >
                    <Image
                      source={{ uri: imgUri }}
                      style={styles.galleryThumbBackdrop}
                      resizeMode="cover"
                      blurRadius={Platform.OS === "android" ? 6 : 10}
                    />
                    <Image
                      source={{ uri: imgUri }}
                      style={styles.galleryThumbImg}
                      resizeMode="contain"
                    />
                    {isSelected && (
                      <View
                        style={[
                          styles.activeThumbIndicator,
                          { backgroundColor: colors.primary },
                        ]}
                      >
                        <Ionicons
                          name="checkmark"
                          size={9}
                          color={isDark ? "#260B00" : "#FFFFFF"}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Product Information Body */}
        <View style={styles.infoWrapper}>
          {/* Brand & SKU Header */}
          <View style={styles.brandRow}>
            {product.brand ? (
              <View
                style={[
                  styles.brandTagWrapper,
                  {
                    backgroundColor: isDark
                      ? "rgba(252, 185, 116, 0.15)"
                      : "#F5EBE6",
                  },
                ]}
              >
                <Text style={[styles.brandTagText, { color: colors.primary }]}>
                  {product.brand}
                </Text>
              </View>
            ) : null}
            {product.sku ? (
              <Text style={[styles.skuText, { color: colors.textMuted }]}>
                SKU: {product.sku}
              </Text>
            ) : null}
          </View>

          {/* Product Title */}
          <Text style={[styles.mainTitle, { color: colors.text }]}>
            {product.title}
          </Text>

          {/* Subtitle / Short Description from Backend (Rendered with RichText for formatting & entity decoding) */}
          {product.shortDescription &&
          product.shortDescription.length > 5 &&
          product.shortDescription !== product.title ? (
            <View style={styles.shortDescContainer}>
              <RichText
                html={product.shortDescription}
                baseTextStyle={[
                  styles.shortDescSubtitle,
                  { color: colors.textSecondary },
                ]}
              />
            </View>
          ) : null}

          {/* Integrated Pricing, Quantity & Trust Showcase Card */}
          <View
            style={[
              styles.priceCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            {/* Main Interactive Row: Price & Quantity Stepper */}
            <View style={styles.priceRowTop}>
              {/* Left Column: Price, Currency, Savings / VAT */}
              <View style={styles.priceLeftCol}>
                <View style={styles.priceLabelRow}>
                  <Text
                    style={[
                      styles.priceLeadLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {!isCallForPrice ? "Special Price" : "Pricing Notice"}
                  </Text>
                  {product.inStock ? (
                    <View style={styles.inStockBadgeMini}>
                      <View style={styles.inStockDot} />
                      <Text style={styles.inStockTextMini}>In Stock</Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.preOrderBadgeMini,
                        {
                          backgroundColor: isDark
                            ? "rgba(239, 68, 68, 0.2)"
                            : "#FEE2E2",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.inStockDot,
                          { backgroundColor: COLORS.danger },
                        ]}
                      />
                      <Text
                        style={[
                          styles.preOrderTextMini,
                          { color: COLORS.danger },
                        ]}
                      >
                        Out of Stock
                      </Text>
                    </View>
                  )}
                </View>

                {!isCallForPrice ? (
                  <>
                    <View style={styles.priceNumbersRow}>
                      <Text
                        style={[styles.currencySymbol, { color: colors.primary }]}
                      >
                        {APP_CONFIG.currency}
                      </Text>
                      <Text style={[styles.priceAmount, { color: colors.primary }]}>
                        {product.price.toLocaleString()}
                      </Text>
                    </View>

                    {product.originalPrice &&
                    product.originalPrice > product.price ? (
                      <View style={styles.savingsRowInline}>
                        <Text
                          style={[
                            styles.strikeThroughPrice,
                            { color: colors.textMuted },
                          ]}
                        >
                          {APP_CONFIG.currency}{" "}
                          {product.originalPrice.toLocaleString()}
                        </Text>
                        <View style={styles.saveTag}>
                          <Text style={styles.saveTagText}>
                            SAVE {APP_CONFIG.currency}{" "}
                            {(
                              product.originalPrice - product.price
                            ).toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.priceVatNote,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Official Price • VAT Included
                      </Text>
                    )}
                  </>
                ) : (
                  <>
                    <View style={styles.callForPriceRow}>
                      <Ionicons name="call" size={17} color={colors.primary} />
                      <Text style={[styles.callForPriceMainText, { color: colors.primary }]}>
                        Call for Price
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.priceVatNote,
                        { color: colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      Official Quote • Expert Support
                    </Text>
                  </>
                )}
              </View>

              {/* Right Column: Quantity Stepper or Direct Call Button */}
              {!isCallForPrice ? (
                product.inStock ? (
                  <View style={styles.priceRightCol}>
                    <Text
                      style={[
                        styles.qtyLabelMini,
                        { color: colors.textSecondary },
                      ]}
                    >
                      QUANTITY
                    </Text>
                    <View
                      style={[
                        styles.stepperBox,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.surfaceVariant,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => setQuantity(Math.max(1, quantity - 1))}
                        style={styles.stepperBtn}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Decrease quantity"
                      >
                        <Ionicons name="remove" size={16} color={colors.text} />
                      </TouchableOpacity>
                      <Text style={[styles.stepperVal, { color: colors.text }]}>
                        {quantity}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setQuantity(quantity + 1)}
                        style={styles.stepperBtn}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Increase quantity"
                      >
                        <Ionicons name="add" size={16} color={colors.text} />
                      </TouchableOpacity>
                    </View>

                    {quantity > 1 ? (
                      <Text
                        style={[styles.totalSubtext, { color: colors.primary }]}
                      >
                        Total: {APP_CONFIG.currency}{" "}
                        {(product.price * quantity).toLocaleString()}
                      </Text>
                    ) : (
                      <Text
                        style={[
                          styles.totalSubtextMuted,
                          { color: colors.textMuted },
                        ]}
                      >
                        Unit price
                      </Text>
                    )}
                  </View>
                ) : (
                  <View style={styles.priceRightCol}>
                    <View
                      style={[
                        styles.outOfStockNoticeBox,
                        {
                          backgroundColor: isDark
                            ? "rgba(239, 68, 68, 0.15)"
                            : "#FEE2E2",
                          borderColor: isDark
                            ? "rgba(239, 68, 68, 0.3)"
                            : "#FECACA",
                        },
                      ]}
                    >
                      <Ionicons
                        name="alert-circle"
                        size={15}
                        color={COLORS.danger}
                      />
                      <Text
                        style={[
                          styles.outOfStockNoticeText,
                          { color: COLORS.danger },
                        ]}
                      >
                        Sold Out
                      </Text>
                    </View>
                  </View>
                )
              ) : (
                <View style={styles.priceRightColCall}>
                  <Text
                    style={[
                      styles.qtyLabelMini,
                      { color: colors.textSecondary },
                    ]}
                  >
                    DIRECT HOTLINE
                  </Text>
                  <TouchableOpacity
                    style={[styles.cardCallHotlineBtn, { backgroundColor: colors.primary }]}
                    onPress={handleCallHotline}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="call" size={13} color={isDark ? "#260B00" : "#FFFFFF"} />
                    <Text style={[styles.cardCallHotlineText, { color: isDark ? "#260B00" : "#FFFFFF" }]}>
                      Call Hotline
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.hotlineNumberSubtext, { color: colors.textMuted }]} numberOfLines={1}>
                    {APP_CONFIG.hotline1}
                  </Text>
                </View>
              )}
            </View>

            {/* Dedicated Warranty Field: Keeps full space for various manufacturer policies */}
            {product.warranty ? (
              <View
                style={[
                  styles.warrantyDedicatedRow,
                  {
                    backgroundColor: isDark
                      ? "rgba(22, 163, 74, 0.12)"
                      : "#F0FDF4",
                    borderColor: isDark
                      ? "rgba(22, 163, 74, 0.28)"
                      : "#BBF7D0",
                  },
                ]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color="#16A34A"
                  style={{ marginTop: 1 }}
                />
                <View style={styles.warrantyTextCol}>
                  <Text
                    style={[
                      styles.warrantyLeadText,
                      { color: isDark ? "#4ADE80" : "#15803D" },
                    ]}
                  >
                    OFFICIAL WARRANTY
                  </Text>
                  <Text
                    style={[styles.warrantyBodyText, { color: colors.text }]}
                  >
                    {product.warranty}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Bottom Guarantee & Trust Badges Strip */}
            <View
              style={[
                styles.priceCardFooter,
                {
                  borderTopColor: colors.border,
                },
              ]}
            >
              <View style={styles.trustItem}>
                <Ionicons name="shield-checkmark" size={13} color="#16A34A" />
                <Text
                  style={[
                    styles.trustItemText,
                    { color: colors.text },
                  ]}
                  numberOfLines={1}
                >
                  Verified Equipment
                </Text>
              </View>

              <View style={styles.trustItem}>
                <Ionicons
                  name="headset-outline"
                  size={13}
                  color={colors.primary}
                />
                <Text
                  style={[
                    styles.trustItemText,
                    { color: colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  Tech Support
                </Text>
              </View>

              <View style={styles.trustItem}>
                <Ionicons
                  name="cube-outline"
                  size={13}
                  color="#0284C7"
                />
                <Text
                  style={[
                    styles.trustItemText,
                    { color: colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  Genuine Dispatch
                </Text>
              </View>
            </View>
          </View>

          {/* Interactive Segmented Tabs */}
          <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setActiveTab("overview")}
              style={[
                styles.tabItem,
                activeTab === "overview" && [
                  styles.tabItemActive,
                  { borderBottomColor: colors.primary },
                ],
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={16}
                color={
                  activeTab === "overview"
                    ? colors.primary
                    : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === "overview"
                        ? colors.primary
                        : colors.textSecondary,
                  },
                  activeTab === "overview" && styles.tabTextActive,
                ]}
              >
                Overview
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("specs")}
              style={[
                styles.tabItem,
                activeTab === "specs" && [
                  styles.tabItemActive,
                  { borderBottomColor: colors.primary },
                ],
              ]}
            >
              <Ionicons
                name="list-outline"
                size={16}
                color={
                  activeTab === "specs" ? colors.primary : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === "specs"
                        ? colors.primary
                        : colors.textSecondary,
                  },
                  activeTab === "specs" && styles.tabTextActive,
                ]}
              >
                Specifications
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("support")}
              style={[
                styles.tabItem,
                activeTab === "support" && [
                  styles.tabItemActive,
                  { borderBottomColor: colors.primary },
                ],
              ]}
            >
              <Ionicons
                name="headset-outline"
                size={16}
                color={
                  activeTab === "support"
                    ? colors.primary
                    : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === "support"
                        ? colors.primary
                        : colors.textSecondary,
                  },
                  activeTab === "support" && styles.tabTextActive,
                ]}
              >
                Support & Docs
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: OVERVIEW & DESCRIPTION */}
          {activeTab === "overview" && (
            <View style={styles.tabContentContainer}>
              {/* Dynamic Description Section with RichText (supports tables, lists, headings) */}
              <View
                style={[
                  styles.cardSection,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.sectionHeaderRow}>
                  <Ionicons
                    name="reader-outline"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>
                    Product Details & Specifications
                  </Text>
                </View>
                <RichText
                  html={product.rawDescription || product.description}
                  baseTextStyle={[
                    styles.descriptionBody,
                    { color: colors.text },
                  ]}
                />
              </View>

              {/* Highlights & Features Checklist (only shown if real features provided from backend) */}
              {product.features && product.features.length > 0 && (
                <View
                  style={[
                    styles.cardSection,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color={COLORS.success}
                    />
                    <Text
                      style={[styles.sectionHeading, { color: colors.text }]}
                    >
                      Key Features
                    </Text>
                  </View>
                  <View style={styles.featuresList}>
                    {product.features.map((feature, idx) => (
                      <View key={idx} style={styles.featureRow}>
                        <View style={styles.featureIconBubble}>
                          <Ionicons
                            name="checkmark"
                            size={13}
                            color={COLORS.success}
                          />
                        </View>
                        <Text
                          style={[styles.featureText, { color: colors.text }]}
                        >
                          {decodeEntities(feature)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* TAB 2: TECHNICAL SPECIFICATIONS */}
          {activeTab === "specs" && (
            <View style={styles.tabContentContainer}>
              {/* Quick Specs Highlight Cards */}
              {(product.weight || product.specs['Weight'] || product.wattage || product.warranty) ? (
                <View style={styles.quickSpecsGrid}>
                  {(product.weight || product.specs['Weight']) ? (
                    <View
                      style={[
                        styles.quickSpecCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={[styles.quickSpecIconWrap, { backgroundColor: isDark ? "rgba(234, 88, 12, 0.2)" : "#FFF7ED" }]}>
                        <Ionicons name="scale-outline" size={18} color="#EA580C" />
                      </View>
                      <View style={styles.quickSpecTextCol}>
                        <Text style={[styles.quickSpecLabel, { color: colors.textSecondary }]}>Weight</Text>
                        <Text style={[styles.quickSpecValue, { color: colors.text }]} numberOfLines={1}>
                          {product.weight || product.specs['Weight']}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {product.wattage ? (
                    <View
                      style={[
                        styles.quickSpecCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={[styles.quickSpecIconWrap, { backgroundColor: isDark ? "rgba(245, 158, 11, 0.2)" : "#FEF3C7" }]}>
                        <Ionicons name="flash" size={18} color="#D97706" />
                      </View>
                      <View style={styles.quickSpecTextCol}>
                        <Text style={[styles.quickSpecLabel, { color: colors.textSecondary }]}>Wattage</Text>
                        <Text style={[styles.quickSpecValue, { color: colors.text }]} numberOfLines={1}>
                          {product.wattage}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {product.warranty ? (
                    <View
                      style={[
                        styles.quickSpecCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={[styles.quickSpecIconWrap, { backgroundColor: isDark ? "rgba(22, 163, 74, 0.2)" : "#DCFCE7" }]}>
                        <Ionicons name="shield-checkmark" size={18} color="#16A34A" />
                      </View>
                      <View style={styles.quickSpecTextCol}>
                        <Text style={[styles.quickSpecLabel, { color: colors.textSecondary }]}>Warranty</Text>
                        <Text style={[styles.quickSpecValue, { color: colors.text }]} numberOfLines={1}>
                          {product.warranty}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {product.model ? (
                    <View
                      style={[
                        styles.quickSpecCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={[styles.quickSpecIconWrap, { backgroundColor: isDark ? "rgba(2, 132, 199, 0.2)" : "#E0F2FE" }]}>
                        <Ionicons name="barcode-outline" size={18} color="#0284C7" />
                      </View>
                      <View style={styles.quickSpecTextCol}>
                        <Text style={[styles.quickSpecLabel, { color: colors.textSecondary }]}>Model / SKU</Text>
                        <Text style={[styles.quickSpecValue, { color: colors.text }]} numberOfLines={1}>
                          {product.model}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <View
                style={[
                  styles.cardSection,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.sectionHeaderRow}>
                  <Ionicons
                    name="hardware-chip-outline"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>
                    General Specifications
                  </Text>
                </View>

                <View
                  style={[
                    styles.specsTableContainer,
                    { borderColor: colors.border },
                  ]}
                >
                  {Object.entries(product.specs).map(
                    ([specKey, specVal], idx) => {
                      const isWeight = specKey.toLowerCase().includes("weight");
                      return (
                        <View
                          key={specKey}
                          style={[
                            styles.specsTableRow,
                            {
                              backgroundColor:
                                idx % 2 === 0
                                  ? colors.surface
                                  : colors.surfaceVariant,
                              borderBottomColor: colors.border,
                            },
                          ]}
                        >
                          <View style={styles.specKeyCol}>
                            <Ionicons
                              name={getSpecIcon(specKey)}
                              size={14}
                              color={isWeight ? "#EA580C" : colors.primary}
                              style={styles.specKeyIcon}
                            />
                            <Text
                              style={[
                                styles.specKeyText,
                                { color: isWeight ? (isDark ? "#FB923C" : "#C2410C") : colors.textSecondary },
                                isWeight && { fontWeight: "700" },
                              ]}
                            >
                              {decodeEntities(specKey)}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.specValueText,
                              { color: colors.text },
                              isWeight && styles.specWeightValue,
                            ]}
                          >
                            {decodeEntities(specVal)}
                          </Text>
                        </View>
                      );
                    },
                  )}
                </View>
              </View>

              {/* Notice directing user to the rich description table */}
              <TouchableOpacity
                onPress={() => setActiveTab("overview")}
                style={[
                  styles.specsHintCard,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#EFF6FF",
                    borderColor: isDark ? "#334155" : "#BFDBFE",
                  },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={colors.primary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.specsHintTitle, { color: colors.text }]}>
                    Full Technical Table Available
                  </Text>
                  <Text
                    style={[
                      styles.specsHintSub,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Electrical ratings, input/output limits, and parameters are
                    detailed in the Overview tab description.
                  </Text>
                </View>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 3: SUPPORT & DOCUMENTATION */}
          {activeTab === "support" && (
            <View style={styles.tabContentContainer}>
              {/* Support Sub-Tabs Segmented Bar */}
              <View
                style={[
                  styles.supportSubTabBar,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.05)",
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.supportSubTabItem,
                    supportSubTab === "manuals" && [
                      styles.supportSubTabItemActive,
                      { backgroundColor: colors.surface },
                    ],
                  ]}
                  onPress={() => setSupportSubTab("manuals")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={15}
                    color={
                      supportSubTab === "manuals"
                        ? colors.primary
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.supportSubTabText,
                      {
                        color:
                          supportSubTab === "manuals"
                            ? colors.primary
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    Datasheet & Manuals
                  </Text>
                  {product.documents && product.documents.length > 0 && (
                    <View
                      style={[
                        styles.supportDocCountBadge,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.supportDocCountBadgeText,
                          { color: isDark ? "#260B00" : "#FFFFFF" },
                        ]}
                      >
                        {product.documents.length}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.supportSubTabItem,
                    supportSubTab === "warranty" && [
                      styles.supportSubTabItemActive,
                      { backgroundColor: colors.surface },
                    ],
                  ]}
                  onPress={() => setSupportSubTab("warranty")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={15}
                    color={
                      supportSubTab === "warranty"
                        ? colors.primary
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.supportSubTabText,
                      {
                        color:
                          supportSubTab === "warranty"
                            ? colors.primary
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {product.warranty ? "Warranty & Help" : "Help & Support"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* SUB-TAB 1: DATASHEET & MANUALS */}
              {supportSubTab === "manuals" && (
                <View style={{ gap: SPACING.md }}>
                  {/* Official Manufacturer PDF Files */}
                  <View
                    style={[
                      styles.cardSection,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.sectionHeaderRow}>
                      <Ionicons
                        name="document-attach-outline"
                        size={18}
                        color={colors.primary}
                      />
                      <Text
                        style={[styles.sectionHeading, { color: colors.text }]}
                      >
                        Manufacturer Technical Documents
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.supportIntroText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Official PDF engineering sheets and user operation guides
                      for {product.brand} {product.title}.
                    </Text>

                    {product.documents && product.documents.length > 0 ? (
                      <View style={styles.docListContainer}>
                        {product.documents.map((doc, docIdx) => (
                          <View
                            key={docIdx}
                            style={[
                              styles.docCardExpanded,
                              {
                                backgroundColor: colors.surfaceVariant,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <View style={styles.docCardTopRow}>
                              <View
                                style={[
                                  styles.docIconBoxLarge,
                                  {
                                    backgroundColor:
                                      doc.type === "manual"
                                        ? "#DCFCE7"
                                        : "#DBEAFE",
                                  },
                                ]}
                              >
                                <Ionicons
                                  name={
                                    doc.type === "manual"
                                      ? "book"
                                      : "document-text"
                                  }
                                  size={24}
                                  color={
                                    doc.type === "manual"
                                      ? "#15803D"
                                      : "#1D4ED8"
                                  }
                                />
                              </View>
                              <View style={styles.docInfoExpanded}>
                                <Text
                                  style={[
                                    styles.docTitleExpanded,
                                    { color: colors.text },
                                  ]}
                                >
                                  {doc.title}
                                </Text>
                                <Text
                                  style={[
                                    styles.docMetaExpanded,
                                    { color: colors.textSecondary },
                                  ]}
                                >
                                  {doc.type === "manual"
                                    ? "Official User & Installation Manual"
                                    : "Technical Specification & Wiring Data"}
                                </Text>
                                <View style={styles.docTagsRow}>
                                  <View
                                    style={[
                                      styles.docFormatTag,
                                      { backgroundColor: colors.border },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.docFormatTagText,
                                        { color: colors.text },
                                      ]}
                                    >
                                      PDF
                                    </Text>
                                  </View>
                                  {doc.filesize ? (
                                    <View
                                      style={[
                                        styles.docFormatTag,
                                        { backgroundColor: colors.border },
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.docFormatTagText,
                                          { color: colors.textSecondary },
                                        ]}
                                      >
                                        {doc.filesize}
                                      </Text>
                                    </View>
                                  ) : null}
                                  <View style={styles.docVerifiedTag}>
                                    <Ionicons
                                      name="checkmark-circle"
                                      size={11}
                                      color="#15803D"
                                    />
                                    <Text style={styles.docVerifiedTagText}>
                                      Verified Authentic
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            </View>

                            {/* Action Buttons */}
                            <View style={styles.docActionButtonsExpanded}>
                              <TouchableOpacity
                                style={[
                                  styles.docOpenBtnExpanded,
                                  { backgroundColor: colors.primary },
                                ]}
                                onPress={() => handleOpenPdf(doc)}
                                activeOpacity={0.85}
                              >
                                <Ionicons
                                  name="eye-outline"
                                  size={16}
                                  color={isDark ? "#260B00" : "#FFFFFF"}
                                />
                                <Text
                                  style={[
                                    styles.docOpenBtnExpandedText,
                                    { color: isDark ? "#260B00" : "#FFFFFF" },
                                  ]}
                                >
                                  View
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.docShareBtnExpanded,
                                  {
                                    borderColor: colors.border,
                                    backgroundColor: colors.surface,
                                  },
                                ]}
                                onPress={() => handleSharePdf(doc)}
                                activeOpacity={0.8}
                              >
                                <Ionicons
                                  name="share-social-outline"
                                  size={16}
                                  color={colors.text}
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.noDocCard,
                          { backgroundColor: colors.surfaceVariant },
                        ]}
                      >
                        <Ionicons
                          name="document-text-outline"
                          size={32}
                          color={colors.textSecondary}
                        />
                        <Text
                          style={[styles.noDocTitle, { color: colors.text }]}
                        >
                          Digital PDF Available on Request
                        </Text>
                        <Text
                          style={[
                            styles.noDocText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Radical Engineering archives full schematics and user
                          manuals for {product.brand}. Reach out to our
                          technical desk to receive the PDF copy via WhatsApp or
                          email.
                        </Text>
                        <TouchableOpacity
                          style={styles.requestManualBtn}
                          onPress={handleRequestManual}
                        >
                          <Ionicons
                            name="logo-whatsapp"
                            size={16}
                            color="#15803D"
                          />
                          <Text style={styles.requestManualText}>
                            Request PDF from Engineering Desk
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* SUB-TAB 2: WARRANTY & SERVICE */}
              {supportSubTab === "warranty" && (
                <View style={{ gap: SPACING.md }}>
                  {product.warranty ? (
                    <View
                      style={[
                        styles.cardSection,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.sectionHeaderRow}>
                        <Ionicons
                          name="shield-checkmark-outline"
                          size={18}
                          color={COLORS.success}
                        />
                        <Text
                          style={[
                            styles.sectionHeading,
                            { color: colors.text },
                          ]}
                        >
                          Warranty Coverage
                        </Text>
                      </View>
                      <View style={styles.warrantyHighlightRow}>
                        <View style={styles.warrantyHighlightPill}>
                          <Ionicons
                            name="shield-checkmark"
                            size={16}
                            color={COLORS.success}
                          />
                          <Text style={styles.warrantyHighlightPillText}>
                            {product.warranty}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : null}

                  <View
                    style={[
                      styles.supportContactBox,
                      {
                        backgroundColor: isDark
                          ? "rgba(252, 185, 116, 0.08)"
                          : "#FBF6F3",
                        borderColor: isDark
                          ? "rgba(252, 185, 116, 0.28)"
                          : "#EAD9D0",
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <View style={styles.supportContactHeader}>
                      <View
                        style={[
                          styles.supportContactIconWrap,
                          {
                            backgroundColor: isDark
                              ? "rgba(252, 185, 116, 0.16)"
                              : "rgba(60, 17, 0, 0.08)",
                          },
                        ]}
                      >
                        <Ionicons
                          name="headset-outline"
                          size={18}
                          color={colors.primary}
                        />
                      </View>
                      <Text
                        style={[
                          styles.supportContactTitle,
                          { color: colors.text },
                        ]}
                      >
                        Need Technical Help or Inquiries?
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.supportContactSub,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Speak directly with our engineering desk in Kishoreganj
                      for equipment sizing or order questions.
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.callHotlineButton,
                        { backgroundColor: colors.primary },
                      ]}
                      onPress={handleCallHotline}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name="call"
                        size={16}
                        color={isDark ? "#260B00" : "#FFFFFF"}
                      />
                      <Text
                        style={[
                          styles.callHotlineText,
                          { color: isDark ? "#260B00" : "#FFFFFF" },
                        ]}
                      >
                        Call Hotline: {APP_CONFIG.hotline1}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Bottom Space for Floating Action Bar */}
          <View style={{ height: 100 + bottomPadding }} />
        </View>
      </ScrollView>

      {/* Floating Bottom Sticky Action Bar */}
      <View
        style={[
          styles.bottomActionBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            shadowColor: colors.cardShadow,
            paddingBottom: bottomPadding + 6,
          },
        ]}
      >
        {!isCallForPrice ? (
          product.inStock ? (
            <>
              <TouchableOpacity
                style={styles.whatsAppActionBtn}
                onPress={handleWhatsAppConsult}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                <Text style={styles.whatsAppActionText}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.addToCartActionBtn,
                  { backgroundColor: isDark ? "#1E293B" : "#0F172A" },
                ]}
                onPress={() => addToCart(product, quantity)}
                activeOpacity={0.85}
              >
                <Ionicons name="cart" size={18} color="#FFFFFF" />
                <Text style={styles.addToCartActionText}>Add to Cart</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.buyNowActionBtn, { backgroundColor: colors.primary }]}
                onPress={handleAddToCartAndCart}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.buyNowActionText,
                    { color: isDark ? "#260B00" : "#FFFFFF" },
                  ]}
                >
                  Buy Now
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.whatsAppCallForPriceBtn}
                onPress={handleWhatsAppConsult}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnCallText}>WhatsApp Inquiry</Text>
              </TouchableOpacity>

              <View
                style={[
                  styles.outOfStockBarBtn,
                  {
                    backgroundColor: isDark ? "#334155" : "#E2E8F0",
                    borderColor: isDark ? "#475569" : "#CBD5E1",
                  },
                ]}
              >
                <Ionicons
                  name="ban-outline"
                  size={18}
                  color={isDark ? "#94A3B8" : "#64748B"}
                />
                <Text
                  style={[
                    styles.outOfStockBarText,
                    { color: isDark ? "#94A3B8" : "#64748B" },
                  ]}
                >
                  Out of Stock
                </Text>
              </View>
            </>
          )
        ) : (
          <>
            <TouchableOpacity
              style={styles.whatsAppCallForPriceBtn}
              onPress={handleWhatsAppConsult}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnCallText}>WhatsApp Inquiry</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.callForPriceActionBtn, { backgroundColor: colors.primary }]}
              onPress={handleCallHotline}
              activeOpacity={0.85}
            >
              <Ionicons name="call" size={18} color={isDark ? "#260B00" : "#FFFFFF"} />
              <Text
                style={[
                  styles.actionBtnCallText,
                  { color: isDark ? "#260B00" : "#FFFFFF" },
                ]}
              >
                Call for Price
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* High-Resolution Gesture Zoom Modal */}
      <ImageZoomModal
        visible={zoomModalVisible}
        images={allImages}
        initialIndex={zoomInitialIndex}
        title={product.title}
        onClose={() => setZoomModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    fontWeight: "600",
  },
  notFoundText: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  backBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
  },
  backBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  heroImageContainer: {
    width: "100%",
    height: 320,
    position: "relative",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  heroImageBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    opacity: 0.85,
    transform: [{ scale: 1.18 }],
  },
  heroImageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mainHeroImage: {
    width: "88%",
    height: "82%",
  },
  floatingCounterBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 5,
  },
  floatingCounterText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  galleryContainer: {
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
  },
  galleryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    marginBottom: 8,
  },
  galleryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  galleryTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  galleryZoomHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  galleryZoomHintText: {
    fontSize: 11,
    fontWeight: "700",
  },
  galleryScroll: {
    paddingHorizontal: SPACING.md,
    gap: 10,
  },
  galleryThumbWrapper: {
    width: 66,
    height: 66,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  galleryThumbActive: {
    borderWidth: 2,
    elevation: 3,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  galleryThumbBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    opacity: 0.8,
    transform: [{ scale: 1.2 }],
  },
  galleryThumbImg: {
    width: "85%",
    height: "85%",
  },
  activeThumbIndicator: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingTopActions: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "column",
    gap: 8,
  },
  floatingActionBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingBadgesRow: {
    position: "absolute",
    bottom: 12,
    left: 14,
    right: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  wattagePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  wattagePillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  weightPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EA580C",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  weightPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  subCatPill: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  subCatPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  stockPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    gap: 5,
  },
  stockDotWhite: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  stockPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  infoWrapper: {
    padding: SPACING.md,
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  brandTagWrapper: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  brandTagText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  skuText: {
    fontSize: 11,
    fontWeight: "600",
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
    marginBottom: 6,
  },
  shortDescContainer: {
    marginBottom: 6,
  },
  shortDescSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 0,
  },
  specsHintCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm + 2,
    marginTop: SPACING.sm,
  },
  specsHintTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  specsHintSub: {
    fontSize: 11,
    lineHeight: 16,
  },
  priceCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },
  priceRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
  },
  priceLeftCol: {
    flex: 1,
    paddingRight: 12,
  },
  priceLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  priceLeadLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  inStockBadgeMini: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  inStockDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#16A34A",
  },
  inStockTextMini: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
  },
  preOrderBadgeMini: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  preOrderTextMini: {
    fontSize: 10,
    fontWeight: "800",
    color: "#D97706",
  },
  priceNumbersRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: "800",
  },
  priceAmount: {
    fontSize: 26,
    fontWeight: "900",
  },
  savingsRowInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  strikeThroughPrice: {
    fontSize: 12,
    textDecorationLine: "line-through",
  },
  saveTag: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  saveTagText: {
    color: "#166534",
    fontSize: 10,
    fontWeight: "800",
  },
  priceVatNote: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 3,
  },
  callForPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
  },
  callForPriceMainText: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  priceRightCol: {
    alignItems: "flex-end",
  },
  priceRightColCall: {
    alignItems: "flex-end",
  },
  cardCallHotlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    height: 36,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  cardCallHotlineText: {
    fontSize: 12,
    fontWeight: "800",
  },
  hotlineNumberSubtext: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
  },
  qtyLabelMini: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  stepperBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperVal: {
    minWidth: 26,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "800",
  },
  totalSubtext: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
  },
  totalSubtextMuted: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 4,
  },
  warrantyDedicatedRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 6,
    gap: 8,
  },
  warrantyTextCol: {
    flex: 1,
  },
  warrantyLeadText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  warrantyBodyText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  priceCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
    gap: 6,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  trustItemText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginBottom: SPACING.md,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    fontWeight: "800",
  },
  tabContentContainer: {
    gap: SPACING.md,
  },
  cardSection: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: SPACING.sm + 2,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "800",
  },
  descriptionBody: {
    fontSize: 13.5,
    lineHeight: 22,
  },
  featuresList: {
    gap: 10,
    marginTop: 4,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  featureIconBubble: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  featureText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  quickSpecsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: SPACING.md,
  },
  quickSpecCard: {
    flex: 1,
    minWidth: "47%",
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: 10,
  },
  quickSpecIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  quickSpecTextCol: {
    flex: 1,
  },
  quickSpecLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  quickSpecValue: {
    fontSize: 13,
    fontWeight: "800",
  },
  specsTableContainer: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    marginTop: 4,
  },
  specsTableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  specKeyCol: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 6,
  },
  specKeyIcon: {
    marginRight: 6,
  },
  specKeyText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
  },
  specValueText: {
    flex: 1.5,
    fontSize: 12,
    fontWeight: "700",
  },
  specWeightValue: {
    fontWeight: "900",
    color: "#EA580C",
  },
  supportContactBox: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
  },
  supportContactHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: 6,
  },
  supportContactIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  supportContactTitle: {
    fontSize: 14,
    fontWeight: "800",
    flex: 1,
  },
  supportContactSub: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  callHotlineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    gap: 8,
  },
  callHotlineText: {
    fontWeight: "800",
    fontSize: 13,
  },
  bottomActionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    borderTopWidth: 1,
    gap: 8,
    elevation: 8,
  },
  whatsAppActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#25D366",
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 46,
    gap: 6,
  },
  whatsAppActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  addToCartActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F172A",
    borderRadius: RADIUS.md,
    height: 46,
    gap: 6,
  },
  addToCartActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  buyNowActionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 46,
  },
  buyNowActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  whatsAppCallForPriceBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#25D366",
    borderRadius: RADIUS.md,
    height: 46,
    gap: 8,
  },
  callForPriceActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.md,
    height: 46,
    gap: 8,
  },
  actionBtnCallText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  outOfStockNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  outOfStockNoticeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  outOfStockBarBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.md,
    height: 46,
    gap: 8,
    borderWidth: 1,
  },
  outOfStockBarText: {
    fontSize: 14,
    fontWeight: "700",
  },
  docListContainer: {
    marginTop: 6,
    gap: 10,
  },
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.sm + 4,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: 10,
  },
  docIconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  docMeta: {
    fontSize: 11,
  },
  docActionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  docOpenBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  docOpenBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  docShareBtn: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  noDocCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: "center",
    gap: 8,
  },
  noDocText: {
    fontSize: 12,
    textAlign: "center",
  },
  requestManualBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: "#DCFCE7",
  },
  requestManualText: {
    color: "#15803D",
    fontSize: 12,
    fontWeight: "700",
  },
  supportSubTabBar: {
    flexDirection: "row",
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: SPACING.md,
    gap: 4,
  },
  supportSubTabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: RADIUS.sm + 2,
    gap: 6,
  },
  supportSubTabItemActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  supportSubTabText: {
    fontSize: 12,
    fontWeight: "700",
  },
  supportDocCountBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 2,
  },
  supportDocCountBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  supportIntroText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: SPACING.sm,
  },
  docCardExpanded: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    gap: 12,
  },
  docCardTopRow: {
    flexDirection: "row",
    gap: 12,
  },
  docIconBoxLarge: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  docInfoExpanded: {
    flex: 1,
  },
  docTitleExpanded: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  docMetaExpanded: {
    fontSize: 12,
    marginBottom: 6,
  },
  docTagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  docFormatTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  docFormatTagText: {
    fontSize: 10,
    fontWeight: "700",
  },
  docVerifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  docVerifiedTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803D",
  },
  docActionButtonsExpanded: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  docOpenBtnExpanded: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: 9,
    gap: 6,
  },
  docOpenBtnExpandedText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  docShareBtnExpanded: {
    width: 40,
    height: 38,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  noDocTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  pdfFeatureNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  pdfFeatureTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  pdfFeatureSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  whatsAppDocRequestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    gap: 8,
    marginTop: SPACING.xs,
  },
  whatsAppDocRequestBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  warrantyHighlightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: SPACING.sm,
  },
  warrantyHighlightPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  warrantyHighlightPillText: {
    color: "#15803D",
    fontSize: 12,
    fontWeight: "800",
  },
  warrantyStatusNote: {
    fontSize: 12,
  },
});
