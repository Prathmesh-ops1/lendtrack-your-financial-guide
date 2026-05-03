import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, Wallet2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/finance";
import { AddLiabilityDialog } from "@/components/AddLiabilityDialog";
import { EditLiabilityDialog, type EditKind } from "@/components/EditLiabilityDialog";
import { PrepaymentsDialog } from "@/components/PrepaymentsDialog";
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

interface Row {
  id: string;
  primary: string;
  secondary: string;
}

interface Props {
  kind: EditKind;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  userId: string;
  refreshKey: number;
  onChanged: () => void;
}

export function ManageList({ kind, title, icon: Icon, userId, refreshKey, onChanged }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [prepayFor, setPrepayFor] = useState<{ id: string; label: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    if (kind === "loan") {
      const { data } = await supabase
        .from("loans")
        .select("id, bank_name, emi_amount, due_day")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setRows(
        (data ?? []).map((r: any) => ({
          id: r.id,
          primary: r.bank_name,
          secondary: `EMI ${formatCurrency(Number(r.emi_amount))} • Day ${r.due_day}`,
        })),
      );
    } else if (kind === "credit_card") {
      const { data } = await supabase
        .from("credit_cards")
        .select("id, bank_name, outstanding_amount, due_day")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setRows(
        (data ?? []).map((r: any) => ({
          id: r.id,
          primary: r.bank_name,
          secondary: `Outstanding ${formatCurrency(Number(r.outstanding_amount))} • Day ${r.due_day}`,
        })),
      );
    } else {
      const { data } = await supabase
        .from("insurance")
        .select("id, insurance_type, premium_amount, due_day")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setRows(
        (data ?? []).map((r: any) => ({
          id: r.id,
          primary: r.insurance_type,
          secondary: `Premium ${formatCurrency(Number(r.premium_amount))} • Day ${r.due_day}`,
        })),
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, kind, refreshKey]);

  async function confirmDelete() {
    if (!deleteId) return;
    const table =
      kind === "loan" ? "loans" : kind === "credit_card" ? "credit_cards" : "insurance";
    const { error } = await supabase.from(table).delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) return toast.error(error.message);
    toast.success("Deleted.");
    await load();
    onChanged();
  }

  return (
    <Card className="shadow-card-soft">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </div>
        <AddLiabilityDialog
          kind={kind}
          userId={userId}
          onSaved={() => {
            load();
            onChanged();
          }}
        />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No entries yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{r.primary}</div>
                  <div className="truncate text-xs text-muted-foreground">{r.secondary}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {kind === "loan" && (
                    <Button
                      size="icon" variant="ghost" title="Prepayments"
                      onClick={() => setPrepayFor({ id: r.id, label: r.primary })}
                    >
                      <Wallet2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon" variant="ghost" title="Edit"
                    onClick={() => setEditId(r.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon" variant="ghost" title="Delete"
                    onClick={() => setDeleteId(r.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {editId && (
        <EditLiabilityDialog
          kind={kind}
          id={editId}
          open={!!editId}
          onOpenChange={(o) => !o && setEditId(null)}
          onSaved={() => {
            load();
            onChanged();
          }}
        />
      )}

      {prepayFor && (
        <PrepaymentsDialog
          loanId={prepayFor.id}
          loanLabel={prepayFor.label}
          userId={userId}
          open={!!prepayFor}
          onOpenChange={(o) => !o && setPrepayFor(null)}
          onSaved={() => onChanged()}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove it from your tracker. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
