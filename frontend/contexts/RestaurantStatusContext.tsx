import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import axios from 'axios';

const API_URL = 'https://haba-haba-api.ubua.cloud/api/auth';

interface TodaySchedule {
    day_name: string;
    is_closed: boolean;
    open_time: string;
    close_time: string;
}

interface NextOpen {
    day_name: string;
    time: string;
    is_today: boolean;
}

interface OperatingHour {
    day_of_week: number;
    day_name: string;
    is_closed: boolean;
    open_time: string;
    close_time: string;
}

interface RestaurantStatus {
    isOpen: boolean;
    manualToggle: boolean;
    restaurantName: string;
    currentTime: string;
    currentDay: string;
    currentDayIndex: number;
    todaySchedule: TodaySchedule | null;
    nextOpen: NextOpen | null;
    operatingHours: OperatingHour[];
    loading: boolean;
    error: string | null;
}

interface RestaurantStatusContextType extends RestaurantStatus {
    refreshStatus: () => Promise<void>;
    formatTime: (time: string) => string;
    getStatusMessage: () => string;
}

const defaultStatus: RestaurantStatus = {
    isOpen: true,
    manualToggle: true,
    restaurantName: 'Restaurant',
    currentTime: '',
    currentDay: '',
    currentDayIndex: 0,
    todaySchedule: null,
    nextOpen: null,
    operatingHours: [],
    loading: true,
    error: null,
};

const RestaurantStatusContext = createContext<RestaurantStatusContextType | undefined>(undefined);

export const RestaurantStatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [status, setStatus] = useState<RestaurantStatus>(defaultStatus);
    const [refreshing, setRefreshing] = useState(false);
    const formatTime = useCallback((time: string): string => {
        if (!time) return '';
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    }, []);

    const getStatusMessage = useCallback((): string => {
        if (status.loading) return 'Checking status...';
        if (status.isOpen) {
            if (status.todaySchedule) {
                return `Open until ${formatTime(status.todaySchedule.close_time)}`;
            }
            return 'Open now';
        }

        if (status.nextOpen) {
            if (status.nextOpen.is_today) {
                return `Opens today at ${formatTime(status.nextOpen.time)}`;
            }
            return `Opens ${status.nextOpen.day_name} at ${formatTime(status.nextOpen.time)}`;
        }

        return 'Currently closed';
    }, [status, formatTime]);

    const fetchStatus = useCallback(async () => {
        try {
            setStatus(prev => ({ ...prev, loading: true, error: null }));

            const response = await axios.get(`${API_URL}/open-status`);

            if (response.data.success) {
                setStatus({
                    isOpen: response.data.is_open,
                    manualToggle: response.data.manual_toggle,
                    restaurantName: response.data.restaurant_name,
                    currentTime: response.data.current_time,
                    currentDay: response.data.current_day,
                    currentDayIndex: response.data.current_day_index,
                    todaySchedule: response.data.today_schedule,
                    nextOpen: response.data.next_open,
                    operatingHours: response.data.operating_hours || [],
                    loading: false,
                    error: null,
                });
            } else {
                setStatus(prev => ({
                    ...prev,
                    loading: false,
                    error: 'Failed to fetch status',
                }));
            }
        } catch (error: any) {
            console.error('Error fetching restaurant status:', error);
            setStatus(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Failed to fetch status',
                isOpen: true, // Default to open on error
            }));
        }
    }, []);

    useEffect(() => {
        fetchStatus();

        // Refresh status every 5 minutes
        const interval = setInterval(fetchStatus, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [fetchStatus]);

    const value: RestaurantStatusContextType = {
        ...status,
        refreshStatus: fetchStatus,
        formatTime,
        getStatusMessage,
    };

    return (
        <RestaurantStatusContext.Provider value={value}>
            {children}
        </RestaurantStatusContext.Provider>
    );
};

export const useRestaurantStatus = (): RestaurantStatusContextType => {
    const context = useContext(RestaurantStatusContext);
    if (context === undefined) {
        throw new Error('useRestaurantStatus must be used within a RestaurantStatusProvider');
    }
    return context;
};

export default RestaurantStatusContext;
