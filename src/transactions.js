import { loadTransactions, saveTransactions } from "./storage";

const transactions = loadTransactions();
let onTransactionsChange = () => {};

const DEFAULT_LABELS = {
    work_shift: "Work Shift",
    payday: "Payday",
    bill: "Bill",
    income: "Income",
    expense: "Expense",
};

let modal;
let form;
let dateInput;
let typeInput;
let descriptionInput;
let valueGroup;
let valueLabel;
let valueInput;
let paydayMessage;
let recurrenceInput;

/**
 * Updates the form depending on the selected transaction type.
 *
 * Work shifts use hours.
 * Income, expenses, and bills use dollar amounts.
 *! Paydays will eventually be calculated by the earnings engine.
 */
function updateValueField() {
    const type = typeInput.value;
    const isWorkShift = type === "work_shift";
    const isPayday = type === "payday";

    valueGroup.classList.toggle("hidden", isPayday);
    paydayMessage.classList.toggle("hidden", !isPayday);

    valueInput.required = !isPayday;

    if (isWorkShift) {
        valueLabel.textContent = "Hours Worked";
        valueInput.step = "0.25";
        valueInput.placeholder = "8";
    } else {
        valueLabel.textContent = "Amount";
        valueInput.step = "0.01";
        valueInput.placeholder = "0.00";
    }

    if (isPayday) {
        valueInput.value = "";
    }
}

/**
 * Creates a normalized transaction object from the form.
 */
function createTransaction(formData) {
    const type = formData.get("type");
    const date = formData.get("date");
    const recurrenceFrequency = formData.get("recurrence");

    const rawValue = formData.get("value");
    const value = rawValue ? Number(rawValue) : null;

    return {
        id: crypto.randomUUID(),
        date,
        type,
        description: formData.get("description").trim() || DEFAULT_LABELS[type],

        hours: type === "work_shift" ? value : null,

        amount: ["bill", "income", "expense"].includes(type) ? value : null,

        recurrence: {
            frequency: recurrenceFrequency,
            startDate: recurrenceFrequency !== "none" ? date : null,
        },

        createdAt: new Date().toISOString(),
    };
}

/**
 * Saves a transaction to application memory.
 * */
function saveTransaction(transaction) {
    transactions.push(transaction);

    // Persist the updated collection.
    saveTransactions(transactions);

    console.log("Transaction created:");
    console.table(transactions);

    // Notify the rest of the application.
    onTransactionsChange();
}

/**
 * Closes the transaction modal.
 */
export function closeTransactionModal() {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");

    document.body.classList.remove("overflow-hidden");
}

/**
 * Opens the transaction modal for a specific calendar date.
 */
export function openTransactionModal(dateKey) {
    form.reset();

    dateInput.value = dateKey;

    updateValueField();

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");

    document.body.classList.add("overflow-hidden");

    // Move keyboard focus into the modal.
    typeInput.focus();
}

/**
 * Returns the current in-memory transaction collection.
 *
 *! We'll use this when we begin rendering transactions onto the calendar.
 */
export function getTransactions() {
    return [...transactions];
}

/**
 * Initializes all transaction modal behavior.
 */
export function initializeTransactionModal(onChange) {
    onTransactionsChange = onChange ?? (() => {});

    modal = document.querySelector("#transaction-modal");
    form = document.querySelector("#transaction-form");

    dateInput = document.querySelector("#transaction-date");
    typeInput = document.querySelector("#transaction-type");
    descriptionInput = document.querySelector("#transaction-description");

    valueGroup = document.querySelector("#transaction-value-group");
    valueLabel = document.querySelector("#transaction-value-label");
    valueInput = document.querySelector("#transaction-value");

    paydayMessage = document.querySelector("#payday-message");
    recurrenceInput = document.querySelector("#transaction-recurrence");

    const closeButton = document.querySelector("#close-transaction-modal");
    const cancelButton = document.querySelector("#cancel-transaction");
    const backdrop = document.querySelector("#transaction-backdrop");

    typeInput.addEventListener("change", updateValueField);

    closeButton.addEventListener("click", closeTransactionModal);
    cancelButton.addEventListener("click", closeTransactionModal);
    backdrop.addEventListener("click", closeTransactionModal);

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !modal.classList.contains("hidden")) {
            closeTransactionModal();
        }
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const transaction = createTransaction(formData);

        saveTransaction(transaction);
        closeTransactionModal();
    });
}
