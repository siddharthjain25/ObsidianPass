
"use client";

import type { Credential } from '@/types';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, UserCircle, Copy, Eye, EyeOff, FilePenLine, Trash2, ShieldAlert, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';


interface PasswordItemProps {
  credential: Credential;
  onEdit: () => void;
  onDelete: () => void;
}

export function PasswordItem({ credential, onEdit, onDelete }: PasswordItemProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [faviconSrc, setFaviconSrc] = useState<string | null>(null);
  const [showFallbackIcon, setShowFallbackIcon] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // Default to collapsed
  const { toast } = useToast();

  useEffect(() => {
    if (credential.websiteUrl) {
      try {
        const url = new URL(credential.websiteUrl.startsWith('http') ? credential.websiteUrl : `https://${credential.websiteUrl}`);
        setFaviconSrc(`https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${url.origin}&size=32`);
        setShowFallbackIcon(false);
      } catch (error) {
        console.warn("Invalid website URL for favicon:", credential.websiteUrl);
        setShowFallbackIcon(true);
      }
    } else {
      setShowFallbackIcon(true);
    }
  }, [credential.websiteUrl]);

  useEffect(() => {
    // If collapsed, ensure password is hidden
    if (!isExpanded) {
      setShowPassword(false);
    }
  }, [isExpanded]);

  const copyToClipboard = (text: string | undefined, type: string) => {
    if (!text) {
      toast({
        variant: "destructive",
        title: "Nothing to Copy",
        description: `${type} is not available.`,
      });
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        toast({
          title: `${type} Copied!`,
          description: `${type} has been copied to your clipboard.`,
        });
      }).catch(err => {
        console.error('Failed to copy: ', err);
        toast({
          variant: "destructive",
          title: "Copy Failed",
          description: `Could not copy ${type.toLowerCase()} to clipboard.`,
        });
      });
    } else {
       toast({
          variant: "destructive",
          title: "Clipboard Unavailable",
          description: "Clipboard API is not available in this browser.",
        });
    }
  };
  
  const timeAgo = credential.createdAt ? formatDistanceToNow(new Date(credential.createdAt), { addSuffix: true }) : 'some time ago';
  const passwordDisplay = credential.decryptedPassword === undefined 
    ? "Error decrypting" 
    : (showPassword ? credential.decryptedPassword : '••••••••••••');
  const canCopyPassword = credential.decryptedPassword !== undefined;


  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 ease-in-out">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 min-w-0"> {/* Added min-w-0 for truncation parent */}
            {showFallbackIcon || !faviconSrc ? (
              <Globe className="h-8 w-8 text-muted-foreground flex-shrink-0" />
            ) : (
              <Image
                src={faviconSrc}
                alt={`${credential.websiteName} logo`}
                width={32}
                height={32}
                className="rounded flex-shrink-0"
                onError={() => {
                  console.warn("Failed to load favicon for:", credential.websiteName, "URL:", faviconSrc);
                  setShowFallbackIcon(true);
                }}
              />
            )}
            <div className="min-w-0"> {/* Added min-w-0 here too */}
              <CardTitle className="text-xl font-semibold text-primary truncate">
                {credential.websiteName}
              </CardTitle>
              {credential.websiteUrl && (
                <a 
                  href={credential.websiteUrl.startsWith('http') ? credential.websiteUrl : `https://${credential.websiteUrl}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block text-sm text-accent hover:underline truncate"
                >
                  {credential.websiteUrl}
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-1 flex-shrink-0">
             <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </Button>
             <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8 text-muted-foreground hover:text-accent">
                <FilePenLine className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the password for 
                      <strong className="text-foreground"> {credential.websiteName}</strong>.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          </div>
        </div>
      </CardHeader>
      
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded
            ? "max-h-[1000px] opacity-100 visible"
            : "max-h-0 opacity-0 invisible"
        )}
      >
        <CardContent className="space-y-3"> {/* Default p-6 pt-0 will apply */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-foreground min-w-0">
              <UserCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <span className="font-medium hidden sm:inline">Username:</span>
              <span className="font-medium sm:hidden">User:</span>
              <span className="truncate">{credential.username}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(credential.username, 'Username')} className="h-8 text-xs flex-shrink-0">
              <Copy className="mr-1 h-3 w-3" /> <span className="hidden sm:inline">Copy</span>
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-foreground min-w-0">
              {credential.decryptedPassword === undefined ? 
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" /> :
                <ShieldAlert className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              }
              <span className="font-medium hidden sm:inline">Password:</span>
              <span className="font-medium sm:hidden">Pass:</span>
              <span className={`truncate ${credential.decryptedPassword === undefined ? 'text-destructive' : ''}`}>{passwordDisplay}</span>
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowPassword(!showPassword)} 
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                disabled={!canCopyPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="sr-only">{showPassword ? 'Hide' : 'Show'} password</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard(credential.decryptedPassword, 'Password')} 
                className="h-8 text-xs"
                disabled={!canCopyPassword}
              >
                <Copy className="mr-1 h-3 w-3" /> <span className="hidden sm:inline">Copy</span>
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground"> {/* Default p-6 pt-0 will apply */}
          <p>Added {timeAgo}</p>
        </CardFooter>
      </div>
    </Card>
  );
}

