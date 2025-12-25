# DocumentIulia.ro - Keyboard Shortcuts Quick Reference

## 🚀 Quick Access

### Command Palette
```
⌘K (Mac) / Ctrl+K (Windows)
```
Fuzzy search for any command, page, or action. Recent commands appear first.

### Help Modal
```
Shift + ?
```
Shows this shortcuts guide

---

## 🧭 Navigation (Gmail-style)

Press `G` then one of these keys:

| Shortcut | Action |
|----------|--------|
| `G` then `H` | 🏠 Go to **Dashboard Home** |
| `G` then `I` | 📄 Go to **Invoices** |
| `G` then `P` | 👥 Go to **Partners** |
| `G` then `F` | 💰 Go to **Finance/Reports** |
| `G` then `S` | ⚙️ Go to **Settings** |

**How it works:**
1. Press `G` (you'll see "Sequence mode: G then..." indicator)
2. Within 2 seconds, press the second key
3. You're navigated to that page!

---

## ⚡ Quick Actions

| Shortcut | Action | Description |
|----------|--------|-------------|
| `N` | ✨ Create New | Context-aware creation<br/>• On Invoices → New Invoice<br/>• On Partners → New Partner<br/>• On OCR → Upload Document<br/>• Default → New Invoice |
| `/` | 🔍 Focus Search | Focuses search field or opens command palette |
| `Escape` | ❌ Close/Cancel | Closes modals, palettes, dialogs |

---

## 📋 Command Palette Features

When you open the palette with `⌘K` / `Ctrl+K`:

### Navigation
- **↑/↓** - Move between commands
- **Enter** - Execute selected command
- **Escape** - Close palette

### Search Tips
- Type anything to fuzzy search
- Searches: titles, descriptions, keywords, URLs
- Recent commands boost to top
- Smart scoring algorithm

### Categories
Commands are grouped into:
- 🧭 **Navigation** - Pages and sections
- ⚡ **Quick Actions** - Create, upload, calculate
- 📚 **Help & Resources** - Documentation, support

---

## 🎯 Available Commands in Palette

### Navigation
- Dashboard
- Invoices
- Partners
- Finance / Reports
- Analytics
- HR & Payroll
- OCR Documents
- VAT Reports
- e-Invoice (ANAF SPV)
- SAF-T D406
- Settings

### Quick Actions
- New Invoice
- Add Partner
- Upload Document (OCR)
- Calculate VAT
- Record Payment

### Resources
- Help & Documentation

---

## 💡 Pro Tips

### 1. Recent Commands
Your 5 most recent commands appear first in the palette for quick access.

### 2. Context-Aware "N"
The `N` key intelligently creates the right thing based on where you are:
- **On invoices page?** → Creates invoice
- **On partners page?** → Creates partner
- **On OCR page?** → Opens upload dialog

### 3. Search Shortcuts
Use `/` to quickly focus any search field. If no search field exists, it opens the command palette.

### 4. Escape Everything
Stuck in a modal? Palette open? Just press `Escape` - it closes everything.

### 5. Two Ways to Navigate
- **Fast typers**: Use `⌘K` and type
- **Keyboard purists**: Use `G + [letter]` sequences

---

## 🖥️ Platform Differences

### Mac
- `⌘K` - Command Palette
- `⌘ + [key]` - Actions

### Windows/Linux
- `Ctrl+K` - Command Palette
- `Ctrl + [key]` - Actions

The system automatically detects your platform and displays the right keys!

---

## 🔧 For Developers

### Add Custom Shortcuts

```tsx
import { useKeyboardShortcut } from '@/components/shortcuts';

function MyComponent() {
  const handleSave = () => {
    console.log('Saved!');
  };

  // Register shortcut
  useKeyboardShortcut(handleSave, {
    key: 's',
    ctrl: true,
    description: 'Save document',
    category: 'actions',
  });

  return <div>My Component</div>;
}
```

### Access Context

```tsx
import { useKeyboardShortcutsContext } from '@/components/shortcuts';

function MyComponent() {
  const {
    shortcuts,
    setShowCommandPalette,
    setShowShortcutsModal,
  } = useKeyboardShortcutsContext();

  // Open palette programmatically
  return (
    <button onClick={() => setShowCommandPalette(true)}>
      Open Palette
    </button>
  );
}
```

---

## 🌍 Multi-Language Support

The shortcuts system is fully translated:
- 🇬🇧 English (EN)
- 🇷🇴 Romanian (RO)
- More languages coming soon...

All shortcut labels, descriptions, and help text adapt to your selected language.

---

## ⚠️ Important Notes

### Input Protection
Shortcuts **won't trigger** when you're typing in:
- Text inputs (`<input>`)
- Text areas (`<textarea>`)
- Content-editable fields

**Exception:** `Escape` always works to close modals.

### Browser Conflicts
Some shortcuts may conflict with browser defaults:
- `Ctrl+S` - Browser save (we prevent this)
- `Ctrl+P` - Browser print (we prevent this)
- `Ctrl+F` - Browser find (use `/` instead)

---

## 📱 Mobile Support

⚠️ **Limited on mobile devices**

Physical keyboard shortcuts work on tablets with keyboards, but most mobile browsers don't support custom keyboard shortcuts. Use the touch UI instead.

---

## 🐛 Troubleshooting

### Shortcuts not working?
1. Make sure you're on the dashboard (shortcuts are scoped there)
2. Check you're not typing in an input field
3. Try pressing `Shift + ?` to see if help modal opens
4. Check browser console for errors

### Command palette not opening?
1. Try `Ctrl+K` (Windows) or `⌘K` (Mac)
2. Check if another app is stealing the shortcut
3. Try clicking any non-input area first

### Can't find a command?
1. Open palette with `⌘K`
2. Type part of what you're looking for
3. The fuzzy search will find it!
4. Commands are categorized - scroll through categories

---

## 📊 Statistics

- **Total Default Shortcuts**: 11
- **Command Palette Items**: 20+
- **Navigation Shortcuts**: 5
- **Action Shortcuts**: 3
- **General Shortcuts**: 3
- **Recent Commands Tracked**: 5

---

## 🎨 Customization

Want to customize shortcuts? Check the settings page (coming soon):
- Remap existing shortcuts
- Disable shortcuts you don't use
- Create new shortcuts
- Export/import configurations

---

## 📚 Learn More

- Full Documentation: `/components/shortcuts/README.md`
- Example Code: `/components/shortcuts/examples/`
- Implementation Details: `/KEYBOARD_SHORTCUTS_IMPLEMENTATION.md`

---

**Happy typing! ⌨️**

Press `Shift + ?` anytime to see shortcuts in the app.
