# Custom hook for torch that works with PyInstaller 6.17+
# This overrides the broken hook from pyinstaller-hooks-contrib

from PyInstaller.utils.hooks import collect_data_files, collect_dynamic_libs, collect_submodules, logger
import os
import sys

# Collect all torch submodules
hiddenimports = collect_submodules('torch')

# Filter out CUDA modules to reduce size (we're using CPU-only)
hiddenimports = [m for m in hiddenimports
                 if not any(x in m for x in ['cuda', 'cudnn', 'nccl', 'tensorboard'])]

# Collect torch data files
datas = collect_data_files('torch')

# Collect torch dynamic libraries
binaries = collect_dynamic_libs('torch')

# Filter out CUDA binaries
cuda_patterns = ['cuda', 'cudnn', 'cublas', 'cufft', 'curand', 'cusparse', 'cusolver', 'nvrtc', 'nccl']
binaries = [(src, dest) for src, dest in binaries
            if not any(p in os.path.basename(src).lower() for p in cuda_patterns)]

# On Windows, explicitly add torch/lib DLLs
if sys.platform == 'win32':
    try:
        import torch
        from pathlib import Path
        torch_lib = Path(torch.__file__).parent / 'lib'
        if torch_lib.exists():
            for dll in torch_lib.glob('*.dll'):
                dll_name = dll.name.lower()
                if not any(p in dll_name for p in cuda_patterns):
                    # Add to both torch/lib and root for maximum compatibility
                    binaries.append((str(dll), 'torch/lib'))
                    binaries.append((str(dll), '.'))
    except Exception as e:
        logger.warning(f"Could not collect torch lib DLLs: {e}")

# Add essential hidden imports that might be missed
hiddenimports.extend([
    'torch._C',
    'torch.version',
    'torch.backends',
    'torch.backends.mkl',
    'torch.backends.mkldnn',
    'torch.backends.openmp',
    'torch.nn',
    'torch.nn.functional',
    'torch.autograd',
    'torch.jit',
    'torch.serialization',
])

# Remove duplicates
hiddenimports = list(set(hiddenimports))
