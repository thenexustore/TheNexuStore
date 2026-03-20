import { Injectable, ConflictException } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import * as os from 'node:os';
import * as crypto from 'node:crypto';

export interface DeploySettings {
  repoUrl?: string;
  branch?: string;
  gitUsername?: string;
  gitToken?: string;
  sshPrivateKey?: string;
}

export interface DeploySettingsPublic {
  repoUrl: string;
  branch: string;
  gitUsername: string;
  hasGitToken: boolean;
  hasSshKey: boolean;
}

export interface DeployStatus {
  running: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
  success: boolean | null;
  logs: string[];
}

const MAX_LOG_LINES = 2000;

@Injectable()
export class DeployService {
  private readonly storageDir: string;
  private readonly settingsPath: string;

  private status: DeployStatus = {
    running: false,
    startedAt: null,
    finishedAt: null,
    exitCode: null,
    success: null,
    logs: [],
  };

  constructor() {
    const base = process.env.BRANDING_STORAGE_DIR?.trim()
      ? dirname(process.env.BRANDING_STORAGE_DIR.trim())
      : join(process.cwd(), 'storage');
    this.storageDir = join(base, 'deploy');
    this.settingsPath = join(this.storageDir, 'settings.json');
  }

  async getPublicSettings(): Promise<DeploySettingsPublic> {
    const raw = await this.loadSettings();
    return {
      repoUrl: raw.repoUrl || '',
      branch: raw.branch || '',
      gitUsername: raw.gitUsername || '',
      hasGitToken: !!raw.gitToken,
      hasSshKey: !!raw.sshPrivateKey,
    };
  }

  async saveSettings(input: DeploySettings): Promise<DeploySettingsPublic> {
    const existing = await this.loadSettings();

    const next: DeploySettings = {
      repoUrl:
        typeof input.repoUrl === 'string'
          ? input.repoUrl.trim()
          : existing.repoUrl,
      branch:
        typeof input.branch === 'string'
          ? input.branch.trim()
          : existing.branch,
      gitUsername:
        typeof input.gitUsername === 'string'
          ? input.gitUsername.trim()
          : existing.gitUsername,
      gitToken:
        typeof input.gitToken === 'string' && input.gitToken.trim()
          ? input.gitToken.trim()
          : existing.gitToken,
      sshPrivateKey:
        typeof input.sshPrivateKey === 'string' && input.sshPrivateKey.trim()
          ? input.sshPrivateKey.trim()
          : existing.sshPrivateKey,
    };

    await fs.mkdir(this.storageDir, { recursive: true });
    await fs.writeFile(this.settingsPath, JSON.stringify(next, null, 2), {
      encoding: 'utf8',
      mode: 0o600,
    });

    return {
      repoUrl: next.repoUrl || '',
      branch: next.branch || '',
      gitUsername: next.gitUsername || '',
      hasGitToken: !!next.gitToken,
      hasSshKey: !!next.sshPrivateKey,
    };
  }

  async clearSecret(field: 'gitToken' | 'sshPrivateKey'): Promise<void> {
    const existing = await this.loadSettings();
    const next = { ...existing, [field]: '' };
    await fs.mkdir(this.storageDir, { recursive: true });
    await fs.writeFile(this.settingsPath, JSON.stringify(next, null, 2), {
      encoding: 'utf8',
      mode: 0o600,
    });
  }

  getStatus(): DeployStatus {
    return { ...this.status, logs: [...this.status.logs] };
  }

  async triggerDeploy(): Promise<DeployStatus> {
    if (this.status.running) {
      throw new ConflictException('A deployment is already in progress');
    }

    const settings = await this.loadSettings();
    const repoDir = resolve(process.cwd(), '..', '..'); // Backend/Store → project root
    const scriptPath = join(repoDir, 'ops', 'nexus_deploy.sh');

    this.status = {
      running: true,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      exitCode: null,
      success: null,
      logs: [`[deploy] Starting deployment at ${new Date().toISOString()}`],
    };

    // Build the env for the child process
    const childEnv: Record<string, string> = {
      ...this.buildSafeEnv(),
      REPO_DIR: repoDir,
    };

    let tmpSshKeyPath: string | null = null;

    if (settings.branch) {
      childEnv['BRANCH'] = settings.branch;
    }

    // HTTPS with token: inject into repo URL
    if (settings.repoUrl) {
      let repoUrl = settings.repoUrl;
      if (
        settings.gitToken &&
        (repoUrl.startsWith('https://') || repoUrl.startsWith('http://'))
      ) {
        const username = settings.gitUsername || 'oauth2';
        // Build authenticated URL: https://user:token@host/path
        const urlObj = new URL(repoUrl);
        urlObj.username = encodeURIComponent(username);
        urlObj.password = encodeURIComponent(settings.gitToken);
        repoUrl = urlObj.toString();
      }
      childEnv['REPO_URL'] = repoUrl;
    }

    // SSH key: write to temp file
    if (settings.sshPrivateKey) {
      tmpSshKeyPath = await this.writeTempSshKey(settings.sshPrivateKey);
      // NOTE: StrictHostKeyChecking=no is intentional to avoid interactive prompts
      // during unattended deployments. The trade-off (MITM risk on the git pull)
      // is accepted given that:
      //   1) The repo URL is admin-controlled.
      //   2) The deploy runs on a trusted private server.
      //   3) Known-hosts file maintenance is impractical in this context.
      childEnv['GIT_SSH_COMMAND'] =
        `ssh -i ${tmpSshKeyPath} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`;
    }

    this.pushLog(`[deploy] Script: ${scriptPath}`);
    this.pushLog(`[deploy] Branch: ${childEnv['BRANCH'] || '(auto-detect)'}`);
    this.pushLog(
      `[deploy] Repo URL: ${settings.repoUrl ? '(configured)' : '(using existing)'}`,
    );
    if (settings.sshPrivateKey) this.pushLog('[deploy] SSH key: configured');
    else if (settings.gitToken) this.pushLog('[deploy] Git token: configured');

    // Fire off the deployment asynchronously
    this.runScript(scriptPath, childEnv, tmpSshKeyPath).catch((err) => {
      this.pushLog(`[deploy] Unexpected error: ${String(err)}`);
    });

    return this.getStatus();
  }

  private async runScript(
    scriptPath: string,
    childEnv: Record<string, string>,
    tmpSshKeyPath: string | null,
  ): Promise<void> {
    try {
      await fs.access(scriptPath);
    } catch {
      this.pushLog(`[deploy] ERROR: Script not found at ${scriptPath}`);
      this.finalize(127, tmpSshKeyPath);
      return;
    }

    const child = spawn('bash', [scriptPath], {
      cwd: dirname(scriptPath),
      env: childEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) this.pushLog(line);
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) this.pushLog(`[stderr] ${line}`);
      }
    });

    await new Promise<void>((resolveP) => {
      child.on('close', (code) => {
        this.finalize(code ?? 1, tmpSshKeyPath);
        resolveP();
      });
      child.on('error', (err) => {
        this.pushLog(`[deploy] Process error: ${err.message}`);
        this.finalize(1, tmpSshKeyPath);
        resolveP();
      });
    });
  }

  private finalize(exitCode: number, tmpSshKeyPath: string | null): void {
    const success = exitCode === 0;
    this.status.running = false;
    this.status.finishedAt = new Date().toISOString();
    this.status.exitCode = exitCode;
    this.status.success = success;
    this.pushLog(
      `[deploy] Finished at ${this.status.finishedAt} — exit code ${exitCode} (${success ? 'SUCCESS' : 'FAILED'})`,
    );

    if (tmpSshKeyPath) {
      fs.unlink(tmpSshKeyPath).catch(() => {/* best-effort cleanup */});
    }
  }

  private pushLog(line: string): void {
    this.status.logs.push(line);
    if (this.status.logs.length > MAX_LOG_LINES) {
      this.status.logs = this.status.logs.slice(-MAX_LOG_LINES);
    }
  }

  private async loadSettings(): Promise<DeploySettings> {
    try {
      const raw = await fs.readFile(this.settingsPath, 'utf8');
      return JSON.parse(raw) as DeploySettings;
    } catch {
      return {};
    }
  }

  private async writeTempSshKey(privateKey: string): Promise<string> {
    const tmpDir = os.tmpdir();
    const tmpFile = join(tmpDir, `nexus_deploy_key_${crypto.randomBytes(16).toString('hex')}`);
    const key = privateKey.endsWith('\n') ? privateKey : `${privateKey}\n`;
    await fs.writeFile(tmpFile, key, { encoding: 'utf8', mode: 0o600 });
    return tmpFile;
  }

  /**
   * Build a safe env object for the child process, inheriting PATH and
   * essential system vars but nothing else from the NestJS process env.
   */
  private buildSafeEnv(): Record<string, string> {
    const keep = [
      'PATH',
      'HOME',
      'USER',
      'LOGNAME',
      'SHELL',
      'TERM',
      'LANG',
      'LC_ALL',
      'NODE_PATH',
      'NVM_DIR',
      'NVM_BIN',
      'NVM_INC',
      // Deploy script reads its own env file (BACKEND_ENV_FILE) for DATABASE_URL
      // and other secrets; we only pass the path pointers and operational flags.
      'BACKEND_ENV_FILE',
      'BACKUP_ROOT',
      'SYNC_FRONTEND_ENV',
      'SKIP_EXTERNAL_HEALTHCHECKS',
      'API_DOMAIN',
      'SITE_DOMAIN',
      'ADMIN_DOMAIN',
    ];
    const env: Record<string, string> = {};
    for (const key of keep) {
      if (process.env[key]) {
        env[key] = process.env[key] as string;
      }
    }
    return env;
  }
}
