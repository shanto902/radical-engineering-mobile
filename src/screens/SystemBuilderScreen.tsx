import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { PRESET_APPLIANCES } from '../constants/mockData';
import { Appliance, SystemBuilderResults, Product } from '../types';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';

interface SystemBuilderScreenProps {
  navigation: any;
}

export const SystemBuilderScreen: React.FC<SystemBuilderScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { addToCart } = useCart();

  const [appliances, setAppliances] = useState<Appliance[]>(PRESET_APPLIANCES);
  const [backupHours, setBackupHours] = useState<number>(4);
  const [isSolarHybrid, setIsSolarHybrid] = useState<boolean>(true);

  const updateQuantity = (id: string, delta: number) => {
    setAppliances(prev =>
      prev.map(app => {
        if (app.id === id) {
          const nextQty = Math.max(0, app.quantity + delta);
          return { ...app, quantity: nextQty };
        }
        return app;
      })
    );
  };

  // Calculation Engine
  const results: SystemBuilderResults = useMemo(() => {
    const totalWatts = appliances.reduce((sum, app) => sum + app.wattage * app.quantity, 0);

    // Inverter sizing: Continuous load + 25% safety surge margin / power factor (0.8)
    const recommendedVa = Math.ceil((totalWatts * 1.25) / 0.8 / 100) * 100;
    const finalInverterVa = Math.max(600, recommendedVa);

    // Energy needed: Watt-hours = Watts * backup hours
    const requiredWattHours = totalWatts * backupHours;

    // Battery system:
    // If under 1000VA -> 12V system
    // 1000VA to 2000VA -> 24V system
    // Above 2000VA -> 48V system
    const batteryVoltage = finalInverterVa > 2200 ? 48 : finalInverterVa > 1200 ? 24 : 12;
    const batteryCount = batteryVoltage / 12;

    // Ah = Watt-hours / (Voltage * 0.75 Depth-of-Discharge & efficiency)
    const rawAh = requiredWattHours / (batteryVoltage * 0.75);
    let recommendedBatteryAh = 100;
    if (rawAh <= 110) recommendedBatteryAh = 100;
    else if (rawAh <= 140) recommendedBatteryAh = 130;
    else if (rawAh <= 170) recommendedBatteryAh = 150;
    else recommendedBatteryAh = 200;

    // Solar panels recommendation
    let recommendedSolarKw = 0;
    if (isSolarHybrid) {
      // Sized to produce 1.3x daily consumption over 4 peak sun hours
      recommendedSolarKw = Math.round(((requiredWattHours * 1.3) / 4 / 1000) * 10) / 10;
      if (recommendedSolarKw < 0.6) recommendedSolarKw = 0.58; // 1x 580W panel minimum
    }

    // Cost estimation in BDT:
    // Inverter cost: ~12-16 BDT per VA
    const inverterCost = finalInverterVa * 14;
    // Battery cost: 200Ah tubular is ~25500, 150Ah is ~20000, 100Ah is ~15000
    const singleBatCost = recommendedBatteryAh === 200 ? 25500 : recommendedBatteryAh === 150 ? 20000 : 15000;
    const totalBatteryCost = singleBatCost * batteryCount;
    // Solar cost: ~38 BDT / Watt
    const solarCost = isSolarHybrid ? recommendedSolarKw * 1000 * 38 : 0;
    // Wiring, rack & accessories
    const accessoriesCost = 6500;

    const estimatedCostBDT = Math.round(inverterCost + totalBatteryCost + solarCost + accessoriesCost);

    return {
      totalWatts,
      recommendedVa: finalInverterVa,
      requiredWattHours,
      recommendedBatteryAh,
      batteryVoltage,
      batteryCount,
      recommendedSolarKw: isSolarHybrid ? recommendedSolarKw : undefined,
      estimatedCostBDT,
      breakdown: {
        inverter: `${finalInverterVa}VA Pure Sine Wave (${isSolarHybrid ? 'Solar Hybrid' : 'Standard IPS'})`,
        battery: `${batteryCount}x ${recommendedBatteryAh}Ah 12V Tubular Battery (${batteryVoltage}V System)`,
        solarPanels: isSolarHybrid ? `${recommendedSolarKw} kWp Tier-1 Solar PV Array` : undefined,
      },
    };
  }, [appliances, backupHours, isSolarHybrid]);

  const handleAddPackageToCart = () => {
    const customProduct: Product = {
      id: `custom-ips-${Date.now()}`,
      title: `Custom ${results.recommendedVa}VA ${isSolarHybrid ? 'Solar Hybrid' : 'Standard'} IPS Package`,
      slug: 'custom-ips-package',
      categoryId: 'ips-solar-ips',
      categoryName: 'IPS / Solar IPS',
      brand: 'Radical Custom Engineering',
      model: `RE-SYS-${results.recommendedVa}VA`,
      price: results.estimatedCostBDT,
      inStock: true,
      rating: 5.0,
      reviewsCount: 1,
      image: isSolarHybrid
        ? 'https://admin.atiar.com.bd/assets/7ba5b149-9be4-44d9-bb8d-44871fac26d2'
        : 'https://admin.atiar.com.bd/assets/a88fb120-db99-434c-bb5b-c8c2a39df946',
      warranty: '2 Years Comprehensive Warranty',
      description: `Engineered for ${results.totalWatts}W continuous load with ${backupHours} hours uninterrupted backup. Includes ${results.breakdown.inverter}, ${results.breakdown.battery}${results.breakdown.solarPanels ? ', and ' + results.breakdown.solarPanels : ''}.`,
      features: [
        `Continuous load capacity: ${results.totalWatts} Watts`,
        `Guaranteed backup: ${backupHours} hours runtime`,
        results.breakdown.inverter,
        results.breakdown.battery,
      ],
      specs: {
        'Inverter Rating': `${results.recommendedVa} VA`,
        'Continuous Watts': `${results.totalWatts} W`,
        'Battery Bank': `${results.breakdown.battery}`,
        'System Voltage': `${results.batteryVoltage} V DC`,
        'Backup Duration': `${backupHours} Hours`,
      },
    };

    addToCart(customProduct, 1, results);
    Alert.alert(
      'Package Added!',
      'Your customized IPS system has been added to the Cart. Would you like to review it?',
      [
        { text: 'Keep Designing', style: 'cancel' },
        { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
      ]
    );
  };

  const handleConsultWhatsApp = () => {
    const message = encodeURIComponent(
      `Hello Radical Engineering! I built a customized system on your app:\n- Total Load: ${results.totalWatts}W (${backupHours} hrs backup)\n- Inverter: ${results.breakdown.inverter}\n- Battery: ${results.breakdown.battery}\n${results.breakdown.solarPanels ? '- Solar: ' + results.breakdown.solarPanels + '\n' : ''}- Estimated Total: ৳${results.estimatedCostBDT.toLocaleString()}\n\nPlease confirm availability and delivery to my location.`
    );
    Linking.openURL(`https://wa.me/${APP_CONFIG.whatsappNumber.replace('+', '')}?text=${message}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        showBack
        onBack={() => navigation.goBack()}
        title="Solar IPS Builder"
        subtitle="Custom Load Engineering"
        onOpenCart={() => navigation.navigate('Cart')}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Architecture Mode Toggle */}
        <View style={[styles.modeToggleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.modeButton, isSolarHybrid && styles.activeModeButton]}
            onPress={() => setIsSolarHybrid(true)}
          >
            <Ionicons name="sunny" size={16} color={isSolarHybrid ? '#FFFFFF' : colors.textSecondary} />
            <Text style={[styles.modeText, { color: isSolarHybrid ? '#FFFFFF' : colors.text }]}>
              Solar Hybrid IPS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeButton, !isSolarHybrid && styles.activeModeButton]}
            onPress={() => setIsSolarHybrid(false)}
          >
            <Ionicons name="flash" size={16} color={!isSolarHybrid ? '#FFFFFF' : colors.textSecondary} />
            <Text style={[styles.modeText, { color: !isSolarHybrid ? '#FFFFFF' : colors.text }]}>
              Standard IPS
            </Text>
          </TouchableOpacity>
        </View>

        {/* Step 1: Appliances Selection */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>1. Select Your Appliances</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Add connected devices to compute power consumption
              </Text>
            </View>
            <View style={styles.totalWattsBadge}>
              <Text style={styles.totalWattsText}>{results.totalWatts} W</Text>
            </View>
          </View>

          {appliances.map((app) => (
            <View
              key={app.id}
              style={[styles.applianceRow, { borderBottomColor: colors.border }]}
            >
              <View style={styles.applianceInfo}>
                <Ionicons name={app.icon as any} size={20} color={COLORS.primary} style={styles.appIcon} />
                <View>
                  <Text style={[styles.appName, { color: colors.text }]}>{app.name}</Text>
                  <Text style={[styles.appWatt, { color: colors.textSecondary }]}>
                    {app.wattage}W each
                  </Text>
                </View>
              </View>

              <View style={[styles.qtyBox, { borderColor: colors.border, backgroundColor: colors.surfaceVariant }]}>
                <TouchableOpacity
                  onPress={() => updateQuantity(app.id, -1)}
                  style={styles.qtyBtn}
                >
                  <Ionicons name="remove" size={16} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.qtyText, { color: colors.text }]}>{app.quantity}</Text>
                <TouchableOpacity
                  onPress={() => updateQuantity(app.id, 1)}
                  style={styles.qtyBtn}
                >
                  <Ionicons name="add" size={16} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Step 2: Backup Duration Selector */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>2. Desired Backup Time</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            How many hours of continuous backup do you need during outages?
          </Text>

          <View style={styles.hoursRow}>
            {[2, 4, 6, 8].map((hours) => (
              <TouchableOpacity
                key={hours}
                onPress={() => setBackupHours(hours)}
                style={[
                  styles.hourBtn,
                  {
                    backgroundColor: backupHours === hours ? COLORS.primary : colors.surfaceVariant,
                    borderColor: backupHours === hours ? COLORS.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.hourBtnText,
                    { color: backupHours === hours ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {hours} Hours
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Step 3: Engineering Specification Output */}
        <View style={[styles.resultsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.resultsHeader}>
            <View>
              <Text style={styles.engineeredBadge}>RECOMMENDED HARDWARE</Text>
              <Text style={[styles.systemVaTitle, { color: colors.text }]}>
                {results.recommendedVa} VA Inverter
              </Text>
            </View>
            <View style={styles.voltageBadge}>
              <Text style={styles.voltageBadgeText}>{results.batteryVoltage}V System</Text>
            </View>
          </View>

          {/* Hardware Bill of Materials */}
          <View style={styles.bomList}>
            <View style={[styles.bomItem, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="hardware-chip" size={18} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.bomTitle, { color: colors.text }]}>Inverter / UPS Unit</Text>
                <Text style={[styles.bomDesc, { color: colors.textSecondary }]}>{results.breakdown.inverter}</Text>
              </View>
            </View>

            <View style={[styles.bomItem, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="battery-charging" size={18} color={COLORS.success} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.bomTitle, { color: colors.text }]}>Battery Bank</Text>
                <Text style={[styles.bomDesc, { color: colors.textSecondary }]}>{results.breakdown.battery}</Text>
              </View>
            </View>

            {results.breakdown.solarPanels && (
              <View style={[styles.bomItem, { backgroundColor: colors.surfaceVariant }]}>
                <Ionicons name="sunny" size={18} color={COLORS.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bomTitle, { color: colors.text }]}>Solar Array</Text>
                  <Text style={[styles.bomDesc, { color: colors.textSecondary }]}>{results.breakdown.solarPanels}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Price Summary */}
          <View style={[styles.costSummaryBox, { backgroundColor: colors.surfaceVariant }]}>
            <View>
              <Text style={[styles.costSummaryLabel, { color: colors.textSecondary }]}>Total Package Estimate</Text>
              <Text style={[styles.costSummarySub, { color: colors.textMuted }]}>Includes wiring, rack & setup</Text>
            </View>
            <Text style={styles.totalCostBDT}>
              ৳ {results.estimatedCostBDT.toLocaleString()}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsCol}>
            <TouchableOpacity
              style={styles.addToCartPackageBtn}
              onPress={handleAddPackageToCart}
              activeOpacity={0.85}
            >
              <Ionicons name="cart" size={18} color="#FFFFFF" />
              <Text style={styles.addToCartPackageText}>Add Package to Cart</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.whatsAppPackageBtn}
              onPress={handleConsultWhatsApp}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
              <Text style={styles.whatsAppPackageText}>Send Specs to WhatsApp</Text>
            </TouchableOpacity>
          </View>
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
  modeToggleCard: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  activeModeButton: {
    backgroundColor: COLORS.primary,
  },
  modeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  totalWattsBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  totalWattsText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  applianceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  applianceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appIcon: {
    marginRight: 10,
  },
  appName: {
    fontSize: 13,
    fontWeight: '600',
  },
  appWatt: {
    fontSize: 11,
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    paddingHorizontal: 8,
    fontSize: 13,
    fontWeight: '700',
  },
  hoursRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  hourBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  hourBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resultsCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  engineeredBadge: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  systemVaTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  voltageBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  voltageBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  bomList: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  bomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm + 4,
    borderRadius: RADIUS.md,
    gap: 10,
  },
  bomTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  bomDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  costSummaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
  },
  costSummaryLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  costSummarySub: {
    fontSize: 10,
  },
  totalCostBDT: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  actionButtonsCol: {
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  addToCartPackageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    gap: 8,
  },
  addToCartPackageText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  whatsAppPackageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    gap: 8,
  },
  whatsAppPackageText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

