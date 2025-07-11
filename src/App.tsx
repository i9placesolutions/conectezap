import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { NotificationProvider } from './contexts/NotificationContext';
import { AuthProvider } from './contexts/AuthContext';
import { InstanceProvider } from './contexts/InstanceContext';
import { ServerProvider } from './contexts/ServerContext';
import { AppRoutes } from './routes';

function App() {
  return (
    <BrowserRouter>
      <ServerProvider>
        <NotificationProvider>
          <AuthProvider>
            <InstanceProvider>
              <AppRoutes />
              <Toaster position="top-right" />
            </InstanceProvider>
          </AuthProvider>
        </NotificationProvider>
      </ServerProvider>
    </BrowserRouter>
  );
}

export default App;