
"use client";

import type { Credential } from '@/types';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileJson, FileText, AlertTriangle, KeyRound, Loader2 } from 'lucide-react';
import { encryptDataWithUserPassword } from '@/lib/crypto';

interface ExportPasswordsDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  credentials: Array<Credential & { decryptedPassword: string }>;
}

function convertToCSV(data: Array<Record<string, any>>, headers: string[]): string {
  if (!data || data.length === 0) return '';
  const csvRows = [];
  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header] === undefined || row[header] === null ? '' : String(row[header]);
      const escaped = val.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}

export function ExportPasswordsDialog({ isOpen, setIsOpen, credentials }: ExportPasswordsDialogProps) {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [secretKey, setSecretKey] = useState('');
  const [confirmSecretKey, setConfirmSecretKey] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    if (credentials.length === 0) {
      toast({ variant: "destructive", title: "Nothing to Export", description: "Your password vault is empty." });
      return;
    }
    if (!secretKey) {
      toast({ variant: "destructive", title: "Secret Key Required", description: "Please enter a secret key to encrypt your export." });
      return;
    }
    if (secretKey !== confirmSecretKey) {
      toast({ variant: "destructive", title: "Keys Don't Match", description: "The secret keys entered do not match." });
      return;
    }

    setIsEncrypting(true);

    try {
      const dataToExport = credentials.map(c => ({
        websiteName: c.websiteName,
        websiteUrl: c.websiteUrl || '',
        username: c.username,
        password: c.decryptedPassword,
      }));

      let serializedData = '';
      let originalFileExtension = '';

      if (exportFormat === 'json') {
        serializedData = JSON.stringify(dataToExport, null, 2);
        originalFileExtension = 'json';
      } else { // csv
        const headers = ['websiteName', 'websiteUrl', 'username', 'password'];
        serializedData = convertToCSV(dataToExport, headers);
        originalFileExtension = 'csv';
      }

      const encryptedPayload = await encryptDataWithUserPassword(serializedData, secretKey);
      
      const blob = new Blob([encryptedPayload], { type: 'application/json' }); // Encrypted data is always a JSON string
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // The file extension indicates it's an ObsidianPass encrypted export, not the original format.
      a.download = `obsidianpass_export_encrypted_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Export Successful", description: `Your passwords have been securely encrypted and exported.` });
      handleDialogClose(false); // Close and reset
    } catch (error: any) {
      console.error("Export encryption failed:", error);
      toast({ variant: "destructive", title: "Export Failed", description: error.message || "Could not encrypt and export data." });
    } finally {
      setIsEncrypting(false);
    }
  };
  
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setExportFormat('json');
      setSecretKey('');
      setConfirmSecretKey('');
      setIsEncrypting(false);
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export & Encrypt Passwords</DialogTitle>
          <DialogDescription>
            Choose a format, then provide a secret key to encrypt your passwords before export.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/50 text-destructive dark:text-red-400 dark:border-red-400/50 dark:bg-red-900/20">
            <AlertTriangle className="h-5 w-5 !text-destructive dark:!text-red-400" />
            <AlertTitle className="text-destructive dark:text-red-300">Important Security Note</AlertTitle>
            <AlertDescription className="text-destructive/90 dark:text-red-400/90">
              The exported file will be encrypted with your secret key. 
              Store this key securely. Without it, you cannot decrypt and import the file.
              The original format (JSON/CSV) is embedded within the encrypted file.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label htmlFor="export-secret-key" className="flex items-center">
              <KeyRound className="mr-2 h-4 w-4 text-muted-foreground"/> Secret Key for Encryption
            </Label>
            <Input
              id="export-secret-key"
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Enter a strong password"
              disabled={isEncrypting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="export-confirm-secret-key">Confirm Secret Key</Label>
            <Input
              id="export-confirm-secret-key"
              type="password"
              value={confirmSecretKey}
              onChange={(e) => setConfirmSecretKey(e.target.value)}
              placeholder="Re-enter your secret key"
              disabled={isEncrypting}
            />
             {secretKey && confirmSecretKey && secretKey !== confirmSecretKey && (
              <p className="text-xs text-destructive">Secret keys do not match.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="export-format">Original Format (will be encrypted)</Label>
            <RadioGroup
              id="export-format"
              value={exportFormat}
              onValueChange={(value: 'json' | 'csv') => setExportFormat(value)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json-format" disabled={isEncrypting} />
                <Label htmlFor="json-format" className="flex items-center gap-1 cursor-pointer">
                  <FileJson className="h-4 w-4 text-muted-foreground"/> JSON
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv-format" disabled={isEncrypting} />
                <Label htmlFor="csv-format" className="flex items-center gap-1 cursor-pointer">
                  <FileText className="h-4 w-4 text-muted-foreground"/> CSV
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleDialogClose(false)} disabled={isEncrypting}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={credentials.length === 0 || !secretKey || !confirmSecretKey || secretKey !== confirmSecretKey || isEncrypting} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isEncrypting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Encrypting & Exporting...
              </>
            ) : (
              "Encrypt & Export"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
