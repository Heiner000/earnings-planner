const DEFAULT_FIRST_PAY_PERIOD_DAYS = 7;

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
 * Determines the provisional pay-period range for a payday.
 */
function getPayPeriodBounds(paydayDate, transactions) {
    const previousPayday = transactions
        .filter(
            (transaction) =>
                transaction.type === "payday" && transaction.date < paydayDate,
        )
        .sort((a, b) => b.date.localeCompare(a.date))[0];

    const startDate = previousPayday
        ? shiftDate(previousPayday.date, 1)
        : shiftDate(paydayDate, -(DEFAULT_FIRST_PAY_PERIOD_DAYS - 1));

    return {
        startDate,
        endDate: paydayDate,
    };
}

/**
 * Calculates the gross amount represented by one Payday.
 */
export function calculatePaydayAmount(paydayDate, transactions, settings) {
    const { startDate, endDate } = getPayPeriodBounds(paydayDate, transactions);

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
