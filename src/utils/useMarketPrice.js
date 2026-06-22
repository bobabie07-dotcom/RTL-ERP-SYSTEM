import { useState, useCallback } from 'react';

const STORAGE_KEY = 'erp_market_price_per_kg';
const FALLBACK    = 120; // ₱/kg — only used if Settings has never been saved

export function getStoredMarketPrice() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = parseFloat(raw);
  return !isNaN(parsed) && parsed > 0 ? parsed : FALLBACK;
}

export function setStoredMarketPrice(price) {
  localStorage.setItem(STORAGE_KEY, String(price));
}

/**
 * Custom hook — returns [marketPrice, setMarketPrice].
 * Changes are persisted to localStorage so they survive page reloads
 * and are shared across MortalityPage, Reports, and any future consumer.
 */
export function useMarketPrice() {
  const [price, setPrice] = useState(getStoredMarketPrice);

  const persist = useCallback((newPrice) => {
    const p = parseFloat(newPrice);
    if (!isNaN(p) && p > 0) {
      setStoredMarketPrice(p);
      setPrice(p);
    }
  }, []);

  return [price, persist];
}
