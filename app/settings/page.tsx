import { EmailPreferences } from "@/components/settings/EmailPreferences";
import { ThemeSettings } from "@/components/settings/ThemeSettings";
import { DisplayPreferences } from "@/components/settings/DisplayPreferences";
import { KeyboardShortcuts } from "@/components/settings/KeyboardShortcuts";
import { DataExport } from "@/components/settings/DataExport";
import { AccessibilitySettings } from "@/components/settings/AccessibilitySettings";
import { UserProfile } from "@/components/settings/UserProfile";
import { CollapsibleCard } from "@/components/settings/CollapsibleCard";
import { User, Palette, Eye, Keyboard, Mail, Accessibility, Download } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-3">Settings</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Manage your account preferences and customize your workspace
          </p>
        </div>

        <div className="space-y-6">
          {/* User Profile & Account */}
          <CollapsibleCard
            icon={User}
            title="User Profile"
            description="Manage your account settings and profile information"
            defaultExpanded={true}
          >
            <UserProfile />
          </CollapsibleCard>
          
          {/* Theme Settings */}
          <CollapsibleCard
            icon={Palette}
            title="Theme Settings"
            description="Customize the appearance of your workspace"
          >
            <ThemeSettings />
          </CollapsibleCard>
          
          {/* Display Preferences */}
          <CollapsibleCard
            icon={Eye}
            title="Display Preferences"
            description="Customize how content is displayed in your workspace"
          >
            <DisplayPreferences />
          </CollapsibleCard>
          
          {/* Keyboard Shortcuts */}
          <CollapsibleCard
            icon={Keyboard}
            title="Keyboard Shortcuts"
            description="Learn the keyboard shortcuts to work more efficiently"
          >
            <KeyboardShortcuts />
          </CollapsibleCard>
          
          {/* Email Notifications */}
          <CollapsibleCard
            icon={Mail}
            title="Email Notifications"
            description="Configure how you receive email notifications for watched items"
          >
            <EmailPreferences />
          </CollapsibleCard>
          
          {/* Accessibility */}
          <CollapsibleCard
            icon={Accessibility}
            title="Accessibility"
            description="Customize the interface for better accessibility and usability"
          >
            <AccessibilitySettings />
          </CollapsibleCard>
          
          {/* Data Export */}
          <CollapsibleCard
            icon={Download}
            title="Data Export"
            description="Export your boards, cards, and data in various formats"
          >
            <DataExport />
          </CollapsibleCard>
        </div>
      </div>
    </div>
  );
}
