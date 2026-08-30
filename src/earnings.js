/**
 * Converts YYYY-MM-DD into a local Date object.
 */
function parseDateKey(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);

    return new Date(year, month - 1, day);
}

/**
 * Converts a Date object into YYYY-MM-DD.
 */
function createDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

/**
 * Moves a YYYY-MM-DD date by the requested number of days.
 */
function shiftDate(dateKey, days) {
    const date = parseDateKey(dateKey);

    date.setDate(date.getDate() + days);

    return createDateKey(date);
}

/**
 * Returns the Sunday that begins the workweek containing dateKey.
 */
function getWeekStart(dateKey) {
    const date = parseDateKey(dateKey);

    date.setDate(date.getDate() - date.getDay());

    return createDateKey(date);
}

/**
 * Rounds currency calculations to cents.
 */
function roundMoney(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates earnings for every individual work shift.
 *
 * Overtime is determined across the entire Sunday-Saturday week, rather than independently for each shift.
 */
export function calculateShiftEarnings(transactions, settings) {
    const hourlyRate = Math.max(0, Number(settings.hourlyRate) || 0);
    const regularHoursLimit = Math.max(0, Number(settings.regularHours) || 0);
    const overtimeMultiplier = Math.max(
        1,
        Number(settings.overtimeMultiplier) || 1,
    );

    const workShifts = transactions
        .filter(
            (transaction) =>
                transaction.type === "work_shift" &&
                Number.isFinite(Number(transaction.hours)),
        )
        .map((transaction) => ({
            ...transaction,
            hours: Math.max(0, Number(transaction.hours)),
            weekStart: getWeekStart(transaction.date),
        }))
        .sort((a, b) => {
            const dateComparison = a.date.localeCompare(b.date);

            if (dateComparison !== 0) {
                return dateComparison;
            }

            return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
        });

    const weeklyHoursWorked = {};

    return workShifts.map((shift) => {
        const hoursAlreadyWorked = weeklyHoursWorked[shift.weekStart] ?? 0;

        const regularHoursRemaining = Math.max(
            0,
            regularHoursLimit - hoursAlreadyWorked,
        );

        const regularHours = Math.min(shift.hours, regularHoursRemaining);

        const overtimeHours = Math.max(0, shift.hours - regularHours);

        const regularPay = regularHours * hourlyRate;

        const overtimePay = overtimeHours * hourlyRate * overtimeMultiplier;

        weeklyHoursWorked[shift.weekStart] = hoursAlreadyWorked + shift.hours;

        return {
            transactionId: shift.id,
            date: shift.date,
            weekStart: shift.weekStart,

            hours: shift.hours,
            regularHours,
            overtimeHours,

            regularPay: roundMoney(regularPay),
            overtimePay: roundMoney(overtimePay),
            grossPay: roundMoney(regularPay + overtimePay),
        };
    });
}

/**
 * Adds derived earnings information to work-shift transactions.
 *
 * Stored transaction data is never mutated.
 * Overtime status is calculated independently for each occurrence.
 */
export function applyCalculatedShiftEarnings(transactions, settings) {
    const shiftEarnings = calculateShiftEarnings(transactions, settings);

    const earningsByTransactionId = new Map(
        shiftEarnings.map((shift) => [shift.transactionId, shift]),
    );

    return transactions.map((transaction) => {
        if (transaction.type !== "work_shift") {
            return transaction;
        }

        const earnings = earningsByTransactionId.get(transaction.id);

        if (!earnings) {
            return transaction;
        }

        return {
            ...transaction,

            regularHours: earnings.regularHours,
            overtimeHours: earnings.overtimeHours,

            regularPay: earnings.regularPay,
            overtimePay: earnings.overtimePay,
            grossPay: earnings.grossPay,

            // Display-only derived state.
            isOvertime: earnings.overtimeHours > 0,
        };
    });
}

/**
 * Creates earnings summaries for each workweek.
 */
export function calculateWeeklyEarnings(transactions, settings) {
    const shiftEarnings = calculateShiftEarnings(transactions, settings);

    const weeks = {};

    shiftEarnings.forEach((shift) => {
        if (!weeks[shift.weekStart]) {
            weeks[shift.weekStart] = {
                weekStart: shift.weekStart,
                totalHours: 0,
                regularHours: 0,
                overtimeHours: 0,
                regularPay: 0,
                overtimePay: 0,
                grossPay: 0,
            };
        }

        const week = weeks[shift.weekStart];

        week.totalHours += shift.hours;
        week.regularHours += shift.regularHours;
        week.overtimeHours += shift.overtimeHours;
        week.regularPay += shift.regularPay;
        week.overtimePay += shift.overtimePay;
        week.grossPay += shift.grossPay;
    });

    return Object.values(weeks).map((week) => ({
        ...week,
        regularPay: roundMoney(week.regularPay),
        overtimePay: roundMoney(week.overtimePay),
        grossPay: roundMoney(week.grossPay),
    }));
}

/**
 * Returns the configured pay-period length.
 */
function getPayPeriodLengthDays(settings) {
    switch (settings.payPeriodFrequency) {
        case "biweekly":
            return 14;

        case "weekly":
        default:
            return 7;
    }
}

/**
 * Determines which pay period belongs to a payday.
 *
 * Example:
 *
 * Weekly pay period
 * Payday Friday
 * Delay = 5
 *
 * Friday - 5 days = previous Sunday
 *
 * The resulting pay period is:
 * Monday → Sunday
 */
export function getPayPeriodBounds(paydayDate, settings) {
    const periodDays = getPayPeriodLengthDays(settings);

    const paydayDelayDays = Math.max(
        0,
        Math.floor(Number(settings.paydayDelayDays) || 0),
    );

    const endDate = shiftDate(paydayDate, -paydayDelayDays);

    const startDate = shiftDate(endDate, -(periodDays - 1));

    return {
        startDate,
        endDate,
    };
}

/**
 * Calculates the gross amount represented by one Payday.
 */
export function calculatePaydayAmount(paydayDate, transactions, settings) {
    const { startDate, endDate } = getPayPeriodBounds(paydayDate, settings);

    // Calculate against ALL shifts first so overtime remains accurate even if a pay period crosses workweek boundaries.
    const shiftEarnings = calculateShiftEarnings(transactions, settings);

    const grossPay = shiftEarnings
        .filter((shift) => shift.date >= startDate && shift.date <= endDate)
        .reduce((total, shift) => total + shift.grossPay, 0);

    return roundMoney(grossPay);
}

/**
 * Returns transactions with calculated Payday amounts.
 *
 * Saved transaction data is never mutated.
 */
export function applyCalculatedPaydays(transactions, settings) {
    return transactions.map((transaction) => {
        if (transaction.type !== "payday") {
            return transaction;
        }

        return {
            ...transaction,
            amount: calculatePaydayAmount(
                transaction.date,
                transactions,
                settings,
            ),
        };
    });
}
