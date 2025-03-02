{/* Previous imports remain the same */}

export function DashboardLayout() {
  {/* Previous state and functions remain the same */}

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

        {/* User profile info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className={cn(
                "rounded-full bg-primary-100 flex items-center justify-center overflow-hidden",
                isCollapsed ? 'h-12 w-12' : 'h-10 w-10'
              )}>
                {user?.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={user.email || 'Profile'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-primary-600 font-medium">
                    {user?.email?.[0].toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-white" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-green-600">Online</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-2">
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <div key={item.path}>
                {/* Menu items remain the same */}
              </div>
            ))}
          </nav>
        </div>

        {/* Logout button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className={cn(
              'flex items-center rounded-lg py-2 text-gray-600 transition-colors w-full',
              'hover:bg-red-50 hover:text-red-600',
              isCollapsed ? 'justify-center px-0' : 'px-3'
            )}
          >
            <LogOut className={cn(
              "flex-shrink-0",
              isCollapsed ? 'h-6 w-6' : 'h-5 w-5'
            )} />
            {!isCollapsed && (
              <span className="ml-3 text-sm font-medium">Sair</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={cn(
          'min-h-screen transition-all duration-300 ease-in-out',
          isCollapsed ? 'ml-20' : 'ml-64'
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200">
          <div className="flex h-full items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Notification button */}
              <button className="relative p-2 text-gray-600 hover:text-primary-600 rounded-lg hover:bg-primary-50">
                <Bell className="h-5 w-5" />
                {hasNotifications && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
                )}
              </button>
              {/* Settings button */}
              <button 
                onClick={() => navigate('/settings/profile')}
                className="p-2 text-gray-600 hover:text-primary-600 rounded-lg hover:bg-primary-50"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}