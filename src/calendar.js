const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

const TRANSACTION_STYLES = {
    work_shift: "bg-blue-100 text-blue-800",
    payday: "bg-violet-100 text-violet-800",
    bill: "bg-amber-100 text-amber-800",
    income: "bg-emerald-100 text-emerald-800",
    expense: "bg-red-100 text-red-800",
};

const OVERTIME_SHIFT_STYLE =
    "border-2 border-orange-500 bg-blue-100 text-blue-800";

const VISIBLE_TRANSACTION_LIMIT = 4;

const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
});

// The month currently being displayed.
let viewDate = new Date();

// // Function used to retrieve the latest transactions.
// let transactionProvider = () => [];

let viewDataProvider = () => ({
    transactions: [],
    dailyBalances: {},
    summary: null,
});

let onSummaryChange = () => { };

let onTransactionSelect = () => {};

let currentTransactionsById = new Map();

/**
 * Returns the number of days in a given month.
 */
function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

/**
 * Returns the weekday index for the first day of a month.
 *
 * Sunday = 0
 * Monday = 1
 * ...
 * Saturday = 6
 */
function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}

/**
 * Creates a YYYY-MM-DD date string.
 */
function createDateKey(year, month, day) {
    const paddedMonth = String(month + 1).padStart(2, "0");
    const paddedDay = String(day).padStart(2, "0");

    return `${year}-${paddedMonth}-${paddedDay}`;
}

/**
 * Determines whether a calendar date is today.
 */
function isToday(year, month, day) {
    const today = new Date();

    return (
        year === today.getFullYear() &&
        month === today.getMonth() &&
        day === today.getDate()
    );
}

/**
 * Escapes user-entered text before inserting it into HTML.
 */
function escapeHtml(value) {
    const characters = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    };

    return String(value).replace(
        /[&<>"']/g,
        (character) => characters[character],
    );
}

/**
 * Formats the useful value shown for a transaction.
 */
function formatTransactionValue(transaction) {
    switch (transaction.type) {
        case "work_shift":
            return `${transaction.hours}h`;

        case "income":
            return `+${currencyFormatter.format(transaction.amount)}`;

        case "bill":
        case "expense":
            return `-${currencyFormatter.format(transaction.amount)}`;

        case "payday":
            return transaction.amount !== null
                ? `+${currencyFormatter.format(transaction.amount)}`
                : "Payday";

        default:
            return "";
    }
}

/**
 * Creates the visual indicator for a single transaction.
 */
function createTransactionEntry(transaction) {
    const isOvertimeShift =
        transaction.type === "work_shift" && transaction.overtimeHours > 0;

    const style = isOvertimeShift
        ? OVERTIME_SHIFT_STYLE
        : (TRANSACTION_STYLES[transaction.type] ??
          "bg-slate-100 text-slate-800");

    const transactionId = escapeHtml(transaction.id);

    /*
     * Overtime Shift is display state only.
     * The underlying transaction remains work_shift.
     */
    const displayDescription = isOvertimeShift
        ? "Overtime Shift"
        : transaction.description;

    const description = escapeHtml(displayDescription);
    const value = escapeHtml(formatTransactionValue(transaction));

    return `
        <div
            data-transaction-id="${transactionId}"
            class="
                cursor-pointer
                w-full overflow-hidden rounded
                px-1.5 py-1
                text-xs font-medium
                ${style}
            "
        >
            <div class="flex items-center justify-between gap-1">
                <span class="hidden min-w-0 truncate sm:block">
                    ${description}
                </span>

                <span class="shrink-0">
                    ${value}
                </span>
            </div>
        </div>
    `;
}

/**
 * Groups transactions by their YYYY-MM-DD date.
 *
 * Example:
 *
 * {
 *   "2026-08-25": [transaction, transaction],
 *   "2026-08-26": [transaction]
 * }
 */
function groupTransactionsByDate(transactions) {
    return transactions.reduce((grouped, transaction) => {
        if (!grouped[transaction.date]) {
            grouped[transaction.date] = [];
        }

        grouped[transaction.date].push(transaction);

        return grouped;
    }, {});
}

/**
 * Builds one active calendar day.
 */
function createDayCell(
    year,
    month,
    day,
    transactions = [],
    runningBalance = null,
) {
    const dateKey = createDateKey(year, month, day);
    const today = isToday(year, month, day);

    const visibleTransactions = transactions.slice(
        0,
        VISIBLE_TRANSACTION_LIMIT,
    );

    const remainingCount = transactions.length - visibleTransactions.length;

    const transactionEntries = visibleTransactions
        .map(createTransactionEntry)
        .join("");

    const moreIndicator =
        remainingCount > 0
            ? `
                <div
                    class="
                        w-full px-1
                        text-left text-xs
                        font-medium text-slate-500
                    "
                >
                    +${remainingCount} more
                </div>
            `
            : "";

    return `
        <button
            type="button"
            data-date="${dateKey}"
            class="
                flex min-h-20
                flex-col items-start
                gap-1
                overflow-hidden
                bg-white p-2
                text-left
                transition
                hover:bg-slate-50
                sm:min-h-28
            "
        >
<div
    class="
        flex w-full
        items-center gap-1.5
    "
>
    <span
        class="
            flex h-7 w-7 shrink-0
            items-center justify-center
            rounded-full
            text-sm font-medium
            ${today ? "bg-slate-900 text-white" : "text-slate-700"}
        "
    >
        ${day}
    </span>

    <span
        class="
            min-w-0 truncate
            text-[10px]
            font-medium
            ${runningBalance < 0 ? "text-red-500" : "text-slate-400"}
            sm:text-xs
        "
        title="${
            runningBalance !== null
                ? currencyFormatter.format(runningBalance)
                : ""
        }"
    >
        ${
            runningBalance !== null
                ? compactCurrencyFormatter.format(runningBalance)
                : ""
        }
    </span>
</div>

            <div class="flex w-full flex-col gap-1">
                ${transactionEntries}
                ${moreIndicator}
            </div>
        </button>
    `;
}

/**
 * Builds an empty calendar cell.
 */
function createEmptyCell() {
    return `
        <div
            class="
                min-h-20
                bg-slate-50 p-2
                sm:min-h-28
            "
            aria-hidden="true"
        ></div>
    `;
}

/**
 * Renders the currently selected month.
 */
function renderCalendar() {
    const calendarGrid = document.querySelector("#calendar-grid");

    const calendarHeading = document.querySelector("#calendar-heading");

    const overviewMonth = document.querySelector("#overview-month");

    if (!calendarGrid) {
        return;
    }

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const monthLabel = `${MONTH_NAMES[month]} ${year}`;

    calendarHeading.textContent = monthLabel;
    overviewMonth.textContent = monthLabel;

    const rangeStart = createDateKey(year, month, 1);

    const rangeEnd = createDateKey(year, month, daysInMonth);

    const { transactions, dailyBalances, summary } = viewDataProvider({
        startDate: rangeStart,
        endDate: rangeEnd,
    });

    currentTransactionsById = new Map(
        transactions.map((transaction) => [transaction.id, transaction]),
    );

    onSummaryChange(summary);

    const transactionsByDate = groupTransactionsByDate(transactions);

    const cells = [];

    // Empty cells before the first day.
    for (let i = 0; i < firstDay; i += 1) {
        cells.push(createEmptyCell());
    }

    // Actual days.
    for (let day = 1; day <= daysInMonth; day += 1) {
        const dateKey = createDateKey(year, month, day);

        const dayTransactions = transactionsByDate[dateKey] ?? [];

        cells.push(
            createDayCell(
                year,
                month,
                day,
                dayTransactions,
                dailyBalances[dateKey] ?? null,
            ),
        );
    }

    // Always display six calendar rows.
    while (cells.length < 42) {
        cells.push(createEmptyCell());
    }

    calendarGrid.innerHTML = cells.join("");
}

/**
 * Moves backward one month.
 */
function previousMonth() {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);

    renderCalendar();
}

/**
 * Moves forward one month.
 */
function nextMonth() {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);

    renderCalendar();
}

/**
 * Allows another module to request a calendar rerender.
 */
export function refreshCalendar() {
    renderCalendar();
}

/**
 * Connects the calendar UI to application behavior.
 */
export function initializeCalendar({
    onDateSelect,
    onTransactionSelect: transactionSelectHandler,
    getViewData,
    onSummaryUpdate,
}) {
    const calendarGrid = document.querySelector("#calendar-grid");

    // Save the transaction provider so future renders
    // always use current application data.
    // transactionProvider = getTransactions ?? (() => []);
    viewDataProvider =
        getViewData ??
        (() => ({
            transactions: [],
            dailyBalances: {},
            summary: null,
        }));

    onSummaryChange = onSummaryUpdate ?? (() => {});

    onTransactionSelect = transactionSelectHandler ?? (() => {});

    document
        .querySelector("#previous-month")
        .addEventListener("click", previousMonth);

    document.querySelector("#next-month").addEventListener("click", nextMonth);

    // One listener handles all calendar-day clicks.
    calendarGrid.addEventListener("click", (event) => {
        /*
         * Transaction clicks take priority over the
         * surrounding calendar-day click.
         */
        const transactionEntry = event.target.closest("[data-transaction-id]");

        if (transactionEntry) {
            const transaction = currentTransactionsById.get(
                transactionEntry.dataset.transactionId,
            );

            if (transaction) {
                onTransactionSelect(transaction);
            }

            return;
        }

        const dayButton = event.target.closest("[data-date]");

        if (!dayButton) {
            return;
        }

        onDateSelect(dayButton.dataset.date);
    });

    renderCalendar();
}
