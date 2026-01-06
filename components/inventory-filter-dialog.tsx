"use client";

import React from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InventoryFilterDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  filters: Record<string, string>;
  handleFilterChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  resetFilters: () => void;
  applyFilters: () => void;
}

export function InventoryFilterDialog({
  open,
  setOpen,
  filters,
  handleFilterChange,
  resetFilters,
  applyFilters,
}: InventoryFilterDialogProps) {
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">Filter</Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="w-[320px] p-6 max-h-screen overflow-y-auto custom-scrollbar"
      >
        <SheetHeader>
          <SheetTitle>Filter Inventory</SheetTitle>
          <SheetDescription>
            Filter inventory items by various criteria.
          </SheetDescription>
          <SheetClose asChild>{/* Optional close button here */}</SheetClose>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {[
            { label: "Status", name: "status" },
            { label: "Location", name: "location" },
            { label: "Asset Type", name: "asset_type" },
            { label: "Department", name: "department" },
            { label: "Brand", name: "brand" },
            { label: "Model", name: "model" },
            { label: "Processor", name: "processor" },
            { label: "Storage", name: "storage" },
          ].map(({ label, name }) => (
            <div key={name} className="flex flex-col">
              <label htmlFor={name} className="text-xs font-medium mb-1">
                {label}
              </label>
              <Input
                id={name}
                name={name}
                value={filters[name as keyof typeof filters]}
                onChange={handleFilterChange}
                placeholder={`Filter by ${label.toLowerCase()}`}
                type="text"
                className="text-sm"
              />
            </div>
          ))}
        </div>

        <SheetFooter className="flex justify-between mt-2">
          <Button variant="outline" onClick={resetFilters}>
            Reset
          </Button>
          <Button onClick={applyFilters}>Apply</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
