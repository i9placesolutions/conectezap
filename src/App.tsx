import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { NotificationProvider } from './contexts/NotificationContext';
import { AuthProvider } from './contexts/AuthContext';
import { InstanceProvider } from './contexts/InstanceContext';
import { ServerProvider } from './contexts/ServerContext';
import { MultiAttendanceProvider } from './contexts/MultiAttendanceContext';
import { SSEProvider } from './contexts/SSEContext';
import { AppRoutes } from './routes';

function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <ServerProvider>
            <MultiAttendanceProvider>
              <InstanceProvider>
                <SSEProvider autoStart={true}>
                  <AppRoutes />
                  <Toaster position="top-right" />
                </SSEProvider>
              </InstanceProvider>
            </MultiAttendanceProvider>
          </ServerProvider>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;