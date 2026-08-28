const fs = require("fs");
let content = fs.readFileSync("src/app/admin/categories/page.tsx", "utf8");

const startTag = "  const reorderMutation = useMutation({";
const endTag =
  "    if (updates.length) reorderMutation.mutate(updates);\r\n  };";

const s = content.indexOf(startTag);
const e = content.indexOf(endTag) + endTag.length;

if (s === -1 || e < endTag.length) {
  console.error("Markers not found, s=" + s + " e=" + e);
  process.exit(1);
}

const newBlock = [
  "  const reorderMutation = useMutation({",
  "    mutationFn: async (updates: { id: string; sortOrder: number }[]) => {",
  '      const res = await fetch("/api/admin/categories/reorder", {',
  '        method: "PATCH",',
  '        headers: { "Content-Type": "application/json" },',
  "        body: JSON.stringify({ updates }),",
  "      });",
  '      if (!res.ok) throw new Error("Reorder failed");',
  "    },",
  "    onError: () => {",
  '      toast.error("Reorder failed \u2014 please refresh");',
  '      qc.invalidateQueries({ queryKey: ["admin-categories"] });',
  "    },",
  "    onSettled: () => {",
  '      qc.invalidateQueries({ queryKey: ["admin-categories"] });',
  "    },",
  "  });",
  "",
  "  const handleDragEnd = (event: DragEndEvent) => {",
  "    const { active, over } = event;",
  "    if (!over || active.id === over.id) return;",
  "    const oldIdx = categories.findIndex((c) => c._id === active.id);",
  "    const newIdx = categories.findIndex((c) => c._id === over.id);",
  "    const reordered = arrayMove(categories, oldIdx, newIdx);",
  "",
  "    // Optimistic update \u2014 assign correct sortOrder (1-based)",
  "    const withNewOrder = reordered.map((item, idx) => ({",
  "      ...item,",
  "      sortOrder: idx + 1,",
  "    }));",
  '    qc.setQueryData<Category[]>(["admin-categories"], withNewOrder);',
  "",
  "    // Single bulk request",
  "    const updates = withNewOrder.map(({ _id, sortOrder }) => ({",
  "      id: _id,",
  "      sortOrder,",
  "    }));",
  "    reorderMutation.mutate(updates);",
  "  };",
].join("\n");

content = content.slice(0, s) + newBlock + content.slice(e);
fs.writeFileSync("src/app/admin/categories/page.tsx", content, "utf8");
console.log("Done");
