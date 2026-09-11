import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, Menu, Plus, Search, Settings, Sun, Moon } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { useNotifications } from '@/hooks/useNotifications'
import { useTheme } from '@/hooks/useTheme'
import { CommandMenu } from '@/components/layout/CommandMenu'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const { user, signOut } = useAuth()
  const { activeMembership, memberships, switchWorkspace } = useWorkspace()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [commandOpen, setCommandOpen] = useState(false)

  const initials = (activeMembership?.name ?? user?.email ?? '?').slice(0, 2).toUpperCase()

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 md:gap-3 md:px-4">
      <Button size="icon" variant="ghost" className="md:hidden" onClick={onOpenMobileNav}>
        <Menu className="size-4" />
      </Button>

      <button
        onClick={() => setCommandOpen(true)}
        className="flex h-9 flex-1 items-center gap-2 rounded-md border border-input bg-input/20 px-3 text-sm text-muted-foreground transition-colors hover:bg-input/30 md:max-w-sm"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Buscar...</span>
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </button>

      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />

      <DropdownMenu>
        <DropdownMenuTrigger className={cn(buttonVariants({ size: 'sm' }), 'gap-1')}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Criar</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => navigate('/pedidos?new=1')}>Novo pedido</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/clientes?new=1')}>Novo cliente</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/produtos?new=1')}>Novo produto</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/atividades?new=1')}>Nova atividade</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu onOpenChange={(open) => { if (!open) markAllAsRead() }}>
        <DropdownMenuTrigger className={cn(buttonVariants({ size: 'icon', variant: 'ghost' }), 'relative')}>
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full p-0 text-[10px]">
              {unreadCount}
            </Badge>
          ) : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Notificações</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {notifications.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">Nenhuma notificação por aqui.</p>
          ) : (
            <div className="flex max-h-80 flex-col overflow-y-auto">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`flex flex-col gap-0.5 rounded-md px-2 py-2 text-left text-sm hover:bg-accent ${
                    n.read ? 'opacity-60' : ''
                  }`}
                >
                  <span className="font-medium text-foreground">{n.title}</span>
                  {n.body ? <span className="text-xs text-muted-foreground">{n.body}</span> : null}
                  <span className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </button>
              ))}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-accent">
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary text-xs text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
          </DropdownMenuGroup>
          {memberships.length > 1 ? (
            <>
              <DropdownMenuSeparator />
              {memberships.map((m) => (
                <DropdownMenuItem key={m.workspace.id} onClick={() => switchWorkspace(m.workspace.id)}>
                  {m.workspace.name}
                </DropdownMenuItem>
              ))}
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
            <Settings className="size-4" />
            Configurações
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
            <LogOut className="size-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
