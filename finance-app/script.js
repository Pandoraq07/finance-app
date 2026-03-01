
const authUser = JSON.parse(localStorage.getItem("authUser"));

    if (!authUser || !authUser.isLoggedIn) {
        window.location.href = "../login_auth/login.html";
    }
const EXPENSES_KEY = `expenses_${authUser.email}`;

let expenses = JSON.parse(localStorage.getItem(EXPENSES_KEY)) || [];
let editingId = null;

const expenseForm = document.getElementById('expenseForm');
const tableBody = document.querySelector('table tbody');
const totalSpent = document.querySelector('.summary div:nth-child(1) p');
const thisMonth = document.querySelector('.summary div:nth-child(2) p');
const topCategory = document.querySelector('.summary div:nth-child(3) p');
const resetBtn = document.getElementById('reset-btn');
const dateInput = document.getElementById('expense-date');
const submitBtn = expenseForm.querySelector('button[type="submit"]');
const logoutBtn = document.getElementById("logoutBtn");

const today = new Date().toISOString().split('T')[0];
dateInput.max = today;

function toISODate(dateStr) {
  if (!dateStr) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  if (/^\d{2}[\/-]\d{2}[\/-]\d{4}$/.test(dateStr)) {
    const parts = dateStr.split(/[\/-]/);
    const [dd, mm, yyyy] = parts;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const [mm, dd, yyyy] = dateStr.split("/");
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  return dateStr;
}
function parseISOToLocalDate(isoStr) {
  const [y, m, d] = isoStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateForDisplay(dateStr) {
  const iso = toISODate(dateStr);
  const d = parseISOToLocalDate(iso);
  return d.toLocaleDateString("en-GB"); // dd/mm/yyyy
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("authUser");
        window.location.href = "../login_auth/login.html";
    });
}

function formatMoney(amount) {
  return new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

expenseForm.addEventListener('submit', function(e){
    e.preventDefault();

    const amount = parseFloat(expenseForm.querySelector('input[type="number"]').value);
    const category = expenseForm.querySelector('select').value;
    const rawDate = expenseForm.querySelector('input[type="date"]').value;
    const date = toISODate(rawDate);

    if (Number.isNaN(amount) || amount <= 0 || !category || !date) return;

    if (parseISOToLocalDate(date) > new Date()) {
        alert("Future dates not allowed");
        return;
    }

    if (editingId){
        expenses = expenses.map(exp =>
            exp.id ===editingId ? {...exp, amount, category, date}:exp
        );
        editingId = null;
        submitBtn.textContent = 'Add Expense';
    }else{
        expenses.push({
           id: Date.now(),
           amount,
           category,
           date 
        });
    }

    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));

    renderExpenses();
    updateSummary();

    expenseForm.reset();
    dateInput.max = today;
    expenseForm.classList.remove('editing');
});

function renderExpenses(){
    tableBody.innerHTML = '';
    expenses.forEach(exp => {
        const row = document.createElement('tr');

        row.innerHTML = `
        <td>₦${formatMoney(exp.amount)}</td>
        <td>${exp.category}</td>
        <td>${formatDateForDisplay(exp.date)}</td>

        <td>
            <button class="edit-btn" data-id="${exp.id}">✏️</button>
            <button class="delete-btn" data-id="${exp.id}">
                ❌
            </button>
        </td>
        `;
        tableBody.appendChild(row);
    });
}
tableBody.addEventListener('click', function(e){
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');

    if (editBtn) {
        const id = Number(editBtn.dataset.id);
        const expense = expenses.find(exp => exp.id === id);

        expenseForm.querySelector('input[type="number"]').value = expense.amount;
        expenseForm.querySelector('select').value = expense.category;
        dateInput.value = toISODate(expense.date);

        editingId = id;
        submitBtn.textContent = 'Update Expense';
        expenseForm.classList.add('editing');
        return;
    }

    if(!deleteBtn) return;

        const id = Number(deleteBtn.dataset.id);
        
        const confirmDelete = confirm('Are you sure you want to delete this expense?')
        if (!confirmDelete) return;

        if(editingId === id){
            editingId = null;
            submitBtn.textContent = 'Add Expense';
            expenseForm.reset();
            expenseForm.classList.remove('editing');
        }
        expenses = expenses.filter(exp => exp.id !== id);
        localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));

        renderExpenses();
        updateSummary();
});

resetBtn.addEventListener('click', function(e){
    const confirmReset = confirm('Are you sure you want to reset all expenses?');
    if(!confirmReset) return;

    expenses = [];
    localStorage.removeItem(EXPENSES_KEY);
    editingId = null;
    submitBtn.textContent = 'Add Expense';

    expenseForm.classList.remove('editing');

    renderExpenses();
    updateSummary();
});

function updateSummary() {

  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  totalSpent.textContent = `₦${formatMoney(total)}`;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyTotal = expenses
    .filter(exp => {
      const iso = toISODate(exp.date);
      const d = parseISOToLocalDate(iso);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, exp) => sum + exp.amount, 0);

  thisMonth.textContent = `₦${formatMoney(monthlyTotal)}`;

  const categoryTotals = {};
  expenses.forEach(exp => {
    categoryTotals[exp.category] =
      (categoryTotals[exp.category] || 0) + exp.amount;
  });

  const categories = Object.keys(categoryTotals);
  topCategory.textContent = categories.length
    ? categories.reduce((a, b) =>
        categoryTotals[a] > categoryTotals[b] ? a : b
      )
    : "None";
}
renderExpenses();
updateSummary();