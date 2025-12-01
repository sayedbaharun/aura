import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import CreateVentureModal from "./create-venture-modal";

interface Venture {
  id: string;
  name: string;
  status: string;
  oneLiner: string | null;
  domain: string;
  primaryFocus: string | null;
  color: string | null;
  icon: string | null;
}

interface VentureDetailHeaderProps {
  venture: Venture;
}

export default function VentureDetailHeader({ venture }: VentureDetailHeaderProps) {
  const [, setLocation] = useLocation();
  const [showEditModal, setShowEditModal] = useState(false);
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/ventures/${venture.id}`);
      if (!res.ok) {
        throw new Error("Failed to delete venture");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ventures"] });
      toast({
        title: "Success",
        description: "Venture deleted successfully",
      });
      setLocation("/ventures");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete venture",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "development":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "paused":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "archived":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getDomainColor = (domain: string) => {
    switch (domain) {
      case "saas":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "media":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400";
      case "realty":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "trading":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
      case "personal":
        return "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  return (
    <>
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => setLocation("/ventures")}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Ventures
        </Button>

        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              {venture.icon && <span className="text-4xl">{venture.icon}</span>}
              <h1 className="text-3xl font-bold tracking-tight">{venture.name}</h1>
            </div>

            {venture.oneLiner && (
              <p className="text-lg text-muted-foreground">{venture.oneLiner}</p>
            )}

            <div className="flex gap-2 flex-wrap">
              <Badge className={getStatusColor(venture.status)} variant="secondary">
                {venture.status}
              </Badge>
              <Badge className={getDomainColor(venture.domain)} variant="secondary">
                {venture.domain}
              </Badge>
            </div>

          </div>

          <div className="flex gap-2">
            <Button onClick={() => setShowEditModal(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Venture
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Venture</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{venture.name}"? This will also delete all associated projects, phases, and tasks. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <CreateVentureModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        venture={venture}
      />
    </>
  );
}
