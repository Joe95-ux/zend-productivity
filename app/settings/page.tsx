import { EmailPreferences } from "@/components/settings/EmailPreferences";

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Manage your account preferences and notification settings
          </p>
        </div>

        <EmailPreferences />
      </div>
    </div>
  );
}
