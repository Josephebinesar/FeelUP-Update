# 🚨 IMMEDIATE ACTION CHECKLIST

## Critical Security Issues (DO THESE NOW!)

### 1. ✅ Rotate ALL API Keys
Your API keys are exposed in `.env.local`. You need to:

- [ ] **OpenAI**: Go to https://platform.openai.com/api-keys and create a new key
- [ ] **Supabase**: Go to your Supabase dashboard → Settings → API → Reset service role key
- [ ] **Cloudinary**: Go to Cloudinary dashboard → Settings → Security → Regenerate API secret
- [ ] **GitHub OAuth**: Go to GitHub → Settings → Developer settings → OAuth Apps → Regenerate secret
- [ ] **Google OAuth**: Go to Google Cloud Console → Credentials → Regenerate client secret

### 2. ✅ Secure Your Repository
```bash
# Add .env.local to .gitignore if not already there
echo ".env.local" >> .gitignore

# Remove .env.local from git history (IMPORTANT!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.local" \
  --prune-empty --tag-name-filter cat -- --all

# Force push to remote (WARNING: This rewrites history)
git push origin --force --all
```

### 3. ✅ Create .env.example
Create a template file for other developers:

```bash
# .env.example
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth
GITHUB_ID=your_github_id
GITHUB_SECRET=your_github_secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Workers AI (optional)
WORKERS_AI_URL=your_workers_ai_url
```

---

## Critical Bug Fixes

### 4. ✅ Fix OpenAI API Endpoint

**File**: `app/api/detect-mood/route.ts`

**Line 90-124**: Replace the entire fetch call with:

```typescript
const r = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  signal: controller.signal,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          [
            "Classify the user's message into exactly ONE mood from the list.",
            "Pick the closest mood even if the message is short.",
            "Do NOT default to Thoughtful unless the text is reflective (thinking/meaning/unsure).",
            "If positive like 'today is good' => Happy.",
            "If stress/overwhelm like 'day is hectic' => Anxious.",
            "Return ONLY strict JSON with keys: mood, confidence, reason.",
          ].join(" "),
      },
      { role: "user", content: raw },
    ],
    response_format: { type: "json_object" },
  }),
});
```

**Line 144**: Update the response parsing:

```typescript
const data = await r.json();
const outputText = data.choices?.[0]?.message?.content;
if (!outputText) return noSuggestion("AI response unreadable. Check server logs.", data);
```

### 5. ✅ Run Database Migration

**Steps**:
1. Go to https://supabase.com/dashboard
2. Select your FeelUp project
3. Click **SQL Editor** → **New Query**
4. Copy and paste this SQL:

```sql
-- Add missing columns to mood_posts
ALTER TABLE public.mood_posts 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS mood TEXT,
ADD COLUMN IF NOT EXISTS mood_color TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add missing username column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mood_posts_owner_id ON public.mood_posts(owner_id);
CREATE INDEX IF NOT EXISTS idx_mood_posts_created_at ON public.mood_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Update RLS policies
DROP POLICY IF EXISTS "Allow all operations on mood_posts" ON public.mood_posts;
CREATE POLICY "Allow all operations on mood_posts" ON public.mood_posts FOR ALL USING (true);

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'mood_posts' 
AND table_schema = 'public'
ORDER BY ordinal_position;
```

5. Click **RUN**
6. Verify you see the new columns in the output

---

## Code Cleanup

### 6. ✅ Remove Debug Logs

**Files to clean**:

1. `components/MoodInput.tsx` (Line 54):
```typescript
// REMOVE THIS LINE:
console.log("AI response:", data); // 👈 DEBUG (REMOVE LATER)
```

2. `app/api/mood-posts/route.ts` (Line 164):
```typescript
// REMOVE THIS LINE:
console.log("Mood post created successfully:", newPost);
```

3. Search for all console.log statements:
```bash
# Run this in your terminal to find all console.log
grep -r "console.log" --include="*.ts" --include="*.tsx" app/ components/
```

### 7. ✅ Remove Commented Code

**File**: `app/api/mood-posts/route.ts` (Lines 137-154)

Delete the entire commented-out Cloudinary upload block or implement it properly.

---

## Quick Wins

### 8. ✅ Add TypeScript Strict Mode

**File**: `tsconfig.json`

Change line 11:
```json
"strict": true,  // Already enabled ✅
```

But also add:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 9. ✅ Fix ESLint Config

**File**: `eslint.config.mjs`

Remove or comment out these lines:
```javascript
// BEFORE (Lines 11, 23)
"@typescript-eslint/no-explicit-any": "off",
"@typescript-eslint/no-unused-vars": "off",

// AFTER
"@typescript-eslint/no-explicit-any": "warn",  // Change to warn
"@typescript-eslint/no-unused-vars": "warn",   // Change to warn
```

### 10. ✅ Add Image Domains to Next.js Config

**File**: `next.config.ts`

Replace entire file with:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

export default nextConfig;
```

---

## Verification Steps

After completing the above:

### Test the Application
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# In another terminal, run linter
npm run lint

# Check for TypeScript errors
npx tsc --noEmit
```

### Test Mood Detection
1. Go to http://localhost:3000/mood-feed
2. Type "I'm feeling great today!"
3. Wait for AI mood detection
4. Should show "Happy 😊" with confidence score

### Test Database
1. Create a mood post
2. Check if it appears in the feed
3. Try uploading an image
4. Verify reactions and comments work

---

## What to Do If Something Breaks

### OpenAI API Errors
- Check your API key is valid
- Check you have credits in your OpenAI account
- Check the endpoint is correct: `/v1/chat/completions`

### Database Errors
- Check Supabase connection
- Verify migration ran successfully
- Check RLS policies in Supabase dashboard

### Build Errors
- Clear `.next` folder: `rm -rf .next`
- Clear node_modules: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npx tsc --noEmit`

---

## Next Steps After Immediate Fixes

1. Read the full analysis: `CODE_ANALYSIS_AND_IMPROVEMENTS.md`
2. Prioritize improvements based on your needs
3. Set up testing infrastructure
4. Add monitoring and error tracking
5. Implement performance optimizations

---

**Estimated Time**: 30-60 minutes for all immediate actions

**Priority**: 🔴 CRITICAL - Do these before deploying to production!
