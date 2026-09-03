// ========== 账号存储（本地账号系统） ==========
const ACCOUNTS_KEY = 'daming_accounts';
const CURRENT_KEY  = 'daming_current';
// 每账号进度存档 key：'daming_save_' + username

function getAccountDB() {
    try {
        const raw = localStorage.getItem(ACCOUNTS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}
function getCurrentUser() {
    try { return localStorage.getItem(CURRENT_KEY) || null; }
    catch (e) { return null; }
}
function getSaveKey(u) { return 'daming_save_' + (u || 'guest'); }

// —— 账号操作 ——
function registerAccount(user, pass) {
    user = (user || '').trim();
    if (!/^[A-Za-z0-9_\u4e00-\u9fa5]{2,16}$/.test(user)) return { ok:false, msg:'用户名需为2-16位中文/字母/数字/下划线' };
    if (!pass || pass.length < 4) return { ok:false, msg:'密码至少4位' };
    const db = getAccountDB();
    if (db[user]) return { ok:false, msg:'该用户名已被注册' };
    db[user] = { password: pass, created: Date.now(), endings: [], games: 0, yearsPlayed: 0 };
    try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(db)); } catch(e){ return {ok:false,msg:'存储失败'}; }
    loginAccount(user, pass);
    return { ok:true, msg:'注册成功' };
}
function loginAccount(user, pass) {
    const db = getAccountDB();
    if (!db[user]) return { ok:false, msg:'用户不存在' };
    if (db[user].password !== pass) return { ok:false, msg:'密码错误' };
    try { localStorage.setItem(CURRENT_KEY, user); } catch(e){}
    return { ok:true, msg:'登录成功' };
}
function logoutAccount() {
    if (typeof saveGame === 'function') saveGame();
    try { localStorage.removeItem(CURRENT_KEY); } catch(e){}
}

// —— 当前账号的进度存档（每账号独立） ——
function saveGame() {
    const u = getCurrentUser() || 'guest';
    if (!u || u === 'guest') return false;
    try { localStorage.setItem(getSaveKey(u), JSON.stringify(state)); return true; }
    catch (e) { return false; }
}
function loadGame() {
    const u = getCurrentUser();
    if (!u) return false;
    try {
        const data = localStorage.getItem(getSaveKey(u));
        if (!data) return false;
        Object.assign(state, JSON.parse(data));
        return true;
    } catch (e) { return false; }
}
// 记录一局结局到账号
function recordEnding(endingType) {
    const u = getCurrentUser(); if (!u) return;
    const db = getAccountDB();
    if (!db[u]) return;
    db[u].endings = db[u].endings || [];
    db[u].endings.push({ type: endingType, name: ACCOUNT_ENDING_NAMES[endingType] || endingType, year: state.year, date: Date.now() });
    db[u].games = (db[u].games || 0) + 1;
    db[u].yearsPlayed = (db[u].yearsPlayed || 0) + state.year;
    try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(db)); } catch(e){}
}

// ========== 全局状态 ==========
const state = {
    year: 1,
    season: 1,            // 1春 2夏 3秋 4冬
    treasury: 10000,
    food: 5000,
    stability: 60,
    prestige: 50,
    militaryPower: 8000,
    mandate: 70,
    factions: JSON.parse(JSON.stringify(FACTIONS)),
    currentMemorials: [],
    log: [],
    gameOver: false,
    victory: null,
    prosperityYears: 0,
    revivalYears: 0,
    wasLowStability: false,
    // —— 新系统 ——
    scholar: '儒家',          // 当朝首辅学派
    policyChosen: false,      // 本季是否已选政策
    chosenPolicy: null,       // 本季所选政策文案
    projects: [],             // 在建奇观 [{id, progress, turns}]
    doneProjects: [],         // 已完工奇观 id
    princes: [],              // 皇子列表
    heir: null,               // 太子 index（into princes）
    lastPrinceCheck: 0,       // 上次皇子检查年
    hazards: []               // 待注入的隐患（次季处理）
};

// ========== 工具函数 ==========
function log(message, level) {
    state.log.unshift({ year: state.year, season: SEASONS[state.season - 1], text: message, level: level || 'info' });
    if (state.log.length > 100) state.log.pop();
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
    if (effects.militarySatisfaction) updateFaction('military', effects.militarySatisfaction, effects.influenceMilitary);
    if (effects.royalSatisfaction)    updateFaction('royal',    effects.royalSatisfaction,    effects.influenceRoyal);
    if (effects.eunuchSatisfaction)   updateFaction('eunuch',   effects.eunuchSatisfaction,   effects.influenceEunuch);
    if (effects.consortSatisfaction)  updateFaction('consort',  effects.consortSatisfaction,  effects.influenceConsort);
}

// ========== 奏折系统 ==========
function generateMemorials() {
    const baseCount = state.season === 4 ? 1 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 2);
    let count = baseCount;
    let list = [];
    // 先注入待处理隐患（至多1条本季）
    const hazardPool = [...HAZARD_POOL].filter(h => state.hazards.includes(h.title));
    if (hazardPool.length > 0 && count > 0) {
        const h = hazardPool[Math.floor(Math.random() * hazardPool.length)];
        list.push({ id: 0, ...h, title: h.title + '（隐患）' });
        state.hazards = state.hazards.filter(t => t !== h.title);
        count--;
    }
    const recent = (state._recentMemorials || []).slice(-3);
    const pool = MEMORIAL_TEMPLATES.filter(t => !recent.includes(t.title));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, Math.min(count, pool.length));
    state._recentMemorials = (state._recentMemorials || []).concat(chosen.map(c => c.title));
    chosen.forEach((tpl, i) => list.push({ id: list.length + i, ...tpl }));
    state.currentMemorials = list;
    return state.currentMemorials;
}

// 处理失当 → 积压隐患（启发式：稳定或粮大幅下降）
function maybeAccumulateHazard(option) {
    const ev = option.effects || {};
    const bad = (ev.stability <= -10) || (ev.food !== undefined && ev.food <= -800) || (ev.treasury !== undefined && ev.treasury <= -1200);
    if (!bad) return;
    const open = HAZARD_POOL.filter(h => !state.hazards.includes(h.title) && !state.currentMemorials.some(m => m.title.indexOf(h.title) === 0));
    if (open.length > 0) {
        const h = open[Math.floor(Math.random() * open.length)];
        state.hazards.push(h.title);
        log(`朝局隐忧：${h.desc}`, 'warn');
    }
}

function handleMemorialChoice(memorialId, optionIndex) {
    const memorial = state.currentMemorials.find(m => m.id === memorialId);
    if (!memorial) return;
    const option = memorial.options[optionIndex];
    if (!option) return;

    applyEffects(option.effects);
    maybeAccumulateHazard(option);
    log(`批复「${memorial.title}」：${option.text}`);

    state.currentMemorials = state.currentMemorials.filter(m => m.id !== memorialId);
    if (typeof renderMemorialList === 'function') renderMemorialList();

    if (state.currentMemorials.length === 0) {
        closeMemorialModal();
        completeSeason();
    }
}

// —— 季前政令：政策 + 奇观投入 ——
function choosePolicy(idx) {
    const list = POLICY_TEMPLATES[state.season];
    if (!list || !list[idx]) return;
    const policy = list[idx];
    // 国库不足款项检测
    if ((policy.effects.treasury || 0) < 0 && state.treasury + (policy.effects.treasury || 0) < 0) return;
    applyEffects(policy.effects);
    state.chosenPolicy = policy.text;
    state.policyChosen = true;
    log(`颁行政策：${policy.text}（${policy.desc}）`);
    if (typeof renderPolicyPanel === 'function') renderPolicyPanel();
}

// 启动/推进奇观：idx 为 PROJECTS 下标，mode: 'start' | 'advance'
function handleProject(idx, mode) {
    const p = PROJECTS[idx];
    if (!p) return;
    if (mode === 'start') {
        if (state.projects.some(x => x.id === p.id)) return;
        if (state.doneProjects.includes(p.id)) return;
        if (state.treasury < p.cost.treasury) { log(`国库不足，无法启动「${p.name}」。`, 'warn'); return; }
        if (p.cost.food && state.food < p.cost.food) { log(`粮食不足，无法启动「${p.name}」。`, 'warn'); return; }
        state.treasury -= p.cost.treasury;
        if (p.cost.food) state.food -= p.cost.food;
        state.projects.push({ id: p.id, progress: 0, turns: p.turns });
        log(`大兴土木：启动「${p.name}」（需${p.turns}季）。`);
    } else if (mode === 'advance') {
        const pr = state.projects.find(x => x.id === p.id);
        if (!pr) return;
        pr.progress++;
        log(`「${p.name}」施工推进（${pr.progress}/${pr.turns}）。`);
        if (pr.progress >= pr.turns) {
            state.projects = state.projects.filter(x => x.id !== p.id);
            state.doneProjects.push(p.id);
            applyEffects(p.effect);
            log(`「${p.name}」落成！${['mandate','prestige','stability','treasury','food','militaryPower'].map(k => p.effect[k] ? ({mandate:'天命',prestige:'威望',stability:'稳定',treasury:'国库',food:'粮食',militaryPower:'军力'}[k] + '+' + p.effect[k]) : '').filter(Boolean).join('，')}`, 'good');
        }
    }
    if (typeof renderProjectsPanel === 'function') renderProjectsPanel();
}

// ========== 朝议入口 ==========
function startCourt() {
    if (state.gameOver) return;
    // 若本季已批复完但未进入下一季？这里按每季一次政令+奏折
    if (!state.policyChosen) {
        document.getElementById('memorialModal').classList.add('hide');
        if (typeof openPolicyPanel === 'function') openPolicyPanel();
        return;
    }
    if (state.currentMemorials.length > 0) {
        document.getElementById('memorialModal').classList.remove('hide');
        renderMemorialList();
        return;
    }
    generateMemorials();
    renderMemorialList();
    document.getElementById('memorialModal').classList.remove('hide');
    document.getElementById('btnYear').disabled = true;
    const seasonName = SEASONS[state.season - 1];
    if (typeof renderPolicyAck === 'function') renderPolicyAck();
}

function closeMemorialModal() {
    const modal = document.getElementById('memorialModal');
    if (modal) modal.classList.add('hide');
}

// ========== 季节结算 ==========
function completeSeason() {
    const inc = SEASONAL_INCOME[state.season];
    if (inc) {
        if (inc.food) state.food += inc.food;
        if (inc.militaryPower) state.militaryPower += inc.militaryPower;
        if (inc.treasury) state.treasury += inc.treasury;
        if (inc.prestige) state.prestige = Math.min(100, state.prestige + inc.prestige);
        if (inc.mandate) state.mandate = Math.min(100, state.mandate + inc.mandate);
        log(`${SEASONS[state.season - 1]}季结算：${inc.desc}`);
    }

    state.season++;
    if (state.season > 4) {
        annualSettlement();
        state.season = 1;
        state.year++;
    }
    state.policyChosen = false;
    state.chosenPolicy = null;

    checkFactionThresholds();
    checkVictoryDefeat();

    if (typeof updateTopBar === 'function') updateTopBar();
    if (typeof renderFactionPanel === 'function') renderFactionPanel();
    if (typeof renderOverview === 'function') renderOverview();
    if (typeof renderFactionAlert === 'function') renderFactionAlert();
    if (typeof renderProjectsPanel === 'function') renderProjectsPanel();
    if (typeof renderPrincesPanel === 'function') renderPrincesPanel();
    if (typeof renderPolicyPanel === 'function') renderPolicyPanel();
    if (typeof switchTab === 'function') switchTab('court');

    if (state.gameOver) {
        if (typeof showGameOver === 'function') showGameOver();
        return;
    }

    const seasonName = SEASONS[state.season - 1];
    const status = document.getElementById('courtStatus');
    const btn = document.getElementById('btnYear');
    if (status) status.innerHTML = `已进入${seasonName}季，点击「开启${seasonName}季朝议」先颁行政令，再处奏折。`;
    if (btn) { btn.textContent = `开启${seasonName}季朝议`; btn.disabled = false; }
}

function annualSettlement() {
    state.treasury += 500;
    state.food += 300;
    if (Math.random() < 0.3) { state.food += 200; log('今年风调雨顺，粮食丰收。', 'good'); }
    updateFaction('civil', 1, 1);
    updateFaction('military', -1, 0);
    updateFaction('eunuch', 1, 1);
    // 更换首辅学派
    state.scholar = SCHOLAR_LIST[Math.floor(Math.random() * SCHOLAR_LIST.length)];
    log(`永乐${state.year}年年度结算完成。今岁由【${state.scholar}】学派执掌朝柄。`);
    // 皇子出生检查
    checkPrinceBirth();
}

// ========== 皇储系统 ==========
function checkPrinceBirth() {
    if (state.year - state.lastPrinceCheck < PRINCE_CYCLE_YEARS) return;
    state.lastPrinceCheck = state.year;
    // 无后则必然新生
    const needBirth = state.princes.length === 0;
    if (needBirth || Math.random() < 0.6) {
        const given = PRINCE_GIVEN[Math.floor(Math.random() * PRINCE_GIVEN.length)];
        const char  = PRINCE_CHAR[Math.floor(Math.random() * PRINCE_CHAR.length)];
        const ability = 30 + Math.floor(Math.random() * 70);
        const name = '朱' + given;
        const idx = state.princes.push({ name, char, ability, age: 1, crown: false }) - 1;
        log(`后宫喜讯：皇子「${name}」诞生。` + (needBirth ? '' : ''));
        if (typeof renderPrincesPanel === 'function') renderPrincesPanel();
    }
}
function agePrinces() {
    state.princes.forEach(p => { p.age++; });
}
function setHeir(idx) {
    if (!state.princes[idx]) return;
    const old = state.princes.findIndex(p => p.crown);
    if (old >= 0) state.princes[old].crown = false;
    state.princes[idx].crown = true;
    state.heir = idx;
    // 立长 vs 立贤 效果
    const p = state.princes[idx];
    if (p.ability >= 65) { state.prestige = Math.min(100, state.prestige + 5); log(`立贤储君「${p.name}」声望更隆。`, 'good'); }
    else { state.stability = Math.min(100, state.stability + 3); log(`循例立长「${p.name}」，朝局稳固。`); }
    // 其他皇子不满 → 宗室不稳
    const others = state.princes.filter((_, i) => i !== idx);
    if (others.length > 0) { updateFaction('royal', -3, 0); log('未被立储的皇子心怀不满，宗室微恙。', 'warn'); }
    if (typeof renderPrincesPanel === 'function') renderPrincesPanel();
}
// 封王（送藩）→ 宗室影响力增，皇储竞争者减少
function enfeoffPrince(idx) {
    if (!state.princes[idx]) return;
    const p = state.princes[idx];
    updateFaction('royal', 2, 3);
    log(`皇子「${p.name}」（${p.ability}）就藩之国，宗室拱卫愈固。`);
    if (p.crown) { state.princes[idx].crown = false; state.heir = null; log('注意：太子不可就藩，已复位。', 'warn'); }
    if (typeof renderPrincesPanel === 'function') renderPrincesPanel();
}

// ========== 势力行为触发 ==========
function checkFactionThresholds() {
    state.factions.forEach(f => {
        if (f.satisfaction < 20 && FACTION_EVENTS[f.id] && FACTION_EVENTS[f.id].lowSat) {
            const ev = FACTION_EVENTS[f.id].lowSat;
            if (f.id === 'military' && Math.random() < 0.5) {
                applyEffects({ militaryPower: -500, stability: -5 });
                log(`【兵变】${f.name}军心崩溃，部分兵将哗变劫掠州县！`, 'danger');
            } else {
                log(`【${ev.name}】${ev.desc}`, 'warn');
            }
            applyEffects(ev.effects);
            f.satisfaction = 25;
        }
        if (f.influence > 80 && FACTION_EVENTS[f.id] && FACTION_EVENTS[f.id].highInf) {
            const ev = FACTION_EVENTS[f.id].highInf;
            log(`【${ev.name}】${ev.desc}`, 'warn');
            applyEffects(ev.effects);
            f.influence = 75;
        }
        if ((f.id === 'eunuch' || f.id === 'consort') && f.influence > 90) {
            const fail = f.id === 'eunuch' ? FAIL_THRESHOLDS.eunuchOver90 : FAIL_THRESHOLDS.consortOver90;
            triggerGameOver(fail.type, fail.desc);
        }
    });
}

// ========== 胜负判定 ==========
function checkVictoryDefeat() {
    if (state.mandate <= 0) { triggerGameOver('mandate_end', FAIL_THRESHOLDS.mandate0.desc); return; }
    if (state.stability <= 0) { triggerGameOver('stability_end', FAIL_THRESHOLDS.stability0.desc); return; }
    if (state.food < 0 && state.stability < 20) { triggerGameOver('peasant_end', FAIL_THRESHOLDS.peasantRevolt.desc); return; }

    if (state.stability > 80 && state.prestige > 80 && state.mandate > 80) {
        state.prosperityYears++;
        if (state.prosperityYears >= 10) { triggerVictory('yongleProsperity', VICTORY_CONDITIONS.yongleProsperity.name); return; }
    } else state.prosperityYears = 0;

    if (state.stability < 30) state.wasLowStability = true;
    if (state.wasLowStability && state.stability > 70) {
        state.revivalYears++;
        if (state.revivalYears >= 5) { triggerVictory('revival', VICTORY_CONDITIONS.revival.name); }
    } else if (state.stability <= 70) state.revivalYears = 0;
}

function triggerGameOver(failType, failDesc) {
    if (state.gameOver) return;
    state.gameOver = true;
    state.victory = false;
    log(`【亡国】${failDesc}`, 'danger');
    recordEnding(failType);
    if (typeof saveGame === 'function') saveGame();
}
function triggerVictory(winId, winName) {
    if (state.gameOver) return;
    state.gameOver = true;
    state.victory = true;
    log(`【盛世】${winName} —— 大明万年！`, 'good');
    recordEnding('victory');
    if (typeof saveGame === 'function') saveGame();
}

// ========== 新游戏（重置当前账号进度） ==========
function newGame() {
    const fresh = {
        year: 1, season: 1, treasury: 10000, food: 5000,
        stability: 60, prestige: 50, militaryPower: 8000, mandate: 70,
        factions: JSON.parse(JSON.stringify(FACTIONS)),
        currentMemorials: [], log: [], gameOver: false, victory: null,
        prosperityYears: 0, revivalYears: 0, wasLowStability: false,
        scholar: SCHOLAR_LIST[Math.floor(Math.random() * SCHOLAR_LIST.length)],
        policyChosen: false, chosenPolicy: null,
        projects: [], doneProjects: [],
        princes: [], heir: null, lastPrinceCheck: 0,
        hazards: [], _recentMemorials: []
    };
    Object.assign(state, fresh);
}