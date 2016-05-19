import os
from .copy_secrets import copy_secrets
from fabric.api import local, task, settings, put, env

try:
    from secrets import settings_local as settings
except ImportError:
    from secrets import settings_default as settings


env.hosts = (settings.STOCKSERVER_HOST,)
env.user = settings.STOCKSERVER_USER
env.password = settings.STOCKSERVER_PASS
env.project_dir = "/Library/WebServer/Documents/chartbuilder-lat-dev"

@task
def deploy(silent=False):
    """
    Deploys the latest code to a remote server.
    """
    # Run node build command
    local("npm run build")

    # Copy the build directory
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    build_dir = os.path.join(base_dir, 'build', '*')
    put(build_dir, env.project_dir)

    # Copy secrets file to stockserver
    copy_secrets()