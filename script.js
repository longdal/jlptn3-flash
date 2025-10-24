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

/**
 * TTS (Text-to-Speech) 기능을 사용하여 발음합니다.
 */
function speakText() {
    const card = currentDeck[currentIndex];
    if (!card || !window.speechSynthesis) {
        alert("브라우저가 TTS를 지원하지 않거나 카드가 로드되지 않았습니다.");
        return;
    }

    const textToSpeak = card.japanese_term;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'ja-JP'; 
    utterance.rate = 0.8; // 속도 조절

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

function init() {
    loadStats(); // 기존 통계 로드
    setupCategoryTabs(); // 탭 이벤트 리스너 설정
    filterDeck(currentCategory); // 마지막 학습 카테고리로 덱 로드 및 렌더링
    
    // TTS 초기화 (필요시)
    if ('speechSynthesis' in window) {
        console.log("TTS (Text-to-Speech) 지원 확인");
    } else {
        document.getElementById('tts-button').disabled = true;
        document.getElementById('tts-button').textContent = "TTS 미지원";
    }
}

document.addEventListener('DOMContentLoaded', init);