import React, { createContext, useContext } from 'react';
import { sendMessage } from '../lib/wapi/api';
import { toast } from 'react-hot-toast';
import type { SendMessageRequest } from '../lib/wapi/types';

interface NotificationContextType {
  sendNotification: (data: { 
    phoneNumber: string; 
    text: string;
    quoted?: SendMessageRequest['quoted'];
  }) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const sendNotification = async (data: { 
    phoneNumber: string; 
    text: string;
    quoted?: SendMessageRequest['quoted'];
  }) => {
    try {
      await sendMessage(data.phoneNumber, data.text);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send notification';
      toast.error(message);
      throw error;
    }
  };

  return (
    <NotificationContext.Provider value={{ sendNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}