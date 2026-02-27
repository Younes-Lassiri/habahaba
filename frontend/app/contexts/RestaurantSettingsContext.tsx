// contexts/RestaurantSettingsContext.tsx
import axios from 'axios';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export interface RestaurantSettings {
  is_open: boolean;
  restaurant_logo: string;
  restaurant_home_screen_icon: string;
  restaurant_name: string;
}

interface RestaurantSettingsContextType {
  settings: RestaurantSettings;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: RestaurantSettings = {
  is_open: true,
  restaurant_logo: '',
  restaurant_home_screen_icon: '',
  restaurant_name: '',
};

const RestaurantSettingsContext = createContext<RestaurantSettingsContextType>({
  settings: defaultSettings,
  loading: true,
  error: null,
  refreshSettings: async () => {},
});

export const useRestaurantSettings = () => useContext(RestaurantSettingsContext);

interface ProviderProps {
  children: ReactNode;
}

export const RestaurantSettingsProvider = ({ children }: ProviderProps) => {
  const [settings, setSettings] = useState<RestaurantSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        'https://haba-haba-api.ubua.cloud/api/auth/restaurant-settings'
      );
      if (response.data.success && response.data.settings) {
        setSettings(response.data.settings);
        setError(null);
      } else {
        setError('Invalid response from server');
      }
    } catch (err) {
      console.error('Failed to fetch restaurant settings:', err);
      setError('Failed to load restaurant settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <RestaurantSettingsContext.Provider
      value={{
        settings,
        loading,
        error,
        refreshSettings: fetchSettings,
      }}
    >
      {children}
    </RestaurantSettingsContext.Provider>
  );
};