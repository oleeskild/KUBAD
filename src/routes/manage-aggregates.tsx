import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Star,
  Plus,
  Edit,
  Trash2,
  Settings,
  Download,
  Upload,
  Search,
  Copy,
  Calendar,
  Package2,
} from "lucide-react";
import {
  useSavedAggregates,
  type SavedAggregate,
} from "@/contexts/SavedAggregatesContext";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const Route = createFileRoute("/manage-aggregates")({
  component: ManageAggregates,
});

function ManageAggregates() {
  const { savedAggregates, addAggregate, removeAggregate, updateAggregate } =
    useSavedAggregates();

  // State for create/edit dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAggregate, setEditingAggregate] =
    useState<SavedAggregate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    streamPrefix: "",
    description: "",
  });

  // State for search/filter
  const [searchQuery, setSearchQuery] = useState("");

  // State for bulk operations
  const [selectedAggregates, setSelectedAggregates] = useState<string[]>([]);

  // Reset form
  const resetForm = () => {
    setFormData({ name: "", streamPrefix: "", description: "" });
    setEditingAggregate(null);
    setShowCreateDialog(false);
  };

  // Handle create/edit form submission
  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.streamPrefix.trim()) return;

    if (editingAggregate) {
      // Update existing aggregate
      updateAggregate(editingAggregate.id, {
        name: formData.name.trim(),
        streamPrefix: formData.streamPrefix.trim(),
        description: formData.description.trim() || undefined,
      });
    } else {
      // Create new aggregate
      addAggregate({
        name: formData.name.trim(),
        streamPrefix: formData.streamPrefix.trim(),
        description: formData.description.trim() || undefined,
      });
    }

    resetForm();
  };

  // Handle edit button click
  const handleEdit = (aggregate: SavedAggregate) => {
    setEditingAggregate(aggregate);
    setFormData({
      name: aggregate.name,
      streamPrefix: aggregate.streamPrefix,
      description: aggregate.description || "",
    });
    setShowCreateDialog(true);
  };

  // Handle delete
  const handleDelete = (id: string) => {
    removeAggregate(id);
    setSelectedAggregates((prev) =>
      prev.filter((selectedId) => selectedId !== id)
    );
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    selectedAggregates.forEach((id) => removeAggregate(id));
    setSelectedAggregates([]);
  };

  // Handle select all/none
  const handleSelectAll = () => {
    if (selectedAggregates.length === filteredAggregates.length) {
      setSelectedAggregates([]);
    } else {
      setSelectedAggregates(filteredAggregates.map((agg) => agg.id));
    }
  };

  // Filter aggregates based on search
  const filteredAggregates = savedAggregates.filter(
    (aggregate) =>
      aggregate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      aggregate.streamPrefix
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (aggregate.description &&
        aggregate.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Handle export
  const handleExport = () => {
    const dataStr = JSON.stringify(savedAggregates, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `kubad-aggregates-${format(new Date(), "yyyy-MM-dd")}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  // Handle import
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedData)) {
          importedData.forEach((aggregate: any) => {
            if (aggregate.name && aggregate.streamPrefix) {
              addAggregate({
                name: aggregate.name,
                streamPrefix: aggregate.streamPrefix,
                description: aggregate.description,
              });
            }
          });
        }
      } catch (error) {
        console.error("Error importing aggregates:", error);
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  // Handle copy stream name
  const handleCopyStream = (streamPrefix: string) => {
    navigator.clipboard.writeText(streamPrefix);
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md"></div>
              <div className="relative bg-gradient-to-br from-primary to-primary/90 p-2 rounded-xl shadow-lg">
                <Settings className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            Manage Aggregates
          </h1>
          <p className="text-muted-foreground">
            Create, edit, and organize your saved aggregates for easy access
            across the application
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search aggregates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Aggregate
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingAggregate ? "Edit Aggregate" : "Add New Aggregate"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Enter aggregate name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="streamPrefix">Stream Prefix</Label>
                    <Input
                      id="streamPrefix"
                      value={formData.streamPrefix}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          streamPrefix: e.target.value,
                        }))
                      }
                      placeholder="$ce-MyStream"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Enter description"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      !formData.name.trim() || !formData.streamPrefix.trim()
                    }
                  >
                    {editingAggregate ? "Update" : "Create"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>

            <Button
              variant="outline"
              className="gap-2"
              onClick={() => document.getElementById("import-file")?.click()}
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <input
              id="import-file"
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedAggregates.length > 0 && (
          <Card className="mb-6 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedAggregates.length} aggregate
                  {selectedAggregates.length !== 1 ? "s" : ""} selected
                </span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Delete Selected
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Delete Selected Aggregates
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete{" "}
                        {selectedAggregates.length} aggregate
                        {selectedAggregates.length !== 1 ? "s" : ""}? This
                        action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aggregates Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package2 className="h-5 w-5" />
              Saved Aggregates ({filteredAggregates.length})
            </CardTitle>
            <CardDescription>
              Manage your saved aggregates for quick access across the
              application
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredAggregates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">
                  {searchQuery
                    ? "No aggregates match your search"
                    : "No aggregates saved yet"}
                </p>
                <p className="text-sm">
                  {searchQuery
                    ? "Try a different search term"
                    : "Create your first aggregate to get started"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={
                          selectedAggregates.length ===
                          filteredAggregates.length
                        }
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Stream Prefix</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAggregates.map((aggregate) => (
                    <TableRow key={aggregate.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedAggregates.includes(aggregate.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAggregates((prev) => [
                                ...prev,
                                aggregate.id,
                              ]);
                            } else {
                              setSelectedAggregates((prev) =>
                                prev.filter((id) => id !== aggregate.id)
                              );
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{aggregate.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {aggregate.streamPrefix}
                          </code>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleCopyStream(aggregate.streamPrefix)
                                }
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy stream name</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {aggregate.description || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {format(
                              new Date(aggregate.dateAdded),
                              "MMM d, yyyy"
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(aggregate)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit aggregate</p>
                            </TooltipContent>
                          </Tooltip>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Aggregate
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "
                                  {aggregate.name}"? This action cannot be
                                  undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(aggregate.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
