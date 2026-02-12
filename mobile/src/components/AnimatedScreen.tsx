import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface AnimatedScreenProps {
    children: React.ReactNode;
    animation?: 'fadeSlide' | 'fade' | 'slideUp' | 'slideRight';
    duration?: number;
}

/**
 * Wraps a screen component to provide smooth enter animations.
 * Uses React Native's built-in Animated API — no extra dependencies needed.
 * 
 * Animations:
 * - fadeSlide (default): fade in + subtle slide from right
 * - fade: simple fade in
 * - slideUp: slide from bottom with fade
 * - slideRight: slide from right
 */
const AnimatedScreen = ({
    children,
    animation = 'fadeSlide',
    duration = 250,
}: AnimatedScreenProps) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateX = useRef(new Animated.Value(animation === 'slideRight' || animation === 'fadeSlide' ? 30 : 0)).current;
    const translateY = useRef(new Animated.Value(animation === 'slideUp' ? 40 : 0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration,
                useNativeDriver: true,
            }),
            Animated.timing(translateX, {
                toValue: 0,
                duration,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity,
                    transform: [
                        { translateX },
                        { translateY },
                    ],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default AnimatedScreen;
