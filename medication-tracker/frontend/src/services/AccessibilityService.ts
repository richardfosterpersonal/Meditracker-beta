import { liabilityProtection } from '../utils/liabilityProtection';

export interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'large' | 'x-large';
  highContrast: boolean;
  reduceMotion: boolean;
  screenReader: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  keyboardNavigation: boolean;
  textToSpeech: boolean;
  autoplay: boolean;
  captions: boolean;
  readingGuide: boolean;
  dyslexicFont: boolean;
  lineSpacing: 'normal' | 'wide' | 'wider';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  focusIndicator: boolean;
  cursorSize: 'small' | 'medium' | 'large';
  soundEffects: boolean;
  hapticFeedback: boolean;
}

class AccessibilityService {
  private settings: AccessibilitySettings = {
    fontSize: 'medium',
    highContrast: false,
    reduceMotion: false,
    screenReader: false,
    colorBlindMode: 'none',
    keyboardNavigation: true,
    textToSpeech: false,
    autoplay: true,
    captions: false,
    readingGuide: false,
    dyslexicFont: false,
    lineSpacing: 'normal',
    textAlign: 'left',
    focusIndicator: true,
    cursorSize: 'medium',
    soundEffects: true,
    hapticFeedback: true
  };

  private speechSynthesis: SpeechSynthesis | null = null;
  private speechRecognition: any = null; // Type will depend on browser support

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Load saved settings
      const savedSettings = localStorage.getItem('accessibilitySettings');
      if (savedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
      }

      // Initialize speech synthesis
      if (window.speechSynthesis) {
        this.speechSynthesis = window.speechSynthesis;
      }

      // Initialize speech recognition if available
      if ('webkitSpeechRecognition' in window) {
        this.speechRecognition = new (window as any).webkitSpeechRecognition();
      }

      // Apply initial settings
      this.applySettings();

      // Log initialization
      liabilityProtection.logCriticalAction(
        'ACCESSIBILITY_INITIALIZED',
        'system',
        {
          settings: this.settings,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to initialize accessibility service:', error);
      liabilityProtection.logLiabilityRisk(
        'ACCESSIBILITY_INIT_FAILED',
        'HIGH',
        { error }
      );
    }
  }

  private applySettings(): void {
    const root = document.documentElement;
    
    // Apply font size
    root.style.setProperty('--font-size-base', this.getFontSizeValue());
    
    // Apply high contrast
    if (this.settings.highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
    
    // Apply reduced motion
    if (this.settings.reduceMotion) {
      root.style.setProperty('--transition-duration', '0s');
    } else {
      root.style.setProperty('--transition-duration', '0.3s');
    }

    // Apply color blind mode
    document.body.classList.remove('protanopia', 'deuteranopia', 'tritanopia');
    if (this.settings.colorBlindMode !== 'none') {
      document.body.classList.add(this.settings.colorBlindMode);
    }

    // Apply dyslexic font
    if (this.settings.dyslexicFont) {
      root.style.setProperty('--font-family', 'OpenDyslexic, sans-serif');
    } else {
      root.style.setProperty('--font-family', 'system-ui, sans-serif');
    }

    // Apply line spacing
    root.style.setProperty('--line-spacing', this.getLineSpacingValue());

    // Apply cursor size
    root.style.setProperty('--cursor-size', this.getCursorSizeValue());

    // Save settings to localStorage
    localStorage.setItem('accessibilitySettings', JSON.stringify(this.settings));
  }

  private getFontSizeValue(): string {
    const sizes = {
      small: '14px',
      medium: '16px',
      large: '18px',
      'x-large': '20px'
    };
    return sizes[this.settings.fontSize];
  }

  private getLineSpacingValue(): string {
    const spacing = {
      normal: '1.5',
      wide: '1.8',
      wider: '2'
    };
    return spacing[this.settings.lineSpacing];
  }

  private getCursorSizeValue(): string {
    const sizes = {
      small: '1',
      medium: '1.5',
      large: '2'
    };
    return sizes[this.settings.cursorSize];
  }

  public updateSettings(newSettings: Partial<AccessibilitySettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.applySettings();

    // Log settings update
    liabilityProtection.logCriticalAction(
      'ACCESSIBILITY_SETTINGS_UPDATED',
      'current-user',
      {
        settings: newSettings,
        timestamp: new Date().toISOString()
      }
    );
  }

  public getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  public async speak(text: string, options: SpeechSynthesisUtterance = new SpeechSynthesisUtterance()): Promise<void> {
    if (!this.settings.textToSpeech || !this.speechSynthesis) {
      return;
    }

    try {
      options.text = text;
      this.speechSynthesis.speak(options);

      // Log speech synthesis
      liabilityProtection.logCriticalAction(
        'TEXT_TO_SPEECH',
        'system',
        {
          text,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Speech synthesis failed:', error);
      throw error;
    }
  }

  public startVoiceRecognition(onResult: (text: string) => void): void {
    if (!this.speechRecognition) {
      throw new Error('Speech recognition not supported');
    }

    try {
      this.speechRecognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        onResult(text);

        // Log voice recognition
        liabilityProtection.logCriticalAction(
          'VOICE_RECOGNITION',
          'current-user',
          {
            text,
            timestamp: new Date().toISOString()
          }
        );
      };

      this.speechRecognition.start();
    } catch (error) {
      console.error('Voice recognition failed:', error);
      throw error;
    }
  }

  public stopVoiceRecognition(): void {
    if (this.speechRecognition) {
      this.speechRecognition.stop();
    }
  }

  public getAccessibleLabel(element: string, context?: object): string {
    // Generate ARIA labels based on element type and context
    const labels = {
      button: `${context?.action || 'Click'} button`,
      input: `Enter ${context?.field || 'value'}`,
      link: `Go to ${context?.destination || 'page'}`,
      menu: `${context?.name || 'Navigation'} menu`,
      dialog: `${context?.title || 'Dialog'} window`,
    };

    return labels[element] || element;
  }

  public async validateAccessibility(element: HTMLElement): Promise<boolean> {
    try {
      // Basic accessibility checks
      const hasAltText = element.querySelector('img:not([alt])') === null;
      const hasAriaLabels = element.querySelector('[role]:not([aria-label])') === null;
      const hasTabIndex = element.querySelector('button:not([tabindex])') === null;

      return hasAltText && hasAriaLabels && hasTabIndex;
    } catch (error) {
      console.error('Accessibility validation failed:', error);
      return false;
    }
  }
}

export const accessibilityService = new AccessibilityService();
