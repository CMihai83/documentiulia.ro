/**
 * Google Analytics 4 Configuration for DocumentiUlia
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://analytics.google.com
 * 2. Create account "DocumentiUlia"
 * 3. Create property "DocumentiUlia Production"
 * 4. Create Data Stream → Web → https://documentiulia.ro
 * 5. Copy Measurement ID (format: G-XXXXXXXXXX)
 * 6. Replace 'G-XXXXXXXXXX' below with your actual ID
 */

const GA4_CONFIG = {
    measurementId: 'G-XXXXXXXXXX', // Replace with your actual GA4 Measurement ID
    
    // Custom event names
    events: {
        betaApplicationStarted: 'beta_application_started',
        betaApplicationCompleted: 'beta_application_completed',
        betaApplicationAccepted: 'beta_application_accepted',
        betaApplicationPending: 'beta_application_pending',
        betaApplicationWaitlist: 'beta_application_waitlist',
        formFieldFocused: 'form_field_focused',
        formValidationError: 'form_validation_error'
    },
    
    // Debug mode (set to false in production)
    debug: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
};

// Initialize GA4
function initGA4() {
    if (GA4_CONFIG.measurementId === 'G-XXXXXXXXXX') {
        console.warn('GA4: Measurement ID not configured. Tracking disabled.');
        return false;
    }
    
    // Load gtag.js
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_CONFIG.measurementId}`;
    document.head.appendChild(script);
    
    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    
    gtag('js', new Date());
    gtag('config', GA4_CONFIG.measurementId, {
        'debug_mode': GA4_CONFIG.debug,
        'send_page_view': true
    });
    
    console.log('GA4 initialized:', GA4_CONFIG.measurementId);
    return true;
}

// Track custom event
function trackGA4Event(eventName, eventParams = {}) {
    if (typeof gtag === 'undefined') {
        console.warn('GA4: gtag not loaded');
        return;
    }
    
    gtag('event', eventName, eventParams);
    
    if (GA4_CONFIG.debug) {
        console.log('GA4 Event:', eventName, eventParams);
    }
}

// Track beta application started
function trackBetaApplicationStarted() {
    trackGA4Event(GA4_CONFIG.events.betaApplicationStarted, {
        'page_location': window.location.href,
        'page_title': document.title
    });
}

// Track beta application completed
function trackBetaApplicationCompleted(applicationData) {
    const baseParams = {
        'company_type': applicationData.businessType,
        'num_products': parseInt(applicationData.numProducts),
        'num_employees': parseInt(applicationData.numEmployees),
        'application_score': applicationData.score,
        'auto_accepted': applicationData.status === 'accepted'
    };
    
    // Track main completion event
    trackGA4Event(GA4_CONFIG.events.betaApplicationCompleted, baseParams);
    
    // Track status-specific event
    if (applicationData.status === 'accepted') {
        trackGA4Event(GA4_CONFIG.events.betaApplicationAccepted, baseParams);
    } else if (applicationData.status === 'pending') {
        trackGA4Event(GA4_CONFIG.events.betaApplicationPending, baseParams);
    } else if (applicationData.status === 'waitlist') {
        trackGA4Event(GA4_CONFIG.events.betaApplicationWaitlist, baseParams);
    }
}

// Track form field interaction
function trackFormFieldFocused(fieldName) {
    trackGA4Event(GA4_CONFIG.events.formFieldFocused, {
        'field_name': fieldName
    });
}

// Track form validation errors
function trackFormValidationError(fieldName, errorMessage) {
    trackGA4Event(GA4_CONFIG.events.formValidationError, {
        'field_name': fieldName,
        'error_message': errorMessage
    });
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGA4);
} else {
    initGA4();
}

// Export for use in other scripts
window.GA4 = {
    config: GA4_CONFIG,
    track: trackGA4Event,
    trackBetaApplicationStarted,
    trackBetaApplicationCompleted,
    trackFormFieldFocused,
    trackFormValidationError
};
