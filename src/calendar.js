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

// The month currently being displayed.
let viewDate = new Date();

/**
 * Returns the number of days in a given month.
 *
 * Passing day 0 gives us the final day of the previous month.
 * Example:
 * new Date(2026, 8, 0) -> August 31, 2026
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
 *
 * We'll use this later when attaching transactions to calendar dates.
 */
function createDateKey(year, month, day) {
    const paddedMonth = String(month + 1).padStart(2, "0");
    const paddedDay = String(day).padStart(2, "0");

    return `${year}-${paddedMonth}-${paddedDay}`;
}

/**
 * Determines whether a calendar date represents today.
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
 * Builds one active calendar day.
 */
function createDayCell(year, month, day) {
    const dateKey = createDateKey(year, month, day);
    const today = isToday(year, month, day);

    return `
    <button
      type="button"
      data-date="${dateKey}"
      class="
        flex min-h-20
        items-start justify-start
        bg-white p-2
        text-left
        transition
        hover:bg-slate-50
        sm:min-h-28
      "
    >
      <span
        class="
          flex h-7 w-7
          items-center justify-center
          rounded-full
          text-sm font-medium
          ${today ? "bg-slate-900 text-white" : "text-slate-700"}
        "
      >
        ${day}
      </span>
    </button>
  `;
}

/**
 * Builds an empty cell used before or after the current month.
 */
function createEmptyCell() {
    return `
    <div
      class="
        min-h-20
        bg-slate-50
        p-2
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

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const monthLabel = `${MONTH_NAMES[month]} ${year}`;

    calendarHeading.textContent = monthLabel;
    overviewMonth.textContent = monthLabel;

    const cells = [];

    // Add blank cells before day 1.
    for (let i = 0; i < firstDay; i += 1) {
        cells.push(createEmptyCell());
    }

    // Add every actual day in the month.
    for (let day = 1; day <= daysInMonth; day += 1) {
        cells.push(createDayCell(year, month, day));
    }

    // Always render six calendar rows: 6 × 7 = 42 cells.
    while (cells.length < 42) {
        cells.push(createEmptyCell());
    }

    calendarGrid.innerHTML = cells.join("");
}

/**
 * Moves the calendar backward one month.
 */
function previousMonth() {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);

    renderCalendar();
}

/**
 * Moves the calendar forward one month.
 */
function nextMonth() {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);

    renderCalendar();
}

/**
 * Connects the calendar UI to its behavior.
 */
export function initializeCalendar() {
    document
        .querySelector("#previous-month")
        .addEventListener("click", previousMonth);

    document.querySelector("#next-month").addEventListener("click", nextMonth);

    renderCalendar();
}
