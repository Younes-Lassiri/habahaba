import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { memo } from 'react';
import {
    ImageBackground,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Image,
} from 'react-native';

interface CategoryItemProps {
    category: {
        id: number;
        name: string;
        image?: string;
    };
    isSelected: boolean;
    onPress: (categoryName: string) => void;
    itemCount: number;
    index: number;
    userLanguage: 'english' | 'arabic' | 'french';
}

const CategoryItem = memo<CategoryItemProps>(({
    category,
    isSelected,
    onPress,
    itemCount,
    index,
    userLanguage = 'english',
}: CategoryItemProps) => {

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(category.name);
    };

    const getImageUrl = () => {
        if (!category.image) return '';
        return category.image.startsWith('http') || category.image.startsWith('file://')
            ? category.image
            : `https://haba-haba-api.ubua.cloud/${category.image.replace(/\\/g, '/')}`;
    };

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            style={[
                styles.container,
                index === 0 && { marginLeft: 0 }
            ]}
            onPress={handlePress}
        >
            <View style={[
                styles.maskContainer,
            ]}>

                {category.image ? (
                    <ImageBackground
                        source={{ uri: getImageUrl() }}
                        style={styles.image}
                        imageStyle={styles.imageStyle}
                    >
                        <View style={[
                            styles.overlay,
                            isSelected && styles.overlaySelected
                        ]} />
                        
                        {/* Selected overlay image */}
                        {isSelected && (
                            <View style={styles.selectedImageOverlay}>
                                <View style={styles.selectedImageContainer}>
                                <Image
                                    source={require('@/assets/images/selctedCatLogo.png')}
                                    style={styles.selectedImage}
                                    resizeMode="contain"
                                />
                                </View>
                            </View>
                        )}
                    </ImageBackground>
                ) : (
                    <View style={[styles.image, styles.placeholder]}>
                        <Ionicons name="image-outline" size={28} color="#aaa" />
                        
                        {/* Selected overlay image for placeholder */}
                        {isSelected && (
                            <View style={styles.selectedImageOverlay}>
                                <View style={styles.selectedImageContainer}>
                                    <Image
                                    source={require('@/assets/images/selctedCatLogo.png')}
                                    style={styles.selectedImage}
                                    resizeMode="contain"
                                />
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* Category Name */}
                <View style={styles.textWrapper}>
                    <Text
                        numberOfLines={1}
                        style={[
                            styles.title,
                            isSelected && styles.titleSelected
                        ]}
                    >
                        {category.name}
                    </Text>

                    <Text style={styles.count}>
                        {userLanguage === 'arabic'
                            ? `${itemCount} ${itemCount === 1 ? 'منتج' : 'منتجات'}`
                            : `${itemCount} item${itemCount !== 1 ? 's' : ''}`
                        }
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.category.id === nextProps.category.id &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.itemCount === nextProps.itemCount &&
        prevProps.userLanguage === nextProps.userLanguage
    );
});

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },

    maskContainer: {
        width: 160,
        height: 90,
        overflow: 'hidden',
        justifyContent: 'center',
        borderRadius: 16,
        backgroundColor: '#000',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 5,
    },

    maskContainerSelected: {
        borderWidth: 2,
        borderColor: '#C6A15B', // warm gold tone
        shadowOpacity: 0.35,
        elevation: 8,
    },

    image: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        position: 'relative',
    },

    imageStyle: {
        resizeMode: 'cover',
    },

    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },

    overlaySelected: {
        backgroundColor: 'rgba(0,0,0,0.30)',
    },

    placeholder: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f3f3',
    },

    textWrapper: {
        position: 'absolute',
        alignSelf: 'center',
        alignItems: 'center',
        zIndex: 2, // Ensure text stays above the selected overlay
    },

    title: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
    },

    titleSelected: {
        color: '#F5E6C8',
    },

    count: {
        fontSize: 12,
        color: '#E5E5E5',
        marginTop: 2,
    },

    // New styles for selected image overlay
    selectedImageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 3, // Higher z-index to appear above the overlay but below text if needed
    },
    selectedImageContainer:
    {
        backgroundColor: Colors.primaryLight,  
        padding: 3,
        alignItems: 'center',
        borderRadius: 5,
        position: 'absolute',
        top: 5,
        left: 5,
    },
    selectedImage: {
        width: 25,
        height: 25,
    },
});

export default CategoryItem;