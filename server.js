const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const { createServer } = require('http');
const socketIo = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 配置文件目录路径
const FILES_DIRECTORY = path.join(__dirname, 'files');

// 确保文件目录存在
if (!fs.existsSync(FILES_DIRECTORY)) {
    fs.mkdirSync(FILES_DIRECTORY, { recursive: true });
}

// 文件相关API
app.get('/api/files', (req, res) => {
    try {
        const files = [];
        const items = fs.readdirSync(FILES_DIRECTORY);
        
        items.forEach(item => {
            const itemPath = path.join(FILES_DIRECTORY, item);
            const stats = fs.statSync(itemPath);
            
            if (stats.isFile()) {
                const fileSize = stats.size;
                const fileExtension = path.extname(item).toLowerCase();
                const mimeType = mime.lookup(item) || 'application/octet-stream';
                
                files.push({
                    name: item,
                    size: fileSize,
                    sizeFormatted: formatFileSize(fileSize),
                    extension: fileExtension,
                    mimeType: mimeType,
                    downloadUrl: `/api/download/${encodeURIComponent(item)}`,
                    lastModified: stats.mtime
                });
            }
        });
        
        files.sort((a, b) => a.name.localeCompare(b.name));
        
        res.json({
            success: true,
            files: files,
            totalFiles: files.length
        });
    } catch (error) {
        console.error('获取文件列表错误:', error);
        res.status(500).json({
            success: false,
            error: '获取文件列表失败'
        });
    }
});

app.get('/api/download/:filename', (req, res) => {
    try {
        const filename = decodeURIComponent(req.params.filename);
        const filePath = path.join(FILES_DIRECTORY, filename);
        
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(path.resolve(FILES_DIRECTORY))) {
            return res.status(403).json({
                success: false,
                error: '访问被拒绝'
            });
        }
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: '文件不存在'
            });
        }
        
        const stats = fs.statSync(filePath);
        if (!stats.isFile()) {
            return res.status(400).json({
                success: false,
                error: '不是有效的文件'
            });
        }
        
        const mimeType = mime.lookup(filename) || 'application/octet-stream';
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.setHeader('Content-Length', stats.size);
        
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
    } catch (error) {
        console.error('文件下载错误:', error);
        res.status(500).json({
            success: false,
            error: '文件下载失败'
        });
    }
});

// 获取文件信息的API
app.get('/api/file-info/:filename', (req, res) => {
    try {
        const filename = decodeURIComponent(req.params.filename);
        const filePath = path.join(FILES_DIRECTORY, filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: '文件不存在'
            });
        }
        
        const stats = fs.statSync(filePath);
        const mimeType = mime.lookup(filename) || 'application/octet-stream';
        
        res.json({
            success: true,
            file: {
                name: filename,
                size: stats.size,
                sizeFormatted: formatFileSize(stats.size),
                extension: path.extname(filename).toLowerCase(),
                mimeType: mimeType,
                lastModified: stats.mtime,
                downloadUrl: `/api/download/${encodeURIComponent(filename)}`
            }
        });
    } catch (error) {
        console.error('获取文件信息错误:', error);
        res.status(500).json({
            success: false,
            error: '获取文件信息失败'
        });
    }
});

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const clients = new Set();

io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);
    clients.add(socket.id);

    // 广播加密消息给所有用户
    socket.on('send-encrypted-message', (encryptedMessage) => {
        clients.forEach(clientId => {

            if(clientId !== socket.id){
                io.to(clientId).emit('receive-encrypted-message', {
                    senderId: socket.id,
                    encryptedMessage
                });
            }
            
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        clients.delete(socket.id);
    });
});

// 启动服务器
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 文件下载服务已启动`);
    console.log(`📁 文件目录: ${FILES_DIRECTORY}`);
    console.log(`🌐 本地访问: http://localhost:${PORT}`);
    console.log(`🌐 外部访问: http://0.0.0.0:${PORT}`);
    console.log(`📋 API文档: http://localhost:${PORT}/api/files`);
    console.log(`�� 加密聊天功能已启用`);
}); 