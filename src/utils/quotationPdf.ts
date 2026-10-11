import * as Print from "expo-print";
import { Alert } from "react-native";
import { APP_CONFIG } from "../constants/config";
import { RADICAL_LOGO_SVG } from "../constants/logoSvg";
import { Appliance, SystemBuilderResults, Product } from "../types";

export interface QuotationData {
  appliances: Appliance[];
  results: SystemBuilderResults;
  backupHours: number;
  packageTier: "economy" | "standard" | "premium";
  isSolarHybrid: boolean;
  isCustomPackage?: boolean;
  selectedItems?: { product: Product; quantity: number }[];
}

/**
 * Generate a high-quality, print-ready HTML document reflecting official Radical Engineering branding.
 */
export function generateQuotationHtml(data: QuotationData): string {
  const {
    appliances,
    results,
    backupHours,
    packageTier,
    isSolarHybrid,
    isCustomPackage = false,
    selectedItems = [],
  } = data;

  const activeAppliances = appliances.filter((a) => a.quantity > 0);
  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const quotationRef = `RE-${now.getFullYear()}-${Math.floor(
    100000 + Math.random() * 900000,
  )}`;

  // When user customized items, it's explicitly "Custom Package"
  const tierLabel = isCustomPackage
    ? "Custom Package"
    : packageTier === "premium"
      ? "Premium Pro"
      : packageTier === "economy"
        ? "Budget Economy"
        : "Standard";

  // Prepare vector logo scaled for print
  const formattedLogoSvg = RADICAL_LOGO_SVG.replace(
    '<svg width="1497" height="259"',
    '<svg width="220" height="38" style="display: block; border-radius: 4px;"',
  );

  // Build appliance rows
  const applianceRowsHtml = activeAppliances
    .map((app, idx) => {
      const totalW = app.wattage * app.quantity;
      return `
        <tr style="background-color: ${idx % 2 === 0 ? "#ffffff" : "#FAF7F5"};">
          <td style="padding: 9px 12px; border-bottom: 1px solid #E8DFD8; font-weight: 600; color: #260B00;">
            ${app.name}
          </td>
          <td style="padding: 9px 12px; border-bottom: 1px solid #E8DFD8; text-align: center; color: #6C5348;">
            ${app.wattage} W
          </td>
          <td style="padding: 9px 12px; border-bottom: 1px solid #E8DFD8; text-align: center; font-weight: 700; color: #3C1100;">
            ${app.quantity}
          </td>
          <td style="padding: 9px 12px; border-bottom: 1px solid #E8DFD8; text-align: right; font-weight: 700; color: #3C1100;">
            ${totalW} W
          </td>
        </tr>
      `;
    })
    .join("");

  // Build items rows (Inverter, Battery, Panels)
  const itemsToRender =
    selectedItems.length > 0
      ? selectedItems
      : [
          ...(results.inverterItems || []).map((it) => ({
            product: it.product,
            quantity: it.quantity,
          })),
          ...(results.batteryItems || []).map((it) => ({
            product: it.product,
            quantity: it.quantity,
          })),
          ...(isSolarHybrid && results.panelItems
            ? results.panelItems.map((it) => ({
                product: it.product,
                quantity: it.quantity,
              }))
            : []),
        ].filter((it) => it.product && it.quantity > 0);

  const componentRowsHtml = itemsToRender
    .map((it, idx) => {
      const priceText =
        it.product.price > 0
          ? `৳ ${it.product.price.toLocaleString()}`
          : "Call for Price";
      const subtotalText =
        it.product.price > 0
          ? `৳ ${(it.product.price * it.quantity).toLocaleString()}`
          : "Call for Price";

      return `
        <tr style="background-color: ${idx % 2 === 0 ? "#ffffff" : "#FAF7F5"};">
          <td style="padding: 10px 12px; border-bottom: 1px solid #E8DFD8;">
            <div style="font-weight: 700; color: #260B00; font-size: 13px;">${it.product.title}</div>
            ${
              it.product.brand
                ? `<div style="font-size: 11px; color: #6C5348; margin-top: 2px;">Brand: ${it.product.brand}</div>`
                : ""
            }
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E8DFD8; text-align: center; font-weight: 700; color: #3C1100;">
            ${it.quantity}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E8DFD8; text-align: right; color: #6C5348;">
            ${priceText}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E8DFD8; text-align: right; font-weight: 800; color: #3C1100;">
            ${subtotalText}
          </td>
        </tr>
      `;
    })
    .join("");

  // Solar gains calculations
  const dailySolarUnits = results.effectiveDailyUnits
    ? results.effectiveDailyUnits
    : results.recommendedSolarKw
      ? (results.recommendedSolarKw * 4.2).toFixed(1)
      : "3.5";
  const monthlySavingsEst = Math.round(Number(dailySolarUnits) * 30 * 8.5);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Radical Engineering - System Design & Quotation</title>
  <!-- Plus Jakarta Sans: Matches Radical Engineering brand typography -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 12mm 14mm 14mm 14mm;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #260B00;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11.5px;
      line-height: 1.45;
    }
    .header-table {
      width: 100%;
      border-bottom: 3px solid #3C1100;
      padding-bottom: 14px;
      margin-bottom: 4px;
    }
    .header-gold-line {
      height: 3px;
      background-color: #FCB974;
      margin-bottom: 16px;
      border-radius: 2px;
    }
    .brand-logo-wrap {
      margin-bottom: 8px;
    }
    .brand-sub {
      font-size: 11px;
      font-weight: 700;
      color: #3C1100;
      letter-spacing: 0.3px;
      margin-top: 2px;
      margin-bottom: 6px;
    }
    .company-details {
      font-size: 10.5px;
      color: #523A30;
      line-height: 1.4;
    }
    .company-details strong {
      color: #3C1100;
    }
    .badge-doc {
      display: inline-block;
      background: #3C1100;
      color: #FCB974;
      border: 1.5px solid #FCB974;
      font-weight: 800;
      font-size: 11px;
      padding: 5px 12px;
      border-radius: 6px;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .meta-item {
      font-size: 11px;
      color: #523A30;
      margin-bottom: 3px;
    }
    .meta-item strong {
      color: #3C1100;
    }
    .tier-badge {
      display: inline-block;
      background: #F5EBE6;
      color: #3C1100;
      border: 1px solid #FCB974;
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 800;
      font-size: 10.5px;
    }
    .summary-grid {
      display: table;
      width: 100%;
      margin-bottom: 18px;
    }
    .summary-col {
      display: table-cell;
      width: 25%;
      padding: 10px 12px;
      background: #FAF7F5;
      border: 1px solid #E8DFD8;
      border-right: none;
      box-sizing: border-box;
    }
    .summary-col:last-child {
      border-right: 1px solid #3C1100;
      background: #F5EBE6;
      border-color: #3C1100;
    }
    .summary-label {
      font-size: 9.5px;
      font-weight: 800;
      color: #6C5348;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 4px;
    }
    .summary-val {
      font-size: 15.5px;
      font-weight: 800;
      color: #260B00;
    }
    .summary-val.highlight {
      color: #3C1100;
    }
    .section-title {
      font-size: 12.5px;
      font-weight: 800;
      color: #3C1100;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 14px;
      margin-bottom: 8px;
      border-left: 4px solid #FCB974;
      padding-left: 8px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      border: 1px solid #E8DFD8;
    }
    .data-table th {
      background-color: #3C1100;
      color: #F6F2ED;
      font-weight: 700;
      font-size: 10.5px;
      padding: 9px 12px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      border-bottom: 2px solid #FCB974;
    }
    .gains-container {
      background: #FAF7F5;
      border: 1px solid #E8DFD8;
      border-left: 4px solid #3C1100;
      border-radius: 6px;
      padding: 12px 14px;
      margin-bottom: 16px;
    }
    .gain-item {
      display: table;
      width: 100%;
      margin-bottom: 8px;
    }
    .gain-item:last-child {
      margin-bottom: 0;
    }
    .gain-bullet {
      display: table-cell;
      width: 22px;
      font-weight: 900;
      color: #FCB974;
      font-size: 14px;
      vertical-align: top;
    }
    .gain-text {
      display: table-cell;
      font-size: 11.5px;
      color: #523A30;
      line-height: 1.45;
    }
    .gain-text strong {
      color: #260B00;
    }
    .store-banner {
      background: linear-gradient(135deg, #F5EBE6 0%, #FFF8F3 100%);
      border: 2px solid #3C1100;
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 16px;
    }
    .store-banner-title {
      font-size: 13.5px;
      font-weight: 900;
      color: #3C1100;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .store-banner-desc {
      font-size: 11.5px;
      font-weight: 600;
      color: #523A30;
      line-height: 1.45;
      margin-bottom: 8px;
    }
    .store-meta-grid {
      display: table;
      width: 100%;
      border-top: 1px dashed #FCB974;
      padding-top: 6px;
    }
    .store-meta-col {
      display: table-cell;
      width: 50%;
      font-size: 10.5px;
      color: #3C1100;
    }
    .footer-table {
      width: 100%;
      margin-top: 18px;
      border-top: 1px solid #E8DFD8;
      padding-top: 12px;
      font-size: 10px;
      color: #6C5348;
    }
    .sign-box {
      text-align: right;
      padding-top: 28px;
    }
    .sign-line {
      display: inline-block;
      width: 180px;
      border-top: 1.5px solid #3C1100;
      text-align: center;
      font-weight: 700;
      color: #3C1100;
      font-size: 10.5px;
      padding-top: 4px;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <table class="header-table">
    <tr>
      <td style="vertical-align: top; width: 62%;">
        <div class="brand-logo-wrap">
          ${formattedLogoSvg}
        </div>
        <div class="brand-sub">${APP_CONFIG.tagline}</div>
        <div class="company-details">
          <div><strong>Address:</strong> ${APP_CONFIG.address}</div>
          <div><strong>Hotlines:</strong> ${APP_CONFIG.hotline1} · ${APP_CONFIG.hotline2}</div>
          <div><strong>WhatsApp:</strong> ${APP_CONFIG.whatsappNumber} &nbsp;|&nbsp; <strong>Email:</strong> ${APP_CONFIG.email}</div>
          <div><strong>Website:</strong> radicalengineering.com.bd</div>
        </div>
      </td>
      <td style="vertical-align: top; width: 38%; text-align: right;">
        <div class="badge-doc">System Design & Quotation</div>
        <div class="meta-item"><strong>Ref:</strong> ${quotationRef}</div>
        <div class="meta-item"><strong>Date:</strong> ${formattedDate}</div>
        <div class="meta-item"><strong>Architecture:</strong> ${isSolarHybrid ? "Solar Hybrid IPS" : "Standard IPS"}</div>
        <div class="meta-item">
          <strong>Package Grade:</strong> 
          <span class="tier-badge">${tierLabel}</span>
        </div>
      </td>
    </tr>
  </table>
  <div class="header-gold-line"></div>

  <!-- TOP SUMMARY METRICS -->
  <div class="summary-grid">
    <div class="summary-col">
      <div class="summary-label">Connected Load</div>
      <div class="summary-val">${results.totalWatts} Watts</div>
    </div>
    <div class="summary-col">
      <div class="summary-label">Inverter Rating</div>
      <div class="summary-val">${results.recommendedVa} VA</div>
    </div>
    <div class="summary-col">
      <div class="summary-label">Backup Duration</div>
      <div class="summary-val">~${results.actualBackupHours} Hours</div>
    </div>
    <div class="summary-col">
      <div class="summary-label">Estimated Investment</div>
      <div class="summary-val highlight">৳ ${results.estimatedCostBDT.toLocaleString()}</div>
    </div>
  </div>

  <!-- SECTION 1: APPLIANCES PROFILE -->
  <div class="section-title">1. Connected Appliances & Load Requirements</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="text-align: left;">Appliance Description</th>
        <th style="text-align: center; width: 110px;">Unit Load</th>
        <th style="text-align: center; width: 90px;">Quantity</th>
        <th style="text-align: right; width: 120px;">Subtotal Wattage</th>
      </tr>
    </thead>
    <tbody>
      ${applianceRowsHtml}
      <tr style="background-color: #F5EBE6; font-weight: 800;">
        <td colspan="3" style="padding: 10px 12px; text-align: right; text-transform: uppercase; font-size: 11px; color: #3C1100;">
          Total Continuous Load:
        </td>
        <td style="padding: 10px 12px; text-align: right; color: #3C1100; font-size: 13px;">
          ${results.totalWatts} W
        </td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 2: CHOSEN EQUIPMENT -->
  <div class="section-title">2. Configured Equipment & Specifications (${tierLabel})</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="text-align: left;">Configured Equipment</th>
        <th style="text-align: center; width: 80px;">Qty</th>
        <th style="text-align: right; width: 120px;">Unit Price</th>
        <th style="text-align: right; width: 130px;">Total Price</th>
      </tr>
    </thead>
    <tbody>
      ${componentRowsHtml}
      <tr style="background-color: #F5EBE6; font-weight: 800;">
        <td colspan="3" style="padding: 10px 12px; text-align: right; text-transform: uppercase; font-size: 11px; color: #3C1100;">
          Estimated System Total:
        </td>
        <td style="padding: 10px 12px; text-align: right; color: #3C1100; font-size: 14px;">
          ৳ ${results.estimatedCostBDT.toLocaleString()}
        </td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 3: SYSTEM PERFORMANCE & GAINS -->
  <div class="section-title">3. System Performance & Expected Gains</div>
  <div class="gains-container">
    <div class="gain-item">
      <div class="gain-bullet">✓</div>
      <div class="gain-text">
        <strong>Uninterrupted Backup Power:</strong> Delivers approximately <strong>${results.actualBackupHours} hours</strong> of continuous electricity during power cuts for all your selected appliances.
      </div>
    </div>
    <div class="gain-item">
      <div class="gain-bullet">✓</div>
      <div class="gain-text">
        <strong>Pure Sine Wave Output:</strong> 100% clean power that keeps fans silent (no humming sound) and guarantees safety for delicate electronics including inverter refrigerators, LED TVs, and PCs.
      </div>
    </div>
    <div class="gain-item">
      <div class="gain-bullet">✓</div>
      <div class="gain-text">
        <strong>Extended Battery Longevity:</strong> Built with balanced ${results.batteryVoltage}V DC architecture and intelligent multi-stage charging, protecting batteries from deep discharge and maximizing operational lifespan.
      </div>
    </div>
    ${
      isSolarHybrid
        ? `
    <div class="gain-item">
      <div class="gain-bullet">✓</div>
      <div class="gain-text">
        <strong>Solar Independence & Energy Savings:</strong> Generates approximately <strong>${dailySolarUnits} kWh</strong> of free green energy every day, saving an estimated <strong>৳ ${monthlySavingsEst.toLocaleString()} per month</strong> on national grid electricity bills.
      </div>
    </div>
    `
        : `
    <div class="gain-item">
      <div class="gain-bullet">✓</div>
      <div class="gain-text">
        <strong>Microsecond Automatic Transfer:</strong> High-speed internal transfer switch guarantees that your desktop computers, Wi-Fi routers, and security cameras stay on without rebooting during power outages.
      </div>
    </div>
    `
    }
    <div class="gain-item">
      <div class="gain-bullet">✓</div>
      <div class="gain-text">
        <strong>Full Engineering Support:</strong> Complete equipment warranty, verified genuine products, and professional engineering backup from Radical Engineering.
      </div>
    </div>
  </div>

  <!-- SECTION 4: STORE VISIT INVITATION -->
  <div class="store-banner">
    <div class="store-banner-title">Come at our store to choose the best for you!</div>
    <div class="store-banner-desc">
      We invite you to visit our official showroom and engineering center in Kishoreganj. Test live working demonstrations, compare different inverter & battery brands side-by-side, and consult with our certified renewable energy engineers to customize the most reliable and cost-effective system for your home or enterprise.
    </div>
    <div class="store-meta-grid">
      <div class="store-meta-col">
        <strong>📍 Store Location:</strong> 1400, Hazi Hasen Ali Market, Station Road (opposite Medilab), Kishoreganj
      </div>
      <div class="store-meta-col" style="text-align: right;">
        <strong>🕒 Visiting Hours:</strong> Saturday – Thursday: 9:00 AM – 8:00 PM<br>
        <strong>📞 Hotline & WhatsApp:</strong> ${APP_CONFIG.hotline1} / ${APP_CONFIG.hotline2}
      </div>
    </div>
  </div>

  <!-- FOOTER & SIGNATURE -->
  <table class="footer-table">
    <tr>
      <td style="vertical-align: top; width: 60%;">
        <div>• Prices are subject to market stock availability at time of final order.</div>
        <div>• 100% genuine components backed by official brand warranties.</div>
        <div>• Generated via Radical Engineering Mobile App • radicalengineering.com.bd</div>
      </td>
      <td style="vertical-align: top; width: 40%; text-align: right;">
        <div class="sign-box">
          <div class="sign-line">Authorized Signatory<br>Radical Engineering</div>
        </div>
      </td>
    </tr>
  </table>

</body>
</html>
  `;
}

/**
 * Directly print the official Radical Engineering system quotation.
 * Immediately invokes the native print dialog/spooler without popups.
 */
export async function executePrintOrShareQuotation(
  data: QuotationData,
): Promise<void> {
  const html = generateQuotationHtml(data);
  try {
    await Print.printAsync({ html });
  } catch (err) {
    console.error("Print error:", err);
    Alert.alert(
      "Print Error",
      "Unable to open system print dialog. Please ensure your device supports printing.",
    );
  }
}
