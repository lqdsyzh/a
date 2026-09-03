// ========== 启动与初始化 ==========

function initGame() {
    if (typeof renderAccountList === 'function') renderAccountList();
    if (getCurrentUser()) {
        const loaded = loadGame();
        if (!loaded) newGame();
        // 兼容旧存档字段
        if (!state.scholar) state.scholar = (typeof SCHOLAR_LIST !== 'undefined') ? SCHOLAR_LIST[Math.floor(Math.random() * SCHOLAR_LIST.length)] : '儒家';
        if (!Array.isArray(state.projects)) state.projects = [];
        if (!Array.isArray(state.doneProjects)) state.doneProjects = [];
        if (!Array.isArray(state.princes)) state.princes = [];
        document.getElementById('app').classList.remove('hide');
        if (!state.princes.length && typeof ensureFirstPrince === 'function') ensureFirstPrince();
        log(`欢迎回来，${getCurrentUser()}。`);
        refreshAllUI();
        switchTab('court');
        updateSeasonButton();
    } else {
        document.getElementById('app').classList.add('hide');
        document.getElementById('loginOverlay').classList.remove('hide');
        setAuthTab('login');
    }
    renderAccountList();
}

// 暴露给 HTML onclick 使用的全局函数
window.startCourt = startCourt;
window.switchTab = switchTab;
window.handleMemorialChoice = handleMemorialChoice;
window.choosePolicy = choosePolicy;
window.handleProject = handleProject;
window.advanceProject = advanceProject;
window.setHeir = setHeir;
window.enfeoffPrince = enfeoffPrince;

// 页面加载完毕启动
window.onload = initGame;

// 离开页面前自动存档
window.addEventListener('beforeunload', () => {
    if (typeof saveGame === 'function' && getCurrentUser()) saveGame();
});