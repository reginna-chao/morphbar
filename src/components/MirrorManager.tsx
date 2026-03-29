import { Plus, Trash2, FlipHorizontal2, FlipVertical2 } from 'lucide-react';
import Button from './ui/Button';
import SegmentedControl from './ui/SegmentedControl';
import { getLineColor } from '@/utils/colors';
import type { Lines, MirrorGroup } from '@/types';
import styles from './MirrorManager.module.scss';

interface MirrorManagerProps {
  lines: Lines;
  mirrorGroups: MirrorGroup[];
  onMirrorGroupsChange: (groups: MirrorGroup[]) => void;
}

export default function MirrorManager({
  lines,
  mirrorGroups,
  onMirrorGroupsChange,
}: MirrorManagerProps) {
  const handleAddGroup = () => {
    const newGroup: MirrorGroup = {
      id: crypto.randomUUID(),
      direction: 'horizontal',
      sourceLine: 0,
      targetLines: [],
    };
    onMirrorGroupsChange([...mirrorGroups, newGroup]);
  };

  const handleRemoveGroup = (id: string) => {
    onMirrorGroupsChange(mirrorGroups.filter((g) => g.id !== id));
  };

  const handleDirectionChange = (id: string, direction: 'horizontal' | 'vertical') => {
    onMirrorGroupsChange(mirrorGroups.map((g) => (g.id === id ? { ...g, direction } : g)));
  };

  const handleSourceChange = (id: string, sourceLine: number) => {
    onMirrorGroupsChange(
      mirrorGroups.map((g) => {
        if (g.id !== id) return g;
        // Remove source from targets if it was selected
        const targetLines = g.targetLines.filter((t) => t !== sourceLine);
        return { ...g, sourceLine, targetLines };
      })
    );
  };

  const handleTargetToggle = (id: string, lineIndex: number) => {
    onMirrorGroupsChange(
      mirrorGroups.map((g) => {
        if (g.id !== id) return g;
        // Cannot target the source line
        if (lineIndex === g.sourceLine) return g;
        const hasTarget = g.targetLines.includes(lineIndex);
        const targetLines = hasTarget
          ? g.targetLines.filter((t) => t !== lineIndex)
          : [...g.targetLines, lineIndex];
        return { ...g, targetLines };
      })
    );
  };

  return (
    <div className={styles.mirrorManager}>
      <div className={styles.header}>
        <h3>Mirror Groups</h3>
        <Button
          onClick={handleAddGroup}
          size="small"
          disabled={lines.length < 2}
          aria-label="Add mirror group"
          data-tooltip-id="app-tooltip"
          data-tooltip-content="Add mirror group"
        >
          <Plus size={16} />
        </Button>
      </div>

      {mirrorGroups.length === 0 ? (
        <div className={styles.emptyState}>No mirror groups yet</div>
      ) : (
        <div className={styles.groupList}>
          {mirrorGroups.map((group) => (
            <div key={group.id} className={styles.groupItem}>
              <div className={styles.groupHeader}>
                <span className={styles.groupTitle}>
                  {group.direction === 'horizontal' ? (
                    <FlipHorizontal2 size={16} />
                  ) : (
                    <FlipVertical2 size={16} />
                  )}
                  Mirror
                </span>
                <Button
                  onClick={() => handleRemoveGroup(group.id)}
                  variant="ghost"
                  size="small"
                  aria-label="Remove mirror group"
                  data-tooltip-id="app-tooltip"
                  data-tooltip-content="Remove mirror group"
                >
                  <Trash2 size={16} />
                </Button>
              </div>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>Direction</span>
                <SegmentedControl
                  options={[
                    {
                      value: 'horizontal',
                      label: 'Horizontal',
                      icon: <FlipHorizontal2 size={14} />,
                    },
                    { value: 'vertical', label: 'Vertical', icon: <FlipVertical2 size={14} /> },
                  ]}
                  value={group.direction}
                  onChange={(dir) => handleDirectionChange(group.id, dir)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor={`source-${group.id}`}>
                  Source Line
                </label>
                <select
                  id={`source-${group.id}`}
                  className={styles.sourceSelect}
                  value={group.sourceLine}
                  onChange={(e) => handleSourceChange(group.id, Number(e.target.value))}
                >
                  {lines.map((line, index) => (
                    <option key={index} value={index}>
                      Line {index + 1} ({getLineColor(index, line.color)})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <fieldset className={styles.targetFieldset}>
                  <legend className={styles.fieldLabel}>Target Lines</legend>
                  <div className={styles.targetList}>
                    {lines.map((line, index) => {
                      if (index === group.sourceLine) return null;
                      const color = getLineColor(index, line.color);
                      const isChecked = group.targetLines.includes(index);
                      const conflictGroup = mirrorGroups.find(
                        (other) => other.id !== group.id && other.targetLines.includes(index)
                      );
                      const isConflict = !!conflictGroup;
                      return (
                        <label key={index} className={styles.targetItem}>
                          <input
                            type="checkbox"
                            className={styles.targetCheckbox}
                            checked={isChecked}
                            disabled={isConflict && !isChecked}
                            onChange={() => handleTargetToggle(group.id, index)}
                          />
                          <div
                            className={styles.targetColorIndicator}
                            style={{ backgroundColor: color }}
                          />
                          <span>
                            Line {index + 1}
                            {isConflict && !isChecked && (
                              <span className={styles.conflictHint}>
                                {' '}
                                (mirrored by another group)
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
