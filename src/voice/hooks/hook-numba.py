# Custom hook for numba (JIT compiler used by whisper for audio processing)

from PyInstaller.utils.hooks import collect_data_files, collect_dynamic_libs, collect_submodules, logger
import os
import sys

# Collect all numba submodules
hiddenimports = collect_submodules('numba')

# Add explicit imports
hiddenimports.extend([
    'numba',
    'numba.core',
    'numba.core.types',
    'numba.core.config',
    'numba.np',
    'numba.np.ufunc',
    'numba.cpython',
    'numba.misc',
    'numba.experimental',
])

# Collect data files
datas = collect_data_files('numba')

# Collect dynamic libraries
binaries = collect_dynamic_libs('numba')

# On Windows, try to find TBB and other required DLLs
if sys.platform == 'win32':
    try:
        import numba
        from pathlib import Path
        numba_path = Path(numba.__file__).parent

        # Look for tbb12.dll and other DLLs in numba directory
        for dll in numba_path.rglob('*.dll'):
            binaries.append((str(dll), '.'))
            logger.info(f"Added numba DLL: {dll.name}")

        # Also check in numba's parent site-packages for TBB
        site_packages = numba_path.parent
        tbb_locations = [
            site_packages / 'tbb' / 'tbb12.dll',
            site_packages / 'Library' / 'bin' / 'tbb12.dll',
        ]
        for tbb_path in tbb_locations:
            if tbb_path.exists():
                binaries.append((str(tbb_path), '.'))
                logger.info(f"Added TBB from: {tbb_path}")

    except Exception as e:
        logger.warning(f"Could not collect numba DLLs: {e}")

# Also collect llvmlite which numba depends on
try:
    llvmlite_imports = collect_submodules('llvmlite')
    hiddenimports.extend(llvmlite_imports)
    hiddenimports.extend([
        'llvmlite',
        'llvmlite.binding',
        'llvmlite.ir',
    ])

    llvmlite_datas = collect_data_files('llvmlite')
    datas.extend(llvmlite_datas)

    llvmlite_binaries = collect_dynamic_libs('llvmlite')
    binaries.extend(llvmlite_binaries)

    # On Windows, also collect from llvmlite directory
    if sys.platform == 'win32':
        import llvmlite
        from pathlib import Path
        llvmlite_path = Path(llvmlite.__file__).parent
        for dll in llvmlite_path.rglob('*.dll'):
            binaries.append((str(dll), '.'))
            logger.info(f"Added llvmlite DLL: {dll.name}")

except Exception as e:
    logger.warning(f"Could not collect llvmlite: {e}")

# Remove duplicates
hiddenimports = list(set(hiddenimports))
