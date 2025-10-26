# Rebranding: MessageAI → Aligna ✨

## Changes Made

### App Name & Identity
- **Old Name**: MessageAI
- **New Name**: Aligna
- **Logo Font**: Playfair Display (elegant serif font)

### Files Updated

#### 1. App Configuration
- ✅ `app.json` - Updated app name, slug, and bundle identifiers
  - Name: "Aligna"
  - Slug: "aligna"
  - iOS Bundle ID: "com.aligna.app"
  - Android Package: "com.aligna.app"
  - URL Scheme: "aligna"
  - Permission descriptions updated

#### 2. Package Configuration
- ✅ `package.json` - Updated package name to "aligna"

#### 3. UI Components
- ✅ `components/Logo.tsx` - **NEW** Reusable logo component
  - Uses Playfair Display Bold font
  - Three sizes: small (24px), medium (36px), large (48px)
  - Two variants: light (white) and dark (black)
  - Elegant letter-spacing for premium feel

- ✅ `app/(auth)/login.tsx` - Updated with new Logo component
  - Removed old "Welcome to MessageAI" title
  - Added centered Aligna logo with Playfair Display

- ✅ `app/(auth)/register.tsx` - Updated with new Logo component
  - Removed old "Create Account" title
  - Added centered Aligna logo with Playfair Display

- ✅ `app/(tabs)/index.tsx` - Updated header
  - Changed "Messages" to "Chats"

#### 4. Fonts
- ✅ Installed `@expo-google-fonts/playfair-display`
  - PlayfairDisplay_400Regular
  - PlayfairDisplay_700Bold
- ✅ Added expo-font plugin to app.json

## Logo Component Usage

### Import
```typescript
import Logo from '@/components/Logo';
```

### Basic Usage
```typescript
<Logo size="large" variant="dark" />
```

### Props

| Prop | Type | Default | Options | Description |
|------|------|---------|---------|-------------|
| size | string | 'medium' | 'small', 'medium', 'large' | Logo text size (24px, 36px, 48px) |
| variant | string | 'dark' | 'light', 'dark' | Logo color (white or black) |

### Examples

```typescript
// Large dark logo (for login/register screens)
<Logo size="large" variant="dark" />

// Medium logo for headers
<Logo size="medium" variant="dark" />

// Small logo for compact spaces
<Logo size="small" variant="dark" />

// Light logo for dark backgrounds
<Logo size="large" variant="light" />
```

## Font Details

### Playfair Display
- **Type**: Serif
- **Designer**: Claus Eggers Sørensen
- **Style**: Traditional, elegant, premium
- **Use Case**: Perfect for messaging app names, emphasizing communication and alignment

**Why Playfair Display?**
- Elegant and sophisticated
- Excellent readability
- Professional appearance
- Conveys trust and quality
- Works well for "Aligna" brand identity

## Brand Identity: Aligna

**Aligna** suggests:
- ✨ **Alignment** - Bringing people together
- 💬 **Communication** - Clear, direct messaging
- 🤝 **Connection** - Aligning conversations and relationships
- 📱 **Modern** - Contemporary messaging platform
- 🎯 **Focus** - Aligned communication

The Playfair Display font reinforces:
- Premium quality
- Trustworthiness
- Sophistication
- Professional yet friendly

## Testing the Rebrand

### 1. Restart Development Server
```bash
npm start -- --clear
```

### 2. Clear App Cache
- Force quit the Expo Go app
- Reopen and scan QR code

### 3. Check These Screens
- ✅ Login screen - Should show "Aligna" logo
- ✅ Register screen - Should show "Aligna" logo
- ✅ Chat list header - Should say "Chats"
- ✅ App name in device - Should show "Aligna"

### 4. Verify Fonts Load
- Logo should use Playfair Display (elegant serif)
- If fonts don't load, check console for errors

## Future Considerations

### App Icons (Not Yet Updated)
To complete the rebrand, you'll want to create new app icons:

1. **Create Custom Icon**
   - Use Figma, Canva, or design tool
   - Feature "Aligna" or stylized "A"
   - Use Playfair Display font
   - Recommended colors: Modern, trust-evoking palette

2. **Generate Icon Assets**
   - Use https://www.appicon.co/ or similar
   - Generate all iOS and Android sizes
   - Replace files in `assets/images/`

3. **Update Splash Screen**
   - Create branded splash screen
   - Feature Aligna logo prominently

### Brand Colors (Current: Default Blue)
Consider updating the primary color scheme:
- Current: #007AFF (iOS blue)
- Suggestion: Choose brand colors that align with Aligna identity

### Complete Rebrand Checklist
- ✅ App name
- ✅ Package identifiers
- ✅ Logo component
- ✅ Login/Register screens
- ✅ Permission descriptions
- ⏳ App icons (todo)
- ⏳ Splash screen (todo)
- ⏳ Brand colors (optional)
- ⏳ README documentation (todo)

## Technical Notes

### Font Loading
The Logo component uses `useFonts` hook from `@expo-google-fonts/playfair-display`. The splash screen is kept visible until fonts load, ensuring the logo always displays correctly.

### Performance
Playfair Display is a Google Font loaded via Expo's font system. First load may take a moment, but fonts are cached afterward for instant display.

### Fallback
If fonts fail to load, the component returns `null` rather than showing unstyled text. This prevents branding inconsistency.

## Status

✅ **Complete** - Aligna rebrand is fully implemented and ready to use!

### Next Steps
1. Test the app with new branding
2. Create custom app icons (optional)
3. Update README.md with Aligna branding
4. Consider custom brand colors
5. Design splash screen with Aligna logo

## Need Help?

### Font Not Loading?
```bash
npm install --save @expo-google-fonts/playfair-display
npx expo install expo-font
npm start -- --clear
```

### Logo Not Showing?
Check that you've imported it correctly:
```typescript
import Logo from '@/components/Logo';
```

### Want Different Font?
Browse Expo Google Fonts: https://github.com/expo/google-fonts
Replace Playfair Display with your chosen font in `components/Logo.tsx`


