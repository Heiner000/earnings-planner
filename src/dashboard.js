const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
});

/**
 * Safely updates one dashboard value.
 */
function setCurrencyValue(selector, value) {
    const element = document.querySelector(selector);

    if (!element) {
        return;
    }

    element.textContent = currencyFormatter.format(value);
}

/**
 * Renders the summary dashboard.
 */
export function renderDashboard(summary) {
    if (!summary) {
        return;
    }

    setCurrencyValue("#weekly-income", summary.weeklyIncome);

    setCurrencyValue("#weekly-expenses", summary.weeklyExpenses);

    setCurrencyValue("#monthly-income", summary.monthlyIncome);

    setCurrencyValue("#monthly-expenses", summary.monthlyExpenses);

    setCurrencyValue("#projected-balance", summary.projectedBalance);
}
