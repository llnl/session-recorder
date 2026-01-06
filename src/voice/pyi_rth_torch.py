
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
