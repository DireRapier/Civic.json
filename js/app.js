document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    console.log('Initializing Civic.json Engine...');

    fetch('data/village.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Data loaded successfully:', data);
            renderDashboard(data);
        })
        .catch(error => {
            console.error('Fetch error:', error);
            renderErrorState();
        });
}

function renderDashboard(data) {
    const alertsFeed = document.getElementById('alerts-feed');
    const resourcesGrid = document.getElementById('resources-grid');

    // Clear existing content (keeping the headers)
    clearContentAfterHeader(alertsFeed);
    clearContentAfterHeader(resourcesGrid);

    // Render Alerts
    if (data.alerts && data.alerts.length > 0) {
        data.alerts.forEach(alert => {
            const alertCard = createAlertCard(alert);
            alertsFeed.appendChild(alertCard);
        });
    }

    // Render Resources
    if (data.resources && data.resources.length > 0) {
        data.resources.forEach(resource => {
            const resourceCard = createResourceCard(resource);
            resourcesGrid.appendChild(resourceCard);
        });
    }
}

function clearContentAfterHeader(container) {
    // Keep the h2, remove everything else
    // We start from the end to safely remove nodes
    while (container.lastElementChild && container.lastElementChild.tagName !== 'H2') {
        container.removeChild(container.lastElementChild);
    }
}

function createAlertCard(alert) {
    const card = document.createElement('div');
    card.className = `card alert-card severity-${alert.severity.toLowerCase()}`;

    // Icon
    const icon = document.createElement('i');
    icon.className = getAlertIconClass(alert.severity);
    card.appendChild(icon);

    // Content Wrapper
    const content = document.createElement('div');
    content.className = 'card-content';

    // Message
    const message = document.createElement('h3');
    message.textContent = alert.message;
    content.appendChild(message);

    // Meta (Severity & Timestamp)
    const meta = document.createElement('p');
    const date = new Date(alert.timestamp).toLocaleTimeString();
    meta.textContent = `${alert.severity} • ${date}`;
    content.appendChild(meta);

    card.appendChild(content);
    return card;
}

function createResourceCard(resource) {
    const card = document.createElement('div');
    card.className = 'card resource-card';

    // Header
    const header = document.createElement('div');
    header.className = 'card-header';

    const icon = document.createElement('i');
    icon.className = getResourceIconClass(resource.type);
    header.appendChild(icon);

    const type = document.createElement('h3');
    type.textContent = resource.type;
    header.appendChild(type);

    card.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'card-body';

    const location = document.createElement('p');
    location.textContent = `Loc: ${resource.location}`;
    body.appendChild(location);

    const quantity = document.createElement('p');
    quantity.className = 'quantity';
    quantity.textContent = resource.quantity;
    body.appendChild(quantity);

    const status = document.createElement('span');
    status.className = `status-badge status-${resource.status.toLowerCase()}`;
    status.textContent = resource.status;
    body.appendChild(status);

    card.appendChild(body);

    return card;
}

function renderErrorState() {
    const main = document.getElementById('dashboard-grid');

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-state';
    errorDiv.textContent = '⚠ CONNECTION LOST: LOAD LOCAL BACKUP.';

    // In strict emergency mode, we might want to clear everything or just append
    // The requirement says "inject a div", let's append it to the top or replace content?
    // User said "If the Fetch fails, inject a div... into the <main> container."
    // Let's clear the main container to be safe and show only the error as it seems like a replacement.
    main.innerHTML = '';
    main.appendChild(errorDiv);
}

function getAlertIconClass(severity) {
    switch (severity.toLowerCase()) {
        case 'high': return 'ri-alarm-warning-fill';
        case 'medium': return 'ri-error-warning-fill';
        case 'low': return 'ri-information-fill';
        default: return 'ri-notification-line';
    }
}

function getResourceIconClass(type) {
    switch (type.toLowerCase()) {
        case 'water': return 'ri-water-flash-fill';
        case 'food': return 'ri-goblet-fill';
        case 'energy': return 'ri-battery-charge-fill';
        case 'medical': return 'ri-first-aid-kit-fill';
        default: return 'ri-box-3-fill';
    }
}
