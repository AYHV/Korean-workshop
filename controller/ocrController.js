// Google Cloud Vision API settings
const OCR_apikey = config.OCR_apikey;  // Google Cloud Vision API key
const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${OCR_apikey}`;
// Refactor performOCR function (pass image data to API request)
export async function performOCR(base64Image) {
    const requestBody = {
        requests: [
            {
                image: { content: base64Image },
                features: [{ type: 'TEXT_DETECTION' }],
                imageContext: { languageHints: ['ko', 'lo', 'eng'] }
            }
        ]
    };

    try {
        const response = await fetch(visionApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        if (data.responses && data.responses[0].fullTextAnnotation) {
            return data.responses[0].fullTextAnnotation.text; // Return detected text
        } else {
            throw new Error('Text detection failed.');
        }
    } catch (error) {
        throw new Error('An error occurred during OCR processing: ' + error.message);
    }
}

// Function to convert image file to Base64
export function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]); // Return Base64 string
        reader.onerror = reject;
        reader.readAsDataURL(file); // Convert file to Base64
    });
}

// Function to process PDF files
export async function processPDF(file) {
    console.log('Processing PDF:', file.name);
    const pdfData = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

    let ocrResult = ''; // Initialize OCR result

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const canvas = await createCanvasForPage(page); // Call async to get canvas

        // Convert canvas to Base64 and perform OCR
        const base64Image = canvas.toDataURL('image/jpeg', 0.9).split(',')[1]; // Convert to Base64
        try {
            const text = await performOCR(base64Image); // Pass Base64 to OCR
            ocrResult += text.trim() + '\n\n'; // Accumulate OCR result
        } catch (error) {
            console.error(`Error occurred during OCR processing on PDF page (page ${pageNum}):`, error);
            ocrResult += `Error occurred while processing page ${pageNum}: ${error.message}\n\n`;
        }
    }

    console.log('OCR Result:', ocrResult);
    return ocrResult; // Return final OCR result
}

// Function to create a canvas for a page (using HTML canvas element to render PDF page)
export async function createCanvasForPage(page) {
    const viewport = page.getViewport({ scale: 1 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport: viewport }).promise; // Await possible

    return canvas;
}

// Function to handle image files
export async function handleImageFile(file) {
    console.log('Handling image file:', file.name);
    const base64Image = await convertFileToBase64(file); // Convert image file to Base64
    try {
        const text = await performOCR(base64Image); // Perform OCR on Base64
        console.log('OCR Result:', text);
        return text.trim() + '\n\n'; // Return OCR result
    } catch (error) {
        console.error(`Error occurred during image OCR processing:`, error);
        return `Error occurred during image OCR processing: ${error.message}\n\n`; // Return error message
    }
}