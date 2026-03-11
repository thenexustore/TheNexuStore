import { API_URL } from "./env";
import { apiRequest } from "./api";

type UserMe = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  first_name?: string;
  last_name?: string;
  role: string;
  profile_image?: string;
  createdAt: string;
  address?: {
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
};

async function getApiErrorMessage(res: Response, fallback: string): Promise<string> {
  const err = await res.json().catch(() => null);
  return (
    err?.error?.message ||
    err?.error ||
    err?.message ||
    fallback
  );
}

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
    throw new Error(await getApiErrorMessage(res, "Registration failed"));
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
    throw new Error(await getApiErrorMessage(res, "OTP verification failed"));
  }

  return res.json();
}

export async function resendOtp(data: { email: string }) {
  const res = await fetch(`${API_URL}/auth/resend-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(await getApiErrorMessage(res, "Failed to resend OTP"));
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
    throw new Error(await getApiErrorMessage(res, "Invalid credentials"));
  }

  return res.json();
}

export async function getMe(): Promise<UserMe | null> {
  try {
    const user = (await apiRequest("/auth/me")) as
      | (UserMe & {
          profile_image?: string | null;
          address?: {
            company?: string | null;
            address_line1?: string | null;
            address_line2?: string | null;
            city?: string | null;
            postal_code?: string | null;
            region?: string | null;
            country?: string | null;
            phone?: string | null;
            is_default?: boolean;
          } | null;
        })
      | null;

    if (!user) return null;

    return {
      ...user,
      first_name: user.first_name ?? user.firstName,
      last_name: user.last_name ?? user.lastName,
      profile_image: user.profile_image ?? undefined,
      ...(user.address
        ? {
            address: {
              ...user.address,
              company: user.address.company ?? undefined,
              address_line1: user.address.address_line1 ?? undefined,
              address_line2: user.address.address_line2 ?? undefined,
              city: user.address.city ?? undefined,
              postal_code: user.address.postal_code ?? undefined,
              region: user.address.region ?? undefined,
              country: user.address.country ?? undefined,
              phone: user.address.phone ?? undefined,
            },
          }
        : {}),
    };
  } catch {
    return null;
  }
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
    throw new Error(await getApiErrorMessage(res, "Failed to send OTP"));
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
    throw new Error(await getApiErrorMessage(res, "Reset failed"));
  }

  return res.json();
}

export async function updateProfile(data: {
  profile?: {
    first_name: string;
    last_name: string;
    phone?: string;
    profile_image?: string;
  };
  address?: {
    company?: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    postal_code: string;
    region: string;
    country: string;
    phone?: string;
    is_default?: boolean;
  };
}) {
  return apiRequest("/auth/profile", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
