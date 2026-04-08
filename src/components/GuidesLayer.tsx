import type { AlignmentGuide } from '@/types';
import styles from './GuidesLayer.module.scss';

interface GuidesLayerProps {
  guides: AlignmentGuide[];
}

export default function GuidesLayer({ guides }: GuidesLayerProps): React.ReactElement | null {
  if (guides.length === 0) return null;

  return (
    <g id="guides-layer" aria-hidden="true">
      {guides.map((guide, i) => {
        const className = guide.isCenter ? styles.guideLineCenter : styles.guideLine;
        return guide.axis === 'horizontal' ? (
          <line
            key={`guide-${i}`}
            x1={0}
            y1={guide.position}
            x2={100}
            y2={guide.position}
            className={className}
          />
        ) : (
          <line
            key={`guide-${i}`}
            x1={guide.position}
            y1={0}
            x2={guide.position}
            y2={100}
            className={className}
          />
        );
      })}
    </g>
  );
}
