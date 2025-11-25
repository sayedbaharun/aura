import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, User, Sun, Plug, Layers } from "lucide-react";
import ProfileSettings from "@/components/settings/profile-settings";
import MorningRitualConfig from "@/components/settings/morning-ritual-config";
import IntegrationsStatus from "@/components/settings/integrations-status";
import CategoriesManager from "@/components/settings/categories-manager";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-muted rounded-full">
            <Settings className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">
              Manage your profile, preferences, and system configuration
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="morning" className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              <span className="hidden sm:inline">Morning Ritual</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Plug className="h-4 w-4" />
              <span className="hidden sm:inline">Integrations</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Categories</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileSettings />
          </TabsContent>

          <TabsContent value="morning">
            <MorningRitualConfig />
          </TabsContent>

          <TabsContent value="integrations">
            <IntegrationsStatus />
          </TabsContent>

          <TabsContent value="categories">
            <CategoriesManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
