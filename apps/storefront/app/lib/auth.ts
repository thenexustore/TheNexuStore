const API_URL = "/api";

export async function registerUser(data: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  profile_image?: string | null;
}) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Registration failed");
  }

  return res.json();
}

export async function verifyOtp(data: { email: string; otp: string }) {
  const res = await fetch(`${API_URL}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "OTP verification failed");
  }

  return res.json();
}

export async function loginUser(data: { email: string; password: string }) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Invalid credentials");
  }

  return res.json();
}

export async function getMe() {
  const res = await fetch(`${API_URL}/auth/me`, {
    credentials: "include",
  });

  if (!res.ok) return null;
  return res.json();
}

export async function logoutUser() {
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function forgotPassword(data: { email: string }) {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Failed to send OTP");
  }

  return res.json();
}

export async function resetPassword(data: {
  email: string;
  otp: string;
  password: string;
}) {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Reset failed");
  }

  return res.json();
}

export async function updateProfile(data: {
  profile: {
    first_name: string;
    last_name: string;
    phone?: string;
    profile_image?: string;
  };
  address: {
    company?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    postal_code?: string;
    region?: string;
    country?: string;
    phone?: string;
    is_default?: boolean;
  };
}) {
  const res = await fetch(`${API_URL}/auth/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Profile update failed");
  }

  return res.json();
}
