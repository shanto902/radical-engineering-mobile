export interface ProductDoc {
  id: string;
  title: string;
  filename: string;
  type: 'datasheet' | 'manual' | 'pdf' | 'document';
  url: string;
  filesize?: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  brand: string;
  model: string;
  price: number;
  originalPrice?: number;
  inStock: boolean;
  rating: number;
  reviewsCount: number;
  image: string;
  images?: string[];
  wattage?: string;
  voltage?: string;
  warranty?: string;
  weight?: string;
  description: string;
  rawDescription?: string;
  shortDescription?: string;
  subCategory?: string;
  sku?: string;
  tags?: string[];
  discountPercent?: number;
  features: string[];
  specs: Record<string, string>;
  isFeatured?: boolean;
  datasheet?: ProductDoc;
  userManual?: ProductDoc;
  documents?: ProductDoc[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  itemCount: number;
  image?: string;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  body?: string;
  shortDescription?: string;
  category: string;
  date: string;
  dateCreated?: string;
  client?: string;
  location: string;
  capacity: string;
  image: string;
  images?: string[];
  videos?: { link: string }[];
  highlights: string[];
  sort?: number;
}

export interface ELearningArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  readTime: string;
  publishedDate: string;
  excerpt: string;
  content: string[];
  bodyHtml?: string;
  tags: string[];
  author: string;
  image: string;
  downloadUrl?: string;
  downloadFilename?: string;
}

export interface TrackingStep {
  title: string;
  description: string;
  timestamp: string;
  completed: boolean;
  current: boolean;
}

export interface TrackedOrderItem {
  id?: string;
  productName: string;
  quantity: number;
}

export interface TrackedOrder {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  status: string; // 'pending' | 'placed' | 'processing' | 'shipped' | 'delivered' | 'cancel'
  placedAt: string;
  total: number;
  items: TrackedOrderItem[];
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  items: {
    productTitle: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  status: 'received' | 'consultation' | 'in_transit' | 'installation' | 'completed';
  date: string;
  trackingSteps: TrackingStep[];
}

export type RoofType = 'flat_rcc' | 'tin_shed' | 'sloped';
export type GridType = 'on_grid' | 'hybrid' | 'off_grid';

export interface RoofPlannerInputs {
  roofAreaSqFt: number;
  monthlyBillBDT: number;
  roofType: RoofType;
  gridType: GridType;
}

export interface RoofPlannerResults {
  recommendedKw: number;
  panelCount: number;
  panelWattage: number;
  monthlyGenerationKwh: number;
  monthlySavingsBDT: number;
  annualSavingsBDT: number;
  estimatedCostMin: number;
  estimatedCostMax: number;
  paybackYears: number;
  co2OffsetTons: number;
}

export interface Appliance {
  id: string;
  name: string;
  wattage: number;
  quantity: number;
  icon: string;
}

export interface SystemBuilderResults {
  totalWatts: number;
  recommendedVa: number;
  requiredWattHours: number;
  recommendedBatteryAh: number;
  batteryVoltage: number;
  batteryCount: number;
  recommendedSolarKw?: number;
  estimatedCostBDT: number;
  estimatedCostMinBDT?: number;
  estimatedCostMaxBDT?: number;
  packageTier?: 'economy' | 'standard' | 'premium';
  solarRange?: 'essential' | 'balanced' | 'max';
  solarDetails?: {
    panelCount: number;
    panelWattage: number;
    totalWatts: number;
    panelBrand: string;
    dailyUnitsKwh: number;
    roofSpaceSqFt: number;
    warranty: string;
  };
  breakdown: {
    inverter: string;
    battery: string;
    solarPanels?: string;
  };
  activeInverterProduct?: Product;
  activeBatteryProduct?: Product;
  activePanelProduct?: Product;
  inverterProvidedVa?: number;
  inverterProvidedWatts?: number;
  batteryProvidedAh?: number;
  actualBackupHours?: number;
  headroomPercent?: number;
  isSafeHeadroom?: boolean;
  tierPrices?: {
    economy: number;
    standard: number;
    premium: number;
  };
  solarOptionPrices?: {
    essential: number;
    balanced: number;
    max: number;
  };
  solarOptionCounts?: {
    essential: number;
    balanced: number;
    max: number;
  };
  seriesBatteryCount?: number;
  minVoltageString?: number;
  recommendedBatteryCount?: number;
  effectiveInverterCount?: number;
  effectiveBatteryCount?: number;
  effectivePanelCount?: number;
  effectiveParallelBanks?: number;
  effectiveActualBackupHours?: number;
  effectiveSolarKw?: number;
  effectiveDailyUnits?: number;
  effectiveRoofSpaceSqFt?: number;
  isCustomizedQuantities?: boolean;
  inverterItems?: BuilderSlotItem[];
  batteryItems?: BuilderSlotItem[];
  panelItems?: BuilderSlotItem[];
  primaryInverterQty?: number;
  secondaryInverterProduct?: Product;
  secondaryInverterQty?: number;
  hasInverterCombination?: boolean;
  totalInverterVa?: number;
  totalInverterWatts?: number;
  primaryBatteryQty?: number;
  secondaryBatteryProduct?: Product;
  secondaryBatteryQty?: number;
  hasBatteryCombination?: boolean;
  primaryPanelQty?: number;
  secondaryPanelProduct?: Product;
  secondaryPanelQty?: number;
  hasPanelCombination?: boolean;
}

export interface BuilderSlotItem {
  product: Product;
  quantity: number;
  va?: number;
  watts?: number;
  ah?: number;
  wh?: number;
  totalWatts?: number;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  customPackage?: SystemBuilderResults;
}

export interface GoogleReview {
  id: string;
  authorName: string;
  authorAvatar?: string;
  rating: number;
  text: string;
  publishedAt?: string;
}

export interface GoogleReviewsSummary {
  rating: number;
  totalReviews: number;
  writeAReviewUrl?: string;
  reviews: GoogleReview[];
}

export interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  cta: string;
  image: string;
  buttonLink?: string;
  targetScreen?: string;
}

export interface BrandPartner {
  id: string;
  name: string;
  logo?: string;
  link?: string;
}

export interface ExtraCharge {
  name: string;
  cost: string;
}

export interface DirectusSettings {
  last_revalidate_time?: string | number | null;
  delivery_charge?: number | null;
  per_kg_charge?: number | null;
  [key: string]: any;
}

export interface PaginatedProductsResponse {
  products: Product[];
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface GetProductsParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  brand?: string;
  search?: string;
  sortBy?: 'default' | 'price_asc' | 'price_desc';
  forceRefresh?: boolean;
}

