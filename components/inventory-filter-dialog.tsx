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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type InventoryFilters = {
  status: string;
  location: string;
  asset_type: string;
  department: string;
  brand: string;
  model: string;
  processor: string;
  storage: string;
  pageSize: string;
};

type FilterKeys = keyof InventoryFilters;

interface InventoryFilterDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  filters: InventoryFilters;
  handleFilterChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  resetFilters: () => void;
  applyFilters: () => void;
  setFilters: React.Dispatch<React.SetStateAction<InventoryFilters>>;
}

const filterFields: { label: string; name: FilterKeys }[] = [
  { label: "Status", name: "status" },
  { label: "Location", name: "location" },
  { label: "Asset Type", name: "asset_type" },
  { label: "Department", name: "department" },
  { label: "Brand", name: "brand" },
  { label: "Model", name: "model" },
  { label: "Processor", name: "processor" },
  { label: "Storage", name: "storage" },
];

export function InventoryFilterDialog({
  open,
  setOpen,
  filters,
  handleFilterChange,
  resetFilters,
  applyFilters,
  setFilters,
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
            Filter inventory items and control page length.
          </SheetDescription>
          <SheetClose />
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* 🔢 PAGE LENGTH */}
          <div className="flex flex-col">
            <label className="text-xs font-medium mb-1">
              Page Length
            </label>
            <Select
              value={filters.pageSize || "25"}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  pageSize: value,
                }))
              }
            >
              <SelectTrigger className="text-sm w-full">
                <SelectValue placeholder="Select page length" />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100, 250, 500, 1000].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} items
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 🔍 TEXT FILTERS */}
          {filterFields.map(({ label, name }) => (
            <div key={name} className="flex flex-col">
              <label htmlFor={name} className="text-xs font-medium mb-1">
                {label}
              </label>
              <Input
                id={name}
                name={name}
                value={filters[name] || ""}
                onChange={handleFilterChange}
                placeholder={`Filter by ${label.toLowerCase()}`}
                type="text"
                className="text-sm"
              />
            </div>
          ))}
        </div>

        <SheetFooter className="flex justify-between mt-4">
          <Button variant="outline" onClick={resetFilters}>
            Reset
          </Button>
          <Button onClick={applyFilters}>Apply</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
