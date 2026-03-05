import { API_URL } from "../constants";
import { fetchWithAuth } from "../utils";

export interface LoginResponse {
  access_token: string;
  staff: {
    email: string;
    role: string;
    name: string;
    permissions: string[];
  };
}

export async function adminLogin(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || "Login failed");
  }

  return {
    access_token: data.data.access_token,
    staff: data.data.user,
  };
}

export async function updateAdminCredentials(input: {
  email?: string;
  password?: string;
  currentPassword: string;
}): Promise<{ id: string; email: string; role: string }> {
  return fetchWithAuth("/admin/account/credentials", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
