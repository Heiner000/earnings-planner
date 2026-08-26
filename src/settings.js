import { loadEarningsSettings, saveEarningsSettings } from "./storage.js";

let earningsSettings = loadEarningsSettings();

/**
 * Returns a copy of the current earnings settings.
 */
export function getEarningsSettings() {
    return {
        ...earningsSettings,
    };
}

/**
 * Initializes the earnings settings controls.
 */
export function initializeEarningsSettings(onChange) {
    const onSettingsChange = onChange ?? (() => {});
    const hourlyRateInput = document.querySelector("#hourly-rate");

    const regularHoursInput = document.querySelector("#regular-hours");

    const overtimeMultiplierInput = document.querySelector(
        "#overtime-multiplier",
    );
    const startingBalanceInput = document.querySelector("#starting-balance");

    const balanceStartDateInput = document.querySelector("#balance-start-date");

    // Populate the controls from saved settings.
    hourlyRateInput.value = earningsSettings.hourlyRate;

    regularHoursInput.value = earningsSettings.regularHours;

    overtimeMultiplierInput.value = earningsSettings.overtimeMultiplier;

    startingBalanceInput.value = earningsSettings.startingBalance;

    balanceStartDateInput.value = earningsSettings.balanceStartDate;

    /**
     * Reads valid values from the UI and persists them.
     */
    function updateSettings() {
        const inputs = [
            hourlyRateInput,
            regularHoursInput,
            overtimeMultiplierInput,
            startingBalanceInput,
            balanceStartDateInput,
        ];

        // Don't save while one of the number fields contains an incomplete or invalid value.
        const hasInvalidInput = inputs.some(
            (input) => input.value === "" || !input.checkValidity(),
        );

        if (hasInvalidInput) {
            return;
        }

        earningsSettings = {
            hourlyRate: Number(hourlyRateInput.value),

            regularHours: Number(regularHoursInput.value),

            overtimeMultiplier: Number(overtimeMultiplierInput.value),

            startingBalance: Number(startingBalanceInput.value),

            balanceStartDate: balanceStartDateInput.value,
        };

        saveEarningsSettings(earningsSettings);
        // Recalculates anythign that depends on earnings settings.
        onSettingsChange();
    }

    hourlyRateInput.addEventListener("input", updateSettings);

    regularHoursInput.addEventListener("input", updateSettings);

    overtimeMultiplierInput.addEventListener("input", updateSettings);

    startingBalanceInput.addEventListener("input", updateSettings);

    balanceStartDateInput.addEventListener("input", updateSettings);
}
