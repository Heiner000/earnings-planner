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

    const payPeriodFrequencyInput = document.querySelector(
        "#pay-period-frequency",
    );

    const paydayDelayDaysInput = document.querySelector("#payday-delay-days");

    // Populate the controls from saved settings.
    hourlyRateInput.value = earningsSettings.hourlyRate;

    regularHoursInput.value = earningsSettings.regularHours;

    overtimeMultiplierInput.value = earningsSettings.overtimeMultiplier;

    startingBalanceInput.value = earningsSettings.startingBalance;

    balanceStartDateInput.value = earningsSettings.balanceStartDate;

    payPeriodFrequencyInput.value = earningsSettings.payPeriodFrequency;

    paydayDelayDaysInput.value = earningsSettings.paydayDelayDays;

    /**
     * Reads valid values from the UI and persists them.
     */
    function updateSettings() {
        const inputs = [
            hourlyRateInput,
            regularHoursInput,
            overtimeMultiplierInput,
            payPeriodFrequencyInput,
            paydayDelayDaysInput,
            startingBalanceInput,
            balanceStartDateInput,
        ];

        /*
         * Let the HTML constraints reject:
         * - blank required fields
         * - values outside min/max
         * - invalid step values
         */
        const hasInvalidInput = inputs.some(
            (input) => input.value === "" || !input.checkValidity(),
        );

        if (hasInvalidInput) {
            return;
        }

        /*
         * Only known pay-period values may be persisted.
         * This protects against malformed DOM/local input.
         */
        const validPayPeriodFrequencies = ["weekly", "biweekly"];

        if (
            !validPayPeriodFrequencies.includes(payPeriodFrequencyInput.value)
        ) {
            return;
        }

        /*
         * Payday delay represents whole calendar days.
         */
        const paydayDelayDays = Number(paydayDelayDaysInput.value);

        if (!Number.isInteger(paydayDelayDays)) {
            return;
        }

        earningsSettings = {
            hourlyRate: Number(hourlyRateInput.value),

            regularHours: Number(regularHoursInput.value),

            overtimeMultiplier: Number(overtimeMultiplierInput.value),

            payPeriodFrequency: payPeriodFrequencyInput.value,

            paydayDelayDays,

            startingBalance: Number(startingBalanceInput.value),

            balanceStartDate: balanceStartDateInput.value,
        };

        saveEarningsSettings(earningsSettings);

        // Recalculate anything dependent on earnings settings.
        onSettingsChange();
    }

    hourlyRateInput.addEventListener("input", updateSettings);

    regularHoursInput.addEventListener("input", updateSettings);

    overtimeMultiplierInput.addEventListener("input", updateSettings);

    startingBalanceInput.addEventListener("input", updateSettings);

    balanceStartDateInput.addEventListener("input", updateSettings);

    payPeriodFrequencyInput.addEventListener("change", updateSettings);

    paydayDelayDaysInput.addEventListener("input", updateSettings);
}
