import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';
import { RoofType, GridType } from '../types';

interface RoofPlannerScreenProps {
  navigation: any;
}

export const RoofPlannerScreen: React.FC<RoofPlannerScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();

  const [roofAreaSqFt, setRoofAreaSqFt] = useState('800');
  const [monthlyBillBDT, setMonthlyBillBDT] = useState('6500');
  const [roofType, setRoofType] = useState<RoofType>('flat_rcc');
  const [gridType, setGridType] = useState<GridType>('hybrid');

  // Engineering calculation engine tailored for Bangladesh solar parameters
  const calculations = useMemo(() => {
    const area = parseFloat(roofAreaSqFt) || 0;
    const bill = parseFloat(monthlyBillBDT) || 0;

    // Average unit cost in BD is ~9.5 BDT / kWh
    const estimatedMonthlyUnits = bill / 9.5;
    // 1 kWp produces ~125 kWh / month in Bangladesh (4.2 PSH average)
    const kwNeededForBill = estimatedMonthlyUnits / 125;

    // Area limit: 1 kWp of 580W panels needs ~40 sq ft (including spacing/shadow factor)
    const kwPossibleFromArea = area / 40;

    // Capacity is capped by what fits or what satisfies the bill
    let recommendedKw = Math.min(kwNeededForBill, kwPossibleFromArea);
    if (recommendedKw < 1) recommendedKw = 1;
    recommendedKw = Math.round(recommendedKw * 10) / 10;

    const panelWattage = 580;
    const panelCount = Math.max(2, Math.ceil((recommendedKw * 1000) / panelWattage));
    const actualKw = Math.round(((panelCount * panelWattage) / 1000) * 10) / 10;

    const monthlyGenerationKwh = Math.round(actualKw * 125);
    const monthlySavingsBDT = Math.round(monthlyGenerationKwh * 9.5);
    const annualSavingsBDT = monthlySavingsBDT * 12;

    // Turnkey cost per watt:
    // On-grid: ~70-80 BDT / watt
    // Hybrid: ~95-115 BDT / watt
    // Off-grid: ~110-130 BDT / watt
    const costPerWatt = gridType === 'on_grid' ? 75 : gridType === 'hybrid' ? 105 : 120;
    const estimatedCostMin = Math.round(actualKw * 1000 * (costPerWatt - 5));
    const estimatedCostMax = Math.round(actualKw * 1000 * (costPerWatt + 5));

    const paybackYears = Math.round((estimatedCostMin / annualSavingsBDT) * 10) / 10;
    const co2OffsetTons = Math.round(actualKw * 1.1 * 10) / 10; // tons per year

    return {
      actualKw,
      panelCount,
      panelWattage,
      monthlyGenerationKwh,
      monthlySavingsBDT,
      annualSavingsBDT,
      estimatedCostMin,
      estimatedCostMax,
      paybackYears,
      co2OffsetTons,
    };
  }, [roofAreaSqFt, monthlyBillBDT, roofType, gridType]);

  const handleBookSurvey = () => {
    const text = encodeURIComponent(
      `Hello Radical Engineering! I calculated my rooftop solar potential on the Radical App:\n- Roof Area: ${roofAreaSqFt} sq ft (${roofType})\n- Monthly Bill: ৳${monthlyBillBDT}\n- Recommended Capacity: ${calculations.actualKw} kWp (${calculations.panelCount}x ${calculations.panelWattage}W panels)\n- System: ${gridType.toUpperCase()}\n\nPlease schedule a free on-site survey and formal quotation.`
    );
    Linking.openURL(`https://wa.me/${APP_CONFIG.whatsappNumber.replace('+', '')}?text=${text}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        showBack
        onBack={() => navigation.goBack()}
        title="Solar Roof Planner"
        subtitle="Rooftop Sizing & ROI"
        onOpenCart={() => navigation.navigate('Cart')}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Intro Banner */}
        <View
          style={[
            styles.introCard,
            {
              backgroundColor: isDark ? 'rgba(252, 185, 116, 0.12)' : '#F5EBE6',
              borderColor: isDark ? 'rgba(252, 185, 116, 0.3)' : '#EAD9D0',
            },
          ]}
        >
          <Ionicons name="sunny" size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.introTitle, { color: colors.primary }]}>Bangladesh Solar Calculator</Text>
            <Text style={[styles.introDesc, { color: isDark ? colors.textSecondary : '#7C2D12' }]}>
              Tailored to 4.5 peak sun hours, BPDB/DESCO net-metering formulas & Tier-1 panel specs.
            </Text>
          </View>
        </View>

        {/* Input Form */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Your Rooftop & Power Usage</Text>

          {/* Roof Area */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.text }]}>Usable Roof Area (Sq. Feet)</Text>
              <Text style={[styles.subLabel, { color: colors.textSecondary }]}>~27 sq ft per panel</Text>
            </View>
            <View style={[styles.inputBox, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
              <Ionicons name="scan-outline" size={18} color={colors.textSecondary} />
              <TextInput
                keyboardType="numeric"
                value={roofAreaSqFt}
                onChangeText={setRoofAreaSqFt}
                style={[styles.input, { color: colors.text }]}
                placeholder="e.g. 800"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.unitText, { color: colors.textSecondary }]}>sq ft</Text>
            </View>
          </View>

          {/* Monthly Electric Bill */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.text }]}>Average Monthly Electricity Bill</Text>
              <Text style={[styles.subLabel, { color: colors.textSecondary }]}>DESCO/BREB/NESCO</Text>
            </View>
            <View style={[styles.inputBox, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
              <Text style={[styles.unitPrefix, { color: colors.primary }]}>{APP_CONFIG.currency}</Text>
              <TextInput
                keyboardType="numeric"
                value={monthlyBillBDT}
                onChangeText={setMonthlyBillBDT}
                style={[styles.input, { color: colors.text }]}
                placeholder="e.g. 6500"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.unitText, { color: colors.textSecondary }]}>BDT / month</Text>
            </View>
          </View>

          {/* Roof Type Selection */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Roof Structure</Text>
            <View style={styles.pillRow}>
              {(['flat_rcc', 'tin_shed', 'sloped'] as RoofType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setRoofType(type)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: roofType === type ? colors.primary : colors.surfaceVariant,
                      borderColor: roofType === type ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: roofType === type ? (isDark ? '#260B00' : '#FFFFFF') : colors.text },
                    ]}
                  >
                    {type === 'flat_rcc' ? 'Flat Concrete (RCC)' : type === 'tin_shed' ? 'Tin Shed / Industrial' : 'Tilted Slope'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* System Type */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>System Architecture</Text>
            <View style={styles.pillRow}>
              {(['hybrid', 'on_grid', 'off_grid'] as GridType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setGridType(type)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: gridType === type ? COLORS.accent : colors.surfaceVariant,
                      borderColor: gridType === type ? COLORS.accent : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: gridType === type ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {type === 'hybrid' ? 'Hybrid (Solar + Battery)' : type === 'on_grid' ? 'On-Grid (Net Metering)' : 'Off-Grid Remote'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Calculation Result Dashboard */}
        <View style={[styles.resultsDashboard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.dashboardHeader}>
            <View style={{ flex: 1, paddingRight: SPACING.xs }}>
              <Text style={[styles.dashboardBadge, { color: colors.primary }]}>RECOMMENDED SYSTEM</Text>
              <Text style={[styles.dashboardKw, { color: colors.text }]}>
                {calculations.actualKw} <Text style={{ fontSize: 18, color: colors.textSecondary }}>kWp Capacity</Text>
              </Text>
            </View>
            <View style={[styles.panelCountBadge, { backgroundColor: isDark ? 'rgba(252, 185, 116, 0.15)' : '#F5EBE6' }]}>
              <Text style={[styles.panelCountText, { color: colors.primary }]}>{calculations.panelCount} Panels</Text>
              <Text style={[styles.panelWattText, { color: isDark ? colors.textSecondary : '#260B00' }]}>{calculations.panelWattage}W Tier-1</Text>
            </View>
          </View>

          {/* Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="flash" size={18} color={COLORS.warning} />
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Monthly Generation</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                ~{calculations.monthlyGenerationKwh.toLocaleString()} <Text style={styles.metricUnit}>kWh (Units)</Text>
              </Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="wallet" size={18} color={COLORS.success} />
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Monthly Savings</Text>
              <Text style={[styles.metricValue, { color: COLORS.success }]}>
                ৳ {calculations.monthlySavingsBDT.toLocaleString()}
              </Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="trending-up" size={18} color={COLORS.accent} />
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Estimated Payback</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                ~{calculations.paybackYears} <Text style={styles.metricUnit}>Years</Text>
              </Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="leaf" size={18} color="#10B981" />
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Annual CO2 Offset</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {calculations.co2OffsetTons} <Text style={styles.metricUnit}>Tons / Year</Text>
              </Text>
            </View>
          </View>

          {/* Turnkey Estimated Cost */}
          <View style={[styles.costBox, { backgroundColor: colors.surfaceVariant }]}>
            <View style={styles.costTextCol}>
              <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Estimated Turnkey Installation Cost</Text>
              <Text style={[styles.costSub, { color: colors.textMuted }]}>Includes panels, inverter, cabling & mounting</Text>
            </View>
            <Text style={[styles.costRange, { color: colors.primary }]}>
              ৳ {(calculations.estimatedCostMin / 1000).toFixed(0)}k - {(calculations.estimatedCostMax / 1000).toFixed(0)}k
            </Text>
          </View>

          {/* Survey Booking CTA */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleBookSurvey}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
            <Text style={styles.ctaButtonText}>Book Free Rooftop Site Survey</Text>
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
  introCard: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  introTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9A3412',
  },
  introDesc: {
    fontSize: 11,
    color: '#9A3412',
    lineHeight: 15,
    marginTop: 2,
  },
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  subLabel: {
    fontSize: 11,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '600',
  },
  unitPrefix: {
    fontSize: 16,
    fontWeight: '700',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultsDashboard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: SPACING.sm,
  },
  dashboardBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  dashboardKw: {
    fontSize: 28,
    fontWeight: '800',
  },
  panelCountBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    flexShrink: 0,
  },
  panelCountText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  panelWattText: {
    color: COLORS.primaryDark,
    fontSize: 10,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  metricCard: {
    width: '48%',
    padding: SPACING.sm + 4,
    borderRadius: RADIUS.md,
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 4,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  metricUnit: {
    fontSize: 11,
    fontWeight: '400',
  },
  costBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  costTextCol: {
    flex: 1,
  },
  costLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  costSub: {
    fontSize: 10,
    marginTop: 2,
  },
  costRange: {
    fontSize: 17,
    fontWeight: '800',
    flexShrink: 0,
    textAlign: 'right',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    marginTop: SPACING.md,
    gap: 8,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

