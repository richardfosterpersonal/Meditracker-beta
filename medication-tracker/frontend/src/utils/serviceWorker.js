export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('ServiceWorker registration successful');
      return registration;
    } catch (err) {
      console.error('ServiceWorker registration failed:', err);
      throw err;
    }
  }
  throw new Error('ServiceWorker is not supported');
};

export const subscribeToPushNotifications = async (registration) => {
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.REACT_APP_VAPID_PUBLIC_KEY
    });
    
    return subscription;
  } catch (err) {
    console.error('Failed to subscribe to push notifications:', err);
    throw err;
  }
};

export const unsubscribeFromPushNotifications = async (registration) => {
  try {
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to unsubscribe from push notifications:', err);
    throw err;
  }
};
