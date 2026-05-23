import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');
const RAY_COUNT = 5;

function makeRay(index) {
  return {
    x: 30 + Math.random() * (SW - 60),
    width: 6 + Math.random() * 18,
    angle: -0.25 + Math.random() * 0.5,
    length: SH * 0.55 + Math.random() * SH * 0.25,
    alpha: 0.008 + Math.random() * 0.018, // very faint — just a glow, no shape
    speed: 5000 + Math.random() * 5000,
    initialDelay: index * 600 + Math.random() * 1200,
  };
}

function Ray({ config, rayColor }) {
  const translateY = useRef(new Animated.Value(-config.length - 40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = () => {
      translateY.setValue(-config.length - 40);
      opacity.setValue(0);

      Animated.sequence([
        Animated.delay(config.initialDelay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: SH + 40,
            duration: config.speed,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: config.alpha * 12,
              duration: config.speed * 0.25,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: config.speed * 0.75,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start(() => loop());
    };

    loop();
    return () => {
      translateY.stopAnimation();
      opacity.stopAnimation();
    };
  }, []);

  return (
    <Animated.View
      style={[
        styles.ray,
        {
          left: config.x - config.width / 2,
          width: config.width,
          height: config.length,
          transform: [{ translateY }, { rotate: `${config.angle}rad` }],
          opacity,
          backgroundColor: rayColor || 'rgba(200,220,255,0.1)',
        },
      ]}
    />
  );
}

export default function LightRays({ rayColor }) {
  const rays = useRef(
    Array.from({ length: RAY_COUNT }, (_, i) => makeRay(i))
  ).current;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {rays.map((r, i) => (
        <Ray key={i} config={r} rayColor={rayColor} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  ray: {
    position: 'absolute',
    top: 0,
    borderRadius: 50,
  },
});
