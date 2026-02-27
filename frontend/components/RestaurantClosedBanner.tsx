import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRestaurantStatus } from '../contexts/RestaurantStatusContext';

interface RestaurantClosedBannerProps {
    compact?: boolean;
    showHoursButton?: boolean;
    userLanguage: string;
}

export const RestaurantClosedBanner: React.FC<RestaurantClosedBannerProps> = ({ 
    compact = false,
    showHoursButton = true,
    userLanguage,
}) => {
    const { 
        isOpen, 
        loading, 
        todaySchedule, 
        nextOpen, 
        formatTime,
        getStatusMessage,
        operatingHours 
    } = useRestaurantStatus();
    
    const [showHoursModal, setShowHoursModal] = React.useState(false);

    if (loading || isOpen) return null;

    const getArabicDayName = (dayName: string): string => {
        const dayMap: { [key: string]: string } = {
            'Monday': 'الاثنين',
            'Tuesday': 'الثلاثاء',
            'Wednesday': 'الأربعاء',
            'Thursday': 'الخميس',
            'Friday': 'الجمعة',
            'Saturday': 'السبت',
            'Sunday': 'الأحد',
        };
        return dayMap[dayName] || dayName;
    };

    if (compact) {
        return (
            <View style={[
                styles.compactBanner,
                userLanguage === 'arabic' && styles.compactBannerAr
            ]}>
                <Ionicons name="time-outline" size={16} color="#DC2626" />
                <Text style={[
                    styles.compactText,
                    userLanguage === 'arabic' && styles.textRight
                ]}>
                    {userLanguage === 'arabic' ? getStatusMessage() : getStatusMessage()}
                </Text>
            </View>
        );
    }

    return (
        <>
            <View style={styles.banner}>
                <View style={[
                    styles.bannerContent,
                    userLanguage === 'arabic' && styles.bannerContentAr
                ]}>
                    <View style={[
                        styles.iconContainer,
                        userLanguage === 'arabic' && styles.iconContainerAr
                    ]}>
                        <Ionicons name="moon-outline" size={32} color="#FFFFFF" />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={[
                            styles.closedTitle,
                            userLanguage === 'arabic' && styles.textRight
                        ]}>
                            {userLanguage === 'arabic' ? 'المطعم مغلق حاليًا' : "We're Currently Closed"}
                        </Text>
                        <Text style={[
                            styles.closedSubtitle,
                            userLanguage === 'arabic' && styles.textRight
                        ]}>
                            {nextOpen ? (
                                nextOpen.is_today 
                                    ? userLanguage === 'arabic' 
                                        ? `نفتح اليوم في الساعة ${formatTime(nextOpen.time)}`
                                        : `We open today at ${formatTime(nextOpen.time)}`
                                    : userLanguage === 'arabic'
                                        ? `نفتح يوم ${getArabicDayName(nextOpen.day_name)} في الساعة ${formatTime(nextOpen.time)}`
                                        : `We open ${nextOpen.day_name} at ${formatTime(nextOpen.time)}`
                            ) : (
                                userLanguage === 'arabic' ? 'تحقق من ساعات العمل أدناه' : 'Check our operating hours below'
                            )}
                        </Text>
                        {todaySchedule && !todaySchedule.is_closed && (
                            <Text style={[
                                styles.todayHours,
                                userLanguage === 'arabic' && styles.textRight
                            ]}>
                                {userLanguage === 'arabic' 
                                    ? `ساعات العمل اليوم: ${formatTime(todaySchedule.close_time)} - ${formatTime(todaySchedule.open_time)}`
                                    : `Today's hours: ${formatTime(todaySchedule.open_time)} - ${formatTime(todaySchedule.close_time)}`
                                }
                            </Text>
                        )}
                        {todaySchedule?.is_closed && (
                            <Text style={[
                                styles.todayHours,
                                userLanguage === 'arabic' && styles.textRight
                            ]}>
                                {userLanguage === 'arabic' ? 'نحن مغلقون اليوم' : "We're closed today"}
                            </Text>
                        )}
                    </View>
                </View>
                
                {showHoursButton && (
                    <TouchableOpacity 
                        style={styles.hoursButton}
                        onPress={() => setShowHoursModal(true)}
                    >
                        <Ionicons name="calendar-outline" size={18} color="#6366F1" />
                        <Text style={styles.hoursButtonText}>
                            {userLanguage === 'arabic' ? 'عرض جميع الساعات' : 'View All Hours'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Operating Hours Modal */}
            <Modal
                visible={showHoursModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowHoursModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={[
                            styles.modalHeader,
                            userLanguage === 'arabic' && styles.modalHeaderAr
                        ]}>
                            <Text style={[
                                styles.modalTitle,
                                userLanguage === 'arabic' && styles.textRight
                            ]}>
                                {userLanguage === 'arabic' ? 'ساعات العمل' : 'Operating Hours'}
                            </Text>
                            <TouchableOpacity 
                                onPress={() => setShowHoursModal(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.hoursList}>
                            {operatingHours.map((hour, index) => (
                                <View 
                                    key={hour.day_of_week} 
                                    style={[
                                        styles.hoursRow,
                                        userLanguage === 'arabic' && styles.hoursRowAr,
                                        index === new Date().getDay() && styles.hoursRowToday
                                    ]}
                                >
                                    <View style={[
                                        styles.dayContainer,
                                        userLanguage === 'arabic' && styles.dayContainerAr
                                    ]}>
                                        <Text style={[
                                            styles.dayName,
                                            userLanguage === 'arabic' && styles.textRight,
                                            index === new Date().getDay() && styles.dayNameToday
                                        ]}>
                                            {userLanguage === 'arabic' ? getArabicDayName(hour.day_name) : hour.day_name}
                                        </Text>
                                        {index === new Date().getDay() && (
                                            <View style={styles.todayBadge}>
                                                <Text style={styles.todayBadgeText}>
                                                    {userLanguage === 'arabic' ? 'اليوم' : 'Today'}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={[
                                        styles.hoursText,
                                        userLanguage === 'arabic' && styles.textRight,
                                        hour.is_closed && styles.closedText
                                    ]}>
                                        {hour.is_closed 
                                            ? (userLanguage === 'arabic' ? 'مغلق' : 'Closed')
                                            : `${formatTime(hour.open_time)} - ${formatTime(hour.close_time)}`
                                        }
                                    </Text>
                                </View>
                            ))}
                        </ScrollView>
                        
                        <TouchableOpacity 
                            style={styles.modalCloseButton}
                            onPress={() => setShowHoursModal(false)}
                        >
                            <Text style={styles.modalCloseButtonText}>
                                {userLanguage === 'arabic' ? 'إغلاق' : 'Close'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
};

// Status indicator for header
export const RestaurantStatusIndicator: React.FC<{ userLanguage: string }> = ({ userLanguage }) => {
    const { isOpen, loading, getStatusMessage, formatTime, todaySchedule } = useRestaurantStatus();

    if (loading) {
        return (
            <View style={styles.statusIndicator}>
                <View style={[styles.statusDot, styles.statusDotLoading]} />
                <Text style={styles.statusText}>...</Text>
            </View>
        );
    }

    return (
        <View style={styles.statusIndicator}>
            <View style={[
                styles.statusDot, 
                isOpen ? styles.statusDotOpen : styles.statusDotClosed
            ]} />
            <Text style={[
                styles.statusText,
                userLanguage === 'arabic' && styles.textRight,
                isOpen ? styles.statusTextOpen : styles.statusTextClosed
            ]}>
                {isOpen 
                    ? (todaySchedule 
                        ? userLanguage === 'arabic' 
                            ? `مفتوح · يغلق في ${formatTime(todaySchedule.close_time)}`
                            : `Open · Closes ${formatTime(todaySchedule.close_time)}`
                        : userLanguage === 'arabic' ? 'مفتوح' : 'Open'
                      )
                    : getStatusMessage()
                }
            </Text>
        </View>
    );
};

// Full screen overlay for when restaurant is closed
export const RestaurantClosedOverlay: React.FC<{ 
    visible: boolean;
    onViewMenu?: () => void;
    userLanguage: string;
}> = ({ visible, onViewMenu, userLanguage }) => {
    const { 
        restaurantName,
        nextOpen, 
        formatTime, 
        operatingHours,
        todaySchedule 
    } = useRestaurantStatus();
    
    const [showHours, setShowHours] = React.useState(false);

    const getArabicDayName = (dayName: string): string => {
        const dayMap: { [key: string]: string } = {
            'Monday': 'الاثنين',
            'Tuesday': 'الثلاثاء',
            'Wednesday': 'الأربعاء',
            'Thursday': 'الخميس',
            'Friday': 'الجمعة',
            'Saturday': 'السبت',
            'Sunday': 'الأحد',
        };
        return dayMap[dayName] || dayName;
    };

    if (!visible) return null;

    return (
        <View style={styles.overlay}>
            <View style={styles.overlayContent}>
                <View style={styles.overlayIconContainer}>
                    <Ionicons name="moon" size={64} color="#6366F1" />
                </View>
                
                <Text style={[
                    styles.overlayTitle,
                    userLanguage === 'arabic' && styles.textRight
                ]}>
                    {userLanguage === 'arabic' ? 'نحن مغلقون' : "We're Closed"}
                </Text>
                <Text style={[
                    styles.overlayRestaurantName,
                    userLanguage === 'arabic' && styles.textRight
                ]}>
                    {restaurantName}
                </Text>
                
                <Text style={[
                    styles.overlayMessage,
                    userLanguage === 'arabic' && styles.textRight
                ]}>
                    {nextOpen ? (
                        nextOpen.is_today 
                            ? userLanguage === 'arabic'
                                ? `سنعود اليوم في الساعة ${formatTime(nextOpen.time)}`
                                : `We'll be back today at ${formatTime(nextOpen.time)}`
                            : userLanguage === 'arabic'
                                ? `سنعود يوم ${getArabicDayName(nextOpen.day_name)} في الساعة ${formatTime(nextOpen.time)}`
                                : `We'll be back ${nextOpen.day_name} at ${formatTime(nextOpen.time)}`
                    ) : (
                        userLanguage === 'arabic' ? 'يرجى التحقق من ساعات عملنا' : 'Please check our operating hours'
                    )}
                </Text>

                {todaySchedule && !todaySchedule.is_closed && (
                    <View style={[
                        styles.overlayTodayHours,
                        userLanguage === 'arabic' && styles.overlayTodayHoursAr
                    ]}>
                        <Ionicons name="time-outline" size={18} color="#64748B" />
                        <Text style={[
                            styles.overlayTodayHoursText,
                            userLanguage === 'arabic' && styles.textRight
                        ]}>
                            {userLanguage === 'arabic' 
                                ? `اليوم: ${formatTime(todaySchedule.open_time)} - ${formatTime(todaySchedule.close_time)}`
                                : `Today: ${formatTime(todaySchedule.open_time)} - ${formatTime(todaySchedule.close_time)}`
                            }
                        </Text>
                    </View>
                )}

                <TouchableOpacity 
                    style={styles.overlayHoursButton}
                    onPress={() => setShowHours(!showHours)}
                >
                    <Ionicons 
                        name={showHours ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color="#6366F1" 
                    />
                    <Text style={styles.overlayHoursButtonText}>
                        {showHours 
                            ? (userLanguage === 'arabic' ? 'إخفاء الساعات' : 'Hide Hours')
                            : (userLanguage === 'arabic' ? 'عرض جميع الساعات' : 'View All Hours')
                        }
                    </Text>
                </TouchableOpacity>

                {showHours && (
                    <View style={styles.overlayHoursList}>
                        {operatingHours.map((hour, index) => (
                            <View 
                                key={hour.day_of_week} 
                                style={[
                                    styles.overlayHoursRow,
                                    userLanguage === 'arabic' && styles.overlayHoursRowAr,
                                    index === new Date().getDay() && styles.overlayHoursRowToday
                                ]}
                            >
                                <Text style={[
                                    styles.overlayDayName,
                                    userLanguage === 'arabic' && styles.textRight
                                ]}>
                                    {userLanguage === 'arabic' ? getArabicDayName(hour.day_name) : hour.day_name}
                                </Text>
                                <Text style={[
                                    styles.overlayHoursText,
                                    userLanguage === 'arabic' && styles.textRight,
                                    hour.is_closed && styles.overlayClosedText
                                ]}>
                                    {hour.is_closed 
                                        ? (userLanguage === 'arabic' ? 'مغلق' : 'Closed')
                                        : `${formatTime(hour.open_time)} - ${formatTime(hour.close_time)}`
                                    }
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {onViewMenu && (
                    <TouchableOpacity 
                        style={styles.overlayMenuButton}
                        onPress={onViewMenu}
                    >
                        <Text style={styles.overlayMenuButtonText}>
                            {userLanguage === 'arabic' ? 'تصفح القائمة' : 'Browse Menu'}
                        </Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    // Text alignment styles
    textRight: {
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    textLeft: {
        textAlign: 'left',
        writingDirection: 'ltr',
    },
    
    // Compact Banner
    compactBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    compactBannerAr: {
        flexDirection: 'row-reverse',
    },
    compactText: {
        fontSize: 13,
        color: '#DC2626',
        fontWeight: '500',
    },

    // Full Banner
    banner: {
        backgroundColor: '#1E293B',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 16,
        marginVertical: 12,
    },
    bannerContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    bannerContentAr: {
        flexDirection: 'row-reverse',
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    iconContainerAr: {
        marginRight: 0,
        marginLeft: 16,
    },
    textContainer: {
        flex: 1,
    },
    closedTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    closedSubtitle: {
        fontSize: 14,
        color: '#94A3B8',
        marginBottom: 8,
    },
    todayHours: {
        fontSize: 13,
        color: '#6366F1',
        fontWeight: '500',
    },
    hoursButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        borderRadius: 10,
        marginTop: 16,
        gap: 8,
    },
    hoursButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366F1',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        paddingBottom: 34,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    modalHeaderAr: {
        flexDirection: 'row-reverse',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
    },
    closeButton: {
        padding: 4,
    },
    hoursList: {
        paddingHorizontal: 20,
    },
    hoursRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    hoursRowAr: {
        flexDirection: 'row-reverse',
    },
    hoursRowToday: {
        backgroundColor: '#EEF2FF',
        marginHorizontal: -20,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    dayContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dayContainerAr: {
        flexDirection: 'row-reverse',
    },
    dayName: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1E293B',
    },
    dayNameToday: {
        fontWeight: '700',
        color: '#6366F1',
    },
    todayBadge: {
        backgroundColor: '#6366F1',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    todayBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    hoursText: {
        fontSize: 14,
        color: '#64748B',
    },
    closedText: {
        color: '#EF4444',
        fontWeight: '500',
    },
    modalCloseButton: {
        backgroundColor: '#6366F1',
        marginHorizontal: 20,
        marginTop: 20,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalCloseButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },

    // Status Indicator
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusDotOpen: {
        backgroundColor: '#10B981',
    },
    statusDotClosed: {
        backgroundColor: '#EF4444',
    },
    statusDotLoading: {
        backgroundColor: '#94A3B8',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    statusTextOpen: {
        color: '#10B981',
    },
    statusTextClosed: {
        color: '#EF4444',
    },

    // Overlay
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        zIndex: 1000,
    },
    overlayContent: {
        alignItems: 'center',
        width: '100%',
        maxWidth: 340,
    },
    overlayIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    overlayTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 8,
    },
    overlayRestaurantName: {
        fontSize: 16,
        color: '#64748B',
        marginBottom: 16,
    },
    overlayMessage: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 16,
    },
    overlayTodayHours: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        marginBottom: 16,
    },
    overlayTodayHoursAr: {
        flexDirection: 'row-reverse',
    },
    overlayTodayHoursText: {
        fontSize: 14,
        color: '#64748B',
    },
    overlayHoursButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 12,
    },
    overlayHoursButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366F1',
    },
    overlayHoursList: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
        marginBottom: 20,
    },
    overlayHoursRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    overlayHoursRowAr: {
        flexDirection: 'row-reverse',
    },
    overlayHoursRowToday: {
        backgroundColor: '#EEF2FF',
        marginHorizontal: -8,
        paddingHorizontal: 8,
        borderRadius: 6,
    },
    overlayDayName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1E293B',
    },
    overlayHoursText: {
        fontSize: 14,
        color: '#64748B',
    },
    overlayClosedText: {
        color: '#EF4444',
    },
    overlayMenuButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6366F1',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        gap: 8,
        width: '100%',
    },
    overlayMenuButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default RestaurantClosedBanner;