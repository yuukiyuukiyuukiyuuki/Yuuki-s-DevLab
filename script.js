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

  const modalSupportLink = document.getElementById('modal-support-link');
  const headerSponsorBtn = document.getElementById('header-sponsor-btn');

  // プライバシーポリシーモーダル（Google AdSense 審査基準準拠）
  modalPolicyLink.addEventListener('click', (e) => {
    e.preventDefault();
    openModal('プライバシーポリシー', `
      <h4>1. 基本方針</h4>
      <p>当サイト（Yuuki's DevLab、以下「当サイト」）は、利用者のプライバシー保護を最重要事項と位置づけ、個人情報の保護に関する法律および関連法令を遵守します。</p>

      <h4>2. データの処理とプライバシー保護（完全ローカル処理）</h4>
      <p>当サイトが提供するWebツール（「TextMetrics PRO」「ImageCraft PRO」など）において、ユーザーが入力したテキスト、ファイル、画像データは、<strong>すべて利用者の端末（ブラウザ内）でのみ処理されます</strong>。外部サーバーへ送信、蓄積、解析されることは一切ありません。</p>

      <h4>3. 広告の配信について</h4>
      <p>当サイトでは、第三者配信事業者（Google AdSense等）が提供する広告配信サービスを利用する場合があります。広告配信事業者は、利用者の興味に応じたパーソナライズ広告を表示するために、Cookie（クッキー）を使用することがあります。</p>
      <p>Cookieを使用することにより、当サイトや他のウェブサイトへの過去のアクセス情報に基づいて広告が配信されます。利用者は、<a href="https://adssettings.google.com/authenticated" target="_blank" rel="noopener noreferrer" style="color: var(--accent-primary);">Google広告設定</a>にてパーソナライズ広告を無効にできます。また、ブラウザの設定によりCookieの受け入れを拒否することも可能です。</p>

      <h4>4. アクセス解析ツールについて</h4>
      <p>当サイトでは、サイトの利用状況の把握および利便性向上のため、アクセス解析ツールを利用することがあります。これらのツールはトラフィックデータ収集のためにCookieを使用しますが、収集されるデータは匿名であり、個人を特定する情報は含まれません。</p>

      <h4>5. 免責事項</h4>
      <p>当サイトに掲載されている情報や提供するツール群については、細心の注意を払って開発・管理しておりますが、正確性、完全性、最新性、安全性を保証するものではありません。当サイトおよびツールの利用によって生じた損害やトラブル等について、当サイト管理者は一切の責任を負いかねますので、あらかじめご了承ください。</p>

      <h4>6. 著作権および利用制限</h4>
      <p>当サイトに掲載されている文章、画像、デザイン、およびソースコードの著作権は、当サイト運営者に帰属します。私的使用など法律で認められた範囲を超えて、無断で複製、改変、再配布、転載、およびローカル環境への転用・商用利用を行うことを固く禁止します。</p>

      <h4>7. お問い合わせ窓口</h4>
      <p>当サイトのプライバシーポリシーやデータの取り扱いに関するお問い合わせは、お問い合わせフォームよりご連絡ください。</p>
      <p style="font-size: 0.8rem; color: var(--text-dim); margin-top: 12px;">制定日: 2026年10月13日 / 最終改定日: 2026年10月20日</p>
    `);
  });

  // お問い合わせモーダル（Googleフォーム連携）
  modalContactLink.addEventListener('click', (e) => {
    e.preventDefault();
    openModal('お問い合わせ', `
      <p>Yuuki's DevLab をご利用いただきありがとうございます！<br>
      ツールの不具合報告、改善リクエスト、新規ツールのご要望、その他ご感想などがございましたら、以下のGoogleフォームよりお気軽にお寄せください。</p>

      <div style="margin: 24px 0 16px;">
        <a href="https://forms.gle/M3uEAHQmc8RmRFLZ9" target="_blank" rel="noopener noreferrer" class="tool-link-btn" style="text-align: center; text-decoration: none; padding: 14px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          <span>Googleフォームでお問い合わせを開く</span>
        </a>
      </div>

      <h4>開発者について</h4>
      <p><strong>Yuuki (悠生)</strong> — 個人開発者</p>
      <p style="font-size: 0.8rem; color: var(--text-dim); margin-top: 8px;">※ いただいたご意見やフィードバックは、今後の新機能開発やサービス改善の参考にさせていただきます。</p>
    `);
  });

  // 開発者支援（投げ銭）モーダルを開く関数
  function showSupportModal() {
    openModal('☕ 開発者を支援（投げ銭）', `
      <p>Yuuki's DevLab のツールをご利用いただきありがとうございます！<br>
      当サイトは個人で開発・運営しております。もし「便利だった！」「応援したい！」と感じていただけましたら、サーバー維持費や今後の開発継続のためのご支援（投げ銭）をいただけますと大変励みになります！</p>

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

      <!-- その他の支援プラットフォーム（プレースホルダー） -->
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

    // PayPay ID コピーボタンのイベント登録
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

  // 支援ボタンイベント
  if (modalSupportLink) {
    modalSupportLink.addEventListener('click', (e) => {
      e.preventDefault();
      showSupportModal();
    });
  }
  if (headerSponsorBtn) {
    headerSponsorBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showSupportModal();
    });
  }

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
