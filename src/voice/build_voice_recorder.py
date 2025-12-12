#!/usr/bin/env python3
"""
Build script for voice-recorder executable

This script:
1. Creates a virtual environment (if needed)
2. Installs dependencies (CPU-only PyTorch for smaller bundle)
3. Runs PyInstaller to create the executable
4. Copies the output to the desktop-app resources folder

Usage:
    python build_voice_recorder.py [--clean] [--skip-venv]

Options:
    --clean     Clean build artifacts before building
    --skip-venv Skip virtual environment creation (use current environment)
    --dev       Install with CUDA/MPS support for development
"""

import sys
import shutil
import subprocess
import argparse
import platform
from pathlib import Path


def get_platform_info():
    """Get platform-specific information"""
    system = platform.system().lower()
    machine = platform.machine().lower()

    if system == 'windows':
        return {
            'name': 'windows',
            'exe_name': 'voice-recorder.exe',
            'venv_python': 'Scripts/python.exe',
            'venv_pip': 'Scripts/pip.exe',
            'shell': True
        }
    elif system == 'darwin':
        return {
            'name': 'macos',
            'exe_name': 'voice-recorder',
            'venv_python': 'bin/python',
            'venv_pip': 'bin/pip',
            'shell': False,
            'arch': 'arm64' if machine == 'arm64' else 'x86_64'
        }
    else:
        return {
            'name': 'linux',
            'exe_name': 'voice-recorder',
            'venv_python': 'bin/python',
            'venv_pip': 'bin/pip',
            'shell': False
        }


def run_command(cmd, cwd=None, shell=False):
    """Run a command and print output"""
    print(f"\n>>> {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    result = subprocess.run(
        cmd,
        cwd=cwd,
        shell=shell,
        capture_output=False
    )
    if result.returncode != 0:
        print(f"Command failed with code {result.returncode}")
        sys.exit(result.returncode)
    return result


def clean_build(voice_dir: Path):
    """Clean build artifacts"""
    print("\n=== Cleaning build artifacts ===")

    dirs_to_clean = ['build', 'dist', '__pycache__']
    for dir_name in dirs_to_clean:
        dir_path = voice_dir / dir_name
        if dir_path.exists():
            print(f"Removing {dir_path}")
            shutil.rmtree(dir_path)

    # Clean .pyc files
    for pyc_file in voice_dir.rglob('*.pyc'):
        pyc_file.unlink()


def create_venv(voice_dir: Path, platform_info: dict):
    """Create virtual environment for bundling"""
    venv_path = voice_dir / 'venv-bundle'

    if venv_path.exists():
        print(f"Virtual environment exists: {venv_path}")
        return venv_path

    print(f"\n=== Creating virtual environment: {venv_path} ===")
    run_command([sys.executable, '-m', 'venv', str(venv_path)])

    return venv_path


def install_dependencies(venv_path: Path, voice_dir: Path, platform_info: dict, dev: bool = False):
    """Install dependencies in virtual environment"""
    print("\n=== Installing dependencies ===")

    python_path = venv_path / platform_info['venv_python']

    # Upgrade pip first (use python -m pip to avoid self-upgrade issues on Windows)
    run_command([str(python_path), '-m', 'pip', 'install', '--upgrade', 'pip'])

    # Install PyTorch (CPU-only for bundle, full for dev)
    if dev:
        # Install with platform-specific acceleration
        if platform_info['name'] == 'macos':
            # macOS: MPS is included in default wheel
            run_command([str(python_path), '-m', 'pip', 'install', 'torch>=2.0.0'])
        else:
            # Windows/Linux: CUDA or CPU
            run_command([str(python_path), '-m', 'pip', 'install', 'torch>=2.0.0'])
    else:
        # CPU-only for smaller bundle
        if platform_info['name'] == 'macos':
            # macOS wheels don't have CPU-only option, use default
            run_command([str(python_path), '-m', 'pip', 'install', 'torch>=2.0.0'])
        else:
            run_command([
                str(python_path), '-m', 'pip', 'install',
                'torch>=2.0.0',
                '--index-url', 'https://download.pytorch.org/whl/cpu'
            ])

    # Install other dependencies
    requirements_file = voice_dir / 'requirements-bundle.txt'
    run_command([
        str(python_path), '-m', 'pip', 'install',
        '-r', str(requirements_file),
        '--ignore-installed', 'torch'  # Don't reinstall torch
    ])


def build_executable(venv_path: Path, voice_dir: Path, platform_info: dict):
    """Build executable with PyInstaller"""
    print("\n=== Building executable with PyInstaller ===")

    python_path = venv_path / platform_info['venv_python']
    spec_file = voice_dir / 'voice-recorder.spec'

    # Run PyInstaller
    run_command([
        str(python_path), '-m', 'PyInstaller',
        '--clean',
        '--noconfirm',
        str(spec_file)
    ], cwd=voice_dir)


def copy_to_desktop_app(voice_dir: Path, platform_info: dict):
    """Copy built executable to desktop-app resources"""
    print("\n=== Copying to desktop-app resources ===")

    dist_dir = voice_dir / 'dist' / 'voice-recorder'
    desktop_resources = voice_dir.parent.parent / 'desktop-app' / 'resources' / platform_info['name']

    if not dist_dir.exists():
        print(f"Error: Build output not found: {dist_dir}")
        sys.exit(1)

    # Create target directory
    desktop_resources.mkdir(parents=True, exist_ok=True)

    # Copy entire voice-recorder folder
    target_dir = desktop_resources / 'voice-recorder'
    if target_dir.exists():
        shutil.rmtree(target_dir)

    print(f"Copying {dist_dir} -> {target_dir}")
    shutil.copytree(dist_dir, target_dir)

    # Get size
    total_size = sum(f.stat().st_size for f in target_dir.rglob('*') if f.is_file())
    print(f"Total size: {total_size / (1024 * 1024):.1f} MB")


def verify_build(voice_dir: Path, platform_info: dict):
    """Verify the built executable works"""
    print("\n=== Verifying build ===")

    exe_path = voice_dir / 'dist' / 'voice-recorder' / platform_info['exe_name']

    if not exe_path.exists():
        print(f"Error: Executable not found: {exe_path}")
        sys.exit(1)

    print(f"Executable: {exe_path}")
    print(f"Size: {exe_path.stat().st_size / (1024 * 1024):.1f} MB")

    # Test version command
    print("\nTesting --version:")
    result = subprocess.run(
        [str(exe_path), '--version'],
        capture_output=True,
        text=True
    )

    if result.returncode == 0:
        print(result.stdout)
        print("Build verified successfully!")
    else:
        print(f"Error: {result.stderr}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description='Build voice-recorder executable')
    parser.add_argument('--clean', action='store_true', help='Clean build artifacts')
    parser.add_argument('--skip-venv', action='store_true', help='Skip venv creation')
    parser.add_argument('--dev', action='store_true', help='Development build with GPU support')
    parser.add_argument('--no-copy', action='store_true', help='Do not copy to desktop-app')
    args = parser.parse_args()

    # Get paths
    script_dir = Path(__file__).parent.resolve()
    voice_dir = script_dir

    # Get platform info
    platform_info = get_platform_info()
    print(f"Platform: {platform_info['name']}")
    print(f"Voice dir: {voice_dir}")

    # Clean if requested
    if args.clean:
        clean_build(voice_dir)

    # Create venv and install dependencies
    if args.skip_venv:
        venv_path = Path(sys.prefix)
        print(f"Using current environment: {venv_path}")
    else:
        venv_path = create_venv(voice_dir, platform_info)
        install_dependencies(venv_path, voice_dir, platform_info, args.dev)

    # Build executable
    build_executable(venv_path, voice_dir, platform_info)

    # Verify build
    verify_build(voice_dir, platform_info)

    # Copy to desktop-app
    if not args.no_copy:
        copy_to_desktop_app(voice_dir, platform_info)

    print("\n=== Build complete! ===")


if __name__ == '__main__':
    main()
