import { MousePointer, GitBranchPlus, GitBranchMinus } from 'lucide-react';
import type { Tool } from '../types';
import styles from './Toolbar.module.scss';

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
}

export default function Toolbar({ activeTool, onToolChange }: ToolbarProps) {
  const tools: { id: Tool; icon: typeof MousePointer; label: string }[] = [
    { id: 'select', icon: MousePointer, label: 'Select (V)' },
    { id: 'pen-add', icon: GitBranchPlus, label: 'Add Point (A)' },
    { id: 'pen-remove', icon: GitBranchMinus, label: 'Remove Point (D)' },
  ];

  return (
    <div className={styles.toolbar}>
      {tools.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          className={`${styles.toolButton} ${activeTool === id ? styles.active : ''}`}
          onClick={() => onToolChange(id)}
          aria-label={label}
          data-tooltip-id="app-tooltip"
          data-tooltip-content={label}
        >
          <Icon size={20} />
        </button>
      ))}
    </div>
  );
}
