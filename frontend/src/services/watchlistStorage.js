/**
 * Watchlist LocalStorage Service
 * Backed by localStorage under key "stocksense_watchlist" (array of ticker strings).
 * Structured for easy future migration to a per-user MongoDB collection.
 */

const STORAGE_KEY = 'stocksense_watchlist';
const LISTS_META_KEY = 'stocksense_watchlists_meta';

// Initial default stocks for first-time visitors
const DEFAULT_INITIAL_TICKERS = ['HDFCBANK.NS', 'TATASTEEL.NS', 'GAIL.NS'];

/**
 * Normalizes ticker symbol to ensure uppercase and proper format
 */
export const normalizeTicker = (ticker) => {
  if (!ticker || typeof ticker !== 'string') return '';
  const trimmed = ticker.trim().toUpperCase();
  if (trimmed.includes('.')) return trimmed;
  return `${trimmed}.NS`;
};

/**
 * Retrieves the ticker array for a specific list.
 * Default list uses 'stocksense_watchlist' directly.
 */
export const getWatchlist = (listId = 'default') => {
  try {
    const key = listId === 'default' ? STORAGE_KEY : `${STORAGE_KEY}_${listId}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (listId === 'default') {
        // Initialize with default tickers on first run
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_TICKERS));
        return [...DEFAULT_INITIAL_TICKERS];
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load watchlist from localStorage:', err);
    return listId === 'default' ? [...DEFAULT_INITIAL_TICKERS] : [];
  }
};

/**
 * Adds a ticker string to the specified watchlist.
 * Prevents duplicates. Returns updated array of ticker strings.
 */
export const addToWatchlist = (ticker, listId = 'default') => {
  if (!ticker) return getWatchlist(listId);
  const normalized = normalizeTicker(ticker);
  const current = getWatchlist(listId);

  if (!current.includes(normalized)) {
    const updated = [...current, normalized];
    const key = listId === 'default' ? STORAGE_KEY : `${STORAGE_KEY}_${listId}`;
    try {
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save to watchlist:', err);
    }
    return updated;
  }

  return current;
};

/**
 * Removes a ticker string from the specified watchlist.
 * Returns updated array of ticker strings.
 */
export const removeFromWatchlist = (ticker, listId = 'default') => {
  if (!ticker) return getWatchlist(listId);
  const normalized = normalizeTicker(ticker);
  const current = getWatchlist(listId);
  const updated = current.filter((item) => item !== normalized && item !== ticker);

  const key = listId === 'default' ? STORAGE_KEY : `${STORAGE_KEY}_${listId}`;
  try {
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to remove from watchlist:', err);
  }
  return updated;
};

/**
 * Reorders tickers in the specified watchlist.
 */
export const saveWatchlistOrder = (tickers, listId = 'default') => {
  const key = listId === 'default' ? STORAGE_KEY : `${STORAGE_KEY}_${listId}`;
  try {
    localStorage.setItem(key, JSON.stringify(tickers));
  } catch (err) {
    console.error('Failed to save watchlist order:', err);
  }
  return tickers;
};

/**
 * Returns all named watchlists metadata
 */
export const getNamedLists = () => {
  try {
    const raw = localStorage.getItem(LISTS_META_KEY);
    if (!raw) {
      const defaultLists = [{ id: 'default', name: 'My Watchlist' }];
      localStorage.setItem(LISTS_META_KEY, JSON.stringify(defaultLists));
      return defaultLists;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [{ id: 'default', name: 'My Watchlist' }];
  } catch (err) {
    return [{ id: 'default', name: 'My Watchlist' }];
  }
};

/**
 * Creates a new named watchlist
 */
export const createNamedList = (name) => {
  const cleanName = (name || '').trim();
  if (!cleanName) return null;
  const currentLists = getNamedLists();
  const id = `list_${Date.now()}`;
  const newList = { id, name: cleanName };
  const updated = [...currentLists, newList];
  try {
    localStorage.setItem(LISTS_META_KEY, JSON.stringify(updated));
    localStorage.setItem(`${STORAGE_KEY}_${id}`, JSON.stringify([]));
  } catch (err) {
    console.error('Failed to create named watchlist:', err);
  }
  return newList;
};

/**
 * Deletes a named watchlist (cannot delete 'default')
 */
export const deleteNamedList = (listId) => {
  if (listId === 'default') return false;
  const currentLists = getNamedLists();
  const updated = currentLists.filter((l) => l.id !== listId);
  try {
    localStorage.setItem(LISTS_META_KEY, JSON.stringify(updated));
    localStorage.removeItem(`${STORAGE_KEY}_${listId}`);
  } catch (err) {
    console.error('Failed to delete named list:', err);
  }
  return true;
};
