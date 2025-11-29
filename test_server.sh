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

echo "\n\n7. Testing 404"
curl -v http://localhost:8080/nonexistent

echo "\n\nTests Completed."
