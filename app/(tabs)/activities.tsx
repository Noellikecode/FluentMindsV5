import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Animated, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { Brain, Zap, Pen, Atom } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const activitiesData = [
    {
        id: 'ai-conversations',
        title: 'Neural Sync',
        description: 'interface with adaptive ai consciousness',
        icon: Brain,
        gradient: ['#8B5CF6', '#A855F7'],
        bgGradient: ['#8B5CF630', '#A855F715'],
        route: '/games/dialogue-mode',
    },
    {
        id: 'rhythm-speech',
        title: 'Flow State',
        description: 'harmonize mind through rhythmic expression',
        icon: Zap,
        gradient: ['#6366F1', '#8B5CF6'],
        bgGradient: ['#6366F130', '#8B5CF615'],
        route: '/games/beat-bridge',
    },
    {
        id: 'creative-stories',
        title: 'Reality Forge',
        description: 'architect immersive dimensional narratives',
        icon: Pen,
        gradient: ['#A855F7', '#EC4899'],
        bgGradient: ['#A855F730', '#EC489915'],
        route: '/games/storytelling',
    },
    {
        id: 'mindful-moments',
        title: 'Quantum Breath',
        description: 'practice breathing with specialized awareness',
        icon: Atom,
        gradient: ['#7C3AED', '#6366F1'],
        bgGradient: ['#7C3AED30', '#6366F115'],
        route: '/games/breath-breakers',
    },
];

export default function ActivitiesPage() {
    const headerOpacity = useRef(new Animated.Value(0)).current;
    const headerTranslateY = useRef(new Animated.Value(-10)).current;
    const cardAnimations = useRef(
        activitiesData.map(() => ({
            opacity: new Animated.Value(0),
            translateY: new Animated.Value(15),
        }))
    ).current;

    useEffect(() => {
        // Header animation - subtle fade in
        Animated.timing(headerOpacity, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start();

        Animated.timing(headerTranslateY, {
            toValue: 0,
            duration: 600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start();

        // Subtle staggered card animations
        const cardDelayInterval = 100;
        cardAnimations.forEach((animation, index) => {
            const delay = 200 + (index * cardDelayInterval);

            // Opacity animation
            Animated.timing(animation.opacity, {
                toValue: 1,
                duration: 400,
                delay,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }).start();

            // Subtle slide up animation
            Animated.timing(animation.translateY, {
                toValue: 0,
                duration: 500,
                delay,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start();
        });
    }, []);

    const navigateToActivity = (route: string) => {
        router.push(route);
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0B1426', '#1E293B', '#0F172A']}
                style={styles.backgroundGradient}
            />
            <SafeAreaView style={styles.safeArea}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <Animated.View 
                        style={[
                            styles.header,
                            {
                                opacity: headerOpacity,
                                transform: [{ translateY: headerTranslateY }],
                            }
                        ]}
                    >
                        <LinearGradient
                            colors={['#E8F4FD', '#CBD5E1', '#E8F4FD']}
                            style={styles.titleGradient}
                        >
                            <Text style={styles.title}>WELCOME</Text>
                        </LinearGradient>
                        <Text style={styles.subtitle}>Select neural pathway</Text>
                        <View style={styles.decorativeLine} />
                    </Animated.View>

                    <View style={styles.activitiesContainer}>
                        {activitiesData.map((activity, index) => (
                            <Animated.View
                                key={activity.id}
                                style={[
                                    styles.activityButton,
                                    {
                                        opacity: cardAnimations[index].opacity,
                                        transform: [
                                            { translateY: cardAnimations[index].translateY },
                                        ],
                                    }
                                ]}
                            >
                                <TouchableOpacity
                                    style={styles.touchableCard}
                                    onPress={() => navigateToActivity(activity.route)}
                                    activeOpacity={0.85}
                                >
                                    <BlurView
                                        intensity={80}
                                        tint="dark"
                                        style={styles.glassContainer}
                                    >
                                        <LinearGradient
                                            colors={activity.bgGradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.gradientOverlay}
                                        />
                                        <LinearGradient
                                            colors={activity.gradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 0, y: 1 }}
                                            style={styles.accentBorder}
                                        />
                                        <View style={styles.activityContent}>
                                            <View style={styles.iconContainer}>
                                                <LinearGradient
                                                    colors={activity.gradient}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={styles.iconGradient}
                                                >
                                                    <View style={styles.iconWrapper}>
                                                        <activity.icon
                                                            size={24}
                                                            color="#FFFFFF"
                                                            strokeWidth={1.8}
                                                            fill="rgba(255,255,255,0.2)"
                                                        />
                                                    </View>
                                                </LinearGradient>
                                            </View>
                                            <View style={styles.activityTextContainer}>
                                                <Text style={[styles.activityTitle, {
                                                    textShadowColor: 'rgba(255, 255, 255, 0.3)',
                                                    textShadowOffset: { width: 0, height: 1 },
                                                    textShadowRadius: 2,
                                                }]}>
                                                    {activity.title}
                                                </Text>
                                                <Text style={styles.activityDescription}>
                                                    {activity.description}
                                                </Text>
                                            </View>
                                            <View style={styles.statusContainer}>
                                                <LinearGradient
                                                    colors={activity.gradient}
                                                    style={styles.statusDot}
                                                />
                                            </View>
                                        </View>
                                    </BlurView>
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    backgroundGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    safeArea: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 120,
    },
    header: {
        alignItems: 'center',
        marginTop: 60,
        marginBottom: 56,
    },
    titleGradient: {
        paddingHorizontal: 24,
        paddingVertical: 8,
        borderRadius: 12,
        marginBottom: 20,
    },
    title: {
        fontSize: 36,
        fontWeight: '300',
        color: '#0B1426',
        letterSpacing: 12,
        fontFamily: 'System',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '400',
        color: '#94A3B8',
        textAlign: 'center',
        letterSpacing: 1.5,
        textTransform: 'lowercase',
        fontFamily: 'System',
        marginBottom: 16,
    },
    decorativeLine: {
        width: 60,
        height: 2,
        backgroundColor: '#8B5CF6',
        borderRadius: 1,
        opacity: 0.6,
    },
    activitiesContainer: {
        paddingBottom: 20,
        gap: 18,
    },
    activityButton: {
        height: 100,
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 6,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
    },
    touchableCard: {
        flex: 1,
    },
    glassContainer: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.2)',
        position: 'relative',
    },
    gradientOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.1,
    },
    accentBorder: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        borderRadius: 2,
    },
    activityContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 22,
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 16,
        marginRight: 22,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    iconGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    iconWrapper: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityTextContainer: {
        flex: 1,
        paddingRight: 20,
    },
    activityTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 6,
        letterSpacing: 0.6,
        fontFamily: 'System',
    },
    activityDescription: {
        fontSize: 13,
        fontWeight: '400',
        color: 'rgba(203, 213, 225, 0.85)',
        lineHeight: 18,
        letterSpacing: 0.3,
        textTransform: 'lowercase',
        fontFamily: 'System',
    },
    statusContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        elevation: 3,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
});