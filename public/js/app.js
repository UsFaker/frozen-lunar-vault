// Check Auth
const token = sessionStorage.getItem('vault_token');
const vaultKeyRaw = sessionStorage.getItem('vault_key');

if (!token || !vaultKeyRaw) {
    window.location.href = '/index.html';
}

// Global State
let aesKey = null;
let currentCategory = 'account';
let allEntries = [];
let currentEditingId = null;

// Initialize App
async function initApp() {
    try {
        aesKey = await CryptoUtil.deriveKey(vaultKeyRaw);
        setupEventListeners();
        await fetchEntries();
    } catch (err) {
        console.error("Init error", err);
        showToast("初始化加密系统失败，请重新登录", true);
        setTimeout(() => window.location.href = '/index.html', 2000);
    }
}

// Setup Listeners
function setupEventListeners() {
    // Tabs
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            currentCategory = link.dataset.tab;
            document.getElementById('page-title').innerText = link.innerText.slice(2); // Remove emoji
            renderEntries();
        });
    });

    // Lock
    document.getElementById('lock-btn').addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = '/index.html';
    });

    // Modal
    const modal = document.getElementById('entry-modal');
    document.getElementById('add-fab').addEventListener('click', () => {
        openModal();
    });
    document.getElementById('close-modal').addEventListener('click', () => {
        modal.classList.remove('active');
    });

    // Form Submit
    document.getElementById('entry-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveEntry();
    });

    // Delete
    document.getElementById('delete-btn').addEventListener('click', async () => {
        if(confirm("确定要删除这条记录吗？") && currentEditingId) {
            await deleteEntry(currentEditingId);
        }
    });

    // Search
    document.getElementById('search-input').addEventListener('input', () => renderEntries());

    // Auto Lock on inactivity (5 mins)
    let inactivityTime = () => {
        let time;
        window.onload = resetTimer;
        document.onmousemove = resetTimer;
        document.onkeydown = resetTimer;
        function resetTimer() {
            clearTimeout(time);
            time = setTimeout(() => {
                sessionStorage.clear();
                window.location.href = '/index.html';
            }, 5 * 60 * 1000);
        }
    };
    inactivityTime();
}

// Form Templates based on category
const formTemplates = {
    account: `
        <div class="form-group"><label>网站/应用名称</label><input type="text" id="field-title" required></div>
        <div class="form-group"><label>网址 (可选)</label><input type="url" id="field-url"></div>
        <div class="form-group"><label>账号</label><input type="text" id="field-username" required></div>
        <div class="form-group"><label>密码</label><input type="text" id="field-password" required></div>
        <div class="form-group"><label>备注 (可选)</label><textarea id="field-notes"></textarea></div>
    `,
    note: `
        <div class="form-group"><label>标题</label><input type="text" id="field-title" required></div>
        <div class="form-group"><label>内容</label><textarea id="field-content" style="min-height:200px" required></textarea></div>
    `,
    record: `
        <div class="form-group"><label>记录名称</label><input type="text" id="field-title" required></div>
        <div class="form-group"><label>详情</label><textarea id="field-content" style="min-height:150px" required></textarea></div>
    `,
    tech: `
        <div class="form-group"><label>主题/服务器</label><input type="text" id="field-title" required></div>
        <div class="form-group"><label>语言/标签</label><input type="text" id="field-lang"></div>
        <div class="form-group"><label>代码/配置内容</label><textarea id="field-code" style="font-family:monospace; min-height:200px" required></textarea></div>
    `
};

function openModal(entryData = null, id = null) {
    currentEditingId = id;
    document.getElementById('modal-title').innerText = id ? "编辑记录" : "新增记录";
    
    // Set form fields based on category
    // If editing, use the entry's category, else use current selected tab
    const cat = entryData ? entryData.category : currentCategory;
    document.getElementById('dynamic-fields').innerHTML = formTemplates[cat];
    
    // Toggle delete button
    document.getElementById('delete-btn').style.display = id ? 'block' : 'none';

    // Populate data if editing
    if (entryData) {
        Object.keys(entryData).forEach(key => {
            const el = document.getElementById(`field-${key}`);
            if (el) el.value = entryData[key];
        });
    }

    document.getElementById('entry-modal').classList.add('active');
}

// API wrappers
async function fetchWithAuth(url, options = {}) {
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };
    const res = await fetch(url, options);
    if (res.status === 401) {
        sessionStorage.clear();
        window.location.href = '/index.html';
    }
    return res;
}

// Data Operations
async function fetchEntries() {
    try {
        const res = await fetchWithAuth('/api/entries');
        const rawEntries = await res.json();
        
        allEntries = rawEntries; // Only contains id, category, created_at, updated_at
        renderEntries();
    } catch (e) {
        console.error(e);
        showToast("读取数据失败");
    }
}

async function fetchFullEntry(id) {
    const res = await fetchWithAuth(`/api/entries/${id}`);
    const data = await res.json();
    
    // Decrypt
    try {
        const jsonStr = await CryptoUtil.decrypt(data.encrypted_data, data.iv, aesKey);
        const parsed = JSON.parse(jsonStr);
        return { ...data, ...parsed }; // Merge metadata and decrypted content
    } catch(e) {
        console.error(e);
        showToast("解密失败");
        return null;
    }
}

async function saveEntry() {
    // Gather data from form dynamically
    const fields = document.querySelectorAll('#entry-form [id^="field-"]');
    const dataObj = {};
    fields.forEach(f => {
        const key = f.id.replace('field-', '');
        dataObj[key] = f.value;
    });

    const category = currentEditingId ? 
        allEntries.find(e => e.id === currentEditingId).category : currentCategory;

    // Encrypt
    const jsonStr = JSON.stringify({ category, ...dataObj });
    const { ciphertext, iv } = await CryptoUtil.encrypt(jsonStr, aesKey);

    const payload = { category, encrypted_data: ciphertext, iv };

    try {
        let res;
        if (currentEditingId) {
            res = await fetchWithAuth(`/api/entries/${currentEditingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetchWithAuth('/api/entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        
        if (res.ok) {
            showToast("保存成功");
            document.getElementById('entry-modal').classList.remove('active');
            await fetchEntries();
        } else {
            showToast("保存失败");
        }
    } catch(e) {
        console.error(e);
        showToast("网络错误");
    }
}

async function deleteEntry(id) {
    try {
        const res = await fetchWithAuth(`/api/entries/${id}`, { method: 'DELETE' });
        if(res.ok) {
            showToast("删除成功");
            document.getElementById('entry-modal').classList.remove('active');
            await fetchEntries();
        }
    } catch(e) {
        console.error(e);
        showToast("删除失败");
    }
}

// Rendering
function renderEntries() {
    const grid = document.getElementById('entries-grid');
    grid.innerHTML = '';

    const searchTerm = document.getElementById('search-input').value.toLowerCase();

    // Filter by type
    let filtered = allEntries.filter(e => e.category === currentCategory);

    // Note: since payload is encrypted, we can't search text on server or in allEntries directly easily unless we decrypt everything first.
    // For a real production app with many entries, we shouldn't decrypt ALL on load.
    // However, given it's a personal vault (small scale), we could.
    // For now, let's keep it simple: no text search if encrypted, or we just render placeholders.
    // Wait, let's fetch and decrypt dynamically when clicking? 
    // Actually, to display titles in the grid, we need to decrypt them!
    // So we should decrypt all of current category.

    renderDecryptedGrid(filtered, searchTerm);
}

// Decrypt all entries for the current view
async function renderDecryptedGrid(entries, searchTerm) {
    const grid = document.getElementById('entries-grid');
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted)">正在解密...</div>';

    const decryptedList = [];
    for (const e of entries) {
        const full = await fetchFullEntry(e.id);
        if(full) decryptedList.push(full);
    }

    grid.innerHTML = '';
    
    // Filter by search
    const results = decryptedList.filter(d => 
        (d.title && d.title.toLowerCase().includes(searchTerm)) ||
        (d.username && d.username.toLowerCase().includes(searchTerm))
    );

    if (results.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted)">📝 没有找到记录</div>';
        return;
    }

    results.forEach(d => {
        const card = document.createElement('div');
        card.className = 'entry-card';
        // Date formatting
        const dateStr = new Date(d.updated_at).toLocaleDateString('zh-CN', {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'});
        
        let contentPreview = '';
        if(d.category === 'account') contentPreview = `账号: ${d.username}`;
        else if (d.category === 'tech') contentPreview = `标签: ${d.lang || '无'}`;
        
        card.innerHTML = `
            <div class="card-title">${escapeHTML(d.title || '无标题')}</div>
            <div class="card-date">🕒 ${dateStr}</div>
            <div style="font-size:0.9rem; color:var(--text-muted)">${escapeHTML(contentPreview)}</div>
        `;

        card.addEventListener('click', () => {
            openModal(d, d.id);
        });

        grid.appendChild(card);
    });
}

function showToast(msg, isError = false) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    if(isError) t.style.background = 'var(--danger)';
    else t.style.background = 'var(--primary)';
    
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

initApp();
