// Add this to suppress the specific text error
LogBox.ignoreLogs([
    'Text strings must be rendered within a <Text> component',
    'Each child in a list should have a unique "key" prop',
]);
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlashList } from '@shopify/flash-list';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    LogBox,
    RefreshControl,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = 'https://haba-haba-api.ubua.cloud/api/admin';
const IMAGE_BASE_URL = 'https://haba-haba-api.ubua.cloud';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Category {
    id: number;
    name: string;
    image?: string;
    description?: string;
    active: boolean;
    created_at?: string;
    updated_at?: string;
}

interface Product {
    id: number;
    name: string;
    description?: string;
    price: number;
    rating?: number;
    image?: string;
    category_id: number;
    category_name?: string;
    delivery?: boolean;
    promo?: boolean;
    promoValue?: number;
    badge?: string;
    created_at?: string;
    is_popular: boolean;
    active: boolean;
    best_for?: string;
}

export default function AdminProducts() {
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const insets = useSafeAreaInsets();
    const [selectedTab, setSelectedTab] = useState<'categories' | 'products'>('products');

    useEffect(() => {
        loadAdminToken();
    }, []);

    useEffect(() => {
        if (token) {
            fetchData();
        }
    }, [token, selectedTab]);

    const loadAdminToken = async () => {
        try {
            // Directly get the token string from AsyncStorage
            const token = await AsyncStorage.getItem('adminToken');
            console.log('🔍 Token from storage:', token ? 'Exists' : 'Missing');

            if (token) {
                console.log('📏 Token length:', token.length);
                console.log('🔐 Token preview:', token.substring(0, 30) + '...');
                setToken(token);
            } else {
                console.log('❌ No admin token found in storage');
            }
        } catch (error) {
            console.error('❌ Error loading admin token:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        try {
            if (selectedTab === 'categories') {
                await fetchCategories();
            } else {
                await fetchProducts();
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const fetchCategories = async () => {
        try {
            setLoading(true);

            // Get fresh token
            const currentToken = await AsyncStorage.getItem('adminToken');

            if (!currentToken) {
                console.error('❌ No token found');
                Alert.alert('Error', 'Please login again');
                return;
            }

            const response = await axios.get(`${API_URL}/categories`, {
                headers: {
                    Authorization: `Bearer ${currentToken}`,
                    'Content-Type': 'application/json'
                },
            });
            // Ensure we always set an array (avoid setting a string/object which would render raw text)
            setCategories(Array.isArray(response.data?.categories) ? response.data.categories : (Array.isArray(response.data) ? response.data : []));
        } catch (error: any) {
            console.error('Error fetching categories:', error);

            if (error.response?.status === 401) {
                Alert.alert('Session Expired', 'Please login again');
                await AsyncStorage.removeItem('adminToken');
            } else {
                Alert.alert('Error', 'Failed to fetch categories');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchProducts = async () => {
        try {
            setLoading(true);

            // Get fresh token each time
            const currentToken = await AsyncStorage.getItem('adminToken');

            if (!currentToken) {
                console.error('❌ No token found');
                Alert.alert('Error', 'Please login again');
                return;
            }

            console.log('🔄 Fetching products with token:', currentToken.substring(0, 30) + '...');

            const response = await axios.get(`${API_URL}/products`, {
                headers: {
                    Authorization: `Bearer ${currentToken}`,
                    'Content-Type': 'application/json'
                },
            });

            // Ensure we always set an array (avoid setting a string/object which would render raw text)
            setProducts(Array.isArray(response.data?.products) ? response.data.products : (Array.isArray(response.data) ? response.data : []));

        } catch (error: any) {
            console.error('❌ Error fetching products:', error);
            console.error('❌ Error status:', error.response?.status);
            console.error('❌ Error data:', error.response?.data);

            if (error.response?.status === 401) {
                Alert.alert('Session Expired', 'Please login again');
                await AsyncStorage.removeItem('adminToken');
            } else {
                Alert.alert('Error', error.response?.data?.message || 'Failed to fetch products');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const renderItem = React.useCallback(({ item }: { item: any }) => {
        if (selectedTab === 'categories') {
            return renderCategoryCard(item);
        }
        return renderProductCard(item);
    }, [selectedTab, products, categories]);


    const availabilityToggle = async (productId: number, currentStatus: boolean) => {
        try {
            const currentToken = await AsyncStorage.getItem('adminToken');

            if (!currentToken) {
                Alert.alert('Error', 'Please login again');
                return;
            }

            await axios.put(
                `${API_URL}/${productId}/toggle-availability`,
                { active: !currentStatus },
                {
                    headers: {
                        Authorization: `Bearer ${currentToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Update local state immediately for better UX
            setProducts(prevProducts =>
                prevProducts.map(product =>
                    product.id === productId
                        ? { ...product, active: !currentStatus }
                        : product
                )
            );

            Alert.alert(
                'Success',
                `Product ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
                [{ text: 'OK' }]
            );

        } catch (error: any) {
            console.error('Error toggling product availability:', error);

            if (error.response?.status === 401) {
                Alert.alert('Session Expired', 'Please login again');
                await AsyncStorage.removeItem('adminToken');
            } else {
                Alert.alert('Error', error.response?.data?.message || 'Failed to update product availability');
            }
        }
    };

    const formatPrice = (price: number | string | null | undefined): string => {
        const num = Number(price);
        return isNaN(num) ? '0.00' : num.toFixed(2);
    };

    const getImageUrl = (imagePath: string | undefined | null): string | null => {
        if (!imagePath) return null;
        if (imagePath.startsWith('http')) return imagePath;
        return `${IMAGE_BASE_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
    };

    const categoryToggle = async (categoryId: number, currentStatus: boolean) => {
        try {
            const currentToken = await AsyncStorage.getItem('adminToken');

            if (!currentToken) {
                Alert.alert('Error', 'Please login again');
                return;
            }

            // Use the existing updateCategory endpoint
            await axios.put(
                `${API_URL}/categories/${categoryId}`,
                { active: !currentStatus },
                {
                    headers: {
                        Authorization: `Bearer ${currentToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            setCategories(prevCategories =>
                prevCategories.map(category =>
                    category.id === categoryId
                        ? { ...category, active: !currentStatus }
                        : category
                )
            );

            Alert.alert(
                'Success',
                `Category ${!currentStatus ? 'activated' : 'deactivated'} successfully`
            );

        } catch (error: any) {
            console.error('Error toggling category:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to update category');
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };
    useEffect(() => {
        const debugToken = async () => {
            const allKeys = await AsyncStorage.getAllKeys();
            console.log('📋 All storage keys:', allKeys);

            const token = await AsyncStorage.getItem('adminToken');
            console.log('🔑 Token from storage:', {
                exists: !!token,
                length: token?.length,
                preview: token?.substring(0, 30) + '...'
            });

            const adminData = await AsyncStorage.getItem('adminData');
            console.log('👤 Admin data:', adminData);
        };

        debugToken();
    }, []);
    const renderCategoryCard = (category: Category) => {
        const imageUrl = getImageUrl(category.image);

        return (
            <View key={category.id} style={styles.categoryCard}>
                {/* Category Image */}
                <View style={styles.categoryImageContainer}>
                    {imageUrl ? (
                        <Image
                            source={{ uri: imageUrl.replace(/\\/g, '/') }}
                            style={styles.categoryImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.categoryImagePlaceholder}>
                            <Ionicons name="grid-outline" size={32} color="#94A3B8" />
                        </View>
                    )}
                    {/* Active/Inactive overlay */}
                    {!category.active && (
                        <View style={styles.inactiveOverlay}>
                            <Text style={styles.inactiveOverlayText}>Inactive</Text>
                        </View>
                    )}
                </View>

                {/* Category Info */}
                <View style={styles.categoryInfo}>
                    <View style={styles.categoryHeader}>
                        <Text style={styles.categoryName} numberOfLines={1}>{category.name}</Text>
                        <View style={[
                            styles.statusDot,
                            category.active ? styles.statusDotActive : styles.statusDotInactive
                        ]} />
                    </View>

                    {category.description && (
                        <Text style={styles.categoryDescription} numberOfLines={2}>
                            {category.description}
                        </Text>
                    )}

                    <View style={styles.categoryFooter}>
                        <Text style={styles.categoryDate}>
                            {category.created_at ? new Date(category.created_at).toLocaleDateString() : ''}
                        </Text>
                        <Switch
                            value={Boolean(category.active)}
                            onValueChange={() => categoryToggle(category.id, Boolean(category.active))}
                            trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                            thumbColor="#FFFFFF"
                            ios_backgroundColor="#E0E0E0"
                            style={styles.categorySwitch}
                        />
                    </View>
                </View>
            </View>
        );
    };

    const renderProductCard = (product: Product) => {
        const imageUrl = getImageUrl(product.image);
        const hasPromo = product.promo && product.promoValue && product.promoValue > 0;
        const discountedPrice = hasPromo
            ? product.price - (product.price * (product.promoValue! / 100))
            : product.price;

        return (
            <View key={product.id} style={styles.productCard}>
                {/* Product Image */}
                <View style={styles.productImageContainer}>
                    {imageUrl ? (
                        <Image
                            source={{ uri: imageUrl.replace(/\\/g, '/') }}
                            style={styles.productImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.productImagePlaceholder}>
                            <Ionicons name="fast-food-outline" size={40} color="#94A3B8" />
                        </View>
                    )}

                    {/* Badges overlay */}
                    <View style={styles.badgesContainer}>
                        {hasPromo && (
                            <View style={styles.promoBadge}>
                                <Text style={styles.promoBadgeText}>-{product.promoValue}%</Text>
                            </View>
                        )}
                        {product.badge && (
                            <View style={styles.customBadge}>
                                <Text style={styles.customBadgeText}>{product.badge}</Text>
                            </View>
                        )}
                    </View>

                    {/* Inactive overlay */}
                    {!product.active && (
                        <View style={styles.inactiveOverlay}>
                            <Text style={styles.inactiveOverlayText}>Inactive</Text>
                        </View>
                    )}
                </View>

                {/* Product Info */}
                <View style={styles.productInfo}>
                    {/* Header with name and popular badge */}
                    <View style={styles.productNameRow}>
                        <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                        {product.is_popular && (
                            <View style={styles.popularBadge}>
                                <Text style={styles.popularText}>⭐</Text>
                            </View>
                        )}
                    </View>

                    {/* Description */}
                    {product.description && (
                        <Text style={styles.productDescription} numberOfLines={2}>
                            {product.description}
                        </Text>
                    )}

                    {/* Rating and Category */}
                    <View style={styles.productMetaRow}>
                        {product.rating !== undefined && product.rating > 0 && (
                            <View style={styles.ratingContainer}>
                                <Ionicons name="star" size={14} color="#F59E0B" />
                                <Text style={styles.ratingText}>{product.rating}</Text>
                            </View>
                        )}
                        <Text style={styles.categoryTag}>{product.category_name || 'Uncategorized'}</Text>
                        {product.delivery && (
                            <View style={styles.deliveryBadge}>
                                <Ionicons name="bicycle-outline" size={12} color="#10B981" />
                                <Text style={styles.deliveryText}>Delivery-{product.delivery}</Text>
                            </View>
                        )}
                    </View>

                    {/* Best For */}
                    {product.best_for && (
                        <Text style={styles.bestForText}>🍽️ Best for: {product.best_for}</Text>
                    )}

                    {/* Price and Toggle */}
                    <View style={styles.productFooterRow}>
                        <View style={styles.priceContainer}>
                            {hasPromo ? (
                                <>
                                    <Text style={styles.originalPrice}>{formatPrice(product.price)} MAD</Text>
                                    <Text style={styles.discountedPrice}>{formatPrice(discountedPrice)} MAD</Text>
                                </>
                            ) : (
                                <Text style={styles.productPrice}>{formatPrice(product.price)} MAD</Text>
                            )}
                        </View>

                        <View style={styles.toggleContainer}>
                            <Text style={[
                                styles.toggleLabel,
                                product.active ? styles.toggleLabelActive : styles.toggleLabelInactive
                            ]}>
                                {product.active ? 'Active' : 'Off'}
                            </Text>
                            <Switch
                                value={Boolean(product.active)}
                                onValueChange={() => availabilityToggle(product.id, Boolean(product.active))}
                                trackColor={{ false: '#E0E0E0', true: '#10B981' }}
                                thumbColor="#FFFFFF"
                                ios_backgroundColor="#E0E0E0"
                                style={styles.productSwitch}
                            />
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2196F3" />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Products & Categories</Text>
                <Text style={styles.headerSubtitle}>Manage your menu</Text>
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'products' && styles.tabActive]}
                    onPress={() => setSelectedTab('products')}
                >
                    <Ionicons
                        name="fast-food-outline"
                        size={20}
                        color={selectedTab === 'products' ? '#2196F3' : '#666'}
                    />
                    <Text
                        style={[styles.tabText, selectedTab === 'products' && styles.tabTextActive]}
                    >
                        {`Products (${products.length})`}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'categories' && styles.tabActive]}
                    onPress={() => setSelectedTab('categories')}
                >
                    <Ionicons
                        name="grid-outline"
                        size={20}
                        color={selectedTab === 'categories' ? '#2196F3' : '#666'}
                    />
                    <Text
                        style={[
                            styles.tabText,
                            selectedTab === 'categories' && styles.tabTextActive,
                        ]}
                    >
                        {`Categories (${categories.length})`}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
                <FlashList
                    data={selectedTab === 'categories' ? categories : products}
                    renderItem={renderItem}
                    keyExtractor={(item) => `${selectedTab}-${item.id}`}
                    contentContainerStyle={{ padding: 16 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons 
                                name={selectedTab === 'categories' ? "grid-outline" : "fast-food-outline"} 
                                size={64} 
                                color="#ccc" 
                            />
                            <Text style={styles.emptyText}>No {selectedTab} found</Text>
                        </View>
                    }
                />
            </View>
        </View>
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
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#64748B',
    },
    header: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: '#1E293B',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 4,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    tabActive: {
        borderBottomWidth: 3,
        borderBottomColor: '#6366F1',
    },
    tabText: {
        fontSize: 15,
        color: '#64748B',
        fontWeight: '500',
    },
    tabTextActive: {
        color: '#6366F1',
        fontWeight: '700',
    },
    content: {
        flex: 1,
        padding: 16,
    },

    // Category Card Styles
    categoryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    categoryImageContainer: {
        width: '100%',
        height: 120,
        backgroundColor: '#F1F5F9',
        position: 'relative',
    },
    categoryImage: {
        width: '100%',
        height: '100%',
    },
    categoryImagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
    },
    categoryInfo: {
        padding: 16,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    categoryName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        flex: 1,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginLeft: 8,
    },
    statusDotActive: {
        backgroundColor: '#10B981',
    },
    statusDotInactive: {
        backgroundColor: '#EF4444',
    },
    categoryDescription: {
        fontSize: 14,
        color: '#64748B',
        lineHeight: 20,
        marginBottom: 12,
    },
    categoryFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    categoryDate: {
        fontSize: 12,
        color: '#94A3B8',
    },
    categorySwitch: {
        transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
    },

    // Product Card Styles
    productCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    productImageContainer: {
        width: '100%',
        height: 180,
        backgroundColor: '#F1F5F9',
        position: 'relative',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    productImagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
    },
    badgesContainer: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        gap: 8,
    },
    promoBadge: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    promoBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    customBadge: {
        backgroundColor: '#6366F1',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    customBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    inactiveOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    inactiveOverlayText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    productInfo: {
        padding: 16,
    },
    productNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    productName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        flex: 1,
    },
    popularBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 8,
    },
    popularText: {
        fontSize: 12,
    },
    productDescription: {
        fontSize: 14,
        color: '#64748B',
        lineHeight: 20,
        marginBottom: 10,
    },
    productMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#92400E',
    },
    categoryTag: {
        fontSize: 12,
        color: '#6366F1',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        fontWeight: '500',
    },
    deliveryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    deliveryText: {
        fontSize: 11,
        color: '#059669',
        fontWeight: '500',
    },
    bestForText: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 12,
        fontStyle: 'italic',
    },
    productFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    productPrice: {
        fontSize: 20,
        fontWeight: '700',
        color: '#10B981',
    },
    originalPrice: {
        fontSize: 14,
        color: '#94A3B8',
        textDecorationLine: 'line-through',
    },
    discountedPrice: {
        fontSize: 20,
        fontWeight: '700',
        color: '#EF4444',
    },
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    toggleLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    toggleLabelActive: {
        color: '#10B981',
    },
    toggleLabelInactive: {
        color: '#EF4444',
    },
    productSwitch: {
        transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
    },

    // Legacy styles (keeping for compatibility)
    switchContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
        minWidth: 60,
    },
    switchLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
    },
    switchLabelActive: {
        color: '#4CAF50',
    },
    switchLabelInactive: {
        color: '#F44336',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardContent: {
        flex: 1,
    },
    productHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    cardDescription: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    productFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
    },
    priceText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    categoryText: {
        fontSize: 14,
        color: '#999',
    },
    availabilityToggle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    availableToggle: {
        backgroundColor: '#4CAF50',
    },
    unavailableToggle: {
        backgroundColor: '#F44336',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        color: '#999',
        marginTop: 16,
    },
});
