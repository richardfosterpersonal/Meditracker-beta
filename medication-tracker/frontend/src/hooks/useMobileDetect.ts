import { useEffect, useState } from 'react';

interface MobileDetectResult {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  hasCamera: boolean;
  hasTouch: boolean;
  hasBiometrics: boolean;
}

export const useMobileDetect = (): MobileDetectResult => {
  const [deviceInfo, setDeviceInfo] = useState<MobileDetectResult>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isIOS: false,
    isAndroid: false,
    hasCamera: false,
    hasTouch: false,
    hasBiometrics: false,
  });

  useEffect(() => {
    const detect = async () => {
      // Check for mobile/tablet
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(userAgent);
      const isTabletDevice = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/i.test(userAgent);
      
      // Check OS
      const isIOS = /ipad|iphone|ipod/.test(userAgent) && !(window as any).MSStream;
      const isAndroid = /android/.test(userAgent);

      // Check for camera
      const hasCamera = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;

      // Check for touch support
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      // Check for biometrics
      let hasBiometrics = false;
      if ('credentials' in navigator) {
        try {
          hasBiometrics = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        } catch (error) {
          console.error('Error checking biometrics:', error);
        }
      }

      setDeviceInfo({
        isMobile: isMobileDevice && !isTabletDevice,
        isTablet: isTabletDevice,
        isDesktop: !isMobileDevice && !isTabletDevice,
        isIOS,
        isAndroid,
        hasCamera,
        hasTouch,
        hasBiometrics,
      });
    };

    detect();
  }, []);

  return deviceInfo;
};
