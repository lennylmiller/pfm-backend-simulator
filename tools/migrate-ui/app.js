/**
 * PFM Backend Simulator - Migration Tool Frontend
 * Handles UI interactions and manages the data import process
 */

class MigrationApp {
  constructor() {
    this.config = {};
    this.selectedEntities = [];

    // Get DOM elements
    this.configCard = document.getElementById('config-card');
    this.selectionCard = document.getElementById('selection-card');
    this.configForm = document.getElementById('config-form');
    this.testConnectionBtn = document.getElementById('test-connection-btn');
    this.continueBtn = document.getElementById('continue-btn');
    this.backBtn = document.getElementById('back-btn');
    this.startImportBtn = document.getElementById('start-import-btn');
    this.connectionStatus = document.getElementById('connection-status');
    this.progressDialog = document.getElementById('progress-dialog');
    this.progressList = document.getElementById('progress-list');
    this.completionMessage = document.getElementById('completion-message');
    this.errorMessage = document.getElementById('error-message');
    this.closeDialogBtn = document.getElementById('close-dialog-btn');

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.testConnectionBtn.addEventListener('click', () => this.testConnection());
    this.continueBtn.addEventListener('click', () => this.showDataSelection());
    this.backBtn.addEventListener('click', () => this.showConfiguration());
    this.startImportBtn.addEventListener('click', () => this.startImport());
    this.closeDialogBtn.addEventListener('click', () => this.closeDialog());
  }

  getFormData() {
    return {
      apiKey: this.configForm.querySelector('[name="apiKey"]').value,
      partnerDomain: this.configForm.querySelector('[name="partnerDomain"]').value,
      pcid: this.configForm.querySelector('[name="pcid"]').value,
      partnerId: this.configForm.querySelector('[name="partnerId"]').value
    };
  }

  getSelectedEntities() {
    const checkboxes = document.querySelectorAll('.entity-list wa-checkbox');
    const selected = {};

    checkboxes.forEach(checkbox => {
      selected[checkbox.name] = checkbox.checked;
    });

    return selected;
  }

  showStatus(message, type = 'success') {
    this.connectionStatus.style.display = 'block';
    this.connectionStatus.className = `status-message ${type}`;

    const icon = type === 'success' ? 'check-circle' : 'x-circle';
    this.connectionStatus.innerHTML = `
      <wa-icon name="${icon}"></wa-icon>
      <span>${message}</span>
    `;
  }

  async testConnection() {
    this.config = this.getFormData();

    if (!this.config.apiKey || !this.config.partnerDomain || !this.config.pcid) {
      this.showStatus('Please fill in all required fields', 'error');
      return;
    }

    this.testConnectionBtn.loading = true;

    try {
      const response = await fetch('/api/migrate/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.config)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        this.showStatus(`Connected successfully! Found user: ${result.user?.email || result.user?.id}`, 'success');
        this.continueBtn.disabled = false;
      } else {
        this.showStatus(result.error || 'Connection failed', 'error');
        this.continueBtn.disabled = true;
      }
    } catch (error) {
      this.showStatus(`Connection error: ${error.message}`, 'error');
      this.continueBtn.disabled = true;
    } finally {
      this.testConnectionBtn.loading = false;
    }
  }

  showDataSelection() {
    this.configCard.style.display = 'none';
    this.selectionCard.style.display = 'block';
  }

  showConfiguration() {
    this.configCard.style.display = 'block';
    this.selectionCard.style.display = 'none';
  }

  async startImport() {
    this.selectedEntities = this.getSelectedEntities();

    // Check if at least one entity is selected
    const hasSelection = Object.values(this.selectedEntities).some(v => v);
    if (!hasSelection) {
      alert('Please select at least one entity to import');
      return;
    }

    // Open progress dialog
    this.progressDialog.open = true;
    this.closeDialogBtn.disabled = true;
    this.completionMessage.style.display = 'none';
    this.errorMessage.style.display = 'none';

    // Setup progress items
    this.setupProgressItems();

    // Start import via SSE
    try {
      await this.runImport();
    } catch (error) {
      this.showError(error.message);
    }
  }

  setupProgressItems() {
    const entityLabels = {
      user: 'Current User',
      accounts: 'Accounts',
      transactions: 'Transactions',
      budgets: 'Budgets',
      goals: 'Goals',
      alerts: 'Alerts',
      tags: 'Tags'
    };

    this.progressList.innerHTML = '';

    Object.entries(this.selectedEntities).forEach(([entity, selected]) => {
      if (!selected) return;

      const item = document.createElement('div');
      item.className = 'progress-item';
      item.dataset.entity = entity;
      item.innerHTML = `
        <div class="progress-item-header">
          <strong>${entityLabels[entity]}</strong>
          <div class="progress-item-status pending">
            <wa-icon name="clock"></wa-icon>
            <span>Pending...</span>
          </div>
        </div>
        <wa-progress-bar value="0"></wa-progress-bar>
      `;

      this.progressList.appendChild(item);
    });
  }

  async runImport() {
    const payload = {
      ...this.config,
      entities: this.selectedEntities
    };

    const response = await fetch('/api/migrate/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Import failed: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.substring(6));
          this.handleProgressUpdate(data);
        }
      }
    }
  }

  handleProgressUpdate(data) {
    if (data.error) {
      this.showError(data.error);
      return;
    }

    if (data.status === 'complete') {
      this.showComplete();
      return;
    }

    const item = this.progressList.querySelector(`[data-entity="${data.entity}"]`);
    if (!item) return;

    const statusEl = item.querySelector('.progress-item-status');
    const progressBar = item.querySelector('wa-progress-bar');
    const statusText = statusEl.querySelector('span');
    const statusIcon = statusEl.querySelector('wa-icon');

    if (data.status === 'fetching') {
      statusEl.className = 'progress-item-status fetching';
      statusIcon.name = 'download';
      statusText.textContent = 'Fetching...';
      progressBar.value = 10;
    } else if (data.status === 'inserting') {
      statusEl.className = 'progress-item-status fetching';
      statusIcon.name = 'database';
      statusText.textContent = 'Inserting...';

      if (data.progress && data.total) {
        const percent = Math.round((data.progress / data.total) * 100);
        progressBar.value = percent;
        statusText.textContent = `${data.progress}/${data.total}`;
      } else {
        progressBar.value = 50;
      }
    } else if (data.status === 'entity_complete') {
      statusEl.className = 'progress-item-status complete';
      statusIcon.name = 'check-circle';
      statusText.textContent = data.message || 'Complete';
      progressBar.value = 100;
    } else if (data.status === 'entity_error') {
      statusEl.className = 'progress-item-status error';
      statusIcon.name = 'x-circle';
      statusText.textContent = data.message || 'Error';
    }
  }

  showComplete() {
    this.completionMessage.style.display = 'block';
    this.progressList.style.display = 'none';
    this.closeDialogBtn.disabled = false;
    document.querySelector('.progress-header wa-spinner').style.display = 'none';
  }

  showError(message) {
    this.errorMessage.style.display = 'block';
    this.errorMessage.textContent = `Error: ${message}`;
    this.closeDialogBtn.disabled = false;
    document.querySelector('.progress-header wa-spinner').style.display = 'none';
  }

  closeDialog() {
    this.progressDialog.open = false;
    // Reset to config screen
    this.showConfiguration();
    this.continueBtn.disabled = true;
    this.connectionStatus.style.display = 'none';
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new MigrationApp();
});
