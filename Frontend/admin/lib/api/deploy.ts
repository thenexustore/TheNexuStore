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
  logs: string[];
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
