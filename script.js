// script.js

let currentDeck = [];
let currentIndex = 0;
let userStats = {}; // { card_id: { correct: 0, missed: 0, last_seen: '' } }
let currentCategory = '한자 읽기';
const STATS_KEY = 'jlpt_n3_flashcard_stats';
const PROGRESS_KEY = 'jlpt_n3_flashcard_progress';

// --- 데이터 및 상태 관리 ---

/**
 * Local Storage에서 사용자 통계를 로드합니다.
 */
function loadStats() {
    const storedStats = localStorage.getItem(STATS_KEY);
    userStats = storedStats ? JSON.parse(storedStats) : {};

    // 마지막 학습 진행 상황을 로드
    const storedProgress = localStorage.getItem(PROGRESS_KEY);
    if (storedProgress) {
        const progress = JSON.parse(storedProgress);
        currentCategory = progress.category;
        currentIndex = progress.index;
    }
}

/**
 * 사용자 통계를 Local Storage에 저장합니다.
 */
function saveStats() {
    localStorage.setItem(STATS_KEY, JSON.stringify(userStats));
}

/**
 * 현재 학습 진행 상황을 Local Storage에 저장합니다.
 */
function saveProgress() {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({
        category: currentCategory,
        index: currentIndex
    }));
}

/**
 * 카테고리에 따라 덱을 필터링하고, 자주 틀린 문제 덱을 생성합니다.
 */
function filterDeck(category) {
    if (category === 'hard_items') {
        // missed 횟수가 correct 횟수보다 2배 이상 많거나, 최소 3회 이상 틀린 카드를 필터링
        currentDeck = flashcardData.filter(card => {
            const stats = userStats[card.id] || { correct: 0, missed: 0 };
            return stats.missed >= 3 || stats.missed > stats.correct * 2;
        });
        
        // 자주 틀린 문제 덱은 항상 랜덤 섞기
        shuffleDeck(currentDeck);
    } else {
        currentDeck = flashcardData.filter(card => card.category === category);
        
        // 정렬: 이전에 틀린 카드가 앞으로 오도록 정렬 (학습 효율 증대)
        currentDeck.sort((a, b) => {
            const statsA = userStats[a.id] || { missed: 0 };
            const statsB = userStats[b.id] || { missed: 0 };
            return statsB.missed - statsA.missed; // 틀린 횟수가 많은 순서대로
        });
    }

    // 덱 변경 시 인덱스 초기화 및 상태 업데이트
    if (currentCategory !== category) {
        currentIndex = 0;
    }
    
    currentCategory = category;
    renderCard(currentIndex);
    updateStatsDisplay();
    setupCategoryTabs();
}

/**
 * 덱을 섞습니다.
 */
function shuffleDeck(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// --- UI 및 렌더링 ---

/**
 * 카드 HTML을 플립합니다.
 */
function flipCard() {
    document.getElementById('flashcard').classList.toggle('flipped');
}

/**
 * 한자 단어에 후리가나(ruby) 태그를 적용합니다.
 * (간단한 구현을 위해, japanese_term을 통째로 ruby에 넣고, reading을 rt에 넣습니다.
 *  실제로는 띄어쓰기를 기반으로 파싱 로직이 필요합니다.)
 */
function applyRuby(term, reading) {
    if (!reading || term === reading) {
        return term; // 가타카나/히라가나 단어의 경우
    }
    // 예: 発表 -> <ruby>発表<rt>はっぴょう</rt></ruby>
    return `<ruby>${term}<rt>${reading}</rt></ruby>`;
}

/**
 * 현재 인덱스의 카드를 화면에 렌더링합니다.
 */
function renderCard(index) {
    if (currentDeck.length === 0) {
        document.getElementById('card-term').innerHTML = "표시할 카드가 없습니다.";
        document.getElementById('card-category').textContent = "";
        document.getElementById('card-meaning').textContent = "다른 카테고리를 선택하거나, 자주 틀린 문제 덱을 채워주세요.";
        document.getElementById('example-jp').textContent = "";
        document.getElementById('example-kr').textContent = "";
        return;
    }

    // 인덱스 범위 확인
    currentIndex = index % currentDeck.length; 
    
    const card = currentDeck[currentIndex];
    const termWithRuby = applyRuby(card.japanese_term, card.reading);

    // Front
    document.getElementById('flashcard').classList.remove('flipped'); // 항상 앞면부터 시작
    document.getElementById('card-term').innerHTML = termWithRuby;
    document.getElementById('card-category').textContent = card.category;

    // Back
    document.getElementById('card-meaning').textContent = card.korean_meaning;
    document.getElementById('example-jp').textContent = `[예문] ${card.example_jp || '예문 준비 중'}`;
    document.getElementById('example-kr').textContent = `[해석] ${card.example_kr || '해석 준비 중'}`;
    
    // 진행 상황 저장
    saveProgress();
}

// TTS 가능한 일본어 음성을 캩0싱하여 성능 향상
let cachedJapaneseVoices = null;

// 오디오 캐싱을 위한 객체 (번번한 API 호출 방지)
const audioCache = {};

/**
 * 최적의 일본어 음성을 찾아서 반환합니다.
 */
function getBestJapaneseVoice() {
    // 캐싱된 음성이 있으면 그것을 사용
    if (cachedJapaneseVoices) {
        return cachedJapaneseVoices;
    }
    
    const voices = window.speechSynthesis.getVoices();
    const japaneseVoices = voices.filter(voice => voice.lang.includes('ja'));
    
    // 일본어 음성이 없으면 null 반환
    if (japaneseVoices.length === 0) {
        return null;
    }
    
    // 최고 품질의 음성 순위 찾기
    const premiumVoice = japaneseVoices.find(voice => 
        voice.name.includes('Google') || 
        voice.name.includes('Microsoft') || 
        voice.name.includes('Kyoko') || 
        voice.name.includes('Otoya') || 
        voice.name.includes('Premium')
    );
    
    // 결과 캐싱
    cachedJapaneseVoices = premiumVoice || japaneseVoices[0];
    return cachedJapaneseVoices;
}

/**
 * 외부 TTS API 사용을 위한 설정
 * 
 * 사용 가능한 API 개요:
 * 1. VoiceRSS API: 무료 플랜으로 일일 요청 제한이 있지만 캐싱 가능
 * 2. Google Translate TTS: 비공식이지만 고품질의 음성 제공
 * 3. Azure Speech Service: Microsoft의 음성 서비스 (신용카드 필요, 무료 할당량 제공)
 * 4. Amazon Polly: AWS의 고품질 TTS (신용카드 필요, 무료 할당량 제공)
 * 
 * 이 프로젝트에서는 페이지 로딩시 오디오 리소스를 미리 다운로드하는 방식으로 구현합니다.
 */

// VoiceRSS API 사용 예시
// API 키는 실제 발급받은 키로 바꿔야 합니다. 현재는 표시용입니다.
const VOICERSS_API_KEY = 'YOUR_API_KEY'; 

/**
 * 외부 TTS API를 사용해서 오디오 URL을 얻습니다.
 * @param {string} text - 발음할 텍스트
 * @param {string} apiKey - API 키 (선택사항)
 * @returns {string} 오디오 URL
 */
function getExternalTTSUrl(text, apiKey = VOICERSS_API_KEY) {
    // VoiceRSS API 활용 (다른 API로 변경 가능)
    return `https://api.voicerss.org/?key=${apiKey}&hl=ja-jp&v=Mizuki&src=${encodeURIComponent(text)}`;
}

/**
 * 외부 TTS API를 사용하여 발음합니다.
 * 이 함수는 API 키가 필요하므로 현재는 사용하지 않습니다.
 * 필요할 경우 아래 코드를 활성화하여 사용하세요.
 */
function speakWithExternalAPI(text) {
    // API 키가 없으면 브라우저 TTS로 폴백
    if (VOICERSS_API_KEY === 'YOUR_API_KEY') {
        console.log('외부 API 키가 없어 브라우저 TTS로 폴백합니다.');
        speakText();
        return;
    }

    // 캐싱된 오디오가 있는지 확인
    if (audioCache[text]) {
        audioCache[text].play();
        return;
    }

    const audioUrl = getExternalTTSUrl(text);
    const audio = new Audio(audioUrl);
    
    // 오디오 재생 시도
    audio.play()
        .then(() => {
            // 오디오 캐싱
            audioCache[text] = audio;
        })
        .catch(error => {
            console.error('외부 TTS API 오류:', error);
            // 실패 시 브라우저 TTS로 폴백
            speakText();
        });
}

/**
 * TTS (Text-to-Speech) 기능을 사용하여 발음합니다.
 * @param {number} rate - 선택적 매개변수: 발음 속도 (1.0이 기본)
 */
function speakText(rate = 0.9) {
    const card = currentDeck[currentIndex];
    if (!card || !window.speechSynthesis) {
        alert("브라우저가 TTS를 지원하지 않거나 카드가 로드되지 않았습니다.");
        return;
    }

    // 기존 발음 중지 (중복 발음 방지)
    window.speechSynthesis.cancel();
    
    // 음성 발음을 위한 텍스트 준비 (우선 읽기 음성이 있으면 사용)
    const textToSpeak = card.reading || card.japanese_term;
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'ja-JP';
    utterance.rate = rate; // 속도 조절 (매개변수로 전달된 값)
    utterance.pitch = 1.0; // 기본 피치
    
    // 최적의 음성 선택
    const bestVoice = getBestJapaneseVoice();
    if (bestVoice) {
        utterance.voice = bestVoice;
    }
    
    // 발음이 끝났을 때의 이벤트 처리
    utterance.onend = function() {
        console.log('발음 재생 완료');
    };
    
    window.speechSynthesis.speak(utterance);
}

/**
 * 예문을 발음합니다.
 */
function speakExample() {
    const card = currentDeck[currentIndex];
    if (!card || !card.example_jp || !window.speechSynthesis) {
        alert("예문이 없거나 TTS가 지원되지 않습니다.");
        return;
    }

    // 기존 발음 중지
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(card.example_jp);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.85; // 예문은 조금 느리게
    utterance.pitch = 1.0;
    
    // 최적의 음성 선택
    const bestVoice = getBestJapaneseVoice();
    if (bestVoice) {
        utterance.voice = bestVoice;
    }
    
    window.speechSynthesis.speak(utterance);
}

/**
 * 통계 요약을 화면에 업데이트합니다.
 */
function updateStatsDisplay() {
    const totalCorrect = Object.values(userStats).reduce((sum, stat) => sum + stat.correct, 0);
    const totalIncorrect = Object.values(userStats).reduce((sum, stat) => sum + stat.missed, 0);
    
    document.getElementById('progress').textContent = `${currentIndex + 1}/${currentDeck.length}`;
    document.getElementById('correct-count').textContent = `O ${totalCorrect}`;
    document.getElementById('incorrect-count').textContent = `X ${totalIncorrect}`;
}

/**
 * 카테고리 탭 활성화 상태를 업데이트합니다.
 */
function setupCategoryTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.category === currentCategory) {
            tab.classList.add('active');
        }
        
        tab.onclick = () => {
            const newCategory = tab.dataset.category;
            filterDeck(newCategory);
        };
    });
}

// --- 사용자 상호작용 로직 ---

/**
 * 사용자의 정/오답을 처리하고 통계를 업데이트합니다.
 * @param {boolean} isCorrect - 정답 여부
 */
function handleAnswer(isCorrect) {
    if (currentDeck.length === 0) return;

    const card = currentDeck[currentIndex];
    const id = card.id;

    // 통계 초기화 및 업데이트
    if (!userStats[id]) {
        userStats[id] = { correct: 0, missed: 0 };
    }

    if (isCorrect) {
        userStats[id].correct++;
        // 정답 시 '자주 틀린 문제' 덱에 있었다면, 틀린 횟수를 1 감소시킬 수도 있습니다.
        if (currentCategory === 'hard_items' && userStats[id].missed > 0) {
             userStats[id].missed--;
        }
    } else {
        userStats[id].missed++;
    }
    userStats[id].last_seen = new Date().toISOString().slice(0, 10);

    saveStats();
    updateStatsDisplay();

    // 다음 카드로 이동
    currentIndex++;
    if (currentIndex >= currentDeck.length) {
        alert("현재 덱의 학습을 완료했습니다. 덱을 섞거나 처음부터 다시 시작합니다.");
        currentIndex = 0;
        // 덱이 '자주 틀린 문제'라면, 통계 업데이트 후 다시 필터링하여 덱을 갱신
        if(currentCategory === 'hard_items') {
             filterDeck('hard_items'); 
        } else {
             renderCard(currentIndex);
        }
        
    } else {
        renderCard(currentIndex);
    }
}


// --- 초기화 ---

/**
 * 오디오 파일을 미리 다운로드하는 기능
 * - 외부 API와 API 키가 있을 경우에만 활성화됩니다.
 */
function preloadAudioFiles() {
    // API 키가 다른 값인지 확인
    if (VOICERSS_API_KEY === 'YOUR_API_KEY') {
        console.log('외부 API 키가 설정되지 않아 오디오 프리로드를 스킵합니다.');
        return;
    }

    console.log('오디오 파일 프리로드 시작...');
    
    // 시스템 부하를 줄이기 위해 부분적으로 준비
    // 화면에 등장하는 카드나 현재 카테고리의 카드를 우선 다운로드
    
    // 현재 카테고리의 첫 5개 단어만 프리로드 (테스트용)
    const currentCategoryCards = flashcardData.filter(card => card.category === currentCategory).slice(0, 5);
    
    currentCategoryCards.forEach(card => {
        // 단어와 예문을 각각 다운로드 (읽기가 있을 경우 우선 사용)
        const term = card.reading || card.japanese_term;
        
        if (!audioCache[term]) {
            // 오디오 객체 생성 및 캐싱
            const audioUrl = getExternalTTSUrl(term);
            audioCache[term] = new Audio(audioUrl);
            
            // 오디오 미리 로드 (브라우저 캐싱에 저장)
            audioCache[term].load();
            console.log(`'${term}' 오디오 프리로드 완료`);
        }
        
        // 예문도 있다면 프리로드
        if (card.example_jp && !audioCache[card.example_jp]) {
            const audioUrl = getExternalTTSUrl(card.example_jp);
            audioCache[card.example_jp] = new Audio(audioUrl);
            audioCache[card.example_jp].load();
        }
    });
    
    console.log('오디오 프리로드 완료');
}

function init() {
    loadStats(); // 기존 통계 로드
    setupCategoryTabs(); // 탭 이벤트 리스너 설정
    filterDeck(currentCategory); // 마지막 학습 카테고리로 덱 로드 및 렌더링
    
    // TTS 초기화 및 음성 목록 로드
    if ('speechSynthesis' in window) {
        console.log("TTS (Text-to-Speech) 지원 확인");
        
        // 음성 목록이 비동기적으로 로드될 수 있으므로 이벤트 처리
        window.speechSynthesis.onvoiceschanged = function() {
            const voices = window.speechSynthesis.getVoices();
            const japaneseVoices = voices.filter(voice => voice.lang.includes('ja'));
            
            if (japaneseVoices.length > 0) {
                console.log(`${japaneseVoices.length}개의 일본어 음성 발견:`, 
                    japaneseVoices.map(v => v.name).join(', '));
            } else {
                console.log("일본어 음성을 찾을 수 없습니다. 기본 음성을 사용합니다.");
            }
        };
        
        // 초기 음성 목록 로드 (일부 브라우저에서 필요)
        setTimeout(() => {
            window.speechSynthesis.getVoices();
        }, 100);
        
        // 오디오 파일 미리 로드 (사용자 경험 향상을 위해)
        // 사용자가 페이지 로드후 API 키를 설정했다면 활성화
        setTimeout(() => {
            preloadAudioFiles();
        }, 1000);
    } else {
        document.getElementById('tts-button').disabled = true;
        document.getElementById('tts-button').textContent = "TTS 미지원";
    }
}

document.addEventListener('DOMContentLoaded', init);