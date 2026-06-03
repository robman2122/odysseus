/**
 * Credentials management module.
 * Handles CRUD operations for the secure password vault.
 */

import Storage from './storage.js';

export const credentials = {
    modal: null,
    list: null,
    nameInput: null,
    valueInput: null,
    descInput: null,
    addContainer: null,
    addBtn: null,
    saveBtn: null,
    cancelBtn: null,

    init() {
        this.modal = document.getElementById('secrets-modal');
        this.list = document.getElementById('secrets-list');
        this.nameInput = document.getElementById('secret-name-input');
        this.valueInput = document.getElementById('secret-value-input');
        this.descInput = document.getElementById('secret-desc-input');
        this.addContainer = document.getElementById('secret-value-container');
        this.addBtn = document.getElementById('add-secret-btn');
        this.saveBtn = document.getElementById('save-secret-btn');
        this.cancelBtn = document.getElementById('cancel-secret-btn');

        // Sidebar / Rail buttons
        const sidebarBtn = document.getElementById('tool-secrets-btn');
        if (sidebarBtn) sidebarBtn.onclick = () => this.open();
        
        const railBtn = document.getElementById('rail-secrets');
        if (railBtn) railBtn.onclick = () => this.open();

        const closeBtn = document.getElementById('close-secrets-modal');
        if (closeBtn) closeBtn.onclick = () => this.close();

        // CRUD Event listeners
        this.addBtn.onclick = () => this.showAddForm();
        this.cancelBtn.onclick = () => this.hideAddForm();
        this.saveBtn.onclick = () => this.save();

        // Event delegation for list actions
        this.list.onclick = (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            
            const id = btn.dataset.id;
            if (!id) return;

            if (btn.classList.contains('action-edit')) {
                const name = btn.dataset.name;
                const desc = btn.dataset.desc;
                this.edit(id, name, desc);
            } else if (btn.classList.contains('action-delete')) {
                this.delete(id);
            }
        };

        // Close on backdrop click
        this.modal.onclick = (e) => {
            if (e.target === this.modal) this.close();
        };
    },

    open() {
        this.modal.classList.remove('hidden');
        this.load();
    },

    close() {
        this.modal.classList.add('hidden');
        this.hideAddForm();
    },

    showAddForm() {
        this.addContainer.classList.remove('hidden');
        this.addBtn.classList.add('hidden');
        this.valueInput.focus();
    },

    hideAddForm() {
        this.addContainer.classList.add('hidden');
        this.addBtn.classList.remove('hidden');
        this.nameInput.value = '';
        this.valueInput.value = '';
        this.descInput.value = '';
        delete this.saveBtn.dataset.editId;
        this.saveBtn.textContent = 'Save';
        this.valueInput.placeholder = 'Secret value (plaintext)';
    },

    async load() {
        try {
            const resp = await fetch('/api/credentials', {
                headers: { 'Authorization': `Bearer ${Storage.get('token')}` }
            });
            if (!resp.ok) throw new Error('Failed to load credentials');
            const data = await resp.json();
            this.render(data);
        } catch (err) {
            console.error(err);
            this.list.innerHTML = `<div style="opacity:0.5; font-size:12px; padding:20px; text-align:center;">${err.message}</div>`;
        }
    },

    render(creds) {
        if (!creds || creds.length === 0) {
            this.list.innerHTML = '<div style="opacity:0.3; font-size:12px; padding:20px; text-align:center;">No secrets stored yet.</div>';
            return;
        }

        const esc = (s) => (s || '').replace(/"/g, '&quot;');

        this.list.innerHTML = creds.map(c => `
            <div class="secret-item" style="display:flex; align-items:center; gap:12px; padding:10px; background:color-mix(in srgb, var(--fg) 3%, transparent); border:1px solid var(--border); border-radius:4px;">
                <div style="flex-grow:1; min-width:0;">
                    <div style="font-weight:600; font-size:13px; font-family:monospace; overflow:hidden; text-overflow:ellipsis;">${esc(c.name)}</div>
                    <div style="font-size:11px; opacity:0.5; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(c.description) || 'No description'}</div>
                </div>
                <div style="display:flex; gap:4px;">
                    <button class="btn-icon action-edit" data-id="${c.id}" data-name="${esc(c.name)}" data-desc="${esc(c.description)}" title="Edit">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon danger action-delete" data-id="${c.id}" title="Delete">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                    </button>
                </div>
            </div>
        `).join('');
    },

    async save() {
        const id = this.saveBtn.dataset.editId;
        const name = this.nameInput.value.trim();
        const value = this.valueInput.value;
        const description = this.descInput.value.trim();

        if (!name) return alert('Name is required');
        if (!id && !value) return alert('Value is required for new secrets');

        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `/api/credentials/${id}` : '/api/credentials';
            const body = { name, description };
            if (value) body.value = value;

            const resp = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Storage.get('token')}`
                },
                body: JSON.stringify(body)
            });

            if (!resp.ok) {
                const err = await resp.json();
                throw new Error(err.detail || 'Failed to save secret');
            }

            this.hideAddForm();
            this.load();
        } catch (err) {
            alert(err.message);
        }
    },

    edit(id, name, desc) {
        this.saveBtn.dataset.editId = id;
        this.nameInput.value = name;
        this.descInput.value = desc;
        this.valueInput.value = '';
        this.valueInput.placeholder = '(unchanged unless typed here)';
        this.saveBtn.textContent = 'Update';
        this.showAddForm();
    },

    async delete(id) {
        if (!confirm('Are you sure you want to delete this secret?')) return;
        try {
            const resp = await fetch(`/api/credentials/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${Storage.get('token')}` }
            });
            if (!resp.ok) throw new Error('Failed to delete secret');
            this.load();
        } catch (err) {
            alert(err.message);
        }
    }
};

window._odysseusCredentials = credentials;
