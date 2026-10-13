/**
 * Yuuki's DevLab Portal - JavaScript
 * テーマ切替、リアルタイムツール検索、カテゴリフィルタ、モーダル制御
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM要素 ---
  const themeToggle = document.getElementById('theme-toggle');
  const searchInput = document.getElementById('tool-search');
  const searchClear = document.getElementById('search-clear');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const toolCards = document.querySelectorAll('.tool-card');
  const toolsCountEl = document.getElementById('tools-count');
  const noResultsEl = document.getElementById('no-results');
  const resetFilterBtn = document.getElementById('reset-filter-btn');

  // モーダル要素
  const modalBackdrop = document.getElementById('modal-backdrop');
  const modalTitle = document.getElementById('modal-title');
  const modalContent = document.getElementById('modal-content');
  const modalClose = document.getElementById('modal-close');
  const modalPolicyLink = document.getElementById('modal-policy-link');
  const modalContactLink = document.getElementById('modal-contact-link');

  // トースト要素
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');

  // ストレージキー（TextMetrics PRO と共通化して連動）
  const STORAGE_KEY_THEME = 'textmetrics_theme';

  // --- 1. テーマ管理 ---
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

  // --- 2. トースト通知 ---
  let toastTimer = null;
  function showToast(message) {
    if (toastTimer) clearTimeout(toastTimer);
    toastMsg.textContent = message;
    toast.classList.remove('hidden');
    toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2400);
  }

  // --- 3. 検索 & カテゴリフィルター ---
  let currentCategory = 'all';

  function filterTools() {
    const query = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;

    toolCards.forEach(card => {
      const category = card.getAttribute('data-category');
      const keywords = (card.getAttribute('data-keywords') || '').toLowerCase();
      const title = card.querySelector('.tool-name').textContent.toLowerCase();
      const desc = card.querySelector('.tool-desc').textContent.toLowerCase();

      // カテゴリ一致判定
      const matchesCategory = (currentCategory === 'all' || category === currentCategory);

      // 検索キーワード判定
      const matchesQuery = !query || 
        title.includes(query) || 
        desc.includes(query) || 
        keywords.includes(query);

      if (matchesCategory && matchesQuery) {
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    // カウント表示更新
    toolsCountEl.textContent = `${visibleCount} 件のツールを表示中`;

    // 検索ヒットなしの表示
    if (visibleCount === 0) {
      noResultsEl.classList.remove('hidden');
    } else {
      noResultsEl.classList.add('hidden');
    }

    // クリアボタン表示制御
    if (query) {
      searchClear.classList.remove('hidden');
    } else {
      searchClear.classList.add('hidden');
    }
  }

  // 検索入力イベント
  searchInput.addEventListener('input', filterTools);

  // 検索クリア
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    filterTools();
    searchInput.focus();
  });

  // カテゴリタブ切り替え
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.getAttribute('data-category');
      filterTools();
    });
  });

  // フィルターリセットボタン
  resetFilterBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentCategory = 'all';
    tabButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-category') === 'all'));
    filterTools();
  });

  // --- 4. ショートカットキー (Ctrl + K / Cmd + K で検索フォーカス) ---
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
    }
    if (e.key === 'Escape') {
      closeModal();
    }
  });

  // --- 5. モーダルウィンドウ制御 ---
  function openModal(title, htmlContent) {
    modalTitle.textContent = title;
    modalContent.innerHTML = htmlContent;
    modalBackdrop.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalBackdrop.classList.add('hidden');
    document.body.style.overflow = '';
  }

  modalClose.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  // プライバシーポリシーモーダル
  modalPolicyLink.addEventListener('click', (e) => {
    e.preventDefault();
    openModal('プライバシーポリシー', `
      <h4>1. 基本方針</h4>
      <p>当サイト（Yuuki's DevLab）で提供しているすべてのツールは、ユーザーのプライバシーとデータセキュリティを最優先に設計されています。</p>
      
      <h4>2. データの取り扱い</h4>
      <p>TextMetrics PRO をはじめとするすべてのツールにおいて、入力されたテキストや画像データは、お使いの端末（ブラウザ）内でのみ処理されます。外部サーバーへの送信・蓄積・解析は一切行われません。</p>

      <h4>3. ローカルストレージ（localStorage）の使用</h4>
      <p>テーマ設定（ダーク/ライトモード）やテキストの自動保存・目標値などの利便性向上のため、ブラウザ内のローカルストレージを使用しています。これらはブラウザをクリアすることでいつでも削除可能です。</p>
    `);
  });

  // お問い合わせモーダル
  modalContactLink.addEventListener('click', (e) => {
    e.preventDefault();
    openModal('お問い合わせ・フィードバック', `
      <p>ツールの不具合報告、改善アイデア、新しいツールへのリクエストなどがありましたら、お気軽にお寄せください！</p>
      
      <h4>開発者について</h4>
      <p><strong>Yuuki (悠生)</strong> — 個人開発者</p>
      
      <h4>ご連絡方法</h4>
      <p>GitHubのIssuesまたはプルリクエストにて受け付けております。</p>
      <div style="margin-top: 16px;">
        <a href="https://github.com/yuukiyuukiyuukiyuuki/Yuuki-s-DevLab" target="_blank" rel="noopener noreferrer" class="tool-link-btn" style="text-align: center;">
          GitHub リポジトリへ移動
        </a>
      </div>
    `);
  });

  // --- 6. リンクフォールバック支援 ---
  // TextMetrics PROのリンクをクリックした際、もし将来の「tools/text-metrics」にまだ移動していない場合でも
  // ユーザーが迷わないよう、確認アラートまたはアシストを用意
  const linkTextMetrics = document.getElementById('link-text-metrics');
  if (linkTextMetrics) {
    linkTextMetrics.addEventListener('click', (e) => {
      // ユーザー体験向上のため、もしtools/text-metricsが存在しない場合の案内をコンソールにも記録
      console.log('Navigating to TextMetrics PRO: ./tools/text-metrics/index.html');
    });
  }

  // 初期化実行
  filterTools();
});
