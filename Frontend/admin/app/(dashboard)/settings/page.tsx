"use client";

import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Building2,
  CheckCircle2,
  CircleDot,
  Clock3,
  Gauge,
  GitBranch,
  Globe,
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
  Undo2,
  XCircle,
} from "lucide-react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { updateAdminCredentials } from "@/lib/api";
import { fetchRemoteBrandingSettings, saveRemoteBrandingSettings, uploadBrandingLogo } from "@/lib/api/branding";
import {
  clearDeploySecret,
  fetchDeploySettings,
  fetchDeployStatus,
  saveDeploySettings,
  triggerDeploy,
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

/** Delay (ms) before auto-scrolling deploy logs — allows React to flush DOM updates first */
const LOG_SCROLL_DELAY_MS = 50;

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
  const [deploying, setDeploying] = useState(false);
  const [showSshInput, setShowSshInput] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const deployPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

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
      .then((data) => setDeployStatus(data))
      .catch((err) => { console.error("[deploy] Could not load deploy status:", err); });
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

  function startDeployPolling() {
    if (deployPollRef.current) clearInterval(deployPollRef.current);
    deployPollRef.current = setInterval(async () => {
      try {
        const data = await fetchDeployStatus();
        setDeployStatus(data);
        if (!data.running) {
          if (deployPollRef.current) clearInterval(deployPollRef.current);
          setDeploying(false);
          if (data.success === true) {
            toast.success(isEn ? "Deployment completed successfully" : "Deploy completado con éxito");
          } else if (data.success === false) {
            toast.error(isEn ? "Deployment failed — check logs" : "El deploy falló — revisa los logs");
          }
        }
        setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), LOG_SCROLL_DELAY_MS);
      } catch {
        // noop
      }
    }, 2000);
  }

  async function onTriggerDeploy() {
    if (deploying) return;
    setDeploying(true);
    try {
      const data = await triggerDeploy();
      setDeployStatus(data);
      startDeployPolling();
      toast.info(isEn ? "Deployment started…" : "Deploy iniciado…");
    } catch (err: unknown) {
      setDeploying(false);
      const message = err instanceof Error ? err.message : (isEn ? "Could not start deployment" : "No se pudo iniciar el deploy");
      toast.error(message);
    }
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
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
                <Terminal className="h-5 w-5" />
                {isEn ? "Deploy" : "Deploy"}
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                {isEn
                  ? "Configure repository credentials and trigger a production deployment via the deploy script."
                  : "Configura las credenciales del repositorio y lanza un deploy a producción mediante el script de despliegue."}
              </p>
            </div>
            {deployStatus && (
              <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                deployStatus.running
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : deployStatus.success === true
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : deployStatus.success === false
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-zinc-100 text-zinc-600 border border-zinc-200"
              }`}>
                {deployStatus.running ? (
                  <><Loader2 className="h-3 w-3 animate-spin" />{isEn ? "Deploying…" : "Desplegando…"}</>
                ) : deployStatus.success === true ? (
                  <><CheckCircle2 className="h-3 w-3" />{isEn ? "Last deploy: OK" : "Último deploy: OK"}</>
                ) : deployStatus.success === false ? (
                  <><XCircle className="h-3 w-3" />{isEn ? "Last deploy: Failed" : "Último deploy: Fallido"}</>
                ) : (
                  <><RefreshCw className="h-3 w-3" />{isEn ? "No deploys yet" : "Sin deploys aún"}</>
                )}
              </div>
            )}
          </div>

          {/* Git configuration */}
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50 p-4 space-y-4">
            <p className="flex items-center gap-2 text-sm font-medium text-zinc-900">
              <GitBranch className="h-4 w-4" />
              {isEn ? "Repository configuration" : "Configuración del repositorio"}
            </p>
            <p className="text-xs text-zinc-500">
              {isEn
                ? "Leave blank to use the existing values from the deploy script. Only fill fields you want to change or set."
                : "Deja en blanco para usar los valores existentes del script de deploy. Solo rellena los campos que quieras cambiar o configurar."}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-zinc-700">
                {isEn ? "Repository URL (HTTPS or SSH)" : "URL del repositorio (HTTPS o SSH)"}
                <input
                  type="text"
                  value={deployConfig.repoUrl ?? ""}
                  onChange={(e) => setDeployConfig((p) => ({ ...p, repoUrl: e.target.value }))}
                  placeholder={deployPublic?.repoUrl || (isEn ? "https://github.com/org/repo.git" : "https://github.com/org/repo.git")}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </label>
              <label className="block text-sm text-zinc-700">
                {isEn ? "Branch (leave blank for auto-detect)" : "Rama (en blanco para auto-detectar)"}
                <input
                  type="text"
                  value={deployConfig.branch ?? ""}
                  onChange={(e) => setDeployConfig((p) => ({ ...p, branch: e.target.value }))}
                  placeholder={deployPublic?.branch || "main"}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </label>
            </div>

            {/* HTTPS Token */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm text-zinc-700">
                  <KeyRound className="h-4 w-4" />
                  {isEn ? "Git token (for private HTTPS repos)" : "Token git (para repos HTTPS privados)"}
                  {deployPublic?.hasGitToken && (
                    <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                      {isEn ? "configured" : "configurado"}
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  {deployPublic?.hasGitToken && (
                    <button
                      type="button"
                      onClick={() => onClearDeploySecret("gitToken")}
                      className="text-xs text-red-600 hover:underline"
                    >
                      {isEn ? "Clear" : "Eliminar"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowTokenInput((p) => !p)}
                    className="text-xs text-zinc-500 hover:text-zinc-800"
                  >
                    {showTokenInput ? (isEn ? "Hide" : "Ocultar") : (isEn ? "Set new token" : "Configurar nuevo token")}
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
                    {isEn ? "Token / Password" : "Token / Contraseña"}
                    <input
                      type="password"
                      value={deployConfig.gitToken ?? ""}
                      onChange={(e) => setDeployConfig((p) => ({ ...p, gitToken: e.target.value }))}
                      placeholder={isEn ? "ghp_xxxxxxxxxxxx" : "ghp_xxxxxxxxxxxx"}
                      autoComplete="new-password"
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* SSH Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm text-zinc-700">
                  <KeyRound className="h-4 w-4" />
                  {isEn ? "SSH private key (for private SSH repos)" : "Clave privada SSH (para repos SSH privados)"}
                  {deployPublic?.hasSshKey && (
                    <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                      {isEn ? "configured" : "configurada"}
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  {deployPublic?.hasSshKey && (
                    <button
                      type="button"
                      onClick={() => onClearDeploySecret("sshPrivateKey")}
                      className="text-xs text-red-600 hover:underline"
                    >
                      {isEn ? "Clear" : "Eliminar"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowSshInput((p) => !p)}
                    className="text-xs text-zinc-500 hover:text-zinc-800"
                  >
                    {showSshInput ? (isEn ? "Hide" : "Ocultar") : (isEn ? "Set new key" : "Configurar nueva clave")}
                  </button>
                </div>
              </div>
              {showSshInput && (
                <textarea
                  value={deployConfig.sshPrivateKey ?? ""}
                  onChange={(e) => setDeployConfig((p) => ({ ...p, sshPrivateKey: e.target.value }))}
                  rows={6}
                  placeholder={"-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----"}
                  spellCheck={false}
                  autoComplete="off"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-xs shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              )}
            </div>

            <button
              type="button"
              disabled={deployConfigSaving}
              onClick={onSaveDeployConfig}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              {deployConfigSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {deployConfigSaving ? (isEn ? "Saving…" : "Guardando…") : (isEn ? "Save deploy config" : "Guardar configuración de deploy")}
            </button>
          </div>

          {/* Trigger */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={deploying}
              onClick={onTriggerDeploy}
              className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
                deploying
                  ? "bg-amber-500 text-white cursor-not-allowed opacity-80"
                  : "bg-zinc-900 text-white hover:bg-zinc-700"
              }`}
            >
              {deploying ? (
                <><Loader2 className="h-4 w-4 animate-spin" />{isEn ? "Deploying…" : "Desplegando…"}</>
              ) : (
                <><Play className="h-4 w-4" />{isEn ? "Start deployment" : "Iniciar deploy"}</>
              )}
            </button>
            {deployStatus?.startedAt && (
              <p className="text-xs text-zinc-500">
                {isEn ? "Last started:" : "Último inicio:"}{" "}
                {new Date(deployStatus.startedAt).toLocaleString()}
                {deployStatus.finishedAt && (
                  <> · {isEn ? "Finished:" : "Fin:"} {new Date(deployStatus.finishedAt).toLocaleString()}</>
                )}
                {deployStatus.exitCode !== null && (
                  <> · {isEn ? "Exit code:" : "Código:"} {deployStatus.exitCode}</>
                )}
              </p>
            )}
          </div>

          {/* Logs */}
          {deployStatus && deployStatus.logs.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-950 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-zinc-400">
                  {isEn ? "Deploy log" : "Log de deploy"} ({deployStatus.logs.length} {isEn ? "lines" : "líneas"})
                </p>
                {deploying && <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />}
              </div>
              <div className="max-h-80 overflow-y-auto space-y-0.5">
                {deployStatus.logs.map((line, i) => (
                  <p key={i} className={`font-mono text-xs leading-snug whitespace-pre-wrap break-all ${
                    line.includes("ERROR") || line.includes("FAILED") || line.includes("error")
                      ? "text-red-400"
                      : line.includes("SUCCESS") || line.includes("OK")
                      ? "text-emerald-400"
                      : "text-zinc-300"
                  }`}>
                    {line}
                  </p>
                ))}
                <div ref={logsEndRef} />
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
