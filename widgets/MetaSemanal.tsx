import { Text, VStack, HStack, Spacer, Gauge, Image } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding, background, gaugeStyle, frame } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

type MetaSemanalProps = {
  currentKm: number;
  goalKm: number;
  progressPercent: number;
};

const MetaSemanal = (props: MetaSemanalProps, env: WidgetEnvironment) => {
  'widget';

  const { currentKm = 0, goalKm = 20, progressPercent = 0 } = props;
  const isSmall = env.widgetFamily === 'systemSmall';
  const pct = Math.min(progressPercent, 100) / 100;

  return (
    <VStack modifiers={[
      padding({ all: 14 }),
      background('#0D0D0D'),
    ]}>
      {/* Logo + runner icon */}
      <HStack>
        <Image
          systemName="figure.run"
          size={14}
          color="#FF6C24"
        />
        <Text modifiers={[
          font({ weight: 'heavy', size: 13 }),
          foregroundStyle('#FF6C24'),
          padding({ leading: 4 }),
        ]}>
          VITTA
        </Text>
        <Text modifiers={[
          font({ weight: 'light', size: 13 }),
          foregroundStyle('#FFFFFF'),
        ]}>
          {' UP'}
        </Text>
        <Spacer />
        {!isSmall && (
          <Text modifiers={[
            font({ weight: 'medium', size: 10 }),
            foregroundStyle('rgba(255,255,255,0.35)'),
          ]}>
            Meta Semanal
          </Text>
        )}
      </HStack>

      <Spacer />

      {/* KM display */}
      <HStack>
        <Text modifiers={[
          font({ weight: 'bold', size: isSmall ? 24 : 30 }),
          foregroundStyle('#FFFFFF'),
        ]}>
          {currentKm.toFixed(1)}
        </Text>
        <Text modifiers={[
          font({ weight: 'regular', size: isSmall ? 12 : 14 }),
          foregroundStyle('rgba(255,255,255,0.4)'),
        ]}>
          {' km'}
        </Text>
        <Spacer />
        <Text modifiers={[
          font({ weight: 'regular', size: isSmall ? 10 : 12 }),
          foregroundStyle('rgba(255,255,255,0.3)'),
        ]}>
          {`de ${goalKm} km`}
        </Text>
      </HStack>

      {/* Gauge progress */}
      <Gauge
        value={pct}
        modifiers={[
          gaugeStyle('linearCapacity'),
          foregroundStyle('#FF6C24'),
        ]}
        currentValueLabel={
          <Text modifiers={[
            font({ weight: 'bold', size: isSmall ? 18 : 22 }),
            foregroundStyle('#FFFFFF'),
          ]}>
            {`${Math.round(progressPercent)}%`}
          </Text>
        }
        minimumValueLabel={
          <Text modifiers={[
            font({ size: 9 }),
            foregroundStyle('rgba(255,255,255,0.3)'),
          ]}>
            0
          </Text>
        }
        maximumValueLabel={
          <Text modifiers={[
            font({ size: 9 }),
            foregroundStyle('rgba(255,255,255,0.3)'),
          ]}>
            {`${goalKm}`}
          </Text>
        }
      />

      {/* Footer */}
      <Text modifiers={[
        font({ weight: 'semibold', size: 11 }),
        foregroundStyle('#FFAC7D'),
      ]}>
        {`${Math.round(progressPercent)}% concluído`}
      </Text>
    </VStack>
  );
};

export default createWidget('MetaSemanal', MetaSemanal);
