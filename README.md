# 🚀 HTTP Server from Scratch

> A lightweight, dependency-free HTTP/1.1 server implementation in Node.js, built to demonstrate low-level networking concepts.

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![No Frameworks](https://img.shields.io/badge/No_Frameworks-Zero_Dependencies-crimson?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![Open Source](https://img.shields.io/badge/Open_Source-Love-ff69b4?style=for-the-badge)
![Built with Heart](https://img.shields.io/badge/Built%20With-❤️-red?style=for-the-badge)

## 📖 Overview

This project is a raw implementation of an HTTP server using Node.js's native `net` module. It bypasses high-level frameworks like Express or Fastify to interact directly with TCP sockets. The server manually handles:
- **Socket Programming**: Managing TCP connections.
- **Protocol Parsing**: Decoding HTTP methods, headers, and bodies from raw buffers.
- **Response Formatting**: Constructing valid HTTP/1.1 responses byte-by-byte.

It serves as an educational tool to understand the magic happening under the hood of modern web servers.

---

## ✨ Features

### Core Functionality
- **Custom HTTP Parser**: Parses Request Lines, Headers, and Body without libraries.
- **RESTful Routing**: Supports dynamic routing for `GET`, `POST`, `PUT`, and `DELETE` requests.
- **Header Parsing**: Properly parses HTTP headers (Host, Content-Type, Content-Length, etc.).
- **In-Memory Database**: Ephemeral data storage for demonstration.
- **Query Parameter Parsing**: Handles URL query strings manually.
- **Status Code Handling**: Supports 200, 400, 404, and 500 status codes.

### Bonus Features
- **📝 Request Logging**: Logs every incoming request with method and path to the console.
- **🌐 CORS Support**: Full CORS support with preflight (OPTIONS) handling for all origins.
- **🛡️ Error Handling**: Graceful handling of 404s, 400s, 413s, 500s, and JSON parsing errors.
- **⚡ Concurrent Request Handling**: Node.js event loop handles multiple clients concurrently.
- **🔄 Graceful Shutdown**: Properly handles server shutdown with Ctrl+C.
- **🔒 Request Body Size Limits**: 1MB maximum body size to prevent DoS attacks.
- **✅ Request Validation**: Validates request format, headers, and body before processing.
- **📊 Better Error Messages**: Detailed error messages for debugging.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Modules**: `net` (Standard Library)
- **Dependencies**: None (0 external packages)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v14 or higher recommended)

### Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Run the Server**
    ```bash
    node index.js
    ```
    *The server will start listening on port `8080`.*

---

## 📡 API Reference

### 1. Health Check
Verifies that the server is running.
- **Endpoint**: `GET /`
- **Response**: `200 OK`
- **Body**: `Welcome to HTTP Server from Scratch!`

### 2. Echo Service
Reflects the input message back to the client.
- **Endpoint**: `GET /echo?message=<text>`
- **Example**: `GET /echo?message=Hello`
- **Response**: `200 OK`
- **Body**: `Echo: Hello`

### 3. Store Data
Saves a JSON object to the in-memory store.
- **Endpoint**: `POST /data`
- **Headers**: `Content-Type: application/json`
- **Body**:
    ```json
    {
      "name": "Sample Item",
      "value": 42
    }
    ```
- **Response**: `200 OK`
- **Body**: `{"status": "success", "message": "Data stored"}`

### 4. Retrieve All Data
Fetches all stored items.
- **Endpoint**: `GET /data`
- **Response**: `200 OK`
- **Body**: `[{"name": "Sample Item", "value": 42}, ...]`

### 5. Retrieve Item by ID
Fetches a specific item by its index.
- **Endpoint**: `GET /data/:id`
- **Example**: `GET /data/0`
- **Response**: `200 OK` or `404 Not Found`

### 6. Update Item by ID
Updates an existing item by its index.
- **Endpoint**: `PUT /data/:id`
- **Headers**: `Content-Type: application/json`
- **Body**: JSON object with new data
- **Example**: `PUT /data/0` with body `{"name": "Updated", "value": 999}`
- **Response**: `200 OK` with updated data or `404 Not Found` or `400 Bad Request`

### 7. Delete Item by ID
Deletes an item by its index.
- **Endpoint**: `DELETE /data/:id`
- **Example**: `DELETE /data/0`
- **Response**: `200 OK` with deleted item or `404 Not Found` or `400 Bad Request`

---

## 🧪 Testing

You can test the server using the provided shell script or standard tools like `curl`.

### Automated Test Script
Run the included test suite to verify all endpoints:
```bash
sh test_server.sh
```

### Manual Testing with cURL
```bash
# POST Data
curl -X POST http://localhost:8080/data \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","value":123}'

# GET Data
curl http://localhost:8080/data
```

---

## 📐 Design Decisions

| Decision | Rationale |
| :--- | :--- |
| **`net` Module** | Chosen over `http` module to force manual implementation of protocol parsing, satisfying the assignment's core objective. |
| **Event-Driven Architecture** | Leverages Node.js's event loop for concurrency. While the parsing is synchronous, the I/O is non-blocking, allowing multiple clients to connect simultaneously. |
| **In-Memory Store** | A simple array (`[]`) is used for storage to avoid external database dependencies and keep the setup zero-config. Data is ephemeral and lost on server restart. |
| **Manual Header Parsing** | Headers are parsed manually by splitting on `:` and storing in an object. This demonstrates low-level HTTP understanding. |
| **PUT & DELETE Methods** | Implemented to satisfy the requirement of supporting at least one of PUT/DELETE/PATCH. Both PUT and DELETE are implemented for completeness. |
| **Error Handling** | All routes are wrapped in try-catch blocks to handle unexpected errors and return proper 500 status codes. |
| **Sync Parsing** | Request parsing is done synchronously for simplicity. In a production server, this would be streamed to handle large bodies. |
| **Request Validation** | Validates request line format, HTTP version, and request structure before processing. |
| **Body Size Limits** | Implements 1MB body size limit to prevent DoS attacks and memory exhaustion. |
| **OPTIONS Method** | Supports OPTIONS method for CORS preflight requests from browsers. |
| **Path Parsing** | Properly separates path from query parameters and validates path structure. |
| **Content-Type Validation** | Validates Content-Type header for POST/PUT requests to ensure JSON format. |

---

## 📂 Project Structure

```
.
├── index.js         # Main server entry point (Logic & Routing)
├── test_server.sh   # Shell script for automated testing
└── README.md        # Project documentation
```

---

## 🤝 Contributing

Contributions are always welcome!

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/yourusername">Your Name</a></sub>
</div>
