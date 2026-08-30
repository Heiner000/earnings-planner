import { describe, expect, test } from "vitest";

import { calculateShiftEarnings, calculatePaydayAmount } from "./earnings.js";

const SETTINGS = {
    hourlyRate: 25,
    regularHours: 40,
    overtimeMultiplier: 1.5,

    payPeriodFrequency: "weekly",
    paydayDelayDays: 5,
};

/**
 * Creates the minimum transaction shape required
 * by the earnings engine.
 */
function createShift(id, date, hours, createdAt = "") {
    return {
        id,
        type: "work_shift",
        date,
        hours,
        createdAt,
    };
}

describe("calculateShiftEarnings", () => {
    test("exactly 40 hours produces no overtime", () => {
        const shifts = [
            createShift("1", "2026-08-02", 8),
            createShift("2", "2026-08-03", 8),
            createShift("3", "2026-08-04", 8),
            createShift("4", "2026-08-05", 8),
            createShift("5", "2026-08-06", 8),
        ];

        const result = calculateShiftEarnings(shifts, SETTINGS);

        const totalRegular = result.reduce(
            (sum, shift) => sum + shift.regularHours,
            0,
        );

        const totalOvertime = result.reduce(
            (sum, shift) => sum + shift.overtimeHours,
            0,
        );

        expect(totalRegular).toBe(40);
        expect(totalOvertime).toBe(0);
    });

    test("the first shift beyond 40 hours becomes overtime", () => {
        const shifts = [
            createShift("1", "2026-08-02", 8),
            createShift("2", "2026-08-03", 8),
            createShift("3", "2026-08-04", 8),
            createShift("4", "2026-08-05", 8),
            createShift("5", "2026-08-06", 8),
            createShift("6", "2026-08-07", 8),
        ];

        const result = calculateShiftEarnings(shifts, SETTINGS);

        const finalShift = result.at(-1);

        expect(finalShift.regularHours).toBe(0);
        expect(finalShift.overtimeHours).toBe(8);

        expect(finalShift.grossPay).toBe(300);
    });

    test("one shift can contain both regular and overtime hours", () => {
        const shifts = [
            createShift("1", "2026-08-02", 10),
            createShift("2", "2026-08-03", 10),
            createShift("3", "2026-08-04", 10),
            createShift("4", "2026-08-05", 8),

            // Weekly total before this shift = 38.
            createShift("5", "2026-08-06", 8),
        ];

        const result = calculateShiftEarnings(shifts, SETTINGS);

        const mixedShift = result.at(-1);

        expect(mixedShift.regularHours).toBe(2);
        expect(mixedShift.overtimeHours).toBe(6);

        expect(mixedShift.regularPay).toBe(50);

        expect(mixedShift.overtimePay).toBe(225);

        expect(mixedShift.grossPay).toBe(275);
    });

    test("overtime resets when a new Sunday-Saturday week begins", () => {
        const shifts = [
            createShift("1", "2026-08-03", 40),

            // Saturday — OT
            createShift("2", "2026-08-08", 8),

            // Sunday — new workweek
            createShift("3", "2026-08-09", 8),
        ];

        const result = calculateShiftEarnings(shifts, SETTINGS);

        expect(result[1].overtimeHours).toBe(8);

        expect(result[2].regularHours).toBe(8);

        expect(result[2].overtimeHours).toBe(0);
    });

    test("month boundaries do not reset the workweek", () => {
        const shifts = [
            // Sunday Aug 30
            createShift("1", "2026-08-30", 38),

            // Monday Aug 31
            createShift("2", "2026-08-31", 4),

            // Tuesday Sep 1
            createShift("3", "2026-09-01", 8),
        ];

        const result = calculateShiftEarnings(shifts, SETTINGS);

        expect(result[1].regularHours).toBe(2);
        expect(result[1].overtimeHours).toBe(2);

        expect(result[2].regularHours).toBe(0);
        expect(result[2].overtimeHours).toBe(8);
    });

    test("year boundaries do not reset a workweek prematurely", () => {
        const shifts = [
            createShift("1", "2026-12-27", 38),
            createShift("2", "2026-12-31", 4),
            createShift("3", "2027-01-01", 8),
        ];

        const result = calculateShiftEarnings(shifts, SETTINGS);

        expect(result[1].regularHours).toBe(2);
        expect(result[1].overtimeHours).toBe(2);

        expect(result[2].overtimeHours).toBe(8);
    });
});

describe("calculatePaydayAmount", () => {
    test("pay-period boundaries do not interfere with overtime calculation", () => {
        const transactions = [
            // Sunday belongs to the OT workweek,
            // but not this paycheck.
            createShift("1", "2026-08-02", 8),

            createShift("2", "2026-08-03", 8),
            createShift("3", "2026-08-04", 8),
            createShift("4", "2026-08-05", 8),
            createShift("5", "2026-08-06", 8),
            createShift("6", "2026-08-07", 8),
        ];

        /*
         * Friday Aug 14
         * - 5-day delay
         * = pay period ends Sunday Aug 9
         *
         * Weekly pay period:
         * Aug 3 → Aug 9.
         */
        const payday = calculatePaydayAmount(
            "2026-08-14",
            transactions,
            SETTINGS,
        );

        expect(payday).toBe(1100);
    });
});
