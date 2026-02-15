import { useState, useEffect, useMemo } from "react";
import { useSalesAnalytics } from "@/hooks/use-sales";
import { useAuth } from "@/hooks/use-auth";
import { useFirestorePlatforms } from "@/hooks/use-firestore-platforms";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/use-products";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Pencil, Trash2, Loader2, Package } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema, type InsertProduct, type Product } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

// Form schema with coercion for numeric inputs
const productFormSchema = insertProductSchema.extend({
  price: z.string().transform((val) => val).pipe(z.coerce.number().min(0)),
});

type ProductFormData = z.infer<typeof productFormSchema>;

const parseCSV = (csv: string) => {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return headers.reduce((obj: any, header, i) => {
      obj[header.trim()] = values[i]?.trim();
      return obj;
    }, {});
  });
};

const generateDailyDataFromCSV = (salesData: any[]) => {
  const grouped = salesData.reduce((acc: any, row) => {
    const date = row.date;
    if (!acc[date]) acc[date] = { revenue: 0, units: 0, profit: 0 };
    acc[date].revenue += parseFloat(row.revenue || 0);
    acc[date].units += parseInt(row.units_sold || 0);
    acc[date].profit += (parseFloat(row.revenue || 0) - (parseFloat(row.cost_price || 0) * parseInt(row.units_sold || 0)));
    return acc;
  }, {});

  const data = Object.entries(grouped).map(([date, vals]: [string, any]) => ({
    date,
    label: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    revenue: Math.round(vals.revenue),
    units: Math.round(vals.units),
    profit: Math.round(vals.profit),
    margin: vals.revenue > 0 ? Math.round((vals.profit / vals.revenue) * 100 * 10) / 10 : 0,
  }));

  return data;
};

const AnimatedNumber = ({ value, prefix = "", suffix = "", decimals = 0 }: any) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 1200;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  const fmt = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString();
  return <span>{prefix}{fmt}{suffix}</span>;
};

const KPICard = ({ label, value, prefix = "", suffix = "", decimals = 0 }: any) => (
  <div className="bg-card border-2 border-primary/20 rounded-xl p-5 shadow-sm">
    <div className="text-xs text-muted-foreground mb-2 uppercase font-medium">{label}</div>
    <div className="text-3xl font-bold text-foreground">
      <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
    </div>
  </div>
);

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: salesAnalytics } = useSalesAnalytics();
  const { user } = useAuth();
  const { platforms: availablePlatforms } = useFirestorePlatforms();

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );
  const amazonProducts = (products || []).filter(p => p.marketplace === "Amazon");
  const flipkartProducts = (products || []).filter(p => p.marketplace === "Flipkart");
  const salesByProduct = salesAnalytics?.salesByProduct || [];
  const amazonProductIds = new Set(amazonProducts.map(p => p.id));
  const flipkartProductIds = new Set(flipkartProducts.map(p => p.id));
  const amazonMetrics = {
    revenue: salesByProduct.filter(s => amazonProductIds.has(s.productId)).reduce((sum, s) => sum + s.revenue, 0),
    units: salesByProduct.filter(s => amazonProductIds.has(s.productId)).reduce((sum, s) => sum + s.units, 0),
  };
  const flipkartMetrics = {
    revenue: salesByProduct.filter(s => flipkartProductIds.has(s.productId)).reduce((sum, s) => sum + s.revenue, 0),
    units: salesByProduct.filter(s => flipkartProductIds.has(s.productId)).reduce((sum, s) => sum + s.units, 0),
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground">Products load automatically from the database.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setEditingProduct(null); setIsDialogOpen(true); }} className="shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      {amazonProducts.length === 0 && flipkartProducts.length === 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <p className="text-muted-foreground">No products available.</p>
        </div>
      )}

      <div className="flex items-center space-x-2 bg-card p-1 rounded-xl border shadow-sm max-w-sm">
        <Search className="w-4 h-4 ml-3 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-0 focus-visible:ring-0 bg-transparent"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        {availablePlatforms.includes("Amazon") && amazonProducts.length > 0 && (
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="p-4 border-b bg-muted/10 flex justify-between items-center">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#FF9900]" /> Amazon Products
              </h3>
              <div className="text-sm text-muted-foreground">
                Total Revenue: <span className="font-bold text-foreground">₹{amazonMetrics.revenue.toLocaleString()}</span>
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : amazonProducts.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center p-4">No products found</TableCell></TableRow>
                  ) : (
                    amazonProducts?.map((product) => {
                      const stats = (salesByProduct.find(s => s.productId === product.id) || { revenue: 0, profit: 0, units: 0 }) as any;
                      const margin = stats.revenue > 0 ? Math.round((stats.profit / stats.revenue) * 100) : 0;
                      return (
                        <TableRow key={product.id} className="group">
                          <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                          <TableCell>
                            <div className="font-medium">{product.product_title || product.name}</div>
                            <div className="text-xs text-muted-foreground">{product.brand}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            {product.your_price ? `₹${Number(product.your_price).toLocaleString()}` : `₹${Number(product.price).toLocaleString()}`}
                          </TableCell>
                          <TableCell className="text-right font-medium">{product.stock_count || "-"}</TableCell>

                          {/* Analysis Columns */}
                          <TableCell className="text-right text-green-600 font-medium">₹{Math.round(stats.revenue).toLocaleString()}</TableCell>
                          <TableCell className="text-right text-blue-600">₹{Math.round(stats.profit).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${margin > 20 ? 'bg-green-100 text-green-800' : margin > 10 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              {margin}%
                            </span>
                          </TableCell>

                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${product.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                              {product.status || "Unknown"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                onClick={() => { setEditingProduct(product); setIsDialogOpen(true); }}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <DeleteProductButton id={product.id} />
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {availablePlatforms.includes("Flipkart") && flipkartProducts.length > 0 && (
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="p-4 border-b bg-muted/10 flex justify-between items-center">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#2874F0]" /> Flipkart Products
              </h3>
              <div className="text-sm text-muted-foreground">
                Total Revenue: <span className="font-bold text-foreground">₹{flipkartMetrics.revenue.toLocaleString()}</span>
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : flipkartProducts.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center p-4">No products found</TableCell></TableRow>
                  ) : (
                    flipkartProducts?.map((product) => {
                      const stats = (salesByProduct.find(s => s.productId === product.id) || { revenue: 0, profit: 0, units: 0 }) as any;
                      const margin = stats.revenue > 0 ? Math.round((stats.profit / stats.revenue) * 100) : 0;
                      return (
                        <TableRow key={product.id} className="group">
                          <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                          <TableCell>
                            <div className="font-medium">{product.product_title || product.name}</div>
                            <div className="text-xs text-muted-foreground">{product.brand}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            {product.selling_price ? `₹${Number(product.selling_price).toLocaleString()}` : `₹${Number(product.price).toLocaleString()}`}
                          </TableCell>
                          <TableCell className="text-right font-medium">{product.stock_count || "-"}</TableCell>

                          {/* Analysis Columns */}
                          <TableCell className="text-right text-green-600 font-medium">₹{Math.round(stats.revenue).toLocaleString()}</TableCell>
                          <TableCell className="text-right text-blue-600">₹{Math.round(stats.profit).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${margin > 20 ? 'bg-green-100 text-green-800' : margin > 10 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              {margin}%
                            </span>
                          </TableCell>

                          <TableCell>{product.listing_status || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                onClick={() => { setEditingProduct(product); setIsDialogOpen(true); }}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <DeleteProductButton id={product.id} />
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <ProductDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        initialData={editingProduct}
      />
    </div>
  );
}

function DeleteProductButton({ id }: { id: number }) {
  const { mutate, isPending } = useDeleteProduct();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-destructive"
      disabled={isPending}
      onClick={() => {
        if (confirm("Are you sure you want to delete this product?")) {
          mutate(id);
        }
      }}
    >
      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </Button>
  );
}

function ProductDialog({
  open,
  onOpenChange,
  initialData
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: Product | null;
}) {
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      price: 0,
      description: "",
      marketplace: "Amazon",
    },
  });

  // Reset form when dialog opens/closes or initialData changes
  if (open && initialData && form.getValues("sku") !== initialData.sku) {
    form.reset({
      name: initialData.name,
      sku: initialData.sku,
      price: Number(initialData.price),
      description: initialData.description || "",
      marketplace: initialData.marketplace,
    });
  } else if (open && !initialData && form.getValues("name") !== "") {
    form.reset({
      name: "",
      sku: "",
      price: 0,
      description: "",
      marketplace: "Amazon",
    });
  }

  const onSubmit = (data: ProductFormData) => {
    // Convert price to string as expected by API schema
    const apiData = { ...data, price: String(data.price) };

    if (initialData) {
      updateMutation.mutate(
        { id: initialData.id, ...apiData },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createMutation.mutate(apiData, { onSuccess: () => onOpenChange(false) });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input id="name" {...form.register("name")} placeholder="e.g. Wireless Mouse" />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...form.register("sku")} placeholder="WM-001" />
              {form.formState.errors.sku && (
                <p className="text-sm text-destructive">{form.formState.errors.sku.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...form.register("price")}
              />
              {form.formState.errors.price && (
                <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketplace">Marketplace</Label>
            <select
              id="marketplace"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              {...form.register("marketplace")}
            >
              <option value="Amazon">Amazon</option>
              <option value="Flipkart">Flipkart</option>
              <option value="Meesho">Meesho</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input id="description" {...form.register("description")} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
