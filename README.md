# Radical Engineering Mobile App (React Native / Expo)

A cross-platform mobile application for **Radical Engineering** (radicalengineering.com.bd), Bangladesh's premier solar energy, IPS power backup, and electrical engineering provider based in Kishoreganj.

Built with **React Native**, **Expo SDK 52**, and **TypeScript**, designed for Android, iOS, and Web.

---

## 🌟 Key Features

1. **☀️ Solar Roof Planner & ROI Calculator:**
   - Real-time rooftop capacity calculation tailored to Bangladesh solar parameters (4.5 peak sun hours, BPDB/DESCO rates).
   - Computes recommended system size (kWp), panel count (580W Tier-1 Mono PERC/Bifacial), monthly generation (kWh units), monthly and annual bill savings (৳ BDT), estimated turnkey cost, payback period, and CO2 offset.
   - One-tap "Book Free Rooftop Site Survey" via WhatsApp.

2. **⚡ Solar IPS & IPS System Builder:**
   - Interactive load calculator allowing customers to select appliances (fans, lights, LED TV, refrigerator, PC, router).
   - Configurable backup runtime (2 to 8 hours).
   - Toggle between Standard Pure Sine Wave IPS and Solar Hybrid IPS.
   - Sizes recommended Inverter rating (VA), Battery bank voltage & Ah (tubular/lithium), and required solar PV wattage.
   - Generates custom turnkey package with estimated price in ৳ BDT, addable directly to the cart.

3. **📦 Live Order Tracker:**
   - Real-time 5-stage installation timeline stepper:
     1. Order Received
     2. Engineering Site Assessment
     3. Dispatch & Transit
     4. On-site Installation & Testing
     5. Handover & Warranty Activated
   - Pre-populated test tracking samples (`RE-2026-8841` and `RE-2026-7219`).

4. **🛒 Equipment Catalog & Detail Specifications:**
   - 6 Core Categories: Solar Panels, IPS / Solar IPS, Batteries, Inverters, Cables & Connectors, Accessories.
   - Real products with prices in ৳ BDT, warranties, and complete technical specifications (open circuit voltage, short circuit current, cell type, dimensions, weight).
   - Dynamic search and category filtering.
   - Add to Cart, Buy Now, and one-tap WhatsApp consultation.

5. **📚 E-Learning & Knowledge Base:**
   - Bilingual (Bangla & English) guides on battery longevity, DM water maintenance, bifacial panel advantages, and Lightning Protection Systems (LPS).

6. **🏢 Contact & Engineering Desk:**
   - One-touch hotlines: `+880 1760195100` and `+880 1787224460`.
   - Direct office details: *1400, Hazi Hasen Ali Market, Station Road (opposite Medilab), Kishoreganj, Bangladesh*.
   - Interactive inquiry form and social channels (Facebook, YouTube).

7. **🔄 Directus Headless CMS Integration (`admin.atiar.com.bd`) with Offline-First Fallback:**
   - Synchronizes with the live backend when online.
   - Automatically falls back to embedded catalog data when offline or in rural connectivity areas.

---

## 📋 What Needs to Be Installed

### 1. Dependencies Installation
In the project directory, run:
```bash
npm install
```
*(or `pnpm install` / `yarn install`)*

### 2. Testing on Your Physical Phone (Recommended & Fastest)
You **do not need** to install Android Studio or Java to run and test this app on your phone:
1. Install **Expo Go** from Google Play Store (Android) or App Store (iOS).
2. Start the development server:
   ```bash
   npx expo start
   ```
3. Scan the QR code shown in your terminal using the Expo Go app.

### 3. Testing on Web Browser
If you want to preview the app instantly on your computer browser:
```bash
npx expo start --web
```

### 4. Optional: Native Android Local Emulator / Native APK Build
If you wish to build standalone native APKs locally via Gradle instead of Expo Go or EAS Cloud Build:
- **Java JDK 17:**
  ```bash
  sudo apt update
  sudo apt install openjdk-17-jdk
  ```
- **Android Studio / Android SDK:**
  Download Android Studio from [developer.android.com](https://developer.android.com/studio) and configure `ANDROID_HOME` in your environment.
- **Cloud Build Alternative (No local Android SDK needed):**
  Use Expo Application Services:
  ```bash
  npx eas-cli build -p android --profile preview
  ```

---

## 📁 Project Structure

```
radical-engineering-mobile/
├── App.tsx                    # Root application entry with providers
├── app.json                   # Expo application metadata & branding
├── babel.config.js            # Babel preset configuration
├── tsconfig.json              # TypeScript configuration
├── package.json               # Dependencies and build scripts
├── assets/                    # App icon, splash screen, and favicon
└── src/
    ├── types/                 # TypeScript interfaces (Product, Order, Calculator, etc.)
    ├── constants/
    │   ├── theme.ts           # Radical brand colors (Amber/Solar Orange, Dark/Light modes)
    │   ├── config.ts          # Hotlines, office address, and API endpoints
    │   └── mockData.ts        # Comprehensive catalog, projects & educational articles
    ├── services/
    │   ├── api.ts             # Directus CMS client with offline fallback
    │   └── storage.ts         # AsyncStorage for cart, wishlist & theme
    ├── context/
    │   ├── ThemeContext.tsx   # Light / Dark mode management
    │   └── CartContext.tsx    # Cart, wishlist, and custom package state
    ├── components/
    │   ├── Header.tsx         # Branded header with cart badge and call button
    │   ├── ProductCard.tsx    # Grid & list product item with pricing & specs
    │   ├── QuickActionCard.tsx# Feature navigation cards
    │   ├── BannerSlider.tsx   # Promotional banner carousel
    │   ├── CategoryChip.tsx   # Horizontal category selector
    │   └── HotlineBar.tsx     # 24/7 engineering hotline bar
    ├── screens/
    │   ├── HomeScreen.tsx
    │   ├── CatalogScreen.tsx
    │   ├── ProductDetailScreen.tsx
    │   ├── RoofPlannerScreen.tsx
    │   ├── SystemBuilderScreen.tsx
    │   ├── OrderTrackerScreen.tsx
    │   ├── ProjectsScreen.tsx
    │   ├── ELearningScreen.tsx
    │   ├── CartScreen.tsx
    │   └── ContactScreen.tsx
    └── navigation/
        ├── BottomTabs.tsx     # Bottom navigation tabs
        └── AppNavigator.tsx   # Native stack navigator
```

---

## 🚀 Running the App

```bash
# Start development server
npm start

# Run specifically on Android
npm run android

# Run specifically on Web
npm run web
```

