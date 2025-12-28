(function (window, document) {
    // Config
    const SCRIPT_ID = 'soto-widget-script';
    const CONTAINER_ID = 'soto-widget-container';
    const IFRAME_URL = 'http://localhost:3001/widget'; // Updated port to 3001

    function init() {
        const existingContainer = document.getElementById(CONTAINER_ID);
        if (existingContainer) return;

        // Create container
        const container = document.createElement('div');
        container.id = CONTAINER_ID;
        container.style.position = 'fixed';
        container.style.bottom = '80px'; // Moved up slightly
        container.style.right = '20px';
        container.style.width = '400px';
        container.style.height = '600px';
        container.style.zIndex = '9999';
        container.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
        container.style.borderRadius = '12px';
        container.style.overflow = 'hidden';
        container.style.display = 'none'; // Start hidden

        // Launcher Button (Round FAB)
        const btn = document.createElement('button');
        btn.innerHTML = '📅 Reserva Ahora';
        btn.style.position = 'fixed';
        btn.style.bottom = '20px';
        btn.style.right = '20px';
        btn.style.padding = '15px 25px';
        btn.style.backgroundColor = '#C59D5F'; // Corporate Gold
        btn.style.color = '#fff';
        btn.style.border = 'none';
        btn.style.borderRadius = '50px';
        btn.style.cursor = 'pointer';
        btn.style.zIndex = '10000';
        btn.style.fontWeight = 'bold';
        btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
        btn.onmouseout = () => btn.style.transform = 'scale(1)';
        btn.style.transition = 'transform 0.2s';

        // Iframe
        const iframe = document.createElement('iframe');
        iframe.src = IFRAME_URL;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';

        container.appendChild(iframe);
        document.body.appendChild(container);
        document.body.appendChild(btn);

        // Toggle Logic
        let isOpen = false;
        btn.onclick = () => {
            isOpen = !isOpen;
            container.style.display = isOpen ? 'block' : 'none';
            btn.innerHTML = isOpen ? '✖ Cerrar' : '📅 Reserva Ahora';
        };
    }

    // Auto-init
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }

})(window, document);
