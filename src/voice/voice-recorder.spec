# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for voice-recorder

This creates a standalone executable for Windows, macOS, and Linux.
The bundle includes:
- Python runtime
- OpenAI Whisper
- PyTorch (CPU-only for smaller size)
- sounddevice, soundfile, numpy

Build commands:
    Windows:  pyinstaller voice-recorder.spec
    macOS:    pyinstaller voice-recorder.spec
    Linux:    pyinstaller voice-recorder.spec

Output:
    dist/voice-recorder/voice-recorder[.exe]

Note: Must be built on target platform (no cross-compilation)
"""

import sys
import os
from pathlib import Path
from PyInstaller.utils.hooks import collect_data_files, collect_dynamic_libs, collect_submodules, collect_all

# Get the directory containing this spec file
spec_dir = os.path.dirname(os.path.abspath(SPEC))

# Determine platform
is_windows = sys.platform == 'win32'
is_macos = sys.platform == 'darwin'
is_linux = sys.platform.startswith('linux')

# Platform-specific settings
if is_windows:
    exe_name = 'voice-recorder.exe'
    icon_file = None  # Add icon path if available
elif is_macos:
    exe_name = 'voice-recorder'
    icon_file = None  # Add .icns file if available
else:
    exe_name = 'voice-recorder'
    icon_file = None

# Collect all torch submodules dynamically
torch_hidden_imports = []
try:
    torch_hidden_imports = collect_submodules('torch')
    # Filter out CUDA-related modules to reduce size
    torch_hidden_imports = [m for m in torch_hidden_imports
                           if not any(x in m for x in ['cuda', 'cudnn', 'nccl'])]
except Exception as e:
    print(f"Warning: Could not collect torch submodules: {e}")

# Collect all whisper submodules dynamically
whisper_hidden_imports = []
try:
    whisper_hidden_imports = collect_submodules('whisper')
except Exception as e:
    print(f"Warning: Could not collect whisper submodules: {e}")

# Hidden imports that PyInstaller might miss
hidden_imports = [
    # Whisper dependencies (explicit)
    'whisper',
    'whisper.audio',
    'whisper.decoding',
    'whisper.model',
    'whisper.tokenizer',
    'whisper.transcribe',
    'whisper.timing',
    'whisper.normalizers',

    # PyTorch core (explicit)
    'torch',
    'torch._C',
    'torch._C._fft',
    'torch._C._linalg',
    'torch._C._nn',
    'torch._C._sparse',
    'torch._C._special',
    'torch.nn',
    'torch.nn.functional',
    'torch.nn.modules',
    'torch.nn.modules.module',
    'torch.utils',
    'torch.utils.data',
    'torch.autograd',
    'torch.autograd.function',
    'torch.jit',
    'torch.serialization',
    'torch.storage',
    'torch._utils',
    'torch.version',
    'torch.backends',
    'torch.backends.mkl',
    'torch.backends.mkldnn',
    'torch.backends.openmp',

    # NumPy and audio
    'numpy',
    'numpy._core',
    'numpy._core._methods',
    'numpy._core._multiarray_umath',
    'numpy.lib.format',
    'numpy.fft',
    'numpy.linalg',
    'numpy.random',
    'sounddevice',
    'soundfile',

    # Numba and LLVM (for Whisper audio processing)
    'numba',
    'numba.core',
    'numba.np',
    'llvmlite',
    'llvmlite.binding',

    # Standard library often missed
    'encodings',
    'encodings.utf_8',
    'encodings.ascii',
    'encodings.latin_1',

    # Additional dependencies
    'tiktoken',
    'tiktoken_ext',
    'tiktoken_ext.openai_public',
    'regex',
    'regex._regex',
    'tqdm',
    'more_itertools',

    # File handling
    'cffi',
    'pycparser',
]

# Add dynamically collected imports
hidden_imports.extend(torch_hidden_imports)
hidden_imports.extend(whisper_hidden_imports)

# Remove duplicates while preserving order
hidden_imports = list(dict.fromkeys(hidden_imports))

# Collect data files
datas = []

# Use collect_all for torch - this collects datas, binaries, AND hiddenimports
torch_datas_all = []
torch_binaries_all = []
torch_hiddenimports_all = []
try:
    torch_datas_all, torch_binaries_all, torch_hiddenimports_all = collect_all('torch')
    # Filter out CUDA binaries
    torch_binaries_all = [(src, dest) for src, dest in torch_binaries_all
                          if not any(x in os.path.basename(src).lower() for x in ['cuda', 'cudnn', 'cublas', 'nvrtc', 'nccl'])]
    datas.extend(torch_datas_all)
    print(f"collect_all torch: {len(torch_datas_all)} datas, {len(torch_binaries_all)} binaries, {len(torch_hiddenimports_all)} imports")
except Exception as e:
    print(f"Warning: collect_all torch failed: {e}")
    # Fallback to collect_data_files
    try:
        torch_datas = collect_data_files('torch')
        datas.extend(torch_datas)
        print(f"Fallback: Collected {len(torch_datas)} torch data files")
    except Exception as e2:
        print(f"Warning: Could not collect torch data files: {e2}")

# Use collect_all for whisper
whisper_datas_all = []
whisper_binaries_all = []
whisper_hiddenimports_all = []
try:
    whisper_datas_all, whisper_binaries_all, whisper_hiddenimports_all = collect_all('whisper')
    datas.extend(whisper_datas_all)
    print(f"collect_all whisper: {len(whisper_datas_all)} datas, {len(whisper_binaries_all)} binaries, {len(whisper_hiddenimports_all)} imports")
except Exception as e:
    print(f"Warning: collect_all whisper failed: {e}")
    # Fallback to collect_data_files
    try:
        whisper_datas = collect_data_files('whisper')
        datas.extend(whisper_datas)
        print(f"Fallback: Collected {len(whisper_datas)} whisper data files")
    except Exception as e2:
        print(f"Warning: Could not collect whisper data files: {e2}")

# Also try to find Whisper assets explicitly (mel filters, vocab)
try:
    import whisper
    whisper_path = Path(whisper.__file__).parent
    assets_path = whisper_path / 'assets'
    if assets_path.exists():
        datas.append((str(assets_path), 'whisper/assets'))
        print(f"Added whisper assets from {assets_path}")
except ImportError:
    print("Warning: whisper not installed, assets won't be bundled")

# Collect tiktoken encodings
try:
    import tiktoken
    tiktoken_path = Path(tiktoken.__file__).parent
    datas.append((str(tiktoken_path), 'tiktoken'))
except ImportError:
    print("Warning: tiktoken not installed")

# Collect numba data files
try:
    numba_datas = collect_data_files('numba')
    datas.extend(numba_datas)
    print(f"Collected {len(numba_datas)} numba data files")
except Exception as e:
    print(f"Warning: Could not collect numba data files: {e}")

# Collect llvmlite data files
try:
    llvmlite_datas = collect_data_files('llvmlite')
    datas.extend(llvmlite_datas)
    print(f"Collected {len(llvmlite_datas)} llvmlite data files")
except Exception as e:
    print(f"Warning: Could not collect llvmlite data files: {e}")

# Binaries to include (platform-specific libraries)
binaries = []

# Collect torch dynamic libraries explicitly
try:
    torch_binaries = collect_dynamic_libs('torch')
    # collect_dynamic_libs returns list of 2-tuples: (source_path, dest_dir)
    # Filter out CUDA libraries
    filtered_torch_binaries = []
    for item in torch_binaries:
        src_path = item[0]
        dest_dir = item[1] if len(item) > 1 else '.'
        name_lower = os.path.basename(src_path).lower()
        if not any(x in name_lower for x in ['cuda', 'cudnn', 'cublas', 'cufft', 'nvrtc', 'nccl']):
            filtered_torch_binaries.append((src_path, dest_dir))
    binaries.extend(filtered_torch_binaries)
    print(f"Collected {len(filtered_torch_binaries)} torch binaries")
except Exception as e:
    print(f"Warning: Could not collect torch binaries: {e}")

# Collect torch lib directory DLLs explicitly (Windows)
# Put them both in torch/lib AND in the root directory for maximum compatibility
if is_windows:
    try:
        import torch
        torch_lib_path = Path(torch.__file__).parent / 'lib'
        if torch_lib_path.exists():
            for dll in torch_lib_path.glob('*.dll'):
                dll_name = dll.name.lower()
                # Skip CUDA-related DLLs
                if not any(x in dll_name for x in ['cuda', 'cudnn', 'cublas', 'cufft', 'nvrtc', 'nccl']):
                    # Add to torch/lib
                    binaries.append((str(dll), 'torch/lib'))
                    # Also add to root directory for DLL loading
                    binaries.append((str(dll), '.'))
                    print(f"Added torch DLL: {dll.name}")
    except Exception as e:
        print(f"Warning: Could not collect torch lib DLLs: {e}")

# Collect numba dynamic libraries
try:
    numba_binaries = collect_dynamic_libs('numba')
    binaries.extend(numba_binaries)
    print(f"Collected {len(numba_binaries)} numba binaries")
except Exception as e:
    print(f"Warning: Could not collect numba binaries: {e}")

# Collect llvmlite dynamic libraries
try:
    llvmlite_binaries = collect_dynamic_libs('llvmlite')
    binaries.extend(llvmlite_binaries)
    print(f"Collected {len(llvmlite_binaries)} llvmlite binaries")
except Exception as e:
    print(f"Warning: Could not collect llvmlite binaries: {e}")

# Try to find tbb12.dll for numba (Windows)
if is_windows:
    try:
        # Check common locations for TBB
        import numba
        numba_path = Path(numba.__file__).parent
        tbb_locations = [
            numba_path / 'tbb12.dll',
            numba_path / 'np' / 'ufunc' / 'tbb12.dll',
        ]
        # Also check numpy.libs
        try:
            import numpy
            numpy_libs = Path(numpy.__file__).parent / '.libs'
            if numpy_libs.exists():
                for dll in numpy_libs.glob('*.dll'):
                    binaries.append((str(dll), '.'))
                    print(f"Added numpy lib: {dll.name}")
        except Exception:
            pass
        # Check llvmlite.libs
        try:
            import llvmlite
            llvmlite_libs = Path(llvmlite.__file__).parent / '.libs'
            if llvmlite_libs.exists():
                for dll in llvmlite_libs.glob('*.dll'):
                    binaries.append((str(dll), '.'))
                    print(f"Added llvmlite lib: {dll.name}")
        except Exception:
            pass
    except Exception as e:
        print(f"Warning: Could not locate TBB: {e}")

# Explicitly collect torch .pyd extension modules (critical for torch to work)
if is_windows:
    try:
        import torch
        torch_path = Path(torch.__file__).parent
        # Collect all .pyd files from torch
        for pyd in torch_path.rglob('*.pyd'):
            rel_path = pyd.relative_to(torch_path)
            dest_dir = f'torch/{rel_path.parent}' if rel_path.parent != Path('.') else 'torch'
            # Skip CUDA-related pyd files
            if not any(x in pyd.name.lower() for x in ['cuda', 'cudnn', 'nvrtc']):
                binaries.append((str(pyd), dest_dir))
        print(f"Collected torch .pyd files")
    except Exception as e:
        print(f"Warning: Could not collect torch .pyd files: {e}")

# Explicitly collect whisper package files
try:
    import whisper
    whisper_path = Path(whisper.__file__).parent
    # Add the entire whisper package
    for py_file in whisper_path.rglob('*.py'):
        rel_path = py_file.relative_to(whisper_path)
        dest_dir = f'whisper/{rel_path.parent}' if rel_path.parent != Path('.') else 'whisper'
        datas.append((str(py_file), dest_dir))
    print(f"Collected whisper Python files")
except Exception as e:
    print(f"Warning: Could not collect whisper files: {e}")

# Create a runtime hook to help torch find its libraries
runtime_hook_content = '''
import os
import sys

# Help torch find its DLLs on Windows
if sys.platform == 'win32' and hasattr(sys, '_MEIPASS'):
    base_path = sys._MEIPASS

    # Add the base directory first
    try:
        os.add_dll_directory(base_path)
    except (OSError, AttributeError):
        pass

    # Add torch/lib directory to DLL search path
    torch_lib = os.path.join(base_path, 'torch', 'lib')
    if os.path.exists(torch_lib):
        try:
            os.add_dll_directory(torch_lib)
        except (OSError, AttributeError):
            pass
        os.environ['PATH'] = torch_lib + os.pathsep + os.environ.get('PATH', '')

    # Also check _internal directory structure (newer PyInstaller)
    internal_torch_lib = os.path.join(base_path, '_internal', 'torch', 'lib')
    if os.path.exists(internal_torch_lib):
        try:
            os.add_dll_directory(internal_torch_lib)
        except (OSError, AttributeError):
            pass
        os.environ['PATH'] = internal_torch_lib + os.pathsep + os.environ.get('PATH', '')

    # Add numpy libs
    numpy_libs = os.path.join(base_path, 'numpy.libs')
    if os.path.exists(numpy_libs):
        try:
            os.add_dll_directory(numpy_libs)
        except (OSError, AttributeError):
            pass
        os.environ['PATH'] = numpy_libs + os.pathsep + os.environ.get('PATH', '')

    # Add llvmlite libs
    llvmlite_libs = os.path.join(base_path, 'llvmlite.libs')
    if os.path.exists(llvmlite_libs):
        try:
            os.add_dll_directory(llvmlite_libs)
        except (OSError, AttributeError):
            pass
        os.environ['PATH'] = llvmlite_libs + os.pathsep + os.environ.get('PATH', '')

    # Ensure PATH includes all potential DLL locations
    os.environ['PATH'] = base_path + os.pathsep + os.environ.get('PATH', '')
'''

runtime_hook_path = os.path.join(spec_dir, 'pyi_rth_torch.py')
with open(runtime_hook_path, 'w') as f:
    f.write(runtime_hook_content)
print(f"Created runtime hook: {runtime_hook_path}")

# Exclude these to reduce size (CUDA, unnecessary backends)
# Note: Be careful not to exclude torch core modules that are needed at import time
excludes = [
    # Testing frameworks (note: unittest is needed by torch/whisper)
    'pytest',
    # 'unittest',  # Required by torch - do not exclude
    'nose',

    # Development tools
    'IPython',
    'jupyter',
    'notebook',
    'sphinx',

    # GUI toolkits (not needed)
    'tkinter',
    'PyQt5',
    'PyQt6',
    'PySide2',
    'PySide6',
    'wx',

    # Other large unused packages
    'matplotlib',
    'PIL',
    'cv2',
    'scipy.spatial.cKDTree',

    # TensorBoard (optional, large)
    'tensorboard',
    'torch.utils.tensorboard',
]

# Add binaries and hidden imports from collect_all
binaries.extend(torch_binaries_all)
binaries.extend(whisper_binaries_all)
hidden_imports.extend(torch_hiddenimports_all)
hidden_imports.extend(whisper_hiddenimports_all)

# Remove duplicate hidden imports
hidden_imports = list(dict.fromkeys(hidden_imports))

# Runtime hooks list
runtime_hooks_list = []
if os.path.exists(runtime_hook_path):
    runtime_hooks_list.append(runtime_hook_path)

# Analysis
a = Analysis(
    [os.path.join(spec_dir, 'voice_recorder_main.py')],
    pathex=[spec_dir],
    binaries=binaries,
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=[os.path.join(spec_dir, 'hooks')],  # Custom hooks to override broken pyinstaller-hooks-contrib
    hooksconfig={},
    runtime_hooks=runtime_hooks_list,
    excludes=excludes,
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

# Filter out CUDA libraries to reduce size
def filter_binaries(binaries):
    """Remove CUDA and other large unnecessary binaries, but keep torch core libraries"""
    exclude_patterns = [
        'cudart',
        'cudnn',
        'cublas',
        'cufft',
        'curand',
        'cusparse',
        'cusolver',
        'nvrtc',
        'nccl',
        'nvToolsExt',
        'caffe2_nvrtc',
        # Large test files
        'test_',
        '_test',
    ]

    # Patterns that should always be kept even if they match exclude patterns
    keep_patterns = [
        'torch_cpu',
        'torch_python',
        'c10',
        'fbgemm',
        'asmjit',
        'sleef',
        'mkl',  # Keep MKL libraries for CPU
        'iomp',  # Keep OpenMP
        'libomp',
        'libopenblas',
    ]

    filtered = []
    for name, path, type_ in binaries:
        name_lower = name.lower()

        # Always keep if it matches keep patterns
        if any(pattern in name_lower for pattern in keep_patterns):
            filtered.append((name, path, type_))
            continue

        # Exclude if it matches exclude patterns
        if any(pattern in name_lower for pattern in exclude_patterns):
            print(f"Excluding binary: {name}")
            continue

        filtered.append((name, path, type_))

    return filtered

a.binaries = filter_binaries(a.binaries)

# Create PYZ archive
pyz = PYZ(a.pure, a.zipped_data, cipher=None)

# Create executable
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='voice-recorder',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,  # Compress with UPX if available
    console=True,  # Console app (needed for stdin/stdout communication)
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=icon_file,
)

# Create folder distribution
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='voice-recorder',
)

# On macOS, optionally create an app bundle
# Uncomment if you want a .app bundle instead of command-line tool
# if is_macos:
#     app = BUNDLE(
#         coll,
#         name='VoiceRecorder.app',
#         icon=icon_file,
#         bundle_identifier='com.sessionrecorder.voicerecorder',
#         info_plist={
#             'CFBundleName': 'Voice Recorder',
#             'CFBundleDisplayName': 'Voice Recorder',
#             'CFBundleVersion': '1.0.0',
#             'CFBundleShortVersionString': '1.0.0',
#             'NSMicrophoneUsageDescription': 'Voice Recorder needs access to the microphone to record audio.',
#         },
#     )
