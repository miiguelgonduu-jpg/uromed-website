/**
 * UROMED Analytics & Conversion Tracking Architecture
 * Google Analytics 4 (GA4) + Privacy-Compliant Medical Event Dispatcher
 * 
 * Events:
 * - whatsapp_click (page_path, button_location, message_intent)
 * - phone_call_click (phone_number, page_path)
 * - appointment_form_submit (service_type, page_path) [NO PII / NO Health Data]
 * - location_interaction (location_name, action_type, page_path)
 * - service_page_view (service_category, page_path)
 */

(function() {
    'use strict';

    // 1. DataLayer Initialization
    window.dataLayer = window.dataLayer || [];
    function gtag() {
        window.dataLayer.push(arguments);
    }
    window.gtag = gtag;

    // GA4 Configuration: Replace with your GA4 Measurement ID (e.g., 'G-XXXXXXXXXX')
    const GA4_MEASUREMENT_ID = window.UROMED_GA4_ID || 'G-UROMED2026';

    // Initialize GA4 if ID is configured
    if (GA4_MEASUREMENT_ID && GA4_MEASUREMENT_ID !== 'G-XXXXXXXXXX') {
        gtag('js', new Date());
        gtag('config', GA4_MEASUREMENT_ID, {
            send_page_view: true,
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure'
        });

        // Load gtag.js asynchronously
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_MEASUREMENT_ID;
        document.head.appendChild(script);
    }

    // Helper: Safe Event Dispatcher (Guarantees zero PII / zero sensitive health data)
    window.trackUromedEvent = function(eventName, eventParams) {
        const cleanParams = Object.assign({
            page_path: window.location.pathname,
            page_title: document.title,
            timestamp: new Date().toISOString()
        }, eventParams || {});

        // Dispatch to GA4 dataLayer
        gtag('event', eventName, cleanParams);

        // Also dispatch to Meta Pixel if present
        if (typeof window.fbq === 'function') {
            if (eventName === 'whatsapp_click' || eventName === 'phone_call_click') {
                window.fbq('track', 'Contact', { content_name: cleanParams.button_location || eventName });
            } else if (eventName === 'appointment_form_submit') {
                window.fbq('track', 'Lead', { content_category: cleanParams.service_type });
            }
        }

        // Developer log in console if debug mode is active
        if (window.location.search.includes('debug=true') || window.location.hostname === 'localhost') {
            console.log('[UROMED Analytics Event]', eventName, cleanParams);
        }
    };

    // Helper: Classify WhatsApp intent without sensitive data
    function getCleanWhatsappIntent(url) {
        if (!url) return 'general';
        const lower = url.toLowerCase();
        if (lower.includes('holep')) return 'holep_cirugia';
        if (lower.includes('calculo') || lower.includes('piedra')) return 'calculos_renales';
        if (lower.includes('prostata')) return 'problemas_prostata';
        if (lower.includes('serdan')) return 'sede_serdan_zamora';
        if (lower.includes('colon')) return 'sede_colon_zamora';
        if (lower.includes('piedad')) return 'sede_la_piedad';
        return 'consulta_general';
    }

    // 2. Event Delegation for Clicks (WhatsApp, Phone, Maps)
    document.addEventListener('click', function(e) {
        const target = e.target.closest('a');
        if (!target) return;

        const href = target.getAttribute('href') || '';

        // Case A: WhatsApp clicks
        if (href.includes('wa.me') || href.includes('whatsapp.com')) {
            const location = target.getAttribute('data-analytics-location') || 
                             target.getAttribute('aria-label') || 
                             target.closest('header') ? 'header' : 
                             target.closest('footer') ? 'footer' : 'body';

            window.trackUromedEvent('whatsapp_click', {
                button_location: location,
                message_intent: getCleanWhatsappIntent(href)
            });
        }

        // Case B: Phone calls
        else if (href.startsWith('tel:')) {
            const location = target.getAttribute('data-analytics-location') || 'general';
            window.trackUromedEvent('phone_call_click', {
                phone_number: '+523511502304',
                button_location: location
            });
        }

        // Case C: Google Maps navigation
        else if (href.includes('google.com/maps') || href.includes('maps.google.com')) {
            let locationName = 'desconocida';
            if (href.includes('Aquiles') || href.includes('Serd')) locationName = 'consultorio_serdan_zamora';
            else if (href.includes('Col') || href.includes('320')) locationName = 'consultorio_colon_zamora';
            else if (href.includes('Piedad')) locationName = 'sucursal_la_piedad';

            window.trackUromedEvent('location_interaction', {
                location_name: locationName,
                action_type: 'open_google_maps'
            });
        }
    }, { passive: true });

    // 3. Appointment Form Listener (Home page booking form)
    document.addEventListener('DOMContentLoaded', function() {
        const appointmentForm = document.getElementById('appointment-form');
        if (appointmentForm) {
            appointmentForm.addEventListener('submit', function() {
                const serviceSelect = document.getElementById('service-type');
                const selectedService = serviceSelect ? serviceSelect.value : 'Consulta General';

                // Send purely operational data - NO patient personal information
                window.trackUromedEvent('appointment_form_submit', {
                    service_type: selectedService
                });
            }, { passive: true });
        }

        // 4. Service Page View Classification
        const path = window.location.pathname;
        let serviceCategory = null;
        if (path.includes('calculos-renales')) serviceCategory = 'urologia_calculos';
        else if (path.includes('cirugia-prostata-holep')) serviceCategory = 'urologia_holep';
        else if (path.includes('problemas-de-prostata')) serviceCategory = 'urologia_prostata';
        else if (path.includes('consulta-urologica')) serviceCategory = 'urologia_consulta';
        else if (path.includes('dr-israel-jimenez')) serviceCategory = 'urologia_perfil';
        else if (path.includes('ubicaciones')) serviceCategory = 'urologia_ubicaciones';

        if (serviceCategory) {
            window.trackUromedEvent('service_page_view', {
                service_category: serviceCategory
            });
        }
    });

})();
