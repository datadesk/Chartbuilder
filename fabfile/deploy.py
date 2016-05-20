import os
from .clean import clean
from .copy_secrets import copy_secrets
from .pipinstall import pipinstall
from .pull import pull
from .restartapache import restartapache
from .venv import _venv
from fabric.api import local, task, settings, run

try:
    from app.secrets import settings_local as settings
except ImportError:
    from app.secrets import settings_default as settings


@task
def deploy(silent=False):
    """
    Deploys the latest code to a remote server.
    """
    local("npm run build")
    local("git commit -am 'updating build' && git push origin master")

    # cleanup first
    clean()
    pull()

    # Run node build command
    # _venv("npm install")
    # _venv("npm run build")

    # Copy to Stockserver
    # base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    # app_dir = os.path.join(base_dir, 'app')
    # remote_dir = os.path.join(env.project_dir, 'repo')
    # put(app_dir, remote_dir)

    # Copy requirements
    # reqs_file = os.path.join(base_dir, 'requirements.txt')
    # put(reqs_file, remote_dir)
    copy_secrets()

    # install requirements
    pipinstall()
    restartapache()

