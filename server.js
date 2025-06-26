const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3001;

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;
    
    // Default to index.html for root
    if (pathname === '/') {
        pathname = '/index.html';
    }
    
    const filePath = path.join(__dirname, pathname);
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'text/plain';
    
    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // File not found - serve 404 page
            console.log(`404 - File not found: ${pathname}`);
            serve404(res);
            return;
        }
        
        // Read and serve the file
        fs.readFile(filePath, (err, data) => {
            if (err) {
                // Server error - serve 500 page
                console.log(`500 - Server error: ${err.message}`);
                serve500(res);
                return;
            }
            
            // Set appropriate headers
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block'
            });
            
            res.end(data);
        });
    });
});

function serve404(res) {
    fs.readFile(path.join(__dirname, '404.html'), (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 - Page Not Found');
            return;
        }
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(data);
    });
}

function serve500(res) {
    fs.readFile(path.join(__dirname, '500.html'), (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('500 - Internal Server Error');
            return;
        }
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(data);
    });
}

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('Testing URLs:');
    console.log(`- Main app: http://localhost:${PORT}/`);
    console.log(`- 404 page: http://localhost:${PORT}/404.html`);
    console.log(`- 500 page: http://localhost:${PORT}/500.html`);
    console.log(`- Test 404: http://localhost:${PORT}/nonexistent-page`);
});
