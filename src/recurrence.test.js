import { describe, expect, test } from "vitest";

import { expandRecurringTransactions } from "./recurrence.js";

import { calculateShiftEarnings } from "./earnings.js";

const SETTINGS = {
    hourlyRate: 25,
    regularHours: 40,
    overtimeMultiplier: 1.5,
    payPeriodFrequency: "weekly",
    paydayDelayDays: 5,
};

/**
 * Creates a recurring work-shift series.
 */
function createRecurringShift({
    id = "series-1",
    date,
    hours = 8,
    frequency = "weekly",
    excludedDates = [],
}) {
    return {
        id,
        type: "work_shift",
        date,
        hours,
        description: "Work Shift",

        recurrence: {
            frequency,
            startDate: date,
            excludedDates,
        },

        createdAt: "2026-01-01T00:00:00.000Z",
    };
}

describe("expandRecurringTransactions", () => {
    test("weekly recurrence expands on seven-day intervals", () => {
        const transactions = [
            createRecurringShift({
                date: "2026-08-03",
                frequency: "weekly",
            }),
        ];

        const result = expandRecurringTransactions(
            transactions,
            "2026-08-01",
            "2026-08-31",
        );

        expect(result.map((item) => item.date)).toEqual([
            "2026-08-03",
            "2026-08-10",
            "2026-08-17",
            "2026-08-24",
            "2026-08-31",
        ]);
    });

    test("biweekly recurrence expands every fourteen days", () => {
        const transactions = [
            createRecurringShift({
                date: "2026-08-03",
                frequency: "biweekly",
            }),
        ];

        const result = expandRecurringTransactions(
            transactions,
            "2026-08-01",
            "2026-09-15",
        );

        expect(result.map((item) => item.date)).toEqual([
            "2026-08-03",
            "2026-08-17",
            "2026-08-31",
            "2026-09-14",
        ]);
    });

    test("excluded recurring occurrence is not generated", () => {
        const transactions = [
            createRecurringShift({
                date: "2026-08-03",
                excludedDates: ["2026-08-17"],
            }),
        ];

        const result = expandRecurringTransactions(
            transactions,
            "2026-08-01",
            "2026-08-31",
        );

        expect(result.map((item) => item.date)).toEqual([
            "2026-08-03",
            "2026-08-10",
            "2026-08-24",
            "2026-08-31",
        ]);
    });

    test("recurring occurrences keep the source transaction ID", () => {
        const transactions = [
            createRecurringShift({
                id: "work-series",
                date: "2026-08-03",
            }),
        ];

        const result = expandRecurringTransactions(
            transactions,
            "2026-08-01",
            "2026-08-10",
        );

        expect(result).toHaveLength(2);

        expect(result[0].sourceTransactionId).toBe("work-series");

        expect(result[1].sourceTransactionId).toBe("work-series");

        expect(result[0].id).not.toBe(result[1].id);
    });
});

describe("monthly recurrence", () => {
    test("January 31 clamps to February but returns to the 31st afterward", () => {
        const transactions = [
            createRecurringShift({
                date: "2027-01-31",
                frequency: "monthly",
            }),
        ];

        const result = expandRecurringTransactions(
            transactions,
            "2027-01-01",
            "2027-04-30",
        );

        expect(result.map((item) => item.date)).toEqual([
            "2027-01-31",
            "2027-02-28",
            "2027-03-31",
            "2027-04-30",
        ]);
    });

    test("monthly recurrence handles leap-year February", () => {
        const transactions = [
            createRecurringShift({
                date: "2028-01-31",
                frequency: "monthly",
            }),
        ];

        const result = expandRecurringTransactions(
            transactions,
            "2028-01-01",
            "2028-03-31",
        );

        expect(result.map((item) => item.date)).toEqual([
            "2028-01-31",
            "2028-02-29",
            "2028-03-31",
        ]);
    });

    test("monthly recurrence starting on February 29 clamps in non-leap years", () => {
        const transactions = [
            createRecurringShift({
                date: "2028-02-29",
                frequency: "monthly",
            }),
        ];

        const result = expandRecurringTransactions(
            transactions,
            "2028-02-01",
            "2029-03-31",
        );

        const february2029 = result.find((item) =>
            item.date.startsWith("2029-02"),
        );

        expect(february2029.date).toBe("2029-02-28");
    });
});

describe("recurring work shifts and overtime", () => {
    test("recurring shifts are evaluated independently in their actual workweeks", () => {
        const recurringShift = createRecurringShift({
            id: "weekly-shift",
            date: "2026-08-03",
            hours: 8,
            frequency: "weekly",
        });

        /*
         * First week:
         * 32 additional hours + recurring 8 = 40.
         *
         * Second week:
         * 40 additional hours occur before recurring shift,
         * so recurring occurrence becomes overtime.
         */
        const transactions = [
            recurringShift,

            {
                id: "a",
                type: "work_shift",
                date: "2026-08-02",
                hours: 8,
            },
            {
                id: "b",
                type: "work_shift",
                date: "2026-08-04",
                hours: 8,
            },
            {
                id: "c",
                type: "work_shift",
                date: "2026-08-05",
                hours: 8,
            },
            {
                id: "d",
                type: "work_shift",
                date: "2026-08-06",
                hours: 8,
            },

            {
                id: "e",
                type: "work_shift",
                date: "2026-08-09",
                hours: 10,
            },
            {
                id: "f",
                type: "work_shift",
                date: "2026-08-09",
                hours: 10,
                createdAt: "2026-01-01T01:00:00.000Z",
            },
            {
                id: "g",
                type: "work_shift",
                date: "2026-08-09",
                hours: 10,
                createdAt: "2026-01-01T02:00:00.000Z",
            },
            {
                id: "h",
                type: "work_shift",
                date: "2026-08-09",
                hours: 10,
                createdAt: "2026-01-01T03:00:00.000Z",
            },
        ];

        const expanded = expandRecurringTransactions(
            transactions,
            "2026-08-02",
            "2026-08-16",
        );

        const earnings = calculateShiftEarnings(expanded, SETTINGS);

        const recurringOccurrences = earnings.filter((shift) =>
            shift.transactionId.startsWith("weekly-shift::"),
        );

        expect(recurringOccurrences).toHaveLength(2);

        expect(recurringOccurrences[0].date).toBe("2026-08-03");

        expect(recurringOccurrences[0].overtimeHours).toBe(0);

        expect(recurringOccurrences[1].date).toBe("2026-08-10");

        expect(recurringOccurrences[1].overtimeHours).toBe(8);
    });
});

describe("detached recurring occurrence behavior", () => {
    test("excluded original plus standalone replacement does not duplicate", () => {
        const series = createRecurringShift({
            id: "weekly-series",
            date: "2026-08-03",
            hours: 8,
            excludedDates: ["2026-08-17"],
        });

        const detachedOccurrence = {
            id: "detached-1",
            type: "work_shift",
            date: "2026-08-17",
            hours: 10,
            description: "Work Shift",

            recurrence: {
                frequency: "none",
                startDate: null,
                excludedDates: [],
            },

            createdAt: "2026-08-17T12:00:00.000Z",
        };

        const result = expandRecurringTransactions(
            [series, detachedOccurrence],
            "2026-08-01",
            "2026-08-31",
        );

        const august17Transactions = result.filter(
            (item) => item.date === "2026-08-17",
        );

        expect(august17Transactions).toHaveLength(1);

        expect(august17Transactions[0].hours).toBe(10);

        expect(august17Transactions[0].id).toBe("detached-1");
    });
});
