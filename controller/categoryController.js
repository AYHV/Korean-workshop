import { createButton, showLoadingMessage } from './questionController.js';
import { setLanguage, updateText, translations, currentLang } from '../services/localization.js';

const BASE_URL = window.config.BASE_URL;

// HTML 요소 생성
function createDivElement(className, innerHTML = '') {
    const div = document.createElement('div');
    div.className = className;
    div.innerHTML = innerHTML;
    return div;
}

// Generate category workbook
function fetchProblem(category) {
    const questionGenerationDiv = document.getElementById('question-generation');
    const categoryContainer = document.getElementById('category-container');
    const fileUploadContainer = document.getElementById('file-upload-container');

    // Hide category selection and file upload sections
    categoryContainer.style.display = 'none';
    fileUploadContainer.style.display = 'none';

    // Retrieve user's preferred language from local storage
    const storedLanguage = localStorage.getItem("preferredLang") || "korean";

    // Map stored language to API-supported language format
    const languageMapping = {
        ko: "Korean",
        en: "English",
        lo: "Thai"
    };
    const apiLanguage = languageMapping[storedLanguage] || "korean";
    console.log('Language used in API request:', apiLanguage);

    // Display the loading message
    questionGenerationDiv.style.display = 'block';
    showLoadingMessage();

    // Construct the API endpoint with the selected category and language parameters 
    const endpoint = `${BASE_URL}/api/workbook/processCategory?category=${category}&language=${apiLanguage}`;
        
        // Send a POST request to the API to generate problems for the selected category
        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        .then(response => {
        // Check if the response is not OK (e.g., server error)
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            console.log('Problem generation response:', data); // Log the API response

            // Save the wb_id as a cookie with a 1-hour expiration time
            const wb_id = data.message.wb_id;
            if (wb_id) {
                document.cookie = `wb_id=${wb_id}; path=/; max-age=3600`;
                console.log('wb_id stored in cookie:', wb_id); // Log the stored wb_id
            }
            displayQuestions(data, category); // Call function to display the generated questions on the page
        })
        .catch(error => {
            console.error('Problem generation failed:', error); // Log any errors that occur during the fetch request
        // Display an error message in the question generation div
            const questionGenerationDiv = document.getElementById('question-generation');
            questionGenerationDiv.innerHTML = `<p>An error occurred while generating problems: ${error.message}</p>`;
        });
    }


// 문제 재생성 함수
async function regenerateQuestions() {
    const questionGenerationDiv = document.getElementById('question-generation');
    const categoryContainer = document.getElementById('category-container');
    const fileUploadContainer = document.getElementById('file-upload-container');

    // 카테고리 박스와 파일 업로드 박스 숨기기
    categoryContainer.style.display = 'none';
    fileUploadContainer.style.display = 'none';

    questionGenerationDiv.style.display = 'block'; // 로딩 메시지 표시
    showLoadingMessage(); // 로딩 메시지 표시

    const apiUrl = `${BASE_URL}/api/workbook/reCategorytext`; // 재생성 API 엔드포인트

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json(); // 응답 데이터를 data 변수에 저장

        console.log('문제 재생성 응답:', data); // 응답 데이터 출력

        // wb_id를 쿠키에 저장
        const wb_id = data.message.wb_id; // 수정된 부분
        if (wb_id) {
            document.cookie = `wb_id=${wb_id}; path=/; max-age=3600`; // max-age 추가
            console.log('wb_id 쿠키에 저장되었습니다:', wb_id);
        }
        displayQuestions(data); // 응답 처리 함수 호출
    } catch (error) {
        console.error('문제 재생성 실패:', error);
        questionGenerationDiv.innerHTML = `<p>문제 재생성 중 오류가 발생했습니다: ${error.message}</p>`;
    }
}

//이미지 캐싱 처리를 위한 변수
const imageCache = new Map();

//이미지 캐싱 함수
function cacheImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

//캐시된 이미지를 사용하는 함수
function getImage(url) {
    if (imageCache.has(url)) {
      return Promise.resolve(imageCache.get(url));
    }
    return cacheImage(url);
  }

// 문제와 정답 표시
async function displayQuestions(data, category) {
    const questionGenerationDiv = document.getElementById('question-generation');
    if (!questionGenerationDiv) {
        console.error('question-generation 요소를 찾을 수 없습니다.');
        return;
    }

    questionGenerationDiv.innerHTML = '<h2 style="font-weight: bold; font-size: 28px; margin-bottom: 20px;" data-i18n="생성된 문제">생성된 문제</h2>';
    updateText(); // 생성된 문제 텍스트 번역

    if (data?.message) {
        const { imageQuestions = [], textQuestions = '', answer = "정답이 없습니다." } = data.message;

        // 이미지 캐싱 처리
        const imagePromises = imageQuestions.map(q => getImage(q.imageUrl));

        try {
            await Promise.all(imagePromises);
            console.log('이미지 캐싱 완료');

            // 문제와 정답을 표시할 컨테이너 생성
            const contentDiv = createDivElement('question-content', `
                <div class="question-answer-container">
                    <div class="questions">${generateCombinedQuestionsHTML(imageQuestions, textQuestions)}</div>
                    <div class="answers">${generateAnswersHTML(answer)}</div>
                </div>
            `);

            questionGenerationDiv.appendChild(contentDiv);
            console.log('문제 및 답변 HTML 생성 완료');

            // 버튼 생성
            const buttonContainer = createDivElement('button-container');
            buttonContainer.style.textAlign = 'center';
            buttonContainer.style.marginTop = '20px';

            // PDF 저장 버튼
            const savePDFButton = createButton('PDF로 저장', () => { 
                const wb_id = getCookie('wb_id');
                saveToPdf(wb_id); // PDF 저장 함수 호출
            });

            // 문제 재생성 버튼
            const regenerateButton = createButton('문제 재생성', () => regenerateQuestions());

            buttonContainer.appendChild(savePDFButton);
            buttonContainer.appendChild(regenerateButton);
            questionGenerationDiv.appendChild(buttonContainer);
        } catch (error) {
            console.error('이미지 로딩 중 오류 발생:', error);
            questionGenerationDiv.innerHTML += '<p>이미지 로딩 중 오류가 발생했습니다.</p>';
        }
    } else {
        questionGenerationDiv.innerHTML += '<p>유효하지 않은 응답입니다.</p>';
    }
}


// 문제 HTML 생성 (이미지 문제 + 텍스트 문제)
function generateCombinedQuestionsHTML(imageQuestions, textQuestions) {
    const imageQuestionsHTML = imageQuestions.map((q, index) => `
        <div class="question image-question ${(index % 2 === 1 || index === imageQuestions.length - 1) ? 'page-break-after' : ''}">
            <p style="white-space: pre-wrap;">${q.question}</p>
            <img src="${q.imageUrl}" alt="문제 이미지" class="question-image">
        </div>
    `).join('');

    const textQuestionsHTML = textQuestions ? `
        <div class="question text-questions page-break-before">
            <p style="white-space: pre-wrap;">${textQuestions}</p>
        </div>
    ` : '';

    return imageQuestionsHTML + textQuestionsHTML;
}

// 답안 HTML 생성
function generateAnswersHTML(answers) {
    return `
        <div class="answer-item">
            <p style="white-space: pre-wrap;">${answers}</p> 
        </div>
    `;
}

// 카테고리 박스 클릭 이벤트 연결
document.querySelector('.card.Object').onclick = function() {
    fetchProblem('object');
};

document.querySelector('.card.Food').onclick = function() {
    fetchProblem('food');
};

document.querySelector('.card.Culture').onclick = function() {
    fetchProblem('culture');
};

document.querySelector('.card.Conversation').onclick = function() {
    fetchProblem('conversation');
};

const commonOpt = {
    margin: 8,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
        scale: 3,
        useCORS: true,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.offsetWidth,
        windowHeight: document.documentElement.offsetHeight, 
        onclone: (documentClone) => {
            const images = documentClone.querySelectorAll('.img');
            images.forEach(img => {
                img.onerror = () => {
                    console.warn(`이미지 로드 실패: ${img.src}`);
                    img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/ebM1PAAAAAASUVORK5CYII=';
                };
            });
            const elements = documentClone.querySelectorAll('.question, .answer-item');
            elements.forEach(el => {
                el.style.pageBreakInside = 'avoid';  // 요소 분리 방지
                el.style.wordBreak = 'break-word'; // 긴 단어 줄바꿈 허용
                el.style.margin = '0 auto';
                el.style.maxWidth = '95%';  // A4 페이지 최대 폭 제한
            });
            // 이미지 문제의 크기 조정
            const imageQuestions = documentClone.querySelectorAll('.image-question');
            imageQuestions.forEach((q, index) => {
                if (index === imageQuestions.length - 1 && index % 2 === 0) {
                    // 마지막 홀수 번째 문제는 전체 페이지 사용
                    q.style.height = '100%';
                } else {
                    q.style.height = '50%';  // 나머지는 페이지 높이의 절반으로 설정
                }
                q.style.overflow = 'hidden';
            });
            // 텍스트 문제 시작 전 페이지 나누기 방지
            const textQuestions = documentClone.querySelector('.text-questions');
            if (textQuestions) {
                textQuestions.style.pageBreakBefore = 'avoid';
            }
        }
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', putTotalPages: true, floatPrecision: 16 },
    pagebreak: { mode: ['css', 'avoid-all'], before: '.page-break-before', after: '.page-break-after' }
};

function saveToPdf(wb_id) {
    const questionElement = document.querySelector('.questions');
    const answerElement = document.querySelector('.answers');

    if (!questionElement || !answerElement) {
        console.error('PDF 저장 대상 요소를 찾을 수 없습니다.');
        return;
    }

    // pdf 생성 함수
    const generatePDF = async (element, options) => {
        return new Promise((resolve, reject) => {
            if (!element) {
                reject(new Error('유효하지 않은 요소입니다.'));
                return;
            }

            html2pdf().set(options).from(element).outputPdf('blob').then(resolve).catch(reject);
        });
    };

    const questionOpt = { ...commonOpt, filename: `문제집_문제_${wb_id}.pdf` };
    const answerOpt = { ...commonOpt, filename: `문제집_답안_${wb_id}.pdf` };

    Promise.all([
        generatePDF(questionElement, questionOpt),
        generatePDF(answerElement, answerOpt),
    ])
    .then(async ([questionBlob, answerBlob]) => {
        console.log(`문제집_문제_${wb_id}.pdf 생성 완료`);
        console.log(`문제집_답안_${wb_id}.pdf 생성 완료`);

        const questionFile = new File([questionBlob], `문제집_문제_${wb_id}.pdf`, { type: 'application/pdf' });
        const answerFile = new File([answerBlob], `문제집_답안_${wb_id}.pdf`, { type: 'application/pdf' });

        try {
            await Promise.all([
                uploadQuestion(wb_id, questionFile),
                uploadAnswer(wb_id, answerFile)
            ]);
            alert(translations[currentLang]['PDF 파일이 성공적으로 저장되었습니다. 보관함에서 확인해 보세요!'] || 'PDF 파일이 성공적으로 저장되었습니다. 보관함에서 확인해 보세요!'); // 번역된 메시지
        } catch (error) {
            console.error('PDF 업로드 중 오류 발생:', error);
            alert('PDF 업로드 중 오류가 발생했습니다.');
        }
    })
    .catch(error => {
        console.error('PDF 생성 중 오류 발생:', error);
        alert('PDF 생성 중 오류가 발생했습니다.');
    });
}

//쿠키에 저장된 wb_id 불러오는 함수
function getCookie(wb_id) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${wb_id}=`);
    if (parts.length === 2) {
        const result = parts.pop().split(';').shift();
        console.log('Cookie result:', result);
        return result;
    }
    console.log('Cookie not found');
    return null;
}

// 문제집 업로드 함수
export async function uploadQuestion(wb_id, file) {
    try {
        const formData = new FormData();
        formData.append('wb_id', wb_id);
        formData.append('file', file);

        const response = await axios.post(`${BASE_URL}/api/workbook/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        console.log(`문제집_문제_${wb_id}.pdf 업로드 완료`, response.data);
    } catch (error) {
        console.error(`문제집_문제_${wb_id}.pdf 업로드 실패:`, error);
        throw error;
    }
}

// 답안지 업로드 함수
export async function uploadAnswer(wb_id, file) {
    try {
        const formData = new FormData();
        formData.append('wb_id', wb_id);
        formData.append('file', file);

        const response = await axios.post(`${BASE_URL}/api/workbook/answer/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        console.log(`문제집_답안_${wb_id}.pdf 업로드 완료`, response.data);
    } catch (error) {
        console.error(`문제집_답안_${wb_id}.pdf 업로드 실패:`, error);
        throw error;
    }
}

// 언어에 따른 카테고리 이미지 경로 설정
const categoryImages = {
    ko: '/assets/img/category_ko.png', // 한국어 이미지
    en: '/assets/img/category_en.png', // 영어 이미지
    lo: '/assets/img/category_lo.png', // 라오어 이미지
};

// 이미지 업데이트 함수
function updateCategoryImage() {
    const currentLang = localStorage.getItem("preferredLang") || "ko"; // 기본 언어 설정
    const categoryImageDiv = document.querySelector('.category-image');

    if (categoryImageDiv && categoryImages[currentLang]) {
        categoryImageDiv.src = categoryImages[currentLang]; // 현재 언어에 맞는 이미지로 변경
    } else {
        console.error('카테고리 이미지 요소를 찾을 수 없습니다.');
    }
}

// 언어에 따른 업로드 이미지 경로 설정
const uploadImages = {
    ko: '/assets/img/penguin-upload_ko.png', // 한국어 이미지
    en: '/assets/img/penguin-upload_en.png', // 영어 이미지
    lo: '/assets/img/penguin-upload_lo.png', // 라오어 이미지
};

// 이미지 업데이트 함수
function updateUploadImage() {
    const currentLang = localStorage.getItem("preferredLang") || "ko"; // 기본 언어 설정
    const uploadImageDiv = document.querySelector('.upload-image');

    if (uploadImageDiv && uploadImages[currentLang]) {
        uploadImageDiv.src = uploadImages[currentLang]; // 현재 언어에 맞는 업로드 이미지로 변경
    } else {
        console.error('업로드 이미지 요소를 찾을 수 없습니다.');
    }
}

// 페이지 로드 시 실행
document.addEventListener("DOMContentLoaded", () => {
    updateCategoryImage(); // 언어에 맞는 카테고리 이미지 설정
    updateUploadImage(); // 언어에 맞는 업로드 이미지 설정
});

// 언어 변경 시 이미지 업데이트
document.querySelectorAll(".translate-btn").forEach((button) => {
    button.addEventListener("click", () => {
        const lang = button.dataset.lang;
        setLanguage(lang); // 언어 변경
        updateCategoryImage(); // 언어 변경 시 카테고리 이미지 업데이트
        updateUploadImage(); // 언어 변경 시 업로드 이미지 업데이트
    });
});