const BASE_URL = "http://127.0.0.1:5000/api";

async function handleResponse(res) {
  try {
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Server error: Invalid response (${res.status})`);
    }
    throw err;
  }
}

export async function loginRequest(email, password) {
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return await handleResponse(res);
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(
        "Unable to connect to server. Please check your connection.",
      );
    }
    throw err;
  }
}

export async function getMeRequest(token) {
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    return await handleResponse(res);
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(
        "Unable to connect to server. Please check your connection.",
      );
    }
    throw err;
  }
}

export async function requestOtpRequest(identifier) {
  try {
    const res = await fetch(`${BASE_URL}/auth/request-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });
    return await handleResponse(res);
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(
        "Unable to connect to server. Please check your connection.",
      );
    }
    throw err;
  }
}

export async function resetPasswordRequest(identifier, otp, newPassword) {
  try {
    const res = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, otp, newPassword }),
    });
    return await handleResponse(res);
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(
        "Unable to connect to server. Please check your connection.",
      );
    }
    throw err;
  }
}
