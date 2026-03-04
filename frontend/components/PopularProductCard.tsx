import type { Product } from '@/app/redux/slices/homeSlice';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo } from 'react';
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
import { addItem, updateItemQuantity } from '@/app/redux/slices/orderSlice';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';

interface PopularProductCardProps {
    product: Product;
    onPress: (id: number) => void;
    onAddToCart?: (product: Product) => void; // kept for backward compatibility (optional)
    onUpdateQuantity?: (id: number, quantity: number) => void;
    restaurantIsOpen: boolean;
    userLanguage?: 'english' | 'arabic' | 'french';
}

const PopularProductCard = memo<PopularProductCardProps>(({
    product,
    onPress,
    onAddToCart,
    onUpdateQuantity,
    restaurantIsOpen,
    userLanguage = 'english',
}) => {
    const dispatch = useDispatch();
    const cartItems = useSelector((state: RootState) => state.orders.items);
    const cartItem = cartItems.find(item => item.id === product.id);
    const quantityInCart = cartItem?.quantity || 0;

    // Get restaurant name from home slice
    const { restaurant_name } = useSelector((state: RootState) => state.home);

    // Price calculation
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

    const handleAddToCart = (e: any) => {
        e.stopPropagation();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
                restaurant: restaurant_name || '', // use from Redux
                discount_applied: showDiscount,
                original_price: displayOldPrice,
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

    const getImageUrl = () => {
        if (!product.image) return undefined;
        return `https://haba-haba-api.ubua.cloud/${product.image.replace(/\\/g, '/')}`;
    };

    const renderCartButton = () => {
        if (quantityInCart > 0) {
            return (
                <View style={[styles.quantityControl, { flexDirection: 'row' }]}>
                    <TouchableOpacity 
                        style={styles.quantityButton}
                        onPress={handleDecreaseQuantity}
                        disabled={!restaurantIsOpen}
                    >
                        <Ionicons name="remove" size={16} color="#FFF" />
                    </TouchableOpacity>
                    
                    <Text style={styles.quantityText}>{quantityInCart}</Text>
                    
                    <TouchableOpacity 
                        style={styles.quantityButton}
                        onPress={handleIncreaseQuantity}
                        disabled={!restaurantIsOpen}
                    >
                        <Ionicons name="add" size={16} color="#FFF" />
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <TouchableOpacity 
                onPress={handleAddToCart}
                disabled={!restaurantIsOpen}
            >
                <LinearGradient
                    colors={restaurantIsOpen ? ['#93522B', '#7A4324'] : ['#D1D5DB', '#9CA3AF']}
                    style={styles.addBtn}
                >
                    <Ionicons name={restaurantIsOpen ? "cart" : "lock-closed"} size={22} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    return (
        <TouchableOpacity
            style={styles.container}
            activeOpacity={0.9}
            onPress={() => onPress(product.id)}
        >
            <View style={styles.contentArea}>
                <View>
                    <Text style={styles.title} numberOfLines={1}>
                        {product.name}
                    </Text>
                    <Text style={styles.desc} numberOfLines={2}>
                        {product.description || 'وصف المنتج اللذيذ المحضر بعناية فائقة'}
                    </Text>
                </View>

                <View style={styles.footer}>
                    {renderCartButton()}
                    <View style={styles.priceContainer}>
                        <Text style={styles.price}>
                            {Math.round(displayPrice)} <Text style={styles.currency}>MAD</Text>
                        </Text>
                        {showDiscount && displayOldPrice && (
                            <Text style={styles.oldPrice}>{Math.round(displayOldPrice)} MAD</Text>
                        )}
                    </View>
                </View>
            </View>

            <View style={styles.imageSection}>
                {product.image ? (
                    <Image source={{ uri: product.image.startsWith('http') ? product.image : getImageUrl() }} style={styles.image} />
                ) : (
                    <View style={styles.placeholder}>
                        <Ionicons name="restaurant" size={30} color="#E5E7EB" />
                    </View>
                )}
                
                <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={10} color="#FFB800" />
                    <Text style={styles.ratingText}>{product.rating || 4.9}</Text>
                </View>

                <View style={styles.popularBadge}>
                    <Image 
                        source={require('@/assets/images/habahabaIcon.png')} 
                        style={styles.popularIcon}
                        resizeMode="contain"
                    />
                </View>
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        marginBottom: 20,
        height: 150,
        flexDirection: 'row',
        padding: 15,
    },
    imageSection: {
        width: 140,
        height: '100%',
        borderRadius: 16,
        position: 'relative',
        backgroundColor: '#F9FAFB',
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    ratingBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
        zIndex: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    ratingText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    popularBadge: {
        position: 'absolute',
        top: 0,
        backgroundColor: Colors.primary,
        right: 0,
        padding: 2,
        zIndex: 5,
        borderBottomLeftRadius: 5,
    },
    popularIcon: {
        width: 40,
        height: 40,
    },
    contentArea: {
        flex: 1,
        justifyContent: 'space-between',
        paddingRight: 12,
        paddingVertical: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1F2937',
        textAlign: 'right',
        marginBottom: 6,
    },
    desc: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
        textAlign: 'right',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    price: {
        fontSize: 20,
        fontWeight: '900',
        color: '#93522B',
        textAlign: 'right',
    },
    currency: {
        fontSize: 12,
    },
    oldPrice: {
        fontSize: 11,
        color: '#9CA3AF',
        textDecorationLine: 'line-through',
        textAlign: 'right',
    },
    addBtn: {
        width: 50, 
        height: 35, 
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quantityControl: {
        backgroundColor: '#93522B',
        borderRadius: 20,
        overflow: 'hidden',
        alignItems: 'center',
        flexDirection: 'row',
    },
    quantityButton: {
        width: 35,
        height: 35,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#93522B',
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

export default PopularProductCard;