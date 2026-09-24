"use client";

import { useEffect, useState } from "react";
import {
  Camera,
  KeyRound,
  LockKeyhole,
  Save,
  ShieldCheck,
  User,
  Mail,
  AtSign,
} from "lucide-react";
import { useTranslations } from "@/i18n/translate";
import { AuthApi } from "@/lib/auth.api";
import { apiErrorMessage, imageUrl } from "@/lib/api";
import {
  useCurrentUser,
  useSetCurrentUser,
} from "@/components/auth/DashboardAuthGate";
import { Field, FormAlert, FormSection } from "@/components/ui/Field";
import {
  extractFieldErrors,
  focusFirstError,
  friendlyErrorMessage,
  isEmail,
  type FieldErrors,
} from "@/lib/form-errors";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";

export default function AccountPage() {
  const t = useTranslations("admin");
  const user = useCurrentUser();
  const setUser = useSetCurrentUser();
  const { showToast } = useToast();

  const [profile, setProfile] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
  });
  const [profilePassword, setProfilePassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileErrors, setProfileErrors] = useState<FieldErrors>({});
  const [passwordErrors, setPasswordErrors] = useState<FieldErrors>({});
  const [photoSaving, setPhotoSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user)
      setProfile({
        username: user.username ?? "",
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
  }, [user]);

  if (!user) return null;

  /** Efface l'erreur d'un champ dès que l'administrateur le modifie. */
  const clearError = (
    setter: React.Dispatch<React.SetStateAction<FieldErrors>>,
    key: string,
  ) =>
    setter((prev) =>
      key in prev || "form" in prev
        ? Object.fromEntries(
            Object.entries(prev).filter(([k]) => k !== key && k !== "form"),
          )
        : prev,
    );

  /** Contrôles faits dans le navigateur, avant d'appeler le serveur. */
  function validateProfile(): FieldErrors {
    const errors: FieldErrors = {};
    if (!profile.firstName.trim())
      errors.firstName = "Le prénom est obligatoire.";
    if (!profile.lastName.trim()) errors.lastName = "Le nom est obligatoire.";
    if (!profile.email.trim())
      errors.email = "L’adresse e-mail est obligatoire.";
    else if (!isEmail(profile.email))
      errors.email =
        "Saisissez une adresse e-mail valide (exemple : nom@domaine.com).";

    const sensitiveChanged =
      profile.email.trim().toLowerCase() !==
        (user?.email ?? "").toLowerCase() ||
      profile.username.trim() !== (user?.username ?? "");
    if (sensitiveChanged && !profilePassword) {
      errors.currentPassword =
        "Saisissez votre mot de passe actuel pour modifier l’e-mail ou le nom d’utilisateur.";
    }
    return errors;
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    const localErrors = validateProfile();
    setProfileErrors(localErrors);
    if (Object.keys(localErrors).length > 0)
      return focusFirstError(form, localErrors);

    setProfileSaving(true);
    try {
      const updated = await AuthApi.updateProfile({
        ...profile,
        currentPassword: profilePassword || undefined,
      });
      setUser(updated);
      setProfilePassword("");
      showToast("success", t("profileSaved"));
    } catch (err) {
      // Erreurs champ par champ renvoyées par le serveur ; sinon message clair en haut du formulaire.
      const fieldErrors = extractFieldErrors(err);
      const errors =
        Object.keys(fieldErrors).length > 0
          ? fieldErrors
          : { form: friendlyErrorMessage(err, t("profileError")) };
      setProfileErrors(errors);
      focusFirstError(form, errors);
    } finally {
      setProfileSaving(false);
    }
  }

  async function uploadPhoto(file?: File) {
    if (!file) return;
    setPhotoSaving(true);
    try {
      const url = await AuthApi.uploadProfilePhoto(file);
      setUser((prev) => (prev ? { ...prev, profilePhoto: url } : prev));
      showToast("success", t("photoSaved"));
    } catch (err) {
      showToast("error", apiErrorMessage(err, t("photoError")));
    } finally {
      setPhotoSaving(false);
    }
  }

  function validatePassword(): FieldErrors {
    const errors: FieldErrors = {};
    if (!currentPassword)
      errors.currentPassword = "Saisissez votre mot de passe actuel.";
    if (!newPassword) errors.newPassword = "Saisissez un nouveau mot de passe.";
    else if (newPassword.length < 8) errors.newPassword = t("passwordTooShort");
    else if (newPassword === currentPassword)
      errors.newPassword =
        "Le nouveau mot de passe doit être différent de l’actuel.";
    if (!confirmPassword)
      errors.confirmPassword = "Confirmez le nouveau mot de passe.";
    else if (newPassword && confirmPassword !== newPassword)
      errors.confirmPassword = t("passwordMismatch");
    return errors;
  }

  async function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    const localErrors = validatePassword();
    setPasswordErrors(localErrors);
    if (Object.keys(localErrors).length > 0)
      return focusFirstError(form, localErrors);

    setSaving(true);
    try {
      await AuthApi.changePassword(
        currentPassword,
        newPassword,
        confirmPassword,
      );
      showToast("success", t("passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const fieldErrors = extractFieldErrors(err);
      const errors =
        Object.keys(fieldErrors).length > 0
          ? fieldErrors
          : { form: friendlyErrorMessage(err, t("passwordError")) };
      setPasswordErrors(errors);
      focusFirstError(form, errors);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="space-y-6">
        <FormSection title={t("profile")} hint={t("profileHint")}>
          <form
            noValidate
            className="grid gap-6 md:grid-cols-[auto_1fr]"
            onSubmit={(e) => void saveProfile(e)}
          >
            <div className="flex flex-col items-center gap-3">
              <label className="group relative flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-surface bg-surface-alt shadow-lg ring-1 ring-border">
                {user.profilePhoto ? (
                  <img
                    src={imageUrl(user.profilePhoto)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-ink-soft">
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-white opacity-0 transition group-hover:opacity-100">
                  <Camera size={22} />
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => void uploadPhoto(e.target.files?.[0])}
                  disabled={photoSaving}
                />
              </label>
              <span className="text-center text-[11px] text-ink-faint">
                {photoSaving ? t("photoSaving") : t("photoHint")}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {profileErrors.form && (
                <div className="sm:col-span-2">
                  <FormAlert message={profileErrors.form} />
                </div>
              )}
              <Field
                label={t("firstName")}
                required
                error={profileErrors.firstName}
              >
                <input
                  name="firstName"
                  className="input"
                  autoComplete="given-name"
                  value={profile.firstName}
                  onChange={(e) => {
                    setProfile({ ...profile, firstName: e.target.value });
                    clearError(setProfileErrors, "firstName");
                  }}
                />
              </Field>
              <Field
                label={t("lastName")}
                required
                error={profileErrors.lastName}
              >
                <input
                  name="lastName"
                  className="input"
                  autoComplete="family-name"
                  value={profile.lastName}
                  onChange={(e) => {
                    setProfile({ ...profile, lastName: e.target.value });
                    clearError(setProfileErrors, "lastName");
                  }}
                />
              </Field>
              <Field label={t("username")} error={profileErrors.username}>
                <div className="relative">
                  <AtSign
                    size={15}
                    className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-faint"
                  />
                  <input
                    name="username"
                    className="input ps-9"
                    value={profile.username}
                    onChange={(e) => {
                      setProfile({ ...profile, username: e.target.value });
                      clearError(setProfileErrors, "username");
                      clearError(setProfileErrors, "currentPassword");
                    }}
                    placeholder="admin"
                    autoComplete="username"
                  />
                </div>
              </Field>
              <Field label={t("email")} required error={profileErrors.email}>
                <div className="relative">
                  <Mail
                    size={15}
                    className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-faint"
                  />
                  <input
                    name="email"
                    className="input ps-9"
                    type="email"
                    value={profile.email}
                    onChange={(e) => {
                      setProfile({ ...profile, email: e.target.value });
                      clearError(setProfileErrors, "email");
                      clearError(setProfileErrors, "currentPassword");
                    }}
                    autoComplete="email"
                  />
                </div>
              </Field>
              <Field
                label={t("currentPasswordSensitive")}
                hint={t("sensitiveHint")}
                error={profileErrors.currentPassword}
                className="sm:col-span-2"
              >
                <div className="relative">
                  <LockKeyhole
                    size={15}
                    className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-faint"
                  />
                  <input
                    name="currentPassword"
                    className="input ps-9"
                    type="password"
                    value={profilePassword}
                    onChange={(e) => {
                      setProfilePassword(e.target.value);
                      clearError(setProfileErrors, "currentPassword");
                    }}
                    autoComplete="current-password"
                  />
                </div>
              </Field>
              <div className="flex justify-end sm:col-span-2">
                <button className="btn-primary" disabled={profileSaving}>
                  <Save size={15} />
                  {profileSaving ? t("saving") : t("saveProfile")}
                </button>
              </div>
            </div>
          </form>
        </FormSection>

        <FormSection title={t("security")} hint={t("securityHint")}>
          <form
            noValidate
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => void submitPassword(e)}
          >
            {passwordErrors.form && (
              <div className="sm:col-span-2">
                <FormAlert message={passwordErrors.form} />
              </div>
            )}
            <Field
              label={t("currentPassword")}
              required
              error={passwordErrors.currentPassword}
              className="sm:col-span-2"
            >
              <div className="relative">
                <LockKeyhole
                  size={16}
                  className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-faint"
                />
                <input
                  name="currentPassword"
                  className="input ps-9"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    clearError(setPasswordErrors, "currentPassword");
                  }}
                  autoComplete="current-password"
                />
              </div>
            </Field>
            <Field
              label={t("newPassword")}
              required
              error={passwordErrors.newPassword}
            >
              <div className="relative">
                <KeyRound
                  size={16}
                  className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-faint"
                />
                <input
                  name="newPassword"
                  className="input ps-9"
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    clearError(setPasswordErrors, "newPassword");
                  }}
                  autoComplete="new-password"
                />
              </div>
            </Field>
            <Field
              label={t("confirmPassword")}
              required
              error={passwordErrors.confirmPassword}
            >
              <div className="relative">
                <KeyRound
                  size={16}
                  className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-faint"
                />
                <input
                  name="confirmPassword"
                  className="input ps-9"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearError(setPasswordErrors, "confirmPassword");
                  }}
                  autoComplete="new-password"
                />
              </div>
            </Field>
            <div className="flex justify-end sm:col-span-2">
              <button className="btn-primary" disabled={saving}>
                <Save size={15} />
                {saving ? t("changePassword") + "…" : t("changePassword")}
              </button>
            </div>
          </form>
        </FormSection>

        <div className="card flex items-center gap-3 p-4 text-sm text-ink-soft">
          <ShieldCheck size={18} className="text-emerald-600" />
          <span>{user.role === "ADMIN" ? t("roleAdmin") : t("roleStaff")}</span>
        </div>
      </div>
    </div>
  );
}
