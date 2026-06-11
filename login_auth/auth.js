const API_BASE_URL = 'http://127.0.0.1:8000/api';
const AUTH_KEY = 'authUser';
const TOKEN_KEY = 'finpal_token';

function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getAuthUser() {
  const user = localStorage.getItem(AUTH_KEY);
  return user ? JSON.parse(user) : null;
}

function saveSession(user, token) {
  localStorage.setItem(TOKEN_KEY, token);

  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      isLoggedIn: true,
      loginTime: new Date().toISOString(),
    })
  );
}

function clearSession() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();

  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const validationMessage = data?.errors
      ? Object.values(data.errors).flat().join(' ')
      : null;

    throw new Error(validationMessage || data?.message || 'Request failed');
  }

  return data;
}

async function registerUser(email, password) {
  try {
    await apiRequest('/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    clearSession();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
}

async function loginUser(email, password) {
  try {
    const data = await apiRequest('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    saveSession(data.user, data.token);

    return {
      success: true,
      user: data.user,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
}

async function logoutUser() {
  try {
    await apiRequest('/logout', {
      method: 'POST',
    });
  } catch (error) {
    console.warn(error.message);
  } finally {
    clearSession();
  }
}