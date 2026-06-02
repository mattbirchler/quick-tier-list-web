/**
 * Quick Tier List - Main JavaScript
 * A simple, client-side tier list maker
 */

// ========================================
// State
// ========================================

const state = {
  tierData: {
    S: [],
    A: [],
    B: [],
    C: [],
    D: [],
    F: [],
    unranked: []
  },
  tierNames: { S: 'S', A: 'A', B: 'B', C: 'C', D: 'D', F: 'F' },
  isStreamerMode: false,
  tableWidth: 1152,
  theme: 'system', // 'system', 'light', 'dark', 'cyberpunk'
  selectedItemIds: []
};

// Pointer-drag controller state. We render our own drag ghost in the DOM
// (rather than relying on the browser's native drag image) so the dragged
// item stays visible to anyone watching a screen share, and so we can give
// it real spring physics.
const drag = {
  active: false,
  candidate: null,   // pending drag: { id, fromTier, sourceEl, imgSrc, startX, startY, offsetX, offsetY, grabW }
  ghost: null,
  dropZone: null,    // tier name, 'unranked', or null
  dropTarget: null,  // { id, position: 'left' | 'right' }
  ghostX: 0, ghostY: 0,   // current rendered center
  targetX: 0, targetY: 0, // pointer-following target center
  lastX: 0,
  rotation: 0,
  rafId: null,
  suppressClick: false
};

// ========================================
// DOM References
// ========================================

const elements = {
  container: null,
  tierTable: null,
  itemsGrid: null,
  itemsDropZone: null,
  dropPlaceholder: null,
  fileInput: null,
  uploadProgress: null,
  progressCount: null,
  progressFill: null,
  sortBtn: null,
  shuffleBtn: null,
  exportBtn: null,
  resetRankingsBtn: null,
  resetEverythingBtn: null,
  alignSelect: null,
  themeSelect: null,
  resizeHandle: null,
  modalOverlay: null,
  modalCancelBtn: null,
  modalConfirmBtn: null,
  lightboxOverlay: null,
  lightboxImage: null
};

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  cacheElements();
  loadFromStorage();
  render();
  attachEventListeners();
});

function cacheElements() {
  elements.container = document.getElementById('tierContainer');
  elements.tierTable = document.querySelector('.tier-table');
  elements.itemsGrid = document.getElementById('itemsGrid');
  elements.itemsDropZone = document.getElementById('itemsDropZone');
  elements.dropPlaceholder = document.getElementById('dropPlaceholder');
  elements.fileInput = document.getElementById('fileInput');
  elements.uploadProgress = document.getElementById('uploadProgress');
  elements.progressCount = document.getElementById('progressCount');
  elements.progressFill = document.getElementById('progressFill');
  elements.sortBtn = document.getElementById('sortBtn');
  elements.shuffleBtn = document.getElementById('shuffleBtn');
  elements.exportBtn = document.getElementById('exportBtn');
  elements.resetRankingsBtn = document.getElementById('resetRankingsBtn');
  elements.resetEverythingBtn = document.getElementById('resetEverythingBtn');
  elements.alignSelect = document.getElementById('alignSelect');
  elements.themeSelect = document.getElementById('themeSelect');
  elements.resizeHandle = document.getElementById('resizeHandle');
  elements.modalOverlay = document.getElementById('modalOverlay');
  elements.modalCancelBtn = document.getElementById('modalCancelBtn');
  elements.modalConfirmBtn = document.getElementById('modalConfirmBtn');
  elements.lightboxOverlay = document.getElementById('lightboxOverlay');
  elements.lightboxContent = document.getElementById('lightboxContent');
}

function loadFromStorage() {
  try {
    const savedTierData = localStorage.getItem('tierListData');
    if (savedTierData) {
      state.tierData = JSON.parse(savedTierData);
    }

    const savedTierNames = localStorage.getItem('tierNames');
    if (savedTierNames) {
      state.tierNames = JSON.parse(savedTierNames);
    }

    const savedStreamerMode = localStorage.getItem('isStreamerMode');
    if (savedStreamerMode) {
      state.isStreamerMode = JSON.parse(savedStreamerMode);
    }

    const savedTableWidth = localStorage.getItem('tableWidth');
    if (savedTableWidth) {
      state.tableWidth = JSON.parse(savedTableWidth);
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      state.theme = savedTheme;
    }

    // Migration: ensure newer tiers exist for data saved before they were added
    if (!Array.isArray(state.tierData.F)) {
      state.tierData.F = [];
    }
    if (!state.tierNames.F) {
      state.tierNames.F = 'F';
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error);
  }
}

function saveToStorage() {
  try {
    localStorage.setItem('tierListData', JSON.stringify(state.tierData));
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.warn('LocalStorage quota exceeded. Clearing and retrying...');
      try {
        localStorage.clear();
        localStorage.setItem('tierListData', JSON.stringify(state.tierData));
      } catch (retryError) {
        console.error('Failed to save even after clearing:', retryError);
        alert('Storage limit exceeded. Consider using fewer or smaller images.');
      }
    }
  }
}

function saveTierNames() {
  localStorage.setItem('tierNames', JSON.stringify(state.tierNames));
}

function saveStreamerMode() {
  localStorage.setItem('isStreamerMode', JSON.stringify(state.isStreamerMode));
}

function saveTableWidth() {
  localStorage.setItem('tableWidth', JSON.stringify(state.tableWidth));
}

function saveTheme() {
  localStorage.setItem('theme', state.theme);
}

function applyTheme() {
  const root = document.documentElement;

  if (state.theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', state.theme);
  }

  // Update select element to match current theme
  if (elements.themeSelect) {
    elements.themeSelect.value = state.theme;
  }
}

function getEffectiveTheme() {
  if (state.theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return state.theme;
}

// ========================================
// Rendering
// ========================================

function render() {
  applyTheme();
  renderTiers();
  renderItems();
  updateContainerStyles();
  updateButtonStates();
}

function renderTiers() {
  const tiers = ['S', 'A', 'B', 'C', 'D', 'F'];

  elements.tierTable.innerHTML = tiers.map(tier => `
    <div class="tier-row" data-tier="${tier}">
      <div class="tier-label tier-${tier.toLowerCase()}">
        <input
          type="text"
          value="${state.tierNames[tier]}"
          maxlength="18"
          data-tier="${tier}"
          aria-label="Tier ${tier} name"
        >
      </div>
      <div class="tier-content" data-tier="${tier}">
        ${state.tierData[tier].map(item => createImageItemHTML(item, tier)).join('')}
      </div>
    </div>
  `).join('');

  // Attach tier name input listeners
  elements.tierTable.querySelectorAll('.tier-label input').forEach(input => {
    input.addEventListener('input', handleTierNameChange);
  });

  // Attach image item listeners (drop targets are resolved by the
  // pointer-drag controller via hit-testing, not native drag events).
  attachImageItemListeners(elements.tierTable);

  // Update tier label widths
  updateTierLabelWidths();
}

function renderItems() {
  const previouslySelected = [...state.selectedItemIds];

  elements.itemsGrid.innerHTML = state.tierData.unranked
    .map(item => createImageItemHTML(item, 'unranked'))
    .join('');

  // Show/hide placeholder
  const hasItems = state.tierData.unranked.length > 0;
  elements.dropPlaceholder.classList.toggle('hidden', hasItems);

  // Attach image item listeners
  attachImageItemListeners(elements.itemsGrid);

  // Restore selection for items that still exist in unranked
  const stillValid = previouslySelected.filter(id => state.tierData.unranked.some(img => img.id === id));
  state.selectedItemIds = stillValid;
  for (const id of stillValid) {
    const el = elements.itemsGrid.querySelector(`.image-item[data-id="${id}"]`);
    if (el) el.classList.add('selected');
  }
}

function createImageItemHTML(item, tier) {
  return `
    <div class="image-item" data-id="${item.id}" data-tier="${tier}">
      <img src="${item.src}" alt="${item.name}" draggable="false">
      <button class="delete-btn" data-id="${item.id}" data-tier="${tier}" aria-label="Remove ${item.name}">×</button>
    </div>
  `;
}

function attachImageItemListeners(container) {
  container.querySelectorAll('.image-item').forEach(item => {
    item.addEventListener('pointerdown', handleItemPointerDown);

    // Click to select unranked items for lightbox preview
    if (item.dataset.tier === 'unranked') {
      item.addEventListener('click', handleItemSelect);
    }
  });

  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', handleDeleteImage);
  });
}

function updateContainerStyles() {
  elements.container.style.width = `${state.tableWidth}px`;
  elements.container.classList.toggle('streamer-mode', state.isStreamerMode);
  elements.alignSelect.value = state.isStreamerMode ? 'left' : 'center';
}

function updateButtonStates() {
  const hasUnrankedItems = state.tierData.unranked.length > 0;
  elements.sortBtn.disabled = !hasUnrankedItems;
  elements.shuffleBtn.disabled = !hasUnrankedItems;
}

function updateTierLabelWidths() {
  const maxLength = Math.max(...Object.values(state.tierNames).map(n => n.length));
  const width = Math.max(80, Math.min(144, 80 + (maxLength - 1) * 8));

  document.documentElement.style.setProperty('--tier-label-width', `${width}px`);
}

// ========================================
// Event Listeners
// ========================================

function attachEventListeners() {
  // File input
  elements.fileInput.addEventListener('change', handleFileSelect);

  // Drop zone click
  elements.itemsDropZone.addEventListener('click', (e) => {
    if (drag.suppressClick) return; // ignore the click that ends a drag
    if (e.target === elements.itemsDropZone || e.target === elements.dropPlaceholder || e.target.closest('.drop-placeholder')) {
      elements.fileInput.click();
    }
  });

  // Drop zone drag/drop for files
  elements.itemsDropZone.addEventListener('dragover', handleItemsAreaDragOver);
  elements.itemsDropZone.addEventListener('dragleave', handleItemsAreaDragLeave);
  elements.itemsDropZone.addEventListener('drop', handleItemsAreaDrop);

  // Action buttons
  elements.sortBtn.addEventListener('click', sortItemsAlphabetically);
  elements.shuffleBtn.addEventListener('click', shuffleItems);
  elements.exportBtn.addEventListener('click', exportAsImage);
  elements.resetRankingsBtn.addEventListener('click', resetRankings);
  elements.resetEverythingBtn.addEventListener('click', showResetModal);
  elements.alignSelect.addEventListener('change', handleAlignChange);

  // Modal buttons
  elements.modalCancelBtn.addEventListener('click', hideModal);
  elements.modalConfirmBtn.addEventListener('click', confirmResetEverything);
  elements.modalOverlay.addEventListener('click', (e) => {
    if (e.target === elements.modalOverlay) hideModal();
  });

  // Resize handle
  elements.resizeHandle.addEventListener('mousedown', handleResizeStart);

  // Theme selector
  elements.themeSelect.addEventListener('change', handleThemeChange);

  // Prevent default drag behavior on document
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => e.preventDefault());

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (elements.lightboxOverlay.classList.contains('visible')) {
        hideLightbox();
      } else if (elements.modalOverlay.classList.contains('visible')) {
        hideModal();
      } else if (state.selectedItemIds.length > 0) {
        clearSelection();
      }
    }
    if (e.key === ' ' && !e.target.matches('input, textarea, select, button')) {
      if (elements.lightboxOverlay.classList.contains('visible')) {
        e.preventDefault();
        hideLightbox();
      } else if (state.selectedItemIds.length > 0) {
        e.preventDefault();
        showLightbox(state.selectedItemIds);
      }
    }
  });

  // Click outside items to deselect
  document.addEventListener('click', (e) => {
    if (drag.suppressClick) return; // ignore the click that ends a drag
    if (state.selectedItemIds.length > 0 && !e.target.closest('.image-item') && !e.target.closest('.lightbox-overlay')) {
      clearSelection();
    }
  });

  // Lightbox overlay click to dismiss
  elements.lightboxOverlay.addEventListener('click', hideLightbox);
}

// ========================================
// Tier Name Handling
// ========================================

function handleTierNameChange(e) {
  const tier = e.target.dataset.tier;
  state.tierNames[tier] = e.target.value;
  saveTierNames();
  updateTierLabelWidths();
}

// ========================================
// Image Drag & Drop
// ========================================

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// A drag begins as a "candidate" on pointerdown and only becomes an active
// drag once the pointer moves past a small threshold, so taps still register
// as clicks (selection / lightbox).
function handleItemPointerDown(e) {
  // Primary button only for mice; ignore the delete button.
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (e.target.closest('.delete-btn')) return;

  const item = e.target.closest('.image-item');
  if (!item) return;

  drag.suppressClick = false;
  const rect = item.getBoundingClientRect();
  drag.candidate = {
    id: item.dataset.id,
    fromTier: item.dataset.tier,
    sourceEl: item,
    imgSrc: item.querySelector('img') ? item.querySelector('img').src : '',
    startX: e.clientX,
    startY: e.clientY,
    // Offset of the pointer from the item's center, so the grab point stays put.
    offsetX: e.clientX - (rect.left + rect.width / 2),
    offsetY: e.clientY - (rect.top + rect.height / 2),
    grabW: rect.width
  };

  window.addEventListener('pointermove', handleDragPointerMove);
  window.addEventListener('pointerup', handleDragPointerUp);
  window.addEventListener('pointercancel', handleDragPointerUp);
}

function handleDragPointerMove(e) {
  if (!drag.candidate) return;

  if (!drag.active) {
    const dx = e.clientX - drag.candidate.startX;
    const dy = e.clientY - drag.candidate.startY;
    if (Math.hypot(dx, dy) < 6) return; // below threshold: still a potential click
    startDrag();
  }

  drag.targetX = e.clientX - drag.candidate.offsetX;
  drag.targetY = e.clientY - drag.candidate.offsetY;
  updateDropTargetFromPoint(e.clientX, e.clientY);
}

function startDrag() {
  const c = drag.candidate;
  drag.active = true;
  document.body.classList.add('dragging-active');
  c.sourceEl.classList.add('drag-source');

  const ghost = document.createElement('div');
  ghost.className = 'drag-ghost';
  ghost.style.width = `${c.grabW}px`;
  const img = document.createElement('img');
  img.src = c.imgSrc;
  img.draggable = false;
  ghost.appendChild(img);
  document.body.appendChild(ghost);
  drag.ghost = ghost;

  // Seed positions at the current grab point so it doesn't jump.
  drag.ghostX = drag.targetX = c.startX - c.offsetX;
  drag.ghostY = drag.targetY = c.startY - c.offsetY;
  drag.lastX = drag.ghostX;
  drag.rotation = 0;

  drag.rafId = requestAnimationFrame(animateGhost);
}

function animateGhost() {
  if (!drag.active) return;

  if (prefersReducedMotion()) {
    drag.ghostX = drag.targetX;
    drag.ghostY = drag.targetY;
    drag.rotation = 0;
  } else {
    // Spring follow: ease the ghost toward the pointer each frame.
    drag.ghostX += (drag.targetX - drag.ghostX) * 0.28;
    drag.ghostY += (drag.targetY - drag.ghostY) * 0.28;
    // Tilt based on horizontal velocity for a physical, lively feel.
    const vx = drag.ghostX - drag.lastX;
    drag.lastX = drag.ghostX;
    const targetRot = Math.max(-14, Math.min(14, vx * 0.9));
    drag.rotation += (targetRot - drag.rotation) * 0.2;
  }

  renderGhost();
  drag.rafId = requestAnimationFrame(animateGhost);
}

function renderGhost() {
  const g = drag.ghost;
  if (!g) return;
  const w = g.offsetWidth;
  const h = g.offsetHeight;
  g.style.transform =
    `translate(${drag.ghostX - w / 2}px, ${drag.ghostY - h / 2}px) scale(1.12) rotate(${drag.rotation}deg)`;
}

// Resolve which tier (or the unranked zone) the pointer is over, and where
// within it the item would be inserted, then reflect that with indicators.
function updateDropTargetFromPoint(x, y) {
  clearDropIndicators();
  drag.dropZone = null;
  drag.dropTarget = null;

  const el = document.elementFromPoint(x, y); // ghost is pointer-events:none
  if (!el) return;

  const tierContent = el.closest('.tier-content');
  const itemsZone = el.closest('.items-drop-zone');

  if (tierContent) {
    const toTier = tierContent.dataset.tier;
    if (!canDropInTier(toTier, drag.candidate.fromTier)) {
      tierContent.classList.add('drag-over-full');
      return; // blocked: leave dropZone null
    }
    drag.dropZone = toTier;
    tierContent.classList.add('drag-over');
    markInsertPosition(el, x);
  } else if (itemsZone) {
    drag.dropZone = 'unranked';
    itemsZone.classList.add('drag-over');
    markInsertPosition(el, x);
  }
}

function markInsertPosition(el, x) {
  const overItem = el.closest('.image-item');
  if (!overItem || overItem.dataset.id === drag.candidate.id) return;
  const rect = overItem.getBoundingClientRect();
  const position = x < rect.left + rect.width / 2 ? 'left' : 'right';
  overItem.classList.add(`drop-${position}`);
  drag.dropTarget = { id: overItem.dataset.id, position };
}

function handleDragPointerUp(e) {
  window.removeEventListener('pointermove', handleDragPointerMove);
  window.removeEventListener('pointerup', handleDragPointerUp);
  window.removeEventListener('pointercancel', handleDragPointerUp);

  if (!drag.active) {
    drag.candidate = null; // was a tap/click; selection handler will run
    return;
  }

  finishDrag(e.clientX, e.clientY);
}

function finishDrag(dropX, dropY) {
  const c = drag.candidate;
  const targetTier = drag.dropZone;
  const dropTarget = drag.dropTarget;

  if (drag.rafId) cancelAnimationFrame(drag.rafId);
  drag.rafId = null;

  if (drag.ghost && drag.ghost.parentNode) {
    drag.ghost.parentNode.removeChild(drag.ghost);
  }
  if (c && c.sourceEl) {
    c.sourceEl.classList.remove('drag-source');
  }

  if (targetTier) {
    let insertIndex = -1;
    if (dropTarget) {
      const targetIndex = state.tierData[targetTier].findIndex(img => img.id === dropTarget.id);
      if (targetIndex !== -1) {
        insertIndex = dropTarget.position === 'left' ? targetIndex : targetIndex + 1;
      }
    }
    moveItem(c.id, c.fromTier, targetTier, insertIndex);
    spawnRipple(targetTier, dropX, dropY);
  }

  // A synthetic click follows pointerup; suppress it so a drag doesn't also
  // toggle selection or open the file picker. The click is dispatched before
  // a 0ms timer, so clearing it here cleans up without lingering.
  drag.suppressClick = true;
  setTimeout(() => { drag.suppressClick = false; }, 0);
  drag.active = false;
  drag.candidate = null;
  drag.ghost = null;
  drag.dropZone = null;
  drag.dropTarget = null;
  document.body.classList.remove('dragging-active');
  clearDropIndicators();
}

function spawnRipple(zone, clientX, clientY) {
  if (prefersReducedMotion()) return;

  const container = zone === 'unranked'
    ? elements.itemsDropZone
    : elements.tierTable.querySelector(`.tier-content[data-tier="${zone}"]`);
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'tier-ripple';
  ripple.style.left = `${clientX - rect.left}px`;
  ripple.style.top = `${clientY - rect.top}px`;
  container.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}

function clearDropIndicators() {
  document.querySelectorAll('.image-item').forEach(item => {
    item.classList.remove('drop-left', 'drop-right');
  });
  document.querySelectorAll('.tier-content').forEach(content => {
    content.classList.remove('drag-over', 'drag-over-full');
  });
}

// The F tier holds a single item. A drop is allowed only when F is empty,
// or when the item already lives in F (re-dropping its own occupant).
const TIER_CAPACITY = { F: 1 };

function canDropInTier(toTier, fromTier) {
  const capacity = TIER_CAPACITY[toTier];
  if (capacity === undefined || fromTier === toTier) return true;
  return state.tierData[toTier].length < capacity;
}

// Native drag events are used only for files dropped in from outside the
// browser (uploads). Item reordering is handled by the pointer controller.
function handleItemsAreaDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  elements.itemsDropZone.classList.add('drag-over');
}

function handleItemsAreaDragLeave(e) {
  // Only remove class if leaving the drop zone entirely
  if (!elements.itemsDropZone.contains(e.relatedTarget)) {
    elements.itemsDropZone.classList.remove('drag-over');
  }
}

function handleItemsAreaDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  elements.itemsDropZone.classList.remove('drag-over');

  const files = e.dataTransfer.files;
  if (files && files.length > 0) {
    processFiles(files);
  }
}

function moveItem(itemId, fromTier, toTier, insertIndex = -1) {
  const itemIndex = state.tierData[fromTier].findIndex(img => img.id === itemId);
  if (itemIndex === -1) return;

  const [item] = state.tierData[fromTier].splice(itemIndex, 1);

  // If moving within the same tier, adjust index if needed
  if (fromTier === toTier && insertIndex > itemIndex) {
    insertIndex--;
  }

  // Insert at specific position or append to end
  if (insertIndex >= 0 && insertIndex <= state.tierData[toTier].length) {
    state.tierData[toTier].splice(insertIndex, 0, item);
  } else {
    state.tierData[toTier].push(item);
  }

  saveToStorage();
  render();

  // Add drop animation to the moved item
  requestAnimationFrame(() => {
    const droppedItem = document.querySelector(`.image-item[data-id="${itemId}"]`);
    if (droppedItem) {
      droppedItem.classList.add('just-dropped');
      droppedItem.addEventListener('animationend', () => {
        droppedItem.classList.remove('just-dropped');
      }, { once: true });
    }
  });
}

// ========================================
// Delete Image
// ========================================

function handleDeleteImage(e) {
  e.stopPropagation();
  const btn = e.target;
  const id = btn.dataset.id;
  const tier = btn.dataset.tier;

  state.tierData[tier] = state.tierData[tier].filter(img => img.id !== id);
  saveToStorage();
  render();
}

// ========================================
// File Upload
// ========================================

function handleFileSelect(e) {
  const files = e.target.files;
  if (files && files.length > 0) {
    processFiles(files);
  }
  e.target.value = '';
}

async function processFiles(files) {
  const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
  if (imageFiles.length === 0) return;

  const maxFileSize = 5 * 1024 * 1024; // 5MB

  elements.uploadProgress.hidden = false;
  elements.progressCount.textContent = `0 / ${imageFiles.length}`;
  elements.progressFill.style.width = '0%';

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];

    if (file.size > maxFileSize) {
      alert(`File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 5MB.`);
      continue;
    }

    try {
      const compressedSrc = await compressImage(file);
      const newImage = {
        id: Date.now().toString() + Math.random().toString() + i.toString(),
        src: compressedSrc,
        name: file.name
      };

      state.tierData.unranked.push(newImage);

      // Update progress
      elements.progressCount.textContent = `${i + 1} / ${imageFiles.length}`;
      elements.progressFill.style.width = `${((i + 1) / imageFiles.length) * 100}%`;

      // Small delay to prevent quota issues
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Error processing image:', file.name, error);
    }
  }

  saveToStorage();
  elements.uploadProgress.hidden = true;
  render();
}

function compressImage(file, maxHeight = 1024, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      // Scale to fit within maxHeight, preserving aspect ratio
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      // Background color based on effective theme
      const effectiveTheme = getEffectiveTheme();
      const bgColors = {
        light: '#ffffff',
        dark: '#1e293b',
        cyberpunk: '#12121a',
        'retro-arcade': '#1a1a2e',
        twitch: '#18181b',
        pastel: '#ffffff',
        tangerine: '#ffffff',
        'comfort-zone': '#f5f0fa',
        colorblind: '#ffffff'
      };
      ctx.fillStyle = bgColors[effectiveTheme] || '#ffffff';
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// ========================================
// Item Actions
// ========================================

function sortItemsAlphabetically() {
  state.tierData.unranked.sort((a, b) => a.name.localeCompare(b.name));
  saveToStorage();
  render();
}

function shuffleItems() {
  const items = state.tierData.unranked;
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  saveToStorage();
  render();
}

// ========================================
// Reset Actions
// ========================================

function resetRankings() {
  const allItems = [
    ...state.tierData.S,
    ...state.tierData.A,
    ...state.tierData.B,
    ...state.tierData.C,
    ...state.tierData.D,
    ...state.tierData.F,
    ...state.tierData.unranked
  ];

  state.tierData = {
    S: [],
    A: [],
    B: [],
    C: [],
    D: [],
    F: [],
    unranked: allItems
  };

  saveToStorage();
  render();
}

// ========================================
// Modal
// ========================================

function showResetModal() {
  elements.modalOverlay.hidden = false;
  // Trigger reflow for animation
  elements.modalOverlay.offsetHeight;
  elements.modalOverlay.classList.add('visible');
  elements.modalConfirmBtn.focus();
}

function hideModal() {
  elements.modalOverlay.classList.remove('visible');
  setTimeout(() => {
    elements.modalOverlay.hidden = true;
  }, 200);
}

function confirmResetEverything() {
  hideModal();

  state.tierData = {
    S: [],
    A: [],
    B: [],
    C: [],
    D: [],
    F: [],
    unranked: []
  };
  state.tableWidth = 1152;

  saveToStorage();
  saveTableWidth();
  render();
}

// ========================================
// Lightbox
// ========================================

function handleItemSelect(e) {
  // Don't select if clicking delete button
  if (e.target.closest('.delete-btn')) return;
  // Ignore the click that fires at the end of a drag.
  if (drag.suppressClick) return;

  const item = e.currentTarget;
  const id = item.dataset.id;

  if (e.shiftKey && state.selectedItemIds.length > 0) {
    // Shift+click: select range from last selected to clicked item
    const lastSelectedId = state.selectedItemIds[state.selectedItemIds.length - 1];
    const unrankedIds = state.tierData.unranked.map(img => img.id);
    const lastIndex = unrankedIds.indexOf(lastSelectedId);
    const clickedIndex = unrankedIds.indexOf(id);

    if (lastIndex !== -1 && clickedIndex !== -1) {
      const start = Math.min(lastIndex, clickedIndex);
      const end = Math.max(lastIndex, clickedIndex);
      const rangeIds = unrankedIds.slice(start, end + 1);

      // Add range to selection (deduplicate)
      for (const rangeId of rangeIds) {
        if (!state.selectedItemIds.includes(rangeId)) {
          state.selectedItemIds.push(rangeId);
        }
      }

      // Update visual selection
      document.querySelectorAll('.image-item.selected').forEach(el => el.classList.remove('selected'));
      for (const selId of state.selectedItemIds) {
        const el = elements.itemsGrid.querySelector(`.image-item[data-id="${selId}"]`);
        if (el) el.classList.add('selected');
      }
    }
    return;
  }

  // Regular click: toggle single selection
  const idx = state.selectedItemIds.indexOf(id);
  if (idx !== -1) {
    state.selectedItemIds.splice(idx, 1);
    item.classList.remove('selected');
  } else {
    // Clear previous selections and select this one
    clearSelection();
    state.selectedItemIds = [id];
    item.classList.add('selected');
  }
}

function clearSelection() {
  state.selectedItemIds = [];
  document.querySelectorAll('.image-item.selected').forEach(el => {
    el.classList.remove('selected');
  });
}

function showLightbox(itemIds) {
  const items = itemIds
    .map(id => state.tierData.unranked.find(img => img.id === id))
    .filter(Boolean);
  if (items.length === 0) return;

  // Build lightbox content — scale images to share the viewport width
  const count = items.length;
  const gapPx = 16;
  const totalGap = (count - 1) * gapPx;
  const maxPerImage = `calc((95vw - ${totalGap}px) / ${count})`;

  elements.lightboxContent.innerHTML = items
    .map(item => `<img class="lightbox-image" style="max-width:${maxPerImage}" src="${item.src}" alt="${item.name}">`)
    .join('');

  elements.lightboxOverlay.hidden = false;
  elements.lightboxOverlay.offsetHeight; // trigger reflow
  elements.lightboxOverlay.classList.add('visible');
}

function hideLightbox() {
  elements.lightboxOverlay.classList.remove('visible');
  setTimeout(() => {
    elements.lightboxOverlay.hidden = true;
  }, 200);
}

// ========================================
// Alignment
// ========================================

function handleAlignChange(e) {
  state.isStreamerMode = e.target.value === 'left';
  saveStreamerMode();
  updateContainerStyles();
}

// ========================================
// Theme Handling
// ========================================

function handleThemeChange(e) {
  state.theme = e.target.value;
  saveTheme();
  applyTheme();
}

// ========================================
// Resize Handling
// ========================================

function handleResizeStart(e) {
  e.preventDefault();
  elements.resizeHandle.classList.add('resizing');

  const handleMouseMove = (e) => {
    const containerRect = elements.container.getBoundingClientRect();
    const newWidth = e.clientX - containerRect.left;
    const minWidth = 400;
    const maxWidth = window.innerWidth - 48;

    state.tableWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    elements.container.style.width = `${state.tableWidth}px`;
  };

  const handleMouseUp = () => {
    elements.resizeHandle.classList.remove('resizing');
    saveTableWidth();
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

// ========================================
// Export as Image
// ========================================

async function exportAsImage() {
  const tiers = ['S', 'A', 'B', 'C', 'D', 'F'];
  const effectiveTheme = getEffectiveTheme();

  // Theme-specific colors
  const themeColors = {
    light: {
      bg: '#f8fafc',
      contentBg: '#ffffff',
      border: '#e2e8f0',
      tierColors: {
        S: '#dc2626',
        A: '#ea580c',
        B: '#ca8a04',
        C: '#16a34a',
        D: '#2563eb',
        F: '#7c3aed'
      }
    },
    dark: {
      bg: '#0f172a',
      contentBg: '#1e293b',
      border: '#334155',
      tierColors: {
        S: '#dc2626',
        A: '#ea580c',
        B: '#ca8a04',
        C: '#16a34a',
        D: '#2563eb',
        F: '#7c3aed'
      }
    },
    cyberpunk: {
      bg: '#0a0a0f',
      contentBg: '#12121a',
      border: '#2a2a3a',
      tierColors: {
        S: '#ff0066',
        A: '#ff7700',
        B: '#ffdd00',
        C: '#00ff77',
        D: '#00aaff',
        F: '#aa00ff'
      }
    },
    'retro-arcade': {
      bg: '#0d0d1a',
      contentBg: '#1a1a2e',
      border: '#333366',
      tierColors: {
        S: '#ff0060',
        A: '#ff9f00',
        B: '#dfff00',
        C: '#00ff60',
        D: '#009fff',
        F: '#9f00ff'
      }
    },
    twitch: {
      bg: '#0e0e10',
      contentBg: '#18181b',
      border: '#2f2f35',
      tierColors: {
        S: '#9147ff',
        A: '#bf94ff',
        B: '#00c8af',
        C: '#1f69ff',
        D: '#eb0400',
        F: '#3d3d5c'
      }
    },
    pastel: {
      bg: '#fef7f0',
      contentBg: '#ffffff',
      border: '#e8dff0',
      tierColors: {
        S: '#ff9aa2',
        A: '#ffc98b',
        B: '#fff59d',
        C: '#98fb98',
        D: '#a0d2ff',
        F: '#c9b1ff'
      }
    },
    tangerine: {
      bg: '#fff6ec',
      contentBg: '#ffffff',
      border: '#e8e8e8',
      tierColors: {
        S: '#e55a00',
        A: '#e58500',
        B: '#e5a030',
        C: '#e5b860',
        D: '#a88860',
        F: '#80705f'
      }
    },
    'comfort-zone': {
      bg: '#e8e0f0',
      contentBg: '#f5f0fa',
      border: '#d0c4e0',
      tierColors: {
        S: '#c85088',
        A: '#8b6ba8',
        B: '#6ab8b8',
        C: '#e8a850',
        D: '#b8a0d0',
        F: '#8868a0'
      }
    },
    colorblind: {
      bg: '#f5f5f5',
      contentBg: '#ffffff',
      border: '#e0e0e0',
      tierColors: {
        S: '#0077bb',
        A: '#33bbee',
        B: '#ee7733',
        C: '#ee3377',
        D: '#999999',
        F: '#555555'
      }
    }
  };

  const colors = themeColors[effectiveTheme] || themeColors.light;
  const tierColors = colors.tierColors;

  // Settings
  const scale = 6; // 6x resolution for crisp export
  const padding = 16;
  const tierLabelWidth = 80;
  const imageHeight = 64;
  const imageGap = 6;
  const rowHeight = 80;
  const rowGap = 4;

  // Load all images first and calculate their display widths
  const imageCache = new Map();
  for (const tier of tiers) {
    for (const item of state.tierData[tier]) {
      if (!imageCache.has(item.src)) {
        const img = new Image();
        img.src = item.src;
        await new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
        imageCache.set(item.src, img);
      }
    }
  }

  // Calculate the width needed for each tier row based on actual image widths
  function getImageDisplayWidth(img) {
    if (!img || !img.complete || img.naturalWidth === 0) return imageHeight;
    const aspect = img.naturalWidth / img.naturalHeight;
    return imageHeight * aspect;
  }

  function getTierRowWidth(tier) {
    let width = 0;
    for (const item of state.tierData[tier]) {
      const img = imageCache.get(item.src);
      width += getImageDisplayWidth(img) + imageGap;
    }
    return width > 0 ? width - imageGap : 0; // Remove last gap
  }

  const maxRowWidth = Math.max(
    ...tiers.map(tier => getTierRowWidth(tier)),
    400 - padding * 2 // Minimum content width
  );
  const contentWidth = maxRowWidth + padding * 2;
  const totalWidth = tierLabelWidth + contentWidth + padding * 2;
  const totalHeight = tiers.length * (rowHeight + rowGap) + padding * 2 - rowGap;

  // Create canvas at 6x resolution
  const canvas = document.createElement('canvas');
  canvas.width = totalWidth * scale;
  canvas.height = totalHeight * scale;
  const ctx = canvas.getContext('2d');

  // Scale context for high-res rendering
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // Draw each tier
  let y = padding;
  for (const tier of tiers) {
    const x = padding;

    // Draw tier label background
    ctx.fillStyle = tierColors[tier];
    ctx.beginPath();
    ctx.roundRect(x, y, tierLabelWidth, rowHeight, [8, 0, 0, 8]);
    ctx.fill();

    // Draw tier label text (scale to fit)
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labelText = state.tierNames[tier];
    const maxLabelWidth = tierLabelWidth - 12; // padding on sides
    let fontSize = 18;
    ctx.font = `bold ${fontSize}px 'Nunito', sans-serif`;

    // Scale down font if text is too wide
    while (ctx.measureText(labelText).width > maxLabelWidth && fontSize > 8) {
      fontSize--;
      ctx.font = `bold ${fontSize}px 'Nunito', sans-serif`;
    }
    ctx.fillText(labelText, x + tierLabelWidth / 2, y + rowHeight / 2);

    // Draw content background
    ctx.fillStyle = colors.contentBg;
    ctx.beginPath();
    ctx.roundRect(x + tierLabelWidth, y, contentWidth, rowHeight, [0, 8, 8, 0]);
    ctx.fill();

    // Draw content border
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x + tierLabelWidth, y, contentWidth, rowHeight, [0, 8, 8, 0]);
    ctx.stroke();

    // Draw images
    let imgX = x + tierLabelWidth + padding / 2;
    const imgY = y + (rowHeight - imageHeight) / 2;

    for (const item of state.tierData[tier]) {
      const img = imageCache.get(item.src);
      if (img && img.complete && img.naturalWidth > 0) {
        const imgWidth = getImageDisplayWidth(img);

        // Draw rounded image preserving aspect ratio
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(imgX, imgY, imgWidth, imageHeight, 6);
        ctx.clip();
        ctx.drawImage(img, imgX, imgY, imgWidth, imageHeight);
        ctx.restore();

        imgX += imgWidth + imageGap;
      }
    }

    y += rowHeight + rowGap;
  }

  // Download
  const link = document.createElement('a');
  link.download = 'tier-list.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}
