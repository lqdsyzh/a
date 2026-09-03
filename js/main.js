// ========== 启动与初始化 ==========

function initGame() {
    // 每次加载先刷新登录界面列表
    if (typeof renderAccountList === 'function') renderAccountList();
    // 若已有登录态（未退出），直接进入游戏
    if (getCurrentUser()) {
        const loaded = loadGame();
        if (!loaded) newGame();
        document.getElementById('app').classList.remove('hide');
        if (!state.princes.length) checkPrinceBirth();
        log(`欢迎回来，${getCurrentUser()}。`);
        refreshAllUI();
        switchTab('court');
        updateSeasonButton();
    } else {
        // 未登录：显示登录覆盖层
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