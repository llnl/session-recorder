# Custom hook for openai-whisper that ensures all components are bundled
# This overrides any potentially broken hooks from pyinstaller-hooks-contrib

from PyInstaller.utils.hooks import collect_data_files, collect_submodules, logger
import os
import sys

# Collect all whisper submodules
hiddenimports = collect_submodules('whisper')

# Explicitly add critical modules that might be missed
hiddenimports.extend([
    'whisper',
    'whisper.audio',
    'whisper.decoding',
    'whisper.model',
    'whisper.tokenizer',
    'whisper.transcribe',
    'whisper.timing',
    'whisper.normalizers',
    'whisper.utils',
])

# Collect whisper data files (including assets like mel_filters.npz)
datas = collect_data_files('whisper')

# Explicitly add whisper assets directory
try:
    import whisper
    from pathlib import Path
    whisper_path = Path(whisper.__file__).parent

    # Add assets directory (mel filters, vocabulary, etc.)
    assets_path = whisper_path / 'assets'
    if assets_path.exists():
        for asset_file in assets_path.iterdir():
            if asset_file.is_file():
                datas.append((str(asset_file), 'whisper/assets'))

    # Add normalizers directory if exists
    normalizers_path = whisper_path / 'normalizers'
    if normalizers_path.exists():
        for norm_file in normalizers_path.iterdir():
            if norm_file.is_file():
                datas.append((str(norm_file), 'whisper/normalizers'))

except Exception as e:
    logger.warning(f"Could not collect whisper assets: {e}")

# Whisper dependencies that might be missed
hiddenimports.extend([
    # tiktoken for tokenization
    'tiktoken',
    'tiktoken_ext',
    'tiktoken_ext.openai_public',

    # regex for text processing
    'regex',
    'regex._regex',

    # tqdm for progress bars
    'tqdm',

    # more-itertools used by whisper
    'more_itertools',

    # numba for audio processing
    'numba',
    'numba.core',
    'numba.np',
])

# Remove duplicates
hiddenimports = list(set(hiddenimports))

# No binaries needed for whisper itself (it uses torch)
binaries = []
