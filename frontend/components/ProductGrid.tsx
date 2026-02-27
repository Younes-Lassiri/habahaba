import type { Product } from '@/app/redux/slices/homeSlice';
import { FlashList } from '@shopify/flash-list';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import ProductCard from './ProductCard';
import Colors from '@/constants/Colors';

interface ProductGridProps {
    products: Product[];
    onProductPress: (id: number) => void;
    onAddToCart: (product: Product) => void;
    onUpdateQuantity: (id: number, quantity: number) => void;
    onToggleFavorite?: (product: Product, isFavorite: boolean) => void; // Updated signature
    restaurantIsOpen: boolean;
    userLanguage: 'english' | 'arabic' | 'french';
    favoritesMap?: Record<number, boolean>; // New prop for external favorite state
}

const ProductGrid = memo<ProductGridProps>(({
    products,
    onProductPress,
    onAddToCart,
    onUpdateQuantity,
    onToggleFavorite,
    restaurantIsOpen,
    userLanguage = 'english',
    favoritesMap, // Accept the map
}) => {
    
    const renderItem = ({ item, index }: { item: Product; index: number }) => (
        <View style={[
            styles.itemWrapper,
            index % 2 === 0 ? styles.itemLeft : styles.itemRight
        ]}>
            <ProductCard
                product={item}
                onPress={onProductPress}
                onAddToCart={onAddToCart}
                onUpdateQuantity={onUpdateQuantity}
                onToggleFavorite={onToggleFavorite} // Pass the callback (matches new signature)
                restaurantIsOpen={restaurantIsOpen}
                userLanguage={userLanguage}
                isFavorite={favoritesMap?.[item.id]} // Pass external favorite state
            />
        </View>
    );

    return (
        <View style={styles.container}>
            <FlashList
                data={products}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.primaryLight,
    },
    contentContainer: {
        paddingTop: 8,
        paddingBottom: 40,
    },
    itemWrapper: {
        flex: 1,
        marginBottom: 12,
    },
    itemLeft: {
        paddingRight: 6,
    },
    itemRight: {
        paddingLeft: 6,
    },
});

export default ProductGrid;