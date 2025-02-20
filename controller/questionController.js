import { updateText, translations, currentLang  } from '../services/localization.js';

const BASE_URL = config.BASE_URL;

//Create a problem
export async function generateQuestions(problemText = ocrResult) {
  // Setting the URL for the problem creation API
  const apiUrl = `${BASE_URL}/api/workbook/processText`;
  const questionGenerationDiv = document.getElementById('question-generation');

  console.log(localStorage.getItem('preferredLang'));

  // Get stored language values from local storage (default is set to 'korean')
  const storedLanguage = localStorage.getItem("preferredLang") || "korean";

  // Converting language values to the format required by API (additional mapping is available hereif necessary)
  const languageMapping = {
      ko: "Korea",
      en: "English",
      lo: "Lao Language"
  };
  const apiLanguage = languageMapping[storedLanguage] || "korean";
  console.log('Language in API:', apiLanguage);

  showLoadingMessage();
     //problem creation api    
     try {
      const response = await axios.post(
          apiUrl,
          { problemText: problemText} ,
          {
              headers: {
                  'Content-Type': 'application/json',
              },
              params: {
                  language: apiLanguage 
              }
         }
      );
      console.log('Create a problem response :', response.data);

      const result = response.data;
      //Save wb_id to cookies
      const wb_id = result.message.wb_id;
      if (wb_id) {
          document.cookie = `wb_id=${wb_id}; path=/; max-age=3600`;
          console.log('wb_id was stored in cookie :', wb_id);
      }
      displayGeneratedQuestions(result);
  } catch (error) {
      console.error(' An error occurred while creating an issue :', error);
      questionGenerationDiv.innerHTML = 
      `<h2> Problem creation failed </h2>
          <p> An error occurred : ${error.response?.data?.message || error.message}</p>`;
  }

  // Force generate-section to be displayed
  const generateSection = document.getElementById('generate-section');
  if (generateSection) {
      generateSection.style.display = 'block';
  } else {
      console.error('generate-section not found.');         
  }
}

export async function showLoadingMessage() {
  const questionGenerationDiv = document.getElementById('question-generation');
  questionGenerationDiv.innerHTML = `
      <div class="loading-message" >
          <h2 data-i18n="문제 생성 중...">문제 생성 중...</h2>
          <div class="spinner"></div>
          <p data-i18n="잠시만 기다려 주세요.">잠시만 기다려 주세요.</p>
      </div>
  `;
  updateText(); // Apply translation
}

// Create HTML elements
function createDivElement(className, innerHTML = '') {
  const div = document.createElement('div');
  div.className = className;
  div.innerHTML = innerHTML;
  return div;
}

// Problem HTML generation (image problem + text problem)
export function generateCombinedQuestionsHTML(questions) {
  return questions.map(q => {
      if (q.type === 'image') {
          return `<div class="question">
                  <p style="white-space: pre-wrap;">${q.question}</p> 
                  <img src="${q.imageUrl}" alt="문제 이미지" class="question-image">
                  </div>`;
      } else if (q.type === 'text') {
      return `<div class="question">
                  <p style="white-space: pre-wrap;">${q.question}</p> 
              </div>`;
      }
  }).join('');
}

// Generate answer HTML
export function generateAnswersHTML(answers) {
  return `
      <div class="answer-item">
          <p style="white-space: pre-wrap;">${answers}</p> 
      </div>
  `;
}

const imageCache = new Map();

// image caching function
function cacheImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image(); // Create a new image object
    img.onload = () => {
      imageCache.set(url, img); // Save to cache when image loading is complete
      resolve(img); // Promise solve
    };
    img.onerror = reject; // Promise rejection when loading fails
    img.src = url; // Set image source (start loading)
  });
}

// Get cached images
function getImage(url) {
  if (imageCache.has(url)) {
    return Promise.resolve(imageCache.get(url)); // Return cached image
  }
  return cacheImage(url); // If not, reload and cache
}

// Show questions and answers
export async function displayGeneratedQuestions(response) {
  console.log('Start the displayGeneratedQuestions function', JSON.stringify(response, null, 2)); // Response data logging 

  const questionGenerationDiv = document.getElementById('question-generation'); // Get the elements to display the problem 
  if (!questionGenerationDiv) {
      console.error ('The question-generation element was not found.'); 
      return;
  }

  questionGenerationDiv.innerHTML = '<h2 data-i18n="생성된 문제">생성된 문제</h2>'; // Add title 
  updateText(); // Translation function call

  if (response?.message) {
    const { question: questionText = '', answer: answerText = '', imageQuestions = [], textQuestions = '' } = response.message;

    // Image caching processing
    const imagePromises = imageQuestions.map(q => getImage(q.imageUrl));

    try {
        await Promise.all(imagePromises);
        console.log(' All images caching is complete.'); //All image caching is complete.

        // Add image problem and text
        const combinedQuestions = [
            ...imageQuestions.map(q => ({ type: 'image', question: q.question, imageUrl: q.imageUrl })),
            ...(textQuestions ? [{ type: 'text', question: textQuestions }] : [])
        ];

        //create problem tab html
        const questionsHTML = generateCombinedQuestionsHTML(combinedQuestions);
        //create answer tab html
        const answersHTML = generateAnswersHTML(answerText);

        const contentDiv = createDivElement('question-content', `
            <div class="questions">${questionsHTML}</div>
            <div class="answers">${answersHTML}</div>
        `);

        questionGenerationDiv.appendChild(contentDiv);
        console.log ('Problem and answer HTML generated');
                  // Create button container and button
                  const buttonContainer = createDivElement('button-container');
                  buttonContainer.style.textAlign = 'center';
                  buttonContainer.style.marginTop = '20px';

                  // Save PDF button
                  const savePDFButton = createButton('PDF로 저장', () => { 
                      const wb_id = getCookie('wb_id');
                      saveToPdf(wb_id);
                      alert(translations[currentLang]['PDF 파일이 성공적으로 저장되었습니다. 보관함에서 확인해 보세요!'] || 'PDF 파일이 성공적으로 저장되었습니다. 보관함에서 확인해 보세요!');
            });

                   // Recreate Problem Button
                   const regenerateButton = createButton('문제 재생성', regenerateQuestions);

                   buttonContainer.appendChild(savePDFButton);
                   buttonContainer.appendChild(regenerateButton);
                   questionGenerationDiv.appendChild(buttonContainer);

               } catch (error) {
                   console.error(' Error occurred while loading image :', error);
                   questionGenerationDiv.innerHTML += '<p> Error occurred while loading image </p>';
               }
           } else {
               questionGenerationDiv.innerHTML += '<p> Invalid response.</p>';
           }

           console.log('exit the displayGeneratedQuestions function');
       }
//Function to load wb_id stored in cookie
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
// Problem Regeneration Function 
export async function regenerateQuestions() {
  const apiUrl = `${BASE_URL}/api/workbook/retext`;
  const questionGenerationDiv = document.getElementById('question-generation');
  
  try {
      questionGenerationDiv.style.display = 'block';
      showLoadingMessage();

      // problem Re-creation API Call
      const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
      });

      // Response confirmation and processing
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('response :', JSON.stringify(data, null, 2));
      handleRegenerationResponse(data, questionGenerationDiv);
  } catch (error) {
      console.error(' Error regenerating problem :', error);
      handleRegenerationError(error, questionGenerationDiv);
  }
}
// Button creation function (button to save pdf and regenerate problem)
export function createButton(label, onClick, customStyle = '') {
  const button = document.createElement('button');
  button.setAttribute('data-i18n', label); // Add translation key
  button.textContent = translations[currentLang][label] || label; // Translated text settings
  button.style = `
      padding: 10px 20px;
      margin: 0 10px;
      font-size: 16px;
      color: #fff;
      background-color: #486284;
      border: none;
      border-radius: 5px;
      font-family: 'Pretendard';
      cursor: pointer;
      ${customStyle}
  `;
  button.onclick = onClick;
  return button;
}
// Function to upload PDF to server
export async function uploadQuestion(wb_id, file) {
  try {
      // Create FormData
      const formData = new FormData();
      formData.append('wb_id', wb_id);
      formData.append('file', file);

      const response = await axios.post(`${BASE_URL}/api/workbook/upload`, formData, {
          headers: {
              'Content-Type': 'multipart/form-data',
          },
      });

      console.log(` Workbook_Problem_${wb_id}.pdf upload completed `, response.data);
  } catch (error) {
      console.error(` Workbook_Problem_${wb_id}.pdf upload failed :`, error);
  }
}
// Function to upload PDF to server
export async function uploadAnswer(wb_id, file) {
  try {
      // Create FormData
      const formData = new FormData();
      formData.append('wb_id', wb_id);
      formData.append('file', file);

      const response = await axios.post(`${BASE_URL}/api/workbook/answer/upload`, formData, {
          headers: {
              'Content-Type': 'multipart/form-data',
          },
      });

      console.log(` Workbook_answer_${wb_id}.pdf upload completed :`, response.data);
  } catch (error) {
      console.error(` Workbook_Answer_${wb_id}.pdf upload failed :`, error);
  }
}
// PDF creation function (creating each workbook + answer sheet)
export function saveToPdf(wb_id) {
  // Get the problem and answer elements
  const questionElement = document.querySelector('.questions');
  const answerElement = document.querySelector('.answers');

  if (!questionElement || !answerElement) {
      console.error('PDF save target element not found.');
      return;
  }
     // pdf common option settings
     const commonOpt = {
      margin: 8, // Document margin settings (8mm)
      image: { type: 'jpeg', quality: 0.98 }, // Image format and quality settings
      html2canvas: { 
          scale: 2, // Double the canvas resolution (clearer output)
          useCORS: true, // Enable capture of images with CORS enabled
          onclone: (documentClone) => {
              const images = documentClone.querySelectorAll('.img'); // Get image elements
              images.forEach(img => {
                  img.onerror = () => { // Set alternative image when image loading fails
                      console.warn(` Image load failed : ${img.src}`);
                      img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/ebM1PAAAAAASUVORK5CYII=';
                  };
              });
              // Long text split settings
              const questionsAndAnswers = documentClone.querySelectorAll('.questions, .answers');
              questionsAndAnswers.forEach(el => {
                  el.style.overflow = 'hidden'; // Hide excess content
                  el.style.wordBreak = 'break-word'; // Line breaks when there are long words
                  el.style.pageBreakInside = 'avoid'; // Prevent clipping inside the page
                  el.style.pageBreakBefore = 'auto'; // Apply automatic line break at the front of the page
              });
          }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, // Setting up an A4 size portrait document
      pagebreak: { mode: ['css', 'legacy'], after: '.page-break' } // Options for handling page overflow
  };
// Function to forcefully add page breaks to prevent
function addPageBreaks(element) {
  const maxHeight = 1600; // Set maximum page height
  let currentHeight = 0; // Current height tracking

  // Handle page overflow by iterating through each question and answer element
  element.querySelectorAll('.question, .answer').forEach(item => {
      const itemHeight = item.offsetHeight;

      // Current height + add page break if element height exceeds page max height
      if (currentHeight + itemHeight > maxHeight) {
          const pageBreak = document.createElement('div'); // Creating page break elements
          pageBreak.classList.add('page-break'); // Add page break class
          item.parentNode.insertBefore(pageBreak, item); // Insert a page break before an element
          currentHeight = 0; // Reset current height
      }

      currentHeight += itemHeight; // Add element height to current height
  });
}
     //Function that outputs two image problems each
     function addPageBreaksForImageQuestions(element) {
      let imageQuestionCount = 0; // Track number of image problem
      const imageQuestions = Array.from(element.querySelectorAll('.question img')).map(img => img.parentElement);
 
      // Add a page break every two image-based problems
      imageQuestions.forEach((item, index) => {
        if (index % 2 === 0 && index !== 0) { // Add page change to every second problem
          const pageBreak = document.createElement('div');
          pageBreak.classList.add('page-break');
          item.parentNode.insertBefore(pageBreak, item);
        }
      });
    }
     // PDF creation function
     function generatePDF() {
        
      // Process two image problems per page
      addPageBreaksForImageQuestions(questionElement);

      // Page overflow handling
      addPageBreaks(questionElement);
      addPageBreaks(answerElement);

      // Create a PDF workbook
      const questionOpt = {
          ...commonOpt,
          filename: `문제집_문제_${wb_id}.pdf`,
      };
      const questionPromise = html2pdf().set(questionOpt).from(questionElement).toPdf().output('blob');

      // Create answer sheet PDF
      const answerOpt = {
          ...commonOpt,
          filename: `문제집_답안_${wb_id}.pdf`,
      };
      const answerPromise = html2pdf().set(answerOpt).from(answerElement).toPdf().output('blob');
          // Create a workbook and answer sheet at the same time and upload them to the server
          Promise.all([questionPromise, answerPromise])
              .then(async ([questionBlob, answerBlob]) => {
                  console.log(` Workbook_Problem_${wb_id}.pdf creation completed `);
                  console.log(` Workbook_answer_${wb_id}.pdf creation completed `);

                  // Convert Blob to File object
                  const questionFile = new File([questionBlob], `문제집_문제_${wb_id}.pdf`, { type: 'application/pdf' });
                  const answerFile = new File([answerBlob], `문제집_답안_${wb_id}.pdf`, { type: 'application/pdf' });

                   // Upload to PDF server
                   await uploadQuestion(wb_id, questionFile);
                   await uploadAnswer(wb_id, answerFile);

               })
               .catch(error => {
                   console.error('An error occurred while creating PDF. :', error);
               });
       }
       generatePDF();
   }
    //Response processing function
    function handleRegenerationResponse(response, targetElement) {
      console.log(' full response :', response);
      if (response && response.message) {
          console.log(' Problem Reproduction Response :', response.message);
          displayGeneratedQuestions(response);
      } else {
          console.error(' Invalid response structure :', response);
          targetElement.innerHTML = '<p data-i18n="문제 재생성 중 오류가 발생했습니다. 유효하지 않은 응답 구조입니다.">문제 재생성 중 오류가 발생했습니다. 유효하지 않은 응답 구조입니다.</p>';
          alert(translations[currentLang]['문제 재생성 중 오류가 발생했습니다. 유효하지 않은 응답 구조입니다.'] || '문제 재생성 중 오류가 발생했습니다. 유효하지 않은 응답 구조입니다.'); //번역 적용
      }
  }    

  //Error handling features
  function handleRegenerationError(error, targetElement) {
      console.error(' Error occurred while calling problem re-create API :', error);
      targetElement.innerHTML = `<p data-i18n="문제 재생성 중 오류가 발생했습니다">문제 재생성 중 오류가 발생했습니다: ${error.message}</p>`;
      alert(translations[currentLang]['문제 재생성 중 오류가 발생했습니다'] || '문제 재생성 중 오류가 발생했습니다'); // Apply translation
  }
