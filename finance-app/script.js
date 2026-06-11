let authUser = getAuthUser();

if (!authUser || !authUser.isLoggedIn || !getAuthToken()) {
  window.location.href = '../login_auth/login.html';
}

const emailEl = document.getElementById('userEmail');
const avatarEl = document.getElementById('userAvatar');
if (emailEl) emailEl.textContent = authUser.email;
if (avatarEl) avatarEl.textContent = authUser.email.charAt(0).toUpperCase();

let expenses = [];
let editingId = null;

const expenseForm = document.getElementById('expenseForm');
const amountInput = document.getElementById('amountInput');
const categorySelect = document.getElementById('categorySelect');
const dateInput = document.getElementById('dateInput');
const submitLabel = document.getElementById('submitLabel');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editingBadge = document.getElementById('editingBadge');
const formCard = document.getElementById('formCard');
const expenseBody = document.getElementById('expenseBody');
const emptyState = document.getElementById('emptyState');
const expenseTable = document.getElementById('expenseTable');
const expenseCount = document.getElementById('expenseCount');
const totalSpentEl = document.getElementById('totalSpent');
const thisMonthEl = document.getElementById('thisMonth');
const topCategoryEl = document.getElementById('topCategory');
const resetBtn = document.getElementById('resetBtn');
const logoutBtn = document.getElementById('logoutBtn');
const planBadge = document.getElementById('planBadge');
const subscribeBtn = document.getElementById('subscribeBtn');
const premiumModal = document.getElementById('premiumModal');
const closePremiumModal = document.getElementById('closePremiumModal');
const activatePremiumBtn = document.getElementById('activatePremiumBtn');

const today = new Date().toISOString().split('T')[0];
dateInput.max = today;

function toISODate(dateStr) {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.slice(0, 10);
  if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(dateStr)) {
    const [dd, mm, yyyy] = dateStr.split(/[/-]/);
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return dateStr;
}

function parseISOToLocalDate(isoStr) {
  const [y, m, d] = toISODate(isoStr).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateForDisplay(dateStr) {
  return parseISOToLocalDate(dateStr).toLocaleDateString('en-GB');
}

function formatMoney(amount) {
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function normalizeExpense(expense) {
  return {
    ...expense,
    amount: Number(expense.amount),
    date: toISODate(expense.date),
  };
}

function showError(message) {
  alert(message || 'Something went wrong. Please try again.');
}

function saveAuthUser(user) {
  authUser = {
    ...authUser,
    ...user,
    isLoggedIn: true,
  };

  localStorage.setItem('authUser', JSON.stringify(authUser));
}

function isPremiumUser() {
  return authUser.plan === 'premium' && authUser.subscription_status === 'active';
}

function updateSubscriptionUI() {
  const premium = isPremiumUser();

  if (planBadge) {
    planBadge.textContent = premium ? 'Premium' : 'Free';
    planBadge.classList.toggle('premium', premium);
  }

  if (subscribeBtn) {
    subscribeBtn.style.display = premium ? 'none' : 'inline-flex';
  }

  if (premiumModal) {
    premiumModal.classList.remove('open');
    premiumModal.setAttribute('aria-hidden', 'true');
  }
}

async function loadSubscription() {
  try {
    const data = await apiRequest('/subscription');
    saveAuthUser(data.user);
    updateSubscriptionUI();
  } catch (error) {
    console.warn(error.message);
  }
}

async function activateMockSubscription() {
  try {
    const data = await apiRequest('/subscribe/mock', { method: 'POST' });
    saveAuthUser(data.user);
    updateSubscriptionUI();
    alert('Premium activated. Statements, charts, and income tracking can now be unlocked.');
  } catch (error) {
    showError(error.message);
  }
}

function openPremiumModal() {
  if (!premiumModal) return;
  premiumModal.classList.add('open');
  premiumModal.setAttribute('aria-hidden', 'false');
}

function closePremiumModalView() {
  if (!premiumModal) return;
  premiumModal.classList.remove('open');
  premiumModal.setAttribute('aria-hidden', 'true');
}

function renderExpenses() {
  expenseBody.innerHTML = '';
  const isEmpty = expenses.length === 0;

  emptyState.style.display = isEmpty ? 'block' : 'none';
  expenseTable.style.display = isEmpty ? 'none' : 'table';
  expenseCount.textContent = `${expenses.length} expense${expenses.length !== 1 ? 's' : ''}`;

  expenses.forEach((exp) => {
    const tr = document.createElement('tr');

    const amountTd = document.createElement('td');
    amountTd.className = 'amount-cell';
    amountTd.textContent = `\u20A6${formatMoney(exp.amount)}`;

    const categoryTd = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'category-badge';
    badge.textContent = exp.category;
    categoryTd.appendChild(badge);

    const dateTd = document.createElement('td');
    dateTd.className = 'date-cell';
    dateTd.textContent = formatDateForDisplay(exp.date);

    const actionTd = document.createElement('td');
    const actionCell = document.createElement('div');
    actionCell.className = 'action-cell';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-ghost btn-sm edit-btn';
    editBtn.dataset.id = exp.id;
    editBtn.type = 'button';
    editBtn.textContent = 'Edit';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger btn-sm delete-btn';
    deleteBtn.dataset.id = exp.id;
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete';

    actionCell.append(editBtn, deleteBtn);
    actionTd.appendChild(actionCell);
    tr.append(amountTd, categoryTd, dateTd, actionTd);
    expenseBody.appendChild(tr);
  });
}

function updateSummary() {
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  totalSpentEl.innerHTML = `<span class="currency">\u20A6</span>${formatMoney(total)}`;

  const now = new Date();
  const monthly = expenses
    .filter((expense) => {
      const d = parseISOToLocalDate(expense.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

  thisMonthEl.innerHTML = `<span class="currency">\u20A6</span>${formatMoney(monthly)}`;

  const totals = {};
  expenses.forEach((expense) => {
    totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
  });

  const categories = Object.keys(totals);
  topCategoryEl.textContent = categories.length
    ? categories.reduce((a, b) => (totals[a] > totals[b] ? a : b))
    : 'None';
}

function refreshUI() {
  renderExpenses();
  updateSummary();
}

async function loadExpenses() {
  try {
    const data = await apiRequest('/expenses');
    expenses = data.map(normalizeExpense);
    refreshUI();
  } catch (error) {
    if (error.message.includes('Unauthenticated')) {
      clearSession();
      window.location.href = '../login_auth/login.html';
      return;
    }

    showError(error.message);
  }
}

function enterEditMode(expense) {
  amountInput.value = expense.amount;
  categorySelect.value = expense.category;
  dateInput.value = toISODate(expense.date);
  editingId = expense.id;
  submitLabel.textContent = 'Update';
  cancelEditBtn.style.display = 'inline-flex';
  editingBadge.style.display = 'inline-block';
  formCard.classList.add('editing');
  amountInput.focus();
  formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function exitEditMode() {
  editingId = null;
  submitLabel.textContent = '+ Add';
  cancelEditBtn.style.display = 'none';
  editingBadge.style.display = 'none';
  formCard.classList.remove('editing');
  expenseForm.reset();
  dateInput.max = today;
}

cancelEditBtn.addEventListener('click', exitEditMode);

if (subscribeBtn) {
  subscribeBtn.addEventListener('click', openPremiumModal);
}

if (closePremiumModal) {
  closePremiumModal.addEventListener('click', closePremiumModalView);
}

if (premiumModal) {
  premiumModal.addEventListener('click', (e) => {
    if (e.target === premiumModal) closePremiumModalView();
  });
}

if (activatePremiumBtn) {
  activatePremiumBtn.addEventListener('click', activateMockSubscription);
}

expenseForm.addEventListener('submit', async function (e) {
  e.preventDefault();

  const amount = Number(amountInput.value);
  const category = categorySelect.value;
  const date = toISODate(dateInput.value);

  if (!amount || amount <= 0 || !category || !date) return;

  if (parseISOToLocalDate(date) > new Date()) {
    showError('Future dates are not allowed.');
    return;
  }

  const payload = { amount, category, date };
  const path = editingId ? `/expenses/${editingId}` : '/expenses';
  const method = editingId ? 'PUT' : 'POST';

  try {
    const savedExpense = normalizeExpense(await apiRequest(path, {
      method,
      body: JSON.stringify(payload),
    }));

    if (editingId) {
      expenses = expenses.map((expense) => (
        expense.id === editingId ? savedExpense : expense
      ));
      exitEditMode();
    } else {
      expenses = [savedExpense, ...expenses];
      expenseForm.reset();
      dateInput.max = today;
    }

    refreshUI();
  } catch (error) {
    showError(error.message);
  }
});

expenseBody.addEventListener('click', async function (e) {
  const editBtn = e.target.closest('.edit-btn');
  const deleteBtn = e.target.closest('.delete-btn');

  if (editBtn) {
    const id = Number(editBtn.dataset.id);
    const exp = expenses.find((expense) => expense.id === id);
    if (exp) enterEditMode(exp);
    return;
  }

  if (deleteBtn) {
    const id = Number(deleteBtn.dataset.id);
    if (!confirm('Delete this expense?')) return;

    try {
      await apiRequest(`/expenses/${id}`, { method: 'DELETE' });
      if (editingId === id) exitEditMode();
      expenses = expenses.filter((expense) => expense.id !== id);
      refreshUI();
    } catch (error) {
      showError(error.message);
    }
  }
});

resetBtn.addEventListener('click', async function () {
  if (!confirm('Reset ALL expenses? This cannot be undone.')) return;

  try {
    await apiRequest('/expenses', { method: 'DELETE' });
    expenses = [];
    exitEditMode();
    refreshUI();
  } catch (error) {
    showError(error.message);
  }
});

logoutBtn.addEventListener('click', async function () {
  try {
    await apiRequest('/logout', { method: 'POST' });
  } catch (error) {
    console.warn(error.message);
  } finally {
    clearSession();
    window.location.href = '../login_auth/login.html';
  }
});

refreshUI();
updateSubscriptionUI();
loadSubscription();
loadExpenses();