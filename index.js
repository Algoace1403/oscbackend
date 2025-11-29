const net = require('net');

// =====================================================
// 🎓 HTTP SERVER FROM SCRATCH - HINGLISH EXPLANATION
// =====================================================
//
// Is server ko ek restaurant ke waiter ki tarah samjho:
// 1. Ye customer (Client) ke aane ka wait karta hai.
// 2. Unki baat sunta hai (Request).
// 3. Samajhta hai ki unhe kya chahiye (Parsing).
// 4. Jo manga wo la kar deta hai (Response).
//
// Hum 'net' module use kar rahe hain taaki hum seedha "wires" (TCP Sockets) se baat kar sakein.
// Hum 'http' ya 'express' use nahi kar rahe kyunki humein khud ka logic banana hai!

// =====================================================
// ⚙️ CONFIGURATION - Server ki settings
// =====================================================
const PORT = process.env.PORT || 8080; // Ye wo "darwaza" (port) hai jahan humara server sunega.
// process.env.PORT se check karte hain agar koi environment variable set hai toh use karenge, warna 8080 default

// Request body ka maximum size limit (security ke liye)
// Agar koi bahut bada request bheje toh server crash na ho
const MAX_BODY_SIZE = 1024 * 1024; // 1MB limit (bytes mein)

// Data store karne ke liye ek simple jagah (jaise ek temporary notepad).
// Agar server restart hua, toh ye sab gayab ho jayega!
// Ye ek array hai jismein hum JSON objects store karenge
let dataStore = [];

const server = net.createServer((socket) => {
    // Ye function TAB chalta hai jab bhi koi naya banda (client) connect karta hai.
    // 'socket' us bande ke saath ek direct phone line ki tarah hai.
    console.log('✨ Ek client connect hua!');

    // EVENT: Jab client se data (text) aata hai
    socket.on('data', (buffer) => {
        // 1. RAW DATA RECEIVE KARNA
        // Computers data ko bytes (0s aur 1s) mein bhejte hain. Hum usse text mein convert karte hain padhne ke liye.
        const requestString = buffer.toString();
        
        // Agar request bilkul khali hai toh error bhejo
        if (!requestString || requestString.trim().length === 0) {
            sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Empty request received');
            return;
        }

        // 2. REQUEST PARSE KARNA (Samajhna ki wo kya chahte hain)
        // HTTP requests aisi dikhti hain:
        // GET /hello HTTP/1.1  <-- Request Line (Kya chahiye?)
        // Host: localhost      <-- Headers (Extra info)
        //                      <-- Khali Line
        // Body...              <-- Body (Agar kuch data bheja hai)

        // Text ko lines mein tod rahe hain taaki ek-ek karke padh sakein.
        const lines = requestString.split('\r\n');

        // Agar koi line hi nahi hai toh error
        if (lines.length === 0 || !lines[0]) {
            sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Invalid request format');
            return;
        }

        // Pehli line humein COMMAND (Method) aur TARGET (Path) batati hai.
        // Example: "GET /data HTTP/1.1"
        const requestLine = lines[0];
        const parts = requestLine.split(' ');
        
        // Request line mein kam se kam 3 parts hone chahiye: Method, Path, HTTP Version
        if (parts.length < 3) {
            sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Invalid request line format');
            return;
        }
        
        const method = parts[0].toUpperCase(); // e.g., GET, POST (uppercase mein convert)
        const path = parts[1];   // e.g., /, /echo, /data
        const httpVersion = parts[2]; // e.g., HTTP/1.1
        
        // HTTP version check karte hain (hum sirf HTTP/1.1 support karte hain)
        if (!httpVersion.startsWith('HTTP/')) {
            sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Invalid HTTP version');
            return;
        }
        
        // Request logging - konsa method aur path use ho raha hai
        console.log(`📩 ${method} ${path} - Request received`);

        // 3. HEADERS PARSE KARNA (Important information)
        // Headers ek key-value pair ki tarah hote hain, jaise:
        // Host: localhost:8080
        // Content-Type: application/json
        // Content-Length: 25
        let headers = {};
        let i = 1;
        // Headers ke lines ko padhte raho jab tak khali line na mile
        while (i < lines.length && lines[i] !== '') {
            const headerLine = lines[i];
            // Header format: "Key: Value"
            const colonIndex = headerLine.indexOf(':');
            if (colonIndex !== -1) {
                const key = headerLine.substring(0, colonIndex).trim().toLowerCase();
                const value = headerLine.substring(colonIndex + 1).trim();
                headers[key] = value; // Object mein store kar liya
            }
            i++;
        }
        
        // 4. BODY NIKAALNA (Jo data unhone bheja)
        // Body hamesha headers aur ek khali line ke baad aati hai.
        // Ab 'i' pointer khali line pe hai, isliye uske baad wala sab body hai
        let body = '';
        if (i < lines.length - 1) {
            // Khali line ke baad ki sab lines ko join karke body banate hain
            body = lines.slice(i + 1).join('\r\n');
        }
        
        // Content-Length header se verify karte hain ki body sahi size ki hai
        // (Security check - body size limit)
        const contentLength = headers['content-length'] ? parseInt(headers['content-length']) : 0;
        
        // Body size check - agar bahut bada hai toh reject kar do
        if (contentLength > MAX_BODY_SIZE) {
            sendResponse(socket, 413, 'Payload Too Large', 'text/plain', `Request body too large. Maximum size: ${MAX_BODY_SIZE} bytes`);
            return;
        }
        
        // Actual body size check
        const actualBodySize = Buffer.byteLength(body, 'utf8');
        if (contentLength > 0 && actualBodySize !== contentLength) {
            // Content-Length header aur actual body size match nahi kar rahe
            console.warn(`⚠️ Content-Length mismatch: Expected ${contentLength}, got ${actualBodySize}`);
        }

        // 5. ROUTING (Decide karna ki ab kya karein)
        // Hum check karenge ki user ne kya manga hai (Method + Path).
        // Try-catch block mein wrap karte hain taaki agar koi error aaye toh 500 bhej sakein
        try {
            // CASE 0: CORS Preflight Request (OPTIONS method)
            // Browser pehle OPTIONS request bhejta hai CORS check karne ke liye
            // Is case mein hum sirf headers bhejte hain, body nahi
            if (method === 'OPTIONS') {
                // CORS headers already sendResponse function mein hain, isliye bas empty body ke saath call karte hain
                sendResponse(socket, 200, 'OK', 'text/plain', '');
                return;
            }
            
            // Path ko clean karte hain - query parameters alag karte hain
            // Example: "/echo?message=hello" -> path="/echo", query="message=hello"
            const pathParts = path.split('?');
            const cleanPath = pathParts[0]; // Path without query parameters
            
            // CASE 1: Wo bas home page pe aaye hain ("/")
            if (method === 'GET' && cleanPath === '/') {
                const reply = 'Welcome to your custom HTTP Server!';
                sendResponse(socket, 200, 'OK', 'text/plain', reply);
            }

            // CASE 2: Wo chahte hain hum wahi bole jo unhone bola ("/echo?message=hello")
            else if (method === 'GET' && cleanPath === '/echo') {
                // Humein "message=" ke baad wala text chahiye
                const queryString = pathParts[1] || ''; // Query string part
                const query = new URLSearchParams(queryString);
                const msg = query.get('message') || 'Kuch toh bolo!';

                sendResponse(socket, 200, 'OK', 'text/plain', `Echo: ${msg}`);
            }

            // CASE 3: Wo data SAVE karna chahte hain (POST /data)
            else if (method === 'POST' && cleanPath === '/data') {
                try {
                    // Body check - POST request mein body honi chahiye
                    if (!body || body.trim().length === 0) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Request body is required for POST');
                        return;
                    }
                    
                    // Content-Type check - JSON data ke liye application/json hona chahiye
                    const contentType = headers['content-type'] || '';
                    if (!contentType.includes('application/json')) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Content-Type must be application/json');
                        return;
                    }
                    
                    // Body text hoti hai, usse JavaScript Object (JSON) banate hain.
                    const data = JSON.parse(body);
                    
                    // Data ko validate karte hain - empty object check
                    if (typeof data !== 'object' || data === null) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Data must be a valid JSON object');
                        return;
                    }
                    
                    dataStore.push(data); // List mein save kar liya!
                    const newId = dataStore.length - 1; // Naya ID

                    const reply = JSON.stringify({ 
                        status: 'success', 
                        message: 'Data saved successfully!', 
                        id: newId,
                        data: data 
                    }, null, 2);
                    sendResponse(socket, 201, 'Created', 'application/json', reply);
                } catch (error) {
                    // Agar unhone galat data bheja jo JSON nahi hai
                    if (error instanceof SyntaxError) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Invalid JSON format: ' + error.message);
                    } else {
                        sendResponse(socket, 500, 'Internal Server Error', 'text/plain', 'Server error: ' + error.message);
                    }
                }
            }

            // CASE 4: Wo saara data DEKHNA chahte hain (GET /data)
            else if (method === 'GET' && cleanPath === '/data') {
                const reply = JSON.stringify(dataStore, null, 2); // Pretty print JSON
                sendResponse(socket, 200, 'OK', 'application/json', reply);
            }

            // CASE 5: Wo koi EK specific item chahte hain (GET /data/0)
            else if (method === 'GET' && cleanPath.startsWith('/data/')) {
                // Path ke end se ID nikaal rahe hain
                const pathSegments = cleanPath.split('/');
                if (pathSegments.length !== 3) {
                    sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Invalid path format. Use /data/:id');
                    return;
                }
                
                const id = pathSegments[2];
                const index = parseInt(id);
                
                // ID validation
                if (isNaN(index) || index < 0) {
                    sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Invalid ID format. ID must be a non-negative number');
                    return;
                }

                if (index < dataStore.length && dataStore[index] !== undefined) {
                    const reply = JSON.stringify(dataStore[index], null, 2);
                    sendResponse(socket, 200, 'OK', 'application/json', reply);
                } else {
                    sendResponse(socket, 404, 'Not Found', 'text/plain', `Item with ID ${index} not found`);
                }
            }

            // CASE 6: Data UPDATE karna (PUT /data/:id)
            // PUT method se hum existing data ko update kar sakte hain
            else if (method === 'PUT' && cleanPath.startsWith('/data/')) {
                try {
                    const pathSegments = cleanPath.split('/');
                    if (pathSegments.length !== 3) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Invalid path format. Use /data/:id');
                        return;
                    }
                    
                    const id = pathSegments[2];
                    const index = parseInt(id);
                    
                    if (isNaN(index) || index < 0) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Invalid ID format. ID must be a non-negative number');
                        return;
                    }
                    
                    // Body check - PUT request mein body honi chahiye
                    if (!body || body.trim().length === 0) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Request body is required for PUT');
                        return;
                    }
                    
                    if (index < dataStore.length && dataStore[index] !== undefined) {
                        // Existing data ko naye data se replace kar do
                        const newData = JSON.parse(body);
                        dataStore[index] = newData;
                        const reply = JSON.stringify({ status: 'success', message: 'Data updated!', data: newData }, null, 2);
                        sendResponse(socket, 200, 'OK', 'application/json', reply);
                    } else {
                        sendResponse(socket, 404, 'Not Found', 'text/plain', `Item with ID ${index} not found for update`);
                    }
                } catch (error) {
                    if (error instanceof SyntaxError) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Invalid JSON data: ' + error.message);
                    } else {
                        sendResponse(socket, 500, 'Internal Server Error', 'text/plain', 'Server error: ' + error.message);
                    }
                }
            }
            
            // CASE 7: Data DELETE karna (DELETE /data/:id)
            // DELETE method se hum data ko remove kar sakte hain
            else if (method === 'DELETE' && cleanPath.startsWith('/data/')) {
                try {
                    const pathSegments = cleanPath.split('/');
                    if (pathSegments.length !== 3) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Invalid path format. Use /data/:id');
                        return;
                    }
                    
                    const id = pathSegments[2];
                    const index = parseInt(id);
                    
                    if (isNaN(index) || index < 0) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Invalid ID format. ID must be a non-negative number');
                        return;
                    }
                    
                    if (index < dataStore.length && dataStore[index] !== undefined) {
                        // Array se item ko remove kar do
                        const deletedItem = dataStore.splice(index, 1)[0];
                        const reply = JSON.stringify({ status: 'success', message: 'Data deleted!', deleted: deletedItem }, null, 2);
                        sendResponse(socket, 200, 'OK', 'application/json', reply);
                    } else {
                        sendResponse(socket, 404, 'Not Found', 'text/plain', `Item with ID ${index} not found for deletion`);
                    }
                } catch (error) {
                    sendResponse(socket, 500, 'Internal Server Error', 'text/plain', 'Server error: ' + error.message);
                }
            }
            
            // CASE 8: Humein nahi pata ye kaunsa page hai (404)
            else {
                sendResponse(socket, 404, 'Not Found', 'text/plain', 'Page nahi mila');
            }
            
        } catch (error) {
            // Agar koi unexpected error aaye (jaise parsing mein problem), toh 500 bhejo
            console.error('❌ Server Error:', error);
            sendResponse(socket, 500, 'Internal Server Error', 'text/plain', 'Server mein kuch galat ho gaya: ' + error.message);
        }
    });

    // EVENT: Client chala gaya (connection close ho gaya)
    socket.on('end', () => {
        console.log('👋 Client disconnected');
    });
    
    // EVENT: Agar koi error aaye connection mein
    socket.on('error', (error) => {
        console.error('❌ Socket Error:', error.message);
    });
});

// =====================================================
// 🛠️ HELPER FUNCTION: RESPONSE BHEJNA
// =====================================================
// Ye function official HTTP response banata hai.
// Ye client ko ek formal letter likhne jaisa hai.
// 
// HTTP Response format:
// HTTP/1.1 200 OK                    <-- Status Line
// Date: Mon, 01 Jan 2024 12:00:00 GMT <-- Headers
// Content-Type: application/json
// Content-Length: 25
// Connection: close
//                                         <-- Khali line (ZAROORI!)
// {"status": "success"}                  <-- Body
// =====================================================
// 🛠️ HELPER FUNCTION: RESPONSE BHEJNA
// =====================================================
// Ye function official HTTP response banata hai.
// Ye client ko ek formal letter likhne jaisa hai.
// 
// HTTP Response format:
// HTTP/1.1 200 OK                    <-- Status Line
// Date: Mon, 01 Jan 2024 12:00:00 GMT <-- Headers
// Content-Type: application/json
// Content-Length: 25
// Connection: close
//                                         <-- Khali line (ZAROORI!)
// {"status": "success"}                  <-- Body
function sendResponse(socket, statusCode, statusText, contentType, content, extraHeaders = []) {
    // Content ko bytes mein convert karke uska size nikalte hain
    // Kyunki Content-Length header mein bytes chahiye, characters nahi
    // Agar content undefined ya null hai toh empty string use karte hain
    const safeContent = content || '';
    const contentLength = Buffer.byteLength(safeContent, 'utf8');
    
    // Response headers ko ek array mein build karte hain
    const headers = [
        `HTTP/1.1 ${statusCode} ${statusText}`,  // 1. Status Line (e.g., "200 OK")
        `Date: ${new Date().toUTCString()}`,     // 2. Time kya hua hai (GMT format)
        `Content-Type: ${contentType}`,          // 3. Ye data kis type ka hai? (JSON? Text?)
        `Content-Length: ${contentLength}`,       // 4. Message kitna bada hai? (bytes mein)
        'Connection: close',                     // 5. Baat khatam, phone kaat do (keep-alive nahi kar rahe)
        'Access-Control-Allow-Origin: *',        // 6. Kisi ko bhi use karne do (CORS - Bonus feature!)
        'Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS', // CORS methods
        'Access-Control-Allow-Headers: Content-Type', // CORS headers
    ];
    
    // Agar koi extra headers diye gaye hain toh unhe add kar do
    if (extraHeaders && extraHeaders.length > 0) {
        headers.push(...extraHeaders);
    }
    
    // Response ko complete banate hain
    const response = [
        ...headers,
        '',                                      // KHALI LINE (Zaroori hai! Headers aur body ke beech)
        safeContent                              // Asli maal (Data/Message)
    ].join('\r\n'); // Lines ko '\r\n' se jod rahe hain (HTTP standard)

    // Response ko socket pe write karte hain (client ko bhej dete hain)
    socket.write(response);
    // Connection close kar dete hain (HTTP/1.1 mein ye zaroori nahi, but simple rakhne ke liye)
    socket.end();
}

// =====================================================
// 🚀 SERVER START KARNA
// =====================================================
// Server ko start karte hain aur ek specific port pe listen karne ko kehte hain
// Node.js ka event loop automatically multiple clients ko handle kar lega
// (Yeh ek bonus feature hai - concurrent request handling!)
server.listen(PORT, () => {
    console.log(`🚀 Server port ${PORT} pe sun raha hai`);
    console.log(`📡 Test karne ke liye: curl http://localhost:${PORT}/`);
    console.log(`💡 Server ko band karne ke liye: Ctrl+C`);
});

// Graceful shutdown - agar server band karna ho toh
process.on('SIGINT', () => {
    console.log('\n👋 Server band ho raha hai...');
    server.close(() => {
        console.log('✅ Server safely band ho gaya');
        process.exit(0);
    });
});
