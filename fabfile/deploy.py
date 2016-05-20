import os
from .clean import clean
from .pipinstall import pipinstall
from .restartapache import restartapache
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

    # Copy to Stockserver
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    app_dir = os.path.join(base_dir, 'app')
    remote_dir = os.path.join(env.project_dir, 'repo')
    put(app_dir, remote_dir)

    # Copy requirements
    reqs_file = os.path.join(base_dir, 'requirements.txt')
    put(reqs_file, remote_dir)

    # install requirements
    pipinstall()
    restartapache()

