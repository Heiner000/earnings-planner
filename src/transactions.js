import { loadTransactions, saveTransactions } from "./storage.js";

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
let modalHeading;

let dateInput;
let typeInput;
let descriptionInput;

let valueGroup;
let valueLabel;
let valueInput;
let paydayMessage;

let recurrenceGroup;
let recurrenceInput;

let editScopeGroup;
let editScopeInput;

let submitButton;
let deleteButton;

/*
 * null = adding a new transaction.
 *
 * Otherwise contains the transaction currently being edited
 * and, when relevant, its stored recurring-series transaction.
 */
let editingContext = null;

/**
 * Finds one real transaction stored in application state.
 */
function findStoredTransaction(id) {
    return transactions.find((transaction) => transaction.id === id);
}

/**
 * Saves application state and refreshes dependent UI.
 */
function persistTransactions() {
    saveTransactions(transactions);
    onTransactionsChange();
}

/**
 * Updates the amount/hours field for the selected transaction type.
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
 * Gets the editable numeric value from a transaction.
 */
function getTransactionValue(transaction) {
    if (transaction.type === "work_shift") {
        return transaction.hours;
    }

    return transaction.amount;
}

/**
 * Populates the modal with an existing transaction.
 */
function populateForm(transaction) {
    dateInput.value = transaction.date;

    typeInput.value = transaction.type;

    descriptionInput.value = transaction.description ?? "";

    recurrenceInput.value = transaction.recurrence?.frequency ?? "none";

    updateValueField();

    const value = getTransactionValue(transaction);

    valueInput.value = value ?? "";
}

/**
 * Builds a normalized stored transaction from form data.
 *
 * existingTransaction is supplied when updating an existing
 * transaction so its ID and creation timestamp are retained.
 */
function buildTransaction(
    formData,
    { existingTransaction = null, forceRecurrence = null } = {},
) {
    const type = formData.get("type");

    const date = formData.get("date");

    const selectedRecurrence = forceRecurrence ?? formData.get("recurrence");

    const rawValue = formData.get("value");

    const value = rawValue ? Number(rawValue) : null;

    const existingExcludedDates =
        existingTransaction?.recurrence?.excludedDates ?? [];

    return {
        id: existingTransaction?.id ?? crypto.randomUUID(),

        date,

        type,

        description: formData.get("description").trim() || DEFAULT_LABELS[type],

        hours: type === "work_shift" ? value : null,

        amount: ["bill", "income", "expense"].includes(type) ? value : null,

        recurrence: {
            frequency: selectedRecurrence,

            startDate: selectedRecurrence !== "none" ? date : null,

            excludedDates:
                selectedRecurrence !== "none" ? [...existingExcludedDates] : [],
        },

        createdAt: existingTransaction?.createdAt ?? new Date().toISOString(),
    };
}

/**
 * Replaces one stored transaction.
 */
function replaceStoredTransaction(updatedTransaction) {
    const index = transactions.findIndex(
        (transaction) => transaction.id === updatedTransaction.id,
    );

    if (index === -1) {
        return;
    }

    transactions[index] = updatedTransaction;
}

/**
 * Removes one stored transaction.
 */
function removeStoredTransaction(id) {
    const index = transactions.findIndex(
        (transaction) => transaction.id === id,
    );

    if (index === -1) {
        return;
    }

    transactions.splice(index, 1);
}

/**
 * Prevents one recurring occurrence from being generated.
 */
function excludeRecurringOccurrence(sourceTransactionId, occurrenceDate) {
    const sourceTransaction = findStoredTransaction(sourceTransactionId);

    if (!sourceTransaction) {
        return;
    }

    const excludedDates = sourceTransaction.recurrence?.excludedDates ?? [];

    if (excludedDates.includes(occurrenceDate)) {
        return;
    }

    sourceTransaction.recurrence = {
        ...sourceTransaction.recurrence,

        excludedDates: [...excludedDates, occurrenceDate].sort(),
    };
}

/**
 * Opens the visible modal.
 */
function showModal() {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");

    document.body.classList.add("overflow-hidden");

    typeInput.focus();
}

/**
 * Configures the form for adding a new transaction.
 */
function configureAddMode() {
    editingContext = null;

    modalHeading.textContent = "Add Transaction";

    submitButton.textContent = "Add Transaction";

    deleteButton.classList.add("hidden");

    editScopeGroup.classList.add("hidden");

    recurrenceGroup.classList.remove("hidden");
}

/**
 * Configures the form for editing a transaction.
 */
function configureEditMode() {
    modalHeading.textContent = "Edit Transaction";

    submitButton.textContent = "Save Changes";

    deleteButton.classList.remove("hidden");

    if (editingContext.isRecurringOccurrence) {
        editScopeGroup.classList.remove("hidden");

        editScopeInput.value = "occurrence";

        /*
         * A single occurrence cannot itself remain recurring.
         * It becomes a standalone transaction if edited.
         */
        recurrenceGroup.classList.add("hidden");
    } else {
        editScopeGroup.classList.add("hidden");

        recurrenceGroup.classList.remove("hidden");
    }
}

/**
 * Saves edits to one transaction or recurring occurrence.
 */
function saveEditedTransaction(formData) {
    if (!editingContext) {
        return;
    }

    const { displayedTransaction, sourceTransaction, isRecurringOccurrence } =
        editingContext;

    /*
     * Normal transaction.
     */
    if (!isRecurringOccurrence) {
        const storedTransaction = findStoredTransaction(
            displayedTransaction.id,
        );

        if (!storedTransaction) {
            return;
        }

        const updatedTransaction = buildTransaction(formData, {
            existingTransaction: storedTransaction,
        });

        replaceStoredTransaction(updatedTransaction);

        persistTransactions();

        return;
    }

    /*
     * Entire recurring series.
     */
    if (editScopeInput.value === "series") {
        const storedSeries = findStoredTransaction(sourceTransaction.id);

        if (!storedSeries) {
            return;
        }

        const updatedSeries = buildTransaction(formData, {
            existingTransaction: storedSeries,
        });

        replaceStoredTransaction(updatedSeries);

        persistTransactions();

        return;
    }

    /*
     * Single recurring occurrence.
     *
     * 1. Exclude the original generated occurrence.
     * 2. Save the edited version as a standalone transaction.
     */
    excludeRecurringOccurrence(sourceTransaction.id, displayedTransaction.date);

    const detachedTransaction = buildTransaction(formData, {
        forceRecurrence: "none",
    });

    transactions.push(detachedTransaction);

    persistTransactions();
}

/**
 * Deletes the currently edited transaction.
 */
function deleteEditedTransaction() {
    if (!editingContext) {
        return;
    }

    const { displayedTransaction, sourceTransaction, isRecurringOccurrence } =
        editingContext;

    if (!isRecurringOccurrence) {
        const confirmed = window.confirm("Delete this transaction?");

        if (!confirmed) {
            return;
        }

        removeStoredTransaction(displayedTransaction.id);

        persistTransactions();

        closeTransactionModal();

        return;
    }

    /*
     * Delete the complete recurring series.
     */
    if (editScopeInput.value === "series") {
        const confirmed = window.confirm(
            "Delete this entire recurring series?",
        );

        if (!confirmed) {
            return;
        }

        removeStoredTransaction(sourceTransaction.id);

        persistTransactions();

        closeTransactionModal();

        return;
    }

    /*
     * Delete only this generated occurrence.
     */
    const confirmed = window.confirm("Delete only this occurrence?");

    if (!confirmed) {
        return;
    }

    excludeRecurringOccurrence(sourceTransaction.id, displayedTransaction.date);

    persistTransactions();

    closeTransactionModal();
}

/**
 * Closes the transaction modal.
 */
export function closeTransactionModal() {
    modal.classList.add("hidden");

    modal.setAttribute("aria-hidden", "true");

    document.body.classList.remove("overflow-hidden");

    editingContext = null;
}

/**
 * Opens the modal for a new transaction.
 */
export function openTransactionModal(dateKey) {
    form.reset();

    configureAddMode();

    dateInput.value = dateKey;

    updateValueField();

    showModal();
}

/**
 * Opens an existing calendar transaction for editing.
 */
export function openEditTransactionModal(transaction) {
    form.reset();

    const sourceTransactionId =
        transaction.sourceTransactionId ?? transaction.id;

    const sourceTransaction = findStoredTransaction(sourceTransactionId);

    if (!sourceTransaction) {
        return;
    }

    editingContext = {
        displayedTransaction: transaction,

        sourceTransaction,

        isRecurringOccurrence: transaction.isRecurringOccurrence === true,
    };

    configureEditMode();

    /*
     * Begin by displaying the actual occurrence that
     * the user clicked.
     */
    populateForm(transaction);

    showModal();
}

/**
 * Returns all currently stored transactions.
 */
export function getTransactions() {
    return [...transactions];
}

/**
 * Initializes transaction modal behavior.
 */
export function initializeTransactionModal(onChange) {
    onTransactionsChange = onChange ?? (() => {});

    modal = document.querySelector("#transaction-modal");

    form = document.querySelector("#transaction-form");

    modalHeading = document.querySelector("#transaction-modal-heading");

    dateInput = document.querySelector("#transaction-date");

    typeInput = document.querySelector("#transaction-type");

    descriptionInput = document.querySelector("#transaction-description");

    valueGroup = document.querySelector("#transaction-value-group");

    valueLabel = document.querySelector("#transaction-value-label");

    valueInput = document.querySelector("#transaction-value");

    paydayMessage = document.querySelector("#payday-message");

    recurrenceGroup = document.querySelector("#transaction-recurrence-group");

    recurrenceInput = document.querySelector("#transaction-recurrence");

    editScopeGroup = document.querySelector("#transaction-edit-scope-group");

    editScopeInput = document.querySelector("#transaction-edit-scope");

    submitButton = document.querySelector("#transaction-submit-button");

    deleteButton = document.querySelector("#delete-transaction");

    const closeButton = document.querySelector("#close-transaction-modal");

    const cancelButton = document.querySelector("#cancel-transaction");

    const backdrop = document.querySelector("#transaction-backdrop");

    typeInput.addEventListener("change", updateValueField);

    /*
     * Switching between occurrence/series reloads
     * the corresponding transaction data.
     */
    editScopeInput.addEventListener("change", () => {
        if (!editingContext || !editingContext.isRecurringOccurrence) {
            return;
        }

        if (editScopeInput.value === "series") {
            populateForm(editingContext.sourceTransaction);

            recurrenceGroup.classList.remove("hidden");
        } else {
            populateForm(editingContext.displayedTransaction);

            recurrenceGroup.classList.add("hidden");
        }
    });

    closeButton.addEventListener("click", closeTransactionModal);

    cancelButton.addEventListener("click", closeTransactionModal);

    backdrop.addEventListener("click", closeTransactionModal);

    deleteButton.addEventListener("click", deleteEditedTransaction);

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !modal.classList.contains("hidden")) {
            closeTransactionModal();
        }
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const formData = new FormData(form);

        /*
         * Edit existing transaction.
         */
        if (editingContext) {
            saveEditedTransaction(formData);

            closeTransactionModal();

            return;
        }

        /*
         * Create new transaction.
         */
        const transaction = buildTransaction(formData);

        transactions.push(transaction);

        persistTransactions();

        closeTransactionModal();
    });
}
