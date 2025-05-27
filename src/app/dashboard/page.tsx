
"use client";

import type { Credential } from '@/types';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, ListChecks, Loader2, Search as SearchIcon, SearchX, FileUp, FileDown } from 'lucide-react';
import { AddPasswordDialog } from '@/components/passwords/AddPasswordDialog';
import { ImportPasswordsDialog, type ParsedCredentialData } from '@/components/passwords/ImportPasswordsDialog';
import { ExportPasswordsDialog } from '@/components/passwords/ExportPasswordsDialog';
import { PasswordList } from '@/components/passwords/PasswordList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { encryptPassword, decryptPassword } from '@/lib/crypto';

export default function DashboardPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCredentials = useCallback(async () => {
    if (!user) {
      setCredentials([]);
      setIsLoadingCredentials(false);
      return;
    }
    setIsLoadingCredentials(true);
    try {
      const credentialsCol = collection(db, `users/${user.uid}/credentials`);
      const q = query(credentialsCol);
      const querySnapshot = await getDocs(q);
      const fetchedCredentialsPromises = querySnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        let decryptedPassword = undefined;
        if (data.encryptedData) {
          try {
            if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
              decryptedPassword = await decryptPassword(data.encryptedData);
            } else {
              console.warn("Web Crypto API not available for decryption, skipping for", data.websiteName);
            }
          } catch (error) {
            console.error("Failed to decrypt password for", data.websiteName, error);
            toast({ variant: "destructive", title: "Decryption Error", description: `Could not decrypt password for ${data.websiteName}. Check console.` });
          }
        }
        return {
          id: docSnap.id,
          userId: data.userId,
          websiteName: data.websiteName,
          websiteUrl: data.websiteUrl,
          username: data.username,
          encryptedData: data.encryptedData,
          createdAt: data.createdAt instanceof Timestamp 
            ? data.createdAt.toDate().toISOString() 
            : data.createdAt,
          decryptedPassword: decryptedPassword,
        } as Credential;
      });
      let fetchedCredentials = await Promise.all(fetchedCredentialsPromises);
      fetchedCredentials = fetchedCredentials.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCredentials(fetchedCredentials);
    } catch (error) {
      console.error("Failed to load credentials from Firestore:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch credentials. Check console." });
      setCredentials([]);
    } finally {
      setIsLoadingCredentials(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchCredentials();
    } else if (!authIsLoading) {
      setCredentials([]);
      setIsLoadingCredentials(false);
    }
  }, [user, authIsLoading, fetchCredentials]);

  const handleAddCredential = async (data: { websiteName: string; websiteUrl?: string; username: string; password?: string; }) => {
    if (!user || typeof data.password === 'undefined') {
      console.warn("User not authenticated or password undefined, cannot add credential.");
      return;
    }

    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
      console.error("Web Crypto API is not available. Ensure the app is served over HTTPS or on localhost.");
      toast({ 
        variant: "destructive", 
        title: "Encryption Error", 
        description: "Web Crypto API not available. Use HTTPS or localhost." 
      });
      return;
    }

    try {
      const encryptedData = await encryptPassword(data.password);
      const newCredentialBase = {
        userId: user.uid,
        websiteName: data.websiteName,
        websiteUrl: data.websiteUrl || '',
        username: data.username,
        encryptedData: encryptedData,
        createdAt: new Date().toISOString(),
      };
      const credentialsCol = collection(db, `users/${user.uid}/credentials`);
      const docRef = await addDoc(credentialsCol, newCredentialBase);
      
      const newCredentialForState: Credential = {
        ...newCredentialBase,
        id: docRef.id,
        decryptedPassword: data.password, 
      };
      setCredentials(prev => [...prev, newCredentialForState].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      toast({ title: "Success", description: `${data.websiteName} added.`});
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error adding credential:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not add credential. Check console for details." });
    }
  };

  const handleUpdateCredential = async (data: { id: string; websiteName: string; websiteUrl?: string; username: string; password?: string; createdAt: string }) => {
    if (!user || !data.id || typeof data.password === 'undefined') {
      console.warn("User not authenticated, credential ID missing, or password undefined, cannot update credential.");
      return;
    }

    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
      console.error("Web Crypto API is not available. Ensure the app is served over HTTPS or on localhost.");
      toast({ 
        variant: "destructive", 
        title: "Encryption Error", 
        description: "Web Crypto API not available. Use HTTPS or localhost." 
      });
      return;
    }
    
    try {
      const encryptedData = await encryptPassword(data.password);
      const credDocRef = doc(db, `users/${user.uid}/credentials`, data.id);
      const dataToUpdate = {
        websiteName: data.websiteName,
        websiteUrl: data.websiteUrl || '',
        username: data.username,
        encryptedData: encryptedData,
      };
      await updateDoc(credDocRef, dataToUpdate);
      
      const updatedCredentialForState: Credential = {
        id: data.id,
        userId: user.uid, 
        websiteName: data.websiteName,
        websiteUrl: data.websiteUrl,
        username: data.username,
        encryptedData: encryptedData,
        createdAt: data.createdAt, 
        decryptedPassword: data.password,
      };
      setCredentials(prev => 
        prev.map(c => c.id === data.id ? updatedCredentialForState : c).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      );
      toast({ title: "Success", description: `${data.websiteName} updated.`});
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error updating credential:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update credential. Check console for details." });
    }
  };

  const handleDeleteCredential = async (id: string) => {
    if (!user) return;
    try {
      const credDocRef = doc(db, `users/${user.uid}/credentials`, id);
      await deleteDoc(credDocRef);
      setCredentials(prev => prev.filter(c => c.id !== id));
      toast({ title: "Success", description: "Credential deleted."});
    } catch (error) {
      console.error("Error deleting credential:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete credential. Check console." });
    }
  };

  const handleImportSubmit = async (parsedCreds: ParsedCredentialData[]) => {
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to import passwords." });
      return;
    }
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
      toast({ variant: "destructive", title: "Encryption Error", description: "Web Crypto API not available. Use HTTPS or localhost." });
      return;
    }

    let importedCount = 0;
    const credentialsCol = collection(db, `users/${user.uid}/credentials`);
    const newCredentialsForState: Credential[] = [];

    for (const parsedCred of parsedCreds) {
      try {
        const encryptedData = await encryptPassword(parsedCred.passwordToEncrypt);
        const newCredentialBase = {
          userId: user.uid,
          websiteName: parsedCred.websiteName,
          websiteUrl: parsedCred.websiteUrl || '',
          username: parsedCred.username,
          encryptedData: encryptedData,
          createdAt: new Date().toISOString(),
        };
        const docRef = await addDoc(credentialsCol, newCredentialBase);
        newCredentialsForState.push({
          ...newCredentialBase,
          id: docRef.id,
          decryptedPassword: parsedCred.passwordToEncrypt,
        });
        importedCount++;
      } catch (error) {
        console.error("Error importing credential:", parsedCred.websiteName, error);
        toast({ variant: "destructive", title: `Import Error: ${parsedCred.websiteName}`, description: "Could not import this credential. Check console." });
      }
    }

    if (importedCount > 0) {
      setCredentials(prev => [...prev, ...newCredentialsForState].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      toast({ title: "Import Successful", description: `${importedCount} of ${parsedCreds.length} credentials imported.` });
    } else if (parsedCreds.length > 0) {
      toast({ variant: "destructive", title: "Import Failed", description: "No credentials were imported. Check console for errors." });
    }
    // setIsImportDialogOpen(false); // Dialog will close itself on success
  };


  const openEditDialog = (credential: Credential) => {
    setEditingCredential(credential);
    setIsAddDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingCredential(null);
    setIsAddDialogOpen(true);
  }

  const filteredCredentials = useMemo(() => {
    if (!searchTerm) return credentials;
    return credentials.filter(
      (c) =>
        c.websiteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.username && c.username.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [credentials, searchTerm]);

  if (authIsLoading || (isLoadingCredentials && user)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user && !authIsLoading) {
    return (
        <div className="flex h-64 flex-col items-center justify-center text-center">
            <CardTitle className="text-2xl font-semibold text-foreground">Please log in</CardTitle>
            <CardDescription className="text-muted-foreground">
                You need to be logged in to view your password vault.
            </CardDescription>
        </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-300 ease-out">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Password Vault</h2>
          <p className="text-sm text-muted-foreground">
            Manage your saved credentials securely.
          </p>
        </div>
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <Button onClick={() => setIsImportDialogOpen(true)} variant="outline" className="w-full sm:w-auto justify-center border-accent text-accent hover:bg-accent/10">
            <FileUp className="mr-2 h-5 w-5" />
            Import
          </Button>
          <Button onClick={() => setIsExportDialogOpen(true)} variant="outline" className="w-full sm:w-auto justify-center border-accent text-accent hover:bg-accent/10">
            <FileDown className="mr-2 h-5 w-5" />
            Export
          </Button>
          <Button onClick={openAddDialog} className="w-full sm:w-auto justify-center bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New
          </Button>
        </div>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by website name or username..."
          className="w-full rounded-md border bg-background py-2 pl-10 pr-4 focus:ring-accent focus:border-accent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoadingCredentials && !filteredCredentials.length && (
         <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )}

      {!isLoadingCredentials && credentials.length === 0 && searchTerm === '' ? (
        <Card className="text-center shadow-lg border-dashed border-2 border-border hover:border-primary transition-colors duration-300">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary">
              <ListChecks className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-semibold text-foreground">Your Vault is Empty</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Start by adding your first website credential or import existing passwords.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row justify-center items-center gap-4">
             <Button onClick={openAddDialog} variant="outline" className="text-primary border-primary hover:bg-primary/10">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Your First Credential
            </Button>
            <Button onClick={() => setIsImportDialogOpen(true)} variant="outline" className="text-accent border-accent hover:bg-accent/10">
                <FileUp className="mr-2 h-4 w-4" />
                Import Passwords
            </Button>
          </CardContent>
        </Card>
      ) : !isLoadingCredentials && filteredCredentials.length === 0 && searchTerm !== '' ? (
        <Card className="text-center shadow-lg transition-shadow duration-300 hover:shadow-xl">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-destructive">
              <SearchX className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-semibold text-foreground">No Results Found</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              No credentials match your search term "{searchTerm}". Try a different search.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        !isLoadingCredentials && filteredCredentials.length > 0 && (
          <PasswordList 
            credentials={filteredCredentials} 
            onEdit={openEditDialog} 
            onDelete={handleDeleteCredential} 
          />
        )
      )}

      <AddPasswordDialog
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        onSave={editingCredential ? 
          (data) => handleUpdateCredential(data as { id: string; websiteName: string; websiteUrl?: string; username: string; password?: string; createdAt: string }) : 
          (data) => handleAddCredential(data as { websiteName: string; websiteUrl?: string; username: string; password?: string; })}
        existingCredential={editingCredential}
      />
      <ImportPasswordsDialog 
        isOpen={isImportDialogOpen}
        setIsOpen={setIsImportDialogOpen}
        onImportSubmit={handleImportSubmit}
      />
      <ExportPasswordsDialog
        isOpen={isExportDialogOpen}
        setIsOpen={setIsExportDialogOpen}
        credentials={credentials.filter(c => c.decryptedPassword !== undefined) as Array<Credential & { decryptedPassword: string }>}
      />
    </div>
  );
}

