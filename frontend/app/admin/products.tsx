// Add this to suppress the specific text error
LogBox.ignoreLogs([
    'Text strings must be rendered within a <Text> component',
    'Each child in a list should have a unique "key" prop',
]);

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlashList } from '@shopify/flash-list';
import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    LogBox,
    RefreshControl,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useLanguage } from './contexts/LanguageContext'; // adjust path if needed

const API_URL = 'https://haba-haba-api.ubua.cloud/api/admin';
const IMAGE_BASE_URL = 'https://haba-haba-api.ubua.cloud';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Price rounding helper ─────────────────────────────────────────────────────
// Always rounds UP to the nearest 0.5, with a floor of 0.5
// e.g. 46.06 → ceil(92.12)/2 = 93/2 = 46.5
//      86.4  → ceil(172.8)/2  = 173/2 = 86.5
//      86.7  → ceil(173.4)/2  = 174/2 = 87.0
const roundToHalf = (value: number): number => {
    const ceiled = Math.ceil(value * 2) / 2;
    return Math.max(0.5, ceiled);
};

const formatPromoPrice = (price: number, promoValue: number): string => {
    const raw = price - price * (promoValue / 100);
    return roundToHalf(raw).toFixed(2);
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminProducts() {
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedTab, setSelectedTab] = useState<'categories' | 'products'>('products');
    const [searchQuery, setSearchQuery] = useState('');

    // ── Language ──────────────────────────────────────────────────────────────
    const { language, t, isRTL } = useLanguage();
    const TP = t.products;
    const TC = t.common;

    // ── RTL helpers ───────────────────────────────────────────────────────────
    const rtlRow = isRTL ? { flexDirection: 'row-reverse' as const } : {};
    const rtlMargin = (ltrMarginLeft: number) =>
        isRTL
            ? { marginRight: ltrMarginLeft, marginLeft: 0 }
            : { marginLeft: ltrMarginLeft };

    // ── Filtered lists ────────────────────────────────────────────────────────
    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products;
        const q = searchQuery.toLowerCase();
        return products.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                (p.category_name && p.category_name.toLowerCase().includes(q))
        );
    }, [products, searchQuery]);

    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) return categories;
        const q = searchQuery.toLowerCase();
        return categories.filter((c) => c.name.toLowerCase().includes(q));
    }, [categories, searchQuery]);

    // ── Data loading ──────────────────────────────────────────────────────────

    useEffect(() => {
        loadAdminToken();
    }, []);

    useEffect(() => {
        if (token) fetchData();
    }, [token, selectedTab]);

    // Reset search when tab changes
    useEffect(() => {
        setSearchQuery('');
    }, [selectedTab]);

    const loadAdminToken = async () => {
        try {
            const storedToken = await AsyncStorage.getItem('adminToken');
            if (storedToken) setToken(storedToken);
        } catch (error) {
            console.error('Error loading admin token:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        try {
            if (selectedTab === 'categories') await fetchCategories();
            else await fetchProducts();
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const currentToken = await AsyncStorage.getItem('adminToken');
            if (!currentToken) { Alert.alert(TC.error, TC.sessionExpiredMessage); return; }

            const response = await axios.get(`${API_URL}/categories`, {
                headers: { Authorization: `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
            });
            setCategories(
                Array.isArray(response.data?.categories)
                    ? response.data.categories
                    : Array.isArray(response.data) ? response.data : []
            );
        } catch (error: any) {
            if (error.response?.status === 401) {
                Alert.alert(TC.sessionExpired, TC.sessionExpiredMessage);
                await AsyncStorage.removeItem('adminToken');
            } else {
                Alert.alert(TC.error, TP.failedToggleCategory);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const currentToken = await AsyncStorage.getItem('adminToken');
            if (!currentToken) { Alert.alert(TC.error, TC.sessionExpiredMessage); return; }

            const response = await axios.get(`${API_URL}/products`, {
                headers: { Authorization: `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
            });
            setProducts(
                Array.isArray(response.data?.products)
                    ? response.data.products
                    : Array.isArray(response.data) ? response.data : []
            );
        } catch (error: any) {
            if (error.response?.status === 401) {
                Alert.alert(TC.sessionExpired, TC.sessionExpiredMessage);
                await AsyncStorage.removeItem('adminToken');
            } else {
                Alert.alert(TC.error, TP.failedToggleProduct);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const availabilityToggle = async (productId: number, currentStatus: boolean) => {
        try {
            const currentToken = await AsyncStorage.getItem('adminToken');
            if (!currentToken) { Alert.alert(TC.error, TC.sessionExpiredMessage); return; }

            await axios.put(
                `${API_URL}/${productId}/toggle-availability`,
                { active: !currentStatus },
                { headers: { Authorization: `Bearer ${currentToken}`, 'Content-Type': 'application/json' } }
            );
            setProducts((prev) =>
                prev.map((p) => (p.id === productId ? { ...p, active: !currentStatus } : p))
            );
            Alert.alert(TC.success, `${!currentStatus ? TC.active : TC.inactive}`);
        } catch (error: any) {
            if (error.response?.status === 401) {
                Alert.alert(TC.sessionExpired, TC.sessionExpiredMessage);
                await AsyncStorage.removeItem('adminToken');
            } else {
                Alert.alert(TC.error, TP.failedToggleProduct);
            }
        }
    };

    const categoryToggle = async (categoryId: number, currentStatus: boolean) => {
        try {
            const currentToken = await AsyncStorage.getItem('adminToken');
            if (!currentToken) { Alert.alert(TC.error, TC.sessionExpiredMessage); return; }

            await axios.put(
                `${API_URL}/categories/${categoryId}`,
                { active: !currentStatus },
                { headers: { Authorization: `Bearer ${currentToken}`, 'Content-Type': 'application/json' } }
            );
            setCategories((prev) =>
                prev.map((c) => (c.id === categoryId ? { ...c, active: !currentStatus } : c))
            );
            Alert.alert(TC.success, `${!currentStatus ? TC.active : TC.inactive}`);
        } catch (error: any) {
            Alert.alert(TC.error, TP.failedToggleCategory);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    // ── Render helpers ────────────────────────────────────────────────────────

    const renderCategoryCard = (category: Category) => {
        const imageUrl = getImageUrl(category.image);
        return (
            <View key={category.id} style={styles.categoryCard}>
                {/* Thumb */}
                <View style={styles.categoryThumb}>
                    {imageUrl ? (
                        <Image
                            source={{ uri: imageUrl.replace(/\\/g, '/') }}
                            style={styles.categoryThumbImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.categoryThumbPlaceholder}>
                            <Ionicons name="grid-outline" size={22} color="#94A3B8" />
                        </View>
                    )}
                    {!category.active && (
                        <View style={styles.inactiveOverlay}>
                            <Text style={styles.inactiveOverlayText}>{TC.inactive}</Text>
                        </View>
                    )}
                </View>

                {/* Info */}
                <View style={[styles.categoryBody, rtlRow]}>
                    <View style={{ flex: 1 }}>
                        <View style={[styles.nameRow, rtlRow]}>
                            <View style={[styles.statusDot, category.active ? styles.dotActive : styles.dotInactive]} />
                            <Text style={[styles.categoryName, isRTL && styles.rtlText]} numberOfLines={1}>
                                {category.name}
                            </Text>
                        </View>
                        {category.description ? (
                            <Text style={[styles.categoryDesc, isRTL && styles.rtlText]} numberOfLines={1}>
                                {category.description}
                            </Text>
                        ) : null}
                    </View>

                    <Switch
                        value={Boolean(category.active)}
                        onValueChange={() => categoryToggle(category.id, Boolean(category.active))}
                        trackColor={{ false: '#E2E8F0', true: '#86EFAC' }}
                        thumbColor={category.active ? '#16A34A' : '#CBD5E1'}
                        ios_backgroundColor="#E2E8F0"
                        style={styles.switchScale}
                    />
                </View>
            </View>
        );
    };

    const renderProductCard = (product: Product) => {
        const imageUrl = getImageUrl(product.image);
        const hasPromo = product.promo && product.promoValue && product.promoValue > 0;

        return (
            <View key={product.id} style={styles.productCard}>
                <View style={[styles.productInner, rtlRow]}>
                    {/* Image */}
                    <View style={styles.productThumb}>
                        {imageUrl ? (
                            <Image
                                source={{ uri: imageUrl.replace(/\\/g, '/') }}
                                style={styles.productThumbImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={styles.productThumbPlaceholder}>
                                <Ionicons name="fast-food-outline" size={26} color="#94A3B8" />
                            </View>
                        )}
                        {!product.active && (
                            <View style={styles.inactiveOverlay}>
                                <Text style={styles.inactiveOverlayTextSm}>{TC.inactive}</Text>
                            </View>
                        )}
                        {hasPromo && (
                            <View style={styles.promoPill}>
                                <Text style={styles.promoPillText}>-{product.promoValue}%</Text>
                            </View>
                        )}
                        {product.is_popular && (
                            <View style={styles.popularPill}>
                                <Text style={styles.popularPillText}>⭐</Text>
                            </View>
                        )}
                    </View>

                    {/* Details */}
                    <View style={[styles.productBody, rtlMargin(12)]}>
                        {/* Name */}
                        <Text style={[styles.productName, isRTL && styles.rtlText]} numberOfLines={1}>
                            {product.name}
                        </Text>

                        {/* Category */}
                        <View style={[styles.categoryTagRow, rtlRow]}>
                            <View style={styles.categoryTagChip}>
                                <Text style={styles.categoryTagText} numberOfLines={1}>
                                    {product.category_name || TP.uncategorized}
                                </Text>
                            </View>
                            {product.badge ? (
                                <View style={[styles.badgeChip, rtlMargin(6)]}>
                                    <Text style={styles.badgeChipText}>{product.badge}</Text>
                                </View>
                            ) : null}
                        </View>

                        {/* Price row */}
                        <View style={[styles.priceToggleRow, rtlRow]}>
                            <View style={[styles.priceBlock, rtlRow]}>
                                {hasPromo ? (
                                    <>
                                        <Text style={styles.originalPrice}>
                                            {formatPrice(product.price)}
                                        </Text>
                                        <Text style={[styles.discountedPrice, rtlMargin(6)]}>
                                            {formatPromoPrice(product.price, product.promoValue!)} {TC.currency}
                                        </Text>
                                    </>
                                ) : (
                                    <Text style={styles.regularPrice}>
                                        {formatPrice(product.price)} {TC.currency}
                                    </Text>
                                )}
                            </View>

                            <View style={[styles.toggleBlock, rtlRow]}>
                                <Text style={[
                                    styles.toggleLabel,
                                    product.active ? styles.toggleOn : styles.toggleOff,
                                ]}>
                                    {product.active ? TC.active : TC.off}
                                </Text>
                                <Switch
                                    value={Boolean(product.active)}
                                    onValueChange={() => availabilityToggle(product.id, Boolean(product.active))}
                                    trackColor={{ false: '#E2E8F0', true: '#86EFAC' }}
                                    thumbColor={product.active ? '#16A34A' : '#CBD5E1'}
                                    ios_backgroundColor="#E2E8F0"
                                    style={styles.switchScale}
                                />
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const renderItem = React.useCallback(
        ({ item }: { item: any }) =>
            selectedTab === 'categories' ? renderCategoryCard(item) : renderProductCard(item),
        [selectedTab, isRTL, language]
    );

    // ── Loading screen ─────────────────────────────────────────────────────────

    if (loading && !refreshing) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loadingText}>{TP.loading}</Text>
                </View>
            </View>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────

    const currentData = selectedTab === 'categories' ? filteredCategories : filteredProducts;
    const totalCount = selectedTab === 'categories' ? categories.length : products.length;
    const emptyText = selectedTab === 'categories' ? TP.noCategories : TP.noProducts;

    return (
        <View style={styles.container}>

            {/* ── Tab Bar ── */}
            <View style={[styles.tabBar, rtlRow]}>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'products' && styles.tabActive]}
                    onPress={() => setSelectedTab('products')}
                    activeOpacity={0.75}
                >
                    <Ionicons
                        name="fast-food-outline"
                        size={18}
                        color={selectedTab === 'products' ? '#6366F1' : '#94A3B8'}
                    />
                    <Text style={[styles.tabLabel, selectedTab === 'products' && styles.tabLabelActive]}>
                        {TP.tabProducts}
                        <Text style={styles.tabCount}> ({products.length})</Text>
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'categories' && styles.tabActive]}
                    onPress={() => setSelectedTab('categories')}
                    activeOpacity={0.75}
                >
                    <Ionicons
                        name="grid-outline"
                        size={18}
                        color={selectedTab === 'categories' ? '#6366F1' : '#94A3B8'}
                    />
                    <Text style={[styles.tabLabel, selectedTab === 'categories' && styles.tabLabelActive]}>
                        {TP.tabCategories}
                        <Text style={styles.tabCount}> ({categories.length})</Text>
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ── Search Bar ── */}
            <View style={[styles.searchWrapper, rtlRow]}>
                <Ionicons name="search-outline" size={18} color="#94A3B8" style={isRTL ? styles.searchIconRTL : styles.searchIconLTR} />
                <TextInput
                    style={[styles.searchInput, isRTL && styles.rtlText]}
                    placeholder={
                        selectedTab === 'products'
                            ? (isRTL ? 'ابحث عن منتج...' : 'Search products...')
                            : (isRTL ? 'ابحث عن فئة...' : 'Search categories...')
                    }
                    placeholderTextColor="#CBD5E1"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    textAlign={isRTL ? 'right' : 'left'}
                    returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={isRTL ? styles.clearBtnRTL : styles.clearBtnLTR}>
                        <Ionicons name="close-circle" size={18} color="#CBD5E1" />
                    </TouchableOpacity>
                )}
            </View>

            {/* ── Result count ── */}
            {searchQuery.trim().length > 0 && (
                <View style={[styles.resultCount, rtlRow]}>
                    <Text style={[styles.resultCountText, isRTL && styles.rtlText]}>
                        {currentData.length}
                        {isRTL ? ' من ' : ' of '}
                        {totalCount}
                        {isRTL ? ' نتيجة' : ' results'}
                    </Text>
                </View>
            )}

            {/* ── List ── */}
            <FlashList
                data={currentData}
                renderItem={renderItem}
                keyExtractor={(item) => `${selectedTab}-${item.id}`}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#6366F1"
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons
                            name={selectedTab === 'categories' ? 'grid-outline' : 'fast-food-outline'}
                            size={52}
                            color="#E2E8F0"
                        />
                        <Text style={styles.emptyText}>{emptyText}</Text>
                    </View>
                }
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
        fontSize: 15,
        color: '#94A3B8',
    },

    // ── Tab bar ──────────────────────────────────────────────────────────────
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 6,
        borderBottomWidth: 2.5,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: '#6366F1',
    },
    tabLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#94A3B8',
    },
    tabLabelActive: {
        color: '#6366F1',
        fontWeight: '700',
    },
    tabCount: {
        fontWeight: '400',
        fontSize: 13,
    },

    // ── Search bar ───────────────────────────────────────────────────────────
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 14,
        marginTop: 12,
        marginBottom: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 12,
        height: 44,
    },
    searchIconLTR: {
        marginRight: 8,
    },
    searchIconRTL: {
        marginLeft: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#1E293B',
        paddingVertical: 0,
    },
    clearBtnLTR: {
        marginLeft: 6,
    },
    clearBtnRTL: {
        marginRight: 6,
    },

    // ── Result count ─────────────────────────────────────────────────────────
    resultCount: {
        paddingHorizontal: 16,
        paddingBottom: 4,
    },
    resultCountText: {
        fontSize: 12,
        color: '#94A3B8',
    },

    // ── List ─────────────────────────────────────────────────────────────────
    listContent: {
        padding: 14,
        paddingTop: 10,
    },

    // ── Empty state ───────────────────────────────────────────────────────────
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        color: '#CBD5E1',
    },

    // ── Shared overlay ────────────────────────────────────────────────────────
    inactiveOverlay: {
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    inactiveOverlayText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
    inactiveOverlayTextSm: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: '700',
    },

    // ── Switch ────────────────────────────────────────────────────────────────
    switchScale: {
        transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
    },

    // ── Status dot ───────────────────────────────────────────────────────────
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
        flexShrink: 0,
    },
    dotActive: {
        backgroundColor: '#16A34A',
    },
    dotInactive: {
        backgroundColor: '#EF4444',
    },

    // ── Category card ─────────────────────────────────────────────────────────
    categoryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'stretch',   // children stretch to card height
        overflow: 'hidden',
        shadowColor: '#94A3B8',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
        minHeight: 72,
    },
    categoryThumb: {
        width: 72,
        alignSelf: 'stretch',
        position: 'relative',
        flexShrink: 0,
    },
    categoryThumbImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
    },
    categoryThumbPlaceholder: {
        flex: 1,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryBody: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    categoryName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        flex: 1,
    },
    categoryDesc: {
        fontSize: 12,
        color: '#94A3B8',
        lineHeight: 16,
    },

    // ── Product card ──────────────────────────────────────────────────────────
    productCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        marginBottom: 10,
        overflow: 'hidden',
        shadowColor: '#94A3B8',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    productInner: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    productThumb: {
        width: 90,
        alignSelf: 'stretch',   // fills card height so no white gap
        position: 'relative',
        flexShrink: 0,
    },
    productThumbImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
    },
    productThumbPlaceholder: {
        flex: 1,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    promoPill: {
        position: 'absolute',
        top: 5,
        left: 5,
        backgroundColor: '#EF4444',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 5,
    },
    promoPillText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: '700',
    },
    popularPill: {
        position: 'absolute',
        bottom: 5,
        left: 5,
        backgroundColor: 'rgba(0,0,0,0.35)',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 5,
    },
    popularPillText: {
        fontSize: 10,
    },
    productBody: {
        flex: 1,
        paddingVertical: 12,
        paddingRight: 12,
    },
    productName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 5,
    },
    categoryTagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 8,
        gap: 5,
    },
    categoryTagChip: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        maxWidth: 140,
    },
    categoryTagText: {
        fontSize: 11,
        color: '#6366F1',
        fontWeight: '600',
    },
    badgeChip: {
        backgroundColor: '#F3E8FF',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
    },
    badgeChipText: {
        fontSize: 11,
        color: '#9333EA',
        fontWeight: '600',
    },
    priceToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    priceBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flex: 1,
    },
    originalPrice: {
        fontSize: 11,
        color: '#94A3B8',
        textDecorationLine: 'line-through',
    },
    discountedPrice: {
        fontSize: 15,
        fontWeight: '700',
        color: '#EF4444',
    },
    regularPrice: {
        fontSize: 15,
        fontWeight: '700',
        color: '#16A34A',
    },
    toggleBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    toggleLabel: {
        fontSize: 11,
        fontWeight: '700',
    },
    toggleOn: {
        color: '#16A34A',
    },
    toggleOff: {
        color: '#EF4444',
    },

    // ── RTL text ──────────────────────────────────────────────────────────────
    rtlText: {
        textAlign: 'right',
    },
});