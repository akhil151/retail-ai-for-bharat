import { useCallback, useState } from "react";
import { useUploads, useUploadFile } from "@/hooks/use-uploads";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

export default function Uploads() {
  const { data: uploads, isLoading: isListLoading } = useUploads();
  const { mutate: uploadFile, isPending: isUploading } = useUploadFile();
  const [platformProducts, setPlatformProducts] = useState("Amazon");
  const [platformSales, setPlatformSales] = useState("Amazon");

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
      // Reset input
      e.target.value = "";
    }
  }, [uploadFile]);

  const handleUploadProducts = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    await fetch(`/api/uploads/products?platform=${encodeURIComponent(platformProducts)}`, {
      method: "POST",
      credentials: "include",
      body: form
    });
    e.target.value = "";
  };

  const handleUploadSales = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    await fetch(`/api/uploads/sales?platform=${encodeURIComponent(platformSales)}`, {
      method: "POST",
      credentials: "include",
      body: form
    });
    e.target.value = "";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Data Upload</h1>
        <p className="text-muted-foreground">Import your sales history CSV files.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload Products */}
        <Card className="border-dashed border-2 shadow-sm">
          <CardHeader>
            <CardTitle>Upload Products CSV</CardTitle>
            <CardDescription>
              Choose platform and upload products CSV.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              {isUploading ? (
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              ) : (
                <UploadCloud className="w-10 h-10 text-primary" />
              )}
            </div>
            <div className="mb-4">
              <select
                className="flex h-9 w-48 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={platformProducts}
                onChange={(e) => setPlatformProducts(e.target.value)}
              >
                <option>Amazon</option>
                <option>Flipkart</option>
                <option>Meesho</option>
              </select>
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {isUploading ? "Uploading..." : "Click to browse or drag file"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">
              Max file size 10MB. accepted formats: .csv
            </p>
            
            <div className="relative">
              <Button disabled={isUploading}>
                Select Products CSV
              </Button>
              <input 
                type="file" 
                accept=".csv"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                disabled={isUploading}
                onChange={handleUploadProducts}
              />
            </div>
          </CardContent>
        </Card>

        {/* Upload Sales */}
        <Card className="bg-secondary/20 shadow-sm border-none">
          <CardHeader>
            <CardTitle>Upload Sales CSV</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              {isUploading ? (
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              ) : (
                <UploadCloud className="w-10 h-10 text-primary" />
              )}
            </div>
            <div className="mb-4">
              <select
                className="flex h-9 w-48 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={platformSales}
                onChange={(e) => setPlatformSales(e.target.value)}
              >
                <option>Amazon</option>
                <option>Flipkart</option>
                <option>Meesho</option>
              </select>
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {isUploading ? "Uploading..." : "Click to browse or drag file"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">
              Max file size 10MB. accepted formats: .csv
            </p>
            <div className="relative">
              <Button disabled={isUploading}>
                Select Sales CSV
              </Button>
              <input 
                type="file" 
                accept=".csv"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                disabled={isUploading}
                onChange={handleUploadSales}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload History */}
      <Card>
        <CardHeader>
          <CardTitle>Upload History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isListLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : uploads?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No uploads yet.
                  </TableCell>
                </TableRow>
              ) : (
                uploads?.map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-green-600" />
                      {upload.filename}
                    </TableCell>
                    <TableCell>
                      {upload.createdAt && format(new Date(upload.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={upload.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                      {upload.error || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
        <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
        <AlertCircle className="w-3 h-3 mr-1" /> Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
      <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing
    </span>
  );
}
