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

const PORT = 8080; // Ye wo "darwaza" (port) hai jahan humara server sunega.

// Data store karne ke liye ek simple jagah (jaise ek temporary notepad).
// Agar server restart hua, toh ye sab gayab ho jayega!
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
        console.log('📩 Request Aayi:\n', requestString);

        // 2. REQUEST PARSE KARNA (Samajhna ki wo kya chahte hain)
        // HTTP requests aisi dikhti hain:
        // GET /hello HTTP/1.1  <-- Request Line (Kya chahiye?)
        // Host: localhost      <-- Headers (Extra info)
        //                      <-- Khali Line
        // Body...              <-- Body (Agar kuch data bheja hai)

        // Text ko lines mein tod rahe hain taaki ek-ek karke padh sakein.
        const lines = requestString.split('\r\n');

        // Pehli line humein COMMAND (Method) aur TARGET (Path) batati hai.
        // Example: "GET /data HTTP/1.1"
        const requestLine = lines[0];
        const parts = requestLine.split(' ');
        const method = parts[0]; // e.g., GET, POST
        const path = parts[1];   // e.g., /, /echo, /data

        // 3. BODY NIKAALNA (Jo data unhone bheja)
        // Body hamesha headers aur ek khali line ke baad aati hai.
        // Hum wo khali line dhoond rahe hain.
        let body = '';
        let i = 1;
        while (i < lines.length && lines[i] !== '') {
            i++; // Headers ko abhi skip kar rahe hain (simple rakhne ke liye!)
        }
        // Agar khali line ke baad kuch likha hai, toh wo body hai!
        if (i < lines.length - 1) {
            body = lines.slice(i + 1).join('\r\n');
        }

        // 4. ROUTING (Decide karna ki ab kya karein)
        // Hum check karenge ki user ne kya manga hai (Method + Path).

        // CASE 1: Wo bas home page pe aaye hain ("/")
        if (method === 'GET' && path === '/') {
            const reply = 'Welcome to your custom HTTP Server!';
            sendResponse(socket, 200, 'OK', 'text/plain', reply);
        }

        // CASE 2: Wo chahte hain hum wahi bole jo unhone bola ("/echo?message=hello")
        else if (method === 'GET' && path.startsWith('/echo')) {
            // Humein "message=" ke baad wala text chahiye
            const urlParts = path.split('?');
            const query = new URLSearchParams(urlParts[1]);
            const msg = query.get('message') || 'Kuch toh bolo!';

            sendResponse(socket, 200, 'OK', 'text/plain', `Echo: ${msg}`);
        }

        // CASE 3: Wo data SAVE karna chahte hain (POST /data)
        else if (method === 'POST' && path === '/data') {
            try {
                // Body text hoti hai, usse JavaScript Object (JSON) banate hain.
                const data = JSON.parse(body);
                dataStore.push(data); // List mein save kar liya!

                const reply = JSON.stringify({ status: 'success', message: 'Saved!' });
                sendResponse(socket, 200, 'OK', 'application/json', reply);
            } catch (error) {
                // Agar unhone galat data bheja jo JSON nahi hai
                sendResponse(socket, 400, 'Bad Request', 'text/plain', 'Ye JSON data nahi hai bhai');
            }
        }

        // CASE 4: Wo saara data DEKHNA chahte hain (GET /data)
        else if (method === 'GET' && path === '/data') {
            const reply = JSON.stringify(dataStore);
            sendResponse(socket, 200, 'OK', 'application/json', reply);
        }

        // CASE 5: Wo koi EK specific item chahte hain (GET /data/0)
        else if (method === 'GET' && path.startsWith('/data/')) {
            // Path ke end se ID nikaal rahe hain
            const id = path.split('/')[2];
            const index = parseInt(id);

            if (dataStore[index]) {
                const reply = JSON.stringify(dataStore[index]);
                sendResponse(socket, 200, 'OK', 'application/json', reply);
            } else {
                sendResponse(socket, 404, 'Not Found', 'text/plain', 'Ye item nahi mila');
            }
        }

        // CASE 6: Humein nahi pata ye kaunsa page hai (404)
        else {
            sendResponse(socket, 404, 'Not Found', 'text/plain', 'Page nahi mila');
        }
    });

    // EVENT: Client chala gaya
    socket.on('end', () => {
        console.log('👋 Client disconnected');
    });
});

// =====================================================
// 🛠️ HELPER FUNCTION: RESPONSE BHEJNA
// =====================================================
// Ye function official HTTP response banata hai.
// Ye client ko ek formal letter likhne jaisa hai.
function sendResponse(socket, statusCode, statusText, contentType, content) {
    const response = [
        `HTTP/1.1 ${statusCode} ${statusText}`,  // 1. Status Line (e.g., "200 OK")
        `Date: ${new Date().toUTCString()}`,     // 2. Time kya hua hai
        `Content-Type: ${contentType}`,          // 3. Ye data kis type ka hai? (JSON? Text?)
        `Content-Length: ${Buffer.byteLength(content)}`, // 4. Message kitna bada hai?
        'Connection: close',                     // 5. Baat khatam, phone kaat do
        'Access-Control-Allow-Origin: *',        // 6. Kisi ko bhi use karne do (CORS)
        '',                                      // 7. KHALI LINE (Zaroori hai!)
        content                                  // 8. Asli maal (Data)
    ].join('\r\n'); // Lines ko jod rahe hain

    socket.write(response); // Taar (wire) ke through bhej diya!
    socket.end();           // Phone kaat diya.
}

// Server start karo!
server.listen(PORT, () => {
    console.log(`🚀 Server port ${PORT} pe sun raha hai`);
});
