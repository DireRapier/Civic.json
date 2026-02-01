// Phase 5: Persistence - 'Brain' Foundation
// Phase 6: Full Lifecycle & Polish
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
            return;
        } catch (e) {
            console.error('LocalStorage corrupted, resetting.', e);
        }
    }

    // 2. Initialize Empty State (Clean Slate)
    appState = {
        communityName: "My Community",
        resources: [],
        alerts: [],
        lastUpdated: Date.now()
    };
    console.log('Initialized Empty State:', appState);
    saveState();
    renderDashboard(appState);
    calculateSurvivalScore(appState);
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

// Internal helper for Hard Reset
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
}

function renderDashboard(data) {
    const alertsContainer = document.getElementById('alerts-container');
    const resourcesGrid = document.getElementById('resources-grid');

    // Clear existing content (keeping the headers is handled by structure changes, we clear containers now)
    alertsContainer.innerHTML = '';
    // For resources grid, we need to be careful not to remove the H2 if it's inside (it is).
    // Actually, in the HTML update, I put the H2 *inside* the section, but the container for alerts is new (#alerts-container).
    // For resources, we are appending to #resources-grid directly which has the H2.
    // Let's use the helper for resources-grid.
    clearContentAfterHeader(resourcesGrid);

    // Render Alerts
    if (data.alerts && data.alerts.length > 0) {
        data.alerts.forEach((alert, index) => {
            const alertCard = createAlertCard(alert, index);
            alertsContainer.appendChild(alertCard);
        });
    } else {
        // Zero State
        const safeCard = document.createElement('div');
        safeCard.className = 'card alert-safe';
        safeCard.innerHTML = `<h3><i class="ri-checkbox-circle-line"></i> Situation Normal</h3>`;
        alertsContainer.appendChild(safeCard);
    }

    // Render Resources
    if (data.resources && data.resources.length > 0) {
        data.resources.forEach((resource, index) => {
            const resourceCard = createResourceCard(resource, index);
            resourcesGrid.appendChild(resourceCard);
        });
    } else {
        // Zero State
        const emptyCard = document.createElement('div');
        emptyCard.className = 'card empty-resources';
        emptyCard.style.gridColumn = "1 / -1"; // Full width
        emptyCard.style.textAlign = "center";
        emptyCard.style.border = "2px dashed var(--glass-border)";
        emptyCard.style.opacity = "0.6";
        emptyCard.innerHTML = `<h3>Inventory Empty. Click + to start.</h3>`;
        resourcesGrid.appendChild(emptyCard);
    }
}

function clearContentAfterHeader(container) {
    while (container.lastElementChild && container.lastElementChild.tagName !== 'H2') {
        container.removeChild(container.lastElementChild);
    }
}

function createAlertCard(alert, index) {
    const card = document.createElement('div');
    card.className = `card alert-card severity-${alert.severity.toLowerCase()}`;

    // Dismiss Button
    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'btn-dismiss';
    dismissBtn.innerHTML = '<i class="ri-close-line"></i>';
    dismissBtn.onclick = () => {
        appState.alerts.splice(index, 1);
        saveState();
        renderDashboard(appState);
    };
    card.appendChild(dismissBtn);

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
    meta.textContent = `${alert.severity} • ${formatDate(alert.timestamp)}`;
    content.appendChild(meta);

    card.appendChild(content);
    return card;
}

function createResourceCard(resource, index) {
    const card = document.createElement('div');
    card.className = 'card resource-card';

    // Trash Button
    const trashBtn = document.createElement('button');
    trashBtn.className = 'btn-trash';
    trashBtn.innerHTML = '<i class="ri-delete-bin-line"></i>';
    trashBtn.onclick = () => {
        if (confirm("Remove this item?")) {
            appState.resources.splice(index, 1);
            saveState();
            renderDashboard(appState);
            calculateSurvivalScore(appState);
        }
    };
    card.appendChild(trashBtn);

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

function formatDate(timestamp) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(timestamp));
}

function setupAdminControls() {
    // Resource Modal
    const fab = document.getElementById('admin-toggle');
    const modal = document.getElementById('edit-modal');
    const form = document.getElementById('resource-form');
    const cancelBtn = document.getElementById('btn-cancel');

    fab.addEventListener('click', () => modal.showModal());
    cancelBtn.addEventListener('click', () => modal.close());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.close();
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newResource = {
            id: Date.now().toString(),
            type: document.getElementById('input-type').value,
            location: document.getElementById('input-location').value,
            quantity: document.getElementById('input-quantity').value,
            status: document.getElementById('input-status').value
        };

        if (!appState.resources) appState.resources = [];
        appState.resources.push(newResource);

        saveState();
        renderDashboard(appState);
        calculateSurvivalScore(appState);

        form.reset();
        modal.close();
    });

    // Alert Modal
    const addAlertBtn = document.getElementById('add-alert-btn');
    const alertModal = document.getElementById('alert-modal');
    const alertForm = document.getElementById('alert-form');
    const cancelAlertBtn = document.getElementById('btn-cancel-alert');

    addAlertBtn.addEventListener('click', () => alertModal.showModal());
    cancelAlertBtn.addEventListener('click', () => alertModal.close());
    alertModal.addEventListener('click', (e) => {
        if (e.target === alertModal) alertModal.close();
    });

    alertForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newAlert = {
            id: Date.now().toString(),
            message: document.getElementById('alert-message').value,
            severity: document.getElementById('alert-severity').value,
            timestamp: Date.now() // Use current time
        };

        if (!appState.alerts) appState.alerts = [];
        // Add to TOP of list
        appState.alerts.unshift(newAlert);

        saveState();
        renderDashboard(appState);

        alertForm.reset();
        alertModal.close();
    });
}

function setupSystemControls() {
    const btnExport = document.getElementById('btn-export');
    const btnImportTrigger = document.getElementById('btn-import-trigger');
    const fileImport = document.getElementById('file-import');

    btnExport.addEventListener('click', exportData);
    btnImportTrigger.addEventListener('click', () => fileImport.click());

    fileImport.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (!importedData.resources || !Array.isArray(importedData.resources)) {
                    alert("Invalid Backup File");
                    return;
                }
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
        case 'critical': return 'ri-alarm-warning-fill';
        case 'warning': return 'ri-error-warning-fill';
        case 'info': return 'ri-information-fill';
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
