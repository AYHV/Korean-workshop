import { displayOCRResult } from '../Views/ocr/ocrView.js';
import { activateTab } from './tabController.js';
import { processPDF, handleImageFile } from '../controller/ocrController.js'; // file handling utilities
import { generateQuestions } from './questionController.js'; // Import problem creation function
import { loadTranslations, translations, currentLang  } from '../services/localization.js';

const BASE_URL = config.BASE_URL;

//An event handler function that runs when the page load completes.
window.onload = async function() {
  const fileInput = document.getElementById('file-upload');
  const completeBtn = document.getElementById('upload-complete-btn');

  //Register an event listener when the element exists normally
  if (fileInput && completeBtn) {
      // Registering a function called when uploading a file
      fileInput.addEventListener('change', displayUploadedFiles);
      // Register a function called when the upload completion button is clicked
      completeBtn.addEventListener('click', completeUpload);
  } else {
      console.error('Required elements are missing.');
  }

  // Activate initial tab (File Upload tab)
  activateTab(document.querySelector('.tab:first-child'), 'upload');
};

// Function to display the list of uploaded files when a file is selected
export function displayUploadedFiles() {
  const input = document.getElementById('file-upload');
  const output = document.getElementById('uploaded-files');
  output.innerHTML = '';

  if (input && output) {
      for (let i = 0; i < input.files.length; i++) {
          const file = input.files[i];
          // Create a new div element to display the file name
          const fileItem = document.createElement('div');
          fileItem.textContent = file.name; // Set the div text to the file name
          output.appendChild(fileItem);
      }
      // Make the uploaded file list visible
      output.style.display = 'block';
  } else {
      console.error('Input or output element not found.');
  }
}

// Function to handle the file upload completion process
export async function completeUpload() {
  const files = document.getElementById('file-upload').files;
  if (files.length === 0) {
      alert(' Please select the file to upload.');
      return;
  }

  displayOCRResult("Processing OCR... Please wait a moment!");

  const ocrResult = await processFiles(files); // Calling file processing functions

  // Display OCR results
  document.getElementById('ocr-result').textContent = ocrResult || 'No OCR results'; // Display message if no results are found
  activateTab(document.querySelector('.tab[onclick*="convert"]'), 'convert');

  // Add problem creation button    
  addGenerateButton(ocrResult); // Call the additional function to create a problem button
}

// Function to process multiple files
async function processFiles(files) {
  let ocrResult = ''; // Initialize the variable to store OCR results

  for (let file of files) {
      ocrResult += await processFile(file); // Process each file and accumulate the result
  }

  return ocrResult; // Return the combined OCR result of all files
}
// Function to process an individual file (supports image and PDF files)
async function processFile(file) {
  if (file.type === 'application/pdf') {
      return await processPDF(file); // Call the function to process PDF files
  } else if (file.type.startsWith('image/')) {
      return await handleImageFile(file); // Call the function to process image files
  } else {
      alert(` The file format is not supported : ${file.name}`);
      return ''; // Return an empty string (no OCR result)
  }
}

// Function to add a "Generate Questions" button
function addGenerateButton(ocrResult) {
  let existingButton = document.getElementById('generate-button');
  if (!existingButton) {
      const generateButton = document.createElement('button'); // Create a new button element
      generateButton.id = 'generate-button'; // Assign an ID to the button
      generateButton.setAttribute('data-i18n', '문제 생성'); // Add a translation key for localization
      generateButton.textContent = translations[currentLang]['문제 생성'] || '문제 생성'; 
      generateButton.onclick = function() {
          // Switch to the "Generate Questions" tab
          activateTab(document.querySelector('.tab[onclick*="generate"]'), 'generate');
          // Retrieve the preferred language stored in localStorage (default: "korean")
          const storedLanguage = localStorage.getItem("preferredLang") || "korean";
            // Map the stored language value to the format required by the API
            const languageMapping = {
              ko: "korean",
              eng: "english",
              lo: "thai"
          };
          const apiLanguage = languageMapping[storedLanguage] || "korean";
          console.log(localStorage.getItem('preferredLang'));
          generateQuestions(ocrResult); // Call the function to generate questions using the OCR result
      };
           // Append the button outside of the ocr-result-box
           const resultBox = document.getElementById('ocr-result-box');
           resultBox.parentNode.appendChild(generateButton); // Append the button outside the box
      };

  }

// Run on page load
document.addEventListener("DOMContentLoaded", () => {
  loadTranslations(); // Load JSON file and set language
});

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

