import { Undo2, Redo2 } from 'lucide-react';
import styles from './UndoRedoControls.module.scss';

interface UndoRedoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export default function UndoRedoControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: UndoRedoControlsProps) {
  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.button}
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo (Ctrl+Z)"
        data-tooltip-id="app-tooltip"
        data-tooltip-content="Undo (Ctrl+Z)"
      >
        <Undo2 size={18} />
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="Redo (Ctrl+Shift+Z)"
        data-tooltip-id="app-tooltip"
        data-tooltip-content="Redo (Ctrl+Shift+Z)"
      >
        <Redo2 size={18} />
      </button>
    </div>
  );
}
