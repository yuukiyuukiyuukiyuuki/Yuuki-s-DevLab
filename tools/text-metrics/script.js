/**
 * TextMetrics Pro - JavaScript Logic
 * リアルタイム文字数カウント & 高度文章分析
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM要素 ---
  const textarea = document.getElementById('main-textarea');
  const countTotalEl = document.getElementById('count-total');
  const countNoSpaceEl = document.getElementById('count-no-space');
  const countManuscriptSheetsEl = document.getElementById('count-manuscript-sheets');
  const countManuscriptDetailEl = document.getElementById('count-manuscript-detail');
  const countReadTimeEl = document.getElementById('count-read-time');
  const countSpeakTimeEl = document.getElementById('count-speak-time');
  const countLinesEl = document.getElementById('count-lines');
  const countLinesDetailEl = document.getElementById('count-lines-detail');
  const countWordsEl = document.getElementById('count-words');
  const countParagraphsEl = document.getElementById('count-paragraphs');
  const cursorPosEl = document.getElementById('cursor-pos');

  // 文字種別内訳要素
  const barHiragana = document.getElementById('bar-hiragana');
  const barKatakana = document.getElementById('bar-katakana');
  const barKanji = document.getElementById('bar-kanji');
  const barLatin = document.getElementById('bar-latin');
  const barOther = document.getElementById('bar-other');

  const countHiragana = document.getElementById('count-hiragana');
  const countKatakana = document.getElementById('count-katakana');
  const countKanji = document.getElementById('count-kanji');
  const countLatin = document.getElementById('count-latin');
  const countOther = document.getElementById('count-other');

  // 目標文字数関連
  const targetInput = document.getElementById('target-input');
  const targetProgressContainer = document.getElementById('target-progress-bar-container');
  const progressText = document.getElementById('progress-text');
  const progressDiff = document.getElementById('progress-diff');
  const progressFill = document.getElementById('progress-fill');

  // アクションボタン
  const btnCopy = document.getElementById('btn-copy');
  const btnClear = document.getElementById('btn-clear');
  const btnSample = document.getElementById('btn-sample');
  const themeToggle = document.getElementById('theme-toggle');

  // ドロップダウン
  const formatMenuBtn = document.getElementById('format-menu-btn');
  const formatMenu = document.getElementById('format-menu');
  const btnCleanSmart = document.getElementById('btn-clean-smart');
  const btnRemoveAllSpaces = document.getElementById('btn-remove-all-spaces');
  const btnRemoveEmptyLines = document.getElementById('btn-remove-empty-lines');
  const btnTrimLines = document.getElementById('btn-trim-lines');
  const btnToHankaku = document.getElementById('btn-to-hankaku-alphanumeric');

  // トースト & ステータス
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  const saveStatus = document.getElementById('save-status');

  // ストレージ用キー
  const STORAGE_KEY_TEXT = 'textmetrics_content';
  const STORAGE_KEY_TARGET = 'textmetrics_target';
  const STORAGE_KEY_THEME = 'textmetrics_theme';

  // サンプルテキスト
  const SAMPLE_TEXT = `【吾輩は猫である】夏目漱石

吾輩は猫である。名前はまだ無い。
どこで生れたかとんと見当がつかぬ。何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。吾輩はここで始めて人間というものを見た。しかもあとで聞くとそれは書生という人間中で一番獰悪な種族であったそうだ。この書生というのは時々我々を捕えて煮て食うという話である。しかしその当時は何という考もなかったから別段恐しいとも思わなかった。

ただ彼の掌に載せられてスーと持ち上げられた時何だかフワフワした感じがあったばかりである。掌の上で少し落ちついて書生の顔を見たのがいわゆる人間というものの見始であろう。この時妙なものだと思った感じが今でも残っている。第一毛をもって装飾されべきはずの顔がつるつるしてまるで薬缶だ。その後猫にも大分逢ったがこんな片輪には一度も出会わした事がない。のみならず顔の真中があまりに突起している。そうしてその穴の中から時々ぷうぷうと煙を吹く。どうも咽せぽくて実に弱った。これが人間の飲む煙草というものである事はようやくこの頃知った。`;

  // --- テーマ初期化 ---
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

  // --- 高精度文字配列取得（サロゲートペア・絵文字考慮） ---
  function getCharacters(text) {
    if (!text) return [];
    // Intl.Segmenter がサポートされている場合は書記素クラスタ単位で分割
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });
      return Array.from(segmenter.segment(text), s => s.segment);
    }
    // フォールバック: スプレッド演算子
    return [...text];
  }

  // --- 時間フォーマット（分・秒） ---
  function formatReadingTime(seconds) {
    if (seconds <= 0) return '0秒';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    if (m === 0) return `${s}秒`;
    if (s === 0) return `${m}分`;
    return `${m}分 ${s}秒`;
  }

  // --- テキスト分析メイン処理 ---
  function analyzeText() {
    const text = textarea.value;
    const chars = getCharacters(text);
    const totalCount = chars.length;

    // 1. 総文字数
    countTotalEl.textContent = totalCount.toLocaleString();

    // 2. 文字数（スペース除く：空白・改行・タブ等を除去）
    const noSpaceText = text.replace(/\s/g, '');
    const noSpaceChars = getCharacters(noSpaceText);
    const noSpaceCount = noSpaceChars.length;
    countNoSpaceEl.textContent = noSpaceCount.toLocaleString();

    // 3. 原稿用紙換算（400文字詰め）
    if (totalCount === 0) {
      countManuscriptSheetsEl.textContent = '0';
      countManuscriptDetailEl.textContent = '0 枚と 0 文字 (0.0 枚分)';
    } else {
      const sheetsCeil = Math.ceil(totalCount / 400);
      const sheetsFloor = Math.floor(totalCount / 400);
      const remainder = totalCount % 400;
      const exactSheets = (totalCount / 400).toFixed(1);
      countManuscriptSheetsEl.textContent = sheetsCeil.toLocaleString();
      countManuscriptDetailEl.textContent = `${sheetsFloor} 枚と ${remainder} 文字 (${exactSheets} 枚分)`;
    }

    // 4. 読了時間の目安
    // 黙読: 約600字/分 = 10字/秒
    // 音読: 約350字/分 = 約5.83字/秒
    const readSeconds = totalCount / (600 / 60);
    const speakSeconds = totalCount / (350 / 60);
    countReadTimeEl.textContent = formatReadingTime(readSeconds);
    countSpeakTimeEl.textContent = `音読目安 (約350字/分): ${formatReadingTime(speakSeconds)}`;

    // 5. 行数
    if (!text) {
      countLinesEl.textContent = '0';
      countLinesDetailEl.textContent = '空行除く: 0 行';
    } else {
      const allLines = text.split(/\r\n|\r|\n/);
      const nonEmptyLines = allLines.filter(line => line.trim() !== '');
      countLinesEl.textContent = allLines.length.toLocaleString();
      countLinesDetailEl.textContent = `空行除く: ${nonEmptyLines.length.toLocaleString()} 行`;
    }

    // 6. 単語数 & 段落数 & UTF-8バイト数
    if (!text) {
      countWordsEl.textContent = '0';
      countParagraphsEl.textContent = '段落数: 0 / UTF-8: 0 Byte';
    } else {
      // 単語数: 英語単語および日本語形態のおおまかな単語カウント
      const wordsMatches = text.trim().match(/[\w\d]+|[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g);
      const wordCount = wordsMatches ? wordsMatches.length : 0;
      countWordsEl.textContent = wordCount.toLocaleString();

      // 段落数
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim() !== '');
      const pCount = paragraphs.length;

      // バイト数 (UTF-8)
      const bytes = new TextEncoder().encode(text).length;
      let byteStr = `${bytes.toLocaleString()} B`;
      if (bytes >= 1024 * 1024) {
        byteStr = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      } else if (bytes >= 1024) {
        byteStr = `${(bytes / 1024).toFixed(1)} KB`;
      }

      countParagraphsEl.textContent = `段落数: ${pCount} / UTF-8: ${byteStr}`;
    }

    // 7. 文字種別内訳（ひらがな、カタカナ、漢字、英数、その他）
    let hiragana = 0;
    let katakana = 0;
    let kanji = 0;
    let latin = 0;
    let other = 0;

    for (const char of chars) {
      if (/[\u3041-\u3096\u3099-\u309F]/.test(char)) {
        hiragana++;
      } else if (/[\u30A0-\u30FF]/.test(char)) {
        katakana++;
      } else if (/[\u4E00-\u9FFF\u3400-\u4DBF]/.test(char)) {
        kanji++;
      } else if (/[a-zA-Z0-9]/.test(char)) {
        latin++;
      } else {
        other++;
      }
    }

    const calcPercent = (count) => totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : '0';
    const hPct = calcPercent(hiragana);
    const kPct = calcPercent(katakana);
    const jPct = calcPercent(kanji);
    const lPct = calcPercent(latin);
    const oPct = calcPercent(other);

    barHiragana.style.width = `${hPct}%`;
    barKatakana.style.width = `${kPct}%`;
    barKanji.style.width = `${jPct}%`;
    barLatin.style.width = `${lPct}%`;
    barOther.style.width = `${oPct}%`;

    countHiragana.textContent = `${hiragana} (${hPct}%)`;
    countKatakana.textContent = `${katakana} (${kPct}%)`;
    countKanji.textContent = `${kanji} (${jPct}%)`;
    countLatin.textContent = `${latin} (${lPct}%)`;
    countOther.textContent = `${other} (${oPct}%)`;

    // 8. 目標文字数の進捗更新
    updateTargetProgress(totalCount);

    // 9. 自動保存
    localStorage.setItem(STORAGE_KEY_TEXT, text);
    triggerAutoSaveIndicator();
  }

  // --- 自動保存インジケータ ---
  let saveTimer = null;
  function triggerAutoSaveIndicator() {
    saveStatus.innerHTML = '<span class="status-dot"></span> 保存完了';
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveStatus.innerHTML = '<span class="status-dot"></span> 自動保存中';
    }, 1500);
  }

  // --- 目標文字数管理 ---
  function updateTargetProgress(currentLength) {
    const target = parseInt(targetInput.value, 10);
    if (!target || target <= 0) {
      targetProgressContainer.classList.add('hidden');
      return;
    }

    targetProgressContainer.classList.remove('hidden');
    const percent = Math.min(100, Math.round((currentLength / target) * 100));
    const diff = target - currentLength;

    progressText.textContent = `目標達成度: ${percent}% (${currentLength.toLocaleString()} / ${target.toLocaleString()}字)`;
    progressFill.style.width = `${percent}%`;

    if (diff > 0) {
      progressDiff.textContent = `残り ${diff.toLocaleString()}字`;
      progressDiff.style.color = 'var(--text-muted)';
      progressFill.style.background = 'linear-gradient(90deg, var(--accent-primary), var(--accent-emerald))';
    } else if (diff === 0) {
      progressDiff.textContent = `🎉 目標ちょうど達成！`;
      progressDiff.style.color = 'var(--accent-emerald)';
      progressFill.style.background = 'var(--accent-emerald)';
    } else {
      progressDiff.textContent = `超過 +${Math.abs(diff).toLocaleString()}字`;
      progressDiff.style.color = 'var(--accent-amber)';
      progressFill.style.background = 'linear-gradient(90deg, var(--accent-emerald), var(--accent-amber))';
    }
  }

  targetInput.addEventListener('input', () => {
    localStorage.setItem(STORAGE_KEY_TARGET, targetInput.value);
    const chars = getCharacters(textarea.value);
    updateTargetProgress(chars.length);
  });

  // --- カーソル位置トラッキング ---
  function updateCursorPos() {
    const pos = textarea.selectionStart;
    const textBefore = textarea.value.substring(0, pos);
    const lines = textBefore.split('\n');
    const lineNum = lines.length;
    const colNum = lines[lines.length - 1].length + 1;
    cursorPosEl.textContent = `カーソル位置: ${lineNum}行目 ${colNum}文字目`;
  }

  textarea.addEventListener('input', () => {
    analyzeText();
    updateCursorPos();
  });
  textarea.addEventListener('click', updateCursorPos);
  textarea.addEventListener('keyup', updateCursorPos);

  // --- クリップボードコピー ---
  btnCopy.addEventListener('click', async () => {
    const text = textarea.value;
    if (!text) {
      showToast('コピーするテキストがありません');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast('クリップボードにコピーしました！');
    } catch (err) {
      // フォールバック
      textarea.select();
      document.execCommand('copy');
      showToast('クリップボードにコピーしました！');
    }
  });

  // --- テキスト全消去 ---
  btnClear.addEventListener('click', () => {
    if (!textarea.value) {
      showToast('すでに空です');
      return;
    }
    if (confirm('テキストをすべて消去しますか？')) {
      textarea.value = '';
      analyzeText();
      updateCursorPos();
      showToast('すべて消去しました');
      textarea.focus();
    }
  });

  // --- サンプルテキスト挿入 ---
  btnSample.addEventListener('click', () => {
    textarea.value = SAMPLE_TEXT;
    analyzeText();
    updateCursorPos();
    showToast('サンプル文章を読み込みました');
    textarea.focus();
  });

  // --- ドロップダウンメニュー制御 ---
  formatMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = formatMenuBtn.getAttribute('aria-expanded') === 'true';
    formatMenuBtn.setAttribute('aria-expanded', !isExpanded);
    formatMenu.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!formatMenu.contains(e.target) && !formatMenuBtn.contains(e.target)) {
      formatMenu.classList.add('hidden');
      formatMenuBtn.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      formatMenu.classList.add('hidden');
      formatMenuBtn.setAttribute('aria-expanded', 'false');
    }
  });

  // --- テキスト整形関数群 ---
  function applyFormat(transformFn, successMsg) {
    const original = textarea.value;
    if (!original) {
      showToast('テキストが入力されていません');
      formatMenu.classList.add('hidden');
      return;
    }
    const result = transformFn(original);
    textarea.value = result;
    analyzeText();
    updateCursorPos();
    formatMenu.classList.add('hidden');
    showToast(successMsg);
    textarea.focus();
  }

  // 1. スマート整形（おすすめ）
  btnCleanSmart.addEventListener('click', () => {
    applyFormat((str) => {
      return str
        // 各行末尾の空白を削除
        .split('\n')
        .map(line => line.trimEnd())
        .join('\n')
        // 連続する半角・全角空白を半角スペース1個に統合（タブも含む）
        .replace(/[ \t\u3000]{2,}/g, ' ')
        // 3つ以上の連続改行を2つに（1つの空行に抑える）
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }, 'スマート整形を適用しました');
  });

  // 2. すべてのスペースを除去
  btnRemoveAllSpaces.addEventListener('click', () => {
    applyFormat((str) => {
      // 空白・タブ・全角スペースを除去（改行は保持）
      return str.replace(/[ \t\u3000]/g, '');
    }, 'すべてのスペースを除去しました');
  });

  // 3. 空行をすべて削除
  btnRemoveEmptyLines.addEventListener('click', () => {
    applyFormat((str) => {
      return str
        .split(/\r\n|\r|\n/)
        .filter(line => line.trim() !== '')
        .join('\n');
    }, '空行をすべて削除しました');
  });

  // 4. 各行の前後の空白を削除
  btnTrimLines.addEventListener('click', () => {
    applyFormat((str) => {
      return str
        .split(/\r\n|\r|\n/)
        .map(line => line.trim())
        .join('\n');
    }, '各行の前後の空白をトリムしました');
  });

  // 5. 全角英数を半角に統一
  btnToHankaku.addEventListener('click', () => {
    applyFormat((str) => {
      return str.replace(/[！-～]/g, (s) => {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
      }).replace(/　/g, ' ');
    }, '英数字・記号を半角に変換しました');
  });

  // --- 初期データのロード ---
  const savedTarget = localStorage.getItem(STORAGE_KEY_TARGET);
  if (savedTarget) {
    targetInput.value = savedTarget;
  }

  const savedText = localStorage.getItem(STORAGE_KEY_TEXT);
  if (savedText) {
    textarea.value = savedText;
  } else {
    // 初回表示時はサンプルテキストを入れておくことでリッチなUIを即座に体験可能
    textarea.value = SAMPLE_TEXT;
  }

  // 初期解析の実行
  analyzeText();
  updateCursorPos();
});
