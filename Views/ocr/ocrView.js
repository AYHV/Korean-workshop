// views/ocrView.js
export function displayOCRResult(text) {
    const resultDiv = document.getElementById('ocr-result');
    if (resultDiv) {
        resultDiv.textContent = text;
    } else {
        console.error('OCR result div not found.');
    }
}
