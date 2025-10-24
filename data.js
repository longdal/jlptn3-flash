// data.js (실제 배포 시에는 data.json 파일로 분리하는 것이 좋습니다.)

const flashcardData = [
    // N3 - 한자 읽기 (Page 4-6 기반)
    { id: 1, type: "Kanji", category: "한자 읽기", japanese_term: "岩", reading: "いわ", korean_meaning: "바위", example_jp: "この島には珍しい岩が多い。", example_kr: "이 섬에는 특이한 바위가 많다." },
    { id: 2, type: "Kanji", category: "한자 읽기", japanese_term: "努力", reading: "どりょく", korean_meaning: "노력", example_jp: "努力が報われて合格した。", example_kr: "노력이 보답받아 합격했다." },
    { id: 3, type: "Kanji", category: "한자 읽기", japanese_term: "発表", reading: "はっぴょう", korean_meaning: "발표", example_jp: "研究の発表会に参加する。", example_kr: "연구 발표회에 참가한다." },
    { id: 4, type: "Kanji", category: "한자 읽기", japanese_term: "遅れる", reading: "おくれる", korean_meaning: "늦다", example_jp: "電車が遅れてしまった。", example_kr: "전차가 늦어버렸다." },
    // N3 - 유의어/용법 (Page 14, 18 기반)
    { id: 101, type: "Synonym", category: "유의어", japanese_term: "大変だ", reading: "たいへんだ", korean_meaning: "큰일이다, 힘들다", example_jp: "この仕事は大変だがやりがいがある。", example_kr: "이 일은 힘들지만 보람이 있다." },
    { id: 102, type: "Synonym", category: "유의어", japanese_term: "だいたい", reading: "だいたい", korean_meaning: "대체, 대략", example_jp: "だいたいの内容は理解した。", example_kr: "대략적인 내용은 이해했다." },
    // N3 - 문법 형식 판단 (Page 22 기반)
    { id: 201, type: "Grammar", category: "문법", japanese_term: "〜におうじて", reading: "に おうじて", korean_meaning: "〜에 맞추어, 〜에 대응하여", example_jp: "経験に応じて給料を決める。", example_kr: "경험에 따라 급료를 정한다." },
    { id: 202, type: "Grammar", category: "문법", japanese_term: "〜てほしい", reading: "て ほしい", korean_meaning: "〜했으면 좋겠다", example_jp: "早く帰ってきてほしい。", example_kr: "빨리 돌아와 줬으면 좋겠다." },
];