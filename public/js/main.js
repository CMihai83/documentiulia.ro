// ============================================
// AccounTech AI - Main JavaScript
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all features
    initSmoothScroll();
    initFormValidation();
    initAnimations();
    initMobileMenu();
    initScrollProgress();
    initNavbarScroll();
});

// ============================================
// Smooth Scrolling for Navigation Links
// ============================================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');

            // Skip empty anchors
            if (href === '#' || href === '#!') {
                e.preventDefault();
                return;
            }

            const targetElement = document.querySelector(href);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// ============================================
// Form Validation and Submission
// ============================================
function initFormValidation() {
    const betaForm = document.getElementById('betaForm');

    if (betaForm) {
        betaForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Get form data
            const formData = new FormData(betaForm);
            const data = Object.fromEntries(formData.entries());

            // Validate form
            if (validateBetaForm(data)) {
                // Show loading state
                const submitButton = betaForm.querySelector('button[type="submit"]');
                const originalText = submitButton.textContent;
                submitButton.textContent = 'Se trimite...';
                submitButton.disabled = true;

                // Simulate form submission (replace with actual API call)
                setTimeout(() => {
                    showSuccessMessage();
                    betaForm.reset();
                    submitButton.textContent = originalText;
                    submitButton.disabled = false;
                }, 1500);
            }
        });
    }
}

function validateBetaForm(data) {
    // Reset previous errors
    clearFormErrors();

    let isValid = true;

    // Validate name
    if (!data.name || data.name.trim().length < 2) {
        showFieldError('name', 'Introduceți un nume valid (minim 2 caractere)');
        isValid = false;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
        showFieldError('email', 'Introduceți o adresă de email validă');
        isValid = false;
    }

    // Validate tier
    if (!data.tier) {
        showFieldError('tier', 'Selectați un tier de interes');
        isValid = false;
    }

    // Validate GDPR checkbox
    if (!data.gdpr) {
        showFieldError('gdpr', 'Trebuie să acceptați termenii și condițiile');
        isValid = false;
    }

    return isValid;
}

function showFieldError(fieldName, message) {
    const field = document.querySelector(`[name="${fieldName}"]`);
    if (field) {
        // Add error class to field
        field.classList.add('error-field');

        // Create error message element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.color = '#ef4444';
        errorDiv.style.fontSize = '0.875rem';
        errorDiv.style.marginTop = '0.25rem';

        // For checkbox, add error after label
        if (field.type === 'checkbox') {
            const label = field.closest('.checkbox-label');
            if (label) {
                label.parentNode.appendChild(errorDiv);
            }
        } else {
            field.parentNode.appendChild(errorDiv);
        }
    }
}

function clearFormErrors() {
    // Remove error classes
    document.querySelectorAll('.error-field').forEach(field => {
        field.classList.remove('error-field');
    });

    // Remove error messages
    document.querySelectorAll('.error-message').forEach(msg => {
        msg.remove();
    });
}

function showSuccessMessage() {
    const message = document.createElement('div');
    message.className = 'success-notification';
    message.innerHTML = `
        <div style="
            position: fixed;
            top: 100px;
            right: 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 1.5rem 2rem;
            border-radius: 0.75rem;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
        ">
            <strong style="display: block; font-size: 1.125rem; margin-bottom: 0.5rem;">
                ✓ Mulțumim!
            </strong>
            <p style="margin: 0;">
                Cererea ta a fost trimisă cu succes. Te vom contacta în curând!
            </p>
        </div>
    `;

    document.body.appendChild(message);

    // Remove notification after 5 seconds
    setTimeout(() => {
        message.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => message.remove(), 300);
    }, 5000);
}

// ============================================
// Scroll Animations (Fade In on Scroll)
// ============================================
function initAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animatedElements = document.querySelectorAll(`
        .feature-card,
        .tier-card,
        .module-card,
        .phase,
        .tech-category
    `);

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(el);
    });
}

// ============================================
// Mobile Menu Toggle - Enhanced
// ============================================
function initMobileMenu() {
    const nav = document.querySelector('.main-nav');
    const navLinks = document.querySelector('.nav-links');

    if (!nav || !navLinks) return;

    // Create mobile menu toggle button
    const toggleButton = document.createElement('button');
    toggleButton.className = 'mobile-menu-toggle';
    toggleButton.innerHTML = '☰';
    toggleButton.setAttribute('aria-label', 'Toggle navigation menu');

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'mobile-nav-overlay';

    // Insert button and overlay
    const container = nav.querySelector('.container-nav');
    container.appendChild(toggleButton);
    document.body.appendChild(overlay);

    // Toggle menu function
    function toggleMenu() {
        const isActive = navLinks.classList.contains('active');

        if (isActive) {
            navLinks.classList.remove('active');
            overlay.classList.remove('active');
            toggleButton.innerHTML = '☰';
            document.body.style.overflow = '';
        } else {
            navLinks.classList.add('active');
            overlay.classList.add('active');
            toggleButton.innerHTML = '✕';
            document.body.style.overflow = 'hidden';
        }
    }

    // Event listeners
    toggleButton.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', toggleMenu);

    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function() {
            if (navLinks.classList.contains('active')) {
                toggleMenu();
            }
        });
    });

    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            if (window.innerWidth > 768 && navLinks.classList.contains('active')) {
                toggleMenu();
            }
        }, 250);
    });
}

// ============================================
// Navbar Scroll Effect
// ============================================
function initNavbarScroll() {
    const nav = document.querySelector('.main-nav');
    if (!nav) return;

    let lastScroll = 0;

    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    });
}

// ============================================
// Add animations CSS dynamically
// ============================================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }

    .error-field {
        border-color: #ef4444 !important;
        background-color: rgba(239, 68, 68, 0.05);
    }
`;
document.head.appendChild(style);

// ============================================
// Stats Counter Animation (when visible)
// ============================================
function animateStats() {
    const stats = document.querySelectorAll('.stat-number');

    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                entry.target.classList.add('counted');
                animateNumber(entry.target);
            }
        });
    }, observerOptions);

    stats.forEach(stat => observer.observe(stat));
}

function animateNumber(element) {
    const text = element.textContent;
    const number = parseInt(text.replace(/\D/g, ''));
    const suffix = text.replace(/[\d,]/g, '');

    if (!isNaN(number)) {
        let current = 0;
        const increment = number / 50; // 50 steps
        const duration = 1500; // 1.5 seconds
        const stepTime = duration / 50;

        const timer = setInterval(() => {
            current += increment;
            if (current >= number) {
                element.textContent = number.toLocaleString() + suffix;
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current).toLocaleString() + suffix;
            }
        }, stepTime);
    }
}

// Initialize stats animation
setTimeout(animateStats, 500);

// ============================================
// Scroll Progress Indicator
// ============================================
function initScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        height: 4px;
        background: linear-gradient(90deg, #3b82f6, #8b5cf6);
        width: 0%;
        z-index: 10000;
        transition: width 0.1s ease-out;
    `;
    document.body.appendChild(progressBar);

    window.addEventListener('scroll', () => {
        const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (window.scrollY / windowHeight) * 100;
        progressBar.style.width = scrolled + '%';
    });
}

initScrollProgress();

// ============================================
// Console Welcome Message
// ============================================
console.log('%c🤖 AccounTech AI', 'font-size: 24px; font-weight: bold; color: #3b82f6;');
console.log('%cPlatforma inteligentă de contabilitate pentru România și Europa', 'font-size: 14px; color: #6b7280;');
console.log('%cInteresant de platformă? Înscrie-te la programul beta!', 'font-size: 12px; color: #10b981;');
console.log('%c\nDevelopers: Construită cu React, Python, TensorFlow și AWS', 'font-size: 11px; color: #8b5cf6;');

// ============================================
// ROMANIAN FISCAL LAW SECTION - JAVASCRIPT
// ============================================

// Toggle Q&A Answers
function toggleAnswer(element) {
    const question = element;
    const answer = question.nextElementSibling;
    
    // Close all other answers
    document.querySelectorAll('.qna-answer').forEach(ans => {
        if (ans !== answer) {
            ans.classList.remove('open');
            ans.previousElementSibling.classList.remove('active');
        }
    });
    
    // Toggle current answer
    answer.classList.toggle('open');
    question.classList.toggle('active');
}

// Filter Q&A by Category
function filterQnA(category) {
    const items = document.querySelectorAll('.qna-item');
    const buttons = document.querySelectorAll('.qna-category');
    
    // Update active button
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Filter items
    items.forEach(item => {
        if (category === 'all' || item.dataset.category === category) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Add obligations to calendar
function addToCalendar(type) {
    let obligations = [];
    
    if (type === 'monthly') {
        obligations = [
            { title: 'Declarație TVA (D300)', date: '2025-01-25' },
            { title: 'Plata TVA', date: '2025-01-25' },
            { title: 'Declarație D112', date: '2025-01-25' },
            { title: 'Plata CAS/CASS angajați', date: '2025-01-25' }
        ];
    } else if (type === 'quarterly') {
        obligations = [
            { title: 'Declarație impozit profit (D101)', date: '2025-03-25' },
            { title: 'Plata impozit profit', date: '2025-03-25' }
        ];
    } else if (type === 'annual') {
        obligations = [
            { title: 'Bilanț contabil', date: '2025-03-31' },
            { title: 'Declarația Unică (D212)', date: '2025-05-25' },
            { title: 'Declarație impozit profit anuală', date: '2025-05-31' },
            { title: 'Raportare tranzacții intracomunitare', date: '2025-06-30' }
        ];
    }
    
    // Create calendar download
    const calendarContent = createICalContent(obligations);
    downloadFile('obligatii_fiscale_' + type + '.ics', calendarContent);
    
    alert('✅ Obligațiile au fost adăugate în calendar! Descarcă fișierul .ics și importă-l în Google Calendar sau Outlook.');
}

// Create iCal content
function createICalContent(events) {
    let ical = 'BEGIN:VCALENDAR\n';
    ical += 'VERSION:2.0\n';
    ical += 'PRODID:-//AccounTech AI//Fiscal Calendar//RO\n';
    ical += 'CALSCALE:GREGORIAN\n';
    ical += 'METHOD:PUBLISH\n';
    
    events.forEach(event => {
        const date = event.date.replace(/-/g, '');
        ical += 'BEGIN:VEVENT\n';
        ical += 'DTSTART;VALUE=DATE:' + date + '\n';
        ical += 'DTEND;VALUE=DATE:' + date + '\n';
        ical += 'SUMMARY:' + event.title + '\n';
        ical += 'DESCRIPTION:Obligație fiscală - ' + event.title + '\n';
        ical += 'STATUS:CONFIRMED\n';
        ical += 'SEQUENCE:0\n';
        ical += 'BEGIN:VALARM\n';
        ical += 'TRIGGER:-P3D\n';
        ical += 'ACTION:DISPLAY\n';
        ical += 'DESCRIPTION:Reminder: ' + event.title + ' în 3 zile\n';
        ical += 'END:VALARM\n';
        ical += 'END:VEVENT\n';
    });
    
    ical += 'END:VCALENDAR';
    return ical;
}

// Download file helper
function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/calendar' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Ask AI specific question
function askAI(topic) {
    openFiscalAIChat(topic);
}

// Open AI Fiscal Chat Modal
function openFiscalAIChat(initialTopic = null) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'fiscal-ai-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.3s ease;
    `;
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 20px;
        max-width: 900px;
        width: 100%;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 80px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.3s ease;
    `;
    
    // Modal header
    const header = document.createElement('div');
    header.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 25px 30px;
        border-radius: 20px 20px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    header.innerHTML = `
        <div>
            <h2 style="margin: 0; font-size: 24px;">🤖 AI Consultant Fiscal</h2>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Alimentat de legislația fiscală română actualizată</p>
        </div>
        <button onclick="closeFiscalAIChat()" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; cursor: pointer; width: 40px; height: 40px; border-radius: 50%; transition: all 0.3s ease;">×</button>
    `;
    
    // Chat container
    const chatContainer = document.createElement('div');
    chatContainer.id = 'fiscal-chat-container';
    chatContainer.style.cssText = `
        flex: 1;
        overflow-y: auto;
        padding: 30px;
        background: #f8fafc;
    `;
    
    // Initial message
    chatContainer.innerHTML = `
        <div class="ai-message" style="margin-bottom: 20px; animation: slideIn 0.3s ease;">
            <div style="display: flex; gap: 15px; align-items: start;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">🤖</div>
                <div style="flex: 1; background: white; padding: 20px; border-radius: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <p style="margin: 0; color: #0f172a; line-height: 1.6;">
                        Bună! Sunt consultantul tău fiscal AI. Am acces la întreaga legislație fiscală română actualizată, inclusiv:
                    </p>
                    <ul style="margin: 15px 0 15px 20px; color: #475569;">
                        <li>Codul Fiscal complet (2024-2025)</li>
                        <li>Norme metodologice ANAF</li>
                        <li>Jurisprudență relevantă</li>
                        <li>Interpretări oficiale</li>
                    </ul>
                    <p style="margin: 15px 0 0 0; color: #0f172a; line-height: 1.6;">
                        <strong>Cum te pot ajuta?</strong> Descrie situația ta fiscală și îți voi oferi o analiză detaliată cu referințe la legislație.
                    </p>
                </div>
            </div>
        </div>
        
        <div class="quick-questions" style="margin-bottom: 20px;">
            <p style="font-size: 14px; color: #64748b; margin-bottom: 10px; font-weight: 600;">💡 Exemple de întrebări:</p>
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                <button onclick="sendQuickQuestion('Trebuie să mă înregistrez ca plătitor de TVA dacă cifra de afaceri este 280.000 lei?')" style="background: white; border: 2px solid #e2e8f0; padding: 10px 15px; border-radius: 20px; font-size: 13px; cursor: pointer; transition: all 0.3s ease; color: #475569;">📊 Înregistrare TVA</button>
                <button onclick="sendQuickQuestion('Care sunt condițiile pentru microîntreprindere în 2025?')" style="background: white; border: 2px solid #e2e8f0; padding: 10px 15px; border-radius: 20px; font-size: 13px; cursor: pointer; transition: all 0.3s ease; color: #475569;">🏢 Microîntreprindere</button>
                <button onclick="sendQuickQuestion('Cum se calculează contribuțiile sociale pentru PFA cu venit de 120.000 lei?')" style="background: white; border: 2px solid #e2e8f0; padding: 10px 15px; border-radius: 20px; font-size: 13px; cursor: pointer; transition: all 0.3s ease; color: #475569;">💰 Contribuții PFA</button>
                <button onclick="sendQuickQuestion('Ce cheltuieli sunt deductibile pentru o SRL?')" style="background: white; border: 2px solid #e2e8f0; padding: 10px 15px; border-radius: 20px; font-size: 13px; cursor: pointer; transition: all 0.3s ease; color: #475569;">📝 Cheltuieli deductibile</button>
            </div>
        </div>
    `;
    
    // Input container
    const inputContainer = document.createElement('div');
    inputContainer.style.cssText = `
        padding: 20px 30px;
        border-top: 1px solid #e2e8f0;
        background: white;
        border-radius: 0 0 20px 20px;
    `;
    inputContainer.innerHTML = `
        <div style="display: flex; gap: 10px;">
            <textarea 
                id="fiscal-question-input" 
                placeholder="Descrie situația ta fiscală în detaliu..."
                style="flex: 1; padding: 15px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 14px; font-family: inherit; resize: vertical; min-height: 80px; max-height: 200px;"
            ></textarea>
            <button 
                onclick="sendFiscalQuestion()" 
                style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 0 30px; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; align-self: flex-end;"
            >
                Întreabă
            </button>
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 10px; margin-bottom: 0;">
            ⚠️ Consultanța AI este informativă. Pentru situații complexe, recomandăm consultarea unui expert fiscal.
        </p>
    `;
    
    // Assemble modal
    modalContent.appendChild(header);
    modalContent.appendChild(chatContainer);
    modalContent.appendChild(inputContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Focus on input
    setTimeout(() => {
        document.getElementById('fiscal-question-input').focus();
    }, 300);
    
    // If there's an initial topic, send it
    if (initialTopic) {
        setTimeout(() => {
            const topicQuestions = {
                'TVA registration': 'Trebuie să mă înregistrez ca plătitor de TVA? Cifra mea de afaceri este în creștere.',
                'Microintreprindere conditions': 'Care sunt condițiile pentru a rămâne microîntreprindere în 2025?',
                'PFA contributions calculation': 'Cum se calculează contribuțiile sociale pentru PFA?',
                'Employer obligations': 'Care sunt obligațiile fiscale pentru angajatori?',
                'Deductible expenses': 'Ce cheltuieli sunt deductibile fiscal pentru compania mea?',
                'TVA la incasare': 'Cum funcționează sistemul de TVA la încasare? Este avantajos pentru mine?'
            };
            
            if (topicQuestions[initialTopic]) {
                document.getElementById('fiscal-question-input').value = topicQuestions[initialTopic];
                sendFiscalQuestion();
            }
        }, 500);
    }
}

// Close AI Chat Modal
function closeFiscalAIChat() {
    const modal = document.getElementById('fiscal-ai-modal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Send quick question
function sendQuickQuestion(question) {
    document.getElementById('fiscal-question-input').value = question;
    sendFiscalQuestion();
}

// Send fiscal question to AI
async function sendFiscalQuestion() {
    const input = document.getElementById('fiscal-question-input');
    const question = input.value.trim();
    
    if (!question) {
        alert('Te rog introdu o întrebare.');
        return;
    }
    
    // Clear input
    input.value = '';
    
    // Add user message
    const chatContainer = document.getElementById('fiscal-chat-container');
    const userMessage = document.createElement('div');
    userMessage.style.cssText = 'margin-bottom: 20px; animation: slideIn 0.3s ease;';
    userMessage.innerHTML = `
        <div style="display: flex; gap: 15px; align-items: start; justify-content: flex-end;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px 20px; border-radius: 15px; max-width: 70%; color: white;">
                <p style="margin: 0; line-height: 1.6;">${question}</p>
            </div>
            <div style="background: #64748b; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">👤</div>
        </div>
    `;
    chatContainer.appendChild(userMessage);
    
    // Add loading indicator
    const loadingMessage = document.createElement('div');
    loadingMessage.id = 'ai-loading';
    loadingMessage.style.cssText = 'margin-bottom: 20px; animation: slideIn 0.3s ease;';
    loadingMessage.innerHTML = `
        <div style="display: flex; gap: 15px; align-items: start;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">🤖</div>
            <div style="background: white; padding: 20px; border-radius: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="display: flex; gap: 5px;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: #667eea; animation: pulse 1.5s ease-in-out infinite;"></div>
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: #667eea; animation: pulse 1.5s ease-in-out 0.2s infinite;"></div>
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: #667eea; animation: pulse 1.5s ease-in-out 0.4s infinite;"></div>
                </div>
            </div>
        </div>
    `;
    chatContainer.appendChild(loadingMessage);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // Call AI API
    try {
        const response = await fetch('/api/v1/fiscal/ai-consultant', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question: question })
        });
        
        const data = await response.json();
        
        // Remove loading
        loadingMessage.remove();
        
        // Add AI response
        const aiMessage = document.createElement('div');
        aiMessage.style.cssText = 'margin-bottom: 20px; animation: slideIn 0.3s ease;';
        aiMessage.innerHTML = `
            <div style="display: flex; gap: 15px; align-items: start;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">🤖</div>
                <div style="flex: 1; background: white; padding: 20px; border-radius: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    ${data.answer}
                    ${data.references ? `
                        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                            <p style="font-size: 13px; color: #64748b; font-weight: 600; margin-bottom: 10px;">📚 Referințe legislative:</p>
                            ${data.references.map(ref => `<p style="font-size: 12px; color: #94a3b8; margin: 5px 0;">• ${ref}</p>`).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        chatContainer.appendChild(aiMessage);
        
        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
    } catch (error) {
        console.error('Error calling AI API:', error);
        loadingMessage.remove();
        
        const errorMessage = document.createElement('div');
        errorMessage.style.cssText = 'margin-bottom: 20px;';
        errorMessage.innerHTML = `
            <div style="display: flex; gap: 15px; align-items: start;">
                <div style="background: #ef4444; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">⚠️</div>
                <div style="background: #fee2e2; padding: 15px 20px; border-radius: 15px; color: #991b1b;">
                    <p style="margin: 0;">Ne pare rău, a apărut o eroare. Te rog încearcă din nou.</p>
                </div>
            </div>
        `;
        chatContainer.appendChild(errorMessage);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    @keyframes slideUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes slideIn {
        from { transform: translateX(-20px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 1; }
    }
`;
document.head.appendChild(style);

console.log('✅ Fiscal Law JavaScript loaded successfully');

