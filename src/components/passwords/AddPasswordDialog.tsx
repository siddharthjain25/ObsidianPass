
"use client";

import type { Credential } from '@/types'; // Credential type for existingCredential
import { useState, useEffect, useMemo } from 'react'; // Added useMemo
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form"; // Added useWatch
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
import { Progress } from "@/components/ui/progress"; // Added Progress
import { Wand2, Eye, EyeOff, Loader2 } from "lucide-react";
import { GeneratePasswordDialog } from './GeneratePasswordDialog';
import { useToast } from '@/hooks/use-toast';
import { checkPasswordStrength, type PasswordStrengthResult } from '@/lib/password-strength'; // Added

const formSchema = z.object({
  websiteName: z.string().min(1, "Website name is required."),
  websiteUrl: z.string().url("Please enter a valid URL (e.g., https://example.com)").optional().or(z.literal('')),
  username: z.string().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
});

type PasswordFormData = {
  id?: string; 
  websiteName: string;
  websiteUrl?: string;
  username: string;
  password?: string; 
  createdAt?: string; 
};

interface AddPasswordDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSave: (data: PasswordFormData) => void;
  existingCredential?: Credential | null; 
}

const initialPasswordStrength: PasswordStrengthResult = {
  score: 0,
  text: 'Very Weak',
  progressValue: 0,
  colorClass: '[&>div]:bg-slate-300',
  textColorClass: 'text-muted-foreground',
  feedback: { suggestions: [] },
};

export function AddPasswordDialog({ isOpen, setIsOpen, onSave, existingCredential }: AddPasswordDialogProps) {
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrengthResult>(initialPasswordStrength); // Added
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      websiteName: "",
      websiteUrl: "",
      username: "",
      password: "",
    },
  });

  const passwordValue = useWatch({ control: form.control, name: "password" }); // Watch password field

  useEffect(() => {
    if (isOpen) { 
      if (existingCredential) {
        form.reset({
          websiteName: existingCredential.websiteName,
          websiteUrl: existingCredential.websiteUrl || "",
          username: existingCredential.username,
          password: existingCredential.decryptedPassword || "", 
        });
        // Also set initial strength for existing password
        if (existingCredential.decryptedPassword) {
           setPasswordStrength(checkPasswordStrength(existingCredential.decryptedPassword));
        } else {
           setPasswordStrength(initialPasswordStrength);
        }
      } else {
        form.reset({
          websiteName: "",
          websiteUrl: "",
          username: "",
          password: "",
        });
        setPasswordStrength(initialPasswordStrength); // Reset strength for new credential
      }
    }
  }, [existingCredential, form, isOpen]);

  // Update password strength on password change
  useEffect(() => {
    if (passwordValue === undefined) { // Can be undefined initially before form is fully ready
        setPasswordStrength(initialPasswordStrength);
    } else {
        setPasswordStrength(checkPasswordStrength(passwordValue));
    }
  }, [passwordValue]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    const dataToSave: PasswordFormData = {
      id: existingCredential?.id,
      websiteName: values.websiteName,
      websiteUrl: values.websiteUrl,
      username: values.username,
      password: values.password, 
      createdAt: existingCredential?.createdAt,
    };
    
    try {
      await onSave(dataToSave); 
    } catch (error) {
      console.error("Error in onSave callback from AddPasswordDialog:", error);
      toast({
        variant: "destructive",
        title: "Save Error",
        description: "An unexpected error occurred while trying to save.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const handleUseGeneratedPassword = (password: string) => {
    form.setValue("password", password, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    // Strength will update via useEffect watching passwordValue
  };
  
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      form.reset();
      setPasswordStrength(initialPasswordStrength); // Reset strength on close
    }
    setIsOpen(open);
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[425px] md:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{existingCredential ? 'Edit Credential' : 'Add New Credential'}</DialogTitle>
            <DialogDescription>
              {existingCredential ? 'Update the details for this credential.' : 'Fill in the details for the new website or service.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="websiteName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Google, Facebook" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="websiteUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., https://www.google.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username or Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Your username or email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-grow">
                        <FormControl>
                          <Input 
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter or generate a password" 
                            {...field} 
                            className="pr-10"
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button type="button" variant="outline" onClick={() => setIsGenerateOpen(true)} className="shrink-0">
                        <Wand2 className="mr-2 h-4 w-4 text-accent" /> Generate
                      </Button>
                    </div>
                    <FormMessage /> {/* For Zod validation errors */}
                    {/* Password Strength Indicator */}
                    {(passwordValue || form.formState.touchedFields.password || form.formState.dirtyFields.password) && passwordValue !== undefined && (
                      <div className="mt-2 space-y-1">
                        <Progress value={passwordStrength.progressValue} className={passwordStrength.colorClass} />
                        <div className="flex justify-between items-center text-xs">
                          <span className={`font-medium ${passwordStrength.textColorClass}`}>{passwordStrength.text}</span>
                           {passwordStrength.score > 0 && passwordValue.length > 0 && passwordStrength.feedback.warning && (
                            <p className="text-xs text-destructive">{passwordStrength.feedback.warning}</p>
                          )}
                        </div>
                        {passwordStrength.score < 4 && passwordValue.length > 0 && passwordStrength.feedback.suggestions.length > 0 && (
                           <>
                            {passwordStrength.feedback.warning && passwordStrength.score === 0 && (
                                <p className="text-xs text-destructive">{passwordStrength.feedback.warning}</p>
                            )}
                            <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                                {passwordStrength.feedback.suggestions.map(s => <li key={s}>{s}</li>)}
                            </ul>
                           </>
                        )}
                      </div>
                    )}
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>Cancel</Button>
                <Button type="submit" disabled={isSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {existingCredential ? 'Save Changes' : 'Add Credential'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <GeneratePasswordDialog 
        isOpen={isGenerateOpen} 
        setIsOpen={setIsGenerateOpen} 
        onPasswordGenerated={handleUseGeneratedPassword} 
      />
    </>
  );
}
