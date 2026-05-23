import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';
import Svg, { Circle, Path, Line } from 'react-native-svg';

const START_ANGLE = 135;
const END_ANGLE = 405;
const TOTAL_SWEEP = 270;

function polarToXY(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startDeg, endDeg) {
  const start = polarToXY(cx, cy, r, startDeg);
  const end = polarToXY(cx, cy, r, endDeg);
  const largeArc = (endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export default function VolumeKnob({ volume, accentColor, onVolumeChange, size = 80 }) {
  const cx = size / 2;
  const cy = size / 2 - 4;
  const outerR = size * 0.34;
  const innerR = size * 0.25;
  const dotR = size * 0.165;

  const lastY = useRef(null);
  const accum = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        lastY.current = e.nativeEvent.pageY;
        accum.current = 0;
      },
      onPanResponderMove: (e) => {
        if (lastY.current === null) return;
        const dy = lastY.current - e.nativeEvent.pageY;
        lastY.current = e.nativeEvent.pageY;
        // Accumulate small movements for smoother feel
        accum.current += dy;
        const delta = dy / 200;
        if (Math.abs(delta) > 0.001) {
          onVolumeChange(delta);
        }
      },
      onPanResponderRelease: () => {
        lastY.current = null;
        accum.current = 0;
      },
      onPanResponderTerminate: () => {
        lastY.current = null;
        accum.current = 0;
      },
    })
  ).current;

  const safeVolume = Math.max(0, Math.min(1, volume));
  const filledEnd = START_ANGLE + TOTAL_SWEEP * safeVolume;
  const indicatorAngle = START_ANGLE + TOTAL_SWEEP * safeVolume;
  const indicator = polarToXY(cx, cy, dotR - 3, indicatorAngle);
  const indicatorInner = polarToXY(cx, cy, 4, indicatorAngle);
  const hex = accentColor || '#90CAF9';
  const pct = Math.round(safeVolume * 100);

  return (
    <View style={styles.wrap} {...panResponder.panHandlers}>
      <Svg width={size} height={size + 14}>
        {/* Track arc bg */}
        <Path
          d={describeArc(cx, cy, outerR, START_ANGLE, END_ANGLE)}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={3.5}
          strokeLinecap="round"
          fill="none"
        />
        {/* Filled arc */}
        {safeVolume > 0.01 && (
          <Path
            d={describeArc(cx, cy, outerR, START_ANGLE, filledEnd)}
            stroke={hex}
            strokeWidth={3.5}
            strokeLinecap="round"
            fill="none"
          />
        )}
        {/* Knob ring */}
        <Circle cx={cx} cy={cy} r={innerR} fill={hex} opacity={0.9} />
        {/* Knob body */}
        <Circle cx={cx} cy={cy} r={dotR} fill="rgba(20,30,50,0.9)" />
        {/* Indicator line */}
        <Line
          x1={indicatorInner.x} y1={indicatorInner.y}
          x2={indicator.x} y2={indicator.y}
          stroke={hex} strokeWidth={2.5} strokeLinecap="round"
        />
        {/* Center dot */}
        <Circle cx={cx} cy={cy} r={2.5} fill={hex} />
      </Svg>
      {/* % and label outside SVG so no overlap */}
      <Text style={styles.pct}>{pct}%</Text>
      <Text style={styles.label}>VOLUME</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pct: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '700',
    marginTop: -4,
  },
  label: {
    fontSize: 8,
    letterSpacing: 2.5,
    color: 'rgba(255,255,255,0.38)',
    fontWeight: '600',
    marginTop: 2,
  },
});
