// Phase 5: Persistence - 'Brain' Foundation
let appState = null;

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    setupAdminControls();
    setupSystemControls();
});

// Debugging helper exposed to window
window.debugState = () => console.log('Current App State:', appState);

function loadState() {
    console.log('Initializing Civic.json Engine...');

    // 1. Check LocalStorage
    const localData = localStorage.getItem('civicData');

    if (localData) {
        try {
            appState = JSON.parse(localData);
            console.log('Loaded from LocalStorage:', appState);
            renderDashboard(appState);
            calculateSurvivalScore(appState);
            return; // Exit early, do not fetch
        } catch (e) {
            console.error('LocalStorage corrupted, falling back to factory defaults.', e);
        }
    }

    // 2. Fallback to Factory Defaults (JSON fetch)
    fetch('data/village.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            appState = data;
            console.log('Initialized from Factory Defaults:', appState);
            saveState(); // Initialize LocalStorage
            renderDashboard(appState);
            calculateSurvivalScore(appState);
        })
        .catch(error => {
            console.error('Fetch error:', error);
            // Only show error if we have NO data at all
            if (!appState) {
                renderErrorState();
            }
        });
}

function saveState() {
    if (appState) {
        try {
            localStorage.setItem('civicData', JSON.stringify(appState));
            console.log('State saved to LocalStorage');
        } catch (e) {
            console.error('Failed to save state:', e);
        }
    }
}

// Internal helper for Hard Reset (to be wired later)
function resetToFactorySettings() {
    console.warn('Resetting to Factory Settings...');
    localStorage.removeItem('civicData');
    location.reload();
}

function calculateSurvivalScore(data) {
    const scoreElement = document.getElementById('survival-score');
    const header = document.getElementById('app-header');

    // Count Active Resources ("Good" or "Adequate")
    let activeResources = 0;
    if (data.resources) {
        activeResources = data.resources.filter(r =>
            ['good', 'adequate'].includes(r.status.toLowerCase())
        ).length;
    }

    // Count Skills
    let skillCount = 0;
    if (data.skills) {
        skillCount = data.skills.length;
    }

    // Formula: (Active Resources * 5) + (Skills * 10)
    let rawScore = (activeResources * 5) + (skillCount * 10);

    // Clamp to 100
    const finalScore = Math.min(rawScore, 100);

    // Update UI
    scoreElement.textContent = `Survival Score: ${finalScore}%`;
    scoreElement.style.fontWeight = 'bold';
    scoreElement.style.marginTop = '0.5rem';

    // Update Header Border based on Score
    let borderColor = '#e74c3c'; // Default Red (< 50)

    if (finalScore >= 80) {
        borderColor = '#27ae60'; // Green
    } else if (finalScore >= 50) {
        borderColor = '#f1c40f'; // Yellow
    }

    header.style.borderBottom = `4px solid ${borderColor}`;

    console.log(`Survival Score Calculation:
    Active Resources: ${activeResources} (* 5 = ${activeResources * 5})
    Skills: ${skillCount} (* 10 = ${skillCount * 10})
    Total: ${rawScore} (Clamped: ${finalScore})
    Status Color: ${borderColor}`);
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

function setupAdminControls() {
    const fab = document.getElementById('admin-toggle');
    const modal = document.getElementById('edit-modal');
    const form = document.getElementById('resource-form');
    const cancelBtn = document.getElementById('btn-cancel');

    // Open Modal
    fab.addEventListener('click', () => {
        modal.showModal();
    });

    // Close Modal (Cancel)
    cancelBtn.addEventListener('click', () => {
        modal.close();
    });

    // Close Modal (Backdrop Click)
    modal.addEventListener('click', (e) => {
        const rect = modal.getBoundingClientRect();
        const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
                          rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
        if (!isInDialog) {
            modal.close();
        }
    });

    // Handle Submit
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const type = document.getElementById('input-type').value;
        const location = document.getElementById('input-location').value;
        const quantity = document.getElementById('input-quantity').value;
        const status = document.getElementById('input-status').value;

        const newResource = {
            id: Date.now().toString(),
            type: type,
            location: location,
            quantity: quantity,
            status: status
        };

        // Add to state
        if (!appState.resources) {
            appState.resources = [];
        }
        appState.resources.push(newResource);

        // Save & Render
        saveState();
        renderDashboard(appState);
        calculateSurvivalScore(appState);

        // Reset & Close
        form.reset();
        modal.close();
    });
}

function setupSystemControls() {
    const btnExport = document.getElementById('btn-export');
    const btnImportTrigger = document.getElementById('btn-import-trigger');
    const fileImport = document.getElementById('file-import');

    // Export Logic
    btnExport.addEventListener('click', exportData);

    // Import Trigger
    btnImportTrigger.addEventListener('click', () => {
        fileImport.click();
    });

    // Import Logic
    fileImport.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                // Sanity Check
                if (!importedData.resources || !Array.isArray(importedData.resources)) {
                    alert("Invalid Backup File");
                    return;
                }

                // Update State
                appState = importedData;
                saveState();
                location.reload();

            } catch (err) {
                console.error("Error importing file", err);
                alert("Invalid JSON File");
            }
        };
        reader.readAsText(file);
    });
}

function exportData() {
    if (!appState) return;
    const dataStr = JSON.stringify(appState, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", url);
    downloadAnchorNode.setAttribute("download", `civic-backup-${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    URL.revokeObjectURL(url);
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
        case 'comms': return 'ri-broadcast-fill';
        default: return 'ri-box-3-fill';
    }
}
