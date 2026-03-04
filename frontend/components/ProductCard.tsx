import type { Product } from '@/app/redux/slices/homeSlice';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { memo, useEffect, useState, useCallback } from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/app/redux/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import { addItem, updateItemQuantity } from '@/app/redux/slices/orderSlice';

interface ProductCardProps {
    product: Product;
    onPress: (id: number) => void;
    onAddToCart?: (product: Product) => void; // kept for backward compatibility (not used)
    onUpdateQuantity: (id: number, quantity: number) => void;
    onToggleFavorite?: (product: Product, isFavorite: boolean) => void;
    restaurantIsOpen: boolean;
    userLanguage: 'english' | 'arabic' | 'french';
    isFavorite?: boolean; // optional external control
}

const ProductCard = memo<ProductCardProps>(({
    product,
    onPress,
    onAddToCart,
    onUpdateQuantity,
    onToggleFavorite,
    restaurantIsOpen,
    userLanguage = 'english',
    isFavorite: externalIsFavorite,
}) => {
    const dispatch = useDispatch();
    const isRTL = userLanguage === 'arabic';
    
    // Get restaurant name from home slice
    const { restaurant_name } = useSelector((state: RootState) => state.home);
    
    // Cart data
    const cartItems = useSelector((state: RootState) => state.orders.items);
    const cartItem = cartItems.find(item => item.id === product.id);
    const quantityInCart = cartItem?.quantity || 0;

    // Favorite state
    const [internalIsFavorite, setInternalIsFavorite] = useState(false);
    const isFavorite = externalIsFavorite !== undefined ? externalIsFavorite : internalIsFavorite;

    // Price calculation (same as PopularProductCard)
    let displayPrice: number;
    let displayOldPrice: number | undefined;
    let showDiscount: boolean;

    if (product.promo && product.promoValue) {
        const original = product.price || 0;
        const discountAmount = original * (product.promoValue / 100);
        displayPrice = Math.max(original - discountAmount, 0);
        displayOldPrice = original;
        showDiscount = true;
    } else {
        displayPrice = product.final_price || product.price;
        displayOldPrice = product.original_price;
        showDiscount = product.discount_applied ?? false;
    }

    // Favorite check (internal mode only)
    const checkFavoriteStatus = useCallback(async () => {
        try {
            const userData = await AsyncStorage.getItem('client');
            if (!userData) return;
            const user = JSON.parse(userData);
            if (!user?.id) return;

            const response = await axios.get(
                `https://haba-haba-api.ubua.cloud/api/auth/get-favorite?client_id=${user.id}`
            );
            if (response.data?.favorites) {
                const isFav = response.data.favorites.some(
                    (fav: any) => fav.id === product.id
                );
                setInternalIsFavorite(isFav);
            }
        } catch (error) {
            console.error('Error checking favorite:', error);
        }
    }, [product.id]);

    useEffect(() => {
        if (externalIsFavorite === undefined) {
            checkFavoriteStatus();
        }
    }, [externalIsFavorite]);

    useFocusEffect(
        useCallback(() => {
            if (externalIsFavorite === undefined) {
                checkFavoriteStatus();
            }
        }, [externalIsFavorite, checkFavoriteStatus])
    );

    // Add to cart handler (direct Redux dispatch)
    const handleAddToCart = (e: any) => {
        e.stopPropagation();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (!restaurantIsOpen) {
            Alert.alert(
                "Restaurant Closed",
                "We're currently closed. Please check back during operating hours.",
                [{ text: "OK" }]
            );
            return;
        }

        const finalPrice = displayPrice;
        const existingItem = cartItems.find(item => item.id === product.id);

        if (existingItem) {
            dispatch(updateItemQuantity({
                id: product.id,
                quantity: existingItem.quantity + 1
            }));
        } else {
            dispatch(addItem({
                id: product.id,
                name: product.name,
                description: product.description || '',
                price: finalPrice,
                quantity: 1,
                image: product.image || '',
                restaurant: restaurant_name || '',
                discount_applied: showDiscount,
                original_price: displayOldPrice || product.price,
                offer_info: product.offer_info,
                specialInstructions: '',
                showSpecialInstructions: false,
            }));
        }

        Toast.show({
            type: 'success',
            text1: existingItem ? 'Cart updated' : 'Added to cart',
            text2: `${product.name} has been ${existingItem ? 'updated' : 'added'}!`,
            position: 'top',
            visibilityTime: 2000,
        });
    };

    const handleIncreaseQuantity = (e: any) => {
        e.stopPropagation();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onUpdateQuantity) {
            onUpdateQuantity(product.id, quantityInCart + 1);
        }
    };

    const handleDecreaseQuantity = (e: any) => {
        e.stopPropagation();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onUpdateQuantity) {
            if (quantityInCart > 1) {
                onUpdateQuantity(product.id, quantityInCart - 1);
            } else {
                onUpdateQuantity(product.id, 0);
            }
        }
    };

    const handleFavoritePress = (e: any) => {
        e.stopPropagation();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        toggleFavorite();
    };

    const toggleFavorite = async () => {
        try {
            const userData = await AsyncStorage.getItem('client');
            if (!userData) {
                Toast.show({
                    type: 'error',
                    text1: 'Please sign in',
                    text2: 'You need to be logged in to add favorites',
                    visibilityTime: 2000,
                });
                return;
            }
            const user = JSON.parse(userData);
            if (!user?.id) return;

            if (isFavorite) {
                await axios.delete(
                    `https://haba-haba-api.ubua.cloud/api/auth/remove-favorite`,
                    { data: { client_id: user.id, product_id: product.id } }
                );
                if (externalIsFavorite === undefined) {
                    setInternalIsFavorite(false);
                }
                Toast.show({
                    type: 'info',
                    text1: 'Removed from favorites',
                    visibilityTime: 1500,
                });
                onToggleFavorite?.(product, false);
            } else {
                await axios.post(
                    `https://haba-haba-api.ubua.cloud/api/auth/add-favorite`,
                    { client_id: user.id, product_id: product.id }
                );
                if (externalIsFavorite === undefined) {
                    setInternalIsFavorite(true);
                }
                Toast.show({
                    type: 'success',
                    text1: 'Added to favorites',
                    visibilityTime: 1500,
                });
                onToggleFavorite?.(product, true);
            }
        } catch (error: any) {
            console.error('Error toggling favorite:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'Could not update favorite',
                visibilityTime: 2000,
            });
        }
    };

    const getImageUrl = () => {
        if (!product.image) return null;
        if (product.image.startsWith('http') || product.image.startsWith('file://')) {
            return product.image;
        }
        const cleanPath = product.image.replace(/\\/g, '/');
        return `https://haba-haba-api.ubua.cloud/${cleanPath}`;
    };

    const imageUrl = getImageUrl();

    const renderCartButton = () => {
        if (quantityInCart > 0) {
            return (
                <View style={[styles.quantityControl, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TouchableOpacity style={styles.quantityButton} onPress={handleDecreaseQuantity} disabled={!restaurantIsOpen}>
                        <Ionicons name="remove" size={16} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{quantityInCart}</Text>
                    <TouchableOpacity style={styles.quantityButton} onPress={handleIncreaseQuantity} disabled={!restaurantIsOpen}>
                        <Ionicons name="add" size={16} color="#FFF" />
                    </TouchableOpacity>
                </View>
            );
        }
        return (
            <TouchableOpacity 
                style={[styles.addButton, !restaurantIsOpen && styles.disabledButton]} 
                onPress={handleAddToCart}
                disabled={!restaurantIsOpen}
            >
                <Ionicons name={restaurantIsOpen ? "cart-outline" : "lock-closed"} size={18} color="#FFF" />
            </TouchableOpacity>
        );
    };

    return (
        <TouchableOpacity style={styles.card} activeOpacity={0.95} onPress={() => onPress(product.id)}>
            <View style={styles.imageWrapper}>
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
                ) : (
                    <View style={styles.placeholder}>
                        <Ionicons name="fast-food-outline" size={40} color="#ccc" />
                    </View>
                )}
                {product.badge && (
                    <View style={[styles.badgeContainer, isRTL && styles.badgeContainerRTL]}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{product.badge}</Text>
                        </View>
                    </View>
                )}
                <TouchableOpacity 
                    style={[styles.favoriteButton, isRTL && styles.favoriteButtonRTL]}
                    onPress={handleFavoritePress}
                >
                    <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={20} color={isFavorite ? Colors.primary : "#FFF"} />
                </TouchableOpacity>
                <View style={[styles.ratingBadge, isRTL && styles.ratingBadgeRTL]}>
                    <Ionicons name="star" size={12} color="#FFB800" />
                    <Text style={styles.ratingText}>{product.rating || 4.8}</Text>
                </View>
            </View>
            <View style={styles.infoContainer}>
                <View style={[styles.titleRow, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
                    <Text style={[styles.productName, { textAlign: isRTL ? 'left' : 'right' }]}>
                        {product.name}
                    </Text>
                    <Text style={styles.priceText}>
                        {Math.round(displayPrice)} <Text style={styles.currency}>MAD</Text>
                    </Text>
                </View>
                {showDiscount && displayOldPrice && (
                    <Text style={[styles.oldPrice, { textAlign: isRTL ? 'left' : 'right' }]}>
                        {Math.round(displayOldPrice)} MAD
                    </Text>
                )}
                <Text style={[styles.description, { textAlign: isRTL ? 'left' : 'right' }]} numberOfLines={2}>
                    {product.description || 'Delicious food prepared fresh for you.'}
                </Text>
                <View style={[styles.metaRow, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
                    <View style={[styles.deliveryInfo, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
                        <Text style={styles.deliveryText}>{product.delivery || '35-45 min'}</Text>
                        <Ionicons name="bicycle" size={16} color="#999" />
                    </View>
                    {renderCartButton()}
                </View>
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 15,
        overflow: 'hidden',
    },
    imageWrapper: {
        height: 150,
        width: '100%',
        borderRadius: 20,
        backgroundColor: '#F0F0F0',
        position: 'relative',
        overflow: 'hidden',
    },
    productImage: {
        width: '100%',
        borderRadius: 20,
        height: '100%',
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeContainer: {
        position: 'absolute',
        top: 8,
        left: -8,
        zIndex: 20,
        transform: [{ rotate: '-5deg' }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    badgeContainerRTL: {
        left: 'auto',
        right: -8,
        transform: [{ rotate: '5deg' }],
    },
    badge: {
        backgroundColor: Colors.success,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
        position: 'relative',
    },
    badgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    favoriteButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
        padding: 6,
        zIndex: 10,
    },
    favoriteButtonRTL: {
        right: 'auto',
        left: 12,
    },
    ratingBadge: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
        zIndex: 5,
    },
    ratingBadgeRTL: {
        left: 'auto',
        right: 12,
    },
    ratingText: { color: '#333', fontSize: 12, fontWeight: 'bold' },
    infoContainer: {
        paddingTop: 10,
    },
    titleRow: { 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 8 
    },
    productName: { 
        fontSize: 17, 
        fontWeight: '700', 
        color: '#2C3E50', 
        flex: 1,
        textAlign: 'right',
    },
    priceText: { 
        fontSize: 16, 
        fontWeight: '800', 
        color: Colors.primary,
        marginRight: 8,
    },
    currency: { fontSize: 12, fontWeight: '600' },
    oldPrice: {
        fontSize: 12,
        color: '#9CA3AF',
        textDecorationLine: 'line-through',
        marginBottom: 4,
    },
    description: { 
        fontSize: 14, 
        color: '#7F8C8D', 
        lineHeight: 20, 
        marginBottom: 16,
        textAlign: 'right',
    },
    metaRow: { 
        justifyContent: 'space-between', 
        alignItems: 'center',
    },
    deliveryInfo: { 
        alignItems: 'center', 
        gap: 6,
        flexDirection: 'row-reverse',
    },
    deliveryText: { fontSize: 13, color: '#95A5A6' },
    addButton: { 
        backgroundColor: Colors.primary, 
        width: 50, 
        height: 35, 
        borderRadius: 20, 
        justifyContent: 'center', 
        alignItems: 'center',
    },
    disabledButton: { backgroundColor: '#BDC3C7' },
    quantityControl: {
        backgroundColor: Colors.primary,
        borderRadius: 20,
        overflow: 'hidden',
        alignItems: 'center',
    },
    quantityButton: {
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.primary,
    },
    quantityText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14,
        minWidth: 24,
        textAlign: 'center',
        paddingHorizontal: 4,
    },
});

export default ProductCard;