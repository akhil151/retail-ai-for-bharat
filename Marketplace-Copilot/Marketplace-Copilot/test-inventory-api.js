// Test script to verify inventory optimization endpoint
// Run this in browser console while logged in

async function testInventoryOptimization() {
    console.log('Testing /api/inventory-optimization endpoint...');

    try {
        const response = await fetch('/api/inventory-optimization', {
            credentials: 'include'
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const text = await response.text();
            console.error('Error response:', text);
            return;
        }

        const data = await response.json();
        console.log('Success! Data received:');
        console.log('- Items count:', data.items?.length || 0);
        console.log('- Total stock value:', data.metrics?.total_stock_value);
        console.log('- Generated at:', data.generated_at);

        if (data.items && data.items.length > 0) {
            console.log('Sample item:', data.items[0]);

            // Check if charts would have data
            const stockVsDemand = data.items.filter(i => i.current_stock > 0 || i.predicted_30d_demand > 0);
            const turnoverData = data.items.filter(i => i.turnover_ratio > 0);
            const profitData = data.items.filter(i => i.profit_margin > 0);
            const decisions = data.items.reduce((acc, i) => {
                acc[i.decision] = (acc[i.decision] || 0) + 1;
                return acc;
            }, {});

            console.log('\nChart Data Availability:');
            console.log('- Stock vs Demand items:', stockVsDemand.length);
            console.log('- Turnover items:', turnoverData.length);
            console.log('- Profit items:', profitData.length);
            console.log('- Decisions:', decisions);
        } else {
            console.warn('No items returned! Charts will be empty.');
        }

        return data;
    } catch (error) {
        console.error('Request failed:', error);
    }
}

// Run the test
testInventoryOptimization();
