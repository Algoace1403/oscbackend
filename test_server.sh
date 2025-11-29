#!/bin/bash

echo "Starting Tests..."

echo "\n1. Testing GET /"
curl -v http://localhost:8080/

echo "\n\n2. Testing GET /echo"
curl -v "http://localhost:8080/echo?message=HelloFromCurl"

echo "\n\n3. Testing POST /data"
curl -v -X POST http://localhost:8080/data \
-H "Content-Type: application/json" \
-d '{"name":"Test Item", "value": 123}'

echo "\n\n4. Testing POST /data (Second Item)"
curl -v -X POST http://localhost:8080/data \
-H "Content-Type: application/json" \
-d '{"name":"Another Item", "value": 456}'

echo "\n\n5. Testing GET /data (All)"
curl -v http://localhost:8080/data

echo "\n\n6. Testing GET /data/0 (First Item)"
curl -v http://localhost:8080/data/0

echo "\n\n7. Testing PUT /data/0 (Update First Item)"
curl -v -X PUT http://localhost:8080/data/0 \
-H "Content-Type: application/json" \
-d '{"name":"Updated Item", "value": 999}'

echo "\n\n8. Testing GET /data (Verify Update)"
curl -v http://localhost:8080/data

echo "\n\n9. Testing DELETE /data/0 (Delete First Item)"
curl -v -X DELETE http://localhost:8080/data/0

echo "\n\n10. Testing GET /data (Verify Deletion)"
curl -v http://localhost:8080/data

echo "\n\n11. Testing 404"
curl -v http://localhost:8080/nonexistent

echo "\n\n12. Testing OPTIONS (CORS Preflight)"
curl -v -X OPTIONS http://localhost:8080/data \
-H "Origin: http://example.com" \
-H "Access-Control-Request-Method: POST"

echo "\n\n13. Testing 400 Bad Request (Invalid JSON)"
curl -v -X POST http://localhost:8080/data \
-H "Content-Type: application/json" \
-d '{"invalid": json}'

echo "\n\n14. Testing 400 Bad Request (Empty Body)"
curl -v -X POST http://localhost:8080/data \
-H "Content-Type: application/json" \
-d ''

echo "\n\n15. Testing 400 Bad Request (Wrong Content-Type)"
curl -v -X POST http://localhost:8080/data \
-H "Content-Type: text/plain" \
-d '{"name":"test"}'

echo "\n\nTests Completed."
