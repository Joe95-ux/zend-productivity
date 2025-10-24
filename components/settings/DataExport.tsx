"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Database, Archive } from "lucide-react";
import { toast } from "sonner";

export function DataExport() {
  const [exportFormat, setExportFormat] = useState("json");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create a mock export file
      const mockData = {
        boards: [],
        cards: [],
        lists: [],
        activities: [],
        exportedAt: new Date().toISOString(),
        format: exportFormat
      };

      const blob = new Blob([JSON.stringify(mockData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zend-productivity-export-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Data exported successfully!");
    } catch (error) {
      toast.error("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pt-8">
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Data Export
        </CardTitle>
        <CardDescription>
          Export your boards, cards, and data in various formats
        </CardDescription>
      </CardHeader>
      <CardContent className="py-8">
        <div className="space-y-6">
          {/* Export Format */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              <span className="font-medium">Export Format</span>
            </div>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select export format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>JSON (Complete Data)</span>
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span>CSV (Spreadsheet)</span>
                  </div>
                </SelectItem>
                <SelectItem value="zip">
                  <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4" />
                    <span>ZIP (Archived)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Choose the format that best suits your needs
            </p>
          </div>

          {/* Export Options */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-900 dark:text-slate-100">
              What will be exported:
            </h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                All boards and their settings
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                All cards with descriptions and comments
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                Activity history and timestamps
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                User preferences and settings
              </li>
            </ul>
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="min-w-32"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </>
              )}
            </Button>
          </div>

          {/* Info */}
          <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <p>
              <strong className="text-slate-900 dark:text-slate-100">Note:</strong> Exporting large amounts of data may take a few minutes. 
              The exported file will be downloaded to your device.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
