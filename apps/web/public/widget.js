(function () {
    const CONTAINER_ID = 'soto-widget-container';
    
    // Automatically determine BASE_URL from the script source
    let BASE_URL = 'https://reservas.sotodelprior.com';
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].src.indexOf('widget.js') !== -1) {
            const url = new URL(scripts[i].src);
            BASE_URL = url.origin;
            break;
        }
    }

    function init() {
        // Prevent multiple initializations
        if (document.getElementById(CONTAINER_ID)) return;

        // Find the data-restaurant attribute from the embed div
        const embedDiv = document.getElementById('soto-booking-widget');
        const restaurantId = embedDiv ? embedDiv.getAttribute('data-restaurant') : null;
        const mode = embedDiv ? (embedDiv.getAttribute('data-mode') || 'popup') : 'popup';

        if (!restaurantId) {
            console.error('[SotoWidget] No se encontró data-restaurant en #soto-booking-widget');
            return;
        }

        const IFRAME_URL = `${BASE_URL}/widget/restaurant?id=${restaurantId}&mode=${mode}`;

        if (mode === 'inline') {
            const iframe = document.createElement('iframe');
            iframe.id = 'soto-widget-iframe-inline';
            iframe.src = IFRAME_URL;
            iframe.style.width = '100%';
            iframe.style.height = '700px';
            iframe.style.border = 'none';
            iframe.style.borderRadius = '12px';
            iframe.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1)';
            
            // Clear any existing content in the embed div
            embedDiv.innerHTML = '';
            embedDiv.style.display = 'block';
            embedDiv.appendChild(iframe);
            
            // Mark container so we don't init again
            const container = document.createElement('div');
            container.id = CONTAINER_ID;
            container.style.display = 'none';
            document.body.appendChild(container);
            
            console.log('[SotoWidget] Restaurant widget initialized in inline mode for ID: ' + restaurantId);
            return;
        }

        // 1. Inject CSS
        const style = document.createElement('style');
        style.innerHTML = `
            #soto-widget-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999999;
                display: none;
                justify-content: center;
                align-items: center;
                backdrop-filter: blur(4px);
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            #soto-widget-overlay.open {
                display: flex;
                opacity: 1;
            }
            #soto-widget-modal {
                background: white;
                width: 900px;
                max-width: 95vw;
                height: auto;
                max-height: 90vh;
                border-radius: 8px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                position: relative;
                overflow: hidden;
                transform: scale(0.95);
                transition: transform 0.3s ease;
            }
            #soto-widget-overlay.open #soto-widget-modal {
                transform: scale(1);
            }
            #soto-widget-close {
                position: absolute;
                top: 15px;
                right: 15px;
                background: #f4f4f4;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #333;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
                padding-bottom: 4px;
            }
            #soto-widget-close:hover {
                background: #e0e0e0;
            }
            #soto-widget-launcher {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #0A0A0A;
                color: #C59D5F;
                border: 1px solid #C59D5F;
                padding: 12px 24px;
                font-family: 'Oswald', sans-serif;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 1px;
                cursor: pointer;
                z-index: 999990;
                box-shadow: 0 4px 14px rgba(0,0,0,0.2);
                transition: all 0.3s ease;
            }
            #soto-widget-launcher:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            }
            #soto-widget-iframe {
                width: 100%;
                height: 650px;
                border: none;
            }
        `;
        document.head.appendChild(style);

        // 2. Create Elements
        const overlay = document.createElement('div');
        overlay.id = 'soto-widget-overlay';

        const modal = document.createElement('div');
        modal.id = 'soto-widget-modal';

        const closeBtn = document.createElement('button');
        closeBtn.id = 'soto-widget-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = closeModal;

        const iframe = document.createElement('iframe');
        iframe.id = 'soto-widget-iframe';
        iframe.src = IFRAME_URL;

        modal.appendChild(closeBtn);
        modal.appendChild(iframe);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Mark container
        const container = document.createElement('div');
        container.id = CONTAINER_ID;
        document.body.appendChild(container);

        // 3. Logic
        function openModal(e) {
            if (e) e.preventDefault();
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        function closeModal() {
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }

        // Close on clicking outside
        overlay.onclick = function (e) {
            if (e.target === overlay) {
                closeModal();
            }
        };

        // 4. Expose API and Bind Triggers
        window.SotoWidget = {
            open: openModal,
            close: closeModal
        };

        // Bind to any element with class 'soto-widget-trigger'
        document.querySelectorAll('.soto-widget-trigger').forEach(btn => {
            btn.addEventListener('click', openModal);
        });

        console.log('[SotoWidget] Restaurant widget initialized for ID: ' + restaurantId);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
