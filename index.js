const net = require('net');

const PORT = process.env.PORT || 8080;

const MAX_BODY_SIZE = 1024 * 1024;

let dataStore = [];

const server = net.createServer((socket) => {
    console.log('✨ Ek client connect hua!');

    socket.on('data', (buffer) => {
        const requestString = buffer.toString();
        
        if (!requestString || requestString.trim().length === 0) {
            sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Empty request received');
            return;
        }

        const lines = requestString.split('\r\n');

        if (lines.length === 0 || !lines[0]) {
            sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Invalid request format');
            return;
        }

        const requestLine = lines[0];
        const parts = requestLine.split(' ');
        
        if (parts.length < 3) {
            sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Invalid request line format');
            return;
        }
        
        const method = parts[0].toUpperCase();
        
        const path = parts[1];
        
        const httpVersion = parts[2];
        
        if (!httpVersion.startsWith('HTTP/')) {
            sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Invalid HTTP version');
            return;
        }
        
        console.log(`📩 ${method} ${path} - Request received`);

        let headers = {};
        let i = 1;
        
        while (i < lines.length && lines[i] !== '') {
            const headerLine = lines[i];
            
            const colonIndex = headerLine.indexOf(':');
            
            if (colonIndex !== -1) {
                const key = headerLine.substring(0, colonIndex).trim().toLowerCase();
                
                const value = headerLine.substring(colonIndex + 1).trim();
                
                headers[key] = value;
            }
            i++;
        }
        
        let body = '';
        
        if (i < lines.length - 1) {
            body = lines.slice(i + 1).join('\r\n');
        }

        const contentLength = headers['content-length'] ? parseInt(headers['content-length']) : 0;
        
        if (contentLength > MAX_BODY_SIZE) {
            sendResponse(socket, 413, 'Payload Too Large', 'text/plain', 
                `Request body too large. Maximum size: ${MAX_BODY_SIZE} bytes`);
            return;
        }
        
        const actualBodySize = Buffer.byteLength(body, 'utf8');
        if (contentLength > 0 && actualBodySize !== contentLength) {
            console.warn(`⚠️ Content-Length mismatch: Expected ${contentLength}, got ${actualBodySize}`);
        }

        try {
            if (method === 'OPTIONS') {
                sendResponse(socket, 200, 'OK', 'text/plain', '');
                return;
            }
            
            const pathParts = path.split('?');
            const cleanPath = pathParts[0];
            
            if (method === 'GET' && cleanPath === '/') {
            const reply = 'Welcome to your custom HTTP Server!';
            sendResponse(socket, 200, 'OK', 'text/plain', reply);
        }

            else if (method === 'GET' && cleanPath === '/echo') {
                const queryString = pathParts[1] || '';
                
                const query = new URLSearchParams(queryString);
                
            const msg = query.get('message') || 'Kuch toh bolo!';

            sendResponse(socket, 200, 'OK', 'text/plain', `Echo: ${msg}`);
        }

            else if (method === 'POST' && cleanPath === '/data') {
                try {
                    if (!body || body.trim().length === 0) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                            'Request body is required for POST');
                        return;
                    }
                    
                    const contentType = headers['content-type'] || '';
                    if (!contentType.includes('application/json')) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                            'Content-Type must be application/json');
                        return;
                    }
                    
                const data = JSON.parse(body);
                    
                    if (typeof data !== 'object' || data === null) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                            'Data must be a valid JSON object');
                        return;
                    }
                    
                    dataStore.push(data);
                    const newId = dataStore.length - 1;

                    const reply = JSON.stringify({ 
                        status: 'success', 
                        message: 'Data saved successfully!', 
                        id: newId,
                        data: data
                    }, null, 2);
                    
                    sendResponse(socket, 201, 'Created', 'application/json', reply);
                    
                } catch (error) {
                    if (error instanceof SyntaxError) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                            'Invalid JSON format: ' + error.message);
                    } else {
                        sendResponse(socket, 500, 'Internal Server Error', 'text/plain', 
                            'Server error: ' + error.message);
                    }
                }
            }

            else if (method === 'GET' && cleanPath === '/data') {
                const reply = JSON.stringify(dataStore, null, 2);
                sendResponse(socket, 200, 'OK', 'application/json', reply);
            }

            else if (method === 'GET' && cleanPath.startsWith('/data/')) {
                const pathSegments = cleanPath.split('/');
                
                if (pathSegments.length !== 3) {
                    sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                        'Invalid path format. Use /data/:id');
                    return;
                }
                
                const id = pathSegments[2];
                
                const index = parseInt(id);
                
                if (isNaN(index) || index < 0) {
                    sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                        'Invalid ID format. ID must be a non-negative number');
                    return;
                }

                if (index < dataStore.length && dataStore[index] !== undefined) {
                    const reply = JSON.stringify(dataStore[index], null, 2);
            sendResponse(socket, 200, 'OK', 'application/json', reply);
                } else {
                    sendResponse(socket, 404, 'Not Found', 'text/plain', 
                        `Item with ID ${index} not found`);
                }
            }

            else if (method === 'PUT' && cleanPath.startsWith('/data/')) {
                try {
                    const pathSegments = cleanPath.split('/');
                    
                    if (pathSegments.length !== 3) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                            'Invalid path format. Use /data/:id');
                        return;
                    }
                    
                    const id = pathSegments[2];
            const index = parseInt(id);

                    if (isNaN(index) || index < 0) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                            'Invalid ID format. ID must be a non-negative number');
                        return;
                    }
                    
                    if (!body || body.trim().length === 0) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                            'Request body is required for PUT');
                        return;
                    }
                    
                    if (index < dataStore.length && dataStore[index] !== undefined) {
                        const newData = JSON.parse(body);
                        
                        dataStore[index] = newData;
                        
                        const reply = JSON.stringify({ 
                            status: 'success', 
                            message: 'Data updated!', 
                            data: newData 
                        }, null, 2);
                sendResponse(socket, 200, 'OK', 'application/json', reply);
            } else {
                        sendResponse(socket, 404, 'Not Found', 'text/plain', 
                            `Item with ID ${index} not found for update`);
                    }
                } catch (error) {
                    if (error instanceof SyntaxError) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                            'Invalid JSON data: ' + error.message);
                    } else {
                        sendResponse(socket, 500, 'Internal Server Error', 'text/plain', 
                            'Server error: ' + error.message);
                    }
                }
            }
            
            else if (method === 'DELETE' && cleanPath.startsWith('/data/')) {
                try {
                    const pathSegments = cleanPath.split('/');
                    
                    if (pathSegments.length !== 3) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                            'Invalid path format. Use /data/:id');
                        return;
                    }
                    
                    const id = pathSegments[2];
                    const index = parseInt(id);
                    
                    if (isNaN(index) || index < 0) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                            'Invalid ID format. ID must be a non-negative number');
                        return;
                    }
                    
                    if (index < dataStore.length && dataStore[index] !== undefined) {
                        const deletedItem = dataStore.splice(index, 1)[0];
                        
                        const reply = JSON.stringify({ 
                            status: 'success', 
                            message: 'Data deleted!', 
                            deleted: deletedItem 
                        }, null, 2);
                        sendResponse(socket, 200, 'OK', 'application/json', reply);
                    } else {
                        sendResponse(socket, 404, 'Not Found', 'text/plain', 
                            `Item with ID ${index} not found for deletion`);
                    }
                } catch (error) {
                    sendResponse(socket, 500, 'Internal Server Error', 'text/plain', 
                        'Server error: ' + error.message);
                }
            }
            
        else {
            sendResponse(socket, 404, 'Not Found', 'text/plain', 'Page nahi mila');
            }
            
        } catch (error) {
            console.error('❌ Server Error:', error);
            sendResponse(socket, 500, 'Internal Server Error', 'text/plain', 
                'Server mein kuch galat ho gaya: ' + error.message);
        }
    });

    socket.on('end', () => {
        console.log('👋 Client disconnected');
    });
    
    socket.on('error', (error) => {
        console.error('❌ Socket Error:', error.message);
    });
});

function sendResponse(socket, statusCode, statusText, contentType, content, extraHeaders = []) {
    const safeContent = content || '';
    
    const contentLength = Buffer.byteLength(safeContent, 'utf8');
    
    const headers = [
        `HTTP/1.1 ${statusCode} ${statusText}`,
        `Date: ${new Date().toUTCString()}`,
        `Content-Type: ${contentType}`,
        `Content-Length: ${contentLength}`,
        'Connection: close',
        'Access-Control-Allow-Origin: *',
        'Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers: Content-Type',
    ];
    
    if (extraHeaders && extraHeaders.length > 0) {
        headers.push(...extraHeaders);
    }
    
    const response = [
        ...headers,
        '',
        safeContent
    ].join('\r\n');

    socket.write(response);
    socket.end();
}

server.listen(PORT, () => {
    console.log(`🚀 Server port ${PORT} pe sun raha hai`);
    console.log(`📡 Test karne ke liye: curl http://localhost:${PORT}/`);
    console.log(`💡 Server ko band karne ke liye: Ctrl+C`);
});

process.on('SIGINT', () => {
    console.log('\n👋 Server band ho raha hai...');
    
    server.close(() => {
        console.log('✅ Server safely band ho gaya');
        process.exit(0);
    });
});
