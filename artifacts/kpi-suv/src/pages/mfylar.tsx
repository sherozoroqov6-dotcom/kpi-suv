import { useState } from "react";
import { useLang } from "@/lib/lang-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, MapPin, Search, X } from "lucide-react";
import { customFetch, useGetMe } from "@workspace/api-client-react";
import { useRegion } from "@/lib/region-context";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Mfy {
  id: number;
  name: string;
  tuman: string;
  viloyat: string;
  active: boolean;
  createdAt: string;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");


export default function Mfylar() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t, d } = useLang();
  const { selectedTuman, showAllTumans, viloyatTumanlar } = useRegion();
  const { data: currentUser } = useGetMe();
  const canEdit = currentUser?.role !== "employee";
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Mfy | null>(null);
  const [formName, setFormName] = useState("");

  const { data: mfylar = [], isLoading } = useQuery({
    queryKey: ["mfylar", selectedTuman, showAllTumans, viloyatTumanlar.join(",")],
    queryFn: () => {
      const p = new URLSearchParams();
      if (showAllTumans && viloyatTumanlar.length > 0) {
        p.set("tumans", viloyatTumanlar.join(","));
      } else if (selectedTuman) {
        p.set("tuman", encodeURIComponent(selectedTuman));
      }
      const qs = p.toString();
      return customFetch<Mfy[]>(`${BASE}/api/mfylar${qs ? `?${qs}` : ""}`);
    },
    staleTime: 0,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      customFetch<Mfy>(`${BASE}/api/mfylar`, {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mfylar"] });
      toast({ title: t("toast_success"), description: t("toast_mfy_added") });
      setDialogOpen(false);
      setFormName("");
    },
    onError: () => toast({ title: t("toast_error"), variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      customFetch<Mfy>(`${BASE}/api/mfylar/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name, tuman: editing?.tuman, viloyat: editing?.viloyat, active: editing?.active }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mfylar"] });
      toast({ title: t("toast_success"), description: t("toast_mfy_updated") });
      setDialogOpen(false);
      setEditing(null);
      setFormName("");
    },
    onError: () => toast({ title: t("toast_error"), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      customFetch(`${BASE}/api/mfylar/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mfylar"] });
      toast({ title: t("toast_success"), description: t("toast_mfy_deleted") });
      setDeleteId(null);
    },
    onError: () => toast({ title: t("toast_error"), variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    setFormName("");
    setDialogOpen(true);
  };

  const openEdit = (mfy: Mfy) => {
    setEditing(mfy);
    setFormName(mfy.name);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formName.trim()) return;
    if (editing) {
      updateMutation.mutate({ id: editing.id, name: formName.trim() });
    } else {
      createMutation.mutate(formName.trim());
    }
  };

  const filtered = mfylar.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={t("pg_mfylar")}
        description={
          selectedTuman
            ? `${selectedTuman} hududlari — jami ${mfylar.length} ta`
            : `${t("pg_mfylar_desc")} — jami ${mfylar.length} ta`
        }
      />

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("mfy_search_ph")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("lbl_new_mfy")}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">{t("loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 border rounded-lg">
          {search ? `"${search}" — ${t("lbl_mfy_not_found")}` : t("lbl_mfy_not_found")}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1565C0] text-white">
                <th className="text-left px-4 py-3 font-medium w-10">#</th>
                <th className="text-left px-4 py-3 font-medium">{t("mfy_name_label")}</th>
                <th className="text-left px-4 py-3 font-medium">{t("lbl_tuman")}</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((mfy, idx) => (
                <tr
                  key={mfy.id}
                  className="border-t hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-2.5 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-2.5 font-medium">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                      {d(mfy.name)}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline" className="text-xs font-normal">
                      {mfy.tuman}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    {canEdit && (
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(mfy)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(mfy.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground">
            {t("lbl_total")}: {filtered.length}{search ? ` (${mfylar.length} ${t("lbl_filtered")})` : ""}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditing(null); setFormName(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? t("dlg_edit_mfy") : t("dlg_new_mfy")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="mfy-name">{t("mfy_name_label")}</Label>
              <Input
                id="mfy-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("mfy_name_ph")}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("btn_cancel")}</Button>
            <Button
              onClick={handleSubmit}
              disabled={!formName.trim() || createMutation.isPending || updateMutation.isPending}
            >
              {editing ? t("btn_save") : t("btn_add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("btn_delete")} — MFY</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete_confirm_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("btn_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t("btn_delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
