# Adding New Languages

This guide explains how to add a new language to the application's internationalization (i18n) system.

## Overview

The application uses a centralized translation system located in `UI/src/js/utils/i18n.js`. To add a new language, follow these steps in order:

1. **`UI/src/js/utils/i18n.js`** - Add the new language code and all translation keys to the `translations` object
2. **`UI/src/pages/workflow/settings.js`** - Add the language option to the language dropdown (around line 193-195)
3. **`UI/src/pages/workflow/settings.js`** - Update the language comment to include the new language code (around line 34, optional)
4. **Test** - Start the application, go to Settings, select the new language, and verify all UI elements are translated correctly

## Step-by-Step Guide

### Step 1: Add Translations to `i18n.js`

Open `UI/src/js/utils/i18n.js` and locate the `translations` object. Add your new language code as a key:

```javascript
const translations = {
    ko: {
        // Korean translations...
    },
    en: {
        // English translations...
    },
    ja: {  // Example: Adding Japanese
        // Japanese translations...
    }
};
```

### Step 2: Add All Translation Keys

You must add translations for **all** existing translation keys. The translation keys are organized hierarchically:

- `common.*` - Common UI elements (buttons, labels, etc.)
- `settings.*` - Settings page items
- `sidebar.*` - Sidebar menu items
- `header.*` - Page headers
- `history.*` - History page items
- `dashboard.*` - Dashboard page items

**Important**: Every key that exists in `ko` and `en` must also exist in your new language, otherwise the translation key itself will be displayed to users.

Example:

```javascript
const translations = {
    ko: {
        common: {
            ok: '확인',
            cancel: '취소',
            save: '저장'
        }
    },
    en: {
        common: {
            ok: 'OK',
            cancel: 'Cancel',
            save: 'Save'
        }
    },
    ja: {  // New language
        common: {
            ok: 'OK',
            cancel: 'キャンセル',
            save: '保存'
        }
    }
};
```

### Step 3: Add Language Option to Settings Page

Open `UI/src/pages/workflow/settings.js` and locate the language dropdown (around line 193-195). Add your new language option:

```javascript
<select class="settings-select" id="setting-language">
    <option value="ko" ${this.settings.appearance.language === 'ko' ? 'selected' : ''}>한국어</option>
    <option value="en" ${this.settings.appearance.language === 'en' ? 'selected' : ''}>English</option>
    <option value="ja" ${this.settings.appearance.language === 'ja' ? 'selected' : ''}>日本語</option>  <!-- New language -->
</select>
```

### Step 4: Update Default Language Comment (Optional)

In `settings.js`, update the comment that lists available languages (around line 34):

```javascript
language: 'ko' // 'ko', 'en', 'ja'  // Updated comment
```

## Translation Key Structure

The translation keys follow a hierarchical structure. Here's a complete example of what needs to be translated:

```javascript
{
    common: {
        ok: '...',
        cancel: '...',
        save: '...',
        delete: '...',
        // ... many more keys
    },
    settings: {
        appearance: '...',
        theme: '...',
        language: '...',
        // ... many more keys
    },
    sidebar: {
        // ... sidebar keys
    },
    header: {
        // ... header keys
    },
    history: {
        // ... history keys
    },
    dashboard: {
        // ... dashboard keys
    }
}
```

## Finding All Translation Keys

To find all translation keys that need to be translated:

1. Open `UI/src/js/utils/i18n.js`
2. Look at the `ko` (Korean) object - this contains all keys
3. Ensure your new language has the same structure with all keys translated

## Testing

After adding a new language:

1. Start the application
2. Go to Settings page
3. Select your new language from the dropdown
4. Verify that all UI elements are translated correctly
5. Navigate through different pages (Dashboard, History, etc.) to ensure translations work everywhere

## Common Issues

### Translation Key Appears Instead of Text

**Problem**: You see something like `common.save` instead of the translated text.

**Solution**: Make sure the translation key exists in your new language object. Check for typos in the key name.

### Missing Translations

**Problem**: Some UI elements are not translated.

**Solution**: Ensure you've added all translation keys. Compare your new language object structure with the `ko` or `en` objects to find missing keys.

### Language Not Appearing in Dropdown

**Problem**: Your new language doesn't appear in the settings dropdown.

**Solution**: Make sure you've added the `<option>` tag in `settings.js` with the correct `value` attribute matching your language code.

## Language Code Standards

Use standard ISO 639-1 language codes (2 letters):

- `ko` - Korean
- `en` - English
- `ja` - Japanese
- `zh` - Chinese
- `es` - Spanish
- `fr` - French
- `de` - German
- etc.

## Example: Adding Japanese

Here's a complete example of adding Japanese (`ja`) as a new language:

### 1. Add to `i18n.js`:

```javascript
const translations = {
    ko: { /* ... */ },
    en: { /* ... */ },
    ja: {
        common: {
            ok: 'OK',
            cancel: 'キャンセル',
            save: '保存',
            delete: '削除',
            // ... add all other keys
        },
        settings: {
            // ... add all settings keys
        },
        // ... add all other sections
    }
};
```

### 2. Add to `settings.js`:

```javascript
<select class="settings-select" id="setting-language">
    <option value="ko">한국어</option>
    <option value="en">English</option>
    <option value="ja">日本語</option>
</select>
```

## Related Files

- `UI/src/js/utils/i18n.js` - Main translation file
- `UI/src/pages/workflow/settings.js` - Settings page with language selector
- `UI/src/pages/workflow/page-router.js` - Language change event handling

## Notes

- The language setting is saved to both localStorage and the database
- Language changes trigger a `languageChanged` event that updates all UI elements
- The system automatically falls back to the translation key if a translation is missing
- All existing translation keys must be present in the new language to avoid displaying raw keys
