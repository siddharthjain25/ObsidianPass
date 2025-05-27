
"use client";

import type { Credential } from '@/types';
import { useState, type ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound } from 'lucide-react';
import { decryptDataWithUserPassword } from '@/lib/crypto';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldQuestion } from 'lucide-react';


export type ParsedCredentialData = Omit<Credential, 'id' | 'userId' | 'encryptedData' | 'createdAt'> & {
  passwordToEncrypt: string; 
};

interface ImportPasswordsDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onImportSubmit: (credentials: ParsedCredentialData[]) => Promise<void>;
}

function parseCsv(csvText: string): Array<Record<string, string>> {
  const lines = csvText.trim().split(/\r\n|\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let currentMatch;
    const regex = /(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|([^\",]*))(?:,|$)/g;
    let line = lines[i];
    while ((currentMatch = regex.exec(line)) !== null) {
        if (currentMatch[0] === ',' || currentMatch[0] === '') {
          if (regex.lastIndex === line.length && line.endsWith(',')) {
             values.push('');
          }
          continue; 
        }
        values.push(currentMatch[1] !== undefined ? currentMatch[1].replace(/\"\"/g, '\"') : (currentMatch[2] || '').trim());
         if (regex.lastIndex === line.length && (line.endsWith(',') && headers.length > values.length) ) {
             values.push('');
        }
    }
    while (values.length < headers.length) {
        values.push('');
    }

    if (values.length === headers.length) {
      const entry: Record<string, string> = {};
      headers.forEach((header, index) => {
        entry[header] = values[index];
      });
      data.push(entry);
    } else {
        console.warn("Skipping CSV line due to mismatched columns: ", lines[i], "Expected:", headers.length, "Got:", values.length);
    }
  }
  return data;
}


export function ImportPasswordsDialog({ isOpen, setIsOpen, onImportSubmit }: ImportPasswordsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [secretKey, setSecretKey] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    } else {
      setFile(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast({ variant: "destructive", title: "No file selected", description: "Please select a file to import." });
      return;
    }
    // Secret key is now optional for non-encrypted files, but required if file might be encrypted.
    // The decryptDataWithUserPassword will throw if secretKey is empty and it's needed.

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const fileContent = e.target?.result as string;
        let decryptedData = fileContent;
        let presumedOriginalFormatIsJson = file.name.toLowerCase().endsWith('.json'); // Before potential encryption

        // Attempt decryption if a secret key is provided AND the file is a .json (as encrypted files are saved as .json)
        // Or, if it's not a .json, it's assumed to be an unencrypted CSV.
        // If it's a .json and no secret key, assume it's an unencrypted JSON.
        let wasEncrypted = false;
        if (secretKey && file.name.toLowerCase().endsWith('.json')) {
            try {
                decryptedData = await decryptDataWithUserPassword(fileContent, secretKey);
                wasEncrypted = true;
                // After decryption, the content could be JSON or CSV. We need to try parsing both.
                // We'll try JSON first. If it fails, we'll assume CSV.
            } catch (decryptionError: any) {
                 // If decryption fails with a key, it's a critical error for that path.
                if (decryptionError.message.includes("Could not decrypt data") || decryptionError.message.includes("Malformed encrypted payload")) {
                    toast({ variant: "destructive", title: "Decryption Failed", description: "Could not decrypt the file. Secret key may be incorrect or file is not an ObsidianPass encrypted export." });
                    setIsProcessing(false);
                    return;
                }
                // If it's another error, it might be an unencrypted JSON file, so we continue.
                console.warn("Decryption attempt failed, assuming file is not encrypted or using wrong key. Error:", decryptionError.message);
                // If key was provided but it wasn't an encrypted ObsidianPass file, `decryptedData` remains `fileContent`.
            }
        } else if (!secretKey && file.name.toLowerCase().endsWith('.json')) {
            // It's a JSON file, but no secret key was provided. Assume unencrypted.
            // `decryptedData` is already `fileContent`.
        } else if (file.name.toLowerCase().endsWith('.csv')) {
            // It's a CSV file, assume unencrypted as encrypted exports are .json
            // `decryptedData` is already `fileContent`.
        }


        let parsedCredentials: ParsedCredentialData[] = [];
        
        // Try parsing as JSON first (Bitwarden or ObsidianPass unencrypted/decrypted)
        let isJsonFormat = false;
        try {
            const jsonData = JSON.parse(decryptedData);
            isJsonFormat = true; // If JSON.parse succeeds

            if (jsonData && Array.isArray(jsonData.items)) { // Bitwarden JSON structure
                jsonData.items.forEach((item: any) => {
                if (item.type === 1 && item.login && item.name && item.login.username && item.login.password) {
                    parsedCredentials.push({
                    websiteName: item.name,
                    websiteUrl: item.login.uris && item.login.uris[0] ? item.login.uris[0].uri : '',
                    username: item.login.username,
                    passwordToEncrypt: item.login.password,
                    });
                }
                });
            } else if (Array.isArray(jsonData)) { // ObsidianPass JSON structure (array of credential objects)
                jsonData.forEach((item: any) => {
                    if (item.websiteName && item.username && item.password) { 
                        parsedCredentials.push({
                            websiteName: item.websiteName,
                            websiteUrl: item.websiteUrl || '',
                            username: item.username,
                            passwordToEncrypt: item.password,
                        });
                    }
                });
            } else if (wasEncrypted) { // It was encrypted, decrypted, but not a known JSON array format
                 throw new Error("Decrypted data is not a recognized JSON array format (Bitwarden or ObsidianPass).");
            }
            // If not `wasEncrypted` and not a known JSON format, it might be a CSV, or an unsupported JSON.
            // isJsonFormat remains true, but parsedCredentials might be empty.
            // if isJsonFormat is true but parsedCredentials is empty, it means it was valid JSON but not of a supported structure.

        } catch (jsonError) {
            // JSON parsing failed. If it was an encrypted file that decrypted, this means the decrypted content wasn't JSON.
            // Or if it was an unencrypted .json file, it was malformed.
            // Or if it was an unencrypted .csv file, this catch is expected.
            isJsonFormat = false; // Signal that it wasn't valid/supported JSON
            if (wasEncrypted) {
                // If it was decrypted, we assume it should have been valid JSON or CSV.
                // Since JSON failed, now try CSV for the decrypted data.
            } else if (presumedOriginalFormatIsJson) { // It was a .json file, unencrypted, but failed to parse.
                 throw new Error("Selected .json file is malformed or not a supported format.");
            }
            // If it's not JSON, it might be CSV. Proceed to CSV parsing.
        }

        if (!isJsonFormat || (isJsonFormat && parsedCredentials.length === 0 && !wasEncrypted && !file.name.toLowerCase().endsWith('.csv'))) {
            // If it's not JSON, or it was JSON but empty and not an encrypted or CSV file, try CSV.
            // This also handles the case where decrypted data (from an encrypted file) was actually CSV.
            const csvData = parseCsv(decryptedData);
            if (csvData.length > 0) {
                const firstRow = csvData[0];
                if (firstRow.hasOwnProperty('name') && firstRow.hasOwnProperty('login_username') && firstRow.hasOwnProperty('login_password')) { // Bitwarden CSV
                csvData.forEach(row => {
                    if (row.name && row.login_username && row.login_password) {
                    parsedCredentials.push({
                        websiteName: row.name,
                        websiteUrl: row.login_uri || '',
                        username: row.login_username,
                        passwordToEncrypt: row.login_password,
                    });
                    }
                });
                } else if (firstRow.hasOwnProperty('websiteName') && firstRow.hasOwnProperty('username') && firstRow.hasOwnProperty('password')) { // ObsidianPass CSV
                csvData.forEach(row => {
                    if (row.websiteName && row.username && row.password) {
                    parsedCredentials.push({
                        websiteName: row.websiteName,
                        websiteUrl: row.websiteUrl || '',
                        username: row.username,
                        passwordToEncrypt: row.password,
                    });
                    }
                });
                } else if (wasEncrypted && csvData.length > 0) { // Decrypted data was CSV but not a known format
                    throw new Error("Decrypted data is not a recognized CSV format (Bitwarden or ObsidianPass headers).");
                } else if (!wasEncrypted && file.name.toLowerCase().endsWith('.csv') && csvData.length > 0) { // Unencrypted CSV but not known format
                     throw new Error("Unsupported CSV format. Headers do not match Bitwarden or ObsidianPass export formats.");
                }
            }
        }


        if (parsedCredentials.length === 0) {
          let message = "No compatible login credentials found in the file, or file was empty after header.";
          if (wasEncrypted && secretKey) message = "Decrypted data did not contain recognizable credentials, or the secret key was incorrect for the file's actual content.";
          else if (secretKey && !wasEncrypted) message = "Secret key provided, but the file does not appear to be an ObsidianPass encrypted export. Attempted to parse as unencrypted.";
          
          toast({ variant: "destructive", title: "No Credentials Processed", description: message });
          setIsProcessing(false);
          return;
        }
        
        await onImportSubmit(parsedCredentials);
        handleDialogClose(false); 
      } catch (error: any) {
        console.error("Error parsing or processing file:", error);
        toast({ variant: "destructive", title: "Import Failed", description: error.message || "Could not process the file." });
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      toast({ variant: "destructive", title: "File Read Error", description: "Could not read the selected file." });
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };
  
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setFile(null); 
      setSecretKey('');
      setIsProcessing(false);
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Passwords</DialogTitle>
          <DialogDescription>
            Select a JSON/CSV file (Bitwarden/ObsidianPass unencrypted) or an ObsidianPass encrypted (.json) export.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
           <Alert variant="default" className="bg-secondary/30 border-secondary/50">
            <ShieldQuestion className="h-5 w-5 text-accent" />
            <AlertTitle className="text-accent">File Types</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              - For <strong className="text-foreground">ObsidianPass encrypted files (.json)</strong>, provide the secret key.
              <br />
              - For <strong className="text-foreground">unencrypted Bitwarden/ObsidianPass JSON or CSV files</strong>, leave the secret key blank.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label htmlFor="password-file">Password File (.json or .csv)</Label>
            <Input
              id="password-file"
              type="file"
              accept=".json,.csv"
              onChange={handleFileChange}
              className="cursor-pointer"
              disabled={isProcessing}
            />
            {file && <p className="text-sm text-muted-foreground">Selected: {file.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="import-secret-key" className="flex items-center">
                <KeyRound className="mr-2 h-4 w-4 text-muted-foreground"/> Secret Key (if file is encrypted)
            </Label>
            <Input
              id="import-secret-key"
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Enter secret key if applicable"
              disabled={isProcessing}
            />
          </div>
           <p className="text-xs text-muted-foreground">
            Supports Bitwarden JSON/CSV, ObsidianPass unencrypted JSON/CSV, and ObsidianPass encrypted JSON exports.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleDialogClose(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!file || isProcessing} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Import"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
