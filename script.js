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
    unranked: []
  },
  tierNames: { S: 'S', A: 'A', B: 'B', C: 'C', D: 'D' },
  isStreamerMode: false,
  tableWidth: 1152,
  draggedItem: null,
  draggedFromTier: null,
  dropTarget: null // { id, position: 'left' | 'right' }
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
  streamerModeBtn: null,
  resizeHandle: null,
  modalOverlay: null,
  modalCancelBtn: null,
  modalConfirmBtn: null
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
  elements.streamerModeBtn = document.getElementById('streamerModeBtn');
  elements.resizeHandle = document.getElementById('resizeHandle');
  elements.modalOverlay = document.getElementById('modalOverlay');
  elements.modalCancelBtn = document.getElementById('modalCancelBtn');
  elements.modalConfirmBtn = document.getElementById('modalConfirmBtn');
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

// ========================================
// Rendering
// ========================================

function render() {
  renderTiers();
  renderItems();
  updateContainerStyles();
  updateButtonStates();
}

function renderTiers() {
  const tiers = ['S', 'A', 'B', 'C', 'D'];

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

  // Attach drag/drop listeners to tier contents
  elements.tierTable.querySelectorAll('.tier-content').forEach(content => {
    content.addEventListener('dragover', handleDragOver);
    content.addEventListener('dragleave', handleDragLeave);
    content.addEventListener('drop', handleDrop);
  });

  // Attach image item listeners
  attachImageItemListeners(elements.tierTable);

  // Update tier label widths
  updateTierLabelWidths();
}

function renderItems() {
  elements.itemsGrid.innerHTML = state.tierData.unranked
    .map(item => createImageItemHTML(item, 'unranked'))
    .join('');

  // Show/hide placeholder
  const hasItems = state.tierData.unranked.length > 0;
  elements.dropPlaceholder.classList.toggle('hidden', hasItems);

  // Attach image item listeners
  attachImageItemListeners(elements.itemsGrid);
}

function createImageItemHTML(item, tier) {
  return `
    <div class="image-item" draggable="true" data-id="${item.id}" data-tier="${tier}">
      <img src="${item.src}" alt="${item.name}">
      <button class="delete-btn" data-id="${item.id}" data-tier="${tier}" aria-label="Remove ${item.name}">×</button>
    </div>
  `;
}

function attachImageItemListeners(container) {
  container.querySelectorAll('.image-item').forEach(item => {
    item.addEventListener('dragstart', handleImageDragStart);
    item.addEventListener('dragend', handleImageDragEnd);
    item.addEventListener('dragover', handleImageDragOver);
    item.addEventListener('dragleave', handleImageDragLeave);
  });

  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', handleDeleteImage);
  });
}

function updateContainerStyles() {
  elements.container.style.width = `${state.tableWidth}px`;
  elements.container.classList.toggle('streamer-mode', state.isStreamerMode);
  elements.streamerModeBtn.textContent = state.isStreamerMode ? 'Exit Streamer Mode' : 'Streamer Mode';
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
  elements.streamerModeBtn.addEventListener('click', toggleStreamerMode);

  // Modal buttons
  elements.modalCancelBtn.addEventListener('click', hideModal);
  elements.modalConfirmBtn.addEventListener('click', confirmResetEverything);
  elements.modalOverlay.addEventListener('click', (e) => {
    if (e.target === elements.modalOverlay) hideModal();
  });

  // Resize handle
  elements.resizeHandle.addEventListener('mousedown', handleResizeStart);

  // Prevent default drag behavior on document
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => e.preventDefault());

  // Escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.modalOverlay.classList.contains('visible')) {
      hideModal();
    }
  });
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

function handleImageDragStart(e) {
  const item = e.target.closest('.image-item');
  state.draggedItem = item.dataset.id;
  state.draggedFromTier = item.dataset.tier;
  item.classList.add('dragging');

  // Random rotation between 2-5 degrees, left or right
  const rotation = (2 + Math.random() * 3) * (Math.random() < 0.5 ? -1 : 1);
  item.style.transform = `scale(1.12) rotate(${rotation}deg)`;

  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', item.dataset.id);
}

function handleImageDragEnd(e) {
  const item = e.target.closest('.image-item');
  if (item) {
    item.classList.remove('dragging');
    item.style.transform = '';
  }
  state.draggedItem = null;
  state.draggedFromTier = null;
  state.dropTarget = null;
  clearDropIndicators();
}

function handleImageDragOver(e) {
  e.preventDefault();
  e.stopPropagation();

  if (!state.draggedItem) return;

  const item = e.currentTarget;
  const itemId = item.dataset.id;

  // Don't show indicator on the item being dragged
  if (itemId === state.draggedItem) return;

  const rect = item.getBoundingClientRect();
  const midpoint = rect.left + rect.width / 2;
  const position = e.clientX < midpoint ? 'left' : 'right';

  // Only update if changed
  if (!state.dropTarget || state.dropTarget.id !== itemId || state.dropTarget.position !== position) {
    clearDropIndicators();
    state.dropTarget = { id: itemId, position };
    item.classList.add(`drop-${position}`);
  }
}

function handleImageDragLeave(e) {
  const item = e.currentTarget;
  item.classList.remove('drop-left', 'drop-right');

  // Clear drop target if leaving this item
  if (state.dropTarget && state.dropTarget.id === item.dataset.id) {
    state.dropTarget = null;
  }
}

function clearDropIndicators() {
  document.querySelectorAll('.image-item').forEach(item => {
    item.classList.remove('drop-left', 'drop-right');
  });
}

function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  clearDropIndicators();

  if (!state.draggedItem) return;

  const toTier = e.currentTarget.dataset.tier;
  const fromTier = state.draggedFromTier;

  // Calculate insertion index based on drop target
  let insertIndex = -1;
  if (state.dropTarget) {
    const targetIndex = state.tierData[toTier].findIndex(img => img.id === state.dropTarget.id);
    if (targetIndex !== -1) {
      insertIndex = state.dropTarget.position === 'left' ? targetIndex : targetIndex + 1;
    }
  }

  moveItem(state.draggedItem, fromTier, toTier, insertIndex);
  state.dropTarget = null;
}

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
  clearDropIndicators();

  // Check if dropping an existing item
  if (state.draggedItem) {
    // Calculate insertion index based on drop target
    let insertIndex = -1;
    if (state.dropTarget) {
      const targetIndex = state.tierData.unranked.findIndex(img => img.id === state.dropTarget.id);
      if (targetIndex !== -1) {
        insertIndex = state.dropTarget.position === 'left' ? targetIndex : targetIndex + 1;
      }
    }

    moveItem(state.draggedItem, state.draggedFromTier, 'unranked', insertIndex);
    state.dropTarget = null;
    return;
  }

  // Handle file drops
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

function compressImage(file, maxWidth = 150, maxHeight = 150, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Background color based on color scheme
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      ctx.fillStyle = isDarkMode ? '#1e293b' : '#ffffff';
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
    ...state.tierData.unranked
  ];

  state.tierData = {
    S: [],
    A: [],
    B: [],
    C: [],
    D: [],
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
    unranked: []
  };
  state.tableWidth = 1152;

  saveToStorage();
  saveTableWidth();
  render();
}

// ========================================
// Streamer Mode
// ========================================

function toggleStreamerMode() {
  state.isStreamerMode = !state.isStreamerMode;
  saveStreamerMode();
  updateContainerStyles();
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
  const tiers = ['S', 'A', 'B', 'C', 'D'];
  const tierColors = {
    S: '#dc2626',
    A: '#ea580c',
    B: '#ca8a04',
    C: '#16a34a',
    D: '#2563eb'
  };

  // Settings
  const scale = 6; // 6x resolution for crisp export
  const padding = 16;
  const tierLabelWidth = 80;
  const imageSize = 64;
  const imageGap = 6;
  const rowHeight = 80;
  const rowGap = 4;

  // Calculate dimensions
  const maxImagesInRow = Math.max(
    ...tiers.map(tier => state.tierData[tier].length),
    1
  );
  const contentWidth = Math.max(400, maxImagesInRow * (imageSize + imageGap) + padding * 2);
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
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  ctx.fillStyle = isDarkMode ? '#0f172a' : '#f8fafc';
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // Load all images first
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
    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;

    // Scale down font if text is too wide
    while (ctx.measureText(labelText).width > maxLabelWidth && fontSize > 8) {
      fontSize--;
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
    }
    ctx.fillText(labelText, x + tierLabelWidth / 2, y + rowHeight / 2);

    // Draw content background
    ctx.fillStyle = isDarkMode ? '#1e293b' : '#ffffff';
    ctx.beginPath();
    ctx.roundRect(x + tierLabelWidth, y, contentWidth, rowHeight, [0, 8, 8, 0]);
    ctx.fill();

    // Draw content border
    ctx.strokeStyle = isDarkMode ? '#334155' : '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x + tierLabelWidth, y, contentWidth, rowHeight, [0, 8, 8, 0]);
    ctx.stroke();

    // Draw images
    let imgX = x + tierLabelWidth + padding / 2;
    const imgY = y + (rowHeight - imageSize) / 2;

    for (const item of state.tierData[tier]) {
      const img = imageCache.get(item.src);
      if (img && img.complete && img.naturalWidth > 0) {
        // Draw rounded image with "cover" behavior (maintain aspect ratio)
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(imgX, imgY, imageSize, imageSize, 6);
        ctx.clip();

        // Calculate cover dimensions
        const imgAspect = img.naturalWidth / img.naturalHeight;
        let srcX = 0, srcY = 0, srcW = img.naturalWidth, srcH = img.naturalHeight;

        if (imgAspect > 1) {
          // Image is wider - crop sides
          srcW = img.naturalHeight;
          srcX = (img.naturalWidth - srcW) / 2;
        } else if (imgAspect < 1) {
          // Image is taller - crop top/bottom
          srcH = img.naturalWidth;
          srcY = (img.naturalHeight - srcH) / 2;
        }

        ctx.drawImage(img, srcX, srcY, srcW, srcH, imgX, imgY, imageSize, imageSize);
        ctx.restore();
      }
      imgX += imageSize + imageGap;
    }

    y += rowHeight + rowGap;
  }

  // Download
  const link = document.createElement('a');
  link.download = 'tier-list.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}
