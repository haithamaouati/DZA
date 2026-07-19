/**
 * Application Core Logic: DZA Alerts
 * Architected by: Eyas (Haitham Aouati)
 * Features: XML Parsing, Dynamic i18n/RTL, Area Filtering, Routing, Rain System.
 */

const TARGET_FEED_URL = 'https://ametvigilance.meteo.dz/rss/rss_meteo_dz.xml';

const PROXY_CASCADE = [
    `https://corsproxy.io/?${encodeURIComponent(TARGET_FEED_URL)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(TARGET_FEED_URL)}`,
    `https://thingproxy.freeboard.io/fetch/${TARGET_FEED_URL}`
];

let activeAlertData = [];
let currentLang = 'en';

// i18n Dictionary mapping
const translations = {
    en: {
        title_dza: "DZA - ",
        title_suffix: "Algeria Alerts",
        description: "Real‑time weather alerts from the National Meteorological Office",
        search_placeholder: "Search by wilaya or area...",
        emergency_title: "Emergency Numbers",
        em_medical: "Medical Emergency",
        em_civil: "Civil Protection",
        em_coast: "Coast Guard",
        em_forest: "Forest Service",
        all_areas: "All Areas",
        all_severities: "All Severities",
        extreme: "Extreme",
        severe: "Severe",
        moderate: "Moderate",
        minor: "Minor",
        alerts_displayed: "Alerts Displayed",
        initializing: "Initializing data sequence...",
        no_alerts: "No active alerts match current parameters.",
        area: "Area",
        msgType: "Message Type",
        urgency: "Urgency",
        certainty: "Certainty",
        published: "Published",
        effective: "Effective",
        onset: "Onset",
        expires: "Expires",
        author: "Author",
        share: "Share",
        copied: "Copied!",
        view_original: "View Original",
        source: "Source: CAP Alert Feed - ONM",
        developed_by: "Developed with",
        by: "by"
    },
    ar: {
        title_dza: "DZA - ",
        title_suffix: "إنذارات الجزائر",
        description: "تنبيهات الطقس في الوقت الفعلي من الديوان الوطني للأرصاد الجوية",
        search_placeholder: "ابحث بالولاية أو المنطقة...",
        emergency_title: "أرقام الطوارئ",
        em_medical: "الإسعاف الطبي",
        em_civil: "الحماية المدنية",
        em_coast: "حرس السواحل",
        em_forest: "إدارة الغابات",
        all_areas: "جميع المناطق",
        all_severities: "جميع مستويات الخطورة",
        extreme: "شديد جدا",
        severe: "شديد",
        moderate: "متوسط",
        minor: "طفيف",
        alerts_displayed: "تنبيهات معروضة",
        initializing: "جاري استرداد البيانات...",
        no_alerts: "لا توجد تنبيهات نشطة تطابق المعلمات الحالية.",
        area: "المنطقة",
        msgType: "نوع الرسالة",
        urgency: "الأهمية",
        certainty: "اليقين",
        published: "تاريخ النشر",
        effective: "صالح من",
        onset: "البداية",
        expires: "ينتهي",
        author: "المصدر",
        share: "مشاركة",
        copied: "تم النسخ!",
        view_original: "عرض الأصل",
        source: "المصدر: CAP Alert Feed - ONM",
        developed_by: "تم التطوير بـ",
        by: "بواسطة"
    }
};

// Initialization Hook
document.addEventListener('DOMContentLoaded', () => {
    initializeLanguage();
    initializeTheme();
    initializeClock();
    RainEngine.init();
    executeDataPipeline();
    
    // Bind Interface Listeners
    document.getElementById('search-input').addEventListener('input', renderDOM);
    document.getElementById('severity-filter').addEventListener('change', renderDOM);
    document.getElementById('area-filter').addEventListener('change', renderDOM);
    
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('lang-toggle').addEventListener('click', toggleLanguage);
    document.getElementById('rain-toggle').addEventListener('click', () => RainEngine.toggle());
    
    // Event Delegation for Collapsible Cards
    document.getElementById('alerts-container').addEventListener('click', handleCardToggle);
});

/**
 * Atmospheric Rendering Subsystem (Rain Engine Singleton)
 */
const RainEngine = {
    active: true,
    frameId: null,
    canvas: null,
    ctx: null,
    particles: [],
    width: 0,
    height: 0,
    
    init() {
        this.canvas = document.getElementById('rain-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        
        this.resize = this.resize.bind(this);
        window.addEventListener('resize', this.resize);
        this.resize();
        
        for (let i = 0; i < 120; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                length: Math.random() * 15 + 10,
                velocity: Math.random() * 10 + 10,
                opacity: Math.random() * 0.3 + 0.05
            });
        }
        
        this.render();
    },
    
    resize() {
        this.width = this.canvas.width = window.innerWidth;
        this.height = this.canvas.height = window.innerHeight;
    },
    
    render() {
        if (!this.active) return;
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const colorSpace = isDark ? '255, 255, 255' : '9, 9, 11';
        
        this.particles.forEach(p => {
            this.ctx.beginPath();
            this.ctx.moveTo(p.x, p.y);
            this.ctx.lineTo(p.x, p.y + p.length);
            this.ctx.strokeStyle = `rgba(${colorSpace}, ${p.opacity})`;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
            
            p.y += p.velocity;
            
            if (p.y > this.height) {
                p.y = -p.length;
                p.x = Math.random() * this.width;
            }
        });
        
        this.frameId = requestAnimationFrame(this.render.bind(this));
    },
    
    toggle() {
        this.active = !this.active;
        const icon = document.querySelector('#rain-toggle i');
        
        if (this.active) {
            icon.className = 'fa-solid fa-cloud-showers-heavy';
            this.render();
        } else {
            icon.className = 'fa-solid fa-cloud';
            cancelAnimationFrame(this.frameId);
            this.ctx.clearRect(0, 0, this.width, this.height);
        }
    }
};

/**
 * Global Binding: Client-Side URL Parameter Generator
 */
window.shareAlert = function(id, btnElement) {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('alert', id);
    
    navigator.clipboard.writeText(url.toString()).then(() => {
        const originalText = btnElement.innerHTML;
        btnElement.innerHTML = `<i class="fa-solid fa-check"></i> <span data-i18n="copied">${t('copied')}</span>`;
        setTimeout(() => {
            btnElement.innerHTML = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Clipboard API execution failed.', err);
    });
};

/**
 * Initializes and updates the header clock based on current locale.
 */
function initializeClock() {
    const clockSpan = document.querySelector('#live-clock span');
    
    function updateTime() {
        const now = new Date();
        const locale = currentLang === 'ar' ? 'ar-DZ' : 'en-US';
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        };
        clockSpan.textContent = now.toLocaleDateString(locale, options);
    }
    
    updateTime();
    setInterval(updateTime, 1000);
}

/**
 * Persists and applies the selected language state.
 */
function initializeLanguage() {
    const savedLang = localStorage.getItem('dza_lang') || 'en';
    setLanguage(savedLang);
}

/**
 * Mutates language state and forces DOM re-render.
 */
function toggleLanguage() {
    const nextLang = currentLang === 'en' ? 'ar' : 'en';
    setLanguage(nextLang);
    renderDOM(); 
}

/**
 * Applies language configurations to DOM direction and textual nodes.
 */
function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('dza_lang', lang);
    
    const root = document.documentElement;
    root.setAttribute('lang', lang);
    root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    
    // Translate static data tags
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });

    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        const key = el.getAttribute('data-i18n-ph');
        if (translations[lang][key]) {
            el.setAttribute('placeholder', translations[lang][key]);
        }
    });
}

/**
 * Returns localized string for dynamic injection.
 */
function t(key) {
    return translations[currentLang][key] || key;
}

/**
 * Initializes light/dark mode based on state.
 */
function initializeTheme() {
    const savedTheme = localStorage.getItem('dza_theme');
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeIcon('dark');
    }
}

/**
 * Modifies DOM theme.
 */
function toggleTheme() {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme');
    const targetTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    root.setAttribute('data-theme', targetTheme);
    localStorage.setItem('dza_theme', targetTheme);
    updateThemeIcon(targetTheme);
}

/**
 * Modifies header theme icon.
 */
function updateThemeIcon(theme) {
    const icon = document.querySelector('#theme-toggle i');
    if (theme === 'dark') {
        icon.className = 'fa-solid fa-sun';
    } else {
        icon.className = 'fa-solid fa-moon';
    }
}

/**
 * Handler for accordions.
 */
function handleCardToggle(event) {
    // Ignore trigger if action buttons are clicked
    if (event.target.closest('.action-btn')) return;

    const header = event.target.closest('.card-header');
    if (!header) return;

    const card = header.closest('.alert-card');
    if (card) {
        card.classList.toggle('expanded');
    }
}

/**
 * Core Data Pipeline execution.
 */
async function executeDataPipeline() {
    try {
        const rawXML = await fetchXMLFeed();
        activeAlertData = parseCAPAlerts(rawXML);
        populateAreaFilter();
        renderDOM();

        // Client-side routing verification
        const urlParams = new URLSearchParams(window.location.search);
        const alertId = urlParams.get('alert');
        if (alertId) {
            const targetCardId = document.querySelector(`.card-id[data-raw-id="${alertId}"]`);
            if (targetCardId) {
                const card = targetCardId.closest('.alert-card');
                if (card) {
                    card.classList.add('expanded');
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }

    } catch (error) {
        document.getElementById('alerts-container').innerHTML = 
            `<div class="status-message" style="color: var(--severity-extreme); border-color: color-mix(in srgb, var(--severity-extreme) 20%, transparent); background: color-mix(in srgb, var(--severity-extreme) 5%, transparent);">
                <i class="fa-solid fa-circle-xmark"></i> System Error: Network Request Failed. <br>
                ${error.message}
            </div>`;
        console.error('Pipeline Execution Fault:', error);
    }
}

/**
 * High-availability proxy sequence router.
 */
async function fetchXMLFeed() {
    try {
        const directResponse = await fetch(TARGET_FEED_URL);
        if (directResponse.ok) return await directResponse.text();
    } catch (err) {
        console.warn('Direct fetch rejected. Initiating proxy cascade sequence...');
    }
    
    for (const proxyUrl of PROXY_CASCADE) {
        try {
            const response = await fetch(proxyUrl);
            if (response.ok) return await response.text();
        } catch (err) {
            continue;
        }
    }
    throw new Error('All network routes (direct and proxies) failed to resolve.');
}

/**
 * DOMParser mapping standard and namespace variants.
 */
function parseCAPAlerts(xmlString) {
    const parser = new DOMParser();
    const documentNode = parser.parseFromString(xmlString, "text/xml");
    const containerNodes = documentNode.querySelectorAll("item, entry");
    const parsedData = [];

    containerNodes.forEach(node => {
        parsedData.push({
            title: extractNodeText(node, ["title"]),
            id: extractNodeText(node, ["identifier", "id"]),
            author: extractNodeText(node, ["senderName", "author", "sender"]),
            link: extractLinkData(node),
            published: extractNodeText(node, ["pubDate", "sent", "updated"]),
            msgType: extractNodeText(node, ["msgType"]),
            urgency: extractNodeText(node, ["urgency"]),
            severity: extractNodeText(node, ["severity"]),
            certainty: extractNodeText(node, ["certainty"]),
            effective: extractNodeText(node, ["effective"]),
            onset: extractNodeText(node, ["onset"]),
            expires: extractNodeText(node, ["expires"]),
            area: extractNodeText(node, ["areaDesc"])
        });
    });

    return parsedData;
}

function extractNodeText(parentNode, tagArray) {
    for (const tag of tagArray) {
        let elements = parentNode.getElementsByTagName(tag);
        if (elements.length > 0 && elements[0].textContent) return elements[0].textContent.trim();
        
        elements = parentNode.getElementsByTagName(`cap:${tag}`);
        if (elements.length > 0 && elements[0].textContent) return elements[0].textContent.trim();
        
        const allElements = parentNode.getElementsByTagName("*");
        for (let el of allElements) {
            if (el.localName === tag && el.textContent) {
                return el.textContent.trim();
            }
        }
    }
    return "N/A";
}

function extractLinkData(parentNode) {
    const linkNodes = parentNode.getElementsByTagName("link");
    if (linkNodes.length === 0) return "#";
    
    if (linkNodes[0].hasAttribute("href")) {
        return linkNodes[0].getAttribute("href");
    }
    return linkNodes[0].textContent.trim() || "#";
}

/**
 * Extracts unique areas and appends them to the Area select drop-down.
 */
function populateAreaFilter() {
    const areaFilter = document.getElementById('area-filter');
    const uniqueAreas = [...new Set(activeAlertData.map(alert => alert.area).filter(area => area && area !== "N/A"))];
    
    uniqueAreas.sort().forEach(area => {
        const option = document.createElement('option');
        option.value = area;
        option.textContent = area;
        areaFilter.appendChild(option);
    });
}

/**
 * Standardizes CSS variable keys.
 */
function mapSeverityColor(severityData) {
    const s = severityData.toLowerCase();
    if (s.includes("extreme") || s.includes("شديد جدا")) return "var(--severity-extreme)";
    if (s.includes("severe") || s.includes("شديد")) return "var(--severity-severe)";
    if (s.includes("moderate") || s.includes("متوسط")) return "var(--severity-moderate)";
    if (s.includes("minor") || s.includes("طفيف")) return "var(--severity-minor)";
    return "var(--severity-unknown)";
}

/**
 * Strict evaluation of meteorological alert syntax to map exact Font Awesome specs.
 */
function determineWeatherIcon(title) {
    const t = title.toLowerCase();
    
    if (t.includes('heat') || t.includes('canicule') || t.includes('hot') || t.includes('حرارة')) return 'fa-temperature-high';
    if (t.includes('wind') || t.includes('vent') || t.includes('رياح')) return 'fa-wind';
    if (t.includes('rain') || t.includes('pluie') || t.includes('storm') || t.includes('أمطار') || t.includes('مطر')) return 'fa-cloud-showers-heavy';
    if (t.includes('thunder') || t.includes('orage') || t.includes('رعد') || t.includes('عاصفة')) return 'fa-bolt-lightning';
    if (t.includes('snow') || t.includes('neige') || t.includes('ice') || t.includes('ثلج') || t.includes('جليد')) return 'fa-snowflake';
    if (t.includes('sand') || t.includes('dust') || t.includes('sable') || t.includes('رمل') || t.includes('غبار')) return 'fa-tornado';
    if (t.includes('cold') || t.includes('froid') || t.includes('frost') || t.includes('صقيع') || t.includes('برد')) return 'fa-temperature-low';
    
    return 'fa-triangle-exclamation';
}

/**
 * Synthesizes data array into dynamic DOM cards with applied i18n variables.
 */
function renderDOM() {
    const container = document.getElementById('alerts-container');
    const query = document.getElementById('search-input').value.toLowerCase();
    const severityFilterState = document.getElementById('severity-filter').value;
    const areaFilterState = document.getElementById('area-filter').value;
    const counterElement = document.getElementById('total-alerts-count');
    
    container.innerHTML = ''; 

    const activeSet = activeAlertData.filter(alert => {
        const matchesQuery = alert.title.toLowerCase().includes(query) || alert.area.toLowerCase().includes(query);
        const matchesSeverity = severityFilterState === 'All' || alert.severity.includes(severityFilterState) || alert.severity === t(severityFilterState.toLowerCase());
        const matchesArea = areaFilterState === 'All' || alert.area === areaFilterState;
        
        return matchesQuery && matchesSeverity && matchesArea;
    });

    counterElement.textContent = activeSet.length;

    if (activeSet.length === 0) {
        container.innerHTML = `<div class="status-message">${t('no_alerts')}</div>`;
        return;
    }

    activeSet.forEach(alert => {
        const card = document.createElement('div');
        const activeColor = mapSeverityColor(alert.severity);
        const eventIcon = determineWeatherIcon(alert.title);
        
        card.className = 'alert-card';

        const resolvedLink = (alert.link !== "N/A" && alert.link !== "") ? alert.link : "#";

        card.innerHTML = `
            <div class="card-header" role="button" aria-expanded="false">
                <div class="card-title-group">
                    <i class="fa-solid ${eventIcon} event-icon" style="color: ${activeColor};"></i>
                    <div class="card-title-text">
                        <div class="card-title">${alert.title}</div>
                        <div class="card-id" data-raw-id="${alert.id}">ID: ${alert.id}</div>
                    </div>
                </div>
                <div class="header-actions">
                    <div class="severity-badge" style="background-color: color-mix(in srgb, ${activeColor} 15%, transparent); color: ${activeColor}; border: 1px solid color-mix(in srgb, ${activeColor} 30%, transparent);">
                        ${alert.severity}
                    </div>
                    <i class="fa-solid fa-chevron-down chevron-icon"></i>
                </div>
            </div>
            <div class="card-details">
                <div class="card-body">
                    <div class="data-block">
                        <i class="fa-solid fa-map-location-dot data-icon"></i>
                        <div class="data-content">
                            <span class="data-label">${t('area')}</span>
                            <span class="data-value">${alert.area}</span>
                        </div>
                    </div>
                    <div class="data-block">
                        <i class="fa-solid fa-envelope-open-text data-icon"></i>
                        <div class="data-content">
                            <span class="data-label">${t('msgType')}</span>
                            <span class="data-value">${alert.msgType}</span>
                        </div>
                    </div>
                    <div class="data-block">
                        <i class="fa-solid fa-stopwatch data-icon"></i>
                        <div class="data-content">
                            <span class="data-label">${t('urgency')}</span>
                            <span class="data-value">${alert.urgency}</span>
                        </div>
                    </div>
                    <div class="data-block">
                        <i class="fa-solid fa-bullseye data-icon"></i>
                        <div class="data-content">
                            <span class="data-label">${t('certainty')}</span>
                            <span class="data-value">${alert.certainty}</span>
                        </div>
                    </div>
                    <div class="data-block">
                        <i class="fa-solid fa-calendar-check data-icon"></i>
                        <div class="data-content">
                            <span class="data-label">${t('published')}</span>
                            <span class="data-value">${alert.published}</span>
                        </div>
                    </div>
                    <div class="data-block">
                        <i class="fa-solid fa-hourglass-start data-icon"></i>
                        <div class="data-content">
                            <span class="data-label">${t('effective')}</span>
                            <span class="data-value">${alert.effective}</span>
                        </div>
                    </div>
                    <div class="data-block">
                        <i class="fa-solid fa-bolt data-icon"></i>
                        <div class="data-content">
                            <span class="data-label">${t('onset')}</span>
                            <span class="data-value">${alert.onset}</span>
                        </div>
                    </div>
                    <div class="data-block">
                        <i class="fa-solid fa-hourglass-end data-icon"></i>
                        <div class="data-content">
                            <span class="data-label">${t('expires')}</span>
                            <span class="data-value">${alert.expires}</span>
                        </div>
                    </div>
                    <div class="data-block">
                        <i class="fa-solid fa-building-shield data-icon"></i>
                        <div class="data-content">
                            <span class="data-label">${t('author')}</span>
                            <span class="data-value">${alert.author}</span>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="footer-actions">
                        <button class="action-btn share-btn" onclick="shareAlert('${alert.id}', this)" aria-label="Share">
                            <i class="fa-solid fa-share-nodes"></i> <span data-i18n="share">${t('share')}</span>
                        </button>
                        <a href="${resolvedLink}" target="_blank" rel="noopener noreferrer" class="action-btn source-link">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i> <span data-i18n="view_original">${t('view_original')}</span>
                        </a>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}
