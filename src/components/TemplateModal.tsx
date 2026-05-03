import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import Button from './ui/Button';
import { TEMPLATES, generateTemplateResult, getDefaultParams } from '@/utils/templates';
import { getLineColor } from '@/utils/colors';
import type { Lines, Mode, TemplateResult } from '@/types';
import styles from './TemplateModal.module.scss';

const DEFAULT_PREVIEW_STROKE = 4;

interface TemplateModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (result: TemplateResult) => void;
}

export default function TemplateModal({ open, onClose, onApply }: TemplateModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(TEMPLATES[0].id);
  const selectedTemplate = useMemo(
    () => TEMPLATES.find((t) => t.id === selectedTemplateId) ?? TEMPLATES[0],
    [selectedTemplateId]
  );
  const [params, setParams] = useState<Record<string, number>>(() =>
    getDefaultParams(selectedTemplate)
  );

  // Reset params when switching templates
  useEffect(() => {
    setParams(getDefaultParams(selectedTemplate));
  }, [selectedTemplate]);

  // Reset selection state when modal closes so it always opens fresh
  useEffect(() => {
    if (!open) {
      setSelectedTemplateId(TEMPLATES[0].id);
    }
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const previewResult = useMemo(
    () => generateTemplateResult(selectedTemplate, params),
    [selectedTemplate, params]
  );

  // Live stroke for the preview SVG mirrors what will be applied on confirm.
  const previewStroke = previewResult.styleOverrides?.strokeWidth ?? DEFAULT_PREVIEW_STROKE;

  const handleParamChange = useCallback((key: string, raw: string) => {
    const value = parseFloat(raw);
    if (Number.isNaN(value)) return;
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleResetParams = useCallback(() => {
    setParams(getDefaultParams(selectedTemplate));
  }, [selectedTemplate]);

  const paramsModified = useMemo(() => {
    if (!selectedTemplate.params) return false;
    return selectedTemplate.params.some((p) => params[p.key] !== p.defaultValue);
  }, [selectedTemplate, params]);

  const handleApply = useCallback(() => {
    onApply(previewResult);
    onClose();
  }, [previewResult, onApply, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-modal-title"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h2 id="template-modal-title">Load Template</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close template picker"
          >
            <X size={18} />
          </button>
        </header>

        <div className={styles.body}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Templates</h3>
            <div className={styles.templatesGrid}>
              {TEMPLATES.map((t) => {
                const isSelected = t.id === selectedTemplateId;
                const thumb = generateTemplateResult(t, getDefaultParams(t));
                const thumbStroke = thumb.styleOverrides?.strokeWidth ?? DEFAULT_PREVIEW_STROKE;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`${styles.templateCard} ${isSelected ? styles.templateCardActive : ''}`}
                    onClick={() => setSelectedTemplateId(t.id)}
                    aria-pressed={isSelected}
                  >
                    <TemplatePreviewSvg
                      lines={thumb.lines}
                      mode="menu"
                      size={44}
                      strokeWidth={thumbStroke}
                    />
                    <span className={styles.templateName}>{t.name}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Preview</h3>
            <div className={styles.previewContainer}>
              <div className={styles.previewItem}>
                <TemplatePreviewSvg
                  lines={previewResult.lines}
                  mode="menu"
                  size={120}
                  strokeWidth={previewStroke}
                />
                <span className={styles.previewLabel}>Menu</span>
              </div>
              <div className={styles.previewItem}>
                <TemplatePreviewSvg
                  lines={previewResult.lines}
                  mode="close"
                  size={120}
                  strokeWidth={previewStroke}
                />
                <span className={styles.previewLabel}>Close</span>
              </div>
            </div>
          </section>

          {selectedTemplate.params && selectedTemplate.params.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionTitleRow}>
                <h3 className={styles.sectionTitle}>Parameters</h3>
                {paramsModified && (
                  <button
                    type="button"
                    className={styles.resetButton}
                    onClick={handleResetParams}
                    aria-label="Reset parameters to defaults"
                  >
                    <RotateCcw size={12} />
                    <span>Reset</span>
                  </button>
                )}
              </div>
              <div className={styles.paramsList}>
                {selectedTemplate.params.map((p) => {
                  const value = params[p.key] ?? p.defaultValue;
                  return (
                    <div key={p.key} className={styles.paramRow}>
                      <label htmlFor={`template-param-${p.key}`}>{p.label}</label>
                      <div className={styles.paramControls}>
                        <input
                          id={`template-param-${p.key}`}
                          type="range"
                          min={p.min}
                          max={p.max}
                          step={p.step}
                          value={value}
                          onChange={(e) => handleParamChange(p.key, e.target.value)}
                          className={styles.slider}
                        />
                        <input
                          type="number"
                          min={p.min}
                          max={p.max}
                          step={p.step}
                          value={value}
                          onChange={(e) => handleParamChange(p.key, e.target.value)}
                          aria-label={`${p.label} value`}
                          className={styles.numberInput}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <div className={styles.warning} role="alert">
            <AlertTriangle size={16} />
            <span>
              Applying a template will replace all current lines and clear all mirror groups. This
              action cannot be undone.
            </span>
          </div>
        </div>

        <footer className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleApply}>
            Apply Template
          </Button>
        </footer>
      </div>
    </div>
  );
}

interface TemplatePreviewSvgProps {
  lines: Lines;
  mode: Mode;
  size: number;
  strokeWidth: number;
}

function TemplatePreviewSvg({ lines, mode, size, strokeWidth }: TemplatePreviewSvgProps) {
  return (
    <svg
      className={styles.previewSvg}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
    >
      {lines.map((line, index) => {
        const anchors = line[mode].filter((p) => p.type === 'anchor');
        if (anchors.length < 2) return null;
        const d =
          `M ${anchors[0].x} ${anchors[0].y}` +
          anchors
            .slice(1)
            .map((p) => ` L ${p.x} ${p.y}`)
            .join('');
        const color = getLineColor(index, line.color);
        return (
          <path
            key={line.id}
            d={d}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );
      })}
    </svg>
  );
}
