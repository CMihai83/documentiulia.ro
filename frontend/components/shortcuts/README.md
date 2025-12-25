# Keyboard Shortcuts System

A comprehensive keyboard shortcuts system for DocumentIulia.ro with support for global shortcuts, command palette, and contextual actions.

## Features

- **Global Keyboard Shortcuts**: Navigate quickly with keyboard combinations
- **Command Palette**: Fuzzy search for commands and pages (Ctrl+K / Cmd+K)
- **Sequence Mode**: Gmail-style shortcuts (G then H for Home)
- **Context-Aware Actions**: Smart "N" key creates based on current page
- **Mac/Windows Support**: Automatically handles Cmd vs Ctrl keys
- **Input Protection**: Doesn't trigger when typing in form fields
- **Accessibility**: Fully keyboard navigable with ARIA support
- **Help Modal**: Press ? to see all available shortcuts
- **Recent Commands**: Tracks frequently used commands in palette
- **Translations**: Full i18n support (Romanian/English/etc.)

## Installation

The system is already integrated into the dashboard layout. No additional setup required.

## Components

### 1. KeyboardShortcutsProvider

Context provider that manages global keyboard shortcuts.

```tsx
import { KeyboardShortcutsProvider } from '@/components/shortcuts';

function App() {
  return (
    <KeyboardShortcutsProvider enabled>
      {/* Your app */}
    </KeyboardShortcutsProvider>
  );
}
```

### 2. useKeyboardShortcut Hook

Register custom shortcuts in your components:

```tsx
import { useKeyboardShortcut } from '@/components/shortcuts';

function MyComponent() {
  const handleSave = () => {
    // Save logic
  };

  useKeyboardShortcut(handleSave, {
    key: 's',
    ctrl: true,
    description: 'Save document',
    category: 'actions',
  });

  return <div>...</div>;
}
```

### 3. ShortcutsHelpModal

Modal showing all available shortcuts. Triggered by pressing `Shift + ?`.

### 4. CommandPalette

Searchable command palette. Triggered by pressing `Ctrl/Cmd + K`.

## Default Shortcuts

### Navigation (G then key)
- `G` then `H` - Go to Dashboard Home
- `G` then `I` - Go to Invoices
- `G` then `P` - Go to Partners
- `G` then `F` - Go to Finance
- `G` then `S` - Go to Settings

### Actions
- `Ctrl/Cmd + K` - Open Command Palette
- `N` - Create New (context-aware)
  - On invoices page: Creates new invoice
  - On partners page: Creates new partner
  - On OCR page: Triggers upload

### General
- `Shift + ?` - Show Keyboard Shortcuts Help
- `/` - Focus Search (or open command palette)
- `Escape` - Close Modals/Palettes

## Command Palette Features

### Fuzzy Search
Smart matching algorithm that searches:
- Command titles
- Descriptions
- Keywords
- URLs

### Recent Commands
Automatically tracks your 5 most recently used commands for quick access.

### Keyboard Navigation
- `↑/↓` - Navigate through commands
- `Enter` - Execute selected command
- `Escape` - Close palette

### Scoring Algorithm
Commands are scored based on:
- Exact matches (100 points)
- Title starts with search (50 points)
- Title contains search (25 points)
- Description match (15 points)
- Keyword match (10 points)
- Recently used boost (+20 points)

## Usage Examples

### Basic Usage

The system is automatically active in the dashboard. Just press shortcuts!

### Custom Shortcut in Component

```tsx
'use client';

import { useKeyboardShortcut } from '@/components/shortcuts';
import { useState } from 'react';

function InvoiceEditor() {
  const [invoice, setInvoice] = useState(null);

  const handleSave = () => {
    // Save invoice
    console.log('Saving invoice...');
  };

  const handlePreview = () => {
    // Preview invoice
    console.log('Previewing invoice...');
  };

  // Register shortcuts
  useKeyboardShortcut(handleSave, {
    key: 's',
    ctrl: true,
    description: 'Save invoice',
    category: 'actions',
  });

  useKeyboardShortcut(handlePreview, {
    key: 'p',
    ctrl: true,
    shift: true,
    description: 'Preview invoice',
    category: 'actions',
  });

  return <div>Invoice Editor</div>;
}
```

### Programmatic Access

```tsx
import { useKeyboardShortcutsContext } from '@/components/shortcuts';

function MyComponent() {
  const {
    shortcuts,
    registerShortcut,
    setShowCommandPalette,
  } = useKeyboardShortcutsContext();

  const openPalette = () => {
    setShowCommandPalette(true);
  };

  return <button onClick={openPalette}>Open Palette</button>;
}
```

## Technical Details

### Input Protection

Shortcuts don't trigger when:
- Typing in `<input>` fields
- Typing in `<textarea>` fields
- Editing contentEditable elements
- Exception: Escape key always works

### Mac vs Windows

The system automatically detects the platform and adjusts:
- Ctrl on Windows/Linux → Cmd (⌘) on Mac
- Alt on Windows/Linux → Option (⌥) on Mac
- Shift on Windows/Linux → Shift (⇧) on Mac

### Sequence Mode

Gmail-style two-key sequences:
1. Press `G` - enters sequence mode (2 second timeout)
2. Press second key - executes navigation shortcut
3. Visual indicator shows "G then..." in help modal

### Storage

Recent commands are stored in localStorage:
- Key: `recentCommands`
- Format: JSON array of command IDs
- Max: 5 commands

## Translations

Add translations in `messages/{locale}.json`:

```json
{
  "shortcuts": {
    "title": "Keyboard Shortcuts",
    "subtitle": "Quick navigation and actions",
    "navigation": "Navigation",
    "actions": "Quick Actions",
    "general": "General",
    "hint": "Press Shift + ? anytime to see shortcuts"
  }
}
```

## Accessibility

- Full keyboard navigation
- ARIA labels on interactive elements
- Focus management
- Screen reader friendly
- High contrast support in dark mode

## Browser Support

- Chrome/Edge (Chromium): ✅
- Firefox: ✅
- Safari: ✅
- Mobile browsers: ⚠️ (limited - iOS/Android don't support all keyboard shortcuts)

## Performance

- Zero dependencies (only React/Next.js)
- Minimal re-renders with context optimization
- Event listeners cleaned up on unmount
- LocalStorage for persistence

## Future Enhancements

- [ ] Customizable shortcuts (user preferences)
- [ ] Export/import shortcut configurations
- [ ] Visual shortcut hints on hover
- [ ] Shortcut conflicts detection
- [ ] Mobile gesture alternatives
- [ ] Analytics for most-used commands

## Troubleshooting

### Shortcuts not working

1. Check if KeyboardShortcutsProvider is wrapping your component
2. Ensure shortcuts are registered within the provider
3. Check browser console for errors
4. Try pressing Shift+? to see if help modal opens

### Conflicts with browser shortcuts

Some shortcuts may conflict with browser defaults:
- `Ctrl+S` - Browser save (prevented by system)
- `Ctrl+P` - Browser print (prevented by system)
- `Ctrl+F` - Browser find (use `/` instead)

### Command Palette not searching

1. Clear localStorage: `localStorage.removeItem('recentCommands')`
2. Check translations are loaded
3. Verify command definitions in CommandPalette.tsx

## License

Part of DocumentIulia.ro platform. Internal use only.
