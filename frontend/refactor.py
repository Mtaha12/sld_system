import os
import re

directory = r'd:\SLD_SYSTEM\frontend\src'

replacements = {
    # Backgrounds
    r'\bbg-white\b': 'bg-theme-surface',
    r'\bbg-gray-50/50\b': 'bg-theme-surface-alt/50',
    r'\bbg-gray-50\b': 'bg-theme-surface-alt',
    r'\bbg-gray-100\b': 'bg-theme-surface-hover',
    r'\bbg-\[\#FAFAFA\]\b': 'bg-theme-surface-alt',
    r'\bbg-\[\#FFF8F6\]\b': 'bg-theme-surface-alt',
    r'\bbg-blue-50/50\b': 'bg-blue-500/10',
    r'\bbg-blue-50\b': 'bg-blue-500/20',

    # Text
    r'\btext-gray-900\b': 'text-theme-main',
    r'\btext-gray-800\b': 'text-theme-main',
    r'\btext-gray-700\b': 'text-theme-main',
    r'\btext-gray-600\b': 'text-theme-muted',
    r'\btext-gray-500\b': 'text-theme-muted',
    r'\btext-gray-400\b': 'text-theme-disabled',
    
    # Borders & Rings
    r'\bborder-gray-200\b': 'border-theme-border',
    r'\bborder-gray-100\b': 'border-theme-border/50',
    r'\bdivide-gray-200\b': 'divide-theme-border',
    r'\bdivide-gray-100\b': 'divide-theme-border/50',
    r'\bring-gray-200\b': 'ring-theme-border',
}

exclude_files = [
    'AuthLayout.jsx',
    'AuthMasonry.jsx',
    'LoginForm.jsx',
    'SignupForm.jsx',
    'VerifyEmailForm.jsx',
    'ForgotPasswordForm.jsx',
    'AdminSidebar.jsx' # Keeps its unique dark styling
]

def process_file(filepath):
    filename = os.path.basename(filepath)
    if filename in exclude_files:
        return

    with open(filepath, 'r', encoding='utf-8') as file:
        content = file.read()
    
    original_content = content
    for old, new in replacements.items():
        content = re.sub(old, new, content)
        
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f"Updated: {filepath}")

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            process_file(os.path.join(root, file))

print("Refactoring complete.")
