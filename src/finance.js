/**
 * Converts YYYY-MM-DD into a local Date.
 */
function parseDateKey(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);

    return new Date(year, month - 1, day);
}

/**
 * Converts a Date into YYYY-MM-DD.
 */
function createDateKey(date) {
    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

/**
 * Moves a date by a number of days.
 */
function shiftDateKey(dateKey, days) {
    const date = parseDateKey(dateKey);

    date.setDate(date.getDate() + days);

    return createDateKey(date);
}

/**
 * Prevents floating-point currency drift.
 */
function roundMoney(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Returns the financial effect of one transaction.
 *
 * Work shifts do not directly affect account balance.
 */
function getTransactionImpact(transaction) {
    const amount = Number(transaction.amount) || 0;

    switch (transaction.type) {
        case "payday":
        case "income":
            return amount;

        case "bill":
        case "expense":
            return -amount;

        case "work_shift":
        default:
            return 0;
    }
}

/**
 * Returns the current Sunday-Saturday week.
 */
export function getCurrentWeekRange() {
    const today = new Date();

    const start = new Date(today);

    start.setDate(today.getDate() - today.getDay());

    const end = new Date(start);

    end.setDate(start.getDate() + 6);

    return {
        startDate: createDateKey(start),
        endDate: createDateKey(end),
    };
}

/**
 * Calculates income and expenses within a date range.
 */
function calculateTotals(transactions, startDate, endDate) {
    return transactions.reduce(
        (totals, transaction) => {
            if (transaction.date < startDate || transaction.date > endDate) {
                return totals;
            }

            const amount = Number(transaction.amount) || 0;

            if (
                transaction.type === "income" ||
                transaction.type === "payday"
            ) {
                totals.income += amount;
            }

            if (transaction.type === "bill" || transaction.type === "expense") {
                totals.expenses += amount;
            }

            return totals;
        },
        {
            income: 0,
            expenses: 0,
        },
    );
}

/**
 * Calculates the projected end-of-day balance.
 *
 * startingBalance represents the opening balance at the beginning of balanceStartDate.
 */
export function calculateBalanceAtEndOfDay(transactions, settings, dateKey) {
    const startingBalance = Number(settings.startingBalance) || 0;

    const anchorDate = settings.balanceStartDate;

    /**
     * Moving forward from the anchor:
     *
     * starting balance + all financial activity through dateKey
     */
    if (dateKey >= anchorDate) {
        const netChange = transactions.reduce((total, transaction) => {
            if (transaction.date < anchorDate || transaction.date > dateKey) {
                return total;
            }

            return total + getTransactionImpact(transaction);
        }, 0);

        return roundMoney(startingBalance + netChange);
    }

    /*
     * Moving backward from the anchor.
     *
     * This lets previous calendar months still display mathematically consistent balances.
     */
    const laterActivity = transactions.reduce((total, transaction) => {
        if (transaction.date <= dateKey || transaction.date >= anchorDate) {
            return total;
        }

        return total + getTransactionImpact(transaction);
    }, 0);

    return roundMoney(startingBalance - laterActivity);
}

/**
 * Calculates an end-of-day balance for every date in the displayed calendar month.
 */
function calculateDailyBalances(transactions, settings, rangeStart, rangeEnd) {
    const balances = {};

    let dateKey = rangeStart;

    while (dateKey <= rangeEnd) {
        balances[dateKey] = calculateBalanceAtEndOfDay(
            transactions,
            settings,
            dateKey,
        );

        dateKey = shiftDateKey(dateKey, 1);
    }

    return balances;
}

/**
 * Builds all financial information required by one calendar view.
 */
export function calculateViewFinances(
    transactions,
    settings,
    viewStart,
    viewEnd,
) {
    const currentWeek = getCurrentWeekRange();

    const weekly = calculateTotals(
        transactions,
        currentWeek.startDate,
        currentWeek.endDate,
    );

    const monthly = calculateTotals(transactions, viewStart, viewEnd);

    const dailyBalances = calculateDailyBalances(
        transactions,
        settings,
        viewStart,
        viewEnd,
    );

    return {
        dailyBalances,

        summary: {
            weeklyIncome: roundMoney(weekly.income),

            weeklyExpenses: roundMoney(weekly.expenses),

            monthlyIncome: roundMoney(monthly.income),

            monthlyExpenses: roundMoney(monthly.expenses),

            projectedBalance: dailyBalances[viewEnd] ?? 0,
        },
    };
}
