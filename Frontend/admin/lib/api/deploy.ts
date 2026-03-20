import { fetchWithAuth } from "../utils";

export interface DeploySettingsPublic {
  repoUrl: string;
  branch: string;
  gitUsername: string;
  hasGitToken: boolean;
  hasSshKey: boolean;
}

export interface DeploySettingsInput {
  repoUrl?: string;
  branch?: string;
  gitUsername?: string;
  gitToken?: string;
  sshPrivateKey?: string;
}

export interface DeployStatus {
  running: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
  success: boolean | null;
  durationMs: number | null;
  logs: string[];
}

export interface DeployHistoryEntry {
  id: string;
  startedAt: string;
  finishedAt: string;
  exitCode: number;
  success: boolean;
  durationMs: number;
  logLines: number;
  tailLogs: string[];
}

export async function fetchDeploySettings(): Promise<DeploySettingsPublic> {
  return fetchWithAuth<DeploySettingsPublic>("/admin/deploy/settings");
}

export async function saveDeploySettings(
  settings: DeploySettingsInput,
): Promise<DeploySettingsPublic> {
  return fetchWithAuth<DeploySettingsPublic>("/admin/deploy/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

export async function clearDeploySecret(
  field: "gitToken" | "sshPrivateKey",
): Promise<void> {
  await fetchWithAuth(`/admin/deploy/settings/${field}`, { method: "DELETE" });
}

export async function triggerDeploy(): Promise<DeployStatus> {
  return fetchWithAuth<DeployStatus>("/admin/deploy/trigger", {
    method: "POST",
  });
}

export async function fetchDeployStatus(): Promise<DeployStatus> {
  return fetchWithAuth<DeployStatus>("/admin/deploy/status");
}

export async function clearDeployLogs(): Promise<void> {
  await fetchWithAuth("/admin/deploy/logs", { method: "DELETE" });
}

export async function fetchDeployHistory(): Promise<DeployHistoryEntry[]> {
  return fetchWithAuth<DeployHistoryEntry[]>("/admin/deploy/history");
}

export async function clearDeployHistory(): Promise<void> {
  await fetchWithAuth("/admin/deploy/history", { method: "DELETE" });
}
