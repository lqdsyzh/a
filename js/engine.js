// ========== 全局状态 ==========
// 字段定义见设计文档 3.1
const state = {
    year: 1,
    season: 1,            // 1春 2夏 3秋 4冬
    treasury: 10000,
    food: 5000,
    stability: 60,
    prestige: 50,
    militaryPower: 8000,
    mandate: 70,
    factions: JSON.parse(JSON.stringify(FACTIONS)), // 深拷贝静态数据
    currentMemorials: [],
    log: [],
    pendingFactionEvent: null,   // 待触发的势力事件（用于本轮提示）
    gameOver: false,
    victory: null,
    prosperityYears: 0,          // 永乐盛世计数
    revivalYears: 0,             // 中兴之主计数
    wasLowStability: false       // 是否经历过稳定<30
};

// ========== 工具函数 ==========
function log(message, level) {
    state.log.unshift({
        year: state.year,
        season: SEASONS[state.season - 1],
        text: message,
        level: level || 'info'   // info/warn/danger/good
    });
    if (state.log.length > 80) state.log.pop();
    if (typeof renderLog === 'function') renderLog();
}

function getFaction(id) {
    return state.factions.find(f => f.id === id);
}

function updateFaction(id, satisfactionDelta, influenceDelta) {
    const faction = getFaction(id);
    if (!faction) return;
    if (satisfactionDelta) faction.satisfaction = Math.max(0, Math.min(100, faction.satisfaction + satisfactionDelta));
    if (influenceDelta)    faction.influence    = Math.max(5, Math.min(100, faction.influence    + influenceDelta));
}

function applyEffects(effects) {
    if (!effects) return;
    if (effects.treasury)              state.treasury      = Math.max(0, state.treasury + effects.treasury);
    if (effects.food)                 state.food          = state.food + effects.food;
    if (effects.stability)            state.stability     = Math.max(0, Math.min(100, state.stability + effects.stability));
    if (effects.prestige)             state.prestige      = Math.max(0, Math.min(100, state.prestige + effects.prestige));
    if (effects.militaryPower)        state.militaryPower = Math.max(0, state.militaryPower + effects.militaryPower);
    if (effects.mandate)              state.mandate       = Math.max(0, Math.min(100, state.mandate + effects.mandate));
    if (effects.civilSatisfaction)    updateFaction('civil',    effects.civilSatisfaction,    effects.influenceCivil);
    if (effects.militarySatisfaction)updateFaction('military', effects.militarySatisfaction, effects.influenceMilitary);
    if (effects.royalSatisfaction)    updateFaction('royal',    effects.royalSatisfaction,    effects.influenceRoyal);
    if (effects.eunuchSatisfaction)   updateFaction('eunuch',   effects.eunuchSatisfaction,   effects.influenceEunuch);
    if (effects.consortSatisfaction)  updateFaction('consort',  effects.consortSatisfaction,  effects.influenceConsort);
}

// ========== 奏折系统 ==========
// 季度系统：春/夏/秋 冬各 1 份，2-3 份奏折；冬 1-2 份
function generateMemorials() {
    let count;
    if (state.season === 4) count = 1 + Math.floor(Math.random() * 2); // 冬 1-2
    else count = 2 + Math.floor(Math.random() * 2);                    // 春/夏/秋 2-3

    // 简单避免短期重复：记录最近3份标题
    const recent = (state._recentMemorials || []).slice(-3);
    const pool = MEMORIAL_TEMPLATES.filter(t => !recent.includes(t.title));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, Math.min(count, pool.length));
    state._recentMemorials = (state._recentMemorials || []).concat(chosen.map(c => c.title));

    state.currentMemorials = chosen.map((tpl, idx) => ({ id: idx, ...tpl }));
    return state.currentMemorials;
}

function handleMemorialChoice(memorialId, optionIndex) {
    const memorial = state.currentMemorials.find(m => m.id === memorialId);
    if (!memorial) return;
    const option = memorial.options[optionIndex];
    if (!option) return;

    applyEffects(option.effects);
    log(`批复「${memorial.title}」：${option.text}`);

    state.currentMemorials = state.currentMemorials.filter(m => m.id !== memorialId);
    if (typeof renderMemorialList === 'function') renderMemorialList();

    if (state.currentMemorials.length === 0) {
        closeMemorialModal();
        completeSeason();
    }
}

function startCourt() {
    if (state.gameOver) return;
    if (state.currentMemorials.length > 0) {
        document.getElementById('memorialModal').classList.remove('hide');
        renderMemorialList();
        return;
    }
    generateMemorials();
    renderMemorialList();
    document.getElementById('memorialModal').classList.remove('hide');
    document.getElementById('btnYear').disabled = true;
}

function closeMemorialModal() {
    const modal = document.getElementById('memorialModal');
    if (modal) modal.classList.add('hide');
}

// ========== 季度结算 ==========
function completeSeason() {
    // 季度收入
    const inc = SEASONAL_INCOME[state.season];
    if (inc) {
        if (inc.food) state.food += inc.food;
        if (inc.militaryPower) state.militaryPower += inc.militaryPower;
        if (inc.treasury) state.treasury += inc.treasury;
        if (inc.prestige) state.prestige = Math.min(100, state.prestige + inc.prestige);
        if (inc.mandate) state.mandate = Math.min(100, state.mandate + inc.mandate);
        log(`${SEASONS[state.season - 1]}季结算：${inc.desc}`);
    }

    // 推进季节
    state.season++;
    if (state.season > 4) {
        annualSettlement();
        state.season = 1;
        state.year++;
    }

    // 检查势力阈值与胜负
    checkFactionThresholds();
    checkVictoryDefeat();

    // 更新 UI
    if (typeof updateTopBar === 'function') updateTopBar();
    if (typeof renderFactionPanel === 'function') renderFactionPanel();
    if (typeof renderOverview === 'function') renderOverview();
    if (typeof renderFactionAlert === 'function') renderFactionAlert();
    if (typeof switchTab === 'function') switchTab('court');

    if (state.gameOver) {
        if (typeof showGameOver === 'function') showGameOver();
        return;
    }

    const seasonName = SEASONS[state.season - 1];
    const status = document.getElementById('courtStatus');
    const btn = document.getElementById('btnYear');
    if (status) status.innerHTML = `已进入${seasonName}季，点击「开启${seasonName}季朝议」处理政务。`;
    if (btn) {
        btn.textContent = `开启${seasonName}季朝议`;
        btn.disabled = false;
    }
}

function annualSettlement() {
    // 年度基础税收与秋收
    state.treasury += 500;
    state.food += 300;
    if (Math.random() < 0.3) {
        state.food += 200;
        log('今年风调雨顺，粮食丰收。', 'good');
    }
    // 文官自然膨胀、武将衰减、宦官缓增
    updateFaction('civil', 1, 1);
    updateFaction('military', -1, 0);
    updateFaction('eunuch', 1, 1);
    log(`永乐${state.year}年年度结算完成。`);
}

// ========== 势力行为触发 ==========
// 满意度<20 触发 lowSat；影响力>80 触发 highInf；宦官/外戚>90 触发失败
function checkFactionThresholds() {
    state.factions.forEach(f => {
        // 满意度过低：触发具体行为
        if (f.satisfaction < 20 && FACTION_EVENTS[f.id] && FACTION_EVENTS[f.id].lowSat) {
            const ev = FACTION_EVENTS[f.id].lowSat;
            // 武将 lowSat 时额外 50% 概率升级为兵变
            if (f.id === 'military' && Math.random() < 0.5) {
                applyEffects({ militaryPower: -500, stability: -5 });
                log(`【兵变】${f.name}军心崩溃，部分兵将哗变劫掠州县！`, 'danger');
            } else {
                log(`【${ev.name}】${ev.desc}`, 'warn');
            }
            applyEffects(ev.effects);
            // 警告后回升一点，避免反复触发
            f.satisfaction = 25;
        }
        // 影响力过高：触发专权
        if (f.influence > 80 && FACTION_EVENTS[f.id] && FACTION_EVENTS[f.id].highInf) {
            const ev = FACTION_EVENTS[f.id].highInf;
            log(`【${ev.name}】${ev.desc}`, 'warn');
            applyEffects(ev.effects);
            f.influence = 75; // 回落避免反复
        }
        // 宦官/外戚>90：触发失败条件
        if ((f.id === 'eunuch' || f.id === 'consort') && f.influence > 90) {
            const fail = f.id === 'eunuch' ? FAIL_THRESHOLDS.eunuchOver90 : FAIL_THRESHOLDS.consortOver90;
            triggerGameOver(fail);
        }
    });
}

// ========== 胜负判定 ==========
function checkVictoryDefeat() {
    // 失败：天命=0
    if (state.mandate <= 0) {
        triggerGameOver(FAIL_THRESHOLDS.mandate0);
        return;
    }
    // 失败：稳定=0
    if (state.stability <= 0) {
        triggerGameOver(FAIL_THRESHOLDS.stability0);
        return;
    }
    // 失败：农民起义（粮<0 且稳定<20）
    if (state.food < 0 && state.stability < 20) {
        triggerGameOver(FAIL_THRESHOLDS.peasantRevolt);
        return;
    }

    // 胜利：永乐盛世（连续10年稳定>80 威望>80 天命>80）
    if (state.stability > 80 && state.prestige > 80 && state.mandate > 80) {
        state.prosperityYears++;
        if (state.prosperityYears >= 10) {
            triggerVictory(VICTORY_CONDITIONS.yongleProsperity);
            return;
        }
    } else {
        state.prosperityYears = 0;
    }

    // 中兴之主：从稳定<30 恢复到稳定>70，持续5年
    if (state.stability < 30) state.wasLowStability = true;
    if (state.wasLowStability && state.stability > 70) {
        state.revivalYears++;
        if (state.revivalYears >= 5) {
            triggerVictory(VICTORY_CONDITIONS.revival);
        }
    } else if (state.stability <= 70) {
        state.revivalYears = 0;
    }
}

function triggerGameOver(fail) {
    if (state.gameOver) return;
    state.gameOver = true;
    state.victory = false;
    log(`【亡国】${fail.desc}`, 'danger');
}

function triggerVictory(win) {
    if (state.gameOver) return;
    state.gameOver = true;
    state.victory = true;
    log(`【盛世】${win.desc} —— 大明万年！`, 'good');
}

// ========== 存档/读档 ==========
function saveGame() {
    try {
        localStorage.setItem('damingguoce_save', JSON.stringify(state));
        return true;
    } catch (e) {
        return false;
    }
}

function loadGame() {
    try {
        const data = localStorage.getItem('damingguoce_save');
        if (!data) return false;
        const saved = JSON.parse(data);
        Object.assign(state, saved);
        return true;
    } catch (e) {
        return false;
    }
}

function newGame() {
    const fresh = {
        year: 1, season: 1, treasury: 10000, food: 5000,
        stability: 60, prestige: 50, militaryPower: 8000, mandate: 70,
        factions: JSON.parse(JSON.stringify(FACTIONS)),
        currentMemorials: [], log: [], pendingFactionEvent: null,
        gameOver: false, victory: null,
        prosperityYears: 0, revivalYears: 0, wasLowStability: false,
        _recentMemorials: []
    };
    Object.assign(state, fresh);
}
