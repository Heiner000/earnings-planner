const STORAGE_KEYS = {
    transactions: "earnings-planner:transactions",
    earningsSettings: "earnings-planner:earnings-settings",
};

function getTodayDateKey() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

const DEFAULT_EARNINGS_SETTINGS = {
    hourlyRate: 25,
    regularHours: 40,
    overtimeMultiplier: 1.5,
    startingBalance: 0,
    balanceStartDate: getTodayDateKey(),
};

/**
 * Safely reads JSON data from localStorage.
 *
 * If the stored data is missing or corrupted, return the provided fallback instead.
 */
function readJson(key, fallback) {
    const storedValue = localStorage.getItem(key);

    if (storedValue === null) {
        return fallback;
    }

    try {
        return JSON.parse(storedValue);
    } catch (error) {
        console.warn(`Unable to read localStorage key "${key}".`, error);

        return fallback;
    }
}

/**
 * Safely writes JSON data to localStorage.
 */
function writeJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Unable to save localStorage key "${key}".`, error);
    }
}

/**
 * Loads all saved transactions.
 */
export function loadTransactions() {
    const storedTransactions = readJson(STORAGE_KEYS.transactions, []);

    return Array.isArray(storedTransactions) ? storedTransactions : [];
}

/**
 * Saves the complete transaction collection.
 */
export function saveTransactions(transactions) {
    writeJson(STORAGE_KEYS.transactions, transactions);
}

/**
 * Loads earnings settings while ensuring all expected properties exist.
 */
export function loadEarningsSettings() {
    const storedSettings = readJson(STORAGE_KEYS.earningsSettings, {});

    return {
        ...DEFAULT_EARNINGS_SETTINGS,
        ...storedSettings,
    };
}

/**
 * Saves earnings settings.
 */
export function saveEarningsSettings(settings) {
    writeJson(STORAGE_KEYS.earningsSettings, settings);
}
