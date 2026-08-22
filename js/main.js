// ========== 初始化与启动 ==========

function initGame() {
    // 尝试读档；无存档则使用初始 state（engine.js 中已定义初始值）
    const loaded = loadGame();
    if (!loaded) {
        // state 已是 engine.js 顶部的初始值，无需再 newGame()
        log('游戏开始。你是大明皇帝，治理天下。', 'good');
    } else {
        log('已加载存档，继续治理大明。', 'good');
    }
    updateTopBar();
    renderFactionPanel();
    renderOverview();
    renderLog();
    renderFactionAlert();
    switchTab('court');

    const status = document.getElementById('courtStatus');
    const btn = document.getElementById('btnYear');
    if (state.gameOver) {
        showGameOver();
    } else {
        const seasonName = SEASONS[state.season - 1];
        if (status) status.innerHTML = `永乐${state.year}年${seasonName}季，点击「开启${seasonName}季朝议」处理朝政。`;
        if (btn) {
            btn.textContent = `开启${seasonName}季朝议`;
            btn.disabled = false;
        }
    }
}

// 暴露给 HTML onclick 使用的全局函数（已声明同名，这里仅作显式引用以确认存在）
window.startCourt = startCourt;
window.switchTab = switchTab;
window.handleMemorialChoice = handleMemorialChoice;

// 页面加载完毕启动
window.onload = initGame;

// 离开页面前自动存档
window.addEventListener('beforeunload', () => {
    if (typeof saveGame === 'function') saveGame();
});
