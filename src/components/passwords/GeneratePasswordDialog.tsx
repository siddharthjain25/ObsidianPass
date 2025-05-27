
"use client";

import { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Wand2 } from "lucide-react"; // Removed Loader2
import { useToast } from "@/hooks/use-toast";
// Removed AI flow import: import { generateStrongPassword } from "@/ai/flows/generate-strong-password";
// Removed AI type import: import type { GenerateStrongPasswordInput } from "@/ai/flows/generate-strong-password";

const passwordOptionsSchema = z.object({
  length: z.number().min(8).max(128),
  complexity: z.enum(['low', 'medium', 'high']),
});

interface GeneratePasswordDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onPasswordGenerated: (password: string) => void;
}

// Local password generation function
function generateLocalPassword(length: number, complexity: 'low' | 'medium' | 'high'): string {
  let charSet = '';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{};\':"\\|,.<>/?~`';

  if (complexity === 'low') {
    charSet = lower + upper + numbers;
  } else { // medium and high will use the same full set for this local generator
    charSet = lower + upper + numbers + symbols;
  }

  if (charSet.length === 0) return ''; // Should not happen with defined complexities

  let password = '';
  const randomValues = new Uint32Array(length);
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      password += charSet[randomValues[i] % charSet.length];
    }
  } else {
    // Fallback for environments without crypto.getRandomValues (less secure)
    console.warn("crypto.getRandomValues not available, using Math.random() for password generation.");
    for (let i = 0; i < length; i++) {
      password += charSet.charAt(Math.floor(Math.random() * charSet.length));
    }
  }
  return password;
}


export function GeneratePasswordDialog({ isOpen, setIsOpen, onPasswordGenerated }: GeneratePasswordDialogProps) {
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  // Removed isLoading state: const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof passwordOptionsSchema>>({
    resolver: zodResolver(passwordOptionsSchema),
    defaultValues: {
      length: 16,
      complexity: "medium",
    },
  });

  const currentLength = form.watch("length");

  async function onSubmit(values: z.infer<typeof passwordOptionsSchema>) {
    // Removed setIsLoading(true);
    setGeneratedPassword(null);
    try {
      const newPassword = generateLocalPassword(values.length, values.complexity);
      if (newPassword) {
        setGeneratedPassword(newPassword);
        toast({
          title: "Password Generated!",
          description: "A strong password has been created locally.",
        });
      } else {
        throw new Error("Local generator failed to produce a password.");
      }
    } catch (error) {
      console.error("Failed to generate password locally:", error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Could not generate a password locally. Please try again.",
      });
    } finally {
      // Removed setIsLoading(false);
    }
  }

  const copyToClipboard = () => {
    if (generatedPassword) {
      if(navigator.clipboard) {
        navigator.clipboard.writeText(generatedPassword).then(() => {
          toast({
            title: "Password Copied!",
            description: "The generated password has been copied to your clipboard.",
          });
        }).catch(err => {
          console.error('Failed to copy: ', err);
           toast({
            variant: "destructive",
            title: "Copy Failed",
            description: "Could not copy password to clipboard.",
          });
        });
      } else {
        toast({
            variant: "destructive",
            title: "Clipboard Unavailable",
            description: "Clipboard API is not available in this browser.",
          });
      }
    }
  };

  const handleUsePassword = () => {
    if (generatedPassword) {
      onPasswordGenerated(generatedPassword);
      setIsOpen(false);
      setGeneratedPassword(null); // Reset for next time
      form.reset();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) { // Reset state when dialog is closed
        setGeneratedPassword(null);
        form.reset();
      }
      setIsOpen(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" /> Generate Strong Password
          </DialogTitle>
          <DialogDescription>
            Craft a secure password locally. Adjust the options below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField
              control={form.control}
              name="length"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Password Length</FormLabel>
                    <span className="text-sm font-medium text-primary">{currentLength} characters</span>
                  </div>
                  <FormControl>
                    <Slider
                      min={8}
                      max={64} 
                      step={1}
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="complexity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Complexity</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select complexity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low (Letters & Numbers)</SelectItem>
                      <SelectItem value="medium">Medium (Letters, Numbers, Symbols)</SelectItem>
                      <SelectItem value="high">High (Letters, Numbers, Symbols - Enhanced)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              Generate Password
            </Button>
          </form>
        </Form>

        {generatedPassword && (
          <div className="mt-6 space-y-3 rounded-md border bg-secondary/50 p-4">
            <Label htmlFor="generated-password-output" className="font-semibold text-foreground">Generated Password:</Label>
            <div className="flex items-center gap-2">
              <Input
                id="generated-password-output"
                readOnly
                value={generatedPassword}
                className="flex-grow bg-background text-lg font-mono tracking-wider"
              />
              <Button variant="outline" size="icon" onClick={copyToClipboard} aria-label="Copy password">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={handleUsePassword} className="w-full mt-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              Use This Password
            </Button>
          </div>
        )}
        
        <DialogFooter className="sm:justify-start mt-4">
           <Button type="button" variant="outline" onClick={() => {setIsOpen(false); setGeneratedPassword(null); form.reset();}}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
