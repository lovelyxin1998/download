// 全局变量
let allFiles = [];
let filteredFiles = [];
let currentFilter = 'all';

// 获取当前域名，确保API调用正确
const currentOrigin = window.location.origin;

// DOM 元素
const filesList = document.getElementById('filesList');
const loadingSpinner = document.getElementById('loadingSpinner');
const noFiles = document.getElementById('noFiles');
const fileCount = document.getElementById('fileCount');
const lastUpdate = document.getElementById('lastUpdate');
const refreshBtn = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const fileModal = document.getElementById('fileModal');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadFiles();
    setupEventListeners();
});

// 设置事件监听器
function setupEventListeners() {
    refreshBtn.addEventListener('click', loadFiles);
    searchInput.addEventListener('input', handleSearch);
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            setActiveFilter(filter);
            filterFiles();
        });
    });
    
    // 点击模态框外部关闭
    fileModal.addEventListener('click', (e) => {
        if (e.target === fileModal) {
            closeModal();
        }
    });
}

// 加载文件列表
async function loadFiles() {
    try {
        showLoading(true);
        
        const response = await fetch(`${currentOrigin}/api/files`);
        const data = await response.json();
        
        if (data.success) {
            allFiles = data.files;
            filteredFiles = [...allFiles];
            
            updateFileCount(allFiles.length);
            updateLastUpdate();
            renderFiles();
        } else {
            showError('获取文件列表失败');
        }
    } catch (error) {
        console.error('加载文件错误:', error);
        showError('网络错误，请检查服务器连接');
    } finally {
        showLoading(false);
    }
}

// 渲染文件列表
function renderFiles() {
    if (filteredFiles.length === 0) {
        showNoFiles();
        return;
    }
    
    filesList.innerHTML = filteredFiles.map(file => createFileCard(file)).join('');
    
    // 为每个文件卡片添加事件监听器
    document.querySelectorAll('.file-card').forEach((card, index) => {
        const file = filteredFiles[index];
        
        // 点击卡片显示详情
        card.addEventListener('click', () => {
            showFileDetails(file);
        });
        
        // 下载按钮事件
        const downloadBtn = card.querySelector('.download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                downloadFile(file);
            });
        }
        
        // 详情按钮事件
        const detailsBtn = card.querySelector('.details-btn');
        if (detailsBtn) {
            detailsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showFileDetails(file);
            });
        }
    });
}

// 创建文件卡片HTML
function createFileCard(file) {
    const iconClass = getFileIconClass(file.extension);
    const modifiedDate = new Date(file.lastModified).toLocaleString('zh-CN');
    
    return `
        <div class="file-card" data-filename="${file.name}">
            <div class="file-header">
                <div class="file-icon ${iconClass}">
                    <i class="${getFileIcon(file.extension)}"></i>
                </div>
                <div class="file-info">
                    <h3>${escapeHtml(file.name)}</h3>
                    <p>${file.sizeFormatted}</p>
                </div>
            </div>
            <div class="file-details">
                <span>${file.extension.toUpperCase()}</span>
                <span>${modifiedDate}</span>
            </div>
            <div class="file-actions">
                <button class="btn btn-secondary details-btn">
                    <i class="fas fa-info-circle"></i>
                    详情
                </button>
                <button class="btn btn-primary download-btn">
                    <i class="fas fa-download"></i>
                    下载
                </button>
            </div>
        </div>
    `;
}

// 获取文件图标类
function getFileIconClass(extension) {
    const iconMap = {
        '.apk': 'apk',
        '.zip': 'zip',
        '.rar': 'zip',
        '.7z': 'zip',
        '.pdf': 'pdf',
        '.doc': 'doc',
        '.docx': 'doc',
        '.xls': 'doc',
        '.xlsx': 'doc',
        '.ppt': 'doc',
        '.pptx': 'doc',
        '.txt': 'doc',
        '.mp4': 'mp4',
        '.avi': 'mp4',
        '.mov': 'mp4',
        '.mkv': 'mp4',
        '.jpg': 'mp4',
        '.jpeg': 'mp4',
        '.png': 'mp4',
        '.gif': 'mp4'
    };
    
    return iconMap[extension] || 'default';
}

// 获取文件图标
function getFileIcon(extension) {
    const iconMap = {
        '.apk': 'fab fa-android',
        '.zip': 'fas fa-file-archive',
        '.rar': 'fas fa-file-archive',
        '.7z': 'fas fa-file-archive',
        '.pdf': 'fas fa-file-pdf',
        '.doc': 'fas fa-file-word',
        '.docx': 'fas fa-file-word',
        '.xls': 'fas fa-file-excel',
        '.xlsx': 'fas fa-file-excel',
        '.ppt': 'fas fa-file-powerpoint',
        '.pptx': 'fas fa-file-powerpoint',
        '.txt': 'fas fa-file-alt',
        '.mp4': 'fas fa-file-video',
        '.avi': 'fas fa-file-video',
        '.mov': 'fas fa-file-video',
        '.mkv': 'fas fa-file-video',
        '.jpg': 'fas fa-file-image',
        '.jpeg': 'fas fa-file-image',
        '.png': 'fas fa-file-image',
        '.gif': 'fas fa-file-image'
    };
    
    return iconMap[extension] || 'fas fa-file';
}

// 处理搜索
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    filterFiles(searchTerm);
}

// 设置活动过滤器
function setActiveFilter(filter) {
    currentFilter = filter;
    
    filterBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
}

// 过滤文件
function filterFiles(searchTerm = '') {
    filteredFiles = allFiles.filter(file => {
        // 搜索过滤
        const matchesSearch = searchTerm === '' || 
            file.name.toLowerCase().includes(searchTerm) ||
            file.extension.toLowerCase().includes(searchTerm);
        
        // 类型过滤
        const matchesFilter = currentFilter === 'all' || 
            file.extension === currentFilter ||
            (currentFilter === '.doc' && ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'].includes(file.extension)) ||
            (currentFilter === '.mp4' && ['.mp4', '.avi', '.mov', '.mkv', '.jpg', '.jpeg', '.png', '.gif'].includes(file.extension));
        
        return matchesSearch && matchesFilter;
    });
    
    renderFiles();
}

// 显示文件详情
async function showFileDetails(file) {
    try {
        const response = await fetch(`${currentOrigin}/api/file-info/${encodeURIComponent(file.name)}`);
        const data = await response.json();
        
        if (data.success) {
            const fileInfo = data.file;
            const modifiedDate = new Date(fileInfo.lastModified).toLocaleString('zh-CN');
            const baseUrl = window.location.origin;
            
            // 填充模态框内容
            document.getElementById('modalFileName').textContent = fileInfo.name;
            document.getElementById('modalName').textContent = fileInfo.name;
            document.getElementById('modalSize').textContent = fileInfo.sizeFormatted;
            document.getElementById('modalType').textContent = fileInfo.mimeType;
            document.getElementById('modalModified').textContent = modifiedDate;
            // 确保下载链接使用完整URL
            const fullDownloadUrl = fileInfo.downloadUrl.startsWith('http') ? fileInfo.downloadUrl : `${currentOrigin}${fileInfo.downloadUrl}`;
            document.getElementById('modalDownloadUrl').value = fullDownloadUrl;
            
            // 设置下载按钮事件
            const modalDownloadBtn = document.getElementById('modalDownloadBtn');
            modalDownloadBtn.onclick = () => downloadFile(fileInfo);
            
            // 显示模态框
            fileModal.style.display = 'block';
        } else {
            showError('获取文件信息失败');
        }
    } catch (error) {
        console.error('获取文件信息错误:', error);
        showError('网络错误');
    }
}

// 关闭模态框
function closeModal() {
    fileModal.style.display = 'none';
}

// 复制下载链接
function copyDownloadUrl() {
    const urlInput = document.getElementById('modalDownloadUrl');
    urlInput.select();
    urlInput.setSelectionRange(0, 99999);
    
    try {
        document.execCommand('copy');
        showToast('下载链接已复制到剪贴板');
    } catch (err) {
        // 使用现代API
        navigator.clipboard.writeText(urlInput.value).then(() => {
            showToast('下载链接已复制到剪贴板');
        }).catch(() => {
            showToast('复制失败，请手动复制');
        });
    }
}

// 下载文件
function downloadFile(file) {
    const link = document.createElement('a');
    // 确保下载链接使用完整URL
    const fullDownloadUrl = file.downloadUrl.startsWith('http') ? file.downloadUrl : `${currentOrigin}${file.downloadUrl}`;
    link.href = fullDownloadUrl;
    link.download = file.name;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`开始下载: ${file.name}`);
}

// 显示加载状态
function showLoading(show) {
    loadingSpinner.style.display = show ? 'flex' : 'none';
    filesList.style.display = show ? 'none' : 'grid';
    noFiles.style.display = 'none';
}

// 显示无文件状态
function showNoFiles() {
    filesList.style.display = 'none';
    loadingSpinner.style.display = 'none';
    noFiles.style.display = 'block';
}

// 更新文件数量
function updateFileCount(count) {
    fileCount.textContent = count;
}

// 更新最后更新时间
function updateLastUpdate() {
    const now = new Date();
    lastUpdate.textContent = now.toLocaleString('zh-CN');
}

// 显示错误信息
function showError(message) {
    showToast(message, 'error');
}

// 显示提示信息
function showToast(message, type = 'success') {
    // 创建提示元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // 添加样式
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#f56565' : '#48bb78'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 全局函数（供HTML调用）
window.closeModal = closeModal;
window.copyDownloadUrl = copyDownloadUrl; 