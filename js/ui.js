// ========== UI 渲染 ==========

// —— 顶栏 ——
function updateTopBar() {
    document.getElementById('yearDisplay').textContent = `永乐${state.year}年`;
    document.getElementById('seasonDisplay').textContent = `· ${SEASONS[state.season - 1]}`;
    document.getElementById('treasury').textContent = state.treasury;
    document.getElementById('food').textContent = state.food;
    document.getElementById('stability').textContent = state.stability;
    document.getElementById('prestige').textContent = state.prestige;
    document.getElementById('militaryPower').textContent = state.militaryPower;
    document.getElementById('mandate').textContent = state.mandate;
}

function statClass(val, lowThresh, highThresh) {
    if (val <= lowThresh) return 'danger';
    if (val >= highThresh) return 'good';
    return '';
}

// —— 永久区按钮状态 ——
function updateSeasonButton() {
    const btn = document.getElementById('btnYear');
    if (!btn) return;
    const seasonName = SEASONS[state.season - 1];
    if (state.gameOver) { btn.disabled = true; btn.textContent = state.victory ? '盛世已成' : '国祚已断'; return; }
    btn.textContent = `开启${seasonName}季朝议`;
    btn.disabled = false;
}

// —— 势力面板 ——
function renderFactionPanel() {
    const container = document.getElementById('factionList');
    if (!container) return;
    let html = '';
    state.factions.forEach(f => {
        const satCls = f.satisfaction < 30 ? 'faction-sat-low' : 'faction-sat';
        const infCls = f.influence > 70 ? 'faction-inf-high' : 'faction-inf';
        const satAlert = f.satisfaction < 20 ? '<span style="color:#e06060;font-size:9px;">⚠ 即将动乱</span>' : '';
        const infAlert = f.influence > 80 ? '<span style="color:#e0d080;font-size:9px;">⚠ 专权</span>' : '';
        html += `
            <div class="faction-block">
                <div class="faction-bar">
                    <div class="faction-name">${f.name}</div>
                    <div class="faction-bar-track" title="满意度"><div class="faction-bar-fill ${satCls}" style="width:${f.satisfaction}%"></div></div>
                    <span style="font-size:10px;min-width:28px;text-align:right;">${f.satisfaction}</span>${satAlert}
                </div>
                <div class="faction-bar">
                    <div class="faction-name">影响力</div>
                    <div class="faction-bar-track" title="影响力"><div class="faction-bar-fill ${infCls}" style="width:${f.influence}%"></div></div>
                    <span style="font-size:10px;min-width:28px;text-align:right;">${f.influence}</span>${infAlert}
                </div>
                <div class="desc">${f.desc}</div>
            </div>`;
    });
    container.innerHTML = html;
}

// —— 概览 ——
function renderFactionPanelMini() {
    let html = '<div class="row" style="margin-top:6px;">';
    state.factions.forEach(f => {
        const satCls = f.satisfaction < 30 ? 'danger' : '';
        html += `<div class="stat-box ${satCls}"><l>${f.name}</l><s>${f.satisfaction}</s></div>`;
    });
    return html + '</div>';
}

function renderOverview() {
    const container = document.getElementById('overviewContent');
    if (!container) return;
    const stCls = statClass(state.stability, 30, 80);
    const prCls = statClass(state.prestige, 30, 80);
    const mnCls = statClass(state.mandate, 20, 80);
    const fkCls = state.food < 0 ? 'danger' : '';
    const trCls = state.treasury < 1000 ? 'warn' : '';
    const princeInfo = state.princes.length
        ? state.princes.map(p => `${p.name}（${p.char}${p.crown?'·太子':''} 能${p.ability}）`).join('　')
        : '尚无皇子';
    container.innerHTML = `
        <div class="row">
            <div class="stat-box ${trCls}"><l>国库</l><s>${state.treasury}</s></div>
            <div class="stat-box ${fkCls}"><l>粮食</l><s>${state.food}</s></div>
            <div class="stat-box ${stCls}"><l>稳定</l><s>${state.stability}</s></div>
            <div class="stat-box ${prCls}"><l>威望</l><s>${state.prestige}</s></div>
            <div class="stat-box"><l>军力</l><s>${state.militaryPower}</s></div>
            <div class="stat-box ${mnCls}"><l>天命</l><s>${state.mandate}</s></div>
        </div>
        <h4>当朝首辅学派</h4>
        <div style="font-size:11px;color:#a0c8ff;">【${state.scholar}】— ${SCHOLAR_CAUTION[state.scholar] || ''}</div>
        <h4>势力平衡</h4>
        <div>${renderFactionPanelMini()}</div>
        <h4>宗室子嗣</h4>
        <div style="font-size:11px;color:#6a9ad5;">${princeInfo}</div>
        <h4>在位进度</h4>
        <div style="font-size:11px;color:#6a9ad5;line-height:1.7;">
            永乐盛世进度：${state.prosperityYears}/10 年<br>
            中兴之主进度：${state.revivalYears}/5 年${state.wasLowStability ? '（已历经低谷）' : '（未触发）'}
        </div>`;
}

// —— 日志 ——
function renderLog() {
    const container = document.getElementById('logPanel');
    if (!container) return;
    if (state.log.length === 0) { container.innerHTML = '<p style="color:#5a7a9f;">暂无日志。</p>'; return; }
    container.innerHTML = state.log.map(l => {
        const cls = l.level === 'danger' ? 'style="color:#e06060;"'
                  : l.level === 'warn'    ? 'style="color:#e0d080;"'
                  : l.level === 'good'    ? 'style="color:#80e080;"'
                  : '';
        return `<div class="log-entry"><span class="meta">[永乐${l.year}·${l.season}]</span><span ${cls}>${l.text}</span></div>`;
    }).join('');
}

// —— 奏折列表（含首辅） ——
function renderMemorialList() {
    const container = document.getElementById('memorialList');
    if (!container) return;
    const scholarLine = `<div class="alert good" style="margin-bottom:8px;">当朝首辅【${state.scholar}】：${SCHOLAR_CAUTION[state.scholar] || ''}</div>`;
    if (state.currentMemorials.length === 0) { container.innerHTML = scholarLine + '<p>所有奏折已批复完毕。</p>'; return; }
    let html = scholarLine;
    state.currentMemorials.forEach(m => {
        let optsHtml = '';
        m.options.forEach((opt, idx) => {
            optsHtml += `<button onclick="handleMemorialChoice(${m.id}, ${idx})">${opt.text}</button>`;
        });
        html += `<div class="memorial-item">
            <h4>${m.title} <span style="color:#6a9ad5;font-size:10px;">[${m.type}]</span></h4>
            <p>${m.desc}</p>
            <div class="advisor">内阁建议：${m.advisor}</div>
            <div class="options">${optsHtml}</div>
        </div>`;
    });
    container.innerHTML = html;
}

// 朝议状态栏显示当前政策
function renderPolicyAck() {
    const status = document.getElementById('courtStatus');
    if (!status) return;
    if (state.chosenPolicy) status.innerHTML = `本季已颁政令「${state.chosenPolicy}」。点击上方「开启${SEASONS[state.season-1]}季朝议」批复奏折。`;
}

// —— 势力警告 ——
function renderFactionAlert() {
    const container = document.getElementById('factionAlert');
    if (!container) return;
    let html = '';
    state.factions.forEach(f => {
        if (f.satisfaction < 20) html += `<div class="alert">${f.name}满意度极低（${f.satisfaction}），可能引发动乱！</div>`;
        if (f.influence > 80) {
            const cls = (f.id === 'eunuch' || f.id === 'consort') && f.influence > 90 ? 'alert' : 'alert warn';
            html += `<div class="${cls}">${f.name}影响力过高（${f.influence}），有专权之虞！</div>`;
        }
    });
    container.innerHTML = html;
}

// ========== 登录界面 ==========
function showLogin() {
    document.getElementById('loginOverlay').classList.remove('hide');
    renderAccountList();
}
function hideLogin() {
    document.getElementById('loginOverlay').classList.add('hide');
}
function setAuthTab(tab) {
    document.getElementById('loginForm').classList.toggle('hide', tab !== 'login');
    document.getElementById('registerForm').classList.toggle('hide', tab !== 'register');
    const tl = document.getElementById('tabLogin');
    const tr = document.getElementById('tabReg');
    if (tl) tl.classList.toggle('sel', tab === 'login');
    if (tr) tr.classList.toggle('sel', tab === 'register');
}
function handleLogin() {
    const u = document.getElementById('loginUser').value;
    const p = document.getElementById('loginPass').value;
    const res = loginAccount(u, p);
    if (res.ok) enterGame(); else showAuthMsg(res.msg, true);
}
function handleRegister() {
    const u = document.getElementById('regUser').value;
    const p = document.getElementById('regPass').value;
    const p2 = document.getElementById('regPass2').value;
    if (p !== p2) { showAuthMsg('两次密码不一致', true); return; }
    const res = registerAccount(u, p);
    if (res.ok) { showAuthMsg(res.msg); enterGame(); } else showAuthMsg(res.msg, true);
}
function showAuthMsg(msg, isErr) {
    const el = document.getElementById('authMsg');
    if (!el) return;
    el.textContent = msg;
    el.style.color = isErr ? '#e06060' : '#80e080';
}
function enterGame() {
    const app = document.getElementById('app');
    if (app) app.classList.remove('hide');
    hideLogin();
    const user = getCurrentUser();
    const loaded = loadGame();
    if (!loaded) newGame();
    // 兼容旧存档：补默认值
    if (!state.scholar) state.scholar = SCHOLAR_LIST[Math.floor(Math.random() * SCHOLAR_LIST.length)];
    if (!Array.isArray(state.projects)) state.projects = [];
    if (!Array.isArray(state.doneProjects)) state.doneProjects = [];
    if (!Array.isArray(state.princes)) state.princes = [];
    log(`登录成功：${user}。`, 'good');
    if (!state.princes.length) ensureFirstPrince();
    refreshAllUI();
    if (typeof switchTab === 'function') switchTab('court');
    updateSeasonButton();
    if (typeof saveGame === 'function') saveGame();
}
function logout() {
    logoutAccount();
    const app = document.getElementById('app');
    if (app) app.classList.add('hide');
    showLogin();
}
// 开始新的一局（新进度，保留账号）
function startNewGame() {
    newGame();
    log('开启新的一局，再续大明！', 'good');
    if (!state.princes.length) checkPrinceBirth();
    refreshAllUI();
    switchTab('court');
    updateSeasonButton();
    if (typeof saveGame === 'function') saveGame();
}
function refreshAllUI() {
    updateTopBar();
    renderFactionPanel();
    renderOverview();
    renderLog();
    renderFactionAlert();
    renderPolicyPanel();
    renderProjectsPanel();
    renderPrincesPanel();
    renderAccountPanel();
    updateSeasonButton();
    if (typeof renderAccountList === 'function') renderAccountList();
}

function renderAccountList() {
    const db = getAccountDB();
    const container = document.getElementById('accountList');
    if (!container) return;
    const names = Object.keys(db);
    const cur = getCurrentUser();
    container.innerHTML = names.length
        ? names.map(n => `<div class="account-pill ${n === cur ? 'sel' : ''}" onclick="quickLogin('${n}')">${n} · ${db[n].games||0}局 · ${db[n].endings?db[n].endings.length:0}结局</div>`).join('')
        : '<div style="color:#5a7a9f;font-size:11px;">尚无注册账号，请注册。</div>';
}
// 列出账号但密码未保存（本地安全考虑）。仅点击作为"选填到登录框"
function quickLogin(name) {
    const u = document.getElementById('loginUser'); if (u) u.value = name;
    setAuthTab('login');
    showAuthMsg(`已选账号"${name}"，请输入密码。`, false);
}

// —— 账号面板（游戏内） ——
function renderAccountPanel() {
    const container = document.getElementById('accountPanelContent');
    if (!container) return;
    const user = getCurrentUser();
    const db = getAccountDB();
    const acc = user ? db[user] : null;
    let endingsHtml = '';
    if (acc && acc.endings && acc.endings.length) {
        endingsHtml = acc.endings.slice().reverse().map(e => {
            const cls = e.type === 'victory' ? 'good' : '';
            return `<div class="log-entry"><span style="${cls==='good'?'color:#80e080;':''}">${e.name} · 永乐${e.year}年 · ${new Date(e.date).toLocaleDateString()}</span></div>`;
        }).join('');
    } else endingsHtml = '<div style="color:#5a7a9f;font-size:11px;">尚无历史结局。</div>';
    container.innerHTML = `
        <div class="faction-block">
            <div class="faction-bar"><div class="faction-name">当前账号</div><span style="color:#7ec8ff;font-weight:bold;">${user || '未登录'}</span></div>
            <div class="desc">已开局：${acc ? (acc.games||0) : 0} 局　累计在位：${acc ? (acc.yearsPlayed||0) : 0} 年</div>
        </div>
        <h4>历史结局</h4>
        ${endingsHtml}
        <p style="font-size:11px;color:#5a7a9f;margin-top:10px;">本账号为本地账号，进度仅保存在当前设备浏览器。跨设备同步需后端支持。</p>
        <div class="row" style="margin-top:10px;">
            <button class="green" onclick="startNewGame()">开启新局</button>
            <button class="red" onclick="logout()">切换账号</button>
        </div>`;
}

// ========== 政策（每季政令弹窗） ==========
let _projectAdvancedThisSeason = false;
function openPolicyPanel() {
    const modal = document.getElementById('policyModal');
    if (!modal) return;
    modal.classList.remove('hide');
    _projectAdvancedThisSeason = false;
    if (typeof renderPolicyPanel === 'function') renderPolicyPanel();
}
function closePolicyModal() {
    const modal = document.getElementById('policyModal');
    if (modal) modal.classList.add('hide');
}
function renderPolicyPanel() {
    // 面板内政策+奇观
    const list = POLICY_TEMPLATES[state.season] || [];
    const polHtml = `<h4>本季政令（${SEASONS[state.season-1]}季，必选其一）</h4>` +
        list.map((p, i) => `<div class="memorial-item">
            <h4 style="color:#7ec8ff;">${p.text}</h4>
            <p>${p.desc}</p>
            <button ${state.policyChosen ? 'disabled' : ''} onclick="choosePolicy(${i})">颁行此令</button>
        </div>`).join('') +
        (state.chosenPolicy ? `<div class="alert good">本季已颁：「${state.chosenPolicy}」</div>` : '');
    const pol = document.getElementById('policyOpts');
    if (pol) pol.innerHTML = polHtml;
    const staticPanel = document.getElementById('policyListPanel');
    if (staticPanel) staticPanel.innerHTML = polHtml;
    const proj = document.getElementById('projectOpts');
    if (proj) {
        let html = '<h4>修造奇观（可选，每季至多推进一座）</h4>';
        PROJECTS.forEach((p, idx) => {
            const building = state.projects.find(x => x.id === p.id);
            const done = state.doneProjects.includes(p.id);
            if (building) {
                html += `<div class="memorial-item"><h4>${p.name}（营建中 ${building.progress}/${building.turns}）</h4>
                    <div class="faction-bar-track"><div class="faction-bar-fill faction-inf" style="width:${Math.round(building.progress/building.turns*100)}%"></div></div>
                    <button ${_projectAdvancedThisSeason ? 'disabled' : ''} onclick="advanceProject(${idx})">今日推进</button></div>`;
            } else if (!done) {
                const canAfford = state.treasury >= p.cost.treasury && (!p.cost.food || state.food >= p.cost.food);
                html += `<div class="memorial-item"><h4>${p.name}</h4><p>${p.desc}　造价：${p.cost.treasury}银${p.cost.food?' + '+p.cost.food+'粮':''}　工期：${p.turns}季</p>
                    <button ${canAfford ? '' : 'disabled'} onclick="handleProject(${idx},'start')">破土动工</button></div>`;
            } else {
                html += `<div class="memorial-item"><h4>${p.name} <span style="color:#80e080;">（已成）</span></h4></div>`;
            }
        });
        proj.innerHTML = html;
    }
}
function beginMemorialsAction() {
    closePolicyModal();
    if (state.currentMemorials.length === 0) generateMemorials();
    renderMemorialList();
    document.getElementById('memorialModal').classList.remove('hide');
    document.getElementById('btnYear').disabled = true;
}
function advanceProject(idx) {
    if (_projectAdvancedThisSeason) return;
    const p = PROJECTS[idx];
    if (!p || !state.projects.some(x => x.id === p.id)) return;
    handleProject(idx, 'advance');
    _projectAdvancedThisSeason = true;
    renderPolicyPanel();
    renderProjectsPanel();
}
function renderProjectsPanel() {
    const container = document.getElementById('projectsPanelContent');
    if (!container) return;
    let html = state.doneProjects.length
        ? `<div style="margin-bottom:8px;">已落成：${state.doneProjects.map(id => PROJECT_NAMES[id]).join('、')}</div>` : '';
    html += state.projects.length
        ? state.projects.map(p => { const meta = PROJECTS.find(x => x.id === p.id); return `<div class="log-entry">营建中：${meta.name} ${p.progress}/${p.turns}</div>`; }).join('')
        : '<div style="color:#5a7a9f;font-size:11px;">暂无在建奇观。点击「开启朝议」时可选督建。</div>';
    container.innerHTML = html;
}

// ========== 后宫 / 皇子 ==========
function renderPrincesPanel() {
    const container = document.getElementById('royalPanelContent');
    if (!container) return;
    if (!state.princes.length) {
        container.innerHTML = '<div style="color:#5a7a9f;">尚无皇子。国立不早，恐社稷无继。</div>';
        return;
    }
    let html = '';
    state.princes.forEach((p, i) => {
        const cls = p.ability >= 65 ? 'good' : p.ability < 40 ? 'danger' : '';
        html += `<div class="faction-block">
            <div class="faction-bar">
                <div class="faction-name">${p.name}</div>
                <span style="font-size:10px;color:#e8a040;">【${p.char}】</span>
                <span style="font-size:11px;" class="${cls}">资质 ${p.ability}</span>
                <span style="font-size:10px;color:#6a9ad5;">${p.age} 岁</span>
                ${p.crown ? '<span style="color:#e0d080;font-size:10px;">★ 太子</span>' : ''}
            </div>
            <div class="row">
                ${p.crown ? '' : `<button onclick="setHeir(${i})">立为太子</button>`}
                <button onclick="enfeoffPrince(${i})">就藩封王</button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

// —— 势力面板子函数（通用渲染完） ——
function showGameOver() {
    const status = document.getElementById('courtStatus');
    const btn = document.getElementById('btnYear');
    if (state.victory) { if (status) status.innerHTML = '<span style="color:#80e080;font-size:14px;">🎉 大明万年！盛世达成！</span>'; }
    else { if (status) status.innerHTML = '<span style="color:#e06060;font-size:14px;">💀 国祚断绝，大明亡矣！</span>'; }
    if (btn) { btn.disabled = true; btn.textContent = state.victory ? '盛世已成' : '国祚已断'; }
}

function switchTab(tab) {
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hide'));
    document.querySelectorAll('.navBtn').forEach(b => b.classList.remove('act'));
    const panel = document.getElementById('panel-' + tab);
    if (panel) panel.classList.remove('hide');
    const btn = document.querySelector(`.navBtn[data-tab="${tab}"]`);
    if (btn) btn.classList.add('act');
    // 渲染动态面板
    if (tab === 'account') renderAccountPanel();
    if (tab === 'projects') renderProjectsPanel();
    if (tab === 'royal') renderPrincesPanel();
}

// 冒烟辅助：暴露给 html 的全局入口已在 engine/main 中，这里补充挂到 window
window.openPolicyPanel = openPolicyPanel;
window.beginMemorialsAction = beginMemorialsAction;
window.showLogin = showLogin;
window.hideLogin = hideLogin;
window.setAuthTab = setAuthTab;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.logout = logout;
window.startNewGame = startNewGame;