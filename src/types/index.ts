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
  warranty: string;
  description: string;
  shortDescription?: string;
  subCategory?: string;
  sku?: string;
  tags?: string[];
  discountPercent?: number;
  features: string[];
  specs: Record<string, string>;
  isFeatured?: boolean;
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
  category: string;
  date: string;
  client?: string;
  location: string;
  capacity: string;
  image: string;
  highlights: string[];
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
  tags: string[];
  author: string;
  image: string;
}

export interface TrackingStep {
  title: string;
  description: string;
  timestamp: string;
  completed: boolean;
  current: boolean;
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
  breakdown: {
    inverter: string;
    battery: string;
    solarPanels?: string;
  };
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  customPackage?: SystemBuilderResults;
}

