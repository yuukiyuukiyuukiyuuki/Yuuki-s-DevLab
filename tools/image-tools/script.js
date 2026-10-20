/**
 * ImageCraft PRO - JavaScript
 * ブラウザ完結の高速画像リサイズ＆フォーマット一括変換
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM要素 ---
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const themeToggle = document.getElementById('theme-toggle');

  // 設定要素
  const formatButtons = document.querySelectorAll('.format-btn');
  const qualitySlider = document.getElementById('quality-slider');
  const qualityValDisplay = document.getElementById('quality-val-display');
  const qualitySettingItem = document.getElementById('quality-setting-item');
  const resizeModeSelect = document.getElementById('resize-mode');
  const customWidthWrap = document.getElementById('custom-width-wrap');
  const customWidthInput = document.getElementById('custom-width-input');
  const removeExifCheckbox = document.getElementById('remove-exif');

  // サマリー要素
  const summarySection = document.getElementById('summary-section');
  const summaryCount = document.getElementById('summary-count');
  const summaryOrigSize = document.getElementById('summary-orig-size');
  const summaryNewSize = document.getElementById('summary-new-size');
  const summarySavings = document.getElementById('summary-savings');
  const btnDownloadAll = document.getElementById('btn-download-all');
  const btnClearAll = document.getElementById('btn-clear-all');

  // ギャラリー要素
  const galleryGrid = document.getElementById('gallery-grid');
  const emptyState = document.getElementById('empty-state');
  const btnLoadSample = document.getElementById('btn-load-sample');

  // トースト
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');

  // ストレージキー（ポータル・TextMetricsと共通）
  const STORAGE_KEY_THEME = 'textmetrics_theme';

  // --- テーマ管理 ---
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 
    (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', savedTheme);

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(STORAGE_KEY_THEME, newTheme);
    showToast(`${newTheme === 'dark' ? 'ダーク' : 'ライト'}モードに切り替えました`);
  });

  // --- トースト通知 ---
  let toastTimer = null;
  function showToast(message) {
    if (toastTimer) clearTimeout(toastTimer);
    toastMsg.textContent = message;
    toast.classList.remove('hidden');
    toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2400);
  }

  // --- 状態管理 ---
  let imageList = []; // 画像アイテムの配列
  let currentFormat = 'image/webp';
  let currentQuality = 0.8;
  let currentResizeMode = 'none';
  let customMaxWidth = 1200;

  // --- フォーマットバイト数フォーマッター ---
  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  // --- 拡張子の取得 ---
  function getExtensionForMime(mime) {
    switch (mime) {
      case 'image/webp': return 'webp';
      case 'image/jpeg': return 'jpg';
      case 'image/png': return 'png';
      default: return 'bin';
    }
  }

  // --- 設定イベントリスナー ---
  // 1. フォーマット切替
  formatButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      formatButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFormat = btn.getAttribute('data-format');

      // PNGの場合は画質スライダーを非表示/無効化
      if (currentFormat === 'image/png') {
        qualitySettingItem.style.opacity = '0.4';
        qualitySettingItem.style.pointerEvents = 'none';
      } else {
        qualitySettingItem.style.opacity = '1';
        qualitySettingItem.style.pointerEvents = 'auto';
      }

      reprocessAllImages();
    });
  });

  // 2. 画質スライダー
  qualitySlider.addEventListener('input', () => {
    const val = qualitySlider.value;
    qualityValDisplay.textContent = `${val}%`;
    currentQuality = parseInt(val, 10) / 100;
  });
  qualitySlider.addEventListener('change', () => {
    reprocessAllImages();
  });

  // 3. リサイズモード
  resizeModeSelect.addEventListener('change', () => {
    currentResizeMode = resizeModeSelect.value;
    if (currentResizeMode === 'max-width') {
      customWidthWrap.classList.remove('hidden');
    } else {
      customWidthWrap.classList.add('hidden');
    }
    reprocessAllImages();
  });

  customWidthInput.addEventListener('change', () => {
    const val = parseInt(customWidthInput.value, 10);
    if (val && val >= 50) {
      customMaxWidth = val;
      reprocessAllImages();
    }
  });

  removeExifCheckbox.addEventListener('change', () => {
    reprocessAllImages();
  });

  // --- ドラッグ＆ドロップ ---
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      handleFiles(Array.from(fileInput.files));
      fileInput.value = ''; // リセット
    }
  });

  // --- ファイル受け取り処理 ---
  function handleFiles(files) {
    const validImages = files.filter(f => f.type.startsWith('image/'));
    if (validImages.length === 0) {
      showToast('画像ファイルを選択してください');
      return;
    }

    showToast(`${validImages.length} 枚の画像を読み込み中...`);

    validImages.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const item = {
            id: 'img_' + Math.random().toString(36).substring(2, 9),
            file: file,
            originalName: file.name,
            originalSize: file.size,
            originalWidth: img.naturalWidth,
            originalHeight: img.naturalHeight,
            originalType: file.type,
            imageElement: img,
            convertedBlob: null,
            convertedUrl: null,
            convertedSize: 0,
            convertedWidth: 0,
            convertedHeight: 0,
            savingsPercent: 0
          };
          imageList.push(item);
          processSingleImage(item).then(() => {
            updateUI();
          });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // --- 単一画像の変換処理 (Canvas API) ---
  function processSingleImage(item) {
    return new Promise((resolve) => {
      const img = item.imageElement;
      let targetW = img.naturalWidth;
      let targetH = img.naturalHeight;

      // リサイズ計算
      if (currentResizeMode === 'scale-75') {
        targetW = Math.round(img.naturalWidth * 0.75);
        targetH = Math.round(img.naturalHeight * 0.75);
      } else if (currentResizeMode === 'scale-50') {
        targetW = Math.round(img.naturalWidth * 0.5);
        targetH = Math.round(img.naturalHeight * 0.5);
      } else if (currentResizeMode === 'scale-25') {
        targetW = Math.round(img.naturalWidth * 0.25);
        targetH = Math.round(img.naturalHeight * 0.25);
      } else if (currentResizeMode === 'max-width') {
        if (img.naturalWidth > customMaxWidth) {
          const ratio = customMaxWidth / img.naturalWidth;
          targetW = customMaxWidth;
          targetH = Math.round(img.naturalHeight * ratio);
        }
      }

      // 最小サイズの安全ガード
      targetW = Math.max(1, targetW);
      targetH = Math.max(1, targetH);

      // Canvas作成
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      // 背景透過対応（JPEGの場合は白背景で塗りつぶす）
      if (currentFormat === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);
      }

      // 高品質リサンプリング
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);

      // Blob化（EXIFは描画時に自然消滅してピクセルデータのみが残る）
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve();
          return;
        }

        if (item.convertedUrl) {
          URL.revokeObjectURL(item.convertedUrl);
        }

        item.convertedBlob = blob;
        item.convertedUrl = URL.createObjectURL(blob);
        item.convertedSize = blob.size;
        item.convertedWidth = targetW;
        item.convertedHeight = targetH;

        // 削減率計算
        const diff = item.originalSize - blob.size;
        item.savingsPercent = Math.round((diff / item.originalSize) * 100);

        resolve(item);
      }, currentFormat, currentQuality);
    });
  }

  // --- すべての画像を現在の設定で再変換 ---
  async function reprocessAllImages() {
    if (imageList.length === 0) return;
    for (const item of imageList) {
      await processSingleImage(item);
    }
    updateUI();
  }

  // --- UI全体の更新 ---
  function updateUI() {
    if (imageList.length === 0) {
      emptyState.classList.remove('hidden');
      summarySection.classList.add('hidden');
      galleryGrid.innerHTML = '';
      return;
    }

    emptyState.classList.add('hidden');
    summarySection.classList.remove('hidden');

    // 統計計算
    let totalOrig = 0;
    let totalNew = 0;

    galleryGrid.innerHTML = '';

    imageList.forEach(item => {
      totalOrig += item.originalSize;
      totalNew += item.convertedSize;

      // カード要素の生成
      const card = createCardElement(item);
      galleryGrid.appendChild(card);
    });

    // サマリー表示
    summaryCount.textContent = `${imageList.length} 枚`;
    summaryOrigSize.textContent = formatBytes(totalOrig);
    summaryNewSize.textContent = formatBytes(totalNew);

    const totalDiff = totalOrig - totalNew;
    const totalSavingsPct = totalOrig > 0 ? Math.round((totalDiff / totalOrig) * 100) : 0;

    if (totalSavingsPct >= 0) {
      summarySavings.textContent = `-${totalSavingsPct}% 削減！`;
      summarySavings.style.color = 'var(--accent-primary)';
      summarySavings.style.background = 'rgba(16, 185, 129, 0.2)';
    } else {
      summarySavings.textContent = `+${Math.abs(totalSavingsPct)}% 増加`;
      summarySavings.style.color = 'var(--accent-amber)';
      summarySavings.style.background = 'rgba(245, 158, 11, 0.2)';
    }
  }

  // --- カードDOM生成 ---
  function createCardElement(item) {
    const card = document.createElement('article');
    card.className = 'image-card';
    card.id = `card_${item.id}`;

    // 出力ファイル名
    const dotIdx = item.originalName.lastIndexOf('.');
    const baseName = dotIdx !== -1 ? item.originalName.substring(0, dotIdx) : item.originalName;
    const ext = getExtensionForMime(currentFormat);
    const newFilename = `${baseName}_converted.${ext}`;

    const savingsBadgeClass = item.savingsPercent >= 0 ? 'badge-diff' : 'badge-diff negative';
    const savingsText = item.savingsPercent >= 0 ? `-${item.savingsPercent}%` : `+${Math.abs(item.savingsPercent)}%`;

    card.innerHTML = `
      <div class="card-preview">
        <img src="${item.convertedUrl || item.imageElement.src}" alt="${item.originalName}" class="card-img" loading="lazy">
        <span class="${savingsBadgeClass}">${savingsText}</span>
      </div>
      <div class="card-info">
        <div class="card-title-row">
          <span class="card-filename" title="${item.originalName}">${item.originalName}</span>
          <span class="card-dims">${item.convertedWidth}×${item.convertedHeight}</span>
        </div>
        <div class="card-metrics-table">
          <div class="metric-col">
            <span class="metric-label">元サイズ</span>
            <span class="metric-val">${formatBytes(item.originalSize)}</span>
          </div>
          <div class="metric-col">
            <span class="metric-label">変換後 (${ext.toUpperCase()})</span>
            <span class="metric-val green">${formatBytes(item.convertedSize)}</span>
          </div>
        </div>
        <div class="card-actions">
          <a href="${item.convertedUrl}" download="${newFilename}" class="card-dl-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>保存</span>
          </a>
          <button class="card-del-btn" title="この画像を削除" data-id="${item.id}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    // 削除ボタン
    const delBtn = card.querySelector('.card-del-btn');
    delBtn.addEventListener('click', () => {
      deleteImage(item.id);
    });

    return card;
  }

  // --- 画像削除 ---
  function deleteImage(id) {
    const idx = imageList.findIndex(item => item.id === id);
    if (idx !== -1) {
      URL.revokeObjectURL(imageList[idx].convertedUrl);
      imageList.splice(idx, 1);
      updateUI();
      showToast('画像を削除しました');
    }
  }

  // --- 全消去 ---
  btnClearAll.addEventListener('click', () => {
    if (confirm('読み込んだすべての画像を消去しますか？')) {
      imageList.forEach(item => {
        if (item.convertedUrl) URL.revokeObjectURL(item.convertedUrl);
      });
      imageList = [];
      updateUI();
      showToast('すべての画像をクリアしました');
    }
  });

  // --- 一括ダウンロード（ZIP圧縮 または 順次保存） ---
  btnDownloadAll.addEventListener('click', async () => {
    if (imageList.length === 0) return;

    // JSZipが使える場合
    if (typeof JSZip !== 'undefined') {
      try {
        showToast('ZIPアーカイブを作成中...');
        const zip = new JSZip();
        const ext = getExtensionForMime(currentFormat);

        imageList.forEach((item, index) => {
          const dotIdx = item.originalName.lastIndexOf('.');
          const baseName = dotIdx !== -1 ? item.originalName.substring(0, dotIdx) : item.originalName;
          const fileName = `${baseName}_converted.${ext}`;
          zip.file(fileName, item.convertedBlob);
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = zipUrl;
        a.download = `ImageCraft_converted_${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(zipUrl), 2000);
        showToast('ZIPファイルのダウンロードを開始しました！');
        return;
      } catch (err) {
        console.warn('JSZip failed, fallback to sequential download:', err);
      }
    }

    // フォールバック: 順次ダウンロード
    showToast('順次ダウンロードを開始します...');
    const ext = getExtensionForMime(currentFormat);
    imageList.forEach((item, index) => {
      setTimeout(() => {
        const dotIdx = item.originalName.lastIndexOf('.');
        const baseName = dotIdx !== -1 ? item.originalName.substring(0, dotIdx) : item.originalName;
        const fileName = `${baseName}_converted.${ext}`;
        const a = document.createElement('a');
        a.href = item.convertedUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, index * 250);
    });
  });

  // --- サンプル画像生成（ワンクリックお試し） ---
  btnLoadSample.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');

    // リッチな背景グラデーション
    const grad = ctx.createLinearGradient(0, 0, 1600, 1000);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#064e3b');
    grad.addColorStop(1, '#0891b2');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1600, 1000);

    // デコレーション円
    ctx.beginPath();
    ctx.arc(400, 300, 250, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(1200, 700, 350, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
    ctx.fill();

    // テキスト描画
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("Yuuki's DevLab — ImageCraft", 800, 480);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = '500 36px sans-serif';
    ctx.fillText('Sample Ultra HD Image (1600×1000) for Compression Test', 800, 560);

    canvas.toBlob((blob) => {
      const file = new File([blob], 'sample_artwork_1600x1000.png', { type: 'image/png' });
      handleFiles([file]);
      showToast('サンプル画像を生成・読み込みました！');
    }, 'image/png');
  });

  // --- モーダル制御（使い方ガイド & 開発者支援） ---
  const modalBackdrop = document.getElementById('modal-backdrop');
  const modalTitle = document.getElementById('modal-title');
  const modalContent = document.getElementById('modal-content');
  const modalClose = document.getElementById('modal-close');
  const guideToggle = document.getElementById('guide-toggle');
  const supportToggle = document.getElementById('support-toggle');
  const footerGuideBtn = document.getElementById('footer-guide-btn');
  const footerSupportBtn = document.getElementById('footer-support-btn');

  function openModal(title, html) {
    modalTitle.textContent = title;
    modalContent.innerHTML = html;
    modalBackdrop.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalBackdrop.classList.add('hidden');
    document.body.style.overflow = '';
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalBackdrop.classList.contains('hidden')) {
      closeModal();
    }
  });

  // 使い方ガイドモーダル
  function showGuideModal() {
    openModal('📖 ImageCraft PRO 使い方ガイド', `
      <h4>1. 基本的な使い方</h4>
      <ol style="padding-left: 20px; margin-bottom: 12px;">
        <li>上部の点線エリア（ドロップゾーン）に画像をドラッグ＆ドロップ（またはクリックして選択）します。複数画像の一括読み込みにも対応しています。</li>
        <li>「変換・リサイズ設定」パネルで、お好みの<strong>フォーマット（WebP / JPEG / PNG）</strong>、<strong>画質</strong>、<strong>縮小サイズ</strong>を選択します。</li>
        <li>設定を変更すると、読み込んだ全画像が<strong>リアルタイムで再計算</strong>され、予想削減率や変換後サイズが即座にプレビューされます。</li>
        <li>「一括ダウンロード (ZIP)」ボタンを押すと、すべての変換後画像がZIPファイルにまとまって保存されます（個別ダウンロードも可能です）。</li>
      </ol>

      <h4>2. おすすめのフォーマット選び</h4>
      <ul>
        <li><strong>WebP（おすすめ）</strong>: Google開発の高圧縮フォーマット。PNGやJPEGに比べて大幅にファイルサイズを削減でき、Webサイトの表示速度改善に最適です。</li>
        <li><strong>JPEG</strong>: 写真やイラストなど一般的な用途に適した汎用フォーマットです。</li>
        <li><strong>PNG</strong>: ロゴや透過イラストなど、透明度を維持したい場合に選択してください（可逆圧縮のため画質劣化はありません）。</li>
      </ul>

      <h4>3. EXIFメタデータ自動削除機能</h4>
      <p>スマートフォンやデジタルカメラで撮影した写真には、撮影日時・位置情報（GPS）・機種名などの個人情報（EXIF）が含まれています。<br>
      ImageCraft では、<strong>Canvas再描画時にこれらのメタデータを自動的に完全除去</strong>するため、SNSやブログに写真を投稿する前のプライバシー保護対策としても最適です。</p>

      <h4>4. セキュリティとプライバシー</h4>
      <p>当ツールの画像処理は、<strong>すべてお使いのブラウザ（端末メモリ）内だけで完結</strong>します。画像データがインターネット経由で外部サーバーに送信・保存されることは一切ありませんので、業務資料やプライベート写真も安心してご利用ください。</p>
    `);
  }

  // 開発者支援（投げ銭）モーダル
  function showSupportModal() {
    openModal('☕ 開発者を支援（投げ銭）', `
      <p>ImageCraft PRO をご利用いただきありがとうございます！<br>
      当ツールは個人で開発・運営しております。もし日々の作業のお役に立てましたら、今後のサーバー維持や新機能開発の応援としてサポート（投げ銭）をいただけますと大変励みになります！</p>

      <!-- PayPay 支援カード -->
      <div class="support-card paypay-card">
        <div class="support-card-header">
          <div class="support-badge paypay">PayPay 送金</div>
          <span class="support-note">100円〜応援いただけます</span>
        </div>
        <p class="support-card-desc">PayPayアプリの「送る」機能から、以下のID宛てにご支援いただけます。</p>
        <div class="copy-box">
          <span class="copy-label">PayPay ID:</span>
          <code class="copy-value" id="paypay-id">yuuki_yuuki_pay</code>
          <button type="button" class="copy-btn" id="btn-copy-paypay" title="IDをコピー">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
            コピー
          </button>
        </div>
      </div>

      <!-- その他の支援プラットフォーム -->
      <h4 style="margin-top: 20px;">その他の支援方法</h4>
      <div class="support-grid">
        <a href="https://www.buymeacoffee.com" target="_blank" rel="noopener noreferrer" class="support-platform-btn bmc" title="Buy Me a Coffee">
          <span>☕ Buy Me a Coffee</span>
        </a>
        <a href="https://ko-fi.com" target="_blank" rel="noopener noreferrer" class="support-platform-btn kofi" title="Ko-fi">
          <span>❤️ Ko-fi で支援</span>
        </a>
        <a href="https://www.amazon.co.jp/hz/wishlist/ls" target="_blank" rel="noopener noreferrer" class="support-platform-btn amazon" title="Amazon 欲しいものリスト">
          <span>🎁 Amazon 欲しいものリスト</span>
        </a>
      </div>
      <p style="font-size: 0.78rem; color: var(--text-dim); margin-top: 14px; text-align: center;">温かいお気持ちと応援、本当にありがとうございます！✨</p>
    `);

    // PayPay ID コピーボタン
    const btnCopyPayPay = document.getElementById('btn-copy-paypay');
    if (btnCopyPayPay) {
      btnCopyPayPay.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText('yuuki_yuuki_pay');
          showToast('PayPay ID (yuuki_yuuki_pay) をコピーしました！');
        } catch (e) {
          showToast('ID: yuuki_yuuki_pay');
        }
      });
    }
  }

  if (guideToggle) guideToggle.addEventListener('click', showGuideModal);
  if (footerGuideBtn) footerGuideBtn.addEventListener('click', showGuideModal);
  if (supportToggle) supportToggle.addEventListener('click', showSupportModal);
  if (footerSupportBtn) footerSupportBtn.addEventListener('click', showSupportModal);
});
