import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/providers/AuthProvider'
import { WorkspaceProvider } from '@/providers/WorkspaceProvider'
import { RequireAuth, RequireWorkspace, RequireSection, RedirectIfAuthed, RedirectIfHasWorkspace } from '@/routes/guards'
import { AppShell } from '@/components/layout/AppShell'
import { NoPermissionPage } from '@/pages/NoPermissionPage'

import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { CreateWorkspacePage } from '@/pages/onboarding/CreateWorkspacePage'

import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { OrdersPage } from '@/pages/orders/OrdersPage'
import { OrderPrintPage } from '@/pages/orders/OrderPrintPage'
import { ProductsPage } from '@/pages/products/ProductsPage'
import { ClientsPage } from '@/pages/clients/ClientsPage'
import { ClientDetailPage } from '@/pages/clients/ClientDetailPage'
import { ActivitiesPage } from '@/pages/activities/ActivitiesPage'
import { CalendarPage } from '@/pages/calendar/CalendarPage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { AutomationsPage } from '@/pages/automations/AutomationsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <Routes>
              <Route
                path="/login"
                element={
                  <RedirectIfAuthed>
                    <LoginPage />
                  </RedirectIfAuthed>
                }
              />
              <Route
                path="/signup"
                element={
                  <RedirectIfAuthed>
                    <SignupPage />
                  </RedirectIfAuthed>
                }
              />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route
                path="/reset-password"
                element={
                  <RequireAuth>
                    <ResetPasswordPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/onboarding"
                element={
                  <RequireAuth>
                    <RedirectIfHasWorkspace>
                      <CreateWorkspacePage />
                    </RedirectIfHasWorkspace>
                  </RequireAuth>
                }
              />

              <Route
                path="/pedidos/:id/imprimir"
                element={
                  <RequireAuth>
                    <RequireWorkspace>
                      <OrderPrintPage />
                    </RequireWorkspace>
                  </RequireAuth>
                }
              />

              <Route
                path="/"
                element={
                  <RequireAuth>
                    <RequireWorkspace>
                      <AppShell />
                    </RequireWorkspace>
                  </RequireAuth>
                }
              >
                <Route index element={<RequireSection section="dashboard"><DashboardPage /></RequireSection>} />
                <Route path="pedidos" element={<RequireSection section="pedidos"><OrdersPage /></RequireSection>} />
                <Route path="produtos" element={<RequireSection section="produtos"><ProductsPage /></RequireSection>} />
                <Route path="clientes" element={<RequireSection section="clientes"><ClientsPage /></RequireSection>} />
                <Route path="clientes/:id" element={<RequireSection section="clientes"><ClientDetailPage /></RequireSection>} />
                <Route path="atividades" element={<RequireSection section="atividades"><ActivitiesPage /></RequireSection>} />
                <Route path="calendario" element={<RequireSection section="calendario"><CalendarPage /></RequireSection>} />
                <Route path="relatorios" element={<RequireSection section="relatorios"><ReportsPage /></RequireSection>} />
                <Route path="automacoes" element={<RequireSection section="automacoes"><AutomationsPage /></RequireSection>} />
                <Route path="configuracoes" element={<RequireSection section="configuracoes"><SettingsPage /></RequireSection>} />
                <Route path="sem-permissao" element={<NoPermissionPage />} />
              </Route>
            </Routes>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App
