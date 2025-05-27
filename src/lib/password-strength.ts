
// src/lib/password-strength.ts

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4; // 0: Very Weak, 1: Weak, 2: Fair, 3: Good, 4: Strong
  text: string;
  progressValue: number;
  colorClass: string; // Tailwind class for the Progress component's indicator
  textColorClass: string; // Tailwind class for the strength text
  feedback: {
    warning?: string;
    suggestions: string[];
  };
}

export function checkPasswordStrength(password: string): PasswordStrengthResult {
  let points = 0;
  const feedback: PasswordStrengthResult['feedback'] = { suggestions: [] };

  if (!password || password.length === 0) {
    return {
      score: 0,
      text: 'Very Weak',
      progressValue: 0,
      colorClass: '[&>div]:bg-slate-300', // Neutral for empty
      textColorClass: 'text-muted-foreground',
      feedback: { suggestions: ["Enter a password to check its strength."] },
    };
  }

  // Length checks
  if (password.length < 8) {
    feedback.warning = "Password is too short.";
    feedback.suggestions.push("Use at least 8 characters.");
  } else if (password.length < 12) {
    points += 1; // 8-11 chars
  } else {
    points += 2; // >= 12 chars
  }

  // Variety checks (only award points if minimum length is sort of met)
  // We'll still show suggestions even if length is too short
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[^A-Za-z0-9]/.test(password);

  if (password.length >= 4) { // Give variety points even for shorter passwords to encourage improvement
    if (hasLowercase) points += 1;
    if (hasUppercase) points += 1;
    if (hasNumbers) points += 1;
    if (hasSymbols) points += 1;
  }
  
  if (!hasLowercase) feedback.suggestions.push("Include lowercase letters (a-z).");
  if (!hasUppercase) feedback.suggestions.push("Include uppercase letters (A-Z).");
  if (!hasNumbers) feedback.suggestions.push("Include numbers (0-9).");
  if (!hasSymbols) feedback.suggestions.push("Include symbols (e.g., !@#$).");


  // Determine score, text, color based on points
  // Max points can be 2 (length) + 4 (variety) = 6
  let score: PasswordStrengthResult['score'];
  let text: string;
  let progressValue: number;
  let colorClass: string;
  let textColorClass: string;

  if (password.length < 8) { // Override score if too short
    score = 0;
  } else if (points <= 2) { // 1-2 variety points + 1 length point OR 0 variety + 2 length points
    score = 1;
  } else if (points <= 3) { // e.g. length 8-11 (1pt) + 2 types (2pt) = 3
    score = 2;
  } else if (points <= 5) { // e.g. length >=12 (2pt) + 2-3 types (2-3pt) = 4-5
    score = 3;
  } else { // points >= 6
    score = 4;
  }
  
  // If specifically too short, force Very Weak regardless of variety points
  if (password.length < 8) {
      score = 0;
  }


  switch (score) {
    case 0:
      text = 'Very Weak';
      progressValue = 20;
      colorClass = '[&>div]:bg-destructive';
      textColorClass = 'text-destructive';
      break;
    case 1:
      text = 'Weak';
      progressValue = 40;
      colorClass = '[&>div]:bg-orange-500';
      textColorClass = 'text-orange-500';
      break;
    case 2:
      text = 'Fair';
      progressValue = 60;
      colorClass = '[&>div]:bg-yellow-500';
      textColorClass = 'text-yellow-500';
      break;
    case 3:
      text = 'Good';
      progressValue = 80;
      colorClass = '[&>div]:bg-lime-500';
      textColorClass = 'text-lime-500';
      break;
    case 4:
      text = 'Strong';
      progressValue = 100;
      colorClass = '[&>div]:bg-green-500';
      textColorClass = 'text-green-500';
      break;
    default: // Should not happen
      text = 'Unknown';
      progressValue = 0;
      colorClass = '[&>div]:bg-slate-300';
      textColorClass = 'text-muted-foreground';
  }

  return { score, text, progressValue, colorClass, textColorClass, feedback };
}
