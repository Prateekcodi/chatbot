#!/bin/bash

# Test script for chatbot API caching functionality
API_URL="https://chatbot-1-u7m0.onrender.com/api/qa/ask"

echo "=== Testing Chatbot API Caching ==="
echo

# Function to make API call and format response
test_question() {
    local question="$1"
    local description="$2"
    
    echo "Test: $description"
    echo "Question: '$question'"
    
    response=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{\"question\":\"$question\"}")
    
    echo "Response: $response"
    echo "---"
    echo
}

# Test 1: First call (should not be cached)
test_question "Hi" "First call - should not be cached"

# Test 2: Exact repeat (should be cached)
test_question "Hi" "Exact repeat - should be cached"

# Test 3: Fuzzy match (should be cached with 0.85 threshold)
test_question "hiii" "Fuzzy match - should be cached"

# Test 4: Different question (should not be cached)
test_question "Hello there" "Different question - should not be cached"

# Test 5: Another fuzzy match for the new question
test_question "hello there!" "Fuzzy match for new question - should be cached"

# Test 6: Very different question (should not be cached)
test_question "What is the weather like?" "Completely different question - should not be cached"

echo "=== Test Complete ==="