# Custom hook for tiktoken (tokenizer used by whisper)

from PyInstaller.utils.hooks import collect_data_files, collect_submodules, logger
import os

# Collect all tiktoken submodules
hiddenimports = collect_submodules('tiktoken')

# Add explicit imports
hiddenimports.extend([
    'tiktoken',
    'tiktoken_ext',
    'tiktoken_ext.openai_public',
    'tiktoken.core',
    'tiktoken.load',
    'tiktoken.model',
    'tiktoken.registry',
])

# Collect data files
datas = collect_data_files('tiktoken')

# Try to add tiktoken_ext data files explicitly
try:
    import tiktoken_ext
    from pathlib import Path
    tiktoken_ext_path = Path(tiktoken_ext.__file__).parent
    for py_file in tiktoken_ext_path.glob('*.py'):
        datas.append((str(py_file), 'tiktoken_ext'))
except Exception as e:
    logger.warning(f"Could not collect tiktoken_ext: {e}")

# Remove duplicates
hiddenimports = list(set(hiddenimports))
binaries = []
