import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { PRESET_APPLIANCES } from '../constants/mockData';
import { Appliance, SystemBuilderResults, Product } from '../types';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';
import { storageService, SavedCustomDevice } from '../services/storage';

interface SystemBuilderScreenProps {
  navigation: any;
}

interface LibraryAppliance {
  id: string;
  name: string;
  wattage: number;
  icon: string;
  category: string;
  isCustom?: boolean;
}

const APPLIANCE_LIBRARY: LibraryAppliance[] = [
  // Popular
  { id: 'lib-fan', name: 'Ceiling Fan', wattage: 75, icon: 'speedometer-outline', category: 'Popular' },
  { id: 'lib-led', name: 'LED Light / Tube', wattage: 18, icon: 'bulb-outline', category: 'Popular' },
  { id: 'lib-tv', name: 'LED Smart TV (32"-55")', wattage: 80, icon: 'tv-outline', category: 'Popular' },
  { id: 'lib-wifi', name: 'Wi-Fi Router & ONU', wattage: 15, icon: 'wifi-outline', category: 'Popular' },
  { id: 'lib-laptop', name: 'Laptop / PC Computer', wattage: 120, icon: 'laptop-outline', category: 'Popular' },
  { id: 'lib-fridge-inv', name: 'Inverter Refrigerator', wattage: 180, icon: 'cube-outline', category: 'Popular' },

  // Electronics
  { id: 'lib-desktop', name: 'Desktop PC + Monitor', wattage: 200, icon: 'desktop-outline', category: 'Electronics' },
  { id: 'lib-cctv', name: 'CCTV Camera System', wattage: 40, icon: 'videocam-outline', category: 'Electronics' },
  { id: 'lib-console', name: 'Gaming Console (PS5/Xbox)', wattage: 200, icon: 'game-controller-outline', category: 'Electronics' },
  { id: 'lib-sound', name: 'Sound System / Speakers', wattage: 60, icon: 'volume-high-outline', category: 'Electronics' },
  { id: 'lib-aquarium', name: 'Aquarium Filter / Air Pump', wattage: 35, icon: 'fish-outline', category: 'Electronics' },

  // Cooling
  { id: 'lib-standfan', name: 'Stand / Table Fan', wattage: 50, icon: 'sync-outline', category: 'Cooling' },
  { id: 'lib-exhaust', name: 'Exhaust Fan', wattage: 40, icon: 'refresh-circle-outline', category: 'Cooling' },
  { id: 'lib-ac-1ton', name: 'Air Conditioner 1 Ton (Inverter)', wattage: 1000, icon: 'thermometer-outline', category: 'Cooling' },
  { id: 'lib-ac-15ton', name: 'Air Conditioner 1.5 Ton (Inverter)', wattage: 1500, icon: 'thermometer-outline', category: 'Cooling' },

  // Kitchen & Home
  { id: 'lib-fridge-std', name: 'Standard Refrigerator', wattage: 300, icon: 'cube-outline', category: 'Kitchen' },
  { id: 'lib-freezer', name: 'Deep Freezer', wattage: 250, icon: 'snow-outline', category: 'Kitchen' },
  { id: 'lib-rice', name: 'Rice Cooker', wattage: 700, icon: 'fast-food-outline', category: 'Kitchen' },
  { id: 'lib-blender', name: 'Blender / Mixer Grinder', wattage: 450, icon: 'restaurant-outline', category: 'Kitchen' },
  { id: 'lib-microwave', name: 'Microwave Oven', wattage: 1200, icon: 'flame-outline', category: 'Kitchen' },
  { id: 'lib-kettle', name: 'Electric Kettle', wattage: 1500, icon: 'cafe-outline', category: 'Kitchen' },

  // Heavy / Motors
  { id: 'lib-pump-05', name: 'Water Pump (0.5 HP)', wattage: 375, icon: 'water-outline', category: 'Heavy' },
  { id: 'lib-pump-10', name: 'Water Pump (1.0 HP)', wattage: 750, icon: 'water-outline', category: 'Heavy' },
];

const QUICK_BACKUP_PRESETS = [1, 2, 3, 4, 6, 8, 10, 12, 16, 24];

const ICON_OPTIONS = [
  'speedometer-outline',
  'bulb-outline',
  'tv-outline',
  'wifi-outline',
  'laptop-outline',
  'desktop-outline',
  'cube-outline',
  'snow-outline',
  'water-outline',
  'flame-outline',
  'flash-outline',
  'cafe-outline',
  'restaurant-outline',
  'construct-outline',
];

export const SystemBuilderScreen: React.FC<SystemBuilderScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { addToCart } = useCart();

  const [appliances, setAppliances] = useState<Appliance[]>(PRESET_APPLIANCES);
  const [backupHours, setBackupHours] = useState<number>(4);
  const [isSolarHybrid, setIsSolarHybrid] = useState<boolean>(true);
  const [customDevicesList, setCustomDevicesList] = useState<SavedCustomDevice[]>([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Modal States
  // 1. Edit Wattage Modal
  const [editingAppliance, setEditingAppliance] = useState<Appliance | null>(null);
  const [editWattText, setEditWattText] = useState<string>('');

  // 2. Add Appliance Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addModalTab, setAddModalTab] = useState<'library' | 'custom'>('library');
  const [libraryCategory, setLibraryCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Custom appliance form
  const [customName, setCustomName] = useState<string>('');
  const [customWatt, setCustomWatt] = useState<string>('');
  const [customQty, setCustomQty] = useState<number>(1);
  const [customIcon, setCustomIcon] = useState<string>('flash-outline');

  // 3. Custom Backup Time Modal
  const [isHoursModalOpen, setIsHoursModalOpen] = useState<boolean>(false);
  const [customHoursText, setCustomHoursText] = useState<string>('');

  // --- AsyncStorage Persistence ---
  // Load saved builder data on component mount
  useEffect(() => {
    let isMounted = true;
    const loadStoredData = async () => {
      try {
        const [savedApps, savedCustomDevs, savedHours, savedHybrid] = await Promise.all([
          storageService.getBuilderAppliances(),
          storageService.getBuilderCustomDevices(),
          storageService.getBuilderBackupHours(),
          storageService.getBuilderSolarHybrid(),
        ]);

        if (isMounted) {
          if (savedApps !== null && Array.isArray(savedApps)) {
            setAppliances(savedApps);
          }
          if (savedCustomDevs && Array.isArray(savedCustomDevs)) {
            setCustomDevicesList(savedCustomDevs);
          }
          if (savedHours !== null && !isNaN(savedHours) && savedHours >= 0.5) {
            setBackupHours(savedHours);
          }
          if (savedHybrid !== null) {
            setIsSolarHybrid(savedHybrid);
          }
        }
      } catch {
        // Fallback to initial state
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    };

    loadStoredData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Save active appliances to AsyncStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      storageService.saveBuilderAppliances(appliances);
    }
  }, [appliances, isLoaded]);

  // Save backup duration to AsyncStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      storageService.saveBuilderBackupHours(backupHours);
    }
  }, [backupHours, isLoaded]);

  // Save solar hybrid mode to AsyncStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      storageService.saveBuilderSolarHybrid(isSolarHybrid);
    }
  }, [isSolarHybrid, isLoaded]);

  // --- Appliance Handlers ---
  const updateQuantity = (id: string, delta: number) => {
    setAppliances((prev) =>
      prev.map((app) => {
        if (app.id === id) {
          const nextQty = Math.max(0, app.quantity + delta);
          return { ...app, quantity: nextQty };
        }
        return app;
      })
    );
  };

  const removeAppliance = (id: string) => {
    setAppliances((prev) => prev.filter((app) => app.id !== id));
  };

  const openEditWattModal = (app: Appliance) => {
    setEditingAppliance(app);
    setEditWattText(app.wattage.toString());
  };

  const handleSaveWattage = () => {
    const watt = parseInt(editWattText, 10);
    if (isNaN(watt) || watt <= 0) {
      Alert.alert('Invalid Wattage', 'Please enter a valid positive number for watts.');
      return;
    }
    setAppliances((prev) =>
      prev.map((app) => (app.id === editingAppliance?.id ? { ...app, wattage: watt } : app))
    );
    setEditingAppliance(null);
  };

  const adjustEditWattage = (delta: number) => {
    const current = parseInt(editWattText, 10) || 0;
    const next = Math.max(1, current + delta);
    setEditWattText(next.toString());
  };

  const handleAddFromLibrary = (item: LibraryAppliance) => {
    setAppliances((prev) => {
      const existing = prev.find(
        (app) => app.name.toLowerCase() === item.name.toLowerCase()
      );
      if (existing) {
        // Increment quantity if already added
        return prev.map((app) =>
          app.id === existing.id ? { ...app, quantity: app.quantity + 1 } : app
        );
      }
      // Add as new appliance
      const newApp: Appliance = {
        id: `lib-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: item.name,
        wattage: item.wattage,
        quantity: 1,
        icon: item.icon,
      };
      return [...prev, newApp];
    });
  };

  const handleAddCustomAppliance = () => {
    const trimmedName = customName.trim();
    if (!trimmedName) {
      Alert.alert('Appliance Name Required', 'Please enter a name for your custom appliance.');
      return;
    }
    const watt = parseInt(customWatt, 10);
    if (isNaN(watt) || watt <= 0) {
      Alert.alert('Valid Wattage Required', 'Please enter a valid power rating in Watts.');
      return;
    }

    const customId = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // 1. Add to active appliances list
    const newApp: Appliance = {
      id: customId,
      name: trimmedName,
      wattage: watt,
      quantity: Math.max(1, customQty),
      icon: customIcon,
    };
    setAppliances((prev) => [...prev, newApp]);

    // 2. Persist in saved custom devices list so it stays in library
    const customDeviceItem: SavedCustomDevice = {
      id: customId,
      name: trimmedName,
      wattage: watt,
      icon: customIcon,
      category: 'My Custom',
    };
    setCustomDevicesList((prev) => {
      const updated = [
        customDeviceItem,
        ...prev.filter((d) => d.name.toLowerCase() !== trimmedName.toLowerCase()),
      ];
      storageService.saveBuilderCustomDevices(updated);
      return updated;
    });

    setCustomName('');
    setCustomWatt('');
    setCustomQty(1);
    setCustomIcon('flash-outline');
    setIsAddModalOpen(false);
  };

  const handleDeleteCustomDeviceFromLibrary = (deviceId: string) => {
    setCustomDevicesList((prev) => {
      const updated = prev.filter((d) => d.id !== deviceId);
      storageService.saveBuilderCustomDevices(updated);
      return updated;
    });
  };

  const handleResetToDefaults = () => {
    Alert.alert(
      'Reset Appliances',
      'Do you want to reset all appliances and backup time back to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Defaults',
          style: 'destructive',
          onPress: () => {
            setAppliances(PRESET_APPLIANCES);
            setBackupHours(4);
            setIsSolarHybrid(true);
            storageService.saveBuilderAppliances(PRESET_APPLIANCES);
            storageService.saveBuilderBackupHours(4);
            storageService.saveBuilderSolarHybrid(true);
          },
        },
      ]
    );
  };

  // --- Backup Hours Handlers ---
  const adjustBackupHours = (delta: number) => {
    setBackupHours((prev) => {
      const next = Math.round((prev + delta) * 10) / 10;
      return Math.max(0.5, Math.min(24, next));
    });
  };

  const openCustomHoursModal = () => {
    setCustomHoursText(backupHours.toString());
    setIsHoursModalOpen(true);
  };

  const handleSaveCustomHours = () => {
    const hours = parseFloat(customHoursText);
    if (isNaN(hours) || hours < 0.5 || hours > 24) {
      Alert.alert('Invalid Duration', 'Please enter a backup duration between 0.5 and 24 hours.');
      return;
    }
    setBackupHours(Math.round(hours * 10) / 10);
    setIsHoursModalOpen(false);
  };

  // --- Calculation Engine ---
  const results: SystemBuilderResults = useMemo(() => {
    const totalWatts = appliances.reduce((sum, app) => sum + app.wattage * app.quantity, 0);

    if (totalWatts === 0) {
      return {
        totalWatts: 0,
        recommendedVa: 0,
        requiredWattHours: 0,
        recommendedBatteryAh: 0,
        batteryVoltage: 12,
        batteryCount: 0,
        recommendedSolarKw: isSolarHybrid ? 0 : undefined,
        estimatedCostBDT: 0,
        breakdown: {
          inverter: 'None (Add appliances to calculate)',
          battery: 'None (Add appliances to calculate)',
          solarPanels: isSolarHybrid ? 'None (Add appliances to calculate)' : undefined,
        },
      };
    }

    // Inverter sizing: Continuous load + 25% safety surge margin / power factor (0.8)
    const recommendedVa = Math.ceil((totalWatts * 1.25) / 0.8 / 100) * 100;
    const finalInverterVa = Math.max(600, recommendedVa);

    // Energy needed: Watt-hours = Watts * backup hours
    const requiredWattHours = Math.round(totalWatts * backupHours);

    // Battery system voltage:
    // Under 1200VA -> 12V system (1 battery in series)
    // 1200VA to 2200VA -> 24V system (2 batteries in series)
    // Above 2200VA -> 48V system (4 batteries in series)
    const batteryVoltage = finalInverterVa > 2200 ? 48 : finalInverterVa > 1200 ? 24 : 12;
    const seriesBatteryCount = batteryVoltage / 12;

    // Ah needed at system voltage: Ah = Watt-hours / (batteryVoltage * 0.75 DoD & efficiency)
    const rawAh = requiredWattHours / (batteryVoltage * 0.75);

    // Sizing battery Ah and parallel banks:
    // Standard tubular batteries in Bangladesh: 100Ah, 130Ah, 150Ah, 200Ah
    let batteryAh = 100;
    let parallelBanks = 1;

    if (rawAh <= 110) {
      batteryAh = 100;
      parallelBanks = 1;
    } else if (rawAh <= 140) {
      batteryAh = 130;
      parallelBanks = 1;
    } else if (rawAh <= 170) {
      batteryAh = 150;
      parallelBanks = 1;
    } else if (rawAh <= 220) {
      batteryAh = 200;
      parallelBanks = 1;
    } else {
      // For large energy requirements, configure multiple 200Ah strings in parallel
      batteryAh = 200;
      parallelBanks = Math.ceil(rawAh / 200);
    }

    const totalBatteryCount = seriesBatteryCount * parallelBanks;

    // Solar panels recommendation
    let recommendedSolarKw = 0;
    if (isSolarHybrid) {
      // Sized to produce 1.3x daily consumption over 4 peak sun hours
      recommendedSolarKw = Math.round(((requiredWattHours * 1.3) / 4 / 1000) * 10) / 10;
      if (recommendedSolarKw < 0.58) recommendedSolarKw = 0.58; // 1x 580W panel minimum
    }

    // Cost estimation in BDT:
    // Inverter cost: ~14 BDT per VA
    const inverterCost = finalInverterVa * 14;
    // Battery cost: 200Ah tubular is ~25500, 150Ah is ~20000, 130Ah is ~17500, 100Ah is ~15000
    const singleBatCost =
      batteryAh === 200
        ? 25500
        : batteryAh === 150
        ? 20000
        : batteryAh === 130
        ? 17500
        : 15000;
    const totalBatteryCost = singleBatCost * totalBatteryCount;
    // Solar cost: ~38 BDT / Watt
    const solarCost = isSolarHybrid ? recommendedSolarKw * 1000 * 38 : 0;
    // Wiring, rack, circuit breaker & installation accessories
    const accessoriesCost = 6500 + (totalBatteryCount > 2 ? (totalBatteryCount - 2) * 1500 : 0);

    const estimatedCostBDT = Math.round(inverterCost + totalBatteryCost + solarCost + accessoriesCost);

    const batteryBankDesc =
      parallelBanks > 1
        ? `${totalBatteryCount}x ${batteryAh}Ah Tubular (${parallelBanks}x ${batteryVoltage}V banks in parallel)`
        : `${totalBatteryCount}x ${batteryAh}Ah 12V Tubular Battery (${batteryVoltage}V System)`;

    return {
      totalWatts,
      recommendedVa: finalInverterVa,
      requiredWattHours,
      recommendedBatteryAh: batteryAh,
      batteryVoltage,
      batteryCount: totalBatteryCount,
      recommendedSolarKw: isSolarHybrid ? recommendedSolarKw : undefined,
      estimatedCostBDT,
      breakdown: {
        inverter: `${finalInverterVa}VA Pure Sine Wave (${isSolarHybrid ? 'Solar Hybrid' : 'Standard IPS'})`,
        battery: batteryBankDesc,
        solarPanels: isSolarHybrid ? `${recommendedSolarKw} kWp Tier-1 Solar PV Array` : undefined,
      },
    };
  }, [appliances, backupHours, isSolarHybrid]);

  const handleAddPackageToCart = () => {
    if (results.totalWatts === 0) {
      Alert.alert(
        'No Appliances Selected',
        'Please add at least one appliance with quantity greater than 0 to configure and order a package.'
      );
      return;
    }

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
  };

  const handleConsultWhatsApp = () => {
    if (results.totalWatts === 0) {
      Alert.alert(
        'No Appliances Selected',
        'Please add appliances first to consult on your system configuration.'
      );
      return;
    }

    const message = encodeURIComponent(
      `Hello Radical Engineering! I built a customized system on your app:\n- Total Load: ${results.totalWatts}W (${backupHours} hrs backup)\n- Inverter: ${results.breakdown.inverter}\n- Battery: ${results.breakdown.battery}\n${results.breakdown.solarPanels ? '- Solar: ' + results.breakdown.solarPanels + '\n' : ''}- Estimated Total: ৳${results.estimatedCostBDT.toLocaleString()}\n\nPlease confirm availability and delivery to my location.`
    );
    Linking.openURL(`https://wa.me/${APP_CONFIG.whatsappNumber.replace('+', '')}?text=${message}`);
  };

  // Combined library including user's saved custom devices
  const combinedLibrary = useMemo(() => {
    const customItems: LibraryAppliance[] = customDevicesList.map((dev) => ({
      id: dev.id,
      name: dev.name,
      wattage: dev.wattage,
      icon: dev.icon,
      category: 'My Custom',
      isCustom: true,
    }));
    return [...customItems, ...APPLIANCE_LIBRARY];
  }, [customDevicesList]);

  // Dynamic category tabs
  const categoryTabs = useMemo(() => {
    const base = ['All', 'Popular'];
    if (customDevicesList.length > 0) {
      base.push('My Custom');
    }
    base.push('Cooling', 'Kitchen', 'Heavy', 'Electronics');
    return base;
  }, [customDevicesList]);

  // Filtered appliances for library modal
  const filteredLibrary = useMemo(() => {
    return combinedLibrary.filter((item) => {
      const matchesCategory =
        libraryCategory === 'All' ||
        (libraryCategory === 'My Custom' ? item.isCustom : item.category === libraryCategory);
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [combinedLibrary, libraryCategory, searchQuery]);

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
            style={[styles.modeButton, isSolarHybrid && [styles.activeModeButton, { backgroundColor: colors.primary }]]}
            onPress={() => setIsSolarHybrid(true)}
          >
            <Ionicons name="sunny" size={16} color={isSolarHybrid ? (isDark ? '#260B00' : '#FFFFFF') : colors.textSecondary} />
            <Text style={[styles.modeText, { color: isSolarHybrid ? (isDark ? '#260B00' : '#FFFFFF') : colors.text }]}>
              Solar Hybrid IPS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeButton, !isSolarHybrid && [styles.activeModeButton, { backgroundColor: colors.primary }]]}
            onPress={() => setIsSolarHybrid(false)}
          >
            <Ionicons name="flash" size={16} color={!isSolarHybrid ? (isDark ? '#260B00' : '#FFFFFF') : colors.textSecondary} />
            <Text style={[styles.modeText, { color: !isSolarHybrid ? (isDark ? '#260B00' : '#FFFFFF') : colors.text }]}>
              Standard IPS
            </Text>
          </TouchableOpacity>
        </View>

        {/* Step 1: Appliances Selection */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleCol}>
              <View style={styles.titleRow}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>1. Connected Appliances</Text>
                <TouchableOpacity
                  onPress={handleResetToDefaults}
                  style={styles.resetHeaderBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="refresh-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.resetHeaderText, { color: colors.textSecondary }]}>Reset</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Tap watt badge to edit wattage per appliance or add/remove items
              </Text>
            </View>
            <View style={[styles.totalWattsBadge, { backgroundColor: isDark ? 'rgba(252, 185, 116, 0.15)' : '#F5EBE6' }]}>
              <Text style={[styles.totalWattsText, { color: colors.primary }]}>{results.totalWatts} W</Text>
            </View>
          </View>

          {appliances.length === 0 ? (
            <View style={styles.emptyAppliancesBox}>
              <Ionicons name="flash-off-outline" size={36} color={colors.textMuted} />
              <Text style={[styles.emptyAppliancesTitle, { color: colors.text }]}>No Appliances in List</Text>
              <Text style={[styles.emptyAppliancesSub, { color: colors.textSecondary }]}>
                Add connected devices from the catalog below to calculate system requirements.
              </Text>
            </View>
          ) : (
            appliances.map((app) => (
              <View
                key={app.id}
                style={[styles.applianceRow, { borderBottomColor: colors.border }]}
              >
                <View style={styles.applianceInfo}>
                  <View style={[styles.appIconCircle, { backgroundColor: isDark ? 'rgba(252, 185, 116, 0.12)' : '#F5EBE6' }]}>
                    <Ionicons name={app.icon as any} size={18} color={colors.primary} />
                  </View>
                  <View style={styles.appTextCol}>
                    <Text style={[styles.appName, { color: colors.text }]} numberOfLines={1}>
                      {app.name}
                    </Text>

                    {/* Interactive Editable Wattage Badge */}
                    <TouchableOpacity
                      style={[styles.wattagePillBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                      onPress={() => openEditWattModal(app)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="flash" size={10} color={colors.primary} />
                      <Text style={[styles.wattagePillText, { color: colors.text }]}>
                        {app.wattage}W each
                      </Text>
                      <Ionicons name="pencil" size={10} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Stepper and Delete Action */}
                <View style={styles.appActionsRow}>
                  <View style={[styles.qtyBox, { borderColor: colors.border, backgroundColor: colors.surfaceVariant }]}>
                    <TouchableOpacity
                      onPress={() => updateQuantity(app.id, -1)}
                      style={styles.qtyBtn}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <Ionicons name="remove" size={15} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.qtyText, { color: colors.text }]}>{app.quantity}</Text>
                    <TouchableOpacity
                      onPress={() => updateQuantity(app.id, 1)}
                      style={styles.qtyBtn}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <Ionicons name="add" size={15} color={colors.text} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => removeAppliance(app.id)}
                    style={[styles.deleteBtn, { backgroundColor: isDark ? 'rgba(220, 38, 38, 0.15)' : '#FEE2E2' }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={`Remove ${app.name}`}
                  >
                    <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          {/* Add Appliance Action Button */}
          <TouchableOpacity
            style={[styles.addApplianceBtn, { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(252, 185, 116, 0.08)' : '#FFF7ED' }]}
            onPress={() => {
              setSearchQuery('');
              setIsAddModalOpen(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={18} color={colors.primary} />
            <Text style={[styles.addApplianceBtnText, { color: colors.primary }]}>
              + Add Appliance or Device
            </Text>
          </TouchableOpacity>
        </View>

        {/* Step 2: Desired Backup Time */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionTitleCol}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>2. Desired Backup Time</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              Adjust continuous hours during power cuts using steppers or quick presets
            </Text>
          </View>

          {/* Hero Stepper Control Bar */}
          <View style={[styles.backupHeroBox, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.backupHeroStepBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
                backupHours <= 0.5 && { opacity: 0.5 },
              ]}
              onPress={() => adjustBackupHours(-0.5)}
              disabled={backupHours <= 0.5}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={20} color={colors.text} />
              <Text style={[styles.backupStepSubText, { color: colors.textSecondary }]}>-0.5h</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backupHeroCenter}
              onPress={openCustomHoursModal}
              activeOpacity={0.8}
            >
              <View style={styles.backupHeroHoursRow}>
                <Ionicons name="time" size={20} color={colors.primary} />
                <Text style={[styles.backupHeroHoursValue, { color: colors.text }]}>
                  {backupHours} {backupHours === 1 ? 'Hour' : 'Hours'}
                </Text>
                <Ionicons name="create-outline" size={15} color={colors.primary} />
              </View>

              <Text style={[styles.backupHeroDesc, { color: colors.textSecondary }]}>
                {backupHours >= 1
                  ? `${Math.floor(backupHours)} hr${Math.floor(backupHours) > 1 ? 's' : ''}${
                      backupHours % 1 !== 0 ? ` ${Math.round((backupHours % 1) * 60)} mins` : ''
                    } continuous runtime`
                  : `${Math.round(backupHours * 60)} minutes continuous runtime`}
              </Text>
              <Text style={[styles.backupHeroTapHint, { color: colors.primary }]}>
                Tap to type exact hours
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.backupHeroStepBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
                backupHours >= 24 && { opacity: 0.5 },
              ]}
              onPress={() => adjustBackupHours(0.5)}
              disabled={backupHours >= 24}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color={colors.text} />
              <Text style={[styles.backupStepSubText, { color: colors.textSecondary }]}>+0.5h</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Presets Chips */}
          <Text style={[styles.quickPresetsLabel, { color: colors.textSecondary }]}>Quick Presets:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScrollWrapper}
            contentContainerStyle={styles.hoursChipsScroll}
          >
            {QUICK_BACKUP_PRESETS.map((hours) => {
              const isSelected = backupHours === hours;
              return (
                <TouchableOpacity
                  key={hours}
                  onPress={() => setBackupHours(hours)}
                  style={[
                    styles.hourChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceVariant,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.hourChipText,
                      { color: isSelected ? (isDark ? '#260B00' : '#FFFFFF') : colors.text },
                    ]}
                  >
                    {hours}h
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Step 3: Engineering Specification Output */}
        <View style={[styles.resultsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.resultsHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1, paddingRight: SPACING.xs }}>
              <Text style={[styles.engineeredBadge, { color: colors.primary }]}>RECOMMENDED HARDWARE</Text>
              <Text style={[styles.systemVaTitle, { color: colors.text }]}>
                {results.totalWatts > 0 ? `${results.recommendedVa} VA Inverter` : '0 VA Inverter'}
              </Text>
            </View>
            <View style={[styles.voltageBadge, { backgroundColor: isDark ? '#334155' : '#0F172A' }]}>
              <Text style={styles.voltageBadgeText}>{results.batteryVoltage}V System</Text>
            </View>
          </View>

          {/* Hardware Bill of Materials */}
          <View style={styles.bomList}>
            <View style={[styles.bomItem, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="hardware-chip" size={18} color={colors.primary} />
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
                <Ionicons name="sunny" size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bomTitle, { color: colors.text }]}>Solar Array</Text>
                  <Text style={[styles.bomDesc, { color: colors.textSecondary }]}>{results.breakdown.solarPanels}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Price Summary */}
          <View style={[styles.costSummaryBox, { backgroundColor: colors.surfaceVariant }]}>
            <View style={styles.costSummaryTextCol}>
              <Text style={[styles.costSummaryLabel, { color: colors.textSecondary }]}>Total Package Estimate</Text>
              <Text style={[styles.costSummarySub, { color: colors.textMuted }]}>
                Includes wiring, rack & setup ({backupHours}h backup @ {results.totalWatts}W)
              </Text>
            </View>
            <Text style={[styles.totalCostBDT, { color: colors.primary }]}>
              ৳ {results.estimatedCostBDT.toLocaleString()}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsCol}>
            <TouchableOpacity
              style={[
                styles.addToCartPackageBtn,
                { backgroundColor: results.totalWatts > 0 ? colors.primary : colors.surfaceVariant },
              ]}
              onPress={handleAddPackageToCart}
              activeOpacity={0.85}
              disabled={results.totalWatts === 0}
            >
              <Ionicons
                name="cart"
                size={18}
                color={results.totalWatts > 0 ? (isDark ? '#260B00' : '#FFFFFF') : colors.textMuted}
              />
              <Text
                style={[
                  styles.addToCartPackageText,
                  { color: results.totalWatts > 0 ? (isDark ? '#260B00' : '#FFFFFF') : colors.textMuted },
                ]}
              >
                Add Package to Cart
              </Text>
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

      {/* ================= MODAL 1: EDIT WATTAGE MODAL ================= */}
      <Modal
        visible={!!editingAppliance}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingAppliance(null)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalKeyboardContainer}
            >
              <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.modalHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Wattage</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                      {editingAppliance?.name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setEditingAppliance(null)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Big Watt Input Box */}
                <View style={[styles.bigInputBox, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.bigNumberInput, { color: colors.text }]}
                    value={editWattText}
                    onChangeText={setEditWattText}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    maxLength={5}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={[styles.bigInputUnit, { color: colors.primary }]}>Watts (W)</Text>
                </View>

                {/* Quick Watt Adjustment Steppers */}
                <View style={styles.quickStepsRow}>
                  {[-50, -10, +10, +50].map((step) => (
                    <TouchableOpacity
                      key={step}
                      onPress={() => adjustEditWattage(step)}
                      style={[styles.quickStepBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.quickStepBtnText, { color: colors.text }]}>
                        {step > 0 ? `+${step}W` : `${step}W`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Modal Buttons */}
                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={[styles.modalSecondaryBtn, { borderColor: colors.border }]}
                    onPress={() => setEditingAppliance(null)}
                  >
                    <Text style={[styles.modalSecondaryBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalPrimaryBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSaveWattage}
                  >
                    <Text style={[styles.modalPrimaryBtnText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>
                      Save Wattage
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ================= MODAL 2: ADD APPLIANCE MODAL ================= */}
      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <View style={styles.modalOverlayBottom}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalFullSheet}
          >
            <View style={[styles.bottomSheetContainer, { backgroundColor: colors.surface }]}>
              {/* Sheet Header */}
              <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetTitle, { color: colors.text }]}>Add Appliance</Text>
                  <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
                    Choose from popular devices or create custom
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsAddModalOpen(false)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Tab Selector */}
              <View style={[styles.sheetTabsRow, { backgroundColor: colors.surfaceVariant }]}>
                <TouchableOpacity
                  style={[
                    styles.sheetTab,
                    addModalTab === 'library' && [styles.sheetTabActive, { backgroundColor: colors.primary }],
                  ]}
                  onPress={() => setAddModalTab('library')}
                >
                  <Ionicons
                    name="grid-outline"
                    size={15}
                    color={addModalTab === 'library' ? (isDark ? '#260B00' : '#FFFFFF') : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.sheetTabText,
                      { color: addModalTab === 'library' ? (isDark ? '#260B00' : '#FFFFFF') : colors.text },
                    ]}
                  >
                    Common Appliances
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sheetTab,
                    addModalTab === 'custom' && [styles.sheetTabActive, { backgroundColor: colors.primary }],
                  ]}
                  onPress={() => setAddModalTab('custom')}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={15}
                    color={addModalTab === 'custom' ? (isDark ? '#260B00' : '#FFFFFF') : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.sheetTabText,
                      { color: addModalTab === 'custom' ? (isDark ? '#260B00' : '#FFFFFF') : colors.text },
                    ]}
                  >
                    Custom Device
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tab 1: Library of common appliances */}
              {addModalTab === 'library' && (
                <View style={styles.libraryTabContainer}>
                  {/* Search Bar */}
                  <View style={[styles.searchBar, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                    <Ionicons name="search" size={16} color={colors.textSecondary} />
                    <TextInput
                      style={[styles.searchInput, { color: colors.text }]}
                      placeholder="Search appliance (fan, fridge, pump)..."
                      placeholderTextColor={colors.textMuted}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      clearButtonMode="while-editing"
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Category Chips Horizontal Bar */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryScrollWrapper}
                    contentContainerStyle={styles.categoryChipsScroll}
                  >
                    {categoryTabs.map((cat) => {
                      const isSelected = libraryCategory === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setLibraryCategory(cat)}
                          style={[
                            styles.catChip,
                            {
                              backgroundColor: isSelected ? colors.primary : colors.surfaceVariant,
                              borderColor: isSelected ? colors.primary : colors.border,
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.catChipText,
                              { color: isSelected ? (isDark ? '#260B00' : '#FFFFFF') : colors.text },
                            ]}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Library Items List */}
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={styles.libraryScrollView}
                    contentContainerStyle={styles.libraryListContent}
                  >
                    {filteredLibrary.length === 0 ? (
                      <View style={styles.emptyFilteredBox}>
                        <Ionicons name="search-outline" size={32} color={colors.textMuted} />
                        <Text style={[styles.emptyFilteredTitle, { color: colors.text }]}>No Appliances Found</Text>
                        <Text style={[styles.emptyFilteredSub, { color: colors.textSecondary }]}>
                          Try a different search term or create a custom device.
                        </Text>
                      </View>
                    ) : (
                      filteredLibrary.map((item) => {
                        const userApp = appliances.find(
                          (a) => a.name.toLowerCase() === item.name.toLowerCase()
                        );
                        const currentQty = userApp ? userApp.quantity : 0;

                        return (
                          <View
                            key={item.id}
                            style={[styles.libraryItemRow, { borderBottomColor: colors.border }]}
                          >
                            <View style={[styles.appIconCircle, { backgroundColor: isDark ? 'rgba(252, 185, 116, 0.12)' : '#F5EBE6' }]}>
                              <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                            </View>

                            <View style={styles.libraryItemDetails}>
                              <View style={styles.libraryItemTitleRow}>
                                <Text style={[styles.libraryItemName, { color: colors.text }]}>
                                  {item.name}
                                </Text>
                                {item.isCustom && (
                                  <View style={[styles.customBadge, { backgroundColor: isDark ? 'rgba(252, 185, 116, 0.15)' : '#F5EBE6' }]}>
                                    <Text style={[styles.customBadgeText, { color: colors.primary }]}>Custom</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={[styles.libraryItemWatt, { color: colors.textSecondary }]}>
                                {item.wattage} Watts
                                {currentQty > 0 ? ` · (In setup: ${currentQty})` : ''}
                              </Text>
                            </View>

                            <View style={styles.libraryItemActionRow}>
                              {item.isCustom && (
                                <TouchableOpacity
                                  style={[styles.deleteLibCustomBtn, { backgroundColor: isDark ? 'rgba(220, 38, 38, 0.15)' : '#FEE2E2' }]}
                                  onPress={() => handleDeleteCustomDeviceFromLibrary(item.id)}
                                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                  accessibilityLabel={`Delete custom device ${item.name}`}
                                >
                                  <Ionicons name="trash-outline" size={13} color={COLORS.danger} />
                                </TouchableOpacity>
                              )}

                              <TouchableOpacity
                                style={[
                                  styles.addLibBtn,
                                  {
                                    backgroundColor: currentQty > 0 ? colors.surfaceVariant : colors.primary,
                                    borderColor: currentQty > 0 ? colors.border : colors.primary,
                                  },
                                ]}
                                onPress={() => handleAddFromLibrary(item)}
                                activeOpacity={0.75}
                              >
                                <Ionicons
                                  name="add"
                                  size={15}
                                  color={currentQty > 0 ? colors.primary : (isDark ? '#260B00' : '#FFFFFF')}
                                />
                                <Text
                                  style={[
                                    styles.addLibBtnText,
                                    {
                                      color: currentQty > 0 ? colors.primary : (isDark ? '#260B00' : '#FFFFFF'),
                                    },
                                  ]}
                                >
                                  {currentQty > 0 ? `+1 More` : `Add`}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
              )}

              {/* Tab 2: Custom Appliance Builder */}
              {addModalTab === 'custom' && (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.customFormContent}
                >
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Device Name *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.surfaceVariant, borderColor: colors.border, color: colors.text }]}
                    placeholder="e.g., Deep Well Pump, Studio Amp, Aquarium"
                    placeholderTextColor={colors.textMuted}
                    value={customName}
                    onChangeText={setCustomName}
                  />

                  <Text style={[styles.inputLabel, { color: colors.text }]}>Power Rating (Watts) *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.surfaceVariant, borderColor: colors.border, color: colors.text }]}
                    placeholder="e.g., 250"
                    placeholderTextColor={colors.textMuted}
                    value={customWatt}
                    onChangeText={setCustomWatt}
                    keyboardType="number-pad"
                  />

                  <Text style={[styles.inputLabel, { color: colors.text }]}>Initial Quantity</Text>
                  <View style={styles.customQtyRow}>
                    <TouchableOpacity
                      onPress={() => setCustomQty((q) => Math.max(1, q - 1))}
                      style={[styles.customQtyBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                    >
                      <Ionicons name="remove" size={18} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.customQtyValue, { color: colors.text }]}>{customQty}</Text>
                    <TouchableOpacity
                      onPress={() => setCustomQty((q) => q + 1)}
                      style={[styles.customQtyBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                    >
                      <Ionicons name="add" size={18} color={colors.text} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.inputLabel, { color: colors.text }]}>Select Icon</Text>
                  <View style={styles.iconSelectionGrid}>
                    {ICON_OPTIONS.map((iconName) => (
                      <TouchableOpacity
                        key={iconName}
                        onPress={() => setCustomIcon(iconName)}
                        style={[
                          styles.iconPickBox,
                          {
                            backgroundColor: customIcon === iconName ? colors.primary : colors.surfaceVariant,
                            borderColor: customIcon === iconName ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name={iconName as any}
                          size={20}
                          color={customIcon === iconName ? (isDark ? '#260B00' : '#FFFFFF') : colors.text}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.addCustomSubmitBtn, { backgroundColor: colors.primary }]}
                    onPress={handleAddCustomAppliance}
                  >
                    <Ionicons name="checkmark-circle" size={18} color={isDark ? '#260B00' : '#FFFFFF'} />
                    <Text style={[styles.addCustomSubmitText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>
                      Add to My System
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ================= MODAL 3: CUSTOM BACKUP HOURS MODAL ================= */}
      <Modal
        visible={isHoursModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsHoursModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalKeyboardContainer}
            >
              <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.modalHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Custom Backup Time</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                      Enter desired outage runtime (0.5 to 24 hours)
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsHoursModalOpen(false)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Big Number Input Box */}
                <View style={[styles.bigInputBox, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.bigNumberInput, { color: colors.text }]}
                    value={customHoursText}
                    onChangeText={setCustomHoursText}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    maxLength={4}
                    placeholder="4.0"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={[styles.bigInputUnit, { color: colors.primary }]}>Hours</Text>
                </View>

                {/* Preset Chips */}
                <View style={styles.quickStepsRow}>
                  {[1.5, 3.5, 5, 7, 10, 14].map((h) => (
                    <TouchableOpacity
                      key={h}
                      onPress={() => setCustomHoursText(h.toString())}
                      style={[styles.quickStepBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.quickStepBtnText, { color: colors.text }]}>{h}h</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Modal Buttons */}
                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={[styles.modalSecondaryBtn, { borderColor: colors.border }]}
                    onPress={() => setIsHoursModalOpen(false)}
                  >
                    <Text style={[styles.modalSecondaryBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalPrimaryBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSaveCustomHours}
                  >
                    <Text style={[styles.modalPrimaryBtnText, { color: isDark ? '#260B00' : '#FFFFFF' }]}>
                      Set Duration
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  sectionTitleCol: {
    flex: 1,
    paddingRight: SPACING.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  resetHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  resetHeaderText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  totalWattsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  totalWattsText: {
    fontWeight: '800',
    fontSize: 13,
  },
  emptyAppliancesBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    gap: 6,
  },
  emptyAppliancesTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  emptyAppliancesSub: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 260,
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
    marginRight: 8,
  },
  appIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  appTextCol: {
    flex: 1,
    gap: 3,
  },
  appName: {
    fontSize: 13,
    fontWeight: '600',
  },
  wattagePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    marginTop: 2,
  },
  wattagePillText: {
    fontSize: 11,
    fontWeight: '600',
    includeFontPadding: false,
  },
  appActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    paddingHorizontal: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addApplianceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    marginTop: SPACING.md,
    gap: 6,
  },
  addApplianceBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  backupHeroBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  backupHeroStepBtn: {
    width: 44,
    height: 52,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backupStepSubText: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: -2,
    includeFontPadding: false,
  },
  backupHeroCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },
  backupHeroHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backupHeroHoursValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  backupHeroDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  backupHeroTapHint: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textDecorationLine: 'underline',
  },
  quickPresetsLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: SPACING.xs,
    marginBottom: 6,
  },
  horizontalScrollWrapper: {
    flexGrow: 0,
  },
  hoursChipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  hourChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourChipText: {
    fontSize: 12,
    fontWeight: '700',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 16,
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
    gap: SPACING.sm,
  },
  engineeredBadge: {
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    flexShrink: 0,
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
    gap: SPACING.sm,
  },
  costSummaryTextCol: {
    flex: 1,
  },
  costSummaryLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  costSummarySub: {
    fontSize: 10,
    marginTop: 2,
  },
  totalCostBDT: {
    fontSize: 19,
    fontWeight: '800',
    flexShrink: 0,
    textAlign: 'right',
  },
  actionButtonsCol: {
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  addToCartPackageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    gap: 8,
  },
  addToCartPackageText: {
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

  // Modal Common Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalKeyboardContainer: {
    width: '100%',
    maxWidth: 360,
  },
  modalCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    width: '100%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  bigInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    gap: 8,
  },
  bigNumberInput: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    minWidth: 80,
  },
  bigInputUnit: {
    fontSize: 14,
    fontWeight: '700',
  },
  quickStepsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  quickStepBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    minHeight: 34,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStepBtnText: {
    fontSize: 12,
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modalSecondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  modalSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalPrimaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  modalPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Modal 2: Bottom Sheet Styles
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalFullSheet: {
    height: '85%',
    maxHeight: '85%',
  },
  bottomSheetContainer: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.md,
    flex: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    marginBottom: SPACING.sm,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sheetSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  sheetTabsRow: {
    flexDirection: 'row',
    borderRadius: RADIUS.sm,
    padding: 3,
    marginBottom: SPACING.sm,
  },
  sheetTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.xs,
    gap: 6,
  },
  sheetTabActive: {
    backgroundColor: COLORS.primary,
  },
  sheetTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  libraryTabContainer: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  categoryScrollWrapper: {
    flexGrow: 0,
    marginBottom: SPACING.sm,
  },
  categoryChipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '700',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 16,
  },
  libraryScrollView: {
    flex: 1,
  },
  libraryListContent: {
    paddingBottom: 30,
  },
  emptyFilteredBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    gap: 6,
  },
  emptyFilteredTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  emptyFilteredSub: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 240,
  },
  libraryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  libraryItemDetails: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  libraryItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  libraryItemName: {
    fontSize: 13,
    fontWeight: '600',
  },
  customBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.xs,
  },
  customBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    includeFontPadding: false,
  },
  libraryItemWatt: {
    fontSize: 11,
    marginTop: 2,
  },
  libraryItemActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteLibCustomBtn: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLibBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    gap: 3,
  },
  addLibBtnText: {
    fontSize: 11,
    fontWeight: '700',
    includeFontPadding: false,
  },

  // Custom Form Styles
  customFormContent: {
    paddingVertical: SPACING.sm,
    paddingBottom: 30,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: SPACING.sm,
    marginBottom: 6,
  },
  formInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    fontSize: 13,
  },
  customQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customQtyBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customQtyValue: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  iconSelectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: SPACING.lg,
  },
  iconPickBox: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCustomSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    gap: 8,
  },
  addCustomSubmitText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
