// ========== 静态数据 ==========
// 五大势力：满意度(satisfaction) + 影响力(influence)
const FACTIONS = [
    { id: 'civil',    name: '文官集团', satisfaction: 60, influence: 40, desc: '六部+内阁，主行政税收' },
    { id: 'military', name: '武将集团', satisfaction: 60, influence: 30, desc: '五军都督+九边，主征伐' },
    { id: 'royal',    name: '宗室藩王', satisfaction: 50, influence: 20, desc: '各地藩王，拱卫皇室' },
    { id: 'eunuch',   name: '宦官集团', satisfaction: 50, influence: 25, desc: '司礼监，主情报宫廷' },
    { id: 'consort',  name: '外戚集团', satisfaction: 55, influence: 15, desc: '后妃家族，后宫姻亲' }
];

// 学派（影响内阁建议风格）
const SCHOOLS = [
    '儒家','法家','兵家','农家','道家','墨家','纵横家','阴阳家','医家'
];

// 季节
const SEASONS = ['春', '夏', '秋', '冬'];

// 季度结算收入（每季末自动结算）
const SEASONAL_INCOME = {
    1: { food: 200,  desc: '春耕开始，粮储缓增' },
    2: { militaryPower: 100, desc: '操练兵马，军力略升' },
    3: { treasury: 800, food: 400, desc: '秋收征税，国库粮储双增' },
    4: { prestige: 3, mandate: 2, desc: '祭祀天地，威望天命略升' }
};

// ========== 奏折模板（20+份） ==========
// effects 键：treasury/food/stability/prestige/militaryPower/mandate
//            civilSatisfaction/militarySatisfaction/royalSatisfaction/eunuchSatisfaction/consortSatisfaction
//            influenceXxx（势力影响力增减，可选）
const MEMORIAL_TEMPLATES = [
    // ===== 6.1 天灾 =====
    { type:'灾荒', title:'蝗灾肆虐', desc:'北直隶一带蝗灾泛滥，庄稼尽毁。', advisor:'儒家：当开仓赈灾，以仁德安民心。',
      options:[
        {text:'开仓赈灾', effects:{food:-800, stability:10, civilSatisfaction:8, militarySatisfaction:-2, prestige:2}},
        {text:'征发徭役灭蝗', effects:{food:-200, stability:-5, civilSatisfaction:-5, militarySatisfaction:3, prestige:-3}},
        {text:'置之不理', effects:{stability:-15, civilSatisfaction:-10, prestige:-5}}
      ]},
    { type:'灾荒', title:'黄河决口', desc:'开封段黄河决口，淹没数县，灾民遍地。', advisor:'法家：征发徭役修堤，违令者斩。',
      options:[
        {text:'拨款修堤', effects:{treasury:-1200, stability:8, civilSatisfaction:5, militarySatisfaction:-2}},
        {text:'征发民夫', effects:{food:-300, stability:-3, civilSatisfaction:-8, militarySatisfaction:2}},
        {text:'顺其自然', effects:{stability:-18, civilSatisfaction:-12, food:-500}}
      ]},
    { type:'灾荒', title:'瘟疫爆发', desc:'江南瘟疫流行，死者枕藉。', advisor:'医家：广设医馆，救治疫民。',
      options:[
        {text:'派医官救治', effects:{treasury:-800, stability:5, civilSatisfaction:6, eunuchSatisfaction:3}},
        {text:'隔离疫区', effects:{food:-200, stability:-5, militarySatisfaction:5, civilSatisfaction:-3}},
        {text:'祭祀祈福', effects:{prestige:-2, stability:-3, mandate:3, civilSatisfaction:-2}}
      ]},
    { type:'灾荒', title:'陕西大旱', desc:'陕西大旱，赤地千里。', advisor:'道家：天灾乃天意，顺其自然。',
      options:[
        {text:'开官仓赈济', effects:{food:-1000, stability:8, civilSatisfaction:8, prestige:5}},
        {text:'祈雨祭天', effects:{mandate:5, prestige:3, stability:1}},
        {text:'强制征粮', effects:{food:500, stability:-15, civilSatisfaction:-10, militarySatisfaction:3}}
      ]},
    { type:'灾荒', title:'京师地震', desc:'京师地震，宫殿受损，民心惶惶。', advisor:'阴阳家：地震乃上天示警，当祭天修德。',
      options:[
        {text:'修缮宫殿', effects:{treasury:-1500, prestige:5, stability:3}},
        {text:'减免赋税', effects:{food:-200, stability:8, civilSatisfaction:5, prestige:5}},
        {text:'不理会', effects:{stability:-10, prestige:-5, mandate:-5}}
      ]},
    { type:'灾荒', title:'北方雪灾', desc:'辽东大雪封山，冻毙者众。', advisor:'墨家：以工代赈，修城御寒。',
      options:[
        {text:'拨银赈济', effects:{treasury:-600, stability:5, militarySatisfaction:5}},
        {text:'调军救援', effects:{militaryPower:-200, stability:3, militarySatisfaction:8}},
        {text:'令地方自理', effects:{stability:-8, militarySatisfaction:-5, prestige:-3}}
      ]},

    // ===== 6.2 边患 =====
    { type:'军事', title:'鞑靼犯边', desc:'九边急报：鞑靼骑兵劫掠大同府。', advisor:'兵家：应立即出兵驱赶。',
      options:[
        {text:'出兵迎击', effects:{militaryPower:-500, prestige:8, militarySatisfaction:10, civilSatisfaction:-3, treasury:-1000}},
        {text:'坚壁清野', effects:{food:-300, stability:-3, militarySatisfaction:-5, prestige:-2}},
        {text:'纳贡求和', effects:{treasury:-1500, prestige:-8, militarySatisfaction:-8, stability:-2}}
      ]},
    { type:'军事', title:'倭寇劫掠沿海', desc:'倭寇登陆浙江，烧杀抢掠。', advisor:'兵家：调集水师围剿，绝不可姑息。',
      options:[
        {text:'派兵剿倭', effects:{militaryPower:-300, prestige:6, militarySatisfaction:8, treasury:-800}},
        {text:'加强海禁', effects:{treasury:200, stability:-3, civilSatisfaction:-5, eunuchSatisfaction:5}},
        {text:'招安海盗', effects:{treasury:-400, stability:2, militarySatisfaction:-3}}
      ]},
    { type:'军事', title:'土司叛乱', desc:'云南土司反叛，攻占府城。', advisor:'法家：改土归流，废土司设流官。',
      options:[
        {text:'出兵平叛', effects:{militaryPower:-600, prestige:5, militarySatisfaction:8, treasury:-1200}},
        {text:'招抚土司', effects:{prestige:3, stability:2, treasury:-500}},
        {text:'改土归流', effects:{civilSatisfaction:5, stability:-5, royalSatisfaction:-5, prestige:4}}
      ]},
    { type:'军事', title:'边军缺饷', desc:'九边将士数月未发饷银，军心不稳。', advisor:'武将：当立刻拨饷，否则恐生兵变。',
      options:[
        {text:'立刻拨饷', effects:{treasury:-1500, militarySatisfaction:12, stability:5}},
        {text:'拖欠部分', effects:{treasury:-500, militarySatisfaction:-8, stability:-5}},
        {text:'削减编制', effects:{militaryPower:-1000, treasury:500, militarySatisfaction:-15, stability:-10}}
      ]},
    { type:'军事', title:'女真崛起', desc:'辽东建州女真部落日渐强盛，蚕食边地。', advisor:'纵横家：远交近攻，分化其部。',
      options:[
        {text:'出兵征讨', effects:{militaryPower:-700, prestige:6, militarySatisfaction:6, treasury:-1000}},
        {text:'册封安抚', effects:{treasury:-300, prestige:3, stability:2, royalSatisfaction:3}},
        {text:'挑拨内斗', effects:{treasury:-200, eunuchSatisfaction:5, militarySatisfaction:-2, prestige:-2}}
      ]},
    { type:'军事', title:'瓦剌劫掠', desc:'瓦剌骑兵突入甘肃掠粮而去。', advisor:'兵家：坚壁清野，伺机反击。',
      options:[
        {text:'尾击敌军', effects:{militaryPower:-300, prestige:5, militarySatisfaction:6, food:200}},
        {text:'严守不出', effects:{food:-200, militarySatisfaction:-3, stability:-2}},
        {text:'遣使责问', effects:{treasury:-200, prestige:-3, civilSatisfaction:2}}
      ]},

    // ===== 6.3 政治 =====
    { type:'政治', title:'举荐贤才', desc:'吏部侍郎推荐一名地方官入京任职。', advisor:'东林：此人可堪大用，但需考核。',
      options:[
        {text:'直接录用', effects:{prestige:3, civilSatisfaction:8, eunuchSatisfaction:-5}},
        {text:'驳回', effects:{civilSatisfaction:-5, prestige:-2}},
        {text:'调查后再定', effects:{treasury:-200, stability:2, civilSatisfaction:2, eunuchSatisfaction:5}}
      ]},
    { type:'政治', title:'科场舞弊', desc:'会试爆出舞弊丑闻，举子闹事。', advisor:'法家：严查涉案官员，重典治乱。',
      options:[
        {text:'严查到底', effects:{prestige:5, stability:3, civilSatisfaction:-5, eunuchSatisfaction:-3}},
        {text:'压下消息', effects:{stability:-5, civilSatisfaction:3, eunuchSatisfaction:5}},
        {text:'重新考试', effects:{treasury:-300, prestige:4, civilSatisfaction:5}}
      ]},
    { type:'政治', title:'官员贪污', desc:'御史弹劾户部侍郎贪墨军饷。', advisor:'法家：抄家问斩，以儆效尤。',
      options:[
        {text:'严查抄家', effects:{treasury:1000, prestige:5, civilSatisfaction:-8, eunuchSatisfaction:-3, stability:2}},
        {text:'警告了事', effects:{civilSatisfaction:3, eunuchSatisfaction:2, prestige:-2, stability:-2}},
        {text:'默许不究', effects:{treasury:-500, civilSatisfaction:5, eunuchSatisfaction:5, stability:-5, mandate:-3}}
      ]},
    { type:'政治', title:'宦官专权', desc:'司礼监秉笔太监越权批红，干预朝政。', advisor:'儒家：内官不得干政，当严惩。',
      options:[
        {text:'严惩阉党', effects:{eunuchSatisfaction:-15, civilSatisfaction:8, prestige:5, stability:-3}},
        {text:'予以利用', effects:{eunuchSatisfaction:8, civilSatisfaction:-5, treasury:300, mandate:-2}},
        {text:'平衡牵制', effects:{eunuchSatisfaction:3, civilSatisfaction:2, stability:2, prestige:2}}
      ]},
    { type:'政治', title:'外戚干政', desc:'皇后之父私下面见大臣，议论朝政。', advisor:'法家：外戚不得议政，当加限制。',
      options:[
        {text:'严令限制', effects:{consortSatisfaction:-10, civilSatisfaction:5, prestige:3, stability:-2}},
        {text:'拉拢联姻', effects:{consortSatisfaction:8, civilSatisfaction:-3, treasury:-200, royalSatisfaction:3}},
        {text:'不加干预', effects:{consortSatisfaction:10, civilSatisfaction:-8, stability:-5, mandate:-3}}
      ]},
    { type:'政治', title:'藩王不臣', desc:'宁王私自招兵，图谋不轨。', advisor:'法家：削藩夺爵，以绝后患。',
      options:[
        {text:'削藩夺爵', effects:{royalSatisfaction:-15, prestige:6, militarySatisfaction:3, stability:-3}},
        {text:'安抚笼络', effects:{royalSatisfaction:8, treasury:-500, stability:2}},
        {text:'联姻牵制', effects:{royalSatisfaction:5, consortSatisfaction:3, treasury:-300, civilSatisfaction:-2}}
      ]},
    { type:'政治', title:'党争爆发', desc:'文官分裂为东林、齐楚、浙党，互相攻讦。', advisor:'纵横家：权衡两派，毋使一方独大。',
      options:[
        {text:'打压齐浙党', effects:{civilSatisfaction:-8, eunuchSatisfaction:5, stability:-3, prestige:3}},
        {text:'调停和解', effects:{civilSatisfaction:5, stability:5, prestige:2}},
        {text:'放任不管', effects:{civilSatisfaction:-5, stability:-8, mandate:-2}}
      ]},

    // ===== 6.4 经济 =====
    { type:'经济', title:'商贾请开海禁', desc:'泉州商贾联名请奏，请开海通商。', advisor:'纵横家：开关通商，可增国库。',
      options:[
        {text:'开关通商', effects:{treasury:1500, civilSatisfaction:5, eunuchSatisfaction:-3, prestige:3}},
        {text:'维持海禁', effects:{treasury:-200, militarySatisfaction:3, civilSatisfaction:-3}},
        {text:'加征商税', effects:{treasury:800, civilSatisfaction:-8, stability:-3}}
      ]},
    { type:'经济', title:'发现银矿', desc:'云南新现银矿，储量丰厚。', advisor:'法家：当收归官营，归入户部。',
      options:[
        {text:'官营开采', effects:{treasury:2000, civilSatisfaction:3, stability:2}},
        {text:'民营征税', effects:{treasury:1000, civilSatisfaction:8, eunuchSatisfaction:3}},
        {text:'封矿不动', effects:{prestige:3, civilSatisfaction:2, mandate:2}}
      ]},
    { type:'经济', title:'钱庄挤兑', desc:'京师钱庄遭遇挤兑，商民惶恐。', advisor:'墨家：以工代赈，稳定民心。',
      options:[
        {text:'拨银救市', effects:{treasury:-1500, stability:5, civilSatisfaction:5}},
        {text:'放任倒闭', effects:{treasury:-300, civilSatisfaction:-10, stability:-8}},
        {text:'收归国有', effects:{treasury:-500, eunuchSatisfaction:8, civilSatisfaction:-3, stability:2}}
      ]},
    { type:'经济', title:'漕运淤塞', desc:'大运河淤塞，南北粮运受阻。', advisor:'墨家：当以工代赈，疏浚河道。',
      options:[
        {text:'拨款疏浚', effects:{treasury:-1000, food:300, civilSatisfaction:3, prestige:2}},
        {text:'改道陆运', effects:{treasury:-400, food:100, militarySatisfaction:-3}},
        {text:'暂且不管', effects:{food:-400, stability:-5, civilSatisfaction:-5}}
      ]},
    { type:'经济', title:'西域商队', desc:'西域商队抵京，欲通丝路贸易。', advisor:'纵横家：通商互市，可通远国。',
      options:[
        {text:'大开互市', effects:{treasury:800, prestige:5, civilSatisfaction:3}},
        {text:'限量通商', effects:{treasury:400, civilSatisfaction:2, eunuchSatisfaction:2}},
        {text:'拒之门外', effects:{prestige:-3, civilSatisfaction:-2, militarySatisfaction:2}}
      ]},

    // ===== 6.5 外交 =====
    { type:'外交', title:'朝鲜来贡', desc:'朝鲜国王遣世子入贡，请册封世子。', advisor:'儒家：厚往薄来，以怀远人。',
      options:[
        {text:'册封世子', effects:{prestige:10, treasury:500, civilSatisfaction:5}},
        {text:'拒绝册封', effects:{prestige:-5, civilSatisfaction:-3, militarySatisfaction:2}},
        {text:'暂缓处理', effects:{stability:-2, prestige:-2}}
      ]},
    { type:'外交', title:'安南叛服', desc:'安南国时而朝贡时而独立，态度反复。', advisor:'兵家：当示威伐之，以立威。',
      options:[
        {text:'出兵征讨', effects:{militaryPower:-800, prestige:8, militarySatisfaction:8, treasury:-1000}},
        {text:'遣使交涉', effects:{treasury:-200, prestige:2, civilSatisfaction:3}},
        {text:'听之任之', effects:{prestige:-5, militarySatisfaction:-3, mandate:-2}}
      ]},
    { type:'外交', title:'日本遣使', desc:'日本室町幕府遣使求通商。', advisor:'纵横家：可开关通商，以离间倭寇。',
      options:[
        {text:'允其朝贡', effects:{treasury:600, prestige:5, civilSatisfaction:3, militarySatisfaction:-2}},
        {text:'驱逐回国', effects:{prestige:-3, militarySatisfaction:5, civilSatisfaction:-2}},
        {text:'限制通商', effects:{treasury:300, civilSatisfaction:2, eunuchSatisfaction:3}}
      ]},
    { type:'外交', title:'蒙古求和', desc:'瓦剌遣使请和，愿献马匹互市。', advisor:'道家：兵者不祥，和为贵。',
      options:[
        {text:'接受求和', effects:{treasury:-300, militarySatisfaction:-5, stability:5, prestige:3, food:300}},
        {text:'拒绝求和', effects:{militarySatisfaction:5, stability:-3, prestige:-2}},
        {text:'拖延不答', effects:{stability:-2, civilSatisfaction:-2, eunuchSatisfaction:3}}
      ]},

    // ===== 6.6 特殊 =====
    { type:'天命', title:'荧惑守心', desc:'夜观天象，荧惑守心，主大凶之兆。', advisor:'阴阳家：当祭天修德，以避天谴。',
      options:[
        {text:'大赦天下', effects:{mandate:5, stability:5, civilSatisfaction:8, treasury:-300}},
        {text:'祭天祈福', effects:{mandate:8, prestige:3, treasury:-500}},
        {text:'不加理会', effects:{mandate:-10, stability:-5, prestige:-3}}
      ]},
    { type:'祥瑞', title:'祥瑞降临', desc:'太史奏报：麒麟现世，祥瑞之兆。', advisor:'儒家：当昭告天下，以彰圣德。',
      options:[
        {text:'昭告天下', effects:{prestige:10, mandate:5, stability:3}},
        {text:'秘而不宣', effects:{prestige:3, eunuchSatisfaction:5, mandate:2}},
        {text:'严查真伪', effects:{prestige:-2, civilSatisfaction:-3, eunuchSatisfaction:-3}}
      ]},
    { type:'宫廷', title:'皇帝龙体欠安', desc:'圣上近日龙体欠安，朝政受阻。', advisor:'医家：当静养理政，委政内阁。',
      options:[
        {text:'委政内阁', effects:{civilSatisfaction:8, eunuchSatisfaction:-3, stability:3, prestige:-2}},
        {text:'强撑临朝', effects:{stability:-3, mandate:-2, civilSatisfaction:3}},
        {text:'召医入宫', effects:{treasury:-500, stability:5, eunuchSatisfaction:5}}
      ]},
    { type:'宫廷', title:'太后干政', desc:'太后召见大臣，议论朝政，外戚之势渐涨。', advisor:'儒家：后宫不得干政，当委婉劝阻。',
      options:[
        {text:'委婉劝阻', effects:{consortSatisfaction:-8, civilSatisfaction:5, prestige:3, stability:-2}},
        {text:'顺从太后', effects:{consortSatisfaction:15, civilSatisfaction:-5, stability:3, mandate:-3}},
        {text:'请太后还宫', effects:{consortSatisfaction:-15, civilSatisfaction:3, prestige:5, stability:-5}}
      ]}
];

// ========== 势力行为触发事件 ==========
// satisfaction<20 触发；influence>80 触发；influence>90（宦官/外戚）触发失败条件
const FACTION_EVENTS = {
    civil: {
        lowSat: { name:'文官怠政', desc:'文官集团对圣上极度不满，行政瘫痪，税收减半。',
                  effects:{treasury:-1000, stability:-5, prestige:-3}},
        highInf:{ name:'文官结党', desc:'文官集团结党营私，架空皇权，朝政为其把持。',
                  effects:{mandate:-5, prestige:-5, stability:-3}}
    },
    military: {
        lowSat: { name:'武将兵变', desc:'武将集团军心涣散，部分边军哗变，劫掠州县。',
                  effects:{militaryPower:-1500, stability:-10, prestige:-5, treasury:-500}},
        highInf:{ name:'武将专权', desc:'武将集团权势滔天，威胁皇权，逐步架空兵部。',
                  effects:{mandate:-5, stability:-5, civilSatisfaction:-5}}
    },
    royal: {
        lowSat: { name:'宗室寒心', desc:'宗室藩王对圣上寒心，无人愿拱卫皇室。',
                  effects:{prestige:-5, stability:-3, mandate:-3}},
        highInf:{ name:'藩王割据', desc:'藩王势力膨胀，开始割据地方，不听调遣。',
                  effects:{stability:-8, treasury:-500, prestige:-5, mandate:-3}}
    },
    eunuch: {
        lowSat: { name:'内官怠职', desc:'宦官集团消极怠职，宫廷事务混乱，情报失灵。',
                  effects:{stability:-5, prestige:-3, eunuchSatisfaction:-5}},
        highInf:{ name:'阉党专权', desc:'宦官专权乱政，司礼监凌驾内阁之上。',
                  effects:{civilSatisfaction:-8, stability:-5, mandate:-5, prestige:-3}}
    },
    consort: {
        lowSat: { name:'后宫不稳', desc:'外戚集团离心，后宫动荡，流言四起。',
                  effects:{stability:-3, prestige:-3, mandate:-2}},
        highInf:{ name:'外戚干政', desc:'外戚权势熏天，干预朝政，朝野侧目。',
                  effects:{civilSatisfaction:-5, stability:-5, mandate:-5, prestige:-3}}
    }
};

// 失败条件触发阈值
const FAIL_THRESHOLDS = {
    eunuchOver90: { name:'宦官废立', desc:'司礼监权势滔天，竟敢废立天子！', type:'eunuch_coup' },
    consortOver90:{ name:'外戚篡权', desc:'外戚势大，竟行篡逆之事，改朝换代！', type:'consort_coup' },
    mandate0:    { name:'天命已尽', desc:'天命已尽，国祚断绝，大明亡矣！', type:'mandate_end' },
    stability0:  { name:'国本动摇', desc:'稳定归零，天下大乱，大明亡矣！', type:'stability_end' },
    peasantRevolt:{ name:'农民起义', desc:'粮尽民乱，全国性起义爆发，大明亡矣！', type:'peasant_end' }
};

// 胜利条件
const VICTORY_CONDITIONS = {
    yongleProsperity: { name:'永乐盛世', desc:'连续10年稳定>80 威望>80 天命>80' },
    allComeToCourt:   { name:'万国来朝', desc:'藩属国>5 威望>90' },
    driveOutTartar:   { name:'驱逐鞑虏', desc:'消灭北元/瓦剌/鞑靼' },
    revival:          { name:'中兴之主', desc:'从稳定<30恢复到稳定>70，持续5年' }
};

// ========== 内阁学派（首辅建议） ==========
const SCHOLAR_LIST = ['儒家','法家','兵家','农家','道家','墨家','纵横家','阴阳家','医家'];
// 不同首辅学派对各类奏折的建议措辞前缀
const SCHOLAR_CAUTION = {
    '儒家':'以仁德安民为先', '法家':'当以律法立威、赏罚分明', '兵家':'士卒之怒不可轻，整军为先',
    '农家':'以农为本、先安耕织', '道家':'无为而治、顺时应势', '墨家':'以工代赈、器械济民',
    '纵横家':'权衡制衡、远交近攻', '阴阳家':'观象察变、敬天修德', '医家':'救民生、御疾疫'

};

// ========== 奇观建造 ==========
// cost: 国库银两；turns: 需多少个秋季节推进（每季政令推进1格）；effect: 完工立即生效
const PROJECTS = [
    { id:'zicheng',   name:'紫禁城',   desc:'扩建宫城，彰显天子威仪。', cost:{treasury:12000}, turns:10, effect:{mandate:20, prestige:30, stability:10} },
    { id:'changcheng',name:'万里长城', desc:'修筑边墙，连九边为一体。', cost:{treasury:9000, food:3000}, turns:15, effect:{militaryPower:3000, prestige:15} },
    { id:'yunhe',     name:'大运河',   desc:'疏通运河，南北漕运通畅。', cost:{treasury:6000}, turns:8,  effect:{treasury:1000, food:800, prestige:8} },
    { id:'dadian',    name:'永乐大典', desc:'敕修群书，汇三千年文脉。', cost:{treasury:4000}, turns:6,  effect:{prestige:20, civilSatisfaction:10} },
    { id:'xiaoling',  name:'明孝陵',   desc:'营建皇陵，以安历代先灵。', cost:{treasury:5000}, turns:6,  effect:{mandate:10, royalSatisfaction:10} }
];
const PROJECT_NAMES = { zicheng:'紫禁城', changcheng:'万里长城', yunhe:'大运河', dadian:'永乐大典', xiaoling:'明孝陵' };

// ========== 每季政策（每季三选一，立即生效） ==========
const POLICY_TEMPLATES = {
    1: [ // 春
        { text:'轻徭薄赋', desc:'减春税赋，休养生息。', effects:{ food:400, stability:4, civilSatisfaction:5 } },
        { text:'重农兴桑', desc:'劝课农桑，广植桑麻。', effects:{ food:500, prestige:2 } },
        { text:'兴办春闱', desc:'加开科第，广纳贤才。', effects:{ civilSatisfaction:6, prestige:4, treasury:-300 } }
    ],
    2: [ // 夏
        { text:'大举操练', desc:'点校兵马，张军威。', effects:{ militaryPower:400, militarySatisfaction:5, treasury:-400 } },
        { text:'疏浚水利', desc:'以工代赈，修渠固堤。', effects:{ food:300, stability:3, treasury:-300 } },
        { text:'减免杂费', desc:'罢不急之务，宽民力。', effects:{ stability:4, civilSatisfaction:4, prestige:2 } }
    ],
    3: [ // 秋
        { text:'加征国赋', desc:'增平米税，充国用。', effects:{ treasury:1500, stability:-6, civilSatisfaction:-6 } },
        { text:'均平秋税', desc:'量入为出，宽严得宜。', effects:{ treasury:800 } },
        { text:'开仓平粜', desc:'柴粮抑价，济饥民。', effects:{ stability:5, civilSatisfaction:5, food:-300 } }
    ],
    4: [ // 冬
        { text:'祭祀天地', desc:'郊天祀地，祈国祚永昌。', effects:{ mandate:6, prestige:4, treasury:-500 } },
        { text:'编纂国史', desc:'命史官修实录，以彰功业。', effects:{ prestige:5, civilSatisfaction:3, treasury:-300 } },
        { text:'冬犒三军', desc:'颁赏九边，稳军心。', effects:{ militarySatisfaction:6, militaryPower:200, treasury:-600 } }
    ]
};

// ========== 后宫 / 皇子 ==========
const PRINCE_GIVEN = ['允','瞻','祈','祐','溥','祁','见','永','翊','常'];
const PRINCE_CHAR = ['仁','暴','庸','明','睿','悍','和','惰'];
// 每若干年新生一名皇子的概率基数（实际按 state 决定）
const PRINCE_CYCLE_YEARS = 2;   // 每隔该年数检查是否新生皇子

// ========== 连锁事件（隐患池：处理失当后积压，下季追加为危机奏折） ==========
const HAZARD_POOL = [
    { title:'灾民流徙', type:'隐患', desc:'前番赈灾不力，流民聚于畿辅，恐生民变。',
      advisor:'农家：当开粥棚、给牛种，安插流民。',
      options:[
        {text:'设粥厂安民', effects:{treasury:-500, food:-400, stability:6, civilSatisfaction:6}},
        {text:'遣送还乡',   effects:{food:-200, stability:2, civilSatisfaction:3, prestige:2}},
        {text:'驱其出境',   effects:{stability:-10, militarySatisfaction:3, prestige:-5}}
      ]},
    { title:'瘟疫复发', type:'隐患', desc:'前番疫情未尽，江南多城复有疫讯。',
      advisor:'医家：当再遣医官，掩埋尸骸。',
      options:[
        {text:'再遣医官', effects:{treasury:-600, stability:5, civilSatisfaction:5}},
        {text:'封锁疫城', effects:{food:-300, militarySatisfaction:4, stability:-4}},
        {text:'迁民意避', effects:{food:-500, stability:3, civilSatisfaction:3}}
      ]},
    { title:'边军鼓噪', type:'隐患', desc:'前番军饷拖欠，九边军士聚众鼓噪。',
      advisor:'武将：当速发饷银，解散乱兵。',
      options:[
        {text:'补发饷银', effects:{treasury:-1000, militarySatisfaction:10, stability:4}},
        {text:'严惩为首', effects:{militarySatisfaction:-8, stability:-6, prestige:3}},
        {text:'调镇他处', effects:{treasury:-400, militarySatisfaction:-3, militaryPower:-300}}
      ]},
    { title:'民变蜂起', type:'隐患', desc:'苛政之下，诸路民变此起彼伏。',
      advisor:'道家：当恤民下诏，罪己以安天下。',
      options:[
        {text:'下诏罪己', effects:{prestige:3, stability:5, civilSatisfaction:6}},
        {text:'派兵镇压', effects:{militaryPower:-500, militarySatisfaction:5, stability:-4, prestige:4}},
        {text:'蠲免钱粮', effects:{food:-300, stability:6, civilSatisfaction:8}}
      ]}
];

// ========== 账号成就记录类型 ==========
const ACCOUNT_ENDING_NAMES = {
    victory: '盛世/中兴',
    'mandate_end':'天命已尽', 'stability_end':'国本动摇', 'peasant_end':'农民起义',
    'eunuch_coup':'宦官废立', 'consort_coup':'外戚篡权'
};
