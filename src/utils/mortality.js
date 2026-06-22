// ── Type definitions (JSDoc) ──────────────────────────────────────────────────

/**
 * @typedef {Object} MortalityRecord
 * @property {number}      id
 * @property {number}      batch_id
 * @property {number}      house_id
 * @property {string}      date              - ISO date string (YYYY-MM-DD)
 * @property {number}      count             - Number of dead birds
 * @property {number|null} chicken_weight_kg - Average weight of dead birds (kg)
 * @property {string}      cause             - heat_stress | disease | injury | culling | unknown | other
 * @property {string|null} cause_notes
 * @property {string|null} recorded_by
 */

/**
 * @typedef {Object} Batch
 * @property {number}      id
 * @property {string}      batch_no
 * @property {string}      house
 * @property {string}      farm
 * @property {string}      placed_date       - ISO date string
 * @property {number}      initial_count
 * @property {number}      current_count     - Live birds (initial_count − total deaths)
 * @property {number}      age_days          - Negative when batch is pre-placement
 * @property {number}      cycle_length_days
 * @property {number}      mortality_pct
 * @property {number}      total_feed_kg
 * @property {number}      fcr               - Feed Conversion Ratio; 0 when weight data is absent
 * @property {number|null} avg_weight_g
 * @property {string}      status            - active | harvest_soon | harvested | terminated
 */

// ── Mortality utility functions ────────────────────────────────────────────────
// Market price is read from Settings (localStorage key erp_market_price_per_kg).
// Import useMarketPrice() hook to get the live value in components.
export const DEFAULT_MARKET_PRICE = 120; // ₱ per kg — fallback only

/**
 * Estimated financial loss for a single mortality record.
 * Broiler (per_kg): count × chicken_weight_kg × market_price_per_kg
 * Layer/RTL (per_bird): count × market_price_per_bird
 */
export function calcFinancialLoss(count, weightKg, marketPrice = DEFAULT_MARKET_PRICE, mode = 'per_kg') {
  if (!count || !marketPrice) return 0;
  if (mode === 'per_bird') return count * marketPrice;
  if (!weightKg) return 0;
  return count * weightKg * marketPrice;
}

/**
 * Total financial loss across all mortality records in a batch.
 */
export function calcTotalFinancialLoss(records, marketPrice = DEFAULT_MARKET_PRICE, mode = 'per_kg') {
  return records.reduce(
    (sum, r) => sum + calcFinancialLoss(r.count, r.chicken_weight_kg, marketPrice, mode),
    0,
  );
}

/**
 * Remaining live birds after all recorded deaths.
 */
export function calcCurrentBirds(initialCount, records) {
  const totalDeaths = records.reduce((s, r) => s + (r.count || 0), 0);
  return Math.max(0, initialCount - totalDeaths);
}

/**
 * Cumulative mortality rate as a percentage.
 */
export function calcMortalityRate(initialCount, records) {
  if (!initialCount) return 0;
  const totalDeaths = records.reduce((s, r) => s + (r.count || 0), 0);
  return (totalDeaths / initialCount) * 100;
}

/**
 * Days a chick had lived before it died.
 * AD = record_date − placed_date (clamped to ≥ 0).
 */
export function getAgeAtDeath(recordDate, placedDate) {
  if (!recordDate || !placedDate) return 0;
  const ms = new Date(recordDate) - new Date(placedDate);
  return Math.max(0, Math.round(ms / 86400000));
}

/**
 * Detailed mortality cost breakdown using accumulated feed & vitamin intake.
 *
 * D  – dead chick count
 * AD – age at death (days, computed via getAgeAtDeath)
 * FC – daily feed consumption per chick (kg/day)
 * VC – daily vitamin consumption per chick (mL/day)
 * PF – price per kg of feed (₱)
 * PV – price per unit of vitamins (₱)
 * PC – price per chick (₱)
 *
 * Total Mortality Loss = Feed Cost Loss + Vitamin Cost Loss + Chick Loss
 */
export function calcDetailedMortalityLoss({ D, AD, FC, VC, PF, PV, PC }) {
  const d  = Number(D)  || 0;
  const ad = Number(AD) || 0;
  const fc = Number(FC) || 0;
  const vc = Number(VC) || 0;
  const pf = Number(PF) || 0;
  const pv = Number(PV) || 0;
  const pc = Number(PC) || 0;

  const feedPerChick = fc * ad;
  const totalFeed    = feedPerChick * d;
  const vitPerChick  = vc * ad;
  const totalVit     = vitPerChick * d;
  const feedCostLoss = totalFeed * pf;
  const vitCostLoss  = totalVit * pv;
  const chickLoss    = d * pc;
  const totalLoss    = feedCostLoss + vitCostLoss + chickLoss;

  return { feedPerChick, totalFeed, vitPerChick, totalVit, feedCostLoss, vitCostLoss, chickLoss, totalLoss };
}

/**
 * Batch age status — returns a display string instead of negative numbers.
 * Used on Dashboard and BatchDetailPage.
 */
export function getBatchAgeStatus(ageDays, cycleLengthDays) {
  if (ageDays < 0) {
    return { label: `Starts in ${Math.abs(ageDays)} days`, progress: 0, isUpcoming: true };
  }
  const progress = Math.min(100, Math.round((ageDays / cycleLengthDays) * 100));
  return { label: `Day ${ageDays} of ${cycleLengthDays}`, progress, isUpcoming: false };
}
