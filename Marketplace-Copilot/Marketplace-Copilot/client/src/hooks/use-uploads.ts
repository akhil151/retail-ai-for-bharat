import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useUploads() {
  return useQuery({
    queryKey: [api.uploads.list.path],
    queryFn: async () => {
      const res = await fetch(api.uploads.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch uploads");
      return api.uploads.list.responses[200].parse(await res.json());
    },
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(api.uploads.create.path, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to upload file");
      }
      return api.uploads.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.uploads.list.path] });
      toast({ title: "Success", description: "File uploaded successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Upload Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });
}
