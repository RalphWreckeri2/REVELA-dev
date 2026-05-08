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

function connectionGuard(err) {
  if (
    err.message.includes("fetch") ||
    err.message.includes("Failed to fetch")
  ) {
    throw new Error(
      "Unable to connect to server. Please check your connection.",
    );
  }
  throw err;
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

// ── Registry ──────────────────────────────────────────────────────────────────

/**
 * Upload a CSV or Excel file to seed the official registry.
 * @param {File} file  - the File object from the input/drop zone
 * @param {string} token - JWT token (pass explicitly from AuthContext)
 * @returns {Promise<{total_rows, inserted, geocoded_ok, geocoded_failed, skipped, errors[]}>}
 */
export async function uploadRegistryFile(file, token) {
  try {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`${BASE_URL}/registry/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      // Do NOT set Content-Type manually — browser sets it with boundary for FormData
      body: form,
    });
    return await handleResponse(res);
  } catch (err) {
    connectionGuard(err);
  }
}

/**
 * Fetch the paginated business list.
 * @param {object} params - { page, limit, search, barangayID, status }
 * @param {string} token
 */
export async function getRegistryRequest(params = {}, token) {
  try {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", params.page);
    if (params.limit) qs.set("limit", params.limit);
    if (params.search) qs.set("search", params.search);
    if (params.barangayID) qs.set("barangayID", params.barangayID);
    if (params.status) qs.set("status", params.status);

    const res = await fetch(`${BASE_URL}/registry/?${qs.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    return await handleResponse(res);
  } catch (err) {
    connectionGuard(err);
  }
}

/**
 * Fetch a single business by ID.
 * @param {number} id
 * @param {string} token
 */
export async function getBusinessByIdRequest(id, token) {
  try {
    const res = await fetch(`${BASE_URL}/registry/${id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    return await handleResponse(res);
  } catch (err) {
    connectionGuard(err);
  }
}

export async function getBarangaysRequest(token) {
  const res = await fetch(`${BASE_URL}/registry/barangays`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await handleResponse(res);
}

export async function getFlagsRequest(params = {}, token) {
  if (!token) {
    throw new Error("Missing authentication token.");
  }

  try {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", params.page);
    if (params.limit) qs.set("limit", params.limit);
    if (params.color) qs.set("color", params.color);
    if (params.barangayID) qs.set("barangayID", params.barangayID);

    const res = await fetch(`${BASE_URL}/flags/?${qs.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    return await handleResponse(res);
  } catch (err) {
    connectionGuard(err);
  }
}

export async function createYellowFlagRequest(payload, token) {
  if (!token) {
    throw new Error("Missing authentication token.");
  }

  try {
    const res = await fetch(`${BASE_URL}/flags/yellow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return await handleResponse(res);
  } catch (err) {
    connectionGuard(err);
  }
}

export async function escalateFlagToBlackRequest(logId, token) {
  if (!token) {
    throw new Error("Missing authentication token.");
  }

  try {
    const res = await fetch(`${BASE_URL}/flags/${logId}/black`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return await handleResponse(res);
  } catch (err) {
    connectionGuard(err);
  }
}

export async function runDetectionRequest(token) {
  if (!token) {
    throw new Error("Missing authentication token.");
  }

  try {
    const res = await fetch(`${BASE_URL}/flags/run-detection`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return await handleResponse(res);
  } catch (err) {
    connectionGuard(err);
  }
}

// ── User Management ───────────────────────────────────────────────────────────

export async function getUsersRequest(token) {
  try {
    const res = await fetch(`${BASE_URL}/users/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await handleResponse(res);
  } catch (err) {
    connectionGuard(err);
  }
}

export async function createUserRequest(payload, token) {
  try {
    const res = await fetch(`${BASE_URL}/users/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return await handleResponse(res);
  } catch (err) {
    connectionGuard(err);
  }
}

export async function updateUserRequest(userId, payload, token) {
  try {
    const res = await fetch(`${BASE_URL}/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return await handleResponse(res);
  } catch (err) {
    connectionGuard(err);
  }
}

export async function deleteUserRequest(userId, token) {
  try {
    const res = await fetch(`${BASE_URL}/users/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return await handleResponse(res);
  } catch (err) {
    connectionGuard(err);
  }
}

// ── Inspections ───────────────────────────────────────────────────────────────

/**
 * GET /api/inspections/tasks
 * Inspector's own assigned/in-progress tasks.
 */
export async function getInspectorTasksRequest(token) {
  try {
    const res = await fetch(`${BASE_URL}/inspections/tasks`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    return await handleResponse(res);
  } catch (err) {
    connectionGuard(err);
  }
}

/**
 * POST /api/inspections/assign
 * Admin assigns a flag to an inspector.
 * @param {{ logID: number, userID: number }} payload
 */
export async function assignInspectionRequest(payload, token) {
  try {
    const res = await fetch(`${BASE_URL}/inspections/assign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return await handleResponse(res);
  } catch (err) {
    connectionGuard(err);
  }
}

/**
 * POST /api/inspections/submit
 * Inspector submits their field report.
 * @param {{ logID, inspectionResult, verifiedLat?, verifiedLng?, notes?, photoURL? }} payload
 */
export async function submitInspectionRequest(payload, token) {
  try {
    const res = await fetch(`${BASE_URL}/inspections/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return await handleResponse(res);
  } catch (err) {
    connectionGuard(err);
  }
}

/**
 * POST /api/inspections/:id/verify
 * Admin verifies a submitted report → updates flagColor.
 * @param {number} reportId
 */
export async function verifyInspectionRequest(reportId, token) {
  try {
    const res = await fetch(`${BASE_URL}/inspections/${reportId}/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    return await handleResponse(res);
  } catch (err) {
    connectionGuard(err);
  }
}

/**
 * GET /api/inspections
 * Admin: all reports, filterable by status and barangayID.
 * @param {{ status?, barangayID?, page?, limit? }} params
 */
export async function getInspectionsRequest(params = {}, token) {
  try {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.barangayID) qs.set("barangayID", params.barangayID);
    if (params.page) qs.set("page", params.page);
    if (params.limit) qs.set("limit", params.limit);

    const res = await fetch(`${BASE_URL}/inspections/?${qs.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    return await handleResponse(res);
  } catch (err) {
    connectionGuard(err);
  }
}

/**
 * GET /api/users (reuse if you already have this, otherwise add it)
 * Fetch inspector list for the assign dropdown.
 */
export async function getInspectorsRequest(token) {
  try {
    const res = await fetch(`${BASE_URL}/users/?role=Inspector`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    return await handleResponse(res);
  } catch (err) {
    connectionGuard(err);
  }
}
