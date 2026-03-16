import React, { useMemo } from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';

// Mapbox token — set to enable map background, leave empty for SVG-only
// Mapbox public token — injected via app.config.js from EAS secret
let MAPBOX_TOKEN = '';
try {
  const Constants = require('expo-constants').default;
  MAPBOX_TOKEN = Constants?.expoConfig?.extra?.mapboxToken ?? '';
} catch {}

// ── Google Encoded Polyline Decoder ──
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

// ── Props ──
interface RoutePreviewProps {
  polyline: string;
  width?: number;
  height?: number;
  showMap?: boolean;
}

// ── Generate Mapbox Static Image URL ──
function getMapUrl(polyline: string, width: number, height: number): string | null {
  if (!MAPBOX_TOKEN || MAPBOX_TOKEN.includes('placeholder')) return null;
  const encoded = encodeURIComponent(polyline);
  const w = Math.min(Math.round(width), 640);
  const h = Math.min(Math.round(height), 400);
  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/path-3+FF6C24-0.9(${encoded})/auto/${w}x${h}@2x?access_token=${MAPBOX_TOKEN}&padding=30&logo=false&attribution=false`;
}

// ── Component ──
export function RoutePreview({
  polyline,
  width = 120,
  height = 80,
  showMap = true,
}: RoutePreviewProps) {
  const mapUrl = useMemo(() => {
    if (!showMap || !polyline) return null;
    return getMapUrl(polyline, width, height);
  }, [polyline, width, height, showMap]);

  const pathData = useMemo(() => {
    if (!polyline) return null;

    const points = decodePolyline(polyline);
    if (points.length < 2) return null;

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (const [lat, lng] of points) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }

    const padding = 10;
    const w = width - padding * 2;
    const h = height - padding * 2;
    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;

    const scale = Math.min(w / lngRange, h / latRange);
    const offsetX = padding + (w - lngRange * scale) / 2;
    const offsetY = padding + (h - latRange * scale) / 2;

    const normalized = points.map(([lat, lng]) => [
      offsetX + (lng - minLng) * scale,
      offsetY + (maxLat - lat) * scale,
    ]);

    const d = normalized
      .map(
        (p, i) =>
          `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`,
      )
      .join(' ');

    const start = normalized[0];
    const end = normalized[normalized.length - 1];

    return { d, start, end };
  }, [polyline, width, height]);

  if (!pathData) return null;

  // If Mapbox map is available
  if (mapUrl) {
    return (
      <View style={{ width, height, borderRadius: 12, overflow: 'hidden' }}>
        <Image
          source={{ uri: mapUrl }}
          style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Fallback: SVG-only (no map background)
  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGradient id="routeGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FF6C24" />
          <Stop offset="1" stopColor="#FFAC7D" />
        </SvgGradient>
      </Defs>

      <Path
        d={pathData.d}
        fill="none"
        stroke="rgba(255,108,36,0.2)"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <Path
        d={pathData.d}
        fill="none"
        stroke="url(#routeGrad)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <Circle cx={pathData.start[0]} cy={pathData.start[1]} r={3} fill="#FF8540" />
      <Circle cx={pathData.end[0]} cy={pathData.end[1]} r={7} fill="rgba(255,108,36,0.2)" />
      <Circle cx={pathData.end[0]} cy={pathData.end[1]} r={4} fill="#FF6C24" />
    </Svg>
  );
}
