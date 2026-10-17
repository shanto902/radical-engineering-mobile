import React, { useState, useMemo, useEffect } from "react";
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
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../components/Header";
import { useTheme } from "../context/ThemeContext";
import { useCart } from "../context/CartContext";
import { PRESET_APPLIANCES } from "../constants/mockData";
import {
  Appliance,
  SystemBuilderResults,
  Product,
  BuilderSlotItem,
} from "../types";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import { APP_CONFIG } from "../constants/config";
import { storageService, SavedCustomDevice } from "../services/storage";
import { apiService } from "../services/api";
import { executePrintOrShareQuotation } from "../utils/quotationPdf";

export interface ConfiguredSlotItem {
  productId: string;
  quantity: number;
}

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
  {
    id: "lib-fan",
    name: "Ceiling Fan",
    wattage: 75,
    icon: "speedometer-outline",
    category: "Popular",
  },
  {
    id: "lib-led",
    name: "LED Light / Tube",
    wattage: 18,
    icon: "bulb-outline",
    category: "Popular",
  },
  {
    id: "lib-tv",
    name: 'LED Smart TV (32"-55")',
    wattage: 80,
    icon: "tv-outline",
    category: "Popular",
  },
  {
    id: "lib-wifi",
    name: "Wi-Fi Router & ONU",
    wattage: 15,
    icon: "wifi-outline",
    category: "Popular",
  },
  {
    id: "lib-laptop",
    name: "Laptop / PC Computer",
    wattage: 120,
    icon: "laptop-outline",
    category: "Popular",
  },
  {
    id: "lib-fridge-inv",
    name: "Inverter Refrigerator",
    wattage: 180,
    icon: "cube-outline",
    category: "Popular",
  },

  // Electronics
  {
    id: "lib-desktop",
    name: "Desktop PC + Monitor",
    wattage: 200,
    icon: "desktop-outline",
    category: "Electronics",
  },
  {
    id: "lib-cctv",
    name: "CCTV Camera System",
    wattage: 40,
    icon: "videocam-outline",
    category: "Electronics",
  },
  {
    id: "lib-console",
    name: "Gaming Console (PS5/Xbox)",
    wattage: 200,
    icon: "game-controller-outline",
    category: "Electronics",
  },
  {
    id: "lib-sound",
    name: "Sound System / Speakers",
    wattage: 60,
    icon: "volume-high-outline",
    category: "Electronics",
  },
  {
    id: "lib-aquarium",
    name: "Aquarium Filter / Air Pump",
    wattage: 35,
    icon: "fish-outline",
    category: "Electronics",
  },

  // Cooling
  {
    id: "lib-standfan",
    name: "Stand / Table Fan",
    wattage: 50,
    icon: "sync-outline",
    category: "Cooling",
  },
  {
    id: "lib-exhaust",
    name: "Exhaust Fan",
    wattage: 40,
    icon: "refresh-circle-outline",
    category: "Cooling",
  },
  {
    id: "lib-ac-1ton",
    name: "Air Conditioner 1 Ton (Inverter)",
    wattage: 1000,
    icon: "thermometer-outline",
    category: "Cooling",
  },
  {
    id: "lib-ac-15ton",
    name: "Air Conditioner 1.5 Ton (Inverter)",
    wattage: 1500,
    icon: "thermometer-outline",
    category: "Cooling",
  },

  // Kitchen & Home
  {
    id: "lib-fridge-std",
    name: "Standard Refrigerator",
    wattage: 300,
    icon: "cube-outline",
    category: "Kitchen",
  },
  {
    id: "lib-freezer",
    name: "Deep Freezer",
    wattage: 250,
    icon: "snow-outline",
    category: "Kitchen",
  },
  {
    id: "lib-rice",
    name: "Rice Cooker",
    wattage: 700,
    icon: "fast-food-outline",
    category: "Kitchen",
  },
  {
    id: "lib-blender",
    name: "Blender / Mixer Grinder",
    wattage: 450,
    icon: "restaurant-outline",
    category: "Kitchen",
  },
  {
    id: "lib-microwave",
    name: "Microwave Oven",
    wattage: 1200,
    icon: "flame-outline",
    category: "Kitchen",
  },
  {
    id: "lib-kettle",
    name: "Electric Kettle",
    wattage: 1500,
    icon: "cafe-outline",
    category: "Kitchen",
  },

  // Heavy / Motors
  {
    id: "lib-pump-05",
    name: "Water Pump (0.5 HP)",
    wattage: 375,
    icon: "water-outline",
    category: "Heavy",
  },
  {
    id: "lib-pump-10",
    name: "Water Pump (1.0 HP)",
    wattage: 750,
    icon: "water-outline",
    category: "Heavy",
  },
];

const QUICK_BACKUP_PRESETS = [1, 2, 3, 4, 6, 8, 10, 12, 16, 24];

const ICON_OPTIONS = [
  "speedometer-outline",
  "bulb-outline",
  "tv-outline",
  "wifi-outline",
  "laptop-outline",
  "desktop-outline",
  "cube-outline",
  "snow-outline",
  "water-outline",
  "flame-outline",
  "flash-outline",
  "cafe-outline",
  "restaurant-outline",
  "construct-outline",
];

/** Extract Inverter/IPS VA capacity from product title, model, or specs */
function extractInverterVa(product: Product): number {
  const text =
    `${product.title} ${product.model || ""} ${product.wattage || ""} ${product.specs?.["Capacity"] || ""}`.toLowerCase();

  const kva = text.match(/(\d+(?:\.\d+)?)\s*(?:kva|k\.v\.a)\b/);
  if (kva) return Math.round(parseFloat(kva[1]) * 1000);

  const kw = text.match(/(\d+(?:\.\d+)?)\s*(?:kw|k\.w)\b/);
  if (kw) return Math.round((parseFloat(kw[1]) * 1000) / 0.8);

  const va = text.match(/(\d{3,5})\s*(?:va|v\.a)\b/);
  if (va) return parseInt(va[1], 10);

  const w = text.match(/(\d{3,5})\s*(?:w|watt|watts)\b/);
  if (w) return Math.round(parseInt(w[1], 10) / 0.8);

  const num = text.match(
    /\b(600|700|800|850|900|1000|1050|1100|1200|1250|1400|1500|1600|2000|2200|2500|3000|3200|3500|4000|5000|6000)\b/,
  );
  if (num) return parseInt(num[1], 10);

  return 0;
}

/** Extract battery Ampere-hour (Ah) capacity from title or specs */
function extractBatteryAh(product: Product): number {
  const text =
    `${product.title} ${product.model || ""} ${product.specs?.["Capacity"] || ""}`.toLowerCase();
  const ah = text.match(/(\d{2,3})\s*(?:ah|a\.h|ampere\s*hour)\b/);
  if (ah) return parseInt(ah[1], 10);

  const num = text.match(/\b(80|100|120|130|150|165|180|200|220)\b/);
  if (num) return parseInt(num[1], 10);

  return 0;
}

/** Extract solar panel wattage from title or specs */
function extractSolarWatts(product: Product): number {
  const text =
    `${product.title} ${product.wattage || ""} ${product.model || ""} ${product.specs?.["Maximum Power (Pmax)"] || ""}`.toLowerCase();
  const w = text.match(/(\d{2,4})\s*(?:w|watt|watts)\b/);
  if (w) return parseInt(w[1], 10);

  const num = text.match(
    /\b(330|450|530|540|545|550|555|560|570|580|585|590|600|650)\b/,
  );
  if (num) return parseInt(num[1], 10);

  return 580;
}

export const SystemBuilderScreen: React.FC<SystemBuilderScreenProps> = ({
  navigation,
}) => {
  const { colors, isDark } = useTheme();
  const { addToCart, addMultipleToCart } = useCart();

  const [appliances, setAppliances] = useState<Appliance[]>(PRESET_APPLIANCES);
  const [backupHours, setBackupHours] = useState<number>(4);
  const [isSolarHybrid, setIsSolarHybrid] = useState<boolean>(true);
  const [packageTier, setPackageTier] = useState<
    "economy" | "standard" | "premium"
  >("standard");
  const [solarRange, setSolarRange] = useState<
    "essential" | "balanced" | "max"
  >("balanced");
  const [customDevicesList, setCustomDevicesList] = useState<
    SavedCustomDevice[]
  >([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Real Directus Catalog Products state by Category (Direct SDK, zero server pressure)
  const [catalogIps, setCatalogIps] = useState<Product[]>([]);
  const [catalogInverters, setCatalogInverters] = useState<Product[]>([]);
  const [catalogBatteries, setCatalogBatteries] = useState<Product[]>([]);
  const [catalogSolarPanels, setCatalogSolarPanels] = useState<Product[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);

  // Array-based slot model configuration (supports any number of models per category)
  const [configuredInverters, setConfiguredInverters] = useState<
    ConfiguredSlotItem[] | null
  >(null);
  const [configuredBatteries, setConfiguredBatteries] = useState<
    ConfiguredSlotItem[] | null
  >(null);
  const [configuredPanels, setConfiguredPanels] = useState<
    ConfiguredSlotItem[] | null
  >(null);

  // Track whether user has customized/updated any products away from standard suggestion
  const isCustomPackage = useMemo(() => {
    return (
      configuredInverters !== null ||
      configuredBatteries !== null ||
      configuredPanels !== null
    );
  }, [configuredInverters, configuredBatteries, configuredPanels]);

  // Modal to select component from real catalog (targets specific index in slot array)
  const [selectorModalType, setSelectorModalType] = useState<
    "inverter" | "battery" | "solar" | null
  >(null);
  const [selectorTargetIndex, setSelectorTargetIndex] = useState<number>(0);
  const [selectorSearchText, setSelectorSearchText] = useState<string>("");

  // Fetch genuine Directus catalog products directly via SDK by Category
  useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      setIsLoadingCatalog(true);
      try {
        const [ipsItems, inverterItems, batteryItems, panelItems] =
          await Promise.all([
            apiService.getProductsByCategorySdk("ips-solar-ips", 50),
            apiService.getProductsByCategorySdk("inverter", 100),
            apiService.getProductsByCategorySdk("battery", 50),
            apiService.getProductsByCategorySdk("solar-panels", 50),
          ]);

        if (isMounted) {
          setCatalogIps(ipsItems);
          setCatalogInverters(inverterItems);
          setCatalogBatteries(batteryItems);
          setCatalogSolarPanels(panelItems);
        }
      } catch (err) {
        console.warn("SystemBuilder catalog fetch error:", err);
      } finally {
        if (isMounted) {
          setIsLoadingCatalog(false);
        }
      }
    };

    fetchCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  // Modal States
  // 1. Edit Wattage Modal
  const [editingAppliance, setEditingAppliance] = useState<Appliance | null>(
    null,
  );
  const [editWattText, setEditWattText] = useState<string>("");

  // 2. Add Appliance Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addModalTab, setAddModalTab] = useState<"library" | "custom">(
    "library",
  );
  const [libraryCategory, setLibraryCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Custom appliance form
  const [customName, setCustomName] = useState<string>("");
  const [customWatt, setCustomWatt] = useState<string>("");
  const [customQty, setCustomQty] = useState<number>(1);
  const [customIcon, setCustomIcon] = useState<string>("flash-outline");

  // 3. Custom Backup Time Modal
  const [isHoursModalOpen, setIsHoursModalOpen] = useState<boolean>(false);
  const [customHoursText, setCustomHoursText] = useState<string>("");

  // 5. Add System to Cart Confirmation Modal
  const [isCartConfirmModalVisible, setIsCartConfirmModalVisible] =
    useState<boolean>(false);
  const [pendingCartItems, setPendingCartItems] = useState<
    { product: Product; quantity: number }[]
  >([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // --- AsyncStorage Persistence ---
  // Load saved builder data on component mount
  useEffect(() => {
    let isMounted = true;
    const loadStoredData = async () => {
      try {
        const [savedApps, savedCustomDevs, savedHours, savedHybrid] =
          await Promise.all([
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
      }),
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
      Alert.alert(
        "Invalid Wattage",
        "Please enter a valid positive number for watts.",
      );
      return;
    }
    setAppliances((prev) =>
      prev.map((app) =>
        app.id === editingAppliance?.id ? { ...app, wattage: watt } : app,
      ),
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
        (app) => app.name.toLowerCase() === item.name.toLowerCase(),
      );
      if (existing) {
        // Increment quantity if already added
        return prev.map((app) =>
          app.id === existing.id ? { ...app, quantity: app.quantity + 1 } : app,
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
      Alert.alert(
        "Appliance Name Required",
        "Please enter a name for your custom appliance.",
      );
      return;
    }
    const watt = parseInt(customWatt, 10);
    if (isNaN(watt) || watt <= 0) {
      Alert.alert(
        "Valid Wattage Required",
        "Please enter a valid power rating in Watts.",
      );
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
      category: "My Custom",
    };
    setCustomDevicesList((prev) => {
      const updated = [
        customDeviceItem,
        ...prev.filter(
          (d) => d.name.toLowerCase() !== trimmedName.toLowerCase(),
        ),
      ];
      storageService.saveBuilderCustomDevices(updated);
      return updated;
    });

    setCustomName("");
    setCustomWatt("");
    setCustomQty(1);
    setCustomIcon("flash-outline");
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
      "Reset Appliances",
      "Do you want to reset all appliances and backup time back to default values?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Defaults",
          style: "destructive",
          onPress: () => {
            setAppliances(PRESET_APPLIANCES);
            setBackupHours(4);
            setIsSolarHybrid(true);
            setConfiguredInverters(null);
            setConfiguredBatteries(null);
            setConfiguredPanels(null);
            storageService.saveBuilderAppliances(PRESET_APPLIANCES);
            storageService.saveBuilderBackupHours(4);
            storageService.saveBuilderSolarHybrid(true);
          },
        },
      ],
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
      Alert.alert(
        "Invalid Duration",
        "Please enter a backup duration between 0.5 and 24 hours.",
      );
      return;
    }
    setBackupHours(Math.round(hours * 10) / 10);
    setIsHoursModalOpen(false);
  };

  // --- Calculation Engine with Real Catalog Product Matching ---
  const results: SystemBuilderResults = useMemo(() => {
    const totalWatts = appliances.reduce(
      (sum, app) => sum + app.wattage * app.quantity,
      0,
    );

    if (totalWatts === 0) {
      return {
        totalWatts: 0,
        recommendedVa: 0,
        requiredWattHours: 0,
        recommendedBatteryAh: 0,
        batteryVoltage: 12,
        seriesBatteryCount: 1,
        minVoltageString: 1,
        batteryCount: 0,
        recommendedBatteryCount: 0,
        effectiveInverterCount: 0,
        effectiveBatteryCount: 0,
        effectivePanelCount: 0,
        effectiveParallelBanks: 0,
        effectiveActualBackupHours: 0,
        effectiveSolarKw: 0,
        effectiveDailyUnits: 0,
        effectiveRoofSpaceSqFt: 0,
        isCustomizedQuantities: false,
        recommendedSolarKw: isSolarHybrid ? 0 : undefined,
        estimatedCostBDT: 0,
        estimatedCostMinBDT: 0,
        estimatedCostMaxBDT: 0,
        packageTier,
        solarRange,
        breakdown: {
          inverter: "None (Add appliances to calculate)",
          battery: "None (Add appliances to calculate)",
          solarPanels: isSolarHybrid
            ? "None (Add appliances to calculate)"
            : undefined,
        },
        inverterProvidedVa: 0,
        inverterProvidedWatts: 0,
        batteryProvidedAh: 0,
        actualBackupHours: 0,
        headroomPercent: 0,
        isSafeHeadroom: true,
        tierPrices: { economy: 0, standard: 0, premium: 0 },
        solarOptionPrices: { essential: 0, balanced: 0, max: 0 },
        solarOptionCounts: { essential: 1, balanced: 2, max: 4 },
        primaryInverterQty: 0,
        secondaryInverterProduct: undefined,
        secondaryInverterQty: 0,
        hasInverterCombination: false,
        totalInverterVa: 0,
        totalInverterWatts: 0,
        primaryBatteryQty: 0,
        secondaryBatteryProduct: undefined,
        secondaryBatteryQty: 0,
        hasBatteryCombination: false,
        primaryPanelQty: 0,
        secondaryPanelProduct: undefined,
        secondaryPanelQty: 0,
        hasPanelCombination: false,
      };
    }

    // Inverter sizing: Continuous load + 25% safety surge margin / power factor (0.8)
    const recommendedVa = Math.ceil((totalWatts * 1.25) / 0.8 / 50) * 50;
    const minSafeVa = Math.max(600, recommendedVa);

    // 1. Sizing DC Architecture & Battery Bank
    const batteryVoltage = minSafeVa > 2200 ? 48 : minSafeVa > 1200 ? 24 : 12;
    const seriesBatteryCount = batteryVoltage / 12;

    const requiredWattHours = Math.round(totalWatts * backupHours);
    const rawAh = requiredWattHours / (batteryVoltage * 0.75);

    let targetAh = 100;
    let parallelBanks = 1;

    if (rawAh <= 110) {
      targetAh = 100;
      parallelBanks = 1;
    } else if (rawAh <= 140) {
      targetAh = 130;
      parallelBanks = 1;
    } else if (rawAh <= 170) {
      targetAh = 150;
      parallelBanks = 1;
    } else if (rawAh <= 220) {
      targetAh = 200;
      parallelBanks = 1;
    } else {
      targetAh = 200;
      parallelBanks = Math.ceil(rawAh / 200);
    }
    const totalBatteryCount = seriesBatteryCount * parallelBanks;

    // 2. Genuine Store Products from Directus (no mock data)
    // For solar system (isSolarHybrid), suggest from Inverter category ('inverter', 71 items).
    // For regular IPS (!isSolarHybrid), suggest from IPS / Solar IPS category ('ips-solar-ips', 3 items).
    const rawInverters = isSolarHybrid
      ? catalogInverters.length > 0
        ? catalogInverters
        : catalogIps
      : catalogIps.length > 0
        ? catalogIps
        : catalogInverters;
    const availableInverters = rawInverters.filter((p) => p.inStock).length > 0
      ? rawInverters.filter((p) => p.inStock)
      : rawInverters;

    const availableBatteries = catalogBatteries.filter((p) => p.inStock).length > 0
      ? catalogBatteries.filter((p) => p.inStock)
      : catalogBatteries;

    const availableSolarPanels = catalogSolarPanels.filter((p) => p.inStock).length > 0
      ? catalogSolarPanels.filter((p) => p.inStock)
      : catalogSolarPanels;

    const scoredInverters = availableInverters
      .map((p) => ({ product: p, va: extractInverterVa(p) }))
      .filter((item) => item.va > 0);

    const safeForLoad = scoredInverters.filter((item) => item.va >= totalWatts);
    const candidateInverters =
      safeForLoad.filter((item) => item.va >= minSafeVa).length > 0
        ? safeForLoad.filter((item) => item.va >= minSafeVa)
        : safeForLoad.length > 0
          ? safeForLoad
          : scoredInverters;

    // Select closer in power range (not excessively low or high)
    const reasonableInverters = candidateInverters.filter(
      (item) => item.va <= minSafeVa * 2.2,
    );
    const inverterPool =
      reasonableInverters.length > 0 ? reasonableInverters : candidateInverters;

    // Separate priced vs unpriced (Call for Price) items so priced ones are chosen first for tiers
    const pricedInverters = inverterPool.filter(
      (item) => item.product.price > 0,
    );
    const inverterEconomyPool =
      pricedInverters.length > 0 ? pricedInverters : inverterPool;

    const economyInverter =
      inverterEconomyPool.length > 0
        ? [...inverterEconomyPool].sort(
            (a, b) => a.product.price - b.product.price,
          )[0].product
        : undefined;

    const standardInverter =
      inverterPool.length > 0
        ? [...inverterPool].sort((a, b) => {
            const diffA = Math.abs(a.va - minSafeVa);
            const diffB = Math.abs(b.va - minSafeVa);
            if (Math.abs(diffA - diffB) > 100) return diffA - diffB;
            // Prefer priced models if capacity is identical
            if (
              (a.product.price > 0 && b.product.price <= 0) ||
              (a.product.price <= 0 && b.product.price > 0)
            ) {
              return b.product.price - a.product.price;
            }
            return a.product.price - b.product.price;
          })[0].product
        : undefined;

    const premiumInverter =
      inverterPool.length > 0
        ? [...inverterPool].sort((a, b) => b.product.price - a.product.price)[0]
            .product
        : undefined;

    const activeInverter =
      (packageTier === "premium"
        ? premiumInverter
        : packageTier === "economy"
          ? economyInverter
          : standardInverter) ||
      standardInverter ||
      economyInverter ||
      premiumInverter;

    const inverterProvidedVa = activeInverter
      ? extractInverterVa(activeInverter) || minSafeVa
      : minSafeVa;
    const inverterProvidedWatts = Math.round(inverterProvidedVa * 0.8);

    // 3. Real Store Batteries by Tier
    const scoredBatteries = availableBatteries
      .map((p) => ({ product: p, ah: extractBatteryAh(p) }))
      .filter((item) => item.ah > 0);

    const sortedByAh =
      scoredBatteries.length > 0
        ? [...scoredBatteries].sort(
            (a, b) => Math.abs(a.ah - targetAh) - Math.abs(b.ah - targetAh),
          )
        : [];

    const bestAh = sortedByAh[0]?.ah || targetAh;
    const sameAhBatteries = sortedByAh.filter(
      (b) => Math.abs(b.ah - bestAh) <= 20,
    );

    const pricedSameAh = sameAhBatteries.filter((b) => b.product.price > 0);
    const batteryEconomyPool =
      pricedSameAh.length > 0 ? pricedSameAh : sameAhBatteries;

    const economyBattery =
      batteryEconomyPool.length > 0
        ? [...batteryEconomyPool].sort(
            (a, b) => a.product.price - b.product.price,
          )[0].product
        : sortedByAh[0]?.product;

    const standardBattery =
      sameAhBatteries.length > 0
        ? (
            sameAhBatteries.find(
              (b) =>
                b.product.title.toLowerCase().includes("tall") ||
                b.product.title.toLowerCase().includes("tubular"),
            ) || sameAhBatteries[0]
          ).product
        : sortedByAh[0]?.product;

    const premiumBattery =
      sameAhBatteries.length > 0
        ? [...sameAhBatteries].sort(
            (a, b) => b.product.price - a.product.price,
          )[0].product
        : sortedByAh[0]?.product;

    const activeBattery =
      (packageTier === "premium"
        ? premiumBattery
        : packageTier === "economy"
          ? economyBattery
          : standardBattery) ||
      standardBattery ||
      economyBattery ||
      premiumBattery;

    const batteryProvidedAh = activeBattery
      ? extractBatteryAh(activeBattery) || targetAh
      : targetAh;
    const totalBatteryWh =
      batteryVoltage * batteryProvidedAh * parallelBanks * 0.75;
    const actualBackupHours =
      Math.round((totalBatteryWh / totalWatts) * 10) / 10;

    // 4. Real Store Solar Panels by Tier
    const scoredPanels = availableSolarPanels
      .map((p) => ({ product: p, w: extractSolarWatts(p) }))
      .filter((item) => item.w > 0);

    const pricedPanels = scoredPanels.filter((p) => p.product.price > 0);
    const panelEconomyPool =
      pricedPanels.length > 0 ? pricedPanels : scoredPanels;

    const economyPanel =
      panelEconomyPool.length > 0
        ? [...panelEconomyPool].sort(
            (a, b) => a.product.price - b.product.price,
          )[0].product
        : undefined;

    const standardPanel =
      scoredPanels.length > 0
        ? [...scoredPanels].sort(
            (a, b) => Math.abs(a.w - 580) - Math.abs(b.w - 580),
          )[0].product
        : undefined;

    const premiumPanel =
      scoredPanels.length > 0
        ? [...scoredPanels].sort((a, b) => b.product.price - a.product.price)[0]
            .product
        : undefined;

    let activePanel: Product | undefined;
    if (isSolarHybrid) {
      activePanel =
        (packageTier === "premium"
          ? premiumPanel
          : packageTier === "economy"
            ? economyPanel
            : standardPanel) ||
        standardPanel ||
        economyPanel ||
        premiumPanel;
    }

    const panelWattage = activePanel
      ? extractSolarWatts(activePanel) || 580
      : 580;
    const minVoltageString =
      batteryVoltage === 48 ? 4 : batteryVoltage === 24 ? 2 : 1;
    const rawSolarWattsNeeded = (requiredWattHours * 1.3) / 4;
    let balancedPanels = Math.ceil(rawSolarWattsNeeded / panelWattage);
    balancedPanels = Math.max(
      minVoltageString,
      Math.ceil(balancedPanels / minVoltageString) * minVoltageString,
    );
    const essentialPanels = minVoltageString;
    const maxPanels =
      Math.ceil((balancedPanels * 1.5) / minVoltageString) * minVoltageString;

    const solarOptionCounts = {
      essential: essentialPanels,
      balanced: balancedPanels,
      max: maxPanels,
    };

    let panelCount = 0;
    let totalSolarWatts = 0;
    let totalSolarKw = 0;
    let dailySolarUnits = 0;
    let roofSpaceSqFt = 0;

    if (isSolarHybrid) {
      panelCount =
        solarRange === "essential"
          ? essentialPanels
          : solarRange === "max"
            ? maxPanels
            : balancedPanels;
      totalSolarWatts = panelCount * panelWattage;
      totalSolarKw = Math.round((totalSolarWatts / 1000) * 100) / 100;
      dailySolarUnits = Math.round(totalSolarKw * 4.2 * 10) / 10;
      roofSpaceSqFt = panelCount * 28;
    }

    // Solar options actual price breakdown
    const basePanelPrice = activePanel?.price || standardPanel?.price || 21500;
    const solarOptionPrices = {
      essential: (economyPanel?.price || basePanelPrice) * essentialPanels,
      balanced: (standardPanel?.price || basePanelPrice) * balancedPanels,
      max: (premiumPanel?.price || basePanelPrice) * maxPanels,
    };

    // 5. Accurate Real-Money Calculations for Each Tier (NO Mockups)
    const extraBatCost =
      totalBatteryCount > 2 ? (totalBatteryCount - 2) * 1200 : 0;

    // Economy Tier actual money
    const ecoInvPrice = economyInverter
      ? economyInverter.price
      : Math.round(minSafeVa * 12.5);
    const ecoBatPrice = economyBattery ? economyBattery.price : 20000;
    const ecoPanPrice = economyPanel ? economyPanel.price : 20000;
    const ecoAccCost =
      5000 + extraBatCost + (isSolarHybrid ? panelCount * 1000 : 0);
    const actualEcoPrice = Math.round(
      ecoInvPrice +
        ecoBatPrice * totalBatteryCount +
        (isSolarHybrid ? ecoPanPrice * panelCount : 0) +
        ecoAccCost,
    );

    // Standard Tier actual money
    const stdInvPrice = standardInverter
      ? standardInverter.price
      : Math.round(minSafeVa * 14.5);
    const stdBatPrice = standardBattery ? standardBattery.price : 25500;
    const stdPanPrice = standardPanel ? standardPanel.price : 21500;
    const stdAccCost =
      6500 + extraBatCost + (isSolarHybrid ? panelCount * 1200 : 0);
    const actualStdPrice = Math.round(
      stdInvPrice +
        stdBatPrice * totalBatteryCount +
        (isSolarHybrid ? stdPanPrice * panelCount : 0) +
        stdAccCost,
    );

    // Premium Tier actual money
    const premInvPrice = premiumInverter
      ? premiumInverter.price
      : Math.round(minSafeVa * 17.5);
    const premBatPrice = premiumBattery ? premiumBattery.price : 30500;
    const premPanPrice = premiumPanel ? premiumPanel.price : 23500;
    const premAccCost =
      8500 + extraBatCost + (isSolarHybrid ? panelCount * 1500 : 0);
    const actualPremPrice = Math.round(
      premInvPrice +
        premBatPrice * totalBatteryCount +
        (isSolarHybrid ? premPanPrice * panelCount : 0) +
        premAccCost,
    );

    const tierPrices = {
      economy: actualEcoPrice,
      standard: actualStdPrice,
      premium: actualPremPrice,
    };

    // Auto-recommended equipment based on tier
    const autoInverter =
      (packageTier === "premium"
        ? premiumInverter
        : packageTier === "economy"
          ? economyInverter
          : standardInverter) ||
      standardInverter ||
      economyInverter ||
      premiumInverter;

    const autoBattery =
      (packageTier === "premium"
        ? premiumBattery
        : packageTier === "economy"
          ? economyBattery
          : standardBattery) ||
      standardBattery ||
      economyBattery ||
      premiumBattery;

    const autoPanel = isSolarHybrid
      ? (packageTier === "premium"
          ? premiumPanel
          : packageTier === "economy"
            ? economyPanel
            : standardPanel) ||
        standardPanel ||
        economyPanel ||
        premiumPanel
      : undefined;

    // 1. Resolved Inverter Items Array
    const inverterItems: BuilderSlotItem[] =
      configuredInverters !== null && configuredInverters.length > 0
        ? configuredInverters
            .map((item) => {
              const prod =
                availableInverters.find((p) => p.id === item.productId) ||
                catalogInverters.find((p) => p.id === item.productId) ||
                catalogIps.find((p) => p.id === item.productId) ||
                autoInverter;
              const va = prod
                ? extractInverterVa(prod) || minSafeVa
                : minSafeVa;
              const watts = Math.round(va * 0.8);
              return {
                product: prod!,
                quantity: Math.max(1, item.quantity),
                va,
                watts,
              };
            })
            .filter((it) => !!it.product)
        : autoInverter
          ? [
              {
                product: autoInverter,
                quantity: 1,
                va: extractInverterVa(autoInverter) || minSafeVa,
                watts: Math.round(
                  (extractInverterVa(autoInverter) || minSafeVa) * 0.8,
                ),
              },
            ]
          : [];

    // 2. Resolved Battery Items Array
    const batteryItems: BuilderSlotItem[] =
      configuredBatteries !== null && configuredBatteries.length > 0
        ? configuredBatteries
            .map((item) => {
              const prod =
                availableBatteries.find((p) => p.id === item.productId) ||
                autoBattery;
              const ah = prod ? extractBatteryAh(prod) || targetAh : targetAh;
              let safeQty = Math.max(seriesBatteryCount, item.quantity);
              if (safeQty % seriesBatteryCount !== 0) {
                safeQty = Math.max(
                  seriesBatteryCount,
                  Math.round(safeQty / seriesBatteryCount) * seriesBatteryCount,
                );
              }
              const wh =
                batteryVoltage * ah * (safeQty / seriesBatteryCount) * 0.75;
              return {
                product: prod!,
                quantity: safeQty,
                ah,
                wh,
              };
            })
            .filter((it) => !!it.product)
        : autoBattery
          ? [
              {
                product: autoBattery,
                quantity: totalBatteryCount,
                ah: extractBatteryAh(autoBattery) || targetAh,
                wh:
                  batteryVoltage *
                  (extractBatteryAh(autoBattery) || targetAh) *
                  (totalBatteryCount / seriesBatteryCount) *
                  0.75,
              },
            ]
          : [];

    // 3. Resolved Solar Panel Items Array
    const panelItems: BuilderSlotItem[] = !isSolarHybrid
      ? []
      : configuredPanels !== null && configuredPanels.length > 0
        ? configuredPanels
            .map((item) => {
              const prod =
                catalogSolarPanels.find((p) => p.id === item.productId) ||
                autoPanel;
              const watts = prod ? extractSolarWatts(prod) || 580 : 580;
              let safeQty = Math.max(minVoltageString, item.quantity);
              if (safeQty % minVoltageString !== 0) {
                safeQty = Math.max(
                  minVoltageString,
                  Math.ceil(safeQty / minVoltageString) * minVoltageString,
                );
              }
              return {
                product: prod!,
                quantity: safeQty,
                watts,
                totalWatts: safeQty * watts,
              };
            })
            .filter((it) => !!it.product)
        : autoPanel && panelCount > 0
          ? [
              {
                product: autoPanel,
                quantity: panelCount,
                watts: extractSolarWatts(autoPanel) || 580,
                totalWatts: panelCount * (extractSolarWatts(autoPanel) || 580),
              },
            ]
          : [];

    // Calculations across all models in each array
    const totalInverterVa = inverterItems.reduce(
      (sum, it) => sum + (it.va || minSafeVa) * it.quantity,
      0,
    );
    const totalInverterWatts = inverterItems.reduce(
      (sum, it) =>
        sum + (it.watts || Math.round(minSafeVa * 0.8)) * it.quantity,
      0,
    );
    const effectiveInverterCount = inverterItems.reduce(
      (sum, it) => sum + it.quantity,
      0,
    );
    const headroomPercent =
      totalWatts > 0
        ? Math.round(((totalInverterWatts - totalWatts) / totalWatts) * 100)
        : 0;
    const isSafeHeadroom = totalInverterWatts >= totalWatts;

    const effectiveBatteryCount = batteryItems.reduce(
      (sum, it) => sum + it.quantity,
      0,
    );
    const combinedBatteryWh = batteryItems.reduce(
      (sum, it) => sum + (it.wh || 0),
      0,
    );
    const effectiveParallelBanks = Math.max(
      1,
      Math.round(effectiveBatteryCount / seriesBatteryCount),
    );
    const effectiveActualBackupHours =
      totalWatts > 0
        ? Math.round((combinedBatteryWh / totalWatts) * 10) / 10
        : backupHours;

    const effectivePanelCount = panelItems.reduce(
      (sum, it) => sum + it.quantity,
      0,
    );
    const combinedSolarWatts = panelItems.reduce(
      (sum, it) => sum + (it.totalWatts || 0),
      0,
    );
    const combinedSolarKw = Math.round((combinedSolarWatts / 1000) * 100) / 100;
    const combinedDailyUnits = Math.round(combinedSolarKw * 4.2 * 10) / 10;
    const combinedRoofSpace = effectivePanelCount * 28;

    // Pricing calculation summing across all configured items
    const totalInverterCost = inverterItems.reduce(
      (sum, it) =>
        sum + (it.product.price > 0 ? it.product.price : 0) * it.quantity,
      0,
    );
    const totalBatteryCost = batteryItems.reduce(
      (sum, it) =>
        sum + (it.product.price > 0 ? it.product.price : 0) * it.quantity,
      0,
    );
    const totalPanelCost = panelItems.reduce(
      (sum, it) =>
        sum + (it.product.price > 0 ? it.product.price : 0) * it.quantity,
      0,
    );

    const effectiveExtraBatCost =
      effectiveBatteryCount > 2 ? (effectiveBatteryCount - 2) * 1200 : 0;
    const effectiveAccCost =
      (packageTier === "premium"
        ? 8500
        : packageTier === "economy"
          ? 5000
          : 6500) +
      effectiveExtraBatCost +
      (isSolarHybrid
        ? effectivePanelCount *
          (packageTier === "premium"
            ? 1500
            : packageTier === "economy"
              ? 1000
              : 1200)
        : 0);

    const estimatedCostBDT = Math.round(
      totalInverterCost + totalBatteryCost + totalPanelCost + effectiveAccCost,
    );

    const isCustomizedQuantities =
      configuredInverters !== null ||
      configuredBatteries !== null ||
      (isSolarHybrid && configuredPanels !== null);

    const invDesc =
      inverterItems.length > 0
        ? inverterItems
            .map((it) => `${it.quantity}x ${it.product.title}`)
            .join(" + ") + ` (${totalInverterVa}VA)`
        : `${totalInverterVa}VA Unit`;

    const batteryBankDesc =
      batteryItems.length > 0
        ? batteryItems
            .map((it) => `${it.quantity}x ${it.product.title}`)
            .join(" + ") +
          ` (${effectiveParallelBanks}x ${batteryVoltage}V bank)`
        : `${effectiveBatteryCount}x Battery Bank`;

    const solarPanelsDesc =
      isSolarHybrid && panelItems.length > 0
        ? panelItems
            .map((it) => `${it.quantity}x ${it.product.title}`)
            .join(" + ") + ` (${combinedSolarKw} kWp)`
        : undefined;

    const solarDetails = isSolarHybrid
      ? {
          panelCount: effectivePanelCount,
          panelWattage: panelItems[0]?.watts || 580,
          totalWatts: combinedSolarWatts,
          panelBrand:
            panelItems.map((it) => it.product.title).join(" + ") ||
            (packageTier === "premium"
              ? "Dual-Glass N-Type 580W"
              : "Mono Bifacial 580W"),
          dailyUnitsKwh: combinedDailyUnits,
          roofSpaceSqFt: combinedRoofSpace,
          warranty:
            panelItems[0]?.product.warranty || "25 Years Linear Warranty",
        }
      : undefined;

    return {
      totalWatts,
      recommendedVa: minSafeVa,
      requiredWattHours,
      recommendedBatteryAh: targetAh,
      batteryVoltage,
      seriesBatteryCount,
      minVoltageString,
      batteryCount: effectiveBatteryCount,
      recommendedBatteryCount: totalBatteryCount,
      effectiveInverterCount,
      effectiveBatteryCount,
      effectivePanelCount,
      effectiveParallelBanks,
      effectiveActualBackupHours,
      effectiveSolarKw: combinedSolarKw,
      effectiveDailyUnits: combinedDailyUnits,
      effectiveRoofSpaceSqFt: combinedRoofSpace,
      isCustomizedQuantities,
      recommendedSolarKw: isSolarHybrid ? combinedSolarKw : undefined,
      estimatedCostBDT,
      estimatedCostMinBDT: actualEcoPrice,
      estimatedCostMaxBDT: actualPremPrice,
      packageTier,
      solarRange,
      solarDetails,
      breakdown: {
        inverter: invDesc,
        battery: batteryBankDesc,
        solarPanels: solarPanelsDesc,
      },
      inverterItems,
      batteryItems,
      panelItems,
      activeInverterProduct: inverterItems[0]?.product,
      activeBatteryProduct: batteryItems[0]?.product,
      activePanelProduct: panelItems[0]?.product,
      primaryInverterQty: inverterItems[0]?.quantity ?? 1,
      secondaryInverterProduct: inverterItems[1]?.product,
      secondaryInverterQty: inverterItems[1]?.quantity ?? 0,
      hasInverterCombination: inverterItems.length > 1,
      totalInverterVa,
      totalInverterWatts,
      primaryBatteryQty: batteryItems[0]?.quantity ?? totalBatteryCount,
      secondaryBatteryProduct: batteryItems[1]?.product,
      secondaryBatteryQty: batteryItems[1]?.quantity ?? 0,
      hasBatteryCombination: batteryItems.length > 1,
      primaryPanelQty: panelItems[0]?.quantity ?? panelCount,
      secondaryPanelProduct: panelItems[1]?.product,
      secondaryPanelQty: panelItems[1]?.quantity ?? 0,
      hasPanelCombination: panelItems.length > 1,
      inverterProvidedVa: totalInverterVa,
      inverterProvidedWatts: totalInverterWatts,
      batteryProvidedAh: batteryItems[0]?.ah ?? targetAh,
      actualBackupHours: effectiveActualBackupHours,
      headroomPercent,
      isSafeHeadroom,
      tierPrices,
      solarOptionPrices,
      solarOptionCounts,
    };
  }, [
    appliances,
    backupHours,
    isSolarHybrid,
    packageTier,
    solarRange,
    catalogIps,
    catalogInverters,
    catalogBatteries,
    catalogSolarPanels,
    configuredInverters,
    configuredBatteries,
    configuredPanels,
  ]);

  const handleSelectTier = (tier: "economy" | "standard" | "premium") => {
    setPackageTier(tier);
    setConfiguredInverters(null);
    setConfiguredBatteries(null);
    setConfiguredPanels(null);
  };

  const handleAddPackageToCart = () => {
    if (results.totalWatts === 0) {
      Alert.alert(
        "No Appliances Selected",
        "Please add at least one appliance with quantity greater than 0 to configure and order a system.",
      );
      return;
    }

    const itemsToAdd: { product: Product; quantity: number }[] = [];

    // Inverter(s)
    if (results.inverterItems && results.inverterItems.length > 0) {
      results.inverterItems.forEach((it) => {
        if (it.product && it.quantity > 0) {
          itemsToAdd.push({ product: it.product, quantity: it.quantity });
        }
      });
    }

    // Battery(ies)
    if (results.batteryItems && results.batteryItems.length > 0) {
      results.batteryItems.forEach((it) => {
        if (it.product && it.quantity > 0) {
          itemsToAdd.push({ product: it.product, quantity: it.quantity });
        }
      });
    }

    // Solar Panel(s)
    if (isSolarHybrid && results.panelItems && results.panelItems.length > 0) {
      results.panelItems.forEach((it) => {
        if (it.product && it.quantity > 0) {
          itemsToAdd.push({ product: it.product, quantity: it.quantity });
        }
      });
    }

    if (itemsToAdd.length === 0) {
      Alert.alert(
        "Catalog Still Loading",
        "Products are loading from the store. Please ensure internet is active and try again.",
      );
      return;
    }

    const outOfStockItems = itemsToAdd.filter((it) => !it.product.inStock);
    if (outOfStockItems.length > 0) {
      const titles = outOfStockItems.map((it) => it.product.title).join("\n• ");
      Alert.alert(
        "Out of Stock Component",
        `The configured system contains out-of-stock items:\n\n• ${titles}\n\nPlease replace them with available in-stock models before adding to cart.`,
      );
      return;
    }

    setPendingCartItems(itemsToAdd);
    setIsCartConfirmModalVisible(true);
  };

  const handleConfirmAddToCart = () => {
    if (pendingCartItems.length > 0) {
      const outOfStockItems = pendingCartItems.filter((it) => !it.product.inStock);
      if (outOfStockItems.length > 0) {
        Alert.alert(
          "Out of Stock Component",
          "Cannot add system to cart because one or more components are out of stock. Please select in-stock replacements.",
        );
        return;
      }
      addMultipleToCart(pendingCartItems);
    }
    setIsCartConfirmModalVisible(false);
    navigation.navigate("Cart");
  };

  const handlePrintQuotationPdf = async () => {
    if (results.totalWatts === 0) {
      Alert.alert(
        "No Appliances Selected",
        "Please add at least one appliance with quantity greater than 0 before printing a quotation.",
      );
      return;
    }

    setIsGeneratingPdf(true);
    try {
      await executePrintOrShareQuotation({
        appliances,
        results,
        backupHours,
        packageTier,
        isSolarHybrid,
        isCustomPackage,
        selectedItems:
          pendingCartItems.length > 0 ? pendingCartItems : undefined,
      });
    } catch (err) {
      console.error("Print quotation PDF error:", err);
      Alert.alert("PDF Error", "Failed to generate quotation PDF document.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleConsultWhatsApp = () => {
    if (results.totalWatts === 0) {
      Alert.alert(
        "No Appliances Selected",
        "Please add appliances first to consult on your system configuration.",
      );
      return;
    }

    const tierLabel = isCustomPackage
      ? "Custom Package"
      : packageTier === "premium"
        ? "Premium Pro"
        : packageTier === "economy"
          ? "Economy"
          : "Standard";
    const invLine =
      results.inverterItems && results.inverterItems.length > 0
        ? results.inverterItems
            .map((it) => `${it.quantity}x ${it.product.title}`)
            .join(" + ")
        : results.breakdown.inverter;

    const batLine =
      results.batteryItems && results.batteryItems.length > 0
        ? results.batteryItems
            .map((it) => `${it.quantity}x ${it.product.title}`)
            .join(" + ") +
          ` (${results.effectiveParallelBanks || 1}x ${results.batteryVoltage}V Bank)`
        : results.breakdown.battery;

    const solarText =
      isSolarHybrid && results.panelItems && results.panelItems.length > 0
        ? `• Solar Array: ${results.panelItems.map((it) => `${it.quantity}x ${it.product.title}`).join(" + ")} (~${results.effectiveDailyUnits} units/day · ${results.effectiveSolarKw} kWp)\n`
        : results.solarDetails && results.activePanelProduct
          ? `• Solar Array: ${results.solarDetails.panelCount}x ${results.activePanelProduct.title} (~${results.solarDetails.dailyUnitsKwh} units/day · ${results.effectiveSolarKw || results.recommendedSolarKw} kWp)\n`
          : "";

    const activeAppliances = appliances.filter((a) => a.quantity > 0);
    const appliancesText = activeAppliances
      .map((a) =>
        a.quantity > 1
          ? `  • ${a.quantity}x ${a.name} (${a.wattage}W each = ${a.wattage * a.quantity}W)`
          : `  • 1x ${a.name} (${a.wattage}W)`,
      )
      .join("\n");

    const message = encodeURIComponent(
      `Hello Radical Engineering! I built a customized system on your mobile app and need an official quotation:\n\n` +
        `📋 Connected Appliances & Wattage:\n` +
        appliancesText +
        `\n\n` +
        `⚡ Load Requirements:\n` +
        `• Total Continuous Load: ${results.totalWatts}W\n` +
        `• Backup Duration: ${backupHours} hrs (~${results.requiredWattHours} Wh)\n` +
        `• Inverter Rating Needed: ${results.recommendedVa}VA minimum\n\n` +
        `⚙️ System Configuration (${tierLabel}):\n` +
        `• Architecture: ${isSolarHybrid ? "Solar Hybrid IPS" : "Standard IPS"}\n` +
        `• Inverter: ${invLine} (${results.totalInverterWatts || results.inverterProvidedWatts || 0}W capacity, ${results.headroomPercent}% headroom)\n` +
        `• Battery Bank: ${batLine} (~${results.actualBackupHours} hrs backup)\n` +
        solarText +
        `• Estimated App Total: ৳${results.estimatedCostBDT.toLocaleString()} (${tierLabel} System)\n\n` +
        `Please confirm equipment availability and quotation for my address.`,
    );
    Linking.openURL(
      `https://wa.me/${APP_CONFIG.whatsappNumber.replace("+", "")}?text=${message}`,
    );
  };

  // Filter catalog products for current selector modal
  const selectorProducts = useMemo(() => {
    if (!selectorModalType) return [];
    let list: Product[] = [];
    if (selectorModalType === "inverter") {
      list = isSolarHybrid
        ? catalogInverters.length > 0
          ? catalogInverters
          : catalogIps
        : catalogIps.length > 0
          ? catalogIps
          : catalogInverters;
    } else if (selectorModalType === "battery") {
      list = catalogBatteries;
    } else if (selectorModalType === "solar") {
      list = catalogSolarPanels;
    }

    if (!selectorSearchText.trim()) return list;
    const q = selectorSearchText.toLowerCase();
    return list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.model && p.model.toLowerCase().includes(q)),
    );
  }, [
    selectorModalType,
    isSolarHybrid,
    catalogIps,
    catalogInverters,
    catalogBatteries,
    catalogSolarPanels,
    selectorSearchText,
  ]);

  // Combined library including user's saved custom devices
  const combinedLibrary = useMemo(() => {
    const customItems: LibraryAppliance[] = customDevicesList.map((dev) => ({
      id: dev.id,
      name: dev.name,
      wattage: dev.wattage,
      icon: dev.icon,
      category: "My Custom",
      isCustom: true,
    }));
    return [...customItems, ...APPLIANCE_LIBRARY];
  }, [customDevicesList]);

  // Dynamic category tabs
  const categoryTabs = useMemo(() => {
    const base = ["All", "Popular"];
    if (customDevicesList.length > 0) {
      base.push("My Custom");
    }
    base.push("Cooling", "Kitchen", "Heavy", "Electronics");
    return base;
  }, [customDevicesList]);

  // Filtered appliances for library modal
  const filteredLibrary = useMemo(() => {
    return combinedLibrary.filter((item) => {
      const matchesCategory =
        libraryCategory === "All" ||
        (libraryCategory === "My Custom"
          ? item.isCustom
          : item.category === libraryCategory);
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [combinedLibrary, libraryCategory, searchQuery]);

  const availableInverters = useMemo(() => {
    return isSolarHybrid
      ? catalogInverters.length > 0
        ? catalogInverters
        : catalogIps
      : catalogIps.length > 0
        ? catalogIps
        : catalogInverters;
  }, [isSolarHybrid, catalogInverters, catalogIps]);

  const openModelSelector = (
    type: "inverter" | "battery" | "solar",
    index: number,
  ) => {
    setSelectorModalType(type);
    setSelectorTargetIndex(index);
    setSelectorSearchText("");
  };

  const handleAddInverter = () => {
    const current =
      configuredInverters ??
      (results.inverterItems?.map((it) => ({
        productId: it.product.id,
        quantity: it.quantity,
      })) ||
        []);
    const candidate =
      availableInverters.find(
        (p) => !current.some((c) => c.productId === p.id),
      ) || availableInverters[0];
    if (candidate) {
      setConfiguredInverters([
        ...current,
        { productId: candidate.id, quantity: 1 },
      ]);
    } else {
      openModelSelector("inverter", current.length);
    }
  };

  const handleRemoveInverter = (index: number) => {
    const current =
      configuredInverters ??
      (results.inverterItems?.map((it) => ({
        productId: it.product.id,
        quantity: it.quantity,
      })) ||
        []);
    const updated = current.filter((_, idx) => idx !== index);
    setConfiguredInverters(updated.length > 0 ? updated : null);
  };

  const handleUpdateInverterQty = (index: number, newQty: number) => {
    if (newQty < 1) return;
    const current =
      configuredInverters ??
      (results.inverterItems?.map((it) => ({
        productId: it.product.id,
        quantity: it.quantity,
      })) ||
        []);
    const updated = [...current];
    if (updated[index]) {
      updated[index] = { ...updated[index], quantity: Math.min(10, newQty) };
      setConfiguredInverters(updated);
    }
  };

  const handleAddBattery = () => {
    const current =
      configuredBatteries ??
      (results.batteryItems?.map((it) => ({
        productId: it.product.id,
        quantity: it.quantity,
      })) ||
        []);
    const candidate =
      catalogBatteries.find(
        (p) => !current.some((c) => c.productId === p.id),
      ) || catalogBatteries[0];
    const step = results.seriesBatteryCount || 1;
    if (candidate) {
      setConfiguredBatteries([
        ...current,
        { productId: candidate.id, quantity: step },
      ]);
    } else {
      openModelSelector("battery", current.length);
    }
  };

  const handleRemoveBattery = (index: number) => {
    const current =
      configuredBatteries ??
      (results.batteryItems?.map((it) => ({
        productId: it.product.id,
        quantity: it.quantity,
      })) ||
        []);
    const updated = current.filter((_, idx) => idx !== index);
    setConfiguredBatteries(updated.length > 0 ? updated : null);
  };

  const handleUpdateBatteryQty = (index: number, newQty: number) => {
    const step = results.seriesBatteryCount || 1;
    if (newQty < step) return;
    const current =
      configuredBatteries ??
      (results.batteryItems?.map((it) => ({
        productId: it.product.id,
        quantity: it.quantity,
      })) ||
        []);
    const updated = [...current];
    if (updated[index]) {
      updated[index] = {
        ...updated[index],
        quantity: Math.min(step * 8, newQty),
      };
      setConfiguredBatteries(updated);
    }
  };

  const handleAddPanel = () => {
    const current =
      configuredPanels ??
      (results.panelItems?.map((it) => ({
        productId: it.product.id,
        quantity: it.quantity,
      })) ||
        []);
    const candidate =
      catalogSolarPanels.find(
        (p) => !current.some((c) => c.productId === p.id),
      ) || catalogSolarPanels[0];
    const step = results.minVoltageString || 1;
    if (candidate) {
      setConfiguredPanels([
        ...current,
        { productId: candidate.id, quantity: step },
      ]);
    } else {
      openModelSelector("solar", current.length);
    }
  };

  const handleRemovePanel = (index: number) => {
    const current =
      configuredPanels ??
      (results.panelItems?.map((it) => ({
        productId: it.product.id,
        quantity: it.quantity,
      })) ||
        []);
    const updated = current.filter((_, idx) => idx !== index);
    setConfiguredPanels(updated.length > 0 ? updated : null);
  };

  const handleUpdatePanelQty = (index: number, newQty: number) => {
    const step = results.minVoltageString || 1;
    if (newQty < step) return;
    const current =
      configuredPanels ??
      (results.panelItems?.map((it) => ({
        productId: it.product.id,
        quantity: it.quantity,
      })) ||
        []);
    const updated = [...current];
    if (updated[index]) {
      updated[index] = { ...updated[index], quantity: Math.min(64, newQty) };
      setConfiguredPanels(updated);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        showBack
        onBack={() => navigation.goBack()}
        title="Solar IPS Builder"
        subtitle="Custom Load Engineering"
        onOpenCart={() => navigation.navigate("Cart")}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Architecture Mode Toggle */}
        <View
          style={[
            styles.modeToggleCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.modeButton,
              isSolarHybrid && [
                styles.activeModeButton,
                { backgroundColor: colors.primary },
              ],
            ]}
            onPress={() => {
              setIsSolarHybrid(true);
              setConfiguredInverters(null);
              setConfiguredPanels(null);
            }}
          >
            <Ionicons
              name="sunny"
              size={16}
              color={
                isSolarHybrid
                  ? isDark
                    ? "#260B00"
                    : "#FFFFFF"
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.modeText,
                {
                  color: isSolarHybrid
                    ? isDark
                      ? "#260B00"
                      : "#FFFFFF"
                    : colors.text,
                },
              ]}
            >
              Solar Hybrid IPS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              !isSolarHybrid && [
                styles.activeModeButton,
                { backgroundColor: colors.primary },
              ],
            ]}
            onPress={() => {
              setIsSolarHybrid(false);
              setConfiguredInverters(null);
              setConfiguredPanels(null);
            }}
          >
            <Ionicons
              name="flash"
              size={16}
              color={
                !isSolarHybrid
                  ? isDark
                    ? "#260B00"
                    : "#FFFFFF"
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.modeText,
                {
                  color: !isSolarHybrid
                    ? isDark
                      ? "#260B00"
                      : "#FFFFFF"
                    : colors.text,
                },
              ]}
            >
              Standard IPS
            </Text>
          </TouchableOpacity>
        </View>

        {/* Step 1: Appliances Selection */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleCol}>
              <View style={styles.titleRow}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  1. Connected Appliances
                </Text>
                <TouchableOpacity
                  onPress={handleResetToDefaults}
                  style={styles.resetHeaderBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.resetHeaderText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Reset
                  </Text>
                </TouchableOpacity>
              </View>
              <Text
                style={[styles.cardSubtitle, { color: colors.textSecondary }]}
              >
                Tap watt badge to edit wattage per appliance or add/remove items
              </Text>
            </View>
            <View
              style={[
                styles.totalWattsBadge,
                {
                  backgroundColor: isDark
                    ? "rgba(252, 185, 116, 0.15)"
                    : "#F5EBE6",
                },
              ]}
            >
              <Text style={[styles.totalWattsText, { color: colors.primary }]}>
                {results.totalWatts} W
              </Text>
            </View>
          </View>

          {appliances.length === 0 ? (
            <View style={styles.emptyAppliancesBox}>
              <Ionicons
                name="flash-off-outline"
                size={36}
                color={colors.textMuted}
              />
              <Text
                style={[styles.emptyAppliancesTitle, { color: colors.text }]}
              >
                No Appliances in List
              </Text>
              <Text
                style={[
                  styles.emptyAppliancesSub,
                  { color: colors.textSecondary },
                ]}
              >
                Add connected devices from the catalog below to calculate system
                requirements.
              </Text>
            </View>
          ) : (
            appliances.map((app) => (
              <View
                key={app.id}
                style={[
                  styles.applianceRow,
                  { borderBottomColor: colors.border },
                ]}
              >
                <View style={styles.applianceInfo}>
                  <View
                    style={[
                      styles.appIconCircle,
                      {
                        backgroundColor: isDark
                          ? "rgba(252, 185, 116, 0.12)"
                          : "#F5EBE6",
                      },
                    ]}
                  >
                    <Ionicons
                      name={app.icon as any}
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.appTextCol}>
                    <Text
                      style={[styles.appName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {app.name}
                    </Text>

                    {/* Interactive Editable Wattage Badge */}
                    <TouchableOpacity
                      style={[
                        styles.wattagePillBtn,
                        {
                          backgroundColor: colors.surfaceVariant,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => openEditWattModal(app)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="flash" size={10} color={colors.primary} />
                      <Text
                        style={[styles.wattagePillText, { color: colors.text }]}
                      >
                        {app.wattage}W each
                      </Text>
                      <Ionicons
                        name="pencil"
                        size={10}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Stepper and Delete Action */}
                <View style={styles.appActionsRow}>
                  <View
                    style={[
                      styles.qtyBox,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surfaceVariant,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => updateQuantity(app.id, -1)}
                      style={styles.qtyBtn}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <Ionicons name="remove" size={15} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.qtyText, { color: colors.text }]}>
                      {app.quantity}
                    </Text>
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
                    style={[
                      styles.deleteBtn,
                      {
                        backgroundColor: isDark
                          ? "rgba(220, 38, 38, 0.15)"
                          : "#FEE2E2",
                      },
                    ]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={`Remove ${app.name}`}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={15}
                      color={COLORS.danger}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          {/* Add Appliance Action Button */}
          <TouchableOpacity
            style={[
              styles.addApplianceBtn,
              {
                borderColor: colors.primary,
                backgroundColor: isDark
                  ? "rgba(252, 185, 116, 0.08)"
                  : "#FFF7ED",
              },
            ]}
            onPress={() => {
              setSearchQuery("");
              setIsAddModalOpen(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={18} color={colors.primary} />
            <Text
              style={[styles.addApplianceBtnText, { color: colors.primary }]}
            >
              + Add Appliance or Device
            </Text>
          </TouchableOpacity>
        </View>

        {/* Step 2: Desired Backup Time */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.sectionTitleCol}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              2. Desired Backup Time
            </Text>
            <Text
              style={[styles.cardSubtitle, { color: colors.textSecondary }]}
            >
              Adjust continuous hours during power cuts using steppers or quick
              presets
            </Text>
          </View>

          {/* Hero Stepper Control Bar */}
          <View
            style={[
              styles.backupHeroBox,
              {
                backgroundColor: colors.surfaceVariant,
                borderColor: colors.border,
              },
            ]}
          >
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
              <Text
                style={[
                  styles.backupStepSubText,
                  { color: colors.textSecondary },
                ]}
              >
                -0.5h
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backupHeroCenter}
              onPress={openCustomHoursModal}
              activeOpacity={0.8}
            >
              <View style={styles.backupHeroHoursRow}>
                <Ionicons name="time" size={20} color={colors.primary} />
                <Text
                  style={[styles.backupHeroHoursValue, { color: colors.text }]}
                >
                  {backupHours} {backupHours === 1 ? "Hour" : "Hours"}
                </Text>
                <Ionicons
                  name="create-outline"
                  size={15}
                  color={colors.primary}
                />
              </View>

              <Text
                style={[styles.backupHeroDesc, { color: colors.textSecondary }]}
              >
                {backupHours >= 1
                  ? `${Math.floor(backupHours)} hr${Math.floor(backupHours) > 1 ? "s" : ""}${
                      backupHours % 1 !== 0
                        ? ` ${Math.round((backupHours % 1) * 60)} mins`
                        : ""
                    } continuous runtime`
                  : `${Math.round(backupHours * 60)} minutes continuous runtime`}
              </Text>
              <Text
                style={[styles.backupHeroTapHint, { color: colors.primary }]}
              >
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
              <Text
                style={[
                  styles.backupStepSubText,
                  { color: colors.textSecondary },
                ]}
              >
                +0.5h
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Presets Chips */}
          <Text
            style={[styles.quickPresetsLabel, { color: colors.textSecondary }]}
          >
            Quick Presets:
          </Text>
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
                      backgroundColor: isSelected
                        ? colors.primary
                        : colors.surfaceVariant,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.hourChipText,
                      {
                        color: isSelected
                          ? isDark
                            ? "#260B00"
                            : "#FFFFFF"
                          : colors.text,
                      },
                    ]}
                  >
                    {hours}h
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Step 3: Choose Package Range & Tier */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.sectionTitleCol}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              3. Choose Package Range & Tier
            </Text>
            <Text
              style={[styles.cardSubtitle, { color: colors.textSecondary }]}
            >
              Select hardware grade matching your budget & warranty requirements
            </Text>
          </View>

          {/* Tier Selection Tabs (Only show price for the selected tier) */}
          <View style={styles.tierTabContainer}>
            {(
              [
                {
                  id: "economy",
                  label: "Economy",
                  badge: "BUDGET",
                  sub: "Budget Saver",
                },
                {
                  id: "standard",
                  label: "Standard",
                  badge: "RECOMMENDED",
                  sub: "Best Value",
                },
                {
                  id: "premium",
                  label: "Premium Pro",
                  badge: "PRO",
                  sub: "Heavy Duty",
                },
              ] as const
            ).map((t) => {
              const isSel = packageTier === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.tierTabBtn,
                    {
                      backgroundColor: isSel
                        ? colors.primary
                        : isDark
                          ? "rgba(255,255,255,0.05)"
                          : "#F8FAFC",
                      borderColor: isSel ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleSelectTier(t.id)}
                  activeOpacity={0.8}
                >
                  {t.id === "standard" && (
                    <View
                      style={[
                        styles.tierTabRecBadge,
                        {
                          backgroundColor: isSel
                            ? isDark
                              ? "#260B00"
                              : "#FFFFFF"
                            : colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tierTabRecText,
                          { color: isSel ? colors.primary : "#FFFFFF" },
                        ]}
                      >
                        BEST VALUE
                      </Text>
                    </View>
                  )}
                  <Text
                    style={[
                      styles.tierTabLabel,
                      {
                        color: isSel
                          ? isDark
                            ? "#260B00"
                            : "#FFFFFF"
                          : colors.text,
                      },
                    ]}
                  >
                    {t.label}
                  </Text>
                  {isSel ? (
                    <Text
                      style={[
                        styles.tierTabPrice,
                        { color: isDark ? "#260B00" : "#FFFFFF" },
                      ]}
                    >
                      {results.totalWatts > 0
                        ? `৳ ${results.estimatedCostBDT.toLocaleString()}`
                        : "৳ 0"}
                    </Text>
                  ) : (
                    <Text
                      style={[
                        styles.tierTabSub,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t.sub}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Only Selected Tier Card Shows (Zero mockups, actual hardware specs) */}
          {packageTier === "economy" && (
            <View
              style={[
                styles.selectedTierCard,
                {
                  backgroundColor: isDark
                    ? "rgba(252, 185, 116, 0.08)"
                    : "#FFFBF5",
                  borderColor: colors.primary,
                },
              ]}
            >
              <View style={styles.selectedTierHeader}>
                <View
                  style={[
                    styles.tierBadge,
                    { backgroundColor: isDark ? "#334155" : "#E2E8F0" },
                  ]}
                >
                  <Text
                    style={[
                      styles.tierBadgeText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    BUDGET SAVER
                  </Text>
                </View>
                <View
                  style={[
                    styles.activeTierPill,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={isDark ? "#260B00" : "#FFFFFF"}
                  />
                  <Text
                    style={[
                      styles.activeTierPillText,
                      { color: isDark ? "#260B00" : "#FFFFFF" },
                    ]}
                  >
                    Active Selection
                  </Text>
                </View>
              </View>

              <Text style={[styles.selectedTierTitle, { color: colors.text }]}>
                Economy IPS Package
              </Text>
              <Text
                style={[
                  styles.selectedTierDesc,
                  { color: colors.textSecondary },
                ]}
              >
                Reliable everyday load shedding backup with cost-effective
                tubular storage and genuine pure sine wave technology.
              </Text>

              {/* Hardware items in this tier */}
              <View
                style={[
                  styles.tierHardwareSummaryBox,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.tierHardwareRow}>
                  <Ionicons
                    name="hardware-chip-outline"
                    size={15}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.tierHardwareText, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    Inverter:{" "}
                    {results.activeInverterProduct?.title ||
                      "Pure Sine Wave Inverter"}
                  </Text>
                </View>
                <View style={styles.tierHardwareRow}>
                  <Ionicons
                    name="battery-charging-outline"
                    size={15}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.tierHardwareText, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    Battery: {results.batteryCount}x{" "}
                    {results.activeBatteryProduct?.title ||
                      "Standard Tubular (18m warranty)"}
                  </Text>
                </View>
                {isSolarHybrid && (
                  <View style={styles.tierHardwareRow}>
                    <Ionicons
                      name="sunny-outline"
                      size={15}
                      color={colors.primary}
                    />
                    <Text
                      style={[styles.tierHardwareText, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      Solar Array: {results.solarDetails?.panelCount}x{" "}
                      {results.activePanelProduct?.title ||
                        "Mono PERC Solar Panels"}
                    </Text>
                  </View>
                )}
                <View style={styles.tierHardwareRow}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={15}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.tierHardwareText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Installation: Heavy-duty DC cables, rack & protection
                    switchgear included
                  </Text>
                </View>
              </View>

              <View style={styles.tierPriceBottomRow}>
                <View>
                  <Text
                    style={[
                      styles.tierPriceBottomLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Complete Package Cost
                  </Text>
                  <Text
                    style={[
                      styles.tierPriceBottomSub,
                      { color: colors.textMuted },
                    ]}
                  >
                    Real equipment pricing
                  </Text>
                </View>
                <Text
                  style={[styles.tierPriceBottomVal, { color: colors.primary }]}
                >
                  {results.totalWatts > 0
                    ? `৳ ${results.estimatedCostBDT.toLocaleString()}`
                    : "৳ 0"}
                </Text>
              </View>
            </View>
          )}

          {packageTier === "standard" && (
            <View
              style={[
                styles.selectedTierCard,
                {
                  backgroundColor: isDark
                    ? "rgba(252, 185, 116, 0.12)"
                    : "#FFF7ED",
                  borderColor: colors.primary,
                },
              ]}
            >
              <View style={styles.selectedTierHeader}>
                <View
                  style={[
                    styles.tierBadge,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.tierBadgeText,
                      {
                        color: isDark ? "#260B00" : "#FFFFFF",
                        fontWeight: "800",
                      },
                    ]}
                  >
                    RECOMMENDED · BEST VALUE
                  </Text>
                </View>
                <View
                  style={[
                    styles.activeTierPill,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={isDark ? "#260B00" : "#FFFFFF"}
                  />
                  <Text
                    style={[
                      styles.activeTierPillText,
                      { color: isDark ? "#260B00" : "#FFFFFF" },
                    ]}
                  >
                    Active Selection
                  </Text>
                </View>
              </View>

              <Text style={[styles.selectedTierTitle, { color: colors.text }]}>
                Standard Hybrid Package
              </Text>
              <Text
                style={[
                  styles.selectedTierDesc,
                  { color: colors.textSecondary },
                ]}
              >
                Engineered for maximum balance: high efficiency, deep cycle tall
                tubular battery longevity, and rapid solar charging.
              </Text>

              {/* Hardware items in this tier */}
              <View
                style={[
                  styles.tierHardwareSummaryBox,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.tierHardwareRow}>
                  <Ionicons
                    name="hardware-chip-outline"
                    size={15}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.tierHardwareText, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    Inverter:{" "}
                    {results.activeInverterProduct?.title ||
                      "Smart Hybrid Pure Sine Wave Inverter"}
                  </Text>
                </View>
                <View style={styles.tierHardwareRow}>
                  <Ionicons
                    name="battery-charging-outline"
                    size={15}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.tierHardwareText, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    Battery: {results.batteryCount}x{" "}
                    {results.activeBatteryProduct?.title ||
                      "Deep Cycle Tall Tubular (24m warranty)"}
                  </Text>
                </View>
                {isSolarHybrid && (
                  <View style={styles.tierHardwareRow}>
                    <Ionicons
                      name="sunny-outline"
                      size={15}
                      color={colors.primary}
                    />
                    <Text
                      style={[styles.tierHardwareText, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      Solar Array: {results.solarDetails?.panelCount}x{" "}
                      {results.activePanelProduct?.title ||
                        "580W Tier-1 Bifacial Solar Panels"}
                    </Text>
                  </View>
                )}
                <View style={styles.tierHardwareRow}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={15}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.tierHardwareText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Installation: Heavy-duty DC lines, dual-pole DC breakers &
                    custom rack
                  </Text>
                </View>
              </View>

              <View style={styles.tierPriceBottomRow}>
                <View>
                  <Text
                    style={[
                      styles.tierPriceBottomLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Complete Package Cost
                  </Text>
                  <Text
                    style={[
                      styles.tierPriceBottomSub,
                      { color: colors.textMuted },
                    ]}
                  >
                    Real equipment pricing
                  </Text>
                </View>
                <Text
                  style={[styles.tierPriceBottomVal, { color: colors.primary }]}
                >
                  {results.totalWatts > 0
                    ? `৳ ${results.estimatedCostBDT.toLocaleString()}`
                    : "৳ 0"}
                </Text>
              </View>
            </View>
          )}

          {packageTier === "premium" && (
            <View
              style={[
                styles.selectedTierCard,
                {
                  backgroundColor: isDark
                    ? "rgba(252, 185, 116, 0.1)"
                    : "#FFFBF5",
                  borderColor: colors.primary,
                },
              ]}
            >
              <View style={styles.selectedTierHeader}>
                <View
                  style={[
                    styles.tierBadge,
                    { backgroundColor: isDark ? "#1E293B" : "#0F172A" },
                  ]}
                >
                  <Text
                    style={[
                      styles.tierBadgeText,
                      { color: "#FFFFFF", fontWeight: "800" },
                    ]}
                  >
                    COMMERCIAL GRADE
                  </Text>
                </View>
                <View
                  style={[
                    styles.activeTierPill,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={isDark ? "#260B00" : "#FFFFFF"}
                  />
                  <Text
                    style={[
                      styles.activeTierPillText,
                      { color: isDark ? "#260B00" : "#FFFFFF" },
                    ]}
                  >
                    Active Selection
                  </Text>
                </View>
              </View>

              <Text style={[styles.selectedTierTitle, { color: colors.text }]}>
                Premium Pro Grade Package
              </Text>
              <Text
                style={[
                  styles.selectedTierDesc,
                  { color: colors.textSecondary },
                ]}
              >
                Industrial grade MPPT charging, highest cycle life ultra tall
                tubular / carbon batteries, and maximum solar harvesting.
              </Text>

              {/* Hardware items in this tier */}
              <View
                style={[
                  styles.tierHardwareSummaryBox,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.tierHardwareRow}>
                  <Ionicons
                    name="hardware-chip-outline"
                    size={15}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.tierHardwareText, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    Inverter:{" "}
                    {results.activeInverterProduct?.title ||
                      "High-Speed MPPT Solar Hybrid Inverter"}
                  </Text>
                </View>
                <View style={styles.tierHardwareRow}>
                  <Ionicons
                    name="battery-charging-outline"
                    size={15}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.tierHardwareText, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    Battery: {results.batteryCount}x{" "}
                    {results.activeBatteryProduct?.title ||
                      "Ultra Long-Life Heavy Duty (36m warranty)"}
                  </Text>
                </View>
                {isSolarHybrid && (
                  <View style={styles.tierHardwareRow}>
                    <Ionicons
                      name="sunny-outline"
                      size={15}
                      color={colors.primary}
                    />
                    <Text
                      style={[styles.tierHardwareText, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      Solar Array: {results.solarDetails?.panelCount}x{" "}
                      {results.activePanelProduct?.title ||
                        "Dual-Glass N-Type 580W Panels"}
                    </Text>
                  </View>
                )}
                <View style={styles.tierHardwareRow}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={15}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.tierHardwareText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Installation: Commercial grade switchgear, heavy DC runs &
                    galvanized frame
                  </Text>
                </View>
              </View>

              <View style={styles.tierPriceBottomRow}>
                <View>
                  <Text
                    style={[
                      styles.tierPriceBottomLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Complete Package Cost
                  </Text>
                  <Text
                    style={[
                      styles.tierPriceBottomSub,
                      { color: colors.textMuted },
                    ]}
                  >
                    Real equipment pricing
                  </Text>
                </View>
                <Text
                  style={[styles.tierPriceBottomVal, { color: colors.primary }]}
                >
                  {results.totalWatts > 0
                    ? `৳ ${results.estimatedCostBDT.toLocaleString()}`
                    : "৳ 0"}
                </Text>
              </View>
            </View>
          )}

          {/* Solar Capacity Range Selector (When Solar Hybrid IPS is selected) */}
          {isSolarHybrid && (
            <View
              style={[
                styles.solarRangeBox,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.solarRangeHeader}>
                <Ionicons name="sunny" size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.solarRangeTitle, { color: colors.text }]}
                  >
                    Solar Capacity Range
                  </Text>
                  <Text
                    style={[
                      styles.solarRangeSub,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Select solar capacity matching your daily generation needs
                  </Text>
                </View>
              </View>

              <View style={styles.solarRangePillsRow}>
                {[
                  {
                    id: "essential",
                    label: "Essential",
                    panels: results.solarOptionCounts?.essential || 1,
                    cost: results.solarOptionPrices?.essential || 0,
                    sub: "Daytime Basics",
                  },
                  {
                    id: "balanced",
                    label: "Balanced",
                    panels: results.solarOptionCounts?.balanced || 2,
                    cost: results.solarOptionPrices?.balanced || 0,
                    sub: "Recommended",
                  },
                  {
                    id: "max",
                    label: "Max Solar",
                    panels: results.solarOptionCounts?.max || 4,
                    cost: results.solarOptionPrices?.max || 0,
                    sub: "+50% Solar",
                  },
                ].map((opt) => {
                  const isSel = solarRange === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.solarRangePill,
                        {
                          backgroundColor: isSel
                            ? colors.primary
                            : colors.surface,
                          borderColor: isSel ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        setSolarRange(opt.id as any);
                        setConfiguredPanels(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.solarRangePillLabel,
                          {
                            color: isSel
                              ? isDark
                                ? "#260B00"
                                : "#FFFFFF"
                              : colors.text,
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text
                        style={[
                          styles.solarRangePillPanels,
                          {
                            color: isSel
                              ? isDark
                                ? "#260B00"
                                : "#FFFFFF"
                              : colors.primary,
                          },
                        ]}
                      >
                        {opt.panels}x Panels
                      </Text>
                      {isSel ? (
                        <Text
                          style={[
                            styles.solarRangePillPrice,
                            {
                              color: isDark
                                ? "rgba(38,11,0,0.85)"
                                : "rgba(255,255,255,0.95)",
                            },
                          ]}
                        >
                          {results.totalWatts > 0 && opt.cost > 0
                            ? `৳ ${opt.cost.toLocaleString()}`
                            : "৳ 0"}
                        </Text>
                      ) : (
                        <Text
                          style={[
                            styles.solarRangePillSub,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {opt.sub}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Solar Active Summary Row */}
              {results.totalWatts > 0 && results.solarDetails && (
                <View
                  style={[
                    styles.solarActiveSummaryRow,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "#F8FAFC",
                    },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={15}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.solarActiveSummaryText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Included:{" "}
                    <Text style={{ fontWeight: "700", color: colors.text }}>
                      {results.solarDetails.panelCount}x{" "}
                      {results.solarDetails.panelWattage}W Panels
                    </Text>{" "}
                    (~{results.solarDetails.dailyUnitsKwh} units/day) · Panel
                    Total:{" "}
                    <Text style={{ fontWeight: "700", color: colors.primary }}>
                      {results.activePanelProduct?.price &&
                      results.activePanelProduct.price > 0
                        ? `৳ ${(results.activePanelProduct.price * results.solarDetails.panelCount).toLocaleString()}`
                        : results.activePanelProduct
                          ? "Call for Price"
                          : `৳ ${(21500 * results.solarDetails.panelCount).toLocaleString()}`}
                    </Text>
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Step 4: Engineering Specification Output with Power Match & Real Hardware */}
        <View
          style={[
            styles.resultsCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View
            style={[styles.resultsHeader, { borderBottomColor: colors.border }]}
          >
            <View style={{ flex: 1, paddingRight: SPACING.xs }}>
              <Text style={[styles.engineeredBadge, { color: colors.primary }]}>
                RECOMMENDED HARDWARE
              </Text>
              <Text style={[styles.systemVaTitle, { color: colors.text }]}>
                {results.totalWatts > 0
                  ? `${results.inverterProvidedVa || results.recommendedVa} VA System`
                  : "0 VA System"}
              </Text>
            </View>
            <View
              style={[
                styles.voltageBadge,
                { backgroundColor: isDark ? "#334155" : "#0F172A" },
              ]}
            >
              <Text style={styles.voltageBadgeText}>
                {results.batteryVoltage}V DC Architecture
              </Text>
            </View>
          </View>

          {/* Power & Sizing Match Comparison Dashboard */}
          {results.totalWatts > 0 && (
            <View
              style={[
                styles.powerMatchCard,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.powerMatchHeader}>
                <Ionicons
                  name="speedometer-outline"
                  size={18}
                  color={colors.primary}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.powerMatchTitle, { color: colors.text }]}
                  >
                    Power & Sizing Match
                  </Text>
                  <Text
                    style={[
                      styles.powerMatchSub,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Continuous requirement vs actual equipment capacity
                  </Text>
                </View>
                <View
                  style={[
                    styles.matchBadge,
                    {
                      backgroundColor:
                        (results.headroomPercent ?? 0) >= 15
                          ? isDark
                            ? "rgba(34, 197, 94, 0.2)"
                            : "#DCFCE7"
                          : isDark
                            ? "rgba(234, 179, 8, 0.2)"
                            : "#FEF9C3",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.matchBadgeText,
                      {
                        color:
                          (results.headroomPercent ?? 0) >= 15
                            ? COLORS.success
                            : COLORS.warning,
                      },
                    ]}
                  >
                    {(results.headroomPercent ?? 0) >= 0
                      ? `+${results.headroomPercent}% Headroom`
                      : `${results.headroomPercent}% Tight`}
                  </Text>
                </View>
              </View>

              <View style={styles.comparisonGrid}>
                {/* Continuous Load vs Inverter */}
                <View
                  style={[styles.comparisonRow, { borderColor: colors.border }]}
                >
                  <View style={styles.comparisonCol}>
                    <Text
                      style={[
                        styles.compColLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      REQUIRED LOAD
                    </Text>
                    <Text style={[styles.compColVal, { color: colors.text }]}>
                      {results.totalWatts} W
                    </Text>
                    <Text
                      style={[styles.compColSub, { color: colors.textMuted }]}
                    >
                      Connected continuous
                    </Text>
                  </View>
                  <View style={styles.comparisonDivider}>
                    <Ionicons
                      name="arrow-forward"
                      size={14}
                      color={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.comparisonCol}>
                    <Text
                      style={[styles.compColLabel, { color: colors.primary }]}
                    >
                      INVERTER OUTPUT
                    </Text>
                    <Text
                      style={[styles.compColVal, { color: colors.primary }]}
                    >
                      {results.inverterProvidedWatts} W (
                      {results.inverterProvidedVa} VA)
                    </Text>
                    <Text
                      style={[styles.compColSub, { color: COLORS.success }]}
                    >
                      {(results.headroomPercent ?? 0) >= 0
                        ? `+${results.headroomPercent}% surge reserve`
                        : "Tight capacity"}
                    </Text>
                  </View>
                </View>

                {/* Backup Duration vs Battery Storage */}
                <View
                  style={[styles.comparisonRow, { borderColor: colors.border }]}
                >
                  <View style={styles.comparisonCol}>
                    <Text
                      style={[
                        styles.compColLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      BACKUP NEEDED
                    </Text>
                    <Text style={[styles.compColVal, { color: colors.text }]}>
                      {backupHours} Hours
                    </Text>
                    <Text
                      style={[styles.compColSub, { color: colors.textMuted }]}
                    >
                      {results.requiredWattHours} Wh energy
                    </Text>
                  </View>
                  <View style={styles.comparisonDivider}>
                    <Ionicons
                      name="arrow-forward"
                      size={14}
                      color={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.comparisonCol}>
                    <Text
                      style={[styles.compColLabel, { color: colors.primary }]}
                    >
                      STORAGE PROVIDED
                    </Text>
                    <Text
                      style={[styles.compColVal, { color: colors.primary }]}
                    >
                      ~{results.actualBackupHours} Hours
                    </Text>
                    <Text
                      style={[styles.compColSub, { color: COLORS.success }]}
                    >
                      {results.batteryCount}x {results.batteryProvidedAh}Ah (
                      {results.batteryVoltage}V Bank)
                    </Text>
                  </View>
                </View>

                {/* Solar Generation (if hybrid) */}
                {isSolarHybrid && results.solarDetails && (
                  <View
                    style={[
                      styles.comparisonRow,
                      { borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.comparisonCol}>
                      <Text
                        style={[
                          styles.compColLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        SOLAR GENERATION
                      </Text>
                      <Text style={[styles.compColVal, { color: colors.text }]}>
                        {results.solarDetails.panelCount}x{" "}
                        {results.solarDetails.panelWattage}W
                      </Text>
                      <Text
                        style={[styles.compColSub, { color: colors.textMuted }]}
                      >
                        {results.recommendedSolarKw} kWp PV Array
                      </Text>
                    </View>
                    <View style={styles.comparisonDivider}>
                      <Ionicons
                        name="arrow-forward"
                        size={14}
                        color={colors.textSecondary}
                      />
                    </View>
                    <View style={styles.comparisonCol}>
                      <Text
                        style={[styles.compColLabel, { color: colors.primary }]}
                      >
                        DAILY YIELD
                      </Text>
                      <Text
                        style={[styles.compColVal, { color: colors.primary }]}
                      >
                        ~{results.solarDetails.dailyUnitsKwh} kWh / day
                      </Text>
                      <Text
                        style={[styles.compColSub, { color: COLORS.success }]}
                      >
                        ~{results.solarDetails.roofSpaceSqFt} sq.ft roof
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Genuine Store Products Selection */}
          <View style={styles.productSlotsContainer}>
            {/* Custom Quantities Notice Banner */}
            {results.isCustomizedQuantities ? (
              <View
                style={[
                  styles.customNoticeRow,
                  {
                    backgroundColor: isDark
                      ? "rgba(252, 185, 116, 0.12)"
                      : "#FFFBEB",
                    borderColor: isDark
                      ? "rgba(252, 185, 116, 0.3)"
                      : "#FDE68A",
                  },
                ]}
              >
                <View style={styles.customNoticeLeft}>
                  <Ionicons
                    name="options-outline"
                    size={15}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.customNoticeText, { color: colors.text }]}
                  >
                    Custom quantities or combinations applied
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.resetCustomBtn,
                    { backgroundColor: colors.surface },
                  ]}
                  onPress={() => {
                    setConfiguredInverters(null);
                    setConfiguredBatteries(null);
                    setConfiguredPanels(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={12}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.resetCustomBtnText,
                      { color: colors.primary },
                    ]}
                  >
                    Reset Recommended
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {isLoadingCatalog &&
            (isSolarHybrid
              ? catalogInverters.length === 0
              : catalogIps.length === 0) ? (
              <View style={styles.catalogLoadingBanner}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text
                  style={[
                    styles.catalogLoadingText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Loading genuine products from store...
                </Text>
              </View>
            ) : null}

            {/* Inverter / IPS Slot */}
            <View
              style={[
                styles.productSlotCard,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Slot Header */}
              <View style={styles.productSlotHeader}>
                <View style={styles.slotBadgeRow}>
                  <View
                    style={[
                      styles.slotBadge,
                      {
                        backgroundColor: isDark
                          ? "rgba(252, 185, 116, 0.15)"
                          : "#FFF7ED",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        isSolarHybrid
                          ? "hardware-chip-outline"
                          : "flash-outline"
                      }
                      size={13}
                      color={colors.primary}
                    />
                    <Text
                      style={[styles.slotBadgeText, { color: colors.primary }]}
                    >
                      {isSolarHybrid ? "SOLAR INVERTER" : "IPS / SOLAR IPS"}
                    </Text>
                  </View>
                  {(results.inverterItems?.length ?? 1) > 1 && (
                    <View
                      style={[
                        styles.combinedBadge,
                        {
                          backgroundColor: isDark
                            ? "rgba(252, 185, 116, 0.25)"
                            : "#FEF3C7",
                        },
                      ]}
                    >
                      <Ionicons
                        name="git-merge-outline"
                        size={11}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.combinedBadgeText,
                          { color: colors.primary },
                        ]}
                      >
                        {results.inverterItems?.length} MODELS COMBINED
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.headerActionBtns}>
                  {/* <TouchableOpacity
                    style={[styles.combineToggleBtn, { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(252, 185, 116, 0.12)' : '#FFF7ED' }]}
                    onPress={handleAddInverter}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={13} color={colors.primary} />
                    <Text style={[styles.combineToggleBtnText, { color: colors.primary }]}>+ Add Model</Text>
                  </TouchableOpacity> */}
                  {(results.inverterItems?.length ?? 1) === 1 && (
                    <TouchableOpacity
                      style={[
                        styles.changeModelBtn,
                        { borderColor: colors.primary },
                      ]}
                      onPress={() => openModelSelector("inverter", 0)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="swap-horizontal"
                        size={13}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.changeModelBtnText,
                          { color: colors.primary },
                        ]}
                      >
                        Change
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Render all inverter models */}
              {(results.inverterItems || []).map((invItem, idx) => {
                const isMulti = (results.inverterItems?.length ?? 1) > 1;
                return (
                  <View key={`inv-slot-${invItem.product.id}-${idx}`}>
                    {idx > 0 && (
                      <View style={styles.combinationConnectorRow}>
                        <View
                          style={[
                            styles.connectorLine,
                            { backgroundColor: colors.border },
                          ]}
                        />
                        <View
                          style={[
                            styles.connectorBadge,
                            {
                              backgroundColor: isDark
                                ? "rgba(252, 185, 116, 0.2)"
                                : "#FEF3C7",
                              borderColor: colors.primary,
                            },
                          ]}
                        >
                          <Ionicons
                            name="add"
                            size={12}
                            color={colors.primary}
                          />
                          <Text
                            style={[
                              styles.connectorText,
                              { color: colors.primary },
                            ]}
                          >
                            COMBINED WITH
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.connectorLine,
                            { backgroundColor: colors.border },
                          ]}
                        />
                      </View>
                    )}

                    <View
                      style={[
                        isMulti && styles.subModelCard,
                        isMulti && {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      {isMulti && (
                        <View style={styles.subModelHeader}>
                          <View style={styles.modelTagBadge}>
                            <Text
                              style={[
                                styles.modelTagText,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {`MODEL ${idx + 1}${idx === 0 ? " (PRIMARY)" : " (COMBINED)"}`}
                            </Text>
                          </View>
                          <View style={styles.subModelHeaderRight}>
                            <TouchableOpacity
                              style={[
                                styles.inlineChangeBtn,
                                { borderColor: colors.border },
                              ]}
                              onPress={() => openModelSelector("inverter", idx)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name="swap-horizontal"
                                size={11}
                                color={colors.primary}
                              />
                              <Text
                                style={[
                                  styles.inlineChangeBtnText,
                                  { color: colors.primary },
                                ]}
                              >
                                Change
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.inlineRemoveBtn,
                                {
                                  backgroundColor: isDark
                                    ? "rgba(239, 68, 68, 0.15)"
                                    : "#FEE2E2",
                                },
                              ]}
                              onPress={() => handleRemoveInverter(idx)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={12}
                                color={COLORS.danger}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      <View style={styles.productSlotBody}>
                        {invItem.product.image ? (
                          <Image
                            source={{ uri: invItem.product.image }}
                            style={styles.productSlotThumb}
                            resizeMode="contain"
                          />
                        ) : (
                          <View
                            style={[
                              styles.productSlotThumbPlaceholder,
                              { backgroundColor: colors.border },
                            ]}
                          >
                            <Ionicons
                              name="hardware-chip-outline"
                              size={24}
                              color={colors.textSecondary}
                            />
                          </View>
                        )}
                        <View style={styles.productSlotInfo}>
                          <Text
                            style={[
                              styles.productSlotTitle,
                              { color: colors.text },
                            ]}
                            numberOfLines={2}
                          >
                            {invItem.product.title}
                          </Text>
                          <Text
                            style={[
                              styles.productSlotMeta,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {invItem.product.brand
                              ? `${invItem.product.brand} · `
                              : ""}
                            {invItem.va ||
                              extractInverterVa(invItem.product) ||
                              results.recommendedVa}
                            VA · {results.batteryVoltage}V DC
                          </Text>
                          <View style={styles.productSlotPriceRow}>
                            {invItem.product.price > 0 ? (
                              <View>
                                <Text
                                  style={[
                                    styles.productSlotPrice,
                                    { color: colors.primary },
                                  ]}
                                >
                                  ৳{" "}
                                  {(
                                    invItem.product.price * invItem.quantity
                                  ).toLocaleString()}
                                </Text>
                                {invItem.quantity > 1 ? (
                                  <Text
                                    style={[
                                      styles.unitPriceSub,
                                      { color: colors.textSecondary },
                                    ]}
                                  >
                                    ৳ {invItem.product.price.toLocaleString()}{" "}
                                    each
                                  </Text>
                                ) : null}
                              </View>
                            ) : (
                              <Text
                                style={[
                                  styles.callForPriceSlotText,
                                  { color: colors.primary },
                                ]}
                              >
                                Call for Price
                              </Text>
                            )}

                            {/* Quantity Stepper */}
                            <View style={styles.slotQtyStepperWrap}>
                              <Text
                                style={[
                                  styles.stepperLabelText,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Qty
                              </Text>
                              <View
                                style={[
                                  styles.stepperContainer,
                                  {
                                    borderColor: colors.border,
                                    backgroundColor: colors.surface,
                                  },
                                ]}
                              >
                                <TouchableOpacity
                                  style={[
                                    styles.stepperBtn,
                                    invItem.quantity <= 1 &&
                                      styles.stepperBtnDisabled,
                                  ]}
                                  disabled={invItem.quantity <= 1}
                                  onPress={() =>
                                    handleUpdateInverterQty(
                                      idx,
                                      invItem.quantity - 1,
                                    )
                                  }
                                  activeOpacity={0.6}
                                  hitSlop={{
                                    top: 8,
                                    bottom: 8,
                                    left: 8,
                                    right: 8,
                                  }}
                                >
                                  <Ionicons
                                    name="remove"
                                    size={13}
                                    color={
                                      invItem.quantity <= 1
                                        ? colors.textMuted
                                        : colors.text
                                    }
                                  />
                                </TouchableOpacity>
                                <Text
                                  style={[
                                    styles.stepperValueText,
                                    { color: colors.text },
                                  ]}
                                >
                                  {invItem.quantity}
                                </Text>
                                <TouchableOpacity
                                  style={[
                                    styles.stepperBtn,
                                    invItem.quantity >= 10 &&
                                      styles.stepperBtnDisabled,
                                  ]}
                                  disabled={invItem.quantity >= 10}
                                  onPress={() =>
                                    handleUpdateInverterQty(
                                      idx,
                                      invItem.quantity + 1,
                                    )
                                  }
                                  activeOpacity={0.6}
                                  hitSlop={{
                                    top: 8,
                                    bottom: 8,
                                    left: 8,
                                    right: 8,
                                  }}
                                >
                                  <Ionicons
                                    name="add"
                                    size={13}
                                    color={
                                      invItem.quantity >= 10
                                        ? colors.textMuted
                                        : colors.text
                                    }
                                  />
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* Add Another Model Button */}
              <TouchableOpacity
                style={[
                  styles.addModelSlotBtn,
                  {
                    borderColor: colors.primary,
                    backgroundColor: isDark
                      ? "rgba(252, 185, 116, 0.08)"
                      : "#FFF7ED",
                  },
                ]}
                onPress={handleAddInverter}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={15}
                  color={colors.primary}
                />
                <Text
                  style={[
                    styles.addModelSlotBtnText,
                    { color: colors.primary },
                  ]}
                >
                  + Add Another Inverter Model
                </Text>
              </TouchableOpacity>

              {/* Dynamic Capacity Note */}
              <View
                style={[
                  styles.slotDynamicInfo,
                  {
                    backgroundColor: isDark
                      ? "rgba(252, 185, 116, 0.08)"
                      : "#FFFBEB",
                  },
                ]}
              >
                <Ionicons
                  name="flash-outline"
                  size={12}
                  color={colors.primary}
                />
                <Text
                  style={[
                    styles.slotDynamicInfoText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Combined capacity:{" "}
                  <Text style={{ fontWeight: "700", color: colors.text }}>
                    {results.totalInverterWatts ||
                      results.inverterProvidedWatts ||
                      0}
                    W
                  </Text>{" "}
                  ({results.totalInverterVa || results.inverterProvidedVa || 0}
                  VA) ·{" "}
                  <Text
                    style={{
                      fontWeight: "700",
                      color:
                        (results.headroomPercent ?? 0) >= 0
                          ? COLORS.success
                          : COLORS.danger,
                    }}
                  >
                    +{results.headroomPercent ?? 0}% headroom
                  </Text>
                </Text>
              </View>
            </View>

            {/* Battery Slot */}
            <View
              style={[
                styles.productSlotCard,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Slot Header */}
              <View style={styles.productSlotHeader}>
                <View style={styles.slotBadgeRow}>
                  <View
                    style={[
                      styles.slotBadge,
                      {
                        backgroundColor: isDark
                          ? "rgba(34, 197, 94, 0.15)"
                          : "#DCFCE7",
                      },
                    ]}
                  >
                    <Ionicons
                      name="battery-charging-outline"
                      size={13}
                      color={COLORS.success}
                    />
                    <Text
                      style={[styles.slotBadgeText, { color: COLORS.success }]}
                    >
                      BATTERY BANK
                    </Text>
                  </View>
                  {(results.batteryItems?.length ?? 1) > 1 && (
                    <View
                      style={[
                        styles.combinedBadge,
                        {
                          backgroundColor: isDark
                            ? "rgba(34, 197, 94, 0.25)"
                            : "#DCFCE7",
                        },
                      ]}
                    >
                      <Ionicons
                        name="git-merge-outline"
                        size={11}
                        color={COLORS.success}
                      />
                      <Text
                        style={[
                          styles.combinedBadgeText,
                          { color: COLORS.success },
                        ]}
                      >
                        {results.batteryItems?.length} MODELS COMBINED
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.headerActionBtns}>
                  {/* <TouchableOpacity
                    style={[
                      styles.combineToggleBtn,
                      {
                        borderColor: COLORS.success,
                        backgroundColor: isDark
                          ? "rgba(34, 197, 94, 0.12)"
                          : "#F0FDF4",
                      },
                    ]}
                    onPress={handleAddBattery}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={13} color={COLORS.success} />
                    <Text
                      style={[
                        styles.combineToggleBtnText,
                        { color: COLORS.success },
                      ]}
                    >
                      + Add Model
                    </Text>
                  </TouchableOpacity> */}
                  {(results.batteryItems?.length ?? 1) === 1 && (
                    <TouchableOpacity
                      style={[
                        styles.changeModelBtn,
                        { borderColor: colors.primary },
                      ]}
                      onPress={() => openModelSelector("battery", 0)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="swap-horizontal"
                        size={13}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.changeModelBtnText,
                          { color: colors.primary },
                        ]}
                      >
                        Change
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Render all battery models */}
              {(results.batteryItems || []).map((batItem, idx) => {
                const isMulti = (results.batteryItems?.length ?? 1) > 1;
                const step = results.seriesBatteryCount || 1;
                return (
                  <View key={`bat-slot-${batItem.product.id}-${idx}`}>
                    {idx > 0 && (
                      <View style={styles.combinationConnectorRow}>
                        <View
                          style={[
                            styles.connectorLine,
                            { backgroundColor: colors.border },
                          ]}
                        />
                        <View
                          style={[
                            styles.connectorBadge,
                            {
                              backgroundColor: isDark
                                ? "rgba(34, 197, 94, 0.2)"
                                : "#DCFCE7",
                              borderColor: COLORS.success,
                            },
                          ]}
                        >
                          <Ionicons
                            name="add"
                            size={12}
                            color={COLORS.success}
                          />
                          <Text
                            style={[
                              styles.connectorText,
                              { color: COLORS.success },
                            ]}
                          >
                            COMBINED WITH
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.connectorLine,
                            { backgroundColor: colors.border },
                          ]}
                        />
                      </View>
                    )}

                    <View
                      style={[
                        isMulti && styles.subModelCard,
                        isMulti && {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      {isMulti && (
                        <View style={styles.subModelHeader}>
                          <View style={styles.modelTagBadge}>
                            <Text
                              style={[
                                styles.modelTagText,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {`BATTERY ${idx + 1}${idx === 0 ? " (PRIMARY)" : " (COMBINED)"}`}
                            </Text>
                          </View>
                          <View style={styles.subModelHeaderRight}>
                            <TouchableOpacity
                              style={[
                                styles.inlineChangeBtn,
                                { borderColor: colors.border },
                              ]}
                              onPress={() => openModelSelector("battery", idx)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name="swap-horizontal"
                                size={11}
                                color={colors.primary}
                              />
                              <Text
                                style={[
                                  styles.inlineChangeBtnText,
                                  { color: colors.primary },
                                ]}
                              >
                                Change
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.inlineRemoveBtn,
                                {
                                  backgroundColor: isDark
                                    ? "rgba(239, 68, 68, 0.15)"
                                    : "#FEE2E2",
                                },
                              ]}
                              onPress={() => handleRemoveBattery(idx)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={12}
                                color={COLORS.danger}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      <View style={styles.productSlotBody}>
                        {batItem.product.image ? (
                          <Image
                            source={{ uri: batItem.product.image }}
                            style={styles.productSlotThumb}
                            resizeMode="contain"
                          />
                        ) : (
                          <View
                            style={[
                              styles.productSlotThumbPlaceholder,
                              { backgroundColor: colors.border },
                            ]}
                          >
                            <Ionicons
                              name="battery-charging-outline"
                              size={24}
                              color={COLORS.success}
                            />
                          </View>
                        )}
                        <View style={styles.productSlotInfo}>
                          <Text
                            style={[
                              styles.productSlotTitle,
                              { color: colors.text },
                            ]}
                            numberOfLines={2}
                          >
                            {batItem.product.title}
                          </Text>
                          <Text
                            style={[
                              styles.productSlotMeta,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {batItem.product.brand
                              ? `${batItem.product.brand} · `
                              : ""}
                            {batItem.ah ||
                              extractBatteryAh(batItem.product) ||
                              results.recommendedBatteryAh}
                            Ah Deep Cycle · 12V
                          </Text>
                          <View style={styles.productSlotPriceRow}>
                            {batItem.product.price > 0 ? (
                              <View>
                                <Text
                                  style={[
                                    styles.productSlotPrice,
                                    { color: colors.primary },
                                  ]}
                                >
                                  ৳{" "}
                                  {(
                                    batItem.product.price * batItem.quantity
                                  ).toLocaleString()}
                                </Text>
                                {batItem.quantity > 1 ? (
                                  <Text
                                    style={[
                                      styles.unitPriceSub,
                                      { color: colors.textSecondary },
                                    ]}
                                  >
                                    ৳ {batItem.product.price.toLocaleString()}{" "}
                                    each
                                  </Text>
                                ) : null}
                              </View>
                            ) : (
                              <Text
                                style={[
                                  styles.callForPriceSlotText,
                                  { color: colors.primary },
                                ]}
                              >
                                Call for Price
                              </Text>
                            )}

                            {/* Quantity Stepper (Steps by seriesBatteryCount) */}
                            <View style={styles.slotQtyStepperWrap}>
                              <Text
                                style={[
                                  styles.stepperLabelText,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Qty
                              </Text>
                              <View
                                style={[
                                  styles.stepperContainer,
                                  {
                                    borderColor: colors.border,
                                    backgroundColor: colors.surface,
                                  },
                                ]}
                              >
                                <TouchableOpacity
                                  style={[
                                    styles.stepperBtn,
                                    batItem.quantity <= step &&
                                      styles.stepperBtnDisabled,
                                  ]}
                                  disabled={batItem.quantity <= step}
                                  onPress={() =>
                                    handleUpdateBatteryQty(
                                      idx,
                                      batItem.quantity - step,
                                    )
                                  }
                                  activeOpacity={0.6}
                                  hitSlop={{
                                    top: 8,
                                    bottom: 8,
                                    left: 8,
                                    right: 8,
                                  }}
                                >
                                  <Ionicons
                                    name="remove"
                                    size={13}
                                    color={
                                      batItem.quantity <= step
                                        ? colors.textMuted
                                        : colors.text
                                    }
                                  />
                                </TouchableOpacity>
                                <Text
                                  style={[
                                    styles.stepperValueText,
                                    { color: colors.text },
                                  ]}
                                >
                                  {batItem.quantity}
                                </Text>
                                <TouchableOpacity
                                  style={[
                                    styles.stepperBtn,
                                    batItem.quantity >= step * 8 &&
                                      styles.stepperBtnDisabled,
                                  ]}
                                  disabled={batItem.quantity >= step * 8}
                                  onPress={() =>
                                    handleUpdateBatteryQty(
                                      idx,
                                      batItem.quantity + step,
                                    )
                                  }
                                  activeOpacity={0.6}
                                  hitSlop={{
                                    top: 8,
                                    bottom: 8,
                                    left: 8,
                                    right: 8,
                                  }}
                                >
                                  <Ionicons
                                    name="add"
                                    size={13}
                                    color={
                                      batItem.quantity >= step * 8
                                        ? colors.textMuted
                                        : colors.text
                                    }
                                  />
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* Add Another Model Button */}
              <TouchableOpacity
                style={[
                  styles.addModelSlotBtn,
                  {
                    borderColor: COLORS.success,
                    backgroundColor: isDark
                      ? "rgba(34, 197, 94, 0.08)"
                      : "#F0FDF4",
                  },
                ]}
                onPress={handleAddBattery}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={15}
                  color={COLORS.success}
                />
                <Text
                  style={[
                    styles.addModelSlotBtnText,
                    { color: COLORS.success },
                  ]}
                >
                  + Add Another Battery Model
                </Text>
              </TouchableOpacity>

              {/* Dynamic Electrical Feedback */}
              <View
                style={[
                  styles.slotDynamicInfo,
                  {
                    backgroundColor: isDark
                      ? "rgba(34, 197, 94, 0.08)"
                      : "#F0FDF4",
                  },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={12}
                  color={COLORS.success}
                />
                <Text
                  style={[
                    styles.slotDynamicInfoText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Provides{" "}
                  <Text style={{ fontWeight: "700", color: colors.text }}>
                    ~{results.actualBackupHours} hrs
                  </Text>{" "}
                  backup for {results.totalWatts}W load (
                  {results.effectiveParallelBanks || 1}x{" "}
                  {results.batteryVoltage}V bank ·{" "}
                  {results.effectiveBatteryCount || results.batteryCount}{" "}
                  batteries total)
                </Text>
              </View>
            </View>

            {/* Solar Panels Slot (When Solar Hybrid is active) */}
            {isSolarHybrid && (
              <View
                style={[
                  styles.productSlotCard,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: colors.border,
                  },
                ]}
              >
                {/* Slot Header */}
                <View style={styles.productSlotHeader}>
                  <View style={styles.slotBadgeRow}>
                    <View
                      style={[
                        styles.slotBadge,
                        {
                          backgroundColor: isDark
                            ? "rgba(234, 179, 8, 0.15)"
                            : "#FEF9C3",
                        },
                      ]}
                    >
                      <Ionicons
                        name="sunny-outline"
                        size={13}
                        color={COLORS.warning}
                      />
                      <Text
                        style={[
                          styles.slotBadgeText,
                          { color: COLORS.warning },
                        ]}
                      >
                        SOLAR PV ARRAY
                      </Text>
                    </View>
                    {(results.panelItems?.length ?? 1) > 1 && (
                      <View
                        style={[
                          styles.combinedBadge,
                          {
                            backgroundColor: isDark
                              ? "rgba(234, 179, 8, 0.25)"
                              : "#FEF9C3",
                          },
                        ]}
                      >
                        <Ionicons
                          name="git-merge-outline"
                          size={11}
                          color={COLORS.warning}
                        />
                        <Text
                          style={[
                            styles.combinedBadgeText,
                            { color: COLORS.warning },
                          ]}
                        >
                          {results.panelItems?.length} MODELS COMBINED
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.headerActionBtns}>
                    {/* <TouchableOpacity
                      style={[
                        styles.combineToggleBtn,
                        {
                          borderColor: COLORS.warning,
                          backgroundColor: isDark
                            ? "rgba(234, 179, 8, 0.12)"
                            : "#FEFCE8",
                        },
                      ]}
                      onPress={handleAddPanel}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={13} color={COLORS.warning} />
                      <Text
                        style={[
                          styles.combineToggleBtnText,
                          { color: COLORS.warning },
                        ]}
                      >
                        + Add Model
                      </Text>
                    </TouchableOpacity> */}
                    {(results.panelItems?.length ?? 1) === 1 && (
                      <TouchableOpacity
                        style={[
                          styles.changeModelBtn,
                          { borderColor: colors.primary },
                        ]}
                        onPress={() => openModelSelector("solar", 0)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="swap-horizontal"
                          size={13}
                          color={colors.primary}
                        />
                        <Text
                          style={[
                            styles.changeModelBtnText,
                            { color: colors.primary },
                          ]}
                        >
                          Change
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Render all solar panel models */}
                {(results.panelItems || []).map((panelItem, idx) => {
                  const isMulti = (results.panelItems?.length ?? 1) > 1;
                  const step = results.minVoltageString || 1;
                  return (
                    <View key={`panel-slot-${panelItem.product.id}-${idx}`}>
                      {idx > 0 && (
                        <View style={styles.combinationConnectorRow}>
                          <View
                            style={[
                              styles.connectorLine,
                              { backgroundColor: colors.border },
                            ]}
                          />
                          <View
                            style={[
                              styles.connectorBadge,
                              {
                                backgroundColor: isDark
                                  ? "rgba(234, 179, 8, 0.2)"
                                  : "#FEF9C3",
                                borderColor: COLORS.warning,
                              },
                            ]}
                          >
                            <Ionicons
                              name="add"
                              size={12}
                              color={COLORS.warning}
                            />
                            <Text
                              style={[
                                styles.connectorText,
                                { color: COLORS.warning },
                              ]}
                            >
                              COMBINED WITH
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.connectorLine,
                              { backgroundColor: colors.border },
                            ]}
                          />
                        </View>
                      )}

                      <View
                        style={[
                          isMulti && styles.subModelCard,
                          isMulti && {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        {isMulti && (
                          <View style={styles.subModelHeader}>
                            <View style={styles.modelTagBadge}>
                              <Text
                                style={[
                                  styles.modelTagText,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                {`PANEL ${idx + 1}${idx === 0 ? " (PRIMARY)" : " (COMBINED)"}`}
                              </Text>
                            </View>
                            <View style={styles.subModelHeaderRight}>
                              <TouchableOpacity
                                style={[
                                  styles.inlineChangeBtn,
                                  { borderColor: colors.border },
                                ]}
                                onPress={() => openModelSelector("solar", idx)}
                                activeOpacity={0.7}
                              >
                                <Ionicons
                                  name="swap-horizontal"
                                  size={11}
                                  color={colors.primary}
                                />
                                <Text
                                  style={[
                                    styles.inlineChangeBtnText,
                                    { color: colors.primary },
                                  ]}
                                >
                                  Change
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.inlineRemoveBtn,
                                  {
                                    backgroundColor: isDark
                                      ? "rgba(239, 68, 68, 0.15)"
                                      : "#FEE2E2",
                                  },
                                ]}
                                onPress={() => handleRemovePanel(idx)}
                                activeOpacity={0.7}
                              >
                                <Ionicons
                                  name="trash-outline"
                                  size={12}
                                  color={COLORS.danger}
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}

                        <View style={styles.productSlotBody}>
                          {panelItem.product.image ? (
                            <Image
                              source={{ uri: panelItem.product.image }}
                              style={styles.productSlotThumb}
                              resizeMode="contain"
                            />
                          ) : (
                            <View
                              style={[
                                styles.productSlotThumbPlaceholder,
                                { backgroundColor: colors.border },
                              ]}
                            >
                              <Ionicons
                                name="sunny-outline"
                                size={24}
                                color={COLORS.warning}
                              />
                            </View>
                          )}
                          <View style={styles.productSlotInfo}>
                            <Text
                              style={[
                                styles.productSlotTitle,
                                { color: colors.text },
                              ]}
                              numberOfLines={2}
                            >
                              {panelItem.product.title}
                            </Text>
                            <Text
                              style={[
                                styles.productSlotMeta,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {panelItem.product.brand
                                ? `${panelItem.product.brand} · `
                                : ""}
                              {panelItem.totalWatts
                                ? Math.round(
                                    panelItem.totalWatts / panelItem.quantity,
                                  )
                                : extractSolarWatts(panelItem.product) || 580}
                              W Monocrystalline / Bifacial
                            </Text>
                            <View style={styles.productSlotPriceRow}>
                              {panelItem.product.price > 0 &&
                              panelItem.quantity > 0 ? (
                                <View>
                                  <Text
                                    style={[
                                      styles.productSlotPrice,
                                      { color: colors.primary },
                                    ]}
                                  >
                                    ৳{" "}
                                    {(
                                      panelItem.product.price *
                                      panelItem.quantity
                                    ).toLocaleString()}
                                  </Text>
                                  {panelItem.quantity > 1 ? (
                                    <Text
                                      style={[
                                        styles.unitPriceSub,
                                        { color: colors.textSecondary },
                                      ]}
                                    >
                                      ৳{" "}
                                      {panelItem.product.price.toLocaleString()}{" "}
                                      each
                                    </Text>
                                  ) : null}
                                </View>
                              ) : (
                                <Text
                                  style={[
                                    styles.callForPriceSlotText,
                                    { color: colors.primary },
                                  ]}
                                >
                                  Call for Price
                                </Text>
                              )}

                              {/* Quantity Stepper (Steps by minVoltageString) */}
                              <View style={styles.slotQtyStepperWrap}>
                                <Text
                                  style={[
                                    styles.stepperLabelText,
                                    { color: colors.textSecondary },
                                  ]}
                                >
                                  Qty
                                </Text>
                                <View
                                  style={[
                                    styles.stepperContainer,
                                    {
                                      borderColor: colors.border,
                                      backgroundColor: colors.surface,
                                    },
                                  ]}
                                >
                                  <TouchableOpacity
                                    style={[
                                      styles.stepperBtn,
                                      panelItem.quantity <= step &&
                                        styles.stepperBtnDisabled,
                                    ]}
                                    disabled={panelItem.quantity <= step}
                                    onPress={() =>
                                      handleUpdatePanelQty(
                                        idx,
                                        panelItem.quantity - step,
                                      )
                                    }
                                    activeOpacity={0.6}
                                    hitSlop={{
                                      top: 8,
                                      bottom: 8,
                                      left: 8,
                                      right: 8,
                                    }}
                                  >
                                    <Ionicons
                                      name="remove"
                                      size={13}
                                      color={
                                        panelItem.quantity <= step
                                          ? colors.textMuted
                                          : colors.text
                                      }
                                    />
                                  </TouchableOpacity>
                                  <Text
                                    style={[
                                      styles.stepperValueText,
                                      { color: colors.text },
                                    ]}
                                  >
                                    {panelItem.quantity}
                                  </Text>
                                  <TouchableOpacity
                                    style={[
                                      styles.stepperBtn,
                                      panelItem.quantity >= 64 &&
                                        styles.stepperBtnDisabled,
                                    ]}
                                    disabled={panelItem.quantity >= 64}
                                    onPress={() =>
                                      handleUpdatePanelQty(
                                        idx,
                                        panelItem.quantity + step,
                                      )
                                    }
                                    activeOpacity={0.6}
                                    hitSlop={{
                                      top: 8,
                                      bottom: 8,
                                      left: 8,
                                      right: 8,
                                    }}
                                  >
                                    <Ionicons
                                      name="add"
                                      size={13}
                                      color={
                                        panelItem.quantity >= 64
                                          ? colors.textMuted
                                          : colors.text
                                      }
                                    />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {/* Add Another Model Button */}
                <TouchableOpacity
                  style={[
                    styles.addModelSlotBtn,
                    {
                      borderColor: COLORS.warning,
                      backgroundColor: isDark
                        ? "rgba(234, 179, 8, 0.08)"
                        : "#FEFCE8",
                    },
                  ]}
                  onPress={handleAddPanel}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={15}
                    color={COLORS.warning}
                  />
                  <Text
                    style={[
                      styles.addModelSlotBtnText,
                      { color: COLORS.warning },
                    ]}
                  >
                    + Add Another Panel Model
                  </Text>
                </TouchableOpacity>

                {/* Dynamic Generation Feedback */}
                <View
                  style={[
                    styles.slotDynamicInfo,
                    {
                      backgroundColor: isDark
                        ? "rgba(234, 179, 8, 0.08)"
                        : "#FEFCE8",
                    },
                  ]}
                >
                  <Ionicons
                    name="sunny-outline"
                    size={12}
                    color={COLORS.warning}
                  />
                  <Text
                    style={[
                      styles.slotDynamicInfoText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Generates{" "}
                    <Text style={{ fontWeight: "700", color: colors.text }}>
                      ~
                      {results.effectiveDailyUnits ||
                        results.solarDetails?.dailyUnitsKwh}{" "}
                      units/day
                    </Text>{" "}
                    ({results.effectiveSolarKw || results.recommendedSolarKw}{" "}
                    kWp) · Roof:{" "}
                    <Text style={{ fontWeight: "700", color: colors.text }}>
                      ~
                      {results.effectiveRoofSpaceSqFt ||
                        results.solarDetails?.roofSpaceSqFt}{" "}
                      sq.ft
                    </Text>
                  </Text>
                </View>
              </View>
            )}

            {!isSolarHybrid && (
              <TouchableOpacity
                style={[
                  styles.solarUpsellBanner,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  setIsSolarHybrid(true);
                  setConfiguredInverters(null);
                  setConfiguredPanels(null);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="sunny" size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.solarUpsellTitle, { color: colors.text }]}
                  >
                    Add Solar Panels to this System
                  </Text>
                  <Text
                    style={[
                      styles.solarUpsellSub,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Switch to Solar Hybrid mode to get genuine Tier-1 panels and
                    generate free daytime power.
                  </Text>
                </View>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>
          <View
            style={[
              styles.costSummaryBox,
              { backgroundColor: colors.surfaceVariant },
            ]}
          >
            <View style={styles.costSummaryTextCol}>
              <View style={styles.priceHeaderRow}>
                <Text
                  style={[
                    styles.costSummaryLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {isCustomPackage
                    ? "CUSTOM PACKAGE ESTIMATE"
                    : `${packageTier.toUpperCase()} SYSTEM ESTIMATE`}
                </Text>
                <View
                  style={[styles.tierTag, { backgroundColor: colors.primary }]}
                >
                  <Text
                    style={[
                      styles.tierTagText,
                      { color: isDark ? "#260B00" : "#FFFFFF" },
                    ]}
                  >
                    {isCustomPackage
                      ? "CUSTOM"
                      : packageTier === "premium"
                        ? "PRO"
                        : packageTier === "economy"
                          ? "BUDGET"
                          : "STANDARD"}
                  </Text>
                </View>
              </View>

              {results.totalWatts > 0 ? (
                <Text
                  style={[
                    styles.packageRangeText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {isCustomPackage
                    ? "Custom Engineered Package"
                    : packageTier === "economy"
                      ? "Economy Grade System"
                      : packageTier === "premium"
                        ? "Premium Pro Grade System"
                        : "Standard Recommended System"}
                </Text>
              ) : null}

              <Text
                style={[styles.costSummarySub, { color: colors.textMuted }]}
              >
                Includes genuine inverter, battery
                {isSolarHybrid ? ", solar array" : ""}, DC cables, rack &
                installation
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
                {
                  backgroundColor:
                    results.totalWatts > 0
                      ? colors.primary
                      : colors.surfaceVariant,
                },
              ]}
              onPress={handleAddPackageToCart}
              activeOpacity={0.85}
              disabled={results.totalWatts === 0}
            >
              <Ionicons
                name="cart"
                size={18}
                color={
                  results.totalWatts > 0
                    ? isDark
                      ? "#260B00"
                      : "#FFFFFF"
                    : colors.textMuted
                }
              />
              <Text
                style={[
                  styles.addToCartPackageText,
                  {
                    color:
                      results.totalWatts > 0
                        ? isDark
                          ? "#260B00"
                          : "#FFFFFF"
                        : colors.textMuted,
                  },
                ]}
              >
                Add System to Cart
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.whatsAppPackageBtn}
              onPress={handleConsultWhatsApp}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
              <Text style={styles.whatsAppPackageText}>
                Request WhatsApp Quotation
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.printPdfScreenBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
              onPress={handlePrintQuotationPdf}
              activeOpacity={0.85}
              disabled={results.totalWatts === 0 || isGeneratingPdf}
            >
              {isGeneratingPdf ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons
                    name="print-outline"
                    size={18}
                    color={
                      results.totalWatts > 0 ? colors.primary : colors.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.printPdfScreenText,
                      {
                        color:
                          results.totalWatts > 0
                            ? colors.text
                            : colors.textMuted,
                      },
                    ]}
                  >
                    Print System Quotation
                  </Text>
                </>
              )}
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
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.modalKeyboardContainer}
            >
              <View
                style={[
                  styles.modalCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.modalHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      Edit Wattage
                    </Text>
                    <Text
                      style={[
                        styles.modalSubtitle,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {editingAppliance?.name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setEditingAppliance(null)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons
                      name="close"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Big Watt Input Box */}
                <View
                  style={[
                    styles.bigInputBox,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderColor: colors.border,
                    },
                  ]}
                >
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
                  <Text
                    style={[styles.bigInputUnit, { color: colors.primary }]}
                  >
                    Watts (W)
                  </Text>
                </View>

                {/* Quick Watt Adjustment Steppers */}
                <View style={styles.quickStepsRow}>
                  {[-50, -10, +10, +50].map((step) => (
                    <TouchableOpacity
                      key={step}
                      onPress={() => adjustEditWattage(step)}
                      style={[
                        styles.quickStepBtn,
                        {
                          backgroundColor: colors.surfaceVariant,
                          borderColor: colors.border,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.quickStepBtnText,
                          { color: colors.text },
                        ]}
                      >
                        {step > 0 ? `+${step}W` : `${step}W`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Modal Buttons */}
                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={[
                      styles.modalSecondaryBtn,
                      { borderColor: colors.border },
                    ]}
                    onPress={() => setEditingAppliance(null)}
                  >
                    <Text
                      style={[
                        styles.modalSecondaryBtnText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalPrimaryBtn,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={handleSaveWattage}
                  >
                    <Text
                      style={[
                        styles.modalPrimaryBtnText,
                        { color: isDark ? "#260B00" : "#FFFFFF" },
                      ]}
                    >
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
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalFullSheet}
          >
            <View
              style={[
                styles.bottomSheetContainer,
                { backgroundColor: colors.surface },
              ]}
            >
              {/* Sheet Header */}
              <View
                style={[
                  styles.sheetHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetTitle, { color: colors.text }]}>
                    Add Appliance
                  </Text>
                  <Text
                    style={[
                      styles.sheetSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Choose from popular devices or create custom
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsAddModalOpen(false)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Tab Selector */}
              <View
                style={[
                  styles.sheetTabsRow,
                  { backgroundColor: colors.surfaceVariant },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.sheetTab,
                    addModalTab === "library" && [
                      styles.sheetTabActive,
                      { backgroundColor: colors.primary },
                    ],
                  ]}
                  onPress={() => setAddModalTab("library")}
                >
                  <Ionicons
                    name="grid-outline"
                    size={15}
                    color={
                      addModalTab === "library"
                        ? isDark
                          ? "#260B00"
                          : "#FFFFFF"
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.sheetTabText,
                      {
                        color:
                          addModalTab === "library"
                            ? isDark
                              ? "#260B00"
                              : "#FFFFFF"
                            : colors.text,
                      },
                    ]}
                  >
                    Common Appliances
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sheetTab,
                    addModalTab === "custom" && [
                      styles.sheetTabActive,
                      { backgroundColor: colors.primary },
                    ],
                  ]}
                  onPress={() => setAddModalTab("custom")}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={15}
                    color={
                      addModalTab === "custom"
                        ? isDark
                          ? "#260B00"
                          : "#FFFFFF"
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.sheetTabText,
                      {
                        color:
                          addModalTab === "custom"
                            ? isDark
                              ? "#260B00"
                              : "#FFFFFF"
                            : colors.text,
                      },
                    ]}
                  >
                    Custom Device
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tab 1: Library of common appliances */}
              {addModalTab === "library" && (
                <View style={styles.libraryTabContainer}>
                  {/* Search Bar */}
                  <View
                    style={[
                      styles.searchBar,
                      {
                        backgroundColor: colors.surfaceVariant,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="search"
                      size={16}
                      color={colors.textSecondary}
                    />
                    <TextInput
                      style={[styles.searchInput, { color: colors.text }]}
                      placeholder="Search appliance (fan, fridge, pump)..."
                      placeholderTextColor={colors.textMuted}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      clearButtonMode="while-editing"
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery("")}>
                        <Ionicons
                          name="close-circle"
                          size={16}
                          color={colors.textMuted}
                        />
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
                              backgroundColor: isSelected
                                ? colors.primary
                                : colors.surfaceVariant,
                              borderColor: isSelected
                                ? colors.primary
                                : colors.border,
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.catChipText,
                              {
                                color: isSelected
                                  ? isDark
                                    ? "#260B00"
                                    : "#FFFFFF"
                                  : colors.text,
                              },
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
                        <Ionicons
                          name="search-outline"
                          size={32}
                          color={colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.emptyFilteredTitle,
                            { color: colors.text },
                          ]}
                        >
                          No Appliances Found
                        </Text>
                        <Text
                          style={[
                            styles.emptyFilteredSub,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Try a different search term or create a custom device.
                        </Text>
                      </View>
                    ) : (
                      filteredLibrary.map((item) => {
                        const userApp = appliances.find(
                          (a) =>
                            a.name.toLowerCase() === item.name.toLowerCase(),
                        );
                        const currentQty = userApp ? userApp.quantity : 0;

                        return (
                          <View
                            key={item.id}
                            style={[
                              styles.libraryItemRow,
                              { borderBottomColor: colors.border },
                            ]}
                          >
                            <View
                              style={[
                                styles.appIconCircle,
                                {
                                  backgroundColor: isDark
                                    ? "rgba(252, 185, 116, 0.12)"
                                    : "#F5EBE6",
                                },
                              ]}
                            >
                              <Ionicons
                                name={item.icon as any}
                                size={18}
                                color={colors.primary}
                              />
                            </View>

                            <View style={styles.libraryItemDetails}>
                              <View style={styles.libraryItemTitleRow}>
                                <Text
                                  style={[
                                    styles.libraryItemName,
                                    { color: colors.text },
                                  ]}
                                >
                                  {item.name}
                                </Text>
                                {item.isCustom && (
                                  <View
                                    style={[
                                      styles.customBadge,
                                      {
                                        backgroundColor: isDark
                                          ? "rgba(252, 185, 116, 0.15)"
                                          : "#F5EBE6",
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.customBadgeText,
                                        { color: colors.primary },
                                      ]}
                                    >
                                      Custom
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <Text
                                style={[
                                  styles.libraryItemWatt,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                {item.wattage} Watts
                                {currentQty > 0
                                  ? ` · (In setup: ${currentQty})`
                                  : ""}
                              </Text>
                            </View>

                            <View style={styles.libraryItemActionRow}>
                              {item.isCustom && (
                                <TouchableOpacity
                                  style={[
                                    styles.deleteLibCustomBtn,
                                    {
                                      backgroundColor: isDark
                                        ? "rgba(220, 38, 38, 0.15)"
                                        : "#FEE2E2",
                                    },
                                  ]}
                                  onPress={() =>
                                    handleDeleteCustomDeviceFromLibrary(item.id)
                                  }
                                  hitSlop={{
                                    top: 6,
                                    bottom: 6,
                                    left: 6,
                                    right: 6,
                                  }}
                                  accessibilityLabel={`Delete custom device ${item.name}`}
                                >
                                  <Ionicons
                                    name="trash-outline"
                                    size={13}
                                    color={COLORS.danger}
                                  />
                                </TouchableOpacity>
                              )}

                              <TouchableOpacity
                                style={[
                                  styles.addLibBtn,
                                  {
                                    backgroundColor:
                                      currentQty > 0
                                        ? colors.surfaceVariant
                                        : colors.primary,
                                    borderColor:
                                      currentQty > 0
                                        ? colors.border
                                        : colors.primary,
                                  },
                                ]}
                                onPress={() => handleAddFromLibrary(item)}
                                activeOpacity={0.75}
                              >
                                <Ionicons
                                  name="add"
                                  size={15}
                                  color={
                                    currentQty > 0
                                      ? colors.primary
                                      : isDark
                                        ? "#260B00"
                                        : "#FFFFFF"
                                  }
                                />
                                <Text
                                  style={[
                                    styles.addLibBtnText,
                                    {
                                      color:
                                        currentQty > 0
                                          ? colors.primary
                                          : isDark
                                            ? "#260B00"
                                            : "#FFFFFF",
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
              {addModalTab === "custom" && (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.customFormContent}
                >
                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    Device Name *
                  </Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      {
                        backgroundColor: colors.surfaceVariant,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholder="e.g., Deep Well Pump, Studio Amp, Aquarium"
                    placeholderTextColor={colors.textMuted}
                    value={customName}
                    onChangeText={setCustomName}
                  />

                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    Power Rating (Watts) *
                  </Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      {
                        backgroundColor: colors.surfaceVariant,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholder="e.g., 250"
                    placeholderTextColor={colors.textMuted}
                    value={customWatt}
                    onChangeText={setCustomWatt}
                    keyboardType="number-pad"
                  />

                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    Initial Quantity
                  </Text>
                  <View style={styles.customQtyRow}>
                    <TouchableOpacity
                      onPress={() => setCustomQty((q) => Math.max(1, q - 1))}
                      style={[
                        styles.customQtyBtn,
                        {
                          backgroundColor: colors.surfaceVariant,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Ionicons name="remove" size={18} color={colors.text} />
                    </TouchableOpacity>
                    <Text
                      style={[styles.customQtyValue, { color: colors.text }]}
                    >
                      {customQty}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setCustomQty((q) => q + 1)}
                      style={[
                        styles.customQtyBtn,
                        {
                          backgroundColor: colors.surfaceVariant,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Ionicons name="add" size={18} color={colors.text} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    Select Icon
                  </Text>
                  <View style={styles.iconSelectionGrid}>
                    {ICON_OPTIONS.map((iconName) => (
                      <TouchableOpacity
                        key={iconName}
                        onPress={() => setCustomIcon(iconName)}
                        style={[
                          styles.iconPickBox,
                          {
                            backgroundColor:
                              customIcon === iconName
                                ? colors.primary
                                : colors.surfaceVariant,
                            borderColor:
                              customIcon === iconName
                                ? colors.primary
                                : colors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name={iconName as any}
                          size={20}
                          color={
                            customIcon === iconName
                              ? isDark
                                ? "#260B00"
                                : "#FFFFFF"
                              : colors.text
                          }
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.addCustomSubmitBtn,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={handleAddCustomAppliance}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={isDark ? "#260B00" : "#FFFFFF"}
                    />
                    <Text
                      style={[
                        styles.addCustomSubmitText,
                        { color: isDark ? "#260B00" : "#FFFFFF" },
                      ]}
                    >
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
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.modalKeyboardContainer}
            >
              <View
                style={[
                  styles.modalCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.modalHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      Custom Backup Time
                    </Text>
                    <Text
                      style={[
                        styles.modalSubtitle,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Enter desired outage runtime (0.5 to 24 hours)
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsHoursModalOpen(false)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons
                      name="close"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Big Number Input Box */}
                <View
                  style={[
                    styles.bigInputBox,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderColor: colors.border,
                    },
                  ]}
                >
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
                  <Text
                    style={[styles.bigInputUnit, { color: colors.primary }]}
                  >
                    Hours
                  </Text>
                </View>

                {/* Preset Chips */}
                <View style={styles.quickStepsRow}>
                  {[1.5, 3.5, 5, 7, 10, 14].map((h) => (
                    <TouchableOpacity
                      key={h}
                      onPress={() => setCustomHoursText(h.toString())}
                      style={[
                        styles.quickStepBtn,
                        {
                          backgroundColor: colors.surfaceVariant,
                          borderColor: colors.border,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.quickStepBtnText,
                          { color: colors.text },
                        ]}
                      >
                        {h}h
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Modal Buttons */}
                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={[
                      styles.modalSecondaryBtn,
                      { borderColor: colors.border },
                    ]}
                    onPress={() => setIsHoursModalOpen(false)}
                  >
                    <Text
                      style={[
                        styles.modalSecondaryBtnText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalPrimaryBtn,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={handleSaveCustomHours}
                  >
                    <Text
                      style={[
                        styles.modalPrimaryBtnText,
                        { color: isDark ? "#260B00" : "#FFFFFF" },
                      ]}
                    >
                      Set Duration
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ================= MODAL 4: PRODUCT SELECTOR MODAL ================= */}
      <Modal
        visible={selectorModalType !== null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setSelectorModalType(null);
          setSelectorSearchText("");
        }}
      >
        <View style={styles.selectorModalOverlay}>
          <View
            style={[
              styles.selectorModalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.selectorModalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {selectorModalType === "inverter"
                    ? selectorTargetIndex > 0
                      ? `Select Inverter Model ${selectorTargetIndex + 1}`
                      : isSolarHybrid
                        ? "Select Solar Inverter"
                        : "Select IPS Unit (IPS / Solar IPS)"
                    : selectorModalType === "battery"
                      ? selectorTargetIndex > 0
                        ? `Select Battery Model ${selectorTargetIndex + 1}`
                        : "Select Battery Bank"
                      : selectorTargetIndex > 0
                        ? `Select Solar Panel Model ${selectorTargetIndex + 1}`
                        : "Select Solar Panel Model"}
                </Text>
                <Text
                  style={[
                    styles.modalSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {selectorTargetIndex > 0
                    ? "Combine with another model from the same category to expand system capacity"
                    : selectorModalType === "inverter"
                      ? `Recommended: ~${results.recommendedVa} VA for ${results.totalWatts}W continuous load`
                      : selectorModalType === "battery"
                        ? `Recommended: ~${results.recommendedBatteryAh} Ah (${results.batteryCount} units for ${results.batteryVoltage}V bank)`
                        : `Recommended: ~580W Tier-1 panels (${results.solarDetails?.panelCount || 1} units)`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setSelectorModalType(null);
                  setSelectorSearchText("");
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search Input & Auto-Recommend Reset */}
            <View style={styles.selectorSearchRow}>
              <View
                style={[
                  styles.selectorSearchInputBox,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="search"
                  size={16}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={[styles.selectorSearchInput, { color: colors.text }]}
                  placeholder="Search model, brand, wattage..."
                  placeholderTextColor={colors.textMuted}
                  value={selectorSearchText}
                  onChangeText={setSelectorSearchText}
                />
                {selectorSearchText.length > 0 && (
                  <TouchableOpacity onPress={() => setSelectorSearchText("")}>
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {((selectorModalType === "inverter" &&
                configuredInverters !== null) ||
                (selectorModalType === "battery" &&
                  configuredBatteries !== null) ||
                (selectorModalType === "solar" &&
                  configuredPanels !== null)) && (
                <TouchableOpacity
                  style={[
                    styles.autoRecommendBtn,
                    {
                      borderColor: colors.primary,
                      backgroundColor: isDark
                        ? "rgba(252, 185, 116, 0.12)"
                        : "#FFF7ED",
                    },
                  ]}
                  onPress={() => {
                    if (selectorModalType === "inverter")
                      setConfiguredInverters(null);
                    else if (selectorModalType === "battery")
                      setConfiguredBatteries(null);
                    else if (selectorModalType === "solar")
                      setConfiguredPanels(null);
                    setSelectorModalType(null);
                    setSelectorSearchText("");
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="sparkles" size={12} color={colors.primary} />
                  <Text
                    style={[
                      styles.autoRecommendBtnText,
                      { color: colors.primary },
                    ]}
                  >
                    Auto Match
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* List of Products */}
            {isLoadingCatalog && selectorProducts.length === 0 ? (
              <View style={styles.selectorLoadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                  style={[
                    styles.selectorLoadingText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Loading products from catalog...
                </Text>
              </View>
            ) : selectorProducts.length === 0 ? (
              <View style={styles.selectorEmptyBox}>
                <Ionicons
                  name="cube-outline"
                  size={36}
                  color={colors.textMuted}
                />
                <Text
                  style={[styles.selectorEmptyTitle, { color: colors.text }]}
                >
                  No Models Found
                </Text>
                <Text
                  style={[
                    styles.selectorEmptySub,
                    { color: colors.textSecondary },
                  ]}
                >
                  {selectorSearchText
                    ? `No equipment matches "${selectorSearchText}".`
                    : "No models currently in this catalog category."}
                </Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.selectorListContent}
              >
                {selectorProducts.map((item) => {
                  const isSelected =
                    (selectorModalType === "inverter" &&
                      results.inverterItems?.[selectorTargetIndex]?.product
                        .id === item.id) ||
                    (selectorModalType === "battery" &&
                      results.batteryItems?.[selectorTargetIndex]?.product
                        .id === item.id) ||
                    (selectorModalType === "solar" &&
                      results.panelItems?.[selectorTargetIndex]?.product.id ===
                        item.id);

                  const parsedSpec =
                    selectorModalType === "inverter"
                      ? `${extractInverterVa(item) || "—"} VA`
                      : selectorModalType === "battery"
                        ? `${extractBatteryAh(item) || "—"} Ah`
                        : `${extractSolarWatts(item) || "—"} W`;

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.selectorItemRow,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? "rgba(252, 185, 116, 0.12)"
                              : "#FFF7ED"
                            : colors.surfaceVariant,
                          borderColor: isSelected
                            ? colors.primary
                            : colors.border,
                          opacity: item.inStock ? 1 : 0.65,
                        },
                      ]}
                      onPress={() => {
                        if (!item.inStock) {
                          Alert.alert(
                            "Out of Stock",
                            `"${item.title}" is currently out of stock. Please select an available in-stock model.`,
                          );
                          return;
                        }

                        if (selectorModalType === "inverter") {
                          const current =
                            configuredInverters ??
                            (results.inverterItems?.map((it) => ({
                              productId: it.product.id,
                              quantity: it.quantity,
                            })) ||
                              []);
                          const updated = [...current];
                          if (selectorTargetIndex < updated.length) {
                            updated[selectorTargetIndex] = {
                              ...updated[selectorTargetIndex],
                              productId: item.id,
                            };
                          } else {
                            updated.push({ productId: item.id, quantity: 1 });
                          }
                          setConfiguredInverters(updated);
                        } else if (selectorModalType === "battery") {
                          const step = results.seriesBatteryCount || 1;
                          const current =
                            configuredBatteries ??
                            (results.batteryItems?.map((it) => ({
                              productId: it.product.id,
                              quantity: it.quantity,
                            })) ||
                              []);
                          const updated = [...current];
                          if (selectorTargetIndex < updated.length) {
                            updated[selectorTargetIndex] = {
                              ...updated[selectorTargetIndex],
                              productId: item.id,
                            };
                          } else {
                            updated.push({
                              productId: item.id,
                              quantity: step,
                            });
                          }
                          setConfiguredBatteries(updated);
                        } else if (selectorModalType === "solar") {
                          const step = results.minVoltageString || 1;
                          const current =
                            configuredPanels ??
                            (results.panelItems?.map((it) => ({
                              productId: it.product.id,
                              quantity: it.quantity,
                            })) ||
                              []);
                          const updated = [...current];
                          if (selectorTargetIndex < updated.length) {
                            updated[selectorTargetIndex] = {
                              ...updated[selectorTargetIndex],
                              productId: item.id,
                            };
                          } else {
                            updated.push({
                              productId: item.id,
                              quantity: step,
                            });
                          }
                          setConfiguredPanels(updated);
                        }
                        setSelectorModalType(null);
                        setSelectorSearchText("");
                      }}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{
                          uri:
                            item.image ||
                            "https://admin.atiar.com.bd/assets/7ba5b149-9be4-44d9-bb8d-44871fac26d2",
                        }}
                        style={styles.selectorItemThumb}
                        resizeMode="contain"
                      />

                      <View style={styles.selectorItemInfo}>
                        <View style={styles.selectorItemHeaderRow}>
                          <Text
                            style={[
                              styles.selectorItemTitle,
                              { color: colors.text },
                            ]}
                            numberOfLines={2}
                          >
                            {item.title}
                          </Text>
                          {isSelected && (
                            <View
                              style={[
                                styles.selectedPill,
                                { backgroundColor: colors.primary },
                              ]}
                            >
                              <Ionicons
                                name="checkmark"
                                size={10}
                                color={isDark ? "#260B00" : "#FFFFFF"}
                              />
                              <Text
                                style={[
                                  styles.selectedPillText,
                                  { color: isDark ? "#260B00" : "#FFFFFF" },
                                ]}
                              >
                                ACTIVE
                              </Text>
                            </View>
                          )}
                          {!item.inStock && (
                            <View
                              style={[
                                styles.selectorOutOfStockPill,
                                {
                                  backgroundColor: isDark
                                    ? "rgba(239, 68, 68, 0.2)"
                                    : "#FEE2E2",
                                },
                              ]}
                            >
                              <Ionicons
                                name="ban"
                                size={10}
                                color={COLORS.danger}
                              />
                              <Text
                                style={[
                                  styles.selectorOutOfStockText,
                                  { color: COLORS.danger },
                                ]}
                              >
                                OUT OF STOCK
                              </Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.selectorItemMetaRow}>
                          {item.brand && (
                            <Text
                              style={[
                                styles.selectorItemBrand,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {item.brand}
                            </Text>
                          )}
                          <View
                            style={[
                              styles.specPill,
                              {
                                backgroundColor: isDark ? "#334155" : "#E2E8F0",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.specPillText,
                                { color: colors.text },
                              ]}
                            >
                              {parsedSpec}
                            </Text>
                          </View>
                        </View>

                        {item.price > 0 ? (
                          <Text
                            style={[
                              styles.selectorItemPrice,
                              { color: colors.primary },
                            ]}
                          >
                            ৳ {item.price.toLocaleString()}
                          </Text>
                        ) : (
                          <Text
                            style={[
                              styles.selectorItemCallForPrice,
                              { color: colors.primary },
                            ]}
                          >
                            Call for Price
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ================= MODAL 5: ADD SYSTEM TO CART CONFIRMATION MODAL ================= */}
      <Modal
        visible={isCartConfirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCartConfirmModalVisible(false)}
      >
        <View style={styles.cartSuccessModalOverlay}>
          <View
            style={[
              styles.cartSuccessModalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {/* Header with confirmation badge & close icon */}
            <View style={styles.cartSuccessHeaderRow}>
              <View
                style={[
                  styles.cartSuccessBadge,
                  {
                    backgroundColor: isDark
                      ? "rgba(252, 185, 116, 0.2)"
                      : "#FEF3C7",
                  },
                ]}
              >
                <Ionicons name="cart" size={24} color={colors.primary} />
              </View>
              <TouchableOpacity
                onPress={() => setIsCartConfirmModalVisible(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.cartSuccessTitle, { color: colors.text }]}>
              Add System to Cart
            </Text>
            <Text
              style={[
                styles.cartSuccessSubtitle,
                { color: colors.textSecondary },
              ]}
            >
              Review your configured equipment and estimated total before adding
              to cart.
            </Text>

            {/* System Cost & Specifications Card */}
            <View
              style={[
                styles.cartSuccessSummaryCard,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.cartSuccessSummaryTop}>
                <View>
                  <Text
                    style={[
                      styles.cartSuccessCostLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    ESTIMATED SYSTEM TOTAL
                  </Text>
                  <Text
                    style={[
                      styles.cartSuccessTotalCost,
                      { color: colors.primary },
                    ]}
                  >
                    ৳ {results.estimatedCostBDT.toLocaleString()}
                  </Text>
                </View>
                <View
                  style={[
                    styles.cartSuccessTierPill,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.cartSuccessTierText,
                      { color: isDark ? "#260B00" : "#FFFFFF" },
                    ]}
                  >
                    {isCustomPackage
                      ? "CUSTOM"
                      : packageTier === "premium"
                        ? "PRO"
                        : packageTier === "economy"
                          ? "BUDGET"
                          : "STANDARD"}
                  </Text>
                </View>
              </View>

              <View style={styles.cartSuccessSpecsRow}>
                <View
                  style={[
                    styles.cartSuccessSpecPill,
                    { backgroundColor: isDark ? "#334155" : "#E2E8F0" },
                  ]}
                >
                  <Ionicons
                    name="flash-outline"
                    size={12}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.cartSuccessSpecText, { color: colors.text }]}
                  >
                    {results.totalWatts}W Load
                  </Text>
                </View>
                <View
                  style={[
                    styles.cartSuccessSpecPill,
                    { backgroundColor: isDark ? "#334155" : "#E2E8F0" },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={12}
                    color={COLORS.success}
                  />
                  <Text
                    style={[styles.cartSuccessSpecText, { color: colors.text }]}
                  >
                    ~{results.actualBackupHours}h Backup
                  </Text>
                </View>
                <View
                  style={[
                    styles.cartSuccessSpecPill,
                    { backgroundColor: isDark ? "#334155" : "#E2E8F0" },
                  ]}
                >
                  <Ionicons
                    name={
                      isSolarHybrid
                        ? "sunny-outline"
                        : "battery-charging-outline"
                    }
                    size={12}
                    color={COLORS.warning}
                  />
                  <Text
                    style={[styles.cartSuccessSpecText, { color: colors.text }]}
                  >
                    {isSolarHybrid ? "Solar Hybrid" : "Standard IPS"}
                  </Text>
                </View>
              </View>
            </View>

            {/* List of Configured Items */}
            <View style={styles.cartSuccessItemsHeader}>
              <Text
                style={[styles.cartSuccessItemsTitle, { color: colors.text }]}
              >
                Configured Equipment ({pendingCartItems.length}{" "}
                {pendingCartItems.length === 1 ? "item" : "items"})
              </Text>
            </View>

            <ScrollView
              style={styles.cartSuccessItemsList}
              contentContainerStyle={styles.cartSuccessItemsListContent}
              showsVerticalScrollIndicator={false}
            >
              {pendingCartItems.map((it, idx) => (
                <View
                  key={`pending-cart-item-${it.product.id}-${idx}`}
                  style={[
                    styles.cartSuccessItemRow,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  {it.product.image ? (
                    <Image
                      source={{ uri: it.product.image }}
                      style={styles.cartSuccessItemThumb}
                      resizeMode="contain"
                    />
                  ) : (
                    <View
                      style={[
                        styles.cartSuccessItemThumbPlaceholder,
                        { backgroundColor: colors.border },
                      ]}
                    >
                      <Ionicons
                        name="cube-outline"
                        size={18}
                        color={colors.textSecondary}
                      />
                    </View>
                  )}

                  <View style={styles.cartSuccessItemInfo}>
                    <Text
                      style={[
                        styles.cartSuccessItemTitle,
                        { color: colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {it.product.title}
                    </Text>
                    <View style={styles.cartSuccessItemMetaRow}>
                      <View
                        style={[
                          styles.cartSuccessQtyPill,
                          {
                            backgroundColor: isDark
                              ? "rgba(252, 185, 116, 0.2)"
                              : "#FEF3C7",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.cartSuccessQtyText,
                            { color: colors.primary },
                          ]}
                        >
                          Qty: {it.quantity}
                        </Text>
                      </View>
                      {it.product.brand && (
                        <Text
                          style={[
                            styles.cartSuccessItemBrand,
                            { color: colors.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {it.product.brand}
                        </Text>
                      )}
                      {!it.product.inStock && (
                        <View
                          style={[
                            styles.cartSuccessOutOfStockPill,
                            {
                              backgroundColor: isDark
                                ? "rgba(239, 68, 68, 0.2)"
                                : "#FEE2E2",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.cartSuccessOutOfStockText,
                              { color: COLORS.danger },
                            ]}
                          >
                            Out of Stock
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.cartSuccessItemPriceCol}>
                    {it.product.price > 0 ? (
                      <Text
                        style={[
                          styles.cartSuccessItemPrice,
                          { color: colors.primary },
                        ]}
                      >
                        ৳ {(it.product.price * it.quantity).toLocaleString()}
                      </Text>
                    ) : (
                      <Text
                        style={[
                          styles.cartSuccessItemCallPrice,
                          { color: colors.primary },
                        ]}
                      >
                        Call for Price
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.cartSuccessActions}>
              <TouchableOpacity
                style={[
                  styles.cartSuccessCheckoutBtn,
                  {
                    backgroundColor: pendingCartItems.some((it) => !it.product.inStock)
                      ? (isDark ? "#475569" : "#CBD5E1")
                      : colors.primary,
                  },
                ]}
                onPress={handleConfirmAddToCart}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={pendingCartItems.some((it) => !it.product.inStock) ? "alert-circle" : "cart"}
                  size={18}
                  color={
                    pendingCartItems.some((it) => !it.product.inStock)
                      ? (isDark ? "#94A3B8" : "#64748B")
                      : isDark ? "#260B00" : "#FFFFFF"
                  }
                />
                <Text
                  style={[
                    styles.cartSuccessCheckoutBtnText,
                    {
                      color: pendingCartItems.some((it) => !it.product.inStock)
                        ? (isDark ? "#94A3B8" : "#64748B")
                        : isDark ? "#260B00" : "#FFFFFF",
                    },
                  ]}
                >
                  {pendingCartItems.some((it) => !it.product.inStock)
                    ? "Contains Out of Stock"
                    : "Add to Cart"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.cartPrintPdfBtn,
                  {
                    borderColor: colors.primary,
                    backgroundColor: isDark
                      ? "rgba(252, 185, 116, 0.12)"
                      : "#FFF7ED",
                  },
                ]}
                onPress={handlePrintQuotationPdf}
                activeOpacity={0.8}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons
                      name="print-outline"
                      size={18}
                      color={colors.primary}
                    />
                    <Text
                      style={[
                        styles.cartPrintPdfBtnText,
                        { color: colors.primary },
                      ]}
                    >
                      Print PDF Quotation
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.cartSuccessKeepBtn,
                  { borderColor: colors.border },
                ]}
                onPress={() => setIsCartConfirmModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.cartSuccessKeepBtnText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    flexDirection: "row",
    padding: 4,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  activeModeButton: {
    backgroundColor: COLORS.primary,
  },
  modeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  sectionCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  sectionTitleCol: {
    flex: 1,
    paddingRight: SPACING.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  resetHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  resetHeaderText: {
    fontSize: 11,
    fontWeight: "600",
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
    fontWeight: "800",
    fontSize: 13,
  },
  emptyAppliancesBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl,
    gap: 6,
  },
  emptyAppliancesTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 6,
  },
  emptyAppliancesSub: {
    fontSize: 12,
    textAlign: "center",
    maxWidth: 260,
  },
  applianceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  applianceInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  appIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  appTextCol: {
    flex: 1,
    gap: 3,
  },
  appName: {
    fontSize: 13,
    fontWeight: "600",
  },
  wattagePillBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    marginTop: 2,
  },
  wattagePillText: {
    fontSize: 11,
    fontWeight: "600",
    includeFontPadding: false,
  },
  appActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    paddingHorizontal: 6,
    fontSize: 12,
    fontWeight: "700",
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  addApplianceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    marginTop: SPACING.md,
    gap: 6,
  },
  addApplianceBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  backupHeroBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    alignItems: "center",
    justifyContent: "center",
  },
  backupStepSubText: {
    fontSize: 9,
    fontWeight: "700",
    marginTop: -2,
    includeFontPadding: false,
  },
  backupHeroCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xs,
  },
  backupHeroHoursRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backupHeroHoursValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  backupHeroDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  backupHeroTapHint: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
    textDecorationLine: "underline",
  },
  quickPresetsLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: SPACING.xs,
    marginBottom: 6,
  },
  horizontalScrollWrapper: {
    flexGrow: 0,
  },
  hoursChipsScroll: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
  },
  hourChipText: {
    fontSize: 12,
    fontWeight: "700",
    includeFontPadding: false,
    textAlignVertical: "center",
    lineHeight: 16,
  },
  resultsCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    gap: SPACING.sm,
  },
  engineeredBadge: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  systemVaTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 2,
  },
  voltageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    flexShrink: 0,
  },
  voltageBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  bomList: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  bomItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.sm + 4,
    borderRadius: RADIUS.md,
    gap: 10,
  },
  bomTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  bomDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  costSummaryBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    fontWeight: "700",
  },
  costSummarySub: {
    fontSize: 10,
    marginTop: 2,
  },
  totalCostBDT: {
    fontSize: 19,
    fontWeight: "800",
    flexShrink: 0,
    textAlign: "right",
  },
  actionButtonsCol: {
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  addToCartPackageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    gap: 8,
  },
  addToCartPackageText: {
    fontSize: 14,
    fontWeight: "700",
  },
  whatsAppPackageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#25D366",
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    gap: 8,
  },
  whatsAppPackageText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  // Modal Common Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.md,
  },
  modalKeyboardContainer: {
    width: "100%",
    maxWidth: 360,
  },
  modalCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    width: "100%",
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  bigInputBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    gap: 8,
  },
  bigNumberInput: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    minWidth: 80,
  },
  bigInputUnit: {
    fontSize: 14,
    fontWeight: "700",
  },
  quickStepsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginBottom: SPACING.lg,
  },
  quickStepBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    minHeight: 34,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  quickStepBtnText: {
    fontSize: 12,
    fontWeight: "600",
    includeFontPadding: false,
    textAlignVertical: "center",
    lineHeight: 16,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  modalSecondaryBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  modalSecondaryBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalPrimaryBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  modalPrimaryBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Modal 2: Bottom Sheet Styles
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  modalFullSheet: {
    height: "85%",
    maxHeight: "85%",
  },
  bottomSheetContainer: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.md,
    flex: 1,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    marginBottom: SPACING.sm,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sheetSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  sheetTabsRow: {
    flexDirection: "row",
    borderRadius: RADIUS.sm,
    padding: 3,
    marginBottom: SPACING.sm,
  },
  sheetTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: RADIUS.xs,
    gap: 6,
  },
  sheetTabActive: {
    backgroundColor: COLORS.primary,
  },
  sheetTabText: {
    fontSize: 12,
    fontWeight: "700",
  },
  libraryTabContainer: {
    flex: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
  },
  catChipText: {
    fontSize: 12,
    fontWeight: "700",
    includeFontPadding: false,
    textAlignVertical: "center",
    lineHeight: 16,
  },
  libraryScrollView: {
    flex: 1,
  },
  libraryListContent: {
    paddingBottom: 30,
  },
  emptyFilteredBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl,
    gap: 6,
  },
  emptyFilteredTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 6,
  },
  emptyFilteredSub: {
    fontSize: 12,
    textAlign: "center",
    maxWidth: 240,
  },
  libraryItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  libraryItemDetails: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  libraryItemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  libraryItemName: {
    fontSize: 13,
    fontWeight: "600",
  },
  customBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.xs,
  },
  customBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    includeFontPadding: false,
  },
  libraryItemWatt: {
    fontSize: 11,
    marginTop: 2,
  },
  libraryItemActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteLibCustomBtn: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  addLibBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    gap: 3,
  },
  addLibBtnText: {
    fontSize: 11,
    fontWeight: "700",
    includeFontPadding: false,
  },

  // Custom Form Styles
  customFormContent: {
    paddingVertical: SPACING.sm,
    paddingBottom: 30,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  customQtyBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  customQtyValue: {
    fontSize: 16,
    fontWeight: "700",
    minWidth: 24,
    textAlign: "center",
  },
  iconSelectionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
    marginBottom: SPACING.lg,
  },
  iconPickBox: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addCustomSubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    gap: 8,
  },
  addCustomSubmitText: {
    fontSize: 14,
    fontWeight: "700",
  },
  tierTabContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  tierTabBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tierTabRecBadge: {
    position: "absolute",
    top: -9,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: RADIUS.full,
    alignSelf: "center",
  },
  tierTabRecText: {
    fontSize: 7.5,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  tierTabLabel: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  tierTabPrice: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
    textAlign: "center",
  },
  tierTabSub: {
    fontSize: 9.5,
    fontWeight: "600",
    marginTop: 2,
    textAlign: "center",
  },
  selectedTierCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    marginTop: SPACING.xs,
  },
  selectedTierHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  tierBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  activeTierPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  activeTierPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  selectedTierTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 3,
  },
  selectedTierDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 10,
  },
  tierHardwareSummaryBox: {
    padding: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: 6,
    marginBottom: 12,
  },
  tierHardwareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tierHardwareText: {
    fontSize: 11.5,
    fontWeight: "600",
    flex: 1,
  },
  tierPriceBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(150, 150, 150, 0.15)",
  },
  tierPriceBottomLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  tierPriceBottomSub: {
    fontSize: 9.5,
    marginTop: 1,
  },
  tierPriceBottomVal: {
    fontSize: 18,
    fontWeight: "900",
  },
  solarRangeBox: {
    marginTop: SPACING.md,
    padding: SPACING.sm + 4,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  solarRangeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: SPACING.sm,
  },
  solarRangeTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  solarRangeSub: {
    fontSize: 10,
    marginTop: 1,
  },
  solarRangePillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  solarRangePill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  solarRangePillLabel: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  solarRangePillPanels: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "center",
  },
  solarRangePillPrice: {
    fontSize: 9.5,
    fontWeight: "800",
    marginTop: 1,
    textAlign: "center",
  },
  solarRangePillSub: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 1,
    textAlign: "center",
  },
  solarActiveSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },
  solarActiveSummaryText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  solarSuggestCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.sm,
  },
  solarSuggestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: SPACING.sm,
  },
  solarIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  solarSuggestTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  solarSuggestModel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  solarKwpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  solarKwpBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  solarSpecsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 6,
  },
  solarSpecCell: {
    flexBasis: "47%",
    flexGrow: 1,
    padding: 8,
    borderRadius: RADIUS.sm,
  },
  solarSpecLabel: {
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  solarSpecVal: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  solarAdvantageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  solarAdvantageText: {
    fontSize: 10,
    flex: 1,
    lineHeight: 14,
  },
  solarUpsellBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: SPACING.sm + 4,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.sm,
  },
  solarUpsellTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  solarUpsellSub: {
    fontSize: 10,
    marginTop: 2,
  },
  priceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  tierTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tierTagText: {
    fontSize: 9,
    fontWeight: "800",
  },
  packageRangeText: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
    marginBottom: 2,
  },

  // Power & Sizing Match Card
  powerMatchCard: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  powerMatchHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: SPACING.sm,
  },
  powerMatchTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  powerMatchSub: {
    fontSize: 10,
    marginTop: 1,
  },
  matchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  matchBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  comparisonGrid: {
    gap: 8,
  },
  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  comparisonCol: {
    flex: 1,
  },
  compColLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  compColVal: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  compColSub: {
    fontSize: 10,
    marginTop: 1,
  },
  comparisonDivider: {
    paddingHorizontal: 8,
  },

  // Store Product Slots
  productSlotsContainer: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  catalogLoadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  catalogLoadingText: {
    fontSize: 11,
  },
  productSlotCard: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.sm + 2,
  },
  productSlotHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  slotBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  slotBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  slotBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  combinedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  combinedBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  headerActionBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  combineToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  combineToggleBtnText: {
    fontSize: 10,
    fontWeight: "700",
  },
  removeCombinationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  removeCombinationBtnText: {
    fontSize: 10,
    fontWeight: "700",
  },
  subModelCard: {
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    padding: SPACING.xs + 4,
    marginTop: 4,
  },
  subModelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  subModelHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modelTagBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  modelTagText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  inlineChangeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderRadius: RADIUS.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  inlineChangeBtnText: {
    fontSize: 9.5,
    fontWeight: "600",
  },
  inlineRemoveBtn: {
    padding: 3,
    borderRadius: RADIUS.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  combinationConnectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
    gap: 8,
  },
  connectorLine: {
    flex: 1,
    height: 1,
  },
  connectorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  connectorText: {
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  changeModelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  changeModelBtnText: {
    fontSize: 10,
    fontWeight: "700",
  },
  productSlotBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm + 2,
  },
  productSlotThumb: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.sm,
    backgroundColor: "#FFFFFF",
  },
  productSlotThumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  productSlotInfo: {
    flex: 1,
  },
  productSlotTitle: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  productSlotMeta: {
    fontSize: 10,
    marginTop: 2,
  },
  productSlotPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  productSlotPrice: {
    fontSize: 13,
    fontWeight: "800",
  },
  unitPriceSub: {
    fontSize: 9.5,
    marginTop: 1,
    fontWeight: "500",
  },
  callForPriceSlotText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  productSlotQty: {
    fontSize: 10,
    fontWeight: "600",
  },
  slotQtyStepperWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepperLabelText: {
    fontSize: 9.5,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    overflow: "hidden",
  },
  stepperBtn: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnDisabled: {
    opacity: 0.35,
  },
  stepperValueText: {
    fontSize: 12,
    fontWeight: "800",
    minWidth: 22,
    textAlign: "center",
  },
  combinationDivider: {
    height: 1,
    marginTop: 8,
    marginBottom: 6,
  },
  combinationRow: {
    marginTop: 2,
    marginBottom: 4,
  },
  combinationLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  combinationChips: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  combinationChipsScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 8,
    paddingVertical: 2,
  },
  combinationChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  combinationChipText: {
    fontSize: 10,
  },
  slotDynamicInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
    marginTop: 5,
  },
  slotDynamicInfoText: {
    fontSize: 10,
    flex: 1,
    lineHeight: 14,
  },
  customNoticeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  customNoticeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  customNoticeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  resetCustomBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: "transparent",
  },
  resetCustomBtnText: {
    fontSize: 10,
    fontWeight: "700",
  },

  // Modal 4: Selector Modal Styles
  selectorModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  selectorModalCard: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: 1,
    maxHeight: "85%",
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
  },
  selectorModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  selectorSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  selectorSearchInputBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 38,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  selectorSearchInput: {
    flex: 1,
    fontSize: 12,
    paddingVertical: 0,
  },
  autoRecommendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    height: 38,
  },
  autoRecommendBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  selectorLoadingBox: {
    padding: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  selectorLoadingText: {
    fontSize: 12,
  },
  selectorEmptyBox: {
    padding: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  selectorEmptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  selectorEmptySub: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
  selectorListContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 8,
  },
  selectorItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  selectorItemThumb: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.sm,
    backgroundColor: "#FFFFFF",
  },
  selectorItemInfo: {
    flex: 1,
  },
  selectorItemHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 6,
  },
  selectorItemTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  selectedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectedPillText: {
    fontSize: 8,
    fontWeight: "800",
  },
  selectorOutOfStockPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectorOutOfStockText: {
    fontSize: 8,
    fontWeight: "800",
  },
  selectorItemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  selectorItemBrand: {
    fontSize: 10,
    fontWeight: "600",
  },
  specPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  specPillText: {
    fontSize: 9,
    fontWeight: "700",
  },
  selectorItemPrice: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
  },
  selectorItemCallForPrice: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
    letterSpacing: 0.2,
  },
  addModelSlotBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 8,
    marginBottom: 4,
  },
  addModelSlotBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  // Modal 5: Cart Success Modal Styles
  cartSuccessModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.md,
  },
  cartSuccessModalCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    maxHeight: "90%",
  },
  cartSuccessHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  cartSuccessBadge: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
  },
  cartSuccessTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  cartSuccessSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: SPACING.md,
  },
  cartSuccessSummaryCard: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cartSuccessSummaryTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cartSuccessCostLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cartSuccessTotalCost: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 2,
  },
  cartSuccessTierPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  cartSuccessTierText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  cartSuccessSpecsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(150, 150, 150, 0.15)",
  },
  cartSuccessSpecPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  cartSuccessSpecText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cartSuccessItemsHeader: {
    marginBottom: 6,
  },
  cartSuccessItemsTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  cartSuccessItemsList: {
    maxHeight: 180,
    marginBottom: SPACING.md,
  },
  cartSuccessItemsListContent: {
    gap: 6,
    paddingVertical: 2,
  },
  cartSuccessItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  cartSuccessItemThumb: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.xs,
    backgroundColor: "#FFFFFF",
  },
  cartSuccessItemThumbPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  cartSuccessItemInfo: {
    flex: 1,
  },
  cartSuccessItemTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  cartSuccessItemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  cartSuccessQtyPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  cartSuccessQtyText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  cartSuccessItemBrand: {
    fontSize: 10,
    fontWeight: "600",
  },
  cartSuccessOutOfStockPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  cartSuccessOutOfStockText: {
    fontSize: 9,
    fontWeight: "800",
  },
  cartSuccessItemPriceCol: {
    alignItems: "flex-end",
  },
  cartSuccessItemPrice: {
    fontSize: 12,
    fontWeight: "800",
  },
  cartSuccessItemCallPrice: {
    fontSize: 10,
    fontWeight: "700",
  },
  cartSuccessActions: {
    gap: 8,
  },
  cartSuccessCheckoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
  },
  cartSuccessCheckoutBtnText: {
    fontSize: 14,
    fontWeight: "800",
  },
  cartSuccessKeepBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  cartSuccessKeepBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  cartPrintPdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
  },
  cartPrintPdfBtnText: {
    fontSize: 13.5,
    fontWeight: "800",
  },
  printPdfScreenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: 2,
  },
  printPdfScreenText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
});
