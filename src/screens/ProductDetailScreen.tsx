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
  Share,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Header } from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { apiService } from '../services/api';
import { Product, ProductDoc } from '../types';
import { RichText } from '../components/RichText';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';

interface ProductDetailScreenProps {
  navigation: any;
  route: any;
}

type DetailTab = 'overview' | 'specs' | 'support';
type SupportSubTab = 'manuals' | 'warranty';

export const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({ navigation, route }) => {
  const { colors, isDark } = useTheme();
  const { addToCart, toggleWishlist, isWishlisted } = useCart();
  const { productId } = route.params;
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 10);

  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [supportSubTab, setSupportSubTab] = useState<SupportSubTab>('manuals');
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
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading product specifications...
        </Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.centerBox, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
        <Text style={[styles.notFoundText, { color: colors.text }]}>Product details unavailable</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Return to Catalog</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const wishlisted = isWishlisted(product.id);

  const handleShare = async () => {
    try {
      await Share.share({
        title: product.title,
        message: `${product.title} - ${APP_CONFIG.currency} ${product.price.toLocaleString()}\nAvailable at Radical Engineering (${APP_CONFIG.website})`,
      });
    } catch {
      // ignore
    }
  };

  const handleWhatsAppConsult = () => {
    const message = encodeURIComponent(
      `Hello Radical Engineering,\n\nI am interested in:\nProduct: ${product.title}\nBrand: ${product.brand}\nSKU: ${product.sku || product.model}\nPrice: ${APP_CONFIG.currency} ${product.price.toLocaleString()}\n\nPlease confirm availability, warranty, and delivery/installation details to my location.`
    );
    Linking.openURL(`https://wa.me/${APP_CONFIG.whatsappNumber.replace('+', '')}?text=${message}`);
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
        controlsColor: '#FFFFFF',
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
      `Hello Radical Engineering,\n\nI need the official PDF technical datasheet / manual for:\n${product.title} (Brand: ${product.brand}, SKU: ${product.sku || product.model}).\n\nPlease share the document file or link.`
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
        subtitle={product.categoryName}
        onOpenCart={() => navigation.navigate('Cart')}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image Stage */}
        <View style={styles.heroImageContainer}>
          <Image source={{ uri: product.image }} style={styles.mainHeroImage} resizeMode="contain" />

          {/* Floating Actions on Image */}
          <View style={styles.floatingTopActions}>
            <TouchableOpacity
              style={[styles.floatingActionBtn, { backgroundColor: colors.surface }]}
              onPress={() => toggleWishlist(product.id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={wishlisted ? 'heart' : 'heart-outline'}
                size={20}
                color={wishlisted ? COLORS.danger : colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.floatingActionBtn, { backgroundColor: colors.surface }]}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Floating Feature Tags */}
          <View style={styles.floatingBadgesRow}>
            {product.wattage ? (
              <View style={styles.wattagePill}>
                <Ionicons name="flash" size={13} color="#FFFFFF" />
                <Text style={styles.wattagePillText}>{product.wattage}</Text>
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
                { backgroundColor: product.inStock ? '#16A34A' : '#D97706' },
              ]}
            >
              <View style={styles.stockDotWhite} />
              <Text style={styles.stockPillText}>
                {product.inStock ? 'In Stock' : 'Pre-Order'}
              </Text>
            </View>
          </View>
        </View>

        {/* Product Information Body */}
        <View style={styles.infoWrapper}>
          {/* Brand & SKU Header */}
          <View style={styles.brandRow}>
            <View style={[styles.brandTagWrapper, { backgroundColor: isDark ? 'rgba(252, 185, 116, 0.15)' : '#F5EBE6' }]}>
              <Text style={[styles.brandTagText, { color: colors.primary }]}>{product.brand}</Text>
            </View>
            {product.sku ? (
              <Text style={[styles.skuText, { color: colors.textMuted }]}>
                SKU: {product.sku}
              </Text>
            ) : null}
          </View>

          {/* Product Title */}
          <Text style={[styles.mainTitle, { color: colors.text }]}>{product.title}</Text>

          {/* Rating & Warranty Strip */}
          <View style={styles.metaStrip}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratingScore}>{product.rating}</Text>
              <Text style={[styles.reviewsCount, { color: colors.textMuted }]}>
                ({product.reviewsCount} verified reviews)
              </Text>
            </View>

            <View style={styles.warrantyStripBadge}>
              <Ionicons name="shield-checkmark" size={15} color={COLORS.success} />
              <Text style={[styles.warrantyStripText, { color: colors.text }]}>
                {product.warranty}
              </Text>
            </View>
          </View>


          {/* Premium Price Showcase Card */}
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
            <View style={styles.priceRowTop}>
              <View>
                <Text style={[styles.priceLeadLabel, { color: colors.textSecondary }]}>Special Price</Text>
                <View style={styles.priceNumbersRow}>
                  <Text style={[styles.currencySymbol, { color: colors.primary }]}>{APP_CONFIG.currency}</Text>
                  <Text style={[styles.priceAmount, { color: colors.primary }]}>
                    {product.price.toLocaleString()}
                  </Text>
                </View>
              </View>

              {product.originalPrice && product.originalPrice > product.price ? (
                <View style={styles.savingsBox}>
                  <Text style={[styles.strikeThroughPrice, { color: colors.textMuted }]}>
                    {APP_CONFIG.currency} {product.originalPrice.toLocaleString()}
                  </Text>
                  <View style={styles.saveTag}>
                    <Text style={styles.saveTagText}>
                      SAVE {APP_CONFIG.currency}{' '}
                      {(product.originalPrice - product.price).toLocaleString()}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            <View style={[styles.serviceNoticeRow, { borderTopColor: colors.border }]}>
              <View style={styles.serviceNoticeItem}>
                <Ionicons name="checkmark-done-circle" size={16} color={COLORS.success} />
                <Text style={[styles.serviceNoticeText, { color: colors.textSecondary }]}>
                  Genuine Equipment
                </Text>
              </View>
              <View style={styles.serviceNoticeItem}>
                <Ionicons name="car-outline" size={16} color={COLORS.accent} />
                <Text style={[styles.serviceNoticeText, { color: colors.textSecondary }]}>
                  Nationwide Dispatch
                </Text>
              </View>
              <View style={styles.serviceNoticeItem}>
                <Ionicons name="construct-outline" size={16} color={colors.primary} />
                <Text style={[styles.serviceNoticeText, { color: colors.textSecondary }]}>
                  Expert Setup
                </Text>
              </View>
            </View>
          </View>

          {/* Quantity Selector Bar */}
          <View style={[styles.qtySelectorBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View>
              <Text style={[styles.qtyTitle, { color: colors.text }]}>Select Quantity</Text>
              <Text style={[styles.qtySub, { color: colors.textSecondary }]}>Units for installation</Text>
            </View>
            <View style={[styles.stepperBox, { borderColor: colors.border, backgroundColor: colors.surfaceVariant }]}>
              <TouchableOpacity
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                style={styles.stepperBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.stepperVal, { color: colors.text }]}>{quantity}</Text>
              <TouchableOpacity
                onPress={() => setQuantity(quantity + 1)}
                style={styles.stepperBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Interactive Segmented Tabs */}
          <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setActiveTab('overview')}
              style={[styles.tabItem, activeTab === 'overview' && [styles.tabItemActive, { borderBottomColor: colors.primary }]]}
            >
              <Ionicons
                name="document-text-outline"
                size={16}
                color={activeTab === 'overview' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'overview' ? colors.primary : colors.textSecondary },
                  activeTab === 'overview' && styles.tabTextActive,
                ]}
              >
                Overview
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('specs')}
              style={[styles.tabItem, activeTab === 'specs' && [styles.tabItemActive, { borderBottomColor: colors.primary }]]}
            >
              <Ionicons
                name="list-outline"
                size={16}
                color={activeTab === 'specs' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'specs' ? colors.primary : colors.textSecondary },
                  activeTab === 'specs' && styles.tabTextActive,
                ]}
              >
                Specifications
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('support')}
              style={[styles.tabItem, activeTab === 'support' && [styles.tabItemActive, { borderBottomColor: colors.primary }]]}
            >
              <Ionicons
                name="headset-outline"
                size={16}
                color={activeTab === 'support' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'support' ? colors.primary : colors.textSecondary },
                  activeTab === 'support' && styles.tabTextActive,
                ]}
              >
                Support & Docs
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: OVERVIEW & DESCRIPTION */}
          {activeTab === 'overview' && (
            <View style={styles.tabContentContainer}>
              {/* Description Section with RichText */}
              <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="reader-outline" size={18} color={colors.primary} />
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>Product Overview</Text>
                </View>
                <RichText
                  html={product.rawDescription || product.description}
                  baseTextStyle={[styles.descriptionBody, { color: colors.text }]}
                />
              </View>

              {/* Official Technical Documents & Manuals (PDF) */}
              <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>Documents & Manuals (PDF)</Text>
                </View>

                {product.documents && product.documents.length > 0 ? (
                  <View style={styles.docListContainer}>
                    {product.documents.map((doc, docIdx) => (
                      <View
                        key={docIdx}
                        style={[styles.docCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                      >
                        <View style={styles.docIconBox}>
                          <Ionicons
                            name={doc.type === 'manual' ? 'book' : 'document-text'}
                            size={22}
                            color={doc.type === 'manual' ? '#15803D' : '#1D4ED8'}
                          />
                        </View>
                        <View style={styles.docInfo}>
                          <Text style={[styles.docTitle, { color: colors.text }]} numberOfLines={1}>
                            {doc.title}
                          </Text>
                          <Text style={[styles.docMeta, { color: colors.textSecondary }]}>
                            {doc.type === 'manual' ? 'User Installation Manual' : 'Technical Specifications Sheet'}
                            {doc.filesize ? ` • ${doc.filesize}` : ''}
                          </Text>
                        </View>
                        <View style={styles.docActionButtons}>
                          <TouchableOpacity
                            style={[styles.docOpenBtn, { backgroundColor: colors.primary }]}
                            onPress={() => handleOpenPdf(doc)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="open-outline" size={14} color={isDark ? '#260B00' : '#FFFFFF'} />
                            <Text style={[styles.docOpenBtnText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>Open</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.docShareBtn, { backgroundColor: colors.surface }]}
                            onPress={() => handleSharePdf(doc)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="share-social-outline" size={15} color={colors.text} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={[styles.noDocCard, { backgroundColor: colors.surfaceVariant }]}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                    <Text style={[styles.noDocText, { color: colors.textSecondary }]}>
                      Need the full wiring diagram, datasheet, or user manual for this model?
                    </Text>
                    <TouchableOpacity style={styles.requestManualBtn} onPress={handleRequestManual}>
                      <Ionicons name="logo-whatsapp" size={14} color="#15803D" />
                      <Text style={styles.requestManualText}>Request PDF from Engineering Desk</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Highlights & Features Checklist */}
              {product.features && product.features.length > 0 && (
                <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.success} />
                    <Text style={[styles.sectionHeading, { color: colors.text }]}>Key Highlights & Features</Text>
                  </View>
                  <View style={styles.featuresList}>
                    {product.features.map((feature, idx) => (
                      <View key={idx} style={styles.featureRow}>
                        <View style={styles.featureIconBubble}>
                          <Ionicons name="checkmark" size={13} color={COLORS.success} />
                        </View>
                        <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* TAB 2: TECHNICAL SPECIFICATIONS */}
          {activeTab === 'specs' && (
            <View style={styles.tabContentContainer}>
              <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="hardware-chip-outline" size={18} color={colors.primary} />
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>Technical Data Sheet</Text>
                </View>

                <View style={[styles.specsTableContainer, { borderColor: colors.border }]}>
                  {Object.entries(product.specs).map(([specKey, specVal], idx) => (
                    <View
                      key={specKey}
                      style={[
                        styles.specsTableRow,
                        {
                          backgroundColor: idx % 2 === 0 ? colors.surface : colors.surfaceVariant,
                          borderBottomColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.specKeyText, { color: colors.textSecondary }]}>
                        {specKey}
                      </Text>
                      <Text style={[styles.specValueText, { color: colors.text }]}>
                        {specVal}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Official Documents in Specs Tab */}
              {product.documents && product.documents.length > 0 && (
                <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                    <Text style={[styles.sectionHeading, { color: colors.text }]}>Manufacturer PDF Files</Text>
                  </View>
                  <View style={styles.docListContainer}>
                    {product.documents.map((doc, docIdx) => (
                      <View
                        key={docIdx}
                        style={[styles.docCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                      >
                        <View style={styles.docIconBox}>
                          <Ionicons
                            name={doc.type === 'manual' ? 'book' : 'document-text'}
                            size={22}
                            color={doc.type === 'manual' ? '#15803D' : '#1D4ED8'}
                          />
                        </View>
                        <View style={styles.docInfo}>
                          <Text style={[styles.docTitle, { color: colors.text }]} numberOfLines={1}>
                            {doc.title}
                          </Text>
                          <Text style={[styles.docMeta, { color: colors.textSecondary }]}>
                            {doc.type === 'manual' ? 'User Manual' : 'Datasheet'}
                            {doc.filesize ? ` • ${doc.filesize}` : ''}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.docOpenBtn}
                          onPress={() => handleOpenPdf(doc)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="open-outline" size={14} color="#FFFFFF" />
                          <Text style={styles.docOpenBtnText}>Open</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* TAB 3: SUPPORT & DOCUMENTATION */}
          {activeTab === 'support' && (
            <View style={styles.tabContentContainer}>
              {/* Support Sub-Tabs Segmented Bar */}
              <View
                style={[
                  styles.supportSubTabBar,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.supportSubTabItem,
                    supportSubTab === 'manuals' && [
                      styles.supportSubTabItemActive,
                      { backgroundColor: colors.surface },
                    ],
                  ]}
                  onPress={() => setSupportSubTab('manuals')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={15}
                    color={supportSubTab === 'manuals' ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.supportSubTabText,
                      { color: supportSubTab === 'manuals' ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    Datasheet & Manuals
                  </Text>
                  {product.documents && product.documents.length > 0 && (
                    <View style={[styles.supportDocCountBadge, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.supportDocCountBadgeText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>
                        {product.documents.length}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.supportSubTabItem,
                    supportSubTab === 'warranty' && [
                      styles.supportSubTabItemActive,
                      { backgroundColor: colors.surface },
                    ],
                  ]}
                  onPress={() => setSupportSubTab('warranty')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={15}
                    color={supportSubTab === 'warranty' ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.supportSubTabText,
                      { color: supportSubTab === 'warranty' ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    Warranty & Help
                  </Text>
                </TouchableOpacity>
              </View>

              {/* SUB-TAB 1: DATASHEET & MANUALS */}
              {supportSubTab === 'manuals' && (
                <View style={{ gap: SPACING.md }}>
                  {/* Official Manufacturer PDF Files */}
                  <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.sectionHeaderRow}>
                      <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
                      <Text style={[styles.sectionHeading, { color: colors.text }]}>
                        Manufacturer Technical Documents
                      </Text>
                    </View>
                    <Text style={[styles.supportIntroText, { color: colors.textSecondary }]}>
                      Official PDF engineering sheets and user operation guides for {product.brand} {product.title}.
                    </Text>

                    {product.documents && product.documents.length > 0 ? (
                      <View style={styles.docListContainer}>
                        {product.documents.map((doc, docIdx) => (
                          <View
                            key={docIdx}
                            style={[
                              styles.docCardExpanded,
                              { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
                            ]}
                          >
                            <View style={styles.docCardTopRow}>
                              <View
                                style={[
                                  styles.docIconBoxLarge,
                                  {
                                    backgroundColor:
                                      doc.type === 'manual' ? '#DCFCE7' : '#DBEAFE',
                                  },
                                ]}
                              >
                                <Ionicons
                                  name={doc.type === 'manual' ? 'book' : 'document-text'}
                                  size={24}
                                  color={doc.type === 'manual' ? '#15803D' : '#1D4ED8'}
                                />
                              </View>
                              <View style={styles.docInfoExpanded}>
                                <Text style={[styles.docTitleExpanded, { color: colors.text }]}>
                                  {doc.title}
                                </Text>
                                <Text style={[styles.docMetaExpanded, { color: colors.textSecondary }]}>
                                  {doc.type === 'manual'
                                    ? 'Official User & Installation Manual'
                                    : 'Technical Specification & Wiring Data'}
                                </Text>
                                <View style={styles.docTagsRow}>
                                  <View style={[styles.docFormatTag, { backgroundColor: colors.border }]}>
                                    <Text style={[styles.docFormatTagText, { color: colors.text }]}>PDF</Text>
                                  </View>
                                  {doc.filesize ? (
                                    <View style={[styles.docFormatTag, { backgroundColor: colors.border }]}>
                                      <Text style={[styles.docFormatTagText, { color: colors.textSecondary }]}>
                                        {doc.filesize}
                                      </Text>
                                    </View>
                                  ) : null}
                                  <View style={styles.docVerifiedTag}>
                                    <Ionicons name="checkmark-circle" size={11} color="#15803D" />
                                    <Text style={styles.docVerifiedTagText}>Verified Authentic</Text>
                                  </View>
                                </View>
                              </View>
                            </View>

                            {/* Action Buttons */}
                            <View style={styles.docActionButtonsExpanded}>
                              <TouchableOpacity
                                style={[styles.docOpenBtnExpanded, { backgroundColor: colors.primary }]}
                                onPress={() => handleOpenPdf(doc)}
                                activeOpacity={0.85}
                              >
                                <Ionicons name="eye-outline" size={16} color={isDark ? '#260B00' : '#FFFFFF'} />
                                <Text style={[styles.docOpenBtnExpandedText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>Open PDF Natively</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.docShareBtnExpanded,
                                  { borderColor: colors.border, backgroundColor: colors.surface },
                                ]}
                                onPress={() => handleSharePdf(doc)}
                                activeOpacity={0.8}
                              >
                                <Ionicons name="share-social-outline" size={16} color={colors.text} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View style={[styles.noDocCard, { backgroundColor: colors.surfaceVariant }]}>
                        <Ionicons name="document-text-outline" size={32} color={colors.textSecondary} />
                        <Text style={[styles.noDocTitle, { color: colors.text }]}>Digital PDF Available on Request</Text>
                        <Text style={[styles.noDocText, { color: colors.textSecondary }]}>
                          Radical Engineering archives full schematics and user manuals for {product.brand}. Reach out to our technical desk to receive the PDF copy via WhatsApp or email.
                        </Text>
                        <TouchableOpacity style={styles.requestManualBtn} onPress={handleRequestManual}>
                          <Ionicons name="logo-whatsapp" size={16} color="#15803D" />
                          <Text style={styles.requestManualText}>Request PDF from Engineering Desk</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Native Reader Feature Note */}
                  <View
                    style={[
                      styles.pdfFeatureNotice,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#EFF6FF',
                        borderColor: isDark ? '#334155' : '#BFDBFE',
                      },
                    ]}
                  >
                    <Ionicons name="phone-portrait-outline" size={20} color="#1D4ED8" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pdfFeatureTitle, { color: isDark ? '#93C5FD' : '#1E3A8A' }]}>
                        Native In-App PDF Viewer
                      </Text>
                      <Text style={[styles.pdfFeatureSub, { color: isDark ? '#CBD5E1' : '#3B82F6' }]}>
                        Documents open natively in an in-app reader with high-clarity vector rendering, pinch-to-zoom, page navigation, text search, and device print support.
                      </Text>
                    </View>
                  </View>

                  {/* Custom Sizing or Schematics Request */}
                  <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.sectionHeaderRow}>
                      <Ionicons name="construct-outline" size={18} color={colors.primary} />
                      <Text style={[styles.sectionHeading, { color: colors.text }]}>Custom Schematics & Firmware</Text>
                    </View>
                    <Text style={[styles.supportIntroText, { color: colors.textSecondary }]}>
                      Need single-line wiring diagrams (SLD), inverter firmware updates, or solar array sizing charts?
                    </Text>
                    <TouchableOpacity
                      style={styles.whatsAppDocRequestBtn}
                      onPress={handleRequestManual}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
                      <Text style={styles.whatsAppDocRequestBtnText}>Request Schematics on WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* SUB-TAB 2: WARRANTY & SERVICE */}
              {supportSubTab === 'warranty' && (
                <View style={{ gap: SPACING.md }}>
                  <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.sectionHeaderRow}>
                      <Ionicons name="shield-outline" size={18} color={colors.primary} />
                      <Text style={[styles.sectionHeading, { color: colors.text }]}>Warranty & Official Guarantee</Text>
                    </View>
                    <View style={styles.warrantyHighlightRow}>
                      <View style={styles.warrantyHighlightPill}>
                        <Ionicons name="shield-checkmark" size={16} color={COLORS.success} />
                        <Text style={styles.warrantyHighlightPillText}>{product.warranty}</Text>
                      </View>
                      <Text style={[styles.warrantyStatusNote, { color: colors.textSecondary }]}>
                        Manufacturer Backed Coverage
                      </Text>
                    </View>
                    <Text style={[styles.descriptionBody, { color: colors.text }]}>
                      Radical Engineering is an authorized engineering provider. Every unit includes full replacement or repair coverage per manufacturer policy, alongside certified engineer diagnostics across Kishoreganj and nationwide.
                    </Text>

                    <View
                      style={[
                        styles.supportContactBox,
                        {
                          backgroundColor: isDark ? 'rgba(252, 185, 116, 0.08)' : '#FBF6F3',
                          borderColor: isDark ? 'rgba(252, 185, 116, 0.28)' : '#EAD9D0',
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <View style={styles.supportContactHeader}>
                        <View
                          style={[
                            styles.supportContactIconWrap,
                            {
                              backgroundColor: isDark ? 'rgba(252, 185, 116, 0.16)' : 'rgba(60, 17, 0, 0.08)',
                            },
                          ]}
                        >
                          <Ionicons name="headset-outline" size={18} color={colors.primary} />
                        </View>
                        <Text style={[styles.supportContactTitle, { color: colors.text }]}>
                          Need Help or Sizing Confirmation?
                        </Text>
                      </View>
                      <Text style={[styles.supportContactSub, { color: colors.textSecondary }]}>
                        Speak directly with a certified electrical and solar engineer before finalizing your equipment order.
                      </Text>
                      <TouchableOpacity
                        style={[styles.callHotlineButton, { backgroundColor: colors.primary }]}
                        onPress={handleCallHotline}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="call" size={16} color={isDark ? '#260B00' : '#FFFFFF'} />
                        <Text style={[styles.callHotlineText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>
                          Call Hotline: {APP_CONFIG.hotline1}
                        </Text>
                      </TouchableOpacity>
                    </View>
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
        <TouchableOpacity
          style={styles.whatsAppActionBtn}
          onPress={handleWhatsAppConsult}
          activeOpacity={0.85}
        >
          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          <Text style={styles.whatsAppActionText}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addToCartActionBtn, { backgroundColor: isDark ? '#1E293B' : '#0F172A' }]}
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
          <Text style={[styles.buyNowActionText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>Buy Now</Text>
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
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    fontWeight: '600',
  },
  notFoundText: {
    fontSize: 16,
    fontWeight: '700',
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
    color: '#FFFFFF',
    fontWeight: '700',
  },
  heroImageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#F8FAFC',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainHeroImage: {
    width: '85%',
    height: '85%',
  },
  floatingTopActions: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'column',
    gap: 8,
  },
  floatingActionBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingBadgesRow: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    right: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  wattagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  wattagePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  subCatPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  subCatPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  stockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    gap: 5,
  },
  stockDotWhite: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  stockPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  infoWrapper: {
    padding: SPACING.md,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  skuText: {
    fontSize: 11,
    fontWeight: '600',
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    marginBottom: 8,
  },
  metaStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingScore: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F59E0B',
  },
  reviewsCount: {
    fontSize: 11,
  },
  warrantyStripBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  warrantyStripText: {
    fontSize: 12,
    fontWeight: '700',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm + 4,
  },
  priceLeadLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  priceNumbersRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  priceAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.primary,
  },
  savingsBox: {
    alignItems: 'flex-end',
  },
  strikeThroughPrice: {
    fontSize: 13,
    textDecorationLine: 'line-through',
  },
  saveTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginTop: 2,
  },
  saveTagText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '800',
  },
  serviceNoticeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: SPACING.sm + 2,
  },
  serviceNoticeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceNoticeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  qtySelectorBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  qtyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  qtySub: {
    fontSize: 11,
    marginTop: 1,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperVal: {
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: SPACING.md,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    fontWeight: '800',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm + 2,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureIconBubble: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  specsTableContainer: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginTop: 4,
  },
  specsTableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  specKeyText: {
    flex: 1.2,
    fontSize: 12,
    fontWeight: '500',
  },
  specValueText: {
    flex: 1.5,
    fontSize: 12,
    fontWeight: '700',
  },
  supportContactBox: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
  },
  supportContactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 6,
  },
  supportContactIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportContactTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  supportContactSub: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  callHotlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    gap: 8,
  },
  callHotlineText: {
    fontWeight: '800',
    fontSize: 13,
  },
  bottomActionBar: {
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
    elevation: 8,
  },
  whatsAppActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#25D366',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 46,
    gap: 6,
  },
  whatsAppActionText: {
    color: '#25D366',
    fontSize: 12,
    fontWeight: '800',
  },
  addToCartActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.md,
    height: 46,
    gap: 6,
  },
  addToCartActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  buyNowActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 46,
  },
  buyNowActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  docListContainer: {
    marginTop: 6,
    gap: 10,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm + 4,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: 10,
  },
  docIconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  docMeta: {
    fontSize: 11,
  },
  docActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  docOpenBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  docShareBtn: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDocCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    gap: 8,
  },
  noDocText: {
    fontSize: 12,
    textAlign: 'center',
  },
  requestManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#DCFCE7',
  },
  requestManualText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  supportSubTabBar: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: SPACING.md,
    gap: 4,
  },
  supportSubTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: RADIUS.sm + 2,
    gap: 6,
  },
  supportSubTabItemActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  supportSubTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  supportDocCountBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 2,
  },
  supportDocCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
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
    flexDirection: 'row',
    gap: 12,
  },
  docIconBoxLarge: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfoExpanded: {
    flex: 1,
  },
  docTitleExpanded: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  docMetaExpanded: {
    fontSize: 12,
    marginBottom: 6,
  },
  docTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docFormatTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  docFormatTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  docVerifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  docVerifiedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  docActionButtonsExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docOpenBtnExpanded: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: 9,
    gap: 6,
  },
  docOpenBtnExpandedText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  docShareBtnExpanded: {
    width: 40,
    height: 38,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDocTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  pdfFeatureNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  pdfFeatureTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  pdfFeatureSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  whatsAppDocRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    gap: 8,
    marginTop: SPACING.xs,
  },
  whatsAppDocRequestBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  warrantyHighlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  warrantyHighlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  warrantyHighlightPillText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '800',
  },
  warrantyStatusNote: {
    fontSize: 12,
  },
});
