(function () {
    const SCRIPT_ID = 'soto-widget-script';
    const CONTAINER_ID = 'soto-widget-container';
    // const IFRAME_URL = 'http://localhost:3001/widget/restaurant'; 
    // Dynamically detecting if valid url or localhost
    const IFRAME_URL = 'http://localhost:3001/widget/restaurant';

    function init() {
        // Prevent multiple initializations
        if (document.getElementById(CONTAINER_ID)) return;

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
                display: none; /* Hidden by default */
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
                height: 650px; /* Fixed height for the widget content */
                border: none;
            }
        `;
        document.head.appendChild(style);

        // 2. Create Elements

        // Overlay & Modal
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

        // Also listen for future elements (optional, but good for SPAs) or just run on init
        console.log('Soto Widget Initialized. Use SotoWidget.open() or class .soto-widget-trigger');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
