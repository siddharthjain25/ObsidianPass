
"use client";

import type { Credential } from '@/types';
import { PasswordItem } from './PasswordItem';
import { Card, CardContent } from '@/components/ui/card';

interface PasswordListProps {
  credentials: Credential[];
  onEdit: (credential: Credential) => void;
  onDelete: (id: string) => void;
}

export function PasswordList({ credentials, onEdit, onDelete }: PasswordListProps) {
  if (credentials.length === 0) {
    // This case is handled by the parent DashboardPage, but added for robustness
    return <p className="text-center text-muted-foreground">No credentials stored yet.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Credentials should already be sorted by DashboardPage */}
      {credentials.map(credential => (
        <PasswordItem 
          key={credential.id} 
          credential={credential} 
          onEdit={() => onEdit(credential)} 
          onDelete={() => onDelete(credential.id)} 
        />
      ))}
    </div>
  );
}
