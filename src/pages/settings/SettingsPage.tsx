import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileTab } from '@/pages/settings/ProfileTab'
import { TeamTab } from '@/pages/settings/TeamTab'
import { PipelineTab } from '@/pages/settings/PipelineTab'
import { BrandsTab } from '@/pages/settings/BrandsTab'
import { PreferencesTab } from '@/pages/settings/PreferencesTab'
import { IntegrationsTab } from '@/pages/settings/IntegrationsTab'

export function SettingsPage() {
  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold text-foreground">Configurações</h1>
      <Tabs defaultValue="perfil">
        <TabsList>
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="marcas">Marcas</TabsTrigger>
          <TabsTrigger value="preferencias">Preferências</TabsTrigger>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
        </TabsList>
        <TabsContent value="perfil" className="mt-4">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="equipe" className="mt-4">
          <TeamTab />
        </TabsContent>
        <TabsContent value="pipeline" className="mt-4">
          <PipelineTab />
        </TabsContent>
        <TabsContent value="marcas" className="mt-4">
          <BrandsTab />
        </TabsContent>
        <TabsContent value="preferencias" className="mt-4">
          <PreferencesTab />
        </TabsContent>
        <TabsContent value="integracoes" className="mt-4">
          <IntegrationsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
