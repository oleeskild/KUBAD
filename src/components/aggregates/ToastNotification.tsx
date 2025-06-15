import { useEffect, useState } from "react";

interface ToastNotificationProps {
  message: string | null;
  duration?: number;
  onClose?: () => void;
}

export function ToastNotification({ 
  message, 
  duration = 3000,
  onClose 
}: ToastNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) {
          setTimeout(onClose, 300); // Wait for animation to complete
        }
      }, duration);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [message, duration, onClose]);

  if (!message || !isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2 fade-in-0 duration-300">
      <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg border border-primary/20 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-white"></div>
          </div>
          <span className="text-sm font-medium">{message}</span>
        </div>
      </div>
    </div>
  );
}

// Hook for managing toast notifications
export function useToastNotification() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
  };

  const hideToast = () => {
    setToastMessage(null);
  };

  return {
    toastMessage,
    showToast,
    hideToast,
  };
}