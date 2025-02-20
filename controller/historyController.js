import { loadTranslations, setLanguage, updateText, translations, currentLang } from '../services/localization.js';

const BASE_URL = window.config.BASE_URL;

const headerImages = {
    ko: '/assets/img/penguin_ko.png',
    en: '/assets/img/penguin_en.png',
    lo: '/assets/img/penguin_lo.png',
};

async function translateWorkbookName(wb_id) {
    const translatedWord = translations[currentLang]["문제집"] || "Workbook";
    return `${translatedWord} ${wb_id}`;
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadTranslations();
    updateHeaderImage();
    await fetchProblemSets();
});

export async function fetchProblemSets() {
    try {
        const response = await fetchAllProblemSets();
        if (Array.isArray(response?.data?.data)) {
            console.log(response.data.data);
            await processAndDisplayProblemSets(response.data.data);
            updateText();
        } else {
            throw new Error('Invalid data format.');
        }
    } catch (error) {
        console.error("Failed to fetch workbook list", error);
    }
}

async function fetchAllProblemSets() {
    const apiUrl = `${BASE_URL}/api/workbook/all`;
    return axios.get(apiUrl);
}

async function processAndDisplayProblemSets(problemSets) {
    const numberedProblemSets = await Promise.all(problemSets
        .sort((a, b) => b.wb_id - a.wb_id)
        .map(async (set, index) => ({
            ...set,
            displayIndex: index + 1,
            translatedName: await translateWorkbookName(set.wb_id),
            createdDate: set.wb_create
        })));

    displayProblemSets(numberedProblemSets);
}

async function displayProblemSets(problemSets) {
    const problemListDiv = document.getElementById('problem-list');
    problemListDiv.innerHTML = '';

    const existingHeaderImages = document.querySelector('.header-images');
    if (existingHeaderImages) {
        existingHeaderImages.remove();
    }

    const headerImagesDiv = document.createElement('div');
    headerImagesDiv.className = 'header-images';
    headerImagesDiv.innerHTML = `
        <img src="${headerImages[currentLang]}" alt="Right image" class="header-image-right">
    `;
    problemListDiv.parentNode.insertBefore(headerImagesDiv, problemListDiv);

    if (problemSets.length === 0) {
        problemListDiv.innerHTML = '<p data-i18n="No saved workbooks.">No saved workbooks.</p>';
        updateText();
        return;
    }

    for (const set of problemSets) {
        const setDiv = document.createElement('div');
        setDiv.className = 'problem-set';
        const translatedCreatedText = translations[currentLang]["생성"] || "Created";

        setDiv.innerHTML = `
            <div class="id-and-favorite">
                <h2>${set.translatedName}</h2>
                <img src="/assets/img/delete.png" alt="Delete" class="delete-icon" onclick="deleteWorkbook(${set.wb_id})">
            </div>
            <h3>${set.wb_create} ${translatedCreatedText}</h3>
            <div class="workbook-button">
                <button class="viewProblems" data-id="${set.wb_id}" data-i18n="Workbook">Workbook</button>
                <button class="viewAnswers" data-id="${set.wb_id}" data-i18n="Answer Sheet">Answer Sheet</button>
            </div>
        `;

        setDiv.querySelector('.viewProblems').addEventListener('click', () => {
            if (typeof window.viewProblems === 'function') {
                window.viewProblems(set.wb_id);
            } else {
                console.error('viewProblems function is not defined.');
            }
        });

        setDiv.querySelector('.viewAnswers').addEventListener('click', () => {
            if (typeof window.viewAnswers === 'function') {
                window.viewAnswers(set.wb_id);
            } else {
                console.error('viewAnswers function is not defined.');
            }
        });

        problemListDiv.appendChild(setDiv);
    }
    updateText();
}

// Download workbook
window.viewProblems = async function(wb_id) {
    console.log(`Starting download of workbook ${wb_id}`);
    try {
        // Call workbook download API
        const apiUrl = `${BASE_URL}/api/workbook/download/${wb_id}`;
        const response = await axios.get(apiUrl, {
            params: { wb_id },
            responseType: 'blob', // Receive file data
        });

        // Convert Blob data to file and download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Workbook_${wb_id}.pdf`); // Specify download file name
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log(`Download of workbook ${wb_id} completed`);
    } catch (error) {
        console.error(`Failed to download workbook ${wb_id}:`, error);
        alert('An error occurred while downloading the workbook. Please try again.');
    }
};

// Download answer sheet 
window.viewAnswers = async function (wb_id) {
    console.log(`Starting download of answer sheet ${wb_id}`);
    try {
        // Call answer sheet download API
        const apiUrl = `${BASE_URL}/api/workbook/answer/download/${wb_id}`;
        const response = await axios.get(apiUrl, {
            params: { wb_id }, // Pass query parameters
            responseType: 'blob', // Receive file data
        });

        // Convert Blob data to file and download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `AnswerSheet_${wb_id}.pdf`); // Specify download file name
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log(`Download of answer sheet ${wb_id} completed`);
    } catch (error) {
        console.error(`Failed to download answer sheet ${wb_id}:`, error);
        alert('An error occurred while downloading the answer sheet. Please try again.');
    }
};

// Delete workbook
window.deleteWorkbook = async function(wb_id) {
    const apiUrl = `${BASE_URL}/api/workbook/delete`; // Delete API URL

    // Show confirm dialog with translated message
    const confirmMessage = translations[currentLang]['해당 문제집을 삭제하시겠습니까?'] || 'Do you want to delete this workbook?';
    if (confirm(confirmMessage)) {
        try {
            const response = await axios.delete(apiUrl, {
                params: { wb_id },
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.status !== 200) throw new Error('Workbook deletion failed');
            alert(translations[currentLang]['문제집이 삭제되었습니다.'] || 'Workbook has been deleted.');

            // Refresh workbook list
            fetchProblemSets(); // Call function to refresh workbook list
        } catch (error) {
            console.error('Error occurred while deleting workbook:', error);
            if (response.status !== 200) throw new Error('Workbook deletion failed');
            alert(translations[currentLang]['문제집이 삭제되었습니다.'] || 'Workbook has been deleted.');

        }
    }
}
function updateHeaderImage() {
    const headerImageElement = document.querySelector('.header-images img');
    if (headerImageElement) {
        headerImageElement.src = headerImages[currentLang];
    }
}

document.querySelectorAll(".translate-btn").forEach((button) => {
    button.addEventListener("click", () => {
        const lang = button.dataset.lang;
        setLanguage(lang);
        updateHeaderImage();
        fetchProblemSets(); // Refresh workbook list
    });
});