"use client";

import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock,
  Clock3,
  ClipboardCopy,
  Gauge,
  GitBranch,
  Globe,
  History,
  ImageIcon,
  KeyRound,
  Loader2,
  Mail,
  MessageSquare,
  MousePointerClick,
  Play,
  RefreshCw,
  Save,
  Settings2,
  Sparkles,
  Terminal,
  Trash2,
  Undo2,
  XCircle,
} from "lucide-react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { updateAdminCredentials } from "@/lib/api";
import { fetchRemoteBrandingSettings, saveRemoteBrandingSettings, uploadBrandingLogo } from "@/lib/api/branding";
import {
  clearDeployHistory,
  clearDeployLogs,
  clearDeploySecret,
  fetchDeployHistory,
  fetchDeploySettings,
  fetchDeployStatus,
  saveDeploySettings,
  triggerDeploy,
  type DeployHistoryEntry,
  type DeploySettingsInput,
  type DeploySettingsPublic,
  type DeployStatus,
} from "@/lib/api/deploy";
import AdminBrandLogo from "@/app/components/AdminBrandLogo";
import {
  defaultAdminSettings,
  loadAdminSettings,
  resolveAdminLogoSrc,
  saveAdminSettings,
  type AdminLanguage,
  type AdminLogoFit,
  type AdminSettings,
} from "@/lib/admin-settings";

export default function SettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const isEn = locale === "en";

  const [settings, setSettings] = useState<AdminSettings>(() => loadAdminSettings());
  const [savedSnapshot, setSavedSnapshot] = useState<AdminSettings>(() => loadAdminSettings());
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [credentialsSaving, setCredentialsSaving] = useState(false);
  const [currentAdminEmail, setCurrentAdminEmail] = useState("");
  const [credentials, setCredentials] = useState({
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  // Deploy state
  const [deployConfig, setDeployConfig] = useState<DeploySettingsInput>({});
  const [deployPublic, setDeployPublic] = useState<DeploySettingsPublic | null>(null);
  const [deployConfigSaving, setDeployConfigSaving] = useState(false);
  const [deployStatus, setDeployStatus] = useState<DeployStatus | null>(null);
  const [deployHistory, setDeployHistory] = useState<DeployHistoryEntry[]>([]);
  const [deployAuthMethod, setDeployAuthMethod] = useState<"token" | "ssh">("token");
  const [deployConfirmStep, setDeployConfirmStep] = useState(false);
  const [showSshInput, setShowSshInput] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const deployPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const autoSaveRef = useRef<{ onSave: (() => Promise<void>) | null; hasChanges: boolean }>({ onSave: null, hasChanges: false });

  const hasChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSnapshot),
    [savedSnapshot, settings],
  );

  const hasValidLightLogo = settings.brandLogoUrl.trim().length > 0;
  const hasValidDarkLogo = settings.brandLogoDarkUrl.trim().length > 0;
  const isSupportEmailValid = isValidEmail(settings.supportEmail);

  const normalizedCredentialEmail = credentials.email.trim().toLowerCase();
  const normalizedCurrentAdminEmail = currentAdminEmail.trim().toLowerCase();
  const hasCredentialEmailChange =
    normalizedCredentialEmail.length > 0 && normalizedCredentialEmail !== normalizedCurrentAdminEmail;
  const hasCredentialPasswordChange = credentials.newPassword.trim().length > 0;

  const applyLocaleIfNeeded = useCallback((nextLanguage: AdminLanguage) => {
    if (locale !== nextLanguage) {
      router.replace(pathname, { locale: nextLanguage });
    }
  }, [locale, pathname, router]);

  useEffect(() => {
    const adminUserRaw = localStorage.getItem("admin_user");
    if (!adminUserRaw) return;
    try {
      const adminUser = JSON.parse(adminUserRaw) as { email?: string };
      if (adminUser.email) {
        const normalized = String(adminUser.email).trim().toLowerCase();
        setCredentials((prev) => ({ ...prev, email: normalized }));
        setCurrentAdminEmail(normalized);
      }
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const remote = await fetchRemoteBrandingSettings();
        if (cancelled) return;

        const merged = { ...loadAdminSettings(), ...remote };
        setSettings(merged);
        setSavedSnapshot(merged);
        saveAdminSettings(merged);
      } catch {
        // noop: fallback to local settings when API is unavailable
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load deploy settings on mount
  useEffect(() => {
    fetchDeploySettings()
      .then((data) => {
        setDeployPublic(data);
        setDeployConfig({
          repoUrl: data.repoUrl,
          branch: data.branch,
          gitUsername: data.gitUsername,
        });
      })
      .catch((err) => { console.error("[deploy] Could not load deploy settings:", err); });

    fetchDeployStatus()
      .then((data) => {
        setDeployStatus(data);
        // Auto-start polling if a deploy is already running (e.g. page reload mid-deploy)
        if (data.running) {
          startDeployPolling();
          startElapsedTimer(data.startedAt ? new Date(data.startedAt).getTime() : Date.now());
        }
      })
      .catch((err) => {
        console.error("[deploy] Could not load deploy status:", err);
        toast.warning(isEn ? "Could not load deploy status — check API connection" : "No se pudo cargar el estado del deploy — revisa la conexión con el API");
      });

    fetchDeployHistory()
      .then((data) => setDeployHistory(data))
      .catch(() => {/* noop: history is not critical */});

    return () => {
      if (deployPollRef.current) clearInterval(deployPollRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSaveCredentials() {
    if (!credentials.currentPassword) {
      toast.error(isEn ? "You must provide current password" : "Debes indicar la contraseña actual");
      return;
    }

    if (!hasCredentialEmailChange && !hasCredentialPasswordChange) {
      toast.error(isEn ? "No username/password changes to save" : "No hay cambios en usuario o contraseña para guardar");
      return;
    }

    if (hasCredentialEmailChange && !isValidEmail(normalizedCredentialEmail)) {
      toast.error(isEn ? "Admin user must be a valid email" : "El usuario admin debe ser un email válido");
      return;
    }

    if (hasCredentialPasswordChange && credentials.newPassword.trim().length < 8) {
      toast.error(isEn ? "New password must be at least 8 characters" : "La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (hasCredentialPasswordChange && credentials.newPassword !== credentials.confirmNewPassword) {
      toast.error(isEn ? "Password confirmation does not match" : "La confirmación de contraseña no coincide");
      return;
    }

    setCredentialsSaving(true);
    try {
      const updated = await updateAdminCredentials({
        email: hasCredentialEmailChange ? normalizedCredentialEmail : undefined,
        password: hasCredentialPasswordChange ? credentials.newPassword.trim() : undefined,
        currentPassword: credentials.currentPassword,
      });

      const currentUserRaw = localStorage.getItem("admin_user");
      if (currentUserRaw) {
        try {
          const currentUser = JSON.parse(currentUserRaw) as Record<string, unknown>;
          localStorage.setItem(
            "admin_user",
            JSON.stringify({ ...currentUser, email: updated.email, name: updated.email }),
          );
        } catch {
          // noop
        }
      }

      setCredentials((prev) => ({
        ...prev,
        email: updated.email,
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      }));
      setCurrentAdminEmail(updated.email);

      toast.success(isEn ? "Admin credentials updated" : "Credenciales de admin actualizadas");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (isEn ? "Could not update credentials" : "No se pudieron actualizar las credenciales");
      toast.error(message);
    } finally {
      setCredentialsSaving(false);
    }
  }

  const onSave = useCallback(async () => {
    if (settingsSaving) return;
    if (!isSupportEmailValid) {
      toast.error(isEn ? "Support email format is invalid" : "El email de soporte no tiene formato válido");
      return;
    }

    if (!hasValidLightLogo) {
      toast.error(isEn ? "Add or upload a custom primary logo" : "Añade o sube un logo principal personalizado");
      return;
    }

    const logoFieldsChanged = [
      settings.brandLogoMode !== savedSnapshot.brandLogoMode,
      settings.brandLogoUrl !== savedSnapshot.brandLogoUrl,
      settings.brandLogoDarkUrl !== savedSnapshot.brandLogoDarkUrl,
      settings.brandLogoFit !== savedSnapshot.brandLogoFit,
      settings.brandLogoHeight !== savedSnapshot.brandLogoHeight,
      settings.brandLogoBrightness !== savedSnapshot.brandLogoBrightness,
      settings.brandLogoSaturation !== savedSnapshot.brandLogoSaturation,
    ].some(Boolean);

    const nextSettings = logoFieldsChanged
      ? { ...settings, brandLogoVersion: settings.brandLogoVersion + 1 }
      : settings;

    setSettingsSaving(true);
    try {
      const uploadedLight = nextSettings.brandLogoUrl.startsWith("data:image/")
        ? await uploadBrandingLogo("light", nextSettings.brandLogoUrl)
        : nextSettings.brandLogoUrl;
      const uploadedDark = nextSettings.brandLogoDarkUrl.startsWith("data:image/")
        ? await uploadBrandingLogo("dark", nextSettings.brandLogoDarkUrl)
        : nextSettings.brandLogoDarkUrl;

      const remoteReady = {
        ...nextSettings,
        brandLogoUrl: uploadedLight,
        brandLogoDarkUrl: uploadedDark,
      };

      await saveRemoteBrandingSettings(remoteReady);
      saveAdminSettings(remoteReady);
      setSettings(remoteReady);
      setSavedSnapshot(remoteReady);
      setSavedAt(new Date());
      applyLocaleIfNeeded(nextSettings.adminLanguage);
      toast.success(isEn ? "Settings saved and applied" : "Ajustes guardados y aplicados");
    } finally {
      setSettingsSaving(false);
    }
  }, [
    applyLocaleIfNeeded,
    hasValidLightLogo,
    isEn,
    isSupportEmailValid,
    savedSnapshot,
    settings,
    settingsSaving,
  ]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (hasChanges) onSave();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [hasChanges, settings, settingsSaving, onSave]);

  // Keep ref up to date so the auto-save interval sees latest state
  autoSaveRef.current = { onSave, hasChanges };

  // Auto-save every 10 minutes when there are pending changes
  useEffect(() => {
    const id = setInterval(() => {
      if (autoSaveRef.current.hasChanges && autoSaveRef.current.onSave) {
        void autoSaveRef.current.onSave();
      }
    }, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  async function onReset() {
    const brandingPayload = {
      brandLogoUrl: defaultAdminSettings.brandLogoUrl,
      brandLogoDarkUrl: defaultAdminSettings.brandLogoDarkUrl,
      brandLogoFit: defaultAdminSettings.brandLogoFit,
      brandLogoHeight: defaultAdminSettings.brandLogoHeight,
      brandLogoVersion: defaultAdminSettings.brandLogoVersion,
      brandLogoBrightness: defaultAdminSettings.brandLogoBrightness,
      brandLogoSaturation: defaultAdminSettings.brandLogoSaturation,
    };
    setSettings(defaultAdminSettings);
    saveAdminSettings(defaultAdminSettings);
    setSavedSnapshot(defaultAdminSettings);
    setSavedAt(new Date());
    applyLocaleIfNeeded(defaultAdminSettings.adminLanguage);
    try {
      await saveRemoteBrandingSettings(brandingPayload);
    } catch {
      toast.error(isEn ? "Settings restored locally, but remote sync failed. Reload to retry." : "Ajustes restaurados localmente, pero falló la sincronización remota. Recarga para reintentar.");
    }
    toast.success(isEn ? "Settings restored" : "Ajustes restaurados");
  }

  function onDiscard() {
    const latest = loadAdminSettings();
    setSettings(latest);
    setSavedSnapshot(latest);
    applyLocaleIfNeeded(latest.adminLanguage);
    toast.info(isEn ? "Changes discarded" : "Cambios descartados");
  }

  function update<K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function scrollToSection(id: string) {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function onLogoFileChange(event: ChangeEvent<HTMLInputElement>, variant: "light" | "dark") {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(isEn ? "Select a valid image file" : "Selecciona un archivo de imagen válido");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error(isEn ? "Image must not exceed 2MB" : "La imagen no debe superar 2MB");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      update("brandLogoMode", "custom");
      if (variant === "dark") {
        update("brandLogoDarkUrl", dataUrl);
      } else {
        update("brandLogoUrl", dataUrl);
      }
      toast.success(isEn ? `Logo ${variant === "dark" ? "dark" : "primary"} uploaded. Save to apply.` : `Logo ${variant === "dark" ? "oscuro" : "principal"} cargado. Guarda para aplicar.`);
    } catch {
      toast.error(isEn ? "Could not read logo file" : "No se pudo leer el archivo de logo");
    }
  }

  async function onSaveDeployConfig() {
    setDeployConfigSaving(true);
    try {
      const updated = await saveDeploySettings(deployConfig);
      setDeployPublic(updated);
      setDeployConfig((prev) => ({
        ...prev,
        gitToken: undefined,
        sshPrivateKey: undefined,
      }));
      setShowSshInput(false);
      setShowTokenInput(false);
      toast.success(isEn ? "Deploy settings saved" : "Configuración de deploy guardada");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (isEn ? "Could not save deploy settings" : "No se pudo guardar la configuración de deploy");
      toast.error(message);
    } finally {
      setDeployConfigSaving(false);
    }
  }

  async function onClearDeploySecret(field: "gitToken" | "sshPrivateKey") {
    try {
      await clearDeploySecret(field);
      setDeployPublic((prev) => prev ? { ...prev, [field === "gitToken" ? "hasGitToken" : "hasSshKey"]: false } : prev);
      toast.success(isEn ? "Secret cleared" : "Secreto eliminado");
    } catch {
      toast.error(isEn ? "Could not clear secret" : "No se pudo eliminar el secreto");
    }
  }

  function startElapsedTimer(startTimeMs: number) {
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    setElapsedMs(Date.now() - startTimeMs);
    elapsedTimerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeMs);
    }, 1000);
  }

  function stopElapsedTimer() {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }

  function startDeployPolling() {
    if (deployPollRef.current) clearInterval(deployPollRef.current);
    deployPollRef.current = setInterval(async () => {
      try {
        const data = await fetchDeployStatus();
        setDeployStatus(data);
        if (!data.running) {
          if (deployPollRef.current) clearInterval(deployPollRef.current);
          stopElapsedTimer();
          if (data.success === true) {
            toast.success(isEn ? "Deployment completed successfully ✓" : "Deploy completado con éxito ✓");
          } else if (data.success === false) {
            toast.error(isEn ? "Deployment failed — check logs below" : "El deploy falló — revisa los logs");
          }
          // Refresh history after completion
          fetchDeployHistory().then((h) => setDeployHistory(h)).catch(() => {});
        }
        requestAnimationFrame(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }));
      } catch {
        // noop: transient error, continue polling
      }
    }, 2000);
  }

  async function onTriggerDeploy() {
    if (deployStatus?.running) return;
    setDeployConfirmStep(false);
    try {
      const data = await triggerDeploy();
      setDeployStatus(data);
      const startMs = data.startedAt ? new Date(data.startedAt).getTime() : Date.now();
      startDeployPolling();
      startElapsedTimer(startMs);
      toast.info(isEn ? "Deployment started…" : "Deploy iniciado…");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (isEn ? "Could not start deployment" : "No se pudo iniciar el deploy");
      toast.error(message);
    }
  }

  async function onRefreshDeployStatus() {
    try {
      const data = await fetchDeployStatus();
      setDeployStatus(data);
      toast.info(isEn ? "Status refreshed" : "Estado actualizado");
    } catch {
      toast.error(isEn ? "Could not refresh status" : "No se pudo actualizar el estado");
    }
  }

  async function onClearDeployLogs() {
    try {
      await clearDeployLogs();
      setDeployStatus((prev) => prev ? { ...prev, logs: [] } : prev);
      toast.success(isEn ? "Logs cleared" : "Logs eliminados");
    } catch {
      toast.error(isEn ? "Could not clear logs" : "No se pudieron eliminar los logs");
    }
  }

  function onCopyLogs() {
    const text = deployStatus?.logs.join("\n") ?? "";
    navigator.clipboard.writeText(text).then(() => {
      toast.success(isEn ? "Logs copied to clipboard" : "Logs copiados al portapapeles");
    }).catch(() => {
      toast.error(isEn ? "Could not copy logs" : "No se pudieron copiar los logs");
    });
  }

  async function onClearDeployHistory() {
    try {
      await clearDeployHistory();
      setDeployHistory([]);
      toast.success(isEn ? "History cleared" : "Historial eliminado");
    } catch {
      toast.error(isEn ? "Could not clear history" : "No se pudo eliminar el historial");
    }
  }

  function formatDeployDuration(ms: number | null): string {
    if (ms === null) return "—";
    if (ms < 1000) return `${ms}ms`;
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}m ${r}s`;
  }

  return (
    <div className="relative space-y-6 pb-24">
      <div className="rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white via-white to-zinc-50 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Ajustes del panel</h1>
            <p className="mt-1 text-sm text-zinc-600">
              {isEn ? "Configure language, branding and operational preferences with a professional eCommerce focus." : "Configura idioma, branding y preferencias operativas con enfoque eCommerce profesional."}
            </p>
            <p className="mt-2 text-xs text-zinc-500">{isEn ? "Tip: use Ctrl/Cmd + S to save quickly." : "Tip: usa Ctrl/Cmd + S para guardar rápido."}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={onDiscard} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">{isEn ? "Discard" : "Descartar"}</button>
            <button type="button" onClick={onReset} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"><Undo2 className="h-4 w-4" />{isEn ? "Restore defaults" : "Restaurar por defecto"}</button>
            <button type="button" disabled={!hasChanges || settingsSaving} onClick={onSave} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"><Save className="h-4 w-4" />{settingsSaving ? (isEn ? "Saving..." : "Guardando...") : (isEn ? "Save settings" : "Guardar ajustes")}</button>
          </div>
        </div>
        <div className="mt-3 text-xs text-zinc-500 flex items-center gap-2">
          {hasChanges ? <span className="text-amber-600 font-medium">{isEn ? "Pending changes" : "Cambios pendientes"}</span> : <span className="text-emerald-600 font-medium inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />{isEn ? "Synced" : "Sincronizado"}</span>}
          <span>·</span>
          <span>{savedAt ? `${isEn ? "Last saved" : "Último guardado"}: ${savedAt.toLocaleTimeString()}` : (isEn ? "Not saved yet in this session" : "Aún no guardado en esta sesión")}</span>
        </div>
      </div>

      <div className="sticky top-2 z-20 rounded-xl border border-zinc-200/80 bg-white/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-white/85 flex flex-wrap gap-2 shadow-sm">
        <button type="button" onClick={() => scrollToSection("branding-section")} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50"><CircleDot className="h-3.5 w-3.5" />Branding</button>
        <button type="button" onClick={() => scrollToSection("security-section")} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50"><Building2 className="h-3.5 w-3.5" />{isEn ? "Security" : "Seguridad"}</button>
        <button type="button" onClick={() => scrollToSection("operations-section")} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50"><Gauge className="h-3.5 w-3.5" />{isEn ? "Operations" : "Operaciones"}</button>
        <button type="button" onClick={() => scrollToSection("experience-section")} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50"><Sparkles className="h-3.5 w-3.5" />{isEn ? "Experience" : "Experiencia"}</button>
        <button type="button" onClick={() => scrollToSection("integration-section")} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50"><MousePointerClick className="h-3.5 w-3.5" />{isEn ? "Integration" : "Integración"}</button>
        <button type="button" onClick={() => scrollToSection("deploy-section")} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50"><Terminal className="h-3.5 w-3.5" />Deploy</button>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div id="branding-section" className="rounded-2xl border border-zinc-200/80 bg-white p-6 space-y-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900"><Building2 className="h-5 w-5" />{isEn ? "Branding & identity" : "Branding e identidad"}</h2>

          <div className="rounded-xl border border-zinc-200/80 bg-gradient-to-br from-zinc-50 to-white p-4 space-y-3">
            <p className="text-sm font-medium text-zinc-900">{isEn ? "Enterprise logo system" : "Sistema de logo enterprise"}</p>
            <p className="text-xs text-zinc-500">{isEn ? "Configure primary and dark-background logos with automatic fallback and cache busting." : "Configura logo principal y alternativo para fondos oscuros con fallback automático y cache busting."}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs font-medium text-zinc-700 mb-2">{isEn ? "Light preview" : "Preview claro"}</p>
                <div className="h-12 rounded bg-white border border-zinc-200 flex items-center justify-center">
                  <AdminBrandLogo settings={settings} variant="light" className="w-auto" />
                </div>
              </div>
              <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3">
                <p className="text-xs font-medium text-zinc-200 mb-2">{isEn ? "Dark preview" : "Preview oscuro"}</p>
                <div className="h-12 rounded bg-zinc-950 border border-zinc-700 flex items-center justify-center">
                  <AdminBrandLogo settings={settings} variant="dark" className="w-auto" />
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
                {isEn ? "Professional branding active: we work with custom logo only (no preset packs)." : "Branding profesional activo: trabajamos con logo personalizado (sin presets prefabricados)."}
              </div>
              <label className="block text-sm text-zinc-700">
                {isEn ? "Image fit" : "Ajuste de imagen"}
                <select value={settings.brandLogoFit} onChange={(e) => update("brandLogoFit", e.target.value as AdminLogoFit)} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10">
                  <option value="contain">Contain</option>
                  <option value="cover">Cover</option>
                </select>
              </label>
            </div>

            <NumberField label="Altura del logo (px)" value={settings.brandLogoHeight} min={20} max={64} onChange={(value) => update("brandLogoHeight", value)} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberField label="Brillo del logo (%)" value={settings.brandLogoBrightness} min={60} max={140} onChange={(value) => update("brandLogoBrightness", value)} />
              <NumberField label="Saturación del logo (%)" value={settings.brandLogoSaturation} min={60} max={140} onChange={(value) => update("brandLogoSaturation", value)} />
            </div>
            <button type="button" onClick={() => { update("brandLogoBrightness", 100); update("brandLogoSaturation", 100); }} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50">
              Restaurar tono y brillo recomendados
            </button>

            <label className="block text-sm text-zinc-700">
              URL logo principal
              <div className="mt-1 flex gap-2">
                <input value={settings.brandLogoUrl} onChange={(e) => update("brandLogoUrl", e.target.value)} placeholder="https://cdn.tu-dominio.com/brand/logo-light.svg" className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10" />
                {settings.brandLogoUrl && (
                  <button type="button" onClick={() => update("brandLogoUrl", "")} title={isEn ? "Clear URL" : "Borrar URL"} className="rounded-lg border border-zinc-200 px-3 py-2 text-zinc-500 hover:bg-zinc-50 hover:text-red-600">✕</button>
                )}
              </div>
            </label>

            <label className="block text-sm text-zinc-700">
              URL logo para fondo oscuro (login)
              <div className="mt-1 flex gap-2">
                <input value={settings.brandLogoDarkUrl} onChange={(e) => update("brandLogoDarkUrl", e.target.value)} placeholder="https://cdn.tu-dominio.com/brand/logo-dark.svg" className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10" />
                {settings.brandLogoDarkUrl && (
                  <button type="button" onClick={() => update("brandLogoDarkUrl", "")} title={isEn ? "Clear URL" : "Borrar URL"} className="rounded-lg border border-zinc-200 px-3 py-2 text-zinc-500 hover:bg-zinc-50 hover:text-red-600">✕</button>
                )}
              </div>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-zinc-700">
                Subir logo principal (máx 2MB)
                <input type="file" accept="image/*" onChange={(e) => onLogoFileChange(e, "light")} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm text-zinc-700">
                Subir logo oscuro (máx 2MB)
                <input type="file" accept="image/*" onChange={(e) => onLogoFileChange(e, "dark")} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
              </label>
            </div>

            <p className="text-xs text-zinc-500">Versión de cache actual: {settings.brandLogoVersion}. Se incrementa automáticamente cuando cambias branding y guardas.</p>
            {(!hasValidLightLogo || !hasValidDarkLogo) && (
              <p className="text-xs text-amber-600">Recomendación profesional: define logo claro y oscuro para mantener contraste en todos los fondos.</p>
            )}
          </div>

          <label className="block text-sm text-zinc-700">
            Email soporte
            <input type="email" value={settings.supportEmail} onChange={(e) => update("supportEmail", e.target.value)} className={`mt-1 w-full rounded-lg border px-3 py-2 ${isSupportEmailValid ? "border-zinc-200" : "border-red-300 bg-red-50"}`} />
            {!isSupportEmailValid && <span className="text-xs text-red-600">Revisa el email de soporte.</span>}
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm text-zinc-700">
              {isEn ? "Panel language" : "Idioma del panel"}
              <select value={settings.adminLanguage} onChange={(e) => update("adminLanguage", e.target.value as AdminLanguage)} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10">
                <option value="es">{isEn ? "Spanish" : "Español"}</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="block text-sm text-zinc-700">
              {isEn ? "Default currency" : "Divisa por defecto"}
              <select value={settings.defaultCurrency} onChange={(e) => update("defaultCurrency", e.target.value as AdminSettings["defaultCurrency"])} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10">
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
            </label>
          </div>

          <label className="block text-sm text-zinc-700">
            {isEn ? "Date format" : "Formato de fecha"}
            <select value={settings.dateFormat} onChange={(e) => update("dateFormat", e.target.value as AdminSettings["dateFormat"])} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10">
              <option value="es-ES">{isEn ? "Spain (dd/mm/yyyy)" : "España (dd/mm/yyyy)"}</option>
              <option value="en-GB">{isEn ? "United Kingdom (dd/mm/yyyy)" : "Reino Unido (dd/mm/yyyy)"}</option>
              <option value="en-US">USA (mm/dd/yyyy)</option>
            </select>
          </label>
        </div>

        <div id="security-section" className="rounded-2xl border border-zinc-200/80 bg-white p-6 space-y-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900"><Building2 className="h-5 w-5" />{isEn ? "Administrator account" : "Cuenta de administrador"}</h2>
          <p className="text-sm text-zinc-600">{isEn ? "Change admin username (email) and password securely using your current password." : "Cambia el usuario (email) y contraseña del admin de forma segura usando tu contraseña actual."}</p>
          <label className="block text-sm text-zinc-700">
            {isEn ? "Admin user (email)" : "Usuario admin (email)"}
            <input type="email" value={credentials.email} onChange={(e) => setCredentials((prev) => ({ ...prev, email: e.target.value }))} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10" placeholder={isEn ? "admin@your-domain.com" : "admin@tu-dominio.com"} />
          </label>
          <label className="block text-sm text-zinc-700">
            {isEn ? "Current password" : "Contraseña actual"}
            <input type="password" value={credentials.currentPassword} onChange={(e) => setCredentials((prev) => ({ ...prev, currentPassword: e.target.value }))} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10" />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm text-zinc-700">
              {isEn ? "New password" : "Nueva contraseña"}
              <input type="password" value={credentials.newPassword} onChange={(e) => setCredentials((prev) => ({ ...prev, newPassword: e.target.value }))} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10" placeholder={isEn ? "Minimum 8 characters" : "Mínimo 8 caracteres"} />
            </label>
            <label className="block text-sm text-zinc-700">
              {isEn ? "Confirm new password" : "Confirmar nueva contraseña"}
              <input type="password" value={credentials.confirmNewPassword} onChange={(e) => setCredentials((prev) => ({ ...prev, confirmNewPassword: e.target.value }))} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10" />
            </label>
          </div>
          <button type="button" onClick={onSaveCredentials} disabled={credentialsSaving || (!hasCredentialEmailChange && !hasCredentialPasswordChange)} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-60">
            <Save className="h-4 w-4" />{credentialsSaving ? (isEn ? "Saving credentials..." : "Guardando credenciales...") : (isEn ? "Update user/password" : "Actualizar usuario/contraseña")}
          </button>
        </div>

        <div id="operations-section" className="rounded-2xl border border-zinc-200/80 bg-white p-6 space-y-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900"><Gauge className="h-5 w-5" />{isEn ? "Performance and listings" : "Rendimiento y listados"}</h2>
          <NumberField label={isEn ? "Orders auto-refresh (seconds)" : "Refresco automático de pedidos (segundos)"} value={settings.ordersRefreshSeconds} min={10} max={300} onChange={(value) => update("ordersRefreshSeconds", value)} />
          <NumberField label={isEn ? "Rows per page in orders" : "Filas por página en pedidos"} value={settings.ordersPageSize} min={5} max={100} onChange={(value) => update("ordersPageSize", value)} />
          <NumberField label={isEn ? "Rows per page in products" : "Filas por página en productos"} value={settings.productsPageSize} min={10} max={200} onChange={(value) => update("productsPageSize", value)} />
          <NumberField label={isEn ? "Low stock threshold" : "Umbral de bajo stock"} value={settings.lowStockThreshold} min={0} max={500} onChange={(value) => update("lowStockThreshold", value)} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div id="experience-section" className="rounded-2xl border border-zinc-200/80 bg-white p-6 space-y-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900"><Bell className="h-5 w-5" />{isEn ? "Alerts and experience" : "Alertas y experiencia"}</h2>
          <ToggleRow icon={<Mail className="h-4 w-4" />} label={isEn ? "Email notifications" : "Notificaciones por email"} description={isEn ? "Alerts for incidents, imports and critical tasks" : "Avisos de incidencias, importaciones y tareas críticas"} value={settings.emailNotifications} onChange={(value) => update("emailNotifications", value)} />
          <ToggleRow icon={<MessageSquare className="h-4 w-4" />} label={isEn ? "Chat sound" : "Sonido en chat"} description={isEn ? "Play sound when new messages arrive" : "Reproducir aviso al llegar nuevos mensajes"} value={settings.chatSoundEnabled} onChange={(value) => update("chatSoundEnabled", value)} />
          <ToggleRow icon={<Sparkles className="h-4 w-4" />} label={isEn ? "Advanced metrics" : "Métricas avanzadas"} description={isEn ? "Show extended KPIs in dashboard" : "Mostrar KPIs extendidos en el dashboard"} value={settings.showAdvancedMetrics} onChange={(value) => update("showAdvancedMetrics", value)} />
          <ToggleRow icon={<Settings2 className="h-4 w-4" />} label={isEn ? "Compact sidebar" : "Sidebar compacta"} description={isEn ? "Tighter navigation for small screens" : "Navegación más ajustada para pantallas pequeñas"} value={settings.compactSidebar} onChange={(value) => update("compactSidebar", value)} />
        </div>

        <div id="integration-section" className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900"><Clock3 className="h-5 w-5" />{isEn ? "Quick integration with modules" : "Integración rápida con módulos"}</h2>
          <p className="mt-2 text-sm text-zinc-600">{isEn ? "Settings apply instantly to connected modules and persist per browser." : "Los ajustes se aplican al instante en módulos conectados y se mantienen por navegador."}</p>
          <div className="mt-4 grid gap-2">
            <QuickLink href="/dashboard" label="Dashboard" description={isEn ? "Validate advanced metrics and overview" : "Validar métricas avanzadas y vista general"} />
            <QuickLink href="/orders" label={isEn ? "Orders" : "Pedidos"} description={isEn ? "Apply language, currency, refresh and rows" : "Aplicar idioma, divisa, refresco y filas"} />
            <QuickLink href="/products" label={isEn ? "Products" : "Productos"} description={isEn ? "Validate pagination, currency and stock threshold" : "Validar paginación, divisa y umbral de stock"} />
            <QuickLink href="/chat" label="Chat" description={isEn ? "Check notifications and sound" : "Comprobar notificaciones y sonido"} />
          </div>
          <div className="mt-5 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 text-xs text-zinc-600">
            {hasChanges ? (isEn ? "You have unsaved changes. Save to apply and persist them." : "Tienes cambios sin guardar. Guarda para aplicarlos y persistirlos.") : (isEn ? "No pending changes. Configuration synced." : "Sin cambios pendientes. Configuración sincronizada.")}
          </div>
          <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
            <p className="flex items-center gap-2 font-medium text-zinc-700"><Globe className="h-4 w-4" />{isEn ? "Current language" : "Idioma actual"}: {locale.toUpperCase()}</p>
            <p className="mt-1 flex items-center gap-2"><ImageIcon className="h-3.5 w-3.5" />{isEn ? "Active logo" : "Logo activo"}: {resolveAdminLogoSrc(settings)}</p>
          </div>
        </div>
      </section>

      {/* ── Deploy section ─────────────────────────────────────────── */}
      <section id="deploy-section">
        {/* Dark ops-style header */}
        <div className="rounded-t-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-5 border border-zinc-700">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Terminal className="h-5 w-5 text-emerald-400" />
                {isEn ? "Production Deploy" : "Deploy a Producción"}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                {isEn
                  ? "Configure repository credentials and trigger a production deployment via the deploy script."
                  : "Configura las credenciales del repositorio y lanza un deploy a producción mediante el script de despliegue."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Live status pill */}
              {deployStatus ? (
                <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
                  deployStatus.running
                    ? "bg-amber-900/50 text-amber-300 border-amber-700 animate-pulse"
                    : deployStatus.success === true
                    ? "bg-emerald-900/50 text-emerald-300 border-emerald-700"
                    : deployStatus.success === false
                    ? "bg-red-900/50 text-red-300 border-red-700"
                    : "bg-zinc-700/50 text-zinc-400 border-zinc-600"
                }`}>
                  {deployStatus.running ? (
                    <><Loader2 className="h-3 w-3 animate-spin" />{isEn ? "Deploying" : "Desplegando"} {formatDeployDuration(elapsedMs)}</>
                  ) : deployStatus.success === true ? (
                    <><CheckCircle2 className="h-3 w-3" />{isEn ? "Last: OK" : "Último: OK"} · {formatDeployDuration(deployStatus.durationMs)}</>
                  ) : deployStatus.success === false ? (
                    <><XCircle className="h-3 w-3" />{isEn ? "Last: Failed" : "Último: Fallido"}</>
                  ) : (
                    <><Clock className="h-3 w-3" />{isEn ? "No deploys yet" : "Sin deploys aún"}</>
                  )}
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-zinc-500 border border-zinc-700 bg-zinc-800">
                  <Loader2 className="h-3 w-3 animate-spin" />{isEn ? "Loading…" : "Cargando…"}
                </div>
              )}
              <button
                type="button"
                onClick={onRefreshDeployStatus}
                title={isEn ? "Refresh status" : "Actualizar estado"}
                className="rounded-lg border border-zinc-600 bg-zinc-700 p-1.5 text-zinc-300 hover:bg-zinc-600 hover:text-white transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="rounded-b-2xl border border-t-0 border-zinc-200/80 bg-white p-6 shadow-sm space-y-6">

          {/* Git configuration */}
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50 p-4 space-y-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <GitBranch className="h-4 w-4" />
              {isEn ? "Repository" : "Repositorio"}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-zinc-700">
                {isEn ? "Repository URL" : "URL del repositorio"}
                <span className="ml-1 text-xs text-zinc-400">(HTTPS / SSH)</span>
                <input
                  type="text"
                  value={deployConfig.repoUrl ?? ""}
                  onChange={(e) => setDeployConfig((p) => ({ ...p, repoUrl: e.target.value }))}
                  placeholder={deployPublic?.repoUrl || "https://github.com/org/repo.git"}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </label>
              <label className="block text-sm text-zinc-700">
                {isEn ? "Branch" : "Rama"}
                <span className="ml-1 text-xs text-zinc-400">({isEn ? "blank = auto" : "vacío = auto"})</span>
                <input
                  type="text"
                  value={deployConfig.branch ?? ""}
                  onChange={(e) => setDeployConfig((p) => ({ ...p, branch: e.target.value }))}
                  placeholder={deployPublic?.branch || "main"}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </label>
            </div>

            {/* Auth method tabs */}
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 mb-2">
                <KeyRound className="h-4 w-4" />
                {isEn ? "Authentication method" : "Método de autenticación"}
              </p>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setDeployAuthMethod("token")}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    deployAuthMethod === "token"
                      ? "border-zinc-800 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  🔑 {isEn ? "HTTPS Token" : "Token HTTPS"}
                  {deployPublic?.hasGitToken && (
                    <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-emerald-600 text-[10px]">
                      ✓
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setDeployAuthMethod("ssh")}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    deployAuthMethod === "ssh"
                      ? "border-zinc-800 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  🔐 {isEn ? "SSH Key" : "Clave SSH"}
                  {deployPublic?.hasSshKey && (
                    <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-emerald-600 text-[10px]">
                      ✓
                    </span>
                  )}
                </button>
              </div>

              {deployAuthMethod === "token" && (
                <div className="rounded-lg border border-zinc-200 bg-white p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500">
                      {isEn
                        ? "Used for private HTTPS repos. The token is injected into the git URL at deploy time."
                        : "Para repos HTTPS privados. El token se inyecta en la URL de git en el momento del deploy."}
                    </p>
                    {deployPublic?.hasGitToken && (
                      <button
                        type="button"
                        onClick={() => onClearDeploySecret("gitToken")}
                        className="text-xs text-red-500 hover:text-red-700 hover:underline ml-2 whitespace-nowrap"
                      >
                        {isEn ? "Remove token" : "Quitar token"}
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowTokenInput((p) => !p)}
                        className="text-xs text-zinc-500 hover:text-zinc-800 underline"
                      >
                        {showTokenInput
                          ? (isEn ? "▲ Hide fields" : "▲ Ocultar campos")
                          : (deployPublic?.hasGitToken
                              ? (isEn ? "▼ Change token" : "▼ Cambiar token")
                              : (isEn ? "▼ Set token" : "▼ Configurar token"))}
                      </button>
                    </div>
                  </div>
                  {showTokenInput && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm text-zinc-700">
                        {isEn ? "Git username" : "Usuario git"}
                        <input
                          type="text"
                          value={deployConfig.gitUsername ?? ""}
                          onChange={(e) => setDeployConfig((p) => ({ ...p, gitUsername: e.target.value }))}
                          placeholder={deployPublic?.gitUsername || "oauth2"}
                          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                        />
                      </label>
                      <label className="block text-sm text-zinc-700">
                        {isEn ? "Token / PAT" : "Token / PAT"}
                        <input
                          type="password"
                          value={deployConfig.gitToken ?? ""}
                          onChange={(e) => setDeployConfig((p) => ({ ...p, gitToken: e.target.value }))}
                          placeholder="ghp_xxxxxxxxxxxx"
                          autoComplete="new-password"
                          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {deployAuthMethod === "ssh" && (
                <div className="rounded-lg border border-zinc-200 bg-white p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500">
                      {isEn
                        ? "Paste the private key for SSH-based private repos (stored encrypted server-side)."
                        : "Pega la clave privada para repos SSH privados (almacenada de forma segura en el servidor)."}
                    </p>
                    {deployPublic?.hasSshKey && (
                      <button
                        type="button"
                        onClick={() => onClearDeploySecret("sshPrivateKey")}
                        className="text-xs text-red-500 hover:text-red-700 hover:underline ml-2 whitespace-nowrap"
                      >
                        {isEn ? "Remove key" : "Quitar clave"}
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSshInput((p) => !p)}
                    className="text-xs text-zinc-500 hover:text-zinc-800 underline"
                  >
                    {showSshInput
                      ? (isEn ? "▲ Hide key" : "▲ Ocultar clave")
                      : (deployPublic?.hasSshKey
                          ? (isEn ? "▼ Replace key" : "▼ Reemplazar clave")
                          : (isEn ? "▼ Paste key" : "▼ Pegar clave"))}
                  </button>
                  {showSshInput && (
                    <textarea
                      value={deployConfig.sshPrivateKey ?? ""}
                      onChange={(e) => setDeployConfig((p) => ({ ...p, sshPrivateKey: e.target.value }))}
                      rows={7}
                      placeholder={"-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----"}
                      spellCheck={false}
                      autoComplete="off"
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-950 px-3 py-2 font-mono text-xs text-emerald-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                disabled={deployConfigSaving}
                onClick={onSaveDeployConfig}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 transition"
              >
                {deployConfigSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {deployConfigSaving ? (isEn ? "Saving…" : "Guardando…") : (isEn ? "Save config" : "Guardar config")}
              </button>
            </div>
          </div>

          {/* Trigger deploy */}
          <div className="rounded-xl border border-zinc-200 bg-gradient-to-r from-zinc-50 to-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                  <Play className="h-4 w-4 text-emerald-600" />
                  {isEn ? "Trigger deployment" : "Lanzar deploy"}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {isEn
                    ? "Runs ops/nexus_deploy.sh: git pull → install → migrate → build → PM2 restart"
                    : "Ejecuta ops/nexus_deploy.sh: git pull → install → migrar → build → reiniciar PM2"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {deployStatus?.startedAt && (
                  <p className="text-xs text-zinc-400">
                    {isEn ? "Started:" : "Inicio:"}{" "}
                    {new Date(deployStatus.startedAt).toLocaleTimeString()}
                    {deployStatus.durationMs !== null && (
                      <> · {formatDeployDuration(deployStatus.durationMs)}</>
                    )}
                  </p>
                )}
                {!deployConfirmStep ? (
                  <button
                    type="button"
                    disabled={!!deployStatus?.running}
                    onClick={() => setDeployConfirmStep(true)}
                    className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition shadow-sm ${
                      deployStatus?.running
                        ? "bg-amber-100 text-amber-700 border border-amber-300 cursor-not-allowed"
                        : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95"
                    }`}
                  >
                    {deployStatus?.running ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />{isEn ? "Deploying…" : "Desplegando…"}</>
                    ) : (
                      <><Play className="h-4 w-4" />{isEn ? "Deploy now" : "Deploy ahora"}</>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-xs font-medium text-amber-800">{isEn ? "Deploy to production?" : "¿Deploy a producción?"}</span>
                    <button
                      type="button"
                      onClick={onTriggerDeploy}
                      className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95 transition"
                    >
                      {isEn ? "Yes, deploy" : "Sí, deployar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeployConfirmStep(false)}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 transition"
                    >
                      {isEn ? "Cancel" : "Cancelar"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Log terminal */}
          {deployStatus && deployStatus.logs.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
              {/* Terminal toolbar */}
              <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-red-500/80" />
                    <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                    <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-xs text-zinc-400 font-mono">
                    nexus_deploy.sh
                    {deployStatus.running && <span className="ml-2 text-amber-400 animate-pulse">● running</span>}
                    {deployStatus.success === true && <span className="ml-2 text-emerald-400">● exited 0</span>}
                    {deployStatus.success === false && <span className="ml-2 text-red-400">● exited {deployStatus.exitCode}</span>}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-zinc-600">{deployStatus.logs.length} {isEn ? "lines" : "líneas"}</span>
                  <button
                    type="button"
                    onClick={onCopyLogs}
                    title={isEn ? "Copy logs" : "Copiar logs"}
                    className="ml-2 rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300 transition"
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onClearDeployLogs}
                    disabled={!!deployStatus.running}
                    title={isEn ? "Clear logs" : "Limpiar logs"}
                    className="rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-red-400 transition disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {/* Log lines */}
              <div className="max-h-96 overflow-y-auto p-3 space-y-0">
                {deployStatus.logs.map((line, i) => (
                  <div key={i} className="flex gap-3 font-mono text-xs leading-relaxed">
                    <span className="select-none text-zinc-700 w-10 shrink-0 text-right tabular-nums">
                      {i + 1}
                    </span>
                    <span className={
                      line.includes("ERROR") || line.includes("FAILED") || line.includes("error") || line.includes("[stderr]")
                        ? "text-red-400"
                        : line.includes("SUCCESS") || line.includes("✓") || line.includes("OK")
                        ? "text-emerald-400"
                        : line.startsWith("[deploy]")
                        ? "text-sky-400"
                        : "text-zinc-300"
                    }>
                      {line}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}

          {/* Deploy history */}
          {deployHistory.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                  <History className="h-4 w-4" />
                  {isEn ? "Deploy history" : "Historial de deploys"}
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">{deployHistory.length}</span>
                </p>
                <button
                  type="button"
                  onClick={onClearDeployHistory}
                  className="text-xs text-zinc-400 hover:text-red-500 hover:underline"
                >
                  {isEn ? "Clear history" : "Limpiar historial"}
                </button>
              </div>
              <div className="rounded-xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100">
                {deployHistory.map((entry) => (
                  <div key={entry.id} className="bg-white">
                    <button
                      type="button"
                      onClick={() => setExpandedHistoryId(expandedHistoryId === entry.id ? null : entry.id)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-50 transition text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${entry.success ? "bg-emerald-500" : "bg-red-500"}`} />
                        <div>
                          <p className="text-xs font-medium text-zinc-900">
                            {new Date(entry.startedAt).toLocaleString()}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {isEn ? "Duration:" : "Duración:"} {formatDeployDuration(entry.durationMs)}
                            {" · "}
                            {isEn ? "Exit:" : "Código:"} {entry.exitCode}
                            {" · "}
                            {entry.logLines} {isEn ? "lines" : "líneas"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          entry.success
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}>
                          {entry.success ? (isEn ? "Success" : "Éxito") : (isEn ? "Failed" : "Fallido")}
                        </span>
                        <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${expandedHistoryId === entry.id ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                    {expandedHistoryId === entry.id && entry.tailLogs.length > 0 && (
                      <div className="border-t border-zinc-100 bg-zinc-950 px-3 py-2 max-h-48 overflow-y-auto">
                        {entry.tailLogs.map((line, i) => (
                          <p key={i} className={`font-mono text-xs leading-relaxed ${
                            line.includes("ERROR") || line.includes("FAILED")
                              ? "text-red-400"
                              : line.includes("SUCCESS") || line.includes("✓")
                              ? "text-emerald-400"
                              : line.startsWith("[deploy]")
                              ? "text-sky-400"
                              : "text-zinc-400"
                          }`}>
                            {line}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {hasChanges && (
        <div className="fixed bottom-4 right-4 left-4 lg:left-auto lg:w-[520px] rounded-xl border border-zinc-200 bg-white/95 backdrop-blur p-3 shadow-2xl z-40">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-600">{isEn ? "You have unsaved changes in Settings." : "Tienes cambios sin guardar en Ajustes."}</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onDiscard} className="text-xs rounded-md border border-zinc-200 px-2.5 py-1.5 hover:bg-zinc-50">{isEn ? "Discard" : "Descartar"}</button>
              <button type="button" disabled={settingsSaving} onClick={onSave} className="text-xs rounded-md bg-zinc-900 text-white px-2.5 py-1.5 hover:bg-zinc-800 disabled:opacity-60">{settingsSaving ? (isEn ? "Saving..." : "Guardando...") : (isEn ? "Save now" : "Guardar ahora")}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (next: number) => void; }) {
  return (
    <label className="block text-sm text-zinc-700">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        inputMode="numeric"
        onChange={(e) => onChange(clampNumberInput(e.target.value, min, max))}
        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
      />
    </label>
  );
}

function ToggleRow({ icon, label, description, value, onChange }: { icon: React.ReactNode; label: string; description: string; value: boolean; onChange: (value: boolean) => void; }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200/90 bg-gradient-to-r from-white to-zinc-50 p-3">
      <div>
        <p className="flex items-center gap-2 text-sm font-medium text-zinc-900">{icon}{label}</p>
        <p className="mt-1 text-xs text-zinc-600">{description}</p>
      </div>
      <button type="button" onClick={() => onChange(!value)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${value ? "bg-zinc-900" : "bg-zinc-300"}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${value ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

function QuickLink({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <Link href={href} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-sm">
      <p className="text-sm font-medium text-zinc-900">{label}</p>
      <p className="text-xs text-zinc-600">{description}</p>
    </Link>
  );
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function clampNumberInput(value: string, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
