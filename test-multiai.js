// Simple test script to verify MultiAI Netlify Function
// This can be run locally to test the function

const testMultiAI = async () => {
  try {
    console.log('Testing MultiAI Netlify Function...');
    
    const response = await fetch('/.netlify/functions/multi-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query: 'What is the capital of France?' 
      }),
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    // Check if the response has the expected structure
    if (data.responses && typeof data.responses === 'object') {
      console.log('✅ Response structure is correct');
      console.log('Available AI services:', Object.keys(data.responses));
      
      // Check each AI service response
      Object.entries(data.responses).forEach(([aiName, response]) => {
        console.log(`\n${aiName}:`);
        console.log(`  Success: ${response.success}`);
        if (response.success) {
          console.log(`  Response: ${response.response?.substring(0, 100)}...`);
        } else {
          console.log(`  Error: ${response.error}`);
        }
      });
    } else {
      console.error('❌ Response structure is incorrect');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run the test if this script is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  console.log('Run testMultiAI() in the browser console to test the function');
  window.testMultiAI = testMultiAI;
} else {
  // Node.js environment
  testMultiAI();
}