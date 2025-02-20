import { createButton, showLoadingMessage } from './questionController.js';
import { setLanguage, updateText, translations, currentLang } from '../services/localization.js';

const BASE_URL = window.config.BASE_URL;

// Function to create a div element
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

// Function to regenerate questions
async function regenerateQuestions() {
    const questionGenerationDiv = document.getElementById('question-generation');
    const categoryContainer = document.getElementById('category-container');
    const fileUploadContainer = document.getElementById('file-upload-container');

    // Hide category box and file upload box
    categoryContainer.style.display = 'none';
    fileUploadContainer.style.display = 'none';

    questionGenerationDiv.style.display = 'block'; // Show loading message
    showLoadingMessage(); // Show loading message

    const apiUrl = `${BASE_URL}/api/workbook/reCategorytext`; // Regeneration API endpoint

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json(); // Store response data in data variable

        console.log('Regeneration response:', data); // Log response data

        // Save wb_id to cookie
        const wb_id = data.message.wb_id; // Modified part
        if (wb_id) {
            document.cookie = `wb_id=${wb_id}; path=/; max-age=3600`; // Added max-age
            console.log('wb_id stored in cookie:', wb_id);
        }
        displayQuestions(data); // Call response handling function
    } catch (error) {
        console.error('Regeneration failed:', error);
        questionGenerationDiv.innerHTML = `<p>An error occurred while regenerating questions: ${error.message}</p>`;
    }
}

// Variable for image caching
const imageCache = new Map();

// Function for image caching
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

// Function to use cached images
function getImage(url) {
    if (imageCache.has(url)) {
        return Promise.resolve(imageCache.get(url));
    }
    return cacheImage(url);
}

// Display questions and answers
async function displayQuestions(data, category) {
    const questionGenerationDiv = document.getElementById('question-generation');
    if (!questionGenerationDiv) {
        console.error('Cannot find question-generation element.');
        return;
    }

    questionGenerationDiv.innerHTML = '<h2 style="font-weight: bold; font-size: 28px; margin-bottom: 20px;" data-i18n="Generated Questions">Generated Questions</h2>';
    updateText(); // Call translation function

    if (data?.message) {
        const { imageQuestions = [], textQuestions = '', answer = "No answer available." } = data.message;

        // Image caching process
        const imagePromises = imageQuestions.map(q => getImage(q.imageUrl));

        try {
            await Promise.all(imagePromises);
            console.log('Image caching completed');

            // Create container to display questions and answers
            const contentDiv = createDivElement('question-content', `
                <div class="question-answer-container">
                    <div class="questions">${generateCombinedQuestionsHTML(imageQuestions, textQuestions)}</div>
                    <div class="answers">${generateAnswersHTML(answer)}</div>
                </div>
            `);

            questionGenerationDiv.appendChild(contentDiv);
            console.log('Question and answer HTML generation completed');

            // Create button container and buttons
            const buttonContainer = createDivElement('button-container');
            buttonContainer.style.textAlign = 'center';
            buttonContainer.style.marginTop = '20px';

            // PDF save button
            const savePDFButton = createButton('Save as PDF', () => { 
                const wb_id = getCookie('wb_id');
                saveToPdf(wb_id); // Call PDF save function
            });

            // Regenerate questions button
            const regenerateButton = createButton('Regenerate Questions', () => regenerateQuestions());

            buttonContainer.appendChild(savePDFButton);
            buttonContainer.appendChild(regenerateButton);
            questionGenerationDiv.appendChild(buttonContainer);
        } catch (error) {
            console.error('Error occurred while loading images:', error);
            questionGenerationDiv.innerHTML += '<p>An error occurred while loading images.</p>';
        }
    } else {
        questionGenerationDiv.innerHTML += '<p>Invalid response.</p>';
    }
}

// Function to generate HTML for questions (image questions + text questions)
function generateCombinedQuestionsHTML(imageQuestions, textQuestions) {
    const imageQuestionsHTML = imageQuestions.map((q, index) => `
        <div class="question image-question ${(index % 2 === 1 || index === imageQuestions.length - 1) ? 'page-break-after' : ''}">
            <p style="white-space: pre-wrap;">${q.question}</p>
            <img src="${q.imageUrl}" alt="Question image" class="question-image">
        </div>
    `).join('');

    const textQuestionsHTML = textQuestions ? `
        <div class="question text-questions page-break-before">
            <p style="white-space: pre-wrap;">${textQuestions}</p>
        </div>
    ` : '';

    return imageQuestionsHTML + textQuestionsHTML;
}

// Function to generate HTML for answers
function generateAnswersHTML(answers) {
    return `
        <div class="answer-item">
            <p style="white-space: pre-wrap;">${answers}</p> 
        </div>
    `;
}

// Event listeners for category box clicks
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
                    console.warn(`Image load failed: ${img.src}`);
                    img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/ebM1PAAAAAASUVORK5CYII=';
                };
            });
            const elements = documentClone.querySelectorAll('.question, .answer-item');
            elements.forEach(el => {
                el.style.pageBreakInside = 'avoid';  // Prevent element separation
                el.style.wordBreak = 'break-word'; // Allow long word wrapping
                el.style.margin = '0 auto';
                el.style.maxWidth = '95%';  // Limit maximum width for A4 page
            });
            // Adjust image question sizes
            const imageQuestions = documentClone.querySelectorAll('.image-question');
            imageQuestions.forEach((q, index) => {
                if (index === imageQuestions.length - 1 && index % 2 === 0) {
                    // Use full page for the last odd question
                    q.style.height = '100%';
                } else {
                    q.style.height = '50%';  // Set others to half the page height
                }
                q.style.overflow = 'hidden';
            });
            // Prevent page break before text questions
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
        console.error('Cannot find elements to save as PDF.');
        return;
    }

    // Set common options for PDF generation
    const generatePDF = async (element, options) => {
        return new Promise((resolve, reject) => {
            if (!element) {
                reject(new Error('Invalid element.'));
                return;
            }

            html2pdf().set(options).from(element).outputPdf('blob').then(resolve).catch(reject);
        });
    };

    const questionOpt = { ...commonOpt, filename: `Workbook_Questions_${wb_id}.pdf` };
    const answerOpt = { ...commonOpt, filename: `Workbook_Answers_${wb_id}.pdf` };

    Promise.all([
        generatePDF(questionElement, questionOpt),
        generatePDF(answerElement, answerOpt),
    ])
    .then(async ([questionBlob, answerBlob]) => {
        console.log(`Workbook_Questions_${wb_id}.pdf generation completed`);
        console.log(`Workbook_Answers_${wb_id}.pdf generation completed`);

        const questionFile = new File([questionBlob], `Workbook_Questions_${wb_id}.pdf`, { type: 'application/pdf' });
        const answerFile = new File([answerBlob], `Workbook_Answers_${wb_id}.pdf`, { type: 'application/pdf' });

        try {
            await Promise.all([
                uploadQuestion(wb_id, questionFile),
                uploadAnswer(wb_id, answerFile)
            ]);
            alert(translations[currentLang]['PDF file has been successfully saved. Please check in the storage!'] || 'PDF file has been successfully saved. Please check in the storage!'); // Translated message
        } catch (error) {
            console.error('Error occurred during PDF upload:', error);
            alert('An error occurred while uploading the PDF.');
        }
    })
    .catch(error => {
        console.error('Error occurred during PDF generation:', error);
        alert('An error occurred while generating the PDF.');
    });
}

// Function to load wb_id from cookies
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

// Function to upload workbook
export async function uploadQuestion(wb_id, file) {
    try {
        const formData = new FormData();
        formData.append('wb_id', wb_id);
        formData.append('file', file);

        const response = await axios.post(`${BASE_URL}/api/workbook/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        console.log(`Workbook_Questions_${wb_id}.pdf upload completed`, response.data);
    } catch (error) {
        console.error(`Failed to upload Workbook_Questions_${wb_id}.pdf:`, error);
        throw error;
    }
}

// Function to upload answer sheet
export async function uploadAnswer(wb_id, file) {
    try {
        const formData = new FormData();
        formData.append('wb_id', wb_id);
        formData.append('file', file);

        const response = await axios.post(`${BASE_URL}/api/workbook/answer/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        console.log(`Workbook_Answers_${wb_id}.pdf upload completed`, response.data);
    } catch (error) {
        console.error(`Failed to upload Workbook_Answers_${wb_id}.pdf:`, error);
        throw error;
    }
}

// Function to regenerate questions 
export async function regenerateQuestions() {
    const apiUrl = `${BASE_URL}/api/workbook/retext`;
    const questionGenerationDiv = document.getElementById('question-generation');
    
    try {
        questionGenerationDiv.style.display = 'block';
        showLoadingMessage();

        // Call regeneration API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Check and process response
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Server response:', JSON.stringify(data, null, 2));
        handleRegenerationResponse(data, questionGenerationDiv);
    } catch (error) {
        console.error('Error occurred during regeneration:', error);
        handleRegenerationError(error, questionGenerationDiv);
    }
}

// Response handling function
function handleRegenerationResponse(response, targetElement) {
    console.log('Full response:', response);
    if (response && response.message) {
        console.log('Regeneration response:', response.message);
        displayGeneratedQuestions(response);
    } else {
        console.error('Invalid response structure:', response);
        targetElement.innerHTML = '<p data-i18n="An error occurred during regeneration. Invalid response structure.">An error occurred during regeneration. Invalid response structure.</p>';
        alert(translations[currentLang]['An error occurred during regeneration. Invalid response structure.'] || 'An error occurred during regeneration. Invalid response structure.'); // Apply translation
    }
}    

// Error handling function
function handleRegenerationError(error, targetElement) {
    console.error('Error occurred during regeneration API call:', error);
    targetElement.innerHTML = `<p data-i18n="An error occurred during regeneration.">An error occurred during regeneration: ${error.message}</p>`;
    alert(translations[currentLang]['An error occurred during regeneration.'] || 'An error occurred during regeneration.'); // Apply translation
}