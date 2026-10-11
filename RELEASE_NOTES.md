# Release Notes — Radical Engineering Mobile

## Version 3.1.0 (Version Code: 9)
**Target Platform:** Android (Google Play Store)  
**Package Name:** `com.radicalengineering.bd`  
**Release Date:** October 2026

---

### 📱 Google Play Console "What's New" (Under 500 Characters)

#### English (Default - `en-US` / `en-GB`) — 443 Characters
```text
Welcome to Radical Engineering v3.1! What's new:

• Solar IPS Builder: Tier-1 580W solar panel suggestions with daily yield & roof area stats.
• Package Range Options: Choose between Economy, Standard, and Pro Heavy-Duty package tiers.
• Fixed Brand Filter: Smooth browsing across all brand partners.
• Enhanced Checkout: Instant order placement and delivery selection.
• App Size & Performance: DEX code optimization for faster load.
```

#### Bengali (`bn-BD`) — 420 Characters
```text
রেডিকেল ইঞ্জিনিয়ারিং v3.1 ভার্সনে স্বাগতম! নতুন আপডেটসমূহ:

• সোলার আইপিএস বিল্ডার: ৫৮০ ওয়াট সোলার প্যানেল সাজেশন, দৈনিক জেনারেশন ও ছাদ এরিয়া হিসাব।
• প্যাকেজ রেঞ্জ অপশন: বাজেট ও ওয়ারেন্টি অনুযায়ী Economy, Standard বা Pro প্যাকেজ বেছে নিন।
• ব্র্যান্ড ফিল্টার ফিক্স: সব ব্র্যান্ড পার্টনারদের প্রোডাক্ট সহজে ব্রাউজ করুন।
• দ্রুতগতির পারফরম্যান্স ও অপটিমাইজেশন।
```

---

### 🚀 Full Release Highlights (Detailed Changelog)

#### 1. ⚡ Solar IPS & System Builder
- Interactive appliance load calculator (fans, lights, refrigerator, TV, PC, router).
- Configurable backup runtime (0.5–24 hours).
- Automatic sizing for Inverter capacity (VA), battery bank voltage/Ah, and solar PV wattage.
- **Solar Panel Suggestions:** Recommends exact 580W Tier-1 panels (LONGi Hi-MO 6 / Trina Vertex), daily units (kWh/day), and shadow-free roof area (sq. ft).
- **Package Range & Tiers:** Choose between Economy (Budget Saver), Standard Hybrid (Recommended), and Premium Pro tiers with dynamic price ranges.
- Instant turnkey quote generation with one-tap add-to-cart and WhatsApp consultation.

#### 2. 🛒 Real-Time Catalog & Directus CMS
- Full integration with `@directus/sdk` live backend (`admin.atiar.com.bd`).
- Live stock availability, discount tags, and updated pricing in BDT (৳).
- Fast multi-category filtering (Solar Panels, Inverters, Batteries, Accessories).

#### 3. 🔍 Rich Product Details & Media
- Native pinch-to-zoom high-resolution image modal (`ImageZoomModal`).
- Rich text rendering for comprehensive datasheets and warranty disclosures.
- Integrated video guides and demonstrations for technical products.

#### 4. 💳 Overhauled Cart & Checkout Flow
- Complete checkout wizard with contact, delivery address, and payment options.
- Delivery options tailored for Bangladesh (Courier Service, Home Delivery, Store Pickup).
- Persistent cart storage (`AsyncStorage`) ensuring items remain saved between sessions.

#### 5. 📡 Offline-First & Network Resiliency
- Integrated NetInfo network monitor with subtle connection status banner.
- Automatic offline caching so users in low-connectivity areas can still browse products and specifications.

#### 6. 📦 Live Order Tracking
- Order status tracker supporting real-time tracking IDs.
- Multi-step progress timeline: Order Received ➔ Site Assessment ➔ Transit ➔ Installation ➔ Handover.

#### 7. 🏢 Projects Portfolio & Direct Hotlines
- Gallery of completed commercial and residential engineering installations.
- One-tap dialing for Kishoreganj HQ hotlines (`+880 1760195100`, `+880 1787224460`) and direct WhatsApp inquiries.

#### 8. ⚡ Engine & Performance Upgrades
- Upgraded to modern core: Expo SDK 57, React 19, React Native 0.86.
- Skeleton loading screens and optimistic UI interactions for instantaneous feel.

