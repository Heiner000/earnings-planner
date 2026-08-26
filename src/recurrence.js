const DAY_MS = 24 * 60 * 60 * 1000;

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
 * Returns a timezone-independent integer representing a calendar day.
 */
function getDayNumber(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);

    return Date.UTC(year, month - 1, day) / DAY_MS;
}

/**
 * Moves a date forward or backward by a number of days.
 */
export function shiftDateKey(dateKey, days) {
    const date = parseDateKey(dateKey);

    date.setDate(date.getDate() + days);

    return createDateKey(date);
}

/**
 * Returns the number of days in a month.
 */
function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

/**
 * Adds months while preserving the intended day whenever possible.
 *
 * Example:
 * Jan 31 → Feb 28 → Mar 31
 *
 * This avoids permanently drifting to the 28th after February.
 */
function addMonthsClamped(dateKey, monthOffset) {
    const [year, month, day] = dateKey.split("-").map(Number);

    const targetMonth = new Date(year, month - 1 + monthOffset, 1);

    const targetYear = targetMonth.getFullYear();
    const targetMonthIndex = targetMonth.getMonth();

    const targetDay = Math.min(
        day,
        getDaysInMonth(targetYear, targetMonthIndex),
    );

    return createDateKey(new Date(targetYear, targetMonthIndex, targetDay));
}

/**
 * Returns the number of calendar months between two dates.
 */
function getMonthDifference(startDateKey, endDateKey) {
    const start = parseDateKey(startDateKey);
    const end = parseDateKey(endDateKey);

    return (
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth())
    );
}

/**
 * Determines whether a date belongs to the requested range.
 */
function isWithinRange(dateKey, rangeStart, rangeEnd) {
    return dateKey >= rangeStart && dateKey <= rangeEnd;
}

/**
 * Creates a virtual occurrence without modifying the stored series.
 */
function createOccurrence(transaction, date) {
    return {
        ...transaction,

        // Every generated occurrence needs a unique display ID.
        id: `${transaction.id}::${date}`,

        date,

        //! Retain the real stored transaction ID for future edit/delete-series behavior.
        sourceTransactionId: transaction.id,
        isRecurringOccurrence: true,
    };
}

/**
 * Generates weekly or biweekly occurrences.
 */
function generateDayIntervalOccurrences(
    transaction,
    rangeStart,
    rangeEnd,
    intervalDays,
) {
    const seriesStart = transaction.recurrence?.startDate ?? transaction.date;

    if (seriesStart > rangeEnd) {
        return [];
    }

    const startDay = getDayNumber(seriesStart);
    const requestedStartDay = getDayNumber(rangeStart);

    const firstOccurrenceIndex = Math.max(
        0,
        Math.ceil((requestedStartDay - startDay) / intervalDays),
    );

    let occurrenceDate = shiftDateKey(
        seriesStart,
        firstOccurrenceIndex * intervalDays,
    );

    const occurrences = [];

    while (occurrenceDate <= rangeEnd) {
        if (isWithinRange(occurrenceDate, rangeStart, rangeEnd)) {
            occurrences.push(createOccurrence(transaction, occurrenceDate));
        }

        occurrenceDate = shiftDateKey(occurrenceDate, intervalDays);
    }

    return occurrences;
}

/**
 * Generates monthly occurrences.
 */
function generateMonthlyOccurrences(transaction, rangeStart, rangeEnd) {
    const seriesStart = transaction.recurrence?.startDate ?? transaction.date;

    if (seriesStart > rangeEnd) {
        return [];
    }

    let monthOffset = Math.max(0, getMonthDifference(seriesStart, rangeStart));

    let occurrenceDate = addMonthsClamped(seriesStart, monthOffset);

    // The requested range may begin after this month's occurrence.
    if (occurrenceDate < rangeStart) {
        monthOffset += 1;

        occurrenceDate = addMonthsClamped(seriesStart, monthOffset);
    }

    const occurrences = [];

    while (occurrenceDate <= rangeEnd) {
        occurrences.push(createOccurrence(transaction, occurrenceDate));

        monthOffset += 1;

        occurrenceDate = addMonthsClamped(seriesStart, monthOffset);
    }

    return occurrences;
}

/**
 * Expands stored transactions into the occurrences required for a particular date range.
 */
export function expandRecurringTransactions(
    transactions,
    rangeStart,
    rangeEnd,
) {
    const expanded = transactions.flatMap((transaction) => {
        const frequency = transaction.recurrence?.frequency ?? "none";

        switch (frequency) {
            case "weekly":
                return generateDayIntervalOccurrences(
                    transaction,
                    rangeStart,
                    rangeEnd,
                    7,
                );

            case "biweekly":
                return generateDayIntervalOccurrences(
                    transaction,
                    rangeStart,
                    rangeEnd,
                    14,
                );

            case "monthly":
                return generateMonthlyOccurrences(
                    transaction,
                    rangeStart,
                    rangeEnd,
                );

            // Custom recurrence is intentionally deferred.
            case "custom":
            case "none":
            default:
                return isWithinRange(transaction.date, rangeStart, rangeEnd)
                    ? [transaction]
                    : [];
        }
    });

    return expanded.sort((a, b) => {
        const dateComparison = a.date.localeCompare(b.date);

        if (dateComparison !== 0) {
            return dateComparison;
        }

        return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
    });
}
