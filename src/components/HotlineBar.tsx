import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';

export const HotlineBar: React.FC = () => {
  const { colors } = useTheme();

  const handleCall = (num: string) => {
    Linking.openURL(`tel:${num}`);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent('Hello Radical Engineering, I need information about Solar / IPS systems.');
    Linking.openURL(`https://wa.me/${APP_CONFIG.whatsappNumber.replace('+', '')}?text=${text}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <View style={styles.tag}>
          <View style={styles.liveDot} />
          <Text style={styles.tagText}>LIVE ENGINEERING DESK</Text>
        </View>
        <Text style={[styles.hoursText, { color: colors.textSecondary }]}>Sat-Thu: 9AM - 8PM</Text>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>Need Expert Solar or IPS Advice?</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Speak directly with our engineers for custom site survey and sizing in Bangladesh.
      </Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleCall(APP_CONFIG.hotline1Raw)}
          style={[styles.callBtn, { borderColor: colors.primary }]}
        >
          <Ionicons name="call" size={15} color={colors.primary} />
          <Text style={[styles.callBtnText, { color: colors.primary }]}>{APP_CONFIG.hotline1}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleWhatsApp}
          style={styles.whatsappBtn}
        >
          <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
          <Text style={styles.whatsappText}>WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.success,
    letterSpacing: 0.5,
  },
  hoursText: {
    fontSize: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: SPACING.md - 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    gap: 6,
  },
  callBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  whatsappText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

