/**
 * 生年月日 相棒ポケモン診断 Webアプリケーション
 */

// タイプ情報の日本語マッピングおよびカラー定義
const TYPE_MAP = {
  normal:   { ja: 'ノーマル', color: '#9fa19f' },
  fire:     { ja: 'ほのお',   color: '#e62829' },
  water:    { ja: 'みず',     color: '#2980ef' },
  grass:    { ja: 'くさ',     color: '#3fa129' },
  electric: { ja: 'でんき',   color: '#fac000' },
  ice:      { ja: 'こおり',   color: '#3dcef3' },
  fighting: { ja: 'かくとう', color: '#ff8000' },
  poison:   { ja: 'どく',     color: '#9141cb' },
  ground:   { ja: 'じめん',   color: '#915121' },
  flying:   { ja: 'ひこう',   color: '#81b9ef' },
  psychic:  { ja: 'エスパー', color: '#ef4179' },
  bug:      { ja: 'むし',     color: '#91a119' },
  rock:     { ja: 'いわ',     color: '#afa981' },
  ghost:    { ja: 'ゴースト', color: '#704170' },
  dragon:   { ja: 'ドラゴン', color: '#5060e1' },
  steel:    { ja: 'はがね',   color: '#60a1b8' },
  fairy:    { ja: 'フェアリー', color: '#ef70ef' },
  dark:     { ja: 'あく',     color: '#50413f' },
  stellar:  { ja: 'ステラ',   color: '#3dcef3' },
  unknown:  { ja: '？？？',   color: '#68a090' }
};

// DOM要素
const form = document.getElementById('diagnosisForm');
const birthDateInput = document.getElementById('birthDate');
const submitBtn = document.getElementById('submitBtn');
const loadingSection = document.getElementById('loadingSection');
const errorSection = document.getElementById('errorSection');
const errorTitle = document.getElementById('errorTitle');
const errorMessage = document.getElementById('errorMessage');
const retryBtn = document.getElementById('retryBtn');
const resultSection = document.getElementById('resultSection');

// カード内DOM
const pokemonCard = document.getElementById('pokemonCard');
const cardDexNumber = document.getElementById('cardDexNumber');
const cardPokemonName = document.getElementById('cardPokemonName');
const cardPokemonGenus = document.getElementById('cardPokemonGenus');
const cardTypes = document.getElementById('cardTypes');
const cardImage = document.getElementById('cardImage');
const imageHalo = document.getElementById('imageHalo');
const cardFlavorText = document.getElementById('cardFlavorText');
const calcFormulaChip = document.getElementById('calcFormulaChip');

// 音声再生
const playCryBtn = document.getElementById('playCryBtn');
const cryText = document.getElementById('cryText');
const cryAudio = document.getElementById('cryAudio');
const soundWave = document.getElementById('soundWave');

// シェア・リセット
const shareTwitterBtn = document.getElementById('shareTwitterBtn');
const copyResultBtn = document.getElementById('copyResultBtn');
const copyBtnIcon = document.getElementById('copyBtnIcon');
const copyBtnText = document.getElementById('copyBtnText');
const resetBtn = document.getElementById('resetBtn');

// 状態管理
let currentPokemonData = null;
let lastCalculatedId = null;
let lastBirthDateFormatted = '';

// 初期処理
document.addEventListener('DOMContentLoaded', () => {
  // デフォルトで初代赤・緑の発売日（1996-02-27）を設定
  if (!birthDateInput.value) {
    birthDateInput.value = '1996-02-27';
  }

  // イベントリスナー登録
  form.addEventListener('submit', handleFormSubmit);
  retryBtn.addEventListener('click', () => {
    if (birthDateInput.value) {
      startDiagnosis(birthDateInput.value);
    }
  });
  resetBtn.addEventListener('click', handleReset);
  playCryBtn.addEventListener('click', handlePlayCry);
  cryAudio.addEventListener('ended', onAudioEnded);
  cryAudio.addEventListener('error', onAudioError);
  copyResultBtn.addEventListener('click', handleCopyResult);
});

/**
 * フォーム送信ハンドラ
 */
function handleFormSubmit(e) {
  e.preventDefault();
  const dateValue = birthDateInput.value;
  if (!dateValue) return;

  startDiagnosis(dateValue);
}

/**
 * 生年月日からIDを計算
 * @param {string} dateString - "YYYY-MM-DD"
 * @returns {{ id: number, rawDigits: string }}
 */
function calculatePokemonId(dateString) {
  const rawDigits = dateString.replace(/[^0-9]/g, '');
  const num = parseInt(rawDigits, 10);
  if (isNaN(num) || num <= 0) {
    throw new Error('生年月日が正しくありません。');
  }

  // 1〜1025の図鑑番号を算出（余り0の場合は1025）
  const id = (num % 1025) || 1025;
  return { id, rawDigits };
}

/**
 * 診断開始
 */
async function startDiagnosis(dateString) {
  hideError();
  hideResult();
  showLoading();

  try {
    const { id, rawDigits } = calculatePokemonId(dateString);
    lastCalculatedId = id;
    lastBirthDateFormatted = dateString;

    // PokéAPIから2つのエンドポイントを並行取得
    const [pokemonData, speciesData] = await fetchPokeApiData(id);

    // 取得したデータを整形
    const parsed = parsePokemonData(pokemonData, speciesData, id, rawDigits);
    currentPokemonData = parsed;

    // UIへ描画
    renderPokemonCard(parsed);

    // シェア用リンク・テキスト更新
    updateShareLinks(parsed);

    hideLoading();
    showResult();

    // 結果位置までスムーズにスクロール
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    console.error('Diagnosis error:', err);
    hideLoading();
    showError(
      'ポケモンのデータ取得に失敗しました',
      'PokéAPIとの通信でエラーが発生したか、無効な日付です。ネットワーク接続をお確かめのうえ、もう一度お試しください。'
    );
  }
}

/**
 * PokéAPIからデータを並行フェッチ
 */
async function fetchPokeApiData(id) {
  const pokemonPromise = fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then(res => {
    if (!res.ok) throw new Error(`Pokemon endpoint failed (${res.status})`);
    return res.json();
  });

  const speciesPromise = fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`).then(res => {
    if (!res.ok) throw new Error(`Pokemon-species endpoint failed (${res.status})`);
    return res.json();
  });

  return await Promise.all([pokemonPromise, speciesPromise]);
}

/**
 * APIレスポンスを画面表示用に整形
 */
function parsePokemonData(pokemon, species, id, rawDigits) {
  // 1. 図鑑番号表示（No.0001〜No.1025）
  const dexNumber = `No.${String(id).padStart(4, '0')}`;

  // 2. 日本語名
  // language.name === 'ja'（漢字混じり）を優先、次に 'ja-Hrkt'、無ければ英語名
  let jaName = '';
  const jaNameObj = species.names.find(n => n.language.name === 'ja');
  const hrktNameObj = species.names.find(n => n.language.name === 'ja-Hrkt');
  if (jaNameObj) {
    jaName = jaNameObj.name;
  } else if (hrktNameObj) {
    jaName = hrktNameObj.name;
  } else {
    // 英語名をキャピタライズ
    jaName = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
  }

  // 3. 分類（例: ひのうまポケモン）
  let genus = '';
  const jaGenusObj = species.genera.find(g => g.language.name === 'ja');
  const hrktGenusObj = species.genera.find(g => g.language.name === 'ja-Hrkt');
  if (jaGenusObj) {
    genus = jaGenusObj.genus;
  } else if (hrktGenusObj) {
    genus = hrktGenusObj.genus;
  }

  // 4. 公式イラスト
  const officialArtwork = pokemon.sprites?.other?.['official-artwork']?.front_default 
    || pokemon.sprites?.front_default 
    || '';

  // 5. 鳴き声
  const cryUrl = pokemon.cries?.latest || pokemon.cries?.legacy || '';

  // 6. タイプ（日本語名とカラー情報）
  const types = (pokemon.types || []).map(t => {
    const enName = t.type.name.toLowerCase();
    const info = TYPE_MAP[enName] || { ja: enName, color: '#94a3b8' };
    return {
      en: enName,
      ja: info.ja,
      color: info.color
    };
  });

  // 7. 図鑑説明文（最新世代の日本語を取得）
  let flavorText = '';
  if (Array.isArray(species.flavor_text_entries)) {
    // 最新世代を優先するため逆順（末尾から）検索
    const entries = [...species.flavor_text_entries].reverse();
    const jaEntry = entries.find(e => e.language.name === 'ja');
    const hrktEntry = entries.find(e => e.language.name === 'ja-Hrkt');

    const targetEntry = jaEntry || hrktEntry;
    if (targetEntry) {
      // 改ページ文字 \f や不要な改行・連続スペースの整形
      flavorText = sanitizeFlavorText(targetEntry.flavor_text);
    }
  }
  if (!flavorText) {
    flavorText = '図鑑説明文の記録はまだ見つかっていません。';
  }

  // 8. 計算式情報（商とあまりを明記）
  const numVal = Number(rawDigits);
  const quotient = Math.floor(numVal / 1025);
  const remainder = numVal % 1025;
  const calcText = `計算式: ${rawDigits} ÷ 1025 ＝ ${quotient} あまり ${remainder}${remainder === 0 ? '（※余り0のため No.1025）' : `（→ ${dexNumber}）`}`;

  return {
    id,
    dexNumber,
    name: jaName,
    genus,
    officialArtwork,
    cryUrl,
    types,
    flavorText,
    calcText
  };
}

/**
 * 図鑑説明文の改行や特殊文字を整形
 */
function sanitizeFlavorText(text) {
  if (!text) return '';
  return text
    .replace(/\f/g, '\n')
    .replace(/[\r]/g, '')
    .replace(/　/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();
}

/**
 * 整形したデータをカードUIに反映
 */
function renderPokemonCard(data) {
  // 基本テキスト
  cardDexNumber.textContent = data.dexNumber;
  cardPokemonName.textContent = data.name;
  cardPokemonGenus.textContent = data.genus || 'ポケモン';
  cardFlavorText.textContent = data.flavorText;
  calcFormulaChip.textContent = data.calcText;

  // タイプバッジ
  cardTypes.innerHTML = '';
  data.types.forEach(type => {
    const badge = document.createElement('span');
    badge.className = `type-badge type-${type.en}`;
    badge.style.backgroundColor = type.color;
    badge.textContent = type.ja;
    cardTypes.appendChild(badge);
  });

  // プライマリタイプの色をカードのアクセントカラーに反映
  const primaryTypeColor = data.types[0]?.color || '#ee4238';
  document.documentElement.style.setProperty('--type-accent', primaryTypeColor);
  document.documentElement.style.setProperty('--type-accent-light', hexToRgba(primaryTypeColor, 0.18));
  imageHalo.style.background = `radial-gradient(circle, ${hexToRgba(primaryTypeColor, 0.35)} 0%, rgba(255,255,255,0) 70%)`;

  // ポケモンイラスト
  cardImage.alt = `${data.name} の公式イラスト`;
  if (data.officialArtwork) {
    cardImage.src = data.officialArtwork;
    cardImage.style.display = 'block';
  } else {
    cardImage.style.display = 'none';
  }

  // 鳴き声ボタン・Audio設定
  if (data.cryUrl) {
    cryAudio.src = data.cryUrl;
    playCryBtn.disabled = false;
    playCryBtn.style.opacity = '1';
    cryText.textContent = 'なきごえをきく';
  } else {
    cryAudio.removeAttribute('src');
    playCryBtn.disabled = true;
    playCryBtn.style.opacity = '0.5';
    cryText.textContent = 'なきごえ（音声なし）';
  }
}

/**
 * 鳴き声再生処理
 */
function handlePlayCry() {
  if (!currentPokemonData?.cryUrl) return;

  if (cryAudio.paused) {
    cryAudio.currentTime = 0;
    cryAudio.play()
      .then(() => {
        playCryBtn.classList.add('playing');
        soundWave.classList.remove('hidden');
        cryText.textContent = '再生中...';
      })
      .catch(err => {
        console.warn('Audio playback error:', err);
        onAudioEnded();
      });
  } else {
    cryAudio.pause();
    cryAudio.currentTime = 0;
    onAudioEnded();
  }
}

function onAudioEnded() {
  playCryBtn.classList.remove('playing');
  soundWave.classList.add('hidden');
  cryText.textContent = 'なきごえをきく';
}

function onAudioError() {
  onAudioEnded();
  cryText.textContent = '再生できませんでした';
}

/**
 * シェア機能
 */
function updateShareLinks(data) {
  const shareUrl = window.location.href;
  const shareText = `私の生年月日から導かれた相棒ポケモンは【${data.name}】（${data.dexNumber} / ${data.genus || ''}）でした！✨\nあなたも運命の相棒ポケモンを見つけてみよう！`;
  
  // X (Twitter) Web Intent
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&hashtags=${encodeURIComponent('相棒ポケモン,Pokemon,ポケモン診断')}`;
  shareTwitterBtn.href = twitterUrl;
}

/**
 * 結果テキストコピー処理
 */
async function handleCopyResult() {
  if (!currentPokemonData) return;

  const textToCopy = `私の生年月日から導かれた相棒ポケモンは【${currentPokemonData.name}】（${currentPokemonData.dexNumber} / ${currentPokemonData.genus || ''}）でした！✨\n生年月日相棒ポケモン診断\n#相棒ポケモン #Pokemon\n${window.location.href}`;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(textToCopy);
    } else {
      // フォールバック
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
    }

    // コピー成功UI
    copyBtnIcon.textContent = '✅';
    copyBtnText.textContent = 'コピーしました！';
    setTimeout(() => {
      copyBtnIcon.textContent = '📋';
      copyBtnText.textContent = '結果テキストをコピー';
    }, 2500);
  } catch (err) {
    console.error('Failed to copy text:', err);
  }
}

/**
 * リセット処理
 */
function handleReset() {
  hideResult();
  hideError();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  birthDateInput.focus();
}

/**
 * 表示制御ヘルパー
 */
function showLoading() {
  loadingSection.classList.remove('hidden');
  submitBtn.disabled = true;
}

function hideLoading() {
  loadingSection.classList.add('hidden');
  submitBtn.disabled = false;
}

function showResult() {
  resultSection.classList.remove('hidden');
}

function hideResult() {
  resultSection.classList.add('hidden');
}

function showError(title, msg) {
  errorTitle.textContent = title;
  errorMessage.textContent = msg;
  errorSection.classList.remove('hidden');
  errorSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideError() {
  errorSection.classList.add('hidden');
}

/**
 * HEXカラーをRGBA文字列に変換するユーティリティ
 */
function hexToRgba(hex, alpha = 1) {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return `rgba(0, 0, 0, ${alpha})`;

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
