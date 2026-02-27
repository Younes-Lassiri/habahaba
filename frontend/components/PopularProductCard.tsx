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
} from 'react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/redux/store';

interface PopularProductCardProps {
    product: Product;
    onPress: (id: number) => void;
    onAddToCart: (product: Product) => void;
    onUpdateQuantity?: (id: number, quantity: number) => void;
    restaurantIsOpen: boolean;
    userLanguage: 'english' | 'arabic' | 'french';
}

const PopularProductCard = memo<PopularProductCardProps>(({
    product,
    onPress,
    onAddToCart,
    onUpdateQuantity,
    restaurantIsOpen,
    userLanguage = 'english',
}) => {
    // All titles are Arabic -> Force RTL behavior for text and layout
    const isRTL = true;
    
    // Check if product is in cart and get its quantity
    const cartItem = useSelector((state: RootState) => 
        state.orders.items.find(item => item.id === product.id)
    );
    const quantityInCart = cartItem?.quantity || 0;

    const handleAddToCart = (e: any) => {
        e.stopPropagation();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onAddToCart(product);
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
            {/* Left Side: Content Area */}
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
                    {/* Cart Button on the Left */}
                    {renderCartButton()}

                    {/* Price on the Right */}
                    <View style={styles.priceContainer}>
                        <Text style={styles.price}>
                            {Math.round(product.final_price || product.price)} <Text style={styles.currency}>MAD</Text>
                        </Text>
                        {product.discount_applied && (
                            <Text style={styles.oldPrice}>{Math.round(product?.original_price ?? 0)} MAD</Text>
                        )}
                    </View>
                </View>
            </View>

            {/* Right Side: Image Section */}
            <View style={styles.imageSection}>
                {product.image ? (
                    <Image source={{ uri: product.image.startsWith('http') ? product.image : getImageUrl() }} style={styles.image} />
                ) : (
                    <View style={styles.placeholder}>
                        <Ionicons name="restaurant" size={30} color="#E5E7EB" />
                    </View>
                )}
                
                {/* Rating Badge at Bottom Left of the image */}
                <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={10} color="#FFB800" />
                    <Text style={styles.ratingText}>{product.rating || 4.9}</Text>
                </View>

                {/* Popular Badge at Top Right of the image */}
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
        width: 40, // Slightly larger since there's no text
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
        alignItems: 'flex-end', // Changed from flex-start to flex-end for right alignment
    },
    price: {
        fontSize: 20,
        fontWeight: '900',
        color: '#93522B',
        textAlign: 'right', // Added for right alignment
    },
    currency: {
        fontSize: 12,
    },
    oldPrice: {
        fontSize: 11,
        color: '#9CA3AF',
        textDecorationLine: 'line-through',
        textAlign: 'right', // Changed from left to right
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
        flexDirection: 'row', // Changed from row-reverse to row
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