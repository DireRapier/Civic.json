// Phase 14: Identity & Intelligence
let appState = null;
let editingResourceId = null;
let editingPersonId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    setupSystemControls();
    setupGovernanceControls(); // New Governance logic

    const path = window.location.pathname;
    if (path.includes('people.html')) {
        renderCensus(appState);
        setupPersonControls();
    } else {
        renderDashboard(appState);
        setupResourceControls();
        setupAlertControls();
    }
});

// Debugging helper
window.debugState = () => console.log('Current App State:', appState);

function loadState() {
    console.log('Initializing Civic.json Engine...');

    const localData = localStorage.getItem('civicData');

    if (localData) {
        try {
            appState = JSON.parse(localData);
            // Migration for communityInfo if missing
            if (!appState.communityInfo) {
                appState.communityInfo = {
                    name: appState.communityName || "Purok OS",
                    captain: "",
                    location: ""
                };
            }
            console.log('Loaded from LocalStorage:', appState);
            calculateStats(appState); // New Stats logic
            updateBrand();
            return;
        } catch (e) {
            console.error('LocalStorage corrupted, resetting.', e);
        }
    }

    appState = {
        communityInfo: {
            name: "My Community",
            captain: "",
            location: ""
        },
        resources: [],
        alerts: [],
        people: [],
        lastUpdated: Date.now()
    };
    console.log('Initialized Empty State:', appState);
    saveState();
    calculateStats(appState);
    updateBrand();
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

function updateBrand() {
    const brandElements = document.querySelectorAll('#app-brand');
    brandElements.forEach(el => {
        if (appState.communityInfo && appState.communityInfo.name) {
            el.textContent = appState.communityInfo.name;
        }
    });
}

function calculateStats(data) {
    const scoreElement = document.getElementById('survival-score');
    const header = document.getElementById('app-header');

    if (!scoreElement || !header) return;

    // 1. Population Count
    const pop = data.people ? data.people.length : 0;

    // 2. Medics Count (Case insensitive check)
    let medics = 0;
    if (data.people) {
        medics = data.people.filter(p => {
            const skill = (p.skill || "").toLowerCase();
            return skill.includes('medic') || skill.includes('doctor') || skill.includes('nurse');
        }).length;
    }

    // 3. Water Summation (Unit Converter)
    let waterTotal = 0;
    if (data.resources) {
        data.resources.forEach(r => {
            if (r.type === 'Water') {
                const match = r.quantity.match(/^([\d\.]+)(\s*.*)$/);
                if (match) {
                    let val = parseFloat(match[1]);
                    const unit = match[2].toLowerCase();
                    if (unit.includes('gal')) {
                        val = val * 3.78; // Convert Gallons to Liters
                    }
                    waterTotal += val;
                }
            }
        });
    }

    // 4. Resilience Score (Background Logic for Border Color)
    // Active Resources + Skills (All Living)
    let activeResources = 0;
    if (data.resources) {
        activeResources = data.resources.filter(r =>
            ['good', 'adequate'].includes(r.status.toLowerCase())
        ).length;
    }

    // Count Living People
    let livingCount = 0;
    if (data.people) {
        livingCount = data.people.filter(p => p.health !== 'Deceased').length;
    }

    // Formula: (Active Resources * 5) + (Living * 10)
    let rawScore = (activeResources * 5) + (livingCount * 10);
    const finalScore = Math.min(rawScore, 100);

    // Update Header Text (Key Metrics)
    scoreElement.innerHTML = `
        <div class="key-metrics">
            <span><i class="ri-group-line"></i> Pop: ${pop}</span>
            <span><i class="ri-drop-line"></i> Water: ${waterTotal.toFixed(0)} L</span>
            <span><i class="ri-nurse-line"></i> Medics: ${medics}</span>
        </div>
    `;

    // Update Header Border based on Resilience Score
    // < 30 Red, > 70 Green
    let borderColor = '#f1c40f'; // Default Yellow

    if (finalScore < 30) {
        borderColor = '#e74c3c'; // Red
    } else if (finalScore > 70) {
        borderColor = '#27ae60'; // Green
    }

    header.style.borderBottom = `4px solid ${borderColor}`;
}

// ==========================================================================
// RENDER FUNCTIONS
// ==========================================================================

function renderDashboard(data) {
    const alertsContainer = document.getElementById('alerts-container');
    const resourcesGrid = document.getElementById('resources-grid');

    if (!alertsContainer || !resourcesGrid) return;

    alertsContainer.innerHTML = '';
    clearContentAfterHeader(resourcesGrid);

    // Render Alerts
    if (data.alerts && data.alerts.length > 0) {
        data.alerts.forEach((alert, index) => {
            const alertCard = createAlertCard(alert, index);
            alertsContainer.appendChild(alertCard);
        });
    } else {
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
        const emptyCard = document.createElement('div');
        emptyCard.className = 'card empty-resources';
        emptyCard.style.gridColumn = "1 / -1";
        emptyCard.style.textAlign = "center";
        emptyCard.style.border = "2px dashed var(--glass-border)";
        emptyCard.style.opacity = "0.6";
        emptyCard.innerHTML = `<h3>Inventory Empty. Click + to start.</h3>`;
        resourcesGrid.appendChild(emptyCard);
    }
}

function renderCensus(data) {
    const censusContainer = document.getElementById('census-container');
    if (!censusContainer) return;

    censusContainer.innerHTML = '';

    const people = data.people || [];

    if (people.length > 0) {
        people.forEach((person, index) => {
            const card = document.createElement('div');
            card.className = 'card census-card';

            const editBtn = document.createElement('button');
            editBtn.className = 'btn-edit';
            editBtn.innerHTML = '<i class="ri-pencil-line"></i>';
            editBtn.onclick = () => openPersonModal(person.id);
            card.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-trash';
            deleteBtn.innerHTML = '<i class="ri-delete-bin-line"></i>';
            deleteBtn.onclick = () => deletePerson(index);
            card.appendChild(deleteBtn);

            const header = document.createElement('div');
            header.className = 'card-header';
            header.innerHTML = `<i class="ri-user-smile-line"></i> <h3>${person.name}</h3>`;
            card.appendChild(header);

            const body = document.createElement('div');
            body.className = 'card-body';

            const details = document.createElement('p');
            details.innerHTML = `${person.age} / ${person.gender} <br> <strong>${person.skill}</strong>`;
            body.appendChild(details);

            if (person.contact) {
                const contact = document.createElement('p');
                contact.style.fontSize = '0.9rem';
                contact.style.opacity = '0.8';
                contact.textContent = person.contact;
                body.appendChild(contact);
            }

            const healthStatus = document.createElement('div');
            healthStatus.className = 'health-status';
            healthStatus.innerHTML = `<span class="health-dot status-${person.health.toLowerCase()}"></span> ${person.health}`;
            body.appendChild(healthStatus);

            card.appendChild(body);
            censusContainer.appendChild(card);
        });
    } else {
        censusContainer.innerHTML = `<div class="card empty-resources" style="text-align:center; opacity:0.6; padding:2rem; grid-column: 1 / -1;"><h3>Directory Empty. Add residents to track skills.</h3></div>`;
    }
}

// ==========================================================================
// CARD CREATORS & HELPERS
// ==========================================================================

function clearContentAfterHeader(container) {
    while (container.lastElementChild && container.lastElementChild.tagName !== 'H2') {
        container.removeChild(container.lastElementChild);
    }
}

function createAlertCard(alert, index) {
    const card = document.createElement('div');
    card.className = `card alert-card severity-${alert.severity.toLowerCase()}`;

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'btn-dismiss';
    dismissBtn.innerHTML = '<i class="ri-close-line"></i>';
    dismissBtn.onclick = () => {
        appState.alerts.splice(index, 1);
        saveState();
        renderDashboard(appState);
    };
    card.appendChild(dismissBtn);

    const icon = document.createElement('i');
    icon.className = getAlertIconClass(alert.severity);
    card.appendChild(icon);

    const content = document.createElement('div');
    content.className = 'card-content';

    const message = document.createElement('h3');
    message.textContent = alert.message;
    content.appendChild(message);

    const meta = document.createElement('p');
    meta.textContent = `${alert.severity} • ${formatDate(alert.timestamp)}`;
    content.appendChild(meta);

    card.appendChild(content);
    return card;
}

function createResourceCard(resource, index) {
    const card = document.createElement('div');
    card.className = 'card resource-card';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit';
    editBtn.innerHTML = '<i class="ri-pencil-line"></i>';
    editBtn.onclick = () => openResourceModal(resource.id);
    card.appendChild(editBtn);

    const trashBtn = document.createElement('button');
    trashBtn.className = 'btn-trash';
    trashBtn.innerHTML = '<i class="ri-delete-bin-line"></i>';
    trashBtn.onclick = () => {
        if (confirm("Remove this item?")) {
            appState.resources.splice(index, 1);
            saveState();
            renderDashboard(appState);
            calculateStats(appState);
        }
    };
    card.appendChild(trashBtn);

    const header = document.createElement('div');
    header.className = 'card-header';
    const icon = document.createElement('i');
    icon.className = getResourceIconClass(resource.type);
    header.appendChild(icon);
    const type = document.createElement('h3');
    type.textContent = resource.type;
    header.appendChild(type);
    card.appendChild(header);

    const body = document.createElement('div');
    body.className = 'card-body';

    const location = document.createElement('p');
    location.textContent = `Loc: ${resource.location}`;
    body.appendChild(location);

    const quantityRow = document.createElement('div');
    quantityRow.className = 'quantity-row';

    const qtyMatch = resource.quantity.match(/^([\d\.]+)(\s*.*)$/);
    if (qtyMatch) {
        const minusBtn = document.createElement('button');
        minusBtn.className = 'qty-btn';
        minusBtn.textContent = '-';
        minusBtn.onclick = () => updateQuantity(index, -1);

        const qtyText = document.createElement('span');
        qtyText.className = 'quantity';
        qtyText.textContent = resource.quantity;

        const plusBtn = document.createElement('button');
        plusBtn.className = 'qty-btn';
        plusBtn.textContent = '+';
        plusBtn.onclick = () => updateQuantity(index, 1);

        quantityRow.appendChild(minusBtn);
        quantityRow.appendChild(qtyText);
        quantityRow.appendChild(plusBtn);
    } else {
        const qtyText = document.createElement('span');
        qtyText.className = 'quantity';
        qtyText.textContent = resource.quantity;
        quantityRow.appendChild(qtyText);
    }
    body.appendChild(quantityRow);

    const status = document.createElement('span');
    status.className = `status-badge status-${resource.status.toLowerCase()}`;
    status.textContent = resource.status;
    body.appendChild(status);

    card.appendChild(body);
    return card;
}

// ==========================================================================
// LOGIC HANDLERS
// ==========================================================================

function updateQuantity(index, change) {
    const resource = appState.resources[index];
    const match = resource.quantity.match(/^([\d\.]+)(\s*.*)$/);

    if (!match) return;

    let currentVal = parseFloat(match[1]);
    let newVal = currentVal + change;
    newVal = Math.round(newVal * 100) / 100;

    if (newVal <= 0) {
        if (confirm("Remove this item?")) {
            appState.resources.splice(index, 1);
            saveState();
            renderDashboard(appState);
            calculateStats(appState);
            return;
        } else {
            newVal = 0;
        }
    }

    resource.quantity = newVal + match[2];
    saveState();
    renderDashboard(appState);
    calculateStats(appState); // Re-calc stats on qty change too
}

function formatDate(timestamp) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(timestamp));
}

function openResourceModal(id) {
    const modal = document.getElementById('edit-modal');
    if (!modal) return;

    if (id) {
        editingResourceId = id;
        const resource = appState.resources.find(r => r.id === id);
        if (resource) {
            document.getElementById('resource-modal-title').textContent = "Edit Resource";
            document.getElementById('btn-save-resource').textContent = "Update";
            document.getElementById('input-type').value = resource.type;
            document.getElementById('input-location').value = resource.location;
            document.getElementById('input-quantity').value = resource.quantity;
            document.getElementById('input-status').value = resource.status;
        }
    } else {
        editingResourceId = null;
        document.getElementById('resource-modal-title').textContent = "Add Resource";
        document.getElementById('btn-save-resource').textContent = "Save Change";
        document.getElementById('resource-form').reset();
    }
    modal.showModal();
}

function openPersonModal(id) {
    const modal = document.getElementById('person-modal');
    if (!modal) return;

    if (id) {
        editingPersonId = id;
        const person = appState.people.find(p => p.id === id);
        if (person) {
            document.getElementById('person-modal-title').textContent = "Edit Resident";
            document.getElementById('btn-save-person').textContent = "Update";
            document.getElementById('person-name').value = person.name;
            document.getElementById('person-age').value = person.age;
            document.getElementById('person-gender').value = person.gender;
            document.getElementById('person-skill').value = person.skill;
            document.getElementById('person-health').value = person.health;
            document.getElementById('person-contact').value = person.contact;
        }
    } else {
        editingPersonId = null;
        document.getElementById('person-modal-title').textContent = "Add Resident";
        document.getElementById('btn-save-person').textContent = "Save Resident";
        document.getElementById('person-form').reset();
    }
    modal.showModal();
}

function deletePerson(index) {
    if (confirm("Remove this resident from the census?")) {
        appState.people.splice(index, 1);
        saveState();
        renderCensus(appState);
        calculateStats(appState);
    }
}

// ==========================================================================
// SETUP CONTROLS (Safe Event Listeners)
// ==========================================================================

function setupGovernanceControls() {
    const settingsBtn = document.getElementById('settings-trigger');
    const govModal = document.getElementById('governance-modal');
    const govForm = document.getElementById('governance-form');
    const cancelGovBtn = document.getElementById('btn-cancel-gov');

    if (settingsBtn && govModal) {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Pre-fill
            if (appState.communityInfo) {
                document.getElementById('gov-name').value = appState.communityInfo.name;
                document.getElementById('gov-captain').value = appState.communityInfo.captain;
                document.getElementById('gov-location').value = appState.communityInfo.location;
            }
            govModal.showModal();
        });
    }

    if (govModal && cancelGovBtn) {
        cancelGovBtn.addEventListener('click', () => govModal.close());
        govModal.addEventListener('click', (e) => {
            if (e.target === govModal) govModal.close();
        });
    }

    if (govForm) {
        govForm.addEventListener('submit', (e) => {
            e.preventDefault();
            appState.communityInfo = {
                name: document.getElementById('gov-name').value,
                captain: document.getElementById('gov-captain').value,
                location: document.getElementById('gov-location').value
            };
            saveState();
            updateBrand();
            govModal.close();
        });
    }
}

function setupResourceControls() {
    const fab = document.getElementById('admin-toggle');
    const modal = document.getElementById('edit-modal');
    const form = document.getElementById('resource-form');
    const cancelBtn = document.getElementById('btn-cancel');

    if (fab) fab.addEventListener('click', () => openResourceModal(null));

    if (modal && cancelBtn) {
        cancelBtn.addEventListener('click', () => modal.close());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.close();
        });
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const type = document.getElementById('input-type').value;
            const location = document.getElementById('input-location').value;
            const quantity = document.getElementById('input-quantity').value;
            const status = document.getElementById('input-status').value;

            if (editingResourceId) {
                const resource = appState.resources.find(r => r.id === editingResourceId);
                if (resource) {
                    resource.type = type;
                    resource.location = location;
                    resource.quantity = quantity;
                    resource.status = status;
                }
            } else {
                const newResource = {
                    id: Date.now().toString(),
                    type: type,
                    location: location,
                    quantity: quantity,
                    status: status
                };
                if (!appState.resources) appState.resources = [];
                appState.resources.push(newResource);
            }

            saveState();
            renderDashboard(appState);
            calculateStats(appState);

            form.reset();
            modal.close();
            editingResourceId = null;
        });
    }
}

function setupPersonControls() {
    const fab = document.getElementById('add-person-btn');
    const modal = document.getElementById('person-modal');
    const form = document.getElementById('person-form');
    const cancelBtn = document.getElementById('btn-cancel-person');

    if (fab) fab.addEventListener('click', () => openPersonModal(null));

    if (modal && cancelBtn) {
        cancelBtn.addEventListener('click', () => modal.close());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.close();
        });
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('person-name').value;
            const age = document.getElementById('person-age').value;
            const gender = document.getElementById('person-gender').value;
            const skill = document.getElementById('person-skill').value;
            const health = document.getElementById('person-health').value;
            const contact = document.getElementById('person-contact').value;

            if (editingPersonId) {
                const person = appState.people.find(p => p.id === editingPersonId);
                if (person) {
                    person.name = name;
                    person.age = age;
                    person.gender = gender;
                    person.skill = skill;
                    person.health = health;
                    person.contact = contact;
                }
            } else {
                const newPerson = {
                    id: Date.now().toString(),
                    name: name,
                    age: age,
                    gender: gender,
                    skill: skill,
                    health: health,
                    contact: contact
                };
                if (!appState.people) appState.people = [];
                appState.people.push(newPerson);
            }

            saveState();
            renderCensus(appState);
            calculateStats(appState);

            form.reset();
            modal.close();
            editingPersonId = null;
        });
    }
}

function setupAlertControls() {
    const addAlertBtn = document.getElementById('add-alert-btn');
    const alertModal = document.getElementById('alert-modal');
    const alertForm = document.getElementById('alert-form');
    const cancelAlertBtn = document.getElementById('btn-cancel-alert');

    if (addAlertBtn) addAlertBtn.addEventListener('click', () => alertModal.showModal());

    if (alertModal && cancelAlertBtn) {
        cancelAlertBtn.addEventListener('click', () => alertModal.close());
        alertModal.addEventListener('click', (e) => {
            if (e.target === alertModal) alertModal.close();
        });
    }

    if (alertForm) {
        alertForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newAlert = {
                id: Date.now().toString(),
                message: document.getElementById('alert-message').value,
                severity: document.getElementById('alert-severity').value,
                timestamp: Date.now()
            };

            if (!appState.alerts) appState.alerts = [];
            appState.alerts.unshift(newAlert);

            saveState();
            renderDashboard(appState);

            alertForm.reset();
            alertModal.close();
        });
    }
}

function setupSystemControls() {
    const btnExport = document.getElementById('btn-export');
    const btnImportTrigger = document.getElementById('btn-import-trigger');
    const fileImport = document.getElementById('file-import');

    if (btnExport) btnExport.addEventListener('click', exportData);
    if (btnImportTrigger) btnImportTrigger.addEventListener('click', () => fileImport.click());

    if (fileImport) {
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
