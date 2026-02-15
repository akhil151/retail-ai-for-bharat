import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function DebugInventory() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/inventory-optimization"],
    queryFn: async () => {
      const res = await fetch("/api/inventory-optimization", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertDescription>Error: {error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const items = data?.items || [];

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Inventory Optimization Debug</h1>

      <Card>
        <CardHeader>
          <CardTitle>API Response Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Total Items:</strong> {items.length}</p>
            <p><strong>Generated At:</strong> {data?.generated_at || 'N/A'}</p>
            <p><strong>Total Stock Value:</strong> ₹{data?.metrics?.total_stock_value?.toLocaleString() || 0}</p>
          </div>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Sample Item (First Record)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded text-xs overflow-auto">
                {JSON.stringify(items[0], null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stock vs Demand Data (Top 10)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">SKU</th>
                      <th className="text-right p-2">Current Stock</th>
                      <th className="text-right p-2">Predicted Demand</th>
                      <th className="text-left p-2">Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.slice(0, 10).map((item: any) => (
                      <tr key={item.sku} className="border-b">
                        <td className="p-2">{item.sku}</td>
                        <td className="text-right p-2">{item.current_stock}</td>
                        <td className="text-right p-2">{Math.round(item.predicted_30d_demand)}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            item.decision === 'INCREASE' ? 'bg-green-100 text-green-800' :
                            item.decision === 'REDUCE' ? 'bg-amber-100 text-amber-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {item.decision}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {items.length === 0 && (
        <Alert>
          <AlertDescription>
            No items found. Make sure you've run: npm run setup-db
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
