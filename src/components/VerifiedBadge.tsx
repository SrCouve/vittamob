import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface VerifiedBadgeProps {
  size?: number;
}

export function VerifiedBadge({ size = 16 }: VerifiedBadgeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22">
      <Defs>
        <LinearGradient id="vb_g1" x1="4" y1="1.5" x2="19.5" y2="22" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#FF6C24" />
          <Stop offset="0.5" stopColor="#FF8540" />
          <Stop offset="1" stopColor="#FFAC7D" />
        </LinearGradient>
      </Defs>

      <Path
        d="M13.596 3.011L11 .5 8.404 3.011l-3.576-.506-.624 3.558-3.19 1.692L2.6 11l-1.586 3.245 3.19 1.692.624 3.558 3.576-.506L11 21.5l2.596-2.511 3.576.506.624-3.558 3.19-1.692L19.4 11l1.586-3.245-3.19-1.692-.624-3.558-3.576.506z"
        fill="url(#vb_g1)"
      />

      <Path
        d="M6 11.39l3.74 3.74 6.2-6.77L14.47 7l-4.8 5.23-2.26-2.26L6 11.39z"
        fill="#fff"
      />
    </Svg>
  );
}
