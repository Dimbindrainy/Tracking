const insertButton = document.getElementById("insertButton");
const incomeModal = document.getElementById("incomeModal");
const closeModal = document.getElementById("closeModal");
const incomeForm = document.getElementById("incomeForm");
const incomeTableBody = document.getElementById("incomeTableBody");

const paidAmount = document.getElementById("paidAmount");
const leftToPay = document.getElementById("leftToPay");
const totalToPay = document.getElementById("totalToPay");

const searchInput = document.getElementById("searchInput");

let allTransactions = [];


// =========================
// MODAL
// =========================

insertButton.addEventListener("click", function () {
    incomeModal.style.display = "flex";
});

closeModal.addEventListener("click", function () {
    incomeModal.style.display = "none";
});

incomeModal.addEventListener("click", function (event) {
    if (event.target === incomeModal) {
        incomeModal.style.display = "none";
    }
});


// =========================
// FORMATTERS
// =========================

function formatMoney(amount) {
    return Number(amount).toLocaleString("nb-NO", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }) + " kr";
}


function formatDate(dateString) {
    const parts = dateString.split("-");

    if (parts.length !== 3) {
        return dateString;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}


// =========================
// FETCH TRANSACTIONS
// =========================

async function loadTransactions() {
    try {
        const response = await fetch("/api/transactions");

        if (!response.ok) {
            throw new Error("Could not load transactions");
        }

        const transactions = await response.json();

        allTransactions = transactions
            .filter(transaction => transaction.type === "income")
            .sort((a, b) => {
                return new Date(b.date) - new Date(a.date);
            });

        renderTransactions();

    } catch (error) {
        console.error("Error loading transactions:", error);
    }
}


// =========================
// RENDER TABLE
// =========================

function renderTransactions() {
    const searchTerm = searchInput.value
        .trim()
        .toLowerCase();

    const filteredTransactions = allTransactions.filter(transaction => {

        return (
            transaction.description
                .toLowerCase()
                .includes(searchTerm)

            ||

            String(transaction.amount)
                .includes(searchTerm)

            ||

            formatDate(transaction.date)
                .includes(searchTerm)
        );
    });


    incomeTableBody.innerHTML = "";


    if (filteredTransactions.length === 0) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td colspan="4" class="empty-table">
                No transactions found
            </td>
        `;

        incomeTableBody.appendChild(row);

        return;
    }


    filteredTransactions.forEach(function (transaction) {

        const row = document.createElement("tr");

        const dateCell = document.createElement("td");
        const descriptionCell = document.createElement("td");
        const amountCell = document.createElement("td");
        const actionCell = document.createElement("td");

        dateCell.textContent = formatDate(transaction.date);
        descriptionCell.textContent = transaction.description;
        amountCell.textContent = formatMoney(transaction.amount);

        const deleteButton = document.createElement("button");

        deleteButton.textContent = "Delete";
        deleteButton.classList.add("deleteButton");

        deleteButton.addEventListener("click", function () {
            deleteTransaction(transaction.id);
        });

        actionCell.appendChild(deleteButton);

        row.appendChild(dateCell);
        row.appendChild(descriptionCell);
        row.appendChild(amountCell);
        row.appendChild(actionCell);

        incomeTableBody.appendChild(row);
    });
}


// =========================
// SEARCH
// =========================

searchInput.addEventListener("input", function () {
    renderTransactions();
});


// =========================
// SAVE INCOME
// =========================

incomeForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const date = document.getElementById("date").value;
    const description = document.getElementById("description").value.trim();
    const amount = document.getElementById("amount").value;

    const newIncome = {
        type: "income",
        date: date,
        description: description,
        amount: parseFloat(amount),
        category: ""
    };

    try {
        const response = await fetch("/api/transactions", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(newIncome)
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Could not save income");
            return;
        }

        incomeForm.reset();

        incomeModal.style.display = "none";

        await loadTransactions();
        await loadSummary();

    } catch (error) {
        console.error("Error saving income:", error);
    }
});


// =========================
// DELETE
// =========================

async function deleteTransaction(id) {

    const confirmed = confirm(
        "Are you sure you want to delete this income?"
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`/api/transactions/${id}`, {
            method: "DELETE"
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Could not delete transaction");
            return;
        }

        await loadTransactions();
        await loadSummary();

    } catch (error) {
        console.error("Error deleting transaction:", error);
    }
}


// =========================
// SUMMARY
// =========================

async function loadSummary() {
    try {
        const response = await fetch("/api/summary");

        if (!response.ok) {
            throw new Error("Could not load summary");
        }

        const summary = await response.json();

        const total = 2100;
        const paid = Number(summary.income);
        const left = Math.max(total - paid, 0);

        paidAmount.textContent = formatMoney(paid);
        leftToPay.textContent = formatMoney(left);
        totalToPay.textContent = formatMoney(total);

    } catch (error) {
        console.error("Error loading summary:", error);
    }
}


// =========================
// INITIAL LOAD
// =========================

loadTransactions();
loadSummary();