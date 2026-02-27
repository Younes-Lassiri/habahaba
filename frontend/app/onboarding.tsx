import React, { useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Animated,
    TouchableOpacity,
    ImageBackground,
    FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
    useFonts,
    Amiri_400Regular,
    Amiri_700Bold,
} from "@expo-google-fonts/amiri";
import { Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";

const { width, height } = Dimensions.get("window");

interface Slide {
    id: string;
    title: string;
    titleEn: string;
    subtitle: string;
    subtitleEn: string;
    description: string;
    image: any;
    accent: string;
}

const SLIDES: Slide[] = [
    {
        id: "1",
        title: "طبخ الدار، من الدار لدارك",
        titleEn: "Homemade Taste, Delivered Home",
        subtitle: "كيف كانت كتطيب لك ماما",
        subtitleEn: "Just Like Mom Used to Make",
        description:
            "Authentic Moroccan comfort food prepared with love and tradition.",
        image: require("../assets/images/HabaHaba_dakhla0.jpeg"),
        accent: "#C5A065",
    },
    {
        id: "2",
        title: "حبا حبا، معاك ديما",
        titleEn: "Always Generous",
        subtitle: "الكرم المغربي فكل طبق",
        subtitleEn: "Moroccan Hospitality",
        description:
            "Generous portions, rich flavors, and unforgettable warmth.",
        image: require("../assets/images/HabaHaba_dakhla1.jpg"),
        accent: "#8B4513",
    },
    {
        id: "3",
        title: "من قلب المغرب لقلبك",
        titleEn: "From Morocco's Heart to Yours",
        subtitle: "وصفات أصيلة، طعم لا ينسى",
        subtitleEn: "Authentic Recipes",
        description:
            "Pure Moroccan tradition delivered fast and fresh to your door.",
        image: require("../assets/images/HabaHaba_dakhla2.jpg"),
        accent: "#2D1B10",
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    const [fontsLoaded] = useFonts({
        Amiri_400Regular,
        Amiri_700Bold,
        Inter_400Regular,
        Inter_600SemiBold,
    });

    if (!fontsLoaded) return null;

    const handleFinish = async () => {
        await AsyncStorage.setItem("hasCompletedOnboarding", "true");
        router.push("/");
    };

    const handleNext = () => {
        if (currentIndex === SLIDES.length - 1) {
            handleFinish();
        } else {
            slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
        }
    };

    const renderItem = ({ item }: { item: Slide }) => (
        <ImageBackground source={item.image} style={styles.slide}>
            <LinearGradient
                colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.85)"]}
                style={styles.overlay}
            />
            <View style={styles.content}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.titleEn}>{item.titleEn}</Text>
                <View style={[styles.divider, { backgroundColor: item.accent }]} />
                <Text style={styles.subtitle}>{item.subtitle}</Text>
                <Text style={styles.subtitleEn}>{item.subtitleEn}</Text>
                <Text style={styles.description}>{item.description}</Text>
            </View>
        </ImageBackground>
    );

    return (
        <View style={{ flex: 1 }}>
            <StatusBar style="light" />

            <Animated.FlatList
                ref={slidesRef}
                data={SLIDES}
                renderItem={renderItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(
                        e.nativeEvent.contentOffset.x / width
                    );
                    setCurrentIndex(index);
                }}
            />

            {/* Pagination */}
            <View style={[styles.pagination, { bottom: insets.bottom + 120 }]}>
                {SLIDES.map((_, i) => {
                    const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                    const dotWidth = scrollX.interpolate({
                        inputRange,
                        outputRange: [10, 30, 10],
                        extrapolate: "clamp",
                    });

                    return (
                        <Animated.View
                            key={i}
                            style={[
                                styles.dot,
                                {
                                    width: dotWidth,
                                    backgroundColor:
                                        currentIndex === i
                                            ? SLIDES[currentIndex].accent
                                            : "rgba(255,255,255,0.3)",
                                },
                            ]}
                        />
                    );
                })}
            </View>

            {/* Button */}
            <View
                style={[
                    styles.buttonContainer,
                    { paddingBottom: insets.bottom + 20 },
                ]}
            >
                <TouchableOpacity
                    onPress={handleNext}
                    style={[
                        styles.button,
                        { backgroundColor: SLIDES[currentIndex].accent },
                    ]}
                >
                    <Text style={styles.buttonText}>
                        {currentIndex === SLIDES.length - 1
                            ? "يلا نبداو | Let's Start"
                            : "التالي | Next"}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}


const styles = StyleSheet.create({
    slide: {
        width,
        height,
        justifyContent: "flex-end",
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    content: {
        padding: 30,
        paddingBottom: height * 0.25,
        alignItems: "center",
    },
    title: {
        fontFamily: "Amiri_700Bold",
        fontSize: 30,
        color: "#FFF",
        textAlign: "center",
    },
    titleEn: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 16,
        color: "#E5E7EB",
        marginBottom: 10,
    },
    divider: {
        width: 60,
        height: 3,
        borderRadius: 2,
        marginVertical: 12,
    },
    subtitle: {
        fontFamily: "Amiri_400Regular",
        fontSize: 20,
        color: "#FDFBF7",
    },
    subtitleEn: {
        fontFamily: "Inter_400Regular",
        fontSize: 13,
        color: "#D1D5DB",
        marginBottom: 10,
    },
    description: {
        fontFamily: "Inter_400Regular",
        fontSize: 14,
        color: "#F3F4F6",
        textAlign: "center",
        marginTop: 10,
    },
    pagination: {
        position: "absolute",
        flexDirection: "row",
        alignSelf: "center",
    },
    dot: {
        height: 10,
        borderRadius: 5,
        marginHorizontal: 6,
    },
    buttonContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
    },
    button: {
        paddingVertical: 18,
        borderRadius: 25,
        alignItems: "center",
    },
    buttonText: {
        fontFamily: "Amiri_700Bold",
        fontSize: 18,
        color: "#FFF",
    },
});