import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';

interface ContactScreenProps {
  navigation: any;
}

export const ContactScreen: React.FC<ContactScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceType, setServiceType] = useState('Solar Rooftop Survey');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCall = (num: string) => {
    Linking.openURL(`tel:${num}`);
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${APP_CONFIG.email}?subject=Engineering Inquiry - Radical Mobile App`);
  };

  const handleWhatsApp = () => {
    Linking.openURL(`https://wa.me/${APP_CONFIG.whatsappNumber.replace('+', '')}?text=Hello%20Radical%20Engineering`);
  };

  const handleSubmitInquiry = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Required Fields', 'Please enter your name and phone number.');
      return;
    }

    setIsSubmitting(true);
    const res = await apiService.submitInquiry({
      name,
      phone,
      address: 'App Inquiry',
      serviceType,
      notes,
    });
    setIsSubmitting(false);

    Alert.alert('Inquiry Sent!', res.message, [
      {
        text: 'OK',
        onPress: () => {
          setName('');
          setPhone('');
          setNotes('');
        },
      },
    ]);
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Company Header Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Ionicons name="sunny" size={26} color="#FFFFFF" />
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
              style={[styles.quickActionBtn, { borderColor: COLORS.primary }]}
              onPress={() => handleCall(APP_CONFIG.hotline1Raw)}
            >
              <Ionicons name="call" size={18} color={COLORS.primary} />
              <Text style={[styles.quickActionText, { color: COLORS.primary }]}>Call Desk</Text>
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
            <Ionicons name="location-outline" size={20} color={COLORS.primary} style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Headquarters Address</Text>
              <Text style={[styles.infoVal, { color: colors.text }]}>{APP_CONFIG.address}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color={COLORS.primary} style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Direct Hotlines</Text>
              <Text style={[styles.infoVal, { color: colors.text }]}>
                {APP_CONFIG.hotline1} , {APP_CONFIG.hotline2}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color={COLORS.primary} style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Official Email</Text>
              <Text style={[styles.infoVal, { color: colors.text }]}>{APP_CONFIG.email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={COLORS.primary} style={styles.infoIcon} />
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
            <Text style={[styles.inputLabel, { color: colors.text }]}>Your Name *</Text>
            <TextInput
              placeholder="e.g. Ashik Ali Shanto"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              style={[styles.inputField, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Phone Number *</Text>
            <TextInput
              placeholder="e.g. 01760195100"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              style={[styles.inputField, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
            />
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
                      backgroundColor: serviceType === svc ? COLORS.primary : colors.surfaceVariant,
                      borderColor: serviceType === svc ? COLORS.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.servicePillText,
                      { color: serviceType === svc ? '#FFFFFF' : colors.text },
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
            style={styles.submitBtn}
            onPress={handleSubmitInquiry}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>
              {isSubmitting ? 'Submitting...' : 'Submit Inquiry'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Social Media Links */}
        <View style={styles.socialRow}>
          <TouchableOpacity
            style={[styles.socialButton, { backgroundColor: '#1877F2' }]}
            onPress={() => Linking.openURL(APP_CONFIG.facebookUrl)}
          >
            <Ionicons name="logo-facebook" size={20} color="#FFFFFF" />
            <Text style={styles.socialText}>Facebook</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialButton, { backgroundColor: '#FF0000' }]}
            onPress={() => Linking.openURL(APP_CONFIG.youtubeUrl)}
          >
            <Ionicons name="logo-youtube" size={20} color="#FFFFFF" />
            <Text style={styles.socialText}>YouTube</Text>
          </TouchableOpacity>
        </View>

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
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
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
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    gap: 8,
  },
  socialText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

