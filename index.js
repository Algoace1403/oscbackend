// 🎓 HTTP SERVER FROM SCRATCH -
//
// Is server ko ek restaurant ke waiter ki tarah samjho:
// 1. Ye customer (Client) ke aane ka wait karta hai
// 2. Unki baat sunta hai (Request receive karta hai)
// 3. Samajhta hai ki unhe kya chahiye (Request ko parse karta hai)
// 4. Jo manga wo la kar deta hai (Response bhejta hai)
//
// IMPORTANT: Hum 'net' module use kar rahe hain
// - Ye Node.js ka built-in module hai
// - Isse hum seedha TCP sockets se baat kar sakte hain
// - Hum 'http' ya 'express' use NAHI kar rahe (assignment requirement)
// - Kyunki humein khud se HTTP protocol implement karna hai!

const net = require('net');
// 'net' module import kar rahe hain - ye TCP connections handle karta hai

// ⚙️ CONFIGURATION - Server ki basic settings

// PORT - Ye wo "darwaza" hai jahan server sunega
// process.env.PORT = agar environment variable mein PORT set hai toh use karo
// || 8080 = warna default 8080 use karo
const PORT = process.env.PORT || 8080;

// MAX_BODY_SIZE - Request body ka maximum size limit
// Kyu? Security ke liye - agar koi bahut bada request bheje toh server crash na ho
// 1024 * 1024 = 1MB (1 million bytes)
const MAX_BODY_SIZE = 1024 * 1024; // 1MB limit

// dataStore - Ye ek simple array hai jismein hum data store karenge
// Jaise ek temporary notepad - server restart hote hi sab gayab ho jayega
// Ismein hum JSON objects store karenge
let dataStore = [];

// 🖥️ SERVER BANANA - Main server setup

// net.createServer() - Ye ek server banata hai
// Jab bhi koi naya client connect karega, ye function chalega
const server = net.createServer((socket) => {
    // socket = ye ek direct connection hai client ke saath
    // Jaise ek phone line jo client aur server ko jodti hai
    
    console.log('✨ Ek client connect hua!');

    // 📨 EVENT: Jab client se data aata hai

    // socket.on('data') = jab bhi client se kuch data aaye, ye function chalega
    socket.on('data', (buffer) => {
        // buffer = ye raw bytes hai jo client ne bheje hain
        // Computers data ko 0s aur 1s (bytes) mein bhejte hain
        
        // STEP 1: Bytes ko text mein convert karna
        // toString() se bytes ko readable text mein convert karte hain
        const requestString = buffer.toString();
        
        // Safety check: Agar request bilkul khali hai toh error bhejo
        if (!requestString || requestString.trim().length === 0) {
            sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Empty request received');
            return; // Function se bahar nikal jao
        }

        // STEP 2: REQUEST KO PARSE KARNA (Samajhna ki client kya chahta hai)


        // HTTP request ka format aisa hota hai:
        // 
        // GET /hello HTTP/1.1          <-- Request Line (pehli line)
        // Host: localhost:8080          <-- Headers (extra information)
        // Content-Type: application/json
        //                              <-- Khali line (headers khatam)
        // {"name": "test"}              <-- Body (actual data, agar hai toh)

        // Request ko lines mein tod do
        // '\r\n' = ye ek special character hai jo lines ko alag karta hai
        const lines = requestString.split('\r\n');

        // Safety check: Agar koi line hi nahi hai toh error
        if (lines.length === 0 || !lines[0]) {
            sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Invalid request format');
            return;
        }

        // STEP 3: REQUEST LINE SE METHOD AUR PATH NIKALNA
        // =====================================================
        // Pehli line (requestLine) mein 3 cheezein hoti hain:
        // Example: "GET /data HTTP/1.1"
        //   - Method: GET (kya karna hai)
        //   - Path: /data (kahan jana hai)
        //   - HTTP Version: HTTP/1.1 (kaunsa version use kar rahe hain)
        // =====================================================
        
        const requestLine = lines[0]; // Pehli line uthao
        const parts = requestLine.split(' '); // Space se tod do
        
        // Safety check: Kam se kam 3 parts hone chahiye
        if (parts.length < 3) {
            sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Invalid request line format');
            return;
        }
        
        // Method = pehla word (GET, POST, PUT, DELETE, etc.)
        // toUpperCase() = sabko capital letters mein convert karo
        // Kyu? Taaki "get" aur "GET" dono same treat ho
        const method = parts[0].toUpperCase(); // e.g., "GET", "POST"
        
        // Path = doosra word (/, /echo, /data, etc.)
        const path = parts[1]; // e.g., "/", "/echo", "/data"
        
        // HTTP Version = teesra word (HTTP/1.1, HTTP/2.0, etc.)
        const httpVersion = parts[2]; // e.g., "HTTP/1.1"
        
        // Safety check: HTTP version sahi format mein hona chahiye
        if (!httpVersion.startsWith('HTTP/')) {
            sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Invalid HTTP version');
            return;
        }
        
        // Logging: Konsa method aur path use ho raha hai (debugging ke liye)
        console.log(`📩 ${method} ${path} - Request received`);

        // STEP 4: HEADERS PARSE KARNA
        // =====================================================
        // Headers = extra information jo client bhejta hai
        // Format: "Key: Value"
        // Examples:
        //   Host: localhost:8080
        //   Content-Type: application/json
        //   Content-Length: 25
        // =====================================================
        
        let headers = {}; // Ek empty object banate hain (key-value pairs store karne ke liye)
        let i = 1; // Pehli line (index 0) request line hai, isliye 1 se start karte hain
        
        // Loop: Headers ko padhte raho jab tak khali line na mile
        // Khali line = headers khatam hone ka signal
        while (i < lines.length && lines[i] !== '') {
            const headerLine = lines[i]; // Ek header line uthao
            
            // Header format: "Key: Value"
            // Colon (:) se pehle key, baad mein value
            const colonIndex = headerLine.indexOf(':'); // Colon kahan hai dhoondo
            
            if (colonIndex !== -1) { // Agar colon mila
                // Key = colon se pehle wala part
                // trim() = spaces hata do
                // toLowerCase() = sabko lowercase mein convert karo (consistency ke liye)
                const key = headerLine.substring(0, colonIndex).trim().toLowerCase();
                
                // Value = colon ke baad wala part
                const value = headerLine.substring(colonIndex + 1).trim();
                
                // Object mein store kar do
                headers[key] = value;
            }
            i++; // Agli line pe jao
        }
        
        // STEP 5: BODY NIKALNA
        // =====================================================
        // Body = actual data jo client ne bheja hai
        // Body hamesha headers aur ek khali line ke BAAD aati hai
        // Ab 'i' pointer khali line pe hai, isliye uske baad wala sab body hai
        // =====================================================
        
        let body = ''; // Empty string se start karo
        
        // Agar khali line ke baad kuch hai toh wo body hai
        if (i < lines.length - 1) {
            // Khali line ke baad ki sab lines ko join karke body banate hain
            // slice(i + 1) = khali line ke baad ki sab lines
            // join('\r\n') = unhe wapas se '\r\n' se jodo
            body = lines.slice(i + 1).join('\r\n');
        }

        // STEP 6: BODY SIZE CHECK KARNA
        // =====================================================
        // Security check: Body ka size limit se zyada toh nahi hai?
        // =====================================================
        
        // Content-Length header se body ka size nikalte hain
        // parseInt() = string ko number mein convert karta hai
        // Agar header nahi hai toh 0 use karo
        const contentLength = headers['content-length'] ? parseInt(headers['content-length']) : 0;
        
        // Safety check: Agar body bahut bada hai toh reject kar do
        if (contentLength > MAX_BODY_SIZE) {
            sendResponse(socket, 413, 'Payload Too Large', 'text/plain', 
                `Request body too large. Maximum size: ${MAX_BODY_SIZE} bytes`);
            return;
        }
        
        // Optional check: Actual body size aur Content-Length header match karte hain?
        const actualBodySize = Buffer.byteLength(body, 'utf8');
        if (contentLength > 0 && actualBodySize !== contentLength) {
            // Warning log karo (match nahi kar rahe)
            console.warn(`⚠️ Content-Length mismatch: Expected ${contentLength}, got ${actualBodySize}`);
        }

        // STEP 7: ROUTING - Decide karna ki kya karna hai
        // =====================================================
        // Ab hum check karenge ki user ne kya manga hai
        // Method (GET/POST/PUT/DELETE) + Path (/data, /echo, etc.) ke basis pe
        // Try-catch = agar koi error aaye toh catch karo aur 500 error bhejo
        // =====================================================
        
        try {
            // =====================================================
            // CASE 0: OPTIONS Method (CORS Preflight)
            // =====================================================
            // Browser pehle OPTIONS request bhejta hai CORS check karne ke liye
            // Ismein sirf headers bhejte hain, body nahi
            // =====================================================
            if (method === 'OPTIONS') {
                // CORS headers already sendResponse function mein hain
                // Bas empty body ke saath response bhej do
                sendResponse(socket, 200, 'OK', 'text/plain', '');
                return; // Function se bahar nikal jao
            }
            
            // =====================================================
            // PATH CLEANING - Query parameters alag karna
            // =====================================================
            // Example: "/echo?message=hello"
            //   - cleanPath = "/echo" (actual path)
            //   - query = "message=hello" (query parameters)
            // =====================================================
            const pathParts = path.split('?'); // '?' se tod do
            const cleanPath = pathParts[0]; // Pehla part = actual path (without query)
            
            // =====================================================
            // CASE 1: GET / (Home Page)
            // =====================================================
            // User bas home page pe aaya hai
            // Simple welcome message bhejo
            // =====================================================
            if (method === 'GET' && cleanPath === '/') {
            const reply = 'Welcome to your custom HTTP Server!';
            sendResponse(socket, 200, 'OK', 'text/plain', reply);
        }

            // =====================================================
            // CASE 2: GET /echo?message=<text> (Echo Service)
            // =====================================================
            // User chahta hai ki hum wahi bole jo unhone bola
            // Example: /echo?message=hello -> "Echo: hello"
            // =====================================================
            else if (method === 'GET' && cleanPath === '/echo') {
                // Query string part nikaalo (message=hello)
                const queryString = pathParts[1] || ''; // Agar query nahi hai toh empty string
                
                // URLSearchParams = query string ko parse karta hai
                // Example: "message=hello" -> {message: "hello"}
                const query = new URLSearchParams(queryString);
                
                // 'message' parameter nikaalo, agar nahi hai toh default message
            const msg = query.get('message') || 'Kuch toh bolo!';

                // Echo message bhejo
            sendResponse(socket, 200, 'OK', 'text/plain', `Echo: ${msg}`);
        }

            // =====================================================
            // CASE 3: POST /data (Data Save Karna)
            // =====================================================
            // User naya data save karna chahta hai
            // Body mein JSON data hoga
            // =====================================================
            else if (method === 'POST' && cleanPath === '/data') {
                try {
                    // Safety check 1: Body honi chahiye
                    if (!body || body.trim().length === 0) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                            'Request body is required for POST');
                        return;
                    }
                    
                    // Safety check 2: Content-Type sahi hona chahiye
                    const contentType = headers['content-type'] || '';
                    if (!contentType.includes('application/json')) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                            'Content-Type must be application/json');
                        return;
                    }
                    
                    // Body ko JSON se JavaScript object mein convert karo
                    // JSON.parse() = JSON string ko object mein convert karta hai
                    // Example: '{"name":"test"}' -> {name: "test"}
                const data = JSON.parse(body);
                    
                    // Safety check 3: Data valid object hona chahiye
                    if (typeof data !== 'object' || data === null) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                            'Data must be a valid JSON object');
                        return;
                    }
                    
                    // Data ko array mein save karo
                    dataStore.push(data); // Array ke end mein add karo
                    const newId = dataStore.length - 1; // Naya ID = array ki length - 1

                    // Success response bhejo
                    const reply = JSON.stringify({ 
                        status: 'success', 
                        message: 'Data saved successfully!', 
                        id: newId, // Naya item ka ID
                        data: data // Saved data
                    }, null, 2); // null, 2 = pretty print (readable format)
                    
                    // 201 = Created (naya resource banaya)
                    sendResponse(socket, 201, 'Created', 'application/json', reply);
                    
                } catch (error) {
                    // Agar JSON parse mein error aaye
                    if (error instanceof SyntaxError) {
                        // SyntaxError = galat JSON format
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                            'Invalid JSON format: ' + error.message);
                    } else {
                        // Koi aur error = server problem
                        sendResponse(socket, 500, 'Internal Server Error', 'text/plain', 
                            'Server error: ' + error.message);
                    }
                }
            }

            // =====================================================
            // CASE 4: GET /data (Saara Data Dekhna)
            // =====================================================
            // User saara stored data dekhna chahta hai
            // =====================================================
            else if (method === 'GET' && cleanPath === '/data') {
                // Saara data JSON mein convert karo
                // null, 2 = pretty print (readable format)
                const reply = JSON.stringify(dataStore, null, 2);
                sendResponse(socket, 200, 'OK', 'application/json', reply);
            }

            // =====================================================
            // CASE 5: GET /data/:id (Ek Specific Item Dekhna)
            // =====================================================
            // User ek specific item dekhna chahta hai
            // Example: /data/0 = pehla item, /data/1 = doosra item
            // =====================================================
            else if (method === 'GET' && cleanPath.startsWith('/data/')) {
                // Path ko parts mein tod do
                // Example: "/data/0" -> ["", "data", "0"]
                const pathSegments = cleanPath.split('/');
                
                // Safety check: Path format sahi hona chahiye
                // Length 3 honi chahiye: ["", "data", "id"]
                if (pathSegments.length !== 3) {
                    sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                        'Invalid path format. Use /data/:id');
                    return;
                }
                
                // ID nikaalo (teesra part)
                const id = pathSegments[2]; // "0", "1", etc.
                
                // String ko number mein convert karo
                const index = parseInt(id); // "0" -> 0, "1" -> 1
                
                // Safety check: ID valid number hona chahiye
                if (isNaN(index) || index < 0) {
                    sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                        'Invalid ID format. ID must be a non-negative number');
                    return;
                }

                // Data check: Agar item exist karta hai
                if (index < dataStore.length && dataStore[index] !== undefined) {
                    // Item mil gaya - JSON mein convert karke bhejo
                    const reply = JSON.stringify(dataStore[index], null, 2);
            sendResponse(socket, 200, 'OK', 'application/json', reply);
                } else {
                    // Item nahi mila - 404 error
                    sendResponse(socket, 404, 'Not Found', 'text/plain', 
                        `Item with ID ${index} not found`);
                }
            }

            // =====================================================
            // CASE 6: PUT /data/:id (Data Update Karna)
            // =====================================================
            // User existing data ko update karna chahta hai
            // Body mein naya data hoga jo purane data ko replace karega
            // =====================================================
            else if (method === 'PUT' && cleanPath.startsWith('/data/')) {
                try {
                    // Path ko parts mein tod do
                    const pathSegments = cleanPath.split('/');
                    
                    // Safety check: Path format sahi hona chahiye
                    if (pathSegments.length !== 3) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                            'Invalid path format. Use /data/:id');
                        return;
                    }
                    
                    // ID nikaalo aur number mein convert karo
                    const id = pathSegments[2];
            const index = parseInt(id);

                    // Safety check: ID valid hona chahiye
                    if (isNaN(index) || index < 0) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                            'Invalid ID format. ID must be a non-negative number');
                        return;
                    }
                    
                    // Safety check: Body honi chahiye
                    if (!body || body.trim().length === 0) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                            'Request body is required for PUT');
                        return;
                    }
                    
                    // Data check: Agar item exist karta hai
                    if (index < dataStore.length && dataStore[index] !== undefined) {
                        // Body ko JSON se object mein convert karo
                        const newData = JSON.parse(body);
                        
                        // Purane data ko naye data se replace karo
                        dataStore[index] = newData;
                        
                        // Success response bhejo
                        const reply = JSON.stringify({ 
                            status: 'success', 
                            message: 'Data updated!', 
                            data: newData 
                        }, null, 2);
                sendResponse(socket, 200, 'OK', 'application/json', reply);
            } else {
                        // Item nahi mila - 404 error
                        sendResponse(socket, 404, 'Not Found', 'text/plain', 
                            `Item with ID ${index} not found for update`);
                    }
                } catch (error) {
                    // Error handling
                    if (error instanceof SyntaxError) {
                        // Galat JSON format
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                            'Invalid JSON data: ' + error.message);
                    } else {
                        // Server error
                        sendResponse(socket, 500, 'Internal Server Error', 'text/plain', 
                            'Server error: ' + error.message);
                    }
                }
            }
            
            // =====================================================
            // CASE 7: DELETE /data/:id (Data Delete Karna)
            // =====================================================
            // User data ko delete karna chahta hai
            // =====================================================
            else if (method === 'DELETE' && cleanPath.startsWith('/data/')) {
                try {
                    // Path ko parts mein tod do
                    const pathSegments = cleanPath.split('/');
                    
                    // Safety check: Path format sahi hona chahiye
                    if (pathSegments.length !== 3) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                            'Invalid path format. Use /data/:id');
                        return;
                    }
                    
                    // ID nikaalo aur number mein convert karo
                    const id = pathSegments[2];
                    const index = parseInt(id);
                    
                    // Safety check: ID valid hona chahiye
                    if (isNaN(index) || index < 0) {
                        sendResponse(socket, 400, 'Bad Request', 'text/plain', 
                            'Invalid ID format. ID must be a non-negative number');
                        return;
                    }
                    
                    // Data check: Agar item exist karta hai
                    if (index < dataStore.length && dataStore[index] !== undefined) {
                        // Array se item ko remove karo
                        // splice(index, 1) = index se 1 item remove karo
                        // [0] = pehla (aur sirf) removed item
                        const deletedItem = dataStore.splice(index, 1)[0];
                        
                        // Success response bhejo
                        const reply = JSON.stringify({ 
                            status: 'success', 
                            message: 'Data deleted!', 
                            deleted: deletedItem 
                        }, null, 2);
                        sendResponse(socket, 200, 'OK', 'application/json', reply);
                    } else {
                        // Item nahi mila - 404 error
                        sendResponse(socket, 404, 'Not Found', 'text/plain', 
                            `Item with ID ${index} not found for deletion`);
                    }
                } catch (error) {
                    // Server error
                    sendResponse(socket, 500, 'Internal Server Error', 'text/plain', 
                        'Server error: ' + error.message);
                }
            }
            
            // =====================================================
            // CASE 8: 404 Not Found (Koi Bhi Route Match Nahi Hua)
            // =====================================================
            // Agar koi bhi route match nahi hua, matlab page nahi mila
            // =====================================================
        else {
            sendResponse(socket, 404, 'Not Found', 'text/plain', 'Page nahi mila');
            }
            
        } catch (error) {
            // Agar koi unexpected error aaye (jaise parsing mein problem)
            // Toh 500 Internal Server Error bhejo
            console.error('❌ Server Error:', error);
            sendResponse(socket, 500, 'Internal Server Error', 'text/plain', 
                'Server mein kuch galat ho gaya: ' + error.message);
        }
    });

    // =====================================================
    // EVENT: Client Disconnect (Connection Close)
    // =====================================================
    // Jab client connection close karta hai
    socket.on('end', () => {
        console.log('👋 Client disconnected');
    });
    
    // =====================================================
    // EVENT: Connection Error
    // =====================================================
    // Agar connection mein koi error aaye
    socket.on('error', (error) => {
        console.error('❌ Socket Error:', error.message);
    });
});

// =====================================================
// 🛠️ HELPER FUNCTION: RESPONSE BHEJNA
// =====================================================
// Ye function official HTTP response banata hai
// Jaise ek formal letter likhne jaisa hai
// 
// HTTP Response ka format:
// HTTP/1.1 200 OK                    <-- Status Line (pehli line)
// Date: Mon, 01 Jan 2024 12:00:00 GMT <-- Headers (extra info)
// Content-Type: application/json
// Content-Length: 25
// Connection: close
//                                         <-- Khali line (ZAROORI! Headers aur body ke beech)
// {"status": "success"}                  <-- Body (actual data)
// =====================================================
function sendResponse(socket, statusCode, statusText, contentType, content, extraHeaders = []) {
    // Parameters explanation:
    // socket = client ke saath connection
    // statusCode = 200, 404, 500, etc. (response ka status)
    // statusText = "OK", "Not Found", etc. (status ka text)
    // contentType = "text/plain", "application/json", etc. (data ka type)
    // content = actual data/message jo bhejna hai
    // extraHeaders = optional extra headers (default empty array)
    
    // STEP 1: Content ko safe banayo
    // Agar content undefined ya null hai toh empty string use karo
    const safeContent = content || '';
    
    // STEP 2: Content ka size nikaalo (bytes mein)
    // Buffer.byteLength() = string ka actual byte size deta hai
    // Kyu? Kyunki Content-Length header mein bytes chahiye, characters nahi
    // 'utf8' = character encoding (Hindi/English text ke liye)
    const contentLength = Buffer.byteLength(safeContent, 'utf8');
    
    // STEP 3: Response headers ko build karo
    // Headers = extra information jo response ke saath bhejni hai
    const headers = [
        `HTTP/1.1 ${statusCode} ${statusText}`,  // Status Line (e.g., "HTTP/1.1 200 OK")
        `Date: ${new Date().toUTCString()}`,     // Current date/time (GMT format)
        `Content-Type: ${contentType}`,          // Data ka type (JSON? Text?)
        `Content-Length: ${contentLength}`,       // Data ka size (bytes mein)
        'Connection: close',                     // Connection close karo (keep-alive nahi)
        'Access-Control-Allow-Origin: *',        // CORS: Kisi bhi website se allow karo
        'Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS', // CORS: Allowed methods
        'Access-Control-Allow-Headers: Content-Type', // CORS: Allowed headers
    ];
    
    // STEP 4: Agar koi extra headers diye gaye hain toh unhe add karo
    if (extraHeaders && extraHeaders.length > 0) {
        headers.push(...extraHeaders); // Spread operator se sab headers add karo
    }
    
    // STEP 5: Complete response banayo
    // Response = Headers + Khali Line + Body
    const response = [
        ...headers,           // Sab headers
        '',                   // KHALI LINE (Zaroori hai! Headers aur body ke beech)
        safeContent           // Actual data/message
    ].join('\r\n');          // Sabko '\r\n' se jodo (HTTP standard)
    // '\r\n' = line break character (jaise Enter key press karna)

    // STEP 6: Response ko client ko bhejo
    socket.write(response);  // Response ko socket pe write karo (client tak pahunch jayega)
    socket.end();            // Connection close karo (baat khatam)
}

// =====================================================
// 🚀 SERVER START KARNA
// =====================================================
// Server ko start karte hain aur ek specific port pe listen karne ko kehte hain
// Node.js ka event loop automatically multiple clients ko handle kar lega
// (Yeh ek bonus feature hai - concurrent request handling!)
// =====================================================
server.listen(PORT, () => {
    // server.listen() = server ko start karo aur PORT pe suno
    // Callback function = jab server start ho jaye, ye chalega
    
    console.log(`🚀 Server port ${PORT} pe sun raha hai`);
    console.log(`📡 Test karne ke liye: curl http://localhost:${PORT}/`);
    console.log(`💡 Server ko band karne ke liye: Ctrl+C`);
});

// =====================================================
// 🔄 GRACEFUL SHUTDOWN
// =====================================================
// Agar server band karna ho (Ctrl+C press karo)
// Toh properly close karo (graceful shutdown)
// =====================================================
process.on('SIGINT', () => {
    // SIGINT = Signal Interrupt (Ctrl+C press karne pe)
    // process.on() = jab ye signal aaye, ye function chalao
    
    console.log('\n👋 Server band ho raha hai...');
    
    // server.close() = server ko properly close karo
    // Callback = jab close ho jaye, ye function chalao
    server.close(() => {
        console.log('✅ Server safely band ho gaya');
        process.exit(0); // Process ko exit karo (0 = success)
    });
});
