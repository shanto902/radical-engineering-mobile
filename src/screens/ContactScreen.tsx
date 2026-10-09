import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  Animated,
  Easing,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';

interface ContactScreenProps {
  navigation: any;
}

interface SubmittedInquiryData {
  inquiryId?: number;
  name: string;
  phone: string;
  serviceType: string;
  notes?: string;
}

export const ContactScreen: React.FC<ContactScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceType, setServiceType] = useState('Solar Rooftop Survey');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedInquiryData, setSubmittedInquiryData] = useState<SubmittedInquiryData | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Confetti particles for celebration popup
  const [particles] = useState(() =>
    Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 320,
      y: (Math.random() - 0.7) * 360,
      size: Math.random() * 8 + 5,
      color: [
        '#F97316',
        '#EAB308',
        '#10B981',
        '#3B82F6',
        '#8B5CF6',
        '#EC4899',
        '#14B8A6',
      ][Math.floor(Math.random() * 7)],
      rotation: `${Math.floor(Math.random() * 360)}deg`,
    }))
  );

  const overlayFadeAnim = useRef(new Animated.Value(0)).current;
  const modalScaleAnim = useRef(new Animated.Value(0.3)).current;
  const checkmarkScaleAnim = useRef(new Animated.Value(0)).current;
  const particlesAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (submittedInquiryData) {
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
  }, [submittedInquiryData]);

  const handleCopyInquiryId = async (id: number) => {
    try {
      await Clipboard.setStringAsync(String(id));
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCall = (num: string) => {
    Linking.openURL(`tel:${num}`);
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${APP_CONFIG.email}?subject=Engineering Inquiry - Radical Mobile App`);
  };

  const handleWhatsApp = () => {
    Linking.openURL(`https://wa.me/${APP_CONFIG.whatsappNumber.replace('+', '')}?text=Hello%20Radical%20Engineering`);
  };

  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const handleSubmitInquiry = async () => {
    Keyboard.dismiss();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    const newErrors: { name?: string; phone?: string } = {};

    if (!cleanName) {
      newErrors.name = 'Full name is required';
    }

    const digitsOnly = cleanPhone.replace(/[\s\-\(\)\+]/g, '');
    if (!cleanPhone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^01[0-9]{9}$/.test(digitsOnly.slice(-11))) {
      newErrors.phone = 'Please enter a valid 11-digit mobile number (e.g. 017xxxxxxxx)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      const res = await apiService.submitInquiry({
        name: cleanName,
        phone: cleanPhone,
        serviceType,
        notes,
      });

      if (res.success) {
        setSubmittedInquiryData({
          inquiryId: res.inquiryId,
          name: cleanName,
          phone: cleanPhone,
          serviceType,
          notes,
        });
        setName('');
        setPhone('');
        setNotes('');
        setErrors({});
      } else {
        Alert.alert('Inquiry Notice', res.message || 'Please call our hotline directly to book your survey.');
      }
    } catch {
      Alert.alert('Network Error', 'Could not connect. Please try again or call our hotline directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const services = [
    'Solar Rooftop Survey',
    'Solar IPS / IPS Installation',
    'Lightning Protection (LPS)',
    'Battery & Inverter Servicing',
    'Bulk Equipment Supply',
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Contact Engineering"
        subtitle="Office & Site Desk"
        onOpenCart={() => navigation.navigate('Cart')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Company Header Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.brandRow}>
            <View style={[styles.logoBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="sunny" size={26} color={isDark ? '#260B00' : '#FFFFFF'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.companyName, { color: colors.text }]}>{APP_CONFIG.companyName}</Text>
              <Text style={[styles.companyTagline, { color: colors.textSecondary }]}>
                {APP_CONFIG.tagline}
              </Text>
            </View>
          </View>

          {/* Quick Contact Buttons */}
          <View style={styles.contactActionRow}>
            <TouchableOpacity
              style={[styles.quickActionBtn, { borderColor: colors.primary }]}
              onPress={() => handleCall(APP_CONFIG.hotline1Raw)}
            >
              <Ionicons name="call" size={18} color={colors.primary} />
              <Text style={[styles.quickActionText, { color: colors.primary }]}>Call Desk</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionBtn, { borderColor: '#25D366' }]}
              onPress={handleWhatsApp}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              <Text style={[styles.quickActionText, { color: '#25D366' }]}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionBtn, { borderColor: COLORS.accent }]}
              onPress={handleEmail}
            >
              <Ionicons name="mail" size={18} color={COLORS.accent} />
              <Text style={[styles.quickActionText, { color: COLORS.accent }]}>Email Us</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Detailed Office Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Corporate & Engineering Office</Text>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color={colors.primary} style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Headquarters Address</Text>
              <Text style={[styles.infoVal, { color: colors.text }]}>{APP_CONFIG.address}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color={colors.primary} style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Direct Hotlines</Text>
              <Text style={[styles.infoVal, { color: colors.text }]}>
                {APP_CONFIG.hotline1} , {APP_CONFIG.hotline2}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Official Email</Text>
              <Text style={[styles.infoVal, { color: colors.text }]}>{APP_CONFIG.email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={colors.primary} style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Operating Hours</Text>
              <Text style={[styles.infoVal, { color: colors.text }]}>{APP_CONFIG.operatingHours}</Text>
            </View>
          </View>
        </View>

        {/* Quick Inquiry / Survey Booking Form */}
        <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Send an Engineering Inquiry</Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
            Our engineers will get back to you with advice, load calculations, or a site survey quote.
          </Text>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Your Name</Text>
              <Text style={styles.requiredStar}>*</Text>
            </View>
            <TextInput
              placeholder="e.g. Ashik Ali Shanto"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              style={[
                styles.inputField,
                {
                  backgroundColor: colors.surfaceVariant,
                  color: colors.text,
                  borderColor: errors.name ? '#EF4444' : colors.border,
                  borderWidth: errors.name ? 1.5 : 1,
                },
              ]}
              returnKeyType="next"
            />
            {errors.name ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={13} color="#EF4444" />
                <Text style={styles.errorText}>{errors.name}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Phone Number</Text>
              <Text style={styles.requiredStar}>*</Text>
            </View>
            <TextInput
              placeholder="e.g. 01760195100"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              style={[
                styles.inputField,
                {
                  backgroundColor: colors.surfaceVariant,
                  color: colors.text,
                  borderColor: errors.phone ? '#EF4444' : colors.border,
                  borderWidth: errors.phone ? 1.5 : 1,
                },
              ]}
              returnKeyType="done"
            />
            {errors.phone ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={13} color="#EF4444" />
                <Text style={styles.errorText}>{errors.phone}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Service Required</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servicesPills}>
              {services.map((svc) => (
                <TouchableOpacity
                  key={svc}
                  onPress={() => setServiceType(svc)}
                  style={[
                    styles.servicePill,
                    {
                      backgroundColor: serviceType === svc ? colors.primary : colors.surfaceVariant,
                      borderColor: serviceType === svc ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.servicePillText,
                      { color: serviceType === svc ? (isDark ? '#260B00' : '#FFFFFF') : colors.text },
                    ]}
                  >
                    {svc}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Message / Requirements (Optional)</Text>
            <TextInput
              placeholder="Details about your building, expected load, or district..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
              style={[styles.inputField, styles.textArea, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: isSubmitting ? 0.75 : 1 }]}
            onPress={handleSubmitInquiry}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color={isDark ? '#260B00' : '#FFFFFF'} size="small" />
                <Text style={[styles.submitBtnText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>
                  Submitting Inquiry...
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="paper-plane-outline" size={16} color={isDark ? '#260B00' : '#FFFFFF'} />
                <Text style={[styles.submitBtnText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>
                  Submit Engineering Inquiry
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Social Media Links */}
        <View style={styles.socialRow}>
          <TouchableOpacity
            style={[styles.socialButton, { backgroundColor: '#1877F2' }]}
            onPress={() => Linking.openURL(APP_CONFIG.facebookUrl)}
          >
            <Ionicons name="logo-facebook" size={18} color="#FFFFFF" />
            <Text style={styles.socialText}>Facebook</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialButton, { backgroundColor: '#FF0000' }]}
            onPress={() => Linking.openURL(APP_CONFIG.youtubeUrl)}
          >
            <Ionicons name="logo-youtube" size={18} color="#FFFFFF" />
            <Text style={styles.socialText}>YouTube</Text>
          </TouchableOpacity>
        </View>

        {/* Developer & System Architect Profile Card (Frontend, Backend & Mobile) */}
        <View style={[styles.developerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.developerHeaderRow}>
            <View style={[styles.developerAvatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.developerAvatarText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>AS</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.developerBadgeRow}>
                <Text
                  style={[
                    styles.developerRoleBadge,
                    {
                      color: colors.primary,
                      backgroundColor: isDark ? 'rgba(252, 185, 116, 0.15)' : '#F5EBE6',
                    },
                  ]}
                >
                  {APP_CONFIG.developerRole}
                </Text>
              </View>
              <Text style={[styles.developerName, { color: colors.text }]}>{APP_CONFIG.developerName}</Text>
            </View>
          </View>

          <Text style={[styles.developerBio, { color: colors.textSecondary }]}>
            Engineered and developed the entire technical ecosystem for Radical Engineering — including the web frontend, backend APIs & Directus integrations, and cross-platform mobile application.
          </Text>

          {/* Tech stack highlights */}
          <View style={styles.techStackRow}>
            <View style={[styles.techPill, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
              <Ionicons name="globe-outline" size={13} color={colors.primary} />
              <Text style={[styles.techPillText, { color: colors.text }]}>Web Frontend</Text>
            </View>
            <View style={[styles.techPill, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
              <Ionicons name="server-outline" size={13} color={colors.primary} />
              <Text style={[styles.techPillText, { color: colors.text }]}>Backend & APIs</Text>
            </View>
            <View style={[styles.techPill, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
              <Ionicons name="phone-portrait-outline" size={13} color={colors.primary} />
              <Text style={[styles.techPillText, { color: colors.text }]}>Mobile App</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.linkedinBtn, { backgroundColor: '#0A66C2' }]}
            activeOpacity={0.85}
            onPress={() => Linking.openURL(APP_CONFIG.developerLinkedIn)}
          >
            <Ionicons name="logo-linkedin" size={18} color="#FFFFFF" />
            <Text style={styles.linkedinBtnText}>Connect on LinkedIn</Text>
            <Ionicons name="open-outline" size={15} color="#FFFFFF" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Celebratory Inquiry Submitted Popup (Matches Purchase Modal) */}
      {submittedInquiryData && (
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

            <Text style={[styles.successTitle, { color: colors.text }]}>Inquiry Submitted Successfully!</Text>
            <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
              Thank you, <Text style={{ fontWeight: '700', color: colors.text }}>{submittedInquiryData.name}</Text>! Your engineering inquiry has been received by Radical Engineering.
            </Text>

            {/* Inquiry Reference / Service Badge */}
            <TouchableOpacity
              style={[styles.orderIdBadge, { backgroundColor: isDark ? 'rgba(252, 185, 116, 0.15)' : '#F5EBE6' }]}
              onPress={() => submittedInquiryData.inquiryId && handleCopyInquiryId(submittedInquiryData.inquiryId)}
              activeOpacity={submittedInquiryData.inquiryId ? 0.8 : 1}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.orderIdLabel, { color: colors.textSecondary }]}>
                  {submittedInquiryData.inquiryId ? 'Ref ID:' : 'Service:'}
                </Text>
                <Text style={[styles.orderIdValue, { color: colors.primary }]}>
                  {submittedInquiryData.inquiryId ? `#INQ-${submittedInquiryData.inquiryId}` : submittedInquiryData.serviceType}
                </Text>
              </View>
              {submittedInquiryData.inquiryId ? (
                <View style={styles.copyBtnWrap}>
                  <Ionicons
                    name={copiedId ? 'checkmark' : 'copy-outline'}
                    size={14}
                    color={copiedId ? '#16A34A' : colors.primary}
                  />
                  <Text style={[styles.copyText, { color: copiedId ? '#16A34A' : colors.primary }]}>
                    {copiedId ? 'Copied' : 'Copy'}
                  </Text>
                </View>
              ) : (
                <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
              )}
            </TouchableOpacity>

            {/* Summary info box */}
            <View style={[styles.orderSummaryBox, { backgroundColor: colors.surfaceVariant }]}>
              <View style={styles.summaryInfoRow}>
                <Text style={[styles.summaryInfoLabel, { color: colors.textSecondary }]}>Service Required:</Text>
                <Text style={[styles.summaryInfoValue, { color: colors.primary }]} numberOfLines={1}>
                  {submittedInquiryData.serviceType}
                </Text>
              </View>
              <View style={styles.summaryInfoRow}>
                <Text style={[styles.summaryInfoLabel, { color: colors.textSecondary }]}>Contact Phone:</Text>
                <Text style={[styles.summaryInfoValue, { color: colors.text }]}>{submittedInquiryData.phone}</Text>
              </View>
              <View style={styles.summaryInfoRow}>
                <Text style={[styles.summaryInfoLabel, { color: colors.textSecondary }]}>Status:</Text>
                <View style={styles.statusPill}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>PENDING DESK REVIEW</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.deliveryNote, { color: colors.textMuted }]}>
              Our engineering desk in Kishoreganj will review your requirements and reach out within business hours.
            </Text>

            {/* Action buttons */}
            <View style={styles.successActionsCol}>
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setSubmittedInquiryData(null);
                  handleCall(APP_CONFIG.hotline1Raw);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="call" size={16} color={isDark ? '#260B00' : '#FFFFFF'} />
                <Text style={[styles.primaryActionText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>
                  Call Desk Immediately
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryActionBtn, { borderColor: colors.border }]}
                onPress={() => setSubmittedInquiryData(null)}
                activeOpacity={0.85}
              >
                <Text style={[styles.secondaryActionText, { color: colors.text }]}>Done</Text>
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
  },
  profileCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyName: {
    fontSize: 17,
    fontWeight: '800',
  },
  companyTagline: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  contactActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    gap: 6,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 11,
    marginBottom: SPACING.md,
    lineHeight: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.sm + 4,
    gap: 10,
  },
  infoIcon: {
    marginTop: 2,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 18,
  },
  formCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.sm + 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  requiredStar: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputField: {
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
    paddingVertical: 8,
  },
  servicesPills: {
    gap: 6,
    paddingVertical: 4,
  },
  servicePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  servicePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  socialRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  socialText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  developerCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  developerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    marginBottom: SPACING.sm,
  },
  developerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  developerAvatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  developerBadgeRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  developerRoleBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    overflow: 'hidden',
  },
  developerName: {
    fontSize: 16,
    fontWeight: '800',
  },
  developerBio: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: SPACING.sm + 2,
  },
  techStackRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.md,
  },
  techPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  techPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  linkedinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  linkedinBtnText: {
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
    maxWidth: 180,
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
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

