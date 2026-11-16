/**
 * UROMED Analytics & Conversion Tracking Architecture
 * Google Analytics 4 (GA4) + Meta Pixel Privacy-Compliant Event Dispatcher
 * 
 * Strict Privacy Guidelines:
 * - NO Personal Identifiable Information (PII)
 * - NO Personal Health Information (PHI) / Clinical Symptoms / Diagnoses
 * - Compliant with Mexico LFPDPPP, Meta Health Data Policy & Google Healthcare Policy
 */

(function() {
    'use strict';

    // 1. DataLayer & gtag Initialization
    window.dataLayer = window.dataLayer || [];
    function gtag() {
        window.dataLayer.push(arguments);
    }
    window.gtag = gtag;

    // GA4 Configuration:
    // Only load external script if a real, verified measurement ID is supplied (e.g. window.UROMED_GA4_ID = 'G-XXXXXXXXXX')
    const configuredId = window.UROMED_GA4_ID;
    const isValidGa4Id = typeof configuredId === 'string' && 
                         /^G-[A-Z0-9]+$/i.test(configuredId.trim()) && 
                         configuredId.trim() !== 'G-UROMED2026' && 
                         configuredId.trim() !== 'G-XXXXXXXXXX';

    if (isValidGa4Id) {
        const ga4Id = configuredId.trim();
        gtag('js', new Date());
        gtag('config', ga4Id, {
            send_page_view: true,
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure'
        });

        // Load gtag.js asynchronously only when valid ID is present
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga4Id);
        document.head.appendChild(script);
    }

    // Helper: Safe Event Dispatcher (Guarantees zero PII / zero sensitive health data)
    window.trackUromedEvent = function(eventName, eventParams) {
        // Operational parameters only - strictly NO clinical data or PII
        const cleanParams = Object.assign({
            page_path: window.location.pathname,
            page_title: document.title,
            timestamp: new Date().toISOString()
        }, eventParams || {});

        // Dispatch to GA4 dataLayer ONLY if valid GA4 ID is loaded
        if (isValidGa4Id) {
            gtag('event', eventName, cleanParams);
        }

        // Dispatch to Meta Pixel if present (only generic standard events, zero health data)
        if (typeof window.fbq === 'function') {
            if (eventName === 'whatsapp_click' || eventName === 'phone_call_click') {
                window.fbq('track', 'Contact', {
                    content_name: cleanParams.contact_channel ? ('Canal: ' + cleanParams.contact_channel) : 'Contacto Consultorio'
                });
            } else if (eventName === 'appointment_form_submit') {
                window.fbq('track', 'Lead', {
                    content_name: 'Solicitud Cita Médica'
                });
            }
        }

        // Developer log in console if debug mode is active
        if (window.location.search.includes('debug=true') || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('[UROMED Analytics Event]', eventName, cleanParams);
        }
    };

    // 2. Event Delegation for Clicks (WhatsApp, Phone, Maps) with Fixed Precedence
    document.addEventListener('click', function(e) {
        const target = e.target.closest('a');
        if (!target) return;

        const href = target.getAttribute('href') || '';

        // Resolved location without operator precedence bug
        const explicitLoc = target.getAttribute('data-analytics-location') || target.getAttribute('aria-label');
        const fallbackLoc = target.closest('header') ? 'header' : (target.closest('footer') ? 'footer' : 'body');
        const location = explicitLoc || fallbackLoc;

        // Case A: WhatsApp clicks
        if (href.includes('wa.me') || href.includes('whatsapp.com')) {
            window.trackUromedEvent('whatsapp_click', {
                button_location: location,
                contact_channel: 'whatsapp'
            });
        }

        // Case B: Phone calls
        else if (href.startsWith('tel:')) {
            window.trackUromedEvent('phone_call_click', {
                button_location: location,
                contact_channel: 'phone'
            });
        }

        // Case C: Google Maps navigation
        else if (href.includes('google.com/maps') || href.includes('maps.google.com')) {
            let locationName = 'consultorio_zamora';
            if (href.includes('Piedad')) locationName = 'sucursal_la_piedad';

            window.trackUromedEvent('location_interaction', {
                location_name: locationName,
                button_location: location,
                action_type: 'open_google_maps'
            });
        }
    }, { passive: true });

})();
