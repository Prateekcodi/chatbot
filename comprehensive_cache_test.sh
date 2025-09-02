#!/bin/bash

# Comprehensive test script for chatbot API caching functionality
API_URL="https://chatbot-1-u7m0.onrender.com/api/ask"

echo "=== Comprehensive Cache Testing for Chatbot API ==="
echo

# Function to make API call and format response
test_question() {
    local question="$1"
    local description="$2"
    
    echo "Test: $description"
    echo "Question: '$question'"
    
    response=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{\"prompt\":\"$question\"}")
    
    # Extract processing time and cached status
    processing_time=$(echo "$response" | grep -o '"processingTime":"[^"]*"' | cut -d'"' -f4)
    cached_status=""
    if [[ "$processing_time" == *"cached"* ]]; then
        cached_status="✅ CACHED"
    else
        cached_status="❌ NOT CACHED"
    fi
    
    echo "Result: $cached_status ($processing_time)"
    echo "---"
    echo
}

echo "🧪 TESTING BASIC SIMILAR QUESTIONS"
echo "=================================="

# Test 1: Basic word order variations
test_question "what is your name" "First call - should not be cached"
test_question "your name is what" "Word order variation - should be cached"
test_question "name what is your" "Another word order - should be cached"

echo "🧪 TESTING ARTICLE VARIATIONS"
echo "============================="

# Test 2: Article variations
test_question "what is the weather" "First call with article - should not be cached"
test_question "what is weather" "Without article - should be cached"
test_question "what is a weather" "Different article - should be cached"

echo "🧪 TESTING TYPO AND REPEATED LETTERS"
echo "===================================="

# Test 3: Typo and repeated letter variations
test_question "hello there" "First call - should not be cached"
test_question "helllo there" "Repeated letters - should be cached"
test_question "hello thereee" "Repeated letters - should be cached"
test_question "hiiii there" "Multiple repeated letters - should be cached"

echo "🧪 TESTING PUNCTUATION VARIATIONS"
echo "================================="

# Test 4: Punctuation variations
test_question "how are you" "First call - should not be cached"
test_question "how are you?" "With question mark - should be cached"
test_question "how are you!!!" "Multiple punctuation - should be cached"
test_question "how are you..." "With ellipsis - should be cached"

echo "🧪 TESTING SYNONYM VARIATIONS"
echo "============================="

# Test 5: Synonym variations (these might not match due to different words)
test_question "what is your age" "First call - should not be cached"
test_question "how old are you" "Synonym variation - might not be cached (different words)"
test_question "what is your age" "Exact repeat - should be cached"

echo "🧪 TESTING CASE VARIATIONS"
echo "=========================="

# Test 6: Case variations
test_question "WHAT IS YOUR NAME" "All caps - should be cached"
test_question "What Is Your Name" "Title case - should be cached"
test_question "what is your name" "Lowercase - should be cached"

echo "🧪 TESTING SPACING VARIATIONS"
echo "============================="

# Test 7: Spacing variations
test_question "what   is   your   name" "Multiple spaces - should be cached"
test_question "  what is your name  " "Leading/trailing spaces - should be cached"
test_question "what is your name" "Normal spacing - should be cached"

echo "🧪 TESTING COMPLEX SIMILAR QUESTIONS"
echo "===================================="

# Test 8: Complex similar questions
test_question "tell me about yourself" "First call - should not be cached"
test_question "can you tell me about yourself" "With 'can you' - might not be cached"
test_question "please tell me about yourself" "With 'please' - might not be cached"
test_question "tell me about yourself" "Exact repeat - should be cached"

echo "🧪 TESTING QUESTION FORMAT VARIATIONS"
echo "====================================="

# Test 9: Question format variations
test_question "what can you do" "First call - should not be cached"
test_question "what are you able to do" "Different format - might not be cached"
test_question "what can you do" "Exact repeat - should be cached"

echo "=== Test Complete ==="
echo "Summary:"
echo "- ✅ CACHED = Question was served from cache (good!)"
echo "- ❌ NOT CACHED = Question called AI APIs (expected for first time or different meanings)"
echo "- Questions with same words in different orders should be cached"
echo "- Questions with articles added/removed should be cached"
echo "- Questions with repeated letters should be cached"
echo "- Questions with different punctuation should be cached"