"use client";

import { Button } from "@/components/ui/button";
import { User, Settings, Shield, Key, Mail } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";

export function UserProfile() {
  const { user } = useUser();

  return (
    <div className="space-y-6">
          {/* Current User Info */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-12 h-12",
                },
              }}
            />
            <div className="flex-1">
              <h3 className="font-medium text-slate-900 dark:text-slate-100">
                {user?.fullName || user?.firstName || "User"}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>

          {/* Profile Management Options */}
          <div className="space-y-3">
            <h4 className="font-medium text-slate-900 dark:text-slate-100">
              Account Management
            </h4>
            
            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-slate-500" />
                  <div>
                    <span className="font-medium">Profile Information</span>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Update your name, email, and profile picture
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-slate-500" />
                  <div>
                    <span className="font-medium">Security Settings</span>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Password, 2FA, and security preferences
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <div>
                    <span className="font-medium">Email Addresses</span>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Manage your email addresses and verification
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-slate-500" />
                  <div>
                    <span className="font-medium">API Keys</span>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Manage your API keys and integrations
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>
            </div>
          </div>

          {/* Clerk User Button */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              🔧 Advanced Settings
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              For detailed account management, use the Clerk user profile below:
            </p>
            <div className="flex justify-center">
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10",
                  },
                }}
              />
            </div>
          </div>
        </div>
  );
}
