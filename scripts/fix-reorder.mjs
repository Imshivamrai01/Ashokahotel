import fs from "fs";

const filePath = "src/app/admin/categories/page.tsx";
let content = fs.readFileSync(filePath, "utf-8");

const startMarker = "  const reorderMutation = useMutation({";
const endMarker =
  "    if (updates.length) reorderMutation.mutate(updates);\n  };";

const s = content.indexOf(startMarker);
const e = content.indexOf(endMarker) + endMarker.length;

if (s === -1 || e === -1) {
  console.error("Markers not found");
  process.exit(1);
}

const replacement = `  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; sortOrder: number }[]) => {
      const res = await fetch("/api/admin/categories/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error("Reorder failed");
    },
    onError: () => {
      toast.error("Reorder failed \u2014 please refresh");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = categories.findIndex((c) => c._id === active.id);
    const newIdx = categories.findIndex((c) => c._id === over.id);
    const reordered = arrayMove(categories, oldIdx, newIdx);

    // Optimistic update \u2014 assign correct sortOrder (1-based)
    const withNewOrder = reordered.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }));
    qc.setQueryData<Category[]>(["admin-categories"], withNewOrder);

    // Single bulk request
    const updates = withNewOrder.map(({ _id, sortOrder }) => ({
      id: _id,
      sortOrder,
    }));
    reorderMutation.mutate(updates);
  };`;

content = content.slice(0, s) + replacement + content.slice(e);
fs.writeFileSync(filePath, content, "utf-8");
console.log("Done");
