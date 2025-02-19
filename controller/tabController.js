//특정 탭과 해당 콘텐츠 활성화 함수
export function activateTab(tab, sectionId) {
    console.log(`탭 활성화: ${sectionId}`);
    deactivateAllTabs(); // 모든 탭 비활성화
    tab.classList.add('active');
    activateTabContent(sectionId); // 특정 탭 콘텐츠 활성화
}

//ຕ້ອງໃຊ້window.activateTabທຸກຄັ້ງທີexport
window.activateTab = activateTab;

//active 클래스 제거 함수
function deactivateAllTabs() {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active')); // 모든 탭에서 active 클래스 제거
}

// sectionId에 해당하는 콘텐츠 표시 함수
function activateTabContent(sectionId) {
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none'; // 모든 탭 콘텐츠 숨김
    });
    const activeSection = document.getElementById(`${sectionId}-section`);
    if (activeSection) {
        activeSection.style.display = 'block'; // 특정 탭 콘텐츠 표시
        activeSection.style.width = '100%';
        activeSection.style.minHeight = '500px';

        // 보관함 탭 활성화 시 번역 적용
        if (sectionId === 'history') {
            updateText(); // 번역 적용
        }
    } else {
        console.error(`${sectionId}-section 요소를 찾을 수 없습니다.`);
    }
}

//페이지 로드 시 탭 상태 초기화
window.addEventListener('load', function() {
    const activeTab = localStorage.getItem('activeTab');
    if (activeTab === 'history') {
        const historyTab = document.getElementById('history-content');
        if (historyTab) {
            activateTab(historyTab, 'history'); // 이전에 활성화된 보관함(history) 탭을 다시 활성화
        }
        localStorage.removeItem('activeTab'); // 사용 후 삭제
    }
});