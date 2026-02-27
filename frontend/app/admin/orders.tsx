import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Linking,
    Modal,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const API_URL = 'https://haba-haba-api.ubua.cloud/api/admin';

interface OrderItem {
    id: number;
    product_id: number;
    product_name: string;
    product_image?: string;
    quantity: number;
    price_per_unit: number;
    special_instructions?: string;
}

interface DeliveryMan {
    id: number;
    name: string;
    phone: string;
    vehicle_type?: string;
    is_active: number;
    current_latitude?: number;
    current_longitude?: number;
    image?: string;
    distance?: number; // Distance from restaurant in km
}

interface RestaurantSettings {
    restaurant_name?: string;
    restaurant_address?: string;
    restaurant_latitude?: number;
    restaurant_longitude?: number;
    phone?: string;
}

interface Order {
    id: number;
    order_number: string;
    status: 'Pending' | 'Preparing' | 'OutForDelivery' | 'Delivered' | 'Cancelled';
    payment_status: 'Paid' | 'Unpaid';
    delivery_address: string;
    total_price: number;
    delivery_fee: number;
    discount: number;
    final_price: number;
    created_at: string;
    updated_at: string;
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
    delivery_man_id?: number;
    delivery_man_name?: string;
    delivery_man_phone?: string;
    user_id: number;
    client_lat?: number;
    client_lon?: number;
    cluster_id?: number;
    estimated_preparing_time?: number;
}

interface OrderCluster {
    id: number;
    name: string;
    color: string;
    orders: Order[];
    totalDistance: number; // Total route distance in km
    estimatedTime: number; // Estimated delivery time in minutes
    direction: string; // General direction (N, NE, E, SE, S, SW, W, NW)
    assignedDriverId?: number;
    assignedDriverName?: string;
}

export default function AdminOrders() {
    const [adminUser, setAdminUser] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<string>('All');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [deliveryMen, setDeliveryMen] = useState<DeliveryMan[]>([]);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showTimeInputModal, setShowTimeInputModal] = useState(false);
    const [estimatedTime, setEstimatedTime] = useState<string>('15');
    const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
    const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings | null>(null);
    const [nearbyDrivers, setNearbyDrivers] = useState<DeliveryMan[]>([]);
    const [clusters, setClusters] = useState<OrderCluster[]>([]);
    const [showClusterView, setShowClusterView] = useState(false);
    const [showClusterModal, setShowClusterModal] = useState(false);
    const [selectedCluster, setSelectedCluster] = useState<OrderCluster | null>(null);
    const [clusteringInProgress, setClusteringInProgress] = useState(false);
    const insets = useSafeAreaInsets();
    const soundRef = useRef<Audio.Sound | null>(null);
    const lastOrderCountRef = useRef<number>(0);
    const pollingIntervalRef = useRef<any>(null);
    const soundLoopIntervalRef = useRef<any>(null);
    const [countdowns, setCountdowns] = useState<Record<number, number>>({});

    // Status colors - more professional palette
    const statusColors: Record<string, string> = {
        Pending: '#FFA726', // Orange
        Preparing: '#42A5F5', // Blue
        OutForDelivery: '#AB47BC', // Purple
        Delivered: '#66BB6A', // Green
        Cancelled: '#EF5350', // Red
    };

    // Status background colors (lighter versions)
    const statusBgColors: Record<string, string> = {
        Pending: '#FFF3E0',
        Preparing: '#E3F2FD',
        OutForDelivery: '#F3E5F5',
        Delivered: '#E8F5E9',
        Cancelled: '#FFEBEE',
    };

    // Status labels
    const statusLabels: Record<string, string> = {
        Pending: 'Pending',
        Preparing: 'Preparing',
        OutForDelivery: 'Out for Delivery',
        Delivered: 'Delivered',
        Cancelled: 'Cancelled',
    };

    // Status icons
    const statusIcons: Record<string, string> = {
        Pending: '⏳',
        Preparing: '👨‍🍳',
        OutForDelivery: '🚚',
        Delivered: '✅',
        Cancelled: '❌',
    };

    // Cluster colors for visual distinction
    const clusterColors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];

    // Calculate distance between two coordinates using Haversine formula
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Handle phone call
    const handleCall = async (phoneNumber: string | undefined, name: string) => {
        if (!phoneNumber) {
            Alert.alert('No Phone Number', `${name} does not have a phone number available.`);
            return;
        }
        const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
        const phoneUrl = `tel:${cleanNumber}`;
        try {
            const canOpen = await Linking.canOpenURL(phoneUrl);
            if (canOpen) {
                await Linking.openURL(phoneUrl);
            } else {
                Alert.alert('Error', 'Unable to make phone calls on this device');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to open phone dialer');
        }
    };

    // Fetch restaurant settings
    const fetchRestaurantSettings = async () => {
        try {
            const currentToken = await AsyncStorage.getItem("adminToken");
            if (!currentToken) return;

            const response = await axios.get(`${API_URL}/restaurant-settings`, {
                headers: { Authorization: `Bearer ${currentToken}` },
            });
            if (response.data.success && response.data.settings) {
                setRestaurantSettings(response.data.settings);
            }
        } catch (error) {
            console.error('Error fetching restaurant settings:', error);
        }
    };

    // Get nearby drivers sorted by distance from restaurant
    const getNearbyDrivers = useCallback(() => {
        if (!restaurantSettings?.restaurant_latitude || !restaurantSettings?.restaurant_longitude) {
            return deliveryMen.filter(dm => dm.is_active === 1);
        }

        const driversWithDistance = deliveryMen
            .filter(dm => dm.is_active === 1)
            .map(dm => {
                let distance = 999; // Default far distance if no location
                if (dm.current_latitude && dm.current_longitude) {
                    distance = calculateDistance(
                        restaurantSettings.restaurant_latitude!,
                        restaurantSettings.restaurant_longitude!,
                        dm.current_latitude,
                        dm.current_longitude
                    );
                }
                return { ...dm, distance };
            })
            .sort((a, b) => (a.distance || 999) - (b.distance || 999));

        return driversWithDistance;
    }, [deliveryMen, restaurantSettings]);

    // Get direction from restaurant to a point
    const getDirection = (lat: number, lon: number): string => {
        if (!restaurantSettings?.restaurant_latitude || !restaurantSettings?.restaurant_longitude) {
            return 'Unknown';
        }
        const dLat = lat - restaurantSettings.restaurant_latitude;
        const dLon = lon - restaurantSettings.restaurant_longitude;
        const angle = Math.atan2(dLon, dLat) * 180 / Math.PI;

        if (angle >= -22.5 && angle < 22.5) return 'N';
        if (angle >= 22.5 && angle < 67.5) return 'NE';
        if (angle >= 67.5 && angle < 112.5) return 'E';
        if (angle >= 112.5 && angle < 157.5) return 'SE';
        if (angle >= 157.5 || angle < -157.5) return 'S';
        if (angle >= -157.5 && angle < -112.5) return 'SW';
        if (angle >= -112.5 && angle < -67.5) return 'W';
        if (angle >= -67.5 && angle < -22.5) return 'NW';
        return 'Unknown';
    };

    // Calculate optimal route distance for a cluster (simple greedy nearest neighbor)
    const calculateRouteDistance = (clusterOrders: Order[]): number => {
        if (!restaurantSettings?.restaurant_latitude || !restaurantSettings?.restaurant_longitude) return 0;
        if (clusterOrders.length === 0) return 0;

        let totalDistance = 0;
        let currentLat = restaurantSettings.restaurant_latitude;
        let currentLon = restaurantSettings.restaurant_longitude;
        const remaining = [...clusterOrders];

        while (remaining.length > 0) {
            let nearestIdx = 0;
            let nearestDist = Infinity;

            for (let i = 0; i < remaining.length; i++) {
                const order = remaining[i];
                if (order.client_lat && order.client_lon) {
                    const dist = calculateDistance(currentLat, currentLon, order.client_lat, order.client_lon);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestIdx = i;
                    }
                }
            }

            const nearest = remaining.splice(nearestIdx, 1)[0];
            if (nearest.client_lat && nearest.client_lon) {
                totalDistance += nearestDist;
                currentLat = nearest.client_lat;
                currentLon = nearest.client_lon;
            }
        }

        return totalDistance;
    };

    // Generate clusters from orders based on proximity and direction
    const generateClusters = useCallback(() => {
        if (!restaurantSettings?.restaurant_latitude || !restaurantSettings?.restaurant_longitude) {
            Alert.alert('Error', 'Restaurant location not set. Please configure restaurant settings first.');
            return;
        }

        setClusteringInProgress(true);

        // Get only orders that can be clustered (Preparing or Ready status, with location)
        const clusterableOrders = orders.filter(order =>
            (order.status === 'Preparing' || order.status === 'Pending') &&
            order.client_lat && order.client_lon &&
            !order.delivery_man_id // Not yet assigned
        );

        if (clusterableOrders.length === 0) {
            Alert.alert('No Orders', 'No orders available for clustering. Orders must be Pending or Preparing, have location data, and not be assigned to a driver.');
            setClusteringInProgress(false);
            return;
        }

        // Group orders by direction first
        const directionGroups: Record<string, Order[]> = {};
        clusterableOrders.forEach(order => {
            const dir = getDirection(order.client_lat!, order.client_lon!);
            if (!directionGroups[dir]) directionGroups[dir] = [];
            directionGroups[dir].push(order);
        });

        const newClusters: OrderCluster[] = [];
        let clusterId = 1;

        // For each direction, create clusters based on proximity
        Object.entries(directionGroups).forEach(([direction, dirOrders]) => {
            // Sort by distance from restaurant
            const sortedOrders = dirOrders.sort((a, b) => {
                const distA = calculateDistance(
                    restaurantSettings.restaurant_latitude!,
                    restaurantSettings.restaurant_longitude!,
                    a.client_lat!, a.client_lon!
                );
                const distB = calculateDistance(
                    restaurantSettings.restaurant_latitude!,
                    restaurantSettings.restaurant_longitude!,
                    b.client_lat!, b.client_lon!
                );
                return distA - distB;
            });

            // Create clusters with max 4 orders each, within 2km of each other
            let currentCluster: Order[] = [];
            let lastOrder: Order | null = null;

            sortedOrders.forEach(order => {
                if (currentCluster.length === 0) {
                    currentCluster.push(order);
                    lastOrder = order;
                } else if (currentCluster.length < 4) {
                    // Check if this order is within 2km of the last order
                    const distFromLast = calculateDistance(
                        lastOrder!.client_lat!, lastOrder!.client_lon!,
                        order.client_lat!, order.client_lon!
                    );
                    if (distFromLast <= 2) {
                        currentCluster.push(order);
                        lastOrder = order;
                    } else {
                        // Start new cluster
                        if (currentCluster.length > 0) {
                            const routeDistance = calculateRouteDistance(currentCluster);
                            newClusters.push({
                                id: clusterId++,
                                name: `Cluster ${direction}-${clusterId}`,
                                color: clusterColors[(clusterId - 1) % clusterColors.length],
                                orders: currentCluster,
                                totalDistance: routeDistance,
                                estimatedTime: Math.round((routeDistance / 30) * 60 + currentCluster.length * 5), // 30km/h avg + 5min per stop
                                direction,
                            });
                        }
                        currentCluster = [order];
                        lastOrder = order;
                    }
                } else {
                    // Cluster is full, start new one
                    const routeDistance = calculateRouteDistance(currentCluster);
                    newClusters.push({
                        id: clusterId++,
                        name: `Cluster ${direction}-${clusterId}`,
                        color: clusterColors[(clusterId - 1) % clusterColors.length],
                        orders: currentCluster,
                        totalDistance: routeDistance,
                        estimatedTime: Math.round((routeDistance / 30) * 60 + currentCluster.length * 5),
                        direction,
                    });
                    currentCluster = [order];
                    lastOrder = order;
                }
            });

            // Don't forget the last cluster
            if (currentCluster.length > 0) {
                const routeDistance = calculateRouteDistance(currentCluster);
                newClusters.push({
                    id: clusterId++,
                    name: `Cluster ${direction}-${clusterId}`,
                    color: clusterColors[(clusterId - 1) % clusterColors.length],
                    orders: currentCluster,
                    totalDistance: routeDistance,
                    estimatedTime: Math.round((routeDistance / 30) * 60 + currentCluster.length * 5),
                    direction,
                });
            }
        });

        setClusters(newClusters);
        setShowClusterView(true);
        setClusteringInProgress(false);

        if (newClusters.length > 0) {
            Alert.alert(
                'Clusters Generated',
                `Created ${newClusters.length} cluster(s) from ${clusterableOrders.length} orders.\n\nTap on a cluster to view details and assign a driver.`
            );
        }
    }, [orders, restaurantSettings, clusterColors]);

    // Assign driver to entire cluster
    const assignDriverToCluster = async (cluster: OrderCluster, driverId: number) => {
        try {
            const currentToken = await AsyncStorage.getItem("adminToken");
            if (!currentToken) return;

            setProcessingOrderId(cluster.orders[0].id);

            // Assign driver to all orders in cluster
            for (const order of cluster.orders) {
                await axios.post(
                    `${API_URL}/orders/assign-delivery-man`,
                    { orderId: order.id, deliveryManId: driverId },
                    { headers: { Authorization: `Bearer ${currentToken}` } }
                );
            }

            const driver = deliveryMen.find(d => d.id === driverId);

            // Update cluster with assigned driver
            setClusters(prev => prev.map(c =>
                c.id === cluster.id
                    ? { ...c, assignedDriverId: driverId, assignedDriverName: driver?.name }
                    : c
            ));

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', `${cluster.orders.length} orders assigned to ${driver?.name || 'driver'}`);
            setShowClusterModal(false);
            fetchOrders(true);
        } catch (error) {
            console.error('Error assigning driver to cluster:', error);
            Alert.alert('Error', 'Failed to assign driver to cluster');
        } finally {
            setProcessingOrderId(null);
        }
    };

    useEffect(() => {
        loadAdminData();
        loadNotificationSound();
        fetchRestaurantSettings();

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, []);

    useEffect(() => {
        if (token) {
            console.log('✅ Token found, fetching orders...');
            fetchOrders();
            fetchDeliveryMen();

            // Poll for new orders every 5 seconds
            pollingIntervalRef.current = setInterval(() => {
                fetchOrders(true);
            }, 5000);
        } else {
            console.log('❌ No token found');
        }
    }, [token]);

    useEffect(() => {
        filterOrders();
    }, [orders, selectedStatus]);

    useEffect(() => {
        const hasPendingOrders = orders.some(order => order.status === 'Pending');
        
        if (hasPendingOrders) {
            startLoopingSound();
        } else {
            stopLoopingSound();
        }
    }, [orders]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCountdowns(prev => {
                const updated = { ...prev };
                let hasChanges = false;
                
                Object.keys(updated).forEach(key => {
                    const orderId = parseInt(key);
                    if (updated[orderId] > 0) {
                        updated[orderId] -= 1;
                        hasChanges = true;
                    }
                });
                
                return hasChanges ? updated : prev;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const loadAdminData = async () => {
        try {
            const token = await AsyncStorage.getItem("adminToken");
            const adminDataString = await AsyncStorage.getItem("adminData");

            console.log('🔍 Debug - Token exists:', !!token);
            console.log('🔍 Debug - Token value:', token?.substring(0, 30) + '...');
            console.log('🔍 Debug - Admin data string:', adminDataString);

            if (token) {
                setToken(token);

                if (adminDataString) {
                    try {
                        const adminData = JSON.parse(adminDataString);
                        console.log('🔍 Debug - Parsed admin data:', adminData);

                        const adminIdentifier = adminData.email ||
                            adminData.username ||
                            adminData.name ||
                            "Admin";

                        setAdminUser(adminIdentifier);
                        console.log("✅ Admin data loaded:", {
                            identifier: adminIdentifier,
                            tokenExists: !!token,
                            fullData: adminData
                        });
                    } catch (parseError) {
                        console.error('⚠️ Error parsing admin data:', parseError);
                        setAdminUser("Admin");
                    }
                } else {
                    console.log('⚠️ No admin data found, but token exists');
                    setAdminUser("Admin");
                }
            } else {
                console.log('❌ No admin token found in storage');
                setError('Please login as admin first');
            }
        } catch (error) {
            console.error('❌ Error loading admin data:', error);
            setError('Failed to load admin credentials');
        } finally {
            setLoading(false);
        }
    };

    const loadNotificationSound = async () => {
        try {
            const { sound } = await Audio.Sound.createAsync(
                { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
                { shouldPlay: false, isLooping: true }
            );
            soundRef.current = sound;
        } catch (error) {
            console.log('Using haptic feedback only (no sound file):', error);
        }
    };

    const playNotificationSound = async () => {
        try {
            if (soundRef.current) {
                await soundRef.current.replayAsync();
            }
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.log('Error playing sound:', error);
        }
    };

    const startLoopingSound = async () => {
        try {
            if (soundRef.current) {
                await soundRef.current.setIsLoopingAsync(true);
                await soundRef.current.playAsync();
            }
        } catch (error) {
            console.log('Error starting looping sound:', error);
        }
    };

    const stopLoopingSound = async () => {
        try {
            if (soundRef.current) {
                await soundRef.current.stopAsync();
                await soundRef.current.setPositionAsync(0);
            }
        } catch (error) {
            console.log('Error stopping looping sound:', error);
        }
    };

    const fetchOrders = async (silent: boolean = false) => {
        let currentToken: string | null = null; // ✅ DECLARE IT HERE FIRST

        try {
            if (!silent) setLoading(true);
            setError(null);

            // ✅ Now assign it
            currentToken = await AsyncStorage.getItem("adminToken");

            if (!currentToken) {
                console.error('❌ No token found in AsyncStorage');
                setError('Please login as admin first');
                return;
            }

            console.log('🔍 Token format check:');
            console.log('- Length:', currentToken.length);
            console.log('- Starts with eyJ:', currentToken.startsWith('eyJ'));
            console.log('- Contains dots:', (currentToken.match(/\./g) || []).length === 2);

            console.log('🔄 Fetching orders from:', `${API_URL}/orders`);

            const response = await axios.get(`${API_URL}/orders`, {
                headers: {
                    Authorization: `Bearer ${currentToken}`,
                },
                params: {
                    limit: 100,
                },
            });

            const newOrders = response.data.orders || [];
            console.log(`✅ Fetched ${newOrders.length} orders`);

            if (silent && newOrders.length > lastOrderCountRef.current) {
                const newOrdersCount = newOrders.length - lastOrderCountRef.current;
                console.log(`🔔 ${newOrdersCount} new order(s) received!`);
                playNotificationSound();
            }

            lastOrderCountRef.current = newOrders.length;
            
            // Calculate countdowns for preparing orders
            const newCountdowns: Record<number, number> = {};
            newOrders.forEach((order: Order) => {
                if (order.status === 'Preparing' && order.estimated_preparing_time && order.updated_at) {
                    const updatedTime = new Date(order.updated_at).getTime();
                    const now = Date.now();
                    const elapsedSeconds = Math.floor((now - updatedTime) / 1000);
                    const totalSeconds = order.estimated_preparing_time * 60;
                    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
                    
                    if (remainingSeconds > 0) {
                        newCountdowns[order.id] = remainingSeconds;
                    }
                }
            });
            
            setCountdowns(newCountdowns);
            setOrders(newOrders);
        } catch (error: any) {
            console.error('❌ Error fetching orders:', error);
            console.error('❌ Error response:', error.response?.data);
            console.error('❌ Error status:', error.response?.status);

            const errorMsg = error.response?.data?.message || error.message || 'Failed to fetch orders';
            setError(errorMsg);

            // ✅ Now currentToken is accessible here!
            if (error.response?.status === 401) {
                console.error('🔐 401 UNAUTHORIZED DETAILS:');
                console.error('- Response data:', error.response?.data);

                Alert.alert('Session Expired', 'Please login again');
                await AsyncStorage.multiRemove(['adminToken', 'adminData']);
            }
        } finally {
            if (!silent) setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchDeliveryMen = async () => {
        try {
            const currentToken = await AsyncStorage.getItem("adminToken");
            if (!currentToken) return;

            const response = await axios.get(`${API_URL}/delivery-men`, {
                headers: {
                    Authorization: `Bearer ${currentToken}`,
                },
            });
            setDeliveryMen(response.data.deliveryMen || []);
        } catch (error) {
            console.error('Error fetching delivery men:', error);
        }
    };

    const fetchOrderDetails = async (orderId: number) => {
        try {
            const currentToken = await AsyncStorage.getItem("adminToken");
            if (!currentToken) return;

            const response = await axios.get(`${API_URL}/orders/${orderId}`, {
                headers: {
                    Authorization: `Bearer ${currentToken}`,
                },
            });
            setOrderItems(response.data.items || []);
        } catch (error) {
            console.error('Error fetching order details:', error);
        }
    };

    const filterOrders = () => {
        if (selectedStatus === 'All') {
            setFilteredOrders(orders);
        } else {
            setFilteredOrders(orders.filter(order => order.status === selectedStatus));
        }
    };

    const updateOrderStatus = async (orderId: number, newStatus: string, prepTime?: number) => {
        try {
            const currentToken = await AsyncStorage.getItem("adminToken");
            if (!currentToken) return;

            // If changing to Preparing and no time provided, show modal
            if (newStatus === 'Preparing' && !prepTime) {
                setPendingOrderId(orderId);
                setShowTimeInputModal(true);
                return;
            }

            setProcessingOrderId(orderId);

            const payload: any = { status: newStatus };
            if (newStatus === 'Preparing' && prepTime) {
                payload.estimated_preparing_time = prepTime;
                setCountdowns(prev => ({ ...prev, [orderId]: prepTime * 60 }));
            }

            await axios.put(
                `${API_URL}/orders/${orderId}/status`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${currentToken}`,
                    },
                }
            );

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            fetchOrders(true);

            if (selectedOrder?.id === orderId) {
                setSelectedOrder({ ...selectedOrder, status: newStatus as any });
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            Alert.alert('Error', 'Failed to update order status');
        } finally {
            setProcessingOrderId(null);
        }
    };

    const assignDeliveryMan = async (deliveryManId: number) => {
        if (!selectedOrder) return;

        try {
            const currentToken = await AsyncStorage.getItem("adminToken");
            if (!currentToken) return;

            setProcessingOrderId(selectedOrder.id);
            await axios.post(
                `${API_URL}/orders/assign-delivery-man`,
                {
                    orderId: selectedOrder.id,
                    deliveryManId: deliveryManId,
                },
                {
                    headers: {
                        Authorization: `Bearer ${currentToken}`,
                    },
                }
            );

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowAssignModal(false);
            Alert.alert('Success', 'Delivery man assigned successfully');
        } catch (error) {
            console.error('Error assigning delivery man:', error);
            Alert.alert('Error', 'Failed to assign delivery man');
        } finally {
            setProcessingOrderId(null);
        }
    };

    const openOrderDetails = (order: Order) => {
        setSelectedOrder(order);
        fetchOrderDetails(order.id);
        setShowOrderModal(true);
    };

    const getNextStatus = (currentStatus: string): string | null => {
        const statusFlow: Record<string, string> = {
            Pending: 'Preparing',
            Preparing: 'OutForDelivery',
            OutForDelivery: 'Delivered',
        };
        return statusFlow[currentStatus] || null;
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchOrders();
        fetchDeliveryMen();
    }, [token]);

    const formatPrice = (price: number | string | null | undefined): string => {
        const num = Number(price);
        return isNaN(num) ? '0.00' : num.toFixed(2);
    };

    const renderStatusTabs = () => {
        const statuses = ['All', 'Pending', 'Preparing', 'OutForDelivery', 'Delivered', 'Cancelled'];

        return (
            <View style={[styles.statusTabsContainer]}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.statusTabsContent}
                >
                    {statuses.map((status) => {
                        const count = status === 'All'
                            ? orders.length
                            : orders.filter(o => o.status === status).length;

                        const isActive = selectedStatus === status;

                        return (
                            <TouchableOpacity
                                key={status}
                                style={[
                                    styles.statusTab,
                                    isActive && styles.statusTabActive,
                                    {
                                        backgroundColor: isActive && status !== 'All'
                                            ? statusBgColors[status]
                                            : 'transparent',
                                        borderColor: status !== 'All'
                                            ? isActive ? statusColors[status] : '#E0E0E0'
                                            : isActive ? '#2196F3' : '#E0E0E0',
                                    },
                                ]}
                                onPress={() => setSelectedStatus(status)}
                            >
                                <View style={styles.statusTabContent}>
                                    {status !== 'All' && (
                                        <Text style={[styles.statusIcon, { color: statusColors[status] }]}>
                                            {statusIcons[status]}
                                        </Text>
                                    )}
                                    <Text
                                        style={[
                                            styles.statusTabText,
                                            isActive && styles.statusTabTextActive,
                                            {
                                                color: status !== 'All' && isActive
                                                    ? statusColors[status]
                                                    : isActive ? '#2196F3' : '#666',
                                                fontWeight: isActive ? '600' : '400'
                                            },
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {statusLabels[status] || status}
                                    </Text>
                                </View>

                                <View
                                    style={[
                                        styles.statusBadge,
                                        {
                                            backgroundColor: status !== 'All'
                                                ? statusColors[status]
                                                : isActive ? '#2196F3' : '#666',
                                        },
                                    ]}
                                >
                                    <Text style={styles.statusBadgeText}>{count}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };

    const renderOrderCard = (order: Order) => {
        const nextStatus = getNextStatus(order.status);
        const isProcessing = processingOrderId === order.id;

        return (
            <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => openOrderDetails(order)}
                activeOpacity={0.7}
            >
                <View style={styles.orderHeader}>
                    <View style={styles.orderHeaderLeft}>
                        <View style={styles.orderNumberRow}>
                            <Text style={styles.orderNumber}>#{order.order_number}</Text>
                        </View>
                        <Text style={styles.orderTime}>
                            {new Date(order.created_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.statusBadgeLarge,
                            {
                                backgroundColor: statusBgColors[order.status],
                                borderColor: statusColors[order.status]
                            },
                        ]}
                    >
                        <Text style={[styles.statusIconLarge, { color: statusColors[order.status] }]}>
                            {statusIcons[order.status]}
                        </Text>
                        <Text style={[styles.statusBadgeLargeText, { color: statusColors[order.status] }]}>
                            {statusLabels[order.status]}
                        </Text>
                    </View>
                </View>

                <View style={styles.orderInfo}>
                    <View style={styles.customerRow}>
                        <View style={styles.customerAvatar}>
                            <Text style={styles.customerAvatarText}>
                                {order.customer_name?.charAt(0) || 'U'}
                            </Text>
                        </View>
                        <View style={styles.customerInfo}>
                            <Text style={styles.customerName}>{order.customer_name || 'Unknown Customer'}</Text>
                            <TouchableOpacity
                                style={styles.phoneRow}
                                onPress={() => handleCall(order.customer_phone, order.customer_name || 'Customer')}
                            >
                                <Text style={styles.customerPhoneClickable}>📞 {order.customer_phone || 'N/A'}</Text>
                                {order.customer_phone && <Text style={styles.callHint}>Tap to call</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.addressRow}>
                        <Text style={styles.addressIcon}>📍</Text>
                        <Text style={styles.orderAddress} numberOfLines={2}>
                            {order.delivery_address}
                        </Text>
                    </View>

                    {order.delivery_man_name && (
                        <View style={styles.deliveryManRow}>
                            <Text style={styles.deliveryManIcon}>🚚</Text>
                            <View style={styles.deliveryManInfoRow}>
                                <Text style={styles.deliveryManName}>{order.delivery_man_name}</Text>
                                <TouchableOpacity
                                    style={styles.phoneRow}
                                    onPress={() => handleCall(order.delivery_man_phone, order.delivery_man_name || 'Driver')}
                                >
                                    <Text style={styles.deliveryManPhoneClickable}>{order.delivery_man_phone}</Text>
                                    <Text style={styles.callHint}>Tap to call</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {order.status === 'Preparing' && countdowns[order.id] !== undefined && countdowns[order.id] > 0 && (
                        <View style={styles.countdownCard}>
                            <View style={styles.countdownHeader}>
                                <Text style={styles.countdownTitle}> Order Preparing</Text>
                                <View style={[styles.countdownTimeContainer, {
                                    backgroundColor: countdowns[order.id] < 60 ? '#EF5350' : countdowns[order.id] < 300 ? '#FFA726' : '#1E293B'
                                }]}>
                                    <Text style={styles.countdownMinutes}>{Math.floor(countdowns[order.id] / 60)}</Text>
                                    <Text style={styles.countdownSeparator}>:</Text>
                                    <Text style={styles.countdownSeconds}>{String(countdowns[order.id] % 60).padStart(2, '0')}</Text>
                                </View>
                            </View>
                            <View style={styles.countdownProgress}>
                                <View style={[
                                    styles.countdownProgressBar,
                                    { 
                                        width: `${Math.max(0, Math.min(100, (countdowns[order.id] / ((order.estimated_preparing_time || 15) * 60)) * 100))}%`,
                                        backgroundColor: countdowns[order.id] < 60 ? '#EF5350' : countdowns[order.id] < 300 ? '#FFA726' : '#6366F1'
                                    }
                                ]} />
                            </View>
                            <Text style={[styles.countdownStatus, {
                                color: countdowns[order.id] < 60 ? '#EF5350' : '#64748B'
                            }]}>
                                {countdowns[order.id] > 60 ? `~${Math.floor(countdowns[order.id] / 60)} min remaining` : ` ${countdowns[order.id]} sec remaining!`}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.divider} />

                <View style={styles.orderFooter}>
                    <View style={styles.footerTopRow}>
                        <View style={styles.priceContainer}>
                            <Text style={styles.priceLabel}>Total Amount:</Text>
                            <Text style={styles.priceValue}>MAD {formatPrice(order.final_price)}</Text>
                        </View>
                        <View style={[styles.paymentStatusBadge, {
                            backgroundColor: order.payment_status === 'Paid' ? '#E8F5E9' : '#FFEBEE',
                            borderColor: order.payment_status === 'Paid' ? '#4CAF50' : '#F44336'
                        }]}>
                            <Text style={[styles.paymentStatusText, {
                                color: order.payment_status === 'Paid' ? '#2E7D32' : '#D32F2F'
                            }]}>
                                {order.payment_status === 'Paid' ? '✓ Paid' : 'COD'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.actionButtons}>
                        {!order.delivery_man_id && order.status !== 'Cancelled' && order.status !== 'Delivered' && (
                            <TouchableOpacity
                                style={styles.assignButton}
                                onPress={() => {
                                    setSelectedOrder(order);
                                    setShowAssignModal(true);
                                }}
                            >
                                <Text style={styles.assignButtonText}>Assign Driver</Text>
                            </TouchableOpacity>
                        )}

                        {nextStatus && (
                            <TouchableOpacity
                                style={[
                                    styles.nextStatusButton,
                                    { backgroundColor: statusColors[nextStatus] },
                                ]}
                                onPress={() => updateOrderStatus(order.id, nextStatus)}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <>
                                        <Text style={styles.nextStatusButtonText}>
                                            Mark as {statusLabels[nextStatus]}
                                        </Text>
                                        <Text style={styles.nextStatusArrow}>→</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderOrderDetailsModal = () => (
        <Modal
            visible={showOrderModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowOrderModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Order Details</Text>
                        <TouchableOpacity
                            style={styles.closeButtonContainer}
                            onPress={() => setShowOrderModal(false)}
                        >
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        {selectedOrder && (
                            <>
                                <View style={styles.detailSection}>
                                    <Text style={styles.detailLabel}>ORDER NUMBER</Text>
                                    <Text style={styles.detailValue}>#{selectedOrder.order_number}</Text>
                                </View>

                                <View style={styles.detailCard}>
                                    <Text style={styles.cardTitle}>Customer Information</Text>
                                    <View style={styles.customerDetailRow}>
                                        <View style={styles.detailItem}>
                                            <Text style={styles.detailItemLabel}>Name</Text>
                                            <Text style={styles.detailItemValue}>{selectedOrder.customer_name || 'N/A'}</Text>
                                        </View>
                                        <View style={styles.detailItem}>
                                            <Text style={styles.detailItemLabel}>Phone</Text>
                                            <Text style={styles.detailItemValue}>{selectedOrder.customer_phone || 'N/A'}</Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.detailCard}>
                                    <Text style={styles.cardTitle}>Delivery Address</Text>
                                    <Text style={styles.addressText}>{selectedOrder.delivery_address}</Text>
                                </View>

                                <View style={styles.detailCard}>
                                    <Text style={styles.cardTitle}>Order Items</Text>
                                    {orderItems.map((item, index) => (
                                        <View key={index} style={styles.itemCard}>
                                            <View style={styles.itemHeader}>
                                                <Text style={styles.itemName}>{item.product_name}</Text>
                                                <Text style={styles.itemPrice}>MAD {formatPrice(item.quantity * item.price_per_unit)}</Text>
                                            </View>
                                            <View style={styles.itemDetails}>
                                                <Text style={styles.itemDetail}>Quantity: {item.quantity}</Text>
                                                <Text style={styles.itemDetail}>Unit Price: MAD {formatPrice(item.price_per_unit)}</Text>
                                            </View>
                                            {item.special_instructions && (
                                                <Text style={styles.specialInstructions}>
                                                    📝 Note: {item.special_instructions}
                                                </Text>
                                            )}
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.detailCard}>
                                    <Text style={styles.cardTitle}>Payment Summary</Text>
                                    <View style={styles.priceSummary}>
                                        <View style={styles.priceRow}>
                                            <Text style={styles.priceRowLabel}>Subtotal</Text>
                                            <Text style={styles.priceRowValue}>MAD {formatPrice(selectedOrder.total_price)}</Text>
                                        </View>
                                        <View style={styles.priceRow}>
                                            <Text style={styles.priceRowLabel}>Delivery Fee</Text>
                                            <Text style={styles.priceRowValue}>MAD {formatPrice(selectedOrder.delivery_fee)}</Text>
                                        </View>
                                        {selectedOrder.discount > 0 && (
                                            <View style={styles.priceRow}>
                                                <Text style={styles.priceRowLabel}>Discount</Text>
                                                <Text style={[styles.priceRowValue, { color: '#4CAF50' }]}>
                                                    - MAD {formatPrice(selectedOrder.discount)}
                                                </Text>
                                            </View>
                                        )}
                                        <View style={[styles.priceRow, styles.totalRow]}>
                                            <Text style={styles.totalLabel}>Total Amount</Text>
                                            <Text style={styles.totalValue}>MAD {formatPrice(selectedOrder.final_price)}</Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.statusActionsSection}>
                                    <Text style={styles.detailLabel}>CHANGE ORDER STATUS</Text>
                                    <View style={styles.statusButtonsGrid}>
                                        {['Pending', 'Preparing', 'OutForDelivery', 'Delivered', 'Cancelled'].map((status) => (
                                            <TouchableOpacity
                                                key={status}
                                                style={[
                                                    styles.statusActionButton,
                                                    selectedOrder.status === status && styles.statusActionButtonActive,
                                                    {
                                                        borderColor: statusColors[status],
                                                        backgroundColor: selectedOrder.status === status
                                                            ? statusBgColors[status]
                                                            : 'white'
                                                    },
                                                ]}
                                                onPress={() => updateOrderStatus(selectedOrder.id, status)}
                                                disabled={processingOrderId === selectedOrder.id}
                                            >
                                                <Text style={[styles.statusIcon, { color: statusColors[status], fontSize: 18 }]}>
                                                    {statusIcons[status]}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.statusActionButtonText,
                                                        selectedOrder.status === status && {
                                                            color: statusColors[status],
                                                            fontWeight: '700',
                                                        },
                                                        { color: statusColors[status] }
                                                    ]}
                                                >
                                                    {statusLabels[status]}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    const renderAssignModal = () => {
        const nearbyDriversList = getNearbyDrivers();

        return (
            <Modal
                visible={showAssignModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowAssignModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '85%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>🚚 Assign Delivery Driver</Text>
                            <TouchableOpacity
                                style={styles.closeButtonContainer}
                                onPress={() => setShowAssignModal(false)}
                            >
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            <View style={styles.assignModalHeader}>
                                <Text style={styles.modalSubtitle}>
                                    📍 Drivers sorted by distance from restaurant
                                </Text>
                                {restaurantSettings?.restaurant_address && (
                                    <Text style={styles.restaurantAddressText}>
                                        {restaurantSettings.restaurant_address}
                                    </Text>
                                )}
                            </View>

                            {nearbyDriversList.map((dm, index) => (
                                <View key={dm.id} style={[styles.deliveryManCard, index === 0 && styles.nearestDriverCard]}>
                                    <View style={styles.driverCardContent}>
                                        <View style={styles.driverAvatarContainer}>
                                            {dm.image ? (
                                                <Image
                                                    source={{ uri: `${API_URL.replace('/api/admin', '')}/uploads/deliveryManImages/${dm.image}` }}
                                                    style={styles.driverAvatarImage}
                                                />
                                            ) : (
                                                <View style={[styles.driverAvatar, index === 0 && styles.nearestDriverAvatar]}>
                                                    <Text style={styles.driverAvatarText}>
                                                        {dm.name.charAt(0)}
                                                    </Text>
                                                </View>
                                            )}
                                            {index === 0 && (
                                                <View style={styles.nearestBadge}>
                                                    <Text style={styles.nearestBadgeText}>Nearest</Text>
                                                </View>
                                            )}
                                        </View>

                                        <View style={styles.deliveryManInfo}>
                                            <Text style={styles.deliveryManName}>{dm.name}</Text>
                                            <View style={styles.driverDetailsRow}>
                                                <Text style={styles.deliveryManPhone}>📞 {dm.phone}</Text>
                                            </View>
                                            <View style={styles.driverDetailsRow}>
                                                {dm.vehicle_type && (
                                                    <Text style={styles.deliveryManVehicle}>🚗 {dm.vehicle_type}</Text>
                                                )}
                                                {dm.distance !== undefined && dm.distance < 999 && (
                                                    <Text style={[styles.distanceBadge, dm.distance < 5 && styles.nearbyBadge]}>
                                                        📍 {dm.distance.toFixed(1)} km
                                                    </Text>
                                                )}
                                                {dm.distance === 999 && (
                                                    <Text style={styles.noLocationBadge}>📍 Location unknown</Text>
                                                )}
                                            </View>
                                        </View>
                                    </View>

                                    <View style={styles.driverActions}>
                                        <TouchableOpacity
                                            style={styles.callDriverButton}
                                            onPress={() => handleCall(dm.phone, dm.name)}
                                        >
                                            <Text style={styles.callDriverButtonText}>📞</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.assignDriverButton, index === 0 && styles.assignDriverButtonPrimary]}
                                            onPress={() => assignDeliveryMan(dm.id)}
                                            disabled={processingOrderId !== null}
                                        >
                                            {processingOrderId === dm.id ? (
                                                <ActivityIndicator size="small" color="white" />
                                            ) : (
                                                <Text style={styles.assignDriverButtonText}>Assign</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}

                            {nearbyDriversList.length === 0 && (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyStateIcon}>🚫</Text>
                                    <Text style={styles.emptyStateTitle}>No Active Drivers</Text>
                                    <Text style={styles.emptyStateText}>
                                        There are no active delivery drivers available at the moment.
                                    </Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        );
    };

    const handleTimeInputSubmit = () => {
        const timeValue = parseInt(estimatedTime);
        if (!timeValue || timeValue <= 0) {
            Alert.alert('Invalid Time', 'Please enter a valid preparation time in minutes');
            return;
        }

        setShowTimeInputModal(false);
        if (pendingOrderId) {
            updateOrderStatus(pendingOrderId, 'Preparing', timeValue);
        }
        setEstimatedTime('15');
        setPendingOrderId(null);
    };

    const renderTimeInputModal = () => (
        <Modal
            visible={showTimeInputModal}
            animationType="fade"
            transparent={true}
            onRequestClose={() => {
                setShowTimeInputModal(false);
                setEstimatedTime('');
                setPendingOrderId(null);
            }}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { maxHeight: '90%', borderRadius: 24 }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Set Preparation Time</Text>
                        <TouchableOpacity
                            style={styles.closeButtonContainer}
                            onPress={() => {
                                setShowTimeInputModal(false);
                                setEstimatedTime('');
                                setPendingOrderId(null);
                            }}
                        >
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        {/* Order Summary */}
                        <View style={styles.orderSummaryCard}>
                            <Text style={styles.orderSummaryTitle}>Order #{pendingOrderId}</Text>
                            <View style={styles.orderSummaryItems}>
                                {orderItems.slice(0, 3).map((item, index) => (
                                    <View key={index} style={styles.orderSummaryItem}>
                                        {item.product_image ? (
                                            <Image source={{ uri: `https://haba-haba-api.ubua.cloud/${item.product_image.replace(/\\/g, '/')}` }} style={styles.itemThumbnail} />
                                        ) : (
                                            <View style={styles.itemPlaceholder}>
                                                <Text style={styles.itemPlaceholderText}>🍽️</Text>
                                            </View>
                                        )}
                                        <View style={styles.orderSummaryItemInfo}>
                                            <Text style={styles.orderSummaryItemName}>{item.product_name}</Text>
                                            <Text style={styles.orderSummaryItemDetails}>Qty: {item.quantity} • MAD {formatPrice(item.price_per_unit)}</Text>
                                        </View>
                                    </View>
                                ))}
                                {orderItems.length > 3 && (
                                    <Text style={styles.moreItemsText}>+{orderItems.length - 3} more items</Text>
                                )}
                            </View>
                            <View style={styles.orderSummaryTotal}>
                                <Text style={styles.orderSummaryTotalLabel}>Total Amount:</Text>
                                <Text style={styles.orderSummaryTotalValue}>MAD {formatPrice(orderItems.reduce((sum, item) => sum + (item.quantity * item.price_per_unit), 0))}</Text>
                            </View>
                        </View>

                        {/* Customer Info */}
                        <View style={styles.customerInfoCard}>
                            <Text style={styles.customerInfoTitle}>Customer Information</Text>
                            <View style={styles.customerInfoRow}>
                                {selectedOrder?.customer_name ? (
                                    <>
                                        <View style={styles.customerAvatar}>
                                            <Text style={styles.customerAvatarText}>
                                                {selectedOrder.customer_name.charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={styles.customerDetails}>
                                            <Text style={styles.customerName}>{selectedOrder.customer_name}</Text>
                                            <Text style={styles.customerPhone}>{selectedOrder.customer_phone || 'No phone'}</Text>
                                        </View>
                                    </>
                                ) : (
                                    <Text style={styles.noCustomerInfo}>Customer information not available</Text>
                                )}
                            </View>
                        </View>

                        {/* Time Selection Section */}
                        <View style={styles.timeInputSection}>
                            <Text style={styles.timeInputLabel}>
                                ⏱️ How long will it take to prepare this order?
                            </Text>
                            <Text style={styles.timeInputSublabel}>
                                Use +/- buttons to set preparation time
                            </Text>

                            <View style={styles.circularCounterContainer}>
                                <View style={styles.circularCounter}>
                                    <Text style={styles.circularCounterValue}>
                                        {estimatedTime || '15'}
                                    </Text>
                                    <Text style={styles.circularCounterLabel}>minutes</Text>
                                </View>
                                
                                <View style={styles.counterButtonsRow}>
                                    <TouchableOpacity
                                        style={styles.counterButton}
                                        onPress={() => {
                                            const current = parseInt(estimatedTime || '15');
                                            if (current > 5) {
                                                setEstimatedTime((current - 5).toString());
                                            }
                                        }}
                                    >
                                        <Text style={styles.counterButtonText}>−</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity
                                        style={styles.counterButton}
                                        onPress={() => {
                                            const current = parseInt(estimatedTime || '15');
                                            if (current < 120) {
                                                setEstimatedTime((current + 5).toString());
                                            }
                                        }}
                                    >
                                        <Text style={styles.counterButtonText}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.confirmTimeButton}
                                onPress={handleTimeInputSubmit}
                            >
                                <Text style={styles.confirmTimeButtonText}>✓ Confirm & Start Preparing</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2196F3" />
                    <Text style={styles.loadingText}>Loading orders...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error && !token) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                <View style={styles.errorContainer}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <Text style={styles.errorSubtext}>Please login as admin</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Fixed Header */}
            <View style={[styles.header, { paddingTop: insets.top - 10 }]}>
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.headerTitle}>Orders Dashboard</Text>
                        <Text style={styles.headerSubtitle}>Welcome back, {adminUser || 'Admin'}</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={[
                                styles.clusterButton,
                                showClusterView && styles.clusterButtonActive
                            ]}
                            onPress={() => {
                                if (showClusterView) {
                                    setShowClusterView(false);
                                    setClusters([]);
                                } else {
                                    generateClusters();
                                }
                            }}
                            disabled={clusteringInProgress}
                        >
                            {clusteringInProgress ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Text style={styles.clusterButtonIcon}>
                                        {showClusterView ? '✕' : '📦'}
                                    </Text>
                                    <Text style={styles.clusterButtonText}>
                                        {showClusterView ? 'Exit' : 'Cluster'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Status Tabs */}
            {!showClusterView && renderStatusTabs()}

            {/* Cluster View */}
            {showClusterView && (
                <View style={styles.clusterViewContainer}>
                    <View style={styles.clusterViewHeader}>
                        <Text style={styles.clusterViewTitle}>📦 Order Clusters</Text>
                        <Text style={styles.clusterViewSubtitle}>
                            {clusters.length} cluster(s) • Tap to assign driver
                        </Text>
                    </View>
                    <ScrollView
                        style={styles.clustersList}
                        showsVerticalScrollIndicator={false}
                    >
                        {clusters.map((cluster) => (
                            <TouchableOpacity
                                key={cluster.id}
                                style={[
                                    styles.clusterCard,
                                    { borderLeftColor: cluster.color, borderLeftWidth: 4 }
                                ]}
                                onPress={() => {
                                    setSelectedCluster(cluster);
                                    setShowClusterModal(true);
                                }}
                            >
                                <View style={styles.clusterCardHeader}>
                                    <View style={[styles.clusterColorDot, { backgroundColor: cluster.color }]} />
                                    <View style={styles.clusterCardInfo}>
                                        <Text style={styles.clusterCardTitle}>
                                            {cluster.orders.length} Orders • {cluster.direction}
                                        </Text>
                                        <Text style={styles.clusterCardSubtitle}>
                                            📍 {cluster.totalDistance.toFixed(1)} km • ⏱️ ~{cluster.estimatedTime} min
                                        </Text>
                                    </View>
                                    {cluster.assignedDriverName ? (
                                        <View style={styles.clusterAssignedBadge}>
                                            <Text style={styles.clusterAssignedText}>
                                                ✓ {cluster.assignedDriverName}
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={styles.clusterUnassignedBadge}>
                                            <Text style={styles.clusterUnassignedText}>Assign</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.clusterOrdersList}>
                                    {cluster.orders.map((order, idx) => (
                                        <View key={order.id} style={styles.clusterOrderItem}>
                                            <Text style={styles.clusterOrderNumber}>
                                                {idx + 1}. #{order.order_number}
                                            </Text>
                                            <Text style={styles.clusterOrderAddress} numberOfLines={1}>
                                                {order.delivery_address}
                                            </Text>
                                            <Text style={styles.clusterOrderPrice}>
                                                MAD {formatPrice(order.final_price)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                                <View style={styles.clusterCardFooter}>
                                    <Text style={styles.clusterTotalPrice}>
                                        Total: MAD {formatPrice(cluster.orders.reduce((sum, o) => sum + o.final_price, 0))}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                        {clusters.length === 0 && (
                            <View style={styles.emptyClusterState}>
                                <Text style={styles.emptyClusterIcon}>📦</Text>
                                <Text style={styles.emptyClusterText}>No clusters generated</Text>
                                <Text style={styles.emptyClusterSubtext}>
                                    Clusters are created from Pending/Preparing orders with location data
                                </Text>
                            </View>
                        )}
                        <View style={styles.bottomSpacer} />
                    </ScrollView>
                </View>
            )}

            {/* Cluster Detail Modal */}
            <Modal
                visible={showClusterModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowClusterModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '90%' }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>📦 Cluster Details</Text>
                                {selectedCluster && (
                                    <Text style={styles.clusterModalSubtitle}>
                                        {selectedCluster.orders.length} orders • {selectedCluster.direction} direction
                                    </Text>
                                )}
                            </View>
                            <TouchableOpacity
                                style={styles.closeButtonContainer}
                                onPress={() => setShowClusterModal(false)}
                            >
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            {selectedCluster && (
                                <>
                                    <View style={styles.clusterStatsRow}>
                                        <View style={styles.clusterStatItem}>
                                            <Text style={styles.clusterStatValue}>
                                                {selectedCluster.totalDistance.toFixed(1)} km
                                            </Text>
                                            <Text style={styles.clusterStatLabel}>Distance</Text>
                                        </View>
                                        <View style={styles.clusterStatItem}>
                                            <Text style={styles.clusterStatValue}>
                                                ~{selectedCluster.estimatedTime} min
                                            </Text>
                                            <Text style={styles.clusterStatLabel}>Est. Time</Text>
                                        </View>
                                        <View style={styles.clusterStatItem}>
                                            <Text style={styles.clusterStatValue}>
                                                MAD {formatPrice(selectedCluster.orders.reduce((sum, o) => sum + o.final_price, 0))}
                                            </Text>
                                            <Text style={styles.clusterStatLabel}>Total</Text>
                                        </View>
                                    </View>

                                    <Text style={styles.clusterSectionTitle}>Delivery Route</Text>
                                    {selectedCluster.orders.map((order, idx) => (
                                        <View key={order.id} style={styles.clusterOrderDetailCard}>
                                            <View style={styles.clusterOrderDetailHeader}>
                                                <View style={styles.clusterOrderDetailNumber}>
                                                    <Text style={styles.clusterOrderDetailNumberText}>{idx + 1}</Text>
                                                </View>
                                                <View style={styles.clusterOrderDetailInfo}>
                                                    <Text style={styles.clusterOrderDetailTitle}>#{order.order_number}</Text>
                                                    <Text style={styles.clusterOrderDetailCustomer}>
                                                        {order.customer_name || 'Customer'}
                                                    </Text>
                                                </View>
                                                <Text style={styles.clusterOrderDetailPrice}>
                                                    MAD {formatPrice(order.final_price)}
                                                </Text>
                                            </View>
                                            <Text style={styles.clusterOrderDetailAddress}>
                                                📍 {order.delivery_address}
                                            </Text>
                                        </View>
                                    ))}

                                    <Text style={styles.clusterSectionTitle}>Assign Driver</Text>
                                    {getNearbyDrivers().map((driver) => (
                                        <TouchableOpacity
                                            key={driver.id}
                                            style={[
                                                styles.clusterDriverCard,
                                                selectedCluster.assignedDriverId === driver.id && styles.clusterDriverCardSelected
                                            ]}
                                            onPress={() => assignDriverToCluster(selectedCluster, driver.id)}
                                            disabled={processingOrderId !== null}
                                        >
                                            <View style={styles.clusterDriverInfo}>
                                                <View style={styles.driverAvatar}>
                                                    <Text style={styles.driverAvatarText}>{driver.name.charAt(0)}</Text>
                                                </View>
                                                <View>
                                                    <Text style={styles.clusterDriverName}>{driver.name}</Text>
                                                    <Text style={styles.clusterDriverDetails}>
                                                        {driver.vehicle_type || 'Vehicle'} • {driver.distance?.toFixed(1) || '?'} km
                                                    </Text>
                                                </View>
                                            </View>
                                            {processingOrderId === selectedCluster.orders[0]?.id ? (
                                                <ActivityIndicator size="small" color="#2196F3" />
                                            ) : (
                                                <Text style={styles.clusterAssignButtonText}>
                                                    {selectedCluster.assignedDriverId === driver.id ? '✓' : 'Assign'}
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Orders List */}
            {!showClusterView && <ScrollView
                style={styles.ordersContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#2196F3']}
                        tintColor="#2196F3"
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {error && (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorBannerIcon}>⚠️</Text>
                        <Text style={styles.errorBannerText}>{error}</Text>
                    </View>
                )}

                {filteredOrders.length > 0 ? (
                    filteredOrders.map(renderOrderCard)
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>📋</Text>
                        <Text style={styles.emptyText}>
                            {orders.length === 0 ? 'No orders yet' : 'No orders in this status'}
                        </Text>
                        <Text style={styles.emptySubtext}>
                            {orders.length === 0
                                ? 'Orders will appear here when customers place them'
                                : 'Try selecting a different status or check back later'}
                        </Text>
                    </View>
                )}
                <View style={styles.bottomSpacer} />
            </ScrollView>}

            {renderOrderDetailsModal()}
            {renderAssignModal()}
            {renderTimeInputModal()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#64748B',
        fontWeight: '500',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#F8FAFC',
    },
    errorIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    errorText: {
        fontSize: 18,
        color: '#DC2626',
        textAlign: 'center',
        fontWeight: '600',
        marginBottom: 8,
    },
    errorSubtext: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
    },
    errorBanner: {
        backgroundColor: '#FEF3C7',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
    },
    errorBannerIcon: {
        fontSize: 20,
        marginRight: 12,
    },
    errorBannerText: {
        flex: 1,
        color: '#92400E',
        fontSize: 14,
        fontWeight: '500',
    },
    header: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1E293B',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 2,
    },
    orderStats: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    orderStatsText: {
        fontSize: 12,
        color: '#2563EB',
        fontWeight: '600',
    },
    statusTabsContainer: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingVertical: 12,
    },
    statusTabsContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    statusTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.5,
        marginRight: 8,
        minHeight: 44,
    },
    statusTabActive: {
        borderWidth: 1.5,
    },
    statusTabContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    },
    statusIcon: {
        fontSize: 14,
        marginRight: 6,
    },
    statusTabText: {
        fontSize: 13,
        fontWeight: '500',
        maxWidth: 100,
    },
    statusTabTextActive: {
        fontWeight: '600',
    },
    statusBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#EF4444',
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    statusBadgeText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '700',
    },
    ordersContainer: {
        flex: 1,
        padding: 16,
    },
    orderCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    orderHeaderLeft: {
        flex: 1,
    },
    orderNumberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    orderNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginRight: 8,
    },
    paymentBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    paymentBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    orderTime: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '500',
    },
    statusBadgeLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1.5,
        marginLeft: 8,
    },
    statusIconLarge: {
        fontSize: 14,
        marginRight: 6,
    },
    statusBadgeLargeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    orderInfo: {
        marginBottom: 16,
        gap: 12,
    },
    customerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    customerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    customerAvatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2563EB',
    },
    customerInfo: {
        flex: 1,
    },
    customerName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 2,
    },
    customerPhone: {
        fontSize: 13,
        color: '#64748B',
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    addressIcon: {
        fontSize: 16,
        color: '#64748B',
        marginRight: 10,
        marginTop: 2,
    },
    orderAddress: {
        flex: 1,
        fontSize: 14,
        color: '#475569',
        lineHeight: 20,
    },
    deliveryManRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    deliveryManIcon: {
        fontSize: 16,
        marginRight: 10,
        color: '#475569',
    },
    deliveryManName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1E293B',
    },
    deliveryManPhone: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 4,
    },
    orderFooter: {
        paddingTop: 16,
    },
    priceContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    priceLabel: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    priceValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#10B981',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    assignButton: {
        flex: 1,
        backgroundColor: '#8B5CF6',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    assignButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    nextStatusButton: {
        flex: 2,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 10,
    },
    nextStatusButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    nextStatusArrow: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 6,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 20,
        color: '#CBD5E1',
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 20,
    },
    bottomSpacer: {
        height: 20,
    },
    // Enhanced Time Input Modal Styles
    orderSummaryCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    orderSummaryTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 12,
    },
    orderSummaryItems: {
        marginBottom: 12,
    },
    orderSummaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    itemThumbnail: {
        width: 40,
        height: 40,
        borderRadius: 8,
        marginRight: 12,
        backgroundColor: '#F3F4F6',
    },
    itemPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 8,
        marginRight: 12,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemPlaceholderText: {
        fontSize: 18,
    },
    orderSummaryItemInfo: {
        flex: 1,
    },
    orderSummaryItemName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 2,
    },
    orderSummaryItemDetails: {
        fontSize: 12,
        color: '#6B7280',
    },
    moreItemsText: {
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
        marginTop: 4,
    },
    orderSummaryTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    orderSummaryTotalLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    orderSummaryTotalValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    customerInfoCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    customerInfoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    customerInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    customerDetails: {
        flex: 1,
    },
    noCustomerInfo: {
        fontSize: 14,
        color: '#9CA3AF',
        fontStyle: 'italic',
    },
    timeInputSection: {
        marginBottom: 40,
    },
    timeInputLabel: {
        fontSize: 16,
        color: '#374151',
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 22,
        fontWeight: '600',
    },
    timeInputSublabel: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    timeInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        gap: 8,
    },
    timeInput: {
        width: 80,
        height: 50,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        backgroundColor: '#F9FAFB',
    },
    timeInputUnit: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
    },
    quickTimeButtons: {
        marginBottom: 24,
    },
    quickTimeLabel: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 12,
        fontWeight: '500',
    },
    quickTimeButtonsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
    },
    quickTimeButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        minWidth: 70,
        alignItems: 'center',
    },
    quickTimeButtonActive: {
        borderColor: '#3B82F6',
        backgroundColor: '#EFF6FF',
    },
    quickTimeButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    quickTimeButtonTextActive: {
        color: '#3B82F6',
        fontWeight: '600',
    },
    submitTimeButton: {
        backgroundColor: '#3B82F6',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitTimeButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
        flex: 1,
    },
    closeButtonContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        fontSize: 18,
        color: '#64748B',
        fontWeight: '300',
    },
    modalBody: {
        padding: 24,
        paddingVertical: 20,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 24,
        textAlign: 'center',
    },
    detailSection: {
        marginBottom: 24,
    },
    detailLabel: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    detailValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1E293B',
    },
    detailCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 16,
    },
    customerDetailRow: {
        flexDirection: 'row',
        gap: 20,
    },
    detailItem: {
        flex: 1,
    },
    detailItemLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
        marginBottom: 4,
    },
    detailItemValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
    },
    addressText: {
        fontSize: 15,
        color: '#475569',
        lineHeight: 22,
    },
    itemCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    itemName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1E293B',
        flex: 1,
    },
    itemPrice: {
        fontSize: 15,
        fontWeight: '700',
        color: '#10B981',
    },
    itemDetails: {
        flexDirection: 'row',
        gap: 16,
    },
    itemDetail: {
        fontSize: 13,
        color: '#64748B',
    },
    specialInstructions: {
        fontSize: 13,
        color: '#8B5CF6',
        fontStyle: 'italic',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    priceSummary: {
        gap: 12,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceRowLabel: {
        fontSize: 14,
        color: '#64748B',
    },
    priceRowValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
    },
    totalRow: {
        paddingTop: 12,
        borderTopWidth: 2,
        borderTopColor: '#E2E8F0',
        marginTop: 4,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    totalValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#10B981',
    },
    statusActionsSection: {
        marginTop: 8,
        marginBottom: 24,
    },
    statusButtonsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 12,
    },
    statusActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1.5,
        minWidth: '48%',
        flex: 1,
        gap: 8,
    },
    statusActionButtonActive: {
        borderWidth: 2,
    },
    statusActionButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    deliveryManCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    driverAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    driverAvatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2563EB',
    },
    deliveryManInfo: {
        flex: 1,
    },
    deliveryManVehicle: {
        fontSize: 13,
        color: '#8B5CF6',
        fontWeight: '500',
    },
    assignButtonCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
    },
    assignArrow: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyStateIcon: {
        fontSize: 48,
        color: '#CBD5E1',
        marginBottom: 16,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 20,
    },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    customerPhoneClickable: {
        fontSize: 13,
        color: '#2563EB',
        fontWeight: '500',
    },
    deliveryManPhoneClickable: {
        fontSize: 13,
        color: '#2563EB',
        fontWeight: '500',
    },
    callHint: {
        fontSize: 10,
        color: '#10B981',
        fontWeight: '600',
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    deliveryManInfoRow: {
        flex: 1,
    },
    assignModalHeader: {
        marginBottom: 16,
    },
    restaurantAddressText: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
        fontStyle: 'italic',
    },
    nearestDriverCard: {
        borderColor: '#10B981',
        borderWidth: 2,
        backgroundColor: '#F0FDF4',
    },
    driverCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    driverAvatarContainer: {
        position: 'relative',
        marginRight: 16,
    },
    driverAvatarImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    nearestDriverAvatar: {
        backgroundColor: '#D1FAE5',
        borderWidth: 2,
        borderColor: '#10B981',
    },
    nearestBadge: {
        position: 'absolute',
        bottom: -4,
        left: -4,
        right: -4,
        backgroundColor: '#10B981',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
        alignItems: 'center',
    },
    nearestBadgeText: {
        fontSize: 8,
        color: 'white',
        fontWeight: '700',
    },
    driverDetailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    distanceBadge: {
        fontSize: 11,
        color: '#64748B',
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        fontWeight: '500',
    },
    nearbyBadge: {
        backgroundColor: '#D1FAE5',
        color: '#059669',
    },
    noLocationBadge: {
        fontSize: 11,
        color: '#9CA3AF',
        fontStyle: 'italic',
    },
    driverActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    callDriverButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    callDriverButtonText: {
        fontSize: 18,
    },
    assignDriverButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#64748B',
        minWidth: 80,
        alignItems: 'center',
    },
    assignDriverButtonPrimary: {
        backgroundColor: '#10B981',
    },
    assignDriverButtonText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    clusterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6366F1',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    clusterButtonActive: {
        backgroundColor: '#DC2626',
    },
    clusterButtonIcon: {
        fontSize: 14,
        color: '#FFFFFF',
    },
    clusterButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    clusterViewContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    clusterViewHeader: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    clusterViewTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    clusterViewSubtitle: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 4,
    },
    clustersList: {
        flex: 1,
        padding: 16,
    },
    clusterCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    clusterCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    clusterColorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 10,
    },
    clusterCardInfo: {
        flex: 1,
    },
    clusterCardTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1E293B',
    },
    clusterCardSubtitle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    clusterAssignedBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    clusterAssignedText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#16A34A',
    },
    clusterUnassignedBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    clusterUnassignedText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#D97706',
    },
    clusterOrdersList: {
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 12,
    },
    clusterOrderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
    },
    clusterOrderNumber: {
        fontSize: 13,
        fontWeight: '500',
        color: '#1E293B',
        width: 80,
    },
    clusterOrderAddress: {
        flex: 1,
        fontSize: 12,
        color: '#64748B',
        marginHorizontal: 8,
    },
    clusterOrderPrice: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1E293B',
    },
    clusterCardFooter: {
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 12,
        marginTop: 8,
        alignItems: 'flex-end',
    },
    clusterTotalPrice: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
    },
    emptyClusterState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyClusterIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyClusterText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748B',
    },
    emptyClusterSubtext: {
        fontSize: 13,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 32,
    },
    clusterModalSubtitle: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 4,
    },
    clusterStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    clusterStatItem: {
        alignItems: 'center',
    },
    clusterStatValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    clusterStatLabel: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 4,
    },
    clusterSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 12,
        marginTop: 8,
    },
    clusterOrderDetailCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
    },
    clusterOrderDetailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    clusterOrderDetailNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#6366F1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    clusterOrderDetailNumberText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    clusterOrderDetailInfo: {
        flex: 1,
    },
    clusterOrderDetailTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
    },
    clusterOrderDetailCustomer: {
        fontSize: 12,
        color: '#64748B',
    },
    clusterOrderDetailPrice: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
    },
    clusterOrderDetailAddress: {
        fontSize: 12,
        color: '#64748B',
    },
    clusterDriverCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    clusterDriverCardSelected: {
        borderColor: '#6366F1',
        backgroundColor: '#EEF2FF',
    },
    clusterDriverInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    clusterDriverName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
    },
    clusterDriverDetails: {
        fontSize: 12,
        color: '#64748B',
    },
    clusterAssignButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6366F1',
    },
    circularCounterContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    circularCounter: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: '#1E293B',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    circularCounterValue: {
        fontSize: 48,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    circularCounterLabel: {
        fontSize: 14,
        color: '#94A3B8',
        marginTop: 4,
    },
    counterButtonsRow: {
        flexDirection: 'row',
        gap: 20,
    },
    counterButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#6366F1',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    counterButtonText: {
        fontSize: 32,
        fontWeight: '700',
        color: '#6366F1',
    },
    confirmTimeButton: {
        backgroundColor: '#6366F1',
        borderRadius: 16,
        paddingVertical: 16,
        marginTop: 24,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    confirmTimeButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    circularCountdownContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        marginTop: 12,
        borderWidth: 2,
        borderColor: '#E2E8F0',
    },
    circularProgressWrapper: {
        width: 80,
        height: 80,
        marginRight: 16,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    circularProgressBackground: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 6,
        borderColor: '#E2E8F0',
    },
    circularProgressBar: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 6,
        borderColor: '#6366F1',
        borderTopColor: '#6366F1',
        borderRightColor: '#6366F1',
        borderBottomColor: 'transparent',
        borderLeftColor: 'transparent',
        transform: [{ rotate: '45deg' }],
    },
    circularProgressCenter: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    circularCountdownTime: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    circularCountdownInfo: {
        flex: 1,
    },
    circularCountdownLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 4,
    },
    circularCountdownSubtext: {
        fontSize: 12,
        color: '#64748B',
    },
    presetTimeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    presetTimeButton: {
        width: '22%',
        aspectRatio: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    presetTimeButtonActive: {
        backgroundColor: '#EEF2FF',
        borderColor: '#6366F1',
        transform: [{ scale: 0.95 }],
    },
    presetTimeButtonText: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1E293B',
    },
    presetTimeButtonTextActive: {
        color: '#6366F1',
    },
    presetTimeButtonLabel: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
        fontWeight: '500',
    },
    presetTimeButtonLabelActive: {
        color: '#6366F1',
    },
    countdownCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    countdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    countdownTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
    },
    countdownTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    countdownMinutes: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    countdownSeparator: {
        fontSize: 20,
        fontWeight: '700',
        color: '#64748B',
        marginHorizontal: 4,
    },
    countdownSeconds: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    countdownProgress: {
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        marginBottom: 8,
    },
    countdownProgressBar: {
        height: '100%',
        backgroundColor: '#6366F1',
        borderRadius: 3,
    },
    countdownStatus: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
    },
    footerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    paymentStatusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    paymentStatusText: {
        fontSize: 12,
        fontWeight: '600',
    },
});