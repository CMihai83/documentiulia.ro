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
