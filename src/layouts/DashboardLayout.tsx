import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Users,
  LogOut,
  ChevronRight,
  MessageCircle,
  Bell,
  CreditCard,
  UserCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
  submenu?: {
    label: string;
    path: string;
  }[];
}

interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  whatsapp?: string;
  company_name?: string;
  avatar_url?: string;
  is_active: boolean;
}

export function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pageTitle, setPageTitle] = useState('');
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [hasNotifications] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        // Usar o serviço de dados simulado em vez do Supabase
        const { data, error } = await supabase.from('profiles').select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfileData(data as ProfileData);
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
      }
    };

    loadProfile();
  }, [user]);

  useEffect(() => {
    switch (location.pathname) {
      case '/':
        setPageTitle('Dashboard');
        break;
      case '/clients':
        setPageTitle('Usuários');
        break;
      case '/messages':
        setPageTitle('WhatsApp');
        break;
      case '/messages/chatzap':
        setPageTitle('ChatZap');
        break;
      case '/messages/multi':
        setPageTitle('Multiatendimento');
        break;
      case '/messages/campaigns':
        setPageTitle('Lead');
        break;
      case '/messages/instances':
        setPageTitle('Instâncias');
        break;
      case '/messages/mass':
        setPageTitle('Disparo em Massa');
        break;
      case '/messages/reports':
        setPageTitle('Relatórios');
        break;
      case '/settings/profile':
        setPageTitle('Perfil');
        break;
      case '/settings/plans':
        setPageTitle('Planos');
        break;
      case '/billing':
        setPageTitle('Faturamento');
        break;
      case '/checkout':
        setPageTitle('Checkout');
        break;

      default:
        setPageTitle('');
    }
  }, [location]);

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao sair:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const menuItems: MenuItem[] = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { 
      icon: MessageCircle,
      label: 'WhatsApp', 
      path: '/messages',
      submenu: [
        { label: 'Instâncias', path: '/messages/instances' },
        { label: 'ChatZap', path: '/messages/chatzap' },
        { label: 'Multiatendimento', path: '/messages/multi' },
        { label: 'Lead', path: '/messages/campaigns' },
        { label: 'Disparo em Massa', path: '/messages/mass' },
        { label: 'Relatórios', path: '/messages/reports' }
      ]
    },
    { icon: Users, label: 'Usuários', path: '/clients' },
    { icon: CreditCard, label: 'Faturamento', path: '/billing' },

    { icon: UserCircle, label: 'Perfil', path: '/settings/profile' }
  ];

  const handleMenuClick = (item: MenuItem) => {
    if (item.submenu) {
      setExpandedMenu(expandedMenu === item.path ? null : item.path);
    } else {
      setExpandedMenu(null);
    }
  };

  const isMenuActive = (item: MenuItem) => {
    if (item.path === '/') {
      return location.pathname === '/';
    }
    
    // Para menus com submenu, verificar se algum item do submenu está ativo
    if (item.submenu) {
      return item.submenu.some(subItem => location.pathname === subItem.path);
    }
    
    // Para itens sem submenu, verificar correspondência exata
    return location.pathname === item.path;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200',
          'flex flex-col transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        {/* Toggle button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 z-50"
        >
          <ChevronRight
            className={cn(
              'h-4 w-4 transition-transform',
              isCollapsed ? '' : 'rotate-180'
            )}
          />
        </button>

        {/* Logo section */}
        <div className="bg-primary-600 p-4 flex items-center justify-center h-16">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-8 w-8 text-white" />
            {!isCollapsed && (
              <h1 className="text-xl font-bold text-white truncate">ConecteZap</h1>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4">
          <nav className="space-y-3">
            {menuItems.map((item) => (
              <div key={item.path}>
                <NavLink
                  to={item.submenu ? '#' : item.path}
                  onClick={() => handleMenuClick(item)}
                  className={() =>
                    cn(
                      'flex items-center rounded-lg py-3 text-gray-600 transition-colors',
                      isCollapsed ? 'justify-center px-0' : 'px-3',
                      'hover:bg-primary-50 hover:text-primary-600',
                      isMenuActive(item) && 'bg-primary-50 text-primary-600'
                    )
                  }
                >
                  <item.icon className={cn(
                    "flex-shrink-0",
                    isCollapsed ? 'h-6 w-6' : 'h-5 w-5'
                  )} />
                  {!isCollapsed && (
                    <>
                      <span className="ml-3 text-sm font-medium flex-1">{item.label}</span>
                      {item.submenu && (
                        <ChevronRight
                          className={cn(
                            'h-4 w-4 transition-transform',
                            expandedMenu === item.path && 'rotate-90'
                          )}
                        />
                      )}
                    </>
                  )}
                </NavLink>
                {!isCollapsed && item.submenu && expandedMenu === item.path && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.submenu.map((subItem) => (
                      <NavLink
                        key={subItem.path}
                        to={subItem.path}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors',
                            'hover:bg-primary-50 hover:text-primary-600',
                            isActive && 'bg-primary-50 text-primary-600'
                          )
                        }
                      >
                        <span className="ml-3">{subItem.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* User profile */}
        <div className={cn(
          'border-t border-gray-200 bg-white',
          isCollapsed ? 'p-3' : 'p-4'
        )}>
          <div className="flex items-center justify-between gap-2">
            <div className={cn(
              "flex items-center gap-2 min-w-0",
              isCollapsed && "flex-col"
            )}>
              <div className="relative flex-shrink-0">
                {profileData?.avatar_url ? (
                  <img
                    src={profileData.avatar_url}
                    alt={profileData.full_name || 'Avatar'}
                    className="h-10 w-10 rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center ${
                  profileData?.avatar_url ? 'hidden' : ''
                }`}>
                  <span className="text-sm font-medium text-primary-700">
                    {profileData?.full_name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                {hasNotifications && (
                  <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-700">
                    {profileData?.full_name || 'Usuário'}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {profileData?.email || 'usuário@exemplo.com'}
                  </p>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <button
                onClick={handleSignOut}
                disabled={isLoading}
                className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <LogOut className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn(
        'transition-all duration-300 ease-in-out',
        isCollapsed ? 'ml-20' : 'ml-64'
      )}>
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <h1 className="text-xl font-semibold text-gray-900">
              {pageTitle}
            </h1>

            {/* Right side actions */}
            <div className="flex items-center gap-3">
              {/* Notification bell */}
              <button
                className="relative rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                aria-label="Notificações"
              >
                <Bell className="h-6 w-6" />
                {hasNotifications && (
                  <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </button>

              {/* Responsive profile button for mobile */}
              <button className="md:hidden rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                <UserCircle className="h-6 w-6" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}