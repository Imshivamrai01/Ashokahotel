"use client";

import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmDialogProps {
  onConfirm: () => void;
  isPending?: boolean;
  label?: string;
  description?: string;
  trigger?: React.ReactNode;
}

export default function DeleteConfirmDialog({
  onConfirm,
  isPending,
  label = "Delete",
  description = "This action cannot be undone.",
  trigger,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog>
      {trigger ? (
        <AlertDialogTrigger
          render={
            <button
              type="button"
              className="contents cursor-pointer"
              disabled={isPending}
            />
          }
        >
          {trigger}
        </AlertDialogTrigger>
      ) : (
        <AlertDialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-destructive hover:text-destructive"
              disabled={isPending}
            />
          }
        >
          <Trash2 className="w-3.5 h-3.5" />
        </AlertDialogTrigger>
      )}
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 className="text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
