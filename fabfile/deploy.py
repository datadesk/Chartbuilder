import os
from .clean import clean
from .copy_secrets import copy_secrets
from .pipinstall import pipinstall
from fabric.api import local, task, settings, put, env

try:
    from app.secrets import settings_local as settings
except ImportError:
    from app.secrets import settings_default as settings


@task
def deploy(silent=False):
    """
    Deploys the latest code to a remote server.
    """
    # cleanup first
    clean()

    # Run node build command
    local("npm run build")

    # Copy the build directory
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    build_dir = os.path.join(base_dir, 'build', '*')
    remote_dir = os.path.join(env.project_dir, 'repo')
    put(build_dir, remote_dir)

    # Copy secrets file to stockserver
    # copy_secrets()

    # Copy Flask app biz
    app_dir = os.path.join(base_dir, 'app')
    put(app_dir, remote_dir)

    # Copy requirements
    reqs_file = os.path.join(base_dir, 'requirements.txt')
    put(reqs_file, remote_dir)

    # install requirements
    pipinstall()