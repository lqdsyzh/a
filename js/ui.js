// ========== UI 渲染 ==========

function updateTopBar() {
    const y = `永乐${state.year}年`;
    document.getElementById('yearDisplay').textContent = y;
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
                    <span style="font-size:10px;min-width:28px;text-align:right;">${f.satisfaction}</span>
                    ${satAlert}
                </div>
                <div class="faction-bar">
                    <div class="faction-name">影响力</div>
                    <div class="faction-bar-track" title="影响力"><div class="faction-bar-fill ${infCls}" style="width:${f.influence}%"></div></div>
                    <span style="font-size:10px;min-width:28px;text-align:right;">${f.influence}</span>
                    ${infAlert}
                </div>
                <div class="desc">${f.desc}</div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderFactionPanelMini() {
    let html = '<div class="row" style="margin-top:6px;">';
    state.factions.forEach(f => {
        const satCls = f.satisfaction < 30 ? 'danger' : '';
        html += `<div class="stat-box ${satCls}"><l>${f.name}</l><s>${f.satisfaction}</s></div>`;
    });
    html += '</div>';
    return html;
}

function renderOverview() {
    const container = document.getElementById('overviewContent');
    if (!container) return;
    const stCls = statClass(state.stability, 30, 80);
    const prCls = statClass(state.prestige, 30, 80);
    const mnCls = statClass(state.mandate, 20, 80);
    const fkCls = state.food < 0 ? 'danger' : '';
    const trCls = state.treasury < 1000 ? 'warn' : '';
    container.innerHTML = `
        <div class="row">
            <div class="stat-box ${trCls}"><l>国库</l><s>${state.treasury}</s></div>
            <div class="stat-box ${fkCls}"><l>粮食</l><s>${state.food}</s></div>
            <div class="stat-box ${stCls}"><l>稳定</l><s>${state.stability}</s></div>
            <div class="stat-box ${prCls}"><l>威望</l><s>${state.prestige}</s></div>
            <div class="stat-box"><l>军力</l><s>${state.militaryPower}</s></div>
            <div class="stat-box ${mnCls}"><l>天命</l><s>${state.mandate}</s></div>
        </div>
        <h4>势力平衡</h4>
        <div>${renderFactionPanelMini()}</div>
        <h4>在位进度</h4>
        <div style="font-size:11px;color:#6a9ad5;line-height:1.7;">
            永乐盛世进度：${state.prosperityYears}/10 年<br>
            中兴之主进度：${state.revivalYears}/5 年${state.wasLowStability ? '（已历经低谷）' : '（未触发）'}
        </div>
    `;
}

function renderLog() {
    const container = document.getElementById('logPanel');
    if (!container) return;
    if (state.log.length === 0) {
        container.innerHTML = '<p style="color:#5a7a9f;">暂无日志。</p>';
        return;
    }
    container.innerHTML = state.log.map(l => {
        const cls = l.level === 'danger' ? 'style="color:#e06060;"'
                  : l.level === 'warn'    ? 'style="color:#e0d080;"'
                  : l.level === 'good'    ? 'style="color:#80e080;"'
                  : '';
        return `<div class="log-entry"><span class="meta">[永乐${l.year}·${l.season}]</span><span ${cls}>${l.text}</span></div>`;
    }).join('');
}

function renderMemorialList() {
    const container = document.getElementById('memorialList');
    if (!container) return;
    if (state.currentMemorials.length === 0) {
        container.innerHTML = '<p>所有奏折已批复完毕。</p>';
        return;
    }
    let html = '';
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

function renderFactionAlert() {
    const container = document.getElementById('factionAlert');
    if (!container) return;
    let html = '';
    state.factions.forEach(f => {
        if (f.satisfaction < 20) {
            html += `<div class="alert">${f.name}满意度极低（${f.satisfaction}），可能引发动乱！</div>`;
        }
        if (f.influence > 80) {
            const cls = (f.id === 'eunuch' || f.id === 'consort') && f.influence > 90 ? 'alert' : 'alert warn';
            html += `<div class="${cls}">${f.name}影响力过高（${f.influence}），有专权之虞！</div>`;
        }
    });
    container.innerHTML = html;
}

function showGameOver() {
    const status = document.getElementById('courtStatus');
    const btn = document.getElementById('btnYear');
    if (state.victory) {
        if (status) status.innerHTML = `<span style="color:#80e080;font-size:14px;">🎉 大明万年！盛世达成！</span>`;
    } else {
        if (status) status.innerHTML = `<span style="color:#e06060;font-size:14px;">💀 国祚断绝，大明亡矣！</span>`;
    }
    if (btn) {
        btn.disabled = true;
        btn.textContent = state.victory ? '盛世已成' : '国祚已断';
    }
}

function switchTab(tab) {
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hide'));
    document.querySelectorAll('.navBtn').forEach(b => b.classList.remove('act'));
    const panel = document.getElementById('panel-' + tab);
    if (panel) panel.classList.remove('hide');
    const btn = document.querySelector(`.navBtn[onclick="switchTab('${tab}')"]`);
    if (btn) btn.classList.add('act');
}
