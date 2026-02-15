import fetch from 'node-fetch';

async function testAPI() {
  try {
    console.log('Testing /api/inventory-optimization endpoint...\n');
    
    const response = await fetch('http://localhost:5000/api/inventory-optimization', {
      headers: {
        'Cookie': 'connect.sid=test'
      }
    });
    
    if (!response.ok) {
      console.error('❌ API returned error:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }
    
    const data = await response.json();
    
    console.log('✅ API Response received');
    console.log('Items count:', data?.items?.length || 0);
    
    if (data?.items?.length > 0) {
      console.log('\nSample item:');
      const item = data.items[0];
      console.log('  SKU:', item.sku);
      console.log('  Product:', item.product_name);
      console.log('  Current Stock:', item.current_stock);
      console.log('  Predicted Demand:', item.predicted_30d_demand);
      console.log('  Decision:', item.decision);
      console.log('  Turnover Ratio:', item.turnover_ratio);
      
      console.log('\n✅ Data structure is correct!');
      console.log('Charts should display with this data.');
    } else {
      console.log('⚠️  No items in response');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the server is running: npm run dev');
  }
}

testAPI();
