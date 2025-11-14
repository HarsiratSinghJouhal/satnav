import React from 'react';

interface NotificationProps {
  notification: { message: string; type: 'success' | 'error' } | null;
  onDismiss: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ notification, onDismiss }) => {
  if (!notification) {
    return null;
  }

  const { message, type } = notification;

  const isSuccess = type === 'success';
  const bgColor = isSuccess ? 'bg-green-600' : 'bg-red-600';
  const icon = isSuccess ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 w-full max-w-sm sm:max-w-md z-[3000] px-4 animate-notification-enter">
      <div className={`flex items-center text-white p-4 rounded-lg shadow-2xl ${bgColor}`}>
        <div className="flex-shrink-0">
          {icon}
        </div>
        <div className="ml-3 font-medium flex-grow text-sm">
          {message}
        </div>
        <button 
          onClick={onDismiss} 
          className="ml-3 -mr-1 p-1 rounded-full hover:bg-white/20 transition-colors focus:outline-none"
          aria-label="Dismiss notification"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
