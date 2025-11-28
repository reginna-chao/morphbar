import './style.css';
import { Editor } from './editor.js';

document.addEventListener('DOMContentLoaded', () => {
  const svgElement = document.getElementById('editor-svg');
  const previewContainer = document.getElementById('preview-container');
  const codeDisplay = document.getElementById('code-display');
  const btnCopy = document.getElementById('btn-copy');
  const modeButtons = document.querySelectorAll('.btn-toggle');

  const editor = new Editor(svgElement, previewContainer, codeDisplay);

  // Mode Switching
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      editor.setMode(btn.dataset.mode);
    });
  });

  // Copy Functionality
  btnCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(codeDisplay.textContent).then(() => {
      const originalText = btnCopy.textContent;
      btnCopy.textContent = 'Copied!';
      setTimeout(() => {
        btnCopy.textContent = originalText;
      }, 2000);
    });
  });

  // Preview Interaction (Click to animate)
  // The generated HTML uses a checkbox, so clicking the label (which is the container) toggles it.
  // We don't need extra JS for the preview to work, as it's CSS-driven.
});
