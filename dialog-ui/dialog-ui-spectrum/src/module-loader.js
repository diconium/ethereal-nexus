// Module loader wrapper
(function() {
    'use strict';

    // Check if modules are supported
    if ('noModule' in HTMLScriptElement.prototype) {
        // Browser supports modules
        loadModule();
    } else {
        // Fallback for older browsers
        console.warn('ES Modules not supported in this browser');
    }

    function loadModule() {
        // Create script element dynamically
        const script = document.createElement('script');

        // Set attributes
        script.setAttribute('type', 'module');
        script.setAttribute('src', '/apps/remote-components/clientlibs/ethereal-nexus.web-components/js/index.esm.js');

        // Handle load/error events
        script.onload = function() {
            console.log('✅ Ethereal Nexus Web Components loaded successfully');

            // Dispatch custom event to notify components are ready
            window.dispatchEvent(new CustomEvent('ethereal-nexus-ready', {
                detail: { message: 'Web components loaded and registered' }
            }));
        };

        script.onerror = function() {
            console.error('❌ Failed to load Ethereal Nexus Web Components');

            // Dispatch error event
            window.dispatchEvent(new CustomEvent('ethereal-nexus-error', {
                detail: { error: 'Module loading failed' }
            }));
        };

        // Append to head
        document.head.appendChild(script);
    }
})();

